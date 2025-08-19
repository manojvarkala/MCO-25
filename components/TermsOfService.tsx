import React from 'react';

const TermsOfService: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Terms of Service</h1>
            <div className="prose max-w-none text-slate-600">
                <p><em>Last Updated: {new Date().toLocaleDateString()}</em></p>
                <p>
                    Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Medical Coding Online Examination application (the "Service") operated by Annapoorna Infotech ("us", "we", or "our").
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">1. Acceptance of Terms</h2>
                <p>
                    By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service. Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">2. Accounts</h2>
                <p>
                    When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
                </p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">3. Intellectual Property</h2>
                <p>
                    The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Annapoorna Infotech and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.
                </p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">4. User Conduct</h2>
                <p>You agree not to use the Service:</p>
                <ul>
                    <li>In any way that violates any applicable national or international law or regulation.</li>
                    <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
                    <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
                    <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
                    <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm the Company or users of the Service or expose them to liability.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">5. Termination</h2>
                <p>
                    We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                </p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">6. Limitation Of Liability</h2>
                <p>
                    In no event shall Annapoorna Infotech, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">7. Changes to Terms</h2>
                <p>
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Contact Us</h2>
                <p>
                    If you have any questions about these Terms, please contact us through the <a href="#/feedback" className="text-cyan-600">Feedback form</a> on our site.
                </p>
            </div>
        </div>
    );
};

export default TermsOfService;
