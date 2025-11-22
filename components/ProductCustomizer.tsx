import React, { FC, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
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
                setPeriod(productToEdit.subscriptionPeriod || 'month');
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
    const { examPrices, updateConfigData } = useAppContext();
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
            } else if (priceData.type?.includes('subscription') || product.sku.startsWith('sub-')) {
                product.type = 'subscription';
                subs.push(product);
            } else {
                product.type = 'simple';
                simples.push(product);
            }
        });
        
        const sortByName = (a: ProductVariation, b: ProductVariation) => (a.name || '').localeCompare(b.name || '');

        return { 
            allProducts: all.sort(sortByName), 
            simpleProducts: simples.sort(sortByName), 
            subscriptionProducts: subs.sort(sortByName), 
            bundleProducts: bundles.sort(sortByName)
        };
    }, [examPrices]);
    
    const productMap = useMemo(() => {
        const map = new Map<string, ProductVariation>();
        allProducts.forEach(p => map.set(p.sku, p));
        return map;
    }, [allProducts]);

    const handleUpsert = async (productData: any, type: 'Bundle' | 'Product' | 'Subscription') => {
        if (!token) {
            toast.error("Authentication error.");
            return;
        }

        setIsSaving(true);
        try {
            await googleSheetsService.adminUpsertProduct(token, productData);
            toast.success(`${type} "${productData.name}" saved successfully! Refreshing data...`, { duration: 4000 });
            setModalState({ type: null });
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            toast.error(error.message || `Failed to save ${type.toLowerCase()}.`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkUpdate = async (salePrice: string, regularPrice: string) => {
        if (!token) {
            toast.error("Authentication error.");
            return;
        }
        if (selectedSkus.length === 0) return;
        if (!salePrice && !regularPrice) {
            toast.error("Please enter a sale price or a regular price to update.");
            return;
        }

        setIsBulkSaving(true);
        const toastId = toast.loading(`Updating ${selectedSkus.length} products...`);
        
        try {
            for (const sku of selectedSkus) {
                const productData: any = { sku };
                if (salePrice) productData.price = parseFloat(salePrice);
                if (regularPrice) productData.regularPrice = parseFloat(regularPrice);
                await googleSheetsService.adminUpsertProduct(token, productData);
            }

            toast.success(`${selectedSkus.length} products updated! Refreshing data...`, { id: toastId, duration: 4000 });
            setSelectedSkus([]);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            toast.error(error.message || "An error occurred during bulk update.", { id: toastId });
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleDeleteProduct = async (product: ProductVariation) => {
        if (!token) {
            toast.error("Authentication error.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action will move the product to the trash in WooCommerce.`)) {
            return;
        }

        setIsSaving(true);
        try {
            await googleSheetsService.adminDeletePost(token, product.id, 'product');
            toast.success(`Product "${product.name}" was moved to trash. Refreshing data...`, { duration: 4000 });
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete product.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>, products: ProductVariation[]) => {
        if (e.target.checked) {
            setSelectedSkus(products.map(p => p.sku));
        } else {
            setSelectedSkus([]);
        }
    }, []);

    const handleSelectOne = useCallback((sku: string, isSelected: boolean) => {
        setSelectedSkus(currentSkus => {
            const newSkus = new Set(currentSkus);
            if (isSelected) {
                newSkus.add(sku);
            } else {
                newSkus.delete(sku);
            }
            return Array.from(newSkus);
        });
    }, []);

    const handleDoubleClickSelect = useCallback((sku: string) => {
        const isCurrentlySelected = selectedSkus.includes(sku);
        handleSelectOne(sku, !isCurrentlySelected);
    }, [selectedSkus, handleSelectOne]);
    
    const handleOpenEditor = (product: ProductVariation) => {
        setModalState({ type: product.type as TabType, product });
    };

    const handleOpenCreator = () => {
        if (activeTab === 'all') return;
        setModalState({ type: activeTab });
    };

    const renderProducts = (products: ProductVariation[]) => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map(product => (
                    <div
                        key={product.sku}
                        className={`editable-card ${selectedSkus.includes(product.sku) ? 'editable-card--selected' : ''}`}
                        onDoubleClick={() => handleDoubleClickSelect(product.sku)}
                    >
                        <div className="editable-card__header">
                            <div className="flex items-center gap-3 flex-grow">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded text-[rgb(var(--color-primary-rgb))] focus:ring-[rgb(var(--color-primary-rgb))]"
                                    checked={selectedSkus.includes(product.sku)}
                                    onChange={e => handleSelectOne(product.sku, e.target.checked)}
                                />
                                <div className="flex-grow cursor-pointer group" onClick={() => handleOpenEditor(product)}>
                                    <h3 className="font-bold text-base text-[rgb(var(--color-text-strong-rgb))] leading-tight group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">{product.name}</h3>
                                    <p className="text-xs text-[rgb(var(--color-text-muted-rgb))]">SKU: {product.sku}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleOpenEditor(product)} className="p-2 rounded-full hover:bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteProduct(product)} className="p-2 rounded-full text-red-500 hover:bg-red-100" title="Delete Product">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="editable-card__content !p-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Price</span>
                                <div className="text-right">
                                    {parseFloat(product.regularPrice) > parseFloat(product.salePrice) && (
                                        <span className="text-base line-through text-[rgb(var(--color-text-muted-rgb))]">${parseFloat(product.regularPrice).toFixed(2)}</span>
                                    )}
                                    <span className="font-bold text-2xl text-[rgb(var(--color-text-strong-rgb))] ml-2">${parseFloat(product.salePrice).toFixed(2)}</span>
                                </div>
                            </div>
                            {product.type === 'bundle' && product.bundledSkus && product.bundledSkus.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-[rgb(var(--color-border-rgb))]">
                                    <h4 className="text-xs font-bold text-[rgb(var(--color-text-muted-rgb))] mb-2 uppercase tracking-wider">Includes:</h4>
                                    <ul className="text-sm space-y-1.5 text-[rgb(var(--color-text-default-rgb))]">
                                        {product.bundledSkus.map(sku => {
                                            const bundledProduct = productMap.get(sku);
                                            const isSub = bundledProduct?.type === 'subscription';
                                            return (
                                                <li key={sku} className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSub ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                                    <span className="flex-grow truncate" title={bundledProduct ? bundledProduct.name : sku}>
                                                        {bundledProduct ? bundledProduct.name : sku}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    
    const renderContent = () => {
        let products: ProductVariation[] = [];
        let title = '';
        
        switch (activeTab) {
            case 'all': products = allProducts; title = 'All Products'; break;
            case 'simple': products = simpleProducts; title = 'Simple Products'; break;
            case 'subscription': products = subscriptionProducts; title = 'Subscription Products'; break;
            case 'bundle': products = bundleProducts; title = 'Bundle Products'; break;
        }
        
        const isAllSelected = products.length > 0 && selectedSkus.length === products.length;
        const canCreateNew = activeTab !== 'all';

        return (
            <div>
                 {selectedSkus.length > 0 && (
                    <BulkEditPanel
                        selectedCount={selectedSkus.length}
                        onSave={handleBulkUpdate}
                        onCancel={() => setSelectedSkus([])}
                        isSaving={isBulkSaving}
                    />
                 )}
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold">{title} ({products.length})</h3>
                    <button 
                        onClick={handleOpenCreator} 
                        className={`flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600 ${!canCreateNew ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!canCreateNew}
                        title={!canCreateNew ? 'Please select a specific tab to create a new product' : 'Create New'}
                    >
                        <PlusCircle size={16}/> Create New
                    </button>
                </div>
                
                 {products.length > 0 && (
                     <div className="flex items-center p-2 mb-4 border-b border-[rgb(var(--color-border-rgb))]">
                        <label className="flex items-center gap-4 cursor-pointer">
                            <input type="checkbox" onChange={(e) => handleSelectAll(e, products)} checked={isAllSelected} className="h-4 w-4 rounded text-[rgb(var(--color-primary-rgb))] focus:ring-[rgb(var(--color-primary-rgb))]"/>
                            <span className="font-semibold text-sm">Select All ({selectedSkus.length} / {products.length})</span>
                        </label>
                    </div>
                )}

                {products.length > 0 ? renderProducts(products) : <p className="text-center p-4 text-slate-500">No {activeTab} products found.</p>}
            </div>
        );
    };

    const getModalForProduct = () => {
        if (!modalState.type) return null;
        
        switch (modalState.type) {
            case 'simple':
                return <UpsertSimpleProductModal 
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    onSave={(data) => handleUpsert(data, 'Product')}
                    isSaving={isSaving}
                    productToEdit={modalState.product}
                />;
            case 'subscription':
                return <UpsertSubscriptionModal
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    onSave={(data) => handleUpsert(data, 'Subscription')}
                    isSaving={isSaving}
                    productToEdit={modalState.product}
                />;
            case 'bundle':
                 return <UpsertBundleModal 
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    onSave={(data) => handleUpsert(data, 'Bundle')}
                    isSaving={isSaving}
                    productToEdit={modalState.product}
                    simpleProducts={simpleProducts}
                    subscriptionProducts={subscriptionProducts}
                />;
            default:
                return null;
        }
    }

    return (
         <div className="space-y-8">
            {getModalForProduct()}

            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><ShoppingCart /> Product Customizer</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">Manage your exam products and pricing. Changes made here are saved live to your WooCommerce store.</p>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex space-x-2 mb-4">
                    <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>All Products</TabButton>
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