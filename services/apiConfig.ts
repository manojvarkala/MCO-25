
// FIX: The triple-slash directive for Vite client types was causing build errors,
// likely due to a missing or misconfigured tsconfig.json. Replaced the check
// for `import.meta.env.DEV` with a check for `localhost` hostname, which is a
// reliable way to detect the local development server where the proxy is active.
export const getApiEndpoint = (): string => {
    // 1. Vite dev mode uses the proxy, which typically runs on localhost.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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
    // The standard convention is that the main WP site is at `www.domain.com`.
    // We derive `domain.com` from the current hostname, regardless of its subdomain.
    const parts = hostname.split('.');
    
    // This logic correctly handles `app.domain.com` -> `domain.com` and `www.domain.com` -> `domain.com`.
    // It assumes a simple TLD structure (.com, .net), which is common.
    const baseDomain = parts.length > 2 ? parts.slice(1).join('.') : hostname;
    
    // Construct the API host, ensuring it uses the 'www' subdomain, which is the most reliable target.
    const apiHost = baseDomain.startsWith('www.') ? baseDomain : `www.${baseDomain}`;

    return `https://${apiHost}/wp-json/mco-app/v1`;
};
