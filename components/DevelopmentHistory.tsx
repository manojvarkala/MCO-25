import React, { FC } from 'react';
import { History, Sparkles, ArrowUp, Bug, GitBranch, GitCommit } from 'lucide-react';

interface VersionEntryProps {
    version: string;
    date: string;
    isLatest?: boolean;
    features?: string[];
    improvements?: string[];
    fixes?: string[];
}

const VersionEntry: FC<VersionEntryProps> = ({ version, date, isLatest = false, features = [], improvements = [], fixes = [] }) => {
    const iconClass = "h-4 w-4 mr-2 flex-shrink-0";
    const titleClass = "text-sm font-bold text-slate-700 flex items-center mb-1";
    const itemClass = "text-sm text-slate-600 ml-6";

    return (
        <li className="mb-10 ml-6">
            <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${isLatest ? 'bg-cyan-500 text-white' : 'bg-slate-200'}`}>
                {isLatest ? <GitCommit size={14} /> : <GitBranch size={14} />}
            </span>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">Version {version}</h3>
                    <time className="text-sm font-normal leading-none text-slate-400">{date}</time>
                </div>
                <div className="space-y-3">
                    {features.length > 0 && (
                        <div>
                            <h4 className={titleClass}><Sparkles className={`${iconClass} text-yellow-500`} /> New Features</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                {features.map((item, i) => <li key={i} className={itemClass}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                    {improvements.length > 0 && (
                        <div>
                            <h4 className={titleClass}><ArrowUp className={`${iconClass} text-green-500`} /> Improvements</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                {improvements.map((item, i) => <li key={i} className={itemClass}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                     {fixes.length > 0 && (
                        <div>
                            <h4 className={titleClass}><Bug className={`${iconClass} text-red-500`} /> Bug Fixes</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                {fixes.map((item, i) => <li key={i} className={itemClass}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
};


const DevelopmentHistory: FC = () => {
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <History />
                Development History
            </h1>
            <div className="prose max-w-none text-slate-600 mb-8">
                <p>A timeline of the key milestones, feature releases, and architectural improvements that have shaped the Annapoorna Examination Engine into the platform it is today.</p>
            </div>
            
            <ol className="relative border-l border-slate-200">
                <VersionEntry 
                    version="2.7.1"
                    date="October 30, 2025"
                    isLatest={true}
                    improvements={[
                        "Finalized project-wide file structure cleanup to align with modern frontend conventions.",
                        "Standardized all component import paths to resolve module resolution errors during build.",
                    ]}
                    fixes={[
                        "Restored missing component files that were causing deployment failures.",
                        "Addressed intermittent network error on new product creation by standardizing data handling in all creation modals.",
                        "Corrected incorrect import paths in multiple components after directory consolidation."
                    ]}
                />
                 <VersionEntry 
                    version="2.7.0"
                    date="October 22, 2025"
                    features={[
                        "Launched the in-app Product Customizer for managing Simple, Subscription, and Bundle products directly.",
                        "Introduced the in-app Exam Program Customizer with bulk editing capabilities.",
                        "Added support for Product Bundles, packaging exams with subscriptions.",
                    ]}
                    improvements={[
                        "Refactored the Admin Panel into a new, scalable sidebar layout.",
                        "Improved SSO token handling to automatically sync user data in the background without blocking UI.",
                    ]}
                />
                 <VersionEntry 
                    version="2.6.0"
                    date="September 5, 2025"
                    features={[
                        "Implemented browser-based Proctoring for certification exams to ensure integrity.",
                        "Launched the Beta Tester program with a dedicated registration and onboarding flow.",
                        "Added a new 'Beta Tester Analytics' dashboard for admins."
                    ]}
                    improvements={[
                        "Redesigned the exam player UI for better navigation and clarity.",
                        "Overhauled the Results Page to be more detailed and user-friendly.",
                    ]}
                />
                 <VersionEntry 
                    version="2.5.0"
                    date="August 1, 2025"
                    features={[
                        "Integrated Google Gemini API to launch the 'AI-Powered Feedback' feature, generating personalized study guides.",
                        "Launched the 'AI Content Engine' to automatically generate and schedule SEO-friendly blog posts to WordPress.",
                    ]}
                    improvements={[
                        "Optimized API calls for fetching exam questions.",
                    ]}
                />
                <VersionEntry 
                    version="2.2.0"
                    date="June 15, 2025"
                    features={[
                        "Launched the initial version of the in-app Admin Panel.",
                        "Introduced the 'Sales Analytics' dashboard, providing insights into exam performance and revenue.",
                        "Added 'System Health Check' and other diagnostic tools for administrators.",
                    ]}
                    fixes={[
                        "Improved handling of expired JWTs to redirect users gracefully.",
                    ]}
                />
                 <VersionEntry 
                    version="2.0.0"
                    date="April 10, 2025"
                    features={[
                        "Major Architectural Rework: Introduced the multi-tenant system.",
                        "Created the `apiConfig.ts` service to dynamically load tenant configurations based on hostname.",
                        "Implemented dynamic theming support, allowing tenants to select different color schemes.",
                    ]}
                    improvements={[
                        "Refactored the entire app configuration loading to use a 'Cache-First, Then Validate' strategy for instant load times.",
                    ]}
                />
                <VersionEntry 
                    version="1.5.0"
                    date="February 20, 2025"
                    features={[
                        "Added PDF certificate generation for passed exams.",
                        "Introduced the user Profile page with a comprehensive exam history.",
                    ]}
                    improvements={[
                        "Enhanced local storage management for exam progress and results, improving offline resilience.",
                    ]}
                />
                 <VersionEntry 
                    version="1.0.0"
                    date="January 1, 2025"
                    features={[
                        "Official public launch of the Annapoorna Examination Engine.",
                        "Launched the `mco-exam-integration-engine` WordPress plugin.",
                        "Implemented Single Sign-On (SSO) with WordPress using JWTs.",
                        "Integrated with WooCommerce for single exam purchases.",
                    ]}
                />
                <VersionEntry 
                    version="0.5.0"
                    date="November 15, 2024"
                    features={[
                        "Integrated with Google Sheets as a dynamic source for exam questions, replacing hardcoded data.",
                    ]}
                    improvements={[
                        "Developed a backend proxy to securely fetch and cache questions from Google Sheets.",
                    ]}
                />
                <VersionEntry 
                    version="0.1.0"
                    date="October 1, 2024"
                    features={[
                        "Initial proof-of-concept created.",
                        "Basic React-based exam player with a timer and question navigator.",
                        "Hardcoded question data for initial testing.",
                    ]}
                />
            </ol>
        </div>
    );
};

export default DevelopmentHistory;
