import React, { FC, useState, useCallback } from 'react';
import { BookOpen, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import Seal from '../assets/Seal.tsx';

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
                <div class="mt-12 text-sm text-slate-400">
                    <p>Version 1.0.3</p>
                    <p>AI Engineering Division</p>
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
            <h3 class="text-xl font-bold">1.1 The Vision: A Unified, Multi-Brand Examination Platform</h3>
            <p>The Annapoorna Examination Engine was conceived as a powerful, multi-tenant platform capable of serving customized exam experiences for various brands or subjects (e.g., medical coding, law, finance) from a single, unified codebase.</p>
            <h3 class="text-xl font-bold mt-4">1.2 Purpose of This Handbook</h3>
            <p>This document provides a comprehensive overview of the platform's architecture, a practical guide for administrators and content managers, and a technical reference for developers.</p>
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

    const handleDownload = useCallback(() => {
        const toastId = toast.loading('Generating PDF...');
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const tempContainer = document.createElement('div');
            document.body.appendChild(tempContainer);
            tempContainer.style.display = 'none';

            // Start from index 1 to skip the cover page
            chapters.forEach((chapter, index) => {
                if (index === 0) return; 

                if (index > 1) {
                    doc.addPage();
                }

                doc.setFontSize(18);
                doc.setTextColor(15, 23, 42); 
                doc.text(chapter.title, 14, 22);
                
                tempContainer.innerHTML = `<table><tbody><tr><td>${chapter.content.replace(/<a[^>]*>|<\/a>/g, '')}</td></tr></tbody></table>`;
                const table = tempContainer.querySelector('table');

                if (table) {
                    autoTable(doc, {
                        html: table,
                        startY: 30,
                        theme: 'plain',
                        styles: { font: 'helvetica', fontSize: 10, textColor: [51, 65, 85] },
                    });
                }
            });
            
            const pageCount = doc.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
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
