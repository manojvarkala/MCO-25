import React, { FC, useState, useMemo, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, Award, FileText, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import Spinner from './Spinner.tsx';

interface EditableProgramData {
    category?: Partial<ExamProductCategory>;
    practiceExam?: Partial<Exam>;
    certExam?: Partial<Exam>;
}

const ExamEditor: FC<{
    program: { category: ExamProductCategory; practiceExam?: Exam; certExam?: Exam; };
    onSave: (programId: string, data: EditableProgramData) => Promise<void>;
    onDelete: (programId: string) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    unlinkedProducts: any[];
}> = ({ program, onSave, onDelete, onCancel, isSaving, unlinkedProducts }) => {
    const [data, setData] = useState<EditableProgramData>({
        category: { ...program.category },
        practiceExam: program.practiceExam ? { ...program.practiceExam } : { id: program.category.practiceExamId, isPractice: true } as any,
        certExam: program.certExam ? { ...program.certExam } : { id: program.category.certificationExamId, isPractice: false } as any,
    });
    
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: keyof Exam, value: any) => {
        setData(prev => ({ ...prev, [examType]: { ...prev[examType], [field]: value } }));
    };

    const Label = ({ children }: { children: ReactNode }) => <label className="text-[10px] font-black uppercase tracking-widest text-white mb-1 block opacity-80">{children}</label>;

    return (
        <div className="bg-slate-900 p-6 rounded-b-xl space-y-6 shadow-inner border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label>Brand Identity / Name</Label>
                    <input type="text" value={data.category?.name || ''} onChange={e => handleCategoryChange('name', e.target.value)} className="w-full p-3 border rounded-lg bg-slate-950 border-slate-600 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20" />
                </div>
                <div>
                    <Label>Google Sheet Data URL</Label>
                    <input type="text" value={data.category?.questionSourceUrl || ''} onChange={e => handleCategoryChange('questionSourceUrl', e.target.value)} className="w-full p-3 border rounded-lg bg-slate-950 border-slate-600 text-cyan-300 font-mono text-xs" />
                </div>
            </div>
            
            <div>
                <Label>Program Description (Public)</Label>
                <textarea value={data.category?.description || ''} onChange={e => handleCategoryChange('description', e.target.value)} className="w-full p-3 border rounded-lg bg-slate-950 border-slate-600 text-white leading-relaxed" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border rounded-xl bg-slate-800 border-slate-700 space-y-5 shadow-lg">
                    <h4 className="font-black text-white flex items-center gap-2 border-b border-slate-700 pb-3 uppercase"><Award size={18} className="text-blue-400" /> Certification Config</h4>
                    <div>
                        <Label>WooCommerce SKU Binding</Label>
                        <select 
                            value={data.certExam?.productSku || ''} 
                            onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} 
                            className="w-full p-3 border rounded-lg bg-slate-950 border-slate-600 text-white text-sm"
                        >
                            <option value="">-- No Linked Product --</option>
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><Label>Questions</Label><input type="number" value={data.certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                        <div><Label>Mins</Label><input type="number" value={data.certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                        <div><Label>Pass %</Label><input type="number" value={data.certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                    </div>
                </div>

                <div className="p-5 border rounded-xl bg-slate-800 border-slate-700 space-y-5 shadow-lg">
                    <h4 className="font-black text-white flex items-center gap-2 border-b border-slate-700 pb-3 uppercase"><FileText size={18} className="text-emerald-400" /> Practice Rules</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Question Count</Label><input type="number" value={data.practiceExam?.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                        <div><Label>Duration (Mins)</Label><input type="number" value={data.practiceExam?.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-white pt-2 cursor-pointer">
                        <input type="checkbox" checked={data.practiceExam?.certificateEnabled || false} onChange={e => handleExamChange('practiceExam', 'certificateEnabled', e.target.checked)} className="rounded bg-slate-950 border-slate-600 text-cyan-500" />
                        Enable Completion Certificate
                    </label>
                </div>
            </div>
            
            <div className="flex justify-between items-center pt-6 border-t border-slate-700">
                <div className="flex gap-2">
                    {!isConfirmingDelete ? (
                        <button 
                            onClick={() => setIsConfirmingDelete(true)} 
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-rose-400 hover:text-rose-300 border border-rose-900/50 hover:border-rose-800 rounded-lg text-xs font-bold transition uppercase tracking-tighter"
                        >
                            <Trash2 size={14} /> Delete Program
                        </button>
                    ) : (
                        <button 
                            onClick={() => onDelete(program.category.id)} 
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black transition animate-pulse shadow-lg shadow-rose-900/20"
                        >
                            <AlertTriangle size={14} /> CONFIRM TRASH
                        </button>
                    )}
                    {isConfirmingDelete && (
                        <button 
                            onClick={() => setIsConfirmingDelete(false)} 
                            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition"
                        >
                            CANCEL
                        </button>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={onCancel} disabled={isSaving} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition">Discard</button>
                    <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="flex items-center gap-2 px-8 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-black transition shadow-lg disabled:opacity-50">
                        {isSaving ? <Spinner size="sm" /> : <Save size={18} />} SAVE CHANGES
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

    const programs = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(cat => ({
            category: cat,
            practiceExam: activeOrg.exams.find(e => e.id === cat.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === cat.certificationExamId)
        })).sort((a,b) => (a.category.name || '').localeCompare(b.category.name || ''));
    }, [activeOrg]);

    const handleSave = async (id: string, data: EditableProgramData) => {
        if (!token) return;
        setIsSaving(true);
        try {
            await googleSheetsService.adminUpdateExamProgram(token, id, data);
            await refreshConfig();
            toast.success("Program Updated Live");
            setExpandedId(null);
        } catch (e: any) { toast.error(e.message); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!token) return;
        setIsSaving(true);
        const tid = toast.loading("Trashing program...");
        try {
            await googleSheetsService.adminDeletePost(token, id, 'mco_exam_program');
            await refreshConfig();
            toast.success("Program moved to trash.", { id: tid });
            setExpandedId(null);
        } catch (e: any) { 
            toast.error(e.message || "Failed to delete program.", { id: tid }); 
        } finally { 
            setIsSaving(false); 
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-black text-white font-display flex items-center gap-3"><Settings className="text-cyan-500" /> Program Master</h1>
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-800">
                    {programs.map(p => (
                        <div key={p.category.id} className="bg-slate-900 group">
                            <div className={`flex items-center p-6 transition-colors ${expandedId === p.category.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}>
                                <div className="flex-grow">
                                    <p className="font-black text-white text-lg">{p.category.name}</p>
                                    <div className="flex gap-4 mt-1">
                                        {p.certExam?.productSku ? <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 uppercase">Linked SKU: {p.certExam.productSku}</span> : <span className="text-[10px] text-rose-400 italic font-bold">Unlinked Program</span>}
                                    </div>
                                </div>
                                <button onClick={() => setExpandedId(expandedId === p.category.id ? null : p.category.id)} className="flex items-center gap-2 px-6 py-2 bg-slate-950 text-white rounded-xl text-xs font-black border border-slate-700 hover:border-cyan-500 transition-all">
                                    <Edit size={14} className="text-cyan-500"/> {expandedId === p.category.id ? 'CLOSE' : 'EDIT'}
                                </button>
                            </div>
                            {expandedId === p.category.id && (
                                <ExamEditor 
                                    program={p} 
                                    onSave={handleSave} 
                                    onDelete={handleDelete}
                                    onCancel={() => setExpandedId(null)} 
                                    isSaving={isSaving}
                                    unlinkedProducts={Object.entries(examPrices || {}).map(([sku, d]: [string, any]) => ({ sku, name: d.name }))}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExamProgramCustomizer;