# curl-scraping

Advanced web scraping tool using curl-impersonate with Cloudflare bypass, proxy management, and multi-threading support.

## Features

- **curl-impersonate Integration**: Uses real browser fingerprints for authentic requests
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

### Basic Usage

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper();

// Make a simple request
const response = await scraper.request('https://example.com');
console.log(response.body);
```

### HTML Parsing

The CloudflareScraper includes built-in HTML parsing capabilities:

```typescript
import { CloudflareScraper } from 'curl-scraping';

const scraper = new CloudflareScraper();

// Parse HTML response
const response = await scraper.request('https://example.com');
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
  '__NEXT_DATA__'
);

console.log('Page props:', nextData.props);
console.log('Query params:', nextData.query);
console.log('Build ID:', nextData.buildId);
```

### Advanced HTML Parsing

```typescript
// Parse HTML and get structured data
const { html } = await scraper.requestHtml('https://example.com');

// Extract custom script data
const customData = html.getScriptData('my-script-id');

// Use complex selectors
const elements = html.querySelectorAll('.container .item');
const firstElement = html.querySelector('.container > .item:first-child');
```

## API Reference

### CloudflareScraper

#### Methods

- `request(url, options?, sessionId?)`: Make a request with Cloudflare bypass
- `requestHtml(url, options?, sessionId?)`: Make request and parse HTML
- `requestScriptData(url, scriptId?, options?, sessionId?)`: Extract script data
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

- `html-parsing-example.ts`: HTML parsing and DOM manipulation
- Basic scraping examples
- Proxy rotation examples
- Session management examples

## License

MIT 