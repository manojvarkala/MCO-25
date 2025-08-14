
import React from 'react';
import toast from 'react-hot-toast';

const Integration: React.FC = () => {

    const phpCode = `<?php
/**
 * Plugin Name:       MCO Exam App Integration
 * Description:       A unified plugin to integrate the React examination app with WordPress, handling SSO, purchases, and results sync.
 * Version:           5.0.0
 * Author:            Annapoorna Infotech (Refactored)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- CONFIGURATION ---
define('MCO_LOGIN_SLUG', 'exam-login');
define('MCO_EXAM_APP_URL', 'https://exams.coding-online.net/');
define('MCO_EXAM_APP_TEST_URL', 'https://mco-25.vercel.app/');

// IMPORTANT: Define a secure, random key in wp-config.php. It must be at least 32 characters.
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// define('MCO_DEBUG', true); // Add for debug logging
// --- END CONFIGURATION ---

add_action('init', 'mco_exam_app_init');
function mco_exam_app_init() {
    add_action('admin_notices', 'mco_check_dependencies');
    add_action('admin_menu', 'mco_exam_add_admin_menu');
    add_action('admin_init', 'mco_exam_register_settings');
    add_action('woocommerce_thankyou', 'mco_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'mco_exam_register_rest_api');
    add_action('register_form', 'mco_exam_add_custom_registration_fields');
    add_action('user_register', 'mco_exam_save_reg_fields');
    
    add_filter('registration_errors', 'mco_exam_validate_reg_fields', 10, 3);
    add_filter('login_url', 'mco_exam_login_url', 10, 2);
    
    add_shortcode('mco_exam_login', 'mco_exam_login_shortcode');
    add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode');
}

function mco_debug_log($message) { if (defined('MCO_DEBUG') && MCO_DEBUG) error_log('MCO Exam App Debug: ' . print_r($message, true)); }
function mco_check_dependencies() { if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>MCO Exam App:</strong> WooCommerce is not active. Exam features will be limited.</p></div>'; if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) echo '<div class="notice notice-error"><p><strong>MCO Exam App:</strong> A secure <strong>MCO_JWT_SECRET</strong> is not defined in wp-config.php. SSO will not work.</p></div>';}
function mco_exam_add_admin_menu() { add_options_page('MCO Exam App Settings', 'MCO Exam App', 'manage_options', 'mco-exam-settings', 'mco_exam_settings_page_html'); }
function mco_exam_register_settings() { register_setting('mco_exam_app_settings_group', 'mco_exam_app_mode'); }
function mco_exam_settings_page_html() { if (!current_user_can('manage_options')) return; ?>
    <div class="wrap"><h1><?php echo esc_html(get_admin_page_title()); ?></h1><p>Control the exam app version for redirects.</p><form action="options.php" method="post"><?php settings_fields('mco_exam_app_settings_group'); ?><table class="form-table"><tr><th scope="row">App Mode for Admins</th><td><fieldset><label><input type="radio" name="mco_exam_app_mode" value="production" <?php checked(get_option('mco_exam_app_mode'), 'production'); ?> /> Production</label><br/><label><input type="radio" name="mco_exam_app_mode" value="test" <?php checked(get_option('mco_exam_app_mode', 'test'), 'test'); ?> /> Test</label></fieldset></td></tr></table><?php submit_button('Save Settings'); ?></form></div><?php }
function mco_get_exam_app_url($is_admin = false) { if ($is_admin) return get_option('mco_exam_app_mode', 'test') === 'production' ? MCO_EXAM_APP_URL : MCO_EXAM_APP_TEST_URL; return MCO_EXAM_APP_URL; }

// --- DATA SOURCE & JWT ---
function mco_exam_get_payload($user_id) {
    if (!$user = get_userdata($user_id)) return null;
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $paid_exam_ids = []; $exam_prices = new stdClass();
    
    if (class_exists('WooCommerce')) {
        $all_exam_skus = ['exam-cpc-cert', 'exam-cca-cert', 'exam-ccs-cert', 'exam-billing-cert', 'exam-risk-cert', 'exam-icd-cert'];
        
        $exam_prices = get_transient('mco_exam_prices');
        if (false === $exam_prices) {
            $exam_prices = new stdClass();
            foreach ($all_exam_skus as $sku) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $price = (float) $product->get_price();
                    $regular_price = (float) $product->get_regular_price();
                    $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => ($regular_price > $price) ? $regular_price : $price];
                }
            }
            set_transient('mco_exam_prices', $exam_prices, 12 * HOUR_IN_SECONDS);
        }

        $customer_orders = wc_get_orders(['customer' => $user_id, 'status' => ['wc-completed', 'wc-processing'], 'limit' => -1]);
        $purchased_skus = [];
        if ($customer_orders) {
            foreach ($customer_orders as $order) {
                foreach ($order->get_items() as $item) { if (($p = $item->get_product()) && $p->get_sku()) $purchased_skus[] = $p->get_sku(); }
            }
        }
        $paid_exam_ids = array_values(array_intersect($all_exam_skus, array_unique($purchased_skus)));
    }
    
    return ['iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (60 * 60 * 2), 'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => user_can($user, 'administrator')], 'paidExamIds' => $paid_exam_ids, 'examPrices' => $exam_prices];
}

function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }
function mco_generate_exam_jwt($user_id) { $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32) return null; if (!$payload = mco_exam_get_payload($user_id)) return null; $h = mco_base64url_encode(json_encode(['typ'=>'JWT','alg'=>'HS256'])); $p = mco_base64url_encode(json_encode($payload)); $s = hash_hmac('sha256', "$h.$p", $secret_key, true); return "$h.$p." . mco_base64url_encode($s); }
function mco_verify_exam_jwt($token) { $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : ''; if (empty($secret_key)) return null; $parts = explode('.', $token); if (count($parts) !== 3) return null; list($h_b64, $p_b64, $s_b64) = $parts; $s = mco_base64url_decode($s_b64); if (!hash_equals(hash_hmac('sha256', "$h_b64.$p_b64", $secret_key, true), $s)) return null; $payload = json_decode(mco_base64url_decode($p_b64), true); return (isset($payload['exp']) && $payload['exp'] < time()) ? null : $payload; }

function mco_redirect_after_purchase($order_id) { if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return; if ($user_id > 0 && $order->has_status(['completed', 'processing', 'on-hold'])) { if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart(); if ($token = mco_generate_exam_jwt($user_id)) { wp_redirect(mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard'); exit; } } }

// --- REST API ENDPOINTS ---
function mco_exam_register_rest_api() {
    register_rest_route('mco-app/v1', '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/certificate-data/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
}

function mco_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) return new WP_Error('jwt_missing', 'Auth token not found.', ['status' => 401]);
    $payload = mco_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_invalid', 'Invalid token.', ['status' => 403]);
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

function mco_get_user_results_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $results = get_user_meta($user_id, 'mco_exam_results', true);
    return new WP_REST_Response(is_array($results) ? array_values($results) : [], 200);
}

function mco_get_certificate_data_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $test_id = $request['test_id'];
    $user = get_userdata($user_id);
    if (!$user) return new WP_Error('user_not_found', 'User not found.', ['status' => 404]);

    // Data is static in the React app, but we fetch it here for certificate validation logic
    $all_data = json_decode(file_get_contents(plugin_dir_path(__FILE__) . 'data.json'), true);
    $org = $all_data[0];

    if ($test_id === 'sample') {
        $template = $org['certificateTemplates'][0];
        $candidate_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
        $data = [ 'certificateNumber' => "SAMPLE-" . time(), 'candidateName' => $candidate_name, 'finalScore' => 95.5, 'date' => date('F j, Y'), 'totalQuestions' => 100, 'organization' => $org, 'template' => $template ];
        return new WP_REST_Response($data, 200);
    }
    
    $all_results = get_user_meta($user_id, 'mco_exam_results', true);
    if (!is_array($all_results) || !isset($all_results[sanitize_key($test_id)])) return new WP_Error('not_found', 'Result not found.', ['status' => 404]);
    $result = $all_results[sanitize_key($test_id)];
    
    $exam = current(array_filter($org['exams'], function($e) use ($result) { return $e['id'] === $result['examId']; }));
    if (!$exam || ($result['score'] < $exam['passScore'] && !user_can($user, 'administrator'))) return new WP_Error('not_earned', 'Certificate not earned.', ['status' => 403]);

    $template = current(array_filter($org['certificateTemplates'], function($t) use ($exam) { return $t['id'] === $exam['certificateTemplateId']; }));
    if (!$template) return new WP_Error('not_found', 'Template not found.', ['status' => 404]);

    $candidate_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $data = [ 'certificateNumber' => substr($user_id, 0, 4) . '-' . substr(md5($test_id), 0, 6), 'candidateName' => $candidate_name, 'finalScore' => $result['score'], 'date' => date('F j, Y', $result['timestamp'] / 1000), 'totalQuestions' => $result['totalQuestions'], 'organization' => $org, 'template' => $template ];
    return new WP_REST_Response($data, 200);
}

function mco_exam_update_user_name_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $full_name = sanitize_text_field($request->get_json_params()['fullName'] ?? '');
    if (empty($full_name)) return new WP_Error('name_empty', 'Full name cannot be empty.', ['status' => 400]);
    $parts = explode(' ', $full_name, 2);
    update_user_meta($user_id, 'first_name', $parts[0]);
    update_user_meta($user_id, 'last_name', $parts[1] ?? '');
    return new WP_REST_Response(['success' => true], 200);
}

function mco_exam_submit_result_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $result = $request->get_json_params();
    if (!isset($result['testId'])) return new WP_Error('invalid_data', "Missing testId.", ['status' => 400]);
    $result['userId'] = (string)$user_id;
    $all_results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];
    $all_results[$result['testId']] = $result;
    update_user_meta($user_id, 'mco_exam_results', $all_results);
    return new WP_REST_Response($result, 200);
}

// --- SHORTCODES & LOGIN FORM ---
function mco_exam_login_shortcode() {
    if (!defined('MCO_JWT_SECRET')) return "<p>Configuration error: MCO_JWT_SECRET is missing.</p>";
    $error = ''; $user_id = 0;

    if ('POST' === $_SERVER['REQUEST_METHOD'] && !empty($_POST['mco_login_nonce']) && wp_verify_nonce($_POST['mco_login_nonce'], 'mco_login_action')) {
        $user = wp_signon(['user_login' => sanitize_user($_POST['log']), 'user_password' => $_POST['pwd'], 'remember' => true], false);
        if (is_wp_error($user)) $error = 'Invalid username or password.'; else $user_id = $user->ID;
    }
    if (is_user_logged_in() && !$user_id) $user_id = get_current_user_id();

    if ($user_id > 0) {
        $token = mco_generate_exam_jwt($user_id);
        if ($token) {
            $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard';
            $final_url = mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            return "<div style='text-align:center;'><p>Login successful. Redirecting...</p><script>window.location.href='" . esc_url_raw($final_url) . "';</script></div>";
        } else {
            $error = 'Could not create a secure session.';
        }
    }
    ob_start(); ?>
    <style>.mco-login-container{max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)}.mco-login-container input{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}.mco-login-container button{width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;cursor:pointer}</style>
    <div class="mco-login-container"><h2>Exam Portal Login</h2><?php if ($error) echo "<p style='color:red;'>" . esc_html($error) . "</p>"; ?>
    <form action="<?php echo esc_url(get_permalink()); ?>" method="post"><p><label>Username/Email<br/><input type="text" name="log" required></label></p><p><label>Password<br/><input type="password" name="pwd" required></label></p><p><button type="submit">Log In</button></p><?php wp_nonce_field('mco_login_action', 'mco_login_nonce'); if (isset($_REQUEST['redirect_to'])) echo '<input type="hidden" name="redirect_to" value="' . esc_attr(urlencode($_REQUEST['redirect_to'])) . '" />'; ?></form>
    <div style="text-align:center;margin-top:1rem;"><a href="<?php echo esc_url(wp_registration_url()); ?>">Register</a> | <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Lost Password?</a></div></div>
    <?php return ob_get_clean();
}

function mco_exam_showcase_shortcode() {
    ob_start(); echo "<div>[MCO Exam Showcase Shortcode Placeholder]</div>"; return ob_get_clean();
}

function mco_exam_add_custom_registration_fields() { ?><p><label for="first_name">First Name<br/><input type="text" name="first_name" required/></label></p><p><label for="last_name">Last Name<br/><input type="text" name="last_name" required/></label></p><?php }
function mco_exam_validate_reg_fields($errors, $login, $email) { if (empty($_POST['first_name']) || empty($_POST['last_name'])) $errors->add('field_error', 'First and Last Name are required.'); return $errors; }
function mco_exam_save_reg_fields($user_id) { if (!empty($_POST['first_name'])) update_user_meta($user_id, 'first_name', sanitize_text_field($_POST['first_name'])); if (!empty($_POST['last_name'])) update_user_meta($user_id, 'last_name', sanitize_text_field($_POST['last_name'])); }
function mco_exam_login_url($login_url, $redirect) { if (strpos($_SERVER['REQUEST_URI'], 'wp-admin') !== false) return $login_url; $url = home_url('/' . MCO_LOGIN_SLUG . '/'); return !empty($redirect) ? add_query_arg('redirect_to', urlencode($redirect), $url) : $url; }
?>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(phpCode).then(() => {
            toast.success('PHP code copied to clipboard!');
        }, (err) => {
            toast.error('Failed to copy code.');
        });
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">WordPress Integration Guide</h1>
            <div className="prose max-w-none text-slate-600">
                <p>This is the new, unified plugin to integrate the examination portal with WordPress. It handles Single Sign-On (SSO), results synchronization, and is properly namespaced to prevent conflicts.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Setup Steps</h2>
                <ol>
                    <li><strong>IMPORTANT:</strong> Deactivate and delete any previous versions of the "Annapoorna" or "MCO" exam plugins from your WordPress site.</li>
                    <li>Create a new PHP file in <code>/wp-content/plugins/</code> (e.g., <code>mco-exam-integration.php</code>).</li>
                    <li>Copy the code below and paste it into the new file.</li>
                    <li>Activate the "MCO Exam App Integration" plugin in your WordPress admin dashboard.</li>
                    <li>Navigate to <strong>Settings &rarr; MCO Exam App</strong> to configure the plugin.</li>
                    <li>Use the shortcode <code>[mco_exam_showcase]</code> to display the exam categories, and <code>[mco_exam_login]</code> on your login page.</li>
                </ol>

                <div className="relative mt-6">
                    <button 
                        onClick={copyToClipboard}
                        className="absolute top-2 right-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-1 px-3 rounded-md text-xs transition z-10"
                    >
                        Copy Code
                    </button>
                    <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                        <code>
                            {phpCode}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default Integration;
