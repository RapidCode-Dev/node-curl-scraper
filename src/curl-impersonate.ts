import { spawn, SpawnOptions } from 'child_process';
import { join } from 'path';
import { debugLogger } from './debug';
import {
    RequestOptions,
    HttpResponse,
    JsonResponse,
    CurlError,
    CurlImpersonateConfig,
    CURL_ERROR_CODES
} from './types';
import {
    FingerprintConfig,
    getFingerprintConfig,
    getAvailableFingerprints,
    findFingerprintByBrowser
} from './fingerprint-config';

export class CurlImpersonate {
    private binaryPath: string;
    private config: CurlImpersonateConfig;

    constructor(config: CurlImpersonateConfig = {}) {
        this.config = {
            binariesPath: './binaries',
            defaultTimeout: 30000,
            defaultMaxRedirects: 5,
            defaultVerifySSL: true,
            ...config
        };
        this.binaryPath = join(this.config.binariesPath!, 'curl-impersonate');
    }

    /**
     * Get available fingerprint configurations
     */
    getAvailableFingerprints(): string[] {
        return getAvailableFingerprints();
    }

    /**
     * Get a specific fingerprint configuration
     */
    getFingerprintConfig(name: string): FingerprintConfig | null {
        return getFingerprintConfig(name);
    }

    /**
     * Find fingerprint by browser, version, and OS
     */
    findFingerprintByBrowser(
        browser: string,
        version?: string,
        os?: string
    ): FingerprintConfig | null {
        return findFingerprintByBrowser(browser, version, os);
    }

    /**
     * Make HTTP request with fingerprint configuration
     */
    async request(
        url: string,
        options: RequestOptions = {},
        fingerprintName?: string
    ): Promise<HttpResponse> {
        const fingerprint = fingerprintName ?
            getFingerprintConfig(fingerprintName) :
            getFingerprintConfig('chrome136-macos'); // Default fingerprint

        if (!fingerprint) {
            throw new Error(`Fingerprint configuration not found: ${fingerprintName || 'default'}`);
        }

        // Debug logging
        debugLogger.logRequestWithFile(url, options, fingerprint, 'curl-request');

        const startTime = Date.now();
        const curlArgs = this.buildCurlArgs(url, options, fingerprint);

        try {
            const result = await this.executeCurl(curlArgs, url);
            const endTime = Date.now();

            const response = this.parseResponse(result, url, endTime - startTime, options);

            // Debug logging with file saving
            debugLogger.logResponseWithFile(response, endTime - startTime, 'curl-response', false);

            return response;
        } catch (error) {
            // Debug logging
            debugLogger.logCurlError(error, 'request execution');
            throw this.parseError(error as Error);
        }
    }

    /**
     * Make JSON request and parse response
     */
    async requestJson<T = any>(
        url: string,
        options: RequestOptions = {},
        fingerprintName?: string
    ): Promise<JsonResponse<T>> {
        const response = await this.request(url, options, fingerprintName);

        try {
            const data = JSON.parse(response.body);
            return { ...response, data };
        } catch (error) {
            throw new Error(`Failed to parse JSON response: ${error}`);
        }
    }

