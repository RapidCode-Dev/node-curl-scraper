// Note: You need to install puppeteer-core: npm install puppeteer-core
// This provides the HTTPRequest and HTTPResponse types for type safety
import { HTTPRequest, HTTPResponse } from 'puppeteer-core';
import { CurlImpersonate } from './curl-impersonate';
import { RequestOptions, HttpResponse } from './types';

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

// Type for the response that matches Puppeteer's HTTPResponse structure
export type PuppeteerResponse = {
    status: number;
    contentType: string;
    headers: Record<string, string>;
    body: string;
};

/**
 * Create a curl-impersonate instance for use in Puppeteer request interception
 */
export function createCurlImpersonate(options: CurlInterceptionOptions = {}): CurlImpersonate {
    return new CurlImpersonate({
        defaultTimeout: options.timeout || 30000,
        ...options
    });
}

/**
 * Handle a Puppeteer request using curl-impersonate
 * Use this function inside page.on('request', ...) handler
 */
export async function handleRequestWithCurl(
    request: HTTPRequest,
    curlImpersonate: CurlImpersonate,
    options: CurlInterceptionOptions = {}
): Promise<InterceptedResponse> {
    const url = request.url();
    const method = request.method() as any;
    const headers = request.headers();
    const postData = request.postData();

    if (options.enableDebug) {
        console.log(`[CurlInterception] Handling request: ${method} ${url}`);
    }

    try {
        // Prepare request options for curl-impersonate
        const requestOptions: RequestOptions = {
            method,
            headers,
            body: postData,
            ...options
        };

        // Execute request using curl-impersonate
        const response = await curlImpersonate.request(
            url, 
            requestOptions, 
            options.fingerprintName
        );

        if (options.enableDebug) {
            console.log(`[CurlInterception] Request completed: ${response.statusCode} ${url}`);
        }

        // Return response in format compatible with Puppeteer's request.respond()
        return {
            status: response.statusCode,
            contentType: response.headers['content-type'] || 'text/html',
            headers: response.headers,
            body: response.body,
        };

    } catch (error) {
        if (options.enableDebug) {
            console.log(`[CurlInterception] Request failed:`, error);
        }
        
        // Return error response
        throw error;
    }
}

/**
 * Create a complete request interception handler for Puppeteer
 * This function returns a handler that you can use directly in page.on('request', ...)
 */
export function createRequestInterceptor(
    curlImpersonate: CurlImpersonate,
    options: CurlInterceptionOptions = {}
) {
    return async (request: HTTPRequest) => {
        try {
            const response = await handleRequestWithCurl(request, curlImpersonate, options);
            
            // Respond to the intercepted request
            await request.respond({
                status: response.status,
                contentType: response.contentType,
                headers: response.headers,
                body: response.body,
            });
            
        } catch (error) {
            if (options.enableDebug) {
                console.log(`[CurlInterception] Interception failed, aborting request: ${error}`);
            }
            
            // If curl-impersonate fails, abort the request
            await request.abort();
        }
    };
}

/**
 * Set up request interception on a Puppeteer page with curl-impersonate
 * This is a convenience function that handles the complete setup
 */
export async function setupCurlInterception(
    page: { 
        setRequestInterception: (enabled: boolean) => Promise<void>; 
        on: (event: string, handler: (request: HTTPRequest) => void) => any;
    },
    options: CurlInterceptionOptions = {}
): Promise<CurlImpersonate> {
    const curlImpersonate = createCurlImpersonate(options);
    
    // Enable request interception
    await page.setRequestInterception(true);
    
    // Set up the request handler
    const interceptor = createRequestInterceptor(curlImpersonate, options);
    page.on('request', interceptor);
    
    if (options.enableDebug) {
        console.log('[CurlInterception] Request interception setup complete');
    }
    
    return curlImpersonate;
}

/**
 * Utility function to check if a URL should be intercepted
 */
export function shouldInterceptUrl(
    url: string, 
    includePatterns?: string[], 
    excludePatterns?: string[]
): boolean {
    // Check exclude patterns first
    if (excludePatterns?.some(pattern => url.includes(pattern))) {
        return false;
    }

    // Check include patterns
    if (includePatterns?.length) {
        return includePatterns.some(pattern => url.includes(pattern));
    }

    // Default: intercept nothing
    return false;
}

/**
 * Create a selective request interceptor that only intercepts specific URLs
 */
export function createSelectiveRequestInterceptor(
    curlImpersonate: CurlImpersonate,
    options: CurlInterceptionOptions & {
        includePatterns?: string[];
        excludePatterns?: string[];
    } = {}
) {
    return async (request: HTTPRequest) => {
        const url = request.url();
        
        // Check if we should intercept this request
        if (!shouldInterceptUrl(url, options.includePatterns, options.excludePatterns)) {
            request.continue();
            return;
        }
        
        try {
            const response = await handleRequestWithCurl(request, curlImpersonate, options);
            
            // Respond to the intercepted request
            await request.respond({
                status: response.status,
                contentType: response.contentType,
                headers: response.headers,
                body: response.body,
            });
            
        } catch (error) {
            if (options.enableDebug) {
                console.log(`[CurlInterception] Selective interception failed, aborting request: ${error}`);
            }
            
            // If curl-impersonate fails, abort the request
            await request.abort();
        }
    };
}

/**
 * Example usage function - shows how to use the utilities
 */
export function exampleUsage() {
    return `
// Example usage in your Puppeteer project:

import { HTTPRequest } from 'puppeteer-core';
import { 
    createCurlImpersonate, 
    createRequestInterceptor, 
    setupCurlInterception,
    createSelectiveRequestInterceptor 
} from 'your-package/puppeteer-scraper';

// Method 1: Manual setup with page.on('request')
const curlImpersonate = createCurlImpersonate({ 
    fingerprintName: 'chrome136-macos',
    enableDebug: true 
});

page.on('request', createRequestInterceptor(curlImpersonate, { enableDebug: true }));

// Method 2: Automatic setup
const curlImpersonate = await setupCurlInterception(page, { 
    fingerprintName: 'chrome136-macos',
    enableDebug: true 
});

// Method 3: Selective interception
page.on('request', createSelectiveRequestInterceptor(curlImpersonate, {
    includePatterns: ['api.example.com', 'data.example.com'],
    excludePatterns: ['analytics.example.com'],
    enableDebug: true
}));

// Method 4: Custom handling
page.on('request', async (request: HTTPRequest) => {
    if (request.url().includes('api.example.com')) {
        try {
            const response = await handleRequestWithCurl(request, curlImpersonate, {
                fingerprintName: 'chrome136-macos'
            });
            
            await request.respond({
                status: response.status,
                contentType: response.contentType,
                headers: response.headers,
                body: response.body,
            });
        } catch (error) {
            await request.abort();
        }
    } else {
        request.continue();
    }
});
`;
}
