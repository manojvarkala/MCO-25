import React, { FC, useState, useMemo, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, PlusCircle, Box, Repeat, Package, DollarSign, Tag, Info } from 'lucide-react';
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
            active ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 hover:bg-slate-800'
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
    isSaving: boolean;
    availableExams: ProductEntry[];
}> = ({ product, type, onClose, onSave, isSaving, availableExams }) => {
    const isNew = !product;
    const [formData, setFormData] = useState({
        name: product?.name || '',
        price: product?.price || '0',
        regularPrice: product?.regularPrice || '0',
        sku: product?.sku || '',
        type: product?.type || (type === 'all' ? 'simple' : type),
        bundledSkus: product?.bundledSkus || [] as string[],
        subscriptionPeriod: product?.subscriptionPeriod || 'month'
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        {isNew ? <PlusCircle size={20} className="text-emerald-500"/> : <Edit size={20} className="text-cyan-500"/>} 
                        {isNew ? `Create New ${formData.type.toUpperCase()}` : 'Edit Product'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto flex-grow">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Display Name</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-3.5 text-slate-600" size={18}/>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. CPC Certification Exam"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Unique SKU</label>
                        <div className="relative">
                            <Info className="absolute left-3 top-3.5 text-slate-600" size={18}/>
                            <input 
                                type="text" 
                                value={formData.sku} 
                                onChange={e => setFormData({...formData, sku: e.target.value})}
                                disabled={!isNew}
                                placeholder="e.g. exam-cpc-cert"
                                className={`w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 ${!isNew ? 'opacity-50 cursor-not-allowed font-mono text-cyan-400' : ''}`}
                            />
                        </div>
                        {isNew && <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Must match the Exam Program SKU precisely.</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Regular Price</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3.5 text-slate-600" size={18}/>
                                <input 
                                    type="number" 
                                    value={formData.regularPrice} 
                                    onChange={e => setFormData({...formData, regularPrice: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Sale Price</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3.5 text-slate-600" size={18}/>
                                <input 
                                    type="number" 
                                    value={formData.price} 
                                    onChange={e => setFormData({...formData, price: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                                />
                            </div>
                        </div>
                    </div>

                    {formData.type === 'subscription' && (
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Billing Period</label>
                            <select 
                                value={formData.subscriptionPeriod}
                                onChange={e => setFormData({...formData, subscriptionPeriod: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white"
                            >
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                            </select>
                        </div>
                    )}

                    {formData.type === 'bundle' && (
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Packaged Contents</label>
                            <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
                                {availableExams.map(exam => (
                                    <label key={exam.sku} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors border border-transparent has-[:checked]:border-cyan-500/30">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.bundledSkus.includes(exam.sku)}
                                            onChange={() => handleToggleBundleItem(exam.sku)}
                                            className="rounded bg-slate-800 border-slate-600 text-cyan-500"
                                        />
                                        <span className="text-xs text-slate-300 font-bold">{exam.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isSaving} className="px-6 py-2.5 font-bold text-slate-400 hover:text-white transition-colors">Discard</button>
                    <button 
                        onClick={() => onSave(formData)} 
                        disabled={isSaving || !formData.name || !formData.sku}
                        className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg flex items-center gap-2 ${
                            isNew ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20'
                        }`}
                    >
                        {isSaving ? <Spinner size="sm"/> : <Save size={18}/>} 
                        {isNew ? 'CREATE PRODUCT' : 'UPDATE PRODUCT'}
                    </button>
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

    const handleSaveProduct = async (formData: any) => {
        if (!token) return;
        setIsSaving(true);
        const tid = toast.loading("Saving to WooCommerce...");
        try {
            await googleSheetsService.adminUpsertProduct(token, formData);
            await refreshConfig();
            toast.success("Inventory Synchronized", { id: tid });
            setEditingProduct(null);
            setIsCreating(false);
        } catch (e: any) {
            toast.error(e.message || "Failed to save", { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h1 className="text-4xl font-black text-slate-100 font-display flex items-center gap-3">
                    <ShoppingCart className="text-cyan-500" /> Store Inventory
                </h1>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setActiveTab('simple'); setIsCreating(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW SIMPLE</button>
                    <button onClick={() => { setActiveTab('subscription'); setIsCreating(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-blue-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW SUB</button>
                    <button onClick={() => { setActiveTab('bundle'); setIsCreating(true); }} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-purple-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW BUNDLE</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 p-1.5 bg-slate-950 rounded-xl border border-slate-800 self-start">
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>Full List</TabButton>
                <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')}>Standard</TabButton>
                <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}>Recurring</TabButton>
                <TabButton active={activeTab === 'bundle'} onClick={() => setActiveTab('bundle')}>Package Deals</TabButton>
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                            <tr>
                                <th className="p-5">Product Entity</th>
                                <th className="p-5">Classification</th>
                                <th className="p-5">Value (USD)</th>
                                <th className="p-5 text-right">Settings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtered.map(p => (
                                <tr key={p.sku} className="hover:bg-slate-800/40 transition-colors group">
                                    <td className="p-5">
                                        <p className="font-black text-slate-100 text-base group-hover:text-cyan-400 transition-colors">{p.name}</p>
                                        <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">SKU: {p.sku}</p>
                                    </td>
                                    <td className="p-5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-inner border ${
                                            p.type === 'bundle' ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 
                                            p.type === 'subscription' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 
                                            'bg-slate-950 text-slate-400 border-slate-800'
                                        }`}>
                                            {p.type === 'bundle' ? <Package size={10}/> : (p.type === 'subscription' ? <Repeat size={10}/> : <Box size={10}/>)}
                                            {p.type}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-black text-white text-lg">${parseFloat(p.price).toFixed(2)}</span>
                                            {parseFloat(p.regularPrice) > parseFloat(p.price) && (
                                                <span className="text-xs line-through text-slate-600 font-bold">${parseFloat(p.regularPrice).toFixed(2)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <button 
                                            onClick={() => setEditingProduct(p)}
                                            className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-600 shadow-sm"
                                        >
                                            <Edit size={16}/>
                                        </button>
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
                    onClose={() => { setEditingProduct(null); setIsCreating(false); }} 
                    onSave={handleSaveProduct} 
                    isSaving={isSaving}
                    availableExams={products.filter(p => p.type === 'simple')}
                />
            )}
        </div>
    );
};

export default ProductCustomizer;