import React, { FC, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import { Send, MessageSquare, CreditCard, Star } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { useAppContext } from '../context/AppContext.tsx';

const Feedback: FC = () => {
    const { token, isBetaTester } = useAuth();
    const { activeOrg, feedbackRequiredForExam, clearFeedbackRequired } = useAppContext();
    const navigate = useNavigate();
    
    // State for general feedback
    const [category, setCategory] = useState('General Feedback');
    const [message, setMessage] = useState('');
    
    // State for structured beta tester feedback
    const [dashboardUsability, setDashboardUsability] = useState('');
    const [resultsClarity, setResultsClarity] = useState('');
    const [proctoringExperience, setProctoringExperience] = useState('');
    const [aiFeedbackHelpfulness, setAiFeedbackHelpfulness] = useState('');
    const [rating, setRating] = useState(0);
    const [performance, setPerformance] = useState('');
    const [clarity, setClarity] = useState('');
    const [layout, setLayout] = useState('');
    const [bugs, setBugs] = useState('');
    const [improvementSuggestion, setImprovementSuggestion] = useState('');
    const [detailedMessage, setDetailedMessage] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const loginUrl = activeOrg ? `https://${activeOrg.website}/exam-login/` : '#';

    const resetBetaForm = () => {
        setDashboardUsability('');
        setResultsClarity('');
        setProctoringExperience('');
        setAiFeedbackHelpfulness('');
        setRating(0);
        setPerformance('');
        setClarity('');
        setLayout('');
        setBugs('');
        setImprovementSuggestion('');
        setDetailedMessage('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast.error("You must be logged in to submit feedback.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading('Submitting your feedback...');

        try {
            let submissionCategory = category;
            let submissionMessage = message;

            // If this is structured beta feedback, construct the message
            if (isBetaTester && feedbackRequiredForExam) {
                if (rating === 0 || !performance || !clarity || !layout || !bugs || !dashboardUsability || !resultsClarity || !proctoringExperience || !aiFeedbackHelpfulness) {
                    throw new Error("Please complete all multiple-choice and rating fields in the questionnaire.");
                }
                submissionCategory = "Beta Testing Feedback";
                submissionMessage = `
**Beta Tester Feedback for: ${feedbackRequiredForExam.examName}**
==================================================

**Portal Usability Feedback:**
--------------------------------------------------
- **Dashboard Navigation:** ${dashboardUsability}
- **Results Page Clarity:** ${resultsClarity}
- **Proctoring Feature Experience:** ${proctoringExperience}
- **AI Study Guide Helpfulness:** ${aiFeedbackHelpfulness}

**Exam-Specific Feedback:**
--------------------------------------------------
- **Overall Exam Experience:** ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)
- **Platform Performance (during exam):** ${performance}
- **Clarity of Exam Questions:** ${clarity}
- **UI/Layout on Device (during exam):** ${layout}
- **Bugs or Errors Encountered:** ${bugs}

**Suggestions & Comments:**
--------------------------------------------------
**One Suggestion for Improvement:**
${improvementSuggestion || "No suggestion provided."}

**Other Bugs or Detailed Comments:**
${detailedMessage || "No additional comments provided."}
                `.trim();
            } else {
                if (!message.trim()) {
                    throw new Error("Please enter your feedback before submitting.");
                }
            }

            await googleSheetsService.submitFeedback(
                token,
                submissionCategory,
                submissionMessage,
                feedbackRequiredForExam?.examId,
                feedbackRequiredForExam?.examName
            );

            toast.success("Thank you! Your feedback has been sent.", { id: toastId });
            if (feedbackRequiredForExam) {
                clearFeedbackRequired();
                resetBetaForm();
                navigate('/dashboard');
            }

            setMessage('');
            setCategory('General Feedback');
        } catch (error: any) {
            toast.error(error.message || "Failed to send feedback.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderBetaTesterForm = () => (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-6 rounded-r-lg" role="alert">
                <p className="font-bold">Feedback Required</p>
                <p>Please provide your feedback for the <strong>{feedbackRequiredForExam?.examName}</strong> to unlock other tests.</p>
            </div>

            <div className="space-y-6 p-4 border border-slate-200 rounded-lg">
                <h3 className="text-xl font-semibold text-slate-800 border-b pb-2">Portal Usability Feedback</h3>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">1. How easy was it to navigate the dashboard and find your exams?</legend>
                    <div className="mt-2 space-y-2">
                        {['Very Easy', 'Easy', 'It was okay', 'Difficult'].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="dashboardUsability" value={option} checked={dashboardUsability === option} onChange={e => setDashboardUsability(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">2. How clear and helpful was the Results page after the exam?</legend>
                    <div className="mt-2 space-y-2">
                        {['Very Clear & Helpful', 'Clear', 'Could be better', 'Confusing'].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="resultsClarity" value={option} checked={resultsClarity === option} onChange={e => setResultsClarity(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">3. How was your experience with the Proctoring feature (fullscreen/tab monitoring)?</legend>
                    <div className="mt-2 space-y-2">
                        {['Worked perfectly', 'Had minor issues', 'Did not work correctly', "Didn't test a proctored exam"].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="proctoringExperience" value={option} checked={proctoringExperience === option} onChange={e => setProctoringExperience(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">4. How helpful was the AI Study Guide feature?</legend>
                    <div className="mt-2 space-y-2">
                        {['Very Helpful', 'Helpful', 'Not very helpful', "Didn't use it"].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="aiFeedbackHelpfulness" value={option} checked={aiFeedbackHelpfulness === option} onChange={e => setAiFeedbackHelpfulness(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>
            
             <div className="space-y-6 p-4 border border-slate-200 rounded-lg">
                <h3 className="text-xl font-semibold text-slate-800 border-b pb-2">Exam-Specific Feedback for "{feedbackRequiredForExam?.examName}"</h3>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">5. Overall Experience with this Exam</legend>
                    <div className="flex items-center mt-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} type="button" onClick={() => setRating(star)} className="text-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 rounded-md">
                                <Star size={32} className={`transition-colors ${rating >= star ? 'fill-current' : 'text-slate-300'}`} />
                            </button>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">6. Platform Performance during this Exam</legend>
                    <div className="mt-2 space-y-2">
                        {['Very Fast', 'Acceptable', 'A bit slow', 'Very Slow'].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="performance" value={option} checked={performance === option} onChange={e => setPerformance(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">7. Clarity of Exam Questions</legend>
                     <div className="mt-2 space-y-2">
                        {['Very Clear', 'Mostly Clear', 'Some were confusing', 'Very confusing'].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="clarity" value={option} checked={clarity === option} onChange={e => setClarity(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">8. UI / Layout on your device during this Exam</legend>
                     <div className="mt-2 space-y-2">
                        {['Looked great', 'Had minor issues', 'Had major layout problems'].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="layout" value={option} checked={layout === option} onChange={e => setLayout(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-medium text-slate-900">9. Did you encounter any bugs or errors during this Exam?</legend>
                     <div className="mt-2 space-y-2">
                        {['No', 'Yes (described below)'].map(option => (
                             <label key={option} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-cyan-50 has-[:checked]:border-cyan-500">
                                <input type="radio" name="bugs" value={option} checked={bugs === option} onChange={e => setBugs(e.target.value)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>

            <div className="space-y-6 p-4 border border-slate-200 rounded-lg">
                <h3 className="text-xl font-semibold text-slate-800 border-b pb-2">Suggestions & Comments</h3>
                 <div>
                    <label htmlFor="improvementSuggestion" className="block text-lg font-medium text-slate-900">10. What is one thing we could do to improve the portal?</label>
                    <textarea
                        id="improvementSuggestion"
                        rows={3}
                        value={improvementSuggestion}
                        onChange={(e) => setImprovementSuggestion(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md"
                        placeholder="e.g., I wish there was a feature to..."
                    />
                </div>
                <div>
                    <label htmlFor="detailedMessage" className="block text-lg font-medium text-slate-900">11. Other Bugs or Detailed Comments (Optional)</label>
                    <p className="text-sm text-slate-500 mb-2">Please describe any bugs, suggestions, or other feedback here.</p>
                    <textarea
                        id="detailedMessage"
                        rows={5}
                        value={detailedMessage}
                        onChange={(e) => setDetailedMessage(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md"
                        placeholder="Tell us what's on your mind..."
                    />
                </div>
            </div>

            <div>
                <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400">
                    {isSubmitting ? <Spinner /> : <Send size={16} />}
                    Submit Feedback & Unlock Exams
                </button>
            </div>
        </form>
    );

    const renderGeneralForm = () => (
         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded-r-lg" role="alert">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-blue-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium">Facing a Payment Issue?</h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>If you're experiencing an error during checkout or with a payment, please select the "Payment or Checkout Issue" category and provide as much detail as possible, including:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>The name of the exam or product you were trying to purchase.</li>
                                <li>Your order number, if you received one.</li>
                                <li>The error message you saw.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <fieldset>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-slate-700">Feedback Category</label>
                    <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full">
                        <option>General Feedback</option>
                        <option>UI/Visual Feedback</option>
                        <option>Functionality / Bug Report</option>
                        <option>Exam Content Issue</option>
                        <option>Performance</option>
                        <option>General Suggestions</option>
                        <option>Payment or Checkout Issue</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-700 mt-4">Your Message</label>
                    <textarea id="message" name="message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 block w-full" placeholder="Tell us what's on your mind..." required />
                </div>
            </fieldset>
            <div>
                <button type="submit" disabled={isSubmitting || !message.trim()} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400">
                    {isSubmitting ? <Spinner /> : <Send size={16} />}
                    Submit Feedback
                </button>
            </div>
        </form>
    );

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <div className="text-center mb-8">
                <MessageSquare className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Share Your Feedback</h1>
                <p className="text-slate-500 mt-2">We value your opinion. Let us know how we can improve.</p>
            </div>
            
            {isBetaTester && feedbackRequiredForExam ? renderBetaTesterForm() : renderGeneralForm()}
        </div>
    );
};

export default Feedback;