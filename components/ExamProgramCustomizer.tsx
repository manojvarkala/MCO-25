

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

const BulkEditPanel: FC<{
    onSave: (update: any) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    selectedCount: number;
}> = ({ onSave, onCancel, isSaving, selectedCount }) => {
    const [isProctored, setIsProctored] = useState<string>('unchanged');
    const [certificateEnabled, setCertificateEnabled] = useState<string>('unchanged');
    const [passScore, setPassScore] = useState<string>('');
    const [questionUrl, setQuestionUrl] = useState('');
    const [practiceQuestions, setPracticeQuestions] = useState('');
    const [practiceDuration, setPracticeDuration] = useState('');
    const [certQuestions, setCertQuestions] = useState('');
    const [certDuration, setCertDuration] = useState('');

    const handleSave = () => {
        const updateData: any = {};
        if (isProctored !== 'unchanged') updateData.cert_isProctored = isProctored === 'true';
        if (certificateEnabled !== 'unchanged') updateData.cert_certificateEnabled = certificateEnabled === 'true';
        if (passScore) updateData.cert_passScore = parseInt(passScore, 10);
        if (questionUrl) updateData.questionSourceUrl = questionUrl;
        if (practiceQuestions) updateData.practice_numberOfQuestions = parseInt(practiceQuestions, 10);
        if (practiceDuration) updateData.practice_durationMinutes = parseInt(practiceDuration, 10);
        if (certQuestions) updateData.cert_numberOfQuestions = parseInt(certQuestions, 10);
        if (certDuration) updateData.cert_durationMinutes = parseInt(certDuration, 10);

        if (Object.keys(updateData).length === 0) {
            toast.error("No changes to apply.");
            return;
        }
        onSave(updateData);
    };

    const Label: FC<{ children: ReactNode }> = ({ children }) => <label className="text-xs font-bold block mb-1">{children}</label>;

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg border border-[rgb(var(--color-primary-rgb))] space-y-4 mb-4">
            <h3 className="font-bold text-lg">Bulk Edit {selectedCount} Programs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Question Source URL</Label>
                    <input type="url" value={questionUrl} onChange={e => setQuestionUrl(e.target.value)} placeholder="-- Unchanged --" className="w-full p-2 border rounded bg-white" />
                </div>
            </div>
            <div className="pt-4 border-t border-[rgb(var(--color-border-rgb))]">
                <h4 className="font-semibold text-base mb-2">Certification Exam Defaults</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <Label>Proctoring</Label>
                        <select value={isProctored} onChange={e => setIsProctored(e.target.value)} className="w-full p-2 border rounded bg-white">
                            <option value="unchanged">Unchanged</option>
                            <option value="true">Enable</option>
                            <option value="false">Disable</option>
                        </select>
                    </div>
                    <div>
                        <Label>Pass Score (%)</Label>
                        <input type="number" value={passScore} onChange={e => setPassScore(e.target.value)} placeholder="Unchanged" className="w-full p-2 border rounded bg-white" />
                    </div>
                    <div>
                        <Label>No. of Questions</Label>
                        <input type="number" value={certQuestions} onChange={e => setCertQuestions(e.target.value)} placeholder="Unchanged" className="w-full p-2 border rounded bg-white" />
                    </div>
                    <div>
                        <Label>Duration (Mins)</Label>
                        <input type="number" value={certDuration} onChange={e => setCertDuration(e.target.value)} placeholder="Unchanged" className="w-full p-2 border rounded bg-white" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(var(--color-border-rgb))]">
                <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-300">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-600 disabled:bg-slate-400">
                    {isSaving ? <Spinner /> : <Save size={16} />} Apply Changes
                </button>
            </div>
        </div>
    );
};

interface ExamEditorProps {
    program: { category: ExamProductCategory; practiceExam?: Exam; certExam?: Exam; };
    onSave: (programId: string, data: EditableProgramData) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    unlinkedProducts: any[];
    suggestedBooks: RecommendedBook[];
    examPrices: { [key: string]: any } | null;
}

const ExamEditor: FC<ExamEditorProps> = ({ program, onSave, onCancel, isSaving, unlinkedProducts, suggestedBooks, examPrices }) => {
    const { activeOrg } = useAppContext();
    
    // Safety: ensure certExam exists for state management even if one wasn't in the initial data
    const initialCertExam = useMemo(() => {
        if (program.certExam) return { ...program.certExam };
        return { id: program.category.certificationExamId, productSku: '', name: program.category.name, passScore: 70, numberOfQuestions: 50, durationMinutes: 90, isProctored: false, certificateEnabled: true } as Partial<Exam>;
    }, [program]);

    const addonData = useMemo(() => {
        if (!initialCertExam?.productSku || !examPrices) return { enabled: false, price: '', regPrice: '' };
        const addonSku = `${initialCertExam.productSku}-1mo-addon`;
        const data = examPrices[addonSku];
        return {
            enabled: !!data,
            price: data?.price?.toString() || '',
            regPrice: data?.regularPrice?.toString() || ''
        };
    }, [initialCertExam, examPrices]);

    const [data, setData] = useState<EditableProgramData>({
        category: { ...program.category },
        practiceExam: program.practiceExam ? { ...program.practiceExam } : { id: program.category.practiceExamId, isPractice: true } as any,
        certExam: initialCertExam,
        addonEnabled: addonData.enabled,
        addonPrice: addonData.price,
        addonRegularPrice: addonData.regPrice
    });
    
    useEffect(() => {
        setData({
            category: { ...program.category },
            practiceExam: program.practiceExam ? { ...program.practiceExam } : { id: program.category.practiceExamId, isPractice: true } as any,
            certExam: initialCertExam,
            addonEnabled: addonData.enabled,
            addonPrice: addonData.price,
            addonRegularPrice: addonData.regPrice
        });
    }, [program, initialCertExam, addonData]);

    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: keyof Exam, value: any) => {
        setData(prev => ({
            ...prev,
            [examType]: { ...prev[examType], [field]: value }
        }));
    };

    const toggleAddon = (enabled: boolean) => {
        setData(prev => {
            let nextPrice = prev.addonPrice;
            let nextReg = prev.addonRegularPrice;
            if (enabled && !nextPrice && prev.certExam?.productSku && examPrices) {
                const basePrice = examPrices[prev.certExam.productSku]?.price || 0;
                nextPrice = (basePrice + 10).toString();
                nextReg = (basePrice + 30).toString();
            }
            return { ...prev, addonEnabled: enabled, addonPrice: nextPrice, addonRegularPrice: nextReg };
        });
    };

    const { category, practiceExam, certExam, addonEnabled, addonPrice, addonRegularPrice } = data;
    const initialLinkedProductInfo = useMemo(() => {
        const sku = program.certExam?.productSku || '';
        if (!sku || !examPrices) return null;
        const info = examPrices[sku];
        return info ? { sku, name: info.name } : null;
    }, [program.certExam, examPrices]);

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-b-lg space-y-4 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Program Name</label>
                    <input type="text" value={category.name || ''} onChange={e => handleCategoryChange('name', e.target.value)} className="w-full p-2 border rounded bg-white mt-1" />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Question Source URL</label>
                    <input type="text" value={category?.questionSourceUrl || ''} onChange={e => handleCategoryChange('questionSourceUrl', e.target.value)} className="w-full p-2 border rounded bg-white mt-1" />
                </div>
            </div>
            
            <div>
                <label className="text-xs font-bold uppercase text-slate-500">Program Description</label>
                <textarea value={category.description || ''} onChange={e => handleCategoryChange('description', e.target.value)} className="w-full p-2 border rounded bg-white mt-1" rows={2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Certification Exam Box - ALWAYS VISIBLE */}
                <div className="p-4 border rounded-xl bg-white space-y-4 shadow-sm">
                    <h4 className="font-bold flex items-center gap-2 border-b pb-2"><Award size={18} className="text-blue-500" /> Certification Exam</h4>
                    <div>
                        <label className="text-xs font-bold text-slate-500">Linked WooCommerce Product</label>
                        <select 
                            value={certExam?.productSku || ''} 
                            onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} 
                            className="w-full p-2 border rounded bg-slate-50 mt-1 text-sm"
                        >
                            <option value="">-- No Product Linked --</option>
                            {initialLinkedProductInfo && <option value={initialLinkedProductInfo.sku}>{initialLinkedProductInfo.name} ({initialLinkedProductInfo.sku})</option>}
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1 italic">Links the program to a specific WooCommerce product for purchase tracking.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Questions</label>
                            <input type="number" value={certExam?.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-slate-50" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Mins</label>
                            <input type="number" value={certExam?.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-slate-50" />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500">Pass %</label>
                            <input type="number" value={certExam?.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', e.target.value)} className="w-full p-2 border rounded bg-slate-50" />
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={certExam?.isProctored || false} onChange={e => handleExamChange('certExam', 'isProctored', e.target.checked)} />
                            Enable Proctoring
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={certExam?.certificateEnabled || false} onChange={e => handleExamChange('certExam', 'certificateEnabled', e.target.checked)} />
                            Enable Certificate
                        </label>
                    </div>

                    {/* ADDON SECTION */}
                    <div className={`p-3 rounded-lg border-2 transition ${addonEnabled ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input type="checkbox" checked={addonEnabled} onChange={e => toggleAddon(e.target.checked)} className="h-4 w-4 rounded text-blue-600" />
                            <span className="font-bold text-sm">Enable 1-Month Addon Bundle</span>
                        </label>
                        {addonEnabled && (
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-100">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Addon Sale Price</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2 top-2 text-slate-400">$</span>
                                        <input type="number" value={addonPrice} onChange={e => setData(prev => ({...prev, addonPrice: e.target.value}))} className="w-full p-1.5 pl-5 border rounded bg-white text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Addon Regular Price</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2 top-2 text-slate-400">$</span>
                                        <input type="number" value={addonRegularPrice} onChange={e => setData(prev => ({...prev, addonRegularPrice: e.target.value}))} className="w-full p-1.5 pl-5 border rounded bg-white text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Practice Exam Box */}
                <div className="p-4 border rounded-xl bg-white space-y-4 shadow-sm">
                    <h4 className="font-bold flex items-center gap-2 border-b pb-2"><FileText size={18} className="text-emerald-500" /> Practice Exam</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Questions</label>
                            <input type="number" value={practiceExam?.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', e.target.value)} className="w-full p-2 border rounded bg-slate-50" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Duration (Mins)</label>
                            <input type="number" value={practiceExam?.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', e.target.value)} className="w-full p-2 border rounded bg-slate-50" />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
                        <input type="checkbox" checked={practiceExam?.certificateEnabled || false} onChange={e => handleExamChange('practiceExam', 'certificateEnabled', e.target.checked)} />
                        Enable Practice Certificate
                    </label>
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
                <button onClick={onCancel} disabled={isSaving} className="px-5 py-2 bg-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-300">Cancel</button>
                <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-green-500 rounded-lg font-bold text-white hover:bg-green-600 disabled:bg-slate-400">
                    {isSaving ? <Spinner /> : <Save size={18} />} Save Changes
                </button>
            </div>
        </div>
    );
};

const ExamProgramCustomizer: FC = () => {
    const { activeOrg, examPrices, suggestedBooks, refreshConfig } = useAppContext();
    const { token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProgramName, setNewProgramName] = useState('');
    const [newProgramProductLink, setNewProgramProductLink] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
    const [stats, setStats] = useState<ExamStat[] | null>(null);
    
    useEffect(() => {
        if (location.hash) setExpandedProgramId(location.hash.substring(1));
    }, [location.hash]);

    useEffect(() => {
        if (!token) return;
        googleSheetsService.getExamStats(token).then(setStats).catch(() => {});
    }, [token]);

    const programData = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(cat => {
            const practiceExam = activeOrg.exams.find(e => e.id === cat.practiceExamId);
            const certExam = activeOrg.exams.find(e => e.id === cat.certificationExamId);
            const stat = stats?.find(s => s.id === certExam?.id);
            return { category: cat, practiceExam, certExam, stat };
        }).sort((a,b) => (a.category.name || '').localeCompare(b.category.name || ''));
    }, [activeOrg, stats]);
    
    const unlinkedProducts = useMemo(() => {
        if (!examPrices || !activeOrg) return [];
        
        // Return ALL products that aren't recurring subscriptions or already used bundles
        return Object.entries(examPrices)
            .filter(([sku, data]: [string, any]) => {
                if (sku.startsWith('sub-')) return false;
                if (data.isBundle && !sku.endsWith('-addon')) return false;
                return true;
            })
            .map(([sku, data]: [string, any]) => ({ sku, name: data.name }));
    }, [examPrices, activeOrg]);

    const handleSave = async (programId: string, data: EditableProgramData) => {
        if (!token) return;
        setIsSaving(true);
        const toastId = toast.loading("Saving program changes...");
        try {
            await googleSheetsService.adminUpdateExamProgram(token, programId, data);
            
            if (data.certExam?.productSku && data.addonEnabled) {
                const certSku = data.certExam.productSku;
                const addonSku = `${certSku}-1mo-addon`;
                const examName = data.certExam.name || data.category?.name || 'Exam';
                
                await googleSheetsService.adminUpsertProduct(token, {
                    sku: addonSku,
                    name: `${examName} - 1-Month Premium Access`,
                    price: parseFloat(data.addonPrice || '0'),
                    regularPrice: parseFloat(data.addonRegularPrice || '0'),
                    isBundle: true,
                    bundled_skus: [certSku, 'sub-monthly']
                });
            }

            await refreshConfig();
            toast.success("Program and linked data updated!", { id: toastId });
            setExpandedProgramId(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save.', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCreate = async () => {
        if (!token || !newProgramName) return;
        setIsCreating(true);
        try {
            await googleSheetsService.adminCreateExamProgram(token, newProgramName, { sku: newProgramProductLink });
            await refreshConfig();
            toast.success(`Program created!`);
            setIsCreateModalOpen(false);
        } catch(e: any) {
            toast.error(e.message);
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleBulkSave = async (updateData: any) => {
        if (!token || selectedProgramIds.length === 0) return;
        setIsBulkSaving(true);
        const toastId = toast.loading(`Updating ${selectedProgramIds.length} programs...`);
        try {
            for (const programId of selectedProgramIds) {
                await googleSheetsService.adminUpdateExamProgram(token, programId, updateData);
            }
            await refreshConfig();
            toast.success("Bulk update successful!", { id: toastId });
            setSelectedProgramIds([]);
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        } finally {
            setIsBulkSaving(false);
        }
    };

    return (
        <div className="space-y-8">
             {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Create New Exam Program</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Program Name</label>
                                <input type="text" value={newProgramName} onChange={e => setNewProgramName(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white" />
                            </div>
                             <div>
                                <label className="text-sm font-medium">Link to Existing Product (Optional)</label>
                                <select value={newProgramProductLink} onChange={e => setNewProgramProductLink(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                                    <option value="">Auto-generate new product</option>
                                    {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsCreateModalOpen(false)} disabled={isCreating} className="bg-slate-200 py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleCreate} disabled={isCreating} className="bg-green-500 text-white py-2 px-4 rounded-lg font-bold">
                                {isCreating ? <Spinner /> : 'Create Program'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><Settings /> Exam Program Customizer</h1>
            
            {selectedProgramIds.length > 0 && (
                <BulkEditPanel 
                    onSave={handleBulkSave}
                    onCancel={() => setSelectedProgramIds([])}
                    isSaving={isBulkSaving}
                    selectedCount={selectedProgramIds.length}
                />
            )}
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Programs List</h2>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition shadow-sm">
                        <PlusCircle size={18}/> New Program
                    </button>
                </div>

                <div className="space-y-3">
                    {programData.map(p => (
                        <div key={p.category.id} className="bg-[rgb(var(--color-muted-rgb))] rounded-xl border border-[rgb(var(--color-border-rgb))] overflow-hidden">
                            <div className="flex items-center p-4">
                                 <input
                                    type="checkbox"
                                    checked={selectedProgramIds.includes(p.category.id)}
                                    onChange={e => setSelectedProgramIds(prev => e.target.checked ? [...prev, p.category.id] : prev.filter(id => id !== p.category.id))}
                                    className="h-4 w-4 mr-4 rounded text-blue-600"
                                />
                                <div className="flex-grow">
                                    <p className="font-bold text-[rgb(var(--color-text-strong-rgb))]">{p.category.name}</p>
                                    <div className="flex gap-4 mt-1">
                                        {p.certExam?.productSku ? <span className="text-xs text-slate-500 font-mono">SKU: {p.certExam.productSku}</span> : <span className="text-xs text-red-400 italic">No Product Linked</span>}
                                        {/* FIX: Use p.stat instead of stat which is not defined in this scope */}
                                        {p.stat && <span className="text-xs text-slate-500 font-mono">Sales: {p.stat?.totalSales || 0}</span>}
                                    </div>
                                </div>
                                <button onClick={() => setExpandedProgramId(expandedProgramId === p.category.id ? null : p.category.id)} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 border border-slate-200">
                                    <Edit size={16}/> {expandedProgramId === p.category.id ? 'Close' : 'Edit'}
                                </button>
                            </div>
                            {expandedProgramId === p.category.id && (
                                <ExamEditor 
                                    program={p} 
                                    onSave={handleSave} 
                                    onCancel={() => setExpandedProgramId(null)} 
                                    isSaving={isSaving}
                                    unlinkedProducts={unlinkedProducts}
                                    suggestedBooks={suggestedBooks || []}
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
