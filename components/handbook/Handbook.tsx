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

const ch4Content = `
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

const ch5Content = `
    <h3 class="text-xl font-bold">5.1 Namespace and Endpoint Philosophy</h3>
    <p>All API routes for the application are consolidated under a single, versioned namespace: <code>/wp-json/mco-app/v1/</code>. This approach keeps the application's endpoints cleanly separated from WordPress core and other plugins.</p>
    <ul>
        <li><strong>Public Endpoints:</strong> The main <code>/config</code> endpoint is public, requires no authentication, and is heavily cached on the server to handle high traffic during initial app loads.</li>
        <li><strong>User-Protected Endpoints:</strong> Routes like <code>/user-results</code> and <code>/submit-result</code> require a valid JWT from a logged-in user.</li>
        <li><strong>Admin-Protected Endpoints:</strong> Routes under <code>/admin/</code> (e.g., <code>/admin/update-exam-program</code>) require a valid JWT from a user with administrator privileges.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">5.2 Security: JWT Authentication</h3>
    <p>The platform uses JSON Web Tokens (JWT) for secure, stateless authentication. This is superior to cookie-based sessions for a headless application.</p>
    <ol>
        <li>When a user logs in, the WordPress backend signs a JWT using a secret key (the <code>MCO_JWT_SECRET</code> defined in <code>wp-config.php</code>).</li>
        <li>This token is sent to the React app, which stores it securely.</li>
        <li>For every subsequent request to a protected API endpoint, the React app includes the JWT in the <code>Authorization: Bearer [token]</code> HTTP header.</li>
        <li>The WordPress backend verifies the token's signature using the same secret key. If the signature is valid and the token has not expired, the request is processed. If not, a 403 Forbidden error is returned.</li>
    </ol>
    <p><strong>Crucially, the <code>MCO_JWT_SECRET</code> must be a unique, long, and random string. It should never be shared or committed to version control.</strong></p>

    <h3 class="text-xl font-bold mt-6">5.3 Security: CORS and Troubleshooting</h3>
    <p>Cross-Origin Resource Sharing (CORS) is a security mechanism that browsers use to prevent a web page from making requests to a different domain than the one that served the page. Since our React app and WordPress backend are on different domains, we must explicitly configure CORS.</p>
    <p>The plugin handles this automatically by reading the "Exam Application URL(s)" from the Main Settings. It adds the necessary HTTP headers (<code>Access-Control-Allow-Origin</code>) to every API response, telling the browser that it's safe for the React app to access the data.</p>
    
    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
        <p class="font-bold text-amber-800">Troubleshooting "Authorization Header Missing" Errors</p>
        <p class="text-amber-700">The most common API connection issue is this error. It almost always means your web server (often Apache or LiteSpeed) is stripping the <code>Authorization</code> header from requests before they reach WordPress. To fix this, you must add the following code to the very top of your <code>.htaccess</code> file in the WordPress root directory:</p>
        <pre class="whitespace-pre-wrap bg-slate-100 p-2 rounded my-1 text-xs"><code>&lt;IfModule mod_rewrite.c&gt;
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
&lt;/IfModule&gt;</code></pre>
        <p class="text-amber-700 text-sm">After adding this, you must clear any server-side caching plugins.</p>
    </div>
`;

const ch6Content = `
    <h3 class="text-xl font-bold">6.1 Linking Products via SKU</h3>
    <p>The Stock Keeping Unit (SKU) is the universal identifier that connects the entire ecosystem. Every purchasable item, whether it's a single exam, a bundle, or a subscription, must have a unique SKU in WooCommerce. This SKU is what the React app uses to determine a user's entitlements.</p>
    <ul>
        <li>An "Exam Program" in WordPress is linked to a "Certification Exam" product via its SKU.</li>
        <li>When a user buys that product, its SKU is added to their <code>paidExamIds</code> list in the JWT.</li>
        <li>The React app checks if an exam's SKU is in the user's <code>paidExamIds</code> list to unlock the "Start Exam" button.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">6.2 Handling Simple Products (Certification Exams)</h3>
    <p>This is the most straightforward integration. A standard "Simple" product in WooCommerce is created for each certification exam. The product's SKU must exactly match the "Certification Exam SKU" field in the corresponding "Exam Program" post in WordPress.</p>
    <p>The app fetches the price, sale price, and name directly from this WooCommerce product data via the API.</p>
    
    <h3 class="text-xl font-bold mt-6">6.3 Handling Subscriptions</h3>
    <p>The platform is fully integrated with the official "WooCommerce Subscriptions" extension. Subscription products are created in WooCommerce with their own unique SKUs (e.g., <code>sub-monthly</code>, <code>sub-yearly</code>).</p>
    <p>When a user has an active subscription, their JWT payload receives a special boolean flag: <code>isSubscribed: true</code>. The React app uses this single flag to grant universal access to all practice exams and AI feedback features, regardless of individual exam purchases.</p>

    <h3 class="text-xl font-bold mt-6">6.4 Handling Bundle Products</h3>
    <p>Bundles are a powerful way to upsell. They are created as "Simple" products in WooCommerce but contain special metadata that our plugin recognizes. The platform supports two main types of bundles, identified by their SKU naming convention:</p>
    <ul>
        <li><strong>Practice Bundle (e.g., <code>exam-cpc-cert-1</code>):</strong> This typically bundles a certification exam with 1 month of access to its associated practice materials. This is handled via custom logic in the app.</li>
        <li><strong>Subscription Add-on Bundle (e.g., <code>exam-cpc-cert-1mo-addon</code>):</strong> This bundles a certification exam with a 1-month subscription, granting system-wide benefits. This is the preferred and most powerful bundle type.</li>
    </ul>
    <p>The React app's "Product Customizer" provides a user-friendly interface for creating these complex bundle products in WooCommerce without needing to manually edit metadata.</p>
`;

const ch7Content = `
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
    <p>Located in the "Tools" tab, this tool is for <strong>launching a brand new tenant portal</strong>. It generates a complete, error-free JSON configuration file with all necessary branding and templates, but with <strong>empty content arrays</strong> (no exams, books, etc.). This gives the React app the basic "scaffolding" it needs to start up for a new, empty tenant without crashing.</p>
    
    <h3 class="text-xl font-bold mt-6">7.3 The Full Content Snapshot Generator</h3>
    <p>Also in the "Tools" tab, this second tool is for <strong>backups and performance optimization of an existing, live tenant</strong>. It generates a JSON file containing a complete, point-in-time snapshot of <strong>all your current live content</strong>—exams, books, prices, and settings. This file is a perfect backup and serves a key performance role, as explained in the workflow below.</p>

    <h3 class="text-xl font-bold mt-6">7.4 The "Golden Workflow" for Content Management and Optimization</h3>
    <p>Understanding the interplay between WordPress, the API, and the static JSON files is key to managing the platform professionally. Here is the definitive workflow:</p>
    <ol>
        <li><strong>Day-to-Day Content Management:</strong> ALL content updates (adding exams, changing prices, creating books) are done exclusively in the WordPress admin panel. The app will automatically fetch these changes via the live API, leveraging its caching system. <strong>You do not need to generate a new JSON file for daily updates.</strong></li>
        <li class="mt-2"><strong>Periodic Performance Optimization:</strong> Periodically (e.g., once a month or after a major content addition), follow these steps to improve the initial load speed for new visitors:
            <ul class="list-disc pl-5 mt-2">
                <li>Go to <strong>Exam App Engine → Tools</strong> and click <strong>"Generate Full Content Snapshot"</strong>.</li>
                <li>Download the fully populated JSON file.</li>
                <li>During your next planned deployment of the React app, replace the old static fallback file in the <code>/public</code> directory (e.g., <code>medical-coding-config.json</code>) with this new one.</li>
            </ul>
        </li>
    </ol>
    <p>By keeping the static fallback file reasonably up-to-date, you ensure that new users (or those with a cleared cache) have the fastest possible first-load experience, as the app can render the correct content instantly without waiting for the initial API call to complete.</p>
