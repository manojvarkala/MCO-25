import React, { FC, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
// FIX: Corrected react-router-dom import to resolve module export errors.
import { useLocation, useNavigate } from 'react-router-dom';
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
        return Object.values(examPrices)
            .filter((p: any) => p.type === 'simple' && !linkedSkus.includes(p.sku))
            .sort((a: { name: string }, b: { name: string }) => (a.name || '').localeCompare(b.name || ''));
    }, [examPrices, linkedSkus]);

    const handleSave = () => {
        if (!name) { toast.error("Program Name is required."); return; }
        let productLinkData: any = { type: linkType };
        if (linkType === 'existing') {
            if (!existingSku) { toast.error("Please select an existing product to link."); return; }
            productLinkData.sku = existingSku;
        } else if (linkType === 'new') {
            if (!newProductName || !newProductSku) { toast.error("New Product Name and SKU are required."); return; }
            productLinkData.name = newProductName;
            productLinkData.sku = newProductSku;
            productLinkData.price = newProductPrice;
            productLinkData.regularPrice = newProductRegularPrice;
        }
        onSave(name, productLinkData);
    };

    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-lg p-6">
                 <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Create New Exam Program</h2>
                 <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Program Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Certification Program" className="w-full p-2 mt-1 border rounded bg-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">WooCommerce Product</label>
                        <div className="mt-1 space-y-2 rounded-md bg-[rgb(var(--color-muted-rgb))] p-3 border border-[rgb(var(--color-border-rgb))]">
                            <label className="flex items-center gap-2"><input type="radio" name="linkType" value="auto" checked={linkType==='auto'} onChange={e=>setLinkType(e.target.value)} /> Automatically create & link new product</label>
                            <label className="flex items-center gap-2"><input type="radio" name="linkType" value="existing" checked={linkType==='existing'} onChange={e=>setLinkType(e.target.value)} /> Link to existing product</label>
                            <label className="flex items-center gap-2"><input type="radio" name="linkType" value="new" checked={linkType==='new'} onChange={e=>setLinkType(e.target.value)} /> Create new product</label>
                        </div>
                    </div>
                    {linkType === 'existing' && (
                        <div>
                            <label className="text-sm font-medium block mt-2">Select an Unlinked Product</label>
                            <select value={existingSku} onChange={e => setExistingSku(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                                <option value="">-- Select a product --</option>
                                {unlinkedProducts.map((p: any) => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                    )}
                    {linkType === 'new' && (
                        <div className="space-y-2 p-3 border border-dashed rounded-md">
                            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="New Product Name" className="w-full p-2 border rounded bg-white"/>
                            <input type="text" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} placeholder="New Product SKU" className="w-full p-2 border rounded bg-white"/>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Sale Price" className="w-full p-2 border rounded bg-white"/>
                                <input type="number" value={newProductRegularPrice} onChange={e => setNewProductRegularPrice(e.target.value)} placeholder="Regular Price" className="w-full p-2 border rounded bg-white"/>
                            </div>
                        </div>
                    )}
                 </div>
                 <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving || !name} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                        {isSaving ? <Spinner /> : <Save size={16} />} Create Program
                    </button>
                </div>
            </div>
        </div>
    );
};


