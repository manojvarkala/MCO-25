import React, { FC, useState, useMemo, ChangeEvent } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ProductVariation, ProductVariationType, BillingPeriod } from '../types.ts';
import { DownloadCloud, Package, PlusCircle, Trash2, Edit, Save, X, Tag, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductCustomizer: FC = () => {
    const { activeOrg } = useAppContext();
    
    // Initialize state from context, setting up default product variations.
    const [productConfigs, setProductConfigs] = useState(() => {
        if (!activeOrg) return {};
        const initialConfigs: { [key: string]: ProductVariation[] } = {};
        activeOrg.examProductCategories.forEach(prog => {
            initialConfigs[prog.id] = [
                // Default Single Purchase
                {
                    id: `${prog.certificationExamId}-simple-${Date.now()}`,
                    name: `${prog.name}`,
                    sku: prog.certificationExamId,
                    type: 'simple',
                    regularPrice: '49.99',
                    salePrice: '',
                },
                // Default Bundle
                {
                    id: `${prog.certificationExamId}-bundle-${Date.now()}`,
                    name: `${prog.name} - Bundle`,
                    sku: `${prog.certificationExamId}-1`,
                    type: 'bundle',
                    regularPrice: '79.99',
                    salePrice: '59.99',
                }
            ];
        });
        return initialConfigs;
    });

    const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
    const [selectedVariations, setSelectedVariations] = useState<Set<string>>(new Set());

    // State for bulk edit toolbar
    const [bulkRegularPrice, setBulkRegularPrice] = useState('');
    const [bulkSalePrice, setBulkSalePrice] = useState('');

    const allVariationIds = useMemo(() => {
        return Object.values(productConfigs).flat().map(v => v.id);
    }, [productConfigs]);

    const handleSelectVariation = (variationId: string) => {
        setSelectedVariations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(variationId)) {
                newSet.delete(variationId);
            } else {
                newSet.add(variationId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedVariations.size === allVariationIds.length) {
            setSelectedVariations(new Set());
        } else {
            setSelectedVariations(new Set(allVariationIds));
        }
    };

    const handleApplyBulkEdit = (field: 'regularPrice' | 'salePrice') => {
        const value = field === 'regularPrice' ? bulkRegularPrice : bulkSalePrice;
        if (value === '') {
            toast.error(`Please enter a value to apply.`);
            return;
        }

        setProductConfigs(prev => {
            const newConfigs = { ...prev };
            for (const progId in newConfigs) {
                newConfigs[progId] = newConfigs[progId].map(v => {
                    if (selectedVariations.has(v.id)) {
                        return { ...v, [field]: value };
                    }
                    return v;
                });
            }
            return newConfigs;
        });

        toast.success(`Applied ${field} to ${selectedVariations.size} items.`);
        if (field === 'regularPrice') setBulkRegularPrice('');
        if (field === 'salePrice') setBulkSalePrice('');
    };
    
    const handleAddVariation = (programId: string) => {
        const newVariation: ProductVariation = {
            id: `new-${Date.now()}`,
            name: `${activeOrg?.examProductCategories.find(p=>p.id === programId)?.name || 'New Product'}`,
            sku: `new-sku-${Date.now()}`,
            type: 'simple',
            regularPrice: '',
            salePrice: '',
        };
        setProductConfigs(prev => ({
            ...prev,
            [programId]: [...prev[programId], newVariation]
        }));
        setEditingVariation(newVariation);
    };

    const handleRemoveVariation = (programId: string, variationId: string) => {
        if (window.confirm('Are you sure you want to remove this product variation?')) {
            setProductConfigs(prev => ({
                ...prev,
                [programId]: prev[programId].filter(v => v.id !== variationId)
            }));
        }
    };
    
    const handleEditClick = (variation: ProductVariation) => {
        setEditingVariation(JSON.parse(JSON.stringify(variation))); // Deep copy to avoid state mutation
    };

    const handleCancelEdit = () => {
        setEditingVariation(null);
    };

    const handleSaveEdit = (programId: string) => {
        if (!editingVariation) return;
        setProductConfigs(prev => ({
            ...prev,
            [programId]: prev[programId].map(v => v.id === editingVariation.id ? editingVariation : v)
        }));
        setEditingVariation(null);
        toast.success('Variation saved!');
    };
    
    const handleEditingChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingVariation) return;
        const { name, value } = e.target;
        setEditingVariation({
            ...editingVariation,
            [name]: value
        });
    };
    
    const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const generateAndDownloadCsv = () => {
        const headers = [
            'Type', 'SKU', 'Name', 'Published', 'Is featured?', 'Visibility in catalog',
            'Short description', 'Description', 'Date sale price starts', 'Date sale price ends',
            'Tax status', 'Tax class', 'In stock?', 'Stock', 'Backorders allowed?',
            'Sold individually?', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)',
            'Allow customer reviews?', 'Purchase note', 'Sale price', 'Regular price', 'Categories',
            'Tags', 'Shipping class', 'Images', 'Download limit', 'Download expiry days',
            'Parent', 'Grouped products', 'Upsells', 'Cross-sells', 'External URL',
            'Button text', 'Position', 'Attribute 1 name', 'Attribute 1 value(s)',
            'Attribute 1 visible', 'Attribute 1 global',
            // Subscription specific
            'Subscription price', 'Subscription period', 'Subscription period interval', 'Subscription length',
            'Subscription sign-up fee', 'Subscription trial period', 'Subscription trial length'
        ];
        
        let csvContent = headers.map(escapeCsvField).join(',') + '\n';

        Object.values(productConfigs).flat().forEach(v => {
            const row: {[key: string]: any} = {
                'Type': v.type === 'bundle' ? 'simple' : v.type, // Treat bundle as simple for basic import
                'SKU': v.sku,
                'Name': v.name,
                'Published': 1,
                'Visibility in catalog': 'visible',
                'Regular price': v.regularPrice,
                'Sale price': v.salePrice,
                'In stock?': 1,
                'Subscription price': v.subscriptionPrice || '',
                'Subscription period': v.subscriptionPeriod || '',
                'Subscription period interval': v.subscriptionPeriodInterval || '',
                'Subscription length': v.subscriptionLength || '',
            };
            
            const rowData = headers.map(header => row[header] || '');
            csvContent += rowData.map(escapeCsvField).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "woocommerce_products_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('WooCommerce products CSV downloaded!');
    };

    const inputClass = "w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition";

    const EditModal = ({ programId }: { programId: string }) => {
        if (!editingVariation) return null;
        
        return (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Editing: {editingVariation.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><label className="font-semibold">Name</label><input type="text" name="name" value={editingVariation.name} onChange={handleEditingChange} className={inputClass} /></div>
                        <div><label className="font-semibold">SKU</label><input type="text" name="sku" value={editingVariation.sku} onChange={handleEditingChange} className={inputClass} /></div>
                        <div><label className="font-semibold">Type</label>
                            <select name="type" value={editingVariation.type} onChange={handleEditingChange} className={inputClass}>
                                <option value="simple">Simple Product</option>
                                <option value="subscription">Subscription</option>
                                <option value="bundle">Simple Product (Bundle)</option>
                            </select>
                        </div>
                        <div><label className="font-semibold">Regular Price</label><input type="text" name="regularPrice" value={editingVariation.regularPrice} onChange={handleEditingChange} className={inputClass} /></div>
                        <div><label className="font-semibold">Sale Price</label><input type="text" name="salePrice" value={editingVariation.salePrice} onChange={handleEditingChange} className={inputClass} /></div>

                        {editingVariation.type === 'subscription' && (
                            <>
                                <div><label className="font-semibold">Subscription Price</label><input type="text" name="subscriptionPrice" value={editingVariation.subscriptionPrice || ''} onChange={handleEditingChange} className={inputClass} /></div>
                                <div><label className="font-semibold">Billing Interval</label><input type="number" name="subscriptionPeriodInterval" value={editingVariation.subscriptionPeriodInterval || '1'} onChange={handleEditingChange} className={inputClass} min="1" /></div>
                                <div><label className="font-semibold">Billing Period</label>
                                    <select name="subscriptionPeriod" value={editingVariation.subscriptionPeriod || 'month'} onChange={handleEditingChange} className={inputClass}>
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="month">Month</option>
                                        <option value="year">Year</option>
                                    </select>
                                </div>
                                <div><label className="font-semibold">Subscription Length</label><input type="text" name="subscriptionLength" value={editingVariation.subscriptionLength || '0'} onChange={handleEditingChange} className={inputClass} placeholder="0 for indefinite" /></div>
                            </>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={handleCancelEdit} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300"><X size={16} className="inline mr-1"/>Cancel</button>
                        <button onClick={() => handleSaveEdit(programId)} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"><Save size={16} className="inline mr-1"/>Save Changes</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`max-w-6xl mx-auto space-y-8 ${selectedVariations.size > 0 ? 'pb-24' : ''}`}>
             {editingVariation && <EditModal programId={Object.keys(productConfigs).find(key => productConfigs[key].some(v => v.id === editingVariation.id)) || ''} />}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold text-slate-900">Product Customizer</h1>
                <button
                    onClick={generateAndDownloadCsv}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                    <DownloadCloud size={20} className="mr-2" />
                    Generate WooCommerce CSV
                </button>
            </div>
            
            <div className="space-y-6">
                {activeOrg?.examProductCategories.map(program => (
                    <div key={program.id} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                                    <Package className="mr-3 text-cyan-500" />
                                    {program.name}
                                </h2>
                            </div>
                            <button onClick={() => handleAddVariation(program.id)} className="text-cyan-600 hover:text-cyan-800 flex items-center gap-1 font-semibold text-sm">
                                <PlusCircle size={16}/> Add Variation
                            </button>
                        </div>

                        <div className="space-y-3">
                            {productConfigs[program.id]?.map(variation => (
                                <div key={variation.id} className={`p-3 rounded-lg border flex justify-between items-center transition-colors ${selectedVariations.has(variation.id) ? 'bg-cyan-50 border-cyan-300' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                                            checked={selectedVariations.has(variation.id)}
                                            onChange={() => handleSelectVariation(variation.id)}
                                        />
                                        <div>
                                            <p className="font-semibold text-slate-800">{variation.name} <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">{variation.sku}</span></p>
                                            <p className="text-sm text-slate-500">
                                                Type: <span className="font-medium">{variation.type}</span> | Price: <span className="font-medium">${variation.regularPrice}</span> {variation.salePrice && <span className="line-through text-slate-400">${variation.salePrice}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEditClick(variation)} className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100"><Edit size={16}/></button>
                                        <button onClick={() => handleRemoveVariation(program.id, variation.id)} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-100"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {selectedVariations.size > 0 && (
                 <div className="fixed bottom-0 left-0 right-0 bg-slate-800 p-3 shadow-lg z-20 border-t border-slate-600 animate-fade-in-up">
                    <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-white font-semibold cursor-pointer">
                                <input 
                                    type="checkbox"
                                    className="h-5 w-5 rounded text-cyan-500 bg-slate-700 border-slate-500 focus:ring-cyan-500"
                                    onChange={handleSelectAll}
                                    checked={selectedVariations.size === allVariationIds.length}
                                />
                                {selectedVariations.size} selected
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="text" value={bulkRegularPrice} onChange={e => setBulkRegularPrice(e.target.value)} placeholder="Regular Price" className="p-2 rounded-md bg-slate-700 text-white border border-slate-500 text-sm w-32"/>
                            <button onClick={() => handleApplyBulkEdit('regularPrice')} className="px-3 py-2 bg-slate-600 text-white rounded-md text-sm font-semibold hover:bg-slate-500">Apply</button>
                        </div>
                         <div className="flex items-center gap-2">
                            <input type="text" value={bulkSalePrice} onChange={e => setBulkSalePrice(e.target.value)} placeholder="Sale Price" className="p-2 rounded-md bg-slate-700 text-white border border-slate-500 text-sm w-32"/>
                            <button onClick={() => handleApplyBulkEdit('salePrice')} className="px-3 py-2 bg-slate-600 text-white rounded-md text-sm font-semibold hover:bg-slate-500">Apply</button>
                        </div>
                    </div>
                     <style>{`
                        @keyframes fade-in-up {
                            from { opacity: 0; transform: translateY(100%); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fade-in-up {
                            animation: fade-in-up 0.3s ease-out forwards;
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default ProductCustomizer;