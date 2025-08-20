

import * as React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

export default function Integration() {
    const phpCode = `<?php
/**
 * Plugin Name:       MCO Exam App Integration
 * Description:       A unified plugin to integrate the React examination app with WordPress, handling SSO, purchases, and results sync.
 * Version:           10.4.0
 * Author:            Annapoorna Infotech (Refactored)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- IMPORTANT ---
// After activating or updating this plugin, you MUST flush WordPress permalinks.
// Go to your WordPress Admin -> Settings -> Permalinks and just click "Save Changes".
// This rebuilds the URL routes and prevents "No route was found" errors for the API.
// --- IMPORTANT ---

// --- CONFIGURATION ---
define('MCO_LOGIN_SLUG', 'exam-login');
define('MCO_EXAM_APP_URL', 'https://exams.coding-online.net/');
define('MCO_EXAM_APP_TEST_URL', 'https://mco-25.vercel.app/');
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
define('MCO_DEBUG', true); // Enabled for troubleshooting. Check wp-content/debug.log
// --- END CONFIGURATION ---

// --- CORS HANDLING ---
add_action( 'rest_api_init', function() {
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
    add_filter( 'rest_pre_serve_request', function( $value ) {
        header( 'Access-Control-Allow-Origin: *' );
        header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS' );
        header( 'Access-Control-Allow-Headers: Authorization, X-WP-Nonce, Content-Type' );
        if ( 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
            status_header( 200 );
            exit();
        }
        return $value;
    });
}, 15 );

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
    add_shortcode('exam_user_details', 'mco_exam_user_details_shortcode');
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
    $user = get_userdata($user_id);
    if (!$user) {
        mco_debug_log('get_payload failed: could not find user data for user_id: ' . $user_id);
        return null;
    }
    mco_debug_log('get_payload success: found user data for: ' . $user->user_login);
    
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $paid_exam_ids = []; 
    $exam_prices = new stdClass();
    $is_subscribed = false;
    
    $spins_available = get_user_meta($user_id, 'mco_spins_available', true);
    if ($spins_available === '') $spins_available = 1;
    $spins_available = intval($spins_available);
    
    $won_prize = get_user_meta($user_id, 'mco_wheel_prize', true);

    if (user_can($user, 'administrator')) $spins_available = 1;
    
    if (class_exists('WooCommerce')) {
        $all_exam_skus = ['exam-cpc-cert', 'exam-cca-cert', 'exam-ccs-cert', 'exam-billing-cert', 'exam-risk-cert', 'exam-icd-cert', 'exam-cpb-cert', 'exam-crc-cert', 'exam-cpma-cert', 'exam-coc-cert', 'exam-cic-cert', 'exam-mta-cert', 'exam-ap-cert', 'exam-em-cert', 'exam-rcm-cert', 'exam-hi-cert', 'exam-mcf-cert'];
        $base_subscription_skus = ['sub-monthly', 'sub-yearly', 'sub-1mo-addon'];
        $specific_bundle_skus = ['exam-cpc-cert-1', 'exam-cca-cert-bundle'];
        $addon_skus = array_map(function($sku) { return $sku . '-1mo-addon'; }, $all_exam_skus);
        $subscription_skus = array_unique(array_merge($base_subscription_skus, $addon_skus));
        $all_skus_for_pricing = array_unique(array_merge($all_exam_skus, $subscription_skus, $specific_bundle_skus));
        
        // Use a transient to cache price and rating data for performance
        $exam_prices = get_transient('mco_exam_prices_v4');
        if (false === $exam_prices) {
            $exam_prices = new stdClass();
            foreach ($all_skus_for_pricing as $sku) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $price_data = ['price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productId' => $product_id];
                    
                    // Fetch rating meta
                    $avg_rating = get_post_meta($product_id, '_mco_exam_avg_rating', true);
                    $review_count = get_post_meta($product_id, '_mco_exam_review_count', true);
                    if ($avg_rating) $price_data['avgRating'] = (float)$avg_rating;
                    if ($review_count) $price_data['reviewCount'] = (int)$review_count;

                    $exam_prices->{$sku} = $price_data;
                }
            }
            set_transient('mco_exam_prices_v4', $exam_prices, 6 * HOUR_IN_SECONDS);
        }
        
        $customer_orders = wc_get_orders(['customer' => $user_id, 'status' => ['wc-completed', 'wc-processing'], 'limit' => -1]);
        $purchased_skus = [];
        if ($customer_orders) { foreach ($customer_orders as $order) { foreach ($order->get_items() as $item) { if ($product = $item->get_product()) $purchased_skus[] = $product->get_sku(); } } }
        $purchased_skus = array_unique($purchased_skus);
        
        $granted_skus = get_user_meta($user_id, 'mco_granted_skus', true) ?: [];
        $is_subscribed_by_purchase = !empty(array_intersect($subscription_skus, $purchased_skus));
        $won_subscription_expiry = get_user_meta($user_id, 'mco_subscription_expiry', true);
        $is_subscribed = $is_subscribed_by_purchase || ($won_subscription_expiry && $won_subscription_expiry > time());
        
        $exams_from_addons = [];
        foreach ($purchased_skus as $sku) { if (strpos($sku, '-1mo-addon') !== false) $exams_from_addons[] = str_replace('-1mo-addon', '', $sku); }
        $paid_exam_ids = array_values(array_unique(array_merge(array_intersect($all_exam_skus, $purchased_skus), $exams_from_addons, $granted_skus)));
    }
    
    return ['iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (60 * 60 * 2), 'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => user_can($user, 'administrator')], 'paidExamIds' => $paid_exam_ids, 'examPrices' => $exam_prices, 'isSubscribed' => $is_subscribed, 'spinsAvailable' => $spins_available, 'wonPrize' => $won_prize];
}

function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }

function mco_verify_exam_jwt($token) {
    $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : '';
    if (empty($secret_key) || strlen($secret_key) < 32) { mco_debug_log('JWT verification failed: Secret key not configured or insecure.'); return null; }
    $parts = explode('.', $token);
    if (count($parts) !== 3) { mco_debug_log('JWT verification failed: Invalid token structure.'); return null; }
    list($header_b64, $payload_b64, $signature_b64) = $parts;
    $signature = base64_decode(strtr($signature_b64, '-_', '+/'));
    $expected_signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true);
    if (!hash_equals($expected_signature, $signature)) { mco_debug_log('JWT verification failed: Signature mismatch.'); return null; }
    
    $payload_json = base64_decode(strtr($payload_b64, '-_', '+/'));
    if ($payload_json === false) { mco_debug_log('JWT verification failed: base64_decode on payload failed.'); return null; }
    $payload = json_decode($payload_json, true);
    if (json_last_error() !== JSON_ERROR_NONE) { mco_debug_log('JWT verification failed: json_decode error: ' . json_last_error_msg()); return null; }
    
    if (isset($payload['exp']) && $payload['exp'] < time()) { mco_debug_log('JWT verification failed: Token expired.'); return null; }
    return $payload;
}

function mco_generate_exam_jwt($user_id) {
    $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : '';
    if (empty($secret_key) || strlen($secret_key) < 32 || strpos($secret_key, 'your-very-strong-secret-key') !== false) { mco_debug_log('JWT Secret is not configured or is too weak.'); return null; }
    if (!$payload = mco_exam_get_payload($user_id)) return null;
    
    $payload_json = json_encode($payload);
    if ($payload_json === false) { 
        mco_debug_log('JWT generation failed: json_encode error: ' . json_last_error_msg()); 
        return null; 
    }
    
    $header_b64 = mco_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload_b64 = mco_base64url_encode($payload_json);
    $signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true);
    $signature_b64 = mco_base64url_encode($signature);
    return "$header_b64.$payload_b64.$signature_b64";
}

function mco_redirect_after_purchase($order_id) { if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return; if ($user_id > 0 && $order->has_status(['completed', 'processing', 'on-hold'])) { if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart(); if ($token = mco_generate_exam_jwt($user_id)) { wp_redirect(mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard'); exit; } } }

// --- REST API ENDPOINTS ---
function mco_exam_register_rest_api() {
    register_rest_route('mco-app/v1', '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/certificate-data/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/debug-details', ['methods' => 'GET', 'callback' => 'mco_get_debug_details_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/submit-review', ['methods' => 'POST', 'callback' => 'mco_exam_submit_review_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/spin-wheel', ['methods' => 'POST', 'callback' => 'mco_spin_wheel_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/add-spins', ['methods' => 'POST', 'callback' => 'mco_add_spins_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/grant-prize', ['methods' => 'POST', 'callback' => 'mco_grant_prize_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/search-user', ['methods' => 'POST', 'callback' => 'mco_search_user_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/reset-spins', ['methods' => 'POST', 'callback' => 'mco_reset_spins_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/remove-prize', ['methods' => 'POST', 'callback' => 'mco_remove_prize_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
}

function mco_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) {
        return new WP_Error('jwt_missing', 'Authorization token not found.', ['status' => 401]);
    }
    $payload = mco_verify_exam_jwt($matches[1]);
    if (!$payload) {
        return new WP_Error('jwt_invalid', 'Invalid or expired token.', ['status' => 403]);
    }
    if (!isset($payload['user']['id']) || empty($payload['user']['id'])) {
        $debug_message = 'User ID not found in the token. (This often means your login session is invalid or has expired. Please try logging out and back in.) Decoded Payload: ' . print_r($payload, true);
        mco_debug_log($debug_message);
        return new WP_Error('jwt_no_user_id', 'User ID not found in the token (This often means your login session is invalid or has expired. Please try logging out and back in.)', ['status' => 403]);
    }
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

function mco_get_user_results_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); if ($user_id <= 0) return new WP_Error('invalid_user', 'Invalid user.', ['status' => 403]); $results = get_user_meta($user_id, 'mco_exam_results', true); $results = empty($results) || !is_array($results) ? [] : array_values($results); return new WP_REST_Response($results, 200); }
function mco_get_certificate_data_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); $test_id = sanitize_key($request['test_id']); $user = get_userdata($user_id); if (!$user) return new WP_Error('user_not_found', 'User not found.', ['status' => 404]); $all_results = get_user_meta($user_id, 'mco_exam_results', true); if (!is_array($all_results) || !isset($all_results[$test_id])) { return new WP_Error('not_found', 'Result not found.', ['status' => 404]); } $result = $all_results[$test_id]; $candidate_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name; return new WP_REST_Response(['certificateNumber' => substr($user_id, 0, 4) . '-' . substr(md5($test_id), 0, 6), 'candidateName' => $candidate_name, 'finalScore' => $result['score'], 'date' => date('F j, Y', (int)((int)$result['timestamp'] / 1000)), 'examId' => $result['examId']], 200); }
function mco_exam_update_user_name_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); if (!get_userdata($user_id)) return new WP_Error('user_not_found', 'User not found.', ['status' => 404]); $full_name = isset($request->get_json_params()['fullName']) ? sanitize_text_field($request->get_json_params()['fullName']) : ''; if (empty($full_name)) return new WP_Error('name_empty', 'Full name cannot be empty.', ['status' => 400]); $name_parts = explode(' ', $full_name, 2); update_user_meta($user_id, 'first_name', $name_parts[0]); update_user_meta($user_id, 'last_name', isset($name_parts[1]) ? $name_parts[1] : ''); return new WP_REST_Response(['success' => true, 'message' => 'Name updated successfully.'], 200); }
function mco_exam_submit_result_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); $result_data = $request->get_json_params(); foreach (['testId', 'examId', 'score', 'correctCount', 'totalQuestions', 'timestamp'] as $key) { if (!isset($result_data[$key])) { mco_debug_log('Result submission failed for user ' . $user_id . '. Missing key: ' . $key); return new WP_Error('invalid_data', "Missing key: {$key}", ['status' => 400]); } } $result_data['userId'] = (string)$user_id; mco_debug_log('Attempting to save result for user ID ' . $user_id . '. Test ID: ' . $result_data['testId']); $all_results = get_user_meta($user_id, 'mco_exam_results', true); if (!is_array($all_results)) $all_results = []; $all_results[$result_data['testId']] = $result_data; $success = update_user_meta($user_id, 'mco_exam_results', $all_results); mco_debug_log('Result of update_user_meta: ' . ($success ? 'Success' : 'Failure')); return new WP_REST_Response($result_data, 200); }

function mco_get_questions_from_sheet_callback($request) {
    $params = $request->get_json_params();
    $sheet_url = isset($params['sheetUrl']) ? esc_url_raw($params['sheetUrl']) : '';
    $count = isset($params['count']) ? intval($params['count']) : 100;
    if (empty($sheet_url) || !filter_var($sheet_url, FILTER_VALIDATE_URL)) return new WP_Error('invalid_url', 'Invalid Google Sheet URL.', ['status' => 400]);
    $csv_url = str_replace(['/edit?usp=sharing', '/edit#gid='], ['/export?format=csv', '/export?format=csv&gid='], $sheet_url);
    $response = wp_remote_get($csv_url, ['timeout' => 20]);
    if (is_wp_error($response)) { mco_debug_log('Sheet fetch failed: ' . $response->get_error_message()); return new WP_Error('fetch_failed', 'Could not connect to Google Sheets to get questions.', ['status' => 500]); }
    $body = wp_remote_retrieve_body($response);
    if (substr($body, 0, 3) == "\\xEF\\xBB\\xBF") $body = substr($body, 3);
    $lines = preg_split('/\\r\\n?|\\n/', trim($body));
    if (count($lines) <= 1) return new WP_Error('empty_sheet', 'The Google Sheet is empty or could not be read.', ['status' => 500]);
    array_shift($lines); $questions = []; $skipped_rows = 0; $total_rows = count($lines);
    foreach ($lines as $line_num => $line) {
        if (empty(trim($line))) { $skipped_rows++; continue; }
        $row_raw = str_getcsv($line);
        $options_str = isset($row_raw[1]) ? trim($row_raw[1]) : '';
        if (count($row_raw) < 3 && strpos($options_str, '|') === false) { $skipped_rows++; mco_debug_log("Skipping row #" . ($line_num + 2) . ": Not enough columns for separate options, and no pipe separator found."); continue; }
        if (empty(trim($row_raw[0])) || empty($options_str)) { $skipped_rows++; mco_debug_log("Skipping row #" . ($line_num + 2) . ": Question or Options column is empty."); continue; }
        
        $question_text = trim($row_raw[0]);
        $options = [];
        $answer_column_value = '';
        
        if (strpos($options_str, '|') !== false) {
            $options = array_map('trim', explode('|', $options_str));
            $answer_column_value = isset($row_raw[2]) ? trim($row_raw[2]) : '';
        } else {
            for ($i = 1; $i < count($row_raw) - 1; $i++) { if (!empty(trim($row_raw[$i]))) $options[] = trim($row_raw[$i]); }
            $answer_column_value = trim(end($row_raw));
        }
        
        if (count($options) < 2) { $skipped_rows++; mco_debug_log('Skipping row #' . ($line_num + 2) . '. Reason: Could not parse at least 2 options.'); continue; }
        
        $correct_answer_index = false;
        if (is_numeric($answer_column_value)) { $numeric_index = intval($answer_column_value) - 1; if ($numeric_index >= 0 && $numeric_index < count($options)) $correct_answer_index = $numeric_index; }
        if ($correct_answer_index === false && strlen($answer_column_value) === 1 && ctype_alpha($answer_column_value)) { $letter_index = ord(strtoupper($answer_column_value)) - ord('A'); if ($letter_index >= 0 && $letter_index < count($options)) $correct_answer_index = $letter_index; }
        if ($correct_answer_index === false) { $found_index = array_search(strtolower($answer_column_value), array_map('strtolower', $options)); if ($found_index !== false) $correct_answer_index = $found_index; }
        
        if ($correct_answer_index === false) { $skipped_rows++; mco_debug_log('Skipping row #' . ($line_num + 2) . '. Reason: Could not determine correct answer from value: "' . $answer_column_value . '".'); continue; }
        
        $questions[] = ['id' => count($questions) + 1, 'question' => $question_text, 'options' => $options, 'correctAnswer' => $correct_answer_index + 1];
    }
    if (empty($questions)) { $error_message = 'No valid questions could be parsed from the source. Processed ' . $total_rows . ' rows and skipped all of them. Please check your sheet formatting (each option in its own column) and enable MCO_DEBUG in wp-config.php to see detailed logs.'; return new WP_Error('parse_failed', $error_message, ['status' => 500]); }
    shuffle($questions); $selected_questions = array_slice($questions, 0, $count);
    $final_questions = []; foreach($selected_questions as $index => $q) { $q['id'] = $index + 1; $final_questions[] = $q; }
    return new WP_REST_Response($final_questions, 200);
}

// --- HELPER FOR REVIEW LOGIC ---
function mco_get_cert_sku_for_exam($exam_id) {
    $practice_to_cert_map = [
        'exam-cpc-practice' => 'exam-cpc-cert', 'exam-cca-practice' => 'exam-cca-cert',
        'exam-billing-practice' => 'exam-billing-cert', 'exam-ccs-practice' => 'exam-ccs-cert',
        'exam-risk-practice' => 'exam-risk-cert', 'exam-icd-practice' => 'exam-icd-cert',
        'exam-cpb-practice' => 'exam-cpb-cert', 'exam-crc-practice' => 'exam-crc-cert',
        'exam-cpma-practice' => 'exam-cpma-cert', 'exam-coc-practice' => 'exam-coc-cert',
        'exam-cic-practice' => 'exam-cic-cert', 'exam-mta-practice' => 'exam-mta-cert',
        'exam-ap-practice' => 'exam-ap-cert', 'exam-em-practice' => 'exam-em-cert',
        'exam-rcm-practice' => 'exam-rcm-cert', 'exam-hi-practice' => 'exam-hi-cert',
        'exam-mcf-practice' => 'exam-mcf-cert',
    ];
    return isset($practice_to_cert_map[$exam_id]) ? $practice_to_cert_map[$exam_id] : $exam_id;
}

// --- NEW REVIEW ENDPOINT ---
function mco_exam_submit_review_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $params = $request->get_json_params();
    $exam_id = isset($params['examId']) ? sanitize_text_field($params['examId']) : '';
    $rating = isset($params['rating']) ? intval($params['rating']) : 0;

    if (empty($exam_id) || $rating < 1 || $rating > 5) {
        return new WP_Error('invalid_data', 'Missing or invalid data provided for review.', ['status' => 400]);
    }
    
    $cert_sku = mco_get_cert_sku_for_exam($exam_id);
    if (empty($cert_sku)) {
         return new WP_Error('exam_not_found', 'Could not find a product associated with this exam ID.', ['status' => 404]);
    }

    $product_id = wc_get_product_id_by_sku($cert_sku);
    if (!$product_id) return new WP_Error('product_not_found', 'WooCommerce product not found for SKU: ' . $cert_sku, ['status' => 404]);

    $ratings = get_post_meta($product_id, '_mco_exam_ratings', true) ?: [];
    $ratings[] = $rating;
    $count = count($ratings);
    $avg = $count > 0 ? round(array_sum($ratings) / $count, 2) : 0;
    
    update_post_meta($product_id, '_mco_exam_ratings', $ratings);
    update_post_meta($product_id, '_mco_exam_avg_rating', $avg);
    update_post_meta($product_id, '_mco_exam_review_count', $count);
    delete_transient('mco_exam_prices_v4'); // Clear cache on new review

    return new WP_REST_Response(['success' => true], 200);
}

// --- NEW DEBUG ENDPOINT ---
function mco_get_debug_details_callback($request) {
    if (!user_can((int)$request->get_param('jwt_user_id'), 'administrator')) return new WP_Error('forbidden', 'Admin permission required.', ['status' => 403]);
    $user_id = (int)$request->get_param('jwt_user_id');
    $payload = mco_exam_get_payload($user_id);
    $results = get_user_meta($user_id, 'mco_exam_results', true) ?: [];

    return new WP_REST_Response([
        'user' => $payload['user'],
        'purchases' => $payload['paidExamIds'],
        'results' => array_values($results)
    ], 200);
}

// --- NEW WHEEL OF FORTUNE ENDPOINT ---
function mco_spin_wheel_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $is_admin = user_can($user_id, 'administrator');

    $spins = get_user_meta($user_id, 'mco_spins_available', true);
    if ($spins === '') $spins = 1;
    if (!$is_admin && intval($spins) <= 0) {
        return new WP_Error('no_spins', 'You have no spins available.', ['status' => 403]);
    }
    
    $prizes = [
        ['id' => 'SUB_YEARLY', 'label' => 'Annual Subscription', 'weight' => 0.5],
        ['id' => 'SUB_MONTHLY', 'label' => 'Monthly Subscription', 'weight' => 1.5],
        ['id' => 'SUB_WEEKLY', 'label' => 'Weekly Subscription', 'weight' => 15],
        ['id' => 'EXAM_CPC', 'label' => 'Free CPC Exam', 'weight' => 4],
        ['id' => 'EXAM_CCA', 'label' => 'Free CCA Exam', 'weight' => 4],
        ['id' => 'NEXT_TIME', 'label' => 'Better Luck Next Time', 'weight' => 75],
    ];

    $total_weight = array_sum(array_column($prizes, 'weight'));
    $rand = mt_rand(1, (int)($total_weight * 100)) / 100.0;
    
    $cumulative_weight = 0;
    $chosen_prize = end($prizes);
    foreach ($prizes as $prize) {
        $cumulative_weight += $prize['weight'];
        if ($rand <= $cumulative_weight) { $chosen_prize = $prize; break; }
    }
    
    if ($chosen_prize['id'] !== 'NEXT_TIME') {
        mco_grant_prize_logic($user_id, $chosen_prize['id']);
        update_user_meta($user_id, 'mco_wheel_prize', ['prizeId' => $chosen_prize['id'], 'prizeLabel' => $chosen_prize['label']]);
    }
    
    if (!$is_admin) update_user_meta($user_id, 'mco_spins_available', intval($spins) - 1);
    
    return new WP_REST_Response(['prizeId' => $chosen_prize['id'], 'prizeLabel' => $chosen_prize['label'], 'newToken' => mco_generate_exam_jwt($user_id)], 200);
}

function mco_grant_prize_logic($user_id, $prize_id) {
    $current_expiry = get_user_meta($user_id, 'mco_subscription_expiry', true) ?: time();
    if ($prize_id === 'SUB_YEARLY') update_user_meta($user_id, 'mco_subscription_expiry', $current_expiry + YEAR_IN_SECONDS);
    if ($prize_id === 'SUB_MONTHLY') update_user_meta($user_id, 'mco_subscription_expiry', $current_expiry + MONTH_IN_SECONDS);
    if ($prize_id === 'SUB_WEEKLY') update_user_meta($user_id, 'mco_subscription_expiry', $current_expiry + WEEK_IN_SECONDS);

    if ($prize_id === 'EXAM_CPC' || $prize_id === 'EXAM_CCA') {
        $sku = ($prize_id === 'EXAM_CPC') ? 'exam-cpc-cert' : 'exam-cca-cert';
        $granted = get_user_meta($user_id, 'mco_granted_skus', true) ?: [];
        if (!in_array($sku, $granted)) { $granted[] = $sku; update_user_meta($user_id, 'mco_granted_skus', $granted); }
    }
}

// --- NEW ADMIN ENDPOINTS ---
function mco_add_spins_callback($request) {
    if (!user_can((int)$request->get_param('jwt_user_id'), 'administrator')) return new WP_Error('forbidden', 'Admin permission required.', ['status' => 403]);
    $params = $request->get_json_params();
    $target_user_id = isset($params['userId']) ? intval($params['userId']) : 0;
    $spins_to_add = isset($params['spins']) ? intval($params['spins']) : 0;
    if ($target_user_id <= 0 || !$user = get_userdata($target_user_id)) return new WP_Error('user_not_found', 'Target user not found.', ['status' => 404]);
    $current_spins = get_user_meta($target_user_id, 'mco_spins_available', true) ?: 0;
    update_user_meta($target_user_id, 'mco_spins_available', intval($current_spins) + $spins_to_add);
    return new WP_REST_Response(['success' => true], 200);
}
function mco_grant_prize_callback($request) {
    if (!user_can((int)$request->get_param('jwt_user_id'), 'administrator')) return new WP_Error('forbidden', 'Admin permission required.', ['status' => 403]);
    $params = $request->get_json_params();
    $target_user_id = isset($params['userId']) ? intval($params['userId']) : 0;
    $prize_id = isset($params['prizeId']) ? sanitize_text_field($params['prizeId']) : '';
    if ($target_user_id <= 0 || !$user = get_userdata($target_user_id)) return new WP_Error('user_not_found', 'Target user not found.', ['status' => 404]);
    mco_grant_prize_logic($target_user_id, $prize_id);
    return new WP_REST_Response(['success' => true], 200);
}
function mco_search_user_callback($request) {
    if (!user_can((int)$request->get_param('jwt_user_id'), 'administrator')) return new WP_Error('forbidden', 'Admin permission required.', ['status' => 403]);
    $params = $request->get_json_params();
    $search_term = isset($params['searchTerm']) ? sanitize_text_field($params['searchTerm']) : '';
    $user_query = new WP_User_Query(['search' => '*' . esc_attr($search_term) . '*', 'search_columns' => ['user_login', 'user_email', 'display_name'], 'number' => 10]);
    $users = [];
    foreach ($user_query->get_results() as $user) $users[] = ['id' => (string)$user->ID, 'name' => $user->display_name, 'email' => $user->user_email];
    return new WP_REST_Response($users, 200);
}
function mco_reset_spins_callback($request) {
    if (!user_can((int)$request->get_param('jwt_user_id'), 'administrator')) return new WP_Error('forbidden', 'Admin permission required.', ['status' => 403]);
    $params = $request->get_json_params();
    $target_user_id = isset($params['userId']) ? intval($params['userId']) : 0;
    if ($target_user_id <= 0 || !$user = get_userdata($target_user_id)) return new WP_Error('user_not_found', 'Target user not found.', ['status' => 404]);
    update_user_meta($target_user_id, 'mco_spins_available', 0);
    return new WP_REST_Response(['success' => true], 200);
}
function mco_remove_prize_callback($request) {
    if (!user_can((int)$request->get_param('jwt_user_id'), 'administrator')) return new WP_Error('forbidden', 'Admin permission required.', ['status' => 403]);
    $params = $request->get_json_params();
    $target_user_id = isset($params['userId']) ? intval($params['userId']) : 0;
    if ($target_user_id <= 0 || !$user = get_userdata($target_user_id)) return new WP_Error('user_not_found', 'Target user not found.', ['status' => 404]);
    delete_user_meta($target_user_id, 'mco_wheel_prize');
    delete_user_meta($target_user_id, 'mco_subscription_expiry');
    return new WP_REST_Response(['success' => true], 200);
}


// --- SHORTCODES & FORMS ---
function mco_exam_user_details_shortcode() { if (!is_user_logged_in()) return '<p>Please log in.</p>'; $user_id = get_current_user_id(); $user = get_userdata($user_id); ob_start(); ?>
    <div class="mco-user-details">
        <p><strong>User ID:</strong> <?php echo esc_html($user_id); ?></p>
        <p><strong>Synced Results:</strong></p>
        <?php $results = get_user_meta($user_id, 'mco_exam_results', true); if (!empty($results)) { echo '<ul>'; foreach ($results as $res) echo '<li>' . esc_html($res['examId']) . ': ' . esc_html($res['score']) . '%</li>'; echo '</ul>'; } else { echo '<p>No results.</p>'; } ?>
    </div> <?php return ob_get_clean();
}

function mco_get_exam_programs_data() {
    return [
        ['name' => 'CPC Exam Program', 'description' => 'This comprehensive exam tests your mastery of CPT, HCPCS Level II, and ICD-10-CM coding for physician services. Prove your readiness for the official AAPC CPC credential.', 'practice_id' => 'exam-cpc-practice', 'cert_sku' => 'exam-cpc-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 240]],
        ['name' => 'CCA Exam Program', 'description' => 'Demonstrate your competency in coding patient data across all settings, including hospitals and physician practices. A crucial step towards achieving your AHIMA CCA certification.', 'practice_id' => 'exam-cca-practice', 'cert_sku' => 'exam-cca-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 115, 'passScore' => 70, 'durationMinutes' => 120]],
        ['name' => 'Medical Billing Program', 'description' => 'Validate your expertise in the entire medical billing process, from patient registration and claim submission to payment posting and collections. Ideal for aspiring billing specialists.', 'practice_id' => 'exam-billing-practice', 'cert_sku' => 'exam-billing-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 180]],
        ['name' => 'CCS Exam Program', 'description' => 'Showcase your advanced skills in classifying medical data from patient records, particularly in hospital settings. Prepares you for the rigorous AHIMA CCS credential.', 'practice_id' => 'exam-ccs-practice', 'cert_sku' => 'exam-ccs-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 240]],
        ['name' => 'Risk Adjustment Program', 'description' => 'Master the principles of risk adjustment coding. This exam evaluates your ability to accurately assign ICD-10-CM codes to reflect patient health status for proper reimbursement.', 'practice_id' => 'exam-risk-practice', 'cert_sku' => 'exam-risk-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 180]],
        ['name' => 'ICD-10-CM Program', 'description' => 'An in-depth assessment of your ability to accurately use the ICD-10-CM code set for diagnosis coding across various healthcare settings. Perfect for validating your specialized skills.', 'practice_id' => 'exam-icd-practice', 'cert_sku' => 'exam-icd-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 180]],
        ['name' => 'CPB Exam Program', 'description' => 'Prove your proficiency in all aspects of medical billing, including claim processing, denials management, and compliance. Aligns with the AAPC CPB certification standards.', 'practice_id' => 'exam-cpb-practice', 'cert_sku' => 'exam-cpb-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 240]],
        ['name' => 'CRC Exam Program', 'description' => 'This exam validates your expertise in risk adjustment (HCC) models. It tests your ability to link diagnoses to chronic conditions for accurate risk score calculation.', 'practice_id' => 'exam-crc-practice', 'cert_sku' => 'exam-crc-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 240]],
        ['name' => 'CPMA Exam Program', 'description' => 'Demonstrate your skills in medical auditing and compliance. This exam covers documentation guidelines, coding standards, and risk analysis for the AAPC CPMA credential.', 'practice_id' => 'exam-cpma-practice', 'cert_sku' => 'exam-cpma-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 240]],
        ['name' => 'COC Exam Program', 'description' => 'Test your knowledge of outpatient coding, including CPT, ICD-10-CM, and HCPCS Level II, as it applies to hospital outpatient departments and ambulatory surgery centers.', 'practice_id' => 'exam-coc-practice', 'cert_sku' => 'exam-coc-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 240]],
        ['name' => 'CIC Exam Program', 'description' => 'This exam assesses your ability to assign accurate codes for diagnoses and procedures in the inpatient hospital setting, covering ICD-10-CM and ICD-10-PCS.', 'practice_id' => 'exam-cic-practice', 'cert_sku' => 'exam-cic-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 75, 'passScore' => 70, 'durationMinutes' => 150]],
        ['name' => 'MTA Program', 'description' => 'A foundational exam to certify your understanding of the medical language and human body systems that are essential for accurate coding.', 'practice_id' => 'exam-mta-practice', 'cert_sku' => 'exam-mta-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 120]],
        ['name' => 'Anatomy & Physiology Program', 'description' => 'Validate your comprehensive knowledge of human anatomy and physiology, a core competency for any medical coding or healthcare professional.', 'practice_id' => 'exam-ap-practice', 'cert_sku' => 'exam-ap-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 120]],
        ['name' => 'E/M Coding Program', 'description' => 'Demonstrate your expertise in the complex world of Evaluation and Management (E/M) coding, including the latest guidelines for office visits and other services.', 'practice_id' => 'exam-em-practice', 'cert_sku' => 'exam-em-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 50, 'passScore' => 70, 'durationMinutes' => 90]],
        ['name' => 'Revenue Cycle Management Program', 'description' => 'This comprehensive exam covers all stages of the healthcare revenue cycle, from patient access and charge capture to claims management and analytics.', 'practice_id' => 'exam-rcm-practice', 'cert_sku' => 'exam-rcm-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 120]],
        ['name' => 'Health Informatics Program', 'description' => 'Test your understanding of health informatics principles, including data standards, electronic health records (EHRs), and data analytics in healthcare.', 'practice_id' => 'exam-hi-practice', 'cert_sku' => 'exam-hi-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 120]],
        ['name' => 'Medical Coding Fundamentals Program', 'description' => 'Establish your grasp of the essential principles of medical coding. This exam covers foundational concepts that are crucial for a successful career in the field.', 'practice_id' => 'exam-mcf-practice', 'cert_sku' => 'exam-mcf-cert', 'practice_exam' => ['numberOfQuestions' => 25, 'passScore' => 70, 'durationMinutes' => 60], 'cert_exam' => ['numberOfQuestions' => 100, 'passScore' => 70, 'durationMinutes' => 120]],
    ];
}

function mco_get_suggested_books_data() {
    return [
        ['id' => 'book-cpc-guide', 'title' => 'Official CPC® Certification Study Guide', 'description' => "AAPC's official CPC exam study guide — anatomy, medical terminology, ICD-10-CM, CPT, HCPCS, practice questions and exam tips.", 'links' => ['com' => 'https://www.amazon.com/s?k=Official+CPC+Certification+Study+Guide&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Official+CPC+Certification+Study+Guide&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Official+CPC+Certification+Study+Guide&tag=medical0f1-21']],
        ['id' => 'book-icd10-cm', 'title' => "Buck's ICD-10-CM for Physicians", 'description' => "Physician-focused ICD-10-CM code manual with full-color illustrations, Netter's Anatomy, and detailed guidelines.", 'links' => ['com' => 'https://www.amazon.com/s?k=Buck%27s+ICD-10-CM+for+Physicians&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Buck%27s+ICD-10-CM+for+Physicians&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Buck%27s+ICD-10-CM+for+Physicians&tag=medical0f1-21']],
        ['id' => 'book-cpt-pro', 'title' => 'AMA CPT® Professional', 'description' => 'The official Current Procedural Terminology (CPT) codebook from the American Medical Association, essential for every coder.', 'links' => ['com' => 'https://www.amazon.com/s?k=AMA+CPT+Professional&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=AMA+CPT+Professional&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=AMA+CPT+Professional&tag=medical0f1-21']],
        ['id' => 'book-hcpcs-level2', 'title' => 'HCPCS Level II Professional', 'description' => 'Comprehensive guide for HCPCS Level II codes used for supplies, equipment, and drugs administered by physicians.', 'links' => ['com' => 'https://www.amazon.com/s?k=HCPCS+Level+II+Professional&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=HCPCS+Level+II+Professional&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=HCPCS+Level+II+Professional&tag=medical0f1-21']],
        ['id' => 'book-medical-billing', 'title' => 'Medical Billing & Coding For Dummies', 'description' => 'An easy-to-understand guide covering the basics of medical billing and coding, perfect for beginners.', 'links' => ['com' => 'https://www.amazon.com/dp/1119625440?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1119625440?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1119625440?tag=medical0f1-21']],
        ['id' => 'book-step-by-step', 'title' => 'Step-by-Step Medical Coding, 2025 Edition', 'description' => 'This guide provides a solid foundation with a practical approach to mastering medical coding concepts and applications.', 'links' => ['com' => 'https://www.amazon.com/dp/0443248788?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/0443248788?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/0443248788?tag=medical0f1-21']],
        ['id' => 'book-anatomy-physiology', 'title' => 'Anatomy & Physiology for Coders', 'description' => 'A focused guide on anatomy and physiology tailored specifically for medical coding professionals to improve accuracy.', 'links' => ['com' => 'https://www.amazon.com/dp/0133015254?tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Anatomy+Physiology+for+Coders&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Anatomy+Physiology+for+Coders&tag=medical0f1-21']],
        ['id' => 'book-terminology-dummies', 'title' => 'Medical Terminology For Dummies', 'description' => 'Break down complex medical terms into simple, understandable parts. An essential resource for new coders.', 'links' => ['com' => 'https://www.amazon.com/dp/1119625475?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1119625475?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1119625475?tag=medical0f1-21']],
        ['id' => 'book-icd10-pcs', 'title' => 'ICD-10-PCS: An Applied Approach', 'description' => 'Master inpatient procedural coding with this comprehensive guide to the ICD-10-PCS system, full of exercises.', 'links' => ['com' => 'https://www.amazon.com/dp/1584268247?tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=ICD-10-PCS+An+Applied+Approach&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=ICD-10-PCS+An+Applied+Approach&tag=medical0f1-21']],
        ['id' => 'book-risk-adjustment', 'title' => 'Risk Adjustment Documentation & Coding', 'description' => 'A deep dive into risk adjustment models (HCC) and the documentation required for accurate coding and reimbursement.', 'links' => ['com' => 'https://www.amazon.com/dp/1640161635?tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Risk+Adjustment+Documentation+Coding&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Risk+Adjustment+Documentation+Coding&tag=medical0f1-21']],
        ['id' => 'book-auditing', 'title' => 'The Medical Auditing Handbook', 'description' => 'Learn the principles of medical coding auditing to ensure compliance, accuracy, and prevent fraud and abuse.', 'links' => ['com' => 'https://www.amazon.com/s?k=Medical+Auditing+Handbook&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Medical+Auditing+Handbook&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Medical+Auditing+Handbook&tag=medical0f1-21']],
        ['id' => 'book-compliance', 'title' => "Healthcare Compliance Professional's Manual", 'description' => 'A complete guide to navigating the complex world of healthcare compliance, including HIPAA and OIG work plans.', 'links' => ['com' => 'https://www.amazon.com/dp/1543816657?tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Healthcare+Compliance+Professional+Manual&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Healthcare+Compliance+Professional+Manual&tag=medical0f1-21']],
        ['id' => 'book-em-coding', 'title' => 'Evaluation and Management (E/M) Coding', 'description' => 'Master the complexities of E/M coding with the latest 2024 guidelines and real-world case studies.', 'links' => ['com' => 'https://www.amazon.com/s?k=Evaluation+and+Management+Coding&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Evaluation+and+Management+Coding&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Evaluation+and+Management+Coding&tag=medical0f1-21']],
        ['id' => 'book-outpatient', 'title' => 'Outpatient CDI and Coding', 'description' => 'Focuses on the unique challenges of clinical documentation improvement and coding in the outpatient setting.', 'links' => ['com' => 'https://www.amazon.com/s?k=clinical+documentation+improvemen&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=clinical+documentation+improvemen&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=clinical+documentation+improvemen&tag=medical0f1-21']],
        ['id' => 'book-profee', 'title' => 'Principles of Physician-Based Coding', 'description' => 'A guide to professional fee coding, covering CPT, ICD-10-CM, and HCPCS for physician services.', 'links' => ['com' => 'https://www.amazon.com/dp/1584263458?tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Principles+of+Physician-Based+Coding&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Principles+of+Physician-Based+Coding&tag=medical0f1-21']],
        ['id' => 'book-revenue-cycle', 'title' => 'The Revenue Cycle Handbook', 'description' => 'Explore the entire revenue cycle management process, from patient registration to final payment.', 'links' => ['com' => 'https://www.amazon.com/s?k=Revenue+Cycle+Handbook&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Revenue+Cycle+Handbook&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Revenue+Cycle+Handbook&tag=medical0f1-21']],
        ['id' => 'book-pharma', 'title' => 'Pharmaceutical and Medical Device Coding', 'description' => 'A specialty guide for coding related to pharmaceuticals, biologics, and medical devices.', 'links' => ['com' => 'https://www.amazon.com/s?k=Pharmaceutical+and+Medical+Device+Coding&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Pharmaceutical+and+Medical+Device+Coding&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Pharmaceutical+and+Medical+Device+Coding&tag=medical0f1-21']],
        ['id' => 'book-dental', 'title' => 'Dental Coding with Confidence', 'description' => 'Master CDT codes for accurate dental billing and claim submission with this comprehensive guide.', 'links' => ['com' => 'https://www.amazon.com/dp/1737394715?tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Dental+Coding+with+Confidence&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Dental+Coding+with+Confidence&tag=medical0f1-21']],
        ['id' => 'book-informatics', 'title' => 'Health Informatics: A Practical Approach', 'description' => 'An introduction to health informatics, covering data standards, EHRs, and the role of data in healthcare.', 'links' => ['com' => 'https://www.amazon.com/s?k=Health+Informatics+A+Practical+Approach&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Health+Informatics+A+Practical+Approach&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Health+Informatics+A+Practical+Approach&tag=medical0f1-21']],
        ['id' => 'book-career', 'title' => "The Medical Coder's Career Guide", 'description' => 'A guide to building a successful career in medical coding, from certification to specialization and management.', 'links' => ['com' => 'https://www.amazon.com/s?k=Medical+Coders+Career+Guide&tag=mykada-20', 'in' => 'https://www.amazon.in/s?k=Medical+Coders+Career+Guide&tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/s?k=Medical+Coders+Career+Guide&tag=medical0f1-21']],
    ];
}

function mco_render_stars_html($rating, $count) {
    if ($count == 0) return '';
    $rating = floatval($rating);
    $full_stars = floor($rating);
    $half_star = ($rating - $full_stars) >= 0.5 ? 1 : 0;
    $empty_stars = 5 - $full_stars - $half_star;
    $html = '<div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">';
    $html .= '<div style="display: flex; align-items: center;">';
    $star_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>';
    $empty_star_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #d1d5db;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>';
    for ($i = 0; $i < $full_stars; $i++) $html .= $star_svg;
    if ($half_star) $html .= '<div style="position:relative; width: 16px; height: 16px;">' . $star_svg . '<div style="position:absolute; top:0; left:0; width:50%; height:100%; overflow:hidden;">' . $empty_star_svg . '</div></div>';
    for ($i = 0; $i < $empty_stars; $i++) $html .= $empty_star_svg;
    $html .= '</div>';
    $html .= '<span style="font-size: 0.75rem; color: #6b7280;">(' . esc_html($count) . ' reviews)</span>';
    $html .= '</div>';
    return $html;
}

function mco_exam_showcase_shortcode() {
    $exam_programs = mco_get_exam_programs_data();
    $is_wc_active = class_exists('WooCommerce');
    
    // SVG icons
    $icon_book_open = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
    $icon_book_up = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M12 7V2"/><path d="m15 4-3-3-3 3"/></svg>';
    $icon_flask = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.31V2"/><path d="M8.5 2h7"/><path d="M14 9.31C16.58 10.45 18 12.92 18 16a6 6 0 0 1-12 0c0-3.08 1.42-5.55 4-6.69"/><path d="M8.5 14h7"/></svg>';
    $icon_trophy = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M9.17 9C8.42 9.62 7.5 11.11 7.5 13.5V15h9v-1.5c0-2.39-.92-3.88-1.67-4.5"/><path d="M12 2C6.5 2 3 5.5 3 10.5c0 2.22.84 4.24 2.25 5.5h13.5c1.4-1.26 2.25-3.28 2.25-5.5C21 5.5 17.5 2 12 2z"/></svg>';
    $icon_cart = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.16"/></svg>';
    $icon_list = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>';
    $icon_clock = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    $icon_target = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
    $icon_repeat = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>';
    $icon_zap = '<svg class="mco-svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';

    ob_start(); ?>
    <div class="mco-intro-content" style="text-align: center; max-width: 800px; margin: 2rem auto 3rem; font-family: sans-serif; color: #374151;">
        <h2 style="font-size: 2.25rem; font-weight: 800; color: #111827; margin-bottom: 1rem;">Welcome to the Exam Portal</h2>
        <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563;">Your journey to certification starts here. Below you'll find our exam programs. Start with a free practice exam, purchase a certification exam, or subscribe for the best value.</p>
    </div>
    <style>
        .mco-page-layout { display: grid; grid-template-columns: 1fr; gap: 2rem; font-family: sans-serif; }
        @media (min-width: 1024px) { .mco-page-layout { grid-template-columns: 2fr 1fr; } }
        .mco-main-content .mco-showcase-container { display: flex; flex-direction: column; gap: 2rem; }
        .mco-program-card { background: #fff; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -2px rgba(0,0,0,.05); border: 1px solid #e5e7eb; }
        .mco-program-card h3 { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; color: #1f2937; }
        .mco-program-card .mco-program-description { font-size: 0.875rem; line-height: 1.25rem; color: #6b7280; margin-top: 0.25rem; margin-bottom: 1rem; }
        .mco-subcards-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
        @media (min-width: 768px) { .mco-subcards-grid { grid-template-columns: repeat(3, 1fr); } }
        .mco-subcard { display: flex; flex-direction: column; justify-content: space-between; padding: 1rem; background-color: #f8fafc; border-radius: 0.5rem; border: 1px solid #e5e7eb; height: 100%; }
        .mco-subcard-bundle { background-color: #ecfeff; border-color: #a5f3fc; }
        .mco-subcard .mco-subcard-content { flex-grow: 1; }
        .mco-subcard h4 { font-weight: 600; color: #334155; display: flex; align-items: center; gap: 0.5rem; }
        .mco-subcard ul { list-style: none; padding: 0; margin: 0.5rem 0 0; font-size: 0.75rem; color: #4b5563; }
        .mco-subcard ul li { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
        .mco-subcard-price { margin-top: 0.5rem; margin-bottom: 0.5rem; text-align: center; }
        .mco-price-current { font-size: 1.5rem; font-weight: 700; color: #166534; }
        .mco-price-regular { font-size: 0.875rem; color: #6b7280; text-decoration: line-through; margin-left: 0.5rem; }
        .mco-subcard-btn { margin-top: 0.75rem; width: 100%; display: flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.5rem; transition: background-color 0.2s; gap: 0.5rem; }
        .mco-btn-practice { background-color: #475569; color: white; } .mco-btn-practice:hover { background-color: #334155; }
        .mco-btn-purchase { background-color: #f59e0b; color: white; font-size: 0.875rem; } .mco-btn-purchase:hover { background-color: #d97706; }
        .mco-btn-bundle { background-color: #0891b2; color: white; font-size: 0.875rem; } .mco-btn-bundle:hover { background-color: #0e7490; }
        .mco-sidebar .mco-bookshelf { background: #fff; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -2px rgba(0,0,0,.05); border: 1px solid #e5e7eb; }
        .mco-bookshelf h3 { font-size: 1.25rem; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .mco-bookshelf .mco-book-card { background: #fff; border-radius: 0.5rem; overflow: hidden; border: 1px solid #e5e7eb; transition: transform 0.2s; margin-bottom: 1.5rem; }
        .mco-bookshelf .mco-book-card:hover { transform: translateY(-4px); }
        .mco-book-cover { height: 8rem; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 1rem; text-align: center; overflow: hidden; }
        .mco-book-cover .mco-book-title { font-weight: 700; font-size: 0.875rem; line-height: 1.2; z-index: 10; }
        .mco-book-cover .mco-book-accent { width: 33.33%; height: 0.25rem; border-radius: 9999px; z-index: 10; }
        .mco-book-cover .mco-circle { position: absolute; border-radius: 9999px; opacity: 0.5; }
        .mco-book-card .mco-book-details { padding: 1rem; }
        .mco-book-card .mco-book-details h4 { font-weight: 700; color: #1f2937; font-size: 0.875rem; margin-bottom: 0.5rem; }
        .mco-book-card .mco-book-buy-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.875rem; color: #fff; background-color: #f59e0b; font-weight: 600; border-radius: 0.375rem; padding: 0.5rem 0.75rem; text-decoration: none; transition: background-color 0.2s; }
        .mco-book-card .mco-book-buy-btn:hover { background-color: #d97706; }
        .mco-svg-icon { display: inline-block; width: 16px; height: 16px; vertical-align: middle; }
    </style>
    <div class="mco-page-layout">
        <main class="mco-main-content">
            <div class="mco-showcase-container">
                <?php if ($is_wc_active) {
                    $monthly_product = wc_get_product(wc_get_product_id_by_sku('sub-monthly'));
                    $yearly_product = wc_get_product(wc_get_product_id_by_sku('sub-yearly')); ?>
                    <div style="margin-bottom: 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                        <?php if ($monthly_product): ?>
                        <div style="background: linear-gradient(to bottom right, #22d3ee, #0ea5e9); color: white; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
                            <h3 style="font-size: 1.25rem; font-weight: 700;">Monthly Subscription</h3>
                            <p style="margin-top: 1rem; color: rgba(255,255,255,0.8); flex-grow: 1;">Unlimited practice & AI feedback.</p>
                            <div style="margin-top: 1.5rem; display: flex; align-items: baseline; gap: 0.5rem;"><span style="font-size: 2.25rem; font-weight: 800;"><?php echo $monthly_product->get_price_html(); ?></span><span style="font-weight: 500; color: rgba(255,255,255,0.8);">/month</span></div>
                            <a href="<?php echo esc_url($monthly_product->add_to_cart_url()); ?>" class="mco-subcard-btn" style="margin-top: 2rem; background: white; color: #0891b2;">Subscribe Now</a>
                        </div>
                        <?php endif; ?>
                        <?php if ($yearly_product): ?>
                        <div style="background: linear-gradient(to bottom right, #a855f7, #4f46e5); color: white; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column; position: relative;">
                            <div style="position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); background: #facc15; color: #78350f; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 9999px;">Best Value</div>
                            <h3 style="font-size: 1.25rem; font-weight: 700;">Yearly Subscription</h3>
                            <p style="margin-top: 1rem; color: rgba(255,255,255,0.8); flex-grow: 1;">Save over 35% with annual billing.</p>
                            <div style="margin-top: 1.5rem; display: flex; align-items: baseline; gap: 0.5rem;"><span style="font-size: 2.25rem; font-weight: 800;"><?php echo $yearly_product->get_price_html(); ?></span><span style="font-weight: 500; color: rgba(255,255,255,0.8);">/year</span></div>
                            <a href="<?php echo esc_url($yearly_product->add_to_cart_url()); ?>" class="mco-subcard-btn" style="margin-top: 2rem; background: white; color: #6d28d9;">Subscribe & Save</a>
                        </div>
                        <?php endif; ?>
                    </div>
                <?php } ?>
                <?php foreach ($exam_programs as $program):
                    foreach (['cert_exam', 'practice_exam'] as $exam_type) {
                        if (isset($program[$exam_type]['bundle_sku']) && !isset($program['bundle_sku'])) {
                            $program['bundle_sku'] = $program[$exam_type]['bundle_sku'];
                        }
                    }
                    if (!isset($program['bundle_sku'])) {
                        $program['bundle_sku'] = $program['cert_sku'] . '-1mo-addon';
                        if ($program['cert_sku'] === 'exam-cpc-cert') $program['bundle_sku'] = 'exam-cpc-cert-1';
                        if ($program['cert_sku'] === 'exam-cca-cert') $program['bundle_sku'] = 'exam-cca-cert-bundle';
                    }
                    $is_popular = $program['cert_sku'] === 'exam-cpc-cert';

                    $card_style = $is_popular 
                        ? 'position: relative; background: linear-gradient(to bottom right, #fffbeb, #ffedd5, #fef3c7); border: 1px solid #fcd34d;' 
                        : 'position: relative;';

                    $badge_style = $is_popular
                        ? 'background: linear-gradient(to right, #ef4444, #f97316); color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1);'
                        : '';

                    $subcard_style = $is_popular ? 'background-color: #fffbeb; border: 1px solid #fde68a;' : '';
                    $bundle_subcard_style = $is_popular ? 'background-color: #fef3c7; border: 1px solid #fcd34d;' : 'background-color: #ecfeff; border: 1px solid #a5f3fc;';
                    $divider_style = $is_popular ? 'border-top: 1px solid #fde68a;' : 'border-top: 1px solid #e5e7eb;';
                    ?>
                    <div class="mco-program-card" style="<?php echo $card_style; ?>">
                        <?php if ($is_popular): ?>
                            <div style="position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); z-index: 10;">
                                <div style="<?php echo $badge_style; ?> font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 0.25rem 0.75rem; border-radius: 9999px; display: flex; align-items: center; gap: 0.25rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                                    <span>Most Popular</span>
                                </div>
                            </div>
                        <?php endif; ?>
                        <h3><?php echo esc_html($program['name']); ?></h3>
                        <?php if ($is_wc_active) { $product_id = wc_get_product_id_by_sku($program['cert_sku']); if ($product_id) { echo mco_render_stars_html(get_post_meta($product_id, '_mco_exam_avg_rating', true), get_post_meta($product_id, '_mco_exam_review_count', true)); } } ?>
                        <p class="mco-program-description"><?php echo esc_html($program['description']); ?></p>
                        <div class="mco-subcards-grid" style="<?php echo $divider_style; ?> padding-top: 1rem;">
                            
                            <div class="mco-subcard" style="<?php echo $subcard_style; ?>">
                                <div class="mco-subcard-content">
                                    <h4><?php echo $icon_flask; ?> Free Practice Exam</h4>
                                    <ul>
                                        <li><?php echo $icon_list; ?> <?php echo esc_html($program['practice_exam']['numberOfQuestions']); ?> questions</li>
                                        <li><?php echo $icon_clock; ?> <?php echo esc_html($program['practice_exam']['durationMinutes']); ?> minutes</li>
                                        <li><?php echo $icon_target; ?> <?php echo esc_html($program['practice_exam']['passScore']); ?>% pass score</li>
                                    </ul>
                                </div>
                                <a href="<?php echo esc_url(MCO_EXAM_APP_URL . '#/test/' . $program['practice_id']); ?>" class="mco-subcard-btn mco-btn-practice"><?php echo $icon_zap; ?> Start Practice</a>
                            </div>
                            
                            <div class="mco-subcard" style="<?php echo $subcard_style; ?>">
                                <div class="mco-subcard-content">
                                    <h4><?php echo $icon_trophy; ?> Certification Exam</h4>
                                    <ul>
                                        <li><?php echo $icon_list; ?> <?php echo esc_html($program['cert_exam']['numberOfQuestions']); ?> questions</li>
                                        <li><?php echo $icon_clock; ?> <?php echo esc_html($program['cert_exam']['durationMinutes']); ?> minutes</li>
                                        <li><?php echo $icon_target; ?> <?php echo esc_html($program['cert_exam']['passScore']); ?>% passing score</li>
                                        <li><?php echo $icon_repeat; ?> 3 attempts included</li>
                                    </ul>
                                </div>
                                <?php if ($is_wc_active && ($product = wc_get_product(wc_get_product_id_by_sku($program['cert_sku'])))): ?>
                                    <div class="mco-subcard-price">
                                        <?php if ($product->is_on_sale()): ?>
                                            <span class="mco-price-current"><?php echo wc_price($product->get_sale_price()); ?></span>
                                            <span class="mco-price-regular"><?php echo wc_price($product->get_regular_price()); ?></span>
                                        <?php else: ?>
                                            <span class="mco-price-current"><?php echo wc_price($product->get_price()); ?></span>
                                        <?php endif; ?>
                                    </div>
                                    <a href="<?php echo esc_url($product->add_to_cart_url()); ?>" class="mco-subcard-btn mco-btn-purchase">Buy Exam</a>
                                <?php endif; ?>
                            </div>

                            <div class="mco-subcard mco-subcard-bundle" style="<?php echo $bundle_subcard_style; ?>">
                                <div class="mco-subcard-content">
                                    <h4 style="<?php if($is_popular) echo 'color: #92400e;'; ?>"><?php echo $icon_cart; ?> Exam + Study Bundle</h4>
                                    <p style="font-size: 0.75rem; color: #4b5563; margin-top: 0.5rem;">Get the exam plus 1-month of premium access to all practice tests & AI feedback.</p>
                                </div>
                                <?php if ($is_wc_active && !empty($program['bundle_sku']) && ($bundle_product = wc_get_product(wc_get_product_id_by_sku($program['bundle_sku'])))): ?>
                                    <div class="mco-subcard-price">
                                        <?php if ($bundle_product->is_on_sale()): ?>
                                            <span class="mco-price-current" style="<?php if($is_popular) echo 'color: #b45309;'; else echo 'color: #0891b2;'; ?>"><?php echo wc_price($bundle_product->get_sale_price()); ?></span>
                                            <span class="mco-price-regular"><?php echo wc_price($bundle_product->get_regular_price()); ?></span>
                                        <?php else: ?>
                                            <span class="mco-price-current" style="<?php if($is_popular) echo 'color: #b45309;'; else echo 'color: #0891b2;'; ?>"><?php echo wc_price($bundle_product->get_price()); ?></span>
                                        <?php endif; ?>
                                    </div>
                                    <a href="<?php echo esc_url($bundle_product->add_to_cart_url()); ?>" class="mco-subcard-btn <?php echo $is_popular ? 'mco-btn-purchase' : 'mco-btn-bundle'; ?>" style="<?php if($is_popular) echo 'background-color: #f97316;'; ?>">Buy Bundle</a>
                                <?php endif; ?>
                            </div>

                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </main>
        <aside class="mco-sidebar">
             <div class="mco-bookshelf">
                <h3><?php echo $icon_book_open; ?> Study Hall</h3>
                <div class="mco-books-container">
                    <?php 
                    $books = mco_get_suggested_books_data();
                    $bg_colors = ['#fef2f2', '#fefce8', '#f0fdf4', '#eff6ff', '#eef2ff', '#f5f3ff', '#fdf2f8'];
                    $text_colors = ['#991b1b', '#854d0e', '#166534', '#1e40af', '#3730a3', '#5b21b6', '#9d174d'];
                    $accent_colors = ['#fca5a5', '#fde047', '#86efac', '#93c5fd', '#a5b4fc', '#c4b5fd', '#f9a8d4'];
                    foreach($books as $book): 
                        $hash = crc32($book['title']);
                        $color_index = abs($hash) % count($bg_colors);
                        $bg_color = $bg_colors[$color_index];
                        $text_color = $text_colors[$color_index];
                        $accent_color = $accent_colors[$color_index];
                        $title_words = explode(' ', $book['title']);
                    ?>
                    <div class="mco-book-card">
                        <div class="mco-book-cover" style="background-color: <?php echo $bg_color; ?>;">
                             <div class="mco-circle" style="bottom: -2.5rem; right: -2.5rem; width: 8rem; height: 8rem; background-color: <?php echo $accent_color; ?>;"></div>
                             <div class="mco-circle" style="top: -3rem; left: -2rem; width: 6rem; height: 6rem; background-color: <?php echo $accent_color; ?>;"></div>
                             <div></div>
                             <div class="mco-book-title" style="color: <?php echo $text_color; ?>;">
                                <?php echo esc_html(implode(' ', array_slice($title_words, 0, 4))); ?>
                                <?php if (count($title_words) > 4): ?>
                                <br><span style="font-size: 0.8em; opacity: 0.8;"><?php echo esc_html(implode(' ', array_slice($title_words, 4))); ?></span>
                                <?php endif; ?>
                             </div>
                             <div class="mco-book-accent" style="background-color: <?php echo $accent_color; ?>;"></div>
                        </div>
                        <div class="mco-book-details">
                            <h4><?php echo esc_html($book['title']); ?></h4>
                            <div class="mco-book-geolink" data-com-url="<?php echo esc_url($book['links']['com']); ?>" data-in-url="<?php echo esc_url($book['links']['in']); ?>" data-ae-url="<?php echo esc_url($book['links']['ae']); ?>">
                                <a href="<?php echo esc_url($book['links']['com']); ?>" target="_blank" rel="noopener noreferrer" class="mco-book-buy-btn">
                                    <?php echo $icon_book_up; ?> <span>Buy on Amazon.com</span>
                                </a>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
                 <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 1.5rem; text-align: center;">Using our affiliate links helps support our platform. Note: Book availability may vary by region.</p>
            </div>
        </aside>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const getGeoAffiliateLink = (links) => {
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                let domainKey = 'com';
                let domainName = 'Amazon.com';
                const gccTimezones = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat'];
                if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
                    domainKey = 'in';
                    domainName = 'Amazon.in';
                } else if (gccTimezones.some(tz => timeZone === tz)) {
                    domainKey = 'ae';
                    domainName = 'Amazon.ae';
                }
                const url = links[domainKey];
                return !url || url.trim() === '' ? { url: links.com, domainName: 'Amazon.com' } : { url, domainName };
            };
            document.querySelectorAll('.mco-book-geolink').forEach(container => {
                const links = {
                    com: container.getAttribute('data-com-url'),
                    in: container.getAttribute('data-in-url'),
                    ae: container.getAttribute('data-ae-url'),
                };
                const { url, domainName } = getGeoAffiliateLink(links);
                const anchor = container.querySelector('a');
                if (anchor) {
                    anchor.href = url;
                    anchor.querySelector('span').textContent = 'Buy on ' + domainName;
                }
            });
        });
    </script>
    <?php return ob_get_clean();
}


function mco_exam_login_shortcode() {
    if (!defined('MCO_JWT_SECRET')) return "<p class='mco-portal-error'>Configuration error: A strong MCO_JWT_SECRET must be defined in wp-config.php.</p>";
    $login_error_message = ''; $user_id = 0;
    if ('POST' === $_SERVER['REQUEST_METHOD'] && !empty($_POST['mco_login_nonce']) && wp_verify_nonce($_POST['mco_login_nonce'], 'mco_login_action')) {
        $user = wp_signon(['user_login' => sanitize_user($_POST['log']), 'user_password' => $_POST['pwd'], 'remember' => true], false);
        if (is_wp_error($user)) { 
            $login_error_message = 'Invalid username or password.'; 
        } else {
            if ( get_user_meta( $user->ID, 'has_to_be_activated', true ) !== false ) {
                $login_error_message = 'Your account must be activated. Please check your email for the activation link.';
            } else {
                $user_id = $user->ID;
            }
        }
    }
    if (is_user_logged_in() && $user_id === 0) { $user_id = get_current_user_id(); }
    if ($user_id > 0) { $token = mco_generate_exam_jwt($user_id); if ($token) { $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard'; $final_url = mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to); echo "<div class='mco-portal-container' style='text-align:center;'><p>Login successful. Redirecting...</p><script>window.location.href='" . esc_url_raw($final_url) . "';</script></div>"; return; } else { $login_error_message = 'Could not create a secure session. Please contact support.'; } }
    ob_start(); ?>
    <style>.mco-portal-container{font-family:sans-serif;max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)}.mco-portal-container h2{text-align:center;font-size:24px;margin-bottom:30px}.mco-portal-container .form-row{margin-bottom:20px}.mco-portal-container label{display:block;margin-bottom:8px;font-weight:600}.mco-portal-container input{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}.mco-portal-container button{width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}.mco-portal-container button:hover{background-color:#067a8e}.mco-portal-links{margin-top:20px;text-align:center}.mco-portal-error{color:red;text-align:center;margin-bottom:20px}</style>
    <div class="mco-portal-container">
        <h2>Exam Portal Login</h2> <?php if ($login_error_message) echo "<p class='mco-portal-error'>" . esc_html($login_error_message) . "</p>"; ?>
        <form name="loginform" action="<?php echo esc_url(get_permalink()); ?>" method="post">
            <div class="form-row"><label for="log">Username or Email</label><input type="text" name="log" id="log" required></div>
            <div class="form-row"><label for="pwd">Password</label><input type="password" name="pwd" id="pwd" required></div>
            <div class="form-row"><button type="submit">Log In</button></div>
            <?php wp_nonce_field('mco_login_action', 'mco_login_nonce'); ?>
            <?php if (isset($_REQUEST['redirect_to'])): ?><input type="hidden" name="redirect_to" value="<?php echo esc_attr(urlencode($_REQUEST['redirect_to'])); ?>" /><?php endif; ?>
        </form>
        <div class="mco-portal-links"><a href="<?php echo esc_url(wp_registration_url()); ?>">Register</a> | <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Lost Password?</a></div>
    </div> <?php return ob_get_clean();
}

function mco_exam_add_custom_registration_fields() { ?><p><label for="first_name">First Name<br/><input type="text" name="first_name" id="first_name" required/></label></p><p><label for="last_name">Last Name<br/><input type="text" name="last_name" id="last_name" required/></label></p><?php }
function mco_exam_validate_reg_fields($errors, $login, $email) { if (empty($_POST['first_name']) || empty($_POST['last_name'])) $errors->add('field_error', 'First and Last Name are required.'); return $errors; }
function mco_exam_save_reg_fields($user_id) { if (!empty($_POST['first_name'])) update_user_meta($user_id, 'first_name', sanitize_text_field($_POST['first_name'])); if (!empty($_POST['last_name'])) update_user_meta($user_id, 'last_name', sanitize_text_field($_POST['last_name'])); }
function mco_exam_login_url($login_url, $redirect) { if (strpos($_SERVER['REQUEST_URI'], 'wp-admin') !== false) return $login_url; $login_page_url = home_url('/' . MCO_LOGIN_SLUG . '/'); return !empty($redirect) ? add_query_arg('redirect_to', urlencode($redirect), $login_page_url) : $login_page_url; }
?>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(phpCode)
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
            <h1 className="text-3xl font-extrabold text-slate-800">WordPress Integration Guide</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2">1. Install and Configure the Plugin</h2>
                <p className="mb-4">Copy the entire PHP code block below and save it as a new plugin file (e.g., <code>mco-integration.php</code>) in your WordPress <code>/wp-content/plugins/</code> directory. Then, activate it from the WordPress admin panel.</p>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm">
                    <button 
                        onClick={copyToClipboard} 
                        className="absolute top-2 right-2 p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition"
                        title="Copy to clipboard"
                        >
                        <Copy size={16} />
                    </button>
                    <pre><code className="language-php">{phpCode}</code></pre>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2">2. Set JWT Secret Key</h2>
                <p>For security, you <strong>must</strong> define a unique and strong secret key for JWT (JSON Web Token) generation. Open your <code>wp-config.php</code> file and add the following line:</p>
                <pre className="bg-slate-100 p-2 rounded mt-2"><code>define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');</code></pre>
                <p className="mt-2 text-sm text-red-600"><strong>Important:</strong> Replace <code>'your-very-strong-secret-key...'</code> with a long, random string. You can use an online generator to create a secure key.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2">3. Create the Login Page</h2>
                <p>Create a new page in WordPress with the slug <code>exam-login</code>. Inside the content editor, add the shortcode:</p>
                <pre className="bg-slate-100 p-2 rounded mt-2"><code>[mco_exam_login]</code></pre>
                <p className="mt-2">This will render the login form that handles single sign-on (SSO) to the exam application.</p>
            </div>
        </div>
    );
}