`;

const ch8Content = `
    <h3 class="text-xl font-bold">8.1 Frontend-First AI Architecture</h3>
    <p>The AI Content Engine was architected with a "frontend-first" approach to maximize security. The sensitive Google Gemini API key is stored exclusively as an environment variable in the React app and is never exposed to or stored in the WordPress backend.</p>
    <ol>
        <li>The admin uses the "Content Engine" UI in the React app to select parameters.</li>
        <li>The React app makes a direct, client-side call to the Google Gemini API using the secure API key.</li>
        <li>Once the AI generates the content, the React app sends this completed text to a secure, admin-only API endpoint in WordPress.</li>
        <li>The WordPress backend's only job is to receive the pre-generated content and use <code>wp_insert_post</code> to create and schedule the post.</li>
    </ol>
    <p>This ensures the API key remains confidential and leverages the secure environment of the frontend hosting platform.</p>

    <h3 class="text-xl font-bold mt-6">8.2 The AI Prompts</h3>
    <p>The quality of AI-generated content is entirely dependent on the quality of the prompt. We use a two-part prompt structure: a "System Instruction" to define the AI's persona and a "User Prompt" to provide the specific task.</p>
    
    <div class="bg-slate-50 border border-slate-200 p-4 rounded-lg my-4">
        <p class="font-bold text-slate-800">System Instruction:</p>
        <pre class="text-xs bg-slate-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono"><code>You are an expert SEO content writer specializing in educational and certification-based websites. Your task is to generate an engaging, well-structured, and SEO-friendly blog post. The output must be formatted using WordPress block editor syntax (Gutenberg blocks).</code></pre>
    </div>

    <div class="bg-slate-50 border border-slate-200 p-4 rounded-lg my-4">
        <p class="font-bold text-slate-800">Example User Prompt:</p>
        <pre class="text-xs bg-slate-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono"><code>Generate a blog post based on the following details:

Program Title: "CPC Certification Exam"
Program Description: "This comprehensive exam tests your mastery of CPT, HCPCS Level II, and ICD-10-CM coding for physician services."

The blog post should include these sections:
1. An engaging introduction.
2. "Why This Certification Matters"
3. "What You'll Learn"
4. "Career Opportunities"
5. A strong concluding paragraph.

Ensure all text is wrapped in appropriate WordPress block syntax.</code></pre>
    </div>
    
    <p>This structured approach ensures that the AI consistently produces well-organized, relevant, and properly formatted content that is ready to be published.</p>
`;

const ch9Content = `
    <h3 class="text-xl font-bold">9.1 Core Technologies</h3>
    <p>The frontend application is built on a modern, high-performance technology stack designed for rapid development, type safety, and an excellent user experience.</p>
    <ul>
        <li><strong>Vite:</strong> A next-generation frontend tooling system that provides an extremely fast development server with Hot Module Replacement (HMR) and an optimized build process for production.</li>
        <li><strong>React:</strong> The core UI library for building the component-based user interface.</li>
        <li><strong>TypeScript:</strong> A superset of JavaScript that adds static typing. This is crucial for a large application, as it helps prevent common errors, improves code readability, and makes refactoring safer.</li>
        <li><strong>Tailwind CSS:</strong> A utility-first CSS framework that allows for rapid UI development by composing complex designs from a set of low-level utility classes directly in the markup.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">9.2 Key Dependencies</h3>
    <p>The project relies on a curated set of high-quality libraries to handle common tasks:</p>
    <ul>
        <li><strong><code>react-router-dom</code>:</strong> Manages all client-side routing, allowing for a fast, single-page application (SPA) experience.</li>
        <li><strong><code>lucide-react</code>:</strong> Provides a comprehensive library of clean, lightweight SVG icons.</li>
        <li><strong><code>@google/genai</code>:</strong> The official Google AI SDK for interacting with the Gemini API to power the AI feedback and content generation features.</li>
        <li><strong><code>jspdf</code> & <code>html2canvas</code>:</strong> Used in combination to generate high-quality, downloadable PDF certificates and documents directly in the browser.</li>
        <li><strong><code>react-hot-toast</code>:</strong> A lightweight and customizable library for showing notifications and feedback to the user.</li>
        <li><strong><code>jszip</code>:</strong> A library for creating, reading, and editing .zip files on the client-side, used for the dynamic WordPress plugin generator.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">9.3 Environment Variables</h3>
    <p>The application requires a <code>.env</code> file in the project root for configuration. This file is ignored by version control to keep sensitive information secure.</p>
    <pre class="text-xs bg-slate-100 p-3 rounded my-2 whitespace-pre-wrap font-mono"><code># The URL of your local or staging WordPress backend for API proxying in development
VITE_API_TARGET_URL=http://your-local-wordpress.site

# Your API key for Google Gemini, used for AI features
GEMINI_API_KEY=your-gemini-api-key-goes-here
</code></pre>
    <p>The Vite build process securely injects these variables into the application, ensuring that the <code>GEMINI_API_KEY</code> is available for client-side API calls while keeping it out of the public source code.</p>
`;

const ch10Content = `
    <h3 class="text-xl font-bold">10.1 A Guided Tour of the <code>/src</code> Directory</h3>
    <p>The frontend codebase is organized logically to ensure maintainability and scalability. The primary logic resides within the <code>/src</code> directory.</p>
    <ul>
        <li><strong><code>/assets</code>:</strong> Contains static assets like images, fonts, and reusable data structures that are not part of the main component logic.</li>
        <li><strong><code>/components</code>:</strong> The heart of the application. This directory contains all the React components that make up the user interface. It is further organized into subdirectories for complex features like the admin panel or handbook.</li>
        <li><strong><code>/context</code>:</strong> Home to the global state management solution. It contains the providers and hooks for <code>AuthContext</code> and <code>AppContext</code>.</li>
        <li><strong><code>/services</code>:</strong> This directory handles all external communication. It includes the API service for interacting with the WordPress backend and the configuration service for managing multi-tenancy.</li>
        <li><strong><code>/public</code>:</strong> Located at the project root, this directory contains static files that are served directly, such as the main <code>index.html</code>, CSS files, and the critical tenant-specific JSON configuration files.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">10.2 Key Component Files</h3>
    <p>While there are dozens of components, a few serve as the core pillars of the application's functionality:</p>
    <dl>
        <dt class="font-bold mt-4"><code>App.tsx</code></dt>
        <dd>The root component of the application. It sets up the main providers (<code>AuthProvider</code>, <code>AppProvider</code>), the router (<code>BrowserRouter</code>), and defines all the URL routes for the entire application.</dd>

        <dt class="font-bold mt-4"><code>Dashboard.tsx</code></dt>
        <dd>The main landing page for logged-in users. It displays user statistics, subscription offers, and the list of available exam programs.</dd>
        
        <dt class="font-bold mt-4"><code>Test.tsx</code></dt>
        <dd>The exam player. This complex component manages the exam timer, question loading, answer state, progress saving, and browser-based proctoring (fullscreen and focus monitoring).</dd>

        <dt class="font-bold mt-4"><code>Results.tsx</code></dt>
        <dd>Displays the user's score after an exam. It also contains the logic for triggering AI feedback, submitting reviews, and generating shareable result images.</dd>
        
        <dt class="font-bold mt-4"><code>Certificate.tsx</code></dt>
        <dd>Renders the HTML for the certificate and includes the logic for generating a downloadable PDF using <code>jsPDF</code> and <code>html2canvas</code>.</dd>
        
        <dt class="font-bold mt-4"><code>AdminLayout.tsx</code> & Admin Components</dt>
        <dd>The container for all administrator-only pages. Components like <code>ExamProgramCustomizer.tsx</code> and <code>SalesAnalytics.tsx</code> provide the powerful in-app management tools.</dd>
    </dl>
