export const getApiEndpoint = (): string => {
    // Use a relative path for all environments.
    // This relies on the hosting platform (like Vercel)
    // to proxy requests from /api to the WordPress backend, avoiding CORS issues.
    return '/api';
};
