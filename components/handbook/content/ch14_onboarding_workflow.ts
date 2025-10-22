export const ch14_onboarding_workflow = `
    <h2 class="text-3xl font-bold font-display" id="ch14">Chapter 14: The Complete Onboarding Workflow</h2>
    <p>This chapter provides the definitive, step-by-step workflow for launching a new examination portal for a client or brand using the Annapoorna Examination Engine.</p>

    <h3 class="text-xl font-bold mt-6">Step 1: Prepare the React App Hosting (e.g., Vercel)</h3>
    <ol class="list-decimal pl-5 space-y-2">
        <li>Navigate to your hosting provider where the single React app codebase is deployed.</li>
        <li>Add the new tenant's subdomain to your project's domain list (e.g., <code>exams.newclient.com</code>). This points their domain to your existing React application.</li>
    </ol>

    <h3 class="text-xl font-bold mt-6">Step 2: Set Up the New Tenant's WordPress Backend</h3>
    <ol class="list-decimal pl-5 space-y-2">
        <li>Set up a fresh, separate WordPress installation for the new tenant. Activate the WooCommerce plugin.</li>
        <li>From the in-app admin panel of your <strong>primary</strong> tenant (or any live tenant), go to <strong>Admin → Integration</strong>.</li>
        <li>Click <strong>"Generate &amp; Download Plugin"</strong> to get the latest <code>mco-exam-integration-engine.zip</code> file.</li>
        <li>On the <strong>new</strong> WordPress site, go to <strong>Plugins → Add New → Upload Plugin</strong>, install the ZIP file, and activate it.</li>
    </ol>
    
    <div class="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <p class="font-bold text-red-800">CRITICAL SECURITY STEP: Set the JWT Secret</p>
        <p class="text-red-700">You must now edit the <code>wp-config.php</code> file at the root of the new WordPress installation. Add the following line with a unique, long, and random string. This key is essential for securing user authentication.</p>
        <pre class="text-xs bg-slate-100 p-2 rounded my-1"><code>define('MCO_JWT_SECRET', 'your-super-long-and-secret-random-string-goes-here');</code></pre>
    </div>

    <h3 class="text-xl font-bold mt-6">Step 3: Run the Initial Plugin Configuration</h3>
    <p>This step generates the initial configuration file needed to connect the React app to this new backend.</p>
    <ol class="list-decimal pl-5 space-y-2">
        <li>In the new WordPress admin, navigate to <strong>Exam App Engine → Main Settings</strong> and enter the full URL of the subdomain you configured in Step 1 (e.g., <code>https://exams.newclient.com</code>). Save changes.</li>
        <li>Go to <strong>Exam App Engine → Certificate Templates</strong> and configure at least one signature with a name and title. Save changes.</li>
        <li>Ensure a site logo is present by setting a <strong>Custom Logo URL</strong> in Main Settings or a default <strong>Site Icon</strong> under <strong>Appearance → Customize</strong>.</li>
    </ol>

    <h3 class="text-xl font-bold mt-6">Step 4: Generate and Deploy the Tenant Blueprint</h3>
    <ol class="list-decimal pl-5 space-y-2">
        <li>In the new WordPress admin, navigate to <strong>Exam App Engine → Tools</strong>. The "Generate &amp; Download Blueprint" button will now be active. Click it to download the tenant's unique blueprint JSON file.</li>
        <li>Rename the downloaded file to something descriptive (e.g., <code>new-client-config.json</code>) and place it inside the <code>/public</code> directory of your React app's source code.</li>
        <li>Open the <code>services/apiConfig.ts</code> file in your React app and add a new entry to the <code>tenantMap</code> that points the new tenant's domain to their new config file and WordPress API URL.</li>
        <pre class="text-xs bg-slate-100 p-2 rounded my-1"><code>// In services/apiConfig.ts
const newClientConfig: TenantConfig = {
    apiBaseUrl: 'https://www.newclient.com',
    staticConfigPath: '/new-client-config.json'
};

const tenantMap = {
    // ... existing entries
    'exams.newclient.com': newClientConfig,
    'newclient.com': newClientConfig,
};
</code></pre>
        <li>Commit these two file changes (the new JSON and the updated <code>apiConfig.ts</code>) and push them to your Git repository. Your hosting provider will automatically build and deploy the update.</li>
    </ol>
    
    <h3 class="text-xl font-bold mt-6">Step 5: You're Live!</h3>
    <p>The new tenant portal is now live. You can now begin creating WooCommerce products and Exam Programs in the new tenant's WordPress backend, and they will automatically appear in their dedicated app instance.</p>
`;
