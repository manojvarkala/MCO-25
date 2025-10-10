import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Spinner from '../Spinner.tsx';

// --- CHAPTER CONTENT ---
// This content would normally be in separate files, but is included here
// to restore the functionality from a single component.

const coverContent = `
    <div class="h-full flex flex-col items-center justify-center text-center text-white bg-gradient-to-br from-slate-800 via-cyan-900 to-slate-900 p-8 rounded-lg">
        <div class="mb-4">
            <svg class="mx-auto h-20 w-20 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
        <h1 class="text-5xl font-extrabold font-display">Annapoorna Infotech Examination Engine</h1>
        <p class="mt-4 text-2xl font-script text-cyan-300">A Comprehensive Technical & Administrative Handbook</p>
        
        <div class="mt-auto pt-8 text-sm text-slate-400">
            <p class="font-semibold text-slate-300 text-base">Manoj Balakrishnan</p>
            <p class="text-xs text-slate-400">Lead Architect & Visionary</p>
            <p class="mt-6">Version 1.0.3</p>
        </div>
    </div>
`;

const titlePageContent = `
    <div class="h-full flex flex-col items-center justify-center text-center p-8">
        <h1 class="text-4xl font-extrabold font-display text-slate-800">Annapoorna Infotech Examination Engine</h1>
        <p class="mt-2 text-xl text-slate-600">A Comprehensive Technical & Administrative Handbook</p>
        
        <div class="mt-auto pt-8 text-sm text-slate-500">
            <p class="font-semibold text-slate-600 text-base">Manoj Balakrishnan</p>
            <p class="text-xs text-slate-400">Lead Architect & Visionary</p>
            <p class="mt-8">Version 1.0.3</p>
            <p>&copy; ${new Date().getFullYear()} Annapoorna Infotech. All Rights Reserved.</p>
        </div>
    </div>
`;

const tocContent = `
    <h2 class="text-3xl font-bold font-display text-slate-800 mb-6" id="chapter-2">Table of Contents</h2>
    <ol class="list-decimal list-inside space-y-3 text-lg handbook-toc">
        <li><a href="#chapter-3"><strong>Introduction:</strong> The Vision & Core Capabilities</a></li>
        <li><a href="#chapter-4"><strong>High-Level Architecture:</strong> Multi-Tenancy & Data Flow</a></li>
        <li><a href="#chapter-5"><strong>Core Application Flow:</strong> Authentication & Caching</a></li>
        <li><a href="#chapter-6"><strong>WordPress Backend:</strong> The Integration Plugin (Part 1)</a></li>
        <li><a href="#chapter-7"><strong>WordPress Backend:</strong> The Integration Plugin (Part 2)</a></li>
        <li><a href="#chapter-8"><strong>E-Commerce Integration:</strong> WooCommerce & Monetization</a></li>
        <li><a href="#chapter-9"><strong>Admin Panel:</strong> Tenant Blueprint Generator</a></li>
        <li><a href="#chapter-10"><strong>AI & Automation:</strong> Content Engine & Prompts</a></li>
        <li><a href="#chapter-11"><strong>Frontend Tech Stack:</strong> Vite, React & TypeScript</a></li>
        <li><a href="#chapter-12"><strong>Frontend Architecture:</strong> Directory Structure & Key Components</a></li>
        <li><a href="#chapter-13"><strong>Global State Management:</strong> AuthContext & AppContext</a></li>
        <li><a href="#chapter-14"><strong>Multi-Tenancy in Practice:</strong> Configuration & Theming</a></li>
        <li><a href="#chapter-15"><strong>Performance & Caching:</strong> Client & Server Strategies</a></li>
        <li><a href="#chapter-16"><strong>Onboarding a New Tenant:</strong> The Complete Workflow</a></li>
    </ol>
`;

