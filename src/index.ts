// Export the curl-impersonate wrapper (for direct use)
export { CurlImpersonate } from './curl-impersonate';

// Export the Cloudflare wrapper
export { CloudflareScraper, CloudflareError, ProxyError } from './cloudflare-scraper';
export type {
    SessionConfig,
    CloudflareConfig,
    ProxyRotationConfig,
    ScrapingSession,
    HtmlParseOptions,
    HtmlElement,
    HtmlParseResult,
    CloudflareScraperConfig
} from './cloudflare-scraper';

// Export the Puppeteer integration utilities
export {
    createCurlImpersonate,
    handleRequestWithCurl,
    createRequestInterceptor,
    shouldInterceptUrl,
    createSelectiveRequestInterceptor,
    exampleUsage
} from './puppeteer-scraper';
export type {
    CurlInterceptionOptions,
    InterceptedResponse
} from './puppeteer-scraper';

// Export debug utilities
export { debugLogger } from './debug';
export type { DebugConfig } from './debug';

// Export all types
export * from './types'; 