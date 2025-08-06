export interface FingerprintConfig {
  name: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  version: string;
  platform: 'desktop' | 'mobile';
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios';
  
  // Headers configuration
  headers: {
    'User-Agent': string;
    'Accept': string;
    'Accept-Language': string;
    'Accept-Encoding': string;
    'sec-ch-ua': string;
    'sec-ch-ua-mobile': string;
    'sec-ch-ua-platform': string;
    'Upgrade-Insecure-Requests': string;
    'Sec-Fetch-Site': string;
    'Sec-Fetch-Mode': string;
    'Sec-Fetch-User': string;
    'Sec-Fetch-Dest': string;
    'Priority'?: string;
    'TE'?: string;
  };
  
  // TLS/Cipher configuration
  tls: {
    ciphers: string;
    curves: string;
    http2Settings: string;
    http2WindowUpdate: number;
    http2StreamWeight: number;
    http2StreamExclusive: number;
    echGrease: boolean;
    tlsv12: boolean;
    alps: boolean;
    tlsPermuteExtensions: boolean;
    certCompression: string;
    tlsGrease: boolean;
    tlsUseNewAlpsCodepoint: boolean;
          tlsSignedCertTimestamps: boolean;
      signatureHashes?: string;
      tlsExtensionOrder?: string;
      tlsDelegatedCredentials?: string;
      tlsRecordSizeLimit?: number;
      tlsKeySharesLimit?: number;
      http2PseudoHeadersOrder?: string;
      tlsv10?: boolean;
      noTlsSessionTicket?: boolean;
  };
}

// Predefined fingerprint configurations
export const FINGERPRINT_CONFIGS: Record<string, FingerprintConfig> = {
  'chrome131-android': {
    name: 'Chrome 131 Android',
    browser: 'chrome',
    version: '131',
    platform: 'mobile',
    os: 'android',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Android"',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document',
      'Priority': 'u=0, i'
    },
    tls: {
      ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA',
      curves: 'X25519:P-256:P-384',
      http2Settings: '1:65536;2:0;4:6291456;6:262144',
      http2WindowUpdate: 15663105,
      http2StreamWeight: 256,
      http2StreamExclusive: 1,
      echGrease: true,
      tlsv12: true,
      alps: true,
      tlsPermuteExtensions: true,
      certCompression: 'brotli',
      tlsGrease: true,
      tlsUseNewAlpsCodepoint: false,
      tlsSignedCertTimestamps: true
    }
  },

  'firefox135-macos': {
    name: 'Firefox 135 macOS',
    browser: 'firefox',
    version: '135',
    platform: 'desktop',
    os: 'macos',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Priority': 'u=0, i',
      'TE': 'trailers'
    },
    tls: {
      ciphers: 'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA',
      curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521:ffdhe2048:ffdhe3072',
      http2Settings: '1:65536;2:0;4:131072;5:16384',
      http2WindowUpdate: 12517377,
      http2StreamWeight: 42,
      http2StreamExclusive: 0,
      echGrease: true,
      tlsv12: true,
      alps: false,
      tlsPermuteExtensions: false,
      certCompression: 'zlib,brotli,zstd',
      tlsGrease: false,
      tlsUseNewAlpsCodepoint: false,
      tlsSignedCertTimestamps: true,
      signatureHashes: 'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:rsa_pss_rsae_sha256:rsa_pss_rsae_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha256:rsa_pkcs1_sha384:rsa_pkcs1_sha512:ecdsa_sha1:rsa_pkcs1_sha1',
      tlsExtensionOrder: '0-23-65281-10-11-35-16-5-34-18-51-43-13-45-28-27-65037',
      tlsDelegatedCredentials: 'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:ecdsa_sha1',
      tlsRecordSizeLimit: 4001,
      tlsKeySharesLimit: 3,
      http2PseudoHeadersOrder: 'mpas'
    }
  },

  'safari184-macos': {
    name: 'Safari 184 macOS',
    browser: 'safari',
    version: '184',
    platform: 'desktop',
    os: 'macos',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document',
      'Priority': 'u=0, i'
    },
    tls: {
      ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA:TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA:TLS_RSA_WITH_3DES_EDE_CBC_SHA',
      curves: 'X25519:P-256:P-384:P-521',
      signatureHashes: 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512:rsa_pkcs1_sha1',
      http2Settings: '2:0;3:100;4:2097152;9:1',
      http2PseudoHeadersOrder: 'msap',
      http2WindowUpdate: 10420225,
      http2StreamWeight: 256,
      http2StreamExclusive: 0,
      echGrease: false,
      tlsv12: false,
      alps: false,
      tlsPermuteExtensions: false,
      certCompression: 'zlib',
      tlsGrease: true,
      tlsUseNewAlpsCodepoint: false,
      tlsSignedCertTimestamps: true,
      tlsv10: true,
      noTlsSessionTicket: true
    }
  },

  'chrome136-macos': {
    name: 'Chrome 136 macOS',
    browser: 'chrome',
    version: '136',
    platform: 'desktop',
    os: 'macos',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document',
      'Priority': 'u=0, i'
    },
    tls: {
      ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA',
      curves: 'X25519MLKEM768:X25519:P-256:P-384',
      http2Settings: '1:65536;2:0;4:6291456;6:262144',
      http2WindowUpdate: 15663105,
      http2StreamWeight: 256,
      http2StreamExclusive: 1,
      echGrease: true,
      tlsv12: true,
      alps: true,
      tlsPermuteExtensions: true,
      certCompression: 'brotli',
      tlsGrease: true,
      tlsUseNewAlpsCodepoint: true,
      tlsSignedCertTimestamps: true
    }
  }
};

export function getFingerprintConfig(name: string): FingerprintConfig | null {
  return FINGERPRINT_CONFIGS[name] || null;
}

export function getAvailableFingerprints(): string[] {
  return Object.keys(FINGERPRINT_CONFIGS);
}

export function findFingerprintByBrowser(
  browser: string, 
  version?: string, 
  os?: string
): FingerprintConfig | null {
  const configs = Object.values(FINGERPRINT_CONFIGS);
  
  return configs.find(config => {
    const browserMatch = config.browser === browser;
    const versionMatch = !version || config.version === version;
    const osMatch = !os || config.os === os;
    
    return browserMatch && versionMatch && osMatch;
  }) || null;
} 