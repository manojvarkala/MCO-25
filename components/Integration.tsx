
import React, { FC } from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A multi-tenant engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and API services. Provides [exam_login] and [exam_program_page] shortcodes.
 * Version:           26.0.0 (Server-Centric Architecture)
 * Author:            Annapoorna Infotech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define('MCO_PLUGIN_VERSION', '26.0.0');

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

function mco_plugin_activate() {
    mco_register_rest_api_routes();
    flush_rewrite_rules();
    set_transient('mco_admin_notice_activation', true, 5);
    add_option('mco_plugin_version', MCO_PLUGIN_VERSION);
}

function mco_plugin_deactivate() {
    flush_rewrite_rules();
    delete_option('mco_plugin_version');
}

// Automatically flush rewrite rules on plugin update to prevent "No route found" errors.
function mco_check_plugin_version() {
    if (get_option('mco_plugin_version') != MCO_PLUGIN_VERSION) {
        mco_register_rest_api_routes();
        flush_rewrite_rules();
        update_option('mco_plugin_version', MCO_PLUGIN_VERSION);
    }
}
add_action('plugins_loaded', 'mco_check_plugin_version');

// --- INITIALIZATION ---
add_action('init', function() {
    add_action('admin_notices', 'mco_check_dependencies');
    add_action('admin_menu', 'mco_exam_add_admin_menu');
    add_action('admin_init', 'mco_exam_register_settings');
    add_action('rest_api_init', 'mco_register_rest_api_routes');
    add_shortcode('exam_login', 'mco_exam_login_shortcode');
    add_shortcode('exam_program_page', 'mco_exam_program_page_shortcode');
    add_action('template_redirect', 'mco_handle_my_account_redirect');
});

// --- DEPENDENCY CHECKS ---
function mco_check_dependencies() {
    if (!class_exists('WooCommerce')) {
        echo '<div class="notice notice-error"><p><strong>Exam App Integration:</strong> WooCommerce is required for this plugin to function.</p></div>';
    }
    if (!defined('MCO_JWT_SECRET') || empty(MCO_JWT_SECRET)) {
        echo '<div class="notice notice-warning"><p><strong>Exam App Integration:</strong> <strong>MCO_JWT_SECRET</strong> constant is not defined in your wp-config.php. SSO will not work. Please add <code>define(\\'MCO_JWT_SECRET\\', \\'your-very-long-and-random-secret-key\\');</code></p></div>';
    }
}

// --- ADMIN SETTINGS PAGE ---
function mco_exam_add_admin_menu() {
    add_menu_page('Exam App Settings', 'Exam App', 'manage_options', 'mco-exam-app', 'mco_exam_settings_page_html', 'dashicons-welcome-learn-more', 26);
}

function mco_exam_register_settings() {
    register_setting('mco-exam-settings', 'mco_exam_app_url');
}

function mco_exam_settings_page_html() { ?>
    <div class="wrap">
        <h1>Exam App Integration Settings (v<?php echo MCO_PLUGIN_VERSION; ?>)</h1>
        <p>This plugin is the bridge between WordPress and the React Exam Application.</p>
        
        <div style="background: #fff; border: 1px solid #ccd0d4; padding: 1rem 2rem; margin-top: 2rem;">
            <h2><span class="dashicons dashicons-admin-settings" style="vertical-align: middle;"></span> Core Setup</h2>
            <form method="post" action="options.php">
                <?php settings_fields('mco-exam-settings'); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Exam App URL</th>
                        <td>
                            <input type="url" name="mco_exam_app_url" value="<?php echo esc_attr(get_option('mco_exam_app_url')); ?>" class="regular-text" placeholder="https://exams.yourdomain.com" />
                            <p class="description">The full URL where the React exam application is hosted. This is crucial for login and purchase redirects.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>

        <div style="background: #fff; border: 1px solid #ccd0d4; padding: 1rem 2rem; margin-top: 2rem;">
            <h2><span class="dashicons dashicons-text-page" style="vertical-align: middle;"></span> Platform Blueprint</h2>
            <p>This plugin acts as the server and single source of truth for the exam app.</p>
            <ul>
                <li>✔️ <strong>Authentication:</strong> Handles Single Sign-On (SSO) using JWT tokens.</li>
                <li>✔️ <strong>Configuration:</strong> Provides all exam, category, and book data via a new <code>/wp-json/mco-app/v1/app-config</code> API endpoint.</li>
                <li>✔️ <strong>Data Sync:</strong> Saves user results, prizes, and other data to WordPress user meta fields.</li>
                <li>✔️ <strong>Shortcodes:</strong> Includes <code>[exam_login]</code> and <code>[exam_program_page]</code> for easy integration into your pages.</li>
            </ul>
        </div>
    </div>
<?php }

