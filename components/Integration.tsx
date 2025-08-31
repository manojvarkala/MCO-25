
import React, { FC } from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A multi-tenant engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and API services. Provides [mco_exam_login] and [mco_exam_showcase] shortcodes.
 * Version:           26.1.0
 * Author:            Annapoorna Infotech
 */

if (!defined('ABSPATH')) exit;

define('MCO_PLUGIN_VERSION', '26.1.0');

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

function mco_plugin_activate() {
    // CRITICAL: Register CPTs BEFORE flushing rewrite rules.
    mco_register_custom_post_types();
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
        mco_register_custom_post_types();
        flush_rewrite_rules();
        update_option('mco_plugin_version', MCO_PLUGIN_VERSION);
    }
}
add_action('plugins_loaded', 'mco_check_plugin_version');

// --- INITIALIZATION ---
add_action('init', 'mco_exam_app_init');
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
}

function mco_check_dependencies() { 
    if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> WooCommerce is not active. This plugin requires it to function.</p></div>'; 
    if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> A secure <strong>MCO_JWT_SECRET</strong> (at least 32 characters long) is not defined in your wp-config.php file for security. SSO will not work.</p></div>';
    if (empty(get_option('mco_exam_app_url'))) echo '<div class="notice notice-warning"><p><strong>Exam App Engine:</strong> The Exam Application URL is not set. Please <a href="' . admin_url('admin.php?page=mco-exam-engine') . '">go to the settings page</a> to configure it.</p></div>';
}

// --- ADMIN MENU & PAGES ---
function mco_exam_add_admin_menu() {
    add_menu_page('Exam App Engine', 'Exam App Engine', 'manage_options', 'mco-exam-engine', 'mco_render_settings_tab', 'dashicons-analytics', 80);
    add_submenu_page('mco-exam-engine', 'Exam Programs', 'Exam Programs', 'manage_options', 'edit.php?post_type=mco_exam_program');
    add_submenu_page('mco-exam-engine', 'Recommended Books', 'Recommended Books', 'manage_options', 'edit.php?post_type=mco_recommended_book');
}

function mco_exam_register_settings() { 
    register_setting('mco_exam_app_settings_group', 'mco_exam_app_url'); 
}

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

function mco_get_exam_app_url() { 
    return rtrim(get_option('mco_exam_app_url', ''), '/'); 
}

// --- CUSTOM POST TYPES & TAXONOMIES ---
function mco_register_custom_post_types() {
    register_taxonomy('exam_practice_questions', 'mco_exam_program', ['labels' => ['name' => 'Practice Questions'], 'public' => true, 'hierarchical' => false]);
    register_taxonomy('exam_practice_duration', 'mco_exam_program', ['labels' => ['name' => 'Practice Duration'], 'public' => true, 'hierarchical' => false]);
    register_taxonomy('exam_cert_questions', 'mco_exam_program', ['labels' => ['name' => 'Certification Questions'], 'public' => true, 'hierarchical' => false]);
    register_taxonomy('exam_cert_duration', 'mco_exam_program', ['labels' => ['name' => 'Certification Duration'], 'public' => true, 'hierarchical' => false]);
    register_taxonomy('exam_pass_score', 'mco_exam_program', ['labels' => ['name' => 'Pass Score'], 'public' => true, 'hierarchical' => false]);

    register_post_type('mco_exam_program', [
        'labels' => ['name' => 'Exam Programs', 'singular_name' => 'Exam Program'],
        'public' => true, 'has_archive' => true, 'show_in_menu' => false,
        'supports' => ['title', 'editor', 'thumbnail'], 'taxonomies' => ['exam_practice_questions', 'exam_practice_duration', 'exam_cert_questions', 'exam_cert_duration', 'exam_pass_score'],
        'rewrite' => ['slug' => 'exam-programs'],
    ]);

    register_post_type('mco_recommended_book', [ 
        'labels' => ['name' => 'Recommended Books', 'singular_name' => 'Book'], 
        'public' => true, 'has_archive' => false, 'show_in_menu' => false, 
        'supports' => ['title', 'editor', 'thumbnail'] 
    ]);
}

