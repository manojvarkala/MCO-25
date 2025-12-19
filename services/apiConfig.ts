
import type { Organization } from '../types.ts';

declare const __DEV__: boolean;
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export interface TenantConfig {
    apiBaseUrl: string;
    staticConfigPath: string;
}

const annapoornaConfig: TenantConfig = {
    apiBaseUrl: 'https://www.annapoornainfo.com',
    staticConfigPath: '/annapoorna-config.json'
};

const medicalCodingConfig: TenantConfig = {
    apiBaseUrl: 'https://www.coding-online.net',
    staticConfigPath: '/medical-coding-config.json'
};

const indianCertsConfig: TenantConfig = {
    apiBaseUrl: 'https://www.bharatcerts.in',
    staticConfigPath: '/indian-certs-config.json'
};

const tenantMap: { [key: string]: TenantConfig } = {
    'annapoornainfo.com': annapoornaConfig,
    'coding-online.net': medicalCodingConfig,
    'bharatcerts.in': indianCertsConfig,
};

export const getTenantConfig = (): TenantConfig => {
    // 1. Check for manual override from Login redirect
    try {
        const dynamicUrl = localStorage.getItem('mco_dynamic_api_url');
        if (dynamicUrl && dynamicUrl.startsWith('http')) {
            return {
                apiBaseUrl: dynamicUrl.replace(/\/$/, ""),
                staticConfigPath: dynamicUrl.includes('annapoorna') ? '/annapoorna-config.json' : '/medical-coding-config.json' 
            };
        }
    } catch (e) {}

    // 2. Development mode
    if (isDev) {
        return {
            apiBaseUrl: '/api',
            staticConfigPath: '/annapoorna-config.json',
        };
    }

    // 3. Resilient brand-based hostname detection
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('annapoornainfo')) {
        return annapoornaConfig;
    }
    if (hostname.includes('coding-online')) {
        return medicalCodingConfig;
    }
    if (hostname.includes('bharatcerts')) {
        return indianCertsConfig;
    }

    // 4. Fallback to default hostname map
    const cleanHostname = hostname.replace(/^www\./, '');
    const sortedKeys = Object.keys(tenantMap).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (cleanHostname === key || cleanHostname.endsWith('.' + key)) {
            return tenantMap[key];
        }
    }
    
    // Final fallback
    return annapoornaConfig;
}

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};
