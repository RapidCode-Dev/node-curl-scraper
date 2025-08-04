import { BrowserFingerprint, RequestOptions, HttpResponse, JsonResponse, BrowserType, BrowserVersion, CurlImpersonateConfig, OSPlatform } from './types';
export declare class CurlImpersonate {
    private binariesPath;
    private availableBrowsers;
    private config;
    constructor(config?: CurlImpersonateConfig);
    /**
     * Discover available curl-impersonate binaries
     */
    private discoverBinaries;
    /**
     * Parse binary filename to extract browser fingerprint
     */
    private parseBinaryName;
    /**
     * Detect platform from version string
     */
    private detectPlatform;
    /**
     * Detect OS from version string
     */
    private detectOS;
    /**
     * Generate User-Agent string with OS-specific details
     */
    private generateUserAgent;
    /**
     * Get sec-ch-ua-platform header value
     */
    private getSecChUaPlatform;
    /**
     * Get Accept-Language header value
     */
    private getAcceptLanguage;
    /**
     * Get Accept-Encoding header value
     */
    private getAcceptEncoding;
    /**
     * Get available browsers
     */
    getAvailableBrowsers(): BrowserFingerprint[];
    /**
     * Find specific browser by type, version, and platform
     */
    findBrowser(type: BrowserType, version: string, platform?: string, os?: OSPlatform): BrowserFingerprint | null;
    /**
     * Generate a custom browser fingerprint for any Chrome version
     * This allows using any Chrome version even if the binary doesn't exist
     */
    generateChromeFingerprint(version: string, os?: OSPlatform): BrowserFingerprint;
    /**
     * Get a random Chrome version between min and max
     */
    getRandomChromeVersion(minVersion?: number, maxVersion?: number): string;
    /**
     * Make HTTP request
     */
    request(url: string, options?: RequestOptions, browser?: BrowserFingerprint | BrowserVersion): Promise<HttpResponse>;
    /**
     * Make JSON request and parse response
     */
    requestJson<T = any>(url: string, options?: RequestOptions, browser?: BrowserFingerprint | BrowserVersion): Promise<JsonResponse<T>>;
    /**
     * Resolve browser fingerprint from various input types
     */
    private resolveBrowser;
    /**
     * Build curl command arguments with OS-specific headers
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
     * Check if error is retryable based on message content
     */
    private isRetryableError;
}
//# sourceMappingURL=curl-impersonate.d.ts.map