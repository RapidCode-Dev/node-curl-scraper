"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLogger = exports.exampleUsage = exports.createSelectiveRequestInterceptor = exports.shouldInterceptUrl = exports.createRequestInterceptor = exports.handleRequestWithCurl = exports.createCurlImpersonate = exports.ProxyError = exports.CloudflareError = exports.CloudflareScraper = exports.CurlImpersonate = void 0;
// Export the curl-impersonate wrapper (for direct use)
var curl_impersonate_1 = require("./curl-impersonate");
Object.defineProperty(exports, "CurlImpersonate", { enumerable: true, get: function () { return curl_impersonate_1.CurlImpersonate; } });
// Export the Cloudflare wrapper
var cloudflare_scraper_1 = require("./cloudflare-scraper");
Object.defineProperty(exports, "CloudflareScraper", { enumerable: true, get: function () { return cloudflare_scraper_1.CloudflareScraper; } });
Object.defineProperty(exports, "CloudflareError", { enumerable: true, get: function () { return cloudflare_scraper_1.CloudflareError; } });
Object.defineProperty(exports, "ProxyError", { enumerable: true, get: function () { return cloudflare_scraper_1.ProxyError; } });
// Export the Puppeteer integration utilities
var puppeteer_scraper_1 = require("./puppeteer-scraper");
Object.defineProperty(exports, "createCurlImpersonate", { enumerable: true, get: function () { return puppeteer_scraper_1.createCurlImpersonate; } });
Object.defineProperty(exports, "handleRequestWithCurl", { enumerable: true, get: function () { return puppeteer_scraper_1.handleRequestWithCurl; } });
Object.defineProperty(exports, "createRequestInterceptor", { enumerable: true, get: function () { return puppeteer_scraper_1.createRequestInterceptor; } });
Object.defineProperty(exports, "shouldInterceptUrl", { enumerable: true, get: function () { return puppeteer_scraper_1.shouldInterceptUrl; } });
Object.defineProperty(exports, "createSelectiveRequestInterceptor", { enumerable: true, get: function () { return puppeteer_scraper_1.createSelectiveRequestInterceptor; } });
Object.defineProperty(exports, "exampleUsage", { enumerable: true, get: function () { return puppeteer_scraper_1.exampleUsage; } });
// Export debug utilities
var debug_1 = require("./debug");
Object.defineProperty(exports, "debugLogger", { enumerable: true, get: function () { return debug_1.debugLogger; } });
// Export all types
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map