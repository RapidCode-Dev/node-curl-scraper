import { CurlImpersonate, BrowserType } from './index';

describe('CurlImpersonate', () => {
  let curl: CurlImpersonate;

  beforeEach(() => {
    curl = new CurlImpersonate({
      binariesPath: '/Users/c0re/Software/curl-impersonate-v1.1.2.arm64-macos'
    });
  });

  describe('Real Binary Execution Tests', () => {
    it('should execute curl binary with correct arguments', async () => {
      // Find a real browser
      const browsers = curl.getAvailableBrowsers();
      expect(browsers.length).toBeGreaterThan(0);
      
      const browser = browsers.find(b => b.name === 'chrome99');
      expect(browser).toBeDefined();

      const response = await curl.request('https://httpbin.org/get', {}, browser);

      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('"url"');
      expect(response.headers).toBeDefined();
    });

    it('should execute POST request with JSON body', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/post', {
        method: 'POST',
        json: { message: 'test' }
      }, browser);

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('"message"');
      expect(response.body).toContain('"test"');
    });

    it('should execute request with cookies', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/cookies', {
        cookies: {
          session: 'abc123',
          user: 'john'
        }
      }, browser);

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('"cookies"');
    });

    it('should execute request with custom headers', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/headers', {
        headers: {
          'X-Custom': 'value',
          'Accept': 'application/json'
        }
      }, browser);

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('"headers"');
    });

    it('should execute request with timeout', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/delay/1', {
        timeout: 5000
      }, browser);

      expect(response.statusCode).toBe(200);
    });

    it('should handle curl execution errors', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      // Test with a URL that should actually fail (non-existent domain)
      await expect(curl.request('https://this-domain-definitely-does-not-exist-12345-xyz.com', {}, browser))
        .rejects.toMatchObject({
          code: 'CURL_ERROR',
          message: expect.stringContaining('Curl failed with code 6')
        });
    });

    it('should parse JSON responses correctly', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.requestJson('https://httpbin.org/json', {}, browser);

      expect(response.statusCode).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.slideshow).toBeDefined();
    });

    it('should handle different browser fingerprints', async () => {
      const browsers = curl.getAvailableBrowsers();
      
      // Test Chrome
      const chrome = browsers.find(b => b.name === 'chrome99');
      if (chrome) {
        const response = await curl.request('https://httpbin.org/user-agent', {}, chrome);
        expect(response.statusCode).toBe(200);
        expect(response.body).toContain('Chrome'); // Look for Chrome in user-agent
      }

      // Test Firefox
      const firefox = browsers.find(b => b.name.includes('firefox'));
      if (firefox) {
        const response = await curl.request('https://httpbin.org/user-agent', {}, firefox);
        expect(response.statusCode).toBe(200);
        expect(response.body).toContain('Firefox'); // Look for Firefox in user-agent
      }
    });

    it('should handle form data requests', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/post', {
        method: 'POST',
        formData: {
          name: 'test',
          email: 'test@example.com'
        }
      }, browser);

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('"form"');
    });

    it('should handle file uploads', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/post', {
        method: 'POST',
        formData: {
          file: Buffer.from('test file content')
        }
      }, browser);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Browser Discovery', () => {
    it('should discover available browsers', () => {
      const browsers = curl.getAvailableBrowsers();
      expect(Array.isArray(browsers)).toBe(true);
      expect(browsers.length).toBeGreaterThan(0);
      expect(browsers.length).toBeGreaterThanOrEqual(30); // At least 30 binaries
    });

    it('should find specific browser', () => {
      const browser = curl.findBrowser('chrome', '99');
      expect(browser).not.toBeNull();
      expect(browser?.name).toBe('chrome99');
      expect(browser?.version).toBe('99');
    });

    it('should find browser with platform', () => {
      // Look for any Android Chrome version
      const androidChrome = curl.getAvailableBrowsers().find(b => 
        b.name.startsWith('chrome') && b.platform === 'android'
      );
      
      if (androidChrome) {
        expect(androidChrome.platform).toBe('android');
        expect(androidChrome.os).toBe('android');
      } else {
        // If no Android Chrome found, test with a generated one
        const generatedAndroid = curl.generateChromeFingerprint('131', 'android');
        expect(generatedAndroid.platform).toBe('android');
        expect(generatedAndroid.os).toBe('android');
      }
    });

    it('should handle missing binaries gracefully', () => {
      expect(() => new CurlImpersonate()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no browsers available for request', async () => {
      const emptyCurl = new CurlImpersonate({
        binariesPath: './non-existent-path'
      });
      
      await expect(emptyCurl.request('https://httpbin.org/get')).rejects.toThrow('No valid browser fingerprint found');
    });

    it('should throw error when no browsers available for JSON request', async () => {
      const emptyCurl = new CurlImpersonate({
        binariesPath: './non-existent-path'
      });
      
      await expect(emptyCurl.requestJson('https://httpbin.org/json')).rejects.toThrow('No valid browser fingerprint found');
    });

    it('should handle network errors gracefully', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      // Test with a URL that should actually fail
      await expect(curl.request('https://this-domain-definitely-does-not-exist-12345-xyz.com', {}, browser))
        .rejects.toMatchObject({
          code: 'CURL_ERROR',
          message: expect.stringContaining('Curl failed with code 6')
        });
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const curlInstance = new CurlImpersonate();
      expect(curlInstance).toBeInstanceOf(CurlImpersonate);
    });

    it('should use custom configuration', () => {
      const curlInstance = new CurlImpersonate({
        binariesPath: '/Users/c0re/Software/curl-impersonate-v1.1.2.arm64-macos',
        defaultTimeout: 60000,
        defaultMaxRedirects: 10,
        defaultVerifySSL: false
      });
      expect(curlInstance).toBeInstanceOf(CurlImpersonate);
    });
  });

  describe('Response Parsing', () => {
    it('should parse response headers correctly', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/headers', {}, browser);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toBeDefined();
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should parse response size and timing', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/get', {}, browser);

      expect(response.statusCode).toBe(200);
      expect(response.size).toBeGreaterThan(0);
      expect(response.responseTime).toBeGreaterThan(0);
    });

    it('should handle redirects', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      const response = await curl.request('https://httpbin.org/redirect/2', {}, browser);

      expect(response.statusCode).toBe(200);
      expect(response.url).toContain('httpbin.org/get');
    });
  });

  describe('OS-Specific Headers and Flexible Versions', () => {
    it('should generate Chrome fingerprint with OS-specific headers', () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      expect(browser).toBeDefined();
      expect(browser?.os).toBeDefined();
      expect(browser?.secChUaPlatform).toBeDefined();
      expect(browser?.acceptLanguage).toBeDefined();
      expect(browser?.acceptEncoding).toBeDefined();
    });

    it('should generate custom Chrome version fingerprint', () => {
      const customChrome = curl.generateChromeFingerprint('105', 'windows');
      
      expect(customChrome.name).toBe('chrome105');
      expect(customChrome.version).toBe('105');
      expect(customChrome.os).toBe('windows');
      expect(customChrome.secChUaPlatform).toBe('"Windows"');
      expect(customChrome.userAgent).toContain('Chrome/105.0.0.0');
    });

    it('should generate Chrome fingerprint for different OS', () => {
      const macChrome = curl.generateChromeFingerprint('110', 'macos');
      const androidChrome = curl.generateChromeFingerprint('115', 'android');
      
      expect(macChrome.os).toBe('macos');
      expect(macChrome.secChUaPlatform).toBe('"macOS"');
      expect(macChrome.userAgent).toContain('Macintosh');
      
      expect(androidChrome.os).toBe('android');
      expect(androidChrome.secChUaPlatform).toBe('"Android"');
      expect(androidChrome.userAgent).toContain('Android');
    });

    it('should get random Chrome version', () => {
      const randomVersion = curl.getRandomChromeVersion(99, 136);
      const versionNum = parseInt(randomVersion, 10);
      
      expect(versionNum).toBeGreaterThanOrEqual(99);
      expect(versionNum).toBeLessThanOrEqual(136);
    });

    it('should make request with custom Chrome version', async () => {
      const customChrome = curl.generateChromeFingerprint('108', 'windows');
      
      const response = await curl.request('https://httpbin.org/user-agent', {}, customChrome);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Chrome/108.0.0.0');
    });

    it('should make request with different OS Chrome versions', async () => {
      const windowsChrome = curl.generateChromeFingerprint('112', 'windows');
      const macChrome = curl.generateChromeFingerprint('118', 'macos');
      
      const response1 = await curl.request('https://httpbin.org/user-agent', {}, windowsChrome);
      const response2 = await curl.request('https://httpbin.org/user-agent', {}, macChrome);
      
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(response1.body).toContain('Windows');
      expect(response2.body).toContain('Macintosh');
    });
  });
}); 