// --- META BOXES & SAVE FUNCTIONS ---
function mco_add_meta_boxes() {
    if (class_exists('WooCommerce')) {
        add_meta_box('mco_wc_product_meta', 'Exam App Configuration', 'mco_render_wc_product_meta_box', 'product', 'side', 'high');
    }
    add_meta_box('mco_exam_program_meta', 'Exam Program Details', 'mco_render_exam_program_meta_box', 'mco_exam_program', 'normal', 'high');
    add_meta_box('mco_book_links_meta', 'Affiliate Links', 'mco_render_book_links_meta_box', 'mco_recommended_book', 'normal', 'high');
}

function mco_render_exam_program_meta_box($post) {
    wp_nonce_field('mco_save_exam_meta', 'mco_exam_nonce');
    $source_url = get_post_meta($post->ID, '_mco_question_source_url', true);
    $cert_sku = get_post_meta($post->ID, '_mco_certification_exam_sku', true);
    echo '<p><label for="_mco_question_source_url">Question Source URL:</label><br><input type="url" id="_mco_question_source_url" name="_mco_question_source_url" value="' . esc_attr($source_url) . '" style="width:100%;"></p>';
    echo '<p><label for="_mco_certification_exam_sku">Certification Exam SKU:</label><br><input type="text" id="_mco_certification_exam_sku" name="_mco_certification_exam_sku" value="' . esc_attr($cert_sku) . '" style="width:100%;"></p>';
}

function mco_save_exam_program_meta($post_id) {
    if (!isset($_POST['mco_exam_nonce']) || !wp_verify_nonce($_POST['mco_exam_nonce'], 'mco_save_exam_meta') || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)) return;
    if (isset($_POST['_mco_question_source_url'])) update_post_meta($post_id, '_mco_question_source_url', esc_url_raw($_POST['_mco_question_source_url']));
    if (isset($_POST['_mco_certification_exam_sku'])) update_post_meta($post_id, '_mco_certification_exam_sku', sanitize_text_field($_POST['_mco_certification_exam_sku']));
}

function mco_render_book_links_meta_box($post) { /* ... implementation ... */ }
function mco_save_book_meta_data($post_id) { /* ... implementation ... */ }
function mco_render_wc_product_meta_box($post) { /* ... implementation ... */ }
function mco_save_wc_product_meta_data($post_id) { /* ... implementation ... */ }

// --- DYNAMIC DATA & JWT ---
function mco_get_app_content_data() {
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
            
            $product = wc_get_product(wc_get_product_id_by_sku($cert_sku));
            if (!$product || !$product->get_sku()) continue;

            $pass_score = wp_get_post_terms($prog_id, 'exam_pass_score', ['fields' => 'names']); $pass_score = !empty($pass_score) ? (int)$pass_score[0] : 70;
            $practice_q = wp_get_post_terms($prog_id, 'exam_practice_questions', ['fields' => 'names']);
            $practice_d = wp_get_post_terms($prog_id, 'exam_practice_duration', ['fields' => 'names']);
            $cert_q = wp_get_post_terms($prog_id, 'exam_cert_questions', ['fields' => 'names']);
            $cert_d = wp_get_post_terms($prog_id, 'exam_cert_duration', ['fields' => 'names']);
            $question_source = get_post_meta($prog_id, '_mco_question_source_url', true);
            $description = strip_tags(get_the_content());

            $dynamic_exams[] = [ 'id' => $practice_id, 'name' => get_the_title() . ' Practice', 'description' => $description, 'price' => 0, 'productSku' => $practice_id, 'numberOfQuestions' => !empty($practice_q) ? (int)$practice_q[0] : 25, 'passScore' => $pass_score, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => !empty($practice_d) ? (int)$practice_d[0] : 60, 'questionSourceUrl' => $question_source ];
            $dynamic_exams[] = [ 'id' => $cert_sku, 'name' => get_the_title(), 'description' => $description, 'price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productSku' => $cert_sku, 'productSlug' => $product->get_slug(), 'numberOfQuestions' => !empty($cert_q) ? (int)$cert_q[0] : 100, 'passScore' => $pass_score, 'certificateTemplateId' => 'cert-generic', 'isPractice' => false, 'durationMinutes' => !empty($cert_d) ? (int)$cert_d[0] : 240, 'questionSourceUrl' => $question_source ];
            $dynamic_categories[] = [ 'id' => 'prod-' . $prog_id, 'name' => get_the_title(), 'description' => $description, 'practiceExamId' => $practice_id, 'certificationExamId' => $cert_sku, 'questionSourceUrl' => $question_source ];
        }
    }
    wp_reset_postdata();

    return ['exams' => $dynamic_exams, 'categories' => $dynamic_categories, 'books' => $suggested_books];
}

