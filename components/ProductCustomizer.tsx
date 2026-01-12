import React, { FC, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
// FIX: Standardized named import from react-router-dom using single quotes.
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ProductVariation, ProductVariationType, BillingPeriod } from '../types.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, RefreshCw, Trash2, PlusCircle } from 'lucide-react';
import Spinner from './Spinner.tsx';

type TabType = 'all' | 'simple' | 'subscription' | 'bundle';

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

interface UpsertBundleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: any) => Promise<void>;
    isSaving: boolean;
    productToEdit?: Partial<ProductVariation> | null;
    simpleProducts: ProductVariation[];
    subscriptionProducts: ProductVariation[];
}

const UpsertBundleModal: FC<UpsertBundleModalProps> = ({ isOpen, onClose, onSave, isSaving, productToEdit, simpleProducts, subscriptionProducts }) => {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('');
    const [regularPrice, setRegularPrice] = useState('');
    const [selectedSimpleSkus, setSelectedSimpleSkus] = useState<string[]>([]);
    const [selectedSubscriptionSku, setSelectedSubscriptionSku] = useState<string>('');
    
    useEffect(() => {
        if (isOpen) {
            if (productToEdit && productToEdit.sku) { // Editing existing bundle
                setName(productToEdit.name || '');
                setSku(productToEdit.sku || '');
                setPrice(productToEdit.salePrice?.toString() || '');
                setRegularPrice(productToEdit.regularPrice?.toString() || '');

                const bundled = productToEdit.bundledSkus || [];
                const simple = bundled.filter(s => !s.startsWith('sub-'));
                const sub = bundled.find(s => s.startsWith('sub-'));

                setSelectedSimpleSkus(simple);
                setSelectedSubscriptionSku(sub || '');
            } else { // Creating new bundle
                setName('');
                setSku('');
                setPrice('');
                setRegularPrice('');
                setSelectedSimpleSkus([]);
                setSelectedSubscriptionSku('');
            }
        }
    }, [isOpen, productToEdit]);


    if (!isOpen) return null;

    const handleSave = () => {
        if (!name || !sku || !price) {
            toast.error("Name, SKU, and Sale Price are required.");
            return;
        }
        if (selectedSimpleSkus.length === 0) {
            toast.error("Please select at least one exam for the bundle.");
            return;
        }
        const bundled_skus = [...selectedSimpleSkus];
        if (selectedSubscriptionSku) {
            bundled_skus.push(selectedSubscriptionSku);
        }

        onSave({
            name,
            sku,
            price: parseFloat(price),
            regularPrice: parseFloat(regularPrice) || parseFloat(price),
            isBundle: true,
            bundled_skus,
        });
    };
    
    const handleSimpleProductToggle = (selectedSku: string) => {
        setSelectedSimpleSkus(prev => 
            prev.includes(selectedSku) 
                ? prev.filter(sku => sku !== selectedSku) 
                : [...prev, selectedSku]
        );
    };
    
    const selectedItems = useMemo(() => {
        const items = simpleProducts.filter(p => selectedSimpleSkus.includes(p.sku));
        const sub = subscriptionProducts.find(p => p.sku === selectedSubscriptionSku);
        if (sub) {
            items.push(sub);
        }
        return items;
    }, [selectedSimpleSkus, selectedSubscriptionSku, simpleProducts, subscriptionProducts]);

    const totalRegularPrice = useMemo(() => {
        return selectedItems.reduce((acc, item) => acc + (parseFloat(item.regularPrice) || 0), 0);
    }, [selectedItems]);


    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4 flex-shrink-0">{productToEdit?.sku ? 'Edit Bundle' : 'Create New Bundle'}</h2>
                
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {/* --- Product Details --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Bundle Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CPC Exam Power Pack" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">SKU</label>
                            <input type="text" value={sku} onChange={e => setSku(e.target.value)} disabled={!!productToEdit?.sku} placeholder="e.g. exam-cpc-bundle-1" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))] disabled:opacity-70" />
                        </div>
                    </div>
                    
                    {/* --- Component Selection --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg bg-[rgb(var(--color-muted-rgb))]">
                            <h3 className="font-semibold mb-2">Included Exams</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                {simpleProducts.map(p => (
                                    <label key={p.sku} className="flex items-center justify-between gap-2 p-2 rounded bg-[rgb(var(--color-card-rgb))] cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedSimpleSkus.includes(p.sku)} onChange={() => handleSimpleProductToggle(p.sku)} />
                                            <span className="truncate" title={p.name}>{p.name}</span>
                                        </div>
                                        <span className="text-xs font-mono text-[rgb(var(--color-text-muted-rgb))] flex-shrink-0">{p.sku}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                         <div className="p-3 border rounded-lg bg-[rgb(var(--color-muted-rgb))]">
                             <h3 className="font-semibold mb-2">Included Subscription</h3>
                            <select value={selectedSubscriptionSku} onChange={e => setSelectedSubscriptionSku(e.target.value)} className="w-full p-2 border rounded bg-white">
                                <option value="">None</option>
                                {subscriptionProducts.map(s => <option key={s.sku} value={s.sku}>{s.name} ({s.sku})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* --- Pricing --- */}
                    {selectedItems.length > 0 && (
                        <div className="p-4 border-dashed border-2 rounded-lg border-[rgb(var(--color-border-rgb))]">
                             <h3 className="font-semibold mb-2">Selected Items (Total Value: ${totalRegularPrice.toFixed(2)})</h3>
                             <ul className="text-sm space-y-1">
                                {selectedItems.map(item => (
                                    <li key={item.sku} className="flex justify-between">
                                        <span className="truncate" title={item.name}>{item.name} <span className="text-xs font-mono text-[rgb(var(--color-text-muted-rgb))]">({item.sku})</span></span>
                                        <span className="font-mono">${parseFloat(item.regularPrice).toFixed(2)}</span>
                                    </li>
                                ))}
                             </ul>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Bundle Sale Price</label>
                            <input type="number" placeholder="e.g., 59.99" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Bundle Regular Price</label>
                            <input type="number" placeholder="e.g., 89.99" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                    </div>
                </div>

                {/* --- Actions --- */}
                <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                        {isSaving ? <Spinner /> : <Save size={16} />} {productToEdit?.sku ? 'Save Changes' : 'Create Bundle'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface UpsertSimpleProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: any) => Promise<void>;
    isSaving: boolean;
    productToEdit?: Partial<ProductVariation> | null;
}

const UpsertSimpleProductModal: FC<UpsertSimpleProductModalProps> = ({ isOpen, onClose, onSave, isSaving, productToEdit }) => {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('');
    const [regularPrice, setRegularPrice] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (productToEdit && productToEdit.sku) { // Check if we are editing
                setName(productToEdit.name || '');
                setSku(productToEdit.sku || '');
                setPrice(productToEdit.salePrice?.toString() || '');
                setRegularPrice(productToEdit.regularPrice?.toString() || '');
            } else { // We are creating
                setName('');
                setSku('');
                setPrice('');
                setRegularPrice('');
            }
        }
    }, [isOpen, productToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name || !sku || !price) {
            toast.error("Name, SKU, and Sale Price are required.");
            return;
        }
        onSave({ name, sku, price: parseFloat(price), regularPrice: parseFloat(regularPrice) || parseFloat(price) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-lg p-6">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">{productToEdit?.sku ? 'Edit Simple Product' : 'Create New Simple Product'}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Product Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CPC Certification Exam" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">SKU</label>
                        <input type="text" value={sku} onChange={e => setSku(e.target.value)} disabled={!!productToEdit?.sku} placeholder="e.g. exam-cpc-cert" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))] disabled:opacity-70" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Sale Price</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 49.99" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Regular Price</label>
                            <input type="number" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} placeholder="e.g., 79.99" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                        {isSaving ? <Spinner /> : <Save size={16} />} {productToEdit?.sku ? 'Save Changes' : 'Create Product'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface UpsertSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: any) => Promise<void>;
    isSaving: boolean;
    productToEdit?: Partial<ProductVariation> | null;
}