`;

const ch11Content = `
    <h3 class="text-xl font-bold">11.1 The Role of React Context</h3>
    <p>For a complex application, many different components need access to the same pieces of information (like who the user is, or what brand's portal is being viewed). Instead of passing this data down through every single component (a process called "prop drilling"), we use React's Context API.</p>
    <p>Think of a Context as a central information desk for a section of the application. Any component that needs information can go directly to the desk to get it, without having to ask every component above it in the hierarchy. This makes the code much cleaner, more efficient, and easier to maintain.</p>
    <p>Our application uses two primary contexts that wrap the entire application in <code>App.tsx</code>.</p>

    <h3 class="text-xl font-bold mt-6">11.2 <code>AuthContext</code>: Managing the User Session</h3>
    <p>The <code>AuthContext</code> is responsible for everything related to the user's identity and permissions. It acts as the single source of truth for:</p>
    <ul>
        <li><strong>User Object:</strong> The current user's ID, name, and email.</li>
        <li><strong>Authentication Token:</strong> The JWT received from WordPress.</li>
        <li><strong>Permissions & Entitlements:</strong> The list of purchased exam SKUs (<code>paidExamIds</code>) and the user's subscription status (<code>isSubscribed</code>).</li>
        <li><strong>Masquerade Mode:</strong> The state for the admin feature that allows viewing the app as a regular user or a visitor.</li>
        <li><strong>Core Functions:</strong> It provides the functions that components can call to perform actions like <code>loginWithToken()</code> and <code>logout()</code>.</li>
    </ul>
    <p>Any component can access this information by using the <code>useAuth()</code> hook, which provides a direct line to the "authentication desk."</p>
    
    <h3 class="text-xl font-bold mt-6">11.3 <code>AppContext</code>: Managing Tenant Configuration and UI State</h3>
    <p>The <code>AppContext</code> is responsible for everything related to the application's overall state and the specific tenant being viewed. It manages:</p>
    <ul>
        <li><strong>Tenant Configuration (<code>activeOrg</code>):</strong> The complete configuration object for the current tenant, including their name, logo, list of exams, books, and certificate templates.</li>
        <li><strong>Loading & Initialization State:</strong> Flags like <code>isInitializing</code> that tell other components whether the initial data load is complete.</li>
        <li><strong>Global UI State:</strong> The currently selected theme (<code>activeTheme</code>) and the state of modals like the "Spin & Win" wheel.</li>
        <li><strong>Caching Logic:</strong> It contains the logic for loading the configuration from <code>localStorage</code> first and then validating it against the live API.</li>
    </ul>
    <p>Components use the <code>useAppContext()</code> hook to get information from this "application desk," allowing them to render the correct branding, content, and theme for the current tenant.</p>
`;

const ch12Content = `
    <h3 class="text-xl font-bold">12.1 The Role of <code>apiConfig.ts</code> and the <code>tenantMap</code></h3>
    <p>The entire multi-tenant system is orchestrated by a single file: <code>services/apiConfig.ts</code>. This file contains the <code>tenantMap</code>, a JavaScript object that acts as a routing directory for the application.</p>
    <p>The map uses domain hostnames as keys and points them to a configuration object containing two critical pieces of information:</p>
    <ol>
        <li><code>apiBaseUrl</code>: The root URL of the tenant's dedicated WordPress backend.</li>
        <li><code>staticConfigPath</code>: The path to the static JSON configuration file in the <code>/public</code> directory, which serves as a fallback if the API is unreachable.</li>
    </ol>

    <div class="bg-slate-50 border border-slate-200 p-4 rounded-lg my-4">
        <p class="font-bold text-slate-800">Example <code>tenantMap</code> structure:</p>
        <pre class="text-xs bg-slate-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono"><code>// services/apiConfig.ts

const medicalCodingConfig: TenantConfig = {
    apiBaseUrl: 'https://www.coding-online.net',
    staticConfigPath: '/medical-coding-config.json'
};

const lawPrepConfig: TenantConfig = {
    apiBaseUrl: 'https://www.law-prep.com',
    staticConfigPath: '/law-school-config.json'
};

const tenantMap: { [key: string]: TenantConfig } = {
    // Medical Coding Tenant
    'exams.coding-online.net': medicalCodingConfig,
    'coding-online.net': medicalCoding-config,

    // Law School Tenant
    'exams.law-prep.com': lawPrepConfig,
    'law-prep.com': lawPrepConfig
};
</code></pre>
    </div>

    <h3 class="text-xl font-bold mt-6">12.2 The Loading and Fallback Mechanism</h3>
    <p>When the application first loads, the <code>getTenantConfig()</code> function is called:</p>
    <ol>
        <li>It gets the current browser's hostname (e.g., <code>exams.coding-online.net</code>).</li>
        <li>It iterates through the keys in the <code>tenantMap</code> to find a match.</li>
        <li>Once a match is found, it returns the corresponding configuration object.</li>
        <li>If no match is found, it returns a default fallback configuration (typically the primary Annapoorna Infotech config) to prevent the app from crashing.</li>
    </ol>
    <p>This simple but powerful mechanism allows the single codebase to dynamically adapt its branding, content source, and API endpoints based on the URL it's being accessed from.</p>
    
    <h3 class="text-xl font-bold mt-6">12.3 Dynamic Theming Engine</h3>
    <p>Each tenant's configuration includes a list of available themes and a default active theme. The user's theme choice is saved in their browser's <code>localStorage</code>.</p>
    <p>The application's styling is controlled by CSS custom properties (variables) defined in <code>index.css</code>. When a theme is selected, a <code>data-theme</code> attribute is set on the root HTML element. The CSS file contains rules that override the default color variables based on this attribute, instantly changing the entire application's color scheme without a page reload.</p>
`;

const ch13Content = `
    <h3 class="text-xl font-bold">13.1 The "Cache-First, Then Validate" Strategy</h3>
    <p>The application's primary performance strategy is designed to deliver an instant-loading user experience while ensuring content remains up-to-date. This is achieved by prioritizing cached data for the initial render and then checking for updates in the background.</p>
    <p>This approach provides the perceived speed of a static site with the dynamism of a server-rendered application. The process is managed entirely within the <code>AppContext</code>.</p>

    <h3 class="text-xl font-bold mt-6">13.2 Client-Side Caching with <code>localStorage</code></h3>
    <p>The browser's <code>localStorage</code> is used as the first layer of cache. It is fast, persistent, and has a generous storage limit (typically 5-10MB).</p>
    <ul>
        <li><strong>How it Works:</strong> When the app successfully fetches the main configuration object from the API, it saves the entire JSON object as a string in <code>localStorage</code>, keyed by the tenant's API URL (e.g., <code>appConfigCache_https://www.coding-online.net</code>).</li>
        <li><strong>Benefit:</strong> On subsequent visits, the app can read this stored data synchronously before the first render, allowing the UI to appear almost instantly without any loading spinners.</li>
        <li><strong>Invalidation:</strong> The client-side cache is automatically invalidated whenever the version timestamp of the configuration fetched from the live API is newer than the cached version.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">13.3 Server-Side Caching with WordPress Transients</h3>
    <p>The WordPress backend uses its built-in caching mechanism, called Transients, to avoid expensive database queries on every API call. This significantly reduces server load and speeds up API response times.</p>
    <ul>
        <li><strong>How it Works:</strong> The first time the <code>/config</code> API endpoint is called, the <code>mco_get_app_config_data()</code> function runs. It queries all the necessary post types, taxonomies, and meta fields to build the large configuration object. It then saves this final object into a transient (e.g., <code>mco_app_config_data</code>) with an expiration time (typically 1 hour).</li>
        <li><strong>Benefit:</strong> For the next hour, any subsequent calls to the <code>/config</code> endpoint will receive the stored transient data almost instantly, without needing to touch the database at all.</li>
        <li><strong>Invalidation:</strong> The server-side cache is automatically invalidated in two ways:
            <ol>
                <li>It expires automatically after its set duration.</li>
                <li>Administrators can manually force an update by clicking the "Clear Server Config Cache" button in the plugin's "Tools" tab. This is the recommended action after making content changes in WordPress.</li>
            </ol>
        </li>
    </ul>
`;

const ch14Content = `
    <h3 class="text-xl font-bold">14.1 The Complete Onboarding Workflow</h3>
    <p>This chapter provides the definitive, step-by-step workflow for launching a new examination portal for a client or brand using the Annapoorna Examination Engine.</p>

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
    </ol>
    
    <div class="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <p class="font-bold text-red-800">CRITICAL SECURITY STEP</p>
        <p class="text-red-700">You must now edit the <code>wp-config.php</code> file at the root of your WordPress installation. Add the following line with a unique, long, and random string. You can use an online "password generator" to create one. This key is essential for securing user authentication.</p>
        <pre class="text-xs bg-slate-100 p-2 rounded my-1 whitespace-pre-wrap font-mono"><code>define('MCO_JWT_SECRET', 'your-super-long-and-secret-random-string-goes-here');</code></pre>
    </div>

    <h4 class="font-semibold mt-4">Step 3: Run the Initial Plugin Configuration</h4>
    <p>The "Tenant Blueprint Generator" in the plugin's "Tools" tab includes a checklist to guide you through the minimum required setup.</p>
    <ol>
        <li>In the WordPress admin, navigate to <strong>Exam App Engine → Main Settings</strong> and enter the full URL of the subdomain you configured in Step 1.</li>
        <li>Navigate to <strong>Exam App Engine → Certificate Templates</strong> and configure at least one signature with a name and title.</li>
        <li>Ensure a site logo is present by setting a <strong>Custom Logo URL</strong> in Main Settings or a default <strong>Site Icon</strong> under <strong>Appearance → Customize</strong>.</li>
    </ol>

    <h4 class="font-semibold mt-4">Step 4: Generate and Deploy the Tenant Blueprint</h4>
    <ol>
        <li>Navigate to <strong>Exam App Engine → Tools</strong>. The "Generate & Download Blueprint" button will now be active. Click it to download the <code>tenant-config.json</code> file.</li>
        <li>Rename the downloaded file to something descriptive (e.g., <code>new-client-config.json</code>) and place it inside the <code>/public</code> directory of your React app's source code.</li>
        <li>Open the <code>services/apiConfig.ts</code> file in your React app and add a new entry to the <code>tenantMap</code> that points the new tenant's domain to their new config file and WordPress API URL.</li>
        <li>Commit these two changes and push them to your Git repository. Your hosting provider will automatically build and deploy the update.</li>
    </ol>
    
    <h4 class="font-semibold mt-4">Step 5: You're Live!</h4>
    <p>The new tenant portal is now live. You can begin creating WooCommerce products and Exam Programs in the tenant's WordPress backend, and they will automatically appear in their dedicated app instance.</p>
`;
// ... other chapter content would be here...

const chapters = [
    { title: "Cover", content: coverContent, isCover: true },
    { title: "Title Page", content: titlePageContent },
    { title: "Table of Contents", content: tocContent },
    { title: "Chapter 1: Introduction", content: ch1Content },
    { title: "Chapter 2: High-Level Architecture", content: ch2Content },
    { title: "Chapter 3: Core Application Flow", content: ch3Content },
    { title: "Chapter 4: WordPress Backend (Part 1)", content: ch4Content },
    { title: "Chapter 5: WordPress Backend (Part 2)", content: ch5Content },
    { title: "Chapter 6: E-Commerce Integration", content: ch6Content },
    { title: "Chapter 7: Admin Panel", content: ch7Content },
    { title: "Chapter 8: AI & Automation", content: ch8Content },
    { title: "Chapter 9: Frontend Tech Stack", content: ch9Content },
    { title: "Chapter 10: Frontend Architecture", content: ch10Content },
    { title: "Chapter 11: Global State Management", content: ch11Content },
    { title: "Chapter 12: Multi-Tenancy in Practice", content: ch12Content },
    { title: "Chapter 13: Performance & Caching", content: ch13Content },
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
        const toastId = toast.loading('Generating professional handbook PDF...', { duration: Infinity });
    
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 50;
            const contentWidth = pageWidth - margin * 2;
            const contentHeight = pageHeight - margin * 2;
    
            // 1. Render Cover Page
            const coverElement = document.createElement('div');
            coverElement.innerHTML = chapters[0].content;
            coverElement.style.width = `${pageWidth}px`;
            coverElement.style.height = `${pageHeight}px`;
            coverElement.style.position = 'absolute';
            coverElement.style.left = '-9999px';
            document.body.appendChild(coverElement);
            
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            document.body.removeChild(coverElement);
            const coverImgData = coverCanvas.toDataURL('image/png');
            pdf.addImage(coverImgData, 'PNG', 0, 0, pageWidth, pageHeight);
    
            // 2. Combine all other chapters into one long element for rendering
            const contentContainer = document.createElement('div');
            contentContainer.style.width = `${contentWidth}px`;
            contentContainer.style.position = 'absolute';
            contentContainer.style.left = '-9999px';
            contentContainer.style.backgroundColor = 'white';
            contentContainer.style.fontFamily = 'sans-serif';
    
            let allContentHtml = '';
            // Start from index 1 to skip the cover
            for (let i = 1; i < chapters.length; i++) {
                allContentHtml += `<div class="prose max-w-none prose-slate p-4" style="page-break-after: always; min-height: ${contentHeight}px;">${chapters[i].content}</div>`;
            }
            contentContainer.innerHTML = allContentHtml;
            document.body.appendChild(contentContainer);
    
            // 3. Render the entire content block to a single tall canvas
            const contentCanvas = await html2canvas(contentContainer, {
                scale: 2,
                useCORS: true,
                windowWidth: contentContainer.scrollWidth,
                windowHeight: contentContainer.scrollHeight,
            });
            document.body.removeChild(contentContainer);
            
            const imgData = contentCanvas.toDataURL('image/png');
            const canvasHeightInPdfPoints = contentCanvas.height / (contentCanvas.width / contentWidth);
            
            // 4. Paginate the canvas image into the PDF
            let yPosition = 0;
            let pageCount = 1; // Cover is page 1
    
            while (yPosition < canvasHeightInPdfPoints) {
                pdf.addPage();
                pageCount++;
                
                // Add the slice of the canvas to the new page
                pdf.addImage(imgData, 'PNG', margin, -yPosition + margin, contentWidth, canvasHeightInPdfPoints, undefined, 'FAST');
                
                // Add Footer with Page Number
                pdf.setFontSize(9);
                pdf.setTextColor(150);
                pdf.text(`Page ${pageCount}`, pageWidth - margin, pageHeight - margin / 2, { align: 'right' });
                
                yPosition += contentHeight;
            }
    
            pdf.save('Annapoorna-Examination-Engine-Handbook.pdf');
            toast.success('Handbook downloaded!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsDownloading(false);
        }
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
            <div className="w-full max-w-7xl mx-auto aspect-[1.5/1] perspective">
                <div className="w-full h-full grid grid-cols-2 gap-4 transform-style-3d">
                    <div className={`shadow-lg rounded-l-lg border-r border-slate-200 overflow-hidden relative ${leftPageClass} backface-hidden ${chapters[currentPage]?.isCover ? 'p-0' : 'bg-white'}`}>
                        <div className="p-8 sm:p-12 h-full overflow-auto prose max-w-none prose-slate break-words" dangerouslySetInnerHTML={{ __html: chapters[currentPage]?.content || '' }} />
                    </div>
                    <div className={`shadow-lg rounded-r-lg border-l border-slate-200 overflow-hidden relative ${rightPageClass} backface-hidden bg-white`}>
                        <div className="p-8 sm:p-12 h-full overflow-auto prose max-w-none prose-slate break-words" dangerouslySetInnerHTML={{ __html: chapters[currentPage + 1]?.content || '' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Handbook;
