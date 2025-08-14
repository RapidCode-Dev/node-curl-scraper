import { RequestOptions, HttpResponse, JsonResponse, CurlImpersonateConfig } from './types';
import { FingerprintConfig } from './fingerprint-config';
export declare class CurlImpersonate {
    private binaryPath;
    private config;
    constructor(config?: CurlImpersonateConfig);
    /**
     * Get available fingerprint configurations
     */
    getAvailableFingerprints(): string[];
    /**
     * Get a specific fingerprint configuration
     */
    getFingerprintConfig(name: string): FingerprintConfig | null;
    /**
     * Find fingerprint by browser, version, and OS
     */
    findFingerprintByBrowser(browser: string, version?: string, os?: string): FingerprintConfig | null;
    /**
     * Find fingerprint by browser, version, and OS
     */
    findFingerprintsByBrowser(browser: string, version?: string, os?: string): FingerprintConfig[];
    /**
     * Make HTTP request with fingerprint configuration
     */
    request(url: string, options?: RequestOptions, fingerprintName?: string): Promise<HttpResponse>;
    /**
     * Make JSON request and parse response
     */
    requestJson<T = any>(url: string, options?: RequestOptions, fingerprintName?: string): Promise<JsonResponse<T>>;
    /**
     * Build curl command arguments with fingerprint configuration
     */
    private buildCurlArgs;
    /**
     * Execute curl command
     */
    private executeCurl;
    /**
     * Parse curl response with headers
     */
    private parseResponse;
    /**
     * Get HTTP status text
     */
    private getStatusText;
    /**
     * Parse curl error with comprehensive CURL error code handling
     */
    private parseError;
    /**
     * Extract CURL error code from error message
     */
    private extractCurlErrorCode;
    /**
     * Check if error is proxy-related
     */
    private isProxyRelatedError;
    /**
     * Extract request headers from stderr (verbose curl output)
     */
    private extractRequestHeadersFromStderr;
    /**
     * Check if error is retryable based on message content
     */
    private isRetryableError;
}
//# sourceMappingURL=curl-impersonate.d.ts.map