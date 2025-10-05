import React, { FC, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization } from '../types.ts';
// FIX: Add HelpCircle to imports from lucide-react.
import { Settings, Save, X, BookOpen, Link as LinkIcon, Edit, FileText, Clock, Percent, Award, Shield, CheckSquare, Square, RefreshCw, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';

interface EditState {
    [key: string]: any;
}

const ExamProgramCustomizer: FC = () => {
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();
    const [editingState, setEditingState] = useState<EditState>({});
    const [isSaving, setIsSaving] = useState<string | null>(null); // Holds the program ID being saved

    const handleEdit = (id: string, field: string, value: any) => {
        setEditingState(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSave = async (programId: string) => {
        if (!token) {
            toast.error("Authentication error.");
            return;
        }
        
        const updateData = editingState[programId];
        if (!updateData) return;

        setIsSaving(programId);
        try {
            const updatedConfig = await googleSheetsService.adminUpdateExamProgram(token, programId, updateData);
            if (updatedConfig && updatedConfig.organizations) {
                // Update the entire org in context with the fresh data from the server
                updateActiveOrg(updatedConfig.organizations[0]);
                toast.success("Program updated successfully!");
                setEditingState(prev => {
                    const newState = { ...prev };
                    delete newState[programId];
                    return newState;
                });
            } else {
                throw new Error("Invalid response from server.");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to save changes.");
        } finally {
            setIsSaving(null);
        }
    };

    const handleCancel = (programId: string) => {
        setEditingState(prev => {
            const newState = { ...prev };
            delete newState[programId];
            return newState;
        });
    };
    
    const inputClass = "w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-sm";
    const isDirty = (programId: string) => !!editingState[programId];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-4xl font-extrabold text-slate-900">Exam Program Customizer</h1>
            <p className="text-slate-600 -mt-6">Manage the core settings for each exam program. Changes are saved directly to your WordPress backend.</p>

            <div className="space-y-6">
                {activeOrg?.examProductCategories.map(program => {
                    const practiceExam = activeOrg.exams.find(e => e.id === program.practiceExamId);
                    const certExam = activeOrg.exams.find(e => e.id === program.certificationExamId);
                    const currentEdit = editingState[program.id] || {};

                    if (!practiceExam || !certExam) return null;

                    return (
                        <div key={program.id} className={`bg-white p-6 rounded-xl shadow-lg border ${isDirty(program.id) ? 'border-cyan-500' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-slate-800">{currentEdit.programName ?? program.name}</h2>
                                {isDirty(program.id) && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleSave(program.id)} disabled={isSaving === program.id} className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600 disabled:bg-slate-400">
                                            {isSaving === program.id ? <Spinner size="sm"/> : <Save size={14} />} Save
                                        </button>
                                        <button onClick={() => handleCancel(program.id)} disabled={isSaving === program.id} className="flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-300">
                                            <X size={14} /> Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2"><LinkIcon size={14} className="text-slate-400"/><span className="font-semibold text-sm w-40">Question Source URL:</span><input type="text" value={currentEdit.questionSourceUrl ?? program.questionSourceUrl} onChange={(e) => handleEdit(program.id, 'questionSourceUrl', e.target.value)} className={inputClass} /></div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Practice Exam */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                                    <h3 className="font-bold text-lg text-slate-700">Practice Exam</h3>
                                    <div className="flex items-center gap-2"><FileText size={14} className="text-slate-400"/><span className="font-semibold text-sm w-32">Name:</span><input type="text" value={currentEdit.practice_name ?? practiceExam.name} onChange={(e) => handleEdit(program.id, 'practice_name', e.target.value)} className={inputClass} /></div>
                                    <div className="flex items-center gap-2"><HelpCircle size={14} className="text-slate-400"/><span className="font-semibold text-sm w-32"># Questions:</span><input type="number" value={currentEdit.practice_numberOfQuestions ?? practiceExam.numberOfQuestions} onChange={(e) => handleEdit(program.id, 'practice_numberOfQuestions', e.target.value)} className={inputClass} /></div>
                                    <div className="flex items-center gap-2"><Clock size={14} className="text-slate-400"/><span className="font-semibold text-sm w-32">Duration (Mins):</span><input type="number" value={currentEdit.practice_durationMinutes ?? practiceExam.durationMinutes} onChange={(e) => handleEdit(program.id, 'practice_durationMinutes', e.target.value)} className={inputClass} /></div>
                                </div>

                                {/* Certification Exam */}
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                                    <h3 className="font-bold text-lg text-blue-800">Certification Exam</h3>
                                    <div className="flex items-center gap-2"><FileText size={14} className="text-slate-400"/><span className="font-semibold text-sm w-32">Name:</span><input type="text" value={currentEdit.cert_name ?? certExam.name} onChange={(e) => handleEdit(program.id, 'cert_name', e.target.value)} className={inputClass} /></div>
                                    <div className="flex items-center gap-2"><HelpCircle size={14} className="text-slate-400"/><span className="font-semibold text-sm w-32"># Questions:</span><input type="number" value={currentEdit.cert_numberOfQuestions ?? certExam.numberOfQuestions} onChange={(e) => handleEdit(program.id, 'cert_numberOfQuestions', e.target.value)} className={inputClass} /></div>
                                    <div className="flex items-center gap-2"><Clock size={14} className="text-slate-400"/><span className="font-semibold text-sm w-32">Duration (Mins):</span><input type="number" value={currentEdit.cert_durationMinutes ?? certExam.durationMinutes} onChange={(e) => handleEdit(program.id, 'cert_durationMinutes', e.target.value)} className={inputClass} /></div>
                                    <div className="flex items-center gap-2"><Percent size={14} className="text-slate-400"/><span className="font-semibold text-sm w-32">Pass Score %:</span><input type="number" value={currentEdit.cert_passScore ?? certExam.passScore} onChange={(e) => handleEdit(program.id, 'cert_passScore', e.target.value)} className={inputClass} /></div>
                                    <div className="flex items-center gap-4 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                                            <input type="checkbox" checked={currentEdit.cert_certificateEnabled ?? certExam.certificateEnabled} onChange={(e) => handleEdit(program.id, 'cert_certificateEnabled', e.target.checked)} className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"/>
                                            <Award size={14} className="inline"/> Enable Certificate
                                        </label>
                                         <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                                            <input type="checkbox" checked={currentEdit.cert_isProctored ?? certExam.isProctored} onChange={(e) => handleEdit(program.id, 'cert_isProctored', e.target.checked)} className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"/>
                                            <Shield size={14} className="inline"/> Enable Proctoring
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExamProgramCustomizer;