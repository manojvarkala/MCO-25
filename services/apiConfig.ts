

import type { Organization } from '../types.ts';

declare const __DEV__: boolean;
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export interface TenantConfig {
    apiBaseUrl: string;
    staticConfigPath: string; // Path to the static JSON config file
}

// Define the static config paths for known tenants
// The `apiBaseUrl` here is a fallback/default for scenarios where a dynamic URL isn't set,
// or for inferring the staticConfigPath from a dynamic URL.
const KNOWN_TENANT_CONFIGS: { [hostnamePart: string]: { apiBaseUrl: string; staticConfigPath: string } } = {
    'annapoornainfo': { apiBaseUrl: 'https://www.annapoornainfo.com', staticConfigPath: '/annapoorna-config.json' },
    'coding-online': { apiBaseUrl: 'https://www.coding-online.net', staticConfigPath: '/medical-coding-config.json' },
    'bharatcerts': { apiBaseUrl: 'https://www.bharatcerts.in', staticConfigPath: '/indian-certs-config.json' },
    // Add other known tenants here
    // Example: 'newclient': { apiBaseUrl: 'https://www.newclient.com', staticConfigPath: '/new-client-config.json' },
};

// Default tenant fallback if no specific match is found
const DEFAULT_TENANT_CONFIG: TenantConfig = KNOWN_TENANT_CONFIGS['annapoornainfo'];

export const getTenantConfig = (): TenantConfig => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrlParam = urlParams.get('api_url');
    const hostname = window.location.hostname.toLowerCase();

    // Helper to get staticConfigPath based on a given API URL's hostname
    const inferStaticConfigPath = (apiHostname: string): string => {
        for (const key in KNOWN_TENANT_CONFIGS) {
            if (apiHostname.includes(key)) {
                return KNOWN_TENANT_CONFIGS[key].staticConfigPath;
            }
        }
        console.warn(`apiConfig: Could not infer static config path for hostname "${apiHostname}". Using default.`);
        return DEFAULT_TENANT_CONFIG.staticConfigPath; // Fallback to default static path
    };

    // 1. Highest Priority: API URL Parameter from WordPress redirect
    // This is CRITICAL for initial SSO handshakes and dynamically binding the app.
    if (apiUrlParam && apiUrlParam.startsWith('http')) {
        const sanitizedUrl = apiUrlParam.replace(/\/$/, "");
        localStorage.setItem('mco_dynamic_api_url', sanitizedUrl);
        const inferredStaticPath = inferStaticConfigPath(new URL(sanitizedUrl).hostname.toLowerCase());
        console.log(`apiConfig: Using API URL from URL parameter: ${sanitizedUrl}. Static config: ${inferredStaticPath}`);
        return {
            apiBaseUrl: sanitizedUrl,
            staticConfigPath: inferredStaticPath
        };
    }

    // 2. Second Priority: Dynamic API URL stored in localStorage
    // This ensures persistence of the dynamically set URL on subsequent direct loads.
    try {
        const dynamicUrl = localStorage.getItem('mco_dynamic_api_url');
        if (dynamicUrl && dynamicUrl.startsWith('http')) {
            const dynamicHostname = new URL(dynamicUrl).hostname.toLowerCase();
            // Basic security check: Is the stored dynamic URL related to the current hostname
            // or a hostname of a known tenant? This mitigates potential localStorage injection.
            const isRelatedToCurrentHost = hostname.includes(dynamicHostname) || dynamicHostname.includes(hostname);
            const isKnownTenant = Object.keys(KNOWN_TENANT_CONFIGS).some(key => dynamicHostname.includes(key));
            
            if (isRelatedToCurrentHost || isKnownTenant) {
                 const inferredStaticPath = inferStaticConfigPath(dynamicHostname);
                 console.log(`apiConfig: Using dynamic API URL from localStorage: ${dynamicUrl}. Static config: ${inferredStaticPath}`);
                return {
                    apiBaseUrl: dynamicUrl.replace(/\/$/, ""),
                    staticConfigPath: inferredStaticPath
                };
            } else {
                // If the stored dynamic URL is suspicious or unrelated, clear it for security.
                console.warn("apiConfig: Clearing potentially invalid dynamic API URL from localStorage.");
                localStorage.removeItem('mco_dynamic_api_url');
            }
        }
    } catch (e) {
        console.error("apiConfig: Error accessing localStorage for mco_dynamic_api_url:", e);
        localStorage.removeItem('mco_dynamic_api_url'); // Clear potentially corrupted entry
    }

    // 3. Third Priority: Development Proxy
    if (isDev) {
        console.log(`apiConfig: Running in development mode, using Vite proxy "/api". Static config: ${DEFAULT_TENANT_CONFIG.staticConfigPath}`);
        // In development, always use the Vite proxy for API calls.
        // The staticConfigPath can default to one of the known tenants.
        return {
            apiBaseUrl: '/api', 
            staticConfigPath: DEFAULT_TENANT_CONFIG.staticConfigPath,
        };
    }

    // 4. Fourth Priority: Hostname Matching (for direct production deployments without prior dynamic URL)
    for (const key in KNOWN_TENANT_CONFIGS) {
        if (hostname.includes(key)) {
            console.log(`apiConfig: Matched hostname "${hostname}" to known tenant "${key}". Using: ${KNOWN_TENANT_CONFIGS[key].apiBaseUrl}. Static config: ${KNOWN_TENANT_CONFIGS[key].staticConfigPath}`);
            return KNOWN_TENANT_CONFIGS[key];
        }
    }
    
    // 5. Fallback: If no match is found anywhere, use a predefined default.
    console.warn(`apiConfig: No specific tenant configuration found for hostname "${hostname}". Falling back to default: ${DEFAULT_TENANT_CONFIG.apiBaseUrl}. Static config: ${DEFAULT_TENANT_CONFIG.staticConfigPath}`);
    return DEFAULT_TENANT_CONFIG;
};

export const getApiBaseUrl = (): string => {
    return getTenantConfig().apiBaseUrl;
};