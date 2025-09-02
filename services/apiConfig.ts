// Fix: Add a triple-slash directive to include Vite client types for `import.meta.env`.
/// <reference types="vite/client" />

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
    
    const parts = hostname.split('.');
    
    // 3. Dynamic logic for multi-tenancy.
    // A simple check for a subdomain. If there are more than 2 parts (e.g., sub.domain.com),
    // we assume it's a subdomain setup.
    if (parts.length > 2) {
        // Replace the first part (subdomain) with 'www'.
        // e.g., 'exams.client.com' becomes 'www.client.com'
        const apiHost = `www.${parts.slice(1).join('.')}`;
        return `https://${apiHost}/wp-json/mco-app/v1`;
    }

    // For root domains (e.g., domain.com), assume API is at 'www.domain.com'.
    if (parts.length === 2) {
        const apiHost = `www.${hostname}`;
        return `https://${apiHost}/wp-json/mco-app/v1`;
    }
    
    // 4. Fallback for any other case (e.g., localhost not caught by dev, single-word hostnames)
    // This defaults to the primary client, which is a safe fallback.
    return `https://www.annapoornainfo.com/wp-json/mco-app/v1`;
};
