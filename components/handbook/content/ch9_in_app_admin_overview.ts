export const ch9_in_app_admin_overview = `
    <h2 class="text-3xl font-bold font-display text-slate-800" id="ch9">Chapter 9: In-App Admin Panel & Debug Sidebar</h2>
    <p>While the WordPress backend is for permanent content creation, the in-app admin panel is a suite of powerful tools designed for live monitoring, rapid customization, content generation, and diagnostics, all without leaving the React application.</p>

    <h3 class="text-xl font-bold mt-6">9.1 Accessing the Admin Panel</h3>
    <p>The Admin Panel is accessible to any user who is logged in and has the "Administrator" role in the corresponding WordPress backend. An "Admin Panel" link will automatically appear in the user's profile dropdown menu in the header.</p>
    <p>The panel is organized into a sidebar layout for easy navigation between its different sections:</p>
    <ul>
        <li><strong>Admin Dashboard:</strong> The main entry point, providing access to diagnostic tools.</li>
        <li><strong>Sales Analytics:</strong> A dashboard for viewing key metrics on exam sales and performance.</li>
        <li><strong>Exam Programs:</strong> A powerful interface for editing exam program details live.</li>
        <li><strong>Product Customizer:</strong> An interface for creating and managing WooCommerce products (Simple, Subscription, and Bundles).</li>
        <li><strong>Content Engine:</strong> The AI-powered tool for generating blog posts.</li>
        <li><strong>Integration:</strong> The tool for generating the WordPress plugin zip file.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">9.2 The Debug Sidebar & Masquerade Mode</h3>
    <p>The "Launch Debug Sidebar" button on the Admin Dashboard is your most powerful diagnostic tool. It provides a real-time, behind-the-scenes look at the application's state and its communication with the backend.</p>
    
    <h4 class="font-semibold mt-4">Masquerade Mode</h4>
    <p>At the top of the Debug Sidebar are the Masquerade Mode controls. This feature allows you, as an admin, to instantly switch your view to see the app exactly as another user type would, which is invaluable for testing and troubleshooting.</p>
    <ul>
        <li><strong>View as User:</strong> This mode simulates the experience of a standard, logged-in, non-admin user. Your admin-only UI elements (like edit buttons and the admin panel link) will disappear, and the app will rely on the permissions and entitlements of a regular user.</li>
        <li><strong>View as Visitor:</strong> This mode simulates the experience of a logged-out visitor. It's perfect for testing the public-facing landing page, pricing, and login flows.</li>
    </ul>
    <p>While masquerading, a banner will appear at the top of the screen allowing you to return to your admin view at any time.</p>
    
    <h4 class="font-semibold mt-4">Real-Time Data Inspection</h4>
    <p>When not masquerading, the Debug Sidebar provides a live view of critical data points:</p>
    <ul>
        <li><strong>Backend API Status:</strong> Shows the connection status and any error messages from the last API call. It provides detailed troubleshooting steps for common connection issues like the "Authorization Header Missing" error.</li>
        <li><strong>User Details:</strong> Displays the ID, name, and email of the currently logged-in user.</li>
        <li><strong>Purchased Exam SKUs:</strong> Lists all the product SKUs the current user is entitled to access, read directly from their JWT.</li>
        <li><strong>Synced Exam Results:</strong> Shows a summary of the exam results that have been successfully synced back to the WordPress server for the current user.</li>
    </ul>
`;