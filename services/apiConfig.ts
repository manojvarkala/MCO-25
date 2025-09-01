export const getApiEndpoint = (): string => {
    const hostname = window.location.hostname;

    // For local development, always use the Vite proxy path.
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
        return '/api';
    }

    // For deployed environments, prioritize the URL injected at build time.
    // This makes it work on staging/preview URLs without needing custom domains.
    const apiUrlFromEnv = process.env.VITE_API_TARGET_URL;
    if (apiUrlFromEnv) {
        return apiUrlFromEnv;
    }

    // Fallback dynamic logic for production custom domains if env var isn't set.
    // e.g., exams.coding-online.net -> https://www.coding-online.net/wp-json/mco-app/v1
    const baseDomain = hostname.replace(/^exams\./, 'www.');
    return `https://${baseDomain}/wp-json/mco-app/v1`;
};
