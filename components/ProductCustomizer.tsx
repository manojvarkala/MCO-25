import React, { FC, useState, useMemo, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, PlusCircle, Box, Repeat, Package, DollarSign, Tag, Info, CheckSquare, Square, Trash2, Copy } from 'lucide-react';
import Spinner from './Spinner.tsx';

type TabType = 'all' | 'simple' | 'subscription' | 'bundle';

interface ProductEntry {
    id: string;
    sku: string;
    name: string;
    type: string;
    price: string;
    regularPrice: string;
    bundledSkus?: string[];
    subscriptionPeriod?: string;
}

const TabButton: FC<{ active: boolean; onClick: () => void; children: ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2 font-black text-xs uppercase tracking-widest rounded-lg transition-all ${
            active ? 'bg-cyan-600 text-white shadow-lg' : 'bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]'
        }`}
    >
        {children}
    </button>
);

const ProductEditorModal: FC<{ 
    product: ProductEntry | null; 
    type: TabType;
    onClose: () => void; 
    onSave: (data: any) => Promise<void>; 
    onDelete: (productId: string) => Promise<void>;
    isSaving: boolean;
    availableExams: ProductEntry[];
    isDuplicating?: boolean;
}> = ({ product, type, onClose, onSave, onDelete, isSaving, availableExams, isDuplicating = false }) => {
    const isNew = !product || isDuplicating;
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    
    const [formData, setFormData] = useState({
        name: isDuplicating ? `${product?.name} - Premium Addon` : (product?.name || ''),
        price: product?.price || '0',
        regularPrice: product?.regularPrice || '0',
        sku: isDuplicating ? `${product?.sku}-1mo-addon` : (product?.sku || ''),
        // Clones are ALWAYS simple products in WC even if source was a bundle
        type: isDuplicating ? 'simple' : (product?.type || (type === 'all' ? 'simple' : type)),
        bundledSkus: product?.bundledSkus || [] as string[],
        subscriptionPeriod: product?.subscriptionPeriod || 'month',
        isBundle: isDuplicating ? true : (product?.type === 'bundle')
    });

    const handleToggleBundleItem = (sku: string) => {
        setFormData(prev => ({
            ...prev,
            bundledSkus: prev.bundledSkus.includes(sku) 
                ? prev.bundledSkus.filter(s => s !== sku)
                : [...prev.bundledSkus, sku]
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[rgb(var(--color-border-rgb))] flex justify-between items-center bg-[rgba(var(--color-background-rgb),0.5)]">
                    <h2 className="text-xl font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-2">
                        {isDuplicating ? <Copy size={20} className="text-amber-500"/> : (isNew ? <PlusCircle size={20} className="text-emerald-500"/> : <Edit size={20} className="text-cyan-500"/>)} 
                        {isDuplicating ? 'Duplicate as Addon' : (isNew ? `Create New Product` : 'Edit Product')}
                    </h2>
                    <button onClick={onClose} className="text-[rgb(var(--color-text-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))] transition-colors"><X size={24}/></button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto flex-grow">
                    <div>
                        <label className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-1 block">Product Title</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. CPC Certification Exam"
                                className="w-full bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl py-3 pl-10 pr-4 text-[rgb(var(--color-text-strong-rgb))] focus:border-cyan-500 transition-all font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-1 block">Unique SKU</label>
                        <div className="relative">
                            <Info className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                value={formData.sku} 
                                onChange={e => setFormData({...formData, sku: e.target.value})}
                                disabled={!isNew}
                                placeholder="e.g. exam-cpc-cert"
                                className={`w-full bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl py-3 pl-10 pr-4 text-[rgb(var(--color-text-strong-rgb))] focus:border-cyan-500 transition-all ${!isNew ? 'opacity-50 cursor-not-allowed font-mono text-cyan-500' : 'font-mono'}`}
                            />
                        </div>
                        {isNew && <p className="text-[9px] text-[rgb(var(--color-text-muted-rgb))] mt-1 uppercase font-bold">Clones default to <span className="text-amber-500">Simple Product</span> status.</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-1 block">Retail Price</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                                <input 
                                    type="number" 
                                    value={formData.regularPrice} 
                                    onChange={e => setFormData({...formData, regularPrice: e.target.value})}
                                    className="w-full bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl py-3 pl-10 pr-4 text-[rgb(var(--color-text-strong-rgb))] focus:border-cyan-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-1 block">Offer Price</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                                <input 
                                    type="number" 
                                    value={formData.price} 
                                    onChange={e => setFormData({...formData, price: e.target.value})}
                                    className="w-full bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl py-3 pl-10 pr-4 text-emerald-500 font-black focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {(formData.type === 'bundle' || isDuplicating) && (
                        <div>
                            <label className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-2 block">Included Contents</label>
                            <div className="bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
                                {availableExams.map(exam => (
                                    <label key={exam.id} className="flex items-center gap-3 p-2 hover:bg-[rgba(var(--color-muted-rgb),0.3)] rounded-lg cursor-pointer transition-colors border border-transparent has-[:checked]:border-cyan-500/30">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.bundledSkus.includes(exam.sku)}
                                            onChange={() => handleToggleBundleItem(exam.sku)}
                                            className="rounded border-[rgb(var(--color-border-rgb))] bg-[rgb(var(--color-card-rgb))] text-cyan-500"
                                        />
                                        <span className="text-xs text-[rgb(var(--color-text-default-rgb))] font-bold">{exam.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-[rgba(var(--color-background-rgb),0.5)] border-t border-[rgb(var(--color-border-rgb))] flex justify-between gap-3">
                    <div className="flex gap-2">
                        {!isNew && (
                            !isConfirmingDelete ? (
                                <button onClick={() => setIsConfirmingDelete(true)} className="px-4 py-2 text-rose-500 hover:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold uppercase transition-colors">Delete</button>
                            ) : (
                                <button onClick={() => onDelete(product!.id)} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-black shadow-lg animate-pulse">Confirm</button>
                            )
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={isSaving} className="px-6 py-2.5 font-bold text-[rgb(var(--color-text-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))] transition-colors">Discard</button>
                        <button 
                            onClick={() => onSave(formData)} 
                            disabled={isSaving || !formData.name || !formData.sku}
                            className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg flex items-center gap-2 ${
                                isNew ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20'
                            }`}
                        >
                            {isSaving ? <Spinner size="sm"/> : <Save size={18}/>} 
                            {isDuplicating ? 'SAVE AS ADDON' : (isNew ? 'CREATE PRODUCT' : 'UPDATE PRODUCT')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductCustomizer: FC = () => {
    const { examPrices, refreshConfig } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductEntry | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
    
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkRegularPrice, setBulkRegularPrice] = useState('');

    const products = useMemo(() => {
        if (!examPrices) return [];
        return Object.entries(examPrices).map(([sku, data]: [string, any]) => {
            const resolvedType = data.isBundle 
                ? 'bundle' 
                : (data.subscription_period ? 'subscription' : 'simple');

            return {
                id: data.productId?.toString() || sku,
                sku,
                name: data.name || 'Untitled Product',
                type: resolvedType,
                price: data.price?.toString() || '0',
                regularPrice: data.regularPrice?.toString() || '0',
                bundledSkus: data.bundledSkus || [],
                subscriptionPeriod: data.subscription_period
            };
        });
    }, [examPrices]);

    const filtered = useMemo(() => {
        if (activeTab === 'all') return products;
        return products.filter(p => p.type === activeTab);
    }, [activeTab, products]);

    const handleToggleSelect = (sku: string) => {
        setSelectedSkus(prev => prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]);
    };

    const handleSelectAll = () => {
        setSelectedSkus(selectedSkus.length === filtered.length ? [] : filtered.map(p => p.sku));
    };

    const handleSaveProduct = async (formData: any) => {
        if (!token) return;
        setIsSaving(true);
        const tid = toast.loading("Syncing WooCommerce...");
        try {
            await googleSheetsService.adminUpsertProduct(token, formData);
            await refreshConfig();
            toast.success("Inventory Synchronized", { id: tid });
            setEditingProduct(null);
            setIsCreating(false);
            setIsDuplicating(false);
        } catch (e: any) {
            toast.error(e.message || "Failed to save", { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!token) return;
        setIsSaving(true);
        const tid = toast.loading("Trashing product...");
        try {
            await googleSheetsService.adminDeletePost(token, productId, 'product');
            await refreshConfig();
            toast.success("Product Deleted", { id: tid });
            setEditingProduct(null);
            setIsCreating(false);
        } catch (e: any) {
            toast.error(e.message || "Deletion failed", { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSkus.length === 0 || !token) return;
        if (!window.confirm(`Permanently delete ${selectedSkus.length} products?`)) return;
        setIsSaving(true);
        const tid = toast.loading(`Deleting ${selectedSkus.length} products...`);
        try {
            for (const sku of selectedSkus) {
                const prod = products.find(p => p.sku === sku);
                if (prod) await googleSheetsService.adminDeletePost(token, prod.id, 'product');
            }
            await refreshConfig();
            toast.success("Bulk Deletion Complete", { id: tid });
            setSelectedSkus([]);
        } catch (e: any) {
            toast.error(e.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkPriceUpdate = async () => {
        if (selectedSkus.length === 0 || !token || (!bulkPrice && !bulkRegularPrice)) return;
        setIsSaving(true);
        const tid = toast.loading(`Updating ${selectedSkus.length} products...`);
        try {
            for (const sku of selectedSkus) {
                const prod = products.find(p => p.sku === sku);
                if (prod) {
                    await googleSheetsService.adminUpsertProduct(token, {
                        ...prod,
                        price: bulkPrice || prod.price,
                        regularPrice: bulkRegularPrice || prod.regularPrice
                    });
                }
            }
            await refreshConfig();
            toast.success("Bulk Pricing Updated", { id: tid });
            setSelectedSkus([]);
            setBulkPrice('');
            setBulkRegularPrice('');
        } catch (e: any) {
            toast.error(e.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h1 className="text-4xl font-black text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                    <ShoppingCart className="text-cyan-500" /> Store Inventory
                </h1>
                
                {selectedSkus.length > 0 && (
                    <div className="flex items-center gap-4 bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] p-4 rounded-2xl shadow-xl animate-in slide-in-from-right-4 duration-300">
                        <div className="flex gap-2">
                            <div className="relative">
                                <span className="absolute left-2 top-2.5 text-[8px] font-black text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-tighter">Sale</span>
                                <input type="number" placeholder="0.00" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} className="w-24 bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-lg py-2 pl-8 pr-2 text-xs text-[rgb(var(--color-text-strong-rgb))] focus:border-emerald-500"/>
                            </div>
                            <div className="relative">
                                <span className="absolute left-2 top-2.5 text-[8px] font-black text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-tighter">Reg</span>
                                <input type="number" placeholder="0.00" value={bulkRegularPrice} onChange={e => setBulkRegularPrice(e.target.value)} className="w-24 bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-lg py-2 pl-8 pr-2 text-xs text-[rgb(var(--color-text-strong-rgb))] focus:border-cyan-500"/>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleBulkPriceUpdate} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/20">Update {selectedSkus.length}</button>
                            <button onClick={handleBulkDelete} className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 transition shadow-lg shadow-rose-900/20 flex items-center gap-2"><Trash2 size={14}/> Bulk Trash</button>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setActiveTab('simple'); setIsCreating(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW PRODUCT</button>
                    <button onClick={() => { setActiveTab('subscription'); setIsCreating(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-blue-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW SUB</button>
                    <button onClick={() => { setActiveTab('bundle'); setIsCreating(true); }} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-purple-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW BUNDLE</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 p-1.5 bg-[rgb(var(--color-background-rgb))] rounded-xl border border-[rgb(var(--color-border-rgb))] self-start">
                <TabButton active={activeTab === 'all'} onClick={() => { setActiveTab('all'); setSelectedSkus([]); }}>Full Inventory</TabButton>
                <TabButton active={activeTab === 'simple'} onClick={() => { setActiveTab('simple'); setSelectedSkus([]); }}>Standard Exams</TabButton>
                <TabButton active={activeTab === 'subscription'} onClick={() => { setActiveTab('subscription'); setSelectedSkus([]); }}>Memberships</TabButton>
                <TabButton active={activeTab === 'bundle'} onClick={() => { setActiveTab('bundle'); setSelectedSkus([]); }}>Bundles & Addons</TabButton>
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] rounded-2xl shadow-2xl border border-[rgb(var(--color-border-rgb))] overflow-hidden">
                <div className="bg-[rgb(var(--color-background-rgb))] p-4 border-b border-[rgb(var(--color-border-rgb))] flex items-center justify-between">
                     <button onClick={handleSelectAll} className="flex items-center gap-2 text-[10px] font-black text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-widest hover:text-[rgb(var(--color-text-strong-rgb))] transition">
                        {selectedSkus.length === filtered.length && filtered.length > 0 ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16}/>}
                        {selectedSkus.length === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select Filtered Group'}
                    </button>
                    <span className="text-[10px] font-black text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-widest">{filtered.length} STORE ENTITIES</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-muted-rgb))] uppercase text-[10px] font-black tracking-widest border-b border-[rgb(var(--color-border-rgb))]">
                            <tr>
                                <th className="p-5 w-12"></th>
                                <th className="p-5">Entity Branding</th>
                                <th className="p-5">Type</th>
                                <th className="p-5">Price Matrix</th>
                                <th className="p-5 text-right">Quick Tools</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--color-border-rgb))]">
                            {filtered.map(p => (
                                <tr key={p.sku} className={`hover:bg-[rgba(var(--color-muted-rgb),0.4)] transition-colors group ${selectedSkus.includes(p.sku) ? 'bg-cyan-500/10' : ''}`}>
                                    <td className="p-5">
                                        <button onClick={() => handleToggleSelect(p.sku)} className="text-[rgb(var(--color-border-rgb))] hover:text-cyan-500 transition-colors">
                                            {selectedSkus.includes(p.sku) ? <CheckSquare size={20} className="text-cyan-500"/> : <Square size={20}/>}
                                        </button>
                                    </td>
                                    <td className="p-5">
                                        <p className="font-black text-[rgb(var(--color-text-strong-rgb))] text-base group-hover:text-cyan-500 transition-colors">{p.name}</p>
                                        <p className="text-[10px] font-mono text-[rgb(var(--color-text-muted-rgb))] mt-1 uppercase">SKU: <span className="text-cyan-400">{p.sku}</span></p>
                                    </td>
                                    <td className="p-5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-inner border ${
                                            p.type === 'bundle' ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' : 
                                            p.type === 'subscription' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 
                                            'bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-muted-rgb))] border-[rgb(var(--color-border-rgb))]'
                                        }`}>
                                            {p.type === 'bundle' ? <Package size={10}/> : (p.type === 'subscription' ? <Repeat size={10}/> : <Box size={10}/>)}
                                            {p.type}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-black text-[rgb(var(--color-text-strong-rgb))] text-lg">${parseFloat(p.price).toFixed(2)}</span>
                                            {parseFloat(p.regularPrice) > parseFloat(p.price) && (
                                                <span className="text-xs line-through text-[rgb(var(--color-text-muted-rgb))] font-bold">${parseFloat(p.regularPrice).toFixed(2)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right space-x-2">
                                        <button onClick={() => { setEditingProduct(p); setIsDuplicating(true); }} className="p-2.5 text-[rgb(var(--color-text-muted-rgb))] hover:text-amber-500 hover:bg-[rgba(var(--color-background-rgb),0.5)] rounded-xl transition-all border border-transparent hover:border-amber-500/30 shadow-sm" title="Duplicate for Premium Addon"><Copy size={16}/></button>
                                        <button onClick={() => { setEditingProduct(p); setIsDuplicating(false); }} className="p-2.5 text-[rgb(var(--color-text-muted-rgb))] hover:text-cyan-500 hover:bg-[rgba(var(--color-background-rgb),0.5)] rounded-xl transition-all border border-transparent hover:border-[rgb(var(--color-border-rgb))] shadow-sm" title="Edit Properties"><Edit size={16}/></button>
                                        <button onClick={() => { if(window.confirm('Delete this entity permanently?')) handleDeleteProduct(p.id) }} className="p-2.5 text-[rgb(var(--color-text-muted-rgb))] hover:text-rose-500 hover:bg-[rgba(var(--color-background-rgb),0.5)] rounded-xl transition-all border border-transparent hover:border-rose-500/30 shadow-sm" title="Trash"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {(editingProduct || isCreating) && (
                <ProductEditorModal 
                    product={editingProduct} 
                    type={activeTab}
                    onClose={() => { setEditingProduct(null); setIsCreating(false); setIsDuplicating(false); }} 
                    onSave={handleSaveProduct} 
                    onDelete={handleDeleteProduct}
                    isSaving={isSaving}
                    isDuplicating={isDuplicating}
                    availableExams={products.filter(p => p.type === 'simple')}
                />
            )}
        </div>
    );
};

export default ProductCustomizer;