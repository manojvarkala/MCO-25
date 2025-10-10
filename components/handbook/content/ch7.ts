export const ch7Content = `
    <h3 class="text-xl font-bold">7.1 The Admin Panel Overview</h3>
    <p>The "Exam App Engine" menu in the WordPress admin dashboard is the central control panel for all backend content and configuration. It is organized into several tabs for clarity and ease of use.</p>
    <ul>
        <li><strong>Main Settings:</strong> Configure essential links like the React App URL, add a custom logo, and toggle global features like the "Spin & Win" game.</li>
        <li><strong>Theme Selector:</strong> Set the default visual theme for the entire tenant application.</li>
        <li><strong>Bulk Import:</strong> A powerful tool for creating or updating hundreds of Exam Programs or Recommended Books from a single CSV file upload.</li>
        <li><strong>Certificate Templates:</strong> A visual editor for creating and modifying the PDF certificates issued to users upon passing an exam.</li>
        <li><strong>Tools:</strong> Contains essential utilities for maintenance and onboarding new clients.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">7.2 The Tenant Blueprint Generator</h3>
    <p>Located in the "Tools" tab, this is one of the most powerful features for scaling the platform. Its purpose is to generate a complete, error-free, ready-to-use JSON configuration file for launching a brand new tenant portal.</p>
    <p>The tool intelligently guides the administrator through a setup process by enforcing prerequisites:</p>
    <ol>
        <li><strong>Prerequisites Checklist:</strong> The "Generate & Download Blueprint" button is disabled by default. The UI displays a checklist of required actions:
            <ul>
                <li>Set the Exam Application URL.</li>
                <li>Set a site logo (either via custom URL or the WordPress Site Icon).</li>
                <li>Configure at least one signature in the Certificate Templates tab.</li>
            </ul>
        </li>
        <li><strong>Generation:</strong> Once all prerequisites are met, the button becomes active. Clicking it generates a <code>tenant-config.json</code> file that is a complete blueprint. It contains the site's branding, all configured certificate templates, and crucially, the correct empty arrays for dynamic content like exams and books.</li>
        <li><strong>Deployment:</strong> This generated file can be dropped directly into the React app's <code>/public</code> directory and added to the <code>tenantMap</code> to instantly launch the new tenant's portal.</li>
    </ol>
    <p>This guided process prevents the deployment of incomplete configurations, which could cause the React app to crash on startup for a new tenant.</p>

    <h3 class="text-xl font-bold mt-6">7.3 Certificate Template Management</h3>
    <p>This tab provides a simple interface for editing the text and signatures on certificates. It supports dynamic placeholders like <code>{examName}</code> and <code>{finalScore}</code> which are replaced with the user's actual data upon generation.</p>
    <p>For signature images, it is highly recommended to use a <strong>base64 data URI</strong> instead of a standard URL. This embeds the image directly into the certificate data, preventing potential CORS (Cross-Origin) errors when the React app generates the PDF for download.</p>
`;
