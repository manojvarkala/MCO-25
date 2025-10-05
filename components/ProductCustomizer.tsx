import React, { FC, useState, useMemo, useCallback, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, Tag, RefreshCw } from 'lucide-react';
import Spinner from './Spinner.tsx';


type TabType = 'simple' | 'subscription' | 'bundle';

const TabButton: FC<{ active: boolean; onClick: () => void; children: ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-semibold text-sm rounded-md transition ${
            active ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
    >
        {children}
    </button>
);

const ProductCustomizer: FC = () => {
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('simple');
    
    // For now, only simple products (exams) are editable.
    // We can add state for subscription/bundle when APIs are ready.

    const examToProgramMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!activeOrg) return map;
        activeOrg.examProductCategories.forEach(prog => {
            if (prog.practiceExamId) map.set(prog.practiceExamId, prog.id);
            if (prog.certificationExamId) map.set(prog.certificationExamId, prog.id);
        });
        return map;
    }, [activeOrg]);

    const simpleProducts = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.exams.filter(e => !e.isPractice);
    }, [activeOrg]);

    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [editedPrice, setEditedPrice] = useState(0);
    const [editedRegularPrice, setEditedRegularPrice] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const handleEdit = (exam: Exam) => {
        setEditingExamId(exam.id);
        setEditedPrice(exam.price);
        setEditedRegularPrice(exam.regularPrice);
    };

    const handleCancel = () => {
        setEditingExamId(null);
    };

    const handleSave = async (examToSave: Exam) => {
        if (!token) {
            toast.error("Authentication session has expired. Please log in again.");
            return;
        }
        
        const programId = examToProgramMap.get(examToSave.id);
        if (!programId || !activeOrg) {
            toast.error("Could not find the parent program for this product.");
            return;
        }
        
        setIsSaving(true);

        // Find the program and construct the update payload
        const program = activeOrg.examProductCategories.find(p => p.id === programId);
        const practiceExam = activeOrg.exams.find(e => e.id === program?.practiceExamId);
        
        const updateData = {
            category: { ...program },
            practiceExam: practiceExam ? { ...practiceExam } : undefined,
            certExam: { 
                ...examToSave, 
                price: editedPrice, 
                regularPrice: editedRegularPrice 
            },
        };

        try {
            const result = await googleSheetsService.adminUpdateExamProgram(token, programId, updateData);
            const newOrg = result.organizations.find(o => o.id === activeOrg.id);
            if (newOrg) {
                updateActiveOrg(newOrg);
            }
            toast.success(`Product "${examToSave.name}" updated successfully!`);
            setEditingExamId(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to save product.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'simple':
                return (
                    <div className="space-y-2">
                        {simpleProducts.map(exam => (
                            <div key={exam.id} className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                                <div>
                                    <p className="font-semibold">{exam.name}</p>
                                    <p className="text-xs text-slate-500">SKU: {exam.productSku}</p>
                                </div>
                                {editingExamId === exam.id ? (
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <label className="text-xs">Sale</label>
                                            <input type="number" value={editedPrice} onChange={e => setEditedPrice(parseFloat(e.target.value))} className="w-24 p-1 border rounded" />
                                        </div>
                                         <div>
                                            <label className="text-xs">Regular</label>
                                            <input type="number" value={editedRegularPrice} onChange={e => setEditedRegularPrice(parseFloat(e.target.value))} className="w-24 p-1 border rounded" />
                                        </div>
                                        <button onClick={() => handleSave(exam)} disabled={isSaving} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-slate-400">{isSaving ? <Spinner size="sm" /> : <Save size={16} />}</button>
                                        <button onClick={handleCancel} disabled={isSaving} className="p-2 bg-slate-400 text-white rounded-md hover:bg-slate-500"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-sm line-through text-slate-500">${exam.regularPrice.toFixed(2)}</span>
                                            <span className="font-bold ml-2">${exam.price.toFixed(2)}</span>
                                        </div>
                                        <button onClick={() => handleEdit(exam)} className="p-2 rounded-full hover:bg-slate-200"><Edit size={16} /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            case 'subscription':
            case 'bundle':
                return (
                    <div className="text-center p-8 bg-slate-100 rounded-lg">
                        <p className="font-semibold text-slate-700">Coming Soon!</p>
                        <p className="text-sm text-slate-500">Editing {activeTab} products will be available in a future update.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
         <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <ShoppingCart /> Product Customizer
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                Manage pricing for your exams. The prices set here will be reflected in the WooCommerce CSV generation and on the dashboard.
            </p>
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex space-x-2 mb-4">
                    <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')}>Simple Products</TabButton>
                    <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}>Subscription Products</TabButton>
                    <TabButton active={activeTab === 'bundle'} onClick={() => setActiveTab('bundle')}>Bundles</TabButton>
                </div>
                <div>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ProductCustomizer;