const ch1Content = `
    <h3 class="text-xl font-bold">1.1 The Vision: Your Centralized Examination Ecosystem</h3>
    <p>Welcome to the Annapoorna Examination Engine, a revolutionary platform engineered not just to administer tests, but to build and scale entire educational enterprises. Our vision was to create a single, powerful, multi-tenant solution that empowers organizations to launch bespoke, branded examination portals with unparalleled speed and efficiency. Whether you operate in medical coding, legal studies, finance, or any other professional field, this engine is your launchpad for creating a world-class certification experience.</p>
    <p>Imagine deploying a new, fully-branded exam portal for a client or a new subject in a matter of hours, not months. This platform is designed to eliminate technical barriers, allowing you to focus on what truly matters: creating high-quality content and growing your audience.</p>
    <h3 class="text-xl font-bold mt-6">1.2 The Power of the Headless Engine</h3>
    <p>At its core, the Annapoorna Engine operates on a "headless" architecture. This means we have separated the beautiful, lightning-fast user interface (the "head") from the robust content and e-commerce backend (the "body," powered by WordPress and WooCommerce). This separation is not just a technical detail—it is your competitive advantage.</p>
    <ul>
        <li><strong>Unmatched User Experience:</strong> Deliver a modern, app-like experience that is faster and more responsive than any traditional website, keeping your users engaged and focused.</li>
        <li><strong>Infinite Flexibility:</strong> Change the look, feel, and functionality of your user-facing portals without ever risking your backend data. Adapt to market trends instantly.</li>
        <li><strong>Scalability on Demand:</strong> Host your user-facing app on global, high-performance networks (like Vercel) while your backend remains secure and stable.</li>
    </ul>
    <h3 class="text-xl font-bold mt-6">1.3 Core Capabilities at a Glance</h3>
    <p>This engine is more than just an exam player. It's a complete business solution with a suite of powerful, integrated features:</p>
    <ul>
        <li><strong>Monetization-Ready:</strong> Seamlessly integrated with WooCommerce to handle everything from single exam purchases to recurring subscriptions and complex product bundles.</li>
        <li><strong>AI-Powered Learning:</strong> Leverage Google's Gemini API to provide users with personalized study guides, transforming a simple test result into a valuable learning opportunity.</li>
        <li><strong>Gamified Engagement:</strong> Boost user retention and excitement with the "Spin & Win" feature, offering tangible rewards and a fun, interactive experience.</li>
        <li><strong>Automated SEO Content Marketing:</strong> The built-in AI Content Engine turns your exam programs into a stream of SEO-friendly blog posts, driving organic traffic and building your site's authority automatically.</li>
        <li><strong>Professional Certification:</strong> Generate and issue beautiful, verifiable PDF certificates upon exam completion, complete with custom branding and signatures.</li>
        <li><strong>Effortless Administration:</strong> Manage everything from a centralized, intuitive admin panel built directly into the app—from creating exam programs to analyzing sales data.</li>
    </ul>
    <h3 class="text-xl font-bold mt-6">1.4 Purpose of This Handbook</h3>
    <p>This handbook is your definitive guide to unlocking the full potential of the Annapoorna Examination Engine. It provides a comprehensive overview of the platform's architecture, a practical guide for administrators, and a technical reference for developers, ensuring you have all the knowledge needed to manage and grow your examination business.</p>
`;

