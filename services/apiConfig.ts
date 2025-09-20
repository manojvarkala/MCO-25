// FIX: Declare a global constant for development mode, defined in vite.config.ts, to avoid issues with vite/client types.
declare const __DEV__: boolean;

// Returns the base URL for the WordPress backend (for user-specific API calls)
export const getApiBaseUrl = (): string => {
    if (__DEV__) {
        return '/api';
    }

    const hostname = window.location.hostname.replace(/^www\./, '');
    const apiHostMap: { [key: string]: string } = {
        'coding-online.net': 'https://www.coding-online.net',
        'annapoornainfo.com': 'https://annapoornainfo.com',
        'mco-25.vercel.app': 'https://annapoornainfo.com' // Vercel preview domain
    };
    
    return apiHostMap[hostname] || `https://${window.location.hostname}`;
};

// Returns the path to the static configuration file based on the app's hostname.
export const getAppConfigPath = (): string => {
    const hostname = window.location.hostname.replace(/^www\./, '');

    const configMap: { [key: string]: string } = {
        'coding-online.net': '/medical-coding-config.json',
        'annapoornainfo.com': '/annapoorna-config.json',
        'mco-25.vercel.app': '/annapoornainfo.com'
    };

    // Default for localhost or unknown domains allows easier development
    return configMap[hostname] || '/medical-coding-config.json';
};
