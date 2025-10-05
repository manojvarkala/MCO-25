import React, { FC, useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, ExamProductCategory, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { Settings, Edit, Save, X, ChevronDown, ChevronUp, FileText, Award } from 'lucide-react';
import Spinner from './Spinner.tsx';

interface EditableProgramData {
    category: Partial<ExamProductCategory>;
    practiceExam?: Partial<Exam>;
    certExam?: Partial<Exam>;
}

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


const ExamProgramCustomizer: FC = () => {
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (programId: string, data: EditableProgramData) => {
        if (!token) {
            toast.error("Authentication session has expired. Please log in again.");
            return;
        }
        setIsSaving(true);
        try {
            // The API expects the full updated data for the program.
            const result = await googleSheetsService.adminUpdateExamProgram(token, programId, data);
            
            // The API returns the entire updated organization list.
            const newOrg = result.organizations.find(o => o.id === activeOrg?.id);
            if (newOrg) {
                updateActiveOrg(newOrg);
            }
            
            toast.success("Exam program updated successfully!");
            setEditingProgramId(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const programs = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(category => ({
            category,
            practiceExam: activeOrg.exams.find(e => e.id === category.practiceExamId),
            certExam: activeOrg.exams.find(e => e.id === category.certificationExamId),
        }));
    }, [activeOrg]);

    if (!activeOrg) {
        return <Spinner />;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <Settings /> Exam Program Customizer
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                Manage your exam programs, including their associated practice and certification exams. Changes made here will be reflected across the app.
            </p>
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="space-y-2">
                    {programs.map((program) => (
                        <div key={program.category.id} className="border border-[rgb(var(--color-border-rgb))] rounded-lg">
                            <div className="flex justify-between items-center p-4 bg-[rgb(var(--color-card-rgb))] rounded-t-lg">
                                <h2 className="font-bold text-lg text-[rgb(var(--color-text-strong-rgb))]">{program.category.name}</h2>
                                <div className="flex items-center gap-2">
                                    {editingProgramId !== program.category.id && (
                                        <button onClick={() => setEditingProgramId(program.category.id)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-300">
                                            <Edit size={14} /> Edit
                                        </button>
                                    )}
                                    <button onClick={() => setExpandedProgramId(expandedProgramId === program.category.id ? null : program.category.id)} className="p-2 rounded-full hover:bg-slate-100">
                                        {expandedProgramId === program.category.id ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                </div>
                            </div>
                            {expandedProgramId === program.category.id && !editingProgramId && (
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
