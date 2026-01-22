import React, { FC, useState, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, Award, FileText, PlusCircle, Trash2, AlertTriangle, ExternalLink, CheckSquare, Square, Zap, Layers, Clock, HelpCircle, ToggleRight, ToggleLeft, ShieldCheck, X } from 'lucide-react';
import Spinner from './Spinner.tsx';

interface EditableProgramData {
    category?: Partial<ExamProductCategory>;
    practiceExam?: Partial<Exam>;
    certExam?: Partial<Exam> & { addonSku?: string };
}

const ExamEditor: FC<{
    program: { category: ExamProductCategory; practiceExam?: Exam; certExam?: Exam; };
    onSave: (programId: string, data: EditableProgramData) => Promise<void>;
    onDelete: (programId: string) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    unlinkedProducts: any[];
}> = ({ program, onSave, onDelete, onCancel, isSaving, unlinkedProducts }) => {
    const [data, setData] = useState<EditableProgramData>(() => ({
        category: { 
            name: program.category?.name || '',
            description: program.category?.description || '',
            questionSourceUrl: program.category?.questionSourceUrl || ''
        },
        practiceExam: program.practiceExam ? { ...program.practiceExam } : { 
            id: program.category?.practiceExamId || `prac-virtual-${Date.now()}`, 
            isPractice: true, 
            numberOfQuestions: 20,
            durationMinutes: 30
        } as any,
        certExam: program.certExam ? { ...program.certExam } : { 
            id: program.category?.certificationExamId || '', 
            isPractice: false, 
            numberOfQuestions: 50,
            durationMinutes: 90,
            passScore: 70
        } as any,
    }));

    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: string, value: any) => {
        setData(prev => ({ ...prev, [examType]: { ...(prev as any)[examType], [field]: value } }));
    };

    return (
        <div className="bg-slate-900 p-8 border-t-2 border-slate-800 space-y-10 animate-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={18}/> Identity & Source
                    </h4>
                    <div>
                        <label className="mco-admin-label">Program Brand Name</label>
                        <input type="text" value={data.category?.name || ''} onChange={e => handleCategoryChange('name', e.target.value)} className="mco-admin-input" />
                    </div>
                    <div>
                        <label className="mco-admin-label">Google Sheet Dataset (Published CSV)</label>
                        <input type="text" value={data.category?.questionSourceUrl || ''} onChange={e => handleCategoryChange('questionSourceUrl', e.target.value)} className="mco-admin-input text-cyan-400 font-mono text-xs" />
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <Award size={18}/> Commerce Link
                    </h4>
                    <div>
                        <label className="mco-admin-label">Linked WooCommerce Product</label>
                        <select 
                            value={data.certExam?.productSku || ''} 
                            onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} 
                            className="mco-admin-input !bg-slate-950"
                        >
                            <option value="">-- No Product Linked --</option>
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-white">Enable Proctored Mode</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">Force fullscreen and tab monitoring</p>
                        </div>
                        <button onClick={() => handleExamChange('certExam', 'isProctored', !data.certExam?.isProctored)} className="text-cyan-500">
                            {data.certExam?.isProctored ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-slate-700" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800 space-y-6">
                    <h4 className="font-black text-white uppercase text-xs flex items-center gap-2">
                        <ShieldCheck size={18} className="text-blue-500" /> Certification Parameters
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="mco-admin-label">Count</label><input type="number" value={data.certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="mco-admin-input" /></div>
                        <div><label className="mco-admin-label">Minutes</label><input type="number" value={data.certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="mco-admin-input" /></div>
                        <div><label className="mco-admin-label">Pass%</label><input type="number" value={data.certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="mco-admin-input text-blue-400" /></div>
                    </div>
                </div>

                <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800 space-y-6">
                    <h4 className="font-black text-white uppercase text-xs flex items-center gap-2">
                        <FileText size={18} className="text-emerald-500" /> Practice Parameters
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="mco-admin-label">Question Count</label><input type="number" value={data.practiceExam?.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', e.target.value)} className="mco-admin-input" /></div>
                        <div><label className="mco-admin-label">Time Limit (Mins)</label><input type="number" value={data.practiceExam?.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', e.target.value)} className="mco-admin-input" /></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-slate-800">
                <button onClick={() => onDelete(program.category.id)} className="px-6 py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl text-xs font-black">TRASH PROGRAM</button>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="px-6 py-2 font-bold text-slate-400">Discard</button>
                    <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="mco-btn-admin-primary min-w-[140px]">
                        {isSaving ? <Spinner size="sm"/> : 'SAVE SETTINGS'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExamProgramCustomizer: FC = () => {
    const { activeOrg, examPrices, refreshConfig } = useAppContext();
    const { token } = useAuth();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProgramName, setNewProgramName] = useState('');

    const programs = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(cat => ({
            category: cat,
            practiceExam: activeOrg.exams.find(e => e.id === cat.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === cat.certificationExamId)
        })).sort((a,b) => (a.category.name || '').localeCompare(b.category.name || ''));
    }, [activeOrg]);

    const handleCreateProgram = async () => {
        if (!token || !newProgramName) return;
        setIsSaving(true);
        try {
            await googleSheetsService.adminCreateExamProgram(token, newProgramName, {});
            await refreshConfig();
            toast.success("Created");
            setIsCreating(false);
            setNewProgramName('');
        } catch (e: any) { toast.error("Error"); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-10 pb-40">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black text-white font-display flex items-center gap-4">
                    <Settings className="text-cyan-500" size={40} /> Program Master
                </h1>
                <button onClick={() => setIsCreating(true)} className="mco-btn-admin-success">
                    <PlusCircle size={20}/> NEW PROGRAM
                </button>
            </div>

            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="divide-y divide-slate-800">
                    {programs.map(p => (
                        <div key={p.category.id} className="transition-all">
                            <div className={`flex items-center p-8 gap-6 transition-colors ${expandedId === p.category.id ? 'bg-slate-800/50' : 'hover:bg-white/[0.02]'}`}>
                                <div className="flex-grow">
                                    <p className="font-black text-white text-xl">{p.category.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">Syllabus Mapping: {p.category.id}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setExpandedId(expandedId === p.category.id ? null : p.category.id)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all border-2 ${
                                        expandedId === p.category.id ? 'bg-slate-950 text-white border-slate-700' : 'bg-slate-900 text-cyan-500 border-cyan-500/20 hover:border-cyan-500'
                                    }`}>
                                        {expandedId === p.category.id ? 'CLOSE' : 'CONFIGURE'}
                                    </button>
                                </div>
                            </div>
                            {expandedId === p.category.id && (
                                <ExamEditor 
                                    program={p} 
                                    onSave={async (id, data) => {
                                        setIsSaving(true);
                                        try {
                                            await googleSheetsService.adminUpdateExamProgram(token!, id, data);
                                            await refreshConfig();
                                            toast.success("Sync Complete");
                                            setExpandedId(null);
                                        } catch (e: any) { toast.error("Sync Failed"); }
                                        finally { setIsSaving(false); }
                                    }} 
                                    onDelete={async (id) => {
                                        if(!window.confirm('Delete program?')) return;
                                        setIsSaving(true);
                                        try {
                                            await googleSheetsService.adminDeletePost(token!, id, 'mco_exam_program');
                                            await refreshConfig();
                                            setExpandedId(null);
                                        } catch (e: any) { toast.error("Error"); }
                                        finally { setIsSaving(false); }
                                    }}
                                    onCancel={() => setExpandedId(null)} 
                                    isSaving={isSaving}
                                    unlinkedProducts={Object.entries(examPrices || {}).map(([sku, d]: [string, any]) => ({ sku, name: d.name }))}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md p-10 shadow-2xl">
                        <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                            <PlusCircle className="text-emerald-500" /> New Program
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="mco-admin-label">Program Name</label>
                                <input type="text" value={newProgramName} onChange={e => setNewProgramName(e.target.value)} placeholder="e.g. CPC Certification Prep" className="mco-admin-input" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-10">
                            <button onClick={() => setIsCreating(false)} className="px-6 py-2 font-bold text-slate-500">Cancel</button>
                            <button onClick={handleCreateProgram} disabled={isSaving || !newProgramName} className="mco-btn-admin-primary !bg-emerald-500">
                                {isSaving ? <Spinner size="sm"/> : 'CREATE PROGRAM'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamProgramCustomizer;