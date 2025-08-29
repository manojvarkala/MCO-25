import * as React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: React.FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A generic engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and styling.
 * Version:           24.5.2 (Auto-flush rewrite rules on update)
 * Author:            Annapoorna Infotech (Multi-Tenant Engine)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define('MCO_PLUGIN_VERSION', '24.5.2');

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

function mco_plugin_activate() {
    mco_register_custom_post_types();
    flush_rewrite_rules();
    set_transient('mco_admin_notice_activation', true, 5);
    add_option('mco_plugin_version', MCO_PLUGIN_VERSION);
}

function mco_plugin_deactivate() {
    flush_rewrite_rules();
    delete_option('mco_plugin_version');
}

// --- CONFIGURATION ---
// IMPORTANT: Define this in your wp-config.php file. Example:
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// --- END CONFIGURATION ---

// --- INITIALIZATION ---
add_action('init', 'mco_exam_app_init');
function mco_exam_app_init() {
    mco_register_custom_post_types();
    add_action('admin_notices', 'mco_check_dependencies');
    add_action('admin_menu', 'mco_exam_add_admin_menu');
    add_action('admin_init', 'mco_exam_register_settings');
    add_action('woocommerce_thankyou', 'mco_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'mco_exam_register_rest_api');
    
    add_action('add_meta_boxes', 'mco_add_meta_boxes');
    
    add_action('save_post_product', 'mco_save_wc_product_meta_data');
    add_action('save_post_mco_exam_program', 'mco_save_exam_program_meta_data');
    add_action('save_post_mco_recommended_book', 'mco_save_book_meta_data');
    
    add_shortcode('mco_exam_login', 'mco_exam_login_shortcode');
    add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode');

    add_action('wp_head', 'mco_add_custom_styles_to_head');
    add_filter('woocommerce_order_button_text', 'mco_custom_order_button_text');

    add_action('woocommerce_payment_complete', 'mco_auto_complete_virtual_order');

    // Auto-flush rewrite rules on version update to prevent "No route found" errors.
    $current_version = get_option('mco_plugin_version', '1.0.0');
    if (version_compare($current_version, MCO_PLUGIN_VERSION, '<')) {
        set_transient('mco_needs_flush', true, 30);
        update_option('mco_plugin_version', MCO_PLUGIN_VERSION);
    }

    if (get_transient('mco_needs_flush')) {
        flush_rewrite_rules();
        delete_transient('mco_needs_flush');
    }
}

function mco_check_dependencies() { 
    if (get_transient('mco_admin_notice_activation')) {
        echo '<div class="notice notice-success is-dismissible"><p><strong>Exam App Engine:</strong> Plugin activated successfully. Please check the <a href="' . admin_url('admin.php?page=mco-exam-engine&tab=status') . '">System Status</a> tab to ensure your environment is configured correctly.</p></div>';
        delete_transient('mco_admin_notice_activation');
    }
    if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> WooCommerce is not active. This plugin requires it to function.</p></div>'; 
    if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> A secure <strong>MCO_JWT_SECRET</strong> (at least 32 characters long) is not defined in your wp-config.php file for security. SSO will not work.</p></div>';
    if (empty(get_option('mco_exam_app_url'))) echo '<div class="notice notice-warning"><p><strong>Exam App Engine:</strong> The Exam Application URL is not set. Please <a href="' . admin_url('admin.php?page=mco-exam-engine') . '">go to the settings page</a> to configure it.</p></div>';
}

// --- ADMIN MENU & PAGES ---
function mco_exam_add_admin_menu() {
    add_menu_page('Exam App Engine', 'Exam App Engine', 'manage_options', 'mco-exam-engine', 'mco_exam_engine_page_router', 'dashicons-analytics', 80);
    add_submenu_page('mco-exam-engine', 'Engine Settings', 'Settings', 'manage_options', 'mco-exam-engine', 'mco_exam_engine_page_router');
    add_submenu_page('mco-exam-engine', 'System Status', 'System Status', 'manage_options', 'admin.php?page=mco-exam-engine&tab=status');
    add_submenu_page('mco-exam-engine', 'Platform Blueprint', 'Platform Blueprint', 'manage_options', 'admin.php?page=mco-exam-engine&tab=blueprint');
    add_submenu_page('mco-exam-engine', 'Exam Programs', 'Exam Programs', 'manage_options', 'edit.php?post_type=mco_exam_program');
    add_submenu_page('mco-exam-engine', 'Recommended Books', 'Recommended Books', 'manage_options', 'edit.php?post_type=mco_recommended_book');
}

function mco_exam_register_settings() { register_setting('mco_exam_app_settings_group', 'mco_exam_app_url'); }

function mco_exam_engine_page_router() {
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'settings';
    ?>
    <div class="wrap">
        <h1>Exam App Engine</h1>
        <h2 class="nav-tab-wrapper">
            <a href="?page=mco-exam-engine&tab=settings" class="nav-tab <?php echo $active_tab == 'settings' ? 'nav-tab-active' : ''; ?>">Settings</a>
            <a href="?page=mco-exam-engine&tab=status" class="nav-tab <?php echo $active_tab == 'status' ? 'nav-tab-active' : ''; ?>">System Status</a>
            <a href="?page=mco-exam-engine&tab=blueprint" class="nav-tab <?php echo $active_tab == 'blueprint' ? 'nav-tab-active' : ''; ?>">Platform Blueprint</a>
        </h2>
        
        <?php
        switch ($active_tab) {
            case 'status':
                mco_render_system_status_tab();
                break;
            case 'blueprint':
                mco_render_platform_blueprint_tab();
                break;
            case 'settings':
            default:
                mco_render_settings_tab();
                break;
        }
        ?>
    </div>
    <?php
}

function mco_render_settings_tab() {
    ?>
    <form method="post" action="options.php" style="margin-top: 20px;">
        <?php settings_fields('mco_exam_app_settings_group'); ?>
        <?php do_settings_sections('mco_exam_app_settings_group'); ?>
        <table class="form-table">
            <tr valign="top">
                <th scope="row"><label for="mco_exam_app_url">Exam Application URL</label></th>
                <td>
                    <input type="url" id="mco_exam_app_url" name="mco_exam_app_url" value="<?php echo esc_attr(get_option('mco_exam_app_url')); ?>" class="regular-text" placeholder="https://exams.yourdomain.com" />
                    <p class="description">Enter the full URL of your standalone React examination app. Do not include a trailing slash.</p>
                </td>
            </tr>
        </table>
        <?php submit_button(); ?>
    </form>
    <?php
}

function mco_render_system_status_tab() {
    ?>
    <style>
        .mco-status-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; border: 1px solid #ddd; }
        .mco-status-table th, .mco-status-table td { padding: 12px 15px; border: 1px solid #ddd; text-align: left; vertical-align: top; }
        .mco-status-table th { background-color: #f9f9f9; font-weight: 600; width: 25%; }
        .mco-status-pass, .mco-status-fail { display: inline-block; padding: 2px 8px; border-radius: 4px; color: #fff; font-weight: bold; font-size: 0.9em; }
        .mco-status-pass { background-color: #22c55e; }
        .mco-status-fail { background-color: #ef4444; }
        .mco-status-note { font-size: 0.9em; color: #555; margin-top: 5px; }
    </style>
    <div style="margin-top: 20px;">
        <h3>WordPress Environment Status</h3>
        <p>This tool checks your server environment for common issues that could prevent the app from working.</p>
        <table class="mco-status-table">
            <tbody>
                <tr>
                    <th>Permalink Structure</th>
                    <td>
                        <?php
                        if (get_option('permalink_structure')) {
                            echo '<span class="mco-status-pass">PASS</span><p class="mco-status-note">Current structure: <code>' . esc_html(get_option('permalink_structure')) . '</code></p>';
                        } else {
                            echo '<span class="mco-status-fail">FAIL</span><p class="mco-status-note">Your permalinks are not set. The WordPress REST API requires a permalink structure other than "Plain". <br><strong>Fix:</strong> Go to <a href="' . admin_url('options-permalink.php') . '">Settings &rarr; Permalinks</a>, choose "Post name" or another option, and save changes.</p>';
                        }
                        ?>
                    </td>
                </tr>
                <tr>
                    <th>REST API Routes</th>
                    <td>
                        <?php
                        global $wp_rewrite;
                        $wp_rewrite->flush_rules();
                        $rest_server = rest_get_server();
                        $routes = $rest_server->get_routes();
                        if (isset($routes['/mco-app/v1/user-results'])) {
                            echo '<span class="mco-status-pass">PASS</span><p class="mco-status-note">The plugin\'s API routes are registered correctly.</p>';
                        } else {
                            echo '<span class="mco-status-fail">FAIL</span><p class="mco-status-note">The plugin\'s API routes are not being registered. This is the cause of the <strong>"No route was found"</strong> error. <br><strong>Fix:</strong> This is almost always caused by an incorrect <strong>Permalink Structure</strong>. Please fix your permalinks first (see above) and then re-check this status.</p>';
                        }
                        ?>
                    </td>
                </tr>
                <tr>
                    <th>Custom Content Types</th>
                    <td>
                        <?php
                        $program_ok = post_type_exists('mco_exam_program');
                        $book_ok = post_type_exists('mco_recommended_book');
                        if ($program_ok && $book_ok) {
                             echo '<span class="mco-status-pass">PASS</span><p class="mco-status-note">"Exam Programs" and "Recommended Books" content types are registered.</p>';
                        } else {
                            echo '<span class="mco-status-fail">FAIL</span><p class="mco-status-note">One or more custom content types are not registered. This can be caused by a plugin conflict or theme issue. Try re-activating this plugin.</p>';
                        }
                        ?>
                    </td>
                </tr>
                <tr>
                    <th>WooCommerce Active</th>
                    <td>
                        <?php
                        if (class_exists('WooCommerce')) {
                            echo '<span class="mco-status-pass">PASS</span>';
                        } else {
                            echo '<span class="mco-status-fail">FAIL</span><p class="mco-status-note">WooCommerce is not active. This plugin requires it for purchasing exams and subscriptions.</p>';
                        }
                        ?>
                    </td>
                </tr>
                <tr>
                    <th>JWT Secret Key</th>
                    <td>
                        <?php
                        if (defined('MCO_JWT_SECRET') && strlen(MCO_JWT_SECRET) >= 32) {
                            echo '<span class="mco-status-pass">PASS</span><p class="mco-status-note">Secret key is defined and has a secure length.</p>';
                        } else {
                            echo '<span class="mco-status-fail">FAIL</span><p class="mco-status-note">Your <code>MCO_JWT_SECRET</code> is either not defined in <code>wp-config.php</code> or is not at least 32 characters long. SSO will not work without a secure key.</p>';
                        }
                        ?>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <?php
}

function mco_render_platform_blueprint_tab() {
    ?>
    <div style="max-width: 900px; margin-top: 20px;">
        <h2>Platform Blueprint: A Guide for Tenant Administrators</h2>
        <p>This guide outlines the architecture and the steps required to configure your WordPress site to work with the exam app.</p>
        
        <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px;">
            <h4>Step 1: Install & Configure this Plugin</h4>
            <ol>
                <li>Ensure this plugin ("Exam App Integration Engine") is installed and activated.</li>
                <li><strong>Crucial Security Step:</strong> Add a secure, random key to your <code>wp-config.php</code> file. Example: <code>define('MCO_JWT_SECRET', 'your-very-strong-secret-key-here');</code></li>
                <li>Go to <strong>Exam App Engine &rarr; Settings</strong> in your admin menu and enter the URL of your exam application (e.g., <code>https://exams.your-domain.com</code>).</li>
            </ol>
            
            <h4>Step 2: Create Your Products in WooCommerce</h4>
            <p>Each purchasable item (like a certification exam or a subscription) must be a WooCommerce product.</p>
            <ol>
                <li>Go to <strong>Products &rarr; Add New</strong>.</li>
                <li>Create your products (e.g., "CPC Certification Exam Access", "Monthly Subscription"). Set their price and a unique SKU.</li>
                <li>In the "Exam App Configuration" box on the product edit page, set the "Product Role" to either "Certification Exam" or "Subscription / Bundle". This is critical.</li>
            </ol>

            <h4>Step 3: Create Recommended Books</h4>
            <ol>
                <li>Go to <strong>Exam App Engine &rarr; Recommended Books &rarr; Add New</strong>.</li>
                <li>Enter the book title, description, and featured image.</li>
                <li>In the "Affiliate Links" box, enter the full Amazon affiliate URLs for each region.</li>
            </ol>

            <h4>Step 4: Create Your Exam Programs</h4>
            <ol>
                <li>Go to <strong>Exam App Engine &rarr; Exam Programs &rarr; Add New</strong>.</li>
                <li>Give your program a title (e.g., "CPC Certification Program") and a description.</li>
                <li>In the "Exam Program Details" section, link your WooCommerce products and fill in the exam details.</li>
            </ol>
        </div>
    </div>
    <?php
}

function mco_get_exam_app_url() { return rtrim(get_option('mco_exam_app_url', ''), '/'); }

// --- CUSTOM POST TYPES & META BOXES ---
function mco_register_custom_post_types() {
    register_post_type('mco_exam_program', [ 'labels' => ['name' => 'Exam Programs', 'singular_name' => 'Exam Program'], 'public' => true, 'has_archive' => true, 'show_in_menu' => false, 'supports' => ['title', 'editor', 'thumbnail'] ]);
    register_post_type('mco_recommended_book', [ 'labels' => ['name' => 'Recommended Books', 'singular_name' => 'Book'], 'public' => true, 'has_archive' => false, 'show_in_menu' => false, 'supports' => ['title', 'editor', 'thumbnail'] ]);
}

function mco_add_meta_boxes() {
    add_meta_box('mco_wc_product_meta', 'Exam App Configuration', 'mco_render_wc_product_meta_box', 'product', 'side', 'high');
    add_meta_box('mco_exam_program_meta', 'Exam Program Details', 'mco_render_exam_program_meta_box', 'mco_exam_program', 'normal', 'high');
    add_meta_box('mco_book_links_meta', 'Affiliate Links', 'mco_render_book_links_meta_box', 'mco_recommended_book', 'normal', 'high');
}

function mco_render_book_links_meta_box($post) {
    wp_nonce_field('mco_save_book_meta', 'mco_book_nonce');
    $link_com = get_post_meta($post->ID, '_mco_link_com', true);
    $link_in = get_post_meta($post->ID, '_mco_link_in', true);
    $link_ae = get_post_meta($post->ID, '_mco_link_ae', true);
    ?>
    <p>Enter the full affiliate URLs for each Amazon region.</p>
    <p>
        <label for="mco_link_com">Amazon.com URL:</label><br>
        <input type="url" id="mco_link_com" name="mco_link_com" value="<?php echo esc_attr($link_com); ?>" style="width:100%;" placeholder="https://www.amazon.com/...">
    </p>
    <p>
        <label for="mco_link_in">Amazon.in URL:</label><br>
        <input type="url" id="mco_link_in" name="mco_link_in" value="<?php echo esc_attr($link_in); ?>" style="width:100%;" placeholder="https://www.amazon.in/...">
    </p>
    <p>
        <label for="mco_link_ae">Amazon.ae URL:</label><br>
        <input type="url" id="mco_link_ae" name="mco_link_ae" value="<?php echo esc_attr($link_ae); ?>" style="width:100%;" placeholder="https://www.amazon.ae/...">
    </p>
    <?php
}

function mco_render_wc_product_meta_box($post) {
    wp_nonce_field('mco_save_wc_meta', 'mco_wc_nonce');
    $product_type = get_post_meta($post->ID, '_mco_product_type', true);
    ?>
    <label for="mco_product_type">Product Role:</label>
    <select name="mco_product_type" id="mco_product_type" style="width:100%;">
        <option value="" <?php selected($product_type, ''); ?>>None</option>
        <option value="certification_exam" <?php selected($product_type, 'certification_exam'); ?>>Certification Exam</option>
        <option value="subscription_bundle" <?php selected($product_type, 'subscription_bundle'); ?>>Subscription / Bundle</option>
    </select>
    <?php
}

function mco_render_exam_program_meta_box($post) {
    wp_nonce_field('mco_save_exam_program_meta', 'mco_exam_program_nonce');
    $practice_id = get_post_meta($post->ID, '_mco_practice_exam_id', true);
    $cert_product_id = get_post_meta($post->ID, '_mco_certification_exam_product_id', true);
    $bundle_product_id = get_post_meta($post->ID, '_mco_bundle_product_id', true);
    $pass_score = get_post_meta($post->ID, '_mco_pass_score', true);
    $practice_questions = get_post_meta($post->ID, '_mco_practice_questions', true);
    $practice_duration = get_post_meta($post->ID, '_mco_practice_duration', true);
    $cert_questions = get_post_meta($post->ID, '_mco_cert_questions', true);
    $cert_duration = get_post_meta($post->ID, '_mco_cert_duration', true);
    $question_source_url = get_post_meta($post->ID, '_mco_question_source_url', true);
    $cert_products = wc_get_products(['type' => ['simple', 'subscription'], 'status' => 'publish', 'limit' => -1, 'meta_query' => [['key' => '_mco_product_type', 'value' => 'certification_exam']]]);
    $bundle_products = wc_get_products(['type' => ['simple', 'subscription'], 'status' => 'publish', 'limit' => -1, 'meta_query' => [['key' => '_mco_product_type', 'value' => 'subscription_bundle']]]);
    ?>
    <div style="background: #f0f0f1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p>
            <label for="mco_question_source_url"><strong>Google Sheet URL for Questions:</strong></label><br>
            <input type="url" id="mco_question_source_url" name="mco_question_source_url" value="<?php echo esc_attr($question_source_url); ?>" style="width:100%;" placeholder="https://docs.google.com/spreadsheets/d/...">
        </p>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
        <div>
            <h4>Practice Exam</h4>
            <p><label>Practice Exam ID:</label><br><input type="text" name="mco_practice_exam_id" value="<?php echo esc_attr($practice_id); ?>" style="width:100%;" placeholder="e.g., exam-cpc-practice"></p>
            <p><label>Number of Questions:</label><br><input type="number" name="mco_practice_questions" value="<?php echo esc_attr($practice_questions); ?>" style="width:100%;"></p>
            <p><label>Duration (Minutes):</label><br><input type="number" name="mco_practice_duration" value="<?php echo esc_attr($practice_duration); ?>" style="width:100%;"></p>
        </div>
        <div>
            <h4>Certification Exam</h4>
            <p><label>Exam Product:</label><br>
                <select name="mco_certification_exam_product_id" style="width:100%;">
                    <option value="">-- Select a Product --</option>
                    <?php foreach ($cert_products as $product) { echo '<option value="' . $product->get_id() . '" ' . selected($cert_product_id, $product->get_id(), false) . '>' . $product->get_name() . '</option>'; } ?>
                </select>
            </p>
            <p><label>Number of Questions:</label><br><input type="number" name="mco_cert_questions" value="<?php echo esc_attr($cert_questions); ?>" style="width:100%;"></p>
            <p><label>Duration (Minutes):</label><br><input type="number" name="mco_cert_duration" value="<?php echo esc_attr($cert_duration); ?>" style="width:100%;"></p>
        </div>
        <div>
            <h4>Bundle (Optional)</h4>
            <p><label>Bundle Product:</label><br>
                <select name="mco_bundle_product_id" style="width:100%;">
                    <option value="">-- Select a Bundle --</option>
                    <?php foreach ($bundle_products as $product) { echo '<option value="' . $product->get_id() . '" ' . selected($bundle_product_id, $product->get_id(), false) . '>' . $product->get_name() . '</option>'; } ?>
                </select>
            </p>
        </div>
    </div>
    <hr style="margin: 20px 0;">
    <p><label for="mco_pass_score"><strong>Pass Score for BOTH Exams (%):</strong></label><br><input type="number" id="mco_pass_score" name="mco_pass_score" value="<?php echo esc_attr($pass_score ?: 70); ?>" style="width:100%;" min="0" max="100"></p>
    <?php
}

function mco_save_book_meta_data($post_id) {
    if (!isset($_POST['mco_book_nonce']) || !wp_verify_nonce($_POST['mco_book_nonce'], 'mco_save_book_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    if (isset($_POST['mco_link_com'])) update_post_meta($post_id, '_mco_link_com', esc_url_raw($_POST['mco_link_com']));
    if (isset($_POST['mco_link_in'])) update_post_meta($post_id, '_mco_link_in', esc_url_raw($_POST['mco_link_in']));
    if (isset($_POST['mco_link_ae'])) update_post_meta($post_id, '_mco_link_ae', esc_url_raw($_POST['mco_link_ae']));
}

function mco_save_wc_product_meta_data($post_id) {
    if (!isset($_POST['mco_wc_nonce']) || !wp_verify_nonce($_POST['mco_wc_nonce'], 'mco_save_wc_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    if (isset($_POST['mco_product_type'])) update_post_meta($post_id, '_mco_product_type', sanitize_text_field($_POST['mco_product_type']));
}

function mco_save_exam_program_meta_data($post_id) {
    if (!isset($_POST['mco_exam_program_nonce']) || !wp_verify_nonce($_POST['mco_exam_program_nonce'], 'mco_save_exam_program_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    $fields = ['mco_practice_exam_id', 'mco_certification_exam_product_id', 'mco_bundle_product_id', 'mco_pass_score', 'mco_practice_questions', 'mco_practice_duration', 'mco_cert_questions', 'mco_cert_duration', 'mco_question_source_url'];
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            $value = (strpos($field, '_url') !== false) ? esc_url_raw($_POST[$field]) : sanitize_text_field($_POST[$field]);
            update_post_meta($post_id, '_' . $field, $value);
        }
    }
}


// --- DYNAMIC DATA PAYLOAD & JWT ---
function mco_exam_get_payload($user_id) {
    $user = get_userdata($user_id);
    if (!$user) return [];
    $is_admin = in_array('administrator', $user->roles);
    $paid_exam_skus = [];
    $is_subscribed = false;
    $exam_prices = [];

    $sub_products = wc_get_products(['type' => ['subscription', 'simple'], 'status' => 'publish', 'limit' => -1, 'meta_query' => [['key' => '_mco_product_type', 'value' => 'subscription_bundle']]]);
    foreach ($sub_products as $product) {
        if ($product && $product->get_sku()) {
            $exam_prices[$product->get_sku()] = ['price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productId' => $product->get_id()];
        }
    }

    if (class_exists('WooCommerce')) {
        $customer_orders = wc_get_orders(['customer_id' => $user_id, 'status' => ['wc-completed', 'wc-processing']]);
        foreach ($customer_orders as $order) {
            foreach ($order->get_items() as $item) {
                $product = $item->get_product();
                if ($product) {
                    $product_type = $product->get_meta('_mco_product_type');
                    if ($product_type === 'certification_exam') $paid_exam_skus[] = $product->get_sku();
                    if ($product_type === 'subscription_bundle') $is_subscribed = true;
                }
            }
        }
        if (class_exists('WC_Subscriptions') && wcs_user_has_subscription($user_id, '', 'active')) $is_subscribed = true;
    }

    $books_query = new WP_Query(['post_type' => 'mco_recommended_book', 'posts_per_page' => -1, 'post_status' => 'publish']);
    $suggested_books = [];
    if ($books_query->have_posts()) {
        while ($books_query->have_posts()) {
            $books_query->the_post();
            $post_id = get_the_ID();
            $suggested_books[] = [
                'id' => 'book-' . $post_id, 'title' => get_the_title(), 'description' => strip_tags(get_the_content()),
                'thumbnailUrl' => get_the_post_thumbnail_url($post_id, 'medium'),
                'affiliateLinks' => [ 
                    'com' => get_post_meta($post_id, '_mco_link_com', true) ?: '', 
                    'in' => get_post_meta($post_id, '_mco_link_in', true) ?: '', 
                    'ae' => get_post_meta($post_id, '_mco_link_ae', true) ?: '' 
                ]
            ];
        }
    }
    wp_reset_postdata();
    
    $dynamic_exams = [];
    $dynamic_categories = [];
    $programs_query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1, 'post_status' => 'publish']);
    if ($programs_query->have_posts()) {
        while($programs_query->have_posts()) {
            $programs_query->the_post();
            $prog_id = get_the_ID();
            $practice_id = get_post_meta($prog_id, '_mco_practice_exam_id', true);
            $cert_product_id = get_post_meta($prog_id, '_mco_certification_exam_product_id', true);
            if(empty($practice_id) || empty($cert_product_id)) continue;
            $product = wc_get_product($cert_product_id);
            if(!$product || !$product->get_sku()) continue;
            $cert_sku = $product->get_sku();
            $exam_prices[$cert_sku] = ['price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productId' => $cert_product_id, 'avgRating' => floatval($product->get_average_rating()), 'reviewCount' => intval($product->get_review_count())];
            
            $bundle_product_id = get_post_meta($prog_id, '_mco_bundle_product_id', true);
            if (!empty($bundle_product_id) && ($bundle_product = wc_get_product($bundle_product_id)) && $bundle_product->get_sku()) {
                $exam_prices[$bundle_product->get_sku()] = ['price' => (float)$bundle_product->get_price(), 'regularPrice' => (float)$bundle_product->get_regular_price(), 'productId' => $bundle_product_id];
            }

            $pass_score = (int)get_post_meta($prog_id, '_mco_pass_score', true) ?: 70;
            $question_source = get_post_meta($prog_id, '_mco_question_source_url', true);
            $description = strip_tags(get_the_content());
            
            $dynamic_exams[] = [ 'id' => $practice_id, 'name' => get_the_title() . ' Practice', 'description' => $description, 'price' => 0, 'productSku' => $practice_id, 'numberOfQuestions' => (int)get_post_meta($prog_id, '_mco_practice_questions', true), 'passScore' => $pass_score, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => (int)get_post_meta($prog_id, '_mco_practice_duration', true), 'questionSourceUrl' => $question_source ];
            $dynamic_exams[] = [ 'id' => $cert_sku, 'name' => get_the_title(), 'description' => $description, 'price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productSku' => $cert_sku, 'productSlug' => $product->get_slug(), 'numberOfQuestions' => (int)get_post_meta($prog_id, '_mco_cert_questions', true), 'passScore' => $pass_score, 'certificateTemplateId' => 'cert-generic', 'isPractice' => false, 'durationMinutes' => (int)get_post_meta($prog_id, '_mco_cert_duration', true), 'questionSourceUrl' => $question_source ];
            $dynamic_categories[] = [ 'id' => 'prod-' . $prog_id, 'name' => get_the_title(), 'description' => $description, 'practiceExamId' => $practice_id, 'certificationExamId' => $cert_sku, 'questionSourceUrl' => $question_source ];
        }
    }
    wp_reset_postdata();

    return [
        'user' => ['id' => strval($user->ID), 'name' => $user->display_name, 'email' => $user->user_email, 'isAdmin' => $is_admin],
        'paidExamIds' => array_unique($paid_exam_skus), 'isSubscribed' => $is_subscribed,
        'suggestedBooks' => $suggested_books, 'exams' => $dynamic_exams,
        'examProductCategories' => $dynamic_categories, 'examPrices' => $exam_prices
    ];
}


function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

function mco_generate_exam_jwt($user_id) {
    if (!defined('MCO_JWT_SECRET')) return false;
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = mco_exam_get_payload($user_id);
    if (empty($payload)) return false;
    $payload['iat'] = time();
    $payload['exp'] = time() + (24 * HOUR_IN_SECONDS);
    $header_encoded = mco_base64url_encode(json_encode($header));
    $payload_encoded = mco_base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $header_encoded . '.' . $payload_encoded, MCO_JWT_SECRET, true);
    $signature_encoded = mco_base64url_encode($signature);
    return $header_encoded . '.' . $payload_encoded . '.' . $signature_encoded;
}

function mco_verify_exam_jwt($token) {
    if (!defined('MCO_JWT_SECRET')) return false;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($header_encoded, $payload_encoded, $signature_encoded) = $parts;
    $signature = mco_base64url_decode($signature_encoded);
    $expected_signature = hash_hmac('sha256', $header_encoded . '.' . $payload_encoded, MCO_JWT_SECRET, true);
    if (!hash_equals($expected_signature, $signature)) return false;
    $payload = json_decode(mco_base64url_decode($payload_encoded));
    if (json_last_error() !== JSON_ERROR_NONE) return false;
    if (isset($payload->exp) && $payload->exp < time()) return false;
    return $payload;
}

// --- WOOCOMMERCE & SHORTCODES ---
function mco_redirect_after_purchase($order_id) {
    $order = wc_get_order($order_id);
    if (!$order || !($user_id = $order->get_user_id())) return;
    $token = mco_generate_exam_jwt($user_id);
    if ($token && ($app_url = mco_get_exam_app_url())) {
        wp_safe_redirect($app_url . '/#/auth?token=' . $token);
        exit;
    }
}

function mco_exam_login_shortcode() {
    if (is_user_logged_in()) {
        $user_id = get_current_user_id();
        $token = mco_generate_exam_jwt($user_id);
        $app_url = mco_get_exam_app_url();
        if ($token && $app_url) {
            $final_url = $app_url . '/#/auth?token=' . $token . '&redirect_to=/dashboard';
            return "<div style='text-align:center;'><p>Redirecting to your dashboard...</p><script>window.location.href='" . esc_url_raw($final_url) . "';</script></div>";
        }
    }
    ob_start();
    wc_get_template('myaccount/form-login.php');
    return ob_get_clean();
}

function mco_exam_showcase_shortcode() {
    ob_start();
    $query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1, 'post_status' => 'publish', 'orderby' => 'title', 'order' => 'ASC']);
    if ($query->have_posts()) {
        echo '<div class="mco-showcase-container">';
        while ($query->have_posts()) : $query->the_post();
            $prog_id = get_the_ID();
            $cert_product_id = get_post_meta($prog_id, '_mco_certification_exam_product_id', true);
            $bundle_product_id = get_post_meta($prog_id, '_mco_bundle_product_id', true);
            $cert_product = $cert_product_id ? wc_get_product($cert_product_id) : null;
            $bundle_product = $bundle_product_id ? wc_get_product($bundle_product_id) : null;
            ?>
            <div class="mco-program-card">
                <div class="mco-card-header">
                    <h3><?php the_title(); ?></h3>
                    <div class="mco-card-description"><?php echo wp_strip_all_tags(get_the_content()); ?></div>
                </div>
                <div class="mco-options-grid">
                    <div class="mco-option-column">
                        <h4>Practice Exam</h4>
                        <ul>
                            <li><strong>Questions:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_practice_questions', true); ?></li>
                            <li><strong>Duration:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_practice_duration', true); ?> mins</li>
                        </ul>
                        <a href="<?php echo esc_url( home_url('/exam-login/') ); ?>" class="mco-button mco-button-secondary">Start Practice</a>
                    </div>
                    <div class="mco-option-column">
                        <h4>Certification Exam</h4>
                        <ul>
                            <li><strong>Questions:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_cert_questions', true); ?></li>
                            <li><strong>Duration:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_cert_duration', true); ?> mins</li>
                        </ul>
                        <?php if ($cert_product) : ?>
                            <div class="mco-price"><?php echo $cert_product->get_price_html(); ?></div>
                            <a href="<?php echo esc_url($cert_product->add_to_cart_url()); ?>" class="mco-button mco-button-primary">Buy Exam</a>
                        <?php else : ?>
                            <div class="mco-price">Not for sale</div>
                        <?php endif; ?>
                    </div>
                    <div class="mco-option-column mco-option-bundle">
                        <h4>Exam + Study Bundle</h4>
                         <?php if ($bundle_product) : ?>
                            <ul><li>Includes Cert Exam</li><li>+ 1 Month Premium Access</li></ul>
                            <div class="mco-price"><?php echo $bundle_product->get_price_html(); ?></div>
                            <a href="<?php echo esc_url($bundle_product->add_to_cart_url()); ?>" class="mco-button mco-button-primary">Buy Bundle</a>
                        <?php else : ?>
                            <p class="mco-bundle-unavailable">Bundle not available.</p>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php
        endwhile;
        echo '</div>';
    } else {
        echo '<p>No exam programs are currently available.</p>';
    }
    wp_reset_postdata();
    return ob_get_clean();
}

function mco_add_custom_styles_to_head() {
    $css = '';
    if (function_exists('is_woocommerce') && (is_cart() || is_checkout())) {
        $css .= "body.woocommerce-cart, body.woocommerce-checkout { background-color: #f8fafc !important; } .woocommerce form .form-row input.input-text, .woocommerce form .form-row textarea, .woocommerce select { border-radius: 0.5rem !important; border: 1px solid #cbd5e1 !important; padding: 0.75rem 1rem !important; box-shadow: none !important; } .woocommerce .button, .woocommerce button.button { border-radius: 0.5rem !important; padding: 0.75rem 1.5rem !important; font-weight: 600 !important; transition: all 0.2s ease-in-out !important; border: none !important; } .woocommerce .button.alt, .woocommerce button.button.alt, .woocommerce #place_order { background-color: #0891b2 !important; color: white !important; } .woocommerce .button.alt:hover, .woocommerce button.button.alt:hover, .woocommerce #place_order:hover { background-color: #0e7490 !important; } @media (min-width: 992px) { .woocommerce-checkout form.checkout { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; align-items: flex-start; } .woocommerce-checkout .col2-set { width: 100% !important; } .woocommerce-checkout .woocommerce-checkout-review-order { grid-column: 2 / 3; } }";
    }
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'mco_exam_showcase')) {
        $css .= ".mco-showcase-container { display: grid; grid-template-columns: 1fr; gap: 2.5rem; } .mco-program-card { background: #fff; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,.07), 0 4px 6px -4px rgba(0,0,0,.07); border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; } .mco-card-header { padding: 1.5rem 2rem; border-bottom: 1px solid #e2e8f0; } .mco-card-header h3 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0; } .mco-card-description { font-size: 0.9rem; color: #475569; margin-top: 0.5rem; } .mco-options-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); } .mco-option-column { padding: 1.5rem; text-align: center; display: flex; flex-direction: column; justify-content: space-between; } .mco-option-column:not(:last-child) { border-right: 1px solid #e2e8f0; } .mco-option-column h4 { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-top: 0; margin-bottom: 1rem; } .mco-option-column ul { list-style: none; padding: 0; margin: 0 0 1.5rem 0; font-size: 0.875rem; color: #475569; text-align: left; } .mco-option-column ul li { margin-bottom: 0.5rem; } .mco-price { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; display: block; } .mco-button { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; transition: all 0.2s; width: 100%; margin-top: auto; } .mco-button-primary { background-color: #0891b2; color: white; } .mco-button-primary:hover { background-color: #0e7490; } .mco-button-secondary { background-color: #475569; color: white; } .mco-button-secondary:hover { background-color: #334155; } .mco-option-bundle { background-color: #f0f9ff; } .mco-bundle-unavailable { color: #64748b; font-size: 0.9rem; } @media (max-width: 768px) { .mco-option-column:not(:last-child) { border-right: none; border-bottom: 1px solid #e2e8f0; } }";
    }
    if (!empty($css)) echo '<style type="text/css">' . wp_strip_all_tags($css) . '</style>';
}

function mco_custom_order_button_text() { return 'Complete Enrollment & Pay Securely'; }

function mco_auto_complete_virtual_order( $order_id ) {
    if ( ! $order_id ) return;
    $order = wc_get_order( $order_id );
    if ( ! $order || $order->has_status( array( 'completed', 'failed', 'cancelled', 'refunded' ) ) ) return;
    $is_virtual_order = true;
    if ( count( $order->get_items() ) > 0 ) {
        foreach ( $order->get_items() as $item ) {
            if ( ! $item->get_product()->is_virtual() ) {
                $is_virtual_order = false;
                break;
            }
        }
    } else {
        $is_virtual_order = false;
    }
    if ( $is_virtual_order ) {
        $order->update_status( 'completed', 'Order automatically completed as it only contains virtual items.' );
    }
}


// --- REST API IMPLEMENTATION ---
function mco_exam_register_rest_api() {
    $namespace = 'mco-app/v1';
    register_rest_route($namespace, '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/certificate-data/(?P<testId>[a-zA-Z0-9_-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/exam-stats', ['methods' => 'GET', 'callback' => 'mco_get_exam_stats_callback', 'permission_callback' => 'mco_exam_api_admin_check']);
}

function mco_exam_api_permission_check(WP_REST_Request $request) {
    $auth_header = $request->get_header('Authorization');
    if (!$auth_header || sscanf($auth_header, 'Bearer %s', $token) !== 1) return new WP_Error('jwt_auth_no_token', 'Authorization token not found.', ['status' => 403]);
    $payload = mco_verify_exam_jwt($token);
    if (!$payload || !isset($payload->user->id)) return new WP_Error('jwt_auth_invalid_token', 'Invalid token.', ['status' => 403]);
    $request->set_param('jwt_payload', $payload);
    return true;
}

function mco_exam_api_admin_check(WP_REST_Request $request) {
    if (is_wp_error($permission = mco_exam_api_permission_check($request))) return $permission;
    $payload = $request->get_param('jwt_payload');
    if (empty($payload->user->isAdmin)) return new WP_Error('jwt_auth_not_admin', 'Administrator access required.', ['status' => 403]);
    return true;
}

function mco_get_user_results_callback(WP_REST_Request $request) {
    $payload = $request->get_param('jwt_payload');
    $results = get_user_meta($payload->user->id, 'mco_exam_results', true) ?: [];
    return new WP_REST_Response(array_values($results), 200);
}

function mco_sanitize_test_result($data) {
    if (!is_array($data)) return [];
    $sanitized = [];
    $sanitized['testId'] = isset($data['testId']) ? sanitize_text_field($data['testId']) : '';
    $sanitized['examId'] = isset($data['examId']) ? sanitize_text_field($data['examId']) : '';
    $sanitized['score'] = isset($data['score']) ? floatval($data['score']) : 0;
    $sanitized['correctCount'] = isset($data['correctCount']) ? intval($data['correctCount']) : 0;
    $sanitized['totalQuestions'] = isset($data['totalQuestions']) ? intval($data['totalQuestions']) : 0;
    $sanitized['timestamp'] = isset($data['timestamp']) ? intval($data['timestamp']) : 0;
    return $sanitized;
}

function mco_exam_submit_result_callback(WP_REST_Request $request) {
    $payload = $request->get_param('jwt_payload');
    $new_result_raw = $request->get_json_params();
    if (empty($new_result_raw['testId'])) return new WP_Error('bad_request', 'Missing testId.', ['status' => 400]);
    $new_result = mco_sanitize_test_result($new_result_raw);
    $results = get_user_meta($payload->user->id, 'mco_exam_results', true) ?: [];
    $results[$new_result['testId']] = $new_result;
    update_user_meta($payload->user->id, 'mco_exam_results', $results);
    return new WP_REST_Response(['success' => true], 200);
}

function mco_exam_update_user_name_callback(WP_REST_Request $request) {
    $payload = $request->get_param('jwt_payload');
    $params = $request->get_json_params();
    $new_name = isset($params['fullName']) ? sanitize_text_field($params['fullName']) : '';
    if (empty($new_name)) return new WP_Error('bad_request', 'Full name cannot be empty.', ['status' => 400]);
    
    $name_parts = explode(' ', $new_name, 2);
    wp_update_user(['ID' => $payload->user->id, 'display_name' => $new_name, 'first_name' => $name_parts[0], 'last_name' => isset($name_parts[1]) ? $name_parts[1] : '']);
    return new WP_REST_Response(['success' => true, 'newName' => $new_name], 200);
}

function mco_get_questions_from_sheet_callback(WP_REST_Request $request) {
    $params = $request->get_json_params();
    $sheet_url = isset($params['sheetUrl']) ? esc_url_raw($params['sheetUrl']) : '';
    $count = isset($params['count']) ? intval($params['count']) : 0;
    if (empty($sheet_url) || !filter_var($sheet_url, FILTER_VALIDATE_URL)) return new WP_Error('invalid_url', 'Invalid sheet URL.', ['status' => 400]);
    
    $csv_export_url = str_replace(['/edit?usp=sharing', '/edit'], '/export?format=csv', $sheet_url);
    $response = wp_remote_get($csv_export_url, ['timeout' => 15]);
    if (is_wp_error($response)) return new WP_Error('fetch_failed', 'Could not retrieve questions.', ['status' => 500]);
    
    $body = wp_remote_retrieve_body($response);
    $lines = preg_split('/\\r\\n?|\\n/', $body);
    array_shift($lines);
    
    $questions = [];
    foreach ($lines as $line) {
        if (empty(trim($line))) continue;
        $data = str_getcsv($line);
        if (count($data) >= 7 && !empty(trim($data[1]))) {
            $questions[] = [ 'id' => intval(trim($data[0])), 'question' => trim($data[1]), 'options' => array_map('trim', array_slice($data, 2, 4)), 'correctAnswer' => intval(trim($data[6])) ];
        }
    }
    shuffle($questions);
    return new WP_REST_Response(($count > 0 ? array_slice($questions, 0, $count) : $questions), 200);
}

function mco_get_certificate_data_callback(WP_REST_Request $request) {
    $payload = $request->get_param('jwt_payload');
    $test_id = $request->get_param('testId');
    $results = get_user_meta($payload->user->id, 'mco_exam_results', true) ?: [];
    if (!isset($results[$test_id])) return new WP_Error('not_found', 'Test result not found.', ['status' => 404]);
    $result = $results[$test_id];
    $user = get_userdata($payload->user->id);
    return new WP_REST_Response(['certificateNumber' => strtoupper(substr(md5($test_id . $payload->user->id), 0, 12)), 'candidateName' => $user->display_name, 'finalScore' => $result['score'], 'date' => date('F j, Y', $result['timestamp'] / 1000), 'examId' => $result['examId']], 200);
}

function mco_get_exam_stats_callback(WP_REST_Request $request) {
    $cached_stats = get_transient('mco_exam_stats');
    if ($cached_stats !== false) {
        return new WP_REST_Response($cached_stats, 200);
    }

    $programs_query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1, 'post_status' => 'publish']);
    $exam_configs = [];
    if ($programs_query->have_posts()) {
        while ($programs_query->have_posts()) {
            $programs_query->the_post();
            $product_id = get_post_meta(get_the_ID(), '_mco_certification_exam_product_id', true);
            if ($product_id && ($product = wc_get_product($product_id)) && $product->get_sku()) {
                $sku = $product->get_sku();
                $exam_configs[$sku] = [
                    'name' => get_the_title(),
                    'pass_score' => (int)get_post_meta(get_the_ID(), '_mco_pass_score', true) ?: 70,
                    'total_sales' => (int)get_post_meta($product_id, 'total_sales', true)
                ];
            }
        }
    }
    wp_reset_postdata();

    $stats = [];
    foreach ($exam_configs as $sku => $config) {
        $stats[$sku] = [ 'examId' => $sku, 'examName' => $config['name'], 'totalSales' => $config['total_sales'], 'totalAttempts' => 0, 'passed' => 0, 'failed' => 0, '_total_score_sum' => 0 ];
    }
    
    global $wpdb;
    $meta_key = 'mco_exam_results';
    $db_results = $wpdb->get_col($wpdb->prepare("SELECT meta_value FROM $wpdb->usermeta WHERE meta_key = %s", $meta_key));

    foreach ($db_results as $meta_value) {
        $user_results = maybe_unserialize($meta_value);
        if (is_array($user_results)) {
            foreach ($user_results as $result) {
                $exam_id = isset($result['examId']) ? $result['examId'] : null;
                if ($exam_id && isset($stats[$exam_id])) {
                    $stats[$exam_id]['totalAttempts']++;
                    $stats[$exam_id]['_total_score_sum'] += isset($result['score']) ? (float)$result['score'] : 0;
                    if (isset($result['score']) && $result['score'] >= $exam_configs[$exam_id]['pass_score']) {
                        $stats[$exam_id]['passed']++;
                    } else {
                        $stats[$exam_id]['failed']++;
                    }
                }
            }
        }
    }

    $final_stats = [];
    foreach ($stats as $stat) {
        if ($stat['totalAttempts'] > 0) {
            $stat['averageScore'] = round($stat['_total_score_sum'] / $stat['totalAttempts'], 2);
            $stat['passRate'] = round(($stat['passed'] / $stat['totalAttempts']) * 100, 2);
        } else {
            $stat['averageScore'] = 0;
            $stat['passRate'] = 0;
        }
        unset($stat['_total_score_sum']);
        $final_stats[] = $stat;
    }
    
    set_transient('mco_exam_stats', $final_stats, 2 * HOUR_IN_SECONDS);
    return new WP_REST_Response($final_stats, 200);
}
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
                <h2 className="text-xl font-bold mb-2">Definitive Plugin (v24.5.2)</h2>
                <p className="mb-4">
                   This is the stable, database-driven integration plugin. It includes a built-in <strong>System Status</strong> tool to fix the "No route was found" error and has an improved login shortcode for automatic redirection. This version also includes fixes for fetching subscription prices and book affiliate links, and adds auto-completion for virtual orders.
                </p>
                <p className="mb-4">
                    Copy the code below and replace the content of your existing plugin file (e.g., <code>mco-exam-engine.php</code>) on your WordPress server.
                </p>
                 <p className="font-bold text-red-600 mb-4 p-3 bg-red-50 rounded-md">
                    <strong>Action Required:</strong> After updating, go to <strong>"Exam App Engine" &rarr; "System Status"</strong> in your WordPress admin. The tool will guide you on fixing the server error (it's likely a permalink issue).
                </p>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm overflow-auto max-h-[60vh]">
                    <button 
                        onClick={copyToClipboard} 
                        className="sticky top-2 right-2 float-right p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition z-10"
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