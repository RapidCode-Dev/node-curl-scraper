"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareScraper = exports.ProxyError = exports.CloudflareError = void 0;
const curl_impersonate_1 = require("./curl-impersonate");
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
        this.curlImpersonate = new curl_impersonate_1.CurlImpersonate({
            binariesPath: config.binariesPath || './binaries'
        });
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
                challengeTimeout: 10000,
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
                cooldownTime: 60000, // 1 minute
                strategy: 'round-robin',
                ...config.proxyRotation
            }
        };
    }
    createSession(fingerprint) {
        const sessionId = (0, crypto_1.randomUUID)();
        const availableFingerprints = this.curlImpersonate.getAvailableFingerprints();
        // Automatically select a random fingerprint if none provided
        let selectedFingerprint;
        if (fingerprint) {
            selectedFingerprint = fingerprint;
        }
        else {
            const randomFingerprintName = availableFingerprints[Math.floor(Math.random() * availableFingerprints.length)];
            selectedFingerprint = this.curlImpersonate.getFingerprintConfig(randomFingerprintName) ||
                this.curlImpersonate.getFingerprintConfig('chrome131-android');
        }
        const session = {
            id: sessionId,
            cookies: {},
            userAgent: selectedFingerprint.headers['User-Agent'],
            fingerprint: selectedFingerprint,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            requestCount: 0,
            errorCount: 0
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    getSession(sessionId, forceNew = false) {
        // If no sessionId provided and auto-rotation is enabled, create new session
        if (!sessionId && this.config.session.autoRotate) {
            return this.createSession();
        }
        // If forceNew is true, create new session
        if (forceNew) {
            return this.createSession();
        }
        // If sessionId provided, try to get existing session
        if (sessionId) {
            let session = this.sessions.get(sessionId);
            if (!session || this.isSessionExpired(session)) {
                session = this.createSession();
            }
            session.lastUsed = Date.now();
            session.requestCount++;
            return session;
        }
        // Default: create new session
        return this.createSession();
    }
    async request(url, options = {}, sessionId) {
        // Automatic session management based on config
        let session;
        if (this.config.session.enabled) {
            // Use provided sessionId or get/create session automatically
            session = this.getSession(sessionId);
        }
        else {
            // Session management disabled - create temporary session
            session = this.createSession();
        }
        const fingerprintName = this.getFingerprintName(session.fingerprint);
        try {
            const response = await this.curlImpersonate.request(url, options, fingerprintName);
            // Update session cookies
            this.updateSessionCookies(session, response);
            // Check for Cloudflare challenges
            if (this.isCloudflareChallenge(response)) {
                throw this.handleCloudflareChallenge(response, session);
            }
            return response;
        }
        catch (error) {
            session.errorCount++;
            // Handle proxy errors
            if (this.isProxyError(error)) {
                throw this.handleProxyError(error, session);
            }
            // Handle Cloudflare errors
            if (this.isCloudflareError(error)) {
                throw error;
            }
            // Rotate session on error if configured
            if (this.config.session.rotateOnError && session.errorCount >= this.config.session.maxRetries) {
                this.rotateSession(session);
            }
            throw error;
        }
    }
    getFingerprintName(fingerprint) {
        // Convert fingerprint to name format
        if (!fingerprint) {
            const availableFingerprints = this.curlImpersonate.getAvailableFingerprints();
            return availableFingerprints[0] || 'chrome131-android';
        }
        return `${fingerprint.browser}${fingerprint.version}-${fingerprint.os}`;
    }
    isSessionExpired(session) {
        return Date.now() - session.createdAt > this.config.session.maxAge;
    }
    isCloudflareBlocked(response) {
        return response.statusCode === 403 ||
            response.statusCode === 429;
    }
    isCloudflareChallenge(response) {
        // TODO: Implement Cloudflare challenge detection
        return false;
    }
    handleCloudflareChallenge(response, session) {
        const message = `Cloudflare challenge detected: ${response.statusCode}`;
        return new CloudflareError(message, 'CF_CHALLENGE', response);
    }
    isProxyError(error) {
        return error.proxyFailed ||
            error.code?.includes('PROXY') ||
            error.message?.includes('proxy');
    }
    handleProxyError(error, session) {
        if (session.proxy) {
            this.markProxyFailed(session.proxy);
        }
        const message = `Proxy error: ${error.message}`;
        return new ProxyError(message, 'PROXY_CONNECTION_ERROR', session.proxy);
    }
    isCloudflareError(error) {
        return error instanceof CloudflareError ||
            error.code?.includes('CF_') ||
            error.message?.includes('cloudflare');
    }
    getNextProxy() {
        if (!this.config.proxyRotation.enabled || this.config.proxyRotation.proxies.length === 0) {
            return undefined;
        }
        switch (this.config.proxyRotation.strategy) {
            case 'round-robin':
                const proxy = this.config.proxyRotation.proxies[this.proxyIndex];
                this.proxyIndex = (this.proxyIndex + 1) % this.config.proxyRotation.proxies.length;
                return proxy;
            case 'random':
                const randomIndex = Math.floor(Math.random() * this.config.proxyRotation.proxies.length);
                return this.config.proxyRotation.proxies[randomIndex];
            case 'failover':
                return this.config.proxyRotation.proxies.find(p => !p.failCount || p.failCount < this.config.proxyRotation.maxFailures) || this.config.proxyRotation.proxies[0];
            default:
                return this.config.proxyRotation.proxies[0];
        }
    }
    markProxyFailed(proxy) {
        if (!proxy)
            return;
        proxy.failCount = (proxy.failCount || 0) + 1;
        proxy.lastUsed = Date.now();
        if (proxy.failCount >= this.config.proxyRotation.maxFailures) {
            console.warn(`Proxy ${proxy.host}:${proxy.port} marked as failed`);
        }
    }
    rotateSession(session) {
        // Get a new fingerprint
        const availableFingerprints = this.curlImpersonate.getAvailableFingerprints();
        const randomFingerprintName = availableFingerprints[Math.floor(Math.random() * availableFingerprints.length)];
        const newFingerprint = this.curlImpersonate.getFingerprintConfig(randomFingerprintName);
        if (newFingerprint) {
            session.fingerprint = newFingerprint;
            session.userAgent = newFingerprint.headers['User-Agent'];
        }
        // Get a new proxy if available
        const newProxy = this.getNextProxy();
        if (newProxy) {
            session.proxy = newProxy;
        }
        session.errorCount = 0;
        session.lastUsed = Date.now();
        return session;
    }
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getAvailableFingerprints() {
        return this.curlImpersonate.getAvailableFingerprints();
    }
    getSessionStats() {
        const now = Date.now();
        let active = 0;
        let expired = 0;
        this.sessions.forEach(session => {
            if (this.isSessionExpired(session)) {
                expired++;
            }
            else {
                active++;
            }
        });
        return {
            total: this.sessions.size,
            active,
            expired
        };
    }
    cleanExpiredSessions() {
        const before = this.sessions.size;
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (this.isSessionExpired(session)) {
                this.sessions.delete(sessionId);
            }
        }
        return before - this.sessions.size;
    }
    getSessionState(sessionId) {
        const session = this.getSession(sessionId);
        return {
            id: session.id,
            cookies: session.cookies,
            userAgent: session.userAgent,
            fingerprint: session.fingerprint,
            proxy: session.proxy,
            createdAt: session.createdAt,
            lastUsed: session.lastUsed,
            requestCount: session.requestCount,
            errorCount: session.errorCount
        };
    }
    restoreSessionState(sessionState) {
        const session = {
            id: sessionState.id,
            cookies: sessionState.cookies || {},
            userAgent: sessionState.userAgent || '',
            fingerprint: sessionState.fingerprint,
            proxy: sessionState.proxy,
            createdAt: sessionState.createdAt || Date.now(),
            lastUsed: sessionState.lastUsed || Date.now(),
            requestCount: sessionState.requestCount || 0,
            errorCount: sessionState.errorCount || 0
        };
        this.sessions.set(session.id, session);
    }
    getSessionCookies(sessionId) {
        const session = this.getSession(sessionId);
        return { ...session.cookies };
    }
    restoreSessionCookies(cookies, sessionId) {
        const session = this.getSession(sessionId);
        session.cookies = { ...cookies };
    }
    isHtmlResponse(response) {
        const contentType = response.headers['content-type'] || '';
        return contentType.includes('text/html') ||
            contentType.includes('application/xhtml+xml') ||
            response.body.includes('<!DOCTYPE html') ||
            response.body.includes('<html');
    }
    parseHtml(response, options = {}) {
        if (!this.isHtmlResponse(response)) {
            throw new Error('Response is not HTML');
        }
        const root = (0, node_html_parser_1.parse)(response.body);
        const elements = this.convertNodeToElements(root);
        return {
            elements,
            getElementById: (id) => this.getElementById(root, id),
            querySelector: (selector) => this.querySelector(root, selector),
            querySelectorAll: (selector) => this.querySelectorAll(root, selector),
            getScriptData: (scriptId) => this.getScriptData(root, scriptId)
        };
    }
    convertNodeToElements(node) {
        const elements = [];
        if (node.childNodes) {
            for (const child of node.childNodes) {
                if (child.nodeType === 1) { // Element node
                    elements.push({
                        tagName: child.tagName?.toLowerCase() || '',
                        id: child.id,
                        className: child.className,
                        textContent: child.text || '',
                        innerHTML: child.innerHTML || '',
                        attributes: child.attributes || {},
                        children: this.convertNodeToElements(child)
                    });
                }
            }
        }
        return elements;
    }
    getElementById(root, id) {
        const element = root.getElementById(id);
        if (!element)
            return null;
        return {
            tagName: element.tagName?.toLowerCase() || '',
            id: element.id,
            className: element.className,
            textContent: element.text || '',
            innerHTML: element.innerHTML || '',
            attributes: element.attributes || {},
            children: this.convertNodeToElements(element)
        };
    }
    querySelector(root, selector) {
        const element = root.querySelector(selector);
        if (!element)
            return null;
        return {
            tagName: element.tagName?.toLowerCase() || '',
            id: element.id,
            className: element.className,
            textContent: element.text || '',
            innerHTML: element.innerHTML || '',
            attributes: element.attributes || {},
            children: this.convertNodeToElements(element)
        };
    }
    querySelectorAll(root, selector) {
        const elements = root.querySelectorAll(selector);
        return elements.map((element) => ({
            tagName: element.tagName?.toLowerCase() || '',
            id: element.id,
            className: element.className,
            textContent: element.text || '',
            innerHTML: element.innerHTML || '',
            attributes: element.attributes || {},
            children: this.convertNodeToElements(element)
        }));
    }
    getScriptData(root, scriptId) {
        const scripts = root.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.text || script.innerHTML || '';
            if (scriptId) {
                // Look for script with specific ID or content
                if (script.id === scriptId || content.includes(scriptId)) {
                    try {
                        // Try to extract JSON from script content
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            return JSON.parse(jsonMatch[0]);
                        }
                    }
                    catch (error) {
                        console.warn('Failed to parse script data:', error);
                    }
                }
            }
            else {
                // Look for __NEXT_DATA__ by default
                if (content.includes('__NEXT_DATA__')) {
                    try {
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            return JSON.parse(jsonMatch[0]);
                        }
                    }
                    catch (error) {
                        console.warn('Failed to parse __NEXT_DATA__:', error);
                    }
                }
            }
        }
        return null;
    }
    async requestHtml(url, options = {}, sessionId) {
        const response = await this.request(url, options, sessionId);
        const html = this.parseHtml(response);
        return { response, html };
    }
    async requestScriptData(url, scriptId = '__NEXT_DATA__', options = {}, sessionId) {
        const { html } = await this.requestHtml(url, options, sessionId);
        return html.getScriptData(scriptId);
    }
}
exports.CloudflareScraper = CloudflareScraper;
//# sourceMappingURL=cloudflare-scraper.js.map