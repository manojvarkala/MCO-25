import React, { FC } from 'react';
import { HelpCircle, ChevronDown, UserCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Link } from 'react-router-dom';

const FAQItem: FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <details className="group border-b border-slate-200 py-4" open>
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
    const { isEffectivelyAdmin } = useAuth();
    const orgName = activeOrg ? activeOrg.name : 'our company';
    const websiteUrl = activeOrg ? `https://${activeOrg.website}` : '#';

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
                        <li>If the issue persists after a few minutes, please contact support via our <Link to="/feedback">Feedback form</Link>.</li>
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
                
                <FAQItem question="Why can't I get AI Feedback for my exam?">
                    <p>
                        The AI-Powered Feedback is a premium feature. Access is granted in two ways:
                    </p>
                     <ul>
                        <li><strong>For Subscribers:</strong> If you have an active monthly or yearly subscription, you get unlimited AI feedback on any exam you do not pass.</li>
                        <li><strong>For Bundle or Single Exam Purchasers:</strong> If you purchase an "Exam Bundle" or a single certification exam, you get AI feedback for that specific exam program.</li>
                    </ul>
                    <p>AI feedback is not generated for exams that you have passed.</p>
                </FAQItem>
            </div>

            {isEffectivelyAdmin && (
                <div className="mt-12">
                    <div className="text-center mb-8">
                        <UserCheck className="mx-auto h-12 w-12 text-cyan-500" />
                        <h2 className="text-3xl font-bold text-slate-800 mt-4">Administrator FAQ</h2>
                        <p className="text-slate-500 mt-2">Common questions for platform administrators.</p>
                    </div>
                    <div className="space-y-4">
                        <FAQItem question="How are Sales Analytics calculated?">
                            <p>The analytics dashboard combines data from two sources:</p>
                            <ul>
                                <li><strong>Sales & Revenue:</strong> This data is pulled directly from WooCommerce. "Sales" is the total unit count sold for a product SKU. "Revenue" is an <strong>estimate</strong> calculated by multiplying the unit count by the product's <em>current</em> price. It does not account for historical price changes or coupons.</li>
                                <li><strong>Attempts, Scores & Pass Rates:</strong> This data is aggregated from all user exam results stored in your WordPress database.</li>
                            </ul>
                        </FAQItem>
                        <FAQItem question="Why don't my WordPress changes appear in the app immediately?">
                             <p>
                                The platform uses multiple layers of caching for performance. If your changes aren't appearing:
                            </p>
                            <ol>
                                <li>Go to <strong>Admin → Admin Dashboard → System Health Check</strong>.</li>
                                <li>Under "Cache & Data Management," click the <strong>"Clear Config Cache"</strong> button. This clears the server-side cache.</li>
                                <li>If you've updated a Google Sheet with questions, click the <strong>"Clear Question Caches"</strong> button.</li>
                                <li>After clearing the cache, hard-refresh the app in your browser (Ctrl+Shift+R or Cmd+Shift+R) to bypass your browser's local cache.</li>
                            </ol>
                        </FAQItem>
                        <FAQItem question="How does the AI Content Engine work?">
                             <p>
                                The Content Engine uses the Google Gemini API to write blog posts.
                            </p>
                            <ul>
                                <li>It takes the name and description from one of your existing Exam Programs to use as a topic.</li>
                                <li>It sends a detailed prompt to the AI, instructing it to write an SEO-friendly article with specific sections (like "Career Opportunities") and to format it using WordPress block editor syntax.</li>
                                <li>It automatically adds a pre-styled Call-To-Action (CTA) block at the end of the post, linking directly back to that Exam Program in the app.</li>
                                <li>Finally, it sends the completed post to your WordPress site and schedules it for future publication based on the date and interval you set.</li>
                            </ul>
                        </FAQItem>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FAQ;