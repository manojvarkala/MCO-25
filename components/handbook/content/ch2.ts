export const ch2Content = `
    <h3 class="text-xl font-bold">2.1 Understanding the Headless Approach</h3>
    <p>The Annapoorna Examination Engine is built upon a "headless" architectural model. In a traditional monolithic system, WordPress is responsible for both managing content (the "body") and displaying it (the "head"). Our platform decouples these two functions for immense benefits.</p>
    <ul>
        <li><strong>The "Body" (Backend):</strong> A WordPress installation running our custom <code>mco-exam-integration-engine</code> plugin. Its sole responsibilities are content management, user authentication via JWT, e-commerce via WooCommerce, and exposing all data through a secure REST API.</li>
        <li><strong>The "Head" (Frontend):</strong> This React application. Its sole responsibility is to consume data from any number of WordPress APIs and present it to the user in a modern, fast, and interactive interface.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">2.2 The Power of Multi-Tenancy</h3>
    <p>Multi-tenancy is the architectural principle that allows a single instance of a software application to serve multiple customers (or "tenants"). In our case, the <strong>single React codebase</strong> is the application, and each client's examination portal (e.g., Medical Coding Online, Law School Prep) is a <strong>tenant</strong>.</p>
    <p>This is achieved not by creating separate versions of the app, but by abstracting all tenant-specific information into configuration files. When a user visits a URL, the app inspects the hostname, finds the corresponding configuration, and dynamically points itself to the correct WordPress backend for its API calls and branding assets.</p>

    <h3 class="text-xl font-bold mt-6">2.3 Architectural Diagram & Key Principles</h3>
    <p>The entire system is built on three core principles that ensure its scalability and maintainability:</p>
    <ol>
        <li><strong>Data Isolation:</strong> Each tenant has its own completely separate WordPress backend. This guarantees that user data, exam content, and sales are never mixed. A security breach or database issue on one tenant's site has zero impact on any other.</li>
        <li><strong>Shared Codebase:</strong> There is only one React application to maintain. A bug fix or new feature (like a new analytics tool or theme) is developed once and becomes instantly available to all tenants after a single deployment. This dramatically reduces development and maintenance overhead.</li>
        <li><strong>Dynamic Configuration:</strong> The link between the shared frontend and the isolated backends is a simple set of JSON configuration files. Onboarding a new tenant is a matter of configuration, not complex development work.</li>
    </ol>
`;
