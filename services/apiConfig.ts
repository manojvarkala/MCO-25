// Fix: The triple-slash directive is required for TypeScript to recognize Vite's `import.meta.env` and must be at the top of the file.
/// <reference types="vite/client" />

// This file determines the correct API endpoint based on the environment.
// It uses Vite's `import.meta.env.DEV` to detect development mode.
export const getApiEndpoint = (): string => {
    // 1. In development mode, Vite's proxy is used, which is configured to point to `/api`.
    if (import.meta.env.DEV) {
        return '/api';
    }

    const hostname = window.location.hostname;

    // 2. Handle specific known hosts (e.g., Vercel staging). This provides an override.
    const staticHosts: { [key: string]: string } = {
        'mco-25.vercel.app': 'https://www.annapoornainfo.com/wp-json/mco-app/v1',
    };
    if (staticHosts[hostname]) {
        return staticHosts[hostname];
    }
    
    // 3. For multi-tenancy, derive the canonical API URL.
    const parts = hostname.split('.');
    
    // If it's a non-www subdomain (e.g., app.domain.com), assume API is on www.domain.com
    if (parts.length >= 3 && parts[0] !== 'www') {
        const baseDomain = parts.slice(1).join('.');
        return `https://www.${baseDomain}/wp-json/mco-app/v1`;
    }

    // Otherwise, if it's domain.com or www.domain.com, use the current hostname directly.
    return `https://${hostname}/wp-json/mco-app/v1`;
};