function mco_generate_exam_jwt($user_id) {
    if (!defined('MCO_JWT_SECRET')) return false;
    $user = get_userdata($user_id);
    if (!$user) return false;

    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $content_data = mco_get_app_content_data();

    $payload = [
        'user' => ['id' => strval($user->ID), 'name' => $user->display_name, 'email' => $user->user_email, 'isAdmin' => in_array('administrator', $user->roles)],
        'paidExamIds' => [], // Will be populated by React app based on WooCommerce data
        'isSubscribed' => false,
        'suggestedBooks' => $content_data['books'],
        'exams' => $content_data['exams'],
        'examProductCategories' => $content_data['categories'],
        'iat' => time(),
        'exp' => time() + (24 * HOUR_IN_SECONDS)
    ];

    $header_encoded = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
    $payload_encoded = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", MCO_JWT_SECRET, true);
    $signature_encoded = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    return "$header_encoded.$payload_encoded.$signature_encoded";
}

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

// --- SHORTCODES ---
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
    if (function_exists('wc_get_template')) {
        wc_get_template('myaccount/form-login.php');
    }
    return ob_get_clean();
}

function mco_exam_showcase_shortcode() { /* ... implementation ... */ return "<p>Showcase shortcode is active.</p>"; }

// --- REST API ---
function mco_exam_register_rest_api() {
    $namespace = 'mco-app/v1';
    
    // Public endpoint for app configuration
    register_rest_route($namespace, '/app-config', ['methods' => 'GET', 'callback' => 'mco_get_dynamic_app_config_callback', 'permission_callback' => '__return_true']);

    // Authenticated endpoints
    $permission_callback = function(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');
        if (!$auth_header || sscanf($auth_header, 'Bearer %s', $token) !== 1) return false;
        $payload = mco_verify_exam_jwt($token);
        return $payload && isset($payload['user']['id']);
    };
    
    register_rest_route($namespace, '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/certificate-data/(?P<testId>[a-zA-Z0-9_-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => $permission_callback]);
}

// --- API CALLBACKS ---
function mco_get_dynamic_app_config_callback() {
    $content_data = mco_get_app_content_data();
    $certificate_templates = [
        ['id' => 'cert-generic', 'title' => 'Certificate of Completion', 'body' => 'For passing the exam with a score of <strong>{finalScore}%</strong>.', 'signature1Name' => 'Program Director', 'signature1Title' => get_bloginfo('name')],
        ['id' => 'cert-practice-1', 'title' => 'Certificate of Proficiency', 'body' => 'For demonstrating proficiency with a score of <strong>{finalScore}%</strong>.', 'signature1Name' => 'Training Coordinator', 'signature1Title' => get_bloginfo('name')]
    ];
    $organization = [
        'id' => 'org-' . sanitize_title(get_bloginfo('name')), 'name' => get_bloginfo('name'), 'website' => preg_replace('#^https?://#', '', get_site_url()),
        'logo' => has_site_icon() ? get_site_icon_url() : '', 'exams' => $content_data['exams'], 'examProductCategories' => $content_data['categories'], 
        'certificateTemplates' => $certificate_templates, 'suggestedBooks' => $content_data['books']
    ];
    return new WP_REST_Response(['organizations' => [$organization]], 200);
}

function mco_get_user_id_from_token($request) {
    $auth_header = $request->get_header('Authorization');
    sscanf($auth_header, 'Bearer %s', $token);
    $payload = mco_verify_exam_jwt($token);
    return $payload['user']['id'] ?? 0;
}

function mco_get_user_results_callback(WP_REST_Request $request) {
    $user_id = mco_get_user_id_from_token($request);
    $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
    return new WP_REST_Response(array_values($results), 200);
}

function mco_exam_submit_result_callback(WP_REST_Request $request) {
    $user_id = mco_get_user_id_from_token($request);
    $new_result = $request->get_json_params();
    if (empty($new_result['testId'])) return new WP_Error('bad_request', 'Missing testId.', ['status' => 400]);
    $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
    $results[$new_result['testId']] = $new_result;
    update_user_meta($user_id, 'mco_exam_results', $results);
    return new WP_REST_Response(['success' => true], 200);
}

function mco_exam_update_user_name_callback(WP_REST_Request $request) {
    $user_id = mco_get_user_id_from_token($request);
    $params = $request->get_json_params();
    $new_name = isset($params['fullName']) ? sanitize_text_field($params['fullName']) : '';
    if (empty($new_name)) return new WP_Error('bad_request', 'Full name cannot be empty.', ['status' => 400]);
    wp_update_user(['ID' => $user_id, 'display_name' => $new_name]);
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
        if (count($data) >= 7) {
            $questions[] = [ 'id' => intval($data[0]), 'question' => $data[1], 'options' => array_slice($data, 2, 4), 'correctAnswer' => intval($data[6]) ];
        }
    }
    shuffle($questions);
    return new WP_REST_Response(($count > 0 ? array_slice($questions, 0, $count) : $questions), 200);
}

