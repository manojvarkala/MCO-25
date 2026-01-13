import React, { FC, useState, useMemo, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, PlusCircle, Box, Repeat, Package, DollarSign, Tag } from 'lucide-react';
import Spinner from './Spinner.tsx';

type TabType = 'all' | 'simple' | 'subscription' | 'bundle';

interface ProductEntry {
    id: string;
    sku: string;
    name: string;
    type: string;
    price: string;
    regularPrice: string;
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

const ProductEditorModal: FC<{ product: ProductEntry; onClose: () => void; onSave: (data: any) => Promise<void>; isSaving: boolean }> = ({ product, onClose, onSave, isSaving }) => {
    const [formData, setFormData] = useState({
        name: product.name,
        price: product.price,
        regularPrice: product.regularPrice,
        sku: product.sku
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="text-xl font-black text-white flex items-center gap-2"><Edit size={20} className="text-cyan-500"/> Edit Product</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Display Name</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-3.5 text-slate-600" size={18}/>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                            />
                        </div>
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
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Product SKU</p>
                        <p className="text-sm font-mono text-cyan-400 mt-1">{product.sku}</p>
                    </div>
                </div>
                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isSaving} className="px-6 py-2.5 font-bold text-slate-400 hover:text-white transition-colors">Discard</button>
                    <button 
                        onClick={() => onSave(formData)} 
                        disabled={isSaving}
                        className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2"
                    >
                        {isSaving ? <Spinner size="sm"/> : <Save size={18}/>} UPDATE PRODUCT
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

    const products = useMemo(() => {
        if (!examPrices) return [];
        return Object.entries(examPrices).map(([sku, data]: [string, any]) => ({
            id: data.productId?.toString() || sku,
            sku,
            name: data.name || 'Untitled Product',
            type: data.isBundle ? 'bundle' : (data.subscription_period ? 'subscription' : 'simple'),
            price: data.price?.toString() || '0',
            regularPrice: data.regularPrice?.toString() || '0'
        }));
    }, [examPrices]);

    const filtered = useMemo(() => {
        if (activeTab === 'all') return products;
        return products.filter(p => p.type === activeTab);
    }, [activeTab, products]);

    const handleSaveProduct = async (formData: any) => {
        if (!token) return;
        setIsSaving(true);
        const tid = toast.loading("Updating WooCommerce database...");
        try {
            await googleSheetsService.adminUpsertProduct(token, formData);
            await refreshConfig();
            toast.success("Product Updated Successfully", { id: tid });
            setEditingProduct(null);
        } catch (e: any) {
            toast.error(e.message || "Failed to save product", { id: tid });
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
            </div>

            <div className="flex flex-wrap gap-3 p-1.5 bg-slate-950 rounded-xl border border-slate-800 self-start">
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>Full List</TabButton>
                <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')}>Standard</TabButton>
                <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}>Recurring</TabButton>
                <TabButton active={activeTab === 'bundle'} onClick={() => setActiveTab('bundle')}>Package Deals</TabButton>
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
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
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-inner ${
                                            p.type === 'bundle' ? 'bg-purple-900/30 text-purple-400 border border-purple-800' : 
                                            p.type === 'subscription' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 
                                            'bg-slate-950 text-slate-400 border border-slate-800'
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

            {editingProduct && (
                <ProductEditorModal 
                    product={editingProduct} 
                    onClose={() => setEditingProduct(null)} 
                    onSave={handleSaveProduct} 
                    isSaving={isSaving}
                />
            )}
        </div>
    );
};

export default ProductCustomizer;