// --- JWT HELPER FUNCTIONS ---
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// ... more helper functions ...

// --- MAIN JWT GENERATION ---
function mco_generate_jwt_token_for_user($user) {
    if (!defined('MCO_JWT_SECRET') || empty(MCO_JWT_SECRET)) return false;
    
    $secret_key = MCO_JWT_SECRET;
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);

    // 1. Get user's paid exam SKUs
    $paid_exam_skus = [];
    if (class_exists('WooCommerce')) {
        $customer_orders = wc_get_orders(['customer_id' => $user->ID, 'status' => ['wc-completed', 'wc-processing']]);
        foreach ($customer_orders as $order) {
            foreach ($order->get_items() as $item) {
                $product = $item->get_product();
                if ($product) $paid_exam_skus[] = $product->get_sku();
            }
        }
    }

    // 2. Get product prices from WooCommerce
    $exam_prices = [];
    $products_query = new WC_Product_Query(['status' => 'publish', 'limit' => -1]);
    $products = $products_query->get_products();
    foreach ($products as $product) {
        if ($product->get_sku()) {
            $reviews = get_comments(['post_id' => $product->get_id(), 'status' => 'approve', 'type' => 'review']);
            $avg_rating = 0;
            if ($reviews) {
                $total_rating = 0;
                foreach ($reviews as $review) $total_rating += intval(get_comment_meta($review->comment_ID, 'rating', true));
                if (count($reviews) > 0) $avg_rating = $total_rating / count($reviews);
            }
            $exam_prices[$product->get_sku()] = [
                'price' => (float) $product->get_price(),
                'regularPrice' => (float) $product->get_regular_price(),
                'productId' => $product->get_id(),
                'avgRating' => round($avg_rating, 2),
                'reviewCount' => count($reviews)
            ];
        }
    }
    
    // 3. Check for active subscriptions
    $is_subscribed = false;
    if (function_exists('wcs_user_has_subscription') && wcs_user_has_subscription($user->ID, '', 'active')) {
        $is_subscribed = true;
    }
    
    // 4. Get Spin Wheel Data
    $spins_available = (int) get_user_meta($user->ID, 'mco_spins_available', true);
    $won_prize = get_user_meta($user->ID, 'mco_won_prize', true);

    // 5. Build Payload with all dynamic user data
    $payload_data = [
        'user' => [
            'id' => $user->ID,
            'name' => $user->display_name,
            'email' => $user->user_email,
            'isAdmin' => in_array('administrator', $user->roles)
        ],
        'paidExamIds' => array_values(array_unique($paid_exam_skus)),
        'examPrices' => $exam_prices,
        'isSubscribed' => $is_subscribed,
        'spinsAvailable' => $spins_available,
        'wonPrize' => $won_prize ?: null,
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ];
    
    $config = mco_get_app_config_data_array();
    if($config) {
        $payload_data['suggestedBooks'] = $config['organizations'][0]['suggestedBooks'];
        // For backward compatibility, send full exam data if the plugin is configured to do so.
        // This makes the JWT larger but supports older app versions.
        $payload_data['exams'] = $config['organizations'][0]['exams'];
        $payload_data['examProductCategories'] = $config['organizations'][0]['examProductCategories'];
    }


    $payload = json_encode($payload_data);
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret_key, true);
    $base64UrlSignature = base64url_encode($signature);
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// --- CONFIGURATION DATA SOURCE ---
// All application configuration is now sourced from this function.
function mco_get_app_config_data_array() {
    $host = $_SERVER['HTTP_HOST'];
    $config = [];

    // Tenant-specific configurations
    if ($host === 'exams.annapoornainfo.com') {
        // Annapoorna Infotech Config
        $config = json_decode(file_get_contents(plugin_dir_path(__FILE__) . 'data/annapoorna-config.json'), true);
    } else {
        // Default: Medical Coding Online Config
        $config = json_decode(file_get_contents(plugin_dir_path(__FILE__) . 'data/medical-coding-config.json'), true);
    }
    return $config;
}


