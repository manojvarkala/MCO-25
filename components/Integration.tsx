
import React, { FC } from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A multi-tenant engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and API services. Provides [mco_exam_login] and [mco_exam_showcase] shortcodes.
 * Version:           26.2.3 (PHP Compatibility Fix)
 * Author:            Annapoorna Infotech
 */

if (!defined('ABSPATH')) exit;

define('MCO_PLUGIN_VERSION', '26.2.3');

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

// --- Crash-Proof Function Wrappers ---

if (!function_exists('mco_plugin_activate')) {
    function mco_plugin_activate() {
        // CRITICAL: Register CPTs BEFORE flushing rewrite rules to prevent errors.
        mco_register_custom_post_types();
        flush_rewrite_rules();
        set_transient('mco_admin_notice_activation', true, 5);
        add_option('mco_plugin_version', MCO_PLUGIN_VERSION);
    }
}

if (!function_exists('mco_plugin_deactivate')) {
    function mco_plugin_deactivate() {
        flush_rewrite_rules();
        delete_option('mco_plugin_version');
    }
}

if (!function_exists('mco_check_plugin_version')) {
    function mco_check_plugin_version() {
        if (get_option('mco_plugin_version') != MCO_PLUGIN_VERSION) {
            mco_register_custom_post_types();
            flush_rewrite_rules();
            update_option('mco_plugin_version', MCO_PLUGIN_VERSION);
        }
    }
}
add_action('plugins_loaded', 'mco_check_plugin_version');

// --- INITIALIZATION ---
add_action('init', 'mco_exam_app_init');
if (!function_exists('mco_exam_app_init')) {
    function mco_exam_app_init() {
        mco_register_custom_post_types();
        add_action('admin_notices', 'mco_check_dependencies');
        add_action('admin_menu', 'mco_exam_add_admin_menu');
        add_action('admin_init', 'mco_exam_register_settings');
        add_action('rest_api_init', 'mco_exam_register_rest_api');
        add_action('add_meta_boxes', 'mco_add_meta_boxes');
        add_action('save_post_product', 'mco_save_wc_product_meta_data');
        add_action('save_post_mco_exam_program', 'mco_save_exam_program_meta');
        add_action('save_post_mco_recommended_book', 'mco_save_book_meta_data');
        add_shortcode('mco_exam_login', 'mco_exam_login_shortcode');
        add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode');
        add_action('woocommerce_payment_complete', 'mco_auto_complete_virtual_order');
        add_action('restrict_manage_posts', 'mco_exam_programs_upload_form', 10, 2);
    }
}

if (!function_exists('mco_check_dependencies')) {
    function mco_check_dependencies() {
        if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> WooCommerce is not active. This plugin requires it to function.</p></div>';
        if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> A secure <strong>MCO_JWT_SECRET</strong> (at least 32 characters long) is not defined in your wp-config.php file for security. SSO will not work.</p></div>';
        if (empty(get_option('mco_exam_app_url'))) echo '<div class="notice notice-warning"><p><strong>Exam App Engine:</strong> The Exam Application URL is not set. Please <a href="' . admin_url('admin.php?page=mco-exam-engine') . '">go to the settings page</a> to configure it.</p></div>';
    }
}

// --- ADMIN MENU & PAGES ---
if (!function_exists('mco_exam_add_admin_menu')) {
    function mco_exam_add_admin_menu() {
        add_menu_page('Exam App Engine', 'Exam App Engine', 'manage_options', 'mco-exam-engine', 'mco_render_settings_tab', 'dashicons-analytics', 80);
        add_submenu_page('mco-exam-engine', 'Exam Programs', 'Exam Programs', 'manage_options', 'edit.php?post_type=mco_exam_program');
        add_submenu_page('mco-exam-engine', 'Recommended Books', 'Recommended Books', 'manage_options', 'edit.php?post_type=mco_recommended_book');
    }
}

if (!function_exists('mco_exam_register_settings')) {
    function mco_exam_register_settings() { 
        register_setting('mco_exam_app_settings_group', 'mco_exam_app_url'); 
    }
}

