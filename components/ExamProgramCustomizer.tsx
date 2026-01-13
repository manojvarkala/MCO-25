import React, { FC, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory, Organization, ProductVariation, RecommendedBook, ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, X, ChevronDown, ChevronUp, FileText, Award, PlusCircle, Trash2, Link2, BarChart3, ShoppingCart, DollarSign } from 'lucide-react';
import Spinner from './Spinner.tsx';

interface EditableProgramData {
    category?: Partial<ExamProductCategory>;
    practiceExam?: Partial<Exam>;
    certExam?: Partial<Exam>;
    addonEnabled?: boolean;
    addonPrice?: string;
    addonRegularPrice?: string;
}

const ExamEditor: FC<{
    program: { category: ExamProductCategory; practiceExam?: Exam; certExam?: Exam; };
    onSave: (programId: string, data: EditableProgramData) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    unlinkedProducts: any[];
    suggestedBooks: RecommendedBook[];
    examPrices: { [key: string]: any } | null;
}> = ({ program, onSave, onCancel, isSaving, unlinkedProducts, suggestedBooks, examPrices }) => {
    const initialCertExam = useMemo(() => {
        if (program.certExam) return { ...program.certExam };
        return { id: program.category.certificationExamId, productSku: '', name: program.category.name, passScore: 70, numberOfQuestions: 50, durationMinutes: 90, isProctored: false, certificateEnabled: true } as Partial<Exam>;
    }, [program]);

    const addonData = useMemo(() => {
        if (!initialCertExam?.productSku || !examPrices) return { enabled: false, price: '', regPrice: '' };
        const addonSku = `${initialCertExam.productSku}-1mo-addon`;
        const data = examPrices[addonSku];
        return { enabled: !!data, price: data?.price?.toString() || '', regPrice: data?.regularPrice?.toString() || '' };
    }, [initialCertExam, examPrices]);

    const [data, setData] = useState<EditableProgramData>({
        category: { ...program.category },
        practiceExam: program.practiceExam ? { ...program.practiceExam } : { id: program.category.practiceExamId, isPractice: true } as any,
        certExam: initialCertExam,
        addonEnabled: addonData.enabled,
        addonPrice: addonData.price,
        addonRegularPrice: addonData.regPrice
    });
    
    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: keyof Exam, value: any) => {
        setData(prev => ({ ...prev, [examType]: { ...prev[examType], [field]: value } }));
    };

    const Label = ({ children }: { children: ReactNode }) => <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{children}</label>;

    return (
        <div className="bg-slate-900 p-6 rounded-b-xl space-y-6 shadow-inner border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label>Program Primary Name</Label>
                    <input type="text" value={data.category?.name || ''} onChange={e => handleCategoryChange('name', e.target.value)} className="w-full p-3 border rounded-lg bg-slate-950 border-slate-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20" />
                </div>
                <div>
                    <Label>Google Sheet CSV URL</Label>
                    <input type="text" value={data.category?.questionSourceUrl || ''} onChange={e => handleCategoryChange('questionSourceUrl', e.target.value)} className="w-full p-3 border rounded-lg bg-slate-950 border-slate-700 text-cyan-400 font-mono text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20" />
                </div>
            </div>
            
            <div>
                <Label>Public Description</Label>
                <textarea value={data.category?.description || ''} onChange={e => handleCategoryChange('description', e.target.value)} className="w-full p-3 border rounded-lg bg-slate-950 border-slate-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border rounded-xl bg-slate-800 border-slate-700 space-y-5 shadow-lg">
                    <h4 className="font-black text-white flex items-center gap-2 border-b border-slate-700 pb-3 uppercase tracking-tighter"><Award size={18} className="text-blue-400" /> Certification Rules</h4>
                    <div>
                        <Label>Linked Store Product (SKU)</Label>
                        <select 
                            value={data.certExam?.productSku || ''} 
                            onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} 
                            className="w-full p-3 border rounded-lg bg-slate-950 border-slate-700 text-white text-sm"
                        >
                            <option value="">-- No Linked Product --</option>
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><Label>Qs</Label><input type="number" value={data.certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-700 text-white" /></div>
                        <div><Label>Mins</Label><input type="number" value={data.certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-700 text-white" /></div>
                        <div><Label>Pass %</Label><input type="number" value={data.certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-700 text-white" /></div>
                    </div>
                    <div className="flex gap-6 pt-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={data.certExam?.isProctored || false} onChange={e => handleExamChange('certExam', 'isProctored', e.target.checked)} className="rounded border-slate-600 bg-slate-900 text-cyan-500" />
                            Proctoring
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={data.certExam?.certificateEnabled || false} onChange={e => handleExamChange('certExam', 'certificateEnabled', e.target.checked)} className="rounded border-slate-600 bg-slate-900 text-cyan-500" />
                            Issue Certificate
                        </label>
                    </div>
                </div>

                <div className="p-5 border rounded-xl bg-slate-800 border-slate-700 space-y-5 shadow-lg">
                    <h4 className="font-black text-white flex items-center gap-2 border-b border-slate-700 pb-3 uppercase tracking-tighter"><FileText size={18} className="text-emerald-400" /> Practice Rules</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Total Questions</Label><input type="number" value={data.practiceExam?.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-700 text-white" /></div>
                        <div><Label>Duration (Mins)</Label><input type="number" value={data.practiceExam?.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-700 text-white" /></div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer pt-2">
                        <input type="checkbox" checked={data.practiceExam?.certificateEnabled || false} onChange={e => handleExamChange('practiceExam', 'certificateEnabled', e.target.checked)} className="rounded border-slate-600 bg-slate-900 text-cyan-500" />
                        Enable Practice Completion Certificate
                    </label>
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button onClick={onCancel} disabled={isSaving} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-bold transition">Cancel</button>
                <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="flex items-center gap-2 px-8 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-black transition shadow-lg disabled:opacity-50">
                    {isSaving ? <Spinner size="sm" /> : <Save size={18} />} SAVE PROGRAM
                </button>
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
        const tid = toast.loading("Updating backend data...");
        try {
            await googleSheetsService.adminUpdateExamProgram(token, id, data);
            await refreshConfig();
            toast.success("Program synced successfully!", { id: tid });
            setExpandedId(null);
        } catch (e: any) { toast.error(e.message || "Failed to update", { id: tid }); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-black text-slate-100 font-display flex items-center gap-3"><Settings className="text-cyan-500" /> Program Master</h1>
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-700 flex justify-between items-center">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Exam Containers ({programs.length})</p>
                    <button className="flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-500 transition"><PlusCircle size={14}/> Create New</button>
                </div>
                <div className="divide-y divide-slate-800">
                    {programs.map(p => (
                        <div key={p.category.id} className="bg-slate-900 group">
                            <div className={`flex items-center p-4 transition-colors ${expandedId === p.category.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}>
                                <div className="flex-grow">
                                    <p className="font-black text-slate-100 text-lg">{p.category.name}</p>
                                    <div className="flex gap-4 mt-1">
                                        {p.certExam?.productSku ? <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">SKU: {p.certExam.productSku}</span> : <span className="text-[10px] text-rose-400 italic">No Store Link</span>}
                                        <span className="text-[10px] text-slate-500 font-mono">ID: {p.category.id}</span>
                                    </div>
                                </div>
                                <button onClick={() => setExpandedId(expandedId === p.category.id ? null : p.category.id)} className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-slate-200 rounded-lg text-xs font-black shadow-md border border-slate-700 hover:bg-slate-800 transition">
                                    <Edit size={14} className="text-cyan-500"/> {expandedId === p.category.id ? 'CLOSE' : 'EDIT'}
                                </button>
                            </div>
                            {expandedId === p.category.id && (
                                <ExamEditor 
                                    program={p} 
                                    onSave={handleSave} 
                                    onCancel={() => setExpandedId(null)} 
                                    isSaving={isSaving}
                                    unlinkedProducts={Object.entries(examPrices || {}).map(([sku, d]: [string, any]) => ({ sku, name: d.name }))}
                                    suggestedBooks={[]}
                                    examPrices={examPrices}
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