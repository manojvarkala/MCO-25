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
    name?: string;
    description?: string;
    questionSourceUrl?: string;
    practice_name?: string;
    practice_numberOfQuestions?: number;
    practice_durationMinutes?: number;
    practice_certificateEnabled?: boolean;
    cert_name?: string;
    cert_productSku?: string;
    cert_certificateTemplateId?: string;
    cert_numberOfQuestions?: number;
    cert_durationMinutes?: number;
    cert_passScore?: number;
    cert_isProctored?: boolean;
    cert_certificateEnabled?: boolean;
    cert_recommendedBookIds?: string[];
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
    const [data, setData] = useState<EditableProgramData>({});
    
    useEffect(() => {
        const flattenedData: EditableProgramData = {
            name: program.category.name,
            description: program.category.description,
            questionSourceUrl: program.category.questionSourceUrl,
            practice_name: program.practiceExam?.name,
            practice_numberOfQuestions: program.practiceExam?.numberOfQuestions,
            practice_durationMinutes: program.practiceExam?.durationMinutes,
            practice_certificateEnabled: program.practiceExam?.certificateEnabled,
            cert_name: program.certExam?.name,
            cert_productSku: program.certExam?.productSku,
            cert_certificateTemplateId: program.certExam?.certificateTemplateId,
            cert_numberOfQuestions: program.certExam?.numberOfQuestions,
            cert_durationMinutes: program.certExam?.durationMinutes,
            cert_passScore: program.certExam?.passScore,
            cert_isProctored: program.certExam?.isProctored,
            cert_certificateEnabled: program.certExam?.certificateEnabled,
            cert_recommendedBookIds: program.certExam?.recommendedBookIds,
        };
        setData(flattenedData);
    }, [program]);

    const handleChange = (field: keyof EditableProgramData, value: string | number | boolean) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleBookSelectionChange = (bookId: string) => {
        setData(prev => {
            const currentBookIds = prev.cert_recommendedBookIds || [];
            const newBookIds = currentBookIds.includes(bookId)
                ? currentBookIds.filter(id => id !== bookId)
                : [...currentBookIds, bookId];
            return { ...prev, cert_recommendedBookIds: newBookIds };
        });
    };
    
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
                <input type="text" value={data.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full p-2 border rounded bg-white" />
            </div>
            <div>
                <label className="text-xs font-bold">Program Description</label>
                <textarea value={data.description || ''} onChange={e => handleChange('description', e.target.value)} className="w-full p-2 border rounded bg-white" rows={3} />
            </div>
             <div>
                <label className="text-xs font-bold">Question Source URL</label>
                <input type="text" value={data.questionSourceUrl || ''} onChange={e => handleChange('questionSourceUrl', e.target.value)} className="w-full p-2 border rounded bg-white" />
            </div>
            
            {program.practiceExam && (
                <div className="p-4 border rounded-lg bg-white/50 space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><FileText size={16} /> Practice Exam</h4>
                    <div>
                        <label className="text-xs font-bold">Name Override</label>
                        <input type="text" value={data.practice_name || ''} onChange={e => handleChange('practice_name', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold">No. of Questions</label>
                            <input type="number" value={data.practice_numberOfQuestions || ''} onChange={e => handleChange('practice_numberOfQuestions', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                         <div>
                            <label className="text-xs font-bold">Duration (Mins)</label>
                            <input type="number" value={data.practice_durationMinutes || ''} onChange={e => handleChange('practice_durationMinutes', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={data.practice_certificateEnabled || false}
                                onChange={e => handleChange('practice_certificateEnabled', e.target.checked)}
                            />
                            Enable Certificate
                        </label>
                    </div>
                </div>
            )}

            {program.certExam && (
                <div className="p-4 border rounded-lg bg-white/50 space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><Award size={16} /> Certification Exam</h4>
                     <div>
                        <label className="text-xs font-bold">Name Override</label>
                        <input type="text" value={data.cert_name || ''} onChange={e => handleChange('cert_name', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Linked Product</label>
                        <select value={data.cert_productSku || ''} onChange={e => handleChange('cert_productSku', e.target.value)} className="w-full p-2 border rounded bg-white">
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
                            value={data.cert_certificateTemplateId || ''}
                            onChange={e => handleChange('cert_certificateTemplateId', e.target.value)}
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
                            <input type="number" value={data.cert_numberOfQuestions || ''} onChange={e => handleChange('cert_numberOfQuestions', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                         <div>
                            <label className="text-xs font-bold">Duration (Mins)</label>
                            <input type="number" value={data.cert_durationMinutes || ''} onChange={e => handleChange('cert_durationMinutes', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold">Pass Score (%)</label>
                            <input type="number" value={data.cert_passScore || ''} onChange={e => handleChange('cert_passScore', parseInt(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                    </div>
                     <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={data.cert_isProctored || false} onChange={e => handleChange('cert_isProctored', e.target.checked)} /> Enable Proctoring</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={data.cert_certificateEnabled || false} onChange={e => handleChange('cert_certificateEnabled', e.target.checked)} /> Enable Certificate</label>
                    </div>
                     <div>
                        <label className="text-xs font-bold">Recommended Study Materials</label>
                        <div className="grid grid-cols-2 gap-2 mt-1 max-h-40 overflow-y-auto p-2 bg-slate-50 border rounded">
                            {(suggestedBooks || []).map(book => (
                                <label key={book.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={(data.cert_recommendedBookIds || []).includes(book.id)}
                                        onChange={() => handleBookSelectionChange(book.id)}
                                    />
                                    <span className="truncate" title={book.title}>{book.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex justify-end gap-3 mt-4">
                <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-300">Cancel</button>
                <button onClick={() => onSave(program.category.id, data)} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-600 disabled:bg-slate-400">
                    {isSaving ? <Spinner /> : <Save size={16} />} Save Changes
                </button>
            </div>
        </div>
    );
};

const ExamProgramCustomizer: FC = () => {
    const { activeOrg, examPrices, suggestedBooks, updateConfigData } = useAppContext();
    const { token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProgramName, setNewProgramName] = useState('');
    const [newProgramProductLink, setNewProgramProductLink] = useState('auto');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
    const [stats, setStats] = useState<ExamStat[] | null>(null);
    
    useEffect(() => {
        if (location.hash) {
            setExpandedProgramId(location.hash.substring(1));
        }
    }, [location.hash]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            try {
                const fetchedStats = await googleSheetsService.getExamStats(token);
                setStats(fetchedStats);
            } catch (error) {
                console.error("Could not load exam stats", error);
            }
        };
        fetchStats();
    }, [token]);

    const programData = useMemo(() => {
        if (!activeOrg) return [];
        const data = (activeOrg.examProductCategories || []).map(cat => {
            if (!cat) return null;
            const practiceExam = activeOrg.exams.find(e => e && e.id === cat.practiceExamId);
            const certExam = activeOrg.exams.find(e => e && e.id === cat.certificationExamId);
            const stat = stats?.find(s => s.id === certExam?.id);
            return { category: cat, practiceExam, certExam, stat };
        }).filter(Boolean);
        data.sort((a,b) => (a!.category.name || '').localeCompare(b!.category.name || ''));
        return data as { category: ExamProductCategory; practiceExam?: Exam; certExam?: Exam; stat?: ExamStat }[];
    }, [activeOrg, stats]);
    
    const unlinkedProducts = useMemo(() => {
        if (!examPrices || !activeOrg) return [];
        const linkedSkus = new Set(activeOrg.exams.map(e => e.productSku).filter(Boolean));
        return Object.entries(examPrices)
            .filter(([sku, data]: [string, any]) => !sku.startsWith('sub-') && !data.isBundle && !linkedSkus.has(sku))
            .map(([sku, data]: [string, any]) => ({ sku, name: data.name }));
    }, [examPrices, activeOrg]);

    const handleSave = async (programId: string, data: EditableProgramData) => {
        if (!token) { toast.error("Authentication Error"); return; }
        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminUpdateExamProgram(token, programId, data);
            updateConfigData(result.organizations, result.examPrices);
            toast.success("Program updated successfully!");
            setExpandedProgramId(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update program.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCreate = async () => {
        if (!token || !newProgramName) {
            toast.error("Program Name is required.");
            return;
        }
        setIsCreating(true);
        try {
            const result = await googleSheetsService.adminCreateExamProgram(token, newProgramName, { type: newProgramProductLink === 'auto' ? 'auto' : 'existing', sku: newProgramProductLink });
            updateConfigData(result.organizations, result.examPrices);
            toast.success(`Program "${newProgramName}" created!`);
            setIsCreateModalOpen(false);
            setNewProgramName('');
            setNewProgramProductLink('auto');
        } catch(error: any) {
            toast.error(error.message || 'Failed to create program.');
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleDelete = async (programId: string, programName: string) => {
        if (!token) { toast.error("Authentication Error"); return; }
        if (!window.confirm(`Are you sure you want to delete the "${programName}" program? This action will also move the associated exams to the trash and cannot be undone.`)) {
            return;
        }
        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminDeletePost(token, programId.replace('prod-', ''), 'mco_exam_program');
            updateConfigData(result.organizations, result.examPrices);
            toast.success(`Program "${programName}" deleted.`);
        } catch(error: any) {
            toast.error(error.message || 'Failed to delete program.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkSave = async (updateData: any) => {
        if (!token || selectedProgramIds.length === 0) return;
        setIsBulkSaving(true);
        const toastId = toast.loading(`Updating ${selectedProgramIds.length} programs...`);
        let lastResult: { organizations: Organization[], examPrices: any } | null = null;
        try {
            for (const programId of selectedProgramIds) {
                lastResult = await googleSheetsService.adminUpdateExamProgram(token, programId, updateData);
            }
            if (lastResult) {
                updateConfigData(lastResult.organizations, lastResult.examPrices);
            }
            toast.success(`${selectedProgramIds.length} programs updated successfully!`, { id: toastId });
            setSelectedProgramIds([]);
        } catch (error: any) {
            toast.error(error.message || "An error occurred during bulk update.", { id: toastId });
        } finally {
            setIsBulkSaving(false);
        }
    };

    const toggleProgram = (programId: string) => {
        const newId = expandedProgramId === programId ? null : programId;
        setExpandedProgramId(newId);
        if (newId) {
            navigate(`#${newId}`);
        } else {
            navigate(location.pathname, { replace: true });
        }
    };
    
     const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProgramIds(programData.map(p => p.category.id));
        } else {
            setSelectedProgramIds([]);
        }
    }, [programData]);

    const handleSelectOne = useCallback((programId: string, isSelected: boolean) => {
        setSelectedProgramIds(currentIds => {
            const newIds = new Set(currentIds);
            if (isSelected) {
                newIds.add(programId);
            } else {
                newIds.delete(programId);
            }
            return Array.from(newIds);
        });
    }, []);

    const isAllSelected = programData.length > 0 && selectedProgramIds.length === programData.length;

    return (
        <div className="space-y-8">
             {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Create New Exam Program</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Program Name</label>
                                <input type="text" value={newProgramName} onChange={e => setNewProgramName(e.target.value)} placeholder="e.g. CPC Certification Program" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                            </div>
                             <div>
                                <label className="text-sm font-medium">Link to Product (Optional)</label>
                                <select value={newProgramProductLink} onChange={e => setNewProgramProductLink(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                                    <option value="auto">Create a new product automatically</option>
                                    {unlinkedProducts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsCreateModalOpen(false)} disabled={isCreating} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                            <button onClick={handleCreate} disabled={isCreating} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                                {isCreating ? <Spinner /> : <PlusCircle size={16} />} Create Program
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
                    <h2 className="text-xl font-bold">All Programs ({programData.length})</h2>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition">
                        <PlusCircle size={18}/> Create New Program
                    </button>
                </div>

                <div className="border-t border-[rgb(var(--color-border-rgb))] pt-2">
                     {programData.length > 0 && (
                        <div className="flex items-center px-4 py-2">
                            <label className="flex items-center gap-4 cursor-pointer">
                                <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} className="h-4 w-4 rounded text-[rgb(var(--color-primary-rgb))] focus:ring-[rgb(var(--color-primary-rgb))]"/>
                                <span className="font-semibold text-sm">Select All</span>
                            </label>
                        </div>
                     )}
                    <div className="space-y-2">
                        {programData.map(p => (
                            <div key={p.category.id} id={p.category.id} className="bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                                <div className="flex items-center p-4">
                                     <input
                                        type="checkbox"
                                        checked={selectedProgramIds.includes(p.category.id)}
                                        onChange={e => handleSelectOne(p.category.id, e.target.checked)}
                                        className="h-4 w-4 mr-4 rounded text-[rgb(var(--color-primary-rgb))] focus:ring-[rgb(var(--color-primary-rgb))]"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <div className="flex-grow">
                                        <p className="font-bold text-[rgb(var(--color-text-strong-rgb))]">{p.category.name}</p>
                                        <p className="text-xs text-[rgb(var(--color-text-muted-rgb))] font-mono">ID: {p.category.id}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-muted-rgb))]">
                                        {p.certExam?.productSku && <span className="flex items-center gap-1.5 bg-[rgb(var(--color-card-rgb))] px-2 py-1 rounded-md text-xs"><ShoppingCart size={12}/> {p.certExam.productSku}</span>}
                                        {p.stat && <span className="flex items-center gap-1.5 bg-[rgb(var(--color-card-rgb))] px-2 py-1 rounded-md text-xs"><BarChart3 size={12}/> {p.stat.totalSales} sales</span>}
                                    </div>
                                    <div className="flex items-center gap-1 ml-4">
                                         <button onClick={() => handleDelete(p.category.id, p.category.name || 'this program')} className="p-2 rounded-full text-red-500 hover:bg-red-100"><Trash2 size={16}/></button>
                                         <button onClick={() => toggleProgram(p.category.id)} className="flex items-center gap-2 px-3 py-2 bg-[rgb(var(--color-card-rgb))] rounded-md text-sm font-semibold hover:bg-[rgb(var(--color-border-rgb))]">
                                            <Edit size={16}/> Edit {expandedProgramId === p.category.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                        </button>
                                    </div>
                                </div>
                                {expandedProgramId === p.category.id && (
                                    <ExamEditor 
                                        program={p} 
                                        onSave={handleSave} 
                                        onCancel={() => toggleProgram(p.category.id)} 
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
        </div>
    );
};

export default ExamProgramCustomizer;