if (!function_exists('mco_render_settings_tab')) {
    function mco_render_settings_tab() {
        ?>
        <div class="wrap">
            <h1>Exam App Engine Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('mco_exam_app_settings_group'); ?>
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
        </div>
        <?php
    }
}

if (!function_exists('mco_get_exam_app_url')) {
    function mco_get_exam_app_url() { 
        return rtrim(get_option('mco_exam_app_url', ''), '/'); 
    }
}

// --- CUSTOM POST TYPES & TAXONOMIES ---
if (!function_exists('mco_register_custom_post_types')) {
    function mco_register_custom_post_types() {
        register_taxonomy('exam_practice_questions', 'mco_exam_program', ['labels' => ['name' => 'Practice Questions'], 'public' => true, 'hierarchical' => false, 'show_in_rest' => true]);
        register_taxonomy('exam_practice_duration', 'mco_exam_program', ['labels' => ['name' => 'Practice Duration'], 'public' => true, 'hierarchical' => false, 'show_in_rest' => true]);
        register_taxonomy('exam_cert_questions', 'mco_exam_program', ['labels' => ['name' => 'Certification Questions'], 'public' => true, 'hierarchical' => false, 'show_in_rest' => true]);
        register_taxonomy('exam_cert_duration', 'mco_exam_program', ['labels' => ['name' => 'Certification Duration'], 'public' => true, 'hierarchical' => false, 'show_in_rest' => true]);
        register_taxonomy('exam_pass_score', 'mco_exam_program', ['labels' => ['name' => 'Pass Score'], 'public' => true, 'hierarchical' => false, 'show_in_rest' => true]);

        register_post_type('mco_exam_program', [
            'labels' => ['name' => 'Exam Programs', 'singular_name' => 'Exam Program'],
            'public' => true, 'has_archive' => true, 'show_in_menu' => false, 'show_in_rest' => true,
            'supports' => ['title', 'editor', 'thumbnail'], 'taxonomies' => ['exam_practice_questions', 'exam_practice_duration', 'exam_cert_questions', 'exam_cert_duration', 'exam_pass_score'],
            'rewrite' => ['slug' => 'exam-programs'],
        ]);

        register_post_type('mco_recommended_book', [ 
            'labels' => ['name' => 'Recommended Books', 'singular_name' => 'Book'], 
            'public' => true, 'has_archive' => false, 'show_in_menu' => false, 'show_in_rest' => true,
            'supports' => ['title', 'editor', 'thumbnail'] 
        ]);
    }
}

// --- CSV IMPORTER ---
if (!function_exists('mco_exam_programs_upload_form')) {
    function mco_exam_programs_upload_form($post_type) {
        if ($post_type !== 'mco_exam_program') return;
        // Handle upload
        if (isset($_POST['mco_import_csv_nonce']) && wp_verify_nonce($_POST['mco_import_csv_nonce'], 'mco_import_csv') && current_user_can('manage_options') && isset($_FILES['mco_csv_file'])) {
            if ($_FILES['mco_csv_file']['error'] === UPLOAD_ERR_OK) {
                $result = mco_import_exam_programs($_FILES['mco_csv_file']['tmp_name']);
                if ($result['success']) {
                    echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($result['message']) . '</p></div>';
                } else {
                    echo '<div class="notice notice-error is-dismissible"><p>' . esc_html($result['message']) . '</p></div>';
                }
            }
        }
        // Display form
        ?>
        <div style="padding: 1rem;">
            <form method="post" enctype="multipart/form-data">
                <?php wp_nonce_field('mco_import_csv', 'mco_import_csv_nonce'); ?>
                <label for="mco_csv_file">Import Exam Programs (CSV):</label>
                <input type="file" name="mco_csv_file" id="mco_csv_file" accept=".csv" required>
                <input type="submit" class="button" value="Import">
            </form>
        </div>
        <?php
    }
}

