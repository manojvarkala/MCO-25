import React, { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import LogoSpinner from './LogoSpinner.tsx';
import { Beaker, Send } from 'lucide-react';

const BetaRegistration: FC = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        country: '',
        deviceType: '',
        os: '',
        browser: '',
        experience: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const toastId = toast.loading('Submitting your registration...');

        try {
            const response = await googleSheetsService.registerBetaTester(formData);
            if (response.success) {
                toast.success(response.message || 'Registration successful! Please check your email.', { id: toastId });
                setIsSuccess(true);
            } else {
                throw new Error(response.message || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit registration.', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
                <Beaker className="mx-auto h-12 w-12 text-green-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Thank You for Registering!</h1>
                <p className="text-slate-600 mt-2">
                    We have received your application. If you are selected, you will receive an email within the next 24-48 hours with your unique link to access the beta program.
                </p>
                <Link to="/" className="inline-block mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">
                    Back to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <div className="text-center mb-8">
                <Beaker className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Become a Beta Tester</h1>
                <p className="text-slate-500 mt-2">
                    Help us test our exam portal and get <strong>1 Month of FREE Premium Access</strong> and a <strong>50% affiliate commission</strong> as a thank you!
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">Full Name</label>
                        <input type="text" name="fullName" id="fullName" required onChange={handleChange} className="mt-1 block w-full" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                        <input type="email" name="email" id="email" required onChange={handleChange} className="mt-1 block w-full" />
                    </div>
                </div>
                <div>
                    <label htmlFor="country" className="block text-sm font-medium text-slate-700">Country</label>
                    <input type="text" name="country" id="country" required onChange={handleChange} className="mt-1 block w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="deviceType" className="block text-sm font-medium text-slate-700">Device Type</label>
                        <select name="deviceType" id="deviceType" required onChange={handleChange} className="mt-1 block w-full">
                            <option value="">Select...</option>
                            <option>Laptop/Desktop</option>
                            <option>Tablet</option>
                            <option>Mobile</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="os" className="block text-sm font-medium text-slate-700">Operating System</label>
                        <select name="os" id="os" required onChange={handleChange} className="mt-1 block w-full">
                            <option value="">Select...</option>
                            <option>Windows</option>
                            <option>macOS</option>
                            <option>Android</option>
                            <option>iOS</option>
                            <option>Linux</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="browser" className="block text-sm font-medium text-slate-700">Browser</label>
                        <select name="browser" id="browser" required onChange={handleChange} className="mt-1 block w-full">
                            <option value="">Select...</option>
                            <option>Chrome</option>
                            <option>Firefox</option>
                            <option>Safari</option>
                            <option>Edge</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-slate-700">Medical Coding Experience</label>
                    <select name="experience" id="experience" required onChange={handleChange} className="mt-1 block w-full">
                        <option value="">Select...</option>
                        <option>CPC Certified</option>
                        <option>CPC Student</option>
                        <option>ICD-10 Learner</option>
                        <option>None (tech background only)</option>
                        <option>Other</option>
                    </select>
                </div>
                 <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <input id="agreement" name="agreement" type="checkbox" className="h-4 w-4 rounded" required />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="agreement" className="font-medium text-slate-700">I agree to test the platform and report feedback.</label>
                        <p className="text-slate-500">I understand I will receive 1 Month FREE Premium Access + 50% Affiliate Revenue upon successful testing.</p>
                    </div>
                </div>

                <div>
                    <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400">
                        {isSubmitting ? <LogoSpinner /> : <Send size={16} />}
                        Submit Application
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BetaRegistration;