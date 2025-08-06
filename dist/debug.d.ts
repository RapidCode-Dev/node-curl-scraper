export interface DebugConfig {
    raw: boolean;
    curl: boolean;
    cloudflare: boolean;
    session: boolean;
    proxy: boolean;
    all: boolean;
    saveToFile: boolean;
}
export declare class DebugLogger {
    private config;
    private debugDir;
    constructor();
    private shouldLog;
    private formatData;
    logRawCurl(args: string[], output: string, error?: string): void;
    logCurlRequest(url: string, options: any, fingerprint: any): void;
    logCurlResponse(response: any, responseTime: number): void;
    logCurlError(error: any, context: string): void;
    logCloudflareRequest(url: string, options: any, sessionId?: string): void;
    logCloudflareResponse(response: any, sessionId?: string): void;
    logCloudflareChallenge(response: any, sessionId?: string): void;
    logCloudflareError(error: any, sessionId?: string): void;
    logSessionCreated(session: any): void;
    logSessionUpdated(sessionId: string, updates: any): void;
    logSessionCookies(sessionId: string, cookies: any): void;
    logSessionRotation(sessionId: string, reason: string): void;
    logProxyRequest(proxy: any, url: string): void;
    logProxyError(proxy: any, error: any): void;
    logProxyRotation(fromProxy: any, toProxy: any, reason: string): void;
    logInfo(category: keyof DebugConfig, message: string, data?: any): void;
    private detectCloudflareIndicators;
    private ensureDebugDir;
    private saveToFile;
    logRawCurlWithFile(args: string[], output: string, error?: string, context?: string, url?: string): void;
    logResponseWithFile(response: any, responseTime: number, context?: string, saveToFile?: boolean): void;
    private shouldSaveResponse;
    logRequestWithFile(url: string, options: any, fingerprint: any, context?: string): void;
    logRequestHeadersWithFile(url: string, headers: any, context?: string): void;
    logRetrySummary(allErrors: Array<{
        attempt: number;
        error: Error;
        timestamp: number;
    }>, sessionId?: string): void;
}
export declare const debugLogger: DebugLogger;
//# sourceMappingURL=debug.d.ts.map