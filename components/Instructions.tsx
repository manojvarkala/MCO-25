

import React, { FC } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { Link } from "react-router-dom";
import { useAppContext } from '../context/AppContext.tsx';
import { LogIn, FileText, MonitorPlay, CheckCircle, Award, Sparkles } from 'lucide-react';

const InstructionCard: FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4 mb-3">
            <div className="bg-cyan-100 text-cyan-600 p-3 rounded-full">
                {icon}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>
        <div className="prose prose-slate max-w-none text-slate-600">
            {children}
        </div>
    </div>
);

const Instructions: FC = () => {
    const { activeOrg } = useAppContext();
    const websiteUrl = activeOrg ? `https://${activeOrg.website}` : '#';
    const websiteName = activeOrg ? activeOrg.website : 'our main site';

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4 text-center">Platform Instructions</h1>
            <p className="text-center text-slate-600 mb-8">Welcome to the {activeOrg?.name || 'Examination'} Portal. Here’s everything you need to know to get started.</p>

            <div className="space-y-6">
                <InstructionCard icon={<LogIn size={24} />} title="Login and Access">
                    <p>
                        All user accounts are managed through our main site, <a href={websiteUrl} target="_blank" rel="noopener noreferrer">{websiteName}</a>, for your security.
                    </p>
                    <ul>
                        <li>Log in on our main site to be automatically granted access to this exam portal.</li>
                        <li>If you've just made a purchase, click the "Sync My Exams" button on your dashboard to see your new content instantly.</li>
                    </ul>
                </InstructionCard>

                <InstructionCard icon={<FileText size={24} />} title="Taking an Exam">
                    <p>From your dashboard, you can access both free practice tests and purchased certification exams. Please ensure your full name is correct on your <Link to="/profile">profile page</Link>, as this will be used on your certificate.</p>
                </InstructionCard>

                <InstructionCard icon={<MonitorPlay size={24} />} title="Important: Exam Integrity Rules">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 my-2 text-sm">
                        <p className="font-bold text-red-800">Please read carefully before starting any proctored exam:</p>
                        <ul className="list-disc pl-5 text-red-700 space-y-1 mt-2">
                            <li>You must take the exam in <strong>fullscreen mode</strong>. Exiting fullscreen is a violation.</li>
                            <li>You must <strong>stay on the exam tab</strong>. Navigating away or minimizing the window will be flagged.</li>
                             <li>After <strong>three violations</strong>, your exam will be automatically terminated, and the attempt will be forfeited.</li>
                        </ul>
                    </div>
                </InstructionCard>

                <InstructionCard icon={<Award size={24} />} title="Results and Certificates">
                    <p>After your exam, your results are displayed immediately. Here’s how certificates work:</p>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-2 text-sm">
                        <ul className="list-disc pl-5 text-blue-700 space-y-2">
                            <li>
                                <strong>Instant Certificate:</strong> If you pass a certification exam with no proctoring violations, your certificate is available for download instantly from the results page.
                            </li>
                            <li>
                                <strong>Provisional Pass:</strong> If you pass but the system logged one or more violations, you will receive a "Provisional Pass." Your certificate will be issued within 24 hours after a brief, standard integrity review. You will be notified via email.
                            </li>
                        </ul>
                    </div>
                </InstructionCard>
                
                 <InstructionCard icon={<Sparkles size={24} />} title="AI-Powered Feedback">
                    <p>
                        For exams you don't pass, you may be eligible for an AI-Powered Study Guide. This premium feature is available to:
                    </p>
                     <ul>
                        <li>All active subscribers.</li>
                        <li>Users who have purchased an bundle that includes this feature.</li>
                        <li>Users who have purchased a single certification exam (feedback is available for that specific exam program).</li>
                    </ul>
                </InstructionCard>
            </div>
        </div>
    );
};

export default Instructions;