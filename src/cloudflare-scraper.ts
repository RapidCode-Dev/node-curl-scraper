import { debug } from 'console';
import { CurlImpersonate } from './curl-impersonate';
import { debugLogger } from './debug';
import { 
  RequestOptions, 
  HttpResponse, 
  CurlError
} from './types';
import { FingerprintConfig } from './fingerprint-config';
import { randomUUID } from 'crypto';
import { parse } from 'node-html-parser';

// HTML parsing utilities
export interface HtmlParseOptions {
  encoding?: string;
  normalizeWhitespace?: boolean;
}

export interface HtmlElement {
  tagName: string;
  id?: string;
  className?: string;
  textContent: string;
  innerHTML: string;
  attributes: Record<string, string>;
  children: HtmlElement[];
}

export interface HtmlParseResult {
  elements: HtmlElement[];
  getElementById: (id: string) => HtmlElement | null;
  querySelector: (selector: string) => HtmlElement | null;
  querySelectorAll: (selector: string) => HtmlElement[];
  getScriptData: (scriptId?: string) => any;
}

// Cloudflare-specific error types
export class CloudflareError extends Error {
  constructor(
    message: string,
    public code: 'CF_CHALLENGE' | 'CF_BANNED' | 'CF_BLOCKED' | 'CF_TIMEOUT' | 'CF_JS_CHALLENGE' | 'CF_CAPTCHA',
    public response?: HttpResponse,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'CloudflareError';
  }
}

export class ProxyError extends Error {
  constructor(
    message: string,
    public code: 'PROXY_REFUSED' | 'PROXY_TIMEOUT' | 'PROXY_AUTH_FAILED' | 'PROXY_DNS_ERROR' | 'PROXY_CONNECTION_ERROR',
    public proxy?: ProxyConfig,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

// Session management
export interface SessionConfig {
  enabled: boolean;
  maxAge?: number; // milliseconds
  autoRotate?: boolean;
  rotateOnError?: boolean;
  maxRetries?: number;
}

export interface CloudflareConfig {
  enabled: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  challengeTimeout?: number;
  jsChallenge?: boolean;
  captchaChallenge?: boolean;
  fingerprintRotation?: boolean;
}

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
  failCount?: number;
  lastUsed?: number;
}

export interface ProxyRotationConfig {
  enabled: boolean;
  proxies: ProxyConfig[];
  autoSwitch?: boolean;
  maxFailures?: number;
  cooldownTime?: number;
  strategy: 'round-robin' | 'random' | 'failover';
}

export interface ScrapingSession {
  id: string;
  cookies: Record<string, string>;
  userAgent: string;
  fingerprint: FingerprintConfig;
  proxy?: ProxyConfig;
  createdAt: number;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
}

export interface CloudflareScraperConfig {
  session?: Partial<SessionConfig>;
  cloudflare?: Partial<CloudflareConfig>;
  proxyRotation?: Partial<ProxyRotationConfig>;
  binariesPath?: string;
}

export class CloudflareScraper {
  private curlImpersonate: CurlImpersonate;
  private sessions: Map<string, ScrapingSession> = new Map();
  private proxyIndex: number = 0;
  private config: {
    session: SessionConfig;
    cloudflare: CloudflareConfig;
    proxyRotation: ProxyRotationConfig;
  };

