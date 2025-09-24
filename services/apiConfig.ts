// FIX: Declare a global constant for development mode, defined in vite.config.ts, to avoid issues with vite/client types.
declare const __DEV__: boolean;

interface TenantConfig {
    apiBaseUrl: string;
    configPath: string;
}

// Define separate configs for each tenant
const medicalCodingConfig: TenantConfig = {
    apiBaseUrl: 'https://www.coding-online.net',
    configPath: '/medical-coding-config.json',
};

const annapoornaConfig: TenantConfig = {
    apiBaseUrl: 'https://annapoornainfo.com',
    configPath: '/annapoorna-config.json',
};


const tenantMap: { [key: string]: TenantConfig } = {
    // Medical Coding Online Tenant
    'coding-online.net': medicalCodingConfig,
    'exam.coding-online.net': medicalCodingConfig, // Explicit subdomain
    'mco-25.vercel.app': medicalCodingConfig, // Vercel preview default
    'localhost': medicalCodingConfig, // Local development default

    // Annapoorna Infotech Tenant
    'annapoornainfo.com': annapoornaConfig,
    'exam.annapoornainfo.com': annapoornaConfig, // Explicit subdomain
};

const getTenantConfig = (): TenantConfig => {
    const hostname = window.location.hostname.replace(/^www\./, '');
    
    // Find the most specific match first (e.g., 'exam.annapoornainfo.com' before 'annapoornainfo.com')
    const sortedKeys = Object.keys(tenantMap).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (hostname.endsWith(key)) {
            return tenantMap[key];
        }
    }
    
    // Fallback to the primary app config if no match is found
    return medicalCodingConfig;
}


// Returns the base URL for the WordPress backend (for user-specific API calls)
export const getApiBaseUrl = (): string => {
    if (__DEV__) {
        // In dev mode, Vite proxy is used.
        return '/api';
    }
    return getTenantConfig().apiBaseUrl;
};

// Returns the path to the static configuration file based on the app's hostname.
export const getAppConfigPath = (): string => {
    return getTenantConfig().configPath;
};