function mco_get_certificate_data_callback(WP_REST_Request $request) {
    $user_id = mco_get_user_id_from_token($request);
    $user = get_userdata($user_id);
    $test_id = $request->get_param('testId');
    $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
    if (!isset($results[$test_id])) return new WP_Error('not_found', 'Test result not found.', ['status' => 404]);
    
    $result = $results[$test_id];
    $exam = null;
    $programs = get_posts(['post_type' => 'mco_exam_program', 'posts_per_page' => -1]);
    foreach ($programs as $program) {
        $sku = get_post_meta($program->ID, '_mco_certification_exam_sku', true);
        if ($sku == $result['examId']) {
            $exam = $program;
            break;
        }
    }

    if (!$exam) return new WP_Error('not_found', 'Exam configuration not found.', ['status' => 404]);

    $pass_score_terms = wp_get_post_terms($exam->ID, 'exam_pass_score', ['fields' => 'names']);
    $pass_score = !empty($pass_score_terms) ? (int)$pass_score_terms[0] : 70;

    if ($result['score'] < $pass_score && !in_array('administrator', (array)$user->roles)) {
        return new WP_Error('forbidden', 'Certificate not earned. Required score not met.', ['status' => 403]);
    }

    return new WP_REST_Response([
        'certificateNumber' => strtoupper(substr(md5($test_id . $user_id), 0, 12)), 
        'candidateName' => $user->display_name, 'finalScore' => $result['score'], 
        'date' => date('F j, Y', $result['timestamp'] / 1000), 'examId' => $result['examId']
    ], 200);
}

`;

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
                <h2 className="text-xl font-bold mb-2">The Integration Engine (v26.1.0)</h2>
                <p className="mb-4">
                    This is the master plugin for integrating the exam app with your WordPress site. It handles Single Sign-On (SSO), data synchronization, and provides powerful shortcodes for displaying content. <strong>This version makes WordPress the single source of truth for all application configuration.</strong>
                </p>
                <p className="mb-4">
                    <strong>Instructions:</strong>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                        <li>Copy the code below and save it as a new PHP file (e.g., <code>mco-integration-engine.php</code>).</li>
                        <li>Upload the plugin to your WordPress <code>/wp-content/plugins/</code> directory.</li>
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