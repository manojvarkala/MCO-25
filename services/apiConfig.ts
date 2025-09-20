// FIX: Declare a global constant for development mode, defined in vite.config.ts, to avoid issues with vite/client types.
declare const __DEV__: boolean;

// This file determines the correct API endpoint based on the environment.
export const getApiEndpoint = (): string => {
    // In development mode, Vite's proxy is used, which is configured to point to `/api`.
    if (__DEV__) {
        return '/api';
    }

    // In production, use an explicit map for known hostnames to prevent errors
    // from trying to dynamically derive the API's location. This is more reliable.
    const hostname = window.location.hostname.replace(/^www\./, '');

    const apiHostMap: { [key: string]: string } = {
        'coding-online.net': 'https://www.coding-online.net',
        'annapoornainfo.com': 'https://annapoornainfo.com',
        'mco-25.vercel.app': 'https://annapoornainfo.com'
        // For multi-tenancy, add other app domains and their WP API hosts here.
        // e.g., 'exams.client-site.com': 'https://www.client-site.com',
    };
    
    // Use the mapped host or default to the current host if not found.
    const apiHost = apiHostMap[hostname] || `https://${window.location.hostname}`;
    
    return `${apiHost}/wp-json/mco-app/v1`;
};
