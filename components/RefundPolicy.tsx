import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';

const RefundPolicy: FC = () => {
    const { activeOrg } = useAppContext();
    const orgName = activeOrg ? activeOrg.name : 'our company';

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Refund & Cancellation Policy</h1>
            <div className="prose max-w-none text-slate-600">
                <p><em>Last Updated: {new Date().toLocaleDateString()}</em></p>
                <p>
                    Thank you for purchasing our products at {orgName}. We are committed to providing our customers with high-quality exam preparation materials.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Digital Products</h2>
                <p>
                    Our products, including individual Certification Exam purchases and Subscriptions, are digital and delivered via the internet.
                </p>

                <h3 className="text-xl font-semibold text-slate-700 mt-4 mb-2">Individual Certification Exam Purchases</h3>
                <p>
                    Due to the digital nature of our certification exams and the immediate access provided upon purchase, we generally do not offer refunds. All sales are considered final.
                </p>
                <p>
                    <strong>Refunds will not be provided under the following circumstances:</strong>
                </p>
                <ul>
                    <li>You have attempted the exam.</li>
                    <li>You have changed your mind after purchase.</li>
                    <li>You purchased the wrong exam by mistake (please review your cart carefully before purchase).</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-700 mt-4 mb-2">Subscription Plans (Monthly & Yearly)</h3>
                <p>
                    You can cancel your subscription at any time from your "My Account" page on our main website.
                </p>
                <ul>
                    <li>When you cancel, your subscription will remain active until the end of your current billing period. You will not be charged for the next billing cycle.</li>
                    <li>We do not offer prorated refunds for subscriptions canceled mid-cycle.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Exceptional Circumstances</h2>
                <p>
                    We may consider refunds on a case-by-case basis for exceptional circumstances, such as a duplicate purchase or a demonstrable technical issue that prevented you from accessing the product.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">How to Contact Us</h2>
                <p>
                    If you believe you are eligible for a refund under exceptional circumstances, please contact our support team via the <Link to="/feedback" className="text-cyan-600">Feedback form</Link> within 7 days of your purchase. Please include your order number and a detailed explanation of the issue.
                </p>
            </div>
        </div>
    );
};

// FIX: Added missing default export.
export default RefundPolicy;