export const ch12Content = `
    <h3 class="text-xl font-bold">12.1 The Role of <code>apiConfig.ts</code> and the <code>tenantMap</code></h3>
    <p>The entire multi-tenant system is orchestrated by a single file: <code>services/apiConfig.ts</code>. This file contains the <code>tenantMap</code>, a JavaScript object that acts as a routing directory for the application.</p>
    <p>The map uses domain hostnames as keys and points them to a configuration object containing two critical pieces of information:</p>
    <ol>
        <li><code>apiBaseUrl</code>: The root URL of the tenant's dedicated WordPress backend.</li>
        <li><code>staticConfigPath</code>: The path to the static JSON configuration file in the <code>/public</code> directory, which serves as a fallback if the API is unreachable.</li>
    </ol>

    <div class="bg-slate-50 border border-slate-200 p-4 rounded-lg my-4">
        <p class="font-bold text-slate-800">Example <code>tenantMap</code> structure:</p>
        <pre class="text-xs bg-slate-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono"><code>// services/apiConfig.ts

const medicalCodingConfig: TenantConfig = {
    apiBaseUrl: 'https://www.coding-online.net',
    staticConfigPath: '/medical-coding-config.json'
};

const lawPrepConfig: TenantConfig = {
    apiBaseUrl: 'https://www.law-prep.com',
    staticConfigPath: '/law-school-config.json'
};

const tenantMap: { [key: string]: TenantConfig } = {
    // Medical Coding Tenant
    'exams.coding-online.net': medicalCodingConfig,
    'coding-online.net': medicalCoding-config,

    // Law School Tenant
    'exams.law-prep.com': lawPrepConfig,
    'law-prep.com': lawPrepConfig
};
</code></pre>
    </div>

    <h3 class="text-xl font-bold mt-6">12.2 The Loading and Fallback Mechanism</h3>
    <p>When the application first loads, the <code>getTenantConfig()</code> function is called:</p>
    <ol>
        <li>It gets the current browser's hostname (e.g., <code>exams.coding-online.net</code>).</li>
        <li>It iterates through the keys in the <code>tenantMap</code> to find a match.</li>
        <li>Once a match is found, it returns the corresponding configuration object.</li>
        <li>If no match is found, it returns a default fallback configuration (typically the primary Annapoorna Infotech config) to prevent the app from crashing.</li>
    </ol>
    <p>This simple but powerful mechanism allows the single codebase to dynamically adapt its branding, content source, and API endpoints based on the URL it's being accessed from.</p>
    
    <h3 class="text-xl font-bold mt-6">12.3 Dynamic Theming Engine</h3>
    <p>Each tenant's configuration includes a list of available themes and a default active theme. The user's theme choice is saved in their browser's <code>localStorage</code>.</p>
    <p>The application's styling is controlled by CSS custom properties (variables) defined in <code>index.css</code>. When a theme is selected, a <code>data-theme</code> attribute is set on the root HTML element. The CSS file contains rules that override the default color variables based on this attribute, instantly changing the entire application's color scheme without a page reload.</p>
`;
