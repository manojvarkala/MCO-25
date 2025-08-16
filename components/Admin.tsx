import React, { useState } from 'react';
import { Settings, ExternalLink, Edit, Save, X, Book } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { Exam } from '../types.ts';
import toast from 'react-hot-toast';

const Admin: React.FC = () => {
    const wpAdminUrl = 'https://www.coding-online.net/wp-admin/options-general.php?page=mco-exam-settings';
    const { activeOrg, updateActiveOrg } = useAppContext();

    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [editedExamData, setEditedExamData] = useState<Partial<Exam>>({});

    const handleEditClick = (exam: Exam) => {
        setEditingExamId(exam.id);
        setEditedExamData({
            name: exam.name,
            description: exam.description,
            numberOfQuestions: exam.numberOfQuestions,
            passScore: exam.passScore,
            durationMinutes: exam.durationMinutes,
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

        const updatedExams = activeOrg.exams.map(exam =>
            exam.id === editingExamId ? { ...exam, ...editedExamData } : exam
        );

        const updatedOrg = { ...activeOrg, exams: updatedExams };
        updateActiveOrg(updatedOrg);
        toast.success("Exam updated successfully!");
        handleCancel();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numValue = (name === 'numberOfQuestions' || name === 'passScore' || name === 'durationMinutes') ? parseInt(value) : value;
        setEditedExamData(prev => ({ ...prev, [name]: numValue }));
    };

    const inputClass = "w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition";
    const labelClass = "block text-sm font-medium text-slate-600 mb-1";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl font-extrabold text-slate-900">Admin Panel</h1>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Settings className="mr-3 text-cyan-500" />
                    Application Mode
                </h2>
                <p className="text-slate-600 mb-4">
                    This setting controls where users are redirected after logging in from your WordPress site. You can switch between the live production environment and the Vercel test environment.
                </p>
                <p className="text-slate-600 mb-6">
                    This mode must be configured directly within your WordPress admin dashboard for security reasons. Click the button below to go to the settings page.
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
                    <Book className="mr-3 text-cyan-500" />
                    Exam Customization
                </h2>
                <p className="text-slate-600 mb-6">
                    View and edit the details of the exams available in the application. Changes are saved for the current session.
                </p>
                <div className="space-y-4">
                    {activeOrg?.exams.map(exam => (
                        <div key={exam.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 transition-all duration-300">
                            {editingExamId === exam.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className={labelClass}>Exam Name</label>
                                        <input type="text" name="name" id="name" value={editedExamData.name} onChange={handleInputChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="description" className={labelClass}>Description</label>
                                        <textarea name="description" id="description" value={editedExamData.description} onChange={handleInputChange} className={inputClass} rows={3}></textarea>
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
                                    <div className="flex justify-end space-x-2 pt-2">
                                        <button onClick={handleCancel} className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">
                                            <X size={16} /><span>Cancel</span>
                                        </button>
                                        <button onClick={handleSave} className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                                            <Save size={16} /><span>Save Changes</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-slate-800">{exam.name}</h3>
                                        <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                                            <span>{exam.numberOfQuestions} Questions</span>
                                            <span className="text-slate-300">|</span>
                                            <span>{exam.durationMinutes} Minutes</span>
                                            <span className="text-slate-300">|</span>
                                            <span>{exam.passScore}% Pass Score</span>
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
        </div>
    );
};

export default Admin;