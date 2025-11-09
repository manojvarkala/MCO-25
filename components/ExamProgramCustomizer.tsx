import React, { FC, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
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
                <input type="text" value={category?.questionSourceUrl || ''} onChange={e => handleCategoryChange('questionSourceUrl', e.target.value)} className="w-full p-2 border rounded bg-white" />
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
                        <label className="flex items-center gap-2"><input type="checkbox" checked={certExam.certificateEnabled || false} onChange={e => handleExamChange