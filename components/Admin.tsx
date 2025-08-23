import * as React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Settings, ExternalLink, Edit, Save, X, Book, FileSpreadsheet, Award, Type, Lightbulb, Users, Gift, PlusCircle, Trash2, RotateCcw, Search, UserCheck, Paintbrush, ShoppingCart, Code, BarChart3, RefreshCw, FileText, Percent } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { Exam, SearchedUser, ExamStat } from '../types.ts';
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
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();

    // State for exam customization
    const [editingExamId, setEditingExamId] = React.useState<string | null>(null);
    const [editedExamData, setEditedExamData] = React.useState<Partial<Exam>>({});
    
    // State for user prize management
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState<SearchedUser[]>([]);
    const [selectedUser, setSelectedUser] = React.useState<SearchedUser | null>(null);

    const [spinsToAdd, setSpinsToAdd] = React.useState('1');
    const [prizeToGrant, setPrizeToGrant] = React.useState(prizeOptions[0].id);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // State for exam stats
    const [stats, setStats] = React.useState<ExamStat[] | null>(null);
    const [isLoadingStats, setIsLoadingStats] = React.useState(true);
    const [statsError, setStatsError] = React.useState<string | null>(null);


    const fetchStats = React.useCallback(async () => {
        if (!token) return;
        setIsLoadingStats(true);
        setStatsError(null);
        try {
            const data = await googleSheetsService.getExamStats(token);
            setStats(data);
        } catch (error: any) {
            setStatsError(error.message || 'Failed to load statistics.');
        } finally {
            setIsLoadingStats(false);
        }
    }, [token]);

    React.useEffect(() => {
        fetchStats();
    }, [fetchStats]);


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

    const handleUserSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !searchTerm.trim()) return;
        setIsSearching(true);
        setSelectedUser(null);
        try {
            const results = await googleSheetsService.searchUser(token, searchTerm.trim());
            setSearchResults(results);
            if(results.length === 0) toast.error('No users found matching that term.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to search for users.');
        } finally {
            setIsSearching(false);
        }
    }

    const handleAddSpins = async () => {
        if (!token || !selectedUser) return;
        setIsSubmitting(true);
        try {
            const spins = parseInt(spinsToAdd);
            if (isNaN(spins) || spins <= 0) { toast.error("Please enter a valid number of spins."); return; }
            await googleSheetsService.addSpins(token, selectedUser.id, spins);
            toast.success(`Successfully added ${spins} spin(s) to ${selectedUser.name}.`);
            setSpinsToAdd('1');
        } catch (error: any) { toast.error(error.message || "Failed to add spins."); } finally { setIsSubmitting(false); }
    };

    const handleGrantPrize = async () => {
        if (!token || !selectedUser) return;
         setIsSubmitting(true);
        try {
            await googleSheetsService.grantPrize(token, selectedUser.id, prizeToGrant);
            toast.success(`Successfully granted prize to ${selectedUser.name}.`);
        } catch (error: any) { toast.error(error.message || "Failed to grant prize."); } finally { setIsSubmitting(false); }
    };

    const handleResetSpins = async () => {
        if (!token || !selectedUser) return;
        if (!window.confirm(`Are you sure you want to reset all available spins for ${selectedUser.name} to zero?`)) return;
        setIsSubmitting(true);
        try {
            await googleSheetsService.resetSpins(token, selectedUser.id);
            toast.success(`Spins for ${selectedUser.name} have been reset to 0.`);
        } catch (error: any) { toast.error(error.message || "Failed to reset spins."); } finally { setIsSubmitting(false); }
    }

    const handleRemovePrize = async () => {
        if (!token || !selectedUser) return;
        if (!window.confirm(`Are you sure you want to remove the won prize and any associated benefits for ${selectedUser.name}? This cannot be undone.`)) return;
        setIsSubmitting(true);
        try {
            await googleSheetsService.removePrize(token, selectedUser.id);
            toast.success(`Prize removed for ${selectedUser.name}.`);
        } catch (error: any) { toast.error(error.message || "Failed to remove prize."); } finally { setIsSubmitting(false); }
    }

    const handleSelectExam = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const examId = e.target.value;
        if (examId) {
            const examToEdit = activeOrg?.exams.find(e => e.id === examId);
            if (examToEdit) {
                handleEditClick(examToEdit);
            }
        } else {
            handleCancel();
        }
    };


    const inputClass = "w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition";
    const labelClass = "block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl font-extrabold text-slate-900">Admin Panel</h1>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Code className="mr-3 text-cyan-500" />
                    WordPress Integration
                </h2>
                <p className="text-slate-600 mb-6">
                    This is the master plugin for integrating the exam app with WordPress. It handles SSO, data sync, and WooCommerce styling.
                </p>
                <ReactRouterDOM.Link
                    to="/integration"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105"
                >
                    <ExternalLink size={20} className="mr-2" />
                    Get Unified Plugin Code
                </ReactRouterDOM.Link>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                        <BarChart3 className="mr-3 text-cyan-500" />
                        Exam Statistics
                    </h2>
                    <button onClick={fetchStats} disabled={isLoadingStats} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-200 disabled:text-slate-400">
                        <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
                <p className="text-slate-600 mb-6">
                    Overview of sales and attempts for each certification exam. Data is fetched directly from your WordPress backend.
                </p>
                
                {isLoadingStats ? (
                    <div className="flex justify-center items-center h-48"><Spinner /></div>
                ) : statsError ? (
                    <div className="text-center py-10 text-red-500 bg-red-50 p-4 rounded-lg">
                        <p><strong>Error:</strong> {statsError}</p>
                    </div>
                ) : stats && stats.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 text-sm font-semibold text-slate-600">Exam Name</th>
                                    <th className="p-3 text-sm font-semibold text-slate-600 text-center">Total Sales</th>
                                    <th className="p-3 text-sm font-semibold text-slate-600 text-center">Total Attempts</th>
                                    <th className="p-3 text-sm font-semibold text-slate-600 text-center">Pass Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((stat) => (
                                    <tr key={stat.examId} className="border-b border-slate-200 hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-800">{stat.examName}</td>
                                        <td className="p-3 text-center text-slate-600 flex items-center justify-center gap-2">
                                            <ShoppingCart size={14} className="text-blue-500"/> {stat.totalSales}
                                        </td>
                                        <td className="p-3 text-center text-slate-600 flex items-center justify-center gap-2">
                                            <FileText size={14} className="text-green-500"/> {stat.totalAttempts}
                                        </td>
                                        <td className={`p-3 text-center font-semibold ${stat.passRate > 70 ? 'text-green-600' : 'text-amber-600'} flex items-center justify-center gap-2`}>
                                            <Percent size={14} /> {stat.passRate.toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-10">No statistics available.</p>
                )}
            </div>

             <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Users className="mr-3 text-cyan-500" />
                    User Prize Management
                </h2>
                <p className="text-slate-600 mb-6">
                    Search for a user by name or email to manage their spins and prizes.
                </p>

                <form onSubmit={handleUserSearch} className="flex gap-2 mb-4">
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Enter user name or email..." className={inputClass} />
                    <button type="submit" disabled={isSearching} className="flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                        {isSearching ? <Spinner/> : <Search size={16} />}
                    </button>
                </form>

                {searchResults.length > 0 && !selectedUser && (
                    <div className="border-t pt-4">
                        <h3 className="font-semibold text-slate-700 mb-2">Search Results</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {searchResults.map(user => (
                                <button key={user.id} onClick={() => setSelectedUser(user)} className="w-full text-left p-2 rounded-md hover:bg-slate-100 transition">
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-slate-500">{user.email} (ID: {user.id})</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {selectedUser && (
                    <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center bg-cyan-50 p-3 rounded-lg border border-cyan-200 mb-4">
                            <div className="flex items-center gap-3">
                                <UserCheck className="text-cyan-600" size={24}/>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{selectedUser.name}</h3>
                                    <p className="text-sm text-slate-500">{selectedUser.email} (ID: {selectedUser.id})</p>
                                </div>
                            </div>
                            <button onClick={() => {setSelectedUser(null); setSearchResults([])}} className="p-1 text-slate-500 hover:text-slate-800"><X size={16}/></button>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Add Spins */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2"><PlusCircle size={16}/> Add Spins</h3>
                                <div className="space-y-3">
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
                            {/* Danger Zone */}
                             <div className="md:col-span-2 bg-red-50 p-4 rounded-lg border border-red-200 space-y-3">
                                 <h3 className="font-bold text-lg text-red-800">Danger Zone</h3>
                                 <div className="flex flex-col sm:flex-row gap-3">
                                    <button onClick={handleResetSpins} disabled={isSubmitting} className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                        {isSubmitting ? <Spinner/> : <><RotateCcw size={16}/> <span>Reset Spins to 0</span></>}
                                    </button>
                                    <button onClick={handleRemovePrize} disabled={isSubmitting} className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                        {isSubmitting ? <Spinner/> : <><Trash2 size={16}/> <span>Remove Won Prize</span></>}
                                    </button>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Book className="mr-3 text-cyan-500" />
                    Exam Customization (Session Only)
                </h2>
                <p className="text-slate-600 mb-6">
                    Select an exam from the dropdown to edit its details. Changes are saved for the current browser session and will reset on a full page reload.
                </p>

                <div className="mb-4">
                    <label htmlFor="exam-select" className={labelClass}>Select Exam to Edit</label>
                    <select
                        id="exam-select"
                        value={editingExamId || ''}
                        onChange={handleSelectExam}
                        className={inputClass}
                    >
                        <option value="">-- Select an Exam --</option>
                        {activeOrg?.exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.name}</option>
                        ))}
                    </select>
                </div>

                {editingExamId && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 transition-all duration-300">
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg text-slate-800 mb-2 border-b pb-2">Editing: {editedExamData.name}</h3>
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
                                        {activeOrg?.certificateTemplates.map(template => (
                                            <option key={template.id} value={template.id}>{template.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="recommendedBookId" className={labelClass}><Book size={14}/> Recommended Book</label>
                                    <select name="recommendedBookId" id="recommendedBookId" value={editedExamData.recommendedBookId} onChange={handleInputChange} className={inputClass}>
                                        <option value="">None</option>
                                        {activeOrg?.suggestedBooks.map(book => (
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
                    </div>
                )}
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Lightbulb className="mr-3 text-cyan-500" />
                    Architectural Vision: A Multi-Subject Platform
                </h2>
                <div className="space-y-4 text-slate-600">
                    <p>
                        This application has a robust architectural foundation that makes it highly adaptable to subjects beyond medical coding (e.g., law, finance, IT certifications). The core concept is the separation of the application's <strong>engine</strong> from its <strong>content</strong>.
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
                    <h3 className="text-lg font-semibold text-slate-700">Current Architecture</h3>
                    <p>
                        All subject-specific data—exam names, descriptions, question sources, certificate templates—is loaded from a central configuration. This makes the application "multi-tenant" by design.
                    </p>
                    <p>
                        Launching a version for a new subject only requires creating a new configuration file (or updating the existing one) and a new Google Sheet with questions, requiring <strong>no further code changes</strong>. This architecture ensures the platform is versatile and scalable.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Admin;