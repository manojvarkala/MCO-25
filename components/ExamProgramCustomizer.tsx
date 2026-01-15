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
    const [data, setData] = useState<EditableProgramData>({
        category: { ...program.category },
        practiceExam: program.practiceExam ? { ...program.practiceExam } : { id: program.category.practiceExamId, isPractice: true, certificateEnabled: false } as any,
        certExam: program.certExam ? { ...program.certExam } : { id: program.category.certificationExamId, isPractice: false, certificateEnabled: true, isProctored: true } as any,
    });
    
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Derived state for the addon checkbox
    const hasAddon = useMemo(() => {
        const sku = data.certExam?.productSku || '';
        const currentAddon = data.certExam?.addonSku || '';
        // It's considered checked if it matches the standard pattern
        return currentAddon === `${sku}-1mo-addon` && currentAddon !== '';
    }, [data.certExam?.productSku, data.certExam?.addonSku]);

    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: string, value: any) => {
        setData(prev => {
            const next = { ...prev, [examType]: { ...prev[examType], [field]: value } };
            
            // If primary SKU changes and addon was enabled, update addon SKU suffix
            if (examType === 'certExam' && field === 'productSku' && hasAddon) {
                next.certExam = { 
                    ...next.certExam, 
                    addonSku: value ? `${value}-1mo-addon` : '' 
                };
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
            certExam: {
                ...prev.certExam,
                addonSku: enabled ? `${baseSku}-1mo-addon` : ''
            }
        }));
    };

    const Label = ({ children }: { children: ReactNode }) => <label className="text-[10px] font-black uppercase tracking-widest text-white mb-1 block opacity-80">{children}</label>;

    return (
        <div className="bg-slate-900 p-6 rounded-b-xl space-y-6 shadow-inner border-t border-slate-700 pb-40 relative z-10">
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
                <div className="p-5 border rounded-xl bg-slate-800 border-slate-700 space-y-5 shadow-lg relative z-20">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                        <h4 className="font-black text-white flex items-center gap-2 uppercase"><Award size={18} className="text-blue-400" /> Certification Config</h4>
                        {data.certExam?.certificateEnabled && (
                            <Link 
                                to={`/certificate/sample?template_id=${data.certExam?.certificateTemplateId || 'cert-completion'}&theme_id=${activeOrg?.certificateThemeId}`} 
                                target="_blank"
                                className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase flex items-center gap-1 underline"
                            >
                                Preview <ExternalLink size={10}/>
                            </Link>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label>WooCommerce Certification SKU</Label>
                            <select 
                                value={data.certExam?.productSku || ''} 
                                onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-slate-950 border-slate-600 text-white text-sm cursor-pointer hover:border-cyan-500 transition-colors"
                            >
                                <option value="">-- No Linked Product --</option>
                                {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                        <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-700/50">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className={hasAddon ? "text-amber-400 fill-amber-400" : "text-slate-500"} />
                                        <span className="text-xs font-black text-white uppercase tracking-tighter">Premium Addon Offer</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Auto-constructs: {data.certExam?.productSku || 'SKU'}-1mo-addon</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={hasAddon} 
                                    onChange={e => toggleAddon(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/20"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div><Label>Questions</Label><input type="number" value={data.certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                        <div><Label>Mins</Label><input type="number" value={data.certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                        <div><Label>Pass %</Label><input type="number" value={data.certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="w-full p-2 border rounded bg-slate-950 border-slate-600 text-white" /></div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                            <input type="checkbox" checked={data.certExam?.certificateEnabled || false} onChange={e => handleExamChange('certExam', 'certificateEnabled', e.target.checked)} className="rounded bg-slate-950 border-slate-600 text-cyan-500" />
                            Enable Certification Certificate
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                            <input type="checkbox" checked={data.certExam?.isProctored || false} onChange={e => handleExamChange('certExam', 'isProctored', e.target.checked)} className="rounded bg-slate-950 border-slate-600 text-cyan-500" />
                            <ShieldCheck size={14} className="text-cyan-400"/> Enable Proctoring Integrity
                        </label>
                    </div>
                </div>

                <div className="p-5 border rounded-xl bg-slate-800 border-slate-700 space-y-5 shadow-lg">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                        <h4 className="font-black text-white flex items-center gap-2 uppercase"><FileText size={18} className="text-emerald-400" /> Practice Rules</h4>
                         {data.practiceExam?.certificateEnabled && (
                            <Link 
                                to={`/certificate/sample?template_id=cert-practice&theme_id=${activeOrg?.certificateThemeId}`} 
                                target="_blank"
                                className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase flex items-center gap-1 underline"
                            >
                                Preview <ExternalLink size={10}/>
                            </Link>
                        )}
                    </div>
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
    const location = useLocation();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Bulk state
    const [bulkData, setBulkData] = useState<any>({
        passScore: '',
        questionSourceUrl: '',
        practiceQuestions: '',
        practiceDuration: '',
        certQuestions: '',
        certDuration: '',
        enableAddon: false,
        useAddonBulk: false // Flag to determine if we should apply addon change
    });

    const programs = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(cat => ({
            category: cat,
            practiceExam: activeOrg.exams.find(e => e.id === cat.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === cat.certificationExamId)
        })).sort((a,b) => (a.category.name || '').localeCompare(b.category.name || ''));
    }, [activeOrg]);

    // Handle deep linking via Hash (e.g., #prod-123)
    useEffect(() => {
        const hash = location.hash.replace('#', '');
        if (hash && programs.length > 0) {
            const match = programs.find(p => p.category.id === hash);
            if (match) {
                setExpandedId(hash);
                // Wait for render, then scroll
                setTimeout(() => {
                    const el = document.getElementById(`program-card-${hash}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }
    }, [location.hash, programs]);

    const productLists = useMemo(() => {
        if (!examPrices) return { unlinked: [], bundles: [] };
        const all = Object.entries(examPrices).map(([sku, d]: [string, any]) => ({ sku, name: d.name, isBundle: d.isBundle }));
        return {
            unlinked: all,
            bundles: all.filter(p => p.isBundle)
        };
    }, [examPrices]);

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        setSelectedIds(selectedIds.length === programs.length ? [] : programs.map(p => p.category.id));
    };

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

    const handleBulkUpdate = async () => {
        if (selectedIds.length === 0 || !token) return;
        setIsSaving(true);
        const tid = toast.loading(`Updating ${selectedIds.length} programs...`);
        try {
            for (const id of selectedIds) {
                const program = programs.find(p => p.category.id === id);
                if (!program) continue;

                const update: any = { 
                    certExam: {},
                    practiceExam: {}
                };
                
                if (bulkData.passScore) update.certExam.passScore = bulkData.passScore;
                if (bulkData.certQuestions) update.certExam.numberOfQuestions = bulkData.certQuestions;
                if (bulkData.certDuration) update.certExam.durationMinutes = bulkData.certDuration;
                
                if (bulkData.practiceQuestions) update.practiceExam.numberOfQuestions = bulkData.practiceQuestions;
                if (bulkData.practiceDuration) update.practiceExam.durationMinutes = bulkData.practiceDuration;
                
                if (bulkData.questionSourceUrl) update.category = { questionSourceUrl: bulkData.questionSourceUrl };
                
                // Addon bulk construction
                if (bulkData.useAddonBulk) {
                    const sku = program.certExam?.productSku || '';
                    if (sku) {
                        update.certExam.addonSku = bulkData.enableAddon ? `${sku}-1mo-addon` : '';
                    }
                }
                
                await googleSheetsService.adminUpdateExamProgram(token, id, update);
            }
            await refreshConfig();
            toast.success("Bulk Update Complete", { id: tid });
            setSelectedIds([]);
            setBulkData({ passScore: '', questionSourceUrl: '', practiceQuestions: '', practiceDuration: '', certQuestions: '', certDuration: '', enableAddon: false, useAddonBulk: false });
        } catch (e: any) {
            toast.error(e.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
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
        } catch (e: any) { 
            toast.error(e.message, { id: tid }); 
        } finally { 
            setIsSaving(false); 
        }
    };

    return (
        <div className="space-y-8 pb-40">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h1 className="text-4xl font-black text-white font-display flex items-center gap-3"><Settings className="text-cyan-500" /> Program Master</h1>
                {selectedIds.length > 0 && (
                    <div className="flex flex-col gap-4 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 w-full lg:w-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-500">Pass Score %</label>
                                <input 
                                    type="number" 
                                    placeholder="80" 
                                    value={bulkData.passScore} 
                                    onChange={e => setBulkData({...bulkData, passScore: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-emerald-500">Prac Qs</label>
                                <input 
                                    type="number" 
                                    placeholder="20" 
                                    value={bulkData.practiceQuestions} 
                                    onChange={e => setBulkData({...bulkData, practiceQuestions: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-emerald-500">Prac Mins</label>
                                <input 
                                    type="number" 
                                    placeholder="30" 
                                    value={bulkData.practiceDuration} 
                                    onChange={e => setBulkData({...bulkData, practiceDuration: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-cyan-500">Cert Qs</label>
                                <input 
                                    type="number" 
                                    placeholder="100" 
                                    value={bulkData.certQuestions} 
                                    onChange={e => setBulkData({...bulkData, certQuestions: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-cyan-500">Cert Mins</label>
                                <input 
                                    type="number" 
                                    placeholder="120" 
                                    value={bulkData.certDuration} 
                                    onChange={e => setBulkData({...bulkData, certDuration: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-500">Sheet URL</label>
                                <input 
                                    type="text" 
                                    placeholder="CSV Link..." 
                                    value={bulkData.questionSourceUrl} 
                                    onChange={e => setBulkData({...bulkData, questionSourceUrl: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-xs text-white"
                                />
                            </div>
                            <div className="space-y-1 flex flex-col justify-end">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={bulkData.useAddonBulk} 
                                        onChange={e => setBulkData({...bulkData, useAddonBulk: e.target.checked})}
                                        className="rounded border-slate-600 bg-slate-950 text-cyan-500"
                                    />
                                    <span className="text-[9px] font-black uppercase text-slate-500">Apply Addon?</span>
                                </label>
                                {bulkData.useAddonBulk && (
                                    <button 
                                        onClick={() => setBulkData({...bulkData, enableAddon: !bulkData.enableAddon})}
                                        className={`mt-1 flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded border ${bulkData.enableAddon ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    >
                                        {bulkData.enableAddon ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                                        {bulkData.enableAddon ? 'ENABLE ADDON' : 'DISABLE ADDON'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={handleBulkUpdate}
                            disabled={isSaving}
                            className="w-full bg-cyan-600 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-cyan-500 transition shadow-lg shadow-cyan-900/20"
                        >
                            APPLY TO {selectedIds.length} SELECTED PROGRAMS
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700">
                <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between rounded-t-2xl">
                    <button onClick={handleSelectAll} className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition">
                        {selectedIds.length === programs.length ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16}/>}
                        {selectedIds.length === programs.length ? 'Deselect All' : 'Select All Programs'}
                    </button>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{programs.length} ACTIVE PROGRAMS</span>
                </div>

                <div className="divide-y divide-slate-800">
                    {programs.map(p => (
                        <div key={p.category.id} id={`program-card-${p.category.id}`} className="bg-slate-900 group first:rounded-none last:rounded-b-2xl">
                            <div className={`flex items-center p-6 transition-colors ${expandedId === p.category.id ? 'bg-slate-800' : 'hover:bg-slate-800/40'}`}>
                                <button onClick={() => handleToggleSelect(p.category.id)} className="mr-6 text-slate-700 hover:text-cyan-500 transition-colors">
                                    {selectedIds.includes(p.category.id) ? <CheckSquare size={22} className="text-cyan-500"/> : <Square size={22}/>}
                                </button>
                                <div className="flex-grow">
                                    <p className="font-black text-white text-lg">{p.category.name}</p>
                                    <div className="flex flex-wrap gap-3 mt-1">
                                        {p.certExam?.productSku ? <span className="text-[9px] text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800 uppercase">SKU: {p.certExam.productSku}</span> : <span className="text-[9px] text-rose-500 font-black uppercase">UNLINKED</span>}
                                        {p.certExam?.addonSku && <span className="text-[9px] text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800 uppercase flex items-center gap-1"><Zap size={8}/> Addon: {p.certExam.addonSku}</span>}
                                        <span className="text-[9px] text-slate-400 flex items-center gap-1 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800 uppercase"><HelpCircle size={8}/> {p.certExam?.numberOfQuestions || 0} Cert Qs</span>
                                        <span className="text-[9px] text-slate-400 flex items-center gap-1 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800 uppercase"><Clock size={8}/> {p.certExam?.durationMinutes || 0} Mins</span>
                                    </div>
                                </div>
                                <button onClick={() => setExpandedId(expandedId === p.category.id ? null : p.category.id)} className="flex items-center gap-2 px-6 py-2 bg-slate-950 text-white rounded-xl text-xs font-black border border-slate-700 hover:border-cyan-500 transition-all">
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
            
            <style>{`
                .mco-custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .mco-custom-scrollbar::-webkit-scrollbar-track {
                    background: #020617;
                }
                .mco-custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
                .mco-custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
};

export default ExamProgramCustomizer;
