# curl-scraping

Advanced web scraping tool using curl-impersonate with Cloudflare bypass, proxy management, and multi-threading support.

## Features

- **curl-impersonate Integration**: Uses real browser fingerprints for authentic requests
- **Fingerprint Configuration System**: Configurable browser fingerprints with TLS/cipher settings
- **Cloudflare Bypass**: Advanced techniques to bypass Cloudflare protection
- **Proxy Management**: Rotating proxy support with failover
- **Session Management**: Persistent sessions with cookie handling
- **Multi-threading**: Batch scraping with concurrent requests
- **HTML Parsing**: Built-in HTML parsing with DOM-like querying
- **Next.js Support**: Specialized extraction of `__NEXT_DATA__` script tags

## Installation

```bash
npm install curl-scraping
```

## Quick Start

### Basic Usage with Fingerprint Configuration

```typescript
import { CurlImpersonate } from 'curl-scraping';

const curl = new CurlImpersonate({
  binariesPath: './binaries' // Path to curl-impersonate binary
});

// Make a request with default fingerprint (Chrome 136 macOS)
const response = await curl.request('https://example.com');
console.log(response.body);

// Make a request with specific fingerprint
const response2 = await curl.request('https://example.com', {}, 'chrome136-windows');
console.log(response2.body);
```

### Available Fingerprints

The system comes with pre-configured browser fingerprints:

- `chrome136-macos`: Chrome 136 on macOS
- `chrome136-windows`: Chrome 136 on Windows
- `firefox133-macos`: Firefox 133 on macOS

```typescript
// Get available fingerprints
const fingerprints = curl.getAvailableFingerprints();
console.log('Available:', fingerprints);

// Get specific fingerprint configuration
const chromeConfig = curl.getFingerprintConfig('chrome136-macos');
console.log('Chrome config:', chromeConfig);

// Find fingerprint by browser and version
const found = curl.findFingerprintByBrowser('chrome', '136', 'macos');
console.log('Found:', found?.name);
```

### Advanced Request Options

```typescript
// POST request with JSON data
const response = await curl.request('https://api.example.com/data', {
  method: 'POST',
  json: { name: 'John', email: 'john@example.com' }
}, 'chrome136-macos');

// Request with custom headers
const response2 = await curl.request('https://example.com', {
  headers: {
    'X-Custom-Header': 'value',
    'Authorization': 'Bearer token'
  }
}, 'firefox133-macos');

// Request with cookies
const response3 = await curl.request('https://example.com', {
  cookies: {
    session: 'abc123',
    user: 'john_doe'
  }
}, 'chrome136-windows');
```

### CloudflareScraper with Fingerprints

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper();

// Make a simple request with fingerprint
const response = await scraper.request('https://example.com', {}, 'chrome136-macos');
console.log(response.body);
```

### HTML Parsing

The CloudflareScraper includes built-in HTML parsing capabilities:

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper();

// Parse HTML response
const response = await scraper.request('https://example.com', {}, 'chrome136-macos');
const html = scraper.parseHtml(response);

// Get element by ID
const title = html.getElementById('title');
console.log(title?.textContent);

// Use CSS selectors
const links = html.querySelectorAll('a');
links.forEach(link => console.log(link.attributes.href));

// Get specific element
const main = html.querySelector('#main');
console.log(main?.textContent);
```

### Next.js Data Extraction

Extract data from Next.js `__NEXT_DATA__` script tags:

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper();

// Extract __NEXT_DATA__ directly
const nextData = await scraper.requestScriptData(
  'https://nextjs-site.com',
  '__NEXT_DATA__',
  {},
  'chrome136-macos'
);

console.log('Page props:', nextData.props);
console.log('Query params:', nextData.query);
console.log('Build ID:', nextData.buildId);
```

### Advanced HTML Parsing

```typescript
// Parse HTML and get structured data
const { html } = await scraper.requestHtml('https://example.com', {}, 'chrome136-macos');

// Extract custom script data
const customData = html.getScriptData('my-script-id');

// Use complex selectors
const elements = html.querySelectorAll('.container .item');
const firstElement = html.querySelector('.container > .item:first-child');
```

## Fingerprint Configuration

### Understanding Fingerprints

Each fingerprint configuration includes:

- **Headers**: User-Agent, Accept, sec-ch-ua, etc.
- **TLS Settings**: Ciphers, curves, HTTP/2 settings
- **Browser-specific options**: ECH grease, ALPS, certificate compression

### Example Fingerprint Configuration

```typescript
const chrome136MacConfig = {
  name: 'Chrome 136 macOS',
  browser: 'chrome',
  version: '136',
  platform: 'desktop',
  os: 'macos',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
    'sec-ch-ua-platform': '"macOS"',
    // ... more headers
  },
  tls: {
    ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:...',
    curves: 'X25519MLKEM768:X25519:P-256:P-384',
    http2Settings: '1:65536;2:0;4:6291456;6:262144',
    echGrease: true,
    tlsv12: true,
    alps: true,
    // ... more TLS options
  }
};
```

## API Reference

### CurlImpersonate

#### Methods

- `request(url, options?, fingerprintName?)`: Make a request with fingerprint
- `requestJson(url, options?, fingerprintName?)`: Make request and parse JSON
- `getAvailableFingerprints()`: Get list of available fingerprints
- `getFingerprintConfig(name)`: Get specific fingerprint configuration
- `findFingerprintByBrowser(browser, version?, os?)`: Find fingerprint by criteria

#### Request Options

```typescript
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string | Buffer;
  json?: any;
  formData?: Record<string, string | Buffer>;
  cookies?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySSL?: boolean;
  proxy?: ProxyConfig;
}
```

### CloudflareScraper

#### Methods

- `request(url, options?, fingerprintName?, sessionId?)`: Make a request with Cloudflare bypass
- `requestHtml(url, options?, fingerprintName?, sessionId?)`: Make request and parse HTML
- `requestScriptData(url, scriptId?, options?, fingerprintName?, sessionId?)`: Extract script data
- `parseHtml(response)`: Parse HTML response into structured data
- `isHtmlResponse(response)`: Check if response is HTML

#### HTML Parsing Methods

- `getElementById(id)`: Get element by ID
- `querySelector(selector)`: Get first element matching selector
- `querySelectorAll(selector)`: Get all elements matching selector
- `getScriptData(scriptId?)`: Extract JSON data from script tag

### Configuration

```typescript
const scraper = new CloudflareScraper({
  cloudflare: {
    enabled: true,
    autoRetry: true,
    maxRetries: 3
  },
  session: {
    enabled: true,
    maxAge: 30 * 60 * 1000 // 30 minutes
  },
  proxyRotation: {
    enabled: true,
    proxies: [
      { host: 'proxy1.com', port: 8080, protocol: 'http' },
      { host: 'proxy2.com', port: 8080, protocol: 'https' }
    ]
  }
});
```

## Examples

See the `examples/` directory for complete working examples:

- `curl-impersonate-example.ts`: Basic curl-impersonate usage with fingerprints
- `html-parsing-example.ts`: HTML parsing and DOM manipulation
- Basic scraping examples
- Proxy rotation examples
- Session management examples

## Error Handling

The system provides comprehensive error handling with CURL error codes:

```typescript
try {
  const response = await curl.request('https://example.com', {}, 'chrome136-macos');
} catch (error: any) {
  console.log('Error code:', error.code);
  console.log('CURL code:', error.curlCode);
  console.log('Message:', error.message);
  console.log('Retryable:', error.retryable);
  console.log('Proxy failed:', error.proxyFailed);
}
```

## License

MIT 