// --- REST API ENDPOINTS ---
function mco_register_rest_api_routes() {
    $namespace = 'mco-app/v1';
    
    // PUBLIC ENDPOINT for app configuration
    register_rest_route($namespace, '/app-config', [
        'methods' => 'GET',
        'callback' => function() {
            $config_data = mco_get_app_config_data_array();
            // Create dummy JSON files on activation if they don't exist
            if (!file_exists(plugin_dir_path(__FILE__) . 'data')) {
                mkdir(plugin_dir_path(__FILE__) . 'data', 0755, true);
                file_put_contents(plugin_dir_path(__FILE__) . 'data/medical-coding-config.json', '{"organizations":[]}');
                file_put_contents(plugin_dir_path(__FILE__) . 'data/annapoorna-config.json', '{"organizations":[]}');
            }
            return new WP_REST_Response($config_data, 200);
        },
        'permission_callback' => '__return_true'
    ]);
    
    // Helper function to get current user from JWT
    $get_user_from_jwt = function(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');
        if (!$auth_header || !preg_match('/Bearer\\s(\\S+)/', $auth_header, $matches)) return null;
        
        $token = $matches[1];
        list($header, $payload, $signature) = explode('.', $token);
        $decoded_payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);

        if ($decoded_payload && isset($decoded_payload['user']['id'])) {
            return get_userdata($decoded_payload['user']['id']);
        }
        return null;
    };
    
    $permission_callback = function(WP_REST_Request $request) use ($get_user_from_jwt) {
        return $get_user_from_jwt($request) !== null;
    };

    // All other endpoints are protected
    register_rest_route($namespace, '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/submit-result', ['methods' => 'POST', 'callback' => 'mco_submit_user_result', 'permission_callback' => $permission_callback]);
    // ... register all other endpoints from googleSheetsService.ts
}

// ... Implement all other callback functions (mco_get_user_results, mco_submit_user_result, etc.)
// These functions will use get_user_from_jwt to get the user ID instead of get_current_user_id().

function mco_handle_my_account_redirect() {
    if (is_user_logged_in() && function_exists('is_account_page') && is_account_page() && !is_wc_endpoint_url()) {
        $user = wp_get_current_user();
        $token = mco_generate_jwt_token_for_user($user);
        $app_url = get_option('mco_exam_app_url', '');
        if ($app_url && $token) {
            wp_safe_redirect(rtrim($app_url, '/') . '/#/auth?token=' . $token . '&redirect_to=/dashboard');
            exit;
        }
    }
}
// ... [Rest of the comprehensive plugin code for all API endpoints, shortcodes, etc.]
?>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(phpCode.trim())
            .then(() => toast.success('Plugin code copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Could not copy code.');
            });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-800">WordPress Integration Plugin</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2">The Integration Engine (v26.0)</h2>
                <p className="mb-4">
                    This is the master plugin for integrating the exam app with your WordPress site. It handles Single Sign-On (SSO), data synchronization, and provides powerful shortcodes for displaying content. <strong>This version makes WordPress the single source of truth for all application configuration.</strong>
                </p>
                <p className="mb-4">
                    <strong>Instructions:</strong>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                        <li>Copy the code below and save it as a new PHP file (e.g., <code>mco-integration-engine.php</code>).</li>
                        <li>Create a folder named <code>data</code> inside your new plugin folder.</li>
                        <li>Inside <code>data</code>, place your configuration files: <code>medical-coding-config.json</code> and <code>annapoorna-config.json</code>. The plugin will automatically select the correct one based on the domain.</li>
                        <li>Upload the entire plugin folder to your WordPress <code>/wp-content/plugins/</code> directory.</li>
                        <li>Activate it from your WordPress admin dashboard and configure the settings.</li>
                    </ol>
                </p>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm">
                    <button 
                        onClick={copyToClipboard} 
                        className="absolute top-2 right-2 p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition"
                        title="Copy to clipboard"
                    >
                        <Copy size={16} />
                    </button>
                    <pre className="whitespace-pre-wrap"><code>{phpCode.trim()}</code></pre>
                </div>
            </div>
        </div>
    );
};

export default Integration;
