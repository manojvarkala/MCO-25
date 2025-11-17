

import React, { FC, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ProductVariation, ProductVariationType, BillingPeriod, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, RefreshCw, Trash2, PlusCircle } from 'lucide-react';
import Spinner from './Spinner.tsx';

type TabType = 'all' | 'simple' | 'subscription' | 'bundle';

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        console.error("Could not parse HTML string for stripping", e);
        return html;
    }
};

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
                const simple = bundled.filter(s => simpleProducts.some(p => p.sku === s));
                const sub = bundled.find(s => subscriptionProducts.some(p => p.sku === s));

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
    }, [isOpen, productToEdit, simpleProducts, subscriptionProducts]);


    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim() || !sku.trim() || price.trim() === '' || isNaN(parseFloat(price))) {
            toast.error("Name, SKU, and a valid Sale Price are required.");
            return;
        }
        if (selectedSimpleSkus.length === 0 && !selectedSubscriptionSku) {
            toast.error("Please select at least one item for the bundle.");
            return;
        }
        const bundled_skus = [...selectedSimpleSkus];
        if (selectedSubscriptionSku) {
            bundled_skus.push(selectedSubscriptionSku);
        }
        
        const payload: any = {
            post_title: name.trim(),
            sku: sku.trim(),
            sale_price: parseFloat(price),
            isBundle: true,
            bundled_skus,
        };

        const regPriceNum = parseFloat(regularPrice);
        if (productToEdit?.sku) { // Editing
            payload.regular_price = (regularPrice.trim() !== '' && !isNaN(regPriceNum)) ? regPriceNum : '';
        } else { // Creating
            if (regularPrice.trim() !== '' && !isNaN(regPriceNum)) {
                payload.regular_price = regPriceNum;
            }
        }

        onSave(payload);
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
        return selectedItems.reduce((acc, item) => acc + (parseFloat(item.regularPrice) || parseFloat(item.salePrice) || 0), 0);
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
                                            <span className="truncate" title={p.name}>{stripHtml(p.name)}</span>
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
                                {subscriptionProducts.map(s => <option key={s.sku} value={s.sku}>{stripHtml(s.name)} ({s.sku})</option>)}
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
                                        <span className="truncate" title={item.name}>{stripHtml(item.name)} <span className="text-xs font-mono text-[rgb(var(--color-text-muted-rgb))]">({item.sku})</span></span>
                                        <span className="font-mono">${(parseFloat(item.regularPrice) || parseFloat(item.salePrice) || 0).toFixed(2)}</span>
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
                            <label className="text-sm font-medium">Bundle Regular Price (Optional)</label>
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
        if (!name.trim() || !sku.trim() || price.trim() === '' || isNaN(parseFloat(price))) {
            toast.error("Name, SKU, and a valid Sale Price are required.");
            return;
        }
        const payload: any = {
            post_title: name.trim(),
            sku: sku.trim(),
            sale_price: parseFloat(price)
        };
    
        const regPriceNum = parseFloat(regularPrice);
    
        if (productToEdit?.sku) { // Editing
            payload.regular_price = (regularPrice.trim() !== '' && !isNaN(regPriceNum)) ? regPriceNum : '';
        } else { // Creating
            if (regularPrice.trim() !== '' && !isNaN(regPriceNum)) {
                payload.regular_price = regPriceNum;
            }
        }
        
        onSave(payload);
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
                            <label className="text-sm font-medium">Regular Price (Optional)</label>
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
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('month');
    const [billingInterval, setBillingInterval] = useState('1');
    const [subscriptionLength, setSubscriptionLength] = useState('0');

    useEffect(() => {
        if (isOpen) {
            if (productToEdit && productToEdit.sku) {
                setName(productToEdit.name || '');
                setSku(productToEdit.sku || '');
                setPrice(productToEdit.salePrice?.toString() || '');
                setRegularPrice(productToEdit.regularPrice?.toString() || '');
                setBillingPeriod(productToEdit.subscriptionPeriod || 'month');
                setBillingInterval(productToEdit.subscriptionPeriodInterval || '1');
                setSubscriptionLength(productToEdit.subscriptionLength || '0');
            } else {
                setName('');
                setSku('');
                setPrice('');
                setRegularPrice('');
                setBillingPeriod('month');
                setBillingInterval('1');
                setSubscriptionLength('0');
            }
        }
    }, [isOpen, productToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim() || !sku.trim() || price.trim() === '' || isNaN(parseFloat(price))) {
            toast.error("Name, SKU, and a valid Sale Price are required.");
            return;
        }
        const payload: any = {
            post_title: name.trim(),
            sku: sku.trim(),
            sale_price: parseFloat(price),
            type: 'subscription',
            _subscription_period: billingPeriod,
            _subscription_period_interval: billingInterval,
            _subscription_length: subscriptionLength,
        };

        const regPriceNum = parseFloat(regularPrice);
        if (productToEdit?.sku) {
            payload.regular_price = (regularPrice.trim() !== '' && !isNaN(regPriceNum)) ? regPriceNum : '';
        } else {
             if (regularPrice.trim() !== '' && !isNaN(regPriceNum)) {
                payload.regular_price = regPriceNum;
            }
        }
        
        onSave(payload);
    };

    return (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg w-full max-w-lg p-6">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">{productToEdit?.sku ? 'Edit Subscription' : 'Create New Subscription'}</h2>
                <div className="space-y-4">
                     <div>
                        <label className="text-sm font-medium">Subscription Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Monthly Premium Access" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                    </div>
                     <div>
                        <label className="text-sm font-medium">SKU</label>
                        <input type="text" value={sku} onChange={e => setSku(e.target.value)} disabled={!!productToEdit?.sku} placeholder="e.g., sub-monthly" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))] disabled:opacity-70" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Sale Price</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 19.99" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Regular Price (Optional)</label>
                            <input type="number" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} placeholder="e.g., 29.99" className="w-full p-2 mt-1 border rounded bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-border-rgb))]" />
                        </div>
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Interval</label>
                            <input type="number" value={billingInterval} onChange={e => setBillingInterval(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Period</label>
                            <select value={billingPeriod} onChange={e => setBillingPeriod(e.target.value as BillingPeriod)} className="w-full p-2 mt-1 border rounded bg-white">
                                <option value="day">Day</option>
                                <option value="week">Week</option>
                                <option value="month">Month</option>
                                <option value="year">Year</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Length</label>
                            <input type="number" value={subscriptionLength} onChange={e => setSubscriptionLength(e.target.value)} placeholder="0 for forever" className="w-full p-2 mt-1 border rounded bg-white" />
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

const ProductCustomizer: FC = () => {
    const { activeOrg, examPrices, updateConfigData } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [isSaving, setIsSaving] = useState(false);
    
    const [modalState, setModalState] = useState<{ type: ProductVariationType | null; product: Partial<ProductVariation> | null }>({ type: null, product: null });
    
    const handleSave = async (productData: any) => {
        if (!token) { toast.error("Authentication Error"); return; }
        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminUpsertProduct(token, productData);
            updateConfigData(result.organizations, result.examPrices);
            toast.success(`Product "${productData.post_title}" saved successfully!`);
            setModalState({ type: null, product: null });
        } catch (error: any) {
            toast.error(error.message || 'Failed to save product.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (productId: string, productName: string) => {
        if (!token) { toast.error("Authentication Error"); return; }
        if (!window.confirm(`Are you sure you want to delete "${productName}"? This will move the product to the trash and cannot be undone.`)) return;
        
        setIsSaving(true);
        const toastId = toast.loading(`Deleting "${productName}"...`);
        try {
            const result = await googleSheetsService.adminDeletePost(token, productId, 'product');
            updateConfigData(result.organizations, result.examPrices);
            toast.success(`Product "${productName}" deleted.`, { id: toastId });
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete product.', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const products = useMemo(() => {
        if (!examPrices || !activeOrg) return { all: [], simple: [], subscription: [], bundle: [] };
        
        const allProducts = Object.entries(examPrices).map(([sku, data]: [string, any]): ProductVariation => ({
            id: data.productId?.toString(),
            name: data.name,
            sku,
            type: data.type || 'simple',
            regularPrice: data.regularPrice?.toString() ?? '',
            salePrice: data.price?.toString() ?? '',
            isBundle: data.isBundle || false,
            bundledSkus: data.bundledSkus || [],
            subscriptionPeriod: data._subscription_period,
            subscriptionPeriodInterval: data._subscription_period_interval,
            subscriptionLength: data._subscription_length,
        }));
        allProducts.sort((a,b) => a.name.localeCompare(b.name));

        return {
            all: allProducts,
            simple: allProducts.filter(p => !p.type || p.type === 'simple'),
            subscription: allProducts.filter(p => p.type === 'subscription'),
            bundle: allProducts.filter(p => p.isBundle),
        };
    }, [examPrices, activeOrg]);

    const productsToDisplay = activeTab === 'all' ? products.all : products[activeTab];

    const openModal = (type: ProductVariationType, product: Partial<ProductVariation> | null = null) => {
        setModalState({ type, product });
    };

    return (
        <>
            {modalState.type === 'simple' && <UpsertSimpleProductModal isOpen={true} onClose={() => setModalState({ type: null, product: null })} onSave={handleSave} isSaving={isSaving} productToEdit={modalState.product} />}
            {modalState.type === 'subscription' && <UpsertSubscriptionModal isOpen={true} onClose={() => setModalState({ type: null, product: null })} onSave={handleSave} isSaving={isSaving} productToEdit={modalState.product} />}
            {modalState.type === 'bundle' && <UpsertBundleModal isOpen={true} onClose={() => setModalState({ type: null, product: null })} onSave={handleSave} isSaving={isSaving} productToEdit={modalState.product} simpleProducts={products.simple} subscriptionProducts={products.subscription} />}

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
                         <div className="flex items-center gap-2">
                            <button onClick={() => openModal('simple')} className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-md flex items-center gap-2"><PlusCircle size={16}/> New Simple Product</button>
                            <button onClick={() => openModal('subscription')} className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md flex items-center gap-2"><PlusCircle size={16}/> New Subscription</button>
                            <button onClick={() => openModal('bundle')} className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-md flex items-center gap-2"><PlusCircle size={16}/> New Bundle</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {productsToDisplay.map(product => (
                            <div key={product.sku} className="editable-card">
                                <div className="editable-card__header">
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-lg text-[rgb(var(--color-text-strong-rgb))]">{product.name}</h3>
                                        <p className="text-xs font-mono text-[rgb(var(--color-text-muted-rgb))]">{product.sku}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => handleDelete(product.id, product.name)} disabled={isSaving} className="p-2 rounded-full text-red-500 hover:bg-red-100"><Trash2 size={16}/></button>
                                        <button onClick={() => openModal(product.type || 'simple', product)} className="p-2 rounded-full text-[rgb(var(--color-primary-rgb))] hover:bg-cyan-100"><Edit size={16}/></button>
                                    </div>
                                </div>
                                <div className="editable-card__content text-sm">
                                    <div className="flex justify-between"><span>Type:</span> <span className="font-semibold capitalize">{product.type || 'simple'}</span></div>
                                    <div className="flex justify-between"><span>Price:</span> <span className="font-semibold">${product.salePrice}</span></div>
                                    {product.regularPrice && <div className="flex justify-between"><span>Regular Price:</span> <span className="font-semibold">${product.regularPrice}</span></div>}
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
                </div>
            </div>
        </>
    );
};

export default ProductCustomizer;