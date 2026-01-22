import React, { FC, useState, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, Award, FileText, PlusCircle, Trash2, AlertTriangle, ExternalLink, CheckSquare, Square, Zap, Layers, Clock, HelpCircle, ToggleRight, ToggleLeft, ShieldCheck, X } from 'lucide-react';
import Spinner from './Spinner.tsx';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;

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
            certificateEnabled: false,
            numberOfQuestions: 20,
            durationMinutes: 30
        } as any,
        certExam: program.certExam ? { ...program.certExam } : { 
            id: program.category?.certificationExamId || '', 
            isPractice: false, 
            certificateEnabled: true, 
            isProctored: true,
            numberOfQuestions: 50,
            durationMinutes: 90,
            passScore: 70
        } as any,
    }));
    
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const hasAddon = !!data.certExam?.addonSku;

    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: string, value: any) => {
        setData(prev => ({ ...prev, [examType]: { ...(prev as any)[examType], [field]: value } }));
    };

    const Label = ({ children }: { children: ReactNode }) => <label className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--color-text-muted-rgb))] mb-1 block opacity-80">{children}</label>;

    return (
        <div className="bg-[rgba(var(--color-muted-rgb),0.2)] p-6 rounded-b-xl space-y-6 border-t border-[rgb(var(--color-border-rgb))]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label>Identity Name</Label>
                    <input type="text" value={data.category?.name || ''} onChange={e => handleCategoryChange('name', e.target.value)} className="w-full p-3 border rounded-lg bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-strong-rgb))] focus:border-cyan-500" />
                </div>
                <div>
                    <Label>Google Sheet URL</Label>
                    <input type="text" value={data.category?.questionSourceUrl || ''} onChange={e => handleCategoryChange('questionSourceUrl', e.target.value)} className="w-full p-3 border rounded-lg bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))] text-cyan-500 font-mono text-xs" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border rounded-xl bg-[rgba(var(--color-muted-rgb),0.3)] border-[rgb(var(--color-border-rgb))] space-y-5">
                    <h4 className="font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-2 uppercase text-xs"><Award size={18} className="text-blue-500" /> Certification</h4>
                    <div>
                        <Label>WooCommerce SKU</Label>
                        <select value={data.certExam?.productSku || ''} onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} className="w-full p-3 border rounded-lg bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-strong-rgb))] font-mono">
                            <option value="">-- No Link --</option>
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><Label>Qty</Label><input type="number" value={data.certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                        <div><Label>Mins</Label><input type="number" value={data.certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                        <div><Label>Pass%</Label><input type="number" value={data.certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                    </div>
                </div>

                <div className="p-5 border rounded-xl bg-[rgba(var(--color-muted-rgb),0.3)] border-[rgb(var(--color-border-rgb))] space-y-5">
                    <h4 className="font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-2 uppercase text-xs"><FileText size={18} className="text-emerald-500" /> Practice</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Qty</Label><input type="number" value={data.practiceExam?.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                        <div><Label>Mins</Label><input type="number" value={data.practiceExam?.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-between items-center pt-6 border-t border-[rgb(var(--color-border-rgb))]">
                <button onClick={() => { if(window.confirm('Trash this program?')) onDelete(program.category.id) }} className="px-4 py-2 text-rose-500 hover:text-rose-400 text-xs font-bold uppercase">Delete</button>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-6 py-2 text-[rgb(var(--color-text-muted-rgb))] font-bold">Discard</button>
                    <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="px-8 py-2 bg-cyan-600 text-white rounded-lg font-black transition shadow-lg">
                        {isSaving ? <Spinner size="sm" /> : <Save size={18} />} SAVE
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
            toast.success("New Program Created");
            setIsCreating(false);
            setNewProgramName('');
        } catch (e: any) { toast.error(e.message); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-8 pb-40">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                    <Settings className="text-cyan-500" /> Program Master
                </h1>
                <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-500 transition uppercase tracking-wider text-xs">
                    <PlusCircle size={18}/> New Program
                </button>
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] rounded-2xl shadow-2xl border border-[rgb(var(--color-border-rgb))] overflow-hidden">
                <div className="divide-y divide-[rgb(var(--color-border-rgb))]">
                    {programs.map(p => (
                        <div key={p.category.id}>
                            <div className="flex items-center p-6 gap-4 hover:bg-[rgba(var(--color-muted-rgb),0.1)] transition-colors">
                                <div className="flex-grow">
                                    <p className="font-black text-[rgb(var(--color-text-strong-rgb))] text-lg">{p.category.name}</p>
                                    <p className="text-[10px] text-cyan-500 font-mono uppercase mt-1">ID: {p.category.id}</p>
                                </div>
                                <button onClick={() => setExpandedId(expandedId === p.category.id ? null : p.category.id)} className="px-6 py-2 bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-strong-rgb))] rounded-xl text-xs font-black border border-[rgb(var(--color-border-rgb))] hover:border-cyan-500 transition-all">
                                    {expandedId === p.category.id ? 'CLOSE' : 'CONFIGURE'}
                                </button>
                            </div>
                            {expandedId === p.category.id && (
                                <ExamEditor 
                                    program={p} 
                                    onSave={async (id, data) => {
                                        setIsSaving(true);
                                        try {
                                            await googleSheetsService.adminUpdateExamProgram(token!, id, data);
                                            await refreshConfig();
                                            toast.success("Updated");
                                            setExpandedId(null);
                                        } catch (e: any) { toast.error(e.message); }
                                        finally { setIsSaving(false); }
                                    }} 
                                    onDelete={async (id) => {
                                        setIsSaving(true);
                                        try {
                                            await googleSheetsService.adminDeletePost(token!, id, 'mco_exam_program');
                                            await refreshConfig();
                                            setExpandedId(null);
                                        } catch (e: any) { toast.error(e.message); }
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                            <PlusCircle className="text-emerald-500" /> Create Program
                        </h2>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Program Brand Name</label>
                        <input type="text" value={newProgramName} onChange={e => setNewProgramName(e.target.value)} placeholder="e.g. COC Specialist" className="w-full bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl py-3 px-4 text-white focus:border-emerald-500 mb-8" />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsCreating(false)} className="px-6 py-2 font-bold text-slate-400">Cancel</button>
                            <button onClick={handleCreateProgram} disabled={isSaving || !newProgramName} className="px-8 py-2 bg-emerald-600 text-white rounded-xl font-black shadow-lg">
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