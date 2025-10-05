import React, { FC } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';

const FAQItem: FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <details className="group border-b border-slate-200 py-4">
        <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-800 hover:text-cyan-600">
            {question}
            <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="prose prose-slate mt-4 max-w-none text-slate-600">
            {children}
        </div>
    </details>
);

const FAQ: FC = () => {
    const { activeOrg } = useAppContext();
    const orgName = activeOrg ? activeOrg.name : 'our company';
    const websiteUrl = activeOrg ? `https://www.${activeOrg.website}` : '#';

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <div className="text-center mb-8">
                <HelpCircle className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Frequently Asked Questions</h1>
                <p className="text-slate-500 mt-2">Find answers to common questions about our examination platform.</p>
            </div>

            <div className="space-y-4">
                <FAQItem question="How do I log in or create an account?">
                    <p>All user accounts are managed through our main website for security. To get started:</p>
                    <ol>
                        <li>Go to <a href={websiteUrl} target="_blank" rel="noopener noreferrer">{websiteUrl}</a>.</li>
                        <li>Click "Register" to create a new account, or "Login" if you already have one.</li>
                        <li>Once you are logged in on the main site, you will be automatically logged into this examination portal.</li>
                    </ol>
                </FAQItem>
                
                <FAQItem question="I just purchased an exam, but it's not on my dashboard. What do I do?">
                    <p>
                        Sometimes there's a small delay in syncing your purchases. Please try the following:
                    </p>
                    <ul>
                        <li>Click the <strong>"Sync My Exams"</strong> button on your dashboard. This forces the system to check for new purchases.</li>
                        <li>Log out of the main site and log back in again. This will generate a new, updated access token.</li>
                        <li>If the issue persists after a few minutes, please contact support via our <a href="#/feedback">Feedback form</a>.</li>
                    </ul>
                </FAQItem>

                <FAQItem question="What happens if I lose my internet connection during an exam?">
                    <p>
                        Your progress is saved to your browser every time you answer a question. If you get disconnected:
                    </p>
                    <ol>
                        <li>Reconnect to the internet.</li>
                        <li>Go back to your dashboard. You will see a notice about an "exam in progress".</li>
                        <li>Click "Resume Exam" to continue right where you left off. Your timer will also have paused and will resume from where it was.</li>
                    </ol>
                </FAQItem>

                <FAQItem question="Why do I need to be in fullscreen for some exams?">
                    <p>
                        For our official certification exams, we use browser-based proctoring to ensure the integrity of the test environment. This involves:
                    </p>
                    <ul>
                        <li><strong>Fullscreen Mode:</strong> Prevents distractions and access to other materials on your computer.</li>
                        <li><strong>Focus Monitoring:</strong> The system checks if you switch to another browser tab or application.</li>
                    </ul>
                    <p>Exiting fullscreen or switching tabs is considered a "violation." You will receive a warning, and multiple violations may lead to your exam being automatically terminated.</p>
                </FAQItem>

                <FAQItem question="My certificate is not available, but I passed. Why?">
                     <p>
                        This happens when the system detects proctoring violations during your exam. While your score is shown immediately, we place the certificate on a brief hold for an integrity review.
                    </p>
                    <ul>
                        <li>You will see a message about a <strong>"Provisional Pass"</strong>.</li>
                        <li>Our team will review the session flags. For legitimate passes, your certificate will be issued within 24 hours.</li>
                        <li>You will receive an email notification as soon as your certificate is ready.</li>
                    </ul>
                </FAQItem>
                
                <FAQItem question="Why can't I get AI Feedback for my exam?">
                    <p>
                        The AI-Powered Feedback is a premium feature. Access is granted in two ways:
                    </p>
                     <ul>
                        <li><strong>For Subscribers:</strong> If you have an active monthly or yearly subscription, you get unlimited AI feedback on any exam you do not pass.</li>
                        <li><strong>For Bundle Purchasers:</strong> If you purchase an "Exam Bundle", you get AI feedback for that specific exam program for the duration of your bundle's access period.</li>
                    </ul>
                    <p>AI feedback is not generated for exams that you have passed.</p>
                </FAQItem>
            </div>
        </div>
    );
};

export default FAQ;