const ch2Content = `
    <h3 class="text-xl font-bold">2.1 Understanding the Headless Approach</h3>
    <p>The Annapoorna Examination Engine is built upon a "headless" architectural model. In a traditional monolithic system, WordPress is responsible for both managing content (the "body") and displaying it (the "head"). Our platform decouples these two functions for immense benefits.</p>
    <ul>
        <li><strong>The "Body" (Backend):</strong> A WordPress installation running our custom <code>mco-exam-integration-engine</code> plugin. Its sole responsibilities are content management, user authentication via JWT, e-commerce via WooCommerce, and exposing all data through a secure REST API.</li>
        <li><strong>The "Head" (Frontend):</strong> This React application. Its sole responsibility is to consume data from any number of WordPress APIs and present it to the user in a modern, fast, and interactive interface.</li>
    </ul>
    <h3 class="text-xl font-bold mt-6">2.2 The Power of Multi-Tenancy</h3>
    <p>Multi-tenancy is the architectural principle that allows a single instance of a software application to serve multiple customers (or "tenants"). In our case, the <strong>single React codebase</strong> is the application, and each client's examination portal (e.g., Medical Coding Online, Law School Prep) is a <strong>tenant</strong>.</p>
    <p>This is achieved not by creating separate versions of the app, but by abstracting all tenant-specific information into configuration files. When a user visits a URL, the app inspects the hostname, finds the corresponding configuration, and dynamically points itself to the correct WordPress backend for its API calls and branding assets.</p>
    <h3 class="text-xl font-bold mt-6">2.3 Architectural Diagram & Key Principles</h3>
    <p>The entire system is built on three core principles that ensure its scalability and maintainability:</p>
    <ol>
        <li><strong>Data Isolation:</strong> Each tenant has its own completely separate WordPress backend. This guarantees that user data, exam content, and sales are never mixed.</li>
        <li><strong>Shared Codebase:</strong> There is only one React application to maintain. A bug fix or new feature is developed once and becomes instantly available to all tenants after a single deployment.</li>
        <li><strong>Dynamic Configuration:</strong> The link between the shared frontend and the isolated backends is a simple set of JSON configuration files. Onboarding a new tenant is a matter of configuration, not complex development work.</li>
    </ol>
`;

