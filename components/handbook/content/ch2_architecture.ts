export const ch2_architecture = `
    <h2 class="text-3xl font-bold font-display" id="ch2">Chapter 2: Architecture & Multi-Tenancy</h2>

    <h3 class="text-xl font-bold mt-6">2.1 Data Flow: From WordPress to the User</h3>
    <p>The entire system is built on a clear and efficient data flow designed for performance and security. Understanding this flow is key to grasping the platform's power.</p>
    <ol>
        <li><strong>Content Origin:</strong> An administrator creates content (Exam Programs, Books) and products (Exams, Subscriptions, Bundles) in a dedicated WordPress backend.</li>
        <li><strong>API Generation:</strong> The custom <code>mco-exam-integration-engine</code> plugin gathers all this data, formats it into a structured JSON object, and makes it available via a secure REST API endpoint (<code>/wp-json/mco-app/v1/config</code>). This data is cached on the server using WordPress Transients for speed.</li>
        <li><strong>Tenant Detection:</strong> A user visits a URL (e.g., <code>exams.coding-online.net</code>). The React application's <code>apiConfig.ts</code> service identifies the hostname.</li>
        <li><strong>Configuration Loading:</strong> The app uses the hostname to look up the correct WordPress backend URL from its internal <code>tenantMap</code>. It then fetches the JSON configuration from that specific backend's API.</li>
        <li><strong>UI Rendering:</strong> The React app uses the fetched JSON data to render the entire user interface—displaying the correct branding, logos, themes, exam lists, and pricing for that specific tenant.</li>
    </ol>

    <h3 class="text-xl font-bold mt-6">2.2 The Power of Multi-Tenancy</h3>
    <p>Multi-tenancy is the architectural principle that allows a single instance of a software application to serve multiple customers (or "tenants"). In our case, the <strong>single React codebase</strong> is the application, and each client's examination portal (e.g., Medical Coding Online, Law School Prep) is a <strong>tenant</strong>.</p>
    <p>This is achieved not by creating separate versions of the app, but by abstracting all tenant-specific information into configuration files. When a user visits a URL, the app inspects the hostname, finds the corresponding configuration, and dynamically points itself to the correct WordPress backend for its API calls and branding assets.</p>

    <h3 class="text-xl font-bold mt-6">2.3 Core Architectural Principles</h3>
    <p>The entire system is built on three core principles that ensure its scalability and maintainability:</p>
    <ol>
        <li><strong>Data Isolation:</strong> Each tenant has its own completely separate WordPress backend. This guarantees that user data, exam content, and sales are never mixed. A security breach or database issue on one tenant's site has zero impact on any other.</li>
        <li><strong>Shared Codebase:</strong> There is only one React application to maintain. A bug fix or new feature (like a new analytics tool or theme) is developed once and becomes instantly available to all tenants after a single deployment. This dramatically reduces development and maintenance overhead.</li>
        <li><strong>Dynamic Configuration:</strong> The link between the shared frontend and the isolated backends is a simple set of JSON configuration files and a mapping service. Onboarding a new tenant is a matter of configuration, not complex development work.</li>
    </ol>
`;
