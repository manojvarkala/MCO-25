import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { Exam, ExamProductCategory, ExamSection } from '../types.ts';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import { Settings, Save, X, Book, ChevronDown, ChevronUp, Trash2, PlusCircle, GripVertical, HelpCircle, AlertTriangle } from 'lucide-react';
import Spinner from './Spinner.tsx';

const ExamProgramCustomizer: FC = () => {
    const { activeOrg, updateActiveOrg, isInitializing } = useAppContext();
    const { token } = useAuth();

    const [editedPrograms, setEditedPrograms] = useState<any>({});
    const [originalPrograms, setOriginalPrograms] = useState<any>({});
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

    // State for bulk editing
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkValues, setBulkValues] = useState({
        questionSourceUrl: '',
        practice_numberOfQuestions: '',
        practice_durationMinutes: '',
        cert_numberOfQuestions: '',
        cert_durationMinutes: '',
        cert_passScore: '',
        cert_isProctored: 'unchanged',
        cert_certificateEnabled: 'unchanged',
    });

    // FIX: Imported useMemo to resolve undeclared function error.
    const isDirty = useMemo(() => JSON.stringify(originalPrograms) !== JSON.stringify(editedPrograms), [originalPrograms, editedPrograms]);
    const programsArray = useMemo(() => activeOrg ? Object.values(editedPrograms).sort((a: any, b: any) => a.name.localeCompare(b.name)) : [], [editedPrograms]);

    const initializeState = useCallback(() => {
        if (activeOrg) {
            const combinedData: any = {};
            activeOrg.examProductCategories.forEach(prog => {
                const practiceExam = activeOrg.exams.find(e => e.id === prog.practiceExamId);
                const certExam = activeOrg.exams.find(e => e.id === prog.certificationExamId);
                combinedData[prog.id] = {
                    ...prog,
                    practiceExam: practiceExam ? { ...practiceExam } : null,
                    certExam: certExam ? { ...certExam } : null,
                };
            });
            setEditedPrograms(JSON.parse(JSON.stringify(combinedData)));
            setOriginalPrograms(JSON.parse(JSON.stringify(combinedData)));
            setSelectedIds(new Set());
        }
    }, [activeOrg]);

    useEffect(() => {
        initializeState();
    }, [initializeState]);

    const handleUpdate = (programId: string, field: string, value: any, examType: 'practiceExam' | 'certExam' | null = null) => {
        setEditedPrograms((prev: any) => {
            const newPrograms = { ...prev };
            if (examType) {
                newPrograms[programId][examType][field] = value;
            } else {
                newPrograms[programId][field] = value;
            }
            return newPrograms;
        });
    };
    
    // --- BULK EDIT LOGIC ---
    const isAllSelected = programsArray.length > 0 && selectedIds.size === programsArray.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(programsArray.map((p: any) => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleSelectOne = (id: string, isChecked: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        isChecked ? newSelectedIds.add(id) : newSelectedIds.delete(id);
        setSelectedIds(newSelectedIds);
    };

    const applyBulkChange = (field: keyof typeof bulkValues) => {
        const value = bulkValues[field];
        if (selectedIds.size === 0 || value === '' || value === 'unchanged') return;
        
        const isToggle = ['cert_isProctored', 'cert_certificateEnabled'].includes(field);
        const finalValue = isToggle ? (value === 'true') : value;

        const updatedPrograms = { ...editedPrograms };
        selectedIds.forEach(id => {
            const program = updatedPrograms[id];
            if (field.startsWith('practice_')) {
                if (program.practiceExam) program.practiceExam[field.replace('practice_', '')] = finalValue;
            } else if (field.startsWith('cert_')) {
                if (program.certExam) program.certExam[field.replace('cert_', '')] = finalValue;
            } else {
                if (program.practiceExam) program.practiceExam[field] = finalValue;
                if (program.certExam) program.certExam[field] = finalValue;
            }
        });
        setEditedPrograms(updatedPrograms);
        toast.success(`Applied "${finalValue}" to ${field} for ${selectedIds.size} items.`);
    };

    const handleSaveAll = async () => {
        if (!token || !isDirty) return;
        setIsSavingAll(true);

        const updatePromises = Object.values(editedPrograms).map((program: any) => {
            const originalProgram = originalPrograms[program.id];
            if (JSON.stringify(program) === JSON.stringify(originalProgram)) return Promise.resolve(null);
            
            return googleSheetsService.adminUpdateExamProgram(token, program.id, program);
        });

        try {
            const results = await Promise.all(updatePromises);
            const lastResult = results.reverse().find(r => r !== null);
            if (lastResult && lastResult.organizations && lastResult.organizations.length > 0) {
                updateActiveOrg(lastResult.organizations[0]);
            }
            toast.success('All changes saved successfully!');
            initializeState();
        } catch (error: any) {
            toast.error(error.message || "Failed to save some programs.");
        } finally {
            setIsSavingAll(false);
        }
    };
    
    const handleDiscardAll = () => {
        if (window.confirm("Are you sure you want to discard all unsaved changes?")) {
            initializeState();
            toast.success("Changes discarded.");
        }
    };


    if (isInitializing) return <div className="text-center py-10"><Spinner size="lg" /></div>;
    if (!activeOrg) return <p>Could not load organization data.</p>;

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Exam Program Customizer</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                Select programs to bulk edit, or click a program to edit it individually. Remember to save your changes.
            </p>

            {(isDirty || selectedIds.size > 0) && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] sticky top-24 z-10">
                    {selectedIds.size > 0 ? (
                        <div>
                            <h3 className="font-bold text-lg mb-2">Bulk Edit ({selectedIds.size} selected)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <BulkInput label="Question Source URL" value={bulkValues.questionSourceUrl} onChange={v => setBulkValues({...bulkValues, questionSourceUrl: v})} onApply={() => applyBulkChange('questionSourceUrl')} />
                                <BulkInput label="Practice Qs" type="number" value={bulkValues.practice_numberOfQuestions} onChange={v => setBulkValues({...bulkValues, practice_numberOfQuestions: v})} onApply={() => applyBulkChange('practice_numberOfQuestions')} />
                                <BulkInput label="Practice Duration" type="number" value={bulkValues.practice_durationMinutes} onChange={v => setBulkValues({...bulkValues, practice_durationMinutes: v})} onApply={() => applyBulkChange('practice_durationMinutes')} />
                                <BulkInput label="Cert Qs" type="number" value={bulkValues.cert_numberOfQuestions} onChange={v => setBulkValues({...bulkValues, cert_numberOfQuestions: v})} onApply={() => applyBulkChange('cert_numberOfQuestions')} />
                                <BulkInput label="Cert Duration" type="number" value={bulkValues.cert_durationMinutes} onChange={v => setBulkValues({...bulkValues, cert_durationMinutes: v})} onApply={() => applyBulkChange('cert_durationMinutes')} />
                                <BulkInput label="Cert Pass Score" type="number" value={bulkValues.cert_passScore} onChange={v => setBulkValues({...bulkValues, cert_passScore: v})} onApply={() => applyBulkChange('cert_passScore')} />
                                <BulkToggle label="Proctoring" value={bulkValues.cert_isProctored} onChange={v => setBulkValues({...bulkValues, cert_isProctored: v})} onApply={() => applyBulkChange('cert_isProctored')} />
                                <BulkToggle label="Certificate" value={bulkValues.cert_certificateEnabled} onChange={v => setBulkValues({...bulkValues, cert_certificateEnabled: v})} onApply={() => applyBulkChange('cert_certificateEnabled')} />
                            </div>
                        </div>
                    ) : (
                         <h3 className="font-bold text-lg">Unsaved Changes</h3>
                    )}
                    <div className="mt-4 pt-4 border-t border-[rgb(var(--color-border-rgb))] flex justify-end gap-3">
                        <button onClick={handleDiscardAll} disabled={isSavingAll} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center gap-2"><X size={16}/> Discard All</button>
                        <button onClick={handleSaveAll} disabled={isSavingAll || !isDirty} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400 flex items-center gap-2">
                            {isSavingAll ? <Spinner /> : <Save size={16}/>} {isSavingAll ? 'Saving...' : 'Save All Changes'}
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto bg-[rgb(var(--color-card-rgb))] p-2 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <table className="min-w-full">
                     <thead className="bg-[rgb(var(--color-muted-rgb))]">
                        <tr>
                            <th className="p-3 w-10"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" /></th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider">Program Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider">Source URL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider text-center">Practice</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider text-center">Certification</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(var(--color-border-rgb))]">
                         {programsArray.map((program: any) => (
                            <ProgramRow
                                key={program.id}
                                program={program}
                                onUpdate={handleUpdate}
                                isSelected={selectedIds.has(program.id)}
                                onSelect={handleSelectOne}
                            />
                         ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const BulkInput: FC<{label:string, value:string, onChange:(v:string)=>void, onApply:()=>void, type?: string}> = ({label, value, onChange, onApply, type='text'}) => (
    <div>
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-1">
            <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="..." />
            <button onClick={onApply} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">Apply</button>
        </div>
    </div>
);
const BulkToggle: FC<{label:string, value:string, onChange:(v:string)=>void, onApply:()=>void}> = ({label, value, onChange, onApply}) => (
     <div>
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-1">
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                <option value="unchanged">Unchanged</option>
                <option value="true">Enable</option>
                <option value="false">Disable</option>
            </select>
            <button onClick={onApply} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">Apply</button>
        </div>
    </div>
);

const ProgramRow: FC<{program: any, onUpdate: any, isSelected: boolean, onSelect: any}> = ({program, onUpdate, isSelected, onSelect}) => {
    const isPracticeDirty = program.practiceExam ? JSON.stringify(program.practiceExam) !== JSON.stringify(program.originalPracticeExam) : false;
    const isCertDirty = program.certExam ? JSON.stringify(program.certExam) !== JSON.stringify(program.originalCertExam) : false;

    return (
        <tr className={isSelected ? 'bg-[rgba(var(--color-primary-rgb),0.05)]' : ''}>
            <td className="p-3"><input type="checkbox" checked={isSelected} onChange={e => onSelect(program.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/></td>
            <td className="px-4 py-3"><input type="text" value={program.name} onChange={e => onUpdate(program.id, 'name', e.target.value)} className="w-full p-1 border border-transparent rounded hover:border-slate-300 focus:border-cyan-500 font-semibold" /></td>
            <td className="px-4 py-3"><input type="text" value={program.practiceExam?.questionSourceUrl || program.certExam?.questionSourceUrl || ''} onChange={e => onUpdate(program.id, 'questionSourceUrl', e.target.value, 'practiceExam') & onUpdate(program.id, 'questionSourceUrl', e.target.value, 'certExam')} className="w-full p-1 border border-transparent rounded hover:border-slate-300 focus:border-cyan-500 text-sm" /></td>
            <td className="px-4 py-3">
                {program.practiceExam && <div className="flex justify-center items-center gap-2 text-sm"><input type="number" value={program.practiceExam.numberOfQuestions} onChange={e => onUpdate(program.id, 'numberOfQuestions', e.target.value, 'practiceExam')} className="w-16 p-1 border border-transparent rounded text-center hover:border-slate-300 focus:border-cyan-500"/> Qs / <input type="number" value={program.practiceExam.durationMinutes} onChange={e => onUpdate(program.id, 'durationMinutes', e.target.value, 'practiceExam')} className="w-16 p-1 border border-transparent rounded text-center hover:border-slate-300 focus:border-cyan-500"/> min</div>}
            </td>
            <td className="px-4 py-3">
                 {program.certExam && (
                    <div className="space-y-1">
                         <div className="flex justify-center items-center gap-2 text-sm"><input type="number" value={program.certExam.numberOfQuestions} onChange={e => onUpdate(program.id, 'numberOfQuestions', e.target.value, 'certExam')} className="w-16 p-1 border border-transparent rounded text-center hover:border-slate-300 focus:border-cyan-500"/> Qs / <input type="number" value={program.certExam.durationMinutes} onChange={e => onUpdate(program.id, 'durationMinutes', e.target.value, 'certExam')} className="w-16 p-1 border border-transparent rounded text-center hover:border-slate-300 focus:border-cyan-500"/> min</div>
                         <div className="flex justify-center items-center gap-2 text-xs text-slate-500">Pass: <input type="number" value={program.certExam.passScore} onChange={e => onUpdate(program.id, 'passScore', e.target.value, 'certExam')} className="w-14 p-1 border border-transparent rounded text-center hover:border-slate-300 focus:border-cyan-500"/>%</div>
                         <div className="flex justify-center items-center gap-4 text-xs mt-2">
                             <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={program.certExam.isProctored} onChange={e => onUpdate(program.id, 'isProctored', e.target.checked, 'certExam')} className="h-4 w-4 rounded"/> Proctor</label>
                             <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={program.certExam.certificateEnabled} onChange={e => onUpdate(program.id, 'certificateEnabled', e.target.checked, 'certExam')} className="h-4 w-4 rounded"/> Cert</label>
                         </div>
                    </div>
                )}
            </td>
        </tr>
    );
};


export default ExamProgramCustomizer;