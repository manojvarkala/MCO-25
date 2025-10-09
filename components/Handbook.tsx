import React, { FC, useState, useMemo, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// FIX: Added missing import for 'toast' to resolve 'Cannot find name' errors.
import toast from 'react-hot-toast';

// --- CHAPTER DATA ---
// All content is stored here. New chapters can be added to this array.
const chapters = [
    {
        id: 'toc',
        title: 'Table of Contents',
        content: `
            <p>This handbook serves as the definitive guide to the architecture, features, and administration of the Annapoorna Examination Engine.</p>
        `
    },
    {
        id: 'ch1',
        title: 'Chapter 1: Introduction',
        content: `
            <h3 class="text-xl font-bold">1.1 The Vision: A Unified, Multi-Brand Examination Platform</h3>
            <p>The Annapoorna Examination Engine was conceived as a powerful, multi-tenant platform capable of serving customized exam experiences for various brands or subjects (e.g., medical coding, law, finance) from a single, unified codebase.</p>
            <h3 class="text-xl font-bold mt-4">1.2 Purpose of This Handbook</h3>
            <p>This document provides a comprehensive overview of the platform's architecture, a practical guide for administrators and content managers, and a technical reference for developers.</p>
            <h3 class="text-xl font-bold mt-4">1.3 Intended Audience</h3>
            <ul class="list-disc pl-5">
                <li><strong>Administrators:</strong> Individuals responsible for onboarding new tenants, managing global settings, and overseeing the platform's health.</li>
                <li><strong>Content Managers:</strong> Users who create and manage exam programs, WooCommerce products, and other content within the WordPress backend.</li>
                <li><strong>Developers:</strong> Engineers responsible for maintaining, extending, and deploying the React frontend or the WordPress backend plugin.</li>
            </ul>
        `
    },
    {
        id: 'ch2',
        title: 'Chapter 2: The Headless, Multi-Tenant Model',
        content: `
            <h3 class="text-xl font-bold">2.1 Understanding the Headless Approach</h3>
            <p>The platform is built upon a "headless" model. Unlike a traditional website where the backend (like WordPress) controls both content and presentation, we decouple these two functions:</p>
            <ul>
                <li><strong>The "Body" (Backend):</strong> A WordPress installation with our custom plugin. Its sole job is to manage content, users, and e-commerce, and expose this data via a secure REST API.</li>
                <li><strong>The "Head" (Frontend):</strong> This React application. Its sole job is to fetch data from the API and present it to the user in a modern, fast, and interactive interface.</li>
            </ul>
            <p>This approach offers superior flexibility, performance, and security compared to monolithic systems.</p>

            <h3 class="text-xl font-bold mt-4">2.2 The Power of Multi-Tenancy</h3>
            <p>Multi-tenancy allows a single instance of software to serve multiple customers (or "tenants"). In our case, the <strong>single React codebase</strong> is the application, and each client's examination portal is a <strong>tenant</strong>.</p>
            <p>This is achieved by abstracting all tenant-specific information into configuration files. When a user visits a URL (e.g., <code>exams.coding-online.net</code>), the app identifies the hostname, loads the correct configuration, and points all API calls to the correct WordPress backend. This makes onboarding new clients a matter of configuration, not new development.</p>
        `
    },
    {
        id: 'ch3',
        title: 'Chapter 3: The End-to-End Data Flow',
        content: `
            <h3 class="text-xl font-bold">3.1 User Authentication & SSO Journey</h3>
            <p>The platform uses a Single Sign-On (SSO) model with WordPress as the authentication authority.</p>
            <ol>
                <li>A user clicks "Login" in the React app and is redirected to a special <code>/exam-login/</code> page on the main WordPress site.</li>
                <li>If not logged into WordPress, they are shown the standard WP login form.</li>
                <li>Upon successful WP login, the <code>[mco_exam_login]</code> shortcode on that page generates a secure JSON Web Token (JWT).</li>
                <li>The user is immediately redirected back to the React app with the JWT in the URL parameters.</li>
                <li>The React app's AuthContext validates the JWT, decodes the user's details and permissions (e.g., purchased exams), saves them to local storage, and establishes the user's session within the app.</li>
            </ol>

            <h3 class="text-xl font-bold mt-4">3.2 Initial App Load: Caching & Configuration</h3>
            <p>The app is designed for speed using a "Cache-First, Then Validate" strategy.</p>
            <ol>
                <li><strong>First Visit:</strong> The app fetches the main configuration object from the WordPress API. This object contains all exams, programs, books, prices, etc. It is then saved to the browser's <code>localStorage</code>.</li>
                <li><strong>Subsequent Visits:</strong> The app loads <strong>instantly</strong> using the data from <code>localStorage</code>. In the background, it makes an API call to check the configuration's version number. If the server has a newer version, the app silently downloads it, updates the cache, and shows a toast notification to the user that the content has been updated.</li>
            </ol>
            
            <h3 class="text-xl font-bold mt-4">3.3 Exam Lifecycle: Start, Progress, Submission, and Syncing</h3>
            <p>Exam progress is saved locally to prevent data loss from network issues.</p>
            <ul>
                <li><strong>Start:</strong> When an exam begins, questions are fetched from the linked Google Sheet (via a server-side proxy for security and caching) and the timer starts.</li>
                <li><strong>Progress:</strong> Every time an answer is changed, the current state (answers, current question index) is saved to <code>localStorage</code>. If the user closes the browser, they can resume exactly where they left off.</li>
                <li><strong>Submission:</strong> When a test is submitted, the result is calculated and immediately saved to <code>localStorage</code> for a fast UI update. Simultaneously, the result is sent to the WordPress backend via the API to be saved permanently to the user's profile.</li>
            </ul>
        `
    },
    {
        id: 'ch4',
        title: 'Chapter 4: Plugin Core & Content Structure',
        content: `
            <h3 class="text-xl font-bold">4.1 Plugin File Architecture</h3>
            <p>The <code>mco-exam-integration-engine</code> plugin is organized into several key files within its <code>/includes/</code> directory:</p>
            <ul>
                <li><strong><code>mco-cpts.php</code>:</strong> Defines the Custom Post Types ("Exam Programs", "Recommended Books") and their associated custom taxonomies.</li>
                <li><strong><code>mco-data.php</code>:</strong> Contains functions for querying and structuring all data that will be sent to the React app. This is the heart of the data layer.</li>
                <li><strong><code>mco-api.php</code>:</strong> Registers all WordPress REST API endpoints, handles JWT generation/validation, and manages security permissions for each route.</li>
                <li><strong><code>mco-admin.php</code>:</strong> Builds the entire "Exam App Engine" admin menu, settings pages, and tools within the WordPress dashboard.</li>
                <li><strong><code>mco-shortcodes.php</code>:</strong> Defines the shortcodes like <code>[mco_exam_showcase]</code> and the critical <code>[mco_exam_login]</code> for handling SSO.</li>
            </ul>

            <h3 class="text-xl font-bold mt-4">4.2 Custom Post Type: "Exam Programs"</h3>
            <p>This is the central content unit. An "Exam Program" post in WordPress acts as a container that links together multiple pieces of data. Instead of using dozens of post meta fields, it primarily uses custom taxonomies for settings like question counts and durations, which proved to be a more flexible approach during early development.</p>

            <h3 class="text-xl font-bold mt-4">4.3 Custom Post Type: "Recommended Books"</h3>
            <p>This simple CPT is used to manage suggested study materials. Each post represents a book and contains custom meta fields for Amazon affiliate links for different regions (.com, .in, .ae).</p>
        `
    },
    {
        id: 'ch5',
        title: 'Chapter 5: The REST API & Security Model',
        content: `
            <h3 class="text-xl font-bold">5.1 Namespace and Endpoint Philosophy</h3>
            <p>All API routes are consolidated under the <code>/wp-json/mco-app/v1/</code> namespace. The endpoints are designed to be resource-oriented and stateless.</p>
            <ul>
                <li><strong><code>/config</code> (GET):</strong> The main public endpoint that provides the bulk of the application's configuration. It is heavily cached on the server-side using WordPress Transients.</li>
                <li><strong>User-Specific Routes (POST/GET):</strong> Endpoints like <code>/submit-result</code> or <code>/user-results</code> are protected and require a valid JWT.</li>
                <li><strong>Admin Routes (POST/GET):</strong> Endpoints under <code>/admin/*</code> are protected and require a JWT with administrator privileges.</li>
            </ul>
            
            <h3 class="text-xl font-bold mt-4">5.2 Security: JWT Authentication and CORS</h3>
            <p>Authentication is handled exclusively via JSON Web Tokens (JWT). The secret key for signing these tokens <strong>must</strong> be defined in <code>wp-config.php</code> as <code>define('MCO_JWT_SECRET', 'your-secret-key');</code>.</p>
            <p>Cross-Origin Resource Sharing (CORS) is strictly enforced. The plugin will only accept API requests from the URLs specified in the "Exam Application URL(s)" field in the Main Settings. This is a critical security measure to prevent unauthorized websites from interacting with your API.</p>
        `
    },
    {
        id: 'ch6',
        title: 'Chapter 6: WooCommerce Integration',
        content: `
            <h3 class="text-xl font-bold">6.1 Linking Products via SKU</h3>
            <p>The Stock Keeping Unit (SKU) is the critical link between the content (Exam Programs) and the e-commerce engine (WooCommerce).</p>
            <ul>
                <li>When you create a "Simple Product" in WooCommerce, you assign it a unique SKU (e.g., <code>exam-cpc-cert</code>).</li>
                <li>In the "Exam Program Customizer" within the React app, you link that program to the WooCommerce product by selecting the same SKU.</li>
            </ul>
            <p>When a user buys the product, its SKU is added to their list of entitlements. When they log into the app, the JWT payload includes this list of SKUs, which the app uses to unlock the corresponding certification exams.</p>

            <h3 class="text-xl font-bold mt-4">6.2 Handling Subscriptions and Bundles</h3>
            <p>The system supports three main product types managed in the "Product Customizer":</p>
            <ul>
                <li><strong>Simple Products:</strong> A one-time purchase for a single certification exam.</li>
                <li><strong>Subscriptions:</strong> Utilizes the WooCommerce Subscriptions plugin. These products have SKUs like <code>sub-monthly</code> or <code>sub-yearly</code>.</li>
                <li><strong>Bundles:</strong> These are custom-defined products that group other SKUs together (e.g., one certification exam SKU + one subscription SKU). This logic is managed by the app and plugin, not WooCommerce's native bundling, for greater flexibility.</li>
            </ul>
        `
    },
    {
        id: 'ch7',
        title: 'Chapter 7: Content & Data Management',
        content: `
            <h3 class="text-xl font-bold">7.1 The Admin Panel</h3>
            <p>The "Exam App Engine" menu in WordPress provides several key tools:</p>
            <ul>
                <li><strong>Main Settings:</strong> Configure essential URLs and global features like the "Spin & Win" wheel.</li>
                <li><strong>Theme Selector:</strong> Set the default theme for the entire application.</li>
                <li><strong>Bulk Import:</strong> Upload CSV files to create or update exam programs and books in bulk.</li>
                <li><strong>Certificate Templates:</strong> A powerful editor to customize the text and signatures on all generated certificates.</li>
                <li><strong>Tools:</strong> Critical utilities for clearing server-side caches and generating tenant blueprints.</li>
            </ul>

            <h3 class="text-xl font-bold mt-4">7.2 Certificate Template Management</h3>
            <p>The certificate editor allows for full customization. You can use placeholders like <code>{examName}</code> and <code>{finalScore}</code>. For signatures, it is highly recommended to use a Base64 data URI instead of a URL. This embeds the image directly into the certificate, preventing issues with PDF generation where external URLs can be blocked by browser security policies.</p>

            <h3 class="text-xl font-bold mt-4">7.3 The Tenant Blueprint Generator</h3>
            <p>This tool, located in the "Tools" tab, is essential for the multi-tenant workflow. It generates a complete, ready-to-use JSON configuration file for a new tenant. It intelligently checks that all prerequisites (like a logo and signature) are configured before allowing the download, ensuring the generated file will work out-of-the-box when deployed with the React app.</p>
        `
    },
    {
        id: 'ch8',
        title: 'Chapter 8: The AI Content Engine Backend',
        content: `
            <h3 class="text-xl font-bold">8.1 The "Create Post" Endpoint</h3>
            <p>The AI Content Engine was architected to be secure and efficient. The call to the Gemini AI API happens on the client-side (in the React app), using an environment variable for the API key. This prevents the sensitive API key from ever being stored in the WordPress database.</p>
            <p>Once the React app receives the generated content from the AI, it sends it to a special, admin-only API endpoint on the WordPress backend: <code>/admin/create-post-from-app</code>.</p>
            
            <h3 class="text-xl font-bold mt-4">8.2 Scheduling Logic</h3>
            <p>This backend endpoint's sole responsibility is to take the provided title and content and create a WordPress post. It uses the standard <code>wp_insert_post</code> function. For scheduling, the React app calculates the future date and time for each post and sends it in UTC format. The backend then sets the <code>post_date_gmt</code> property, allowing WordPress to correctly handle the scheduling based on the site's configured timezone.</p>
        `
    },
    {
        id: 'ch9',
        title: 'Chapter 9: Technology Stack & Project Setup',
        content: `
            <h3 class="text-xl font-bold">9.1 Core Technologies</h3>
            <ul>
                <li><strong>Vite:</strong> The build tool, chosen for its extremely fast Hot Module Replacement (HMR) in development and optimized production builds.</li>
                <li><strong>React & TypeScript:</strong> Provides a robust, type-safe foundation for building the user interface.</li>
                <li><strong>Tailwind CSS:</strong> A utility-first CSS framework that allows for rapid and consistent styling.</li>
            </ul>

            <h3 class="text-xl font-bold mt-4">9.2 Key Dependencies</h3>
            <ul>
                <li><strong><code>react-router-dom</code>:</strong> Handles all client-side routing.</li>
                <li><strong><code>@google/genai</code>:</strong> The official Google SDK for interacting with the Gemini API.</li>
                <li><strong><code>jspdf</code> & <code>jspdf-autotable</code>:</strong> Used for dynamically generating PDF certificates and handbook downloads.</li>
                <li><strong><code>html2canvas</code>:</strong> Used to render React components into an image for PDF generation and social sharing.</li>
            </ul>
        `
    },
    {
        id: 'ch10',
        title: 'Chapter 10: Project Structure & Key Components',
        content: `
            <h3 class="text-xl font-bold">10.1 Directory Structure</h3>
            <p>The frontend codebase is organized for clarity and scalability:</p>
            <ul>
                <li><strong><code>/components</code>:</strong> Contains all React components, from small, reusable elements like <code>Spinner.tsx</code> to complex page views like <code>Dashboard.tsx</code>.</li>
                <li><strong><code>/context</code>:</strong> Holds the global state management logic using React's Context API.</li>
                <li><strong><code>/services</code>:</strong> Manages all external communication, including API calls (<code>googleSheetsService.ts</code>) and multi-tenant configuration (<code>apiConfig.ts</code>).</li>
                <li><strong><code>/public</code>:</strong> Stores static assets, including the tenant-specific JSON configuration files.</li>
            </ul>
        `
    },
    {
        id: 'ch11',
        title: 'Chapter 11: State Management: AuthContext & AppContext',
        content: `
            <h3 class="text-xl font-bold">11.1 AuthContext: Managing the User Session</h3>
            <p><code>AuthContext.tsx</code> is responsible for everything related to the authenticated user. It stores the user object, the JWT, and derived states like permissions and entitlements. It provides functions for <code>loginWithToken</code> and <code>logout</code>, which handle all interactions with <code>localStorage</code>.</p>

            <h3 class="text-xl font-bold mt-4">11.2 AppContext: Managing Tenant Configuration</h3>
            <p><code>AppContext.tsx</code> is responsible for fetching and managing the application's configuration. It handles the initial load, caching logic, and provides the <code>activeOrg</code> object (which contains all exams, themes, etc.) to the rest of the application. It also manages global UI state, such as the active theme and the visibility of modal windows.</p>
        `
    },
    {
        id: 'ch12',
        title: 'Chapter 12: Multi-Tenant Implementation',
        content: `
            <h3 class="text-xl font-bold">12.1 The Role of apiConfig.ts and the tenantMap</h3>
            <p>The entire multi-tenant system is orchestrated by <code>services/apiConfig.ts</code>. This file contains the <code>tenantMap</code>, an object that maps hostnames (e.g., "coding-online.net") to a configuration object.</p>

            <h3 class="text-xl font-bold mt-4">12.2 The Public JSON Configuration Files</h3>
            <p>Each configuration object in the <code>tenantMap</code> specifies two things:</p>
            <ol>
                <li><strong><code>apiBaseUrl</code>:</strong> The URL of the tenant's unique WordPress backend.</li>
                <li><strong><code>staticConfigPath</code>:</strong> The path to a JSON file in the <code>/public</code> directory (e.g., <code>/medical-coding-config.json</code>). This file serves as a static fallback, containing branding information and an older version of the content. This ensures the app can still load and function even if the backend API is temporarily down.</li>
            </ol>
        `
    },
    {
        id: 'ch13',
        title: 'Chapter 13: Caching & Performance Strategy',
        content: `
            <h3 class="text-xl font-bold">13.1 Server-Side Caching with WordPress Transients</h3>
            <p>The most expensive operation on the backend is generating the main <code>/config</code> object. To prevent this from running on every page load, the plugin uses the WordPress Transients API. The generated config object is stored in the database with an expiration time (typically 1 hour). Subsequent requests receive this cached version instantly. Clearing the cache via the "Tools" page in the plugin simply deletes this transient, forcing it to be regenerated on the next request.</p>

            <h3 class="text-xl font-bold mt-4">13.2 Client-Side Caching with localStorage</h3>
            <p>As described in Chapter 3, the React app uses the browser's <code>localStorage</code> to store the entire configuration object. This allows for near-instantaneous app loads on subsequent visits, as no network request is needed to render the initial UI.</p>
        `
    },
    {
        id: 'ch14',
        title: 'Chapter 14: Onboarding a New Tenant: A Step-by-Step Guide',
        content: `
            <p>This chapter provides the definitive workflow for launching a new examination portal for a client or brand using the Annapoorna Examination Engine.</p>
            <h3 class="text-xl font-bold mt-4">Prerequisites:</h3>
            <ul>
                <li>Access to the React application's hosting provider (e.g., Vercel).</li>
                <li>A fresh WordPress installation with WooCommerce activated.</li>
                <li>The <code>mco-exam-integration-engine.zip</code> plugin file, generated from the React app's admin panel.</li>
            </ul>

            <h3 class="text-xl font-bold mt-4">Step 1: Prepare the React App Hosting</h3>
            <p>Navigate to your hosting provider and add the new tenant's subdomain (e.g., <code>exams.newclient.com</code>) to your project's domain list.</p>

            <h3 class="text-xl font-bold mt-4">Step 2: Set Up the WordPress Backend</h3>
            <p>On the new WordPress installation, upload and activate the plugin. Then, edit your <code>wp-config.php</code> file and add a unique, secure <code>MCO_JWT_SECRET</code>.</p>
            
            <h3 class="text-xl font-bold mt-4">Step 3: Run the Initial Plugin Configuration</h3>
            <p>The "Tenant Blueprint Generator" includes a checklist to guide you. You must configure the App URL, a site logo, and at least one certificate signature before you can proceed.</p>

            <h3 class="text-xl font-bold mt-4">Step 4: Generate and Deploy the Tenant Blueprint</h3>
            <ol>
                <li>In WordPress, go to <strong>Exam App Engine → Tools</strong> and click "Generate & Download Blueprint".</li>
                <li>Place the downloaded JSON file in the <code>/public</code> directory of your React app source code.</li>
                <li>Open <code>services/apiConfig.ts</code> and add a new entry to the <code>tenantMap</code> that points the new tenant's domains to their new config file and API URL.</li>
                <li>Commit and push your changes. Your hosting provider will automatically deploy the update.</li>
            </ol>
            <p>The new tenant portal is now live and ready for content creation.</p>
        `
    },
];

const Handbook: FC = () => {
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);

    const handleDownload = useCallback(() => {
        const toastId = toast.loading('Generating PDF...');
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const tempContainer = document.createElement('div');
            document.body.appendChild(tempContainer);
            tempContainer.style.display = 'none';

            chapters.forEach((chapter, index) => {
                if (index === 0) return; // Skip ToC for PDF

                if (index > 1) {
                    doc.addPage();
                }

                doc.setFontSize(18);
                doc.setTextColor(15, 23, 42); // slate-900
                doc.text(chapter.title, 14, 22);

                // FIX: Corrected a type error by wrapping HTML content in a table, as jspdf-autotable expects an HTMLTableElement.
                // Use autoTable's html parsing for robust content rendering
                tempContainer.innerHTML = `<table><tbody><tr><td>${chapter.content}</td></tr></tbody></table>`;
                const table = tempContainer.querySelector('table');

                if (table) {
                    autoTable(doc, {
                        html: table,
                        startY: 30,
                        theme: 'plain',
                        styles: {
                            font: 'helvetica',
                            fontSize: 10,
                            textColor: [51, 65, 85], // slate-700
                        },
                        headStyles: {
                            textColor: [15, 23, 42],
                            fontStyle: 'bold',
                        },
                    });
                }
            });
            
            // Add page numbers
            const pageCount = doc.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175); // gray-400
                doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
            }

            doc.save('Annapoorna_Exam_Engine_Handbook.pdf');
            document.body.removeChild(tempContainer);
            toast.success('Handbook downloaded!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to download PDF.', { id: toastId });
        }
    }, []);

    const activeChapter = chapters[activeChapterIndex];

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <BookOpen />
                Annapoorna Exam Engine Handbook
            </h1>

            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] flex flex-col md:flex-row min-h-[70vh]">
                {/* Table of Contents */}
                <aside className="w-full md:w-1/3 lg:w-1/4 p-6 border-b md:border-b-0 md:border-r border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-lg font-bold mb-4">Contents</h2>
                    <nav className="space-y-2">
                        {chapters.map((chapter, index) => (
                            <button
                                key={chapter.id}
                                onClick={() => setActiveChapterIndex(index)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    activeChapterIndex === index
                                        ? 'bg-[rgba(var(--color-primary-rgb),0.1)] text-[rgb(var(--color-primary-rgb))]'
                                        : 'text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]'
                                }`}
                            >
                                {chapter.title}
                            </button>
                        ))}
                    </nav>
                     <div className="mt-6 pt-6 border-t border-[rgb(var(--color-border-rgb))]">
                        <button 
                            onClick={handleDownload}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
                        >
                            Download as PDF
                        </button>
                    </div>
                </aside>

                {/* Chapter Content */}
                <main className="w-full md:w-2/3 lg:w-3/4 p-8 flex flex-col">
                    <div className="flex-grow">
                        <h2 className="text-3xl font-bold text-[rgb(var(--color-primary-rgb))] mb-6 pb-4 border-b border-[rgb(var(--color-border-rgb))]">
                            {activeChapter.title}
                        </h2>
                        <div
                            className="prose prose-slate max-w-none"
                            dangerouslySetInnerHTML={{ __html: activeChapter.content }}
                        />
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 pt-6 border-t border-[rgb(var(--color-border-rgb))] flex justify-between">
                        <button
                            onClick={() => setActiveChapterIndex(prev => Math.max(0, prev - 1))}
                            disabled={activeChapterIndex === 0}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setActiveChapterIndex(prev => Math.min(chapters.length - 1, prev + 1))}
                            disabled={activeChapterIndex === chapters.length - 1}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Handbook;
