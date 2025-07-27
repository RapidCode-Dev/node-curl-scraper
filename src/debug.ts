export interface DebugConfig {
  raw: boolean;
  curl: boolean;
  cloudflare: boolean;
  session: boolean;
  proxy: boolean;
  all: boolean;
  saveToFile: boolean;
}

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class DebugLogger {
  private config: DebugConfig;
  private debugDir: string = 'debug-logs';

  constructor() {
    this.config = {
      raw: process.env.DEBUG_RAW === 'true',
      curl: process.env.DEBUG_CURL === 'true',
      cloudflare: process.env.DEBUG_CLOUDFLARE === 'true',
      session: process.env.DEBUG_SESSION === 'true',
      proxy: process.env.DEBUG_PROXY === 'true',
      all: process.env.DEBUG_ALL === 'true',
      saveToFile: process.env.DEBUG_SAVE_TO_FILE === 'true'
    };
  }

  private shouldLog(category: keyof DebugConfig): boolean {
    return this.config.all || this.config[category];
  }

  private formatData(data: any, label: string): string {
    if (typeof data === 'string') {
      return data;
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  // Raw curl output logging
  logRawCurl(args: string[], output: string, error?: string): void {
    if (!this.shouldLog('raw')) return;
    
    console.log('\n🔍 [DEBUG_RAW] CURL EXECUTION');
    console.log('📋 Command args:', args);
    console.log('📤 Raw output:', this.formatData(output, 'output'));
    if (error) {
      console.log('❌ Raw error:', this.formatData(error, 'error'));
    }
    console.log('🔍 [DEBUG_RAW] END CURL EXECUTION\n');
  }

  // Curl wrapper logging
  logCurlRequest(url: string, options: any, fingerprint: any): void {
    if (!this.shouldLog('curl')) return;
    
    console.log('\n🔧 [DEBUG_CURL] REQUEST');
    console.log('🌐 URL:', url);
    console.log('⚙️  Options:', this.formatData(options, 'options'));
    console.log('👤 Fingerprint:', this.formatData(fingerprint, 'fingerprint'));
    console.log('🔧 [DEBUG_CURL] END REQUEST\n');
  }

  logCurlResponse(response: any, responseTime: number): void {
    if (!this.shouldLog('curl')) return;
    
    console.log('\n📡 [DEBUG_CURL] RESPONSE');
    console.log('⏱️  Response time:', responseTime, 'ms');
    console.log('📊 Status:', response.statusCode, response.statusText);
    console.log('📄 Headers:', this.formatData(response.headers, 'headers'));
    console.log('📝 Body length:', response.body?.length || 0, 'chars');
    console.log('📄 Body preview:', response.body?.substring(0, 200) + (response.body?.length > 200 ? '...' : ''));
    console.log('📊 Size:', response.size, 'bytes');
    console.log('🔗 URL:', response.url);
    console.log('📡 [DEBUG_CURL] END RESPONSE\n');
  }

  logCurlError(error: any, context: string): void {
    if (!this.shouldLog('curl')) return;
    
    console.log('\n❌ [DEBUG_CURL] ERROR');
    console.log('🔍 Context:', context);
    console.log('💥 Error:', this.formatData(error, 'error'));
    console.log('❌ [DEBUG_CURL] END ERROR\n');
  }

  // Cloudflare wrapper logging
  logCloudflareRequest(url: string, options: any, sessionId?: string): void {
    if (!this.shouldLog('cloudflare')) return;
    
    console.log('\n🛡️  [DEBUG_CLOUDFLARE] REQUEST');
    console.log('🌐 URL:', url);
    console.log('⚙️  Options:', this.formatData(options, 'options'));
    console.log('🆔 Session ID:', sessionId || 'none');
    console.log('🛡️  [DEBUG_CLOUDFLARE] END REQUEST\n');
  }

  logCloudflareResponse(response: any, sessionId?: string): void {
    if (!this.shouldLog('cloudflare')) return;
    
    console.log('\n📡 [DEBUG_CLOUDFLARE] RESPONSE');
    console.log('🆔 Session ID:', sessionId || 'none');
    console.log('📊 Status:', response.statusCode, response.statusText);
    console.log('📄 Headers:', this.formatData(response.headers, 'headers'));
    console.log('📝 Body length:', response.body?.length || 0, 'chars');
    console.log('📄 Body preview:', response.body?.substring(0, 200) + (response.body?.length > 200 ? '...' : ''));
    console.log('📡 [DEBUG_CLOUDFLARE] END RESPONSE\n');
  }

  logCloudflareChallenge(response: any, sessionId?: string): void {
    if (!this.shouldLog('cloudflare')) return;
    
    console.log('\n🛡️  [DEBUG_CLOUDFLARE] CHALLENGE DETECTED');
    console.log('🆔 Session ID:', sessionId || 'none');
    console.log('📊 Status:', response.statusCode);
    console.log('📄 Body contains CF indicators:', this.detectCloudflareIndicators(response.body));
    console.log('🛡️  [DEBUG_CLOUDFLARE] END CHALLENGE\n');
  }

  logCloudflareError(error: any, sessionId?: string): void {
    if (!this.shouldLog('cloudflare')) return;
    
    console.log('\n❌ [DEBUG_CLOUDFLARE] ERROR');
    console.log('🆔 Session ID:', sessionId || 'none');
    console.log('💥 Error:', this.formatData(error, 'error'));
    console.log('❌ [DEBUG_CLOUDFLARE] END ERROR\n');
  }

  // Session logging
  logSessionCreated(session: any): void {
    if (!this.shouldLog('session')) return;
    
    console.log('\n🆔 [DEBUG_SESSION] SESSION CREATED');
    console.log('🆔 Session ID:', session.id);
    console.log('👤 User-Agent:', session.userAgent?.substring(0, 60) + '...');
    console.log('🎭 Fingerprint:', this.formatData(session.fingerprint, 'fingerprint'));
    console.log('🍪 Initial cookies:', this.formatData(session.cookies, 'cookies'));
    console.log('🆔 [DEBUG_SESSION] END SESSION CREATED\n');
  }

  logSessionUpdated(sessionId: string, updates: any): void {
    if (!this.shouldLog('session')) return;
    
    console.log('\n🔄 [DEBUG_SESSION] SESSION UPDATED');
    console.log('🆔 Session ID:', sessionId);
    console.log('📝 Updates:', this.formatData(updates, 'updates'));
    console.log('🔄 [DEBUG_SESSION] END SESSION UPDATED\n');
  }

  logSessionCookies(sessionId: string, cookies: any): void {
    if (!this.shouldLog('session')) return;
    
    console.log('\n🍪 [DEBUG_SESSION] COOKIES');
    console.log('🆔 Session ID:', sessionId);
    console.log('🍪 Cookies:', this.formatData(cookies, 'cookies'));
    console.log('🍪 [DEBUG_SESSION] END COOKIES\n');
  }

  logSessionRotation(sessionId: string, reason: string): void {
    if (!this.shouldLog('session')) return;
    
    console.log('\n🔄 [DEBUG_SESSION] SESSION ROTATION');
    console.log('🆔 Session ID:', sessionId);
    console.log('📝 Reason:', reason);
    console.log('🔄 [DEBUG_SESSION] END SESSION ROTATION\n');
  }

  // Proxy logging
  logProxyRequest(proxy: any, url: string): void {
    if (!this.shouldLog('proxy')) return;
    
    console.log('\n🌐 [DEBUG_PROXY] REQUEST');
    console.log('🌐 Proxy:', this.formatData(proxy, 'proxy'));
    console.log('🔗 URL:', url);
    console.log('🌐 [DEBUG_PROXY] END REQUEST\n');
  }

  logProxyError(proxy: any, error: any): void {
    if (!this.shouldLog('proxy')) return;
    
    console.log('\n❌ [DEBUG_PROXY] ERROR');
    console.log('🌐 Proxy:', this.formatData(proxy, 'proxy'));
    console.log('💥 Error:', this.formatData(error, 'error'));
    console.log('❌ [DEBUG_PROXY] END ERROR\n');
  }

  logProxyRotation(fromProxy: any, toProxy: any, reason: string): void {
    if (!this.shouldLog('proxy')) return;
    
    console.log('\n🔄 [DEBUG_PROXY] ROTATION');
    console.log('🌐 From proxy:', this.formatData(fromProxy, 'fromProxy'));
    console.log('🌐 To proxy:', this.formatData(toProxy, 'toProxy'));
    console.log('📝 Reason:', reason);
    console.log('🔄 [DEBUG_PROXY] END ROTATION\n');
  }

  // Generic logging
  logInfo(category: keyof DebugConfig, message: string, data?: any): void {
    if (!this.shouldLog(category)) return;
    
    console.log(`\nℹ️  [DEBUG_${category.toUpperCase()}] ${message}`);
    if (data) {
      console.log('📄 Data:', this.formatData(data, 'data'));
    }
    console.log(`ℹ️  [DEBUG_${category.toUpperCase()}] END\n`);
  }

  // Helper method to detect Cloudflare indicators
  private detectCloudflareIndicators(body: string): string[] {
    const indicators: string[] = [];
    const lowerBody = body.toLowerCase();
    
    if (lowerBody.includes('cloudflare')) indicators.push('cloudflare');
    if (lowerBody.includes('challenge')) indicators.push('challenge');
    if (lowerBody.includes('captcha')) indicators.push('captcha');
    if (lowerBody.includes('javascript')) indicators.push('javascript');
    if (lowerBody.includes('checking your browser')) indicators.push('browser_check');
    if (lowerBody.includes('ddos protection')) indicators.push('ddos_protection');
    if (lowerBody.includes('ray id')) indicators.push('ray_id');
    
    return indicators;
  }

  // File logging methods
  private ensureDebugDir(): void {
    if (!existsSync(this.debugDir)) {
      mkdirSync(this.debugDir, { recursive: true });
    }
  }

  private saveToFile(filename: string, content: string, category: string, url?: string, statusCode?: number): void {
    if (!this.config.saveToFile) return;
    
    // Only save if content is meaningful
    if (!content || content.trim().length === 0) return;
    
    this.ensureDebugDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create a more descriptive filename
    let descriptiveName = filename;
    
    // Add URL context if available
    if (url) {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/\./g, '_');
      const path = urlObj.pathname.replace(/\//g, '_').replace(/\./g, '_') || 'root';
      descriptiveName = `${hostname}_${path}_${filename}`;
    }
    
    // Add status code if available
    if (statusCode) {
      descriptiveName = `${statusCode}_${descriptiveName}`;
    }
    
    const fullFilename = `${timestamp}_${category}_${descriptiveName}`;
    const filepath = join(this.debugDir, fullFilename);
    
    try {
      writeFileSync(filepath, content, 'utf8');
      console.log(`💾 Saved debug data to: ${filepath}`);
    } catch (error) {
      console.log(`❌ Failed to save debug data to ${filepath}:`, (error as Error).message);
    }
  }

  // Enhanced logging methods with file saving
  logRawCurlWithFile(args: string[], output: string, error?: string, context?: string, url?: string): void {
    this.logRawCurl(args, output, error);
    
    if (this.config.saveToFile && (output.trim() || error)) {
      const filename = context ? `${context}_curl_raw.txt` : 'curl_raw.txt';
      const content = `=== CURL COMMAND ===\n${args.join(' ')}\n\n=== RAW OUTPUT ===\n${output}\n\n=== ERROR ===\n${error || 'None'}`;
      this.saveToFile(filename, content, 'raw', url);
    }
  }

  logResponseWithFile(response: any, responseTime: number, context?: string, saveToFile: boolean = true): void {
    this.logCurlResponse(response, responseTime);
    
    if (this.config.saveToFile && saveToFile && response.body && response.body.trim().length > 0) {
      // Only save files for important responses (login, API calls, or large responses)
      const shouldSave = this.shouldSaveResponse(response, context);
      
      if (shouldSave) {
        const filename = context ? `${context}_response.html` : 'response.html';
        const content = `=== RESPONSE HEADERS ===\n${JSON.stringify(response.headers, null, 2)}\n\n=== RESPONSE BODY ===\n${response.body}`;
        this.saveToFile(filename, content, 'response', response.url, response.statusCode);
      }
    }
  }

  private shouldSaveResponse(response: any, context?: string): boolean {
    // Always save login-related responses
    if (context?.includes('login') || context?.includes('sessions')) {
      return true;
    }
    
    // Save large responses (>10KB)
    if (response.body && response.body.length > 10000) {
      return true;
    }
    
    // Save API responses (JSON)
    if (response.headers?.['content-type']?.includes('application/json')) {
      return true;
    }
    
    // Save error responses
    if (response.statusCode >= 400) {
      return true;
    }
    
    // Don't save small HTML pages (like simple redirects)
    return false;
  }

  logRequestWithFile(url: string, options: any, fingerprint: any, context?: string): void {
    this.logCurlRequest(url, options, fingerprint);
    
    if (this.config.saveToFile) {
      const filename = context ? `${context}_request.json` : 'request.json';
      const content = JSON.stringify({
        url,
        options,
        fingerprint,
        timestamp: new Date().toISOString()
      }, null, 2);
      this.saveToFile(filename, content, 'request', url);
    }
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger(); 