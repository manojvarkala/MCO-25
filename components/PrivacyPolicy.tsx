
import React, { FC } from 'react';
// FIX: Standardized named import from react-router-dom using single quotes.
import { Link } from 'react-router-dom';
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
                    This Privacy Policy describes how {orgName} ("we", "us", or "our") collects, uses, and discloses your personal information when you use our examination portal application (the "Service").
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">1. Information We Collect</h2>
                <p>
                    We collect personal information that you voluntarily provide to us when you register on the Service, participate in exams, or interact with our features. The personal information that we collect depends on the context of your interactions with us and the Service, the choices you make, and the products and features you use. The personal information we collect may include:
                </p>
                <ul>
                    <li><strong>Personal Identifiers:</strong> Name, email address, user ID, and other similar contact data.</li>
                    <li><strong>Exam Data:</strong> Your answers, scores, exam progress, and performance on examinations.</li>
                    <li><strong>Usage Data:</strong> Information about how you access and use the Service, such as IP address, browser type, device information, pages viewed, and the dates/times of your visits.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">2. How We Use Your Information</h2>
                <p>We use the information we collect for various purposes, including:</p>
                <ul>
                    <li>To provide, operate, and maintain our Service, including administering exams and displaying results.</li>
                    <li>To improve, personalize, and expand our Service, such as developing new features and enhancing user experience.</li>
                    <li>To understand and analyze how you use our Service, to track and measure performance, and to generate analytics reports.</li>
                    <li>To communicate with you, directly or through one of our partners, for customer service, to provide you with updates and other information relating to the Service, and for marketing and promotional purposes.</li>
                    <li>To process your transactions and manage your purchases (e.g., exam access, subscriptions).</li>
                    <li>To generate and provide downloadable certificates upon successful completion of exams.</li>
                    <li>For security purposes, to detect and prevent fraud, and to protect the integrity of our examinations (e.g., proctoring features).</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">3. Sharing Your Information</h2>
                <p>We may share your information with third parties in the following situations:</p>
                <ul>
                    <li><strong>With Service Providers:</strong> We may share your information with third-party service providers who perform services on our behalf, such as hosting, data analysis, email delivery, and customer service.</li>
                    <li><strong>For Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
                    <li><strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent.</li>
                    <li><strong>Legal Requirements:</strong> We may disclose your information where required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).</li>
                </ul>
                <p>We do not sell your personal information to third parties.</p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">4. Data Security</h2>
                <p>
                    We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet, or method of electronic storage, is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">5. Your Privacy Rights</h2>
                <p>
                    Depending on your location, you may have the following rights concerning your personal data:
                </p>
                <ul>
                    <li>The right to access, update, or delete the information we have on you.</li>
                    <li>The right to object to our processing of your personal information.</li>
                    <li>The right to request that we restrict the processing of your personal information.</li>
                    <li>The right to data portability.</li>
                    <li>The right to withdraw your consent at any time where {orgName} relied on your consent to process your personal information.</li>
                </ul>
                <p>To exercise any of these rights, please contact us using the details below.</p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">6. Changes to This Privacy Policy</h2>
                <p>
                    We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "Last Updated" date at the top of this Privacy Policy.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us through our <Link to="/feedback" className="text-cyan-600">Feedback form</Link> on our site.
                </p>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
