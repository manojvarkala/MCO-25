import React, { FC, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { ShoppingCart, Edit, DownloadCloud, Trash2 } from 'lucide-react';
import Spinner from './Spinner.tsx';
import type { ProductVariation, ProductVariationType, BillingPeriod } from '../types.ts';
// FIX: Imported 'toast' to enable notifications.
import toast from 'react-hot-toast';

const ProductCustomizer: FC = () => {
    const { activeOrg, isInitializing } = useAppContext();
    const [variations, setVariations] = useState<ProductVariation[]>([]);
    const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
    
    // State for bulk editing
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkRegularPrice, setBulkRegularPrice] = useState('');
    const [bulkSalePrice, setBulkSalePrice] = useState('');

    useEffect(() => {
        // This effect can be used to load saved variations from an API in the future
        // For now, it initializes with a default set if none exist
        if (activeOrg && variations.length === 0) {
            const initialVariations: ProductVariation[] = activeOrg.examProductCategories.flatMap(category => {
                const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);
                const variationsForCat: ProductVariation[] = [];

                if (certExam) {
                    variationsForCat.push({
                        id: `${certExam.id}-simple`,
                        name: `${category.name} - Single Purchase`,
                        sku: certExam.productSku,
                        type: 'simple',
                        regularPrice: certExam.regularPrice?.toFixed(2) || '',
                        salePrice: certExam.price?.toFixed(2) || '',
                    });
                }
                return variationsForCat;
            });
            setVariations(initialVariations);
        }
    }, [activeOrg]);

    const handleUpdate = (id: string, field: keyof ProductVariation, value: any) => {
        setVariations(vars => vars.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    // --- BULK EDIT LOGIC ---
    const isAllSelected = variations.length > 0 && selectedIds.size === variations.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(variations.map(v => v.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, isChecked: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        if (isChecked) {
            newSelectedIds.add(id);
        } else {
            newSelectedIds.delete(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const applyBulkChange = (field: 'regularPrice' | 'salePrice', value: string) => {
        if (selectedIds.size === 0) return;
        setVariations(vars => vars.map(v => selectedIds.has(v.id) ? { ...v, [field]: value } : v));
    };

    // --- CSV GENERATION ---
    const generateCsv = () => {
        setIsGeneratingCsv(true);
        const toastId = toast.loading('Generating CSV...');
        
        try {
            const headers = [
                'Type', 'SKU', 'Name', 'Published', 'Is featured?', 'Visibility in catalog', 'Short description', 'Description', 'Date sale price starts', 'Date sale price ends', 'Tax status', 'Tax class', 'In stock?', 'Stock', 'Low stock amount', 'Backorders allowed?', 'Sold individually?', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)', 'Allow customer reviews?', 'Purchase note', 'Sale price', 'Regular price', 'Categories', 'Tags', 'Shipping class', 'Images', 'Download limit', 'Download expiry days', 'Parent', 'Grouped products', 'Upsells', 'Cross-sells', 'External URL', 'Button text', 'Position', 'Attribute 1 name', 'Attribute 1 value(s)', 'Attribute 1 visible', 'Attribute 1 global', 'Meta: _virtual', 'Meta: _downloadable'
            ];
            
            const subscriptionHeaders = [
                'Subscription Price', 'Subscription Period', 'Subscription Period Interval', 'Subscription Length', 'Subscription Sign Up Fee', 'Subscription Trial Period', 'Subscription Trial Length'
            ];

            const hasSubscriptions = variations.some(v => v.type === 'subscription');
            const finalHeaders = hasSubscriptions ? [...headers, ...subscriptionHeaders] : headers;

            const data = variations.map(v => {
                const row = {
                    'Type': v.type === 'simple' ? 'simple' : 'variable', // Base product is variable if subscriptions exist
                    'SKU': v.sku,
                    'Name': v.name,
                    'Published': 1,
                    'Visibility in catalog': 'visible',
                    'Regular price': v.regularPrice,
                    'Sale price': v.salePrice,
                    'Meta: _virtual': 'yes',
                    'Meta: _downloadable': 'yes'
                };
                return row;
            });
            
            const escapeCsvField = (field: any): string => {
                const str = String(field ?? '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const headerRow = finalHeaders.join(',');
            const dataRows = data.map(row => 
                finalHeaders.map(header => escapeCsvField((row as any)[header])).join(',')
            );

            const csvContent = [headerRow, ...dataRows].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "woocommerce_products.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
             <p className="text-[rgb(var(--color-text-muted-rgb))]">
                Customize product variations for your exam programs, then generate a CSV file for easy import into WooCommerce.
            </p>

            {selectedIds.size > 0 && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] sticky top-24 z-10">
                    <h3 className="font-bold text-lg mb-2">Bulk Edit ({selectedIds.size} selected)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="text-sm font-medium">Regular Price</label>
                            <input type="text" value={bulkRegularPrice} onChange={e => setBulkRegularPrice(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g., 59.99" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Sale Price</label>
                            <input type="text" value={bulkSalePrice} onChange={e => setBulkSalePrice(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g., 49.99" />
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => applyBulkChange('regularPrice', bulkRegularPrice)} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex-grow">Apply Regular</button>
                             <button onClick={() => applyBulkChange('salePrice', bulkSalePrice)} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex-grow">Apply Sale</button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center">
                        <ShoppingCart className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Product Variations
                    </h2>
                    <button
                        onClick={generateCsv}
                        disabled={isGeneratingCsv}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        {isGeneratingCsv ? <Spinner size="sm" /> : <DownloadCloud size={16} />}
                        <span className="ml-2">Generate CSV</span>
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[rgb(var(--color-border-rgb))]">
                        <thead className="bg-[rgb(var(--color-muted-rgb))]">
                            <tr>
                                <th className="p-3 w-10">
                                    <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider">Product Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider">SKU</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider">Type</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider">Regular Price</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-[rgb(var(--color-text-muted-rgb))] uppercase tracking-wider">Sale Price</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[rgb(var(--color-card-rgb))] divide-y divide-[rgb(var(--color-border-rgb))]">
                            {variations.map(v => (
                                <tr key={v.id}>
                                    <td className="p-3">
                                        <input type="checkbox" checked={selectedIds.has(v.id)} onChange={e => handleSelectOne(v.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                    </td>
                                    <td className="px-4 py-3"><input type="text" value={v.name} onChange={e => handleUpdate(v.id, 'name', e.target.value)} className="w-full p-1 border border-transparent rounded hover:border-slate-300 focus:border-cyan-500"/></td>
                                    <td className="px-4 py-3"><input type="text" value={v.sku} onChange={e => handleUpdate(v.id, 'sku', e.target.value)} className="w-full p-1 border border-transparent rounded hover:border-slate-300 focus:border-cyan-500"/></td>
                                    <td className="px-4 py-3 text-sm">{v.type}</td>
                                    <td className="px-4 py-3"><input type="text" value={v.regularPrice} onChange={e => handleUpdate(v.id, 'regularPrice', e.target.value)} className="w-24 p-1 border border-transparent rounded hover:border-slate-300 focus:border-cyan-500"/></td>
                                    <td className="px-4 py-3"><input type="text" value={v.salePrice} onChange={e => handleUpdate(v.id, 'salePrice', e.target.value)} className="w-24 p-1 border border-transparent rounded hover:border-slate-300 focus:border-cyan-500"/></td>
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