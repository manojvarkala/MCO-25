import React from 'react';
import { Users, Target, Zap } from 'lucide-react';

const AboutUs: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4 text-center">About Medical Coding Online</h1>
            <p className="text-lg text-slate-600 text-center mb-8">
                Empowering the next generation of medical coding professionals through technology and expertise.
            </p>
            
            <div className="space-y-6 text-slate-700">
                <p>
                    Medical Coding Online was founded with a clear mission: to provide aspiring and current medical coders with the highest quality preparation tools for their certification exams. We believe that success comes from a combination of comprehensive knowledge and practical, exam-realistic experience.
                </p>
                <p>
                    Our platform is built by a team of certified coding experts and seasoned technologists who understand the challenges of mastering this complex field. We've meticulously designed our exam modules to mirror the format, difficulty, and scope of official certification tests from bodies like AAPC and AHIMA.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 text-center">
                    <div className="bg-slate-50 p-6 rounded-lg">
                        <Target className="mx-auto h-10 w-10 text-cyan-500 mb-3" />
                        <h3 className="text-xl font-semibold text-slate-800">Our Mission</h3>
                        <p className="text-sm mt-2">To bridge the gap between theoretical knowledge and certification success by offering a dynamic, accessible, and effective online testing environment.</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-lg">
                        <Users className="mx-auto h-10 w-10 text-cyan-500 mb-3" />
                        <h3 className="text-xl font-semibold text-slate-800">Expert-Led Content</h3>
                        <p className="text-sm mt-2">All our exam questions and study materials are created and vetted by certified professionals with years of industry experience.</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-lg">
                        <Zap className="mx-auto h-10 w-10 text-cyan-500 mb-3" />
                        <h3 className="text-xl font-semibold text-slate-800">Innovative Technology</h3>
                        <p className="text-sm mt-2">Leveraging features like AI-powered feedback, we provide personalized study paths to help you focus on your areas of improvement.</p>
                    </div>
                </div>

                <p className="mt-8">
                    Whether you are just starting your career or are looking to achieve your next credential, Medical Coding Online is your trusted partner. We are committed to your success and are continuously updating our platform to ensure you have the best possible resources at your fingertips.
                </p>
            </div>
        </div>
    );
};

export default AboutUs;