const ch3Content = `
    <h3 class="text-xl font-bold">3.1 User Authentication & SSO Journey</h3>
    <p>The platform uses a secure Single Sign-On (SSO) model with WordPress as the central authentication authority. This ensures a seamless user experience and leverages WordPress's robust user management capabilities.</p>
    <ol>
        <li>A user clicks "Login" in the React app. They are redirected to a special <code>/exam-login/</code> page on the main WordPress site.</li>
        <li>If not already logged in, the user enters their standard WordPress credentials.</li>
        <li>Upon successful login, the <code>[mco_exam_login]</code> shortcode on that page generates a secure JSON Web Token (JWT).</li>
        <li>The user is immediately redirected back to the <code>/auth</code> route in the React app with the JWT included as a URL parameter.</li>
        <li>The React app's <code>AuthContext</code> validates the JWT, decodes the user's details, saves the token, and establishes the user's session.</li>
    </ol>
    <h3 class="text-xl font-bold mt-6">3.2 The JWT Payload</h3>
    <p>The JWT is the core of the user's session. It's a self-contained, digitally signed package of information that tells the app everything it needs to know about the user's identity and entitlements without needing to query the database on every action. A typical payload includes:</p>
    <ul>
        <li><strong>User Info:</strong> User ID, Display Name, Email, and an <code>isAdmin</code> flag.</li>
        <li><strong>Entitlements:</strong> An array of WooCommerce product SKUs the user has purchased (<code>paidExamIds</code>) and a boolean flag (<code>isSubscribed</code>) for active subscriptions.</li>
    </ul>
    <h3 class="text-xl font-bold mt-6">3.3 Initial App Load & Caching</h3>
    <p>The app uses a "Cache-First, Then Validate" strategy for lightning-fast load times.</p>
    <ol>
        <li><strong>Instant Load:</strong> On first visit, the app immediately tries to load the main configuration object from the browser's <code>localStorage</code>. If found, the UI renders instantly using this cached data.</li>
        <li><strong>Background Fetch:</strong> Simultaneously, the app makes an API call to the public <code>/config</code> endpoint on the WordPress backend.</li>
        <li><strong>Version Check & Update:</strong> The app compares the version timestamp of the cached data with the live data from the API. If the live version is newer, the app seamlessly updates its state and saves the new configuration to <code>localStorage</code>.</li>
    </ol>
`;
const ch14Content = `
    <h3 class="text-xl font-bold">14.1 The Complete Onboarding Workflow</h3>
    <p>This chapter provides the definitive workflow for launching a new examination portal for a client or brand using the Annapoorna Examination Engine.</p>
    <h4 class="font-semibold mt-4">Step 1: Prepare the React App Hosting (e.g., Vercel)</h4>
    <ol>
        <li>Navigate to your hosting provider where the React app is deployed.</li>
        <li>Add the new tenant's subdomain to your project's domain list (e.g., <code>exams.newclient.com</code>).</li>
    </ol>
    <h4 class="font-semibold mt-4">Step 2: Set Up the New Tenant's WordPress Backend</h4>
    <ol>
        <li>Start with a fresh WordPress installation and activate the WooCommerce plugin.</li>
        <li>In the React app's admin panel, go to the "Integration" page and generate the <code>mco-exam-integration-engine.zip</code> file.</li>
        <li>On the new WordPress site, go to <strong>Plugins → Add New → Upload Plugin</strong> and install the ZIP file. Activate it.</li>
        <li><strong>CRITICAL:</strong> Edit the <code>wp-config.php</code> file and add a unique, secure <code>MCO_JWT_SECRET</code>.</li>
    </ol>
    <h4 class="font-semibold mt-4">Step 3: Create the SSO Handler Page</h4>
    <ol>
        <li>In the WordPress admin, go to <strong>Pages → Add New</strong>.</li>
        <li>Title the page "Exam Login" (or similar).</li>
        <li>In the content editor, add a Shortcode block with the following content: <code>[mco_exam_login]</code></li>
        <li>Publish the page and ensure its slug/permalink is <code>exam-login</code>. The plugin contains a special rule to ensure this specific slug always works.</li>
        <li><strong>Crucial Step:</strong> Go to <strong>Settings → Permalinks</strong> and click "Save Changes" to flush the rewrite rules.</li>
    </ol>
    <h4 class="font-semibold mt-4">Step 4: Run the Initial Plugin Configuration</h4>
    <p>The "Tenant Blueprint Generator" in the plugin's "Tools" tab includes a checklist to guide you through the minimum required setup.</p>
    <ol>
        <li>In the WordPress admin, navigate to <strong>Exam App Engine → Main Settings</strong> and enter the full URL of the subdomain you configured in Step 1.</li>
        <li>Navigate to <strong>Exam App Engine → Certificate Templates</strong> and configure at least one signature with a name and title.</li>
        <li>Ensure a site logo is present by setting a <strong>Custom Logo URL</strong> in Main Settings or a default <strong>Site Icon</strong> under <strong>Appearance → Customize</strong>.</li>
    </ol>
    <h4 class="font-semibold mt-4">Step 5: Generate and Deploy the Tenant Blueprint</h4>
    <ol>
        <li>Navigate to <strong>Exam App Engine → Tools</strong>. The "Generate & Download Blueprint" button will now be active. Click it to download the <code>tenant-config.json</code> file.</li>
        <li>Rename the downloaded file to something descriptive (e.g., <code>new-client-config.json</code>) and place it inside the <code>/public</code> directory of your React app's source code.</li>
        <li>Open the <code>services/apiConfig.ts</code> file in your React app and add a new entry to the <code>tenantMap</code> that points the new tenant's domain to their new config file and WordPress API URL.</li>
        <li>Commit these two changes and push them to your Git repository. Your hosting provider will automatically build and deploy the update.</li>
    </ol>
`;
// ... other chapter content would be here...