if (!function_exists('mco_import_exam_programs')) {
    function mco_import_exam_programs($csv_file_path) {
        // Hard dependency check to prevent fatal errors
        if (!class_exists('WooCommerce')) {
            return ['success' => false, 'message' => 'Import failed: WooCommerce is not active.'];
        }
        
        $imported = 0;
        $errors = [];
        $header = ['post_title', 'post_content', 'post_name', '_mco_question_source_url', '_mco_certification_exam_sku', 'exam_practice_questions', 'exam_practice_duration', 'exam_cert_questions', 'exam_cert_duration', 'exam_pass_score'];

        if (($handle = fopen($csv_file_path, 'r')) !== FALSE) {
            fgetcsv($handle); // Skip header row
            while (($data = fgetcsv($handle)) !== FALSE) {
                $row = array_combine($header, array_pad($data, count($header), null));
                $post_id = wp_insert_post([
                    'post_title'   => sanitize_text_field($row['post_title']),
                    'post_content' => wp_kses_post($row['post_content']),
                    'post_name'    => sanitize_title($row['post_name']),
                    'post_type'    => 'mco_exam_program',
                    'post_status'  => 'publish'
                ]);
                if (is_wp_error($post_id)) { $errors[] = $post_id->get_error_message(); continue; }
                
                update_post_meta($post_id, '_mco_question_source_url', esc_url_raw($row['_mco_question_source_url']));
                update_post_meta($post_id, '_mco_certification_exam_sku', sanitize_text_field($row['_mco_certification_exam_sku']));
                
                $taxonomies = ['exam_practice_questions', 'exam_practice_duration', 'exam_cert_questions', 'exam_cert_duration', 'exam_pass_score'];
                foreach ($taxonomies as $tax) {
                    if (!empty($row[$tax])) wp_set_object_terms($post_id, intval($row[$tax]), $tax);
                }
                $imported++;
            }
            fclose($handle);
        }
        return ['success' => true, 'message' => "Import complete. Imported: $imported, Errors: " . count($errors)];
    }
}


// --- META BOXES & SAVE FUNCTIONS ---
if (!function_exists('mco_add_meta_boxes')) {
    function mco_add_meta_boxes() {
        if (class_exists('WooCommerce')) {
            add_meta_box('mco_wc_product_meta', 'Exam App Configuration', 'mco_render_wc_product_meta_box', 'product', 'side', 'high');
        }
        add_meta_box('mco_exam_program_meta', 'Exam Program Details', 'mco_render_exam_program_meta_box', 'mco_exam_program', 'normal', 'high');
        add_meta_box('mco_book_links_meta', 'Affiliate Links', 'mco_render_book_links_meta_box', 'mco_recommended_book', 'normal', 'high');
    }
}

if (!function_exists('mco_render_exam_program_meta_box')) {
    function mco_render_exam_program_meta_box($post) {
        wp_nonce_field('mco_save_exam_meta', 'mco_exam_nonce');
        $source_url = get_post_meta($post->ID, '_mco_question_source_url', true);
        $cert_sku = get_post_meta($post->ID, '_mco_certification_exam_sku', true);
        echo '<p><label for="_mco_question_source_url">Question Source URL:</label><br><input type="url" id="_mco_question_source_url" name="_mco_question_source_url" value="' . esc_attr($source_url) . '" style="width:100%;"></p>';
        echo '<p><label for="_mco_certification_exam_sku">Certification Exam SKU:</label><br><input type="text" id="_mco_certification_exam_sku" name="_mco_certification_exam_sku" value="' . esc_attr($cert_sku) . '" style="width:100%;"></p>';
    }
}

