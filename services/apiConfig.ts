import type { Organization } from '../types.ts';

// FIX: Declare a global constant for development mode, defined in vite.config.ts, to avoid issues with vite/client types.
declare const __DEV__: boolean;

export interface TenantConfig {
    apiBaseUrl: string;
    staticConfigPath: string; // Path to static fallback config
}

// Define separate configs for each tenant
const annapoornaConfig: TenantConfig = {
    apiBaseUrl: 'https://annapoornainfo.com',
    staticConfigPath: '/annapoorna-config.json'
};

const medicalCodingConfig: TenantConfig = {
    apiBaseUrl: 'https://www.coding-online.net',
    staticConfigPath: '/medical-coding-config.json'
};


const tenantMap: { [key: string]: TenantConfig } = {
    // Annapoorna Infotech Tenant (Primary)
    'annapoornainfo.com': annapoornaConfig,
    'exam.annapoornainfo.com': annapoornaConfig,
    'localhost': annapoornaConfig, // Local development defaults to the master app

    // Medical Coding Online Tenant (Secondary)
    'coding-online.net': medicalCodingConfig,
    'exams.coding-online.net': medicalCodingConfig, // Corrected domain as per user's troubleshooting guide
    'exam.coding-online.net': medicalCodingConfig, // Keep old one for compatibility
    'mco-25.vercel.app': medicalCodingConfig, 
};

export const getTenantConfig = (): TenantConfig => {
    if (__DEV__) {
        // In dev, we point to the primary app's config but use the proxy for API calls.
        return {
            apiBaseUrl: '/api',
            staticConfigPath: '/annapoorna-config.json',
        };
    }

    const hostname = window.location.hostname.replace(/^www\./, '');
    
    // Find the most specific match first (e.g., 'exam.annapoornainfo.com' before 'annapoornainfo.com')
    const sortedKeys = Object.keys(tenantMap).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (hostname.endsWith(key)) {
            return tenantMap[key];
        }
    }
    
    // Fallback to the primary app config if no match is found
    return annapoornaConfig;
}

// Returns the base URL for the WordPress backend (for user-specific API calls)
export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};
