"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurlScraper = void 0;
const curl_impersonate_1 = require("./curl-impersonate");
const crypto_1 = require("crypto");
class CurlScraper {
    constructor(config = {}) {
        this.sessions = new Map();
        this.proxyIndex = 0;
        this.lastRequestTime = 0;
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 30000,
            followRedirects: true,
            maxRedirects: 5,
            verifySSL: true,
            ...config
        };
        this.curlImpersonate = new curl_impersonate_1.CurlImpersonate({
            binariesPath: './binaries',
            defaultTimeout: this.config.timeout,
            defaultMaxRedirects: this.config.maxRedirects,
            defaultVerifySSL: this.config.verifySSL
        });
    }
    /**
     * Create a new scraping session
     */
    createSession(fingerprint) {
        const sessionId = (0, crypto_1.randomUUID)();
        const defaultFingerprint = this.curlImpersonate.getFingerprintConfig('chrome136-macos');
        const selectedFingerprint = fingerprint || defaultFingerprint;
        const session = {
            id: sessionId,
            cookies: {},
            userAgent: selectedFingerprint.headers['User-Agent'],
            fingerprint: selectedFingerprint,
            retryCount: 0,
            lastRequestTime: Date.now()
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    /**
     * Get or create a session
     */
    getSession(sessionId) {
        if (sessionId && this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }
        return this.createSession();
    }
    /**
     * Make a single request with Cloudflare bypass
     */
    async scrape(url, options = {}) {
        const startTime = Date.now();
        let attempts = 0;
        let lastError;
        while (attempts < (this.config.maxRetries || 3)) {
            attempts++;
            try {
                // Rate limiting
                await this.handleRateLimiting();
                // Get or create session
                const session = options.session || this.createSession();
                // Handle proxy rotation
                const proxy = await this.getNextProxy();
                if (proxy) {
                    options.proxy = proxy;
                }
                // Prepare request options
                const requestOptions = {
                    ...options,
                    cookies: { ...session.cookies, ...options.cookies },
                    headers: {
                        'User-Agent': session.userAgent,
                        ...options.headers
                    }
                };
                // Get fingerprint name
                const fingerprintName = this.getFingerprintName(session.fingerprint);
                // Make request
                const response = await this.curlImpersonate.request(url, requestOptions, fingerprintName);
                // Update session
                session.lastRequestTime = Date.now();
                this.updateSessionCookies(session, response);
                // Check for Cloudflare challenges
                if (this.isCloudflareChallenge(response)) {
                    const challengeResult = await this.handleCloudflareChallenge(url, response, session);
                    if (challengeResult.success) {
                        return challengeResult;
                    }
                    continue;
                }
                // Parse response
                let data;
                if (this.isJsonResponse(response)) {
                    try {
                        data = JSON.parse(response.body);
                    }
                    catch (error) {
                        console.warn('Failed to parse JSON response:', error);
                    }
                }
                return {
                    success: true,
                    data,
                    response,
                    session,
                    attempts,
                    duration: Date.now() - startTime
                };
            }
            catch (error) {
                lastError = this.parseError(error);
                // Check if error is retryable
                if (!this.isRetryableError(lastError)) {
                    break;
                }
                // Delay before retry
                if (attempts < (this.config.maxRetries || 3)) {
                    await this.delay(this.config.retryDelay || 1000);
                }
            }
        }
        return {
            success: false,
            error: lastError,
            attempts,
            duration: Date.now() - startTime
        };
    }
    /**
     * Make batch requests with concurrency control
     */
    async batchScrape(urls, options = {}) {
        const startTime = Date.now();
        const results = [];
        let successfulRequests = 0;
        let failedRequests = 0;
        let cloudflareChallenges = 0;
        let proxyFailures = 0;
        // Configure concurrency
        const maxConcurrent = this.config.multiThreading?.maxWorkers || 5;
        const chunks = this.chunkArray(urls, maxConcurrent);
        for (const chunk of chunks) {
            const chunkPromises = chunk.map(url => this.scrape(url, options));
            const chunkResults = await Promise.all(chunkPromises);
            for (const result of chunkResults) {
                results.push(result);
                if (result.success) {
                    successfulRequests++;
                }
                else {
                    failedRequests++;
                    if (result.error?.code?.includes('CF_')) {
                        cloudflareChallenges++;
                    }
                    if (result.error?.proxyFailed) {
                        proxyFailures++;
                    }
                }
            }
        }
        const totalRequests = results.length;
        const averageResponseTime = results.reduce((sum, result) => sum + result.duration, 0) / totalRequests;
        return {
            results,
            totalRequests,
            successfulRequests,
            failedRequests,
            averageResponseTime,
            cloudflareChallenges,
            proxyFailures
        };
    }
    /**
     * Check if response is a Cloudflare challenge
     */
    isCloudflareChallenge(response) {
        return response.statusCode === 403 ||
            response.statusCode === 429 ||
            response.body.includes('cloudflare') ||
            response.body.includes('cf-browser-verification') ||
            response.body.includes('cf_challenge');
    }
    /**
     * Handle Cloudflare challenge
     */
    async handleCloudflareChallenge(url, response, session) {
        // For now, we'll just return an error
        // In a real implementation, you might want to:
        // 1. Parse the challenge page
        // 2. Execute JavaScript if needed
        // 3. Submit the challenge response
        // 4. Retry the original request
        return {
            success: false,
            error: {
                code: 'CF_CHALLENGE',
                message: 'Cloudflare challenge detected',
                details: 'Challenge handling not implemented',
                cloudflareBlocked: true,
                retryable: true
            },
            attempts: 1,
            duration: 0
        };
    }
    /**
     * Get next proxy from rotation
     */
    async getNextProxy() {
        if (!this.config.proxyRotation?.enabled || !this.config.proxyRotation.proxies.length) {
            return undefined;
        }
        const proxies = this.config.proxyRotation.proxies;
        const availableProxies = proxies.filter(p => !p.failCount || p.failCount < (this.config.proxyRotation?.maxFailures || 3));
        if (!availableProxies.length) {
            return undefined;
        }
        switch (this.config.proxyRotation?.rotationStrategy || 'round-robin') {
            case 'round-robin':
                const proxy = availableProxies[this.proxyIndex % availableProxies.length];
                this.proxyIndex++;
                return proxy;
            case 'random':
                return availableProxies[Math.floor(Math.random() * availableProxies.length)];
            case 'failover':
                return availableProxies[0];
            default:
                return availableProxies[0];
        }
    }
    /**
     * Handle rate limiting
     */
    async handleRateLimiting() {
        if (!this.config.rateLimiting?.enabled) {
            return;
        }
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = this.config.rateLimiting.delayBetweenRequests || 1000;
        if (timeSinceLastRequest < minDelay) {
            await this.delay(minDelay - timeSinceLastRequest);
        }
        this.lastRequestTime = Date.now();
    }
    /**
     * Update session cookies from response
     */
    updateSessionCookies(session, response) {
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
            const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
            cookies.forEach(cookie => {
                const [nameValue] = cookie.split(';');
                const [name, value] = nameValue.split('=');
                if (name && value) {
                    session.cookies[name.trim()] = value.trim();
                }
            });
        }
    }
    /**
     * Check if response is JSON
     */
    isJsonResponse(response) {
        const contentType = response.headers['content-type'] || '';
        return contentType.includes('application/json') ||
            response.body.startsWith('{') ||
            response.body.startsWith('[');
    }
    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        return error.retryable !== false;
    }
    /**
     * Parse error into CurlError format
     */
    parseError(error) {
        if (error.code && error.message) {
            return error;
        }
        return {
            code: 'UNKNOWN_ERROR',
            message: error.message || 'Unknown error',
            details: error.stack
        };
    }
    /**
     * Utility to delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Split array into chunks
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    /**
     * Get available fingerprints
     */
    getAvailableFingerprints() {
        return this.curlImpersonate.getAvailableFingerprints();
    }
    /**
     * Get statistics
     */
    getStats() {
        return {
            sessions: this.sessions.size,
            config: this.config
        };
    }
    /**
     * Get fingerprint name from configuration
     */
    getFingerprintName(fingerprint) {
        return `${fingerprint.browser}${fingerprint.version}-${fingerprint.os}`;
    }
}
exports.CurlScraper = CurlScraper;
//# sourceMappingURL=scraper.js.map