  constructor(config: CloudflareScraperConfig = {}) {
    this.curlImpersonate = new CurlImpersonate({
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

  createSession(fingerprint?: FingerprintConfig): ScrapingSession {
    const sessionId = randomUUID();
    const availableFingerprints = this.curlImpersonate.getAvailableFingerprints();
    
    // Automatically select a random fingerprint if none provided
    let selectedFingerprint: FingerprintConfig;
    if (fingerprint) {
      selectedFingerprint = fingerprint;
    } else {
      const randomFingerprintName = availableFingerprints[Math.floor(Math.random() * availableFingerprints.length)];
      selectedFingerprint = this.curlImpersonate.getFingerprintConfig(randomFingerprintName) || 
                           this.curlImpersonate.getFingerprintConfig('chrome131-android')!;
    }
    
    const session: ScrapingSession = {
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

  getSession(sessionId?: string, forceNew: boolean = false): ScrapingSession {
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

  async request(
    url: string,
    options: RequestOptions = {},
    sessionId?: string
  ): Promise<HttpResponse> {
    // Automatic session management based on config
    let session: ScrapingSession;
    
    if (this.config.session.enabled) {
      // Use provided sessionId or get/create session automatically
      session = this.getSession(sessionId);
    } else {
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
    } catch (error: any) {
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
      if (this.config.session.rotateOnError && session.errorCount >= this.config.session.maxRetries!) {
        this.rotateSession(session);
      }

      throw error;
    }
  }

  private getFingerprintName(fingerprint: FingerprintConfig): string {
    // Convert fingerprint to name format
    if (!fingerprint) {
      const availableFingerprints = this.curlImpersonate.getAvailableFingerprints();
      return availableFingerprints[0] || 'chrome131-android';
    }
    return `${fingerprint.browser}${fingerprint.version}-${fingerprint.os}`;
  }

  private isSessionExpired(session: ScrapingSession): boolean {
    return Date.now() - session.createdAt > this.config.session.maxAge!;
  }

  private isCloudflareBlocked(response: HttpResponse): boolean {
    return response.statusCode === 403 || 
           response.statusCode === 429 ||
           response.body.includes('cloudflare') ||
           response.body.includes('challenge');
  }

  private isCloudflareChallenge(response: HttpResponse): boolean {
    return this.isCloudflareBlocked(response) ||
           response.body.includes('cf-browser-verification') ||
           response.body.includes('cf_challenge');
  }

  private handleCloudflareChallenge(response: HttpResponse, session: ScrapingSession): CloudflareError {
    const message = `Cloudflare challenge detected: ${response.statusCode}`;
    return new CloudflareError(message, 'CF_CHALLENGE', response);
  }

  private isProxyError(error: any): boolean {
    return error.proxyFailed || 
           error.code?.includes('PROXY') ||
           error.message?.includes('proxy');
  }

  private handleProxyError(error: any, session: ScrapingSession): ProxyError {
    if (session.proxy) {
      this.markProxyFailed(session.proxy);
    }

    const message = `Proxy error: ${error.message}`;
    return new ProxyError(message, 'PROXY_CONNECTION_ERROR', session.proxy);
  }

  private isCloudflareError(error: any): boolean {
    return error instanceof CloudflareError || 
           error.code?.includes('CF_') ||
           error.message?.includes('cloudflare');
  }

  private getNextProxy(): ProxyConfig | undefined {
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
        return this.config.proxyRotation.proxies.find(p => 
          !p.failCount || p.failCount < this.config.proxyRotation.maxFailures!
        ) || this.config.proxyRotation.proxies[0];
      
      default:
        return this.config.proxyRotation.proxies[0];
    }
  }

  private markProxyFailed(proxy?: ProxyConfig): void {
    if (!proxy) return;

    proxy.failCount = (proxy.failCount || 0) + 1;
    proxy.lastUsed = Date.now();

    if (proxy.failCount >= this.config.proxyRotation.maxFailures!) {
      console.warn(`Proxy ${proxy.host}:${proxy.port} marked as failed`);
    }
  }

  private rotateSession(session: ScrapingSession): ScrapingSession {
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

  private updateSessionCookies(session: ScrapingSession, response: HttpResponse): void {
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getAvailableFingerprints(): string[] {
    return this.curlImpersonate.getAvailableFingerprints();
  }

  getSessionStats(): { total: number; active: number; expired: number } {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    this.sessions.forEach(session => {
      if (this.isSessionExpired(session)) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total: this.sessions.size,
      active,
      expired
    };
  }

  cleanExpiredSessions(): number {
    const before = this.sessions.size;
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(sessionId);
      }
    }

    return before - this.sessions.size;
  }

  getSessionState(sessionId?: string): any {
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

  restoreSessionState(sessionState: any): void {
    const session: ScrapingSession = {
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

  getSessionCookies(sessionId?: string): Record<string, string> {
    const session = this.getSession(sessionId);
    return { ...session.cookies };
  }

  restoreSessionCookies(cookies: Record<string, string>, sessionId?: string): void {
    const session = this.getSession(sessionId);
    session.cookies = { ...cookies };
  }

  isHtmlResponse(response: HttpResponse): boolean {
    const contentType = response.headers['content-type'] || '';
    return contentType.includes('text/html') || 
           contentType.includes('application/xhtml+xml') ||
           response.body.includes('<!DOCTYPE html') ||
           response.body.includes('<html');
  }

  parseHtml(response: HttpResponse, options: HtmlParseOptions = {}): HtmlParseResult {
    if (!this.isHtmlResponse(response)) {
      throw new Error('Response is not HTML');
    }

    const root = parse(response.body);
    const elements = this.convertNodeToElements(root);

    return {
      elements,
      getElementById: (id: string) => this.getElementById(root, id),
      querySelector: (selector: string) => this.querySelector(root, selector),
      querySelectorAll: (selector: string) => this.querySelectorAll(root, selector),
      getScriptData: (scriptId?: string) => this.getScriptData(root, scriptId)
    };
  }

  private convertNodeToElements(node: any): HtmlElement[] {
    const elements: HtmlElement[] = [];
    
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

  private getElementById(root: any, id: string): HtmlElement | null {
    const element = root.getElementById(id);
    if (!element) return null;

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

  private querySelector(root: any, selector: string): HtmlElement | null {
    const element = root.querySelector(selector);
    if (!element) return null;

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

  private querySelectorAll(root: any, selector: string): HtmlElement[] {
    const elements = root.querySelectorAll(selector);
    return elements.map((element: any) => ({
      tagName: element.tagName?.toLowerCase() || '',
      id: element.id,
      className: element.className,
      textContent: element.text || '',
      innerHTML: element.innerHTML || '',
      attributes: element.attributes || {},
      children: this.convertNodeToElements(element)
    }));
  }

  private getScriptData(root: any, scriptId?: string): any {
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
          } catch (error) {
            console.warn('Failed to parse script data:', error);
          }
        }
      } else {
        // Look for __NEXT_DATA__ by default
        if (content.includes('__NEXT_DATA__')) {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
          } catch (error) {
            console.warn('Failed to parse __NEXT_DATA__:', error);
          }
        }
      }
    }
    
    return null;
  }

  async requestHtml(
    url: string,
    options: RequestOptions = {},
    sessionId?: string
  ): Promise<{ response: HttpResponse; html: HtmlParseResult }> {
    const response = await this.request(url, options, sessionId);
    const html = this.parseHtml(response);
    return { response, html };
  }

  async requestScriptData(
    url: string,
    scriptId: string = '__NEXT_DATA__',
    options: RequestOptions = {},
    sessionId?: string
  ): Promise<any> {
    const { html } = await this.requestHtml(url, options, sessionId);
    return html.getScriptData(scriptId);
  }
} 