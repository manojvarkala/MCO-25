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

const ProductEditorModal: FC<{ 
    product: ProductEntry | null; 
    type: TabType;
    onClose: () => void; 
    onSave: (data: any, isClone: boolean) => Promise<void>; 
    onDelete: (productId: string) => Promise<void>;
    isSaving: boolean;
    availableExams: ProductEntry[];
    isDuplicating?: boolean;
}> = ({ product, type, onClose, onSave, onDelete, isSaving, availableExams, isDuplicating = false }) => {
    const isNew = !product || isDuplicating;
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    
    const [formData, setFormData] = useState({
        id: isDuplicating ? '' : (product?.id || ''),
        name: isDuplicating ? `${product?.name} - 1mo Premium` : (product?.name || ''),
        price: product?.price || '0',
        regularPrice: product?.regularPrice || '0',
        sku: isDuplicating ? `${product?.sku}-1mo-addon` : (product?.sku || ''),
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        {isDuplicating ? <Copy size={24} className="text-orange-500"/> : (isNew ? <PlusCircle size={24} className="text-emerald-500"/> : <Edit size={24} className="text-orange-500"/>)} 
                        {isDuplicating ? 'Clone Product' : (isNew ? `New ${formData.type}` : 'Edit Product')}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28}/></button>
                </div>
                
                <div className="p-10 space-y-8 overflow-y-auto flex-grow custom-scrollbar">
                    <div className="space-y-6">
                        <div>
                            <label className="mco-admin-label">Product Internal Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mco-admin-input" placeholder="e.g. Master CIC Exam Pack" />
                        </div>

                        <div>
                            <label className="mco-admin-label">Unique Merchant SKU</label>
                            <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} disabled={!isNew} className={`mco-admin-input font-mono ${!isNew ? 'opacity-40 cursor-not-allowed bg-slate-950' : ''}`} />
                            {isNew && <p className="text-[10px] text-orange-500 font-bold mt-2 tracking-widest uppercase">This must match the program SKU exactly.</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="mco-admin-label">Retail Price ($)</label>
                                <input type="number" value={formData.regularPrice} onChange={e => setFormData({...formData, regularPrice: e.target.value})} className="mco-admin-input" />
                            </div>
                            <div>
                                <label className="mco-admin-label">Sale Price ($)</label>
                                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="mco-admin-input !text-emerald-400 !border-emerald-500/30" />
                            </div>
                        </div>

                        {(formData.isBundle || formData.type === 'bundle') && (
                            <div className="space-y-4">
                                <label className="mco-admin-label">Included Product Items</label>
                                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                                    {availableExams.map(exam => (
                                        <label key={exam.id} className="flex items-center gap-3 p-3 hover:bg-white/[0.03] rounded-xl cursor-pointer transition-colors border border-transparent has-[:checked]:border-orange-500/20">
                                            <input type="checkbox" checked={formData.bundledSkus.includes(exam.sku)} onChange={() => handleToggleBundleItem(exam.sku)} className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500" />
                                            <span className="text-xs text-slate-300 font-bold">{exam.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex gap-2">
                        {!isNew && (
                            !isConfirmingDelete ? (
                                <button onClick={() => setIsConfirmingDelete(true)} className="px-6 py-2.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl text-xs font-black transition-all">DELETE</button>
                            ) : (
                                <button onClick={() => onDelete(product!.id)} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black animate-pulse">CONFIRM TRASH</button>
                            )
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} disabled={isSaving} className="px-8 py-3 font-bold text-slate-400 hover:text-white transition-colors">Discard</button>
                        <button onClick={() => onSave(formData, isDuplicating)} disabled={isSaving || !formData.name || !formData.sku} className="mco-btn-admin-primary !bg-orange-600 hover:!bg-orange-500">
                            {isSaving ? <Spinner size="sm"/> : <Save size={20}/>} 
                            {isDuplicating ? 'SAVE CLONE' : (isNew ? 'CREATE' : 'UPDATE')}
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
    
    const products = useMemo(() => {
        if (!examPrices) return [];
        return Object.entries(examPrices).map(([sku, data]: [string, any]) => ({
            id: data.productId?.toString() || sku,
            sku,
            name: data.name || 'Untitled Product',
            type: data.isBundle ? 'bundle' : (data.subscription_period ? 'subscription' : 'simple'),
            price: data.price?.toString() || '0',
            regularPrice: data.regularPrice?.toString() || '0',
            bundledSkus: data.bundledSkus || [],
            subscriptionPeriod: data.subscription_period
        }));
    }, [examPrices]);

    const filtered = useMemo(() => {
        if (activeTab === 'all') return products;
        return products.filter(p => p.type === activeTab);
    }, [activeTab, products]);

    const handleSaveProduct = async (formData: any, isClone: boolean) => {
        if (!token) return;
        setIsSaving(true);
        const tid = toast.loading("Syncing Store State...");
        const payload = { ...formData };
        if (isClone) { delete payload.id; payload.type = 'simple'; }
        try {
            await googleSheetsService.adminUpsertProduct(token, payload);
            await refreshConfig();
            toast.success("Inventory Synchronized", { id: tid });
            setEditingProduct(null); setIsCreating(false); setIsDuplicating(false);
        } catch (e: any) { toast.error(e.message, { id: tid }); }
        finally { setIsSaving(false); }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!token) return;
        setIsSaving(true);
        try {
            await googleSheetsService.adminDeletePost(token, productId, 'product');
            await refreshConfig();
            toast.success("Trashed from Inventory");
            setEditingProduct(null);
        } catch (e: any) { toast.error("Failed to delete product."); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-10 pb-40">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h1 className="text-4xl font-black text-white font-display flex items-center gap-4">
                    <ShoppingCart className="text-orange-500" size={40} /> Store Inventory
                </h1>
                
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setActiveTab('simple'); setIsCreating(true); }} className="mco-btn-admin-success !bg-emerald-600">NEW PRODUCT</button>
                    <button onClick={() => { setActiveTab('subscription'); setIsCreating(true); }} className="mco-btn-admin-success !bg-blue-600">NEW SUB</button>
                    <button onClick={() => { setActiveTab('bundle'); setIsCreating(true); }} className="mco-btn-admin-success !bg-purple-600">NEW BUNDLE</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 p-2 bg-slate-900 rounded-2xl border-2 border-slate-800 self-start">
                {['all', 'simple', 'subscription', 'bundle'].map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t as TabType)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === t ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                        <tr>
                            <th className="p-6">Merchant Identity</th>
                            <th className="p-6">Type</th>
                            <th className="p-6">Current Price</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filtered.map(p => (
                            <tr key={p.sku} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-6">
                                    <p className="font-black text-white text-lg">{p.name}</p>
                                    <p className="text-[10px] font-mono text-orange-400 mt-1 uppercase">SKU: {p.sku}</p>
                                </td>
                                <td className="p-6">
                                    <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-slate-950 text-slate-300 border border-slate-800">
                                        {p.type}
                                    </span>
                                </td>
                                <td className="p-6 font-black text-white text-xl">${parseFloat(p.price).toFixed(2)}</td>
                                <td className="p-6 text-right space-x-2">
                                    <button onClick={() => { setEditingProduct(p); setIsDuplicating(true); }} className="p-3 text-slate-500 hover:text-amber-500 transition-colors" title="Clone"><Copy size={18}/></button>
                                    <button onClick={() => { setEditingProduct(p); setIsDuplicating(false); }} className="p-3 text-slate-500 hover:text-orange-500 transition-colors" title="Edit"><Edit size={18}/></button>
                                    <button onClick={() => { if(window.confirm('Delete?')) handleDeleteProduct(p.id) }} className="p-3 text-slate-500 hover:text-rose-500 transition-colors" title="Trash"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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