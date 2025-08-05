"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareScraper = exports.ProxyError = exports.CloudflareError = void 0;
const curl_impersonate_1 = require("./curl-impersonate");
const debug_1 = require("./debug");
const crypto_1 = require("crypto");
const node_html_parser_1 = require("node-html-parser");
// Cloudflare-specific error types
class CloudflareError extends Error {
    constructor(message, code, response, retryable = true) {
        super(message);
        this.code = code;
        this.response = response;
        this.retryable = retryable;
        this.name = 'CloudflareError';
    }
}
exports.CloudflareError = CloudflareError;
class ProxyError extends Error {
    constructor(message, code, proxy, retryable = true) {
        super(message);
        this.code = code;
        this.proxy = proxy;
        this.retryable = retryable;
        this.name = 'ProxyError';
    }
}
exports.ProxyError = ProxyError;
class CloudflareScraper {
    constructor(config = {}) {
        this.sessions = new Map();
        this.proxyIndex = 0;
        this.config = {
            session: {
                enabled: true,
                maxAge: 30 * 60 * 1000, // 30 minutes
                autoRotate: true,
                rotateOnError: true,
                maxRetries: 3,
                ...config.session
            },
            cloudflare: {
                enabled: true,
                autoRetry: true,
                maxRetries: 3,
                challengeTimeout: 30000,
                jsChallenge: true,
                captchaChallenge: false,
                fingerprintRotation: true,
                ...config.cloudflare
            },
            proxyRotation: {
                enabled: false,
                proxies: [],
                autoSwitch: true,
                maxFailures: 3,
                cooldownTime: 5000,
                strategy: 'round-robin',
                ...config.proxyRotation
            }
        };
        this.curlImpersonate = new curl_impersonate_1.CurlImpersonate({
            binariesPath: config.binariesPath || '/Users/c0re/Software/curl-impersonate-v1.1.2.arm64-macos'
        });
    }
    /**
     * Create a new session
     */
    createSession(fingerprint) {
        const sessionId = (0, crypto_1.randomUUID)();
        const availableBrowsers = this.curlImpersonate.getAvailableBrowsers();
        const selectedFingerprint = fingerprint || availableBrowsers[Math.floor(Math.random() * availableBrowsers.length)];
        const session = {
            id: sessionId,
            cookies: {},
            userAgent: selectedFingerprint.userAgent,
            fingerprint: selectedFingerprint,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            requestCount: 0,
            errorCount: 0
        };
        this.sessions.set(sessionId, session);
        // Debug logging
        debug_1.debugLogger.logSessionCreated(session);
        return session;
    }
    /**
     * Get or create session based on configuration
     */
    getSession(sessionId, forceNew = false) {
        if (!this.config.session.enabled || forceNew) {
            return this.createSession();
        }
        if (sessionId && this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId);
            // Check if session is expired
            if (this.config.session.maxAge && (Date.now() - session.createdAt) > this.config.session.maxAge) {
                this.sessions.delete(sessionId);
                return this.createSession();
            }
            return session;
        }
        return this.createSession();
    }
    /**
     * Make request with Cloudflare and proxy error handling
     */
    async request(url, options = {}, sessionId) {
        let session = this.getSession(sessionId);
        let attempts = 0;
        let lastError;
        let allErrors = [];
        // Debug logging
        debug_1.debugLogger.logCloudflareRequest(url, options, session.id);
        while (attempts < (this.config.session.maxRetries || 3)) {
            attempts++;
            try {
                // Update session usage
                session.lastUsed = Date.now();
                session.requestCount++;
                // Get proxy if rotation is enabled
                if (this.config.proxyRotation.enabled) {
                    const proxy = this.getNextProxy();
                    if (proxy) {
                        options.proxy = proxy;
                        session.proxy = proxy;
                        debug_1.debugLogger.logProxyRequest(proxy, url);
                    }
                }
                // Prepare request with session cookies
                const requestOptions = {
                    ...options,
                    cookies: { ...session.cookies, ...options.cookies },
                    headers: {
                        'User-Agent': session.userAgent,
                        ...options.headers
                    }
                };
                // Make request
                const response = await this.curlImpersonate.request(url, requestOptions, session.fingerprint);
                // Debug logging with file saving
                debug_1.debugLogger.logResponseWithFile(response, 0, `cloudflare-${session.id}`);
                // Check for Cloudflare challenges
                if (this.isCloudflareChallenge(response)) {
                    debug_1.debugLogger.logCloudflareChallenge(response, session.id);
                    const cfError = this.handleCloudflareChallenge(response, session);
                    if (this.config.cloudflare.autoRetry && this.config.session.rotateOnError) {
                        session = this.rotateSession(session);
                        continue;
                    }
                    throw cfError;
                }
                if (this.isCloudflareBlocked(response)) {
                    debug_1.debugLogger.logCloudflareError(response, session.id);
                    if (this.config.cloudflare.autoRetry && this.config.session.rotateOnError) {
                        session = this.rotateSession(session);
                        continue;
                    }
                    throw new CloudflareError('Cloudflare blocked', 'CF_BLOCKED', response, false);
                }
                // Update session cookies
                this.updateSessionCookies(session, response);
                return response;
            }
            catch (error) {
                lastError = error;
                session.errorCount++;
                // Record this error attempt
                allErrors.push({
                    attempt: attempts,
                    error: error,
                    timestamp: Date.now()
                });
                // Debug logging
                debug_1.debugLogger.logCloudflareError(error, session.id);
                // Handle different error types
                if (this.isProxyError(error)) {
                    debug_1.debugLogger.logProxyError(session.proxy, error);
                    const proxyError = this.handleProxyError(error, session);
                    if (this.config.proxyRotation.autoSwitch) {
                        this.markProxyFailed(session.proxy);
                        session = this.rotateSession(session);
                        continue;
                    }
                    throw proxyError;
                }
                if (this.isCloudflareError(error)) {
                    if (this.config.session.rotateOnError) {
                        session = this.rotateSession(session);
                        continue;
                    }
                }
                // For other errors, check if retryable
                if (attempts < (this.config.session.maxRetries || 3)) {
                    await this.delay(1000 * attempts); // Exponential backoff
                    continue;
                }
                break;
            }
        }
        // Create detailed error message with all collected errors
        const errorDetails = allErrors.map(({ attempt, error, timestamp }) => {
            const timeStr = new Date(timestamp).toISOString();
            return `Attempt ${attempt} (${timeStr}): ${error.message}`;
        }).join('\n');
        // Log retry summary for debugging
        debug_1.debugLogger.logRetrySummary(allErrors, session.id);
        const maxRetriesError = new Error(`Max retries exceeded (${attempts} attempts).\n\nError details:\n${errorDetails}`);
        maxRetriesError.name = 'MaxRetriesExceededError';
        maxRetriesError.attempts = attempts;
        maxRetriesError.allErrors = allErrors;
        maxRetriesError.lastError = lastError;
        throw maxRetriesError;
    }
    isCloudflareBlocked(response) {
        return response.statusCode === 403;
    }
    /**
     * Check if response is a Cloudflare challenge
     */
    isCloudflareChallenge(response) {
        // DISABLED: We don't know exactly what Cloudflare challenges look like yet
        // Only implement when we have definitive examples
        // x-cache: Error from cloudfront
        return false;
    }
    /**
     * Handle Cloudflare challenge
     */
    handleCloudflareChallenge(response, session) {
        // DISABLED: We don't know exactly what Cloudflare challenges look like yet
        // Only implement when we have definitive examples
        throw new CloudflareError('Cloudflare challenge detection disabled - implement when we have real examples', 'CF_CHALLENGE', response, false);
    }
    /**
     * Check if error is proxy-related
     */
    isProxyError(error) {
        const proxyErrors = [
            'connection refused',
            'connection timeout',
            'dns resolution failed',
            'authentication failed',
            'proxy authentication',
            'socks',
            'proxy error'
        ];
        const message = error.message?.toLowerCase() || '';
        return proxyErrors.some(proxyError => message.includes(proxyError));
    }
    /**
     * Handle proxy errors
     */
    handleProxyError(error, session) {
        const message = error.message?.toLowerCase() || '';
        if (message.includes('connection refused')) {
            return new ProxyError('Proxy connection refused', 'PROXY_REFUSED', session.proxy);
        }
        if (message.includes('timeout')) {
            return new ProxyError('Proxy connection timeout', 'PROXY_TIMEOUT', session.proxy);
        }
        if (message.includes('authentication')) {
            return new ProxyError('Proxy authentication failed', 'PROXY_AUTH_FAILED', session.proxy);
        }
        if (message.includes('dns')) {
            return new ProxyError('Proxy DNS resolution failed', 'PROXY_DNS_ERROR', session.proxy);
        }
        return new ProxyError('Proxy connection error', 'PROXY_CONNECTION_ERROR', session.proxy);
    }
    /**
     * Check if error is Cloudflare-related
     */
    isCloudflareError(error) {
        return error instanceof CloudflareError;
    }
    /**
     * Get next proxy from rotation
     */
    getNextProxy() {
        if (!this.config.proxyRotation.enabled || !this.config.proxyRotation.proxies.length) {
            return undefined;
        }
        const availableProxies = this.config.proxyRotation.proxies.filter(p => !p.failCount || p.failCount < (this.config.proxyRotation.maxFailures || 3));
        if (!availableProxies.length) {
            return undefined;
        }
        let selectedProxy;
        switch (this.config.proxyRotation.strategy) {
            case 'round-robin':
                selectedProxy = availableProxies[this.proxyIndex % availableProxies.length];
                this.proxyIndex++;
                break;
            case 'random':
                selectedProxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
                break;
            case 'failover':
                selectedProxy = availableProxies[0];
                break;
            default:
                selectedProxy = availableProxies[0];
        }
        selectedProxy.lastUsed = Date.now();
        return selectedProxy;
    }
    /**
     * Mark proxy as failed
     */
    markProxyFailed(proxy) {
        if (proxy) {
            proxy.failCount = (proxy.failCount || 0) + 1;
        }
    }
    /**
     * Rotate session (new fingerprint)
     */
    rotateSession(session) {
        const availableBrowsers = this.curlImpersonate.getAvailableBrowsers();
        const newFingerprint = availableBrowsers[Math.floor(Math.random() * availableBrowsers.length)];
        const oldFingerprint = session.fingerprint;
        session.fingerprint = newFingerprint;
        session.userAgent = newFingerprint.userAgent;
        session.errorCount = 0;
        // Debug logging
        debug_1.debugLogger.logSessionRotation(session.id, 'Cloudflare challenge or error');
        debug_1.debugLogger.logSessionUpdated(session.id, {
            oldFingerprint: oldFingerprint.name,
            newFingerprint: newFingerprint.name,
            oldUserAgent: oldFingerprint.userAgent.substring(0, 60) + '...',
            newUserAgent: newFingerprint.userAgent.substring(0, 60) + '...'
        });
        return session;
    }
    /**
     * Update session cookies from response
     */
    updateSessionCookies(session, response) {
        const setCookieHeaders = response.headers['set-cookie'] || response.headers['Set-Cookie'];
        if (setCookieHeaders) {
            const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
            for (const cookieHeader of cookies) {
                // Split multiple cookies in the same header
                const individualCookies = cookieHeader.split(', ');
                for (const cookie of individualCookies) {
                    const [nameValue] = cookie.split(';');
                    const [name, value] = nameValue.split('=');
                    if (name && value) {
                        session.cookies[name.trim()] = value.trim();
                    }
                }
            }
            // Debug logging
            debug_1.debugLogger.logSessionCookies(session.id, session.cookies);
        }
    }
    /**
     * Utility to delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get available browsers
     */
    getAvailableBrowsers() {
        return this.curlImpersonate.getAvailableBrowsers();
    }
    /**
     * Get session statistics
     */
    getSessionStats() {
        const now = Date.now();
        let active = 0;
        let expired = 0;
        for (const session of this.sessions.values()) {
            if (this.config.session.maxAge && (now - session.createdAt) > this.config.session.maxAge) {
                expired++;
            }
            else {
                active++;
            }
        }
        return {
            total: this.sessions.size,
            active,
            expired
        };
    }
    /**
     * Clean expired sessions
     */
    cleanExpiredSessions() {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, session] of this.sessions.entries()) {
            if (this.config.session.maxAge && (now - session.createdAt) > this.config.session.maxAge) {
                this.sessions.delete(id);
                cleaned++;
            }
        }
        return cleaned;
    }
    /**
     * Get complete session state for persistence
     */
    getSessionState(sessionId) {
        const session = this.getSession(sessionId);
        return {
            id: session.id,
            cookies: { ...session.cookies },
            userAgent: session.userAgent,
            fingerprint: session.fingerprint,
            createdAt: session.createdAt,
            lastUsed: session.lastUsed,
            requestCount: session.requestCount,
            errorCount: session.errorCount
        };
    }
    /**
     * Restore complete session state from persistence
     */
    restoreSessionState(sessionState) {
        // Create or get the session
        let session = this.sessions.get(sessionState.id);
        if (!session) {
            // Create new session with the saved state
            session = {
                id: sessionState.id,
                cookies: { ...sessionState.cookies },
                userAgent: sessionState.userAgent,
                fingerprint: sessionState.fingerprint,
                proxy: sessionState.proxy,
                createdAt: sessionState.createdAt,
                lastUsed: sessionState.lastUsed,
                requestCount: sessionState.requestCount,
                errorCount: sessionState.errorCount
            };
            this.sessions.set(session.id, session);
        }
        else {
            // Update existing session with saved state
            session.cookies = { ...sessionState.cookies };
            session.userAgent = sessionState.userAgent;
            session.fingerprint = sessionState.fingerprint;
            session.lastUsed = sessionState.lastUsed;
            session.requestCount = sessionState.requestCount;
            session.errorCount = sessionState.errorCount;
        }
    }
    /**
     * Get session cookies for persistence (backward compatibility)
     */
    getSessionCookies(sessionId) {
        const session = this.getSession(sessionId);
        return { ...session.cookies };
    }
    /**
     * Restore session cookies from persistence (backward compatibility)
     */
    restoreSessionCookies(cookies, sessionId) {
        const session = this.getSession(sessionId);
        session.cookies = { ...cookies };
    }
    /**
     * Check if response is HTML
     */
    isHtmlResponse(response) {
        const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
        return contentType.includes('text/html') ||
            response.body.toLowerCase().includes('<!doctype html') ||
            response.body.toLowerCase().includes('<html');
    }
    /**
     * Parse HTML response and return structured data
     */
    parseHtml(response, options = {}) {
        if (!this.isHtmlResponse(response)) {
            throw new Error('Response is not HTML');
        }
        const html = response.body;
        const root = (0, node_html_parser_1.parse)(html);
        return {
            elements: this.convertNodeToElements(root),
            getElementById: (id) => this.getElementById(root, id),
            querySelector: (selector) => this.querySelector(root, selector),
            querySelectorAll: (selector) => this.querySelectorAll(root, selector),
            getScriptData: (scriptId) => this.getScriptData(root, scriptId)
        };
    }
    /**
     * Convert node-html-parser node to our HtmlElement interface
     */
    convertNodeToElements(node) {
        const elements = [];
        if (node.childNodes) {
            for (const child of node.childNodes) {
                if (child.nodeType === 1) { // Element node
                    const element = {
                        tagName: child.tagName?.toLowerCase() || '',
                        id: child.id,
                        className: child.attributes?.class || child.className,
                        textContent: child.text,
                        innerHTML: child.innerHTML,
                        attributes: child.attributes || {},
                        children: this.convertNodeToElements(child)
                    };
                    elements.push(element);
                }
            }
        }
        return elements;
    }
    /**
     * Get element by ID using node-html-parser
     */
    getElementById(root, id) {
        const element = root.getElementById(id);
        if (!element)
            return null;
        return {
            tagName: element.tagName?.toLowerCase() || '',
            id: element.id,
            className: element.attributes?.class || element.className,
            textContent: element.text,
            innerHTML: element.innerHTML,
            attributes: element.attributes || {},
            children: this.convertNodeToElements(element)
        };
    }
    /**
     * Query selector using node-html-parser
     */
    querySelector(root, selector) {
        const element = root.querySelector(selector);
        if (!element)
            return null;
        return {
            tagName: element.tagName?.toLowerCase() || '',
            id: element.id,
            className: element.attributes?.class || element.className,
            textContent: element.text,
            innerHTML: element.innerHTML,
            attributes: element.attributes || {},
            children: this.convertNodeToElements(element)
        };
    }
    /**
     * Query selector all using node-html-parser
     */
    querySelectorAll(root, selector) {
        const elements = root.querySelectorAll(selector);
        return elements.map((element) => ({
            tagName: element.tagName?.toLowerCase() || '',
            id: element.id,
            className: element.attributes?.class || element.className,
            textContent: element.text,
            innerHTML: element.innerHTML,
            attributes: element.attributes || {},
            children: this.convertNodeToElements(element)
        }));
    }
    /**
     * Get script data from specific script tag
     */
    getScriptData(root, scriptId) {
        const targetId = scriptId || '__NEXT_DATA__';
        const scriptElement = root.getElementById(targetId);
        if (!scriptElement || scriptElement.tagName?.toLowerCase() !== 'script') {
            return null;
        }
        try {
            // Extract JSON content from script tag
            const content = scriptElement.text || scriptElement.innerHTML;
            return JSON.parse(content);
        }
        catch (error) {
            debug_1.debugLogger.logCurlError(error, `Failed to parse script data from ${targetId}`);
            return null;
        }
    }
    /**
     * Make request and parse HTML response
     */
    async requestHtml(url, options = {}, sessionId) {
        const response = await this.request(url, options, sessionId);
        if (!this.isHtmlResponse(response)) {
            throw new Error('Response is not HTML');
        }
        const html = this.parseHtml(response);
        return { response, html };
    }
    /**
     * Make request and extract data from specific script tag
     */
    async requestScriptData(url, scriptId = '__NEXT_DATA__', options = {}, sessionId) {
        const { html } = await this.requestHtml(url, options, sessionId);
        return html.getScriptData(scriptId);
    }
}
exports.CloudflareScraper = CloudflareScraper;
//# sourceMappingURL=cloudflare-scraper.js.map