const UpsertSubscriptionModal: FC<UpsertSubscriptionModalProps> = ({ isOpen, onClose, onSave, isSaving, productToEdit }) => {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('');
    const [regularPrice, setRegularPrice] = useState('');
    const [period, setPeriod] = useState<BillingPeriod>('month');
    const [interval, setInterval] = useState('1');
    const [length, setLength] = useState('0');

    useEffect(() => {
        if (isOpen) {
            if (productToEdit && productToEdit.sku) {
                setName(productToEdit.name || '');
                setSku(productToEdit.sku || '');
                setPrice(productToEdit.salePrice?.toString() || '');
                setRegularPrice(productToEdit.regularPrice?.toString() || '');
                // FIX: Cast productToEdit.subscriptionPeriod to BillingPeriod to resolve type error.
                setPeriod(productToEdit.subscriptionPeriod as BillingPeriod || 'month');
                setInterval(productToEdit.subscriptionPeriodInterval || '1');
                setLength(productToEdit.subscriptionLength || '0');
            } else {
                setName('Monthly Subscription');
                setSku('sub-monthly');
                setPrice('19.99');
                setRegularPrice('29.99');
                setPeriod('month');
                setInterval('1');
                setLength('0');
            }
        }
    }, [isOpen, productToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name || !sku || !price || !period || !interval) {
            toast.error("All fields except regular price & length are required.");
            return;
        }
        onSave({
            name, sku,
            price: parseFloat(price),
            regularPrice: parseFloat(regularPrice) || parseFloat(price),
            subscription_period: period,
            subscription_period_interval: interval,
            subscription_length: length,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-2xl p-6">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">{productToEdit?.sku ? 'Edit Subscription' : 'Create New Subscription'}</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Subscription Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">SKU</label>
                            <input type="text" value={sku} onChange={e => setSku(e.target.value)} disabled={!!productToEdit?.sku} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))] disabled:opacity-70" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Sale Price</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Regular Price</label>
                            <input type="number" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Billing Period</label>
                            {/* FIX: Cast e.target.value to BillingPeriod to resolve type error */}
                            <select value={period} onChange={e => setPeriod(e.target.value as BillingPeriod)} className="w-full p-2 mt-1 border rounded bg-white">
                                <option value="day">Day</option>
                                <option value="week">Week</option>
                                <option value="month">Month</option>
                                <option value="year">Year</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Billing Interval</label>
                            <input type="number" value={interval} onChange={e => setInterval(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Length (0=forever)</label>
                            <input type="number" value={length} onChange={e => setLength(e.target.value)} className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                        {isSaving ? <Spinner /> : <Save size={16} />} {productToEdit?.sku ? 'Save Changes' : 'Create Subscription'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const BulkEditPanel: FC<{
    selectedCount: number;
    onSave: (salePrice: string, regularPrice: string) => void;
    onCancel: () => void;
    isSaving: boolean;
}> = ({ selectedCount, onSave, onCancel, isSaving }) => {
    const [salePrice, setSalePrice] = useState('');
    const [regularPrice, setRegularPrice] = useState('');

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg border border-[rgb(var(--color-primary-rgb))] space-y-4 mb-4">
            <h3 className="font-bold text-lg">Bulk Edit {selectedCount} Products</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-bold">New Sale Price</label>
                    <input
                        type="number"
                        value={salePrice}
                        onChange={e => setSalePrice(e.target.value)}
                        placeholder="Leave blank to keep unchanged"
                        className="w-full p-2 mt-1 border rounded bg-white"
                    />
                </div>
                <div>
                    <label className="text-sm font-bold">New Regular Price</label>
                    <input
                        type="number"
                        value={regularPrice}
                        onChange={e => setRegularPrice(e.target.value)}
                        placeholder="Leave blank to keep unchanged"
                        className="w-full p-2 mt-1 border rounded bg-white"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-300">Cancel</button>
                <button onClick={() => onSave(salePrice, regularPrice)} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-600 disabled:bg-slate-400">
                    {isSaving ? <Spinner /> : <Save size={16} />} Apply Changes
                </button>
            </div>
        </div>
    );
};


const ProductCustomizer: FC = () => {
    const { examPrices, refreshConfig } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    
    const [modalState, setModalState] = useState<{ type: TabType | null; product?: ProductVariation }>({ type: null });
    const [isSaving, setIsSaving] = useState(false);

    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    useEffect(() => {
        setSelectedSkus([]);
    }, [activeTab]);
    
    const { allProducts, simpleProducts, subscriptionProducts, bundleProducts } = useMemo(() => {
        if (!examPrices) {
            return { allProducts: [], simpleProducts: [], subscriptionProducts: [], bundleProducts: [] };
        }

        const all: ProductVariation[] = [];
        const simples: ProductVariation[] = [];
        const subs: ProductVariation[] = [];
        const bundles: ProductVariation[] = [];

        Object.entries(examPrices).forEach(([sku, priceData]: [string, any]) => {
            if (!priceData || typeof priceData !== 'object') {
                console.warn('Skipping invalid product data entry for SKU:', sku);
                return;
            }

            const product: ProductVariation = {
                id: priceData.productId?.toString() || sku,
                sku: sku,
                name: priceData.name || 'Unknown Product',
                type: 'simple',
                salePrice: priceData.price?.toString() || '0',
                regularPrice: priceData.regularPrice?.toString() || '0',
                isBundle: priceData.isBundle,
                bundledSkus: priceData.bundledSkus,
                subscriptionPeriod: priceData.subscription_period,
                subscriptionPeriodInterval: priceData.subscription_period_interval?.toString(),
                subscriptionLength: priceData.subscription_length?.toString(),
            };
            
            all.push(product);

            if (product.isBundle) {
                product.type = 'bundle';
                bundles.push(product);
            } else if (product.subscriptionPeriod) {
                product.type = 'subscription';
                subs.push(product);
            } else {
                simples.push(product);
            }
        });
        
        return { allProducts: all, simpleProducts: simples, subscriptionProducts: subs, bundleProducts: bundles };
    }, [examPrices]);

    // FIX: Completed missing handleSave logic to persist changes and refresh the application state.
    const handleSave = async (productData: any) => {
        if (!token) return;
        setIsSaving(true);
        const tid = toast.loading("Saving changes to store...");
        try {
            await googleSheetsService.adminUpsertProduct(token, productData);
            toast.success("Product updated successfully!", { id: tid });
            setModalState({ type: null });
            await refreshConfig();
        } catch (e: any) {
            toast.error(e.message || "Failed to save product", { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    // FIX: Completed missing handleBulkSave logic to update multiple products in batch.
    const handleBulkSave = async (sale: string, regular: string) => {
        if (!token || selectedSkus.length === 0) return;
        setIsBulkSaving(true);
        const toastId = toast.loading(`Updating ${selectedSkus.length} products...`);
        try {
            for (const sku of selectedSkus) {
                const p = allProducts.find(p => p.sku === sku);
                if (p) {
                    const updateData: any = {
                        sku: p.sku,
                        name: p.name,
                        price: sale ? parseFloat(sale) : parseFloat(p.salePrice),
                        regularPrice: regular ? parseFloat(regular) : parseFloat(p.regularPrice)
                    };
                    // Preserve subscription metadata if applicable
                    if (p.type === 'subscription') {
                        updateData.subscription_period = p.subscriptionPeriod;
                        updateData.subscription_period_interval = p.subscriptionPeriodInterval;
                        updateData.subscription_length = p.subscriptionLength;
                    }
                    // Preserve bundle metadata if applicable
                    if (p.type === 'bundle') {
                        updateData.isBundle = true;
                        updateData.bundled_skus = p.bundledSkus;
                    }
                    await googleSheetsService.adminUpsertProduct(token, updateData);
                }
            }
            toast.success("Bulk update successful!", { id: toastId });
            setSelectedSkus([]);
            await refreshConfig();
        } catch (e: any) {
            toast.error(e.message || "Bulk update failed", { id: toastId });
        } finally {
            setIsBulkSaving(false);
        }
    };

    const filteredProducts = useMemo(() => {
        if (activeTab === 'all') return allProducts;
        if (activeTab === 'simple') return simpleProducts;
        if (activeTab === 'subscription') return subscriptionProducts;
        if (activeTab === 'bundle') return bundleProducts;
        return [];
    }, [activeTab, allProducts, simpleProducts, subscriptionProducts, bundleProducts]);

    // FIX: Added missing return statement to fix 'Type () => void is not assignable to type FC' error.
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                    <ShoppingCart /> Product Customizer
                </h1>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setModalState({ type: 'simple' })} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition shadow-sm"><PlusCircle size={18}/> New Simple</button>
                    <button onClick={() => setModalState({ type: 'subscription' })} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition shadow-sm"><PlusCircle size={18}/> New Sub</button>
                    <button onClick={() => setModalState({ type: 'bundle' })} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition shadow-sm"><PlusCircle size={18}/> New Bundle</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-[rgb(var(--color-border-rgb))] pb-4">
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>All Products ({allProducts.length})</TabButton>
                <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')}>Single Exams ({simpleProducts.length})</TabButton>
                <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}>Subscriptions ({subscriptionProducts.length})</TabButton>
                <TabButton active={activeTab === 'bundle'} onClick={() => setActiveTab('bundle')}>Bundles ({bundleProducts.length})</TabButton>
            </div>

            {selectedSkus.length > 0 && (
                <BulkEditPanel selectedCount={selectedSkus.length} isSaving={isBulkSaving} onCancel={() => setSelectedSkus([])} onSave={handleBulkSave} />
            )}

            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-muted-rgb))] uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        onChange={e => setSelectedSkus(e.target.checked ? filteredProducts.map(p => p.sku) : [])} 
                                        checked={filteredProducts.length > 0 && selectedSkus.length === filteredProducts.length} 
                                    />
                                </th>
                                <th className="p-4">Product Name / SKU</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Price</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--color-border-rgb))]">
                            {filteredProducts.map(p => (
                                <tr key={p.sku} className="hover:bg-[rgba(var(--color-primary-rgb),0.02)] transition-colors">
                                    <td className="p-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedSkus.includes(p.sku)} 
                                            onChange={() => setSelectedSkus(prev => prev.includes(p.sku) ? prev.filter(s => s !== p.sku) : [...prev, p.sku])} 
                                        />
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-[rgb(var(--color-text-strong-rgb))]">{p.name}</p>
                                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{p.sku}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            p.type === 'bundle' ? 'bg-purple-100 text-purple-600' : 
                                            p.type === 'subscription' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {p.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-base">${parseFloat(p.salePrice).toFixed(2)}</span>
                                            {parseFloat(p.regularPrice) > parseFloat(p.salePrice) && (
                                                <span className="text-xs line-through text-slate-400">${parseFloat(p.regularPrice).toFixed(2)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setModalState({ type: p.type as TabType, product: p })} className="p-2 text-slate-400 hover:text-[rgb(var(--color-primary-rgb))] hover:bg-[rgba(var(--color-primary-rgb),0.1)] rounded-lg transition-all">
                                            <Edit size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic bg-white">
                        No products found in this category.
                    </div>
                )}
            </div>

            <UpsertSimpleProductModal 
                isOpen={modalState.type === 'simple'} 
                productToEdit={modalState.product} 
                isSaving={isSaving} 
                onClose={() => setModalState({ type: null })} 
                onSave={handleSave} 
            />
            <UpsertSubscriptionModal 
                isOpen={modalState.type === 'subscription'} 
                productToEdit={modalState.product} 
                isSaving={isSaving} 
                onClose={() => setModalState({ type: null })} 
                onSave={handleSave} 
            />
            <UpsertBundleModal 
                isOpen={modalState.type === 'bundle'} 
                productToEdit={modalState.product} 
                isSaving={isSaving} 
                onClose={() => setModalState({ type: null })} 
                onSave={handleSave} 
                simpleProducts={simpleProducts} 
                subscriptionProducts={subscriptionProducts} 
            />
        </div>
    );
};

// FIX: Added missing default export to satisfy module requirements in App.tsx.
export default ProductCustomizer;