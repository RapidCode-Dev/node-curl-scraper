import { CloudflareScraper } from './cloudflare-scraper';

describe('CloudflareScraper HTML Parsing', () => {
    let scraper: CloudflareScraper;

    beforeEach(() => {
        scraper = new CloudflareScraper({
            cloudflare: {
                enabled: false // Disable for testing
            }
        });
    });

    describe('HTML Response Detection', () => {
        it('should detect HTML responses correctly', () => {
            const htmlResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/html; charset=utf-8' },
                body: '',
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            const jsonResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                body: '{"test": "data"}',
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            expect(scraper.isHtmlResponse(htmlResponse)).toBe(true);
            expect(scraper.isHtmlResponse(jsonResponse)).toBe(false);
        });

        it('should detect HTML by content when content-type is missing', () => {
            const htmlResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: {},
                body: '<!DOCTYPE html><html><head><title>Test</title></head><body>Hello</body></html>',
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            expect(scraper.isHtmlResponse(htmlResponse)).toBe(true);
        });
    });

    describe('HTML Parsing', () => {
        it('should parse HTML and extract elements', () => {
            const htmlResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/html' },
                body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title id="page-title">Test Page</title>
            </head>
            <body>
              <h1>Hello World</h1>
              <div id="main" class="container">
                <p>This is a test paragraph</p>
                <a href="/link1">Link 1</a>
                <a href="/link2">Link 2</a>
              </div>
              <script id="__NEXT_DATA__" type="application/json">
                {"props": {"pageProps": {"title": "Test"}}, "query": {}, "buildId": "test-123"}
              </script>
            </body>
          </html>
        `,
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            const html = scraper.parseHtml(htmlResponse);

            // Test getElementById
            const titleElement = html.getElementById('page-title');
            expect(titleElement).toBeDefined();
            expect(titleElement?.textContent).toBe('Test Page');

            const mainElement = html.getElementById('main');
            expect(mainElement).toBeDefined();
            expect(mainElement?.className).toBe('container');

            // Test querySelector
            const h1Element = html.querySelector('h1');
            expect(h1Element).toBeDefined();
            expect(h1Element?.textContent).toBe('Hello World');

            // Test querySelectorAll
            const links = html.querySelectorAll('a');
            expect(links).toHaveLength(2);
            expect(links[0].attributes.href).toBe('/link1');
            expect(links[1].attributes.href).toBe('/link2');

            // Test class selector
            const containerElements = html.querySelectorAll('.container');
            expect(containerElements).toHaveLength(1);
            expect(containerElements[0].id).toBe('main');
        });

        it('should extract data from __NEXT_DATA__ script tag', () => {
            const htmlResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/html' },
                body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Test</title>
            </head>
            <body>
              <script id="__NEXT_DATA__" type="application/json">
                {
                  "props": {
                    "pageProps": {
                      "title": "Test Page",
                      "data": {"key": "value"}
                    }
                  },
                  "query": {"id": "123"},
                  "buildId": "test-build-456"
                }
              </script>
            </body>
          </html>
        `,
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            const html = scraper.parseHtml(htmlResponse);
            const nextData = html.getScriptData('__NEXT_DATA__');

            expect(nextData).toBeDefined();
            expect(nextData.props.pageProps.title).toBe('Test Page');
            expect(nextData.props.pageProps.data.key).toBe('value');
            expect(nextData.query.id).toBe('123');
            expect(nextData.buildId).toBe('test-build-456');
        });

        it('should handle missing script tag gracefully', () => {
            const htmlResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/html' },
                body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Test</title>
            </head>
            <body>
              <p>No script tag here</p>
            </body>
          </html>
        `,
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            const html = scraper.parseHtml(htmlResponse);
            const nextData = html.getScriptData('__NEXT_DATA__');

            expect(nextData).toBeNull();
        });

        it('should handle invalid JSON in script tag', () => {
            const htmlResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/html' },
                body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Test</title>
            </head>
            <body>
              <script id="__NEXT_DATA__" type="application/json">
                { invalid json content
              </script>
            </body>
          </html>
        `,
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            const html = scraper.parseHtml(htmlResponse);
            const nextData = html.getScriptData('__NEXT_DATA__');

            expect(nextData).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should throw error when parsing non-HTML response', () => {
            const jsonResponse = {
                statusCode: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                body: '{"test": "data"}',
                url: 'https://example.com',
                responseTime: 100,
                size: 100
            };

            expect(() => {
                scraper.parseHtml(jsonResponse);
            }).toThrow('Response is not HTML');
        });
    });
}); 