// Fix: Added a triple-slash directive to include Vite's client types.
/// <reference types="vite/client" />

// In Vite, import.meta.env.DEV is the standard way to check for development mode.
export const getApiEndpoint = (): string => {
    // 1. Vite dev mode uses the proxy.
    if (import.meta.env.DEV) {
        return '/api';
    }

    const hostname = window.location.hostname;

    // 2. Handle specific known hosts (e.g., Vercel staging).
    const staticHosts: { [key: string]: string } = {
        'mco-25.vercel.app': 'https://www.annapoornainfo.com/wp-json/mco-app/v1',
    };
    if (staticHosts[hostname]) {
        return staticHosts[hostname];
    }
    
    // Simpler, more general logic for multi-tenancy
    // 1. Find the base domain by removing common subdomains.
    const baseDomain = hostname.replace(/^(www\.|app\.|exams\.)/, '');
    
    // 2. Assume the canonical WordPress URL is on the base domain.
    // This is a common pattern for headless setups where the app is on a subdomain (like www or app).
    const apiHost = baseDomain;
    
    // 3. Construct the final URL.
    return `https://${apiHost}/wp-json/mco-app/v1`;
};