if (!function_exists('mco_save_exam_program_meta')) {
    function mco_save_exam_program_meta($post_id) {
        if (!isset($_POST['mco_exam_nonce']) || !wp_verify_nonce($_POST['mco_exam_nonce'], 'mco_save_exam_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)) return;
        if (isset($_POST['_mco_question_source_url'])) update_post_meta($post_id, '_mco_question_source_url', esc_url_raw($_POST['_mco_question_source_url']));
        if (isset($_POST['_mco_certification_exam_sku'])) update_post_meta($post_id, '_mco_certification_exam_sku', sanitize_text_field($_POST['_mco_certification_exam_sku']));
    }
}

if (!function_exists('mco_render_book_links_meta_box')) {
    function mco_render_book_links_meta_box($post) {
        wp_nonce_field('mco_save_book_meta', 'mco_book_nonce');
        $link_com = get_post_meta($post->ID, '_mco_link_com', true); $link_in = get_post_meta($post->ID, '_mco_link_in', true); $link_ae = get_post_meta($post->ID, '_mco_link_ae', true);
        echo '<p><label for="mco_link_com">Amazon.com URL:</label><br><input type="url" id="mco_link_com" name="mco_link_com" value="' . esc_attr($link_com) . '" style="width:100%;"></p>';
        echo '<p><label for="mco_link_in">Amazon.in URL:</label><br><input type="url" id="mco_link_in" name="mco_link_in" value="' . esc_attr($link_in) . '" style="width:100%;"></p>';
        echo '<p><label for="mco_link_ae">Amazon.ae URL:</label><br><input type="url" id="mco_link_ae" name="mco_link_ae" value="' . esc_attr($link_ae) . '" style="width:100%;"></p>';
    }
}

if (!function_exists('mco_save_book_meta_data')) {
    function mco_save_book_meta_data($post_id) {
        if (!isset($_POST['mco_book_nonce']) || !wp_verify_nonce($_POST['mco_book_nonce'], 'mco_save_book_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)) return;
        if (isset($_POST['mco_link_com'])) update_post_meta($post_id, '_mco_link_com', esc_url_raw($_POST['mco_link_com']));
        if (isset($_POST['mco_link_in'])) update_post_meta($post_id, '_mco_link_in', esc_url_raw($_POST['mco_link_in']));
        if (isset($_POST['mco_link_ae'])) update_post_meta($post_id, '_mco_link_ae', esc_url_raw($_POST['mco_link_ae']));
    }
}

if (!function_exists('mco_render_wc_product_meta_box')) {
    function mco_render_wc_product_meta_box($post) {
        wp_nonce_field('mco_save_wc_meta', 'mco_wc_nonce');
        $product_type = get_post_meta($post->ID, '_mco_product_type', true);
        echo '<label for="mco_product_type">Product Role:</label><select name="mco_product_type" id="mco_product_type" style="width:100%;"><option value="" ' . selected($product_type, '', false) . '>None</option><option value="certification_exam" ' . selected($product_type, 'certification_exam', false) . '>Certification Exam</option><option value="subscription_bundle" ' . selected($product_type, 'subscription_bundle', false) . '>Subscription / Bundle</option></select>';
    }
}

if (!function_exists('mco_save_wc_product_meta_data')) {
    function mco_save_wc_product_meta_data($post_id) {
        if (!isset($_POST['mco_wc_nonce']) || !wp_verify_nonce($_POST['mco_wc_nonce'], 'mco_save_wc_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)) return;
        if (isset($_POST['mco_product_type'])) update_post_meta($post_id, '_mco_product_type', sanitize_text_field($_POST['mco_product_type']));
    }
}

// --- DYNAMIC DATA HELPERS ---
if (!function_exists('mco_get_app_config_data')) {
    function mco_get_app_config_data() {
        // This function body is now the single source of truth for app content.
        // It queries CPTs and builds the arrays needed by the app.
        $books_query = new WP_Query(['post_type' => 'mco_recommended_book', 'posts_per_page' => -1, 'post_status' => 'publish']);
        $suggested_books = [];
        if ($books_query->have_posts()) {
            while ($books_query->have_posts()) {
                $books_query->the_post();
                $post_id = get_the_ID();
                $suggested_books[] = [
                    'id' => 'book-' . $post_id, 'title' => get_the_title(), 'description' => strip_tags(get_the_content()),
                    'thumbnailUrl' => get_the_post_thumbnail_url($post_id, 'medium'),
                    'affiliateLinks' => [ 'com' => get_post_meta($post_id, '_mco_link_com', true) ?: '', 'in' => get_post_meta($post_id, '_mco_link_in', true) ?: '', 'ae' => get_post_meta($post_id, '_mco_link_ae', true) ?: '' ]
                ];
            }
        }
        wp_reset_postdata();

        $dynamic_exams = [];
        $dynamic_categories = [];
        $programs_query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1, 'post_status' => 'publish']);
        if ($programs_query->have_posts()) {
            while ($programs_query->the_post()) {
                $prog_id = get_the_ID();
                $practice_id = get_post_field('post_name', $prog_id) . '-practice';
                $cert_sku = get_post_meta($prog_id, '_mco_certification_exam_sku', true);
                if (empty($practice_id) || empty($cert_sku) || !class_exists('WooCommerce')) continue;
                
                $product_id = wc_get_product_id_by_sku($cert_sku);
                if (!$product_id) continue;
                $product = wc_get_product($product_id);
                if (!$product || !$product->get_sku()) continue;

                $pass_score_terms = wp_get_post_terms($prog_id, 'exam_pass_score', ['fields' => 'names']); $pass_score = !empty($pass_score_terms) ? (int)$pass_score_terms[0] : 70;
                $practice_q_terms = wp_get_post_terms($prog_id, 'exam_practice_questions', ['fields' => 'names']);
                $practice_d_terms = wp_get_post_terms($prog_id, 'exam_practice_duration', ['fields' => 'names']);
                $cert_q_terms = wp_get_post_terms($prog_id, 'exam_cert_questions', ['fields' => 'names']);
                $cert_d_terms = wp_get_post_terms($prog_id, 'exam_cert_duration', ['fields' => 'names']);
                $question_source = get_post_meta($prog_id, '_mco_question_source_url', true);
                $description = strip_tags(get_the_content());

                $dynamic_exams[] = [ 'id' => $practice_id, 'name' => get_the_title() . ' Practice', 'description' => $description, 'price' => 0, 'productSku' => $practice_id, 'numberOfQuestions' => !empty($practice_q_terms) ? (int)$practice_q_terms[0] : 25, 'passScore' => $pass_score, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => !empty($practice_d_terms) ? (int)$practice_d_terms[0] : 60, 'questionSourceUrl' => $question_source ];
                $dynamic_exams[] = [ 'id' => $cert_sku, 'name' => get_the_title(), 'description' => $description, 'price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productSku' => $cert_sku, 'productSlug' => $product->get_slug(), 'numberOfQuestions' => !empty($cert_q_terms) ? (int)$cert_q_terms[0] : 100, 'passScore' => $pass_score, 'certificateTemplateId' => 'cert-generic', 'isPractice' => false, 'durationMinutes' => !empty($cert_d_terms) ? (int)$cert_d_terms[0] : 240, 'questionSourceUrl' => $question_source ];
                $dynamic_categories[] = [ 'id' => 'prod-' . $prog_id, 'name' => get_the_title(), 'description' => $description, 'practiceExamId' => $practice_id, 'certificationExamId' => $cert_sku, 'questionSourceUrl' => $question_source ];
            }
        }
        wp_reset_postdata();

        return ['exams' => $dynamic_exams, 'examProductCategories' => $dynamic_categories, 'suggestedBooks' => $suggested_books];
    }
}


// --- JWT FUNCTIONS ---
if (!function_exists('mco_base64url_encode')) {
    function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
}

if (!function_exists('mco_generate_exam_jwt')) {
    function mco_generate_exam_jwt($user_id) {
        if (!defined('MCO_JWT_SECRET')) return false;
        $user = get_userdata($user_id);
        if (!$user) return false;

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $content_data = mco_get_app_config_data();

        // Get user-specific data
        $paid_exam_skus = []; $is_subscribed = false;
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

        $payload = [
            'user' => ['id' => strval($user->ID), 'name' => $user->display_name, 'email' => $user->user_email, 'isAdmin' => in_array('administrator', $user->roles)],
            'paidExamIds' => array_unique($paid_exam_skus), 'isSubscribed' => $is_subscribed,
            'suggestedBooks' => $content_data['suggestedBooks'], 'exams' => $content_data['exams'], 'examProductCategories' => $content_data['examProductCategories'],
            'iat' => time(), 'exp' => time() + (24 * HOUR_IN_SECONDS)
        ];

        $header_encoded = mco_base64url_encode(json_encode($header));
        $payload_encoded = mco_base64url_encode(json_encode($payload));
        $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", MCO_JWT_SECRET, true);
        $signature_encoded = mco_base64url_encode($signature);
        return "$header_encoded.$payload_encoded.$signature_encoded";
    }
}

if (!function_exists('mco_verify_exam_jwt')) {
    function mco_verify_exam_jwt($token) {
        if (!defined('MCO_JWT_SECRET')) return false;
        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;
        list($header_encoded, $payload_encoded, $signature_encoded) = $parts;
        $signature = base64_decode(strtr($signature_encoded, '-_', '+/'));
        $expected_signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", MCO_JWT_SECRET, true);
        if (!hash_equals($expected_signature, $signature)) return false;
        $payload = json_decode(base64_decode(strtr($payload_encoded, '-_', '+/')), true);
        if (json_last_error() !== JSON_ERROR_NONE || (isset($payload['exp']) && $payload['exp'] < time())) return false;
        return $payload;
    }
}


// --- SHORTCODES ---
if (!function_exists('mco_exam_login_shortcode')) {
    function mco_exam_login_shortcode() {
        if (is_user_logged_in()) {
            $user_id = get_current_user_id();
            $token = mco_generate_exam_jwt($user_id);
            $app_url = mco_get_exam_app_url();
            if ($token && $app_url) {
                $final_url = $app_url . '/#/auth?token=' . $token;
                return "<div style='text-align:center;'><p>Redirecting to your dashboard...</p><script>window.location.href='" . esc_url_raw($final_url) . "';</script></div>";
            }
        }
        ob_start();
        if (function_exists('wc_get_template')) { wc_get_template('myaccount/form-login.php'); }
        return ob_get_clean();
    }
}

if (!function_exists('mco_exam_showcase_shortcode')) {
    function mco_exam_showcase_shortcode() { return "<p>Showcase shortcode is active. Configure its content as needed.</p>"; }
}

// --- WOOCOMMERCE HELPERS ---
if (!function_exists('mco_auto_complete_virtual_order')) {
    function mco_auto_complete_virtual_order($order_id) {
        if (!class_exists('WooCommerce') || !$order_id) return;
        $order = wc_get_order($order_id);
        if (!$order || $order->has_status(['completed', 'failed', 'cancelled', 'refunded'])) return;
        $is_virtual_order = true;
        if (count($order->get_items()) > 0) {
            foreach ($order->get_items() as $item) {
                if (!$item->get_product()->is_virtual()) { $is_virtual_order = false; break; }
            }
        } else { $is_virtual_order = false; }
        if ($is_virtual_order) { $order->update_status('completed'); }
    }
}

// --- REST API ---
if (!function_exists('mco_exam_register_rest_api')) {
    function mco_exam_register_rest_api() {
        $namespace = 'mco-app/v1';
        
        register_rest_route($namespace, '/app-config', ['methods' => 'GET', 'callback' => 'mco_get_dynamic_app_config_callback', 'permission_callback' => '__return_true']);

        $permission_callback = function(WP_REST_Request $request) {
            $auth_header = $request->get_header('Authorization');
            if (!$auth_header || sscanf($auth_header, 'Bearer %s', $token) !== 1) return new WP_Error('jwt_auth_no_token', 'Authorization token not found.', ['status' => 403]);
            $payload = mco_verify_exam_jwt($token);
            if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_auth_invalid_token', 'Invalid token.', ['status' => 403]);
            $request->set_param('jwt_payload', $payload);
            return true;
        };
        
        register_rest_route($namespace, '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => $permission_callback]);
        register_rest_route($namespace, '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => $permission_callback]);
        register_rest_route($namespace, '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => $permission_callback]);
        register_rest_route($namespace, '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => $permission_callback]);
        register_rest_route($namespace, '/certificate-data/(?P<testId>[a-zA-Z0-9_-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => $permission_callback]);
        register_rest_route($namespace, '/exam-stats', ['methods' => 'GET', 'callback' => 'mco_get_exam_stats_callback', 'permission_callback' => $permission_callback]);
    }
}

// --- API CALLBACKS ---
if (!function_exists('mco_get_dynamic_app_config_callback')) {
    function mco_get_dynamic_app_config_callback() {
        $content_data = mco_get_app_config_data();
        $certificate_templates = [
            ['id' => 'cert-generic', 'title' => 'Certificate of Completion', 'body' => 'For passing the exam with a score of <strong>{finalScore}%</strong>.', 'signature1Name' => 'Program Director', 'signature1Title' => get_bloginfo('name'), 'signature1ImageBase64' => '', 'signature2Name' => '', 'signature2Title' => '', 'signature2ImageBase64' => ''],
            ['id' => 'cert-practice-1', 'title' => 'Certificate of Proficiency', 'body' => 'For demonstrating proficiency with a score of <strong>{finalScore}%</strong>.', 'signature1Name' => 'Training Coordinator', 'signature1Title' => get_bloginfo('name'), 'signature1ImageBase64' => '', 'signature2Name' => '', 'signature2Title' => '', 'signature2ImageBase64' => '']
        ];
        $organization = [
            'id' => 'org-' . sanitize_title(get_bloginfo('name')), 'name' => get_bloginfo('name'), 'website' => preg_replace('#^https?://(www\\.)?#', '', get_site_url()),
            'logo' => has_site_icon() ? get_site_icon_url(256) : '', 'exams' => $content_data['exams'], 'examProductCategories' => $content_data['examProductCategories'], 
            'certificateTemplates' => $certificate_templates, 'suggestedBooks' => $content_data['suggestedBooks']
        ];
        return new WP_REST_Response(['organizations' => [$organization]], 200);
    }
}

if (!function_exists('mco_get_user_id_from_payload')) {
    function mco_get_user_id_from_payload($request) {
        $payload = $request->get_param('jwt_payload');
        // PHP Compatibility Fix: Replaced ?? with isset() ternary
        return isset($payload['user']['id']) ? $payload['user']['id'] : 0;
    }
}

if (!function_exists('mco_get_user_results_callback')) {
    function mco_get_user_results_callback(WP_REST_Request $request) {
        $user_id = mco_get_user_id_from_payload($request);
        $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
        return new WP_REST_Response(array_values($results), 200);
    }
}

if (!function_exists('mco_exam_submit_result_callback')) {
    function mco_exam_submit_result_callback(WP_REST_Request $request) {
        $user_id = mco_get_user_id_from_payload($request);
        $new_result = $request->get_json_params();
        if (empty($new_result['testId'])) return new WP_Error('bad_request', 'Missing testId.', ['status' => 400]);
        $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
        $results[$new_result['testId']] = $new_result;
        update_user_meta($user_id, 'mco_exam_results', $results);
        return new WP_REST_Response(['success' => true], 200);
    }
}

if (!function_exists('mco_exam_update_user_name_callback')) {
    function mco_exam_update_user_name_callback(WP_REST_Request $request) {
        $user_id = mco_get_user_id_from_payload($request);
        $params = $request->get_json_params();
        $new_name = isset($params['fullName']) ? sanitize_text_field($params['fullName']) : '';
        if (empty($new_name)) return new WP_Error('bad_request', 'Full name cannot be empty.', ['status' => 400]);
        $name_parts = explode(' ', $new_name, 2);
        wp_update_user(['ID' => $user_id, 'display_name' => $new_name, 'first_name' => $name_parts[0], 'last_name' => isset($name_parts[1]) ? $name_parts[1] : '']);
        return new WP_REST_Response(['success' => true, 'newName' => $new_name], 200);
    }
}

if (!function_exists('mco_get_questions_from_sheet_callback')) {
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
}

if (!function_exists('mco_get_certificate_data_callback')) {
    function mco_get_certificate_data_callback(WP_REST_Request $request) {
        $payload = $request->get_param('jwt_payload');
        $user_id = $payload['user']['id'];
        $user = get_userdata($user_id);
        $test_id = $request->get_param('testId');
        
        $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
        if (!isset($results[$test_id])) return new WP_Error('not_found', 'Test result not found.', ['status' => 404]);
        
        $result = $results[$test_id];
        $is_admin = in_array('administrator', (array)$user->roles);
        $exam_id = $result['examId'];
        $pass_score = 70; // Default
        
        $all_exams = mco_get_app_config_data()['exams'];
        $exam_config = null;
        foreach ($all_exams as $ex) {
            if ($ex['id'] === $exam_id) { $exam_config = $ex; break; }
        }
        if ($exam_config) { $pass_score = $exam_config['passScore']; }
        
        if ($result['score'] < $pass_score && !$is_admin) {
            return new WP_Error('forbidden', 'Certificate not earned. Required score not met.', ['status' => 403]);
        }

        return new WP_REST_Response(['certificateNumber' => strtoupper(substr(md5($test_id . $user_id), 0, 12)), 'candidateName' => $user->display_name, 'finalScore' => $result['score'], 'date' => date('F j, Y', $result['timestamp'] / 1000), 'examId' => $result['examId']], 200);
    }
}

if (!function_exists('mco_get_exam_stats_callback')) {
    function mco_get_exam_stats_callback(WP_REST_Request $request) {
        $payload = $request->get_param('jwt_payload');
        if (empty($payload['user']['isAdmin'])) return new WP_Error('jwt_auth_not_admin', 'Administrator access required.', ['status' => 403]);
        
        $transient_key = 'mco_exam_stats';
        $cached_stats = get_transient($transient_key);
        if ($cached_stats !== false) return new WP_REST_Response($cached_stats, 200);
        
        $exam_configs = mco_get_app_config_data()['exams'];
        $stats = [];
        foreach ($exam_configs as $config) {
            if (!$config['isPractice']) {
                $product_id = class_exists('WooCommerce') ? wc_get_product_id_by_sku($config['productSku']) : 0;
                $stats[$config['id']] = ['examId' => $config['id'], 'examName' => $config['name'], 'totalSales' => $product_id ? (int)get_post_meta($product_id, 'total_sales', true) : 0, 'totalAttempts' => 0, 'passed' => 0, 'failed' => 0, '_total_score_sum' => 0, '_pass_score' => $config['passScore']];
            }
        }
        
        global $wpdb;
        $db_results = $wpdb->get_col($wpdb->prepare("SELECT meta_value FROM $wpdb->usermeta WHERE meta_key = %s", 'mco_exam_results'));
        foreach ($db_results as $meta_value) {
            $user_results = maybe_unserialize($meta_value);
            if (is_array($user_results)) {
                foreach ($user_results as $result) {
                    $exam_id = isset($result['examId']) ? $result['examId'] : null;
                    if ($exam_id && isset($stats[$exam_id])) {
                        $stats[$exam_id]['totalAttempts']++;
                        $stats[$exam_id]['_total_score_sum'] += isset($result['score']) ? (float)$result['score'] : 0;
                        if (isset($result['score']) && $result['score'] >= $stats[$exam_id]['_pass_score']) { $stats[$exam_id]['passed']++; } else { $stats[$exam_id]['failed']++; }
                    }
                }
            }
        }

        $final_stats = [];
        foreach ($stats as $stat) {
            $stat['averageScore'] = $stat['totalAttempts'] > 0 ? round($stat['_total_score_sum'] / $stat['totalAttempts'], 2) : 0;
            $stat['passRate'] = $stat['totalAttempts'] > 0 ? round(($stat['passed'] / $stat['totalAttempts']) * 100, 2) : 0;
            unset($stat['_total_score_sum'], $stat['_pass_score']);
            $final_stats[] = $stat;
        }
        
        set_transient($transient_key, $final_stats, 1 * HOUR_IN_SECONDS);
        return new WP_REST_Response($final_stats, 200);
    }
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
                <h2 className="text-xl font-bold mb-2">The Integration Engine (v26.2.3 - PHP Compatibility Fix)</h2>
                <p className="mb-4">
                    This is the master plugin for integrating the exam app with your WordPress site. It handles Single Sign-On (SSO), data synchronization, and provides powerful shortcodes for displaying content. <strong>This version makes WordPress the single source of truth for all application configuration.</strong>
                </p>
                <p className="mb-4">
                    <strong>Instructions:</strong>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                        <li>Copy the code below and save it as a new PHP file (e.g., <code>mco-integration-engine.php</code>).</li>
                        <li>Upload the plugin to your WordPress <code>/wp-content/plugins/</code> directory inside a new folder (e.g., <code>mco-integration-engine</code>).</li>
                        <li>Activate it from your WordPress admin dashboard and configure the settings.</li>
                    </ol>
                </p>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm max-h-[500px] overflow-auto">
                    <button 
                        onClick={copyToClipboard} 
                        className="sticky top-2 right-2 p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition float-right"
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