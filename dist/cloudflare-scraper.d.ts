import { RequestOptions, HttpResponse } from './types';
import { FingerprintConfig } from './fingerprint-config';
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
    fingerprint: FingerprintConfig;
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
    createSession(fingerprint?: FingerprintConfig): ScrapingSession;
    getSession(sessionId?: string, forceNew?: boolean): ScrapingSession;
    request(url: string, options?: RequestOptions, sessionId?: string): Promise<HttpResponse>;
    private getFingerprintName;
    private isSessionExpired;
    private isCloudflareBlocked;
    private isCloudflareChallenge;
    private handleCloudflareChallenge;
    private isProxyError;
    private handleProxyError;
    private isCloudflareError;
    private getNextProxy;
    private markProxyFailed;
    private rotateSession;
    private updateSessionCookies;
    private delay;
    getAvailableFingerprints(): string[];
    getSessionStats(): {
        total: number;
        active: number;
        expired: number;
    };
    cleanExpiredSessions(): number;
    getSessionState(sessionId?: string): any;
    restoreSessionState(sessionState: any): void;
    getSessionCookies(sessionId?: string): Record<string, string>;
    restoreSessionCookies(cookies: Record<string, string>, sessionId?: string): void;
    isHtmlResponse(response: HttpResponse): boolean;
    parseHtml(response: HttpResponse, options?: HtmlParseOptions): HtmlParseResult;
    private convertNodeToElements;
    private getElementById;
    private querySelector;
    private querySelectorAll;
    private getScriptData;
    requestHtml(url: string, options?: RequestOptions, sessionId?: string): Promise<{
        response: HttpResponse;
        html: HtmlParseResult;
    }>;
    requestScriptData(url: string, scriptId?: string, options?: RequestOptions, sessionId?: string): Promise<any>;
}
//# sourceMappingURL=cloudflare-scraper.d.ts.map