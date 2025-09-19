<<<<<<< HEAD

// FIX: The triple-slash directive for Vite client types was causing build errors,
// likely due to a missing or misconfigured tsconfig.json. Replaced the check
// for `import.meta.env.DEV` with a check for `localhost` hostname, which is a
// reliable way to detect the local development server where the proxy is active.
export const getApiEndpoint = (): string => {
    // 1. Vite dev mode uses the proxy, which typically runs on localhost.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
=======
// Fix: Added a triple-slash directive to include Vite's client types.
/// <reference types="vite/client" />

// In Vite, import.meta.env.DEV is the standard way to check for development mode.
export const getApiEndpoint = (): string => {
    // 1. Vite dev mode uses the proxy.
    if (import.meta.env.DEV) {
>>>>>>> 9fbc59a88f168ddc0c4f0558c8248c65be4f95b7
        return '/api';
    }

    const hostname = window.location.hostname;

<<<<<<< HEAD
    // 2. Handle specific known hosts (e.g., Vercel staging). This provides an override.
=======
    // 2. Handle specific known hosts (e.g., Vercel staging).
>>>>>>> 9fbc59a88f168ddc0c4f0558c8248c65be4f95b7
    const staticHosts: { [key: string]: string } = {
        'mco-25.vercel.app': 'https://www.annapoornainfo.com/wp-json/mco-app/v1',
    };
    if (staticHosts[hostname]) {
        return staticHosts[hostname];
    }
    
<<<<<<< HEAD
    // 3. For multi-tenancy, derive the canonical API URL.
    // The standard convention is that the main WP site is at `www.domain.com`.
    // We derive `domain.com` from the current hostname, regardless of its subdomain.
    const parts = hostname.split('.');
    
    // This logic correctly handles `app.domain.com` -> `domain.com` and `www.domain.com` -> `domain.com`.
    // It assumes a simple TLD structure (.com, .net), which is common.
    const baseDomain = parts.length > 2 ? parts.slice(1).join('.') : hostname;
    
    // Construct the API host, ensuring it uses the 'www' subdomain, which is the most reliable target.
    const apiHost = baseDomain.startsWith('www.') ? baseDomain : `www.${baseDomain}`;

=======
    // Simpler, more general logic for multi-tenancy
    // 1. Find the base domain by removing common subdomains.
    const baseDomain = hostname.replace(/^(www\.|app\.|exams\.)/, '');
    
    // 2. Assume the canonical WordPress URL is on the base domain.
    // This is a common pattern for headless setups where the app is on a subdomain (like www or app).
    const apiHost = baseDomain;
    
    // 3. Construct the final URL.
>>>>>>> 9fbc59a88f168ddc0c4f0558c8248c65be4f95b7
    return `https://${apiHost}/wp-json/mco-app/v1`;
};
