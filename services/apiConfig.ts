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
    // assume the WordPress backend is on the parent domain.
    // This will turn 'exams.coding-online.net' into 'coding-online.net'.
    if (apiHost.startsWith('exams.') || apiHost.startsWith('app.')) {
        apiHost = apiHost.substring(apiHost.indexOf('.') + 1);
    }
    
    // 4. Construct the final URL. This logic is more flexible.
    // It will use 'coding-online.net' if the app is at 'exams.coding-online.net'.
    // It relies on the server to handle redirects from non-www to www if necessary,
    // which is a more reliable approach than forcing a 'www' prefix that may be incorrect.
    return `https://${apiHost}/wp-json/mco-app/v1`;
};