    /**
     * Build curl command arguments with fingerprint configuration
     */
    private buildCurlArgs(url: string, options: RequestOptions, fingerprint: FingerprintConfig): string[] {
        const args: string[] = [];

        // Basic options - include headers in output and verbose for request headers
        args.push('-v', '-i', '-w', '\\n%{http_code}|%{http_version}|%{size_download}|%{time_total}|%{url_effective}');

        // Method
        if (options.method && options.method !== 'GET') {
            args.push('-X', options.method);
        }

        // Custom headers (can override fingerprint headers) - add first
        if (options.headers) {
            for (const [key, value] of Object.entries(options.headers)) {
                args.push('-H', `${key}: ${value}`);
            }
        }

        // Add fingerprint headers (skip if overridden by custom headers)
        for (const [key, value] of Object.entries(fingerprint.headers)) {
            if (value && (!options.headers || !(key in options.headers))) { // Only add if not overridden
                args.push('-H', `${key}: ${value}`);
            }
        }

        // Add TLS/Cipher configuration
        args.push('--ciphers', fingerprint.tls.ciphers);
        args.push('--curves', fingerprint.tls.curves);
        args.push('--http2');
        args.push('--http2-settings', fingerprint.tls.http2Settings);
        args.push('--http2-window-update', String(fingerprint.tls.http2WindowUpdate));
        args.push('--http2-stream-weight', String(fingerprint.tls.http2StreamWeight));
        args.push('--http2-stream-exclusive', String(fingerprint.tls.http2StreamExclusive));
        args.push('--compressed');

        // Add TLS options based on configuration
        if (fingerprint.tls.echGrease) {
            args.push('--ech', 'grease');
        }
        if (fingerprint.tls.tlsv12) {
            args.push('--tlsv1.2');
        }
        if (fingerprint.tls.alps) {
            args.push('--alps');
        }
        if (fingerprint.tls.tlsPermuteExtensions) {
            args.push('--tls-permute-extensions');
        }
        if (fingerprint.tls.certCompression !== 'none') {
            args.push('--cert-compression', fingerprint.tls.certCompression);
        }
        if (fingerprint.tls.tlsGrease) {
            args.push('--tls-grease');
        }
        if (fingerprint.tls.tlsUseNewAlpsCodepoint) {
            args.push('--tls-use-new-alps-codepoint');
        }
        if (fingerprint.tls.tlsSignedCertTimestamps) {
            args.push('--tls-signed-cert-timestamps');
        }

        // Additional TLS options
        if (fingerprint.tls.signatureHashes) {
            args.push('--signature-hashes', fingerprint.tls.signatureHashes);
        }
        if (fingerprint.tls.tlsExtensionOrder) {
            args.push('--tls-extension-order', fingerprint.tls.tlsExtensionOrder);
        }
        if (fingerprint.tls.tlsDelegatedCredentials) {
            args.push('--tls-delegated-credentials', fingerprint.tls.tlsDelegatedCredentials);
        }
        if (fingerprint.tls.tlsRecordSizeLimit) {
            args.push('--tls-record-size-limit', String(fingerprint.tls.tlsRecordSizeLimit));
        }
        if (fingerprint.tls.tlsKeySharesLimit) {
            args.push('--tls-key-shares-limit', String(fingerprint.tls.tlsKeySharesLimit));
        }
        if (fingerprint.tls.http2PseudoHeadersOrder) {
            args.push('--http2-pseudo-headers-order', fingerprint.tls.http2PseudoHeadersOrder);
        }

        // Safari-specific TLS options
        if (fingerprint.tls.tlsv10) {
            args.push('--tlsv1.0');
        }
        if (fingerprint.tls.noTlsSessionTicket) {
            args.push('--no-tls-session-ticket');
        }



        // Body
        if (options.body) {
            args.push('-d', options.body.toString());
        } else if (options.json) {
            args.push('-H', 'Content-Type: application/json');
            args.push('-d', JSON.stringify(options.json));
        } else if (options.formData) {
            for (const [key, value] of Object.entries(options.formData)) {
                args.push('-F', `${key}=${value}`);
            }
        }

        // Cookies
        if (options.cookies) {
            const cookieString = Object.entries(options.cookies)
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');
            args.push('-H', `Cookie: ${cookieString}`);
        }

        // Timeout
        if (options.timeout || this.config.defaultTimeout) {
            args.push('--max-time', String(options.timeout || this.config.defaultTimeout));
        }

        // Redirects
        if (options.followRedirects !== false) {
            args.push('-L');
            if (options.maxRedirects || this.config.defaultMaxRedirects) {
                args.push('--max-redirs', String(options.maxRedirects || this.config.defaultMaxRedirects));
            }
        }

        // SSL verification
        if (options.verifySSL === false || this.config.defaultVerifySSL === false) {
            args.push('-k');
        }

        // Proxy
        if (options.proxy) {
            if (typeof options.proxy === 'string') {
                args.push('-x', options.proxy);
            } else {
                // Handle ProxyConfig object
                const proxyString = `${options.proxy.protocol}://${options.proxy.username ? options.proxy.username + ':' + options.proxy.password + '@' : ''}${options.proxy.host}:${options.proxy.port}`;
                args.push('-x', proxyString);
            }
        }

        // URL
        args.push(url);

        return args;
    }

