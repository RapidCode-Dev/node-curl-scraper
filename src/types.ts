// Core scraping types
export interface ScrapingSession {
    id: string;
    cookies: Record<string, string>;
    userAgent: string;
    fingerprint: any; // Updated to use FingerprintConfig from fingerprint-config.ts
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
    fingerprints?: string[]; // Updated to use fingerprint names
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
    curlCode?: number; // The actual CURL error code
    curlCodeName?: string; // The CURL error code name (e.g., CURLE_COULDNT_RESOLVE_PROXY)
}

// Comprehensive CURL error codes mapping
export const CURL_ERROR_CODES: Record<number, { name: string; description: string; retryable: boolean }> = {
    0: { name: 'CURLE_OK', description: 'All fine. Proceed as usual.', retryable: false },
    1: { name: 'CURLE_UNSUPPORTED_PROTOCOL', description: 'The URL you passed to libcurl used a protocol that this libcurl does not support.', retryable: false },
    2: { name: 'CURLE_FAILED_INIT', description: 'Early initialization code failed.', retryable: true },
    3: { name: 'CURLE_URL_MALFORMAT', description: 'The URL was not properly formatted.', retryable: false },
    4: { name: 'CURLE_NOT_BUILT_IN', description: 'A requested feature, protocol or option was not found built into this libcurl.', retryable: false },
    5: { name: 'CURLE_COULDNT_RESOLVE_PROXY', description: 'Could not resolve proxy. The given proxy host could not be resolved.', retryable: true },
    6: { name: 'CURLE_COULDNT_RESOLVE_HOST', description: 'Could not resolve host. The given remote host was not resolved.', retryable: true },
    7: { name: 'CURLE_COULDNT_CONNECT', description: 'Failed to connect() to host or proxy.', retryable: true },
    8: { name: 'CURLE_WEIRD_SERVER_REPLY', description: 'The server sent data libcurl could not parse.', retryable: true },
    9: { name: 'CURLE_REMOTE_ACCESS_DENIED', description: 'We were denied access to the resource given in the URL.', retryable: false },
    10: { name: 'CURLE_FTP_ACCEPT_FAILED', description: 'While waiting for the server to connect back when an active FTP session is used, an error code was sent over the control connection.', retryable: true },
    11: { name: 'CURLE_FTP_WEIRD_PASS_REPLY', description: 'After having sent the FTP password to the server, libcurl expects a proper reply. This error code indicates that an unexpected code was returned.', retryable: true },
    12: { name: 'CURLE_FTP_ACCEPT_TIMEOUT', description: 'During an active FTP session while waiting for the server to connect, the CURLOPT_ACCEPTTIMEOUT_MS timeout expired.', retryable: true },
    13: { name: 'CURLE_FTP_WEIRD_PASV_REPLY', description: 'libcurl failed to get a sensible result back from the server as a response to either a PASV or an EPSV command.', retryable: true },
    14: { name: 'CURLE_FTP_WEIRD_227_FORMAT', description: 'FTP servers return a 227-line as a response to a PASV command. If libcurl fails to parse that line, this return code is passed back.', retryable: true },
    15: { name: 'CURLE_FTP_CANT_GET_HOST', description: 'An internal failure to lookup the host used for the new connection.', retryable: true },
    16: { name: 'CURLE_HTTP2', description: 'A problem was detected in the HTTP2 framing layer.', retryable: true },
    17: { name: 'CURLE_FTP_COULDNT_SET_TYPE', description: 'Received an error when trying to set the transfer mode to binary or ASCII.', retryable: true },
    18: { name: 'CURLE_PARTIAL_FILE', description: 'A file transfer was shorter or larger than expected.', retryable: true },
    19: { name: 'CURLE_FTP_COULDNT_RETR_FILE', description: 'This was either a weird reply to a RETR command or a zero byte transfer complete.', retryable: true },
    21: { name: 'CURLE_QUOTE_ERROR', description: 'When sending custom QUOTE commands to the remote server, one of the commands returned an error code that was 400 or higher.', retryable: true },
    22: { name: 'CURLE_HTTP_RETURNED_ERROR', description: 'This is returned if CURLOPT_FAILONERROR is set TRUE and the HTTP server returns an error code that is >= 400.', retryable: false },
    23: { name: 'CURLE_WRITE_ERROR', description: 'An error occurred when writing received data to a local file, or an error was returned to libcurl from a write callback.', retryable: true },
    25: { name: 'CURLE_UPLOAD_FAILED', description: 'Failed starting the upload. For FTP, the server typically denied the STOR command.', retryable: true },
    26: { name: 'CURLE_READ_ERROR', description: 'There was a problem reading a local file or an error returned by the read callback.', retryable: true },
    27: { name: 'CURLE_OUT_OF_MEMORY', description: 'A memory allocation request failed.', retryable: true },
    28: { name: 'CURLE_OPERATION_TIMEDOUT', description: 'Operation timeout. The specified time-out period was reached according to the conditions.', retryable: true },
    30: { name: 'CURLE_FTP_PORT_FAILED', description: 'The FTP PORT command returned error.', retryable: true },
    31: { name: 'CURLE_FTP_COULDNT_USE_REST', description: 'The FTP REST command returned error.', retryable: true },
    33: { name: 'CURLE_RANGE_ERROR', description: 'The server does not support or accept range requests.', retryable: false },
    35: { name: 'CURLE_SSL_CONNECT_ERROR', description: 'A problem occurred somewhere in the SSL/TLS handshake.', retryable: true },
    36: { name: 'CURLE_BAD_DOWNLOAD_RESUME', description: 'The download could not be resumed because the specified offset was out of the file boundary.', retryable: false },
    37: { name: 'CURLE_FILE_COULDNT_READ_FILE', description: 'A file given with FILE:// could not be opened.', retryable: false },
    38: { name: 'CURLE_LDAP_CANNOT_BIND', description: 'LDAP cannot bind. LDAP bind operation failed.', retryable: true },
    39: { name: 'CURLE_LDAP_SEARCH_FAILED', description: 'LDAP search failed.', retryable: true },
    41: { name: 'CURLE_FUNCTION_NOT_FOUND', description: 'A required function was not found in the SSL library.', retryable: false },
    42: { name: 'CURLE_ABORTED_BY_CALLBACK', description: 'A callback returned ABORT to libcurl.', retryable: false },
    43: { name: 'CURLE_BAD_FUNCTION_ARGUMENT', description: 'A function was called with a bad parameter.', retryable: false },
    45: { name: 'CURLE_INTERFACE_FAILED', description: 'Interface error. A specified outgoing interface could not be used.', retryable: true },
    47: { name: 'CURLE_TOO_MANY_REDIRECTS', description: 'Too many redirects. When following redirects, libcurl hit the maximum amount.', retryable: false },
    48: { name: 'CURLE_UNKNOWN_TELNET_OPTION', description: 'A telnet option string was Illegally formatted.', retryable: false },
    49: { name: 'CURLE_TELNET_OPTION_SYNTAX', description: 'A telnet option string was Illegally formatted.', retryable: false },
    51: { name: 'CURLE_PEER_FAILED_VERIFICATION', description: 'The remote server\'s SSL certificate or SSH md5 fingerprint was deemed not ok.', retryable: false },
    52: { name: 'CURLE_GOT_NOTHING', description: 'Nothing was returned from the server, and under the circumstances, getting nothing is considered an error.', retryable: true },
    53: { name: 'CURLE_SSL_ENGINE_NOTFOUND', description: 'The specified crypto engine wasn\'t found.', retryable: false },
    54: { name: 'CURLE_SSL_ENGINE_SETFAILED', description: 'Failed setting the selected SSL crypto engine as default!', retryable: false },
    55: { name: 'CURLE_SEND_ERROR', description: 'Failed sending network data.', retryable: true },
    56: { name: 'CURLE_RECV_ERROR', description: 'Failure with receiving network data.', retryable: true },
    58: { name: 'CURLE_SSL_CERTPROBLEM', description: 'Problem with the local client certificate.', retryable: false },
    59: { name: 'CURLE_SSL_CIPHER', description: 'Couldn\'t use specified cipher.', retryable: false },
    60: { name: 'CURLE_SSL_CACERT', description: 'Peer certificate cannot be authenticated with known CA certificates.', retryable: false },
    61: { name: 'CURLE_BAD_CONTENT_ENCODING', description: 'Unrecognized transfer encoding.', retryable: false },
    62: { name: 'CURLE_LDAP_INVALID_URL', description: 'Invalid LDAP URL.', retryable: false },
    63: { name: 'CURLE_FILESIZE_EXCEEDED', description: 'Maximum file size exceeded.', retryable: false },
    64: { name: 'CURLE_USE_SSL_FAILED', description: 'Requested FTP SSL level failed.', retryable: true },
    65: { name: 'CURLE_SEND_FAIL_REWIND', description: 'When doing a send operation curl had to rewind the data to retransmit, but the rewinding operation failed.', retryable: true },
    66: { name: 'CURLE_SSL_ENGINE_INITFAILED', description: 'Initiating the SSL Engine failed.', retryable: false },
    67: { name: 'CURLE_LOGIN_DENIED', description: 'The remote server denied curl to login.', retryable: false },
    68: { name: 'CURLE_TFTP_NOTFOUND', description: 'File not found on TFTP server.', retryable: false },
    69: { name: 'CURLE_TFTP_PERM', description: 'Permission problem on TFTP server.', retryable: false },
    70: { name: 'CURLE_REMOTE_DISK_FULL', description: 'Out of disk space on the server.', retryable: false },
    71: { name: 'CURLE_TFTP_ILLEGAL', description: 'Illegal TFTP operation.', retryable: false },
    72: { name: 'CURLE_TFTP_UNKNOWNID', description: 'Unknown TFTP transfer ID.', retryable: false },
    73: { name: 'CURLE_REMOTE_FILE_EXISTS', description: 'File already exists and will not be overwritten.', retryable: false },
    74: { name: 'CURLE_TFTP_NOSUCHUSER', description: 'This error should never be returned by a properly functioning TFTP server.', retryable: false },
    75: { name: 'CURLE_CONV_FAILED', description: 'A character conversion failed.', retryable: false },
    76: { name: 'CURLE_CONV_REQD', description: 'Caller must register conversion callbacks.', retryable: false },
    77: { name: 'CURLE_SSL_CACERT_BADFILE', description: 'The file referenced by the SSL CA certificate bundle does not exist.', retryable: false },
    78: { name: 'CURLE_REMOTE_FILE_NOT_FOUND', description: 'Remote file not found in file size check.', retryable: false },
    79: { name: 'CURLE_SSH', description: 'Error from the SSH layer.', retryable: true },
    80: { name: 'CURLE_SSL_SHUTDOWN_FAILED', description: 'Failed to shut down the SSL connection.', retryable: true },
    81: { name: 'CURLE_AGAIN', description: 'Socket is not ready for send/recv wait till it\'s ready and try again.', retryable: true },
    82: { name: 'CURLE_SSL_CRL_BADFILE', description: 'Failed to load CRL file.', retryable: false },
    83: { name: 'CURLE_SSL_ISSUER_ERROR', description: 'Issuer check failed.', retryable: false },
    84: { name: 'CURLE_FTP_PRET_FAILED', description: 'The FTP server does not understand the PRET command at all or does not support the given argument.', retryable: true },
    85: { name: 'CURLE_RTSP_CSEQ_ERROR', description: 'Mismatch of RTSP CSeq numbers.', retryable: true },
    86: { name: 'CURLE_RTSP_SESSION_ERROR', description: 'Mismatch of RTSP Session Identifiers.', retryable: true },
    87: { name: 'CURLE_FTP_BAD_FILE_LIST', description: 'Unable to parse FTP file list.', retryable: true },
    88: { name: 'CURLE_CHUNK_FAILED', description: 'Chunk callback reported error.', retryable: true },
    89: { name: 'CURLE_NO_CONNECTION_AVAILABLE', description: 'No connection available, the session will be queued.', retryable: true },
    90: { name: 'CURLE_SSL_PINNEDPUBKEYNOTMATCH', description: 'The specified pinned public key did not match.', retryable: false },
    91: { name: 'CURLE_SSL_INVALIDCERTSTATUS', description: 'Status returned failure when requested with CURLOPT_SSL_VERIFYSTATUS.', retryable: false },
    92: { name: 'CURLE_HTTP2_STREAM', description: 'Stream error in the HTTP/2 framing layer.', retryable: true },
    93: { name: 'CURLE_RECURSIVE_API_CALL', description: 'An API function was called from inside a callback.', retryable: false },
    94: { name: 'CURLE_AUTH_ERROR', description: 'An authentication function returned an error.', retryable: true },
    95: { name: 'CURLE_HTTP3', description: 'A problem was detected in the HTTP/3 layer.', retryable: true },
    96: { name: 'CURLE_QUIC_CONNECT_ERROR', description: 'QUIC connection error. This error may be caused by an SSL library error.', retryable: true },
    97: { name: 'CURLE_PROXY', description: 'Proxy handshake error.', retryable: true },
    98: { name: 'CURLE_SSL_CLIENTCERT', description: 'SSL Client Certificate required.', retryable: false },
    99: { name: 'CURLE_UNRECOVERABLE_POLL', description: 'An internal call to poll() or select() returned error that is not recoverable.', retryable: false },
    100: { name: 'CURLE_TOO_LARGE', description: 'A value or data field grew larger than allowed.', retryable: false },
    101: { name: 'CURLE_ECH_REQUIRED', description: 'ECH was attempted but failed.', retryable: true }
};

export interface CurlImpersonateConfig {
    binariesPath?: string;
    defaultTimeout?: number;
    defaultMaxRedirects?: number;
    defaultVerifySSL?: boolean;
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