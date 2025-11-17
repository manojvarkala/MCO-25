export const ch7_wp_admin_content = `
    <h2 class="text-3xl font-bold font-display" id="ch7">Chapter 7: Managing Content (CPTs & Bulk Import)</h2>
    
    <h3 class="text-xl font-bold mt-6">7.1 Creating an "Exam Program"</h3>
    <p>The "Exam Program" is the primary content type. Each program you create will appear as a distinct section on the user's dashboard, containing both a practice test and a certification exam.</p>
    <ol>
        <li>Navigate to <strong>Exam App Engine → Exam Programs → Add New</strong>.</li>
        <li><strong>Title & Description:</strong> Enter the main title and description for the program. This text will be displayed prominently in the app.</li>
        <li><strong>Exam Program Settings (Meta Box):</strong> This is the main configuration area below the content editor.
            <ul class="list-disc pl-5 mt-2">
                <li><strong>Question Source URL:</strong> The crucial link to the Google Sheet containing the questions.</li>
                <li><strong>Exam Parameters:</strong> Set the number of questions, duration, and pass score for both practice and certification exams.</li>
                <li><strong>Name Overrides:</strong> Optionally provide custom names for the practice and certification exams.</li>
                <li><strong>WooCommerce Product SKU:</strong> Link the certification exam to a WooCommerce product.</li>
                <li><strong>Settings Toggles:</strong> Enable or disable proctoring and certificate generation.</li>
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
        <li><strong>Custom Fields (Post Meta):</strong> This is where you add the unique Book ID and affiliate links. For bulk management, the CSV importer is recommended.</li>
        <li>Click <strong>Publish</strong>.</li>
    </ol>
    
    <h3 class="text-xl font-bold mt-6">7.3 The Bulk Import Workflow (Recommended)</h3>
    <p>For creating more than a few programs or books, the Bulk Import tool is the most efficient method. This is a three-step process that bridges your content in WordPress with your products in WooCommerce.</p>
    <ol class="list-decimal pl-5 space-y-3">
        <li>
            <strong>Step 1: Upload Exam Programs CSV</strong><br />
            Navigate to <strong>Exam App Engine → Settings & Tools → Bulk Data</strong>. Download the Exam Programs CSV template. Fill it with your data (titles, descriptions, SKUs, question counts, etc.) and upload it. The system will automatically create all the "Exam Program" posts for you.
        </li>
        <li>
            <strong>Step 2: Generate WooCommerce Products CSV</strong><br />
            Once your programs are created, go to the same <strong>Bulk Data</strong> page. Click the "Generate CSV from Programs" button under the WooCommerce section. This will create a new CSV, pre-filled with the correct product details for each certification exam you just uploaded.
        </li>
        <li>
            <strong>Step 3: Upload WooCommerce Products CSV</strong><br />
            Go to <strong>WooCommerce → Products → Import</strong> in your WordPress admin. Upload the CSV file generated in the previous step. This will automatically create all the necessary "Simple" products in your store, correctly linked to your exam programs via their SKUs.
        </li>
    </ol>
`;