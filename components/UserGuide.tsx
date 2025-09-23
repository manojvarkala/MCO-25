import React, { FC } from 'react';
import { LayoutDashboard, FileText, CheckCircle, Sparkles, Award, Star, MessageSquare, BookOpen, ShoppingBag, LogIn } from 'lucide-react';

const UserGuide: FC = () => {
    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">User Guide</h1>
            <div className="prose max-w-none text-slate-600">
                <p>Welcome to the Medical Coding Online Examination Portal! This guide will help you understand all the features available to make your learning and certification journey smooth and successful.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2 flex items-center gap-2"><LogIn /> Getting Started: Login & Sync</h2>
                <p>
                    Your journey begins on our main website, <a href="https://www.coding-online.net" target="_blank" rel="noopener noreferrer" className="text-cyan-600">coding-online.net</a>. You must <strong>register</strong> and <strong>log in</strong> there first.
                </p>
                <ul>
                    <li>After purchasing an exam or subscription, log in through the main site to be redirected here.</li>
                    <li>If you've made a new purchase, click the <strong>"Sync My Exams"</strong> button on your dashboard to load your new entitlements.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2 flex items-center gap-2"><LayoutDashboard /> The Dashboard</h2>
                <p>Your dashboard is your central hub for all activities:</p>
                <ul>
                    <li><strong>Subscription & Bundle Offers:</strong> At the top, you'll see options to subscribe or purchase bundles for the best value.</li>
                    <li><strong>My Exam Programs:</strong> This is where you'll find your exams. Each program has two parts:
                        <ul>
                            <li><strong>Free Practice:</strong> A shorter test to warm you up. You can take this multiple times (subscribers get unlimited attempts).</li>
                            <li><strong>Certification Exam:</strong> The full exam. This is unlocked after purchase and is limited to 3 attempts.</li>
                        </ul>
                    </li>
                    <li><strong>My Stats:</strong> Get a quick overview of your performance, including your average and best scores.</li>
                    <li><strong>My Exam History:</strong> A list of all your completed exams. You can revisit the results page from here.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2 flex items-center gap-2"><FileText /> Taking an Exam</h2>
                <ul>
                    <li><strong>Timer:</strong> All exams are timed. The timer starts as soon as the test loads and will be visible at the top of the screen. If time runs out, your test will be submitted automatically.</li>
                    <li><strong>Navigation:</strong> You can move between questions using the "Previous" and "Next" buttons, or jump directly to any question using the navigator at the top. Answered questions will be highlighted.</li>
                    <li><strong>Submitting:</strong> Once you've answered all questions, click the "Submit" button. If you have unanswered questions, you'll be asked to confirm before submitting.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2 flex items-center gap-2"><CheckCircle /> Results, Feedback & Certificates</h2>
                <p>After submitting, you'll be taken to the Results page:</p>
                <ul>
                    <li><strong><Sparkles className="inline-block h-5 w-5 text-amber-500" /> AI-Powered Feedback:</strong> This premium feature generates a personalized PDF study guide based on your incorrect answers. Access is unlocked in two ways:
                        <ul>
                            <li><strong>For Subscribers:</strong> You get AI feedback for <strong>any exam</strong> you don't pass, including all practice tests.</li>
                            <li><strong>For Exam Purchasers:</strong> Purchasing a certification exam unlocks AI feedback for that specific exam program (both its certification and practice versions), as long as you have attempts remaining.</li>
                        </ul>
                    </li>
                    <li><strong><Star className="inline-block h-5 w-5 text-yellow-400" /> Rate Your Experience:</strong> After each exam, you can leave a star rating and a review. This helps us and other users! Your ratings will appear on the exam cards on the main website.</li>
                    <li><strong><Award className="inline-block h-5 w-5 text-blue-500" /> Certificate:</strong> If you pass a paid certification exam, a button will appear to "Download Your Certificate". Make sure your name is correct on your profile, as this is the name that will be printed on it.</li>
                    <li><strong>Answer Review:</strong> For <strong>practice tests</strong>, you can review every question to see your answer and the correct one. To protect the integrity of the certification exams, this feature is not available for paid tests.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2 flex items-center gap-2"><MessageSquare /> General Feedback</h2>
                <p>
                    Have a suggestion, found a bug, or just want to share your thoughts? Use the <strong>"Feedback"</strong> link in the footer to send us a message. We appreciate your input!
                </p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2 flex items-center gap-2"><BookOpen /> Book Store & <ShoppingBag /> Pricing</h2>
                <ul>
                    <li>Visit the <strong>"Book Store"</strong> to see our curated list of recommended study materials. We provide convenient, geo-targeted links to purchase them on Amazon.</li>
                    <li>The <strong>"Pricing"</strong> page gives a clear overview of all subscription and pay-per-exam options available.</li>
                </ul>
            </div>
        </div>
    );
};

export default UserGuide;