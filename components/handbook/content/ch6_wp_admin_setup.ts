export const ch6_wp_admin_setup = `
    <h2 class="text-3xl font-bold font-display" id="ch6">Chapter 6: Plugin Setup & Admin Menu Overview</h2>

    <h3 class="text-xl font-bold mt-6">6.1 Installing the Integration Plugin</h3>
    <p>The <code>mco-exam-integration-engine</code> plugin is the heart of the backend. It must be installed on the WordPress site that will serve as the "body" for your tenant.</p>
    <ol>
        <li>In the React app's in-app admin panel, go to the <strong>Integration</strong> page.</li>
        <li>Click the <strong>"Generate & Download Plugin"</strong> button to get the latest version as a <code>.zip</code> file.</li>
        <li>In your tenant's WordPress admin dashboard, navigate to <strong>Plugins → Add New → Upload Plugin</strong>.</li>
        <li>Upload the <code>.zip</code> file and click "Install Now".</li>
        <li>Activate the plugin.</li>
    </ol>
    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
        <p class="font-bold text-amber-800">Updating the Plugin</p>
        <p class="text-amber-700">To update, simply repeat the process. WordPress will detect that the plugin is already installed and prompt you to "Replace current with uploaded." This is a safe process that will not affect your content.</p>
    </div>

    <h3 class="text-xl font-bold mt-6">6.2 Critical First-Time Configuration</h3>
    <p>After activation, there are two mandatory configuration steps for the plugin to function correctly.</p>
    <ol>
        <li>
            <strong>Set the JWT Secret Key:</strong> This is a critical security step.
            <ul class="list-disc pl-5 mt-1">
                <li>Via FTP or your hosting control panel, open the <code>wp-config.php</code> file at the root of your WordPress installation.</li>
                <li>Add the following line, replacing the placeholder with a long, unique, random string (you can use an online password generator):</li>
                <pre class="text-xs bg-slate-100 p-2 rounded my-1"><code>define('MCO_JWT_SECRET', 'your-super-long-and-secret-string');</code></pre>
            </ul>
        </li>
        <li class="mt-2">
            <strong>Set the Application URL for CORS:</strong> This tells the server it's safe to communicate with your React app.
            <ul class="list-disc pl-5 mt-1">
                <li>In WordPress, navigate to the new <strong>Exam App Engine → Main Settings</strong> menu.</li>
                <li>In the "Exam Application URL(s)" field, enter the full URL of your React app (e.g., <code>https://exams.yourdomain.com</code>). If you use multiple URLs (like for staging or Vercel preview environments), add each one on a new line.</li>
                <li>Click "Save Changes".</li>
            </ul>
        </li>
    </ol>

    <h3 class="text-xl font-bold mt-6">6.3 The "Exam App Engine" Admin Menu</h3>
    <p>The plugin adds a new top-level menu to your WordPress admin dashboard, which serves as the central control panel for all app-related content and settings.</p>
    <ul>
        <li><strong>Exam App Engine (Top Level):</strong> Clicking this takes you to the main "Settings & Tools" page.</li>
        <li><strong>Exam Programs:</strong> This is the Custom Post Type for creating and managing your exam programs. This is where you will do most of your content work.</li>
        <li><strong>Recommended Books:</strong> The Custom Post Type for managing books for the "Study Hall" and "Book Store" features.</li>
        <li><strong>Settings & Tools:</strong> The main administrative page, broken down into several tabs for detailed configuration (covered in Chapter 8).</li>
    </ul>
`;