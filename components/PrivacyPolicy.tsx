import React, { FC } from 'react';
import { useAppContext } from '../context/AppContext.tsx';

const PrivacyPolicy: FC = () => {
    const { activeOrg } = useAppContext();
    const orgName = activeOrg ? activeOrg.name : 'Our Company';

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Privacy Policy</h1>
            <div className="prose max-w-none text-slate-600">
                <p><em>Last Updated: {new Date().toLocaleDateString()}</em></p>
                <p>
                    {orgName} ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our examination application (the "App").
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">1. Information We Collect</h2>
                <p>We may collect information about you in a variety of ways. The information we may collect via the App includes:</p>
                <ul>
                    <li><strong>Personal Data:</strong> Personally identifiable information, such as your name and email address, that you provide to us when you register and log in via our main WordPress site.</li>
                    <li><strong>Exam Data:</strong> Information related to your exam performance, including your answers, scores, and completion times. This data is synced and stored with your user profile on our secure WordPress backend.</li>
                    <li><strong>Feedback Data:</strong> When you submit feedback or reviews, we collect the content of your submission to improve our services.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">2. How We Use Your Information</h2>
                <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the App to:</p>
                <ul>
                    <li>Create and manage your account.</li>
                    <li>Generate certificates of completion.</li>
                    <li>Track your progress and exam history.</li>
                    <li>Provide you with personalized feedback and study guides.</li>
                    <li>Monitor and analyze usage and trends to improve your experience with the App.</li>
                    <li>Respond to your comments and questions.</li>
                </ul>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">3. Third-Party Services</h2>
                <p>
                    We use Google's Gemini API to provide our AI-Powered Feedback feature. When you request AI feedback, the questions you answered incorrectly are sent to the Gemini API to generate a study guide. This data is processed for the sole purpose of providing this service and is subject to Google's privacy policies. We do not send any personally identifiable information with these requests.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">4. Data Security</h2>
                <p>
                    We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">5. Contact Us</h2>
                <p>
                    If you have questions or comments about this Privacy Policy, please contact us through the <a href="#/feedback" className="text-cyan-600">Feedback form</a> on our site.
                </p>
            </div>
        </div>
    );
};

export default PrivacyPolicy;