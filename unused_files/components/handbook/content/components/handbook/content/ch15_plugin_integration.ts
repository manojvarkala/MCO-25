export const ch15_plugin_integration = `
    <h2 class="text-3xl font-bold font-display" id="ch15">Chapter 15: Plugin Integration & Shortcodes</h2>
    <p>The <code>mco-exam-integration-engine</code> plugin provides several shortcodes to seamlessly integrate the headless React application with your public-facing WordPress site.</p>

    <h3 class="text-xl font-bold mt-6">15.1 The Login Shortcode: <code>[mco_exam_login]</code></h3>
    <p>This shortcode is the key to the Single Sign-On (SSO) experience.</p>
    <ul>
        <li><strong>Purpose:</strong> To securely transition a logged-in WordPress user into the React application.</li>
        <li><strong>Usage:</strong> Create a new page in WordPress with the slug <code>exam-login</code> (or any slug you prefer). Place only this shortcode on the page.</li>
        <li><strong>Functionality:</strong> When a user visits this page, the shortcode checks if they are logged into WordPress. If they are, it generates a JWT and redirects them to the React app with the token. If they are not, it redirects them to the standard WordPress login screen.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">15.2 The Showcase Shortcode: <code>[mco_exam_showcase]</code></h3>
    <p>This shortcode allows you to embed beautifully styled, dynamic "exam cards" directly into any page or post on your WordPress site.</p>
    <ul>
        <li><strong>Purpose:</strong> To create a sales or information page on your main site that links directly to the exam programs in the React app or adds products to the WooCommerce cart.</li>
        <li><strong>Usage:</strong>
            <ul class="list-disc pl-5 mt-1">
                <li><code>[mco_exam_showcase]</code>: Use without any attributes to display a grid of all your published exam programs.</li>
                <li><code>[mco_exam_showcase id="prod-12345"]</code>: Use with the <code>id</code> attribute (using the app's program ID, e.g., "prod-...") to display only a single, specific exam program.</li>
            </ul>
        </li>
        <li><strong>Functionality:</strong> The shortcode fetches live data from your Exam Programs and WooCommerce products to display up-to-date titles, descriptions, pricing, and "Add to Cart" links.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">15.3 The Purchase Notifier Script</h3>
    <p>While the React app has a built-in live purchase notifier, you might want to add this social proof element to your main WordPress site as well. The plugin does not automatically inject this for theme compatibility reasons.</p>
    <p>A standalone, dependency-free HTML/CSS/JS snippet is available in the React app's admin panel under <strong>Admin → Integration</strong>. You can copy this code and paste it into a "Custom HTML" block in your site's footer using the block editor or a theme options panel.</p>
`;