import React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

export default function WooCommerceStyling() {
    const phpCode = `<?php
/**
 * Plugin Name:       MCO Custom Cart & Checkout Styling
 * Description:       Applies custom, modern styling to WooCommerce cart and checkout pages to match the exam app theme.
 * Version:           2.1.0
 * Author:            Annapoorna Infotech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- IMPORTANT ---
// After activating or updating this plugin, please clear any caching plugins you have active on your site (e.g., WP Rocket).
// --- IMPORTANT ---

if ( ! function_exists( 'mco_add_custom_wc_styles_to_head' ) ) {
    function mco_add_custom_wc_styles_to_head() {
        if ( function_exists('is_woocommerce') && (is_cart() || is_checkout()) ) {
            $custom_css = "
                /* --- General Body & Font Styles --- */
                body.woocommerce-cart, body.woocommerce-checkout {
                    background-color: #f8fafc !important; /* slate-50 */
                    color: #334155; /* slate-700 */
                }
                .woocommerce { font-family: 'Inter', sans-serif; }
                /* --- Page Headers --- */
                .woocommerce-cart h1, .woocommerce-checkout h1 {
                    font-size: 2.25rem; font-weight: 800; color: #0f172a; /* slate-900 */
                    border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 2rem;
                }
                /* --- Form Styling --- */
                .woocommerce form .form-row input.input-text, .woocommerce form .form-row textarea, .woocommerce select {
                    border-radius: 0.5rem !important; border: 1px solid #cbd5e1 !important; /* slate-300 */
                    padding: 0.75rem 1rem !important; box-shadow: none !important;
                }
                .woocommerce form .form-row input.input-text:focus, .woocommerce form .form-row textarea:focus, .woocommerce select:focus {
                    border-color: #0891b2 !important; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2) !important;
                    outline: none !important;
                }
                /* --- Button Styling --- */
                .woocommerce .button, .woocommerce button.button {
                    border-radius: 0.5rem !important; padding: 0.75rem 1.5rem !important; font-weight: 600 !important;
                    transition: all 0.2s ease-in-out !important; border: none !important;
                    box-shadow: 0 1px 3px 0 rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1) !important;
                }
                .woocommerce .button.alt, .woocommerce button.button.alt, .woocommerce #place_order {
                    background-color: #0891b2 !important; color: white !important;
                }
                .woocommerce .button.alt:hover, .woocommerce button.button.alt:hover, .woocommerce #place_order:hover {
                    background-color: #0e7490 !important;
                }
                .woocommerce .checkout-button { width: 100%; text-align: center; display: block; }
                /* --- Notices & Messages --- */
                .woocommerce-message, .woocommerce-info, .woocommerce-error {
                    border-top-color: #0891b2 !important; background-color: #f0f9ff !important; border-radius: 0.5rem;
                }
                .woocommerce-error { border-top-color: #dc2626 !important; }
                /* --- Cart Page Specifics --- */
                .woocommerce-cart .shop_table {
                    border: none !important; border-radius: 0.75rem !important; overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -2px rgba(0,0,0,.05);
                }
                .woocommerce-cart .shop_table thead { background-color: #f1f5f9; }
                .woocommerce-cart .shop_table th {
                    border-bottom: 2px solid #e2e8f0; text-transform: uppercase;
                    font-size: 0.75rem; color: #475569;
                }
                .woocommerce-cart .shop_table tbody td { border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
                .woocommerce-cart .shop_table .product-name a { color: #0f172a; font-weight: 600; }
                .woocommerce-cart .cart-collaterals .cart_totals {
                    border: 1px solid #e2e8f0; border-radius: 0.75rem;
                    padding: 1.5rem; background: #fff;
                }
                .woocommerce-cart .cart-collaterals .cart_totals h2 { font-size: 1.5rem; margin-bottom: 1rem; }
                /* --- Checkout Page Specifics --- */
                .woocommerce-checkout #customer_details, .woocommerce-checkout #order_review_heading, .woocommerce-checkout #order_review {
                    border: 1px solid #e2e8f0; padding: 2rem; background: #fff; border-radius: 0.75rem;
                }
                .woocommerce-checkout #order_review_heading {
                    border-bottom-left-radius: 0; border-bottom-right-radius: 0;
                    border-bottom: none; margin-bottom: 0;
                }
                .woocommerce-checkout #order_review {
                    border-top-left-radius: 0; border-top-right-radius: 0; margin-top: 0;
                }
                .woocommerce-checkout .woocommerce-checkout-payment { background: #f8fafc; border-radius: 0.5rem; }
                .woocommerce-checkout #place_order { width: 100%; font-size: 1.125rem !important; }
                /* Responsive Two-Column Checkout Layout */
                @media (min-width: 992px) {
                    .woocommerce-checkout .col2-set, .woocommerce-checkout .col-1, .woocommerce-checkout .col-2 {
                        float: none !important; width: 100% !important; margin: 0 !important;
                    }
                    .woocommerce-checkout form.checkout {
                        display: grid; grid-template-columns: 1fr 400px;
                        gap: 2rem; align-items: flex-start;
                    }
                    .woocommerce-checkout .woocommerce-billing-fields, .woocommerce-checkout .woocommerce-shipping-fields, .woocommerce-checkout .woocommerce-additional-fields {
                        grid-column: 1 / 2;
                    }
                    .woocommerce-checkout .woocommerce-checkout-review-order {
                        grid-column: 2 / 3; position: sticky; top: 2rem;
                    }
                }
            ";
            echo '<style type="text/css">' . $custom_css . '</style>';
        }
    }
    add_action('wp_head', 'mco_add_custom_wc_styles_to_head');
}


if ( ! function_exists( 'mco_custom_order_button_text' ) ) {
    function mco_custom_order_button_text() {
        return 'Complete Enrollment & Pay Securely';
    }
    add_filter( 'woocommerce_order_button_text', 'mco_custom_order_button_text' );
}

?>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(phpCode.trim())
            .then(() => toast.success('Styling plugin code copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Could not copy code.');
            });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-800">WooCommerce Styling Plugin</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2">1. The Styling Plugin</h2>
                <p className="mb-4">
                    This plugin applies a modern, clean style to your WooCommerce cart and checkout pages, ensuring a consistent user experience between your main store and the exam app. It is separate from the main integration plugin.
                </p>
                <p className="mb-4">
                    Copy the code below, save it as a new plugin file (e.g., <code>mco-wc-styling.php</code>) in your WordPress <code>/wp-content/plugins/</code> directory, and activate it.
                </p>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm">
                    <button 
                        onClick={copyToClipboard} 
                        className="absolute top-2 right-2 p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition"
                        title="Copy to clipboard"
                    >
                        <Copy size={16} />
                    </button>
                    <pre><code className="language-php">{phpCode.trim()}</code></pre>
                </div>
            </div>
        </div>
    );
}