# curl-scraping

Advanced web scraping tool using `curl-impersonate` with Cloudflare bypass, proxy management, and multi-threading support.

## 🚀 Features

- **🛡️ Cloudflare Bypass** - Automatic detection and handling of Cloudflare challenges
- **🌐 Proxy Management** - Round-robin, random, and failover proxy rotation
- **🔐 Session Management** - Persistent sessions for login sites or random fingerprints for APIs
- **⚡ Multi-threading** - Concurrent scraping with configurable workers
- **🎭 Browser Fingerprinting** - Realistic browser fingerprints using curl-impersonate
- **🔄 Error Handling** - Intelligent retry logic with different strategies
- **📊 Statistics** - Detailed scraping metrics and session tracking

## 📦 Installation

```bash
npm install curl-scraping
```

## 🛠️ Setup

1. **Download curl-impersonate binaries:**
   ```bash
   # Download from: https://github.com/lwthiker/curl-impersonate/releases
   # Extract to a directory, e.g., /path/to/curl-impersonate/
   ```

2. **Configure the scraper:**
   ```typescript
   import { CloudflareScraper } from 'curl-scraping';
   
   const scraper = new CloudflareScraper({
     binariesPath: '/path/to/curl-impersonate/',
     // ... other config
   });
   ```

## 🎯 Quick Start

### Basic Usage

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper({
  session: {
    enabled: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    autoRotate: true,
    rotateOnError: true
  },
  cloudflare: {
    enabled: true,
    autoRetry: true,
    maxRetries: 3
  }
});

// Simple request
const response = await scraper.request('https://example.com');
console.log('Status:', response.statusCode);
console.log('Body:', response.body);
```

### Session-based Scraping (for login sites)

```typescript
// Create session for login sites
const session = scraper.createSession();

// Login flow
await scraper.request('https://site.com/login', {}, session.id);
await scraper.request('https://site.com/dashboard', {}, session.id);
await scraper.request('https://site.com/profile', {}, session.id);

// Session maintains cookies and User-Agent
```

### Fast API Scraping (random fingerprints)

```typescript
const scraper = new CloudflareScraper({
  session: {
    enabled: false, // No session management
    autoRotate: true // Random fingerprint every request
  }
});

// Fast concurrent scraping
const urls = [
  'https://api.site.com/data?page=1',
  'https://api.site.com/data?page=2',
  'https://api.site.com/data?page=3'
];

const promises = urls.map(url => scraper.request(url));
const results = await Promise.all(promises);
```

### Debug Logging

Enable comprehensive debug logging with environment variables:

```bash
# Enable all debug logging
DEBUG_ALL=true npx ts-node examples/debug-example.ts

# Enable specific debug categories
DEBUG_CURL=true DEBUG_CLOUDFLARE=true npx ts-node examples/debug-example.ts

# Enable raw curl output debugging
DEBUG_RAW=true npx ts-node examples/debug-example.ts
```

**Available debug categories:**
- `DEBUG_RAW` - Raw curl command execution and output
- `DEBUG_CURL` - Curl wrapper request/response details
- `DEBUG_CLOUDFLARE` - Cloudflare challenge detection and handling
- `DEBUG_SESSION` - Session creation, updates, and cookie management
- `DEBUG_PROXY` - Proxy rotation and error handling
- `DEBUG_ALL` - Enable all debug categories
- `DEBUG_SAVE_TO_FILE` - Save all debug data to files in `debug-logs/` directory

**Debug output includes:**
- Raw curl command arguments and output
- Request/response headers and body previews
- Session creation and rotation details
- Cookie management and updates
- Cloudflare challenge detection
- Proxy rotation and error handling
- Response parsing and error details
- File logging - All responses saved to `debug-logs/` directory with timestamps

## ⚙️ Configuration

### Session Configuration

```typescript
session: {
  enabled: boolean,           // Enable session management
  maxAge?: number,           // Session lifetime in milliseconds
  autoRotate?: boolean,      // Auto-rotate fingerprints
  rotateOnError?: boolean,   // Rotate on Cloudflare errors
  maxRetries?: number        // Max retry attempts
}
```

### Cloudflare Configuration

```typescript
cloudflare: {
  enabled: boolean,          // Enable Cloudflare bypass
  autoRetry?: boolean,       // Auto-retry on challenges
  maxRetries?: number,       // Max retry attempts
  challengeTimeout?: number, // Challenge timeout (ms)
  jsChallenge?: boolean,     // Handle JS challenges
  captchaChallenge?: boolean, // Handle captcha challenges
  fingerprintRotation?: boolean // Rotate fingerprints on CF
}
```

### Proxy Configuration

```typescript
proxyRotation: {
  enabled: boolean,          // Enable proxy rotation
  proxies: ProxyConfig[],    // List of proxies
  autoSwitch?: boolean,      // Auto-switch on failure
  maxFailures?: number,      // Max failures per proxy
  cooldownTime?: number,     // Cooldown time (ms)
  strategy: 'round-robin' | 'random' | 'failover'
}
```

## 🔧 API Reference

### CloudflareScraper

#### Constructor
```typescript
new CloudflareScraper(config?: {
  session?: Partial<SessionConfig>;
  cloudflare?: Partial<CloudflareConfig>;
  proxyRotation?: Partial<ProxyRotationConfig>;
  binariesPath?: string;
})
```

#### Methods

##### `createSession(fingerprint?: BrowserFingerprint): ScrapingSession`
Create a new scraping session.

##### `request(url: string, options?: RequestOptions, sessionId?: string): Promise<HttpResponse>`
Make a single request with Cloudflare and proxy error handling.

##### `getSession(sessionId?: string, forceNew?: boolean): ScrapingSession`
Get or create a session based on configuration.

##### `getAvailableBrowsers(): BrowserFingerprint[]`
Get list of available browser fingerprints.

##### `getSessionStats(): { total: number; active: number; expired: number }`
Get session statistics.

##### `cleanExpiredSessions(): number`
Clean expired sessions and return count of cleaned sessions.

### Error Classes

#### `CloudflareError`
```typescript
class CloudflareError extends Error {
  code: 'CF_CHALLENGE' | 'CF_BANNED' | 'CF_TIMEOUT' | 'CF_JS_CHALLENGE' | 'CF_CAPTCHA';
  response?: HttpResponse;
  retryable: boolean;
}
```

#### `ProxyError`
```typescript
class ProxyError extends Error {
  code: 'PROXY_REFUSED' | 'PROXY_TIMEOUT' | 'PROXY_AUTH_FAILED' | 'PROXY_DNS_ERROR' | 'PROXY_CONNECTION_ERROR';
  proxy?: ProxyConfig;
  retryable: boolean;
}
```

## 📋 Examples

### Example 1: Session-based Scraping (Login Sites)

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper({
  session: {
    enabled: true,
    maxAge: 60 * 60 * 1000, // 1 hour
    autoRotate: false, // Keep same fingerprint
    rotateOnError: true
  }
});

// Login flow simulation
const session = scraper.createSession();

// Step 1: Visit login page
await scraper.request('https://site.com/login', {}, session.id);

// Step 2: Submit login form
await scraper.request('https://site.com/login', {
  method: 'POST',
  body: 'username=user&password=pass'
}, session.id);

// Step 3: Access protected pages
await scraper.request('https://site.com/dashboard', {}, session.id);
await scraper.request('https://site.com/profile', {}, session.id);
```

### Example 2: Fast API Scraping

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper({
  session: {
    enabled: false, // No session management
    autoRotate: true // Random fingerprint every request
  },
  cloudflare: {
    maxRetries: 1, // Fast retry
    challengeTimeout: 10000
  }
});

// Scrape multiple API endpoints concurrently
const urls = Array.from({length: 50}, (_, i) => 
  `https://api.site.com/data?page=${i + 1}`
);

const promises = urls.map(url => scraper.request(url));
const results = await Promise.all(promises);

console.log(`Scraped ${results.length} pages`);
```

### Example 3: Proxy Rotation

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper({
  proxyRotation: {
    enabled: true,
    proxies: [
      {
        host: 'proxy1.example.com',
        port: 8080,
        protocol: 'http',
        username: 'user1',
        password: 'pass1'
      },
      {
        host: 'proxy2.example.com',
        port: 8080,
        protocol: 'http',
        username: 'user2',
        password: 'pass2'
      }
    ],
    strategy: 'round-robin',
    autoSwitch: true,
    maxFailures: 3
  }
});

// Requests will automatically use different proxies
await scraper.request('https://example.com');
```

## 🛡️ Cloudflare Bypass

The scraper automatically detects and handles various Cloudflare challenges:

- **JavaScript Challenges** - Automatic retry with different fingerprints
- **Captcha Challenges** - Error thrown for manual handling
- **IP Bans** - Automatic fingerprint rotation
- **Rate Limiting** - Configurable delays and retries

### Error Handling

```typescript
try {
  const response = await scraper.request('https://example.com');
} catch (error) {
  if (error instanceof CloudflareError) {
    console.log('Cloudflare challenge:', error.code);
    // Handle specific CF error types
  } else if (error instanceof ProxyError) {
    console.log('Proxy error:', error.code);
    // Handle proxy errors
  }
}
```

## 📊 Performance

- **Session-based**: Maintains cookies and User-Agent across requests
- **Fast API**: 7.5+ pages/second with concurrent requests
- **Random fingerprints**: Different browser fingerprint for each request
- **Proxy rotation**: Automatic failover and load balancing

## 🔧 Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Running Examples

```bash
# Session-based scraping
npx ts-node examples/session-based-scraping.ts

# Fast API scraping
npx ts-node examples/fast-api-scraping.ts
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📚 Dependencies

- **curl-impersonate** - Browser fingerprinting binaries
- **Node.js** - Runtime environment
- **TypeScript** - Type safety and development

## 🆘 Troubleshooting

### Common Issues

1. **"Could not discover binaries"**
   - Ensure curl-impersonate binaries are downloaded and path is correct
   - Check file permissions

2. **Cloudflare challenges not bypassed**
   - Try different browser fingerprints
   - Use proxy rotation
   - Increase retry attempts

3. **Proxy connection errors**
   - Verify proxy credentials and connectivity
   - Check proxy rotation configuration
   - Try different proxy protocols

### Getting Help

- Check the examples in `/examples/`
- Review error messages for specific issues
- Ensure curl-impersonate binaries are properly installed 