import { spawn, SpawnOptions } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { debugLogger } from './debug';
import { 
  BrowserFingerprint, 
  RequestOptions, 
  HttpResponse, 
  JsonResponse, 
  CurlError, 
  BrowserType, 
  BrowserVersion,
  CurlImpersonateConfig,
  OSPlatform,
  VersionGenerator,
  CURL_ERROR_CODES
} from './types';

export class CurlImpersonate {
  private binariesPath: string;
  private availableBrowsers: BrowserFingerprint[] = [];
  private config: CurlImpersonateConfig;

  constructor(config: CurlImpersonateConfig = {}) {
    this.config = {
      binariesPath: './binaries',
      defaultTimeout: 30000,
      defaultMaxRedirects: 5,
      defaultVerifySSL: true,
      ...config
    };
    this.binariesPath = this.config.binariesPath!;
    this.discoverBinaries();
  }

  /**
   * Discover available curl-impersonate binaries
   */
  private discoverBinaries(): void {
    try {
      const files = readdirSync(this.binariesPath);
      this.availableBrowsers = files
        .filter(file => {
          const filePath = join(this.binariesPath, file);
          return statSync(filePath).isFile() && file.startsWith('curl_');
        })
        .map(filename => this.parseBinaryName(filename))
        .filter(browser => browser !== null) as BrowserFingerprint[];
    } catch (error) {
      console.warn(`Could not discover binaries in ${this.binariesPath}:`, error);
      this.availableBrowsers = [];
    }
  }

  /**
   * Parse binary filename to extract browser fingerprint
   */
  private parseBinaryName(filename: string): BrowserFingerprint | null {
    // Remove 'curl_' prefix
    const name = filename.replace('curl_', '');
    
    // Parse Chrome versions
    if (name.startsWith('chrome')) {
      const version = name.replace('chrome', '');
      const platform = this.detectPlatform(version);
      const os = this.detectOS(version);
      
      return {
        name: `chrome${version}`,
        version,
        platform,
        os,
        userAgent: this.generateUserAgent('chrome', version, platform, os),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform(os),
        acceptLanguage: this.getAcceptLanguage(os),
        acceptEncoding: this.getAcceptEncoding(os)
      };
    }
    
    // Parse Firefox versions
    if (name.startsWith('firefox')) {
      const version = name.replace('firefox', '');
      return {
        name: `firefox${version}`,
        version,
        platform: 'desktop',
        os: 'macos',
        userAgent: this.generateUserAgent('firefox', version, 'desktop', 'macos'),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform('macos'),
        acceptLanguage: this.getAcceptLanguage('macos'),
        acceptEncoding: this.getAcceptEncoding('macos')
      };
    }
    
    // Parse Safari versions
    if (name.startsWith('safari')) {
      const version = name.replace('safari', '');
      const platform = version.includes('ios') ? 'ios' : 'desktop';
      const os = version.includes('ios') ? 'ios' : 'macos';
      const cleanVersion = version.replace('_ios', '');
      
      return {
        name: `safari${version}`,
        version: cleanVersion,
        platform,
        os,
        userAgent: this.generateUserAgent('safari', cleanVersion, platform, os),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform(os),
        acceptLanguage: this.getAcceptLanguage(os),
        acceptEncoding: this.getAcceptEncoding(os)
      };
    }
    
    // Parse Edge versions
    if (name.startsWith('edge')) {
      const version = name.replace('edge', '');
      return {
        name: `edge${version}`,
        version,
        platform: 'desktop',
        os: 'windows',
        userAgent: this.generateUserAgent('edge', version, 'desktop', 'windows'),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform('windows'),
        acceptLanguage: this.getAcceptLanguage('windows'),
        acceptEncoding: this.getAcceptEncoding('windows')
      };
    }
    
    // Parse Tor versions
    if (name.startsWith('tor')) {
      const version = name.replace('tor', '');
      return {
        name: `tor${version}`,
        version,
        platform: 'desktop',
        os: 'macos',
        userAgent: this.generateUserAgent('tor', version, 'desktop', 'macos'),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform('macos'),
        acceptLanguage: this.getAcceptLanguage('macos'),
        acceptEncoding: this.getAcceptEncoding('macos')
      };
    }
    
    return null;
  }

