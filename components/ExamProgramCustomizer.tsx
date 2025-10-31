import React, { FC, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory, Organization, ProductVariation, RecommendedBook, ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, X, ChevronDown, ChevronUp, FileText, Award, PlusCircle, Trash2, Link2, BarChart3, ShoppingCart } from 'lucide-react';
import Spinner from './Spinner.tsx';

interface EditableProgramData {
    category?: Partial<ExamProductCategory>;
    practiceExam?: Partial<Exam>;
    certExam?: Partial<Exam>;
}

const BulkEditPanel: FC<{
    onSave: (update: any) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    selectedCount: number;
}> = ({ onSave, onCancel, isSaving, selectedCount }) => {
    const [isProctored, setIsProctored] = useState<string>('unchanged'); // 'unchanged', 'true', 'false'
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
            
            <div>
                <h4 className="font-semibold text-base mb-2">General Settings</h4>
                <div>
                    <Label>Question Source URL</Label>
                    <textarea value={questionUrl} onChange={e => setQuestionUrl(e.target.value)} placeholder="-- Unchanged --" className="w-full p-2 mt-1 border rounded bg-white" rows={2} />
                </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[rgb(var(--color-border-rgb))]">
                <h4 className="font-semibold text-base mb-2">Certification Exam Settings</h4>
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
                        <Label>Certificate</Label>
                        <select value={certificateEnabled} onChange={e => setCertificateEnabled(e.target.value)} className="w-full p-2 border rounded bg-white">
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

            <div className="pt-4 mt-4 border-t border-[rgb(var(--color-border-rgb))]">
                <h4 className="font-semibold text-base mb-2">Practice Exam Settings</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <Label>No. of Questions</Label>
                        <input type="number" value={practiceQuestions} onChange={e => setPracticeQuestions(e.target.value)} placeholder="Unchanged" className="w-full p-2 border rounded bg-white" />
                    </div>
                    <div>
                        <Label>Duration (Mins)</Label>
                        <input type="number" value={practiceDuration} onChange={e => setPracticeDuration(e.target.value)} placeholder="Unchanged" className="w-full p-2 border rounded bg-white" />
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
    const [data, setData] = useState<EditableProgramData>({
        category: { ...program.category },
        practiceExam: program.practiceExam ? { ...program.practiceExam } : undefined,
        certExam: program.certExam ? { ...program.certExam } : undefined,
    });
    
    // FIX: Add a useEffect hook to update the editor's internal state when the selected program changes.
    // This ensures that when a new program is opened for editing, its data is correctly loaded into the form fields.
    useEffect(() => {
        setData({
            category: { ...program.category },
            practiceExam: program.practiceExam ? { ...program.practiceExam } : undefined,
            certExam: program.certExam ? { ...program.certExam } : undefined,
        });
    }, [program]);

    const handleCategoryChange = (field: keyof ExamProductCategory, value: string) => {
        setData(prev => ({ ...prev, category: { ...prev.category, [field]: value } }));
    };

    const handleExamChange = (examType: 'practiceExam' | 'certExam', field: keyof Exam, value: string | number | boolean) => {
        setData(prev => ({
            ...prev,
            [examType]: prev[examType] ? { ...prev[examType], [field]: value } : undefined
        }));
    };

    const handleBookSelectionChange = (bookId: string) => {
        setData(prev => {
            if (!prev.certExam) return prev;
            const currentBookIds = prev.certExam.recommendedBookIds || [];
            const newBookIds = currentBookIds.includes(bookId)
                ? currentBookIds.filter(id => id !== bookId)
                : [...currentBookIds, bookId];
            return {
                ...prev,
                certExam: {
                    ...prev.certExam,
                    recommendedBookIds: newBookIds,
                }
            };
        });
    };
    
    const { category, practiceExam, certExam } = data;
    
    const initialLinkedProductInfo = useMemo(() => {
        if (!program.certExam?.productSku || !examPrices) return null;
        const productInfo = examPrices[program.certExam.productSku];
        if (productInfo) {
            return { sku: program.certExam.productSku, name: productInfo.name };
        }
        return { sku: program.certExam.productSku, name: 'Linked Product (Name not found)' };
    }, [program.certExam, examPrices]);


    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-b-lg space-y-4">
            <div>
                <label className="text-xs font-bold">Program Name</label>
                <input type="text" value={category.name || ''} onChange={e => handleCategoryChange('name', e.target.value)} className="w-full p-2 border rounded bg-white" />
            </div>
            <div>
                <label className="text-xs font-bold">Program Description</label>
                <textarea value={category.description || ''} onChange={e => handleCategoryChange('description', e.target.value)} className="w-full p-2 border rounded bg-white" rows={3} />
            </div>
             <div>
                <label className="text-xs font-bold">Question Source URL</label>
                <input type="text" value={practiceExam?.questionSourceUrl || ''} onChange={e => handleExamChange('practiceExam', 'questionSourceUrl', e.target.value)} className="w-full p-2 border rounded bg-white" />
            </div>
            
            {practiceExam && (
                <div className="p-4 border rounded-lg bg-white/50 space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><FileText size={16} /> Practice Exam</h4>
                    <div>
                        <label className="text-xs font-bold">Name Override</label>
                        <input type="text" value={practiceExam.name || ''} onChange={e => handleExamChange('practiceExam', 'name', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold">No. of Questions</label>
                            <input type="number" value={practiceExam.numberOfQuestions || ''} onChange={e => handleExamChange('practiceExam', 'numberOfQuestions', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                         <div>
                            <label className="text-xs font-bold">Duration (Mins)</label>
                            <input type="number" value={practiceExam.durationMinutes || ''} onChange={e => handleExamChange('practiceExam', 'durationMinutes', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={practiceExam.certificateEnabled || false}
                                onChange={e => handleExamChange('practiceExam', 'certificateEnabled', e.target.checked)}
                            />
                            Enable Certificate
                        </label>
                    </div>
                </div>
            )}

            {certExam && (
                <div className="p-4 border rounded-lg bg-white/50 space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><Award size={16} /> Certification Exam</h4>
                     <div>
                        <label className="text-xs font-bold">Name Override</label>
                        <input type="text" value={certExam.name || ''} onChange={e => handleExamChange('certExam', 'name', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Linked Product</label>
                        <select value={certExam.productSku || ''} onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} className="w-full p-2 border rounded bg-white">
                            <option value="">-- No Product Linked --</option>
                            {initialLinkedProductInfo && (
                                <option value={initialLinkedProductInfo.sku}>
                                    {initialLinkedProductInfo.name} ({initialLinkedProductInfo.sku})
                                </option>
                            )}
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold">Certificate Template</label>
                        <select
                            value={certExam.certificateTemplateId || ''}
                            onChange={e => handleExamChange('certExam', 'certificateTemplateId', e.target.value)}
                            className="w-full p-2 border rounded bg-white"
                        >
                            <option value="">-- Use Default Template --</option>
                            {activeOrg?.certificateTemplates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                    </div>
                     <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs font-bold">Questions</label>
                            <input type="number" value={certExam.numberOfQuestions || ''} onChange={e => handleExamChange('certExam', 'numberOfQuestions', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                         <div>
                            <label className="text-xs font-bold">Duration (Mins)</label>
                            <input type="number" value={certExam.durationMinutes || ''} onChange={e => handleExamChange('certExam', 'durationMinutes', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold">Pass Score (%)</label>
                            <input type="number" value={certExam.passScore || ''} onChange={e => handleExamChange('certExam', 'passScore', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                    </div>
                     <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={certExam.isProctored || false} onChange={e => handleExamChange('certExam', 'isProctored', e.target.checked)} /> Enable Proctoring</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={certExam.certificateEnabled || false} onChange={e => handleExamChange('certExam', 'certificateEnabled', e.target.checked)} /> Enable Certificate</label>
                    </div>
                    <div>
                        <label className="text-xs font-bold">Recommended Books</label>
                        <div className="max-h-40 overflow-y-auto border rounded-lg bg-white p-2 mt-1 space-y-1">
                            {suggestedBooks.map(book => (
                                <label key={book.id} className="flex items-center gap-2 p-1 rounded hover:bg-slate-100 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={certExam?.recommendedBookIds?.includes(book.id) || false}
                                        onChange={() => handleBookSelectionChange(book.id)}
                                    />
                                    <span>{book.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(var(--color-border-rgb))]">
                <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 bg-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-300"><X size={16} /> Cancel</button>
                <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-600 disabled:bg-slate-400">
                    {isSaving ? <Spinner /> : <Save size={16} />} Save Changes
                </button>
            </div>
        </div>
    );
};

const CreateProgramModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, productLinkData: any) => Promise<void>;
    isSaving: boolean;
    examPrices: { [key: string]: any } | null;
    linkedSkus: string[];
}> = ({ isOpen, onClose, onSave, isSaving, examPrices, linkedSkus }) => {
    const [name, setName] = useState('');
    const [linkType, setLinkType] = useState('auto'); // 'auto', 'existing', 'new'
    const [existingSku, setExistingSku] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductSku, setNewProductSku] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('49.99');
    const [newProductRegularPrice, setNewProductRegularPrice] = useState('49.99');
    
    useEffect(() => {
        if(isOpen) {
            setName('');
            setLinkType('auto');
            setExistingSku('');
            setNewProductName('');
            setNewProductSku('');
        }
    }, [isOpen]);
    
    const unlinkedProducts = useMemo(() => {
        if (!examPrices) return [];
        return Object.values(examPrices).filter((p: any) => p.type === 'simple' && !p.isBundle && !linkedSkus.includes(p.sku));
    }, [examPrices, linkedSkus]);

    const handleSave = () => {
        if (!name) { toast.error("Program Name is required."); return; }
        
        let productLinkData: any = { type: linkType };
        if (linkType === 'existing') {
            if (!existingSku) { toast.error("Please select an existing product to link."); return; }
            productLinkData.sku = existingSku;
        } else if (linkType === 'new') {
            if (!newProductName || !newProductSku || !newProductPrice) { toast.error("New product name, SKU, and price are required."); return; }
            productLinkData.name = newProductName;
            productLinkData.sku = newProductSku;
            productLinkData.price = parseFloat(newProductPrice);
            productLinkData.regularPrice = parseFloat(newProductRegularPrice) || parseFloat(newProductPrice);
        }
        
        onSave(name, productLinkData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-lg p-6">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Create New Exam Program</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Program Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Certified Professional Coder (CPC)" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Linked WooCommerce Product</label>
                        <select value={linkType} onChange={e => setLinkType(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                            <option value="auto">Auto-create new product</option>
                            <option value="existing">Link to existing product</option>
                            <option value="new">Create new product with custom details</option>
                        </select>
                    </div>
                    {linkType === 'existing' && (
                        <select value={existingSku} onChange={e => setExistingSku(e.target.value)} className="w-full p-2 border rounded bg-white">
                            <option value="">-- Select a product --</option>
                            {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                        </select>
                    )}
                    {linkType === 'new' && (
                        <div className="p-4 border rounded-lg bg-[rgb(var(--color-muted-rgb))] space-y-2">
                            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="New Product Name" className="w-full p-2 border rounded" />
                            <input type="text" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} placeholder="New Product SKU" className="w-full p-2 border rounded" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Sale Price" className="w-full p-2 border rounded" />
                                <input type="number" value={newProductRegularPrice} onChange={e => setNewProductRegularPrice(e.target.value)} placeholder="Regular Price" className="w-full p-2 border rounded" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                        {isSaving ? <Spinner /> : <PlusCircle size={16} />} Create Program
                    </button>
                </div>
            </div>
        </div>
    );
};


const ExamProgramCustomizer: FC = () => {
    const { activeOrg, examPrices, suggestedBooks, updateConfigData } = useAppContext();
    const { token } = useAuth();
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const location = useLocation();

    const allPrograms = useMemo(() => {
        if (!activeOrg || !activeOrg.examProductCategories) return [];
        return activeOrg.examProductCategories.map(cat => ({
            category: cat,
            practiceExam: activeOrg.exams.find(e => e.id === cat.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === cat.certificationExamId),
        }));
    }, [activeOrg]);
    
    const unlinkedProducts = useMemo(() => {
        if (!examPrices || !activeOrg) return [];
        const linkedSkus = activeOrg.exams.map(e => e.productSku);
        return Object.values(examPrices).filter((p: any) => p.type === 'simple' && !p.isBundle && !linkedSkus.includes(p.sku));
    }, [examPrices, activeOrg]);

    useEffect(() => {
        const hash = location.hash.substring(1);
        if (hash && allPrograms.some(p => p.category.id === hash)) {
            setEditingProgramId(hash);
            const element = document.getElementById(hash);
            if (element) {
                setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
        }
    }, [allPrograms, location.hash]);


    const handleSave = async (programId: string, data: EditableProgramData) => {
        if (!token) { toast.error("Authentication Error"); return; }
        setIsSaving(true);
        try {
            const updateData: any = {};
            if (data.category?.name) updateData.name = data.category.name;
            if (data.category?.description) updateData.description = data.category.description;
            if (data.practiceExam?.questionSourceUrl) updateData.questionSourceUrl = data.practiceExam.questionSourceUrl;

            if(data.practiceExam) {
                if (data.practiceExam.name) updateData.practice_name = data.practiceExam.name;
                updateData.practice_numberOfQuestions = data.practiceExam.numberOfQuestions;
                updateData.practice_durationMinutes = data.practiceExam.durationMinutes;
            }
            if(data.certExam) {
                if (data.certExam.name) updateData.cert_name = data.certExam.name;
                updateData.cert_productSku = data.certExam.productSku;
                updateData.cert_certificateTemplateId = data.certExam.certificateTemplateId;
                updateData.cert_numberOfQuestions = data.certExam.numberOfQuestions;
                updateData.cert_durationMinutes = data.certExam.durationMinutes;
                updateData.cert_passScore = data.certExam.passScore;
                updateData.cert_isProctored = data.certExam.isProctored;
                updateData.cert_certificateEnabled = data.certExam.certificateEnabled;
                updateData.cert_recommendedBookIds = data.certExam.recommendedBookIds;
            }
            
            await googleSheetsService.adminUpdateExamProgram(token, programId, updateData);
            toast.success("Program saved successfully! Refreshing data...", { duration: 4000 });
            setEditingProgramId(null);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save program.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkSave = async (updateData: any) => {
        if (!token) { toast.error("Authentication Error"); return; }
        if (selectedProgramIds.length === 0) return;

        setIsBulkSaving(true);
        const toastId = toast.loading(`Updating ${selectedProgramIds.length} programs...`);
        
        try {
            for (const programId of selectedProgramIds) {
                await googleSheetsService.adminUpdateExamProgram(token, programId, updateData);
            }
            toast.success(`${selectedProgramIds.length} programs updated! Refreshing data...`, { id: toastId, duration: 4000 });
            setSelectedProgramIds([]);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            toast.error(error.message || "Bulk update failed.", { id: toastId });
        } finally {
            setIsBulkSaving(false);
        }
    };
    
    const handleCreate = async (name: string, productLinkData: any) => {
        if (!token) { toast.error("Authentication Error"); return; }
        setIsSaving(true);
        try {
            await googleSheetsService.adminCreateExamProgram(token, name, productLinkData);
            toast.success(`Program "${name}" created! Refreshing data...`, { duration: 4000 });
            setIsCreating(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            toast.error(error.message || "Failed to create program.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (program: any) => {
         if (!token) { toast.error("Authentication Error"); return; }
        if (!window.confirm(`Are you sure you want to delete "${program.category.name}"? This will move the program to trash.`)) return;

        setIsSaving(true);
        try {
            const rawPostId = program.category.id.replace('prod-', '');
            await googleSheetsService.adminDeletePost(token, rawPostId, 'mco_exam_program');
            toast.success(`Program "${program.category.name}" moved to trash. Refreshing data...`, { duration: 4000 });
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete program.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const toggleSelect = (id: string) => {
        setSelectedProgramIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProgramIds(allPrograms.map(p => p.category.id));
        } else {
            setSelectedProgramIds([]);
        }
    };

    return (
        <div className="space-y-8">
            <CreateProgramModal 
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                onSave={handleCreate}
                isSaving={isSaving}
                examPrices={examPrices}
                linkedSkus={activeOrg?.exams.map(e => e.productSku) || []}
            />

            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><Settings /> Exam Program Customizer</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">Manage your exam programs, link products, and adjust settings. Changes are saved live to your WordPress database.</p>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex justify-end mb-4">
                     <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600">
                        <PlusCircle size={16}/> Create New Program
                    </button>
                </div>
                
                {selectedProgramIds.length > 0 && (
                    <BulkEditPanel
                        selectedCount={selectedProgramIds.length}
                        onSave={handleBulkSave}
                        onCancel={() => setSelectedProgramIds([])}
                        isSaving={isBulkSaving}
                    />
                )}

                <div className="flex items-center p-2 mb-4 border-b border-[rgb(var(--color-border-rgb))]">
                    <label className="flex items-center gap-4 cursor-pointer">
                        <input type="checkbox" onChange={handleSelectAll} checked={allPrograms.length > 0 && selectedProgramIds.length === allPrograms.length} className="h-4 w-4 rounded text-[rgb(var(--color-primary-rgb))] focus:ring-[rgb(var(--color-primary-rgb))]"/>
                        <span className="font-semibold text-sm">Select All ({selectedProgramIds.length} / {allPrograms.length})</span>
                    </label>
                </div>

                <div className="space-y-4">
                    {allPrograms.map(program => (
                        <div key={program.category.id} id={program.category.id} className="editable-card">
                            <div className="editable-card__header">
                                <div className="flex items-center gap-3 flex-grow">
                                    <input type="checkbox" checked={selectedProgramIds.includes(program.category.id)} onChange={() => toggleSelect(program.category.id)} className="h-4 w-4 rounded text-[rgb(var(--color-primary-rgb))] focus:ring-[rgb(var(--color-primary-rgb))]"/>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-base text-[rgb(var(--color-text-strong-rgb))] leading-tight">{program.category.name}</h3>
                                        <div className="text-xs text-[rgb(var(--color-text-muted-rgb))] flex items-center gap-2">
                                            {program.certExam?.productSku && <Link2 size={12} />}
                                            <span>{program.certExam?.productSku || 'No product linked'}</span>
                                        </div>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => setEditingProgramId(editingProgramId === program.category.id ? null : program.category.id)} className="p-2 rounded-full hover:bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]">
                                        {editingProgramId === program.category.id ? <ChevronUp size={16} /> : <Edit size={16} />}
                                    </button>
                                     <button onClick={() => handleDelete(program)} className="p-2 rounded-full text-red-500 hover:bg-red-100" title="Delete Program">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            {editingProgramId === program.category.id && (
                                <ExamEditor
                                    program={program}
                                    onSave={handleSave}
                                    onCancel={() => setEditingProgramId(null)}
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