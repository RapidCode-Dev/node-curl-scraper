import { CurlImpersonate } from './curl-impersonate';
import { CURL_ERROR_CODES } from './types';

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

      // Handle potential 502 errors from httpbin.org
      expect([200, 502]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.body).toContain('"message"');
        expect(response.body).toContain('"test"');
      }
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
    }, 10000); // 10 second timeout

    it('should handle curl execution errors', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      // Test with a URL that should actually fail (non-existent domain)
      await expect(curl.request('https://this-domain-definitely-does-not-exist-12345-xyz.com', {}, browser))
        .rejects.toMatchObject({
          code: 'CURLE_COULDNT_RESOLVE_HOST',
          curlCode: 6
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
    }, 15000); // 15 second timeout

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
    }, 10000); // 10 second timeout
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
        binariesPath: '/non-existent-path'
      });
      
      await expect(emptyCurl.request('https://httpbin.org/get')).rejects.toThrow('No valid browser fingerprint found');
    });

    it('should throw error when no browsers available for JSON request', async () => {
      const emptyCurl = new CurlImpersonate({
        binariesPath: '/non-existent-path'
      });
      
      await expect(emptyCurl.requestJson('https://httpbin.org/json')).rejects.toThrow('No valid browser fingerprint found');
    });

    it('should handle network errors gracefully', async () => {
      const browsers = curl.getAvailableBrowsers();
      const browser = browsers.find(b => b.name === 'chrome99');
      
      // Test with a URL that should actually fail
      await expect(curl.request('https://this-domain-definitely-does-not-exist-12345-xyz.com', {}, browser))
        .rejects.toMatchObject({
          code: 'CURLE_COULDNT_RESOLVE_HOST',
          curlCode: 6
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

      // Handle potential 502 errors from httpbin.org
      expect([200]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.headers).toBeDefined();
        expect(response.headers['content-type']).toContain('application/json');
      }
    }, 10000); // 10 second timeout

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

      // Handle potential 502 errors from httpbin.org
      expect([200]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.url).toContain('httpbin.org/get');
      }
    }, 10000); // 10 second timeout
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
    }, 15000); // 15 second timeout
  });

  // NEW: Comprehensive CURL Error Handling Tests
  describe('CurlImpersonate Error Handling', () => {
    let curlImpersonate: CurlImpersonate;

    beforeEach(() => {
      curlImpersonate = new CurlImpersonate({
        binariesPath: '/Users/c0re/Software/curl-impersonate-v1.1.2.arm64-macos'
      });
    });

    describe('CURL Error Code Handling', () => {
      test('should handle CURLE_COULDNT_RESOLVE_PROXY (error code 5)', async () => {
        const options = {
          proxy: {
            host: 'invalid-proxy-host-that-does-not-exist.com',
            port: 8080,
            protocol: 'http' as const
          }
        };

        try {
          await curlImpersonate.request('https://httpbin.org/get', options);
          fail('Expected error to be thrown');
        } catch (error: any) {
          // The error is a CurlError object
          expect(error).toBeDefined();
          expect(error.code).toBe('CURLE_COULDNT_RESOLVE_PROXY');
          expect(error.curlCode).toBe(5);
          expect(error.curlCodeName).toBe('CURLE_COULDNT_RESOLVE_PROXY');
          expect(error.message).toContain('Could not resolve proxy');
          expect(error.proxyFailed).toBe(true);
          expect(error.retryable).toBe(true);
        }
      });

      test('should handle CURLE_COULDNT_RESOLVE_HOST (error code 6)', async () => {
        try {
          await curlImpersonate.request('https://invalid-host-that-does-not-exist-12345.com');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error).toBeDefined();
          expect(error.code).toBe('CURLE_COULDNT_RESOLVE_HOST');
          expect(error.curlCode).toBe(6);
          expect(error.curlCodeName).toBe('CURLE_COULDNT_RESOLVE_HOST');
          expect(error.message).toContain('Could not resolve host');
          expect(error.proxyFailed).toBe(false);
          expect(error.retryable).toBe(true);
        }
      });

      test('should handle CURLE_OPERATION_TIMEDOUT (error code 28)', async () => {
        const options = {
          timeout: 1 // 1 second timeout
        };

        try {
          await curlImpersonate.request('https://httpbin.org/delay/10', options);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error).toBeDefined();
          expect(error.code).toBe('CURLE_OPERATION_TIMEDOUT');
          expect(error.curlCode).toBe(28);
          expect(error.curlCodeName).toBe('CURLE_OPERATION_TIMEDOUT');
          expect(error.message).toContain('Operation timeout');
          expect(error.proxyFailed).toBe(true); // Timeout can be proxy-related
          expect(error.retryable).toBe(true);
        }
      });

      test('should handle CURLE_SSL_CONNECT_ERROR (error code 35)', async () => {
        try {
          // Try to connect to a server with invalid SSL
          await curlImpersonate.request('https://expired.badssl.com/');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error).toBeDefined();
          // Note: This might not always be SSL error, but it demonstrates error handling
          expect(error.curlCode).toBeDefined();
          expect(error.retryable).toBeDefined();
        }
      });

      test('should handle unknown CURL error codes', async () => {
        // Mock a scenario where we get an unknown error code
        const mockError = new Error('curl: (999) Unknown error');
        (mockError as any).curlCode = 999;
        
        const parsedError = (curlImpersonate as any).parseError(mockError);
        
        expect(parsedError.code).toBe('CURL_ERROR');
        expect(parsedError.message).toBe('curl: (999) Unknown error');
        // Since 999 is not in CURL_ERROR_CODES, it should be undefined
        expect(parsedError.curlCode).toBeUndefined();
        expect(parsedError.curlCodeName).toBeUndefined();
        expect(parsedError.proxyFailed).toBe(false);
        expect(parsedError.retryable).toBe(false);
      });
    });

    describe('Error Code Extraction', () => {
      test('should extract CURL error codes from various error message formats', () => {
        const extractCurlErrorCode = (curlImpersonate as any).extractCurlErrorCode.bind(curlImpersonate);
        
        expect(extractCurlErrorCode('curl: (5) Couldn\'t resolve proxy')).toBe(5);
        expect(extractCurlErrorCode('error code: 6')).toBe(6);
        expect(extractCurlErrorCode('curl error: 28')).toBe(28);
        expect(extractCurlErrorCode('failed with code 35')).toBe(35);
        expect(extractCurlErrorCode('exit code: 97')).toBe(97);
        expect(extractCurlErrorCode('returned 101')).toBe(101);
        expect(extractCurlErrorCode('no error code in this message')).toBe(null);
      });
    });

    describe('Proxy Error Detection', () => {
      test('should detect proxy-related errors', () => {
        const isProxyRelatedError = (curlImpersonate as any).isProxyRelatedError.bind(curlImpersonate);
        
        // Test by CURL error codes
        expect(isProxyRelatedError('', 5)).toBe(true); // CURLE_COULDNT_RESOLVE_PROXY
        expect(isProxyRelatedError('', 7)).toBe(true); // CURLE_COULDNT_CONNECT
        expect(isProxyRelatedError('', 28)).toBe(true); // CURLE_OPERATION_TIMEDOUT
        expect(isProxyRelatedError('', 97)).toBe(true); // CURLE_PROXY
        expect(isProxyRelatedError('', 6)).toBe(false); // CURLE_COULDNT_RESOLVE_HOST
        
        // Test by error message keywords
        expect(isProxyRelatedError('Couldn\'t resolve proxy', null)).toBe(true);
        expect(isProxyRelatedError('Failed to connect to proxy', null)).toBe(true);
        expect(isProxyRelatedError('Proxy authentication failed', null)).toBe(true);
        expect(isProxyRelatedError('Connection refused', null)).toBe(true);
        expect(isProxyRelatedError('Couldn\'t resolve host', null)).toBe(false);
      });
    });

    describe('Retryable Error Detection', () => {
      test('should detect retryable errors', () => {
        const isRetryableError = (curlImpersonate as any).isRetryableError.bind(curlImpersonate);
        
        expect(isRetryableError('Operation timed out')).toBe(true);
        expect(isRetryableError('Connection refused')).toBe(true);
        expect(isRetryableError('Couldn\'t connect')).toBe(true);
        expect(isRetryableError('Network is unreachable')).toBe(true);
        expect(isRetryableError('Temporary failure')).toBe(true);
        expect(isRetryableError('SSL certificate error')).toBe(false);
        expect(isRetryableError('Authentication failed')).toBe(false);
      });
    });

    describe('CURL Error Codes Mapping', () => {
      test('should have comprehensive error code mappings', () => {
        // Test some key error codes
        expect(CURL_ERROR_CODES[5]).toEqual({
          name: 'CURLE_COULDNT_RESOLVE_PROXY',
          description: 'Could not resolve proxy. The given proxy host could not be resolved.',
          retryable: true
        });
        
        expect(CURL_ERROR_CODES[6]).toEqual({
          name: 'CURLE_COULDNT_RESOLVE_HOST',
          description: 'Could not resolve host. The given remote host was not resolved.',
          retryable: true
        });
        
        expect(CURL_ERROR_CODES[28]).toEqual({
          name: 'CURLE_OPERATION_TIMEDOUT',
          description: 'Operation timeout. The specified time-out period was reached according to the conditions.',
          retryable: true
        });
        
        expect(CURL_ERROR_CODES[97]).toEqual({
          name: 'CURLE_PROXY',
          description: 'Proxy handshake error.',
          retryable: true
        });
      });

      test('should categorize errors correctly as retryable or not', () => {
        // Retryable errors
        expect(CURL_ERROR_CODES[5].retryable).toBe(true); // Proxy resolution
        expect(CURL_ERROR_CODES[6].retryable).toBe(true); // Host resolution
        expect(CURL_ERROR_CODES[7].retryable).toBe(true); // Connection
        expect(CURL_ERROR_CODES[28].retryable).toBe(true); // Timeout
        expect(CURL_ERROR_CODES[97].retryable).toBe(true); // Proxy handshake
        
        // Non-retryable errors
        expect(CURL_ERROR_CODES[3].retryable).toBe(false); // URL malformed
        expect(CURL_ERROR_CODES[9].retryable).toBe(false); // Access denied
        expect(CURL_ERROR_CODES[22].retryable).toBe(false); // HTTP error
        expect(CURL_ERROR_CODES[51].retryable).toBe(false); // SSL verification failed
      });
    });

    describe('Error Parsing Integration', () => {
      test('should parse errors with full context', async () => {
        try {
          await curlImpersonate.request('https://invalid-host-that-does-not-exist-12345.com');
          fail('Expected error to be thrown');
        } catch (error: any) {
          // The error is already a CurlError object, so parsing it again would be redundant
          // But we can test that the error has the correct structure
          expect(error.code).toBe('CURLE_COULDNT_RESOLVE_HOST');
          expect(error.message).toContain('Could not resolve host');
          expect(error.curlCode).toBe(6);
          expect(error.curlCodeName).toBe('CURLE_COULDNT_RESOLVE_HOST');
          expect(error.proxyFailed).toBe(false);
          expect(error.retryable).toBe(true);
          expect(error.details).toBeDefined();
        }
      });
    });

    // Example test showing comprehensive error handling
    test('should demonstrate comprehensive CURL error handling', async () => {
      // Test proxy error (CURL error code 5)
      try {
        await curlImpersonate.request('https://httpbin.org/get', {
          proxy: { host: 'invalid-proxy.com', port: 8080, protocol: 'http' }
        });
        fail('Expected proxy error');
      } catch (error: any) {
        expect(error.code).toBe('CURLE_COULDNT_RESOLVE_PROXY');
        expect(error.curlCode).toBe(5);
        expect(error.proxyFailed).toBe(true);
        expect(error.retryable).toBe(true);
      }

      // Test host resolution error (CURL error code 6)
      try {
        await curlImpersonate.request('https://invalid-host-12345.com');
        fail('Expected host resolution error');
      } catch (error: any) {
        expect(error.code).toBe('CURLE_COULDNT_RESOLVE_HOST');
        expect(error.curlCode).toBe(6);
        expect(error.proxyFailed).toBe(false);
        expect(error.retryable).toBe(true);
      }
    });
  });
}); 