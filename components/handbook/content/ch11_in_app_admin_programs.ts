export const ch11_in_app_admin_programs = `
    <h2 class="text-3xl font-bold font-display" id="ch11">Chapter 11: Exam Program Customizer</h2>

    <h3 class="text-xl font-bold mt-6">11.1 The In-App Editor vs. WordPress Admin</h3>
    <p>The Exam Program Customizer, found at <strong>Admin → Exam Programs</strong>, is the in-app interface for managing your exam content. While you can also edit these programs in the WordPress admin, this interface provides a more streamlined, real-time experience without leaving the app.</p>
    <p>It allows you to view all your programs in a clean list and expand an editor to modify their settings. Changes saved here are sent directly to the WordPress API and update the content live.</p>

    <h3 class="text-xl font-bold mt-6">11.2 Editing an Exam Program</h3>
    <p>Click the "Edit" button on any program card to open the editor. Here you can modify:</p>
    <ul>
        <li><strong>Program Name & Description:</strong> The main title and descriptive text shown on the dashboard.</li>
        <li><strong>Question Source URL:</strong> The crucial link to the Google Sheet containing the questions for both the practice and certification exams.</li>
        <li><strong>Exam Name Overrides:</strong> Provide custom names for the practice and certification exams if they differ from the main program title.</li>
        <li><strong>Linked Product:</strong> Use the dropdown to associate the certification exam with an existing WooCommerce product SKU. This is how the app knows which product to sell.</li>
        <li><strong>Exam Parameters:</strong> Adjust the number of questions, duration in minutes, and the passing score for both the practice and certification exams.</li>
        <li><strong>Settings Toggles:</strong> Enable or disable proctoring and certificate generation for the certification exam.</li>
        <li><strong>Recommended Books:</strong> A checklist of all available books, allowing you to easily associate study materials with the program.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">11.3 Creating a New Exam Program</h3>
    <p>Clicking the "Create New Program" button opens a modal that allows you to quickly scaffold a new program. You can:</p>
    <ul>
        <li><strong>Give it a name.</strong></li>
        <li><strong>Automatically create a new WooCommerce product</strong> for it at the same time.</li>
        <li><strong>Link it to an existing, unlinked WooCommerce product</strong> from a convenient dropdown list.</li>
    </ul>
    <p>Once created, the new program will appear in the list, ready for you to edit its full details.</p>

    <h3 class="text-xl font-bold mt-6">11.4 Bulk Editing Programs</h3>
    <p>The Bulk Edit feature is a massive time-saver for applying the same change across multiple programs at once. To use it:</p>
    <ol>
        <li>Use the checkboxes on the left of each program card to select the programs you want to modify. You can also use the "Select All" checkbox.</li>
        <li>A "Bulk Edit" panel will appear at the top of the screen.</li>
        <li>Enter the new values for any settings you wish to change (e.g., set a new Pass Score for all selected programs, or update the Question Source URL for a batch of exams).</li>
        <li>Fields left blank will remain unchanged for all selected programs.</li>
        <li>Click "Apply Changes" to save the updates to all selected programs in a single operation.</li>
    </ol>
`;
