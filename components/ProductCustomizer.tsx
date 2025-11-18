import React, { FC, useState, useMemo, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ProductVariation } from '../types.ts';
import { ShoppingCart } from 'lucide-react';

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

const ProductCustomizer: FC = () => {
    const { activeOrg, examPrices } = useAppContext();
    const [activeTab, setActiveTab] = useState<TabType>('all');

    const products = useMemo(() => {
        if (!examPrices || !activeOrg) return { all: [], simple: [], subscription: [], bundle: [] };
        
        const allProducts = Object.entries(examPrices).map(([sku, data]: [string, any]): ProductVariation => {
            const isActuallyBundle = data.isBundle || (Array.isArray(data.bundledSkus) && data.bundledSkus.length > 0);
            return {
                id: data.productId?.toString(),
                name: data.name,
                sku,
                type: isActuallyBundle ? 'bundle' : (data.type || 'simple'),
                regularPrice: data.regularPrice?.toString() ?? '',
                salePrice: data.price?.toString() ?? '',
                isBundle: isActuallyBundle,
                bundledSkus: data.bundledSkus || [],
                subscriptionPeriod: data._subscription_period,
                subscriptionPeriodInterval: data._subscription_period_interval,
                subscriptionLength: data._subscription_length,
            };
        });
        allProducts.sort((a,b) => (stripHtml(a.name) || '').localeCompare(stripHtml(b.name) || ''));

        return {
            all: allProducts,
            simple: allProducts.filter(p => p.type === 'simple' && !p.isBundle),
            subscription: allProducts.filter(p => p.type === 'subscription'),
            bundle: allProducts.filter(p => p.isBundle),
        };
    }, [examPrices, activeOrg]);

    const productsToDisplay = activeTab === 'all' ? products.all : products[activeTab];

    const wordpressUrl = activeOrg ? `https://${activeOrg.website}/wp-admin/edit.php?post_type=product` : '#';

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <ShoppingCart />
                Product Viewer
            </h1>

            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg" role="alert">
                <p className="font-bold">Product Management Update</p>
                <p>
                    For improved stability and integration, all product creation and editing is now managed directly within your WordPress dashboard. This view is read-only.
                </p>
                <a href={wordpressUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-blue-900 underline">
                    Go to WooCommerce Products &rarr;
                </a>
            </div>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>All ({products.all.length})</TabButton>
                        <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')}>Simple ({products.simple.length})</TabButton>
                        <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}>Subscriptions ({products.subscription.length})</TabButton>
                        <TabButton active={activeTab === 'bundle'} onClick={() => setActiveTab('bundle')}>Bundles ({products.bundle.length})</TabButton>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {productsToDisplay.map(product => (
                        <div key={product.sku} className="editable-card">
                            <div className="editable-card__header">
                                <div className="flex-grow">
                                    <h3 className="font-bold text-lg text-[rgb(var(--color-text-strong-rgb))]">{stripHtml(product.name)}</h3>
                                    <p className="text-xs font-mono text-[rgb(var(--color-text-muted-rgb))]">{product.sku}</p>
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
                 {productsToDisplay.length === 0 && (
                     <div className="text-center py-8 text-[rgb(var(--color-text-muted-rgb))]">
                        <p>No products to display in this category.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCustomizer;