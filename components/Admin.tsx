import React, { useState } from 'react';
import { Settings, ExternalLink, Edit, Save, X, Book, FileSpreadsheet, Award, Type, Lightbulb, Users, Gift, PlusCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { Exam } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';

const prizeOptions = [
    { id: 'SUB_YEARLY', label: 'Annual Subscription' },
    { id: 'SUB_MONTHLY', label: 'Monthly Subscription' },
    { id: 'SUB_WEEKLY', label: 'Weekly Subscription' },
    { id: 'EXAM_CPC', label: 'Free CPC Exam' },
    { id: 'EXAM_CCA', label: 'Free CCA Exam' },
];

const Admin: React.FC = () => {
    const wpAdminUrl = 'https://www.coding-online.net/wp-admin/options-general.php?page=mco-exam-settings';
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();

    // State for exam customization
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [editedExamData, setEditedExamData] = useState<Partial<Exam>>({});
    
    // State for user prize management
    const [targetUserId, setTargetUserId] = useState('');
    const [spinsToAdd, setSpinsToAdd] = useState('1');
    const [prizeToGrant, setPrizeToGrant] = useState(prizeOptions[0].id);
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleEditClick = (exam: Exam) => {
        setEditingExamId(exam.id);
        setEditedExamData({
            name: exam.name,
            description: exam.description,
            numberOfQuestions: exam.numberOfQuestions,
            passScore: exam.passScore,
            durationMinutes: exam.durationMinutes,
            questionSourceUrl: exam.questionSourceUrl,
            isPractice: exam.isPractice,
            certificateTemplateId: exam.certificateTemplateId,
            recommendedBookId: exam.recommendedBookId || '',
        });
    };

    const handleCancel = () => {
        setEditingExamId(null);
        setEditedExamData({});
    };

    const handleSave = () => {
        if (!activeOrg || !editingExamId) return;

        if (!editedExamData.name?.trim() || !editedExamData.description?.trim()) {
            toast.error("Name and description cannot be empty.");
            return;
        }
        if (isNaN(Number(editedExamData.numberOfQuestions)) || Number(editedExamData.numberOfQuestions) <= 0) {
            toast.error("Number of questions must be a positive number.");
            return;
        }
        if (isNaN(Number(editedExamData.passScore)) || Number(editedExamData.passScore) < 0 || Number(editedExamData.passScore) > 100) {
            toast.error("Pass score must be between 0 and 100.");
            return;
        }
        if (isNaN(Number(editedExamData.durationMinutes)) || Number(editedExamData.durationMinutes) <= 0) {
            toast.error("Duration must be a positive number of minutes.");
            return;
        }
        if (!editedExamData.questionSourceUrl?.trim() || !editedExamData.questionSourceUrl.startsWith('https://docs.google.com/spreadsheets/d/')) {
            toast.error("A valid Google Sheets URL for questions is required.");
            return;
        }

        const updatedExams = activeOrg.exams.map(exam =>
            exam.id === editingExamId ? { ...exam, ...editedExamData } : exam
        );

        const updatedOrg = { ...activeOrg, exams: updatedExams };
        updateActiveOrg(updatedOrg);
        toast.success("Exam updated successfully!");
        handleCancel();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numValue = (name === 'numberOfQuestions' || name === 'passScore' || name === 'durationMinutes') ? parseInt(value) : value;
        setEditedExamData(prev => ({ ...prev, [name]: numValue }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setEditedExamData(prev => ({ ...prev, [name]: checked }));
    };

    const handleAddSpins = async () => {
        if (!token || !targetUserId.trim() || !spinsToAdd.trim()) {
            toast.error("User ID and spin count are required.");
            return;
        }
        setIsSubmitting(true);
        try {
            const spins = parseInt(spinsToAdd);
            if (isNaN(spins) || spins <= 0) {
                toast.error("Please enter a valid number of spins.");
                return;
            }
            await googleSheetsService.addSpins(token, targetUserId.trim(), spins);
            toast.success(`Successfully added ${spins} spin(s) to user ${targetUserId}.`);
            setTargetUserId('');
            setSpinsToAdd('1');
        } catch (error: any) {
            toast.error(error.message || "Failed to add spins.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGrantPrize = async () => {
        if (!token || !targetUserId.trim()) {
            toast.error("User ID is required.");
            return;
        }
         setIsSubmitting(true);
        try {
            await googleSheetsService.grantPrize(token, targetUserId.trim(), prizeToGrant);
            toast.success(`Successfully granted prize to user ${targetUserId}.`);
            setTargetUserId('');
        } catch (error: any) {
            toast.error(error.message || "Failed to grant prize.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition";
    const labelClass = "block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl font-extrabold text-slate-900">Admin Panel</h1>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Settings className="mr-3 text-cyan-500" />
                    Application Mode
                </h2>
                <p className="text-slate-600 mb-6">
                    This setting controls the exam app version used for redirects from WordPress. This must be configured directly in your WordPress admin dashboard.
                </p>
                <a
                    href={wpAdminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105"
                >
                    <ExternalLink size={20} className="mr-2" />
                    Go to WordPress Mode Settings
                </a>
            </div>

             <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Users className="mr-3 text-cyan-500" />
                    User Prize Management
                </h2>
                <p className="text-slate-600 mb-6">
                    Grant additional spins or award prizes directly to a user.
                </p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add Spins */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2"><PlusCircle size={16}/> Add Spins</h3>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="targetUserId" className={labelClass}>User ID</label>
                                <input type="text" id="targetUserId" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="Enter user's WordPress ID" className={inputClass} />
                            </div>
                             <div>
                                <label htmlFor="spinsToAdd" className={labelClass}>Spins to Add</label>
                                <input type="number" id="spinsToAdd" value={spinsToAdd} onChange={(e) => setSpinsToAdd(e.target.value)} min="1" className={inputClass} />
                            </div>
                            <button onClick={handleAddSpins} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                {isSubmitting ? <Spinner/> : <span>Add Spins</span>}
                            </button>
                        </div>
                    </div>
                    {/* Grant Prize */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2"><Gift size={16}/> Grant Prize</h3>
                         <div className="space-y-3">
                             <div>
                                <label htmlFor="targetUserIdPrize" className={labelClass}>User ID</label>
                                <input type="text" id="targetUserIdPrize" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="Same ID as above is fine" className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="prizeToGrant" className={labelClass}>Prize</label>
                                <select id="prizeToGrant" value={prizeToGrant} onChange={(e) => setPrizeToGrant(e.target.value)} className={inputClass}>
                                    {prizeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                </select>
                            </div>
                            <button onClick={handleGrantPrize} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                               {isSubmitting ? <Spinner/> : <span>Grant Prize</span>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Book className="mr-3 text-cyan-500" />
                    Exam Customization (Session Only)
                </h2>
                <p className="text-slate-600 mb-6">
                    View and edit the details of the exams available in the application. Changes are saved for the current browser session and will reset on a full page reload.
                </p>
                <div className="space-y-4">
                    {activeOrg?.exams.map(exam => (
                        <div key={exam.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 transition-all duration-300">
                            {editingExamId === exam.id ? (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-slate-800 mb-2 border-b pb-2">Editing: {exam.name}</h3>
                                    <div>
                                        <label htmlFor="name" className={labelClass}><Type size={14}/> Exam Name</label>
                                        <input type="text" name="name" id="name" value={editedExamData.name} onChange={handleInputChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="description" className={labelClass}><Type size={14}/> Description</label>
                                        <textarea name="description" id="description" value={editedExamData.description} onChange={handleInputChange} className={inputClass} rows={3}></textarea>
                                    </div>
                                     <div>
                                        <label htmlFor="questionSourceUrl" className={labelClass}><FileSpreadsheet size={14}/> Question Source URL</label>
                                        <input type="url" name="questionSourceUrl" id="questionSourceUrl" value={editedExamData.questionSourceUrl} onChange={handleInputChange} className={inputClass} placeholder="https://docs.google.com/spreadsheets/d/..."/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label htmlFor="numberOfQuestions" className={labelClass}>Questions</label>
                                            <input type="number" name="numberOfQuestions" id="numberOfQuestions" value={editedExamData.numberOfQuestions} onChange={handleInputChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor="passScore" className={labelClass}>Pass Score (%)</label>
                                            <input type="number" name="passScore" id="passScore" value={editedExamData.passScore} onChange={handleInputChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor="durationMinutes" className={labelClass}>Duration (Mins)</label>
                                            <input type="number" name="durationMinutes" id="durationMinutes" value={editedExamData.durationMinutes} onChange={handleInputChange} className={inputClass} />
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="certificateTemplateId" className={labelClass}><Award size={14}/> Certificate Template</label>
                                            <select name="certificateTemplateId" id="certificateTemplateId" value={editedExamData.certificateTemplateId} onChange={handleInputChange} className={inputClass}>
                                                {activeOrg.certificateTemplates.map(template => (
                                                    <option key={template.id} value={template.id}>{template.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="recommendedBookId" className={labelClass}><Book size={14}/> Recommended Book</label>
                                            <select name="recommendedBookId" id="recommendedBookId" value={editedExamData.recommendedBookId} onChange={handleInputChange} className={inputClass}>
                                                <option value="">None</option>
                                                {activeOrg.suggestedBooks.map(book => (
                                                    <option key={book.id} value={book.id}>{book.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input type="checkbox" name="isPractice" id="isPractice" checked={!!editedExamData.isPractice} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                            <label htmlFor="isPractice" className="ml-2 block text-sm text-slate-900">Is Practice Exam?</label>
                                        </div>
                                        <div className="flex justify-end space-x-2 pt-2">
                                            <button onClick={handleCancel} className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">
                                                <X size={16} /><span>Cancel</span>
                                            </button>
                                            <button onClick={handleSave} className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                                                <Save size={16} /><span>Save Changes</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-slate-800">{exam.name} {exam.isPractice && <span className="text-xs font-medium bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full ml-2">Practice</span>}</h3>
                                        <div className="flex items-center flex-wrap space-x-4 text-sm text-slate-500 mt-1">
                                            <span>{exam.numberOfQuestions} Qs</span>
                                            <span className="text-slate-300">|</span>
                                            <span>{exam.durationMinutes} Mins</span>
                                            <span className="text-slate-300">|</span>
                                            <span>{exam.passScore}% Pass</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="truncate" title={exam.productSku}>SKU: {exam.productSku}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleEditClick(exam)} className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">
                                        <Edit size={16} /><span>Edit</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Lightbulb className="mr-3 text-cyan-500" />
                    Architectural Vision: A Multi-Subject Platform
                </h2>
                <div className="space-y-4 text-slate-600">
                    <p>
                        This application has a robust architectural foundation that makes it highly adaptable to subjects beyond medical coding (e.g., law, finance, IT certifications). The core concept is to separate the application's <strong>engine</strong> from its <strong>content</strong>.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-semibold text-slate-700">The Platform (Engine)</h4>
                            <p className="text-sm">Subject-agnostic, reusable parts like the user system, exam player, results engine, and AI feedback system.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-semibold text-slate-700">The Content (Fuel)</h4>
                            <p className="text-sm">Subject-specific data like exam names, descriptions, question sources, and certificate text.</p>
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">Future Development Path</h3>
                    <p>
                        To achieve this, a future refactoring effort could move all subject-specific content from the code into a centralized JSON configuration file. 
                    </p>
                    <p>
                        This would make the application "multi-tenant". Launching a version for a new subject would only require creating a new configuration file and a new Google Sheet with questions, requiring <strong>no further code changes</strong>. This one-time architectural investment would significantly increase the platform's versatility and scalability.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Admin;