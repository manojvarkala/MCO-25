import React, { FC, useState, useCallback } from 'react';
import { BookOpen, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

// --- CHAPTER DATA ---
const chapters = [
    {
        id: 'cover',
        title: 'Cover Page',
        isCover: true,
        content: `
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
        `
    },
    {
        id: 'toc',
        title: 'Table of Contents',
        content: `` // Content will be generated dynamically
    },
    {
        id: 'ch1',
        title: 'Chapter 1: Introduction',
        content: `
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
            
            <h3 class="text-xl font-bold mt-6">1.5 Intended Audience</h3>
            <p>This guide is written for three primary groups: <strong>Administrators</strong> who manage content and users, <strong>Business Owners</strong> who strategize and scale the platform, and <strong>Developers</strong> who maintain and extend its capabilities.</p>
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
                <li>Upon successful WP login, the <code>[mco_exam_login]</code> shortcode on that page generates a secure JSON Web Token (JWT).</li>
                <li>The user is immediately redirected back to the React app with the JWT in the URL parameters.</li>
                <li>The React app validates the JWT, decodes the user's details and permissions, and establishes the user's session.</li>
            </ol>
        `
    },
    {
        id: 'ch4',
        title: 'Chapter 4: Plugin Core & Content Structure',
        content: `
            <h3 class="text-xl font-bold">4.1 Plugin File Architecture</h3>
            <p>The <code>mco-exam-integration-engine</code> plugin is organized into several key files within its <code>/includes/</code> directory to handle Custom Post Types, data structuring, API endpoints, admin pages, and shortcodes separately.</p>
        `
    },
    {
        id: 'ch5',
        title: 'Chapter 5: The REST API & Security Model',
        content: `
            <h3 class="text-xl font-bold">5.1 Namespace and Endpoint Philosophy</h3>
            <p>All API routes are consolidated under the <code>/wp-json/mco-app/v1/</code> namespace. The endpoints are resource-oriented and stateless. The main <code>/config</code> endpoint is public and heavily cached, while user-specific and admin routes are protected by JWT and CORS policies.</p>
        `
    },
    {
        id: 'ch6',
        title: 'Chapter 6: WooCommerce Integration',
        content: `
            <h3 class="text-xl font-bold">6.1 Linking Products via SKU</h3>
            <p>The Stock Keeping Unit (SKU) is the critical link between Exam Programs and WooCommerce Products. When a user buys a product, its SKU is added to their list of entitlements in the JWT, which the app uses to unlock the corresponding exams.</p>
        `
    },
    {
        id: 'ch7',
        title: 'Chapter 7: Content & Data Management',
        content: `
            <h3 class="text-xl font-bold">7.1 The Admin Panel</h3>
            <p>The "Exam App Engine" menu in WordPress provides tools for main settings, bulk imports, certificate template editing, and essential maintenance tools like cache clearing and the Tenant Blueprint Generator.</p>
        `
    },
    {
        id: 'ch8',
        title: 'Chapter 8: The AI Content Engine Backend',
        content: `
            <h3 class="text-xl font-bold">8.1 The "Create Post" Endpoint</h3>
            <p>The AI call happens securely on the frontend. The generated content is then sent to a secure, admin-only API endpoint in WordPress, which uses <code>wp_insert_post</code> to create and schedule the blog post, ensuring the AI API key is never exposed on the backend.</p>
        `
    },
    {
        id: 'ch9',
        title: 'Chapter 9: Technology Stack & Project Setup',
        content: `
            <h3 class="text-xl font-bold">9.1 Core Technologies</h3>
            <p>The frontend is built with Vite, React, and TypeScript for a fast, modern, and type-safe development experience. Styling is handled with Tailwind CSS.</p>
        `
    },
    {
        id: 'ch10',
        title: 'Chapter 10: Project Structure & Key Components',
        content: `
            <h3 class="text-xl font-bold">10.1 Directory Structure</h3>
            <p>The frontend codebase is organized into <code>/components</code>, <code>/context</code> (for global state), <code>/services</code> (for API communication), and <code>/public</code> (for static assets and tenant configs).</p>
        `
    },
    {
        id: 'ch11',
        title: 'Chapter 11: State Management',
        content: `
            <h3 class="text-xl font-bold">11.1 AuthContext & AppContext</h3>
            <p>Global state is managed via two main contexts: <code>AuthContext</code> handles the user session, JWT, and permissions. <code>AppContext</code> manages the tenant-specific configuration, caching, and global UI state like themes.</p>
        `
    },
    {
        id: 'ch12',
        title: 'Chapter 12: Multi-Tenant Implementation',
        content: `
            <h3 class="text-xl font-bold">12.1 The Role of apiConfig.ts</h3>
            <p>The multi-tenant system is orchestrated by <code>services/apiConfig.ts</code>, which contains a <code>tenantMap</code> that maps hostnames to specific configuration objects, including the correct backend API URL and static fallback JSON file.</p>
        `
    },
    {
        id: 'ch13',
        title: 'Chapter 13: Caching & Performance Strategy',
        content: `
            <h3 class="text-xl font-bold">13.1 Caching Layers</h3>
            <p>Performance is achieved through a dual-layer caching system: server-side caching with WordPress Transients for the API, and client-side caching with <code>localStorage</code> for instant app loads on subsequent visits.</p>
        `
    },
    {
        id: 'ch14',
        title: 'Chapter 14: Onboarding a New Tenant',
        content: `
            <h3 class="text-xl font-bold">14.1 A Step-by-Step Guide</h3>
            <p>This chapter provides the definitive workflow for launching a new examination portal, from setting up the WordPress backend and generating the Tenant Blueprint to deploying the new configuration in the React app.</p>
        `
    }
];

// Dynamically generate the Table of Contents content
const tocContent = `
    <p>This handbook serves as the definitive guide to the architecture, features, and administration of the Annapoorna Examination Engine.</p>
    <ul class="list-disc pl-5 mt-4 space-y-2">
        ${chapters.slice(2).map((ch, index) => `<li><a href="#" class="text-cyan-600 hover:underline" data-chapter-index="${index + 2}">${ch.title}</a></li>`).join('')}
    </ul>
`;
chapters[1].content = tocContent;


const Handbook: FC = () => {
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);

    const handleDownload = useCallback(async () => {
        const toastId = toast.loading('Generating your handbook...');
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let currentY = margin;

            // --- 1. RENDER COVER PAGE using html2canvas ---
            const coverElement = document.createElement('div');
            coverElement.style.position = 'absolute';
            coverElement.style.left = '-9999px';
            coverElement.style.width = `${pageWidth}mm`;
            coverElement.style.height = `${pageHeight}mm`;
            coverElement.innerHTML = chapters[0].content;
            document.body.appendChild(coverElement);
            
            const coverCanvas = await html2canvas(coverElement.querySelector('div')!, { scale: 2, useCORS: true });
            const coverImgData = coverCanvas.toDataURL('image/png');
            doc.addImage(coverImgData, 'PNG', 0, 0, pageWidth, pageHeight);
            document.body.removeChild(coverElement);

            // --- 2. RENDER TEXT-BASED CHAPTERS ---
            const tempDiv = document.createElement('div');
            
            const addPageIfNeeded = (spaceNeeded: number) => {
                if (currentY + spaceNeeded > pageHeight - margin) {
                    doc.addPage();
                    currentY = margin;
                }
            };
            
            for (let i = 1; i < chapters.length; i++) {
                doc.addPage();
                currentY = margin;
                const chapter = chapters[i];

                doc.setFontSize(18);
                doc.setTextColor('#0f172a'); // slate-900
                doc.setFont('helvetica', 'bold');
                doc.text(chapter.title, margin, currentY);
                currentY += 10;
                doc.setDrawColor('#e2e8f0'); // slate-200
                doc.line(margin, currentY, pageWidth - margin, currentY);
                currentY += 10;
                
                tempDiv.innerHTML = chapter.content;
                const nodes = Array.from(tempDiv.childNodes);

                for (const node of nodes) {
                    const element = node as HTMLElement;
                    const text = (element.textContent || '').trim();
                    if (!text) continue;

                    let listPrefix = '';
                    let leftMargin = margin;

                    // Set styles based on tag
                    switch (element.tagName) {
                        case 'H3':
                            addPageIfNeeded(10);
                            doc.setFontSize(14);
                            doc.setFont('helvetica', 'bold');
                            currentY += 6;
                            break;
                        case 'P':
                            addPageIfNeeded(8);
                            doc.setFontSize(10);
                            doc.setFont('helvetica', 'normal');
                            currentY += 6;
                            break;
                        case 'UL':
                        case 'OL':
                            const listItems = Array.from(element.querySelectorAll('li'));
                            listItems.forEach((li, liIndex) => {
                                const liText = (li.textContent || '').trim();
                                if (!liText) return;
                                listPrefix = (element.tagName === 'OL') ? `${liIndex + 1}. ` : '• ';
                                const lines = doc.splitTextToSize(liText, pageWidth - (margin * 2) - 5);
                                lines.forEach((line: string, lineIndex: number) => {
                                    addPageIfNeeded(5);
                                    doc.text(lineIndex === 0 ? listPrefix + line : line, margin + 5, currentY);
                                    currentY += 5;
                                });
                            });
                            continue; // Skip the generic line processing
                    }
                    
                    const lines = doc.splitTextToSize(text, pageWidth - (leftMargin * 2));
                    lines.forEach((line: string) => {
                        addPageIfNeeded(5);
                        doc.text(line, leftMargin, currentY);
                        currentY += 5;
                    });
                }
            }

            // --- 3. ADD PAGE NUMBERS ---
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor('#9ca3af'); // slate-400
                doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }

            doc.save('Annapoorna_Exam_Engine_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to download PDF.', { id: toastId });
        }
    }, []);

    const handleTocClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const chapterIndex = target.getAttribute('data-chapter-index');
        if (chapterIndex) {
            e.preventDefault();
            setActiveChapterIndex(parseInt(chapterIndex, 10));
        }
    };

    const activeChapter = chapters[activeChapterIndex];

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-500 to-purple-600 text-transparent bg-clip-text font-display flex items-center gap-3">
                <BookOpen />
                Annapoorna Exam Engine Handbook
            </h1>

            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] flex flex-col md:flex-row min-h-[70vh]">
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
                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
                        >
                            <Download size={16}/> Download as PDF
                        </button>
                    </div>
                </aside>

                <main className="w-full md:w-2/3 lg:w-3/4 p-2 md:p-8 flex flex-col">
                    <div className="flex-grow">
                        {activeChapter.isCover ? (
                            <div className="h-full" dangerouslySetInnerHTML={{ __html: activeChapter.content }} />
                        ) : (
                            <div>
                                <h2 className="text-3xl font-bold text-[rgb(var(--color-primary-rgb))] mb-6 pb-4 border-b border-[rgb(var(--color-border-rgb))]">
                                    {activeChapter.title}
                                </h2>
                                <div
                                    className="prose prose-slate max-w-none"
                                    onClick={handleTocClick}
                                    dangerouslySetInnerHTML={{ __html: activeChapter.content }}
                                />
                            </div>
                        )}
                    </div>
                    
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