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
        'Sec-Ch-Ua': string;
        'Sec-Ch-Ua-Mobile': string;
        'Sec-Ch-Ua-Platform': string;
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
            'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Android"',
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
    'chrome120-macos': {
        name: 'Chrome 120 macOS',
        browser: 'chrome',
        version: '120',
        platform: 'desktop',
        os: 'macos',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Sec-Ch-Ua': 'Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
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
            'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
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