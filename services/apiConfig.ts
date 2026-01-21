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

/**
 * Helper to determine which static JSON file to load as a fallback
 * based on a provided API URL string.
 */
const resolveStaticPath = (url: string): string => {
    for (const key in KNOWN_TENANT_CONFIGS) {
        if (url.includes(key)) {
            return KNOWN_TENANT_CONFIGS[key].staticConfigPath;
        }
    }
    return DEFAULT_TENANT_CONFIG.staticConfigPath;
};

export const getTenantConfig = (): TenantConfig => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrlParam = urlParams.get('api_url');
    const hostname = window.location.hostname.toLowerCase();

    // 1. SSO Redirect Parameter (Force Override)
    // If a token/api_url is in the URL, we MUST use it.
    if (apiUrlParam && apiUrlParam.startsWith('http')) {
        const sanitizedUrl = apiUrlParam.replace(/\/$/, "");
        localStorage.setItem('mco_dynamic_api_url', sanitizedUrl);
        return { 
            apiBaseUrl: sanitizedUrl, 
            staticConfigPath: resolveStaticPath(sanitizedUrl) 
        };
    }

    // 2. Production Hostname Matching (Primary Detection)
    // We check this BEFORE localStorage to ensure domains like coding-online.net
    // are always served their own branding, even if the user visited another tenant earlier.
    for (const key in KNOWN_TENANT_CONFIGS) {
        if (hostname.includes(key)) {
            return KNOWN_TENANT_CONFIGS[key];
        }
    }

    // 3. Development Mode (Localhost)
    if (isDev && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        return {
            apiBaseUrl: '', 
            staticConfigPath: DEFAULT_TENANT_CONFIG.staticConfigPath,
        };
    }

    // 4. Persistent Binding (Dynamic Tenant Fallback)
    // Used if the app is accessed on a custom domain not in KNOWN_TENANT_CONFIGS
    const storedUrl = localStorage.getItem('mco_dynamic_api_url');
    if (storedUrl && storedUrl.startsWith('http')) {
        const sanitizedUrl = storedUrl.replace(/\/$/, "");
        return {
            apiBaseUrl: sanitizedUrl,
            staticConfigPath: resolveStaticPath(sanitizedUrl)
        };
    }
    
    return DEFAULT_TENANT_CONFIG;
};

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};

