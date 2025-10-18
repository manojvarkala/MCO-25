import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';

const Instructions: FC = () => {
    const { activeOrg } = useAppContext();

    const websiteUrl = activeOrg ? `https://${activeOrg.website}` : '#';
    const websiteName = activeOrg ? activeOrg.website : 'our main site';

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Platform Instructions</h1>
            <div className="prose max-w-none text-slate-600">
                <p>Welcome to the examination portal. This platform is designed to provide a seamless testing experience integrated with our main WordPress site.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Login and Access</h2>
                <p>
                    All users must log in through our main site, <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-600">{websiteName}</a>. Your account there will grant you access to this portal. 
                    If you have purchased any certification exams, they will be automatically synced to your dashboard upon logging in.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Taking Exams</h2>
                <p>
                    From your dashboard, you can access both free practice tests and your purchased certification exams. Please ensure your full name is correct on the dashboard, as this will be used on your certificate.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Important: During the Exam</h2>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
                    <p className="font-bold text-red-800">Please read carefully before starting any exam:</p>
                    <ul className="list-disc pl-5 text-red-700 space-y-2">
                        <li>
                            <strong>Browser Security (by Exam App):</strong> The exam environment itself is secured. You must:
                             <ul className="list-['-_'] pl-5 mt-1">
                                <li>Take the exam in <strong>fullscreen mode</strong>. Exiting fullscreen is a violation.</li>
                                <li><strong>Stay on the exam tab.</strong> Navigating away, minimizing the window, or switching to another application will be flagged. Multiple violations will terminate your exam.</li>
                            </ul>
                        </li>
                        <li><strong>Single Session Rule:</strong> Only have one exam session open at a time. Do not attempt to log in from another browser or device while your exam is in progress.</li>
                        <li><strong>Stable Connection:</strong> Ensure you have a stable internet connection before starting.</li>
                    </ul>
                </div>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Results and Certificates</h2>
                 <p>
                    Upon completing an exam, your results will be displayed after a brief evaluation animation.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                     <p className="font-bold text-blue-800">Understanding Your Results:</p>
                     <ul className="list-disc pl-5 text-blue-700 space-y-2">
                        <li>
                            <strong>Immediate Score:</strong> Your score and pass/fail status are always shown immediately after the exam.
                        </li>
                        <li>
                            <strong>Certificate Issuance:</strong>
                            <ul className="list-['-_'] pl-5 mt-1">
                                <li>If you pass an exam with <strong>no proctoring violations</strong>, your certificate will be available for download instantly.</li>
                                <li>If you pass but the system logged proctoring violations (like exiting fullscreen), you will receive a <strong>"Provisional Pass"</strong>. Your certificate will be issued within 24 hours after a brief integrity review by our team.</li>
                            </ul>
                        </li>
                     </ul>
                </div>
                <p>
                    For practice tests, you will be able to review your answers. For paid certification exams, passing scores will unlock a downloadable certificate of completion.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">WordPress Integration for Admins</h2>
                <p>
                    To set up the SSO functionality, create a page on your WordPress site with the slug <code>exam-login</code> and place the <code>[mco_exam_login]</code> shortcode on it. For more details, see the <Link to="/admin/integration" className="text-cyan-600">Integration Guide</Link>.
                </p>
            </div>
        </div>
    );
};

export default Instructions;