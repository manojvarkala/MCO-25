import React, { FC, useState, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, Award, FileText, PlusCircle, Trash2, AlertTriangle, ExternalLink, CheckSquare, Square, Zap, Layers, Clock, HelpCircle, ToggleRight, ToggleLeft, ShieldCheck } from 'lucide-react';
import Spinner from './Spinner.tsx';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors.
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useLocation } = ReactRouterDOM as any;

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
    bundleProducts: any[];
}> = ({ program, onSave, onDelete, onCancel, isSaving, unlinkedProducts, bundleProducts }) => {
    const { activeOrg } = useAppContext();
    
    // NUCLEAR DEFENSIVE INITIALIZATION:
    // This prevents the 'Visual Tabs Error' by ensuring no null pointers are accessed during render.
    // If a program exists but is broken in the DB, we generate virtual default objects.
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

    const hasAddon = useMemo(() => {
        return !!data.certExam?.addonSku;
    }, [data.certExam?.addonSku]);

    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: string, value: any) => {
        setData(prev => {
            const current = (prev as any)[examType] || {};
            const next = { ...prev, [examType]: { ...current, [field]: value } };
            
            if (examType === 'certExam' && field === 'productSku' && hasAddon) {
                next.certExam = { ...next.certExam, addonSku: value ? `${value}-1mo-addon` : '' };
            }
            return next;
        });
    };

    const toggleAddon = (enabled: boolean) => {
        const baseSku = data.certExam?.productSku || '';
        if (!baseSku && enabled) {
            toast.error("Set a Certification SKU first to enable the addon.");
            return;
        }
        setData(prev => ({
            ...prev,
            certExam: { ...prev.certExam, addonSku: enabled ? `${baseSku}-1mo-addon` : '' }
        }));
    };

    const Label = ({ children }: { children: ReactNode }) => <label className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--color-text-muted-rgb))] mb-1 block opacity-80">{children}</label>;

    return (
        <div className="bg-[rgba(var(--color-muted-rgb),0.2)] p-6 rounded-b-xl space-y-6 shadow-inner border-t border-[rgb(var(--color-border-rgb))] pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label>Brand Identity / Name</Label>
                    <input type="text" value={data.category?.name || ''} onChange={e => handleCategoryChange('name', e.target.value)} className="w-full p-3 border rounded-lg bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-strong-rgb))] focus:border-cyan-500" />
                </div>
                <div>
                    <Label>Google Sheet Data URL</Label>
                    <input type="text" value={data.category?.questionSourceUrl || ''} onChange={e => handleCategoryChange('questionSourceUrl', e.target.value)} className="w-full p-3 border rounded-lg bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))] text-cyan-500 font-mono text-xs" />
                </div>
            </div>
            
            <div>
                <Label>Program Description (Public)</Label>
                <textarea value={data.category?.description || ''} onChange={e => handleCategoryChange('description', e.target.value)} className="w-full p-3 border rounded-lg bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-strong-rgb))]" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border rounded-xl bg-[rgba(var(--color-muted-rgb),0.3)] border-[rgb(var(--color-border-rgb))] space-y-5 shadow-lg">
                    <div className="flex justify-between items-center border-b border-[rgb(var(--color-border-rgb))] pb-3">
                        <h4 className="font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-2 uppercase"><Award size={18} className="text-blue-500" /> Certification Config</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label>WooCommerce Certification SKU</Label>
                            <select 
                                value={data.certExam?.productSku || ''} 
                                onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-strong-rgb))] text-sm font-mono"
                            >
                                <option value="">-- No Linked Product --</option>
                                {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                        <div className="p-4 bg-[rgba(var(--color-background-rgb),0.5)] rounded-xl border border-[rgb(var(--color-border-rgb))]">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className={hasAddon ? "text-amber-500 fill-amber-500" : "text-slate-500"} />
                                        <span className="text-xs font-black text-[rgb(var(--color-text-strong-rgb))] uppercase tracking-tighter">Premium Addon Offer</span>
                                    </div>
                                    <p className="text-[9px] text-[rgb(var(--color-text-muted-rgb))] font-bold uppercase">{data.certExam?.addonSku || 'Not Configured'}</p>
                                </div>
                                <input type="checkbox" checked={hasAddon} onChange={e => toggleAddon(e.target.checked)} className="w-5 h-5 rounded border-[rgb(var(--color-border-rgb))] text-amber-500" />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div><Label>Questions</Label><input type="number" value={data.certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                        <div><Label>Mins</Label><input type="number" value={data.certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                        <div><Label>Pass %</Label><input type="number" value={data.certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                    </div>
                </div>

                <div className="p-5 border rounded-xl bg-[rgba(var(--color-muted-rgb),0.3)] border-[rgb(var(--color-border-rgb))] space-y-5 shadow-lg">
                    <h4 className="font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-2 uppercase border-b border-[rgb(var(--color-border-rgb))] pb-3"><FileText size={18} className="text-emerald-500" /> Practice Rules</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Question Count</Label><input type="number" value={data.practiceExam?.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                        <div><Label>Duration (Mins)</Label><input type="number" value={data.practiceExam?.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-[rgb(var(--color-background-rgb))] border-[rgb(var(--color-border-rgb))]" /></div>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-between items-center pt-6 border-t border-[rgb(var(--color-border-rgb))]">
                <div className="flex gap-2">
                    {!isConfirmingDelete ? (
                        <button onClick={() => setIsConfirmingDelete(true)} className="px-4 py-2 text-rose-500 hover:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold uppercase">Delete Program</button>
                    ) : (
                        <button onClick={() => onDelete(program.category.id)} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-black shadow-lg shadow-rose-900/20 animate-pulse">CONFIRM TRASH</button>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-6 py-2 text-[rgb(var(--color-text-muted-rgb))] font-bold">Discard</button>
                    <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="flex items-center gap-2 px-8 py-2 bg-cyan-600 text-white rounded-lg font-black transition shadow-lg">
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
    const location = useLocation();
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

    const productLists = useMemo(() => {
        if (!examPrices) return { unlinked: [], bundles: [] };
        const all = Object.entries(examPrices).map(([sku, d]: [string, any]) => ({ sku, name: d.name, isBundle: d.isBundle }));
        return { unlinked: all, bundles: all.filter(p => p.isBundle) };
    }, [examPrices]);

    const handleSave = async (id: string, data: EditableProgramData) => {
        if (!token) return;
        setIsSaving(true);
        try {
            await googleSheetsService.adminUpdateExamProgram(token, id, data);
            await refreshConfig();
            toast.success("Program Synchronized");
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
            toast.success("Program Deleted", { id: tid });
            setExpandedId(null);
        } catch (e: any) { toast.error(e.message, { id: tid }); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-8 pb-40">
            <h1 className="text-4xl font-black text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><Settings className="text-cyan-500" /> Program Master</h1>

            <div className="bg-[rgb(var(--color-card-rgb))] rounded-2xl shadow-2xl border border-[rgb(var(--color-border-rgb))] overflow-hidden">
                <div className="bg-[rgb(var(--color-background-rgb))] p-4 border-b border-[rgb(var(--color-border-rgb))] flex items-center justify-between">
                    <span className="text-[10px] font-black text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-widest">{programs.length} ACTIVE PROGRAMS</span>
                </div>

                <div className="divide-y divide-[rgb(var(--color-border-rgb))]">
                    {programs.map(p => (
                        <div key={p.category.id} className="bg-[rgb(var(--color-card-rgb))]">
                            <div className={`flex items-center p-6 transition-colors ${expandedId === p.category.id ? 'bg-[rgba(var(--color-muted-rgb),0.3)]' : 'hover:bg-[rgba(var(--color-muted-rgb),0.2)]'}`}>
                                <div className="flex-grow">
                                    <p className="font-black text-[rgb(var(--color-text-strong-rgb))] text-lg">{p.category.name}</p>
                                    <div className="flex flex-wrap gap-3 mt-1">
                                        {p.certExam?.productSku ? <span className="text-[9px] text-cyan-500 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 uppercase">SKU: {p.certExam.productSku}</span> : <span className="text-[9px] text-rose-500 font-black uppercase">UNLINKED PRODUCT</span>}
                                        <span className="text-[9px] text-[rgb(var(--color-text-muted-rgb))] flex items-center gap-1 bg-[rgba(var(--color-background-rgb),0.5)] px-2 py-0.5 rounded border border-[rgb(var(--color-border-rgb))] uppercase"><HelpCircle size={8}/> {p.certExam?.numberOfQuestions || 0} Cert Qs</span>
                                    </div>
                                </div>
                                <button onClick={() => setExpandedId(expandedId === p.category.id ? null : p.category.id)} className="flex items-center gap-2 px-6 py-2 bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-strong-rgb))] rounded-xl text-xs font-black border border-[rgb(var(--color-border-rgb))] hover:border-cyan-500 transition-all">
                                    <Edit size={14} className="text-cyan-500"/> {expandedId === p.category.id ? 'CLOSE' : 'CONFIGURE'}
                                </button>
                            </div>
                            {expandedId === p.category.id && (
                                <ExamEditor 
                                    program={p} 
                                    onSave={handleSave} 
                                    onDelete={handleDelete}
                                    onCancel={() => setExpandedId(null)} 
                                    isSaving={isSaving}
                                    unlinkedProducts={productLists.unlinked}
                                    bundleProducts={productLists.bundles}
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
