export const ch15Content = `
    <h3 class="text-xl font-bold">15.1 The Complete Onboarding Workflow</h3>
    <p>This chapter provides the definitive, step-by-step workflow for launching a new examination portal for a client or brand using the Annapoorna Examination Engine.</p>

    <h4 class="font-semibold mt-4">Step 1: Prepare the React App Hosting (e.g., Vercel)</h4>
    <ol>
        <li>Navigate to your hosting provider where the React app is deployed.</li>
        <li>Add the new tenant's subdomain to your project's domain list (e.g., <code>exams.newclient.com</code>).</li>
    </ol>

    <h4 class="font-semibold mt-4">Step 2: Set Up the New Tenant's WordPress Backend</h4>
    <ol>
        <li>Start with a fresh WordPress installation and activate the WooCommerce plugin.</li>
        <li>In the React app's admin panel, go to the "Integration" page and generate the <code>mco-exam-integration-engine.zip</code> file.</li>
        <li>On the new WordPress site, go to <strong>Plugins → Add New → Upload Plugin</strong> and install the ZIP file. Activate it.</li>
    </ol>
    
    <div class="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <p class="font-bold text-red-800">CRITICAL SECURITY STEP</p>
        <p class="text-red-700">You must now edit the <code>wp-config.php</code> file at the root of your WordPress installation. Add the following line with a unique, long, and random string. You can use an online "password generator" to create one. This key is essential for securing user authentication.</p>
        <pre class="text-xs bg-slate-100 p-2 rounded my-1 whitespace-pre-wrap font-mono"><code>define('MCO_JWT_SECRET', 'your-super-long-and-secret-random-string-goes-here');</code></pre>
    </div>

    <h4 class="font-semibold mt-4">Step 3: Run the Initial Plugin Configuration</h4>
    <p>The "Tenant Blueprint Generator" in the plugin's "Tools" tab includes a checklist to guide you through the minimum required setup.</p>
    <ol>
        <li>In the WordPress admin, navigate to <strong>Exam App Engine → Main Settings</strong> and enter the full URL of the subdomain you configured in Step 1.</li>
        <li>Navigate to <strong>Exam App Engine → Certificate Templates</strong> and configure at least one signature with a name and title.</li>
        <li>Ensure a site logo is present by setting a <strong>Custom Logo URL</strong> in Main Settings or a default <strong>Site Icon</strong> under <strong>Appearance → Customize</strong>.</li>
    </ol>

    <h4 class="font-semibold mt-4">Step 4: Generate and Deploy the Tenant Blueprint</h4>
    <ol>
        <li>Navigate to <strong>Exam App Engine → Tools</strong>. The "Generate & Download Blueprint" button will now be active. Click it to download the <code>tenant-config.json</code> file.</li>
        <li>Rename the downloaded file to something descriptive (e.g., <code>new-client-config.json</code>) and place it inside the <code>/public</code> directory of your React app's source code.</li>
        <li>Open the <code>services/apiConfig.ts</code> file in your React app and add a new entry to the <code>tenantMap</code> that points the new tenant's domain to their new config file and WordPress API URL.</li>
        <li>Commit these two changes and push them to your Git repository. Your hosting provider will automatically build and deploy the update.</li>
    </ol>
    
    <h4 class="font-semibold mt-4">Step 5: You're Live!</h4>
    <p>The new tenant portal is now live. You can begin creating WooCommerce products and Exam Programs in the tenant's WordPress backend, and they will automatically appear in their dedicated app instance.</p>
`;
