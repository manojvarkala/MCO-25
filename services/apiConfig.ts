export const getApiEndpoint = (): string => {
    const hostname = window.location.hostname;

    // For local development, rely on the Vite proxy for simplicity
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
        return '/api';
    }

    // For any deployed environment (production, staging, etc.), derive the backend URL from the frontend hostname.
    // This makes the application tenant-aware without needing environment variables for each domain.
    // e.g., exams.coding-online.net -> https://www.coding-online.net/wp-json/mco-app/v1
    // e.g., exams.annapoornainfo.com -> https://www.annapoornainfo.com/wp-json/mco-app/v1
    const baseDomain = hostname.replace(/^exams\./, 'www.');
    return `https://${baseDomain}/wp-json/mco-app/v1`;
};
