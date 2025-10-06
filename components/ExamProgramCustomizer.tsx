import React, { FC, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, X, ChevronDown, ChevronUp, FileText, Award, PlusCircle } from 'lucide-react';
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


    const handleSave = () => {
        const updateData: any = {};
        if (isProctored !== 'unchanged') updateData.cert_isProctored = isProctored === 'true';
        if (certificateEnabled !== 'unchanged') updateData.cert_certificateEnabled = certificateEnabled === 'true';
        if (passScore) updateData.cert_passScore = parseInt(passScore, 10);
        if (questionUrl) updateData.questionSourceUrl = questionUrl;

        if (Object.keys(updateData).length === 0) {
            toast.error("No changes to apply.");
            return;
        }
        onSave(updateData);
    };

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg border border-[rgb(var(--color-primary-rgb))] space-y-4 mb-4">
            <h3 className="font-bold text-lg">Bulk Edit {selectedCount} Programs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-sm font-bold">Proctoring</label>
                    <select value={isProctored} onChange={e => setIsProctored(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                        <option value="unchanged">-- Unchanged --</option>
                        <option value="true">Enable</option>
                        <option value="false">Disable</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-bold">Certificate</label>
                    <select value={certificateEnabled} onChange={e => setCertificateEnabled(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                        <option value="unchanged">-- Unchanged --</option>
                        <option value="true">Enable</option>
                        <option value="false">Disable</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-bold">Pass Score (%)</label>
                    <input type="number" value={passScore} onChange={e => setPassScore(e.target.value)} placeholder="-- Unchanged --" className="w-full p-2 mt-1 border rounded bg-white" />
                </div>
            </div>
            <div>
                <label className="text-sm font-bold">Question Source URL</label>
                <textarea value={questionUrl} onChange={e => setQuestionUrl(e.target.value)} placeholder="-- Unchanged --" className="w-full p-2 mt-1 border rounded bg-white" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-300">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-600 disabled:bg-slate-400">
                    {isSaving ? <Spinner /> : <Save size={16} />} Apply Changes
                </button>
            </div>
        </div>
    );
};


const ExamEditor: FC<{
    program: { category: ExamProductCategory; practiceExam?: Exam; certExam?: Exam; };
    onSave: (programId: string, data: EditableProgramData) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}> = ({ program, onSave, onCancel, isSaving }) => {
    
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
    
    const { category, practiceExam, certExam } = data;

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
            
            {practiceExam && (
                <div className="p-4 border rounded-lg bg-white/50 space-y-2">
                    <h4 className="font-bold flex items-center gap-2"><FileText size={16} /> Practice Exam</h4>
                    <div>
                        <label className="text-xs font-bold">Name</label>
                        <input type="text" value={practiceExam.name || ''} onChange={e => handleExamChange('practiceExam', 'name', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Question Source URL</label>
                        <input type="text" value={practiceExam.questionSourceUrl || ''} onChange={e => handleExamChange('practiceExam', 'questionSourceUrl', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                </div>
            )}

            {certExam && (
                <div className="p-4 border rounded-lg bg-white/50 space-y-2">
                    <h4 className="font-bold flex items-center gap-2"><Award size={16} /> Certification Exam</h4>
                     <div>
                        <label className="text-xs font-bold">Name</label>
                        <input type="text" value={certExam.name || ''} onChange={e => handleExamChange('certExam', 'name', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                     <div>
                        <label className="text-xs font-bold">Product SKU</label>
                        <input type="text" value={certExam.productSku || ''} onChange={e => handleExamChange('certExam', 'productSku', e.target.value)} className="w-full p-2 border rounded bg-white" />
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold">Price</label>
                            <input type="number" value={certExam.price || ''} onChange={e => handleExamChange('certExam', 'price', parseFloat(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                         <div>
                            <label className="text-xs font-bold">Regular Price</label>
                            <input type="number" value={certExam.regularPrice || ''} onChange={e => handleExamChange('certExam', 'regularPrice', parseFloat(e.target.value))} className="w-full p-2 border rounded bg-white" />
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-end gap-2">
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
    onSave: (name: string) => Promise<void>;
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, isSaving }) => {
    const [name, setName] = useState('');
    useEffect(() => { if(isOpen) setName(''); }, [isOpen]);
    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-md p-6">
                 <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Create New Exam Program</h2>
                 <div>
                    <label className="text-sm font-medium">Program Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Certification Program" className="w-full p-2 mt-1 border rounded bg-white" />
                 </div>
                 <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={() => onSave(name)} disabled={isSaving || !name} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                        {isSaving ? <Spinner /> : <Save size={16} />} Create Program
                    </button>
                </div>
            </div>
        </div>
    );
};


const ExamProgramCustomizer: FC = () => {
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const handleSave = async (programId: string, data: EditableProgramData) => {
        if (!token) {
            toast.error("Authentication session has expired.");
            return;
        }

        // FIX: Flatten the nested data state into a flat payload that the backend API expects.
        // This resolves bugs where certain settings were not being saved correctly.
        const payload: any = {};
        if (data.category?.name) payload.programName = data.category.name;
        if (data.category?.description) payload.programDescription = data.category.description;
        if (data.practiceExam?.name) payload.practice_name_override = data.practiceExam.name;
        if (data.practiceExam?.questionSourceUrl) payload.questionSourceUrl = data.practiceExam.questionSourceUrl;
        if (data.certExam?.name) payload.cert_name_override = data.certExam.name;
        if (typeof data.certExam?.isProctored === 'boolean') payload.cert_isProctored = data.certExam.isProctored;
        if (typeof data.certExam?.certificateEnabled === 'boolean') payload.cert_certificateEnabled = data.certExam.certificateEnabled;
        if (data.certExam?.passScore) payload.cert_passScore = data.certExam.passScore;

        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminUpdateExamProgram(token, programId, payload);
            const newOrg = result.organizations.find(o => o.id === activeOrg?.id);
            if (newOrg) updateActiveOrg(newOrg);
            toast.success("Exam program updated successfully!");
            setEditingProgramId(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkSave = async (updateData: any) => {
        if (!token || !activeOrg) {
            toast.error("Authentication error.");
            return;
        }
        if (selectedProgramIds.length === 0) return;

        setIsSaving(true);
        const toastId = toast.loading(`Updating ${selectedProgramIds.length} programs...`);

        const updatePromises = selectedProgramIds.map(programId => 
            googleSheetsService.adminUpdateExamProgram(token, programId, updateData)
        );

        try {
            const results = await Promise.all(updatePromises);
            const lastResult = results[results.length - 1];
            if (lastResult && lastResult.organizations) {
                const newOrg = lastResult.organizations.find(o => o.id === activeOrg.id);
                if (newOrg) updateActiveOrg(newOrg);
            }
            toast.success(`${selectedProgramIds.length} programs updated!`, { id: toastId });
            setSelectedProgramIds([]);
        } catch (error: any) {
            toast.error(error.message || "An error occurred during bulk update.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateProgram = async (name: string) => {
        if (!token || !activeOrg) {
            toast.error("Authentication error.");
            return;
        }
        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminCreateExamProgram(token, name);
            const newOrg = result.organizations.find(o => o.id === activeOrg.id);
            if (newOrg) updateActiveOrg(newOrg);
            toast.success(`Program "${name}" created successfully!`);
            setIsCreateModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to create program.");
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

    const programs = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(category => ({
            category,
            practiceExam: activeOrg.exams.find(e => e.id === category.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === category.certificationExamId),
        }));
    }, [activeOrg]);

    if (!activeOrg) return <Spinner />;
    
    const isAllSelected = selectedProgramIds.length === programs.length && programs.length > 0;

    return (
        <div className="space-y-8">
            <CreateProgramModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreateProgram}
                isSaving={isSaving}
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
                        <div key={program.category.id} className="border border-[rgb(var(--color-border-rgb))] rounded-lg">
                            <div className="flex justify-between items-center p-4 bg-[rgb(var(--color-card-rgb))] rounded-t-lg">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={selectedProgramIds.includes(program.category.id)} onChange={e => handleSelectOne(program.category.id, e.target.checked)} className="h-4 w-4 mr-4"/>
                                    <h2 className="font-bold text-lg text-[rgb(var(--color-text-strong-rgb))]">{program.category.name}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {editingProgramId !== program.category.id && (
                                        <button onClick={() => setEditingProgramId(program.category.id)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-300">
                                            <Edit size={14} /> Edit
                                        </button>
                                    )}
                                    <button onClick={() => setExpandedProgramId(expandedProgramId === program.category.id ? null : program.category.id)} className="p-2 rounded-full hover:bg-[rgb(var(--color-muted-rgb))]">
                                        {expandedProgramId === program.category.id ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                </div>
                            </div>
                            {expandedProgramId === program.category.id && editingProgramId !== program.category.id && (
                                <div className="p-4 bg-[rgb(var(--color-muted-rgb))] rounded-b-lg text-sm space-y-2">
                                    <p><strong>Description:</strong> {program.category.description}</p>
                                    {program.practiceExam && <p><strong>Practice Exam:</strong> {program.practiceExam.name}</p>}
                                    {program.certExam && <p><strong>Certification Exam:</strong> {program.certExam.name}</p>}
                                </div>
                            )}
                            {editingProgramId === program.category.id && (
                                <ExamEditor 
                                    program={program}
                                    onSave={handleSave}
                                    onCancel={() => setEditingProgramId(null)}
                                    isSaving={isSaving}
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