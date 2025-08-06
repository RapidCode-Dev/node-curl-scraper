export interface ScrapingSession {
    id: string;
    cookies: Record<string, string>;
    userAgent: string;
    fingerprint: any;
    proxy?: ProxyConfig;
    retryCount: number;
    lastRequestTime: number;
}
export interface ScrapingConfig {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    followRedirects?: boolean;
    maxRedirects?: number;
    verifySSL?: boolean;
    userAgents?: string[];
    fingerprints?: string[];
    proxyRotation?: ProxyRotationConfig;
    cloudflareBypass?: CloudflareBypassConfig;
    rateLimiting?: RateLimitingConfig;
    multiThreading?: MultiThreadingConfig;
}
export interface CloudflareBypassConfig {
    enabled: boolean;
    maxAttempts?: number;
    challengeTimeout?: number;
    jsChallenge?: boolean;
    captchaChallenge?: boolean;
    customHeaders?: Record<string, string>;
}
export interface CloudflareChallenge {
    type: 'js' | 'captcha' | 'managed';
    url: string;
    formData?: Record<string, string>;
    cookies?: Record<string, string>;
    timeout?: number;
}
export interface ProxyConfig {
    host: string;
    port: number;
    protocol: 'http' | 'https' | 'socks4' | 'socks5';
    username?: string;
    password?: string;
    country?: string;
    speed?: number;
    lastUsed?: number;
    failCount?: number;
}
export interface ProxyRotationConfig {
    enabled: boolean;
    proxies: ProxyConfig[];
    rotationStrategy: 'round-robin' | 'random' | 'failover' | 'geographic';
    maxFailures?: number;
    cooldownTime?: number;
    geographicTargets?: string[];
}
export interface RateLimitingConfig {
    enabled: boolean;
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    delayBetweenRequests?: number;
    adaptiveDelay?: boolean;
    maxConcurrentRequests?: number;
}
export interface MultiThreadingConfig {
    enabled: boolean;
    maxWorkers?: number;
    workerTimeout?: number;
    queueSize?: number;
    loadBalancing?: 'round-robin' | 'least-busy' | 'random';
}
export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    headers?: Record<string, string>;
    body?: string | Buffer;
    timeout?: number;
    followRedirects?: boolean;
    maxRedirects?: number;
    verifySSL?: boolean;
    proxy?: ProxyConfig;
    cookies?: Record<string, string>;
    formData?: Record<string, string | Buffer>;
    json?: any;
    session?: ScrapingSession;
    bypassCloudflare?: boolean;
}
export interface HttpResponse {
    statusCode: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    url: string;
    responseTime: number;
    size: number;
    cloudflareChallenge?: CloudflareChallenge;
    proxyUsed?: ProxyConfig;
}
export interface JsonResponse<T = any> extends HttpResponse {
    data: T;
}
export interface CurlError {
    code: string;
    message: string;
    details?: string;
    cloudflareBlocked?: boolean;
    proxyFailed?: boolean;
    retryable?: boolean;
    curlCode?: number;
    curlCodeName?: string;
}
export declare const CURL_ERROR_CODES: Record<number, {
    name: string;
    description: string;
    retryable: boolean;
}>;
export interface CurlImpersonateConfig {
    binariesPath?: string;
    defaultTimeout?: number;
    defaultMaxRedirects?: number;
    defaultVerifySSL?: boolean;
}
export interface ScrapingResult<T = any> {
    success: boolean;
    data?: T;
    error?: CurlError;
    session?: ScrapingSession;
    response?: HttpResponse;
    attempts: number;
    duration: number;
}
export interface BatchScrapingResult {
    results: ScrapingResult[];
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    cloudflareChallenges: number;
    proxyFailures: number;
}
//# sourceMappingURL=types.d.ts.map