import React, { FC, useState, useMemo, useCallback, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization, ExamProductCategory } from '../types.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, Tag, RefreshCw, Trash2, PlusCircle } from 'lucide-react';
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
    isBundle?: boolean;
    fullExamData?: Exam;
}

interface UpsertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: any) => Promise<void>;
    isSaving: boolean;
    productToEdit?: Product;
    simpleProducts: Product[];
}

const UpsertBundleModal: FC<UpsertModalProps> = ({ isOpen, onClose, onSave, isSaving, productToEdit, simpleProducts }) => {
    const [name, setName] = useState(productToEdit?.name || '');
    const [sku, setSku] = useState(productToEdit?.sku || '');
    const [price, setPrice] = useState(productToEdit?.price?.toString() || '');
    const [regularPrice, setRegularPrice] = useState(productToEdit?.regularPrice?.toString() || '');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name || !sku || !price || !regularPrice) {
            return toast.error("All fields are required.");
        }
        onSave({
            name,
            sku,
            price: parseFloat(price),
            regularPrice: parseFloat(regularPrice),
            isBundle: true,
        });
    };
    
    const handleBaseExamSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedSku = e.target.value;
        const selectedExam = simpleProducts.find(p => p.sku === selectedSku);
        if (selectedExam) {
            setName(`${selectedExam.name} Bundle`);
            setSku(`${selectedExam.sku}-bundle`);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-lg p-6">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">{productToEdit ? 'Edit Bundle' : 'Create New Bundle'}</h2>
                <div className="space-y-4">
                    {!productToEdit && (
                         <div>
                            <label className="text-sm font-medium">Base Exam (for name/SKU)</label>
                            <select onChange={handleBaseExamSelect} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]">
                                <option value="">Select an exam to start...</option>
                                {simpleProducts.map(p => <option key={p.sku} value={p.sku}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium">Bundle Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">SKU</label>
                        <input type="text" value={sku} onChange={e => setSku(e.target.value)} disabled={!!productToEdit} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))] disabled:opacity-70" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Sale Price</label>
                            <input type="number" placeholder="e.g., 59.99" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Regular Price</label>
                            <input type="number" placeholder="e.g., 89.99" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                        {isSaving ? <Spinner /> : <Save size={16} />} {productToEdit ? 'Save Changes' : 'Create Bundle'}
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
    
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);
    
    const { simpleProducts, subscriptionProducts, bundleProducts } = useMemo(() => {
        if (!activeOrg || !examPrices) return { simpleProducts: [], subscriptionProducts: [], bundleProducts: [] };

        const simple: Product[] = [];
        const subscriptions: Product[] = [];
        const bundles: Product[] = [];

        Object.keys(examPrices).forEach(sku => {
            const priceData = examPrices[sku];
            const exam = activeOrg.exams.find(e => e.productSku === sku && !e.isPractice);

            if (exam) {
                simple.push({ ...priceData, sku: exam.productSku, name: exam.name, isEditable: false, fullExamData: exam });
            } else if (sku.startsWith('sub-')) {
                let name = 'Subscription';
                if (sku.includes('monthly')) name = 'Monthly Subscription';
                if (sku.includes('yearly')) name = 'Yearly Subscription';
                subscriptions.push({ sku, name, isEditable: false, ...priceData });
            } else if (sku.endsWith('-1') || sku.endsWith('-bundle')) { // Updated logic to catch more bundle types
                const baseSku = sku.endsWith('-1') ? sku.slice(0, -2) : sku.replace('-bundle', '');
                const baseExam = activeOrg.exams.find(e => e.productSku === baseSku);
                const name = baseExam ? `${baseExam.name} Bundle` : priceData.name || 'Exam Bundle';
                bundles.push({ sku, name, isEditable: true, isBundle: true, ...priceData });
            }
        });

        return { 
            simpleProducts: simple.sort((a,b) => a.name.localeCompare(b.name)), 
            subscriptionProducts: subscriptions, 
            bundleProducts: bundles.sort((a,b) => a.name.localeCompare(b.name)) 
        };
    }, [activeOrg, examPrices]);


    const handleUpsertBundle = async (productData: any) => {
// FIX: Changed return of a value from toast.error to a separate return statement to match Promise<void> type.
        if (!token || !activeOrg) {
            toast.error("Authentication error.");
            return;
        }

        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminUpsertProduct(token, productData);
            const newOrgData = result.organizations.find((o: Organization) => o.id === activeOrg.id);
            if (newOrgData) {
                // We need to merge the new prices into the activeOrg data before updating context
                const updatedOrgWithNewPrices = {
                    ...newOrgData,
                    examPrices: result.examPrices
                };
                updateActiveOrg(updatedOrgWithNewPrices);
            }
            toast.success(`Bundle "${productData.name}" saved successfully!`);
            setEditingProduct(undefined);
        } catch (error: any) {
            toast.error(error.message || "Failed to save bundle.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderProducts = (products: Product[]) => (
        <div className="space-y-2">
            {products.map(product => (
                <div key={product.sku} className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                    <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            {product.regularPrice > product.price && (
                                <span className="text-sm line-through text-slate-500">${product.regularPrice.toFixed(2)}</span>
                            )}
                            <span className="font-bold ml-2">${product.price.toFixed(2)}</span>
                        </div>
                        {product.isEditable && (
                            <button onClick={() => setEditingProduct(product)} className="p-2 rounded-full hover:bg-[rgb(var(--color-border-rgb))]">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
    
    const renderContent = () => {
        let products: Product[] = [];
        let title = '';
        let showCreate = false;

        if (activeTab === 'simple') { products = simpleProducts; title = 'Certification Exams (Read-only)'; }
        if (activeTab === 'subscription') { products = subscriptionProducts; title = 'Subscription Products (Read-only)'; }
        if (activeTab === 'bundle') { products = bundleProducts; title = 'Bundle Products'; showCreate = true; }
        
        return (
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold">{title}</h3>
                    {showCreate && (
                        <button onClick={() => setEditingProduct({} as Product)} className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600">
                            <PlusCircle size={16}/> Create New Bundle
                        </button>
                    )}
                </div>
                {products.length > 0 ? renderProducts(products) : <p className="text-center p-4 text-slate-500">No {activeTab} products found.</p>}
            </div>
        );
    };

    return (
         <div className="space-y-8">
            <UpsertBundleModal 
                isOpen={!!editingProduct}
                onClose={() => setEditingProduct(undefined)}
                onSave={handleUpsertBundle}
                isSaving={isSaving}
                productToEdit={editingProduct?.isBundle ? editingProduct : undefined}
                simpleProducts={simpleProducts}
            />

            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><ShoppingCart /> Product Customizer</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">Create and manage pricing for your exam bundles. Simple product and subscription prices are managed directly in WooCommerce.</p>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex space-x-2 mb-4">
                    <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')}>Simple Products</TabButton>
                    <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}>Subscriptions</TabButton>
                    <TabButton active={activeTab === 'bundle'} onClick={() => setActiveTab('bundle')}>Bundles</TabButton>
                </div>
                <div>{renderContent()}</div>
            </div>
        </div>
    );
};

export default ProductCustomizer;