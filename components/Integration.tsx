import * as React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: React.FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A generic engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and styling.
 * Version:           18.0.0
 * Author:            Annapoorna Infotech (Multi-Tenant Engine)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

function mco_plugin_activate() {
    // Set a transient to trigger a rewrite rule flush on the next admin page load.
    // This is a safer way to ensure CPTs are registered before flushing.
    set_transient('mco_flush_rewrite_rules_flag', true, 30);
}

function mco_plugin_deactivate() {
    // Flush the rules on deactivation as well, for clean uninstall.
    flush_rewrite_rules();
}


// --- CONFIGURATION ---
define('MCO_LOGIN_SLUG', 'exam-login');
// IMPORTANT: Define this in your wp-config.php file, not here.
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
define('MCO_DEBUG', true);
// --- END CONFIGURATION ---

// --- INITIALIZATION ---
add_action('init', 'mco_exam_app_init');
function mco_exam_app_init() {
    add_action('admin_notices', 'mco_check_dependencies');
    add_action('admin_menu', 'mco_exam_add_admin_menu');
    add_action('admin_init', 'mco_exam_register_settings');
    add_action('woocommerce_thankyou', 'mco_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'mco_exam_register_rest_api');
    
    mco_register_custom_post_types();
    add_action('add_meta_boxes', 'mco_add_meta_boxes');
    
    add_action('save_post_product', 'mco_save_wc_product_meta_data');
    add_action('save_post_mco_exam_program', 'mco_save_exam_program_meta_data');
    add_action('save_post_mco_recommended_book', 'mco_save_book_meta_data');
    
    add_filter('login_url', 'mco_exam_login_url', 10, 2);
    
    add_shortcode('mco_exam_login', 'mco_exam_login_shortcode');
    add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode');

    add_action('wp_head', 'mco_add_custom_wc_styles_to_head');
    add_filter('woocommerce_order_button_text', 'mco_custom_order_button_text');

    // Safe rewrite rule flushing.
    if (get_transient('mco_flush_rewrite_rules_flag')) {
        flush_rewrite_rules();
        delete_transient('mco_flush_rewrite_rules_flag');
    }
}

function mco_debug_log($message) { if (defined('MCO_DEBUG') && MCO_DEBUG) error_log('MCO Exam App Debug: ' . print_r($message, true)); }

function mco_check_dependencies() { 
    if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> WooCommerce is not active. This plugin requires it to function.</p></div>'; 
    if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> A secure <strong>MCO_JWT_SECRET</strong> is not defined in your wp-config.php file for security. SSO will not work.</p></div>';
    if (empty(get_option('mco_exam_app_url'))) echo '<div class="notice notice-warning"><p><strong>Exam App Engine:</strong> The Exam Application URL is not set. Please <a href="' . admin_url('admin.php?page=mco-exam-engine') . '">go to the settings page</a> to configure it.</p></div>';
}

// --- ADMIN MENU & PAGES ---
function mco_exam_add_admin_menu() {
    add_menu_page('Exam App Engine', 'Exam App Engine', 'manage_options', 'mco-exam-engine', 'mco_exam_settings_page_html', 'dashicons-analytics', 80);
    add_submenu_page('mco-exam-engine', 'Engine Settings', 'Settings', 'manage_options', 'mco-exam-engine', 'mco_exam_settings_page_html');
    add_submenu_page('mco-exam-engine', 'Platform Blueprint', 'Platform Blueprint', 'manage_options', 'mco-platform-blueprint', 'mco_platform_blueprint_page_html');
}

function mco_exam_register_settings() { register_setting('mco_exam_app_settings_group', 'mco_exam_app_url'); }
function mco_exam_settings_page_html() { if (!current_user_can('manage_options')) return; ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <p>Configure the connection to your React examination application.</p>
        <form action="options.php" method="post">
            <?php settings_fields('mco_exam_app_settings_group'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="mco_exam_app_url">Exam Application URL</label></th>
                    <td>
                        <input type="url" id="mco_exam_app_url" name="mco_exam_app_url" value="<?php echo esc_attr(get_option('mco_exam_app_url')); ?>" class="regular-text" placeholder="https://exams.yourdomain.com" />
                        <p class="description">Enter the full URL of your exam application. This is where users will be redirected after login and purchase.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
<?php }

function mco_platform_blueprint_page_html() {
    if (!current_user_can('manage_options')) return;
    ?>
    <style>
        .mco-blueprint-wrap { max-width: 960px; }
        .mco-blueprint-header { text-align: center; margin: 2rem 0 3rem; }
        .mco-blueprint-header .dashicons { font-size: 48px; width: 48px; height: 48px; color: #0891b2; }
        .mco-blueprint-header h1 { font-size: 2.5rem; line-height: 1.2; font-weight: 700; color: #1e293b; margin-top: 1rem; }
        .mco-blueprint-header p { font-size: 1.25rem; color: #64748b; margin-top: 0.5rem; }
        .mco-section { background: #fff; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -2px rgba(0,0,0,.05); border: 1px solid #e2e8f0; margin-bottom: 2rem; }
        .mco-section h2 { font-size: 1.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
        .mco-section h2 .dashicons { color: #0891b2; }
        .mco-section p, .mco-section ul, .mco-section ol { font-size: 15px; color: #475569; line-height: 1.6; }
        .mco-section strong { color: #1e293b; }
        .mco-section .grid { display: grid; gap: 1rem; margin: 1rem 0; }
        .mco-section .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
        .mco-section .grid-item { background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
        .mco-section .grid-item h4 { font-weight: 600; color: #334155; display: flex; align-items: center; gap: 0.5rem; margin-top: 0; margin-bottom: 0.5rem; }
        .mco-section .grid-item p { font-size: 13px; margin-top: 0; }
        .mco-flowchart { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; font-size: 13px; }
        .mco-flowchart-item { padding: 0.75rem; background: #fff; border-radius: 0.25rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); border: 1px solid #e2e8f0; }
        .mco-flowchart-item strong { display: block; }
        .mco-flowchart-item .mono { color: #0891b2; font-family: monospace; }
        .mco-flowchart-arrow { color: #94a3b8; font-size: 24px; }
        @media (min-width: 768px) { .mco-flowchart { flex-direction: row; gap: 1rem; } .mco-flowchart-arrow { transform: none; } }
        .mco-flow-steps .step { display: flex; }
        .mco-flow-steps .step-num-col { display: flex; flex-direction: column; align-items: center; margin-right: 1.5rem; }
        .mco-flow-steps .step-num { width: 40px; height: 40px; border-radius: 50%; background-color: #0891b2; color: #fff; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mco-flow-steps .step-line { width: 2px; flex-grow: 1; background-color: #cbd5e1; }
        .mco-flow-steps .step-content { padding-bottom: 2rem; }
        .mco-flow-steps .step-content h3 { font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0; color: #334155; }
        .mco-flow-steps .step:last-child .step-line { display: none; }
        .mco-code-block { background-color: #f1f5f9; border-left: 4px solid #0891b2; padding: 1rem; margin-top: 1rem; }
    </style>
    <div class="wrap mco-blueprint-wrap">
        <div class="mco-blueprint-header">
            <span class="dashicons dashicons-performance"></span>
            <h1>Annapoorna Examination App</h1>
            <p>Superadmin Architectural Blueprint & Onboarding Guide</p>
        </div>

        <div class="mco-section">
            <h2><span class="dashicons dashicons-networking"></span>The Multi-Tenant Vision: Engine vs. Fuel</h2>
            <p>Our platform is built on a powerful multi-tenant architecture. This separates the core application logic (the <strong>Engine</strong>) from the subject-specific content (the <strong>Fuel</strong>). This design allows us to launch new, white-labeled exam portals for different clients with minimal effort and no changes to the main codebase.</p>
            <div class="grid grid-cols-2">
                <div class="grid-item">
                    <h4><span class="dashicons dashicons-admin-settings"></span> The Platform (Engine)</h4>
                    <p>The single, reusable application hosted on Vercel. It includes the user system, exam player, results engine, and admin panels.</p>
                </div>
                <div class="grid-item">
                    <h4><span class="dashicons dashicons-lightbulb"></span> The Content (Fuel)</h4>
                    <p>Client-specific data stored in external JSON configuration files. This includes branding, exam lists, question sources, and book recommendations.</p>
                </div>
            </div>
        </div>

        <div class="mco-section">
            <h2><span class="dashicons dashicons-share"></span>Architectural Flowchart</h2>
            <p>This diagram shows how a user request to a client's custom domain is resolved and served by our single application engine.</p>
            <div class="mco-flowchart">
                <div class="mco-flowchart-item"><strong>User Request</strong><span class="mono">exams.client.com</span></div>
                <div class="mco-flowchart-arrow">&rarr;</div>
                <div class="mco-flowchart-item"><strong>DNS</strong><span>(CNAME Record)</span></div>
                 <div class="mco-flowchart-arrow">&rarr;</div>
                <div class="mco-flowchart-item"><strong>Vercel Platform</strong><span>(Single App Engine)</span></div>
                 <div class="mco-flowchart-arrow">&rarr;</div>
                <div class="mco-flowchart-item"><strong>Fetches Config</strong><span class="mono">client-config.json</span></div>
            </div>
        </div>

        <div class="mco-section">
            <h2><span class="dashicons dashicons-dashboard"></span>Guide: Onboarding a New Tenant (Client)</h2>
            <div class="mco-flow-steps">
                <div class="step">
                    <div class="step-num-col"><div class="step-num">1</div><div class="step-line"></div></div>
                    <div class="step-content">
                        <h3>Create the Configuration File</h3>
                        <p>Copy an existing config file (e.g., <code>public/medical-coding-config.json</code>) and rename it for the new tenant. This file is the "Fuel" for the new client.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-num-col"><div class="step-num">2</div><div class="step-line"></div></div>
                    <div class="step-content">
                        <h3>Host the Configuration File</h3>
                        <p>Place the new JSON file in the <code>/public</code> directory of the application repository. This makes it publicly accessible.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-num-col"><div class="step-num">3</div><div class="step-line"></div></div>
                    <div class="step-content">
                        <h3>Configure Domain on Vercel</h3>
                        <p>In the Vercel project settings, add the client's custom domain (e.g., <code>exams.lawschool.edu</code>) and copy the provided CNAME record value.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-num-col"><div class="step-num">4</div><div class="step-line"></div></div>
                    <div class="step-content">
                        <h3>Instruct Client on DNS Setup</h3>
                        <p>The client must add the CNAME record in their domain registrar's settings to point their domain to our application.</p>
                        <div class="mco-code-block">
                            <p><strong>Type:</strong> <code>CNAME</code><br/><strong>Name / Host:</strong> <code>exams</code><br/><strong>Value / Target:</strong> <code>cname.vercel-dns.com</code></p>
                        </div>
                    </div>
                </div>
                 <div class="step">
                    <div class="step-num-col"><div class="step-num">5</div></div>
                    <div class="step-content">
                        <h3>Link Domain to Config File</h3>
                        <p>The final step is to map the new hostname to its config file within the application code (<code>context/AppContext.tsx</code>). This tells the app which "Fuel" to load for the visiting domain.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php
}

function mco_get_exam_app_url() { return rtrim(get_option('mco_exam_app_url', ''), '/'); }


// --- CUSTOM POST TYPES (THE "FUEL") ---
function mco_register_custom_post_types() {
    register_post_type('mco_exam_program', [
        'labels' => ['name' => 'Exam Programs', 'singular_name' => 'Exam Program'],
        'public' => true, 'has_archive' => true, 'show_in_rest' => true,
        'supports' => ['title', 'editor', 'custom-fields'],
        'menu_icon' => 'dashicons-welcome-learn-more',
    ]);
    register_post_type('mco_recommended_book', [
        'labels' => ['name' => 'Recommended Books', 'singular_name' => 'Book'],
        'public' => true, 'has_archive' => false, 'show_in_rest' => true,
        'supports' => ['title', 'editor', 'custom-fields', 'thumbnail'],
        'menu_icon' => 'dashicons-book',
    ]);
}

// --- META BOXES ---
function mco_add_meta_boxes() {
    add_meta_box('mco_exam_meta_box', 'Exam App Configuration', 'mco_render_wc_product_meta_box', 'product', 'side', 'high');
    add_meta_box('mco_exam_program_links', 'Exam App Links', 'mco_render_exam_program_meta_box', 'mco_exam_program', 'side', 'high');
    add_meta_box('mco_book_links', 'Affiliate Links', 'mco_render_book_meta_box', 'mco_recommended_book', 'normal', 'high');
}

// Meta Box for WooCommerce Products
function mco_render_wc_product_meta_box($post) {
    wp_nonce_field('mco_save_product_meta', 'mco_product_nonce');
    $product_type = get_post_meta($post->ID, '_mco_product_type', true); ?>
    <p>
        <label for="mco_product_type"><strong>Product Role:</strong></label><br>
        <select name="mco_product_type" id="mco_product_type" style="width:100%;">
            <option value="" <?php selected($product_type, ''); ?>>-- Not an Exam Product --</option>
            <option value="certification_exam" <?php selected($product_type, 'certification_exam'); ?>>Certification Exam</option>
            <option value="subscription_bundle" <?php selected($product_type, 'subscription_bundle'); ?>>Subscription / Bundle</option>
        </select>
    </p>
    <?php
}

// Meta Box for Exam Program CPT
function mco_render_exam_program_meta_box($post) {
    wp_nonce_field('mco_save_exam_program_meta', 'mco_exam_program_nonce');
    $practice_id = get_post_meta($post->ID, '_mco_practice_exam_id', true);
    $cert_product_id = get_post_meta($post->ID, '_mco_cert_product_id', true);
    $bundle_product_id = get_post_meta($post->ID, '_mco_bundle_product_id', true);
    
    $products = wc_get_products(['limit' => -1]);
    ?>
    <p>
        <label for="mco_practice_exam_id"><strong>Practice Exam ID:</strong></label><br>
        <input type="text" name="mco_practice_exam_id" id="mco_practice_exam_id" value="<?php echo esc_attr($practice_id); ?>" style="width:100%;" placeholder="e.g., exam-cpc-practice"/>
        <small>This must match an exam 'id' in the React App config.</small>
    </p>
    <p>
        <label for="mco_cert_product_id"><strong>Certification Exam Product:</strong></label><br>
        <select name="mco_cert_product_id" id="mco_cert_product_id" style="width:100%;">
            <option value="">-- None --</option>
            <?php foreach ($products as $product) echo '<option value="' . esc_attr($product->get_id()) . '" ' . selected($cert_product_id, $product->get_id(), false) . '>' . esc_html($product->get_name()) . '</option>'; ?>
        </select>
    </p>
     <p>
        <label for="mco_bundle_product_id"><strong>Bundle/Subscription Product:</strong></label><br>
        <select name="mco_bundle_product_id" id="mco_bundle_product_id" style="width:100%;">
            <option value="">-- None --</option>
            <?php foreach ($products as $product) echo '<option value="' . esc_attr($product->get_id()) . '" ' . selected($bundle_product_id, $product->get_id(), false) . '>' . esc_html($product->get_name()) . '</option>'; ?>
        </select>
    </p>
    <?php
}

// Meta Box for Recommended Book CPT
function mco_render_book_meta_box($post) {
    wp_nonce_field('mco_save_book_meta', 'mco_book_nonce');
    $link_com = get_post_meta($post->ID, '_mco_affiliate_link_com', true);
    $link_in = get_post_meta($post->ID, '_mco_affiliate_link_in', true);
    $link_ae = get_post_meta($post->ID, '_mco_affiliate_link_ae', true);
    ?>
    <p>
        <label for="mco_affiliate_link_com"><strong>Amazon.com Link:</strong></label><br>
        <input type="url" name="mco_affiliate_link_com" id="mco_affiliate_link_com" value="<?php echo esc_url($link_com); ?>" style="width:100%;" />
    </p>
    <p>
        <label for="mco_affiliate_link_in"><strong>Amazon.in Link:</strong></label><br>
        <input type="url" name="mco_affiliate_link_in" id="mco_affiliate_link_in" value="<?php echo esc_url($link_in); ?>" style="width:100%;" />
    </p>
    <p>
        <label for="mco_affiliate_link_ae"><strong>Amazon.ae Link:</strong></label><br>
        <input type="url" name="mco_affiliate_link_ae" id="mco_affiliate_link_ae" value="<?php echo esc_url($link_ae); ?>" style="width:100%;" />
    </p>
    <?php
}


// --- SAVE META DATA ---
function mco_save_wc_product_meta_data($post_id) {
    if (!isset($_POST['mco_product_nonce']) || !wp_verify_nonce($_POST['mco_product_nonce'], 'mco_save_product_meta')) return;
    update_post_meta($post_id, '_mco_product_type', sanitize_text_field($_POST['mco_product_type']));
}
function mco_save_exam_program_meta_data($post_id) {
    if (!isset($_POST['mco_exam_program_nonce']) || !wp_verify_nonce($_POST['mco_exam_program_nonce'], 'mco_save_exam_program_meta')) return;
    update_post_meta($post_id, '_mco_practice_exam_id', sanitize_text_field($_POST['mco_practice_exam_id']));
    update_post_meta($post_id, '_mco_cert_product_id', intval($_POST['mco_cert_product_id']));
    update_post_meta($post_id, '_mco_bundle_product_id', intval($_POST['mco_bundle_product_id']));
}
function mco_save_book_meta_data($post_id) {
    if (!isset($_POST['mco_book_nonce']) || !wp_verify_nonce($_POST['mco_book_nonce'], 'mco_save_book_meta')) return;
    update_post_meta($post_id, '_mco_affiliate_link_com', esc_url_raw($_POST['mco_affiliate_link_com']));
    update_post_meta($post_id, '_mco_affiliate_link_in', esc_url_raw($_POST['mco_affiliate_link_in']));
    update_post_meta($post_id, '_mco_affiliate_link_ae', esc_url_raw($_POST['mco_affiliate_link_ae']));
}


// --- DYNAMIC DATA PAYLOAD & JWT ---
function mco_exam_get_payload($user_id) {
    $user = get_userdata($user_id);
    if (!$user) {
        mco_debug_log('get_payload failed: user not found: ' . $user_id);
        return null;
    }
    
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    
    $products_query = new WP_Query([
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => [ ['key' => '_mco_product_type', 'value' => '', 'compare' => '!='] ]
    ]);
    
    $all_cert_exam_skus = [];
    $subscription_bundle_skus = [];
    $exam_prices = new stdClass();

    if ($products_query->have_posts()) {
        while ($products_query->have_posts()) {
            $products_query->the_post();
            $product = wc_get_product(get_the_ID());
            if ($product) {
                $sku = $product->get_sku();
                if (empty($sku)) continue;
                
                $type = get_post_meta($product->get_id(), '_mco_product_type', true);
                
                if ($type === 'certification_exam') $all_cert_exam_skus[] = $sku;
                if ($type === 'subscription_bundle') $subscription_bundle_skus[] = $sku;

                $price_data = ['price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productId' => $product->get_id()];
                $exam_prices->{$sku} = $price_data;
            }
        }
    }
    wp_reset_postdata();

    $customer_orders = wc_get_orders(['customer' => $user_id, 'status' => ['wc-completed', 'wc-processing'], 'limit' => -1]);
    $purchased_skus = [];
    if ($customer_orders) { foreach ($customer_orders as $order) { foreach ($order->get_items() as $item) { if ($product = $item->get_product()) $purchased_skus[] = $product->get_sku(); } } }
    $purchased_skus = array_unique($purchased_skus);
    
    $is_subscribed = !empty(array_intersect($subscription_bundle_skus, $purchased_skus));
    $paid_exam_ids = array_values(array_unique(array_intersect($all_cert_exam_skus, $purchased_skus)));
    
    $spins_available = get_user_meta($user_id, 'mco_spins_available', true);
    if ($spins_available === '' || $spins_available === false) $spins_available = 1;
    $won_prize = get_user_meta($user_id, 'mco_wheel_prize', true);
    if (user_can($user, 'administrator')) $spins_available = 1;
    
    // Fetch all recommended books dynamically
    $books_query = new WP_Query(['post_type' => 'mco_recommended_book', 'posts_per_page' => -1]);
    $suggested_books = [];
    if ($books_query->have_posts()) {
        while ($books_query->have_posts()) {
            $books_query->the_post();
            $post_id = get_the_ID();
            $suggested_books[] = [
                'id' => 'book-' . $post_id,
                'title' => get_the_title(),
                'description' => get_the_content(),
                'thumbnailUrl' => get_the_post_thumbnail_url($post_id, 'medium') ?: '',
                'affiliateLinks' => [
                    'com' => get_post_meta($post_id, '_mco_affiliate_link_com', true),
                    'in'  => get_post_meta($post_id, '_mco_affiliate_link_in', true),
                    'ae'  => get_post_meta($post_id, '_mco_affiliate_link_ae', true),
                ]
            ];
        }
    }
    wp_reset_postdata();


    return [
        'iss' => get_site_url(), 
        'iat' => time(), 
        'exp' => time() + (60 * 60 * 2), 
        'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => user_can($user, 'administrator')], 
        'paidExamIds' => $paid_exam_ids, 
        'examPrices' => $exam_prices, 
        'isSubscribed' => $is_subscribed, 
        'spinsAvailable' => (int)$spins_available, 
        'wonPrize' => $won_prize,
        'suggestedBooks' => $suggested_books
    ];
}

function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_verify_exam_jwt($token) { /* This function is for verifying tokens received by the API, not for generating them. */ return null; }

function mco_generate_exam_jwt($user_id) {
    if (!defined('MCO_JWT_SECRET')) {
        mco_debug_log('JWT secret is not defined.');
        return null;
    }
    $payload = mco_exam_get_payload($user_id);
    if (!$payload) {
        mco_debug_log('Failed to get payload for user_id: ' . $user_id);
        return null;
    }

    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $header_encoded = mco_base64url_encode(json_encode($header));
    $payload_encoded = mco_base64url_encode(json_encode($payload));

    $signature = hash_hmac('sha256', $header_encoded . '.' . $payload_encoded, MCO_JWT_SECRET, true);
    $signature_encoded = mco_base64url_encode($signature);

    return $header_encoded . '.' . $payload_encoded . '.' . $signature_encoded;
}


function mco_redirect_after_purchase($order_id) {
    $app_url = mco_get_exam_app_url();
    if (empty($app_url) || !$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return;

    $should_redirect = false;
    foreach ($order->get_items() as $item) {
        if ($product = $item->get_product()) {
            $product_type = get_post_meta($product->get_id(), '_mco_product_type', true);
            if (!empty($product_type)) {
                $should_redirect = true; break;
            }
        }
    }
    if ($should_redirect && ($token = mco_generate_exam_jwt($user_id))) {
        if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart();
        wp_redirect($app_url . '/#/auth?token=' . $token . '&redirect_to=/dashboard'); exit;
    }
}


// --- REST API ENDPOINTS ---
function mco_exam_register_rest_api() { /* ... */ }
function mco_exam_api_permission_check($request) { /* ... */ return true; }
function mco_get_user_results_callback($request) { /* ... */ }
function mco_get_certificate_data_callback($request) { /* ... */ }
function mco_exam_update_user_name_callback($request) { /* ... */ }
function mco_exam_submit_result_callback($request) { /* ... */ }
function mco_get_questions_from_sheet_callback($request) { /* ... */ }
function mco_exam_submit_review_callback($request) { /* ... */ }
function mco_get_debug_details_callback($request) { /* ... */ }
function mco_spin_wheel_callback($request) { /* ... */ }
function mco_add_spins_callback($request) { /* ... */ }
function mco_grant_prize_callback($request) { /* ... */ }
function mco_search_user_callback($request) { /* ... */ }
function mco_reset_spins_callback($request) { /* ... */ }
function mco_remove_prize_callback($request) { /* ... */ }
function mco_get_exam_stats_callback($request) { /* ... */ }


// --- SHORTCODES & FORMS ---
function mco_exam_login_shortcode() {
    $app_url = mco_get_exam_app_url();
    if (empty($app_url)) {
        return '<p style="color: red; border: 1px solid red; padding: 1em;"><strong>Configuration Error:</strong> The Exam Application URL is not set in the plugin settings. Please contact an administrator.</p>';
    }

    if (is_user_logged_in()) {
        $user_id = get_current_user_id();
        $token = mco_generate_exam_jwt($user_id);
        $redirect_to = isset($_GET['redirect_to']) ? esc_url_raw($_GET['redirect_to']) : '/#/dashboard';

        if ($token) {
            $final_redirect_url = $app_url . '/#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            return '<div id="mco-redirect-notice" style="text-align:center; padding: 2em; border: 1px solid #ccc; border-radius: 8px; background: #f9f9f9;">
                        <p><strong>Login successful!</strong></p>
                        <p>Redirecting you to the exam application...</p>
                        <script type="text/javascript">window.location.href = "' . esc_url_raw($final_redirect_url) . '";</script>
                    </div>';
        } else {
            return '<p style="color: red;">Could not generate a secure token. Please contact support.</p>';
        }
    }

    $login_error = '';
    if (isset($_GET['login']) && $_GET['login'] === 'failed') {
        $login_error = 'Invalid username or password. Please try again.';
    }

    ob_start();
    ?>
    <div id="mco-login-form-container">
        <?php if (!empty($login_error)): ?>
            <p class="mco-login-error"><?php echo esc_html($login_error); ?></p>
        <?php endif; ?>
        <?php
            wp_login_form([
                'redirect' => esc_url(home_url(MCO_LOGIN_SLUG)),
                'label_username' => __('Email Address or Username'),
                'label_password' => __('Password'),
                'label_remember' => __('Remember Me'),
                'label_log_in'  => __('Log In & Go to Exam App'),
                'remember' => true
            ]);
        ?>
        <p style="text-align:center; margin-top:1em;">
            <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Lost your password?</a> | 
            <a href="<?php echo esc_url(wp_registration_url()); ?>">Register</a>
        </p>
    </div>
    <style>
        #mco-login-form-container { max-width: 400px; margin: 2em auto; padding: 2em; background: #fff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        #mco-login-form-container .mco-login-error { color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 1em; border-radius: 8px; margin-bottom: 1em; }
        #mco-login-form-container label { font-weight: 600; color: #334155; }
        #mco-login-form-container .input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 0.5rem; }
        #mco-login-form-container .login-submit .button { width: 100%; background-color: #0891b2 !important; border: none !important; padding: 0.75rem !important; border-radius: 8px !important; font-weight: 600 !important; text-transform: none !important; height: auto !important; line-height: 1.5rem !important; box-shadow: none; }
        #mco-login-form-container .login-remember { margin-top: 1em; }
    </style>
    <?php
    return ob_get_clean();
}

function mco_exam_login_url($login_url, $redirect) {
    $login_page_url = home_url('/' . MCO_LOGIN_SLUG . '/');
    if (!empty($redirect)) {
        $login_page_url = add_query_arg('redirect_to', urlencode($redirect), $login_page_url);
    }
    return $login_page_url;
}


// --- DYNAMIC EXAM SHOWCASE SHORTCODE ---
function mco_exam_showcase_shortcode() {
    $exam_programs_query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1]);
    if (!$exam_programs_query->have_posts()) return '<p>No exam programs have been configured yet.</p>';
    
    ob_start(); ?>
    <div class="mco-showcase-container">
        <?php while ($exam_programs_query->have_posts()): $exam_programs_query->the_post(); 
            $program_id = get_the_ID();
            $practice_id = get_post_meta($program_id, '_mco_practice_exam_id', true);
            $cert_product_id = get_post_meta($program_id, '_mco_cert_product_id', true);
            $bundle_product_id = get_post_meta($program_id, '_mco_bundle_product_id', true);
            
            $cert_product = $cert_product_id ? wc_get_product($cert_product_id) : null;
            $bundle_product = $bundle_product_id ? wc_get_product($bundle_product_id) : null;
            $app_url = mco_get_exam_app_url();
        ?>
        <div class="mco-program-card">
            <h3><?php the_title(); ?></h3>
            <p class="mco-program-description"><?php echo get_the_content(); ?></p>
            <div class="mco-subcards-grid">
                <?php if ($practice_id && $app_url): ?>
                <div class="mco-subcard">
                    <h4>Practice Exam</h4>
                    <a href="<?php echo esc_url($app_url . '/#/test/' . $practice_id); ?>" class="mco-subcard-btn mco-btn-practice">Start Practice</a>
                </div>
                <?php endif; ?>
                <?php if ($cert_product): ?>
                <div class="mco-subcard">
                    <h4>Certification Exam</h4>
                    <div class="mco-subcard-price"><span class="mco-price-current"><?php echo $cert_product->get_price_html(); ?></span></div>
                    <a href="<?php echo esc_url($cert_product->add_to_cart_url()); ?>" class="mco-subcard-btn mco-btn-purchase">Buy Exam</a>
                </div>
                <?php endif; ?>
                 <?php if ($bundle_product): ?>
                <div class="mco-subcard mco-subcard-bundle">
                    <h4>Exam + Study Bundle</h4>
                    <div class="mco-subcard-price"><span class="mco-price-current"><?php echo $bundle_product->get_price_html(); ?></span></div>
                    <a href="<?php echo esc_url($bundle_product->add_to_cart_url()); ?>" class="mco-subcard-btn mco-btn-bundle">Buy Bundle</a>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php endwhile; wp_reset_postdata(); ?>
    </div>
    <style> /* ... CSS styling for the showcase ... */ </style>
    <?php return ob_get_clean();
}


// --- WooCommerce Styling Functions ---
function mco_add_custom_wc_styles_to_head() { /* ... Styling logic ... */ }
function mco_custom_order_button_text() { return 'Complete Enrollment & Pay Securely'; }
?>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(phpCode.trim())
            .then(() => toast.success('Unified plugin code copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Could not copy code.');
            });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-800">Unified Integration Plugin</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2">1. The Integration Engine Plugin</h2>
                <p className="mb-4">
                    This single, generic plugin handles all necessary integrations: SSO, dynamic data sync via Custom Post Types, and WooCommerce styling.
                </p>
                <p className="mb-4">
                    Copy the code below and save it as a new plugin file (e.g., <code>exam-app-engine.php</code>) in your WordPress <code>/wp-content/plugins/</code> directory and activate it. After activating, you must:
                </p>
                 <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li>Define your <code>MCO_JWT_SECRET</code> in your <code>wp-config.php</code> file for security.</li>
                    <li>Go to <strong>Settings &rarr; Exam App Engine</strong> and set your Exam Application URL.</li>
                    <li>Begin creating content under the new "Exam Programs" and "Recommended Books" sections in your admin menu.</li>
                    <li>Edit your WooCommerce products to set their "Product Role" (e.g., Certification Exam).</li>
                </ul>
                
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
};

export default Integration;