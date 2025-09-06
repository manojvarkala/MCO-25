// Fix: Use `process.env.NODE_ENV` to check for development mode to avoid issues with Vite client type definitions.
export const getApiEndpoint = (): string => {
    // 1. Vite dev mode uses the proxy.
    if (process.env.NODE_ENV === 'development') {
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
    
    // New, more robust logic for multi-tenancy
    // 1. Find the base domain by removing common subdomains.
    const baseDomain = hostname.replace(/^(www\.|app\.|exams\.)/, '');

    let apiHost;

    // 2. Handle exceptions where the canonical domain does NOT use 'www'.
    if (baseDomain === 'annapoornainfo.com') {
        apiHost = 'annapoornainfo.com';
    } else {
        // 3. For all other cases, assume the canonical WordPress URL uses 'www'.
        // This prevents CORS issues with servers that redirect from the bare domain.
        apiHost = 'www.' + baseDomain;
    }
    
    // 4. Construct the final URL.
    return `https://${apiHost}/wp-json/mco-app/v1`;
};