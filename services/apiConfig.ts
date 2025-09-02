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
    
    let apiHost = hostname;

    // 3. Dynamic logic for multi-tenancy.
    // If the app is on a dedicated subdomain like 'exams.' or 'app.',
    // we need to determine the correct canonical domain for the WordPress backend.
    if (apiHost.startsWith('exams.') || apiHost.startsWith('app.')) {
        const baseDomain = apiHost.substring(apiHost.indexOf('.') + 1);
        
        // This is a hardcoded exception for a known domain that does not use 'www'
        if (baseDomain === 'annapoornainfo.com') {
            apiHost = baseDomain;
        } else {
            // For other domains, assume the canonical WordPress URL uses 'www'.
            // This is to avoid CORS issues with servers that redirect from non-www to www.
            apiHost = 'www.' + baseDomain;
        }
    }
    
    // 4. Construct the final URL.
    return `https://${apiHost}/wp-json/mco-app/v1`;
};
