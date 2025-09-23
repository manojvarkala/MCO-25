// FIX: Declare a global constant for development mode, defined in vite.config.ts, to avoid issues with vite/client types.
declare const __DEV__: boolean;

interface TenantConfig {
    apiBaseUrl: string;
    configPath: string;
}

const tenantMap: { [key: string]: TenantConfig } = {
    'coding-online.net': {
        apiBaseUrl: 'https://www.coding-online.net',
        configPath: '/medical-coding-config.json',
    },
    'annapoornainfo.com': {
        apiBaseUrl: 'https://annapoornainfo.com',
        configPath: '/annapoorna-config.json',
    },
    // Explicitly handle the exam subdomain to ensure it maps to the correct config and API
    'exam.annapoornainfo.com': {
        apiBaseUrl: 'https://annapoornainfo.com',
        configPath: '/annapoorna-config.json',
    },
    // Handle Vercel preview environments
    'mco-25.vercel.app': {
        apiBaseUrl: 'https://annapoornainfo.com',
        configPath: '/annapoorna-config.json',
    },
    // Default for local development
    'localhost': {
        apiBaseUrl: 'https://www.coding-online.net',
        configPath: '/medical-coding-config.json',
    }
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
    
    // Fallback to a sensible default if no match is found
    return tenantMap['coding-online.net'];
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
