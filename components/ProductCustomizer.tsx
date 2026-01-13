import React, { FC, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ProductVariation } from '../types.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, PlusCircle, Box, Repeat, Package } from 'lucide-react';
import Spinner from './Spinner.tsx';

type TabType = 'all' | 'simple' | 'subscription' | 'bundle';

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

const ProductCustomizer: FC = () => {
    const { examPrices, refreshConfig } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [isSaving, setIsSaving] = useState(false);

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

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h1 className="text-4xl font-black text-slate-100 font-display flex items-center gap-3">
                    <ShoppingCart className="text-cyan-500" /> Store Inventory
                </h1>
                <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW SIMPLE</button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW SUB</button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-black text-xs hover:bg-purple-500 transition shadow-lg uppercase tracking-wider"><PlusCircle size={16}/> NEW BUNDLE</button>
                </div>
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
                                        <button className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-600 shadow-sm">
                                            <Edit size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="p-20 text-center text-slate-600 italic font-mono uppercase tracking-widest text-xs">
                        Search criteria yielded zero results.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCustomizer;