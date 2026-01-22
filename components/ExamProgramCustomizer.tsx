import React, { FC, useState, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, Award, FileText, PlusCircle, Trash2, Zap, Layers, Clock, ToggleRight, ToggleLeft, ShieldCheck, X, Globe, BarChart3 } from 'lucide-react';
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
        <div className="bg-[rgba(var(--color-muted-rgb),0.1)] p-8 border-t border-[rgb(var(--color-border-rgb))] space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h4 className="text-xs font-black text-[rgb(var(--color-primary-rgb))] uppercase tracking-widest flex items-center gap-2">
                        <Layers size={14}/> Identity & Source
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
                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <Award size={14}/> Commerce Link
                    </h4>
                    <div>
                        <label className="mco-admin-label">Linked WooCommerce Product</label>
                        <select 
                            value={data.certExam?.productSku || ''} 
                            onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} 
                            className="mco-admin-input"
                        >
                            <option value="">-- No Product Linked --</option>
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div className="p-4 bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-[rgb(var(--color-text-strong-rgb))]">Enable Proctored Mode</p>
                            <p className="text-[10px] text-[rgb(var(--color-text-muted-rgb))] font-bold mt-1">Force fullscreen and tab monitoring</p>
                        </div>
                        <button onClick={() => handleExamChange('certExam', 'isProctored', !data.certExam?.isProctored)} className="text-[rgb(var(--color-primary-rgb))]">
                            {data.certExam?.isProctored ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="opacity-30" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-6 bg-[rgb(var(--color-card-rgb))] rounded-2xl border border-[rgb(var(--color-border-rgb))] space-y-6">
                    <h4 className="font-black text-[rgb(var(--color-text-strong-rgb))] uppercase text-[10px] flex items-center gap-2">
                        <ShieldCheck size={14} className="text-blue-500" /> Certification Parameters
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="mco-admin-label">Count</label><input type="number" value={data.certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="mco-admin-input" /></div>
                        <div><label className="mco-admin-label">Minutes</label><input type="number" value={data.certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="mco-admin-input" /></div>
                        <div><label className="mco-admin-label">Pass%</label><input type="number" value={data.certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="mco-admin-input text-blue-400" /></div>
                    </div>
                </div>

                <div className="p-6 bg-[rgb(var(--color-card-rgb))] rounded-2xl border border-[rgb(var(--color-border-rgb))] space-y-6">
                    <h4 className="font-black text-[rgb(var(--color-text-strong-rgb))] uppercase text-[10px] flex items-center gap-2">
                        <FileText size={14} className="text-emerald-500" /> Practice Parameters
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="mco-admin-label">Question Count</label><input type="number" value={data.practiceExam?.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', e.target.value)} className="mco-admin-input" /></div>
                        <div><label className="mco-admin-label">Time Limit (Mins)</label><input type="number" value={data.practiceExam?.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', e.target.value)} className="mco-admin-input" /></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-[rgb(var(--color-border-rgb))]">
                <button onClick={() => onDelete(program.category.id)} className="px-6 py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl text-xs font-black transition-all">TRASH PROGRAM</button>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="px-6 py-2 font-bold text-[rgb(var(--color-text-muted-rgb))]">Discard</button>
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
    
    // Detailed creation state
    const [newProgram, setNewProgram] = useState({
        name: '',
        sku: '',
        questionSourceUrl: '',
        certQuestions: 100,
        certDuration: 120,
        passScore: 70
    });

    const programs = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(cat => ({
            category: cat,
            practiceExam: activeOrg.exams.find(e => e.id === cat.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === cat.certificationExamId)
        })).sort((a,b) => (a.category.name || '').localeCompare(b.category.name || ''));
    }, [activeOrg]);

    const handleCreateProgram = async () => {
        if (!token || !newProgram.name || !newProgram.sku) return;
        setIsSaving(true);
        const tid = toast.loading("Assembling Program Structure...");
        try {
            await googleSheetsService.adminCreateExamProgram(token, newProgram.name, newProgram);
            await refreshConfig();
            toast.success("New Program Integrated", { id: tid });
            setIsCreating(false);
            setNewProgram({ name: '', sku: '', questionSourceUrl: '', certQuestions: 100, certDuration: 120, passScore: 70 });
        } catch (e: any) { toast.error(e.message, { id: tid }); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-10 pb-40">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-4">
                    <Settings className="text-[rgb(var(--color-primary-rgb))]" size={40} /> Program Master
                </h1>
                <button onClick={() => setIsCreating(true)} className="mco-btn-admin-success">
                    <PlusCircle size={20}/> NEW PROGRAM
                </button>
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-3xl overflow-hidden shadow-2xl">
                <div className="divide-y divide-[rgb(var(--color-border-rgb))]">
                    {programs.map(p => (
                        <div key={p.category.id} className="transition-all">
                            <div className={`flex items-center p-8 gap-6 transition-colors ${expandedId === p.category.id ? 'bg-[rgba(var(--color-primary-rgb),0.05)]' : 'hover:bg-white/[0.02]'}`}>
                                <div className="flex-grow">
                                    <p className="font-black text-[rgb(var(--color-text-strong-rgb))] text-xl">{p.category.name}</p>
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted-rgb))] font-mono uppercase mt-1">ID: {p.category.id}</p>
                                </div>
                                <button onClick={() => setExpandedId(expandedId === p.category.id ? null : p.category.id)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all border-2 ${
                                    expandedId === p.category.id ? 'bg-[rgb(var(--color-primary-rgb))] text-[rgb(var(--color-background-rgb))] border-transparent shadow-lg' : 'bg-transparent text-[rgb(var(--color-primary-rgb))] border-[rgba(var(--color-primary-rgb),0.3)] hover:border-[rgb(var(--color-primary-rgb))]'
                                }`}>
                                    {expandedId === p.category.id ? 'CLOSE' : 'CONFIGURE'}
                                </button>
                            </div>
                            {expandedId === p.category.id && (
                                <ExamEditor 
                                    program={p} 
                                    onSave={async (id, data) => {
                                        setIsSaving(true);
                                        const t = toast.loading("Syncing...");
                                        try {
                                            await googleSheetsService.adminUpdateExamProgram(token!, id, data);
                                            await refreshConfig();
                                            toast.success("Synchronized", { id: t });
                                            setExpandedId(null);
                                        } catch (e: any) { toast.error("Sync Failed", { id: t }); }
                                        finally { setIsSaving(false); }
                                    }} 
                                    onDelete={async (id) => {
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

            {/* NEW PROGRAM ARCHITECT MODAL */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[rgb(var(--color-card-rgb))] border-2 border-[rgb(var(--color-border-rgb))] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-[rgb(var(--color-border-rgb))] bg-[rgba(var(--color-muted-rgb),0.1)] flex justify-between items-center">
                            <h2 className="text-3xl font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-3">
                                <PlusCircle className="text-[rgb(var(--color-primary-rgb))]" /> Create New Program
                            </h2>
                            <button onClick={() => setIsCreating(false)} className="text-[rgb(var(--color-text-muted-rgb))] hover:text-white"><X size={24}/></button>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2 mb-4"><Layers size={14}/> Primary Identity</h4>
                                <div>
                                    <label className="mco-admin-label">Public Program Name</label>
                                    <input type="text" value={newProgram.name} onChange={e => setNewProgram({...newProgram, name: e.target.value})} className="mco-admin-input" placeholder="e.g. Master CPC Certification" />
                                </div>
                                <div>
                                    <label className="mco-admin-label">Merchant SKU (Permanent)</label>
                                    <input type="text" value={newProgram.sku} onChange={e => setNewProgram({...newProgram, sku: e.target.value})} className="mco-admin-input font-mono" placeholder="exam-cpc-2024" />
                                </div>
                                <div>
                                    <label className="mco-admin-label">Google Sheet Dataset URL</label>
                                    <input type="text" value={newProgram.questionSourceUrl} onChange={e => setNewProgram({...newProgram, questionSourceUrl: e.target.value})} className="mco-admin-input text-xs" placeholder="https://docs.google.com/..." />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-4"><BarChart3 size={14}/> Exam Criteria</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="mco-admin-label">Questions</label><input type="number" value={newProgram.certQuestions} onChange={e => setNewProgram({...newProgram, certQuestions: parseInt(e.target.value)})} className="mco-admin-input" /></div>
                                    <div><label className="mco-admin-label">Duration (m)</label><input type="number" value={newProgram.certDuration} onChange={e => setNewProgram({...newProgram, certDuration: parseInt(e.target.value)})} className="mco-admin-input" /></div>
                                </div>
                                <div>
                                    <label className="mco-admin-label">Passing Threshold (%)</label>
                                    <input type="number" value={newProgram.passScore} onChange={e => setNewProgram({...newProgram, passScore: parseInt(e.target.value)})} className="mco-admin-input text-blue-500" />
                                </div>
                                <div className="p-4 bg-[rgba(var(--color-primary-rgb),0.05)] border-2 border-dashed border-[rgba(var(--color-primary-rgb),0.2)] rounded-2xl">
                                    <p className="text-[9px] font-bold text-[rgb(var(--color-primary-rgb))] uppercase">Note: Auto-Sync</p>
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted-rgb))] mt-1">Creating this program will automatically scaffold a linked WooCommerce product.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-[rgba(var(--color-muted-rgb),0.1)] border-t border-[rgb(var(--color-border-rgb))] flex justify-end gap-4">
                            <button onClick={() => setIsCreating(false)} className="px-8 py-3 font-bold text-[rgb(var(--color-text-muted-rgb))] hover:text-white">Cancel</button>
                            <button onClick={handleCreateProgram} disabled={isSaving || !newProgram.name || !newProgram.sku} className="mco-btn-admin-primary !bg-emerald-600">
                                {isSaving ? <Spinner size="sm"/> : 'INITIALIZE PROGRAM'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamProgramCustomizer;