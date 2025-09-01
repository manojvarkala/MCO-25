export const getApiEndpoint = (): string => {
    // Vite injects environment variables into `import.meta.env`.
    // `import.meta.env.DEV` is true when running `vite dev` or `npm run dev`.
    if (import.meta.env.DEV) {
        // In development, we use a relative path which will be handled by the Vite proxy.
        // This allows developers to point to a local WordPress instance via a .env file.
        return '/api';
    }

    // Production logic: Use an explicit mapping for robustness across multiple domains.
    const hostname = window.location.hostname;
    
    const hostnameApiMap: { [key: string]: string } = {
        'exams.coding-online.net': 'https://www.coding-online.net/wp-json/mco-app/v1',
        'exams.annapoornainfo.com': 'https://www.annapoornainfo.com/wp-json/mco-app/v1',
        'mco-25.vercel.app': 'https://www.annapoornainfo.com/wp-json/mco-app/v1' // Default the Vercel domain to a primary client
    };

    // Return the mapped URL or a sensible fallback.
    return hostnameApiMap[hostname] || 'https://www.annapoornainfo.com/wp-json/mco-app/v1';
};
