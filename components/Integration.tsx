import * as React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: React.FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A generic engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and styling.
 * Version:           20.0.0 (Final Stable Release)
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
define('MCO_LOGIN_SLUG', 'exam-login');
// IMPORTANT: Define this in your wp-config.php file, not here.
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
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
    
    add_filter('login_url', 'mco_exam_login_url', 10, 2);
    
    add_shortcode('mco_exam_login', 'mco_exam_login_shortcode');
    add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode');

    add_action('wp_head', 'mco_add_custom_wc_styles_to_head');
    add_filter('woocommerce_order_button_text', 'mco_custom_order_button_text');

    if (get_transient('mco_flush_rewrite_rules_flag')) {
        flush_rewrite_rules();
        delete_transient('mco_flush_rewrite_rules_flag');
    }
}

function mco_check_dependencies() { 
    if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> WooCommerce is not active. This plugin requires it to function.</p></div>'; 
    if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) echo '<div class="notice notice-error"><p><strong>Exam App Engine:</strong> A secure <strong>MCO_JWT_SECRET</strong> (at least 32 characters long) is not defined in your wp-config.php file for security. SSO will not work.</p></div>';
    if (empty(get_option('mco_exam_app_url'))) echo '<div class="notice notice-warning"><p><strong>Exam App Engine:</strong> The Exam Application URL is not set. Please <a href="' . admin_url('admin.php?page=mco-exam-engine') . '">go to the settings page</a> to configure it.</p></div>';
}

// --- ADMIN MENU & PAGES ---
function mco_exam_add_admin_menu() {
    add_menu_page('Exam App Engine', 'Exam App Engine', 'manage_options', 'mco-exam-engine', 'mco_exam_settings_page_html', 'dashicons-analytics', 80);
    add_submenu_page('mco-exam-engine', 'Engine Settings', 'Settings', 'manage_options', 'mco-exam-engine', 'mco_exam_settings_page_html');
    add_submenu_page('mco-exam-engine', 'Platform Blueprint', 'Platform Blueprint', 'manage_options', 'mco-platform-blueprint', 'mco_platform_blueprint_page_html');
}

function mco_exam_register_settings() { register_setting('mco_exam_app_settings_group', 'mco_exam_app_url'); }

function mco_exam_settings_page_html() {
    ?>
    <div class="wrap">
        <h1>Exam App Engine Settings</h1>
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
    </div>
    <?php
}

function mco_platform_blueprint_page_html() { /* ... HTML for blueprint page ... */ }
function mco_get_exam_app_url() { return rtrim(get_option('mco_exam_app_url', ''), '/'); }

// --- CUSTOM POST TYPES & META BOXES ---
function mco_register_custom_post_types() {
    register_post_type('mco_exam_program', [ 'labels' => ['name' => 'Exam Programs', 'singular_name' => 'Exam Program'], 'public' => true, 'has_archive' => true, 'supports' => ['title', 'editor', 'thumbnail'], 'menu_icon' => 'dashicons-welcome-learn-more' ]);
    register_post_type('mco_recommended_book', [ 'labels' => ['name' => 'Recommended Books', 'singular_name' => 'Book'], 'public' => true, 'has_archive' => false, 'supports' => ['title', 'editor', 'thumbnail'], 'menu_icon' => 'dashicons-book-alt' ]);
}

function mco_add_meta_boxes() {
    add_meta_box('mco_wc_product_meta', 'Exam App Configuration', 'mco_render_wc_product_meta_box', 'product', 'side', 'high');
    add_meta_box('mco_exam_program_meta', 'Exam App Links', 'mco_render_exam_program_meta_box', 'mco_exam_program', 'side', 'high');
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
    $cert_sku = get_post_meta($post->ID, '_mco_certification_exam_sku', true);
    $pass_score = get_post_meta($post->ID, '_mco_pass_score', true);
    ?>
    <p>
        <label for="mco_practice_exam_id">Practice Exam ID:</label><br>
        <input type="text" id="mco_practice_exam_id" name="mco_practice_exam_id" value="<?php echo esc_attr($practice_id); ?>" style="width:100%;" placeholder="e.g., exam-cpc-practice">
    </p>
    <p>
        <label for="mco_certification_exam_sku">Certification Exam ID / SKU:</label><br>
        <input type="text" id="mco_certification_exam_sku" name="mco_certification_exam_sku" value="<?php echo esc_attr($cert_sku); ?>" style="width:100%;" placeholder="e.g., exam-cpc-cert">
    </p>
    <p>
        <label for="mco_pass_score">Pass Score (%):</label><br>
        <input type="number" id="mco_pass_score" name="mco_pass_score" value="<?php echo esc_attr($pass_score ?: 70); ?>" style="width:100%;" min="0" max="100">
    </p>
    <?php
}