    /**
     * Execute curl command
     */
    private executeCurl(args: string[], url?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn(this.binaryPath, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    // Debug logging with file saving
                    debugLogger.logRawCurlWithFile(args, stdout, stderr, 'curl-success', url);

                    // Extract request headers from stderr (verbose output)
                    const requestHeaders = this.extractRequestHeadersFromStderr(stderr || '');
                    if (Object.keys(requestHeaders).length > 0 && url) {
                        debugLogger.logRequestHeadersWithFile(url, requestHeaders, 'curl-request');
                    }

                    resolve(stdout);
                } else {
                    // Debug logging with file saving
                    debugLogger.logRawCurlWithFile(args, stdout, stderr, 'curl-error', url);

                    // Create detailed error message with CURL error code information
                    const errorInfo = code !== null && code in CURL_ERROR_CODES ? CURL_ERROR_CODES[code] : null;
                    const errorMessage = errorInfo
                        ? `Curl failed with code ${code} (${errorInfo.name}): ${errorInfo.description}. Stderr: ${stderr}`
                        : `Curl failed with code ${code}: ${stderr}`;

                    const error = new Error(errorMessage);
                    // Add CURL error code as a property for easier access
                    (error as any).curlCode = code;
                    (error as any).curlCodeName = errorInfo?.name;
                    (error as any).stderr = stderr;
                    (error as any).stdout = stdout;

                    reject(error);
                }
            });

            child.on('error', (error) => {
                // Debug logging with file saving
                debugLogger.logRawCurlWithFile(args, '', error.message, 'curl-spawn-error', url);
                reject(error);
            });
        });
    }

    /**
     * Parse curl response with headers
     */
    private parseResponse(output: string, originalUrl: string, responseTime: number, options: RequestOptions = {}): HttpResponse {
        const lines = output.split('\n');

        // Step 1: Find and remove the curl status line (last line with format: 200|2|3761|8.499299|https://www.autotrader.com/)
        let statusLine = '';
        let responseLines: string[] = [];

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.match(/^[0-9]{3}\|[0-9]+\|[0-9]+\|[0-9.]+\|.+$/)) {
                statusLine = line;
                responseLines = lines.slice(0, i);
                break;
            }
        }

        if (!statusLine) {
            throw new Error('Could not find curl status line in response');
        }

        const [statusCode, httpVersion, size, timeTotal, effectiveUrl] = statusLine.split('|');

        // Step 2: Parse response header sections and find body
        const headers: Record<string, string> = {};
        let bodyLines: string[] = [];
        let headerSectionCount = 0;
        let inHeaders = false;
        let emptyLineCount = 0;
        let isSecondHeaderSection = false;

        for (let i = 0; i < responseLines.length; i++) {
            const line = responseLines[i];

            // Check if this line starts a new HTTP section
            if (line.startsWith('HTTP/')) {
                headerSectionCount++;
                inHeaders = true;

                // If this is the second HTTP section, mark it as the one we want to parse
                if (headerSectionCount === 2) {
                    isSecondHeaderSection = true;
                }
                continue;
            }

            // If we're in headers and find an empty line, count it
            if (inHeaders && line.trim() === '') {
                emptyLineCount++;
                inHeaders = false;
                continue;
            }

            // If we're in headers, parse key:value format
            if (inHeaders && line.includes(':')) {
                // Only save headers from the second section (if there are 2 sections)
                if (headerSectionCount === 1 || isSecondHeaderSection) {
                    const colonIndex = line.indexOf(':');
                    const key = line.substring(0, colonIndex).toLowerCase();
                    const value = line.substring(colonIndex + 1).trim();
                    headers[key] = value;
                }
                continue;
            }

            // If we've found 2 empty lines (proxy headers + HTTP headers), this is the body
            if (emptyLineCount >= 2 && line.trim() !== '') {
                bodyLines = responseLines.slice(i);
                break;
            }

            // If we've found 1 empty line and this is not an empty line, this is the body (no proxy)
            if (emptyLineCount === 1 && line.trim() !== '' && !line.startsWith('HTTP/')) {
                bodyLines = responseLines.slice(i);
                break;
            }
        }

        // Extract body
        const body = bodyLines.join('\n');

        // Set default content-type if not present
        if (!headers['content-type']) {
            headers['content-type'] = 'application/json';
        }

        return {
            statusCode: parseInt(statusCode, 10),
            statusText: this.getStatusText(parseInt(statusCode, 10)),
            headers,
            body,
            url: effectiveUrl || originalUrl,
            responseTime,
            size: parseInt(size, 10)
        };
    }

    /**
     * Get HTTP status text
     */
    private getStatusText(statusCode: number): string {
        const statusTexts: Record<number, string> = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            301: 'Moved Permanently',
            302: 'Found',
            304: 'Not Modified',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable'
        };
        return statusTexts[statusCode] || 'Unknown';
    }

    /**
     * Parse curl error with comprehensive CURL error code handling
     */
    private parseError(error: Error): CurlError {
        // Try to extract CURL error code from the error message
        const curlCode = this.extractCurlErrorCode(error.message);
        const errorInfo = curlCode !== null ? CURL_ERROR_CODES[curlCode] : null;

        // Determine if this is a proxy-related error
        const isProxyError = this.isProxyRelatedError(error.message, curlCode);

        // Determine if this is a retryable error
        const isRetryable = errorInfo ? errorInfo.retryable : this.isRetryableError(error.message);

        return {
            code: errorInfo ? errorInfo.name : 'CURL_ERROR',
            message: errorInfo ? errorInfo.description : error.message,
            details: error.stack,
            curlCode: curlCode ?? undefined,
            curlCodeName: errorInfo ? errorInfo.name : undefined,
            proxyFailed: isProxyError,
            retryable: isRetryable
        };
    }

    /**
     * Extract CURL error code from error message
     */
    private extractCurlErrorCode(message: string): number | null {
        // Common patterns for CURL error codes in error messages
        const patterns = [
            /curl: \(([0-9]+)\)/i,           // curl: (5) Couldn't resolve proxy
            /error code: ([0-9]+)/i,         // error code: 5
            /curl error: ([0-9]+)/i,         // curl error: 5
            /failed with code ([0-9]+)/i,    // failed with code 5
            /exit code: ([0-9]+)/i,          // exit code: 5
            /returned ([0-9]+)/i             // returned 5
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                const code = parseInt(match[1], 10);
                if (code in CURL_ERROR_CODES) {
                    return code;
                }
            }
        }

        return null;
    }

    /**
     * Check if error is proxy-related
     */
    private isProxyRelatedError(message: string, curlCode: number | null): boolean {
        // Check by CURL error code
        if (curlCode !== null) {
            const proxyErrorCodes = [5, 7, 28, 97]; // CURLE_COULDNT_RESOLVE_PROXY, CURLE_COULDNT_CONNECT, CURLE_OPERATION_TIMEDOUT, CURLE_PROXY
            if (proxyErrorCodes.includes(curlCode)) {
                return true;
            }
        }

        // Check by error message keywords
        const proxyKeywords = [
            'proxy', 'PROXY', 'Proxy',
            'couldn\'t resolve proxy',
            'failed to connect',
            'connection refused',
            'timeout',
            'proxy handshake',
            'proxy authentication'
        ];

        return proxyKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    }

    /**
     * Extract request headers from stderr (verbose curl output)
     */
    private extractRequestHeadersFromStderr(stderr: string): Record<string, string> {
        const headers: Record<string, string> = {};
        const lines = stderr.split('\n');

        for (const line of lines) {
            if (line.startsWith('>')) {
                const headerLine = line.substring(1).trim(); // Remove the '>' prefix
                if (headerLine.includes(':')) {
                    const colonIndex = headerLine.indexOf(':');
                    const key = headerLine.substring(0, colonIndex).trim();
                    const value = headerLine.substring(colonIndex + 1).trim();
                    headers[key] = value;
                }
            }
        }

        return headers;
    }

    /**
     * Check if error is retryable based on message content
     */
    private isRetryableError(message: string): boolean {
        const retryableKeywords = [
            'timeout', 'timed out',
            'connection refused',
            'couldn\'t connect',
            'couldn\'t resolve',
            'network is unreachable',
            'no route to host',
            'temporary failure',
            'try again',
            'temporary error'
        ];

        return retryableKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    }
} 