import * as React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: React.FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A generic engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and styling.
 * Version:           24.2.0 (Production w/ Diagnostics)
 * Author:            Annapoorna Infotech (Multi-Tenant Engine)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

function mco_plugin_activate() {
    set_transient('mco_flush_rewrite_rules_flag', true, 30);
}

function mco_plugin_deactivate() {
    flush_rewrite_rules();
}

// --- CONFIGURATION ---
// IMPORTANT: Define this in your wp-config.php file. Example:
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// --- END CONFIGURATION ---

// --- INITIALIZATION ---
add_action('init', 'mco_exam_app_init');
function mco_exam_app_init() {
    add_action('admin_notices', 'mco_check_dependencies_notices');
    add_action('admin_menu', 'mco_exam_add_admin_menu');
    add_action('admin_init', 'mco_exam_register_settings');
    add_action('woocommerce_thankyou', 'mco_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'mco_exam_register_rest_api');
    
    mco_register_custom_post_types();
    add_action('add_meta_boxes', 'mco_add_meta_boxes');
    
    add_action('save_post_product', 'mco_save_wc_product_meta_data');
    add_action('save_post_mco_exam_program', 'mco_save_exam_program_meta_data');
    add_action('save_post_mco_recommended_book', 'mco_save_book_meta_data');
    
    add_shortcode('mco_exam_login', 'mco_exam_login_shortcode');
    add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode');

    add_action('wp_head', 'mco_add_custom_styles_to_head');
    add_filter('woocommerce_order_button_text', 'mco_custom_order_button_text');

    if (get_transient('mco_flush_rewrite_rules_flag')) {
        flush_rewrite_rules();
        delete_transient('mco_flush_rewrite_rules_flag');
    }
}

function mco_check_dependencies_notices() { 
    if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> WooCommerce is not active. This plugin requires it to function.</p></div>'; 
    if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> A secure <strong>MCO_JWT_SECRET</strong> (at least 32 characters long) is not defined in your wp-config.php file for security. SSO will not work.</p></div>';
    if (empty(get_option('mco_exam_app_url'))) echo '<div class="notice notice-warning"><p><strong>Exam App Engine:</strong> The Exam Application URL is not set. Please <a href="' . admin_url('admin.php?page=mco-exam-engine') . '">go to the settings page</a> to configure it.</p></div>';
}

// --- ADMIN MENU & PAGES ---
function mco_exam_add_admin_menu() {
    add_menu_page('Exam App Engine', 'Exam App Engine', 'manage_options', 'mco-exam-engine', 'mco_exam_admin_page_router', 'dashicons-analytics', 80);
    add_submenu_page('mco-exam-engine', 'Engine Settings', 'Settings', 'manage_options', 'mco-exam-engine', 'mco_exam_admin_page_router');
    add_submenu_page('mco-exam-engine', 'Platform Blueprint', 'Platform Blueprint', 'manage_options', 'mco-platform-blueprint', 'mco_platform_blueprint_page_html');
}

function mco_exam_register_settings() { register_setting('mco_exam_app_settings_group', 'mco_exam_app_url'); }

function mco_exam_admin_page_router() {
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'settings';
    ?>
    <div class="wrap">
        <h1>Exam App Engine</h1>
        <h2 class="nav-tab-wrapper">
            <a href="?page=mco-exam-engine&tab=settings" class="nav-tab <?php echo $active_tab == 'settings' ? 'nav-tab-active' : ''; ?>">Settings</a>
            <a href="?page=mco-exam-engine&tab=status" class="nav-tab <?php echo $active_tab == 'status' ? 'nav-tab-active' : ''; ?>">System Status</a>
        </h2>
        <?php
        if ($active_tab == 'settings') {
            mco_exam_settings_page_html();
        } else {
            mco_exam_status_page_html();
        }
        ?>
    </div>
    <?php
}


function mco_exam_settings_page_html() {
    ?>
    <form method="post" action="options.php">
        <?php settings_fields('mco_exam_app_settings_group'); ?>
        <?php do_settings_sections('mco_exam_app_settings_group'); ?>
        <table class="form-table">
            <tr valign="top">
                <th scope="row">Exam Application URL</th>
                <td>
                    <input type="url" name="mco_exam_app_url" value="<?php echo esc_attr(get_option('mco_exam_app_url')); ?>" class="regular-text" placeholder="https://exams.yourdomain.com" />
                    <p class="description">Enter the full URL of your standalone React examination app. Do not include a trailing slash.</p>
                </td>
            </tr>
        </table>
        <?php submit_button(); ?>
    </form>
    <?php
}

function mco_exam_status_page_html() {
    $checks = [];
    // 1. JWT Secret Check
    $checks['jwt'] = [
        'label' => 'JWT Security Secret',
        'status' => (defined('MCO_JWT_SECRET') && strlen(MCO_JWT_SECRET) >= 32),
        'message_ok' => 'The MCO_JWT_SECRET constant is correctly defined in wp-config.php.',
        'message_fail' => 'The MCO_JWT_SECRET constant is missing or too short in your wp-config.php file. This is required for secure authentication. Please define it with a random string of at least 32 characters.'
    ];
    // 2. WooCommerce Check
    $checks['woocommerce'] = [
        'label' => 'WooCommerce Plugin',
        'status' => class_exists('WooCommerce'),
        'message_ok' => 'WooCommerce is active.',
        'message_fail' => 'WooCommerce is not active. This plugin relies on it for product management and purchases.'
    ];
    // 3. Permalink Structure Check
    $permalinks_ok = get_option('permalink_structure');
    $checks['permalinks'] = [
        'label' => 'Permalink Structure',
        'status' => !empty($permalinks_ok),
        'message_ok' => 'Permalinks are set to a custom structure, which is required for the REST API.',
        'message_fail' => 'Your permalink structure is set to "Plain". The REST API may not work correctly. Please go to <a href="' . admin_url('options-permalink.php') . '">Settings &rarr; Permalinks</a> and choose any structure other than "Plain" (e.g., "Post name").'
    ];
    // 4. App URL Check
    $app_url = get_option('mco_exam_app_url');
    $checks['app_url'] = [
        'label' => 'Exam App URL',
        'status' => (!empty($app_url) && filter_var($app_url, FILTER_VALIDATE_URL)),
        'message_ok' => 'The Exam App URL is configured: ' . esc_html($app_url),
        'message_fail' => 'The Exam App URL is not set or is invalid. Please configure it under the "Settings" tab.'
    ];

    ?>
    <h3>System Status Check</h3>
    <p>This page helps diagnose common configuration issues. If any checks below fail, the application may not work as expected.</p>
    <table class="wp-list-table widefat striped">
        <thead>
            <tr>
                <th style="width: 20px;">Status</th>
                <th>Check</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($checks as $check): ?>
                <tr>
                    <td>
                        <?php if ($check['status']): ?>
                            <span class="dashicons dashicons-yes-alt" style="color: #46b450;"></span>
                        <?php else: ?>
                            <span class="dashicons dashicons-warning" style="color: #d63638;"></span>
                        <?php endif; ?>
                    </td>
                    <td><strong><?php echo esc_html($check['label']); ?></strong></td>
                    <td><?php echo $check['status'] ? $check['message_ok'] : $check['message_fail']; ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <p style="margin-top: 1rem;">
        <strong>Troubleshooting Tip:</strong> If you are still experiencing issues with API routes (like a "No route was found" error), try re-saving your permalinks. Go to <a href="<?php echo admin_url('options-permalink.php'); ?>">Settings &rarr; Permalinks</a> and simply click the "Save Changes" button. This flushes WordPress's rewrite rules and often resolves routing problems.
    </p>
    <?php
}

function mco_platform_blueprint_page_html() {
    ?>
    <div class="wrap" style="max-width: 900px;">
        <h1>Platform Blueprint: A Guide for Tenant Administrators</h1>
        <p class="about-description">This guide outlines the architecture of the Annapoorna Examination App and the steps required to onboard your organization as a new tenant.</p>
        
        <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px;">
            <h2>Core Architecture: The Headless CMS Model</h2>
            <p>The platform is designed as a "Headless CMS". This means:</p>
            <ul>
                <li><strong>Your WordPress Site (The "Head"):</strong> This is your command center. You manage all content here—users, products, exam programs, and books. It's the single source of truth.</li>
                <li><strong>The React App (The "Body"):</strong> This is the user-facing examination portal. It is a universal "engine" that displays the content you manage in WordPress. It has no content of its own.</li>
            </ul>
            <p>When a user logs in, the plugin securely bundles all necessary content from your WordPress database and sends it to the React app, which then displays it. This makes the platform incredibly flexible and easy to manage.</p>
        </div>

        <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px;">
            <h2>Onboarding Workflow: From Setup to Launch</h2>
            <p>Follow these steps to configure your WordPress site to work with the exam app.</p>
            
            <h3>Step 1: Install & Configure this Plugin</h3>
            <ol>
                <li>Ensure this plugin ("Exam App Integration Engine") is installed and activated.</li>
                <li><strong>Crucial Security Step:</strong> Add a secure, random key to your <code>wp-config.php</code> file. Example: <code>define('MCO_JWT_SECRET', 'your-very-strong-secret-key-here');</code></li>
                <li>Go to <strong>Exam App Engine &rarr; Settings</strong> in your admin menu and enter the URL of your exam application (e.g., <code>https://exams.your-domain.com</code>).</li>
                <li>Go to the <strong>System Status</strong> tab to ensure all checks are passing.</li>
            </ol>
            
            <h3>Step 2: Create Your Products in WooCommerce</h3>
            <p>Each purchasable item (like a certification exam or a subscription) must be a WooCommerce product.</p>
            <ol>
                <li>Go to <strong>Products &rarr; Add New</strong>.</li>
                <li>Create your products (e.g., "CPC Certification Exam Access", "Monthly Subscription"). Set their price and a unique SKU.</li>
                <li>In the "Exam App Configuration" box on the product edit page, set the "Product Role" to "Certification Exam". This is critical for the app to know what the product is for.</li>
            </ol>

            <h3>Step 3: Create Recommended Books (Optional)</h3>
            <ol>
                <li>Go to <strong>Recommended Books &rarr; Add New</strong>.</li>
                <li>Enter the book title, description, and your Amazon affiliate links.</li>
                <li>Set a "Featured Image" for the book cover. This image will be shown in the app.</li>
            </ol>

            <h3>Step 4: Create Your Exam Programs</h3>
            <p>This is the central hub where you define your exams and link them to your WooCommerce products.</p>
            <ol>
                <li>Go to <strong>Exam Programs &rarr; Add New</strong>.</li>
                <li>Give your program a title (e.g., "CPC Certification Program") and a description.</li>
                <li>In the "Exam Program Details" section:
                    <ul>
                        <li><strong>Practice Exam Details:</strong> Give the free practice test a unique ID (e.g., <code>exam-cpc-practice</code>). This does NOT need to be a WooCommerce product.</li>
                        <li><strong>Certification Exam Product:</strong> Select the corresponding WooCommerce product from the new dropdown menu. This creates the link for purchase.</li>
                        <li>Fill in the number of questions, duration, and pass score for both the practice and certification exams.</li>
                    </ul>
                </li>
                 <li>Publish the Exam Program.</li>
            </ol>
            
            <h3>Step 5: Create Your Public-Facing Pages</h3>
            <ol>
                <li>Create a new page called "Exam Login" and add the shortcode: <code>[mco_exam_login]</code>. This will generate the secure SSO login form.</li>
                <li>Create a page called "Exam Programs" (or similar) and add the shortcode: <code>[mco_exam_showcase]</code>. This will display a beautifully formatted, public list of all your exam programs for users to browse and purchase.</li>
            </ol>
        </div>
    </div>
    <?php
}

function mco_get_exam_app_url() { return rtrim(get_option('mco_exam_app_url', ''), '/'); }

// --- CUSTOM POST TYPES & META BOXES ---
function mco_register_custom_post_types() {
    register_post_type('mco_exam_program', [ 'labels' => ['name' => 'Exam Programs', 'singular_name' => 'Exam Program'], 'public' => true, 'has_archive' => true, 'supports' => ['title', 'editor', 'thumbnail'], 'menu_icon' => 'dashicons-welcome-learn-more' ]);
    register_post_type('mco_recommended_book', [ 'labels' => ['name' => 'Recommended Books', 'singular_name' => 'Book'], 'public' => true, 'has_archive' => false, 'supports' => ['title', 'editor', 'thumbnail'], 'menu_icon' => 'dashicons-book-alt' ]);
}

function mco_add_meta_boxes() {
    add_meta_box('mco_wc_product_meta', 'Exam App Configuration', 'mco_render_wc_product_meta_box', 'product', 'side', 'high');
    add_meta_box('mco_exam_program_meta', 'Exam Program Details', 'mco_render_exam_program_meta_box', 'mco_exam_program', 'normal', 'high');
    add_meta_box('mco_book_links_meta', 'Affiliate Links', 'mco_render_book_links_meta_box', 'mco_recommended_book', 'normal', 'high');
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
    $pass_score = get_post_meta($post->ID, '_mco_pass_score', true);
    $practice_questions = get_post_meta($post->ID, '_mco_practice_questions', true);
    $practice_duration = get_post_meta($post->ID, '_mco_practice_duration', true);
    $cert_questions = get_post_meta($post->ID, '_mco_cert_questions', true);
    $cert_duration = get_post_meta($post->ID, '_mco_cert_duration', true);
    $question_source_url = get_post_meta($post->ID, '_mco_question_source_url', true);

    $exam_products_query = new WP_Query([
        'post_type' => 'product',
        'posts_per_page' => -1,
        'post_status' => 'publish',
        'meta_query' => [['key' => '_mco_product_type', 'value' => 'certification_exam']]
    ]);
    ?>
    <div style="background: #f0f0f1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p>
            <label for="mco_question_source_url"><strong>Google Sheet URL for Questions:</strong></label><br>
            <input type="url" id="mco_question_source_url" name="mco_question_source_url" value="<?php echo esc_attr($question_source_url); ?>" style="width:100%;" placeholder="https://docs.google.com/spreadsheets/d/...">
            <em style="color:#666;">This single sheet will provide questions for both the practice and certification exams.</em>
        </p>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
            <h4>Practice Exam</h4>
            <p><label for="mco_practice_exam_id">Practice Exam ID:</label><br><input type="text" id="mco_practice_exam_id" name="mco_practice_exam_id" value="<?php echo esc_attr($practice_id); ?>" style="width:100%;" placeholder="e.g., exam-cpc-practice"></p>
            <p><label for="mco_practice_questions">Number of Questions:</label><br><input type="number" id="mco_practice_questions" name="mco_practice_questions" value="<?php echo esc_attr($practice_questions); ?>" style="width:100%;"></p>
            <p><label for="mco_practice_duration">Duration (Minutes):</label><br><input type="number" id="mco_practice_duration" name="mco_practice_duration" value="<?php echo esc_attr($practice_duration); ?>" style="width:100%;"></p>
        </div>
        <div>
            <h4>Certification Exam</h4>
            <p>
                <label for="mco_certification_exam_product_id">Certification Exam Product:</label><br>
                <select id="mco_certification_exam_product_id" name="mco_certification_exam_product_id" style="width:100%;">
                    <option value="">-- Select a Product --</option>
                    <?php
                    if ($exam_products_query->have_posts()) {
                        while ($exam_products_query->have_posts()) {
                            $exam_products_query->the_post();
                            echo '<option value="' . get_the_ID() . '" ' . selected($cert_product_id, get_the_ID(), false) . '>' . get_the_title() . ' (SKU: ' . get_post_meta(get_the_ID(), '_sku', true) . ')</option>';
                        }
                    }
                    wp_reset_postdata();
                    ?>
                </select>
            </p>
            <p><label for="mco_cert_questions">Number of Questions:</label><br><input type="number" id="mco_cert_questions" name="mco_cert_questions" value="<?php echo esc_attr($cert_questions); ?>" style="width:100%;"></p>
            <p><label for="mco_cert_duration">Duration (Minutes):</label><br><input type="number" id="mco_cert_duration" name="mco_cert_duration" value="<?php echo esc_attr($cert_duration); ?>" style="width:100%;"></p>
        </div>
    </div>
    <hr style="margin: 20px 0;">
    <p><label for="mco_pass_score"><strong>Pass Score for BOTH Exams (%):</strong></label><br><input type="number" id="mco_pass_score" name="mco_pass_score" value="<?php echo esc_attr($pass_score ?: 70); ?>" style="width:100%;" min="0" max="100"></p>
    <?php
}

function mco_render_book_links_meta_box($post) {
    wp_nonce_field('mco_save_book_meta', 'mco_book_nonce');
    $link_com = get_post_meta($post->ID, '_mco_affiliate_link_com', true);
    $link_in = get_post_meta($post->ID, '_mco_affiliate_link_in', true);
    $link_ae = get_post_meta($post->ID, '_mco_affiliate_link_ae', true);
    ?>
    <p><label for="mco_affiliate_link_com">Amazon.com Link:</label><br><input type="url" id="mco_affiliate_link_com" name="mco_affiliate_link_com" value="<?php echo esc_attr($link_com); ?>" style="width:100%;"></p>
    <p><label for="mco_affiliate_link_in">Amazon.in Link:</label><br><input type="url" id="mco_affiliate_link_in" name="mco_affiliate_link_in" value="<?php echo esc_attr($link_in); ?>" style="width:100%;"></p>
    <p><label for="mco_affiliate_link_ae">Amazon.ae Link:</label><br><input type="url" id="mco_affiliate_link_ae" name="mco_affiliate_link_ae" value="<?php echo esc_attr($link_ae); ?>" style="width:100%;"></p>
    <?php
}

function mco_save_wc_product_meta_data($post_id) {
    if (!isset($_POST['mco_wc_nonce']) || !wp_verify_nonce($_POST['mco_wc_nonce'], 'mco_save_wc_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    if (isset($_POST['mco_product_type'])) update_post_meta($post_id, '_mco_product_type', sanitize_text_field($_POST['mco_product_type']));
}

function mco_save_exam_program_meta_data($post_id) {
    if (!isset($_POST['mco_exam_program_nonce']) || !wp_verify_nonce($_POST['mco_exam_program_nonce'], 'mco_save_exam_program_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    $fields_to_save = [
        'mco_practice_exam_id', 'mco_certification_exam_product_id',
        'mco_pass_score', 'mco_practice_questions', 'mco_practice_duration',
        'mco_cert_questions', 'mco_cert_duration'
    ];
    foreach($fields_to_save as $field) {
        if(isset($_POST[$field])) {
            $value = ($field === 'mco_practice_exam_id')
                ? sanitize_text_field($_POST[$field])
                : intval($_POST[$field]);
            update_post_meta($post_id, '_' . $field, $value);
        }
    }
    if (isset($_POST['mco_question_source_url'])) {
        update_post_meta($post_id, '_mco_question_source_url', esc_url_raw($_POST['mco_question_source_url']));
    }
}


function mco_save_book_meta_data($post_id) {
    if (!isset($_POST['mco_book_nonce']) || !wp_verify_nonce($_POST['mco_book_nonce'], 'mco_save_book_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    if (isset($_POST['mco_affiliate_link_com'])) update_post_meta($post_id, '_mco_affiliate_link_com', esc_url_raw($_POST['mco_affiliate_link_com']));
    if (isset($_POST['mco_affiliate_link_in'])) update_post_meta($post_id, '_mco_affiliate_link_in', esc_url_raw($_POST['mco_affiliate_link_in']));
    if (isset($_POST['mco_affiliate_link_ae'])) update_post_meta($post_id, '_mco_affiliate_link_ae', esc_url_raw($_POST['mco_affiliate_link_ae']));
}


// --- DYNAMIC DATA PAYLOAD & JWT ---
function mco_exam_get_payload($user_id) {
    $user = get_userdata($user_id);
    $is_admin = in_array('administrator', $user->roles);
    $paid_exam_skus = [];
    $is_subscribed = false;

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
            $post_content = get_the_content();
            $content_stripped = strip_tags($post_content);
            $suggested_books[] = [
                'id' => 'book-' . get_the_ID(), 'title' => get_the_title(), 'description' => $content_stripped,
                'thumbnailUrl' => get_the_post_thumbnail_url(get_the_ID(), 'medium'),
                'affiliateLinks' => [
                    'com' => get_post_meta(get_the_ID(), '_mco_affiliate_link_com', true),
                    'in' => get_post_meta(get_the_ID(), '_mco_affiliate_link_in', true),
                    'ae' => get_post_meta(get_the_ID(), '_mco_affiliate_link_ae', true)
                ]
            ];
        }
    }
    wp_reset_postdata();
    
    // Dynamically build exam data from CPTs
    $dynamic_exams = [];
    $dynamic_categories = [];
    $exam_prices = [];
    $programs_query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1, 'post_status' => 'publish']);
    if ($programs_query->have_posts()) {
        while($programs_query->have_posts()) {
            $programs_query->the_post();
            $prog_id = get_the_ID();
            $post_content = get_the_content();
            $content_stripped = strip_tags($post_content);

            $practice_id = get_post_meta($prog_id, '_mco_practice_exam_id', true);
            $cert_product_id = get_post_meta($prog_id, '_mco_certification_exam_product_id', true);
            $question_source = get_post_meta($prog_id, '_mco_question_source_url', true);
            if(empty($practice_id) || empty($cert_product_id)) continue;

            $product = wc_get_product($cert_product_id);
            if(!$product) continue;

            $cert_sku = $product->get_sku();
            if(empty($cert_sku)) continue;
            
            $price = (float)$product->get_price();
            $regular_price = (float)$product->get_regular_price();
            $exam_prices[$cert_sku] = ['price' => $price, 'regularPrice' => $regular_price, 'productId' => $cert_product_id];

            $pass_score = (int)get_post_meta($prog_id, '_mco_pass_score', true) ?: 70;
            
            $dynamic_exams[] = [
                'id' => $practice_id, 'name' => get_the_title() . ' Practice', 'description' => $content_stripped, 'price' => 0,
                'productSku' => $practice_id, 'numberOfQuestions' => (int)get_post_meta($prog_id, '_mco_practice_questions', true),
                'passScore' => $pass_score, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true,
                'durationMinutes' => (int)get_post_meta($prog_id, '_mco_practice_duration', true), 'questionSourceUrl' => $question_source
            ];

            $dynamic_exams[] = [
                'id' => $cert_sku, 'name' => get_the_title(), 'description' => $content_stripped, 'price' => $price, 'regularPrice' => $regular_price,
                'productSku' => $cert_sku, 'productSlug' => $product->get_slug(), 'numberOfQuestions' => (int)get_post_meta($prog_id, '_mco_cert_questions', true),
                'passScore' => $pass_score, 'certificateTemplateId' => 'cert-generic', 'isPractice' => false,
                'durationMinutes' => (int)get_post_meta($prog_id, '_mco_cert_duration', true), 'questionSourceUrl' => $question_source
            ];

            $dynamic_categories[] = [
                'id' => 'prod-' . $prog_id, 'name' => get_the_title(), 'description' => $content_stripped,
                'practiceExamId' => $practice_id, 'certificationExamId' => $cert_sku, 'questionSourceUrl' => $question_source
            ];
        }
    }
    wp_reset_postdata();

    return [
        'user' => ['id' => strval($user->ID), 'name' => $user->display_name, 'email' => $user->user_email, 'isAdmin' => $is_admin],
        'paidExamIds' => array_unique($paid_exam_skus), 'isSubscribed' => $is_subscribed,
        'spinsAvailable' => (int)get_user_meta($user_id, 'mco_spins_available', true),
        'wonPrize' => get_user_meta($user_id, 'mco_won_prize', true) ?: null,
        'suggestedBooks' => $suggested_books,
        'exams' => $dynamic_exams,
        'examProductCategories' => $dynamic_categories,
        'examPrices' => $exam_prices
    ];
}


function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

function mco_generate_exam_jwt($user_id) {
    if (!defined('MCO_JWT_SECRET')) return false;
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = mco_exam_get_payload($user_id);
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
    if (!$order) return;
    $user_id = $order->get_user_id();
    if (!$user_id) return;
    $token = mco_generate_exam_jwt($user_id);
    $app_url = mco_get_exam_app_url();
    if ($token && $app_url) {
        $redirect_url = $app_url . '/#/auth?token=' . $token;
        if (headers_sent()) {
            echo '<script>window.location.href="' . esc_url_raw($redirect_url) . '";</script>';
        } else {
            wp_safe_redirect($redirect_url);
        }
        exit;
    }
}

function mco_exam_login_shortcode() {
    ob_start();
    if (is_user_logged_in()) {
        $token = mco_generate_exam_jwt(get_current_user_id());
        $sync_url = mco_get_exam_app_url() . '/#/auth?token=' . $token;
        echo '<p>You are already logged in. <a href="' . esc_url($sync_url) . '">Click here to go to your dashboard and sync purchases.</a></p>';
        return ob_get_clean();
    }

    $error_message = '';
    if (isset($_POST['mco_login_submit'])) {
        if (wp_verify_nonce($_POST['_wpnonce'], 'mco_login_nonce')) {
            $creds = ['user_login' => sanitize_user($_POST['log']), 'user_password' => $_POST['pwd'], 'remember' => isset($_POST['rememberme'])];
            $user = wp_signon($creds, is_ssl());
            if (is_wp_error($user)) {
                $error_message = '<div class="woocommerce-error">' . esc_html($user->get_error_message()) . '</div>';
            } else {
                $token = mco_generate_exam_jwt($user->ID);
                $app_url = mco_get_exam_app_url();
                if ($token && $app_url) {
                    wp_redirect($app_url . '/#/auth?token=' . $token);
                    exit;
                } else {
                    $error_message = '<div class="woocommerce-error">Could not generate login token. Please contact support.</div>';
                }
            }
        }
    }
    
    echo $error_message;
    ?>
    <form name="loginform" id="loginform" action="" method="post">
        <p class="login-username">
            <label for="user_login">Username or Email Address</label>
            <input type="text" name="log" id="user_login" class="input" value="" size="20" />
        </p>
        <p class="login-password">
            <label for="user_pass">Password</label>
            <input type="password" name="pwd" id="user_pass" class="input" value="" size="20" />
        </p>
        <p class="login-remember"><label><input name="rememberme" type="checkbox" id="rememberme" value="forever" /> Remember Me</label></p>
        <p class="login-submit">
            <input type="submit" name="mco_login_submit" id="wp-submit" class="button button-primary" value="Log In & Go to Exam App" />
        </p>
        <?php wp_nonce_field('mco_login_nonce'); ?>
    </form>
    <?php
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
            $product = $cert_product_id ? wc_get_product($cert_product_id) : null;
            ?>
            <div class="mco-program-card">
                <div class="mco-card-header">
                    <h3><?php the_title(); ?></h3>
                </div>
                <div class="mco-card-body">
                    <?php the_content(); ?>
                </div>
                <div class="mco-details-grid">
                    <div class="mco-exam-section">
                        <h4>Practice Exam</h4>
                        <ul>
                            <li><strong>Questions:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_practice_questions', true); ?></li>
                            <li><strong>Duration:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_practice_duration', true); ?> mins</li>
                        </ul>
                    </div>
                    <div class="mco-exam-section">
                        <h4>Certification Exam</h4>
                        <ul>
                            <li><strong>Questions:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_cert_questions', true); ?></li>
                            <li><strong>Duration:</strong> <?php echo (int)get_post_meta($prog_id, '_mco_cert_duration', true); ?> mins</li>
                        </ul>
                    </div>
                </div>
                <div class="mco-card-footer">
                    <?php if ($product) : 
                        $buy_now_url = add_query_arg('add-to-cart', $product->get_id(), wc_get_checkout_url());
                    ?>
                        <span class="mco-price"><?php echo $product->get_price_html(); ?></span>
                        <a href="<?php echo esc_url($buy_now_url); ?>" class="mco-button">Buy Now</a>
                    <?php else : ?>
                        <span class="mco-price">Not for sale</span>
                    <?php endif; ?>
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
    // Styling for WooCommerce Cart & Checkout
    if (function_exists('is_woocommerce') && (is_cart() || is_checkout())) {
        $css .= "
        body.woocommerce-cart, body.woocommerce-checkout { background-color: #f8fafc !important; }
        .woocommerce form .form-row input.input-text, .woocommerce form .form-row textarea, .woocommerce select { border-radius: 0.5rem !important; border: 1px solid #cbd5e1 !important; padding: 0.75rem 1rem !important; box-shadow: none !important; }
        .woocommerce .button, .woocommerce button.button { border-radius: 0.5rem !important; padding: 0.75rem 1.5rem !important; font-weight: 600 !important; transition: all 0.2s ease-in-out !important; border: none !important; }
        .woocommerce .button.alt, .woocommerce button.button.alt, .woocommerce #place_order { background-color: #0891b2 !important; color: white !important; }
        .woocommerce .button.alt:hover, .woocommerce button.button.alt:hover, .woocommerce #place_order:hover { background-color: #0e7490 !important; }
        @media (min-width: 992px) { .woocommerce-checkout form.checkout { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; align-items: flex-start; } .woocommerce-checkout .col2-set, .woocommerce-checkout .col-1, .woocommerce-checkout .col-2 { float: none !important; width: 100% !important; margin: 0 !important; } .woocommerce-checkout .woocommerce-billing-fields, .woocommerce-checkout .woocommerce-shipping-fields, .woocommerce-checkout .woocommerce-additional-fields { grid-column: 1 / 2; } .woocommerce-checkout .woocommerce-checkout-review-order { grid-column: 2 / 3; position: sticky; top: 2rem; } }
        ";
    }
    // Styling for Showcase Shortcode
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'mco_exam_showcase')) {
        $css .= "
        .mco-showcase-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; }
        .mco-program-card { background: #fff; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -2px rgba(0,0,0,.05); border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
        .mco-card-header { padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .mco-card-header h3 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
        .mco-card-body { padding: 1.5rem; flex-grow: 1; color: #475569; }
        .mco-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0 1.5rem; }
        .mco-exam-section { background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border: 1px solid #f1f5f9; }
        .mco-exam-section h4 { font-size: 1rem; font-weight: 600; color: #1e293b; margin-top: 0; margin-bottom: 0.5rem; }
        .mco-exam-section ul { list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #475569; }
        .mco-card-footer { padding: 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .mco-price { font-size: 1.5rem; font-weight: 700; color: #0891b2; }
        .mco-button { background-color: #0891b2; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; transition: background-color 0.2s; }
        .mco-button:hover { background-color: #0e7490; }
        ";
    }
    if (!empty($css)) echo '<style type="text/css">' . wp_strip_all_tags($css) . '</style>';
}

function mco_custom_order_button_text() { return 'Complete Enrollment & Pay Securely'; }

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
    $user_id = $request->get_param('jwt_payload')->user->id;
    $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
    return new WP_REST_Response(array_values($results), 200);
}

function mco_sanitize_test_result($data) {
    if (!is_array($data)) return [];
    $sanitized = [];
    $sanitized['testId'] = sanitize_text_field($data['testId']);
    $sanitized['userId'] = sanitize_text_field($data['userId']);
    $sanitized['examId'] = sanitize_text_field($data['examId']);
    $sanitized['score'] = floatval($data['score']);
    $sanitized['correctCount'] = intval($data['correctCount']);
    $sanitized['totalQuestions'] = intval($data['totalQuestions']);
    $sanitized['timestamp'] = intval($data['timestamp']);
    $sanitized['answers'] = [];
    if (is_array($data['answers'])) {
        foreach ($data['answers'] as $answer) {
            $sanitized['answers'][] = [
                'questionId' => intval($answer['questionId']),
                'answer' => intval($answer['answer']),
            ];
        }
    }
    return $sanitized; // Note: 'review' data is not saved to DB to keep metadata light.
}

function mco_exam_submit_result_callback(WP_REST_Request $request) {
    $user_id = $request->get_param('jwt_payload')->user->id;
    $new_result_raw = $request->get_json_params();
    if (empty($new_result_raw['testId'])) return new WP_Error('bad_request', 'Missing testId.', ['status' => 400]);
    $new_result = mco_sanitize_test_result($new_result_raw);
    $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
    $results[$new_result['testId']] = $new_result;
    update_user_meta($user_id, 'mco_exam_results', $results);
    return new WP_REST_Response(['success' => true], 200);
}

function mco_exam_update_user_name_callback(WP_REST_Request $request) {
    $user_id = $request->get_param('jwt_payload')->user->id;
    $params = $request->get_json_params();
    $new_name = sanitize_text_field($params['fullName']);
    if (empty($new_name)) return new WP_Error('bad_request', 'Full name cannot be empty.', ['status' => 400]);
    
    $name_parts = explode(' ', $new_name, 2);
    $first_name = $name_parts[0];
    $last_name = isset($name_parts[1]) ? $name_parts[1] : '';

    wp_update_user(['ID' => $user_id, 'display_name' => $new_name, 'first_name' => $first_name, 'last_name' => $last_name]);
    return new WP_REST_Response(['success' => true, 'newName' => $new_name], 200);
}

function mco_get_questions_from_sheet_callback(WP_REST_Request $request) {
    $params = $request->get_json_params();
    $sheet_url = esc_url_raw($params['sheetUrl']);
    $count = intval($params['count']);

    if (filter_var($sheet_url, FILTER_VALIDATE_URL) === false) {
        return new WP_Error('invalid_url', 'The provided sheet URL is not valid.', ['status' => 400]);
    }
    
    $csv_export_url = str_replace(['/edit?usp=sharing', '/edit'], '/export?format=csv', $sheet_url);

    $response = wp_remote_get($csv_export_url, ['timeout' => 15]);
    if (is_wp_error($response)) {
        return new WP_Error('fetch_failed', 'Could not retrieve questions from the source.', ['status' => 500, 'error' => $response->get_error_message()]);
    }

    $body = wp_remote_retrieve_body($response);
    $lines = explode("\\n", $body);
    $questions = [];
    
    // Skip header row by starting loop at 1
    for ($i = 1; $i < count($lines); $i++) {
        $data = str_getcsv($lines[$i]);
        if (count($data) >= 7 && !empty(trim($data[1]))) { // Check for at least 7 columns and that the question text isn't empty
            $options = array_map('trim', array_slice($data, 2, 4));
            $questions[] = [
                'id'            => intval(trim($data[0])),
                'question'      => trim($data[1]),
                'options'       => $options,
                'correctAnswer' => intval(trim($data[6]))
            ];
        }
    }
    
    shuffle($questions);
    $selected_questions = array_slice($questions, 0, $count);
    
    return new WP_REST_Response($selected_questions, 200);
}


function mco_get_certificate_data_callback(WP_REST_Request $request) {
    $user_id = $request->get_param('jwt_payload')->user->id;
    $test_id = $request->get_param('testId');
    $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
    
    if (!isset($results[$test_id])) {
        return new WP_Error('not_found', 'Test result not found.', ['status' => 404]);
    }
    
    $result = $results[$test_id];
    $user = get_userdata($user_id);

    return new WP_REST_Response([
        'certificateNumber' => strtoupper(substr(md5($test_id . $user_id), 0, 12)),
        'candidateName' => $user->display_name,
        'finalScore' => $result['score'],
        'date' => date('F j, Y', $result['timestamp'] / 1000),
        'examId' => $result['examId']
    ], 200);
}

function mco_get_exam_stats_callback(WP_REST_Request $request) {
    $cached_stats = get_transient('mco_exam_stats');
    if ($cached_stats !== false) {
        return new WP_REST_Response($cached_stats, 200);
    }

    $programs_query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1]);
    $exam_configs = [];
    while($programs_query->have_posts()) {
        $programs_query->the_post();
        $product_id = get_post_meta(get_the_ID(), '_mco_certification_exam_product_id', true);
        if ($product_id) {
            $product = wc_get_product($product_id);
            if ($product) {
                $sku = $product->get_sku();
                $exam_configs[$sku] = [
                    'name' => get_the_title(),
                    'pass_score' => (int)get_post_meta(get_the_ID(), '_mco_pass_score', true) ?: 70
                ];
            }
        }
    }
    wp_reset_postdata();

    $stats = [];
    $all_users = get_users(['fields' => ['ID']]);

    foreach ($exam_configs as $sku => $config) {
        $stats[$sku] = [
            'examId' => $sku,
            'examName' => $config['name'],
            'totalSales' => 0, 'totalAttempts' => 0, 'passRate' => 0, 'averageScore' => 0, 'passed' => 0, 'failed' => 0,
            '_total_score_sum' => 0
        ];
    }
    
    // Aggregate results data
    foreach ($all_users as $user) {
        $results = get_user_meta($user->ID, 'mco_exam_results', true) ?: [];
        foreach ($results as $result) {
            $exam_id = $result['examId'];
            if (isset($stats[$exam_id])) {
                $stats[$exam_id]['totalAttempts']++;
                $stats[$exam_id]['_total_score_sum'] += $result['score'];
                if ($result['score'] >= $exam_configs[$exam_id]['pass_score']) {
                    $stats[$exam_id]['passed']++;
                } else {
                    $stats[$exam_id]['failed']++;
                }
            }
        }
    }
    
    // Get sales data
    $sales_query = new WP_Query([
        'post_type' => 'shop_order', 'posts_per_page' => -1,
        'post_status' => ['wc-completed', 'wc-processing']
    ]);
    foreach ($sales_query->get_posts() as $order_post) {
        $order = wc_get_order($order_post->ID);
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if ($product) {
                $sku = $product->get_sku();
                if (isset($stats[$sku])) {
                    $stats[$sku]['totalSales'] += $item->get_quantity();
                }
            }
        }
    }

    // Final calculations
    $final_stats = [];
    foreach ($stats as $sku => $stat) {
        if ($stat['totalAttempts'] > 0) {
            $stat['averageScore'] = $stat['_total_score_sum'] / $stat['totalAttempts'];
            $stat['passRate'] = ($stat['passed'] / $stat['totalAttempts']) * 100;
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
                <h2 className="text-xl font-bold mb-2">1. The Integration Plugin</h2>
                <p className="mb-4">
                    This is the main "engine" plugin that enables Single Sign-On (SSO), syncs user data, and provides REST API endpoints for the exam app. This is the only plugin required for core functionality.
                </p>
                <p className="mb-4">
                    Copy the code below, save it as a new plugin file (e.g., <code>mco-exam-engine.php</code>) in your WordPress <code>/wp-content/plugins/</code> directory, and then activate it from your WordPress admin panel.
                </p>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm overflow-auto max-h-96">
                    <button 
                        onClick={copyToClipboard} 
                        className="sticky top-2 right-2 float-right p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition"
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