

import * as React from 'react';

const Instructions: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Platform Instructions</h1>
            <div className="prose max-w-none text-slate-600">
                <p>Welcome to the examination portal. This platform is designed to provide a seamless testing experience integrated with our main WordPress site.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Login and Access</h2>
                <p>
                    All users must log in through our main site, <a href="https://www.coding-online.net" target="_blank" rel="noopener noreferrer" className="text-cyan-600">coding-online.net</a>. Your account there will grant you access to this portal. 
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
                            <strong>AI Proctoring via Camera:</strong> Your exam session will be monitored using your device's camera. The AI proctoring system will be active throughout the exam. You must:
                            <ul className="list-['-_'] pl-5 mt-1">
                                <li>Remain visible in the camera frame at all times.</li>
                                <li>Be in a well-lit, private room without other people present.</li>
                                <li>Avoid looking away from the screen for extended periods.</li>
                                <li>Not use any unauthorized materials like phones, notes, or other devices.</li>
                            </ul>
                            A critical violation detected by the AI proctor will result in immediate exam termination.
                        </li>
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
                    Upon completing an exam, your results will be displayed immediately. For practice tests, you will be able to review your answers. For paid certification exams, passing scores will unlock a downloadable certificate of completion.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">WordPress Integration for Admins</h2>
                <p>
                    For instructions on how to set up the SSO and results-sync functionality with your WordPress site, please see the <a href="#/integration" className="text-cyan-600">Integration Guide</a>.
                </p>
            </div>
        </div>
    );
};

export default Instructions;