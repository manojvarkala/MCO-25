
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
    try {
        const dynamicUrl = localStorage.getItem('mco_dynamic_api_url');
        if (dynamicUrl && dynamicUrl.startsWith('http')) {
            return {
                apiBaseUrl: dynamicUrl.replace(/\/$/, ""),
                staticConfigPath: dynamicUrl.includes('annapoorna') ? '/annapoorna-config.json' : '/medical-coding-config.json' 
            };
        }
    } catch (e) {}

    if (isDev) {
        return {
            apiBaseUrl: '/api',
            staticConfigPath: '/annapoorna-config.json',
        };
    }

    const hostname = window.location.hostname.toLowerCase();
    
    // Defensive Brand Matching - ignores subdomains like 'exam.' or 'exams.'
    if (hostname.includes('annapoornainfo')) {
        return annapoornaConfig;
    }
    if (hostname.includes('coding-online')) {
        return medicalCodingConfig;
    }
    if (hostname.includes('bharatcerts')) {
        return indianCertsConfig;
    }
    
    return annapoornaConfig;
}

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};
