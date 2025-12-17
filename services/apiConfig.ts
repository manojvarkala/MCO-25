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

const indianCertsConfig: TenantConfig = {
    apiBaseUrl: 'https://www.bharatcerts.in',
    staticConfigPath: '/indian-certs-config.json'
};


const tenantMap: { [key: string]: TenantConfig } = {
    // Annapoorna Infotech Tenant (Primary)
    'annapoornainfo.com': annapoornaConfig,
    'exam.annapoornainfo.com': annapoornaConfig,
    'localhost': annapoornaConfig, // Local development defaults to the master app

    // Medical Coding Online Tenant (Secondary)
    'coding-online.net': medicalCodingConfig,
    'exams.coding-online.net': medicalCodingConfig, 
    'exam.coding-online.net': medicalCodingConfig,
    'mco-25.vercel.app': medicalCodingConfig,

    // Indian Certs Tenant
    'bharatcerts.in': indianCertsConfig,
    'exams.bharatcerts.in': indianCertsConfig,
};

export const getTenantConfig = (): TenantConfig => {
    // 1. Dynamic Override (Highest Priority)
    // This allows the login flow to inject the correct backend URL, solving "Security Key Mismatch"
    // when the frontend domain doesn't match the backend domain (e.g. Vercel preview vs WP).
    try {
        const dynamicUrl = localStorage.getItem('mco_dynamic_api_url');
        if (dynamicUrl && dynamicUrl.startsWith('http')) {
            // Trim trailing slash just in case
            const cleanUrl = dynamicUrl.replace(/\/$/, "");
            return {
                apiBaseUrl: cleanUrl,
                staticConfigPath: '/annapoorna-config.json' // Fallback static path
            };
        }
    } catch (e) {
        // Ignore localStorage errors
    }

    // 2. Development Mode
    if (__DEV__) {
        return {
            apiBaseUrl: '/api',
            staticConfigPath: '/annapoorna-config.json',
        };
    }

    // 3. Hostname Mapping
    const hostname = window.location.hostname.replace(/^www\./, '');
    const sortedKeys = Object.keys(tenantMap).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (hostname.endsWith(key)) {
            return tenantMap[key];
        }
    }
    
    // 4. Default Fallback
    return annapoornaConfig;
}

// Returns the base URL for the WordPress backend (for user-specific API calls)
export const getApiBaseUrl = (): string => {
    const config = getTenantConfig();
    // Debug log to trace connection issues
    if (__DEV__) {
        console.log("API Target:", config.apiBaseUrl);
    }
    return config.apiBaseUrl;
};