const ExamProgramCustomizer: FC = () => {
    const { activeOrg, updateConfigData, examPrices, suggestedBooks } = useAppContext();
    const { token } = useAuth();
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const location = useLocation();
    
    const programs = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(category => ({
            category,
            practiceExam: activeOrg.exams.find(e => e.id === category.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === category.certificationExamId),
        })).sort((a,b) => a.category.name.localeCompare(b.category.name));
    }, [activeOrg]);

    useEffect(() => {
        const hash = location.hash;
        if (hash) {
            const programId = hash.substring(1);
            const programExists = programs.some(p => p.category.id === programId);
            if (programExists) {
                setEditingProgramId(programId);
                setExpandedProgramId(programId);
                setTimeout(() => {
                    const element = document.getElementById(`program-card-${programId}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
        }
    }, [location.hash, programs]);

    const handleSave = async (programId: string, data: EditableProgramData): Promise<void> => {
        if (!token) {
            toast.error("Authentication session has expired.");
            return;
        }
        
        const payload: any = {};
        if (data.category?.name) payload.programName = data.category.name;
        if (data.category?.description) payload.programDescription = data.category.description;
        
        if (data.practiceExam?.name) payload.practice_name_override = data.practiceExam.name;
        if (data.practiceExam?.questionSourceUrl) payload.questionSourceUrl = data.practiceExam.questionSourceUrl;
        if (data.practiceExam?.numberOfQuestions) payload.practice_numberOfQuestions = data.practiceExam.numberOfQuestions;
        if (data.practiceExam?.durationMinutes) payload.practice_durationMinutes = data.practiceExam.durationMinutes;
        if (typeof data.practiceExam?.certificateEnabled === 'boolean') payload.practice_certificateEnabled = data.practiceExam.certificateEnabled;

        if (data.certExam?.name) payload.cert_name_override = data.certExam.name;
        if (data.certExam?.productSku) payload.cert_productSku = data.certExam.productSku;
        if (typeof data.certExam?.isProctored === 'boolean') payload.cert_isProctored = data.certExam.isProctored;
        if (typeof data.certExam?.certificateEnabled === 'boolean') payload.cert_certificateEnabled = data.certExam.certificateEnabled;
        if (data.certExam?.passScore) payload.cert_passScore = data.certExam.passScore;
        if (data.certExam?.numberOfQuestions) payload.cert_numberOfQuestions = data.certExam.numberOfQuestions;
        if (data.certExam?.durationMinutes) payload.cert_durationMinutes = data.certExam.durationMinutes;
        if (data.certExam && typeof data.certExam.certificateTemplateId !== 'undefined') {
            payload.cert_template_id = data.certExam.certificateTemplateId;
        }
        if (data.certExam && typeof data.certExam.recommendedBookIds !== 'undefined') {
            payload.recommended_book_ids = data.certExam.recommendedBookIds;
        }
        
        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminUpdateExamProgram(token, programId, payload);
            if (result.organizations && result.examPrices) {
                updateConfigData(result.organizations, result.examPrices);
            }
            toast.success("Exam program updated successfully!");
            setEditingProgramId(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkSave = async (updateData: any): Promise<void> => {
        if (!token || !activeOrg) {
            toast.error("Authentication error.");
            return;
        }
        if (selectedProgramIds.length === 0) return;

        setIsSaving(true);
        const toastId = toast.loading(`Updating ${selectedProgramIds.length} programs...`);

        try {
            let lastResult: { organizations: Organization[]; examPrices: any; } | null = null;
            for (const programId of selectedProgramIds) {
                lastResult = await googleSheetsService.adminUpdateExamProgram(token, programId, updateData);
            }
        
            if (lastResult && lastResult.organizations && lastResult.examPrices) {
                updateConfigData(lastResult.organizations, lastResult.examPrices);
            }
            toast.success(`${selectedProgramIds.length} programs updated!`, { id: toastId });
            setSelectedProgramIds([]);
        } catch (error: any) {
            toast.error(error.message || "An error occurred during bulk update.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateProgram = async (name: string, productLinkData: any): Promise<void> => {
        if (!token || !activeOrg) {
            toast.error("Authentication error.");
            return;
        }
        
        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminCreateExamProgram(token, name, productLinkData);
            if (result.organizations && result.examPrices) {
                updateConfigData(result.organizations, result.examPrices);
            }
            toast.success(`Program "${name}" created successfully!`);
            setIsCreateModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to create program.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProgram = async (program: any): Promise<void> => {
        if (!token) {
            toast.error("Authentication error.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete "${program.category.name}"? This will move it to the trash.`)) {
            return;
        }

        setIsSaving(true);
        const postId = program.category.id.replace('prod-', '');
        try {
            const result = await googleSheetsService.adminDeletePost(token, postId, 'mco_exam_program');
            if (result.organizations && result.examPrices) {
                updateConfigData(result.organizations, result.examPrices);
            }
            toast.success(`Program "${program.category.name}" moved to trash.`);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete program.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedProgramIds(e.target.checked ? programs.map(p => p.category.id) : []);
    };
    
    const handleSelectOne = (id: string, checked: boolean) => {
        setSelectedProgramIds(prev => checked ? [...prev, id] : prev.filter(pId => pId !== id));
    };

    const linkedSkus = useMemo(() => programs.map(p => p.certExam?.productSku).filter(Boolean) as string[], [programs]);
    
    const unlinkedProducts = useMemo(() => {
        if (!examPrices) return [];
        return Object.values(examPrices)
            .filter((p: any) => p.type === 'simple' && !linkedSkus.includes(p.sku))
            .sort((a: { name: string }, b: { name: string }) => (a.name || '').localeCompare(b.name || ''));
    }, [examPrices, linkedSkus]);

    if (!activeOrg) return <Spinner />;
    
    const isAllSelected = selectedProgramIds.length === programs.length && programs.length > 0;

    return (
        <div className="space-y-8">
            <CreateProgramModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreateProgram}
                isSaving={isSaving}
                examPrices={examPrices}
                linkedSkus={linkedSkus}
            />
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><Settings /> Exam Program Customizer</h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mt-2">Manage your exam programs. Changes made here will be reflected across the app.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition">
                    <PlusCircle size={18}/> Create New Program
                </button>
            </div>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                {selectedProgramIds.length > 0 ? (
                    <BulkEditPanel 
                        selectedCount={selectedProgramIds.length}
                        onSave={handleBulkSave}
                        onCancel={() => setSelectedProgramIds([])}
                        isSaving={isSaving}
                    />
                ) : null}
                <div className="space-y-2">
                     <div className="flex items-center p-4 bg-[rgb(var(--color-card-rgb))] rounded-t-lg border-b border-[rgb(var(--color-border-rgb))]">
                        <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} className="h-4 w-4 mr-4"/>
                        <span className="font-semibold text-sm">Select All Programs</span>
                    </div>
                    {programs.map((program) => (
                        <div key={program.category.id} id={`program-card-${program.category.id}`} className="border border-[rgb(var(--color-border-rgb))] rounded-lg">
                            <div className="flex justify-between items-center p-4 bg-[rgb(var(--color-card-rgb))] rounded-t-lg">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={selectedProgramIds.includes(program.category.id)} onChange={e => handleSelectOne(program.category.id, e.target.checked)} className="h-4 w-4 mr-4"/>
                                    <div 
                                        className="cursor-pointer group"
                                        onClick={() => setEditingProgramId(program.category.id)}
                                    >
                                        <h2 
                                            className="font-bold text-lg text-[rgb(var(--color-text-strong-rgb))] group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors"
                                        >
                                            {program.category.name}
                                        </h2>
                                        {program.certExam?.productSku && (
                                            <p className="text-xs text-[rgb(var(--color-text-muted-rgb))]">
                                                SKU: {program.certExam.productSku}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {editingProgramId !== program.category.id && (
                                        <button onClick={() => setEditingProgramId(program.category.id)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-300">
                                            <Edit size={14} /> Edit
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteProgram(program)} className="p-2 rounded-full text-red-500 hover:bg-red-100" title="Delete Program">
                                        <Trash2 size={16} />
                                    </button>
                                    <button onClick={() => setExpandedProgramId(expandedProgramId === program.category.id ? null : program.category.id)} className="p-2 rounded-full hover:bg-[rgb(var(--color-muted-rgb))]">
                                        {expandedProgramId === program.category.id ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                </div>
                            </div>
                            {expandedProgramId === program.category.id && editingProgramId !== program.category.id && (
                                <div className="p-4 bg-[rgb(var(--color-muted-rgb))] rounded-b-lg text-sm space-y-2">
                                    <p><strong>Description:</strong> {program.category.description}</p>
                                    {program.practiceExam && <p><strong>Practice Exam:</strong> {program.practiceExam.name}</p>}
                                    {program.certExam && (
                                        <p>
                                            <strong>Certification Exam:</strong> {program.certExam.name}
                                            {program.certExam.productSku && (
                                                <span className="ml-2 text-xs bg-slate-200 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                                                    SKU: {program.certExam.productSku}
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
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