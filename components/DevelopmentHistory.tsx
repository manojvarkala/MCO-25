import React, { FC, ReactNode } from 'react';
import { History, Sparkles, Bug, Paintbrush, Server, GitBranch, Zap, FileJson } from 'lucide-react';

type HistoryItemType = 'feature' | 'fix' | 'ux' | 'backend' | 'workflow';

interface HistoryItem {
    version: string;
    title: string;
    description: string;
    type: HistoryItemType;
    icon: ReactNode;
}

const historyData: HistoryItem[] = [
    {
        version: '1.0.3',
        title: 'Modular Handbook Architecture & Content Expansion',
        description: 'Refactored the entire handbook into a modular, multi-file architecture for better maintainability. All existing chapters were significantly expanded with more technical detail and practical examples to create a more comprehensive resource.',
        type: 'workflow',
        icon: <GitBranch size={18} />,
    },
    {
        version: '1.0.1',
        title: 'Enhanced Product Bulk Editor & Safer Plugin Architecture',
        description: 'Redesigned the Product Customizer with a tabbed interface for bulk-editing Simple vs. Subscription products. Re-implemented the safer two-file plugin structure to prevent installation errors.',
        type: 'feature',
        icon: <GitBranch size={18} />,
    },
    {
        version: '1.0.0',
        title: 'Public Release & Fresh Versioning',
        description: 'Reset the plugin version to 1.0.0 for a clean public release. This establishes a professional Semantic Versioning (SemVer) workflow for all future updates.',
        type: 'workflow',
        icon: <Zap size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Dynamic Plugin ZIP Generation',
        description: 'Revolutionized the plugin installation process by creating a dynamic, in-browser .zip file generator. This eliminated all manual file renaming for administrators, making installation seamless and error-proof.',
        type: 'feature',
        icon: <Sparkles size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Theme-Aware Exam Cards',
        description: 'Integrated the exam program cards on the dashboard into the theme engine, ensuring their colors and gradients dynamically adapt to the selected theme.',
        type: 'ux',
        icon: <Paintbrush size={18} />,
    },
     {
        version: 'Pre-Release',
        title: 'Advanced Bulk Editing',
        description: 'Implemented a comprehensive bulk-editing system for both Exam Program and Product customizers, featuring checkboxes, "Select All", and a contextual toolbar/panel to apply widespread changes efficiently.',
        type: 'feature',
        icon: <Sparkles size={18} />,
    },
     {
        version: 'Pre-Release',
        title: 'PDF Signature & User Support Enhancements',
        description: 'Improved the certificate editor to prioritize base64 for signatures, preventing CORS errors in PDFs. Added a comprehensive FAQ page and clearer instructions about the new hybrid results system.',
        type: 'ux',
        icon: <Paintbrush size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Drag-and-Drop Question Sections',
        description: 'Introduced a visual section editor in the Exam Program Customizer, allowing admins to group questions into named sections with a simple drag-and-drop interface for better exam navigation.',
        type: 'feature',
        icon: <Sparkles size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Graceful AI Error Handling & Hybrid Results',
        description: 'Implemented the hybrid results model: immediate scores with delayed certificates for flagged exams. Added a "processing" animation and a system to gracefully handle Gemini API errors by notifying admins without showing technical errors to users.',
        type: 'ux',
        icon: <Paintbrush size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Comprehensive Diagnostic & Cache Tools',
        description: 'Built admin-facing tools to diagnose issues: a System Health Check, a Google Sheet URL tester, and cache management buttons to clear app or question caches on demand from the server.',
        type: 'backend',
        icon: <Server size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Unified Admin Experience',
        description: 'Created a unified admin layout with a persistent sidebar for easy navigation between the Dashboard, Customizers, and Integration pages. Also implemented a fully theme-aware Dashboard.',
        type: 'ux',
        icon: <Paintbrush size={18} />,
    },
     {
        version: 'Pre-Release',
        title: 'Full In-App Exam Program Customizer',
        description: 'Empowered admins by moving all exam program settings (source URLs, question counts, durations, toggles) into a dedicated customizer within the app, with live updates to the WordPress backend.',
        type: 'feature',
        icon: <Sparkles size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Dynamic Theming Engine',
        description: 'Architected and implemented a complete theming system using CSS variables. Created five distinct themes and added selectors in both the WordPress backend (for defaults) and the user profile (for overrides).',
        type: 'feature',
        icon: <Sparkles size={18} />,
    },
     {
        version: 'Pre-Release',
        title: 'Advanced WooCommerce Integration',
        description: 'Built the Product Customizer page, allowing admins to define multiple product variations (Simple, Subscription, Bundle) for each exam and generate a compatible CSV for bulk import into WooCommerce.',
        type: 'feature',
        icon: <FileJson size={18} />,
    },
    {
        version: 'Pre-Release',
        title: 'Initial Scaffolding & Core Architecture',
        description: 'Laid the foundation of the application, including the multi-tenant React frontend, the WordPress integration plugin, secure JWT-based SSO, and the core exam player functionality.',
        type: 'backend',
        icon: <Server size={18} />,
    },
];

const TimelineItem: FC<{ item: HistoryItem; isLast: boolean }> = ({ item, isLast }) => {
    const typeClasses = {
        feature: { bg: 'bg-green-100', text: 'text-green-800', iconBg: 'bg-green-500' },
        fix: { bg: 'bg-amber-100', text: 'text-amber-800', iconBg: 'bg-amber-500' },
        ux: { bg: 'bg-blue-100', text: 'text-blue-800', iconBg: 'bg-blue-500' },
        backend: { bg: 'bg-slate-100', text: 'text-slate-800', iconBg: 'bg-slate-500' },
        workflow: { bg: 'bg-purple-100', text: 'text-purple-800', iconBg: 'bg-purple-500' },
    };
    const classes = typeClasses[item.type];

    return (
        <div className="relative pl-8">
            {!isLast && <div className="absolute left-3 top-5 -bottom-4 w-0.5 bg-[rgb(var(--color-border-rgb))]"></div>}
            <div className="absolute left-0 top-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${classes.iconBg}`}>
                    <div className="text-white">{item.icon}</div>
                </div>
            </div>
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${classes.bg} ${classes.text}`}>
                        v{item.version}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-[rgb(var(--color-text-strong-rgb))]">{item.title}</h3>
                <p className="text-sm text-[rgb(var(--color-text-muted-rgb))] mt-1">{item.description}</p>
            </div>
        </div>
    );
};

const DevelopmentHistory: FC = () => {
    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <History />
                Development History
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                A chronological log of all major features, enhancements, and architectural decisions made for this platform.
            </p>
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                {historyData.map((item, index) => (
                    <TimelineItem key={index} item={item} isLast={index === historyData.length - 1} />
                ))}
            </div>
        </div>
    );
};

export default DevelopmentHistory;