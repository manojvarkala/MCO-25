import React, { FC, useState, useMemo, useCallback, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, Tag, RefreshCw, Trash2 } from 'lucide-react';
import Spinner from './Spinner.tsx';

type TabType = 'simple' | 'subscription' | 'bundle';

const TabButton: FC<{ active: boolean; onClick: () => void; children: ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-semibold text-sm rounded-md transition ${
            active ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-default-rgb))] hover:bg-[rgb(var(--color-border-rgb))]'
        }`}
    >
        {children}
    </button>
);

interface Product {
    sku: string;
    name: string;
    price: number;
    regularPrice: number;
    isEditable: boolean;
    fullExamData?: Exam;
}

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (prices: { price: string; regularPrice: string }) => void;
    isSaving: boolean;
    selectedCount: number;
}

const BulkEditModal: FC<BulkEditModalProps> = ({ isOpen, onClose, onSave, isSaving, selectedCount }) => {
    const [price, setPrice] = useState('');
    const [regularPrice, setRegularPrice] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ price, regularPrice });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Bulk Edit {selectedCount} Products</h2>
                <p className="text-sm text-[rgb(var(--color-text-muted-rgb))] mb-6">Enter a value to update it for all selected products. Leave a field blank to make no changes to that value.</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Sale Price</label>
                        <input type="number" placeholder="e.g., 49.99" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Regular Price</label>
                        <input type="number" placeholder="e.g., 79.99" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                        {isSaving ? <Spinner /> : <Save size={16} />} Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProductCustomizer: FC = () => {
    const { activeOrg, examPrices, updateActiveOrg } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('simple');

    const { simpleProducts, subscriptionProducts, bundleProducts } = useMemo(() => {
        if (!activeOrg || !examPrices) return { simpleProducts: [], subscriptionProducts: [], bundleProducts: [] };

        const simple: Product[] = [];
        const subscriptions: Product[] = [];
        const bundles: Product[] = [];

        Object.keys(examPrices).forEach(sku => {
            const priceData = examPrices[sku];
            const exam = activeOrg.exams.find(e => e.productSku === sku && !e.isPractice);

            if (exam) {
                simple.push({ ...priceData, sku: exam.productSku, name: exam.name, isEditable: true, fullExamData: exam });
            } else if (sku.startsWith('sub-')) {
                let name = 'Subscription';
                if (sku.includes('monthly')) name = 'Monthly Subscription';
                if (sku.includes('yearly')) name = 'Yearly Subscription';
                subscriptions.push({ sku, name, isEditable: false, ...priceData });
            } else if (sku.endsWith('-1')) {
                const baseSku = sku.slice(0, -2);
                const baseExam = activeOrg.exams.find(e => e.productSku === baseSku);
                const name = baseExam ? `${baseExam.name} Bundle` : 'Exam Bundle';
                bundles.push({ sku, name, isEditable: false, ...priceData });
            }
        });

        return { simpleProducts: simple, subscriptionProducts: subscriptions, bundleProducts: bundles };
    }, [activeOrg, examPrices]);

    const examToProgramMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!activeOrg) return map;
        activeOrg.examProductCategories.forEach(prog => {
            if (prog.practiceExamId) map.set(prog.practiceExamId, prog.id);
            if (prog.certificationExamId) map.set(prog.certificationExamId, prog.id);
        });
        return map;
    }, [activeOrg]);

    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [editedPrice, setEditedPrice] = useState(0);
    const [editedRegularPrice, setEditedRegularPrice] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const handleEdit = (product: Product) => {
        setEditingProductId(product.sku);
        setEditedPrice(product.price);
        setEditedRegularPrice(product.regularPrice);
    };
    const handleCancel = () => setEditingProductId(null);
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedSkus(e.target.checked ? simpleProducts.map(p => p.sku) : []);
    const handleSelectOne = (sku: string, checked: boolean) => setSelectedSkus(prev => checked ? [...prev, sku] : prev.filter(s => s !== sku));

    const handleSave = async (productToSave: Product) => {
        if (!token) return toast.error("Authentication error.");
        if (!productToSave.fullExamData) return toast.error("Cannot save: full exam data is missing.");
        
        const programId = examToProgramMap.get(productToSave.sku);
        if (!programId || !activeOrg) return toast.error("Could not find the parent program for this product.");
        
        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminUpdateExamProgram(token, programId, { certExam: { price: editedPrice, regularPrice: editedRegularPrice } });
            const newOrg = result.organizations.find(o => o.id === activeOrg.id);
            if (newOrg) updateActiveOrg(newOrg);
            toast.success(`Product "${productToSave.name}" updated!`);
            setEditingProductId(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to save product.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkSave = async (prices: { price: string; regularPrice: string }) => {
        if (!token || !activeOrg) return toast.error("Authentication error.");
        
        const priceUpdate = prices.price !== '' ? parseFloat(prices.price) : undefined;
        const regularPriceUpdate = prices.regularPrice !== '' ? parseFloat(prices.regularPrice) : undefined;
        if (priceUpdate === undefined && regularPriceUpdate === undefined) {
            return toast.error("No new price values were entered.");
        }

        setIsSaving(true);
        const toastId = toast.loading(`Updating ${selectedSkus.length} products...`);
        
        const updatePromises = selectedSkus.map(sku => {
            const product = simpleProducts.find(p => p.sku === sku);
            const programId = examToProgramMap.get(sku);
            if (!product || !programId) return Promise.resolve(null);

            return googleSheetsService.adminUpdateExamProgram(token, programId, {
                certExam: {
                    price: priceUpdate !== undefined ? priceUpdate : product.price,
                    regularPrice: regularPriceUpdate !== undefined ? regularPriceUpdate : product.regularPrice
                }
            });
        });

        try {
            const results = await Promise.all(updatePromises);
            const lastResult = results[results.length - 1];
            if (lastResult && lastResult.organizations) {
                const newOrg = lastResult.organizations.find(o => o.id === activeOrg.id);
                if (newOrg) updateActiveOrg(newOrg);
            }
            toast.success(`${selectedSkus.length} products updated successfully!`, { id: toastId });
            setSelectedSkus([]);
            setIsBulkModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "An error occurred during bulk update.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const renderProducts = (products: Product[]) => (
        <div className="space-y-2">
            {activeTab === 'simple' && products.length > 0 && (
                <div className="flex items-center p-3 bg-[rgb(var(--color-card-rgb))] rounded-t-lg border-b border-[rgb(var(--color-border-rgb))]">
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedSkus.length === products.length && products.length > 0} className="h-4 w-4 mr-4"/>
                    <span className="font-semibold text-sm">Select All</span>
                </div>
            )}
            {products.map(product => (
                <div key={product.sku} className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                    <div className="flex items-center">
                        {product.isEditable && <input type="checkbox" checked={selectedSkus.includes(product.sku)} onChange={e => handleSelectOne(product.sku, e.target.checked)} className="h-4 w-4 mr-4" />}
                        <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                        </div>
                    </div>
                    {editingProductId === product.sku ? (
                        <div className="flex items-center gap-2">
                            <div><label className="text-xs">Sale</label><input type="number" value={editedPrice} onChange={e => setEditedPrice(parseFloat(e.target.value))} className="w-24 p-1 border rounded" /></div>
                            <div><label className="text-xs">Regular</label><input type="number" value={editedRegularPrice} onChange={e => setEditedRegularPrice(parseFloat(e.target.value))} className="w-24 p-1 border rounded" /></div>
                            <button onClick={() => handleSave(product)} disabled={isSaving} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-slate-400">{isSaving ? <Spinner size="sm" /> : <Save size={16} />}</button>
                            <button onClick={handleCancel} disabled={isSaving} className="p-2 bg-slate-400 text-white rounded-md hover:bg-slate-500"><X size={16} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div>
                                <span className="text-sm line-through text-slate-500">${product.regularPrice.toFixed(2)}</span>
                                <span className="font-bold ml-2">${product.price.toFixed(2)}</span>
                            </div>
                            {product.isEditable && <button onClick={() => handleEdit(product)} className="p-2 rounded-full hover:bg-[rgb(var(--color-border-rgb))]"><Edit size={16} /></button>}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const renderContent = () => {
        let products: Product[] = [];
        let title = '';
        if (activeTab === 'simple') { products = simpleProducts; title = 'Certification Exams'; }
        if (activeTab === 'subscription') { products = subscriptionProducts; title = 'Subscription Products'; }
        if (activeTab === 'bundle') { products = bundleProducts; title = 'Bundle Products'; }
        
        return (
            <div>
                <h3 className="text-lg font-bold mb-3">{title}</h3>
                {products.length > 0 ? renderProducts(products) : <p className="text-center p-4 text-slate-500">No {activeTab} products found.</p>}
            </div>
        );
    };

    return (
         <div className="space-y-8">
            <BulkEditModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} onSave={handleBulkSave} isSaving={isSaving} selectedCount={selectedSkus.length} />
            {selectedSkus.length > 0 && (
                <div className="fixed bottom-4 right-1/2 translate-x-1/2 z-50 bg-[rgb(var(--color-card-rgb))] p-3 rounded-lg shadow-lg border border-[rgb(var(--color-border-rgb))] flex items-center gap-4">
                    <span className="font-semibold text-sm">{selectedSkus.length} item(s) selected</span>
                    <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white rounded-md text-sm font-semibold hover:bg-cyan-700">
                        <Edit size={14}/> Bulk Edit Prices
                    </button>
                    <button onClick={() => setSelectedSkus([])} className="p-1.5 rounded-full hover:bg-slate-200"><X size={16}/></button>
                </div>
            )}

            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><ShoppingCart /> Product Customizer</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">Manage pricing for your exams. The prices set here will be reflected in the WooCommerce CSV generation and on the dashboard.</p>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex space-x-2 mb-4">
                    <TabButton active={activeTab === 'simple'} onClick={() => { setActiveTab('simple'); setSelectedSkus([]); }}>Simple Products</TabButton>
                    <TabButton active={activeTab === 'subscription'} onClick={() => { setActiveTab('subscription'); setSelectedSkus([]); }}>Subscriptions</TabButton>
                    <TabButton active={activeTab === 'bundle'} onClick={() => { setActiveTab('bundle'); setSelectedSkus([]); }}>Bundles</TabButton>
                </div>
                <div>{renderContent()}</div>
            </div>
        </div>
    );
};

export default ProductCustomizer;
