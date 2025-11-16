import React, { FC, useState, useRef, useEffect } from 'react';
import { BookOpen, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- RICH TEXT HANDBOOK CONTENT ---
const coverContent = `
    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: white; background-image: linear-gradient(to bottom right, #1e293b, #0891b2, #1e293b); padding: 2rem;">
        <div style="margin-bottom: 1rem;">
            <svg style="margin: 0 auto; height: 5rem; width: 5rem; color: #67e8f9;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
        <h1 style="font-size: 3rem; font-weight: 800; font-family: var(--font-display);">Annapoorna Infotech Examination Engine</h1>
        <p style="margin-top: 1rem; font-size: 1.5rem; font-family: var(--font-script); color: #a5f3fc;">A Comprehensive Technical & Administrative Handbook</p>
        
        <div style="margin-top: auto; padding-top: 2rem; font-size: 0.875rem; color: #94a3b8;">
            <p style="font-weight: 600; color: #e2e8f0; font-size: 1rem;">Manoj Balakrishnan</p>
            <p style="font-size: 0.75rem; color: #94a3b8;">Lead Architect & Visionary</p>
            <p style="margin-top: 1.5rem;">Version 2.2.0</p>
        </div>
    </div>
`;

const titlePageContent = `
    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; color: #1e293b; background: white;">
        <h1 style="font-size: 2.5rem; font-weight: 800; font-family: var(--font-display);">Annapoorna Infotech Examination Engine</h1>
        <p style="margin-top: 0.5rem; font-size: 1.25rem; color: #475569;">A Comprehensive Technical & Administrative Handbook</p>
        
        <div style="margin-top: auto; padding-top: 2rem; font-size: 0.875rem; color: #64748b;">
            <p style="font-weight: 600; color: #334155; font-size: 1rem;">Manoj Balakrishnan</p>
            <p style="font-size: 0.75rem;">Lead Architect & Visionary</p>
            <p style="margin-top: 2rem;">Version 2.2.0</p>
            <p>&copy; ${new Date().getFullYear()} Annapoorna Infotech. All Rights Reserved.</p>
        </div>
    </div>
`;

const tocContent = `
    <h2 class="text-3xl font-bold font-display" id="toc">Table of Contents</h2>
    <div class="space-y-4 mt-6 text-base handbook-toc">
        <div>
            <h3 class="text-lg font-semibold">Part I: Core Concepts</h3>
            <ol class="list-decimal list-inside space-y-1 pl-4 mt-1">
                <li><a href="#ch1" data-chapter-index="3">Introduction & The Headless Advantage</a></li>
                <li><a href="#ch2" data-chapter-index="4">Architecture & Multi-Tenancy</a></li>
                <li><a href="#ch3" data-chapter-index="5">The Golden Workflow: Performance & Content</a></li>
            </ol>
        </div>
        <div>
            <h3 class="text-lg font-semibold">Part II: Administrator's Guide (WordPress)</h3>
            <ol class="list-decimal list-inside space-y-1 pl-4 mt-1" start="4">
                <li><a href="#ch4" data-chapter-index="6">Plugin Setup & Admin Menu Overview</a></li>
                <li><a href="#ch5" data-chapter-index="7">Managing Content: CPTs & Bulk Import</a></li>
                <li><a href="#ch6" data-chapter-index="8">Plugin Settings & Tools</a></li>
            </ol>
        </div>
        <div>
            <h3 class="text-lg font-semibold">Part III: Administrator's Guide (In-App)</h3>
            <ol class="list-decimal list-inside space-y-1 pl-4 mt-1" start="7">
                <li><a href="#ch7" data-chapter-index="9">In-App Admin Panel & Debug Sidebar</a></li>
                <li><a href="#ch8" data-chapter-index="10">Sales & Exam Analytics</a></li>
                <li><a href="#ch9" data-chapter-index="11">Exam Program Customizer</a></li>
                <li><a href="#ch10" data-chapter-index="12">Product Customizer</a></li>
                <li><a href="#ch11" data-chapter-index="13">AI Content Engine</a></li>
            </ol>
        </div>
        <div>
            <h3 class="text-lg font-semibold">Part IV: Onboarding & Development</h3>
            <ol class="list-decimal list-inside space-y-1 pl-4 mt-1" start="12">
                <li><a href="#ch12" data-chapter-index="14">The Complete Onboarding Workflow</a></li>
                <li><a href="#ch13" data-chapter-index="15">Plugin Integration & Shortcodes</a></li>
            </ol>
        </div>
    </div>
`;

const chapters = [
    { title: "Cover", content: coverContent, isCover: true },
    { title: "Title Page", content: titlePageContent },
    { title: "Table of Contents", content: tocContent },
    { title: "Chapter 1: Introduction", content: `<h2 class="text-3xl font-bold font-display" id="ch1">Chapter 1: Introduction & The Headless Advantage</h2><h3 class="text-xl font-bold mt-6">1.1 The Vision: A Centralized Examination Ecosystem</h3><p>Welcome to the Annapoorna Examination Engine, a revolutionary platform engineered not just to administer tests, but to build and scale entire educational enterprises. Our vision was to create a single, powerful, multi-tenant solution that empowers organizations to launch bespoke, branded examination portals with unparalleled speed and efficiency.</p><h3 class="text-xl font-bold mt-6">1.2 The Power of the Headless Engine</h3><p>At its core, the Engine operates on a "headless" architecture. This means we have separated the beautiful, lightning-fast user interface (the "head") from the robust content and e-commerce backend (the "body," powered by WordPress). This separation is your competitive advantage.</p><ul><li><strong>Unmatched User Experience:</strong> Deliver a modern, app-like experience that is faster and more responsive than any traditional website.</li><li><strong>Infinite Flexibility:</strong> Change the look and feel of your portals without ever risking your backend data.</li><li><strong>Scalability on Demand:</strong> Host your user-facing app on global, high-performance networks while your backend remains secure.</li></ul><h3 class="text-xl font-bold mt-6">1.3 Core Capabilities</h3><p>This engine is a complete business solution:</p><ul><li><strong>Monetization-Ready:</strong> Integrated with WooCommerce for single purchases, subscriptions, and bundles.</li><li><strong>AI-Powered Learning:</strong> Uses Google's Gemini API to provide personalized study guides.</li><li><strong>Automated SEO Content Marketing:</strong> The AI Content Engine turns your exam programs into a stream of SEO-friendly blog posts.</li><li><strong>Professional Certification:</strong> Generate and issue verifiable PDF certificates with custom branding.</li><li><strong>Effortless Administration:</strong> Manage everything from a centralized, intuitive in-app admin panel.</li></ul>` },
    { title: "Chapter 2: Architecture & Multi-Tenancy", content: `<h2 class="text-3xl font-bold font-display" id="ch2">Chapter 2: Architecture & Multi-Tenancy</h2><h3 class="text-xl font-bold mt-6">2.1 Data Flow: From WordPress to the User</h3><p>The system is built on a clear and efficient data flow designed for performance and security.</p><ol><li><strong>Content Origin:</strong> An administrator creates content (Exam Programs, Books) and products in a dedicated WordPress backend.</li><li><strong>API Generation:</strong> The custom plugin gathers all this data, formats it into JSON, and makes it available via a secure REST API endpoint.</li><li><strong>Tenant Detection:</strong> A user visits a URL. The React app's <code>apiConfig.ts</code> service identifies the hostname.</li><li><strong>Configuration Loading:</strong> The app uses the hostname to look up the correct WordPress backend URL and fetches the JSON configuration from that backend's API.</li><li><strong>UI Rendering:</strong> The React app uses the fetched JSON data to render the entire UI with the correct branding, content, and pricing.</li></ol><h3 class="text-xl font-bold mt-6">2.2 Core Architectural Principles</h3><p>The system is built on three core principles:</p><ol><li><strong>Data Isolation:</strong> Each tenant has its own completely separate WordPress backend, ensuring data is never mixed.</li><li><strong>Shared Codebase:</strong> There is only one React application to maintain. A feature developed once becomes available to all tenants instantly after deployment.</li><li><strong>Dynamic Configuration:</strong> The link between the frontend and backends is a simple set of JSON configuration files. Onboarding a new tenant is a matter of configuration, not development.</li></ol>` },
    { title: "Chapter 3: The Golden Workflow", content: `<h2 class="text-3xl font-bold font-display" id="ch3">Chapter 3: The Golden Workflow: Performance & Content</h2><h3 class="text-xl font-bold mt-6">3.1 User Authentication & SSO Journey</h3><p>The platform uses a secure Single Sign-On (SSO) model with WordPress as the central authentication authority.</p><ol><li>A user clicks "Login" and is redirected to a special <code>/exam-login/</code> page on the WordPress site.</li><li>Upon successful login, a secure JSON Web Token (JWT) is generated.</li><li>The user is redirected back to the React app with the JWT, which establishes their session.</li></ol><h3 class="text-xl font-bold mt-6">3.2 Initial App Load & Caching</h3><p>The app uses a "Cache-First, Then Validate" strategy for fast load times.</p><ol><li><strong>Instant Load:</strong> The app first tries to load the main configuration from the browser's <code>localStorage</code>, rendering the UI instantly if found.</li><li><strong>Background Fetch:</strong> Simultaneously, it calls the live API endpoint.</li><li><strong>Version Check & Update:</strong> It compares the version timestamp of the cached data with the live data. If the live version is newer, it updates its state, saves the new configuration, and shows a toast notification.</li></ol><h3 class="text-xl font-bold mt-6">3.3 The "Golden Workflow" Process</h3><p>Your content management process is simple:</p><ol><li class="mt-2"><strong>For Daily Work:</strong> Make content changes in WordPress. Logged-in users see these updates automatically via the API. You do not need to generate a new JSON file for daily changes.</li><li class="mt-2"><strong>For Periodic Optimization:</strong> Periodically (e.g., weekly), go to <strong>Exam App Engine → Tools → "Generate & Download Snapshot"</strong>. Replace the old static JSON file in your React app's <code>/public</code> directory with this new file and redeploy the app. This makes the site load faster for new visitors.</li></ol>` },
    { title: "Chapter 4: WP Admin - Setup", content: `<h2 class="text-3xl font-bold font-display" id="ch4">Chapter 4: Plugin Setup & Admin Menu Overview</h2><h3 class="text-xl font-bold mt-6">4.1 Installing the Plugin</h3><p>The <code>mco-exam-integration-engine</code> plugin is the heart of the backend.</p><ol><li>In the React app's admin panel, go to <strong>Integration</strong> and download the plugin .zip file.</li><li>In your WordPress admin, go to <strong>Plugins → Add New → Upload Plugin</strong>, and install the file.</li></ol><h3 class="text-xl font-bold mt-6">4.2 Critical First-Time Configuration</h3><ol><li><strong>Set the JWT Secret Key:</strong> Edit your <code>wp-config.php</code> file and add: <br/><code>define('MCO_JWT_SECRET', 'your-super-long-and-secret-string');</code></li><li><strong>Set the Application URL:</strong> In WordPress, navigate to <strong>Exam App Engine → Main Settings</strong> and enter the full URL of your React app.</li></ol><h3 class="text-xl font-bold mt-6">4.3 The "Exam App Engine" Menu</h3><p>This new menu is your control panel:</p><ul><li><strong>Exam Programs:</strong> The Custom Post Type for creating and managing your exam programs.</li><li><strong>Recommended Books:</strong> The CPT for managing books for the "Book Store".</li><li><strong>Settings & Tools:</strong> The main administrative page with multiple tabs for detailed configuration.</li></ul>` },
    { title: "Chapter 5: WP Admin - Content", content: `<h2 class="text-3xl font-bold font-display" id="ch5">Chapter 5: Managing Content (CPTs & Bulk Import)</h2><h3 class="text-xl font-bold mt-6">5.1 Creating an "Exam Program"</h3><p>The "Exam Program" is the primary content type. Each program you create appears as a section on the user's dashboard.</p><ol><li>Navigate to <strong>Exam Programs → Add New</strong>.</li><li>Enter the title and description.</li><li>Fill out the <strong>Exam Program Settings</strong> meta box below the editor. This includes the Google Sheet URL, question counts, duration, pass score, and the linked WooCommerce Product SKU.</li></ol><h3 class="text-xl font-bold mt-6">5.2 The Bulk Import Workflow (Recommended)</h3><p>For creating more than a few programs, the Bulk Import tool is the most efficient method.</p><ol class="list-decimal pl-5 space-y-3"><li><strong>Step 1: Upload Exam Programs CSV:</strong> Go to <strong>Settings & Tools → Bulk Data</strong>, download the template, fill it with your data (titles, descriptions, SKUs, etc.), and upload it.</li><li><strong>Step 2: Generate WooCommerce Products CSV:</strong> On the same page, click "Generate CSV from Programs". This creates a new CSV, pre-filled with product details for each exam.</li><li><strong>Step 3: Upload WooCommerce Products CSV:</strong> Go to <strong>WooCommerce → Products → Import</strong>. Upload the CSV from the previous step to automatically create all the necessary products in your store.</li></ol>` },
    { title: "Chapter 6: WP Admin - Tools", content: `<h2 class="text-3xl font-bold font-display" id="ch6">Chapter 6: Plugin Settings & Tools</h2><p>The <strong>Settings & Tools</strong> page is the control center for your tenant's backend configuration.</p><h3 class="text-xl font-bold mt-6">6.1 Main Settings Tab</h3><p>Contains critical settings:</p><ul><li><strong>Exam Application URL(s):</strong> Mandatory. Enter the full URL of your React app for CORS and link generation.</li><li><strong>Custom Logo URL:</strong> Optional. A direct URL to a logo file. If blank, uses the WordPress Site Icon.</li><li><strong>Feature Toggles:</strong> Enable or disable features like subscriptions, bundles, and the live purchase notifier.</li></ul><h3 class="text-xl font-bold mt-6">6.2 Tools Tab: Blueprint vs. Snapshot</h3><p>This tab contains two powerful JSON generation tools:</p><ul><li><strong>Tenant Blueprint Generator:</strong> For <strong>onboarding a NEW tenant</strong>. It creates a minimal JSON "scaffold" with branding but empty content arrays.</li><li><strong>Full Content Snapshot Generator:</strong> For <strong>managing a LIVE tenant</strong>. It generates a complete JSON file with a snapshot of all current content, used for updating the static fallback file in the React app (see The Golden Workflow).</li></ul>` },
    { title: "Chapter 7: In-App Admin - Overview", content: `<h2 class="text-3xl font-bold font-display" id="ch7">Chapter 7: In-App Admin Panel & Debug Sidebar</h2><p>The in-app admin panel is a suite of tools for live monitoring, rapid customization, and diagnostics without leaving the app.</p><h3 class="text-xl font-bold mt-6">7.1 Accessing the Admin Panel</h3><p>An "Admin Panel" link appears in the profile dropdown for logged-in administrators. The panel includes sections for Analytics, Program/Product Customizers, the AI Content Engine, and more.</p><h3 class="text-xl font-bold mt-6">7.2 The Debug Sidebar & Masquerade Mode</h3><p>The "Launch Debug Sidebar" button is your most powerful diagnostic tool.</p><ul><li><strong>Masquerade Mode:</strong> Instantly switch your view to see the app as a regular user or a logged-out visitor. Invaluable for testing.</li><li><strong>Real-Time Data Inspection:</strong> Provides a live view of API status, current user details, their purchased SKUs, and synced exam results.</li></ul>` },
    { title: "Chapter 8: In-App Admin - Analytics", content: `<h2 class="text-3xl font-bold font-display" id="ch8">Chapter 8: Sales & Exam Analytics</h2><h3 class="text-xl font-bold mt-6">8.1 Sales Analytics</h3><p>Found at <strong>Admin → Sales Analytics</strong>, this dashboard provides key metrics on your certification exams.</p><ul><li><strong>Sales & Revenue:</strong> Fetched directly from WooCommerce. Revenue is an estimate based on current price.</li><li><strong>Attempts, Scores & Pass Rates:</strong> Aggregated from all user exam results stored in your WordPress database.</li></ul><h3 class="text-xl font-bold mt-6">8.2 Exam Usage Analytics</h3><p>The <strong>Exam Analytics</strong> tab focuses on user engagement, showing metrics for both practice and certification exams, including clicks, attempts, pass rates, and click-to-attempt conversion rates.</p>` },
    { title: "Chapter 9: In-App Admin - Programs", content: `<h2 class="text-3xl font-bold font-display" id="ch9">Chapter 9: Exam Program Customizer</h2><p>Located at <strong>Admin → Exam Programs</strong>, this is the in-app interface for managing your exam content. It allows you to view all programs and expand an editor to modify their settings in real-time.</p><h3 class="text-xl font-bold mt-6">9.1 Editing a Program</h3><p>Click "Edit" on any program to modify its Name, Description, Question Source URL, linked Product SKU, exam parameters (question count, duration, pass score), settings toggles, and recommended books.</p><h3 class="text-xl font-bold mt-6">9.2 Bulk Editing</h3><p>Select multiple programs using the checkboxes to open the Bulk Edit panel. This allows you to apply the same change (e.g., update the Pass Score or Question Source URL) across all selected programs at once.</p>` },
    { title: "Chapter 10: In-App Admin - Products", content: `<h2 class="text-3xl font-bold font-display" id="ch10">Chapter 10: Product Customizer</h2><p>Found at <strong>Admin → Product Customizer</strong>, this tool lets you manage WooCommerce products directly from the app. It's organized into tabs for Simple Products, Subscriptions, and Bundles.</p><h3 class="text-xl font-bold mt-6">10.1 Simple & Subscription Products</h3><p>Create or edit standard one-time purchase exams or recurring subscription plans. You can set names, SKUs, prices, and billing periods.</p><h3 class="text-xl font-bold mt-6">10.2 Creating Bundles</h3><p>The "Bundles" tab provides a powerful interface for creating your best-value offers. You can create a new bundle product, give it a price, and then use checklists to select which existing Simple Products (exams) and Subscription Products to include in it.</p>` },
    { title: "Chapter 11: In-App Admin - AI Engine", content: `<h2 class="text-3xl font-bold font-display" id="ch11">Chapter 11: AI Content Engine</h2><p>This tool, at <strong>Admin → Content Engine</strong>, automates your content marketing by turning Exam Programs into SEO-friendly blog posts.</p><p>It uses the Google Gemini API to write a structured article based on an exam's title and description. It then automatically adds a Call-To-Action block linking back to that exam program and schedules the post for future publication on your WordPress site based on your chosen start date and interval.</p>` },
    { title: "Chapter 12: Onboarding", content: `<h2 class="text-3xl font-bold font-display" id="ch12">Chapter 12: The Complete Onboarding Workflow</h2><p>This chapter provides the definitive, step-by-step workflow for launching a new examination portal for a client or brand.</p><ol><li><strong>Host React App:</strong> Add the new tenant's subdomain to your React app's hosting provider (e.g., Vercel).</li><li><strong>Set Up WordPress:</strong> Install WordPress, WooCommerce, and the generated <code>mco-exam-integration-engine.zip</code> plugin.</li><li><strong>Critical Config:</strong> Edit <code>wp-config.php</code> to add a unique <code>MCO_JWT_SECRET</code>. Then, in WordPress, go to <strong>Exam App Engine → Main Settings</strong> and add your React app's URL.</li><li><strong>Generate & Deploy Blueprint:</strong> Go to <strong>Settings & Tools → Tools</strong> and click "Generate & Download Blueprint". Add this new JSON file to your React app's <code>/public</code> directory. Update <code>services/apiConfig.ts</code> to map the new domain to this config file. Commit and deploy the React app.</li><li><strong>Go Live:</strong> The new tenant portal is now live and ready for content.</li></ol>` },
    { title: "Chapter 13: Integration", content: `<h2 class="text-3xl font-bold font-display" id="ch13">Chapter 13: Plugin Integration & Shortcodes</h2><p>The plugin provides shortcodes to integrate the headless app with your WordPress site.</p><ul><li><strong><code>[mco_exam_login]</code>:</strong> Place on an <code>/exam-login/</code> page. This handles the entire SSO process.</li><li><strong><code>[mco_exam_showcase]</code>:</strong> Embeds dynamic "exam cards" into any page. Use with an <code>id</code> attribute (e.g., <code>[mco_exam_showcase id="prod-12345"]</code>) to show a single program.</li></ul><h3 class="text-xl font-bold mt-6">Purchase Notifier Script</h3><p>A standalone HTML/CSS/JS snippet is available in the in-app admin panel under <strong>Admin → Integration</strong>. You can copy this code and paste it into a "Custom HTML" block in your site's footer to add a social proof pop-up to your main WordPress site.</p>` }
];


const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeChapterIndex, setActiveChapterIndex] = useState(1); // Start at Title Page
    const pdfPrintRef = useRef<HTMLDivElement>(null);
    const rightPageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (rightPageRef.current) {
            rightPageRef.current.scrollTop = 0;
        }
    }, [activeChapterIndex]);

    const generatePdf = async () => {
        if (!pdfPrintRef.current) return;

        setIsGeneratingPdf(true);
        const toastId = toast.loading('Initializing PDF generator...');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;

            const renderContainer = pdfPrintRef.current;
            renderContainer.innerHTML = ''; 

            // Step 1: Render Cover Page using html2canvas
            toast.loading('Step 1/3: Generating cover page...', { id: toastId });
            const coverElement = document.createElement('div');
            coverElement.style.width = `${pageWidth}pt`;
            coverElement.style.height = `${pageHeight}pt`;
            coverElement.innerHTML = chapters[0].content;
            renderContainer.appendChild(coverElement);
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
            renderContainer.innerHTML = '';

            // Step 2: Combine all other chapters for jsPDF's html method
            toast.loading('Step 2/3: Processing handbook content...', { id: toastId });
            let allContentHtml = '';
            for (let i = 1; i < chapters.length; i++) {
                allContentHtml += `<div style="page-break-before: always;">${chapters[i].content}</div>`;
            }
            
            const contentEl = document.createElement('div');
            contentEl.className = 'handbook-pdf-content';
            contentEl.innerHTML = allContentHtml;
            renderContainer.appendChild(contentEl);
            
            await pdf.html(contentEl, {
                callback: (doc) => {
                    // Step 3: Add Page Numbers and Save
                    toast.loading('Step 3/3: Finalizing document...', { id: toastId });
                    const pageCount = doc.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor('#64748b');
                    for (let i = 2; i <= pageCount; i++) { // Skip cover page
                        doc.setPage(i);
                        doc.text(`Page ${i - 1} of ${pageCount - 1}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
                    }
                    doc.save('Administrator_Handbook.pdf');
                    toast.success('Handbook downloaded successfully!', { id: toastId });
                    renderContainer.innerHTML = '';
                    setIsGeneratingPdf(false);
                },
                margin: [margin, margin, margin, margin],
                autoPaging: 'text',
                html2canvas: { scale: 0.7, useCORS: true, logging: false },
                x: 0,
                y: 0,
                width: pageWidth - (margin * 2),
                windowWidth: pageWidth
            });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
            setIsGeneratingPdf(false);
        }
    };
    
    const handleTocClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        const chapterIndexStr = link?.dataset.chapterIndex;
        if (chapterIndexStr) {
            e.preventDefault();
            const newIndex = parseInt(chapterIndexStr, 10);
            if (!isNaN(newIndex)) {
                setActiveChapterIndex(newIndex);
            }
        }
    };

    const handlePrev = () => setActiveChapterIndex(prev => Math.max(1, prev - 1));
    const handleNext = () => setActiveChapterIndex(prev => Math.min(chapters.length - 1, prev + 1));

    const tocContentChapter = chapters[2].content;

    return (
        <div className="space-y-4">
            {/* Hidden div for PDF rendering */}
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0" aria-hidden="true"></div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                        <BookOpen /> Administrator Handbook
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mt-2">A comprehensive guide to the Examination Engine.</p>
                </div>
                <button
                    onClick={generatePdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-slate-400"
                >
                    {isGeneratingPdf ? <Spinner /> : <Download size={18} />}
                    {isGeneratingPdf ? 'Generating...' : 'Download as PDF'}
                </button>
            </div>

            <div className="flipbook-container">
                <div className="flipbook-spread">
                    <div className="flipbook-spine" aria-hidden="true"></div>
                    <div className="flipbook-page" onClick={handleTocClick}>
                        <div className="handbook-content" dangerouslySetInnerHTML={{ __html: tocContentChapter }} />
                    </div>
                    <div className="flipbook-page" ref={rightPageRef}>
                        <div className="handbook-content" dangerouslySetInnerHTML={{ __html: chapters[activeChapterIndex].content }} />
                    </div>
                </div>
                <nav className="flipbook-nav" aria-label="Handbook navigation">
                    <button onClick={handlePrev} disabled={activeChapterIndex <= 1} aria-label="Previous page"><ChevronLeft size={16} className="inline"/> Previous</button>
                    <span aria-live="polite">{chapters[activeChapterIndex].title}</span>
                    <button onClick={handleNext} disabled={activeChapterIndex >= chapters.length - 1} aria-label="Next page">Next <ChevronRight size={16} className="inline"/></button>
                </nav>
            </div>
        </div>
    );
};

export default Handbook;