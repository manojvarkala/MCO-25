

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
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                    <p className="font-bold text-yellow-800">Please read carefully before starting any exam:</p>
                    <ul className="list-disc pl-5 text-yellow-700">
                        <li><strong>Do Not Close or Refresh:</strong> Once you begin an exam, do not close your browser tab or refresh the page. While we save your progress, interruptions can affect the timer.</li>
                        <li><strong>Single Session Rule:</strong> Only have one exam session open at a time. Do not attempt to log in from another browser or device while your exam is in progress, as this can lead to conflicts and potential loss of your attempt.</li>
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