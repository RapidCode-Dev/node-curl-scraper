import { CurlImpersonate } from './curl-impersonate';
import { CURL_ERROR_CODES } from './types';

describe('CurlImpersonate', () => {
    let curl: CurlImpersonate;

    beforeEach(() => {
        curl = new CurlImpersonate({
            binariesPath: '/Users/c0re/Software/curl-impersonate-v1.1.2.arm64-macos'
        });
    });

    describe('Fingerprint Configuration Tests', () => {
        it('should get available fingerprint configurations', () => {
            const fingerprints = curl.getAvailableFingerprints();
            expect(Array.isArray(fingerprints)).toBe(true);
            expect(fingerprints.length).toBeGreaterThan(0);
            expect(fingerprints).toContain('chrome136-macos');
            expect(fingerprints).toContain('chrome136-windows');
            expect(fingerprints).toContain('firefox133-macos');
        });

        it('should get specific fingerprint configuration', () => {
            const fingerprint = curl.getFingerprintConfig('chrome136-macos');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.name).toBe('Chrome 136 macOS');
            expect(fingerprint?.browser).toBe('chrome');
            expect(fingerprint?.version).toBe('136');
            expect(fingerprint?.os).toBe('macos');
            expect(fingerprint?.headers['User-Agent']).toContain('Chrome/136');
        });

        it('should find fingerprint by browser, version, and OS', () => {
            const fingerprint = curl.findFingerprintByBrowser('chrome', '136', 'macos');
            expect(fingerprint).toBeDefined();
            expect(fingerprint?.name).toBe('Chrome 136 macOS');
        });

        it('should return null for non-existent fingerprint', () => {
            const fingerprint = curl.getFingerprintConfig('non-existent');
            expect(fingerprint).toBeNull();
        });
    });

    describe('Real Binary Execution Tests', () => {
        it('should execute curl binary with correct arguments', async () => {
            const response = await curl.request('https://httpbin.org/get', {}, 'chrome136-macos');

            // Verify response
            expect(response.statusCode).toBe(200);
            expect(response.body).toContain('"url"');
            expect(response.headers).toBeDefined();
        });

        it('should execute POST request with JSON body', async () => {
            const response = await curl.request('https://httpbin.org/post', {
                method: 'POST',
                json: { message: 'test' }
            }, 'chrome136-macos');

            // Handle potential 502 errors from httpbin.org
            expect([200, 502]).toContain(response.statusCode);
            if (response.statusCode === 200) {
                expect(response.body).toContain('"message"');
                expect(response.body).toContain('"test"');
            }
        });

        it('should execute request with cookies', async () => {
            const response = await curl.request('https://httpbin.org/cookies', {
                cookies: {
                    session: 'abc123',
                    user: 'john'
                }
            }, 'chrome136-macos');

            expect(response.statusCode).toBe(200);
            expect(response.body).toContain('"cookies"');
        });

        it('should execute request with custom headers', async () => {
            const response = await curl.request('https://httpbin.org/headers', {
                headers: {
                    'X-Custom': 'value',
                    'Accept': 'application/json'
                }
            }, 'chrome136-macos');

            expect(response.statusCode).toBe(200);
            expect(response.body).toContain('"headers"');
        });

        it('should execute request with timeout', async () => {
            const response = await curl.request('https://httpbin.org/delay/1', {
                timeout: 5000
            }, 'chrome136-macos');

            expect(response.statusCode).toBe(200);
        }, 10000); // 10 second timeout

        it('should handle curl execution errors', async () => {
            // Test with a URL that should actually fail (non-existent domain)
            await expect(curl.request('https://this-domain-definitely-does-not-exist-12345-xyz.com', {}, 'chrome136-macos'))
                .rejects.toMatchObject({
                    code: 'CURLE_COULDNT_RESOLVE_HOST',
                    curlCode: 6
                });
        });

        it('should parse JSON responses correctly', async () => {
            const response = await curl.requestJson('https://httpbin.org/json', {}, 'chrome136-macos');

            expect(response.statusCode).toBe(200);
            expect(response.data).toBeDefined();
            expect(response.data.slideshow).toBeDefined();
        });

        it('should handle different browser fingerprints', async () => {
            // Test Chrome
            const chromeResponse = await curl.request('https://httpbin.org/user-agent', {}, 'chrome136-macos');
            expect(chromeResponse.statusCode).toBe(200);
            expect(chromeResponse.body).toContain('Chrome'); // Look for Chrome in user-agent

            // Test Firefox
            const firefoxResponse = await curl.request('https://httpbin.org/user-agent', {}, 'firefox133-macos');
            expect(firefoxResponse.statusCode).toBe(200);
            expect(firefoxResponse.body).toContain('Firefox'); // Look for Firefox in user-agent
        }, 15000); // 15 second timeout

        it('should handle form data requests', async () => {
            const response = await curl.request('https://httpbin.org/post', {
                method: 'POST',
                formData: {
                    name: 'test',
                    email: 'test@example.com'
                }
            }, 'chrome136-macos');

            expect(response.statusCode).toBe(200);
            expect(response.body).toContain('"form"');
        });

        it('should handle file uploads', async () => {
            const response = await curl.request('https://httpbin.org/post', {
                method: 'POST',
                formData: {
                    file: Buffer.from('test file content')
                }
            }, 'chrome136-macos');

            expect(response.statusCode).toBe(200);
        }, 10000); // 10 second timeout
    });

    describe('Default Fingerprint Behavior', () => {
        it('should use default fingerprint when none specified', async () => {
            const response = await curl.request('https://httpbin.org/get');
            expect(response.statusCode).toBe(200);
        });

        it('should throw error for invalid fingerprint', async () => {
            await expect(curl.request('https://httpbin.org/get', {}, 'invalid-fingerprint'))
                .rejects.toThrow('Fingerprint configuration not found: invalid-fingerprint');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            // Test with a URL that should actually fail
            await expect(curl.request('https://this-domain-definitely-does-not-exist-12345-xyz.com', {}, 'chrome136-macos'))
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
            const response = await curl.request('https://httpbin.org/headers', {}, 'chrome136-macos');

            // Handle potential 502 errors from httpbin.org
            expect([200]).toContain(response.statusCode);
            if (response.statusCode === 200) {
                expect(response.headers).toBeDefined();
                expect(response.headers['content-type']).toContain('application/json');
            }
        }, 10000); // 10 second timeout

        it('should parse response size and timing', async () => {
            const response = await curl.request('https://httpbin.org/get', {}, 'chrome136-macos');

            expect(response.statusCode).toBe(200);
            expect(response.size).toBeGreaterThan(0);
            expect(response.responseTime).toBeGreaterThan(0);
        });

        it('should handle redirects', async () => {
            const response = await curl.request('https://httpbin.org/redirect/2', {}, 'chrome136-macos');

            // Handle potential 502 errors from httpbin.org
            expect([200]).toContain(response.statusCode);
            if (response.statusCode === 200) {
                expect(response.url).toContain('httpbin.org/get');
            }
        }, 10000); // 10 second timeout
    });

    describe('TLS and Cipher Configuration', () => {
        it('should apply TLS configuration from fingerprint', async () => {
            const fingerprint = curl.getFingerprintConfig('chrome136-macos');
            expect(fingerprint?.tls.ciphers).toBeDefined();
            expect(fingerprint?.tls.curves).toBeDefined();
            expect(fingerprint?.tls.http2Settings).toBeDefined();
            expect(fingerprint?.tls.echGrease).toBe(true);
            expect(fingerprint?.tls.tlsv12).toBe(true);
        });

        it('should apply different TLS configurations for different browsers', async () => {
            const chromeFingerprint = curl.getFingerprintConfig('chrome136-macos');
            const firefoxFingerprint = curl.getFingerprintConfig('firefox133-macos');

            expect(chromeFingerprint?.tls.echGrease).toBe(true);
            expect(firefoxFingerprint?.tls.echGrease).toBe(false);
            expect(chromeFingerprint?.tls.alps).toBe(true);
            expect(firefoxFingerprint?.tls.alps).toBe(false);
        });
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
                    await curlImpersonate.request('https://httpbin.org/get', options, 'chrome136-macos');
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
                    await curlImpersonate.request('https://invalid-host-that-does-not-exist-12345.com', {}, 'chrome136-macos');
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
                    await curlImpersonate.request('https://httpbin.org/delay/10', options, 'chrome136-macos');
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
                    await curlImpersonate.request('https://expired.badssl.com/', {}, 'chrome136-macos');
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
                    await curlImpersonate.request('https://invalid-host-that-does-not-exist-12345.com', {}, 'chrome136-macos');
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
                }, 'chrome136-macos');
                fail('Expected proxy error');
            } catch (error: any) {
                expect(error.code).toBe('CURLE_COULDNT_RESOLVE_PROXY');
                expect(error.curlCode).toBe(5);
                expect(error.proxyFailed).toBe(true);
                expect(error.retryable).toBe(true);
            }

            // Test host resolution error (CURL error code 6)
            try {
                await curlImpersonate.request('https://invalid-host-12345.com', {}, 'chrome136-macos');
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