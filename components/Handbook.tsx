import React, { FC, ReactNode } from 'react';
import { BookCopy } from 'lucide-react';

const Chapter: FC<{ title: string; children: ReactNode; chapter: string }> = ({ title, children, chapter }) => (
    <div className="py-8 border-b border-slate-200 last:border-b-0">
        <h2 className="text-3xl font-bold text-slate-800 font-display mb-2">{chapter}</h2>
        <h3 className="text-2xl font-semibold text-slate-700 font-display mb-6">{title}</h3>
        <div className="prose prose-slate max-w-none lg:prose-lg">
            {children}
        </div>
    </div>
);

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
     <div className="mt-8">
        <h4 className="text-xl font-bold text-slate-800 mb-4">{title}</h4>
        {children}
    </div>
);


const Handbook: FC = () => {
    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-br from-cyan-50 to-purple-100 p-8 rounded-xl border border-cyan-200">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-4 rounded-full shadow-md">
                        <BookCopy size={32} className="text-cyan-600" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 font-display">Annapoorna Examination Engine</h1>
                        <p className="text-xl text-slate-600 font-display">A Comprehensive Technical & Administrative Handbook</p>
                        <span className="text-xs font-mono bg-slate-200 text-slate-500 px-2 py-1 rounded-full mt-2 inline-block">Version 1.0.3</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <Chapter chapter="Table of Contents" title="The Complete Guide">
                    <p>This handbook is divided into five parts, covering everything from high-level architecture to day-to-day administrative tasks.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <h4>Part I: Platform Philosophy & Architecture</h4>
                            <ul>
                                <li>Chapter 1: Introduction</li>
                                <li>Chapter 2: The Headless, Multi-Tenant Model</li>
                                <li>Chapter 3: The End-to-End Data Flow</li>
                            </ul>
                        </div>
                        <div>
                            <h4>Part II: The WordPress Backend</h4>
                            <ul>
                                <li>Chapter 4: Plugin Core & Content Structure</li>
                                <li>Chapter 5: The REST API & Security Model</li>
                                <li>Chapter 6: WooCommerce Integration</li>
                                <li>Chapter 7: Content & Data Management</li>
                                <li>Chapter 8: The AI Content Engine Backend</li>
                            </ul>
                        </div>
                        <div>
                            <h4>Part III: The React Frontend</h4>
                            <ul>
                                <li>Chapter 9: Technology Stack & Project Setup</li>
                                <li>Chapter 10: Project Structure & Key Components</li>
                                <li>Chapter 11: State Management: AuthContext & AppContext</li>
                                <li>Chapter 12: Multi-Tenant Implementation</li>
                                <li>Chapter 13: Caching & Performance Strategy</li>
                            </ul>
                        </div>
                        <div>
                            <h4>Part IV: Administrator's Guide</h4>
                            <ul>
                                <li>Chapter 14: Onboarding a New Tenant</li>
                                <li>Chapter 15: Managing Content</li>
                                <li>Chapter 16: Using the AI Content Engine</li>
                                <li>Chapter 17: User Management & Support Tools</li>
                                <li>Chapter 18: Viewing Analytics</li>
                            </ul>
                        </div>
                        <div>
                            <h4>Part V: Developer's Guide</h4>
                            <ul>
                                <li>Chapter 19: Local Development Setup</li>
                                <li>Chapter 20: Deployment Workflow</li>
                                <li>Chapter 21: Extending the Platform</li>
                            </ul>
                        </div>
                    </div>
                </Chapter>
                
                <Chapter chapter="Chapter 1" title="Introduction">
                    <Section title="1.1 The Vision: A Unified, Multi-Brand Examination Platform">
                        <p>The Annapoorna Examination Engine was conceived with a singular vision: to create a powerful, flexible, and scalable platform capable of serving customized, brand-specific examination experiences from a single, unified codebase. This "headless" and "multi-tenant" architecture allows us to rapidly launch and manage distinct exam portals for various clients or subjects—be it medical coding, legal studies, or finance certifications—without duplicating development effort.</p>
                    </Section>
                    <Section title="1.2 Purpose of This Handbook">
                        <p>This document serves as the definitive guide to the entire examination engine. It is designed to be a single source of truth for understanding its architecture, features, and operational procedures. Whether you are a platform administrator, a content manager, or a developer, this handbook will provide the knowledge necessary to leverage the platform to its full potential.</p>
                    </Section>
                </Chapter>

                <Chapter chapter="Chapter 2" title="The Headless, Multi-Tenant Model">
                    <Section title="2.1 Understanding the Headless Approach">
                        <p>In a traditional system like WordPress, the same software is responsible for both managing content (the "body") and displaying it to users (the "head"). Our platform decouples these two functions for immense gains in performance, security, and flexibility.</p>
                        <ul>
                            <li><strong>The "Body" (Backend):</strong> A WordPress installation running our custom <code>mco-exam-integration-engine</code> plugin. Its sole job is to manage content (Exam Programs, Books), handle users and e-commerce (via WooCommerce), and expose all data through a secure REST API.</li>
                            <li><strong>The "Head" (Frontend):</strong> This React application. Its only responsibility is to fetch data from the appropriate WordPress backend and present it to the user in a fast, modern, and interactive interface.</li>
                        </ul>
                    </Section>
                     <Section title="2.2 The Power of Multi-Tenancy">
                        <p>Multi-tenancy allows a single application instance to serve multiple customers, or "tenants." Our single React codebase is the application, and each client's branded exam portal is a tenant. This is the key to our scalability.</p>
                        <p>This is achieved by abstracting all tenant-specific information into configuration files:</p>
                        <ol>
                            <li>A user visits a URL (e.g., <code>exams.coding-online.net</code>).</li>
                            <li>The app inspects the hostname and looks it up in the <code>services/apiConfig.ts</code> file's <code>tenantMap</code>.</li>
                            <li>This map points the app to two critical resources:
                                <ul>
                                    <li>The correct static JSON file in the <code>/public</code> directory for branding (logo, name, themes).</li>
                                    <li>The correct WordPress backend URL to use for all live API calls.</li>
                                </ul>
                            </li>
                            <li>The app then loads with the correct branding and fetches all dynamic content from the correct, isolated backend.</li>
                        </ol>
                        <p>The benefit is enormous: we maintain only one codebase. A bug fix or a new feature is rolled out to all tenants simultaneously with a single deployment.</p>
                    </Section>
                </Chapter>

                <Chapter chapter="Chapter 3" title="The End-to-End Data Flow">
                    <p>Understanding how data moves through the system is key to troubleshooting and development. This chapter outlines the primary data journeys, from user login to exam submission.</p>
                    <Section title="3.1 User Authentication & SSO Journey">
                        <p>The platform uses a Single Sign-On (SSO) model where WordPress is the single source of truth for user identity.</p>
                        <ol>
                            <li>A user clicks "Login" on the React app. They are redirected to a special page on the WordPress site (e.g., <code>/exam-login/</code>).</li>
                            <li>If not already logged into WordPress, they see the standard WP login form. After a successful login, they are returned to the <code>/exam-login/</code> page.</li>
                            <li>The <code>[mco_exam_login]</code> shortcode on this page detects the logged-in user.</li>
                            <li>The WordPress backend generates a secure JSON Web Token (JWT). This token contains the user's ID, name, email, admin status, and, crucially, a list of their current purchases and subscription status from WooCommerce.</li>
                            <li>The user is immediately redirected back to the React app at the <code>/auth</code> route, with the JWT appended as a URL parameter (e.g., <code>.../auth?token=...</code>).</li>
                            <li>The React app's <code>Login</code> component parses the token, validates its signature, stores it in <code>localStorage</code>, and sets the user's authentication state globally via <code>AuthContext</code>. The user is then directed to their dashboard.</li>
                        </ol>
                    </Section>
                    <Section title="3.2 Initial App Load: Caching & Configuration">
                        <p>To ensure a fast user experience, the app employs a "Cache-First, Then Validate" strategy for its main configuration.</p>
                        <ol>
                            <li><strong>Step 1 (Cache):</strong> The app first checks <code>localStorage</code> for a cached version of the main configuration object. If found, the UI renders almost instantly using this data. This makes subsequent visits feel very fast.</li>
                            <li><strong>Step 2 (Validate):</strong> Simultaneously, the app makes an API call to the <code>/wp-json/mco-app/v1/config</code> endpoint on the WordPress backend.</li>
                            <li><strong>Step 3 (Update):</strong> The app compares the <code>version</code> timestamp of the live config from the API with the cached version. If the live version is newer, it replaces the data in <code>localStorage</code> and re-renders the app with fresh content. A toast notification informs the user of the update.</li>
                            <li><strong>Step 4 (Fallback):</strong> If the API call fails (e.g., the user is offline) and there's no cached data, the app makes a final attempt to load its static <code>tenant-config.json</code> file. This ensures the app can always load a baseline version, even offline.</li>
                        </ol>
                    </Section>
                    <Section title="3.3 Real-Time Content Updates via API">
                        <p>While the main config is heavily cached, user-specific data is always live. The "Sync My Exams" button allows users to manually refresh their entitlements by fetching a new JWT with the latest purchase data from WooCommerce.</p>
                        <p>User-specific exam history is also handled with a cache-first approach. Results are loaded from <code>localStorage</code> for speed, then synced with the server in the background to pull down any results from other devices.</p>
                    </Section>
                    <Section title="3.4 Exam Lifecycle: Start, Progress, Submission, and Syncing">
                        <ol>
                            <li><strong>Start:</strong> When a user starts an exam, the app calls the <code>/questions-from-sheet</code> endpoint. The WordPress backend acts as a secure proxy, fetching the questions from the linked Google Sheet, caching them on the server, and sending them to the user.</li>
                            <li><strong>Progress:</strong> As the user answers questions, their progress (answers, current question index, remaining time) is saved to <code>localStorage</code> in real-time. This critical feature prevents data loss if their browser crashes or they lose their internet connection.</li>
                            <li><strong>Submission:</strong> When the user clicks "Submit", the app first calculates the score and saves the complete <code>TestResult</code> object to <code>localStorage</code>. This provides an immediate UI update, redirecting them to the results page without waiting for the server.</li>
                            <li><strong>Syncing:</strong> In the background, the app sends the same <code>TestResult</code> object to the <code>/submit-result</code> API endpoint to be saved permanently to the user's profile on the WordPress backend. This "save locally first, then sync" approach provides a fast and resilient user experience.</li>
                        </ol>
                    </Section>
                </Chapter>

                <Chapter chapter="Chapter 14" title="Onboarding a New Tenant: A Step-by-Step Guide">
                     <p>This chapter provides the definitive workflow for launching a new examination portal for a client or brand using the Annapoorna Examination Engine.</p>
                     <Section title="Prerequisites">
                        <ul>
                           <li>Access to the React application's hosting provider (e.g., Vercel).</li>
                           <li>A fresh WordPress installation with WooCommerce activated.</li>
                           <li>The <code>mco-exam-integration-engine.zip</code> plugin file, which can be generated from this app's admin panel under <a href="/admin/integration">Integration</a>.</li>
                        </ul>
                     </Section>
                     <Section title="Step-by-Step Onboarding Process">
                        <ol>
                            <li>
                                <strong>Prepare App Hosting:</strong> In your hosting provider (e.g., Vercel), add the new tenant's subdomain to your project's domain list (e.g., <code>exams.new-client.com</code>).
                            </li>
                            <li>
                                <strong>Set Up WordPress Backend:</strong> On the new tenant's WordPress site, install and activate the <code>mco-exam-integration-engine.zip</code> plugin.
                            </li>
                            <li>
                                <strong>Configure JWT Secret:</strong> Edit the <code>wp-config.php</code> file of the new WordPress site and add a unique, secure secret key. This is critical for security.<br/>
                                <code>define('MCO_JWT_SECRET', 'your-super-long-and-random-string-goes-here');</code>
                            </li>
                            <li>
                                <strong>Run Initial Plugin Configuration:</strong> In the new WordPress admin, go to <strong>Exam App Engine → Tools</strong>. The page will present a checklist of required items. Complete them by:
                                <ul>
                                    <li>Setting the <strong>Exam Application URL</strong> in the "Main Settings" tab.</li>
                                    <li>Setting a <strong>Custom Logo URL</strong> or a default Site Icon.</li>
                                    <li>Configuring at least one <strong>Signature</strong> in the "Certificate Templates" tab.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Generate Tenant Blueprint:</strong> Once the checklist is complete, the "Generate & Download Blueprint" button will become active. Click it to download a perfectly formatted <code>tenant-config.json</code> file.
                            </li>
                            <li>
                                <strong>Deploy New Tenant Configuration:</strong>
                                <ul>
                                    <li>Rename the downloaded file (e.g., <code>new-client-config.json</code>) and place it in the <code>/public</code> directory of the React app's source code.</li>
                                    <li>Open <code>services/apiConfig.ts</code> and add a new entry to the <code>tenantMap</code> that points the new tenant's domain to their new config file and WordPress API URL.</li>
                                    <li>Commit these two files and push to your Git repository. Your hosting service will automatically deploy the update.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Finalization:</strong> The new tenant portal is now live. You can now begin creating WooCommerce products and Exam Programs in the tenant's WordPress backend, and they will automatically appear in their dedicated app instance.
                            </li>
                        </ol>
                     </Section>
                </Chapter>

            </div>
        </div>
    );
};

export default Handbook;