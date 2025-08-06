export interface FingerprintConfig {
    name: string;
    browser: 'chrome' | 'firefox' | 'safari' | 'edge';
    version: string;
    platform: 'desktop' | 'mobile';
    os: 'windows' | 'macos' | 'linux' | 'android' | 'ios';
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
export declare const FINGERPRINT_CONFIGS: Record<string, FingerprintConfig>;
export declare function getFingerprintConfig(name: string): FingerprintConfig | null;
export declare function getAvailableFingerprints(): string[];
export declare function findFingerprintByBrowser(browser: string, version?: string, os?: string): FingerprintConfig | null;
//# sourceMappingURL=fingerprint-config.d.ts.map