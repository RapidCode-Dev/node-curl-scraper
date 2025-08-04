import { ScrapingConfig, ScrapingSession, ScrapingResult, BatchScrapingResult, RequestOptions, BrowserFingerprint } from './types';
export declare class CurlScraper {
    private curlImpersonate;
    private config;
    private sessions;
    private proxyIndex;
    private lastRequestTime;
    constructor(config?: ScrapingConfig);
    /**
     * Create a new scraping session
     */
    createSession(fingerprint?: BrowserFingerprint): ScrapingSession;
    /**
     * Get or create a session
     */
    getSession(sessionId?: string): ScrapingSession;
    /**
     * Make a single request with Cloudflare bypass
     */
    scrape<T = any>(url: string, options?: RequestOptions): Promise<ScrapingResult<T>>;
    /**
     * Make batch requests with multi-threading
     */
    batchScrape<T = any>(urls: string[], options?: RequestOptions): Promise<BatchScrapingResult>;
    /**
     * Check if response is a Cloudflare challenge
     */
    private isCloudflareChallenge;
    /**
     * Handle Cloudflare challenge
     */
    private handleCloudflareChallenge;
    /**
     * Get next proxy from rotation
     */
    private getNextProxy;
    /**
     * Handle rate limiting
     */
    private handleRateLimiting;
    /**
     * Update session cookies from response
     */
    private updateSessionCookies;
    /**
     * Check if response is JSON
     */
    private isJsonResponse;
    /**
     * Check if error is retryable
     */
    private isRetryableError;
    /**
     * Parse error from curl-impersonate
     */
    private parseError;
    /**
     * Utility to delay execution
     */
    private delay;
    /**
     * Utility to chunk array for multi-threading
     */
    private chunkArray;
    /**
     * Get available browsers
     */
    getAvailableBrowsers(): BrowserFingerprint[];
    /**
     * Get scraping statistics
     */
    getStats(): {
        sessions: number;
        config: ScrapingConfig;
    };
}
//# sourceMappingURL=scraper.d.ts.map