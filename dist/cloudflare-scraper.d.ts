import { BrowserFingerprint, RequestOptions, HttpResponse } from './types';
export interface HtmlParseOptions {
    encoding?: string;
    normalizeWhitespace?: boolean;
}
export interface HtmlElement {
    tagName: string;
    id?: string;
    className?: string;
    textContent: string;
    innerHTML: string;
    attributes: Record<string, string>;
    children: HtmlElement[];
}
export interface HtmlParseResult {
    elements: HtmlElement[];
    getElementById: (id: string) => HtmlElement | null;
    querySelector: (selector: string) => HtmlElement | null;
    querySelectorAll: (selector: string) => HtmlElement[];
    getScriptData: (scriptId?: string) => any;
}
export declare class CloudflareError extends Error {
    code: 'CF_CHALLENGE' | 'CF_BANNED' | 'CF_BLOCKED' | 'CF_TIMEOUT' | 'CF_JS_CHALLENGE' | 'CF_CAPTCHA';
    response?: HttpResponse | undefined;
    retryable: boolean;
    constructor(message: string, code: 'CF_CHALLENGE' | 'CF_BANNED' | 'CF_BLOCKED' | 'CF_TIMEOUT' | 'CF_JS_CHALLENGE' | 'CF_CAPTCHA', response?: HttpResponse | undefined, retryable?: boolean);
}
export declare class ProxyError extends Error {
    code: 'PROXY_REFUSED' | 'PROXY_TIMEOUT' | 'PROXY_AUTH_FAILED' | 'PROXY_DNS_ERROR' | 'PROXY_CONNECTION_ERROR';
    proxy?: ProxyConfig | undefined;
    retryable: boolean;
    constructor(message: string, code: 'PROXY_REFUSED' | 'PROXY_TIMEOUT' | 'PROXY_AUTH_FAILED' | 'PROXY_DNS_ERROR' | 'PROXY_CONNECTION_ERROR', proxy?: ProxyConfig | undefined, retryable?: boolean);
}
export interface SessionConfig {
    enabled: boolean;
    maxAge?: number;
    autoRotate?: boolean;
    rotateOnError?: boolean;
    maxRetries?: number;
}
export interface CloudflareConfig {
    enabled: boolean;
    autoRetry?: boolean;
    maxRetries?: number;
    challengeTimeout?: number;
    jsChallenge?: boolean;
    captchaChallenge?: boolean;
    fingerprintRotation?: boolean;
}
export interface ProxyConfig {
    host: string;
    port: number;
    protocol: 'http' | 'https' | 'socks4' | 'socks5';
    username?: string;
    password?: string;
    failCount?: number;
    lastUsed?: number;
}
export interface ProxyRotationConfig {
    enabled: boolean;
    proxies: ProxyConfig[];
    autoSwitch?: boolean;
    maxFailures?: number;
    cooldownTime?: number;
    strategy: 'round-robin' | 'random' | 'failover';
}
export interface ScrapingSession {
    id: string;
    cookies: Record<string, string>;
    userAgent: string;
    fingerprint: BrowserFingerprint;
    proxy?: ProxyConfig;
    createdAt: number;
    lastUsed: number;
    requestCount: number;
    errorCount: number;
}
export interface CloudflareScraperConfig {
    session?: Partial<SessionConfig>;
    cloudflare?: Partial<CloudflareConfig>;
    proxyRotation?: Partial<ProxyRotationConfig>;
    binariesPath?: string;
}
export declare class CloudflareScraper {
    private curlImpersonate;
    private sessions;
    private proxyIndex;
    private config;
    constructor(config?: CloudflareScraperConfig);
    /**
     * Create a new session
     */
    createSession(fingerprint?: BrowserFingerprint): ScrapingSession;
    /**
     * Get or create session based on configuration
     */
    getSession(sessionId?: string, forceNew?: boolean): ScrapingSession;
    /**
     * Make request with Cloudflare and proxy error handling
     */
    request(url: string, options?: RequestOptions, sessionId?: string): Promise<HttpResponse>;
    private isCloudflareBlocked;
    /**
     * Check if response is a Cloudflare challenge
     */
    private isCloudflareChallenge;
    /**
     * Handle Cloudflare challenge
     */
    private handleCloudflareChallenge;
    /**
     * Check if error is proxy-related
     */
    private isProxyError;
    /**
     * Handle proxy errors
     */
    private handleProxyError;
    /**
     * Check if error is Cloudflare-related
     */
    private isCloudflareError;
    /**
     * Get next proxy from rotation
     */
    private getNextProxy;
    /**
     * Mark proxy as failed
     */
    private markProxyFailed;
    /**
     * Rotate session (new fingerprint)
     */
    private rotateSession;
    /**
     * Update session cookies from response
     */
    private updateSessionCookies;
    /**
     * Utility to delay execution
     */
    private delay;
    /**
     * Get available browsers
     */
    getAvailableBrowsers(): BrowserFingerprint[];
    /**
     * Get session statistics
     */
    getSessionStats(): {
        total: number;
        active: number;
        expired: number;
    };
    /**
     * Clean expired sessions
     */
    cleanExpiredSessions(): number;
    /**
     * Get complete session state for persistence
     */
    getSessionState(sessionId?: string): any;
    /**
     * Restore complete session state from persistence
     */
    restoreSessionState(sessionState: any): void;
    /**
     * Get session cookies for persistence (backward compatibility)
     */
    getSessionCookies(sessionId?: string): Record<string, string>;
    /**
     * Restore session cookies from persistence (backward compatibility)
     */
    restoreSessionCookies(cookies: Record<string, string>, sessionId?: string): void;
    /**
     * Check if response is HTML
     */
    isHtmlResponse(response: HttpResponse): boolean;
    /**
     * Parse HTML response and return structured data
     */
    parseHtml(response: HttpResponse, options?: HtmlParseOptions): HtmlParseResult;
    /**
     * Convert node-html-parser node to our HtmlElement interface
     */
    private convertNodeToElements;
    /**
     * Get element by ID using node-html-parser
     */
    private getElementById;
    /**
     * Query selector using node-html-parser
     */
    private querySelector;
    /**
     * Query selector all using node-html-parser
     */
    private querySelectorAll;
    /**
     * Get script data from specific script tag
     */
    private getScriptData;
    /**
     * Make request and parse HTML response
     */
    requestHtml(url: string, options?: RequestOptions, sessionId?: string): Promise<{
        response: HttpResponse;
        html: HtmlParseResult;
    }>;
    /**
     * Make request and extract data from specific script tag
     */
    requestScriptData(url: string, scriptId?: string, options?: RequestOptions, sessionId?: string): Promise<any>;
}
//# sourceMappingURL=cloudflare-scraper.d.ts.map