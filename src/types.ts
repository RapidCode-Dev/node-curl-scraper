// Core scraping types
export interface ScrapingSession {
  id: string;
  cookies: Record<string, string>;
  userAgent: string;
  fingerprint: BrowserFingerprint;
  proxy?: ProxyConfig;
  retryCount: number;
  lastRequestTime: number;
}

export interface ScrapingConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySSL?: boolean;
  userAgents?: string[];
  fingerprints?: BrowserFingerprint[];
  proxyRotation?: ProxyRotationConfig;
  cloudflareBypass?: CloudflareBypassConfig;
  rateLimiting?: RateLimitingConfig;
  multiThreading?: MultiThreadingConfig;
}

// Cloudflare specific types
export interface CloudflareBypassConfig {
  enabled: boolean;
  maxAttempts?: number;
  challengeTimeout?: number;
  jsChallenge?: boolean;
  captchaChallenge?: boolean;
  customHeaders?: Record<string, string>;
}

export interface CloudflareChallenge {
  type: 'js' | 'captcha' | 'managed';
  url: string;
  formData?: Record<string, string>;
  cookies?: Record<string, string>;
  timeout?: number;
}

// Proxy management types
export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
  country?: string;
  speed?: number;
  lastUsed?: number;
  failCount?: number;
}

export interface ProxyRotationConfig {
  enabled: boolean;
  proxies: ProxyConfig[];
  rotationStrategy: 'round-robin' | 'random' | 'failover' | 'geographic';
  maxFailures?: number;
  cooldownTime?: number;
  geographicTargets?: string[];
}

// Rate limiting types
export interface RateLimitingConfig {
  enabled: boolean;
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  delayBetweenRequests?: number;
  adaptiveDelay?: boolean;
  maxConcurrentRequests?: number;
}

// Multi-threading types
export interface MultiThreadingConfig {
  enabled: boolean;
  maxWorkers?: number;
  workerTimeout?: number;
  queueSize?: number;
  loadBalancing?: 'round-robin' | 'least-busy' | 'random';
}

// Browser fingerprint types (existing)
export interface BrowserFingerprint {
  name: string;
  version: string;
  platform?: 'desktop' | 'mobile' | 'ios' | 'android';
  os?: 'windows' | 'macos' | 'ios' | 'android' | 'linux';
  userAgent: string;
  binaryName: string;
  // Additional OS-specific headers
  secChUaPlatform?: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySSL?: boolean;
  proxy?: ProxyConfig;
  cookies?: Record<string, string>;
  formData?: Record<string, string | Buffer>;
  json?: any;
  session?: ScrapingSession;
  bypassCloudflare?: boolean;
}

export interface HttpResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  url: string;
  responseTime: number;
  size: number;
  cloudflareChallenge?: CloudflareChallenge;
  proxyUsed?: ProxyConfig;
}

export interface JsonResponse<T = any> extends HttpResponse {
  data: T;
}

export interface CurlError {
  code: string;
  message: string;
  details?: string;
  cloudflareBlocked?: boolean;
  proxyFailed?: boolean;
  retryable?: boolean;
}

export type BrowserType = 
  | 'chrome' 
  | 'firefox' 
  | 'safari' 
  | 'edge' 
  | 'tor';

export type OSPlatform = 'windows' | 'macos' | 'ios' | 'android' | 'linux';

export interface BrowserVersion {
  type: BrowserType;
  version: string;
  platform?: 'desktop' | 'mobile' | 'ios' | 'android';
  os?: OSPlatform;
}

export interface CurlImpersonateConfig {
  binariesPath?: string;
  defaultTimeout?: number;
  defaultMaxRedirects?: number;
  defaultVerifySSL?: boolean;
}

// Enhanced version generation
export interface VersionGenerator {
  browser: BrowserType;
  minVersion: number;
  maxVersion: number;
  os: OSPlatform;
  platform?: 'desktop' | 'mobile' | 'ios' | 'android';
}

// Scraping result types
export interface ScrapingResult<T = any> {
  success: boolean;
  data?: T;
  error?: CurlError;
  session?: ScrapingSession;
  response?: HttpResponse;
  attempts: number;
  duration: number;
}

export interface BatchScrapingResult {
  results: ScrapingResult[];
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cloudflareChallenges: number;
  proxyFailures: number;
} 