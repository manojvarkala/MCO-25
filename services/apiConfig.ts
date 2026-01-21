import type { Organization } from '../types.ts';

declare const __DEV__: boolean;
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export interface TenantConfig {
    apiBaseUrl: string;
    staticConfigPath: string;
}

const KNOWN_TENANT_CONFIGS: { [hostnamePart: string]: { apiBaseUrl: string; staticConfigPath: string } } = {
    'annapoornainfo': { apiBaseUrl: 'https://www.annapoornainfo.com', staticConfigPath: '/annapoorna-config.json' },
    'coding-online': { apiBaseUrl: 'https://www.coding-online.net', staticConfigPath: '/medical-coding-config.json' },
    'bharatcerts': { apiBaseUrl: 'https://www.bharatcerts.in', staticConfigPath: '/indian-certs-config.json' },
};

const DEFAULT_TENANT_CONFIG: TenantConfig = KNOWN_TENANT_CONFIGS['annapoornainfo'];

export const getTenantConfig = (): TenantConfig => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrlParam = urlParams.get('api_url');
    const hostname = window.location.hostname.toLowerCase();

    // 1. SSO Redirect Parameter (Highest Priority)
    if (apiUrlParam && apiUrlParam.startsWith('http')) {
        const sanitizedUrl = apiUrlParam.replace(/\/$/, "");
        localStorage.setItem('mco_dynamic_api_url', sanitizedUrl);
        
        let staticPath = DEFAULT_TENANT_CONFIG.staticConfigPath;
        for (const key in KNOWN_TENANT_CONFIGS) {
            if (sanitizedUrl.includes(key)) {
                staticPath = KNOWN_TENANT_CONFIGS[key].staticConfigPath;
                break;
            }
        }
        return { apiBaseUrl: sanitizedUrl, staticConfigPath: staticPath };
    }

    // 2. Development Mode (Localhost)
    if (isDev && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        return {
            apiBaseUrl: '', 
            staticConfigPath: DEFAULT_TENANT_CONFIG.staticConfigPath,
        };
    }

    // 3. Persistent Binding (Resolved Fix: Correctly map static file to stored URL)
    const storedUrl = localStorage.getItem('mco_dynamic_api_url');
    if (storedUrl && storedUrl.startsWith('http')) {
        const sanitizedUrl = storedUrl.replace(/\/$/, "");
        let staticPath = DEFAULT_TENANT_CONFIG.staticConfigPath;
        for (const key in KNOWN_TENANT_CONFIGS) {
            if (sanitizedUrl.includes(key)) {
                staticPath = KNOWN_TENANT_CONFIGS[key].staticConfigPath;
                break;
            }
        }
        return {
            apiBaseUrl: sanitizedUrl,
            staticConfigPath: staticPath
        };
    }

    // 4. Production Hostname Matching
    for (const key in KNOWN_TENANT_CONFIGS) {
        if (hostname.includes(key)) {
            return KNOWN_TENANT_CONFIGS[key];
        }
    }
    
    return DEFAULT_TENANT_CONFIG;
};

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};
