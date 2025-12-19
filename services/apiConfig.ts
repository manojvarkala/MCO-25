
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
    'exams.annapoornainfo.com': annapoornaConfig,
    'exam.annapoornainfo.com': annapoornaConfig,
    'coding-online.net': medicalCodingConfig,
    'exams.coding-online.net': medicalCodingConfig, 
    'exam.coding-online.net': medicalCodingConfig,
    'bharatcerts.in': indianCertsConfig,
    'exams.bharatcerts.in': indianCertsConfig,
};

export const getTenantConfig = (): TenantConfig => {
    try {
        const dynamicUrl = localStorage.getItem('mco_dynamic_api_url');
        if (dynamicUrl && dynamicUrl.startsWith('http')) {
            return {
                apiBaseUrl: dynamicUrl.replace(/\/$/, ""),
                staticConfigPath: '/annapoorna-config.json' 
            };
        }
    } catch (e) {}

    if (isDev) {
        return {
            apiBaseUrl: '/api',
            staticConfigPath: '/annapoorna-config.json',
        };
    }

    const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
    const sortedKeys = Object.keys(tenantMap).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (hostname === key || hostname.endsWith('.' + key)) {
            return tenantMap[key];
        }
    }
    
    return annapoornaConfig;
}

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};
