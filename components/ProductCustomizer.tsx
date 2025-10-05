import React, { FC, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { ShoppingCart, DownloadCloud } from 'lucide-react';
import Spinner from './Spinner.tsx';
import type { ProductVariation, BillingPeriod } from '../types.ts';
import toast from 'react-hot-toast';

const ProductCustomizer: FC = () => {
    const { activeOrg, isInitializing } = useAppContext();
    const [variations, setVariations] = useState<ProductVariation[]>([]);
    const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkValues, setBulkValues] = useState({
        regularPrice: '',
        salePrice: '',
        subscriptionPrice: '',
        subscriptionPeriod: 'month' as BillingPeriod,
        subscriptionPeriodInterval: '1',
        subscriptionLength: '0',
    });
    const [activeBulkTab, setActiveBulkTab] = useState<'simple' | 'subscription'>('simple');

    useEffect(() => {
        if (activeOrg && variations.length === 0) {
            const initialVariations: ProductVariation[] = activeOrg.examProductCategories.flatMap(category => {
                const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);
                const variationsForCat: ProductVariation[] = [];
                if (certExam) {
                    variationsForCat.push({
                        id: `${certExam.id}-simple`, name: `${category.name} - Single Purchase`, sku: certExam.productSku,
                        type: 'simple', regularPrice: certExam.regularPrice?.toFixed(2) || '', salePrice: certExam.price?.toFixed(2) || '',
                    });
                    variationsForCat.push({
                        id: `${certExam.id}-bundle`, name: `${category.name} - Exam Bundle`, sku: `${certExam.productSku}-1`,
                        type: 'simple', regularPrice: '79.99', salePrice: '59.99',
                    });
                }
                return variationsForCat;
            });
             const subs: ProductVariation[] = [
                { id: `sub-monthly`, name: `All Access Subscription - Monthly`, sku: `sub-monthly`, type: 'subscription', regularPrice: '29.99', salePrice: '19.99', subscriptionPrice: '19.99', subscriptionPeriod: 'month', subscriptionPeriodInterval: '1', subscriptionLength: '0' },
                { id: `sub-yearly`, name: `All Access Subscription - Yearly`, sku: `sub-yearly`, type: 'subscription', regularPrice: '239.88', salePrice: '149.99', subscriptionPrice: '149.99', subscriptionPeriod: 'year', subscriptionPeriodInterval: '1', subscriptionLength: '0' },
            ];
            setVariations([...initialVariations, ...subs]);
        }
    }, [activeOrg]);

    const handleUpdate = (id: string, field: keyof ProductVariation, value: any) => {
        setVariations(vars => vars.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const isAllSelected = variations.length > 0 && selectedIds.size === variations.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? new Set(variations.map(v => v.id)) : new Set());
    };

    const handleSelectOne = (id: string, isChecked: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        isChecked ? newSelectedIds.add(id) : newSelectedIds.delete(id);
        setSelectedIds(newSelectedIds);
    };

    const applyBulkChange = (fieldsToUpdate: (keyof typeof bulkValues)[]) => {
        if (selectedIds.size === 0) return;

        setVariations(vars => vars.map(v => {
            if (selectedIds.has(v.id)) {
                const updates: Partial<ProductVariation> = {};
                fieldsToUpdate.forEach(field => {
                    if (bulkValues[field] !== '') {
                        (updates as any)[field] = bulkValues[field];
                    }
                });
                return { ...v, ...updates };
            }
            return v;
        }));
        toast.success(`Applied bulk changes to ${selectedIds.size} items.`);
    };
    
    const generateCsv = () => {
        setIsGeneratingCsv(true);
        const toastId = toast.loading('Generating CSV...');
        
        try {
            const headers = ['Type', 'SKU', 'Name', 'Published', 'Regular price', 'Sale price', 'Subscription Price', 'Subscription Period', 'Subscription Period Interval', 'Subscription Length', 'Meta: _virtual', 'Meta: _downloadable'];
            
            const data = variations.map(v => [
                v.type === 'subscription' ? 'subscription' : 'simple',
                v.sku, v.name, 1, v.regularPrice, v.salePrice,
                v.subscriptionPrice || '', v.subscriptionPeriod || '', v.subscriptionPeriodInterval || '', v.subscriptionLength || '',
                1, 1
            ]);
            
            const escapeCsvField = (field: any): string => {
                const str = String(field ?? '');
                return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
            };

            const csvContent = [headers.join(','), ...data.map(row => row.map(escapeCsvField).join(','))].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url); link.setAttribute("download", "woocommerce_products.csv");
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('CSV generated successfully!', { id: toastId });
        } catch (error: any) {
            toast.error(`Failed to generate CSV: ${error.message}`, { id: toastId });
        } finally {
            setIsGeneratingCsv(false);
        }
    };

    if (isInitializing) return <div className="text-center py-10"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">WooCommerce Product Customizer</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">Customize product variations, then generate a CSV for easy import into WooCommerce.</p>

            {selectedIds.size > 0 && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Bulk Edit ({selectedIds.size} selected)</h3>
                        <div className="flex border border-[rgb(var(--color-border-rgb))] rounded-lg p-1">
                            <button onClick={() => setActiveBulkTab('simple')} className={`px-3 py-1 text-sm font-semibold rounded-md ${activeBulkTab === 'simple' ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Simple Products</button>
                            <button onClick={() => setActiveBulkTab('subscription')} className={`px-3 py-1 text-sm font-semibold rounded-md ${activeBulkTab === 'subscription' ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Subscriptions</button>
                        </div>
                    </div>
                    {activeBulkTab === 'simple' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div><label className="text-sm font-medium">Regular Price</label><input type="text" value={bulkValues.regularPrice} onChange={e => setBulkValues({...bulkValues, regularPrice: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                            <div><label className="text-sm font-medium">Sale Price</label><input type="text" value={bulkValues.salePrice} onChange={e => setBulkValues({...bulkValues, salePrice: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                            <button onClick={() => applyBulkChange(['regularPrice', 'salePrice'])} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 h-10">Apply Simple Prices</button>
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                             <div><label className="text-sm font-medium">Sub Price</label><input type="text" value={bulkValues.subscriptionPrice} onChange={e => setBulkValues({...bulkValues, subscriptionPrice: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                             <div><label className="text-sm font-medium">Period</label><select value={bulkValues.subscriptionPeriod} onChange={e => setBulkValues({...bulkValues, subscriptionPeriod: e.target.value as BillingPeriod})} className="w-full p-2 border border-slate-300 rounded-md bg-white h-10"><option value="month">Month</option><option value="year">Year</option></select></div>
                             <div><label className="text-sm font-medium">Interval</label><input type="number" value={bulkValues.subscriptionPeriodInterval} onChange={e => setBulkValues({...bulkValues, subscriptionPeriodInterval: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/></div>
                             <div><label className="text-sm font-medium">Length (0=forever)</label><input type="number" value={bulkValues.subscriptionLength} onChange={e => setBulkValues({...bulkValues, subscriptionLength: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/></div>
                             <button onClick={() => applyBulkChange(['subscriptionPrice', 'subscriptionPeriod', 'subscriptionPeriodInterval', 'subscriptionLength'])} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 h-10">Apply Sub Details</button>
                         </div>
                    )}
                </div>
            )}
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center"><ShoppingCart className="mr-3 text-[rgb(var(--color-primary-rgb))]" /> Product Variations</h2>
                    <button onClick={generateCsv} disabled={isGeneratingCsv} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"><DownloadCloud size={16} /><span className="ml-2">{isGeneratingCsv ? <Spinner size="sm" /> : 'Generate CSV'}</span></button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[rgb(var(--color-border-rgb))]">
                        <thead className="bg-[rgb(var(--color-muted-rgb))]">
                            <tr>
                                <th className="p-3 w-10"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" /></th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase">Product Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase">SKU</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase">Type</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase">Regular Price</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase">Sale/Sub Price</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[rgb(var(--color-card-rgb))] divide-y divide-[rgb(var(--color-border-rgb))]">
                            {variations.map(v => (
                                <tr key={v.id} className={selectedIds.has(v.id) ? 'bg-[rgba(var(--color-primary-rgb),0.05)]' : ''}>
                                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(v.id)} onChange={e => handleSelectOne(v.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-cyan-600"/></td>
                                    <td className="px-4 py-3"><input type="text" value={v.name} onChange={e => handleUpdate(v.id, 'name', e.target.value)} className="w-full p-1 border border-transparent rounded bg-transparent hover:border-slate-300 focus:border-cyan-500"/></td>
                                    <td className="px-4 py-3"><input type="text" value={v.sku} onChange={e => handleUpdate(v.id, 'sku', e.target.value)} className="w-full p-1 border border-transparent rounded bg-transparent hover:border-slate-300 focus:border-cyan-500"/></td>
                                    <td className="px-4 py-3 text-sm">{v.type}</td>
                                    <td className="px-4 py-3"><input type="text" value={v.regularPrice} onChange={e => handleUpdate(v.id, 'regularPrice', e.target.value)} className="w-24 p-1 border border-transparent rounded bg-transparent hover:border-slate-300 focus:border-cyan-500"/></td>
                                    <td className="px-4 py-3"><input type="text" value={v.type === 'subscription' ? v.subscriptionPrice : v.salePrice} onChange={e => handleUpdate(v.id, v.type === 'subscription' ? 'subscriptionPrice' : 'salePrice', e.target.value)} className="w-24 p-1 border border-transparent rounded bg-transparent hover:border-slate-300 focus:border-cyan-500"/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductCustomizer;