export const ch8_wp_admin_tools = `
    <h2 class="text-3xl font-bold font-display text-slate-800" id="ch8">Chapter 8: Plugin Settings & Tools</h2>
    <p>The <strong>Exam App Engine → Settings & Tools</strong> page is the control center for your tenant's backend configuration. It is organized into several key tabs.</p>

    <h3 class="text-xl font-bold mt-6">8.1 Main Settings Tab</h3>
    <p>This tab contains the most critical settings for the plugin to function.</p>
    <ul>
        <li><strong>Exam Application URL(s):</strong> This is a mandatory field. You must enter the full URL of your React app here (e.g., <code>https://exams.yourdomain.com</code>). This is essential for enabling Cross-Origin Resource Sharing (CORS) and for generating correct links for SSO and "Add to Cart" buttons. You can add multiple URLs (e.g., for staging or Vercel preview environments) by placing each one on a new line.</li>
        <li><strong>Custom Logo URL:</strong> Optionally, you can provide a direct URL to a logo file. If left blank, the app will use the "Site Icon" from your WordPress Customizer. For best results with PDF certificates, it's recommended to upload the logo to your Media Library and paste the URL here.</li>
        <li><strong>Enable "Spin & Win":</strong> This checkbox toggles the gamified prize wheel feature for all users on this tenant.</li>
        <li><strong>JWT Secret Key:</strong> This is a read-only field that confirms whether you have correctly defined the <code>MCO_JWT_SECRET</code> constant in your <code>wp-config.php</code> file.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">8.2 Theme Selector Tab</h3>
    <p>This allows you to set the default visual theme for the entire tenant application. Users will be able to override this choice in their own profile settings within the app, but this setting controls the initial appearance for all new visitors.</p>

    <h3 class="text-xl font-bold mt-6">8.3 Certificate Templates Tab</h3>
    <p>This section provides a user-friendly interface for customizing the content of the PDF certificates. You can edit the title, body text, and the names and titles of the signatories. For signature images, it is highly recommended to use a base64-encoded SVG or PNG data URI to prevent potential CORS issues when the PDF is generated on the client-side.</p>

    <h3 class="text-xl font-bold mt-6">8.4 Tools Tab: Blueprint vs. Snapshot</h3>
    <p>This tab contains two powerful JSON generation tools that serve different, but equally important, purposes.</p>
    <ul>
        <li><strong>Tenant Blueprint Generator:</strong> This is for <strong>onboarding a NEW tenant</strong>. It creates a minimal JSON "scaffold" with your site's branding and certificate templates, but with empty arrays for exams and books. Its purpose is to provide the React app with a valid, empty configuration file so it can start up without errors for a brand new, content-empty tenant.</li>
        <li><strong>Full Content Snapshot Generator:</strong> This is for <strong>managing a LIVE tenant</strong>. It generates a complete JSON file containing a point-in-time snapshot of all your current content—every exam, book, price, and setting. This file is used to update the static fallback file in the React app, which is the core of the "Golden Workflow" for performance optimization.</li>
    </ul>
`;