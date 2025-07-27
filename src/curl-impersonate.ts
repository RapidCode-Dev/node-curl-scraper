import { spawn, SpawnOptions } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { debugLogger } from './debug';
import { 
  BrowserFingerprint, 
  RequestOptions, 
  HttpResponse, 
  JsonResponse, 
  CurlError, 
  BrowserType, 
  BrowserVersion,
  CurlImpersonateConfig,
  OSPlatform,
  VersionGenerator
} from './types';

export class CurlImpersonate {
  private binariesPath: string;
  private availableBrowsers: BrowserFingerprint[] = [];
  private config: CurlImpersonateConfig;

  constructor(config: CurlImpersonateConfig = {}) {
    this.config = {
      binariesPath: './binaries',
      defaultTimeout: 30000,
      defaultMaxRedirects: 5,
      defaultVerifySSL: true,
      ...config
    };
    this.binariesPath = this.config.binariesPath!;
    this.discoverBinaries();
  }

  /**
   * Discover available curl-impersonate binaries
   */
  private discoverBinaries(): void {
    try {
      const files = readdirSync(this.binariesPath);
      this.availableBrowsers = files
        .filter(file => {
          const filePath = join(this.binariesPath, file);
          return statSync(filePath).isFile() && file.startsWith('curl_');
        })
        .map(filename => this.parseBinaryName(filename))
        .filter(browser => browser !== null) as BrowserFingerprint[];
    } catch (error) {
      console.warn(`Could not discover binaries in ${this.binariesPath}:`, error);
      this.availableBrowsers = [];
    }
  }

  /**
   * Parse binary filename to extract browser fingerprint
   */
  private parseBinaryName(filename: string): BrowserFingerprint | null {
    // Remove 'curl_' prefix
    const name = filename.replace('curl_', '');
    
    // Parse Chrome versions
    if (name.startsWith('chrome')) {
      const version = name.replace('chrome', '');
      const platform = this.detectPlatform(version);
      const os = this.detectOS(version);
      
      return {
        name: `chrome${version}`,
        version,
        platform,
        os,
        userAgent: this.generateUserAgent('chrome', version, platform, os),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform(os),
        acceptLanguage: this.getAcceptLanguage(os),
        acceptEncoding: this.getAcceptEncoding(os)
      };
    }
    
    // Parse Firefox versions
    if (name.startsWith('firefox')) {
      const version = name.replace('firefox', '');
      return {
        name: `firefox${version}`,
        version,
        platform: 'desktop',
        os: 'macos',
        userAgent: this.generateUserAgent('firefox', version, 'desktop', 'macos'),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform('macos'),
        acceptLanguage: this.getAcceptLanguage('macos'),
        acceptEncoding: this.getAcceptEncoding('macos')
      };
    }
    
    // Parse Safari versions
    if (name.startsWith('safari')) {
      const version = name.replace('safari', '');
      const platform = version.includes('ios') ? 'ios' : 'desktop';
      const os = version.includes('ios') ? 'ios' : 'macos';
      const cleanVersion = version.replace('_ios', '');
      
      return {
        name: `safari${version}`,
        version: cleanVersion,
        platform,
        os,
        userAgent: this.generateUserAgent('safari', cleanVersion, platform, os),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform(os),
        acceptLanguage: this.getAcceptLanguage(os),
        acceptEncoding: this.getAcceptEncoding(os)
      };
    }
    
    // Parse Edge versions
    if (name.startsWith('edge')) {
      const version = name.replace('edge', '');
      return {
        name: `edge${version}`,
        version,
        platform: 'desktop',
        os: 'windows',
        userAgent: this.generateUserAgent('edge', version, 'desktop', 'windows'),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform('windows'),
        acceptLanguage: this.getAcceptLanguage('windows'),
        acceptEncoding: this.getAcceptEncoding('windows')
      };
    }
    
    // Parse Tor versions
    if (name.startsWith('tor')) {
      const version = name.replace('tor', '');
      return {
        name: `tor${version}`,
        version,
        platform: 'desktop',
        os: 'macos',
        userAgent: this.generateUserAgent('tor', version, 'desktop', 'macos'),
        binaryName: filename,
        secChUaPlatform: this.getSecChUaPlatform('macos'),
        acceptLanguage: this.getAcceptLanguage('macos'),
        acceptEncoding: this.getAcceptEncoding('macos')
      };
    }
    
    return null;
  }

  /**
   * Detect platform from version string
   */
  private detectPlatform(version: string): 'desktop' | 'mobile' | 'ios' | 'android' {
    if (version.includes('android')) return 'android';
    if (version.includes('ios')) return 'ios';
    if (version.includes('mobile')) return 'mobile';
    return 'desktop';
  }

