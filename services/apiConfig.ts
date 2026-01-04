import type { Organization } from '../types.ts';

declare const __DEV__: boolean;
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export interface TenantConfig {
    apiBaseUrl: string;
    staticConfigPath: string; // Path to the static JSON config file
}

// Define the static config paths for known tenants
const KNOWN_TENANT_CONFIGS: { [hostnamePart: string]: { apiBaseUrl: string; staticConfigPath: string } } = {
    'annapoornainfo': { apiBaseUrl: 'https://www.annapoornainfo.com', staticConfigPath: '/annapoorna-config.json' },
    'coding-online': { apiBaseUrl: 'https://www.coding-online.net', staticConfigPath: '/medical-coding-config.json' },
    'bharatcerts': { apiBaseUrl: 'https://www.bharatcerts.in', staticConfigPath: '/indian-certs-config.json' },
};

// Default tenant fallback if no specific match is found
const DEFAULT_TENANT_CONFIG: TenantConfig = KNOWN_TENANT_CONFIGS['annapoornainfo'];

export const getTenantConfig = (): TenantConfig => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrlParam = urlParams.get('api_url');
    const hostname = window.location.hostname.toLowerCase();

    // Helper to get staticConfigPath based on a given API URL's hostname
    const inferStaticConfigPath = (apiHostname: string): string => {
        for (const key in KNOWN_TENANT_CONFIGS) {
            if (apiHostname.includes(key)) {
                return KNOWN_TENANT_CONFIGS[key].staticConfigPath;
            }
        }
        return DEFAULT_TENANT_CONFIG.staticConfigPath;
    };

    // 1. Highest Priority: API URL Parameter from WordPress redirect (SSO flow)
    if (apiUrlParam && apiUrlParam.startsWith('http')) {
        const sanitizedUrl = apiUrlParam.replace(/\/$/, "");
        localStorage.setItem('mco_dynamic_api_url', sanitizedUrl);
        const inferredStaticPath = inferStaticConfigPath(new URL(sanitizedUrl).hostname.toLowerCase());
        return {
            apiBaseUrl: sanitizedUrl,
            staticConfigPath: inferredStaticPath
        };
    }

    // 2. Second Priority: Dynamic API URL stored in localStorage (Persistent binding)
    try {
        const dynamicUrl = localStorage.getItem('mco_dynamic_api_url');
        if (dynamicUrl && dynamicUrl.startsWith('http')) {
            const dynamicHostname = new URL(dynamicUrl).hostname.toLowerCase();
            const isRelatedToCurrentHost = hostname.includes(dynamicHostname) || dynamicHostname.includes(hostname) || hostname === 'localhost' || hostname === '127.0.0.1';
            const isKnownTenant = Object.keys(KNOWN_TENANT_CONFIGS).some(key => dynamicHostname.includes(key));
            
            if (isRelatedToCurrentHost || isKnownTenant) {
                 const inferredStaticPath = inferStaticConfigPath(dynamicHostname);
                return {
                    apiBaseUrl: dynamicUrl.replace(/\/$/, ""),
                    staticConfigPath: inferredStaticPath
                };
            }
        }
    } catch (e) {
        console.error("apiConfig: Error accessing localStorage", e);
    }

    // 3. Third Priority: Development Proxy
    // FIX: Set apiBaseUrl to empty string. This ensures calls go to http://localhost:5173/wp-json/...
    // which the Vite proxy in vite.config.ts will then catch and redirect to your WP backend.
    if (isDev || hostname === 'localhost' || hostname === '127.0.0.1') {
        return {
            apiBaseUrl: '', 
            staticConfigPath: DEFAULT_TENANT_CONFIG.staticConfigPath,
        };
    }

    // 4. Fourth Priority: Hostname Matching (Production direct access)
    for (const key in KNOWN_TENANT_CONFIGS) {
        if (hostname.includes(key)) {
            return KNOWN_TENANT_CONFIGS[key];
        }
    }
    
    // 5. Fallback
    return DEFAULT_TENANT_CONFIG;
};

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};