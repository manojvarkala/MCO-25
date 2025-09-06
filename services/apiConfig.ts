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
    
    // Simpler, more general logic for multi-tenancy
    // 1. Find the base domain by removing common subdomains.
    const baseDomain = hostname.replace(/^(www\.|app\.|exams\.)/, '');
    
    // 2. Assume the canonical WordPress URL uses 'www'.
    // This is the most common and robust configuration, preventing CORS issues 
    // with servers that redirect from the bare domain (e.g., example.com -> www.example.com).
    const apiHost = 'www.' + baseDomain;
    
    // 3. Construct the final URL.
    return `https://${apiHost}/wp-json/mco-app/v1`;
};
