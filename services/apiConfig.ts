export const getApiEndpoint = (): string => {
    const hostname = window.location.hostname;

    // This map defines which backend to use for which frontend domain.
    const hostnameMap: { [key: string]: string } = {
        'exams.coding-online.net': 'https://www.coding-online.net/wp-json/mco-app/v1',
        // Add other client hostnames here in the future
        // 'client-b-exams.com': 'https://www.client-b.com/wp-json/mco-app/v1',
    };

    // Check if the current hostname is in our specific map.
    if (hostname in hostnameMap) {
        return hostnameMap[hostname];
    }

    // Default to annapoornainfo.com for the primary domain or any unmapped domains.
    return 'https://www.annapoornainfo.com/wp-json/mco-app/v1';
};
