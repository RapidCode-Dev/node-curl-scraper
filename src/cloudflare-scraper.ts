import { CurlImpersonate } from './curl-impersonate';
import { debugLogger } from './debug';
import { 
  BrowserFingerprint, 
  RequestOptions, 
  HttpResponse, 
  CurlError
} from './types';
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
    public code: 'CF_CHALLENGE' | 'CF_BANNED' | 'CF_TIMEOUT' | 'CF_JS_CHALLENGE' | 'CF_CAPTCHA',
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
  fingerprint: BrowserFingerprint;
  proxy?: ProxyConfig;
  createdAt: number;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
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

  constructor(config: {
    session?: Partial<SessionConfig>;
    cloudflare?: Partial<CloudflareConfig>;
    proxyRotation?: Partial<ProxyRotationConfig>;
    binariesPath?: string;
  } = {}) {
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

    this.curlImpersonate = new CurlImpersonate({
      binariesPath: config.binariesPath || '/Users/c0re/Software/curl-impersonate-v1.1.2.arm64-macos'
    });
  }

  /**
   * Create a new session
   */
  createSession(fingerprint?: BrowserFingerprint): ScrapingSession {
    const sessionId = randomUUID();
    const availableBrowsers = this.curlImpersonate.getAvailableBrowsers();
    const selectedFingerprint = fingerprint || availableBrowsers[Math.floor(Math.random() * availableBrowsers.length)];

    const session: ScrapingSession = {
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
    debugLogger.logSessionCreated(session);
    
    return session;
  }

  /**
   * Get or create session based on configuration
   */
  getSession(sessionId?: string, forceNew: boolean = false): ScrapingSession {
    if (!this.config.session.enabled || forceNew) {
      return this.createSession();
    }

    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      
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
  async request(
    url: string,
    options: RequestOptions = {},
    sessionId?: string
  ): Promise<HttpResponse> {
    let session = this.getSession(sessionId);
    let attempts = 0;
    let lastError: Error | undefined;
    let allErrors: Array<{ attempt: number; error: Error; timestamp: number }> = [];

    // Debug logging
    debugLogger.logCloudflareRequest(url, options, session.id);

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
            debugLogger.logProxyRequest(proxy, url);
          }
        }

        // Prepare request with session cookies
        const requestOptions: RequestOptions = {
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
        debugLogger.logResponseWithFile(response, 0, `cloudflare-${session.id}`);
        
        // Check for Cloudflare challenges
        if (this.isCloudflareChallenge(response)) {
          debugLogger.logCloudflareChallenge(response, session.id);
          const cfError = this.handleCloudflareChallenge(response, session);
          
          if (this.config.cloudflare.autoRetry && this.config.session.rotateOnError) {
            session = this.rotateSession(session);
            continue;
          }
          
          throw cfError;
        }

        // Update session cookies
        this.updateSessionCookies(session, response);
        
        return response;

      } catch (error: any) {
        lastError = error;
        session.errorCount++;
        
        // Record this error attempt
        allErrors.push({
          attempt: attempts,
          error: error,
          timestamp: Date.now()
        });

        // Debug logging
        debugLogger.logCloudflareError(error, session.id);

        // Handle different error types
        if (this.isProxyError(error)) {
          debugLogger.logProxyError(session.proxy, error);
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
    debugLogger.logRetrySummary(allErrors, session.id);

    const maxRetriesError = new Error(`Max retries exceeded (${attempts} attempts).\n\nError details:\n${errorDetails}`);
    maxRetriesError.name = 'MaxRetriesExceededError';
    (maxRetriesError as any).attempts = attempts;
    (maxRetriesError as any).allErrors = allErrors;
    (maxRetriesError as any).lastError = lastError;
    
    throw maxRetriesError;
  }

  /**
   * Check if response is a Cloudflare challenge
   */
  private isCloudflareChallenge(response: HttpResponse): boolean {
    // DISABLED: We don't know exactly what Cloudflare challenges look like yet
    // Only implement when we have definitive examples
    return false;
  }

  /**
   * Handle Cloudflare challenge
   */
  private handleCloudflareChallenge(response: HttpResponse, session: ScrapingSession): CloudflareError {
    // DISABLED: We don't know exactly what Cloudflare challenges look like yet
    // Only implement when we have definitive examples
    throw new CloudflareError(
      'Cloudflare challenge detection disabled - implement when we have real examples',
      'CF_CHALLENGE',
      response,
      false
    );
  }

  /**
   * Check if error is proxy-related
   */
  private isProxyError(error: any): boolean {
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
  private handleProxyError(error: any, session: ScrapingSession): ProxyError {
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
  private isCloudflareError(error: any): boolean {
    return error instanceof CloudflareError;
  }

  /**
   * Get next proxy from rotation
   */
  private getNextProxy(): ProxyConfig | undefined {
    if (!this.config.proxyRotation.enabled || !this.config.proxyRotation.proxies.length) {
      return undefined;
    }

    const availableProxies = this.config.proxyRotation.proxies.filter(p => 
      !p.failCount || p.failCount < (this.config.proxyRotation.maxFailures || 3)
    );

    if (!availableProxies.length) {
      return undefined;
    }

    let selectedProxy: ProxyConfig;

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
  private markProxyFailed(proxy?: ProxyConfig): void {
    if (proxy) {
      proxy.failCount = (proxy.failCount || 0) + 1;
    }
  }

  /**
   * Rotate session (new fingerprint)
   */
  private rotateSession(session: ScrapingSession): ScrapingSession {
    const availableBrowsers = this.curlImpersonate.getAvailableBrowsers();
    const newFingerprint = availableBrowsers[Math.floor(Math.random() * availableBrowsers.length)];
    
    const oldFingerprint = session.fingerprint;
    session.fingerprint = newFingerprint;
    session.userAgent = newFingerprint.userAgent;
    session.errorCount = 0;
    
    // Debug logging
    debugLogger.logSessionRotation(session.id, 'Cloudflare challenge or error');
    debugLogger.logSessionUpdated(session.id, {
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
  private updateSessionCookies(session: ScrapingSession, response: HttpResponse): void {
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
      debugLogger.logSessionCookies(session.id, session.cookies);
    }
  }

  /**
   * Utility to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available browsers
   */
  getAvailableBrowsers(): BrowserFingerprint[] {
    return this.curlImpersonate.getAvailableBrowsers();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { total: number; active: number; expired: number } {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const session of this.sessions.values()) {
      if (this.config.session.maxAge && (now - session.createdAt) > this.config.session.maxAge) {
        expired++;
      } else {
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
  cleanExpiredSessions(): number {
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
  getSessionState(sessionId?: string): any {
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
  restoreSessionState(sessionState: any): void {
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
    } else {
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
  getSessionCookies(sessionId?: string): Record<string, string> {
    const session = this.getSession(sessionId);
    return { ...session.cookies };
  }

  /**
   * Restore session cookies from persistence (backward compatibility)
   */
  restoreSessionCookies(cookies: Record<string, string>, sessionId?: string): void {
    const session = this.getSession(sessionId);
    session.cookies = { ...cookies };
  }

  /**
   * Check if response is HTML
   */
  isHtmlResponse(response: HttpResponse): boolean {
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
    return contentType.includes('text/html') || 
           response.body.toLowerCase().includes('<!doctype html') ||
           response.body.toLowerCase().includes('<html');
  }

  /**
   * Parse HTML response and return structured data
   */
  parseHtml(response: HttpResponse, options: HtmlParseOptions = {}): HtmlParseResult {
    if (!this.isHtmlResponse(response)) {
      throw new Error('Response is not HTML');
    }

    const html = response.body;
    const root = parse(html);
    
    return {
      elements: this.convertNodeToElements(root),
      getElementById: (id: string) => this.getElementById(root, id),
      querySelector: (selector: string) => this.querySelector(root, selector),
      querySelectorAll: (selector: string) => this.querySelectorAll(root, selector),
      getScriptData: (scriptId?: string) => this.getScriptData(root, scriptId)
    };
  }

  /**
   * Convert node-html-parser node to our HtmlElement interface
   */
  private convertNodeToElements(node: any): HtmlElement[] {
    const elements: HtmlElement[] = [];
    
    if (node.childNodes) {
      for (const child of node.childNodes) {
        if (child.nodeType === 1) { // Element node
          const element: HtmlElement = {
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
  private getElementById(root: any, id: string): HtmlElement | null {
    const element = root.getElementById(id);
    if (!element) return null;
    
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
  private querySelector(root: any, selector: string): HtmlElement | null {
    const element = root.querySelector(selector);
    if (!element) return null;
    
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
  private querySelectorAll(root: any, selector: string): HtmlElement[] {
    const elements = root.querySelectorAll(selector);
    return elements.map((element: any) => ({
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
  private getScriptData(root: any, scriptId?: string): any {
    const targetId = scriptId || '__NEXT_DATA__';
    const scriptElement = root.getElementById(targetId);
    
    if (!scriptElement || scriptElement.tagName?.toLowerCase() !== 'script') {
      return null;
    }

    try {
      // Extract JSON content from script tag
      const content = scriptElement.text || scriptElement.innerHTML;
      return JSON.parse(content);
    } catch (error) {
      debugLogger.logCurlError(error, `Failed to parse script data from ${targetId}`);
      return null;
    }
  }

  /**
   * Make request and parse HTML response
   */
  async requestHtml(
    url: string,
    options: RequestOptions = {},
    sessionId?: string
  ): Promise<{ response: HttpResponse; html: HtmlParseResult }> {
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