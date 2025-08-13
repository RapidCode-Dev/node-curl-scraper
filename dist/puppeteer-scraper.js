"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCurlImpersonate = createCurlImpersonate;
exports.handleRequestWithCurl = handleRequestWithCurl;
exports.createRequestInterceptor = createRequestInterceptor;
exports.setupCurlInterception = setupCurlInterception;
exports.shouldInterceptUrl = shouldInterceptUrl;
exports.createSelectiveRequestInterceptor = createSelectiveRequestInterceptor;
exports.exampleUsage = exampleUsage;
const curl_impersonate_1 = require("./curl-impersonate");
/**
 * Create a curl-impersonate instance for use in Puppeteer request interception
 */
function createCurlImpersonate(options = {}) {
    return new curl_impersonate_1.CurlImpersonate({
        defaultTimeout: options.timeout || 30000,
        ...options
    });
}
/**
 * Handle a Puppeteer request using curl-impersonate
 * Use this function inside page.on('request', ...) handler
 */
async function handleRequestWithCurl(request, curlImpersonate, options = {}) {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();
    const postData = request.postData();
    if (options.enableDebug) {
        console.log(`[CurlInterception] Handling request: ${method} ${url}`);
    }
    try {
        // Prepare request options for curl-impersonate
        const requestOptions = {
            method,
            headers,
            body: postData,
            timeout: options.timeout,
            ...options
        };
        // Execute request using curl-impersonate
        const response = await curlImpersonate.request(url, requestOptions, options.fingerprintName);
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
    }
    catch (error) {
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
function createRequestInterceptor(curlImpersonate, options = {}) {
    return async (request) => {
        try {
            const response = await handleRequestWithCurl(request, curlImpersonate, options);
            // Respond to the intercepted request
            await request.respond({
                status: response.status,
                contentType: response.contentType,
                headers: response.headers,
                body: response.body,
            });
        }
        catch (error) {
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
async function setupCurlInterception(page, options = {}) {
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
function shouldInterceptUrl(url, includePatterns, excludePatterns) {
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
function createSelectiveRequestInterceptor(curlImpersonate, options = {}) {
    return async (request) => {
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
        }
        catch (error) {
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
function exampleUsage() {
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
//# sourceMappingURL=puppeteer-scraper.js.map