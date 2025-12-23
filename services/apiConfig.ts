
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

export const getTenantConfig = (): TenantConfig => {
    // 1. PRIORITIZE URL PARAMETERS (CRITICAL for SSO redirects)
    // This ensures the app binds to the correct backend before any components render.
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrlParam = urlParams.get('api_url');
    
    if (apiUrlParam && apiUrlParam.startsWith('http')) {
        const sanitizedUrl = apiUrlParam.replace(/\/$/, "");
        // Save for persistence across the session
        localStorage.setItem('mco_dynamic_api_url', sanitizedUrl);
        return {
            apiBaseUrl: sanitizedUrl,
            staticConfigPath: sanitizedUrl.includes('annapoorna') ? '/annapoorna-config.json' : '/medical-coding-config.json'
        };
    }

    // 2. CHECK LOCALSTORAGE PERSISTENCE
    try {
        const dynamicUrl = localStorage.getItem('mco_dynamic_api_url');
        if (dynamicUrl && dynamicUrl.startsWith('http')) {
            return {
                apiBaseUrl: dynamicUrl.replace(/\/$/, ""),
                staticConfigPath: dynamicUrl.includes('annapoorna') ? '/annapoorna-config.json' : '/medical-coding-config.json' 
            };
        }
    } catch (e) {}

    // 3. DEVELOPMENT MODE
    if (isDev) {
        return {
            apiBaseUrl: '/api',
            staticConfigPath: '/annapoorna-config.json',
        };
    }

    // 4. HOSTNAME MATCHING
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('annapoornainfo')) return annapoornaConfig;
    if (hostname.includes('coding-online')) return medicalCodingConfig;
    if (hostname.includes('bharatcerts')) return indianCertsConfig;
    
    return annapoornaConfig;
}

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};
