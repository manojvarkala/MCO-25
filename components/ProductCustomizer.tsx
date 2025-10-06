import React, { FC, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization, ProductVariation } from '../types.ts';
import toast from 'react-hot-toast';
import { Edit, Save, X, ShoppingCart, Tag, RefreshCw, Trash2, PlusCircle } from 'lucide-react';
import Spinner from './Spinner.tsx';

type TabType = 'simple' | 'subscription' | 'bundle';

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

// This modal is only for bundles, it's fine as is.
interface UpsertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: any) => Promise<void>;
    isSaving: boolean;
    productToEdit?: ProductVariation;
    simpleProducts: ProductVariation[];
    subscriptionProducts: ProductVariation[];
}

const UpsertBundleModal: FC<UpsertModalProps> = ({ isOpen, onClose, onSave, isSaving, productToEdit, simpleProducts, subscriptionProducts }) => {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('');
    const [regularPrice, setRegularPrice] = useState('');
    const [selectedSimpleSkus, setSelectedSimpleSkus] = useState<string[]>([]);
    const [selectedSubscriptionSku, setSelectedSubscriptionSku] = useState<string>('');
    
    useEffect(() => {
        if (isOpen) {
            if (productToEdit?.sku) { // Editing existing bundle
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
        if (!name || !sku || !price || !regularPrice) {
            toast.error("All fields are required.");
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
            regularPrice: parseFloat(regularPrice),
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
        return selectedItems.reduce((total, item) => total + parseFloat(item.regularPrice || '0'), 0);
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
                                    <label key={p.sku} className="flex items-center gap-2 p-2 rounded bg-[rgb(var(--color-card-rgb))] cursor-pointer">
                                        <input type="checkbox" checked={selectedSimpleSkus.includes(p.sku)} onChange={() => handleSimpleProductToggle(p.sku)} />
                                        <span>{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                         <div className="p-3 border rounded-lg bg-[rgb(var(--color-muted-rgb))]">
                             <h3 className="font-semibold mb-2">Included Subscription</h3>
                            <select value={selectedSubscriptionSku} onChange={e => setSelectedSubscriptionSku(e.target.value)} className="w-full p-2 border rounded bg-white">
                                <option value="">None</option>
                                {subscriptionProducts.map(s => <option key={s.sku} value={s.sku}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* --- Pricing --- */}
                    {selectedItems.length > 0 && (
                        <div className="p-4 border-dashed border-2 rounded-lg border-slate-300">
                             <h3 className="font-semibold mb-2">Selected Items (Total Value: ${totalRegularPrice.toFixed(2)})</h3>
                             <ul className="text-sm space-y-1">
                                {selectedItems.map(item => (
                                    <li key={item.sku} className="flex justify-between">
                                        <span>{item.name}</span>
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
    const { activeOrg, examPrices, updateActiveOrg } = useAppContext();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('simple');
    
    // State for bundle modal
    const [editingProduct, setEditingProduct] = useState<ProductVariation | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    // State for bulk editing
    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    // Clear selection when tab changes
    useEffect(() => {
        setSelectedSkus([]);
    }, [activeTab]);
    
    const { simpleProducts, subscriptionProducts, bundleProducts } = useMemo(() => {
        if (!activeOrg || !examPrices) return { simpleProducts: [], subscriptionProducts: [], bundleProducts: [] };

        const simple: ProductVariation[] = [];
        const subscriptions: ProductVariation[] = [];
        const bundles: ProductVariation[] = [];

        Object.keys(examPrices).forEach(sku => {
            const priceData = examPrices[sku];
            const exam = activeOrg.exams.find(e => e.productSku === sku && !e.isPractice);

            const product: ProductVariation = {
                id: priceData.productId?.toString() || sku,
                sku: sku,
                name: priceData.name || exam?.name || 'Unknown Product',
                type: 'simple',
                salePrice: priceData.price?.toString() || '0',
                regularPrice: priceData.regularPrice?.toString() || '0',
                ...priceData
            };

            if (exam) {
                simple.push(product);
            } else if (sku.startsWith('sub-')) {
                product.type = 'subscription';
                if (sku.includes('monthly')) product.name = 'Monthly Subscription';
                if (sku.includes('yearly')) product.name = 'Yearly Subscription';
                subscriptions.push(product);
            } else if (priceData.isBundle) {
                product.type = 'bundle';
                bundles.push(product);
            }
        });

        return { 
            simpleProducts: simple.sort((a,b) => a.name.localeCompare(b.name)), 
            subscriptionProducts: subscriptions, 
            bundleProducts: bundles.sort((a,b) => a.name.localeCompare(b.name)) 
        };
    }, [activeOrg, examPrices]);

    const handleUpsertBundle = async (productData: any) => {
        if (!token || !activeOrg) {
            toast.error("Authentication error.");
            return;
        }

        setIsSaving(true);
        try {
            const result = await googleSheetsService.adminUpsertProduct(token, productData);
            const newOrgData = result.organizations.find((o: Organization) => o.id === activeOrg.id);
            if (newOrgData) {
                const updatedOrgWithNewPrices = { ...newOrgData, ...{ examPrices: result.examPrices } };
                updateActiveOrg(updatedOrgWithNewPrices);
            }
            toast.success(`Bundle "${productData.name}" saved successfully!`);
            setEditingProduct(undefined);
        } catch (error: any) {
            toast.error(error.message || "Failed to save bundle.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkUpdate = async (salePrice: string, regularPrice: string) => {
        if (!token || !activeOrg) {
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
        
        const updatePromises = selectedSkus.map(sku => {
            const productData: any = { sku };
            if (salePrice) productData.price = parseFloat(salePrice);
            if (regularPrice) productData.regularPrice = parseFloat(regularPrice);
            return googleSheetsService.adminUpsertProduct(token, productData);
        });

        try {
            const results = await Promise.all(updatePromises);
            const lastResult = results[results.length - 1];
            if (lastResult && lastResult.organizations) {
                const newOrg = lastResult.organizations.find(o => o.id === activeOrg.id);
                if (newOrg) {
                    const updatedOrgWithNewPrices = { ...newOrg, ...{ examPrices: lastResult.examPrices } };
                    updateActiveOrg(updatedOrgWithNewPrices);
                }
            }
            toast.success(`${selectedSkus.length} products updated!`, { id: toastId });
            setSelectedSkus([]);
        } catch (error: any) {
            toast.error(error.message || "An error occurred during bulk update.", { id: toastId });
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, products: ProductVariation[]) => {
        setSelectedSkus(e.target.checked ? products.map(p => p.sku) : []);
    };
    
    const handleSelectOne = (sku: string, checked: boolean) => {
        setSelectedSkus(prev => checked ? [...prev, sku] : prev.filter(pSku => pSku !== sku));
    };

    const renderProducts = (products: ProductVariation[], tab: TabType) => {
        const allowEditing = tab === 'simple' || tab === 'subscription';
        return (
            <div className="space-y-2">
                {products.map(product => (
                    <div key={product.sku} className={`flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg ${selectedSkus.includes(product.sku) ? 'ring-2 ring-[rgb(var(--color-primary-rgb))]' : ''}`}>
                        <div className="flex items-center">
                            {allowEditing && (
                                <input
                                    type="checkbox"
                                    checked={selectedSkus.includes(product.sku)}
                                    onChange={e => handleSelectOne(product.sku, e.target.checked)}
                                    className="h-4 w-4 mr-4"
                                />
                            )}
                            <div>
                                <p className="font-semibold">{product.name}</p>
                                <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div>
                                {parseFloat(product.regularPrice) > parseFloat(product.salePrice) && (
                                    <span className="text-sm line-through text-slate-500">${parseFloat(product.regularPrice).toFixed(2)}</span>
                                )}
                                <span className="font-bold ml-2">${parseFloat(product.salePrice).toFixed(2)}</span>
                            </div>
                            {product.type === 'bundle' && (
                                <button onClick={() => setEditingProduct(product)} className="p-2 rounded-full hover:bg-[rgb(var(--color-border-rgb))]">
                                    <Edit size={16} />
                                </button>
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
        let showCreate = false;
        let allowBulkEdit = false;

        if (activeTab === 'simple') { products = simpleProducts; title = 'Certification Exams'; allowBulkEdit = true; }
        if (activeTab === 'subscription') { products = subscriptionProducts; title = 'Subscription Products'; allowBulkEdit = true; }
        if (activeTab === 'bundle') { products = bundleProducts; title = 'Bundle Products'; showCreate = true; }
        
        const isAllSelected = selectedSkus.length === products.length && products.length > 0;

        return (
            <div>
                 {allowBulkEdit && selectedSkus.length > 0 && (
                    <BulkEditPanel
                        selectedCount={selectedSkus.length}
                        onSave={handleBulkUpdate}
                        onCancel={() => setSelectedSkus([])}
                        isSaving={isBulkSaving}
                    />
                 )}
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold">{title}</h3>
                    {showCreate && (
                        <button onClick={() => setEditingProduct({ type: 'bundle' } as ProductVariation)} className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600">
                            <PlusCircle size={16}/> Create New Bundle
                        </button>
                    )}
                </div>
                
                 {allowBulkEdit && products.length > 0 && (
                    <div className="flex items-center p-2 mb-2">
                        <input type="checkbox" onChange={(e) => handleSelectAll(e, products)} checked={isAllSelected} className="h-4 w-4 mr-4"/>
                        <span className="font-semibold text-sm">Select All</span>
                    </div>
                )}

                {products.length > 0 ? renderProducts(products, activeTab) : <p className="text-center p-4 text-slate-500">No {activeTab} products found.</p>}
            </div>
        );
    };

    return (
         <div className="space-y-8">
            <UpsertBundleModal 
                isOpen={!!editingProduct}
                onClose={() => setEditingProduct(undefined)}
                onSave={handleUpsertBundle}
                isSaving={isSaving}
                productToEdit={editingProduct?.type === 'bundle' ? editingProduct : undefined}
                simpleProducts={simpleProducts}
                subscriptionProducts={subscriptionProducts}
            />

            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3"><ShoppingCart /> Product Customizer</h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">Manage your exam products and pricing. Changes to Simple and Subscription products are saved live to WooCommerce.</p>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex space-x-2 mb-4">
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