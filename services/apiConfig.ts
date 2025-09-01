export const getApiEndpoint = (): string => {
    // Vite injects environment variables into `import.meta.env`.
    // `import.meta.env.DEV` is true when running `vite dev` or `npm run dev`.
    if (import.meta.env.DEV) {
        // In development, we use a relative path which will be handled by the Vite proxy.
        // This allows developers to point to a local WordPress instance via a .env file.
        return '/api';
    }

    // Production logic: Dynamically determine the backend from the frontend hostname.
    const hostname = window.location.hostname;

    // This convention-based approach supports multi-tenancy without frontend code changes.
    // e.g., an app at 'exams.client.com' will target 'www.client.com'.
    // e.g., an app at 'client.com' will target 'www.client.com'.
    const parts = hostname.split('.');
    
    // For domains with at least 2 parts (e.g., 'domain.com')
    if (parts.length >= 2) {
        // If it's a subdomain (e.g., 'exams.domain.com'), get 'domain.com'. Otherwise, use the full hostname.
        const mainDomain = (parts.length > 2) ? parts.slice(1).join('.') : hostname;
        return `https://www.${mainDomain}/wp-json/mco-app/v1`;
    }

    // Fallback to the primary known domain if the hostname is unusual (e.g., just 'localhost' in a production context).
    return 'https://www.annapoornainfo.com/wp-json/mco-app/v1';
};