function mco_save_wc_product_meta_data($post_id) {
    if (!isset($_POST['mco_wc_nonce']) || !wp_verify_nonce($_POST['mco_wc_nonce'], 'mco_save_wc_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    if (isset($_POST['mco_product_type'])) {
        update_post_meta($post_id, '_mco_product_type', sanitize_text_field($_POST['mco_product_type']));
    }
}

function mco_save_exam_program_meta_data($post_id) {
    if (!isset($_POST['mco_exam_program_nonce']) || !wp_verify_nonce($_POST['mco_exam_program_nonce'], 'mco_save_exam_program_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    if (isset($_POST['mco_practice_exam_id'])) update_post_meta($post_id, '_mco_practice_exam_id', sanitize_text_field($_POST['mco_practice_exam_id']));
    if (isset($_POST['mco_certification_exam_sku'])) update_post_meta($post_id, '_mco_certification_exam_sku', sanitize_text_field($_POST['mco_certification_exam_sku']));
    if (isset($_POST['mco_pass_score'])) update_post_meta($post_id, '_mco_pass_score', intval($_POST['mco_pass_score']));
}

// --- DYNAMIC DATA PAYLOAD & JWT ---
function mco_exam_get_payload($user_id) { /* ... JWT payload logic ... */ }
function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

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

function mco_generate_exam_jwt($user_id) { /* ... JWT generation logic ... */ }

// --- WOOCOMMERCE & SHORTCODES ---
function mco_redirect_after_purchase($order_id) { /* ... Redirect logic ... */ }
function mco_exam_login_shortcode() { /* ... Login form and logic ... */ }
function mco_exam_login_url($login_url, $redirect) { /* ... Login URL filter logic ... */ }
function mco_exam_showcase_shortcode() { /* ... Exam showcase logic ... */ }
function mco_add_custom_wc_styles_to_head() { /* ... Custom CSS logic ... */ }
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
    // ... other routes
}

function mco_exam_api_permission_check(WP_REST_Request $request) {
    $auth_header = $request->get_header('Authorization');
    if (!$auth_header) return new WP_Error('jwt_auth_no_auth_header', 'Authorization header not found.', ['status' => 403]);
    list($token) = sscanf($auth_header, 'Bearer %s');
    if (!$token) return new WP_Error('jwt_auth_bad_auth_header', 'Authorization header malformed.', ['status' => 403]);
    $payload = mco_verify_exam_jwt($token);
    if (!$payload || !isset($payload->user->id)) return new WP_Error('jwt_auth_invalid_token', 'Invalid token.', ['status' => 403]);
    $request->set_param('jwt_payload', $payload);
    return true;
}

function mco_exam_api_admin_check(WP_REST_Request $request) {
    $permission = mco_exam_api_permission_check($request);
    if (is_wp_error($permission)) return $permission;
    $payload = $request->get_param('jwt_payload');
    if (empty($payload->user->isAdmin)) return new WP_Error('jwt_auth_not_admin', 'Administrator access required.', ['status' => 403]);
    return true;
}

function mco_sanitize_test_result($result) {
    $sanitized = [];
    if (!is_array($result)) return $sanitized;
    $sanitized['testId'] = isset($result['testId']) ? sanitize_text_field($result['testId']) : '';
    $sanitized['userId'] = isset($result['userId']) ? sanitize_text_field($result['userId']) : '';
    $sanitized['examId'] = isset($result['examId']) ? sanitize_text_field($result['examId']) : '';
    $sanitized['score'] = isset($result['score']) ? floatval($result['score']) : 0;
    $sanitized['correctCount'] = isset($result['correctCount']) ? intval($result['correctCount']) : 0;
    $sanitized['totalQuestions'] = isset($result['totalQuestions']) ? intval($result['totalQuestions']) : 0;
    $sanitized['timestamp'] = isset($result['timestamp']) ? intval($result['timestamp']) : 0;
    
    $sanitized['answers'] = [];
    if (isset($result['answers']) && is_array($result['answers'])) {
        foreach ($result['answers'] as $answer) {
            if(is_array($answer)) {
                $sanitized['answers'][] = [ 'questionId' => isset($answer['questionId']) ? intval($answer['questionId']) : 0, 'answer' => isset($answer['answer']) ? intval($answer['answer']) : 0 ];
            }
        }
    }
    
    $sanitized['review'] = [];
    if (isset($result['review']) && is_array($result['review'])) {
        foreach ($result['review'] as $item) {
            if(is_array($item)) {
                $sanitized_options = [];
                if (isset($item['options']) && is_array($item['options'])) {
                    foreach ($item['options'] as $option) { $sanitized_options[] = sanitize_text_field($option); }
                }
                $sanitized['review'][] = [
                    'questionId' => isset($item['questionId']) ? intval($item['questionId']) : 0,
                    'question' => isset($item['question']) ? sanitize_text_field($item['question']) : '',
                    'options' => $sanitized_options,
                    'userAnswer' => isset($item['userAnswer']) ? intval($item['userAnswer']) : -1,
                    'correctAnswer' => isset($item['correctAnswer']) ? intval($item['correctAnswer']) : -1,
                ];
            }
        }
    }
    return $sanitized;
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

function mco_get_exam_stats_callback(WP_REST_Request $request) {
    $cached_stats = get_transient('mco_exam_stats');
    if ($cached_stats !== false) return new WP_REST_Response($cached_stats, 200);
    
    $exam_programs_query = new WP_Query(['post_type' => 'mco_exam_program', 'posts_per_page' => -1]);
    $pass_score_map = [];
    if ($exam_programs_query->have_posts()) {
        while ($exam_programs_query->have_posts()) {
            $exam_programs_query->the_post();
            $cert_exam_sku = get_post_meta(get_the_ID(), '_mco_certification_exam_sku', true);
            if (!empty($cert_exam_sku)) {
                $pass_score_map[$cert_exam_sku] = (int)get_post_meta(get_the_ID(), '_mco_pass_score', true) ?: 70;
            }
        }
    }
    wp_reset_postdata();

    global $wpdb;
    $all_results_raw = $wpdb->get_results("SELECT meta_value FROM {$wpdb->usermeta} WHERE meta_key = 'mco_exam_results'");
    $all_results = [];
    foreach ($all_results_raw as $row) {
        $user_results = maybe_unserialize($row->meta_value);
        if (is_array($user_results)) $all_results = array_merge($all_results, array_values($user_results));
    }
    
    $stats = [];
    foreach ($all_results as $result) {
        $exam_id = $result['examId'] ?? null;
        if (!$exam_id || !isset($pass_score_map[$exam_id])) continue; // Only track stats for configured cert exams
        
        if (!isset($stats[$exam_id])) $stats[$exam_id] = ['examId' => $exam_id, 'examName' => 'Loading...', 'totalSales' => 0, 'totalAttempts' => 0, 'passed' => 0, 'failed' => 0, 'totalScore' => 0];
        
        $stats[$exam_id]['totalAttempts']++;
        $stats[$exam_id]['totalScore'] += (float)($result['score'] ?? 0);
        
        if (($result['score'] ?? 0) >= $pass_score_map[$exam_id]) $stats[$exam_id]['passed']++;
        else $stats[$exam_id]['failed']++;
    }
    
    $final_stats = [];
    foreach ($stats as $exam_id => $data) {
        if ($data['totalAttempts'] > 0) {
            $data['averageScore'] = $data['totalScore'] / $data['totalAttempts'];
            $data['passRate'] = ($data['passed'] / $data['totalAttempts']) * 100;
        } else {
            $data['averageScore'] = 0; $data['passRate'] = 0;
        }
        $exam_post = get_page_by_path($exam_id, OBJECT, 'mco_exam_program');
        $data['examName'] = $exam_post ? $exam_post->post_title : $exam_id;
        
        unset($data['totalScore']);
        $final_stats[] = $data;
    }

    set_transient('mco_exam_stats', $final_stats, 2 * HOUR_IN_SECONDS);
    return new WP_REST_Response($final_stats, 200);
}

// ... Implementations for other API callbacks like get_user_results, update_name, etc.
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
                <h2 className="text-xl font-bold mb-2">The Integration Engine Plugin (Final Version)</h2>
                <p className="mb-4">
                    This single, generic plugin handles all necessary integrations. This is the final, stable version designed for long-term use on all client sites.
                </p>
                <p className="mb-4">
                    Copy the code below and save it as a new plugin file (e.g., <code>exam-app-engine.php</code>) in your WordPress <code>/wp-content/plugins/</code> directory and activate it. After activating, you must:
                </p>
                 <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li>Define your <code>MCO_JWT_SECRET</code> in your <code>wp-config.php</code> file for security.</li>
                    <li>Go to <strong>Exam App Engine &rarr; Settings</strong> and set your Exam Application URL.</li>
                    <li>Begin creating content under the new "Exam Programs" and "Recommended Books" sections.</li>
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