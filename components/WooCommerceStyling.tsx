import * as React from 'react';
import toast from 'react-hot-toast';
import { Copy, Code } from 'lucide-react';

export default function WooCommerceStyling() {
    const pluginCode = `<?php
/**
 * Plugin Name:       MCO Custom Cart & Checkout Styling
 * Description:       A simple plugin to restyle the WooCommerce cart and checkout pages to match the MCO Exam App.
 * Version:           1.0.0
 * Author:            Annapoorna Infotech
 *
 * How to use:
 * 1. Save this code as a new PHP file (e.g., mco-custom-styling.php).
 * 2. Upload it to your WordPress /wp-content/plugins/ directory.
 * 3. Activate the "MCO Custom Cart & Checkout Styling" plugin in your WordPress admin panel.
 * OR
 * 1. Use a "Code Snippets" plugin.
 * 2. Create a new snippet and paste this entire code block into it.
 * 3. Set the snippet to "Only run on site front-end".
 * 4. Save and activate the snippet.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Enqueue the custom styles
add_action( 'wp_enqueue_scripts', 'mco_enqueue_custom_wc_styles' );

function mco_enqueue_custom_wc_styles() {
    // Only load these styles on WooCommerce cart and checkout pages
    if ( ! function_exists( 'is_woocommerce' ) || ( ! is_cart() && ! is_checkout() ) ) {
        return;
    }

    $custom_css = "
        /* --- General Body & Font Styles --- */
        body.woocommerce-cart, body.woocommerce-checkout {
            background-color: #f8fafc !important; /* slate-50 */
            color: #334155; /* slate-700 */
        }

        .woocommerce { font-family: 'Inter', sans-serif; }

        /* --- Page Headers --- */
        .woocommerce-cart h1, .woocommerce-checkout h1 {
            font-size: 2.25rem;
            font-weight: 800;
            color: #0f172a; /* slate-900 */
            border-bottom: 2px solid #e2e8f0; /* slate-200 */
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }

        /* --- Form Styling (Inputs, Textareas, Selects) --- */
        .woocommerce form .form-row input.input-text, .woocommerce form .form-row textarea, .woocommerce select {
            border-radius: 0.5rem !important;
            border: 1px solid #cbd5e1 !important; /* slate-300 */
            padding: 0.75rem 1rem !important;
            box-shadow: none !important;
        }

        .woocommerce form .form-row input.input-text:focus, .woocommerce form .form-row textarea:focus, .woocommerce select:focus {
            border-color: #0891b2 !important; /* cyan-600 */
            box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2) !important;
            outline: none !important;
        }

        /* --- Button Styling --- */
        .woocommerce .button, .woocommerce button.button {
            border-radius: 0.5rem !important;
            padding: 0.75rem 1.5rem !important;
            font-weight: 600 !important;
            transition: all 0.2s ease-in-out !important;
            border: none !important;
            box-shadow: 0 1px 3px 0 rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1) !important;
        }
        
        .woocommerce .button.alt, .woocommerce button.button.alt, .woocommerce #place_order {
            background-color: #0891b2 !important; /* cyan-600 */
            color: white !important;
        }
        .woocommerce .button.alt:hover, .woocommerce button.button.alt:hover, .woocommerce #place_order:hover {
            background-color: #0e7490 !important; /* cyan-700 */
        }
        
        .woocommerce .checkout-button {
             width: 100%;
             text-align: center;
             display: block;
        }

        /* --- Notices & Messages --- */
        .woocommerce-message, .woocommerce-info, .woocommerce-error {
            border-top-color: #0891b2 !important; /* cyan-600 */
            background-color: #f0f9ff !important; /* sky-50 */
            border-radius: 0.5rem;
        }
        .woocommerce-error {
            border-top-color: #dc2626 !important; /* red-600 */
        }
        
        /* --- Cart Page Specifics --- */
        .woocommerce-cart .shop_table {
            border: none !important;
            border-radius: 0.75rem !important;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -2px rgba(0,0,0,.05);
        }
        .woocommerce-cart .shop_table thead {
            background-color: #f1f5f9; /* slate-100 */
        }
        .woocommerce-cart .shop_table th {
            border-bottom: 2px solid #e2e8f0; /* slate-200 */
            text-transform: uppercase;
            font-size: 0.75rem;
            color: #475569; /* slate-600 */
        }
        .woocommerce-cart .shop_table tbody td {
            border-bottom: 1px solid #e2e8f0; /* slate-200 */
            vertical-align: middle;
        }
        .woocommerce-cart .shop_table .product-name a {
            color: #0f172a; /* slate-900 */
            font-weight: 600;
        }
        
        .woocommerce-cart .cart-collaterals .cart_totals {
            border: 1px solid #e2e8f0; /* slate-200 */
            border-radius: 0.75rem;
            padding: 1.5rem;
            background: #fff;
        }
        .woocommerce-cart .cart-collaterals .cart_totals h2 {
             font-size: 1.5rem;
             margin-bottom: 1rem;
        }
        
        /* --- Checkout Page Specifics --- */
        .woocommerce-checkout #customer_details, .woocommerce-checkout #order_review_heading, .woocommerce-checkout #order_review {
            border: 1px solid #e2e8f0; /* slate-200 */
            padding: 2rem;
            background: #fff;
            border-radius: 0.75rem;
        }
        
        .woocommerce-checkout #order_review_heading {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            border-bottom: none;
            margin-bottom: 0;
        }
        .woocommerce-checkout #order_review {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            margin-top: 0;
        }
        
        .woocommerce-checkout .woocommerce-checkout-payment {
             background: #f8fafc; /* slate-50 */
             border-radius: 0.5rem;
        }
        
        .woocommerce-checkout #place_order {
            width: 100%;
            font-size: 1.125rem !important;
        }

        /* Responsive Two-Column Checkout Layout */
        @media (min-width: 992px) {
            .woocommerce-checkout .col2-set, .woocommerce-checkout .col-1, .woocommerce-checkout .col-2 {
                float: none !important;
                width: 100% !important;
                margin: 0 !important;
            }
            .woocommerce-checkout form.checkout {
                display: grid;
                grid-template-columns: 1fr 400px;
                gap: 2rem;
                align-items: flex-start;
            }
            .woocommerce-checkout .woocommerce-billing-fields, .woocommerce-checkout .woocommerce-shipping-fields, .woocommerce-checkout .woocommerce-additional-fields {
                 grid-column: 1 / 2;
            }
            .woocommerce-checkout .woocommerce-checkout-review-order {
                grid-column: 2 / 3;
                position: sticky;
                top: 2rem;
            }
        }
    ";
    
    wp_add_inline_style( 'woocommerce-general', $custom_css );
}

// Optional: Change 'Place order' button text for clarity
add_filter( 'woocommerce_order_button_text', 'mco_custom_order_button_text' );
function mco_custom_order_button_text() {
    return 'Complete Enrollment & Pay Securely';
}
?>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(pluginCode.trim())
            .then(() => {
                toast.success('PHP code copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Could not copy code.');
            });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-800">WooCommerce Cart & Checkout Styling</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Code size={20} className="text-cyan-500"/> Custom Styling Code</h2>
                <p className="mb-4">
                    To make your WooCommerce cart and checkout pages match the modern feel of this exam app, use the following PHP snippet. This code adds custom CSS to your site without needing a separate stylesheet file.
                </p>
                <p className="font-semibold mb-2">How to Implement:</p>
                <ol className="list-decimal list-inside space-y-1 mb-4">
                    <li><strong>Option A (Plugin):</strong> Save this code as a new PHP file (e.g., <code>mco-custom-styling.php</code>) and upload it to your WordPress <code>/wp-content/plugins/</code> directory. Activate it from your admin panel.</li>
                    <li><strong>Option B (Snippet):</strong> Use a plugin like "Code Snippets". Create a new snippet, paste this code, set it to "Only run on site front-end", and activate it.</li>
                </ol>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm max-h-[50vh] overflow-auto">
                    <button 
                        onClick={copyToClipboard} 
                        className="absolute top-2 right-2 p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition sticky"
                        title="Copy to clipboard"
                        >
                        <Copy size={16} />
                    </button>
                    <pre><code className="language-php">{pluginCode.trim()}</code></pre>
                </div>
            </div>
        </div>
    );
}
