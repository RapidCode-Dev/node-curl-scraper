import { CurlImpersonate } from './curl-impersonate';
import { 
  ScrapingConfig, 
  ScrapingSession, 
  ScrapingResult, 
  BatchScrapingResult,
  CloudflareBypassConfig,
  ProxyConfig,
  ProxyRotationConfig,
  RateLimitingConfig,
  MultiThreadingConfig,
  RequestOptions,
  HttpResponse,
  CurlError,
  BrowserFingerprint
} from './types';
import { randomUUID } from 'crypto';

export class CurlScraper {
  private curlImpersonate: CurlImpersonate;
  private config: ScrapingConfig;
  private sessions: Map<string, ScrapingSession> = new Map();
  private proxyIndex: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: ScrapingConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      followRedirects: true,
      maxRedirects: 5,
      verifySSL: true,
      ...config
    };

    this.curlImpersonate = new CurlImpersonate({
      binariesPath: '/Users/c0re/Software/curl-impersonate-v1.1.2.arm64-macos',
      defaultTimeout: this.config.timeout,
      defaultMaxRedirects: this.config.maxRedirects,
      defaultVerifySSL: this.config.verifySSL
    });
  }

  /**
   * Create a new scraping session
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
      retryCount: 0,
      lastRequestTime: Date.now()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get or create a session
   */
  getSession(sessionId?: string): ScrapingSession {
    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    return this.createSession();
  }

  /**
   * Make a single request with Cloudflare bypass
   */
  async scrape<T = any>(
    url: string, 
    options: RequestOptions = {}
  ): Promise<ScrapingResult<T>> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: CurlError | undefined;

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
        
        // Check for Cloudflare challenge
        if (this.isCloudflareChallenge(response)) {
          const bypassResult = await this.handleCloudflareChallenge(url, response, session);
          if (bypassResult.success) {
            return {
              success: true,
              data: bypassResult.data,
              session,
              response: bypassResult.response,
              attempts,
              duration: Date.now() - startTime
            };
          }
          lastError = bypassResult.error;
          continue;
        }

        // Update session cookies
        this.updateSessionCookies(session, response);

        // Parse JSON if needed
        let data: T | undefined;
        if (options.json !== false && this.isJsonResponse(response)) {
          try {
            data = JSON.parse(response.body) as T;
          } catch (error) {
            // Not JSON, return body as string
            data = response.body as T;
          }
        } else {
          data = response.body as T;
        }

        return {
          success: true,
          data,
          session,
          response,
          attempts,
          duration: Date.now() - startTime
        };

      } catch (error: any) {
        lastError = this.parseError(error);
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Wait before retry
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
   * Make batch requests with multi-threading
   */
  async batchScrape<T = any>(
    urls: string[],
    options: RequestOptions = {}
  ): Promise<BatchScrapingResult> {
    const results: ScrapingResult<T>[] = [];
    const startTime = Date.now();
    let cloudflareChallenges = 0;
    let proxyFailures = 0;

    if (this.config.multiThreading?.enabled) {
      // Multi-threaded scraping
      const maxWorkers = this.config.multiThreading.maxWorkers || 4;
      const chunks = this.chunkArray(urls, Math.ceil(urls.length / maxWorkers));
      
      const promises = chunks.map(chunk => 
        Promise.all(chunk.map(url => this.scrape<T>(url, options)))
      );
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.flat());
    } else {
      // Sequential scraping
      for (const url of urls) {
        const result = await this.scrape<T>(url, options);
        results.push(result);
        
        if (result.response?.cloudflareChallenge) {
          cloudflareChallenges++;
        }
        if (result.error?.proxyFailed) {
          proxyFailures++;
        }
      }
    }

    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    return {
      results,
      totalRequests: urls.length,
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
  private isCloudflareChallenge(response: HttpResponse): boolean {
    const cloudflareIndicators = [
      'cloudflare',
      'cf-ray',
      'cf-cache-status',
      'cf-request-id',
      'challenge-platform',
      'cf-browser-verification'
    ];

    const headers = Object.keys(response.headers).map(h => h.toLowerCase());
    const body = response.body.toLowerCase();

    return (
      response.statusCode === 403 ||
      response.statusCode === 503 ||
      headers.some(h => cloudflareIndicators.some(indicator => h.includes(indicator))) ||
      body.includes('cloudflare') ||
      body.includes('checking your browser') ||
      body.includes('ddos protection')
    );
  }

  /**
   * Handle Cloudflare challenge
   */
  private async handleCloudflareChallenge(
    url: string, 
    response: HttpResponse, 
    session: ScrapingSession
  ): Promise<ScrapingResult> {
    const cloudflareConfig = this.config.cloudflareBypass;
    
    if (!cloudflareConfig?.enabled) {
      return {
        success: false,
        error: {
          code: 'CLOUDFLARE_BLOCKED',
          message: 'Cloudflare challenge detected but bypass is disabled',
          cloudflareBlocked: true,
          retryable: false
        },
        attempts: 1,
        duration: 0
      };
    }

    // For now, return the challenge info
    // In a real implementation, you'd solve the challenge here
    return {
      success: false,
      error: {
        code: 'CLOUDFLARE_CHALLENGE',
        message: 'Cloudflare challenge detected',
        cloudflareBlocked: true,
        retryable: true
      },
      response: {
        ...response,
        cloudflareChallenge: {
          type: 'js',
          url: response.url,
          cookies: session.cookies,
          timeout: cloudflareConfig.challengeTimeout || 30000
        }
      },
      attempts: 1,
      duration: 0
    };
  }

  /**
   * Get next proxy from rotation
   */
  private async getNextProxy(): Promise<ProxyConfig | undefined> {
    const proxyConfig = this.config.proxyRotation;
    
    if (!proxyConfig?.enabled || !proxyConfig.proxies.length) {
      return undefined;
    }

    const availableProxies = proxyConfig.proxies.filter(p => 
      !p.failCount || p.failCount < (proxyConfig.maxFailures || 3)
    );

    if (!availableProxies.length) {
      return undefined;
    }

    let selectedProxy: ProxyConfig;

    switch (proxyConfig.rotationStrategy) {
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
   * Handle rate limiting
   */
  private async handleRateLimiting(): Promise<void> {
    const rateConfig = this.config.rateLimiting;
    
    if (!rateConfig?.enabled) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (rateConfig.delayBetweenRequests && timeSinceLastRequest < rateConfig.delayBetweenRequests) {
      await this.delay(rateConfig.delayBetweenRequests - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Update session cookies from response
   */
  private updateSessionCookies(session: ScrapingSession, response: HttpResponse): void {
    const setCookieHeaders = response.headers['set-cookie'] || response.headers['Set-Cookie'];
    
    if (setCookieHeaders) {
      const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
      
      for (const cookie of cookies) {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
          session.cookies[name.trim()] = value.trim();
        }
      }
    }
  }

  /**
   * Check if response is JSON
   */
  private isJsonResponse(response: HttpResponse): boolean {
    const contentType = response.headers['content-type'] || '';
    return contentType.includes('application/json') || 
           response.body.trim().startsWith('{') || 
           response.body.trim().startsWith('[');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: CurlError): boolean {
    return error.retryable !== false && 
           !error.cloudflareBlocked &&
           !error.proxyFailed;
  }

  /**
   * Parse error from curl-impersonate
   */
  private parseError(error: any): CurlError {
    return {
      code: 'CURL_ERROR',
      message: error.message || 'Unknown error',
      details: error.stack,
      retryable: true
    };
  }

  /**
   * Utility to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility to chunk array for multi-threading
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get available browsers
   */
  getAvailableBrowsers(): BrowserFingerprint[] {
    return this.curlImpersonate.getAvailableBrowsers();
  }

  /**
   * Get scraping statistics
   */
  getStats(): { sessions: number; config: ScrapingConfig } {
    return {
      sessions: this.sessions.size,
      config: this.config
    };
  }
} 