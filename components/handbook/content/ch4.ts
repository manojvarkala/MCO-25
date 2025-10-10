export const ch4Content = `
    <h3 class="text-xl font-bold">4.1 Plugin File Architecture</h3>
    <p>The <code>mco-exam-integration-engine</code> plugin is organized into a modular structure to separate concerns and improve maintainability. The core logic resides in the <code>/includes/</code> directory.</p>
    <ul class="list-disc pl-5 space-y-2 mt-4">
        <li><code>mco-exam-integration-engine.php</code>: The main plugin file. Handles initialization, constants, activation hooks, and includes all other files.</li>
        <li><code>includes/mco-cpts.php</code>: Defines all Custom Post Types ("Exam Programs", "Recommended Books") and their associated custom taxonomies.</li>
        <li><code>includes/mco-data.php</code>: Contains the crucial data-gathering and caching functions. Its primary function, <code>mco_get_app_config_data()</code>, queries the database, structures the data, and caches it in a WordPress transient for performance.</li>
        <li><code>includes/mco-api.php</code>: Registers all REST API endpoints, handles JWT generation and validation, and manages CORS security policies.</li>
        <li><code>includes/mco-admin.php</code>: Builds all the WordPress admin-facing pages, including the Settings, Tools, and Bulk Import tabs.</li>
        <li><code>includes/mco-shortcodes.php</code>: Defines all WordPress shortcodes, such as <code>[mco_exam_login]</code> for SSO and <code>[mco_exam_showcase]</code> for embedding exam cards on pages.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">4.2 Custom Post Type: "Exam Programs"</h3>
    <p>This is the central content type for creating exams. It acts as a container or "program" that holds the settings for both a free practice exam and a paid certification exam.</p>
    <ul>
        <li><strong>Standard Fields:</strong> Uses the standard WordPress Title and Editor for the program's name and description.</li>
        <li><strong>Custom Taxonomies:</strong> Instead of numerous meta fields, it uses custom taxonomies for quantifiable data like "Pass Score", "Practice Questions", and "Certification Duration". This is a clean and efficient way to manage these settings.</li>
        <li><strong>Meta Fields:</strong> Key settings like the linked WooCommerce Product SKU, Question Source URL (Google Sheet), and proctoring toggles are stored as post meta.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">4.3 Custom Post Type: "Recommended Books"</h3>
    <p>This CPT is used to manage the "Study Hall" and "Book Store" features. Each post represents a single book.</p>
    <ul>
        <li><strong>Standard Fields:</strong> Uses the WordPress Title for the book's title and the Editor for its description.</li>
        <li><strong>Meta Fields:</strong> A unique Book ID (e.g., "book-cpc-guide"), a thumbnail URL, and the geo-specific Amazon affiliate links are stored as post meta.</li>
    </ul>
`;
