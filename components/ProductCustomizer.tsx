import React, { FC, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ProductVariation, ProductVariationType, BillingPeriod, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { ShoppingCart, Edit, Trash2, PlusCircle, Save, X, Package } from 'lucide-react';
import Spinner from './Spinner.tsx';

// --- TYPES ---
type TabType = 'all' | 'simple' | 'subscription' | 'bundle';
type EditorState = Partial<ProductVariation> & { type: ProductVariationType };

// --- HELPER FUNCTIONS ---
const stripHtml = (html: string | undefined): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
};

// --- MODAL COMPONENT ---
interface ProductEditorModalProps {
    product: EditorState | null; // Allow null to handle closing state
    allProducts: ProductVariation[];
    onSave: (data: EditorState) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const ProductEditorModal: FC<ProductEditorModalProps> = ({ product, allProducts, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState<EditorState>(product || { type: 'simple' });
    const isEditing = !!product?.id;

    const simpleAndSubProducts = useMemo(() => allProducts.filter(p => p.type === 'simple' || p.type === 'subscription'), [allProducts]);
    
    const totalBundleValue = useMemo(() => {
        if (formData.type !== 'bundle') return 0;
        return (formData.bundledSkus || []).reduce((acc, sku) => {
            const item = simpleAndSubProducts.find(p => p.sku === sku);
            // Prioritize regular price for calculation, fall back to sale price
            const price = parseFloat(item?.regularPrice || item?.salePrice || '0');
            return acc + price;
        }, 0);
    }, [formData.bundledSkus, simpleAndSubProducts, formData.type]);

    useEffect(() => {
        if (formData.type === 'bundle') {
            const newRegularPrice = totalBundleValue.toFixed(2);
            // Update formData ONLY if the price is different to avoid infinite loops
            if (newRegularPrice !== formData.regularPrice) {
                setFormData(prev => ({ ...prev, regularPrice: newRegularPrice }));
            }
        }
    }, [formData.type, totalBundleValue, formData.regularPrice]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBundleChange = (sku: string) => {
        const currentSkus = formData.bundledSkus || [];
        const newSkus = currentSkus.includes(sku) ? currentSkus.filter(s => s !== sku) : [...currentSkus, sku];
        setFormData(prev => ({ ...prev, bundledSkus: newSkus }));
    };
    
    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-[rgb(var(--color-border-rgb))]">
                    <h2 className="font-bold text-xl">{isEditing ? 'Edit Product' : 'Create New Product'}</h2>
                    <button onClick={onCancel} className="p-1 rounded-full hover:bg-[rgb(var(--color-muted-rgb))]"><X size={20} /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="flex-grow flex flex-col">
                    <div className="p-6 overflow-y-auto space-y-4">
                        <div>
                            <label className="text-sm font-bold block mb-1">Product Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} disabled={isEditing} className="w-full p-2 border rounded-md">
                                <option value="simple">Simple</option>
                                <option value="subscription">Subscription</option>
                                <option value="bundle">Bundle</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold block mb-1">Product Name</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full p-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="text-sm font-bold block mb-1">SKU</label>
                            <input type="text" name="sku" value={formData.sku || ''} onChange={handleChange} required disabled={isEditing} className="w-full p-2 border rounded-md disabled:bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold block mb-1">Regular Price ($)</label>
                                <input type="number" name="regularPrice" value={formData.regularPrice || ''} onChange={handleChange} required 
                                readOnly={formData.type === 'bundle'}
                                className="w-full p-2 border rounded-md read-only:bg-slate-200" step="0.01" min="0" />
                            </div>
                            <div>
                                <label className="text-sm font-bold block mb-1">Sale Price ($)</label>
                                <input type="number" name="salePrice" value={formData.salePrice || ''} onChange={handleChange} placeholder="Optional" className="w-full p-2 border rounded-md" step="0.01" min="0" />
                            </div>
                        </div>

                        {formData.type === 'subscription' && (
                            <div className="p-4 border-t border-[rgb(var(--color-border-rgb))] mt-4 space-y-4">
                                <h4 className="font-semibold">Subscription Details</h4>
                                 <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-bold block mb-1">Price ($)</label>
                                        <input type="number" name="subscriptionPrice" value={formData.subscriptionPrice || ''} onChange={handleChange} className="w-full p-2 border rounded-md" step="0.01" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold block mb-1">Period</label>
                                        <select name="subscriptionPeriod" value={formData.subscriptionPeriod || 'month'} onChange={handleChange} className="w-full p-2 border rounded-md">
                                            <option value="day">Day</option>
                                            <option value="week">Week</option>
                                            <option value="month">Month</option>
                                            <option value="year">Year</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold block mb-1">Interval</label>
                                        <input type="number" name="subscriptionPeriodInterval" value={formData.subscriptionPeriodInterval || '1'} onChange={handleChange} min="1" className="w-full p-2 border rounded-md" />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-sm font-bold block mb-1">Length (0 for until cancelled)</label>
                                    <input type="text" name="subscriptionLength" value={formData.subscriptionLength || '0'} onChange={handleChange} placeholder="e.g., 0, 12 month" className="w-full p-2 border rounded-md" />
                                </div>
                            </div>
                        )}
                        
                        {formData.type === 'bundle' && (
                            <div className="p-4 border-t border-[rgb(var(--color-border-rgb))] mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">Bundle Contents</h4>
                                    <span className="text-sm font-bold">Total Value: ${totalBundleValue.toFixed(2)}</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-slate-100 rounded-md">
                                    {simpleAndSubProducts.map(p => (
                                        <label key={p.sku} className="flex items-center gap-2 text-sm p-1">
                                            <input
                                                type="checkbox"
                                                checked={(formData.bundledSkus || []).includes(p.sku)}
                                                onChange={() => handleBundleChange(p.sku)}
                                            />
                                            <span>{stripHtml(p.name)} (${p.regularPrice || p.salePrice})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 p-4 border-t border-[rgb(var(--color-border-rgb))]">
                        <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-300">Cancel</button>
                        <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-600 disabled:bg-slate-400">
                            {isSaving ? <Spinner /> : <Save size={16} />} Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- TAB BUTTON ---
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


// --- MAIN COMPONENT ---
const ProductCustomizer: FC = () => {
    const { activeOrg, examPrices, updateConfigData } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<EditorState | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingSku, setDeletingSku] = useState<string | null>(null);

    const products = useMemo(() => {
        if (!examPrices || !activeOrg) return { all: [], simple: [], subscription: [], bundle: [] };
        
        const allProducts = Object.entries(examPrices).map(([sku, data]: [string, any]): ProductVariation => {
            const isActuallyBundle = data.isBundle || (Array.isArray(data.bundledSkus) && data.bundledSkus.length > 0);
            return {
                id: data.productId?.toString(),
                name: data.name,
                sku,
                type: isActuallyBundle ? 'bundle' : (data.type || 'simple'),
                regularPrice: data.regularPrice?.toString() ?? '',
                salePrice: data.price?.toString() ?? '',
                isBundle: isActuallyBundle,
                bundledSkus: data.bundledSkus || [],
                subscriptionPrice: data.subscription_price,
                subscriptionPeriod: data.subscription_period,
                subscriptionPeriodInterval: data.subscription_period_interval,
                subscriptionLength: data.subscription_length,
            };
        });
        allProducts.sort((a,b) => (stripHtml(a.name) || '').localeCompare(stripHtml(b.name) || ''));

        return {
            all: allProducts,
            simple: allProducts.filter(p => p.type === 'simple' && !p.isBundle),
            subscription: allProducts.filter(p => p.type === 'subscription'),
            bundle: allProducts.filter(p => p.isBundle),
        };
    }, [examPrices, activeOrg]);

    const productsToDisplay = activeTab === 'all' ? products.all : products[activeTab];

    const handleCreate = () => {
        setEditingProduct({ type: 'simple' });
        setIsModalOpen(true);
    };

    const handleEdit = (product: ProductVariation) => {
        setEditingProduct({ ...product, type: product.type || 'simple' });
        setIsModalOpen(true);
    };

    const handleDelete = async (productId: string, productName: string) => {
        if (!token) { toast.error("Authentication Error"); return; }
        if (!window.confirm(`Are you sure you want to delete "${stripHtml(productName)}"? This action cannot be undone.`)) return;

        setDeletingSku(productId);
        try {
            const result = await googleSheetsService.adminDeletePost(token, productId, 'product');
            updateConfigData(result.organizations, result.examPrices);
            toast.success(`Product "${stripHtml(productName)}" deleted.`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete product.');
        } finally {
            setDeletingSku(null);
        }
    };
    
    const handleSave = async (productData: EditorState) => {
        if (!token) { toast.error("Authentication Error"); return; }
        setIsSaving(true);

        const apiPayload: any = {
            id: productData.id,
            name: productData.name,
            sku: productData.sku,
            type: productData.type,
            regular_price: productData.regularPrice,
            sale_price: productData.salePrice,
            isBundle: productData.type === 'bundle',
            bundledSkus: productData.type === 'bundle' ? (productData.bundledSkus || []) : undefined,
            // Add subscription fields if applicable
            ... (productData.type === 'subscription' && {
                subscription_price: productData.subscriptionPrice,
                subscription_period: productData.subscriptionPeriod,
                subscription_period_interval: productData.subscriptionPeriodInterval,
                subscription_length: productData.subscriptionLength,
            })
        };

        try {
            const result = await googleSheetsService.adminUpsertProduct(token, apiPayload);
            updateConfigData(result.organizations, result.examPrices);
            toast.success("Product saved successfully!");
            setIsModalOpen(false);
            setEditingProduct(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save product.');
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <>
            {isModalOpen && (
                <ProductEditorModal 
                    product={editingProduct}
                    allProducts={products.all}
                    onSave={handleSave}
                    onCancel={() => { setIsModalOpen(false); setEditingProduct(null); }}
                    isSaving={isSaving}
                />
            )}

            <div className="space-y-8">
                <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                    <ShoppingCart />
                    Product Customizer
                </h1>

                <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>All ({products.all.length})</TabButton>
                            <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')}>Simple ({products.simple.length})</TabButton>
                            <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}>Subscriptions ({products.subscription.length})</TabButton>
                            <TabButton active={activeTab === 'bundle'} onClick={() => setActiveTab('bundle')}>Bundles ({products.bundle.length})</TabButton>
                        </div>
                        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition">
                            <PlusCircle size={18}/> Create New Product
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {productsToDisplay.map(product => (
                            <div key={product.sku} className="editable-card">
                                <div className="editable-card__header">
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-lg text-[rgb(var(--color-text-strong-rgb))]">{stripHtml(product.name)}</h3>
                                        <p className="text-xs font-mono text-[rgb(var(--color-text-muted-rgb))]">{product.sku}</p>
                                    </div>
                                    <div className="flex-shrink-0 flex gap-1">
                                        <button onClick={() => handleEdit(product)} className="p-2 rounded-full hover:bg-[rgb(var(--color-muted-rgb))]"><Edit size={16}/></button>
                                        {product.id && (
                                            <button onClick={() => handleDelete(product.id!, product.name)} disabled={deletingSku === product.id} className="p-2 rounded-full text-red-500 hover:bg-red-100 disabled:text-slate-400">
                                                {deletingSku === product.id ? <Spinner size="sm" /> : <Trash2 size={16}/>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="editable-card__content text-sm">
                                    <div className="flex justify-between"><span>Type:</span> <span className="font-semibold capitalize">{product.type || 'simple'}</span></div>
                                    <div className="flex justify-between"><span>Sale Price:</span> <span className="font-semibold">${product.salePrice}</span></div>
                                    {product.regularPrice && parseFloat(product.regularPrice) > 0 && parseFloat(product.regularPrice) > parseFloat(product.salePrice) && (
                                        <div className="flex justify-between"><span>Regular Price:</span> <span className="font-semibold line-through">${product.regularPrice}</span></div>
                                    )}
                                    {product.isBundle && product.bundledSkus && (
                                        <div className="mt-2 pt-2 border-t border-[rgb(var(--color-border-rgb))]">
                                            <p className="font-semibold text-xs mb-1">Bundled SKUs:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {product.bundledSkus.map(sku => <span key={sku} className="text-xs font-mono bg-[rgb(var(--color-card-rgb))] px-1.5 py-0.5 rounded">{sku}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {productsToDisplay.length === 0 && (
                        <div className="text-center py-8 text-[rgb(var(--color-text-muted-rgb))]">
                            <p>No products to display in this category.</p>
                            <button onClick={handleCreate} className="mt-4 text-sm font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline">Create one now</button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ProductCustomizer;