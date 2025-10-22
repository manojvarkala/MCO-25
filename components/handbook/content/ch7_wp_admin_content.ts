export const ch7_wp_admin_content = `
    <h2 class="text-3xl font-bold font-display" id="ch7">Chapter 7: Managing Content (CPTs & Bulk Import)</h2>
    
    <h3 class="text-xl font-bold mt-6">7.1 Creating an "Exam Program"</h3>
    <p>The "Exam Program" is the primary content type. Each program you create will appear as a distinct section on the user's dashboard, containing both a practice test and a certification exam.</p>
    <ol>
        <li>Navigate to <strong>Exam App Engine → Exam Programs → Add New</strong>.</li>
        <li><strong>Title & Description:</strong> Enter the main title and description for the program. This text will be displayed prominently in the app.</li>
        <li><strong>Exam Program Settings (Meta Box):</strong>
            <ul class="list-disc pl-5 mt-2">
                <li><strong>Title Overrides:</strong> Optionally provide different, more specific names for the practice and certification exams if needed.</li>
                <li><strong>Enable Certificate on Pass:</strong> Check this box if passing the certification exam should issue a certificate. If unchecked, it will be treated as a "Proficiency Exam."</li>
            </ul>
        </li>
        <li><strong>Taxonomies (Right Sidebar):</strong>
            <ul class="list-disc pl-5 mt-2">
                <li>Fill in all the required taxonomy fields: Practice Questions, Practice Duration, Certification Questions, Certification Duration, and Pass Score. These fields only accept numerical values.</li>
            </ul>
        </li>
        <li>Click <strong>Publish</strong> to save your program.</li>
    </ol>

    <h3 class="text-xl font-bold mt-6">7.2 Managing Recommended Books</h3>
    <p>To add books to the "Book Store" and link them to exam programs:</p>
    <ol>
        <li>Navigate to <strong>Exam App Engine → Recommended Books → Add New</strong>.</li>
        <li><strong>Title:</strong> Enter the full title of the book.</li>
        <li><strong>Content Editor:</strong> Write a brief, engaging description of the book.</li>
        <li><strong>Custom Fields (Post Meta):</strong> This is where you add the unique Book ID and affiliate links. These fields are typically managed via a custom fields plugin or directly in the post meta table for advanced users. For bulk management, the CSV importer is recommended.</li>
        <li>Click <strong>Publish</strong>.</li>
    </ol>
    
    <h3 class="text-xl font-bold mt-6">7.3 The Bulk Import Workflow (Recommended)</h3>
    <p>For creating more than a few programs or books, the Bulk Import tool is the most efficient method. This is a three-step process that bridges your content in WordPress with your products in WooCommerce.</p>
    <ol class="list-decimal pl-5 space-y-3">
        <li>
            <strong>Step 1: Upload Exam Programs CSV</strong><br />
            Navigate to <strong>Exam App Engine → Settings & Tools → Bulk Import</strong>. Download the Exam Programs CSV template. Fill it with your data (titles, descriptions, SKUs, question counts, etc.) and upload it. The system will automatically create all the "Exam Program" posts for you.
        </li>
        <li>
            <strong>Step 2: Generate WooCommerce Products CSV</strong><br />
            Once your programs are created, go to the in-app admin panel at <strong>Admin → Admin Dashboard → Bulk Data Management</strong>. Click the "Generate & Download WooCommerce Products CSV" button. This will create a new CSV, pre-filled with the correct product details (Name, SKU, Price) for each certification exam you just uploaded.
        </li>
        <li>
            <strong>Step 3: Upload WooCommerce Products CSV</strong><br />
            Go to <strong>WooCommerce → Products → Import</strong> in your WordPress admin. Upload the CSV file generated in the previous step. This will automatically create all the necessary "Simple" products in your store, correctly linked to your exam programs via their SKUs.
        </li>
    </ol>
`;
