import { HTTPRequest } from 'puppeteer-core';
import { CurlImpersonate } from './curl-impersonate';
import { RequestOptions, CurlImpersonateConfig } from './types';
export interface CurlInterceptionOptions extends RequestOptions {
    fingerprintName?: string;
    enableDebug?: boolean;
    timeout?: number;
}
export interface InterceptedResponse {
    status: number;
    contentType: string;
    headers: Record<string, string>;
    body: string;
}
export type PuppeteerResponse = {
    status: number;
    contentType: string;
    headers: Record<string, string>;
    body: string;
};
/**
 * Create a curl-impersonate instance for use in Puppeteer request interception
 */
export declare function createCurlImpersonate(options?: CurlImpersonateConfig): CurlImpersonate;
/**
 * Handle a Puppeteer request using curl-impersonate
 * Use this function inside page.on('request', ...) handler
 */
export declare function handleRequestWithCurl(request: HTTPRequest, curlImpersonate: CurlImpersonate, options?: CurlInterceptionOptions): Promise<InterceptedResponse>;
/**
 * Create a complete request interception handler for Puppeteer
 * This function returns a handler that you can use directly in page.on('request', ...)
 */
export declare function createRequestInterceptor(curlImpersonate: CurlImpersonate, options?: CurlInterceptionOptions): (request: HTTPRequest) => Promise<void>;
/**
 * Utility function to check if a URL should be intercepted
 */
export declare function shouldInterceptUrl(url: string, includePatterns?: string[], excludePatterns?: string[]): boolean;
/**
 * Create a selective request interceptor that only intercepts specific URLs
 */
export declare function createSelectiveRequestInterceptor(curlImpersonate: CurlImpersonate, options?: CurlInterceptionOptions & {
    includePatterns?: string[];
    excludePatterns?: string[];
}): (request: HTTPRequest) => Promise<void>;
/**
 * Example usage function - shows how to use the utilities
 */
export declare function exampleUsage(): string;
//# sourceMappingURL=puppeteer-scraper.d.ts.map