import React, { FC, ReactNode } from 'react';
import { GitCommit, Milestone, Zap } from 'lucide-react';

interface HistoryItemProps {
    version: string;
    date: string;
    icon: React.ReactNode;
    // FIX: Corrected the type for the 'children' prop from 'React.Node' to 'React.ReactNode'.
    children: ReactNode;
}

const HistoryItem: FC<HistoryItemProps> = ({ version, date, icon, children }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0">
            <div className="bg-[rgb(var(--color-card-rgb))] p-3 rounded-full border border-[rgb(var(--color-border-rgb))]">
                {icon}
            </div>
        </div>
        <div className="ml-4">
            <div className="flex items-baseline gap-2">
                <span className="px-2 py-0.5 bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-default-rgb))] text-xs font-semibold rounded-full">{version}</span>
                <span className="text-sm text-[rgb(var(--color-text-muted-rgb))]">{date}</span>
            </div>
            <div className="mt-2 text-[rgb(var(--color-text-default-rgb))] prose prose-sm max-w-none">
                {children}
            </div>
        </div>
    </div>
);

const DevelopmentHistory: FC = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Development History</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">A timeline of major feature releases and milestones for the Examination Engine.</p>
            
            <div className="relative border-l-2 border-[rgb(var(--color-border-rgb))] pl-6 space-y-12">
                 <HistoryItem version="1.0.4" date="Current" icon={<Zap className="text-green-500" />}>
                    <p className="font-bold">Backup & Optimization Tools</p>
                    <ul>
                        <li><strong>Full Content Snapshot Tool:</strong> Added a new admin tool in WordPress to generate a complete, point-in-time JSON backup of all live content (exams, books, prices).</li>
                        <li><strong>Workflow Documentation:</strong> Updated the in-app Handbook to clarify the "Golden Workflow" for using the new snapshot tool to periodically update the app's static fallback file, improving performance for new visitors.</li>
                         <li><strong>Handbook PDF Generation:</strong> Re-engineered the PDF download feature to be more robust, ensuring complete content and correct formatting for the entire book.</li>
                    </ul>
                </HistoryItem>
                <HistoryItem version="1.0.3" date="Previous" icon={<Milestone className="text-cyan-500" />}>
                    <p className="font-bold">Plugin Generator & Admin Enhancements</p>
                    <ul>
                        <li><strong>WordPress Plugin Generator:</strong> Added a tool in the Admin panel to generate a complete, installable <code>.zip</code> file for the backend integration plugin, streamlining new tenant setup.</li>
                        <li><strong>Content Engine:</strong> Added AI-powered blog post generation from Exam Programs.</li>
                        <li><strong>Technical Handbook:</strong> Integrated and significantly expanded the comprehensive in-app guide for administrators and developers, including a book-like UI and PDF export.</li>
                    </ul>
                </HistoryItem>
                <HistoryItem version="1.0.2" date="Previous" icon={<GitCommit className="text-slate-500" />}>
                    <p className="font-bold">Admin Customizer Suite</p>
                    <ul>
                        <li><strong>Exam Program Customizer:</strong> Built a full CRUD interface for managing Exam Programs directly from the app.</li>
                        <li><strong>Product Customizer:</strong> Added an interface for managing WooCommerce simple products, subscriptions, and bundles.</li>
                        <li><strong>Sales Analytics:</strong> Integrated a new dashboard to display sales and performance metrics for exams.</li>
                    </ul>
                </HistoryItem>
                <HistoryItem version="1.0.1" date="Previous" icon={<GitCommit className="text-slate-500" />}>
                    <p className="font-bold">Core Feature Set & Multi-Tenancy</p>
                    <ul>
                        <li><strong>Initial Release:</strong> Launched the core platform with exam player, results page, dashboard, and user authentication.</li>
                        <li><strong>Multi-Tenant Architecture:</strong> Established the dynamic configuration system to support multiple, branded exam portals from a single codebase.</li>
                        <li><strong>AI Feedback & PDF Certificates:</strong> Integrated Gemini API for personalized study guides and implemented PDF certificate generation.</li>
                    </ul>
                </HistoryItem>
            </div>
        </div>
    );
};

export default DevelopmentHistory;