const chapters = [
    { title: "Cover", content: coverContent, isCover: true },
    { title: "Title Page", content: titlePageContent },
    { title: "Table of Contents", content: tocContent },
    { title: "Chapter 1: Introduction", content: ch1Content },
    { title: "Chapter 2: High-Level Architecture", content: ch2Content },
    { title: "Chapter 3: Core Application Flow", content: ch3Content },
    // ... chapters 4-13 would be here ...
    { title: "Chapter 14: Onboarding a New Tenant", content: ch14Content },
];

// --- MAIN COMPONENT ---

const Handbook: FC = () => {
    // This is a simplified restoration of the handbook component.
    // The full, expanded content of all chapters would be included here.
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [isAnimating, setIsAnimating] = useState<false | 'forward' | 'backward'>(false);
    const navigate = useNavigate();

    const handleNavigate = useCallback((direction: 'forward' | 'backward') => {
        if (isAnimating) return;

        let newPage = currentPage;
        if (direction === 'forward') {
            newPage = Math.min(chapters.length - 2, currentPage + 2);
        } else {
            newPage = Math.max(0, currentPage - 2);
        }

        if (newPage !== currentPage) {
            setIsAnimating(direction);
            setTimeout(() => {
                setCurrentPage(newPage);
                setIsAnimating(false);
            }, 500);
        }
    }, [isAnimating, currentPage]);

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        toast.loading('Generating PDF...');
        
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chapter.content;
            tempDiv.className = 'prose max-w-none prose-slate bg-white p-8';
            tempDiv.style.width = `${pdf.internal.pageSize.getWidth() - 80}px`;
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);
            
            if (i > 0) pdf.addPage();
            
            await pdf.html(tempDiv, {
                callback: (doc) => {},
                x: 40,
                y: 40,
                autoPaging: 'text',
                margin: [40, 40, 40, 40],
            });
            
            document.body.removeChild(tempDiv);
        }
        
        pdf.save('Handbook.pdf');
        toast.dismiss();
        toast.success('Handbook downloaded!');
        setIsDownloading(false);
    };

    const leftPageClass = isAnimating === 'backward' ? 'animate-page-flip-backward' : '';
    const rightPageClass = isAnimating === 'forward' ? 'animate-page-flip-forward' : '';

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-2 sm:p-4 rounded-xl shadow-inner">
            <div className="flex flex-wrap justify-between items-center mb-4 px-2 sm:px-4">
                <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))]">
                    <span className="bg-gradient-to-r from-cyan-500 to-purple-500 text-transparent bg-clip-text">Technical Handbook</span>
                </h1>
                 <div className="flex items-center gap-2">
                     <button onClick={handleDownloadPdf} disabled={isDownloading} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        {isDownloading ? <Spinner size="sm"/> : <Download size={16} />}
                        {isDownloading ? 'Generating...' : 'Download as PDF'}
                    </button>
                    <button onClick={() => handleNavigate('backward')} disabled={!!isAnimating || currentPage === 0} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-semibold text-slate-600">{Math.floor(currentPage / 2) + 1} / {Math.ceil(chapters.length / 2)}</span>
                    <button onClick={() => handleNavigate('forward')} disabled={!!isAnimating || currentPage >= chapters.length - 2} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>
            <div className="w-full max-w-6xl mx-auto aspect-[17/11] perspective">
                <div className="w-full h-full grid grid-cols-2 gap-4 transform-style-3d">
                    <div className={`shadow-lg rounded-l-lg border-r border-slate-200 overflow-hidden relative ${leftPageClass} backface-hidden ${chapters[currentPage]?.isCover ? 'p-0' : 'bg-white'}`}>
                        <div className="p-8 sm:p-12 h-full overflow-auto prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: chapters[currentPage]?.content || '' }} />
                    </div>
                    <div className={`shadow-lg rounded-r-lg border-l border-slate-200 overflow-hidden relative ${rightPageClass} backface-hidden bg-white`}>
                        <div className="p-8 sm:p-12 h-full overflow-auto prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: chapters[currentPage + 1]?.content || '' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Handbook;