  /**
   * Detect platform from version string
   */
  private detectPlatform(version: string): 'desktop' | 'mobile' | 'ios' | 'android' {
    if (version.includes('android')) return 'android';
    if (version.includes('ios')) return 'ios';
    if (version.includes('mobile')) return 'mobile';
    return 'desktop';
  }

  /**
   * Detect OS from version string
   */
  private detectOS(version: string): OSPlatform {
    if (version.includes('android')) return 'android';
    if (version.includes('ios')) return 'ios';
    if (version.includes('macos')) return 'macos';
    if (version.includes('linux')) return 'linux';
    return 'windows'; // Default for Chrome
  }

  /**
   * Generate User-Agent string with OS-specific details
   */
  private generateUserAgent(type: BrowserType, version: string, platform: string, os: OSPlatform): string {
    const baseVersions: Record<string, string> = {
      'chrome': '99.0.4844.51',
      'firefox': '133.0.3',
      'safari': '17.0',
      'edge': '99.0.1150.30',
      'tor': '14.5'
    };

    const baseVersion = baseVersions[type] || '99.0.0.0';
    
    switch (type) {
      case 'chrome':
        if (os === 'windows') {
          return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
        } else if (os === 'macos') {
          return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
        } else if (os === 'android') {
          return `Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Mobile Safari/537.36`;
        }
        break;
        
      case 'firefox':
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${version}) Gecko/20100101 Firefox/${version}`;
        
      case 'safari':
        if (os === 'ios') {
          return `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Mobile/15E148 Safari/604.1`;
        } else {
          return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
        }
        
      case 'edge':
        return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 Edg/${version}.0.0.0`;
        
      case 'tor':
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${version}) Gecko/20100101 Firefox/${version}`;
    }
    
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
  }

  /**
   * Get sec-ch-ua-platform header value
   */
  private getSecChUaPlatform(os: OSPlatform): string {
    switch (os) {
      case 'windows': return '"Windows"';
      case 'macos': return '"macOS"';
      case 'ios': return '"iOS"';
      case 'android': return '"Android"';
      case 'linux': return '"Linux"';
      default: return '"Windows"';
    }
  }

  /**
   * Get Accept-Language header value
   */
  private getAcceptLanguage(os: OSPlatform): string {
    switch (os) {
      case 'windows': return 'en-US,en;q=0.9';
      case 'macos': return 'en-US,en;q=0.9';
      case 'ios': return 'en-US,en;q=0.9';
      case 'android': return 'en-US,en;q=0.9';
      case 'linux': return 'en-US,en;q=0.9';
      default: return 'en-US,en;q=0.9';
    }
  }

  /**
   * Get Accept-Encoding header value
   */
  private getAcceptEncoding(os: OSPlatform): string {
    switch (os) {
      case 'windows': return 'gzip, deflate, br';
      case 'macos': return 'gzip, deflate, br';
      case 'ios': return 'gzip, deflate, br';
      case 'android': return 'gzip, deflate, br';
      case 'linux': return 'gzip, deflate, br';
      default: return 'gzip, deflate, br';
    }
  }

  /**
   * Get available browsers
   */
  getAvailableBrowsers(): BrowserFingerprint[] {
    return [...this.availableBrowsers];
  }

  /**
   * Find specific browser by type, version, and platform
   */
  findBrowser(type: BrowserType, version: string, platform?: string, os?: OSPlatform): BrowserFingerprint | null {
    return this.availableBrowsers.find(browser => {
      const nameMatch = browser.name.startsWith(type);
      const versionMatch = browser.version === version;
      const platformMatch = !platform || browser.platform === platform;
      const osMatch = !os || browser.os === os;
      return nameMatch && versionMatch && platformMatch && osMatch;
    }) || null;
  }

  /**
   * Generate a custom browser fingerprint for any Chrome version
   * This allows using any Chrome version even if the binary doesn't exist
   */
  generateChromeFingerprint(version: string, os: OSPlatform = 'windows'): BrowserFingerprint {
    const platform = os === 'android' ? 'android' : 'desktop';
    
    return {
      name: `chrome${version}`,
      version,
      platform,
      os,
      userAgent: this.generateUserAgent('chrome', version, platform, os),
      binaryName: 'curl_chrome99', // Use existing binary
      secChUaPlatform: this.getSecChUaPlatform(os),
      acceptLanguage: this.getAcceptLanguage(os),
      acceptEncoding: this.getAcceptEncoding(os)
    };
  }

  /**
   * Get a random Chrome version between min and max
   */
  getRandomChromeVersion(minVersion: number = 99, maxVersion: number = 136): string {
    return Math.floor(Math.random() * (maxVersion - minVersion + 1) + minVersion).toString();
  }

  /**
   * Make HTTP request
   */
  async request(
    url: string, 
    options: RequestOptions = {}, 
    browser?: BrowserFingerprint | BrowserVersion
  ): Promise<HttpResponse> {
    const fingerprint = this.resolveBrowser(browser);
    if (!fingerprint) {
      throw new Error('No valid browser fingerprint found');
    }

    // Debug logging
    debugLogger.logRequestWithFile(url, options, fingerprint, 'curl-request');

    const startTime = Date.now();
    const curlArgs = this.buildCurlArgs(url, options, fingerprint);
    
    try {
      const result = await this.executeCurl(curlArgs, url);
      const endTime = Date.now();
      
      const response = this.parseResponse(result, url, endTime - startTime, options);
      
      // Debug logging with file saving (only if not called from CloudflareScraper)
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
    browser?: BrowserFingerprint | BrowserVersion
  ): Promise<JsonResponse<T>> {
    const response = await this.request(url, options, browser);
    
    try {
      const data = JSON.parse(response.body);
      return { ...response, data };
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`);
    }
  }

  /**
   * Resolve browser fingerprint from various input types
   */
  private resolveBrowser(browser?: BrowserFingerprint | BrowserVersion): BrowserFingerprint | null {
    if (!browser) {
      // Return first available browser
      return this.availableBrowsers[0] || null;
    }

    if ('binaryName' in browser) {
      // Already a BrowserFingerprint
      return browser;
    }

    // BrowserVersion - find matching fingerprint or generate one
    if (browser.type === 'chrome') {
      // For Chrome, we can generate any version
      return this.generateChromeFingerprint(browser.version, browser.os);
    }
    
    return this.findBrowser(browser.type, browser.version, browser.platform, browser.os);
  }

  /**
   * Build curl command arguments with OS-specific headers
   */
  private buildCurlArgs(url: string, options: RequestOptions, fingerprint: BrowserFingerprint): string[] {
    const args: string[] = [];

    // Basic options - include headers in output
    args.push('-s', '-i', '-w', '\\n%{http_code}|%{http_version}|%{size_download}|%{time_total}|%{url_effective}');
    
    // Method
    if (options.method && options.method !== 'GET') {
      args.push('-X', options.method);
    }

    // Note: curl-impersonate binary automatically adds browser headers
    // We only add User-Agent if explicitly requested or for custom fingerprints
    if (options.headers?.['User-Agent']) {
      args.push('-H', `User-Agent: ${options.headers['User-Agent']}`);
    } else if (fingerprint.userAgent && !fingerprint.binaryName?.startsWith('curl_')) {
      // Only add User-Agent for custom fingerprints, not for curl-impersonate binaries
      args.push('-H', `User-Agent: ${fingerprint.userAgent}`);
    } else if (fingerprint.userAgent && fingerprint.binaryName?.startsWith('curl_')) {
      // For curl-impersonate binaries, only add User-Agent if it's different from the binary's default
      // This allows custom fingerprints to override the binary's default User-Agent
      args.push('-H', `User-Agent: ${fingerprint.userAgent}`);
    }

    // Don't add OS-specific headers as curl-impersonate binary handles them automatically
    // Only add custom headers that aren't browser-specific

    // Custom headers
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        args.push('-H', `${key}: ${value}`);
      }
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
      const curlPath = join(this.binariesPath, 'curl_chrome99'); // Default binary
      const child = spawn(curlPath, args, { 
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
    
    // Step 2: Parse header sections and find body
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