  /**
   * Detect OS from version string
   */
  private detectOS(version: string): OSPlatform {
    if (version.includes('android')) return 'android';
    if (version.includes('ios')) return 'ios';
    if (version.includes('macos')) return 'macos';
    if (version.includes('linux')) return 'linux';
    return 'windows'; // Default for Chrome
  }

  /**
   * Generate User-Agent string with OS-specific details
   */
  private generateUserAgent(type: BrowserType, version: string, platform: string, os: OSPlatform): string {
    const baseVersions: Record<string, string> = {
      'chrome': '99.0.4844.51',
      'firefox': '133.0.3',
      'safari': '17.0',
      'edge': '99.0.1150.30',
      'tor': '14.5'
    };

    const baseVersion = baseVersions[type] || '99.0.0.0';
    
    switch (type) {
      case 'chrome':
        if (os === 'windows') {
          return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
        } else if (os === 'macos') {
          return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
        } else if (os === 'android') {
          return `Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Mobile Safari/537.36`;
        }
        break;
        
      case 'firefox':
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${version}) Gecko/20100101 Firefox/${version}`;
        
      case 'safari':
        if (os === 'ios') {
          return `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Mobile/15E148 Safari/604.1`;
        } else {
          return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
        }
        
      case 'edge':
        return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 Edg/${version}.0.0.0`;
        
      case 'tor':
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${version}) Gecko/20100101 Firefox/${version}`;
    }
    
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
  }

  /**
   * Get sec-ch-ua-platform header value
   */
  private getSecChUaPlatform(os: OSPlatform): string {
    switch (os) {
      case 'windows': return '"Windows"';
      case 'macos': return '"macOS"';
      case 'ios': return '"iOS"';
      case 'android': return '"Android"';
      case 'linux': return '"Linux"';
      default: return '"Windows"';
    }
  }

  /**
   * Get Accept-Language header value
   */
  private getAcceptLanguage(os: OSPlatform): string {
    switch (os) {
      case 'windows': return 'en-US,en;q=0.9';
      case 'macos': return 'en-US,en;q=0.9';
      case 'ios': return 'en-US,en;q=0.9';
      case 'android': return 'en-US,en;q=0.9';
      case 'linux': return 'en-US,en;q=0.9';
      default: return 'en-US,en;q=0.9';
    }
  }

  /**
   * Get Accept-Encoding header value
   */
  private getAcceptEncoding(os: OSPlatform): string {
    switch (os) {
      case 'windows': return 'gzip, deflate, br';
      case 'macos': return 'gzip, deflate, br';
      case 'ios': return 'gzip, deflate, br';
      case 'android': return 'gzip, deflate, br';
      case 'linux': return 'gzip, deflate, br';
      default: return 'gzip, deflate, br';
    }
  }

  /**
   * Get available browsers
   */
  getAvailableBrowsers(): BrowserFingerprint[] {
    return [...this.availableBrowsers];
  }

  /**
   * Find specific browser by type, version, and platform
   */
  findBrowser(type: BrowserType, version: string, platform?: string, os?: OSPlatform): BrowserFingerprint | null {
    return this.availableBrowsers.find(browser => {
      const nameMatch = browser.name.startsWith(type);
      const versionMatch = browser.version === version;
      const platformMatch = !platform || browser.platform === platform;
      const osMatch = !os || browser.os === os;
      return nameMatch && versionMatch && platformMatch && osMatch;
    }) || null;
  }

  /**
   * Generate a custom browser fingerprint for any Chrome version
   * This allows using any Chrome version even if the binary doesn't exist
   */
  generateChromeFingerprint(version: string, os: OSPlatform = 'windows'): BrowserFingerprint {
    const platform = os === 'android' ? 'android' : 'desktop';
    
    return {
      name: `chrome${version}`,
      version,
      platform,
      os,
      userAgent: this.generateUserAgent('chrome', version, platform, os),
      binaryName: 'curl_chrome99', // Use existing binary
      secChUaPlatform: this.getSecChUaPlatform(os),
      acceptLanguage: this.getAcceptLanguage(os),
      acceptEncoding: this.getAcceptEncoding(os)
    };
  }

  /**
   * Get a random Chrome version between min and max
   */
  getRandomChromeVersion(minVersion: number = 99, maxVersion: number = 136): string {
    return Math.floor(Math.random() * (maxVersion - minVersion + 1) + minVersion).toString();
  }

  /**
   * Make HTTP request
   */
  async request(
    url: string, 
    options: RequestOptions = {}, 
    browser?: BrowserFingerprint | BrowserVersion
  ): Promise<HttpResponse> {
    const fingerprint = this.resolveBrowser(browser);
    if (!fingerprint) {
      throw new Error('No valid browser fingerprint found');
    }

    // Debug logging
    debugLogger.logRequestWithFile(url, options, fingerprint, 'curl-request');

    const startTime = Date.now();
    const curlArgs = this.buildCurlArgs(url, options, fingerprint);
    
    try {
      const result = await this.executeCurl(curlArgs, url);
      const endTime = Date.now();
      
      const response = this.parseResponse(result, url, endTime - startTime);
      
      // Debug logging with file saving (only if not called from CloudflareScraper)
      debugLogger.logResponseWithFile(response, endTime - startTime, 'curl-response', false);
      
      return response;
    } catch (error) {
      // Debug logging
      debugLogger.logCurlError(error, 'request execution');
      throw this.parseError(error as Error);
    }
  }

  /**
   * Make JSON request and parse response
   */
  async requestJson<T = any>(
    url: string, 
    options: RequestOptions = {}, 
    browser?: BrowserFingerprint | BrowserVersion
  ): Promise<JsonResponse<T>> {
    const response = await this.request(url, options, browser);
    
    try {
      const data = JSON.parse(response.body);
      return { ...response, data };
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`);
    }
  }

  /**
   * Resolve browser fingerprint from various input types
   */
  private resolveBrowser(browser?: BrowserFingerprint | BrowserVersion): BrowserFingerprint | null {
    if (!browser) {
      // Return first available browser
      return this.availableBrowsers[0] || null;
    }

    if ('binaryName' in browser) {
      // Already a BrowserFingerprint
      return browser;
    }

    // BrowserVersion - find matching fingerprint or generate one
    if (browser.type === 'chrome') {
      // For Chrome, we can generate any version
      return this.generateChromeFingerprint(browser.version, browser.os);
    }
    
    return this.findBrowser(browser.type, browser.version, browser.platform, browser.os);
  }

  /**
   * Build curl command arguments with OS-specific headers
   */
  private buildCurlArgs(url: string, options: RequestOptions, fingerprint: BrowserFingerprint): string[] {
    const args: string[] = [];

    // Basic options - include headers in output
    args.push('-s', '-i', '-w', '%{http_code}|%{http_version}|%{size_download}|%{time_total}|%{url_effective}');
    
    // Method
    if (options.method && options.method !== 'GET') {
      args.push('-X', options.method);
    }

    // User agent
    args.push('-H', `User-Agent: ${fingerprint.userAgent}`);

    // OS-specific headers
    if (fingerprint.secChUaPlatform) {
      args.push('-H', `sec-ch-ua-platform: ${fingerprint.secChUaPlatform}`);
    }
    if (fingerprint.acceptLanguage) {
      args.push('-H', `Accept-Language: ${fingerprint.acceptLanguage}`);
    }
    if (fingerprint.acceptEncoding) {
      args.push('-H', `Accept-Encoding: ${fingerprint.acceptEncoding}`);
    }

    // Custom headers
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        args.push('-H', `${key}: ${value}`);
      }
    }

    // Body
    if (options.body) {
      args.push('-d', options.body.toString());
    } else if (options.json) {
      args.push('-H', 'Content-Type: application/json');
      args.push('-d', JSON.stringify(options.json));
    } else if (options.formData) {
      for (const [key, value] of Object.entries(options.formData)) {
        args.push('-F', `${key}=${value}`);
      }
    }

    // Cookies
    if (options.cookies) {
      const cookieString = Object.entries(options.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      args.push('-H', `Cookie: ${cookieString}`);
    }

    // Timeout
    if (options.timeout || this.config.defaultTimeout) {
      args.push('--max-time', String(options.timeout || this.config.defaultTimeout));
    }

    // Redirects
    if (options.followRedirects !== false) {
      args.push('-L');
      if (options.maxRedirects || this.config.defaultMaxRedirects) {
        args.push('--max-redirs', String(options.maxRedirects || this.config.defaultMaxRedirects));
      }
    }

    // SSL verification
    if (options.verifySSL === false || this.config.defaultVerifySSL === false) {
      args.push('-k');
    }

    // Proxy
    if (options.proxy) {
      if (typeof options.proxy === 'string') {
        args.push('-x', options.proxy);
      } else {
        // Handle ProxyConfig object
        const proxyString = `${options.proxy.protocol}://${options.proxy.username ? options.proxy.username + ':' + options.proxy.password + '@' : ''}${options.proxy.host}:${options.proxy.port}`;
        args.push('-x', proxyString);
      }
    }

    // URL
    args.push(url);

    return args;
  }

  /**
   * Execute curl command
   */
  private executeCurl(args: string[], url?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const curlPath = join(this.binariesPath, 'curl_chrome99'); // Default binary
      const child = spawn(curlPath, args, { 
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Debug logging with file saving
          debugLogger.logRawCurlWithFile(args, stdout, stderr, 'curl-success', url);
          resolve(stdout);
        } else {
          // Debug logging with file saving
          debugLogger.logRawCurlWithFile(args, stdout, stderr, 'curl-error', url);
          reject(new Error(`Curl failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        // Debug logging with file saving
        debugLogger.logRawCurlWithFile(args, '', error.message, 'curl-spawn-error', url);
        reject(error);
      });
    });
  }

  /**
   * Parse curl response with headers
   */
  private parseResponse(output: string, originalUrl: string, responseTime: number): HttpResponse {
    const lines = output.trim().split('\n');
    
    // Parse HTTP headers and body
    const headers: Record<string, string> = {};
    let bodyLines: string[] = [];
    let inHeaders = true;
    let statusLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is the curl status line (starts with 3 digits followed by |)
      if (line.match(/^[0-9]{3}\|[0-9]+\|[0-9]+\|[0-9.]+\|/)) {
        statusLine = line;
        break;
      }
      
      // Check if this is the HTTP status line (starts with HTTP/)
      if (line.startsWith('HTTP/')) {
        // This is the HTTP status line, next lines are headers
        continue;
      }
      
      // Check if this is a header line (contains ':')
      if (inHeaders && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        
        // Handle multi-line headers
        if (headers[key]) {
          headers[key] += ', ' + value;
        } else {
          headers[key] = value;
        }
      } else if (line.trim() === '') {
        // Empty line marks end of headers, start of body
        inHeaders = false;
      } else if (!inHeaders) {
        // This is part of the body
        bodyLines.push(line);
      }
    }
    
    // If no status line found in headers, look for it in the last line
    if (!statusLine && lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      
      // Look for the pattern: } followed by 3 digits, then |, then 1-2 digits, then |, then digits, then |, then decimal, then |, then URL
      const match = lastLine.match(/}([0-9]{3})\|([0-9]+)\|([0-9]+)\|([0-9.]+)\|(.+)$/);
      
      if (match) {
        // Extract the status parts
        const [, statusCode, httpVersion, size, timeTotal, effectiveUrl] = match;
        statusLine = `${statusCode}|${httpVersion}|${size}|${timeTotal}|${effectiveUrl}`;
        
        // Extract the body (everything before the status)
        const statusStart = lastLine.lastIndexOf(statusCode);
        const bodyPart = lastLine.substring(0, statusStart);
        if (bodyPart) {
          bodyLines = [bodyPart];
        }
      } else {
        // Try alternative pattern without the } requirement
        const altMatch = lastLine.match(/([0-9]{3})\|([0-9]+)\|([0-9]+)\|([0-9.]+)\|(.+)$/);
        if (altMatch) {
          const [, statusCode, httpVersion, size, timeTotal, effectiveUrl] = altMatch;
          statusLine = `${statusCode}|${httpVersion}|${size}|${timeTotal}|${effectiveUrl}`;
          
          // Extract the body (everything before the status)
          const bodyPart = lastLine.substring(0, lastLine.indexOf(statusCode));
          if (bodyPart) {
            bodyLines = [bodyPart];
          }
        }
      }
    }
    
    if (!statusLine) {
      throw new Error('Could not parse curl response - no status line found');
    }
    
    // Parse curl write format: http_code|http_version|size_download|time_total|url_effective
    const [statusCode, httpVersion, size, timeTotal, effectiveUrl] = statusLine.split('|');
    
    // Extract body
    const body = bodyLines.join('\n');
    
    // Set default content-type if not present
    if (!headers['content-type']) {
      headers['content-type'] = 'application/json';
    }

    return {
      statusCode: parseInt(statusCode, 10),
      statusText: this.getStatusText(parseInt(statusCode, 10)),
      headers,
      body,
      url: effectiveUrl || originalUrl,
      responseTime,
      size: parseInt(size, 10)
    };
  }

  /**
   * Get HTTP status text
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return statusTexts[statusCode] || 'Unknown';
  }

  /**
   * Parse curl error
   */
  private parseError(error: Error): CurlError {
    return {
      code: 'CURL_ERROR',
      message: error.message,
      details: error.stack
    };
  }
} 