import React from 'react';
import toast from 'react-hot-toast';

const Integration: React.FC = () => {

    const phpCode = `<?php
/**
 * Plugin Name:       MCO Exam App Integration
 * Description:       A unified plugin to integrate the React examination app with WordPress, handling SSO, purchases, and results sync.
 * Version:           7.3.0
 * Author:            Annapoorna Infotech (Refactored)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- CONFIGURATION ---
define('MCO_LOGIN_SLUG', 'exam-login');
define('MCO_EXAM_APP_URL', 'https://exams.coding-online.net/');
define('MCO_EXAM_APP_TEST_URL', 'https://mco-25.vercel.app/');
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// define('MCO_DEBUG', true); // <--- UNCOMMENT THIS TO SEE DETAILED LOGS FOR PARSING ERRORS
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
    add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode'); // <-- Reinstated shortcode
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
        $all_exam_skus = ['exam-cpc-cert', 'exam-cca-cert', 'exam-ccs-cert', 'exam-billing-cert', 'exam-risk-cert', 'exam-icd-cert', 'exam-cpb-cert', 'exam-crc-cert', 'exam-cpma-cert', 'exam-coc-cert', 'exam-cic-cert', 'exam-mta-cert'];
        $exam_prices = get_transient('mco_exam_prices');
        if (false === $exam_prices) {
            mco_debug_log('Exam prices cache miss. Fetching from DB.');
            $exam_prices = new stdClass();
            foreach ($all_exam_skus as $sku) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $price = (float) $product->get_price();
                    $regular_price = (float) $product->get_regular_price();
                    if ($regular_price > $price) { $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => $regular_price]; } 
                    else { $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => $price]; }
                }
            }
            set_transient('mco_exam_prices', $exam_prices, 12 * HOUR_IN_SECONDS);
        }
        $customer_orders = wc_get_orders(['customer' => $user_id, 'status' => ['wc-completed', 'wc-processing'], 'limit' => -1]);
        $purchased_skus = [];
        if ($customer_orders) { foreach ($customer_orders as $order) { foreach ($order->get_items() as $item) { $product = $item->get_product(); if ($product && $product->get_sku()) $purchased_skus[] = $product->get_sku(); } } }
        $paid_exam_ids = array_values(array_intersect($all_exam_skus, array_unique($purchased_skus)));
    }
    return ['iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (60 * 60 * 2), 'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => user_can($user, 'administrator')], 'paidExamIds' => array_unique($paid_exam_ids), 'examPrices' => $exam_prices];
}

function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_verify_exam_jwt($token) { $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32) { mco_debug_log('JWT verification failed: Secret key not configured or insecure.'); return null; } $parts = explode('.', $token); if (count($parts) !== 3) { mco_debug_log('JWT verification failed: Invalid token structure.'); return null; } list($header_b64, $payload_b64, $signature_b64) = $parts; $signature = base64_decode(strtr($signature_b64, '-_', '+/')); $expected_signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); if (!hash_equals($expected_signature, $signature)) { mco_debug_log('JWT verification failed: Signature mismatch.'); return null; } $payload = json_decode(base64_decode(strtr($payload_b64, '-_', '+/')), true); if (isset($payload['exp']) && $payload['exp'] < time()) { mco_debug_log('JWT verification failed: Token expired.'); return null; } return $payload; }
function mco_generate_exam_jwt($user_id) { $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32 || strpos($secret_key, 'your-very-strong-secret-key') !== false) { mco_debug_log('JWT Secret is not configured or is too weak.'); return null; } if (!$payload = mco_exam_get_payload($user_id)) return null; $header_b64 = mco_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256'])); $payload_b64 = mco_base64url_encode(json_encode($payload)); $signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); $signature_b64 = mco_base64url_encode($signature); return "$header_b64.$payload_b64.$signature_b64"; }
function mco_redirect_after_purchase($order_id) { if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return; if ($user_id > 0 && $order->has_status(['completed', 'processing', 'on-hold'])) { if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart(); if ($token = mco_generate_exam_jwt($user_id)) { wp_redirect(mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard'); exit; } } }

// --- REST API ENDPOINTS ---
function mco_exam_register_rest_api() {
    register_rest_route('mco-app/v1', '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/certificate-data/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
}

function mco_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) return new WP_Error('jwt_missing', 'Authorization token not found.', ['status' => 401]);
    $payload = mco_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_invalid', 'Invalid or expired token.', ['status' => 403]);
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

function mco_ensure_utf8_recursive($data) {
    if (is_string($data)) return mb_convert_encoding($data, 'UTF-8', 'UTF-8');
    if (!is_array($data)) return $data;
    $ret = [];
    foreach ($data as $i => $d) $ret[$i] = mco_ensure_utf8_recursive($d);
    return $ret;
}
function mco_get_user_results_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); if ($user_id <= 0) return new WP_Error('invalid_user', 'Invalid user.', ['status' => 403]); $results = get_user_meta($user_id, 'mco_exam_results', true); $results = empty($results) || !is_array($results) ? [] : array_values($results); return new WP_REST_Response(mco_ensure_utf8_recursive($results), 200); }
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

// --- NEW SHOWCASE SHORTCODE ---
function mco_get_all_exam_data() {
    return [
        // Practice Exams (12 total)
        ['id' => 'exam-cpc-practice', 'name' => 'CPC Practice Test', 'description' => 'A short practice test to prepare for the CPC certification.', 'price' => 0, 'productSku' => 'exam-cpc-practice', 'isPractice' => true],
        ['id' => 'exam-cca-practice', 'name' => 'CCA Practice Test', 'description' => 'A short practice test for the Certified Coding Associate exam.', 'price' => 0, 'productSku' => 'exam-cca-practice', 'isPractice' => true],
        ['id' => 'exam-billing-practice', 'name' => 'Medical Billing Practice Test', 'description' => 'A short practice test for medical billing concepts.', 'price' => 0, 'productSku' => 'exam-billing-practice', 'isPractice' => true],
        ['id' => 'exam-ccs-practice', 'name' => 'CCS Practice Test', 'description' => 'Practice for the Certified Coding Specialist exam.', 'price' => 0, 'productSku' => 'exam-ccs-practice', 'isPractice' => true],
        ['id' => 'exam-risk-practice', 'name' => 'Risk Adjustment Practice Test', 'description' => 'Practice for the Risk Adjustment (CRC) exam.', 'price' => 0, 'productSku' => 'exam-risk-practice', 'isPractice' => true],
        ['id' => 'exam-icd-practice', 'name' => 'ICD-10-CM Practice Test', 'description' => 'Practice for the ICD-10-CM proficiency exam.', 'price' => 0, 'productSku' => 'exam-icd-practice', 'isPractice' => true],
        ['id' => 'exam-cpb-practice', 'name' => 'CPB Practice Test', 'description' => 'Practice for the Certified Professional Biller exam.', 'price' => 0, 'productSku' => 'exam-cpb-practice', 'isPractice' => true],
        ['id' => 'exam-crc-practice', 'name' => 'CRC Practice Test', 'description' => 'Practice for the Certified Risk Adjustment Coder exam.', 'price' => 0, 'productSku' => 'exam-crc-practice', 'isPractice' => true],
        ['id' => 'exam-cpma-practice', 'name' => 'CPMA Practice Test', 'description' => 'Practice for the Certified Professional Medical Auditor exam.', 'price' => 0, 'productSku' => 'exam-cpma-practice', 'isPractice' => true],
        ['id' => 'exam-coc-practice', 'name' => 'COC Practice Test', 'description' => 'Practice for the Certified Outpatient Coder exam.', 'price' => 0, 'productSku' => 'exam-coc-practice', 'isPractice' => true],
        ['id' => 'exam-cic-practice', 'name' => 'CIC Practice Test', 'description' => 'Practice for the Certified Inpatient Coder exam.', 'price' => 0, 'productSku' => 'exam-cic-practice', 'isPractice' => true],
        ['id' => 'exam-mta-practice', 'name' => 'Medical Terminology & Anatomy Practice Test', 'description' => 'Practice for the Medical Terminology & Anatomy exam.', 'price' => 0, 'productSku' => 'exam-mta-practice', 'isPractice' => true],
        // Certification Exams (12 total)
        ['id' => 'exam-cpc-cert', 'name' => 'CPC Certification Exam', 'description' => 'Full certification exam for Certified Professional Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpc-cert', 'isPractice' => false],
        ['id' => 'exam-cca-cert', 'name' => 'CCA Certification Exam', 'description' => 'Full certification exam for Certified Coding Associate.', 'price' => 120, 'regularPrice' => 120, 'productSku' => 'exam-cca-cert', 'isPractice' => false],
        ['id' => 'exam-ccs-cert', 'name' => 'CCS Certification Exam', 'description' => 'Full certification exam for Certified Coding Specialist.', 'price' => 160, 'regularPrice' => 160, 'productSku' => 'exam-ccs-cert', 'isPractice' => false],
        ['id' => 'exam-billing-cert', 'name' => 'Medical Billing Certification Exam', 'description' => 'Comprehensive exam covering medical billing and reimbursement.', 'price' => 100, 'regularPrice' => 100, 'productSku' => 'exam-billing-cert', 'isPractice' => false],
        ['id' => 'exam-risk-cert', 'name' => 'Risk Adjustment Certification Exam', 'description' => 'Exam for Risk Adjustment Coding.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-risk-cert', 'isPractice' => false],
        ['id' => 'exam-icd-cert', 'name' => 'ICD-10-CM Certification Exam', 'description' => 'Proficiency exam for ICD-10-CM coding.', 'price' => 90, 'regularPrice' => 90, 'productSku' => 'exam-icd-cert', 'isPractice' => false],
        ['id' => 'exam-cpb-cert', 'name' => 'CPB Certification Exam', 'description' => 'Full certification exam for Certified Professional Biller.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpb-cert', 'isPractice' => false],
        ['id' => 'exam-crc-cert', 'name' => 'CRC Certification Exam', 'description' => 'Full certification exam for Certified Risk Adjustment Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-crc-cert', 'isPractice' => false],
        ['id' => 'exam-cpma-cert', 'name' => 'CPMA Certification Exam', 'description' => 'Full certification exam for Certified Professional Medical Auditor.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpma-cert', 'isPractice' => false],
        ['id' => 'exam-coc-cert', 'name' => 'COC Certification Exam', 'description' => 'Full certification exam for Certified Outpatient Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-coc-cert', 'isPractice' => false],
        ['id' => 'exam-cic-cert', 'name' => 'CIC Certification Exam', 'description' => 'Full certification exam for Certified Inpatient Coder.', 'price' => 160, 'regularPrice' => 160, 'productSku' => 'exam-cic-cert', 'isPractice' => false],
        ['id' => 'exam-mta-cert', 'name' => 'Medical Terminology & Anatomy Certification Exam', 'description' => 'Proficiency exam for Medical Terminology & Anatomy.', 'price' => 90, 'regularPrice' => 90, 'productSku' => 'exam-mta-cert', 'isPractice' => false]
    ];
}

function mco_exam_showcase_shortcode() {
    $exams = mco_get_all_exam_data();
    $is_wc_active = class_exists('WooCommerce');
    ob_start(); ?>
    <style>
    .mco-showcase-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; font-family: sans-serif; }
    .mco-showcase-card { border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1); background: #fff; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; transition: transform .2s, box-shadow .2s; }
    .mco-showcase-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1); }
    .mco-showcase-card-header { padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid #f3f4f6; }
    .mco-showcase-card-header.cert { background-color: #0891b2; color: white; }
    .mco-showcase-card-header.practice { background-color: #475569; color: white; }
    .mco-showcase-card h3 { font-size: 1.25rem; font-weight: 700; margin: 0; }
    .mco-showcase-card-body { padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; }
    .mco-showcase-card-body p { margin: 0 0 1rem; color: #4b5563; font-size: 0.95rem; line-height: 1.5; }
    .mco-showcase-card-footer { margin-top: auto; padding-top: 1rem; border-top: 1px solid #f3f4f6; }
    .mco-showcase-price { font-size: 1.1rem; text-align: center; margin-bottom: 1rem; }
    .mco-showcase-price .regular { text-decoration: line-through; color: #6b7280; margin-left: 0.5rem; }
    .mco-showcase-price .sale { font-weight: 700; font-size: 1.75rem; color: #16a34a; }
    .mco-showcase-btn { display: block; text-align: center; text-decoration: none; padding: 0.8rem 1rem; border-radius: 8px; font-weight: 600; transition: background-color .2s; }
    .mco-btn-purchase { background-color: #f59e0b; color: #fff; }
    .mco-btn-purchase:hover { background-color: #d97706; }
    .mco-btn-practice { background-color: #64748b; color: #fff; }
    .mco-btn-practice:hover { background-color: #475569; }
    </style>
    <div class="mco-showcase-container">
    <?php foreach ($exams as $exam):
        $header_class = $exam['isPractice'] ? 'practice' : 'cert';
    ?>
        <div class="mco-showcase-card">
            <div class="mco-showcase-card-header <?php echo $header_class; ?>">
                <h3><?php echo esc_html($exam['name']); ?></h3>
            </div>
            <div class="mco-showcase-card-body">
                <p><?php echo esc_html($exam['description']); ?></p>
                <div class="mco-showcase-card-footer">
                    <?php if ($exam['isPractice']): 
                        $practice_url = MCO_EXAM_APP_URL . '#/test/' . $exam['id'];
                    ?>
                        <a href="<?php echo esc_url($practice_url); ?>" class="mco-showcase-btn mco-btn-practice">Start Practice</a>
                    <?php else: 
                        if ($is_wc_active):
                            $product_id = wc_get_product_id_by_sku($exam['productSku']);
                            if ($product_id && $product = wc_get_product($product_id)):
                                $current_price = (float)$product->get_price();
                                $regular_price = (float)$product->get_regular_price();
                                $add_to_cart_url = $product->add_to_cart_url();
                    ?>
                                <div class="mco-showcase-price">
                                    <?php if ($regular_price > $current_price): ?>
                                        <span class="sale"><?php echo wc_price($current_price); ?></span>
                                        <span class="regular"><?php echo wc_price($regular_price); ?></span>
                                    <?php else: ?>
                                        <span class="sale"><?php echo wc_price($current_price); ?></span>
                                    <?php endif; ?>
                                </div>
                                <a href="<?php echo esc_url($add_to_cart_url); ?>" class="mco-showcase-btn mco-btn-purchase">Purchase Exam</a>
                            <?php else: ?>
                                <p style="text-align:center; color: #9ca3af;">Product not available</p>
                            <?php endif;
                        endif;
                    endif; ?>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
    </div>
    <?php return ob_get_clean();
}


// --- SHORTCODES & FORMS ---
function mco_exam_user_details_shortcode() {
    if (!is_user_logged_in()) return '<p>Please log in to see your details.</p>';
    $user_id = get_current_user_id(); $user = get_userdata($user_id); $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name; ob_start(); ?>
    <div class="mco-user-details" style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; background: #f9f9f9;">
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">User Details (for Debugging)</h3>
        <p><strong>User ID:</strong> <?php echo esc_html($user_id); ?></p> <p><strong>Full Name:</strong> <?php echo esc_html($user_full_name); ?></p> <p><strong>Email:</strong> <?php echo esc_html($user->user_email); ?></p>
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">WooCommerce Purchases</h3>
        <?php if (class_exists('WooCommerce')) { $all_exam_skus = ['exam-cpc-cert', 'exam-cca-cert', 'exam-ccs-cert', 'exam-billing-cert', 'exam-risk-cert', 'exam-icd-cert', 'exam-cpb-cert', 'exam-crc-cert', 'exam-cpma-cert', 'exam-coc-cert', 'exam-cic-cert', 'exam-mta-cert']; $customer_orders = wc_get_orders(['customer' => $user_id, 'status' => ['wc-completed', 'wc-processing'], 'limit' => -1]); $purchased_skus = []; if ($customer_orders) { foreach ($customer_orders as $order) { foreach ($order->get_items() as $item) { if ($product = $item->get_product()) $purchased_skus[] = $product->get_sku(); } } } $paid_exam_ids = array_values(array_intersect($all_exam_skus, array_unique($purchased_skus))); if (!empty($paid_exam_ids)) { echo '<ul>'; foreach ($paid_exam_ids as $sku) { echo '<li>' . esc_html($sku) . '</li>'; } echo '</ul>'; } else { echo '<p>No completed exam purchases found.</p>'; } } else { echo '<p>WooCommerce is not active.</p>'; } ?>
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Synced Exam Results</h3>
        <?php $results = get_user_meta($user_id, 'mco_exam_results', true); if (!empty($results) && is_array($results)) { echo '<table style="width: 100%; border-collapse: collapse;"><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Exam ID</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Score</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th></tr>'; foreach ($results as $result) { $date = date('Y-m-d H:i', (int)((int)$result['timestamp'] / 1000)); echo '<tr><td style="border: 1px solid #ddd; padding: 8px;">' . esc_html($result['examId']) . '</td><td style="border: 1px solid #ddd; padding: 8px;">' . esc_html($result['score']) . '%</td><td style="border: 1px solid #ddd; padding: 8px;">' . esc_html($date) . '</td></tr>'; } echo '</table>'; } else { echo '<p>No exam results have been synced from the app yet.</p>'; } ?>
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 20px;">Google Sheet Fetch Test</h3>
        <?php $test_sheet_url = 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing'; $csv_url = str_replace(['/edit?usp=sharing', '/edit#gid='], ['/export?format=csv', '/export?format=csv&gid='], $test_sheet_url); $response = wp_remote_get($csv_url, ['timeout' => 20]); if (is_wp_error($response)) { echo '<p style="color: red;"><strong>Error:</strong> Failed to connect to Google Sheets. ' . esc_html($response->get_error_message()) . '</p>'; } else { $body = wp_remote_retrieve_body($response); $lines = preg_split('/\\r\\n?|\\n/', trim($body)); if(count($lines) > 1) { array_shift($lines); $random_line = $lines[array_rand($lines)]; $question_data = str_getcsv($random_line); if(count($question_data) >= 3 && !empty(trim($question_data[0]))) { echo '<p><strong>Success!</strong> Fetched a random question from the source sheet:</p>'; echo '<blockquote style="border-left: 3px solid #0891b2; padding-left: 15px; margin-left: 0; font-style: italic;">'; echo '<strong>Q:</strong> ' . esc_html(trim($question_data[0])); echo '</blockquote>'; } else { echo '<p style="color: red;"><strong>Error:</strong> Could fetch sheet, but failed to parse a valid question row.</p>'; } } else { echo '<p style="color: red;"><strong>Error:</strong> Fetched sheet, but it appears to be empty or invalid.</p>'; } } ?>
    </div> <?php return ob_get_clean();
}

function mco_exam_login_shortcode() {
    if (!defined('MCO_JWT_SECRET')) return "<p class='mco-portal-error'>Configuration error: A strong MCO_JWT_SECRET must be defined in wp-config.php.</p>";
    $login_error_message = ''; $user_id = 0;
    if ('POST' === $_SERVER['REQUEST_METHOD'] && !empty($_POST['mco_login_nonce']) && wp_verify_nonce($_POST['mco_login_nonce'], 'mco_login_action')) {
        $user = wp_signon(['user_login' => sanitize_user($_POST['log']), 'user_password' => $_POST['pwd'], 'remember' => true], false);
        if (is_wp_error($user)) { $login_error_message = 'Invalid username or password.'; } else { $user_id = $user->ID; }
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
            .then(() => toast.success('Plugin code copied to clipboard!'))
            .catch(err => toast.error('Failed to copy code.'));
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">WordPress Integration Guide</h1>
            <div className="prose max-w-none text-slate-600">
                <p>This single, unified PHP file contains all the necessary code to integrate the examination application with your WordPress site. It handles user authentication (SSO), exam data configuration, and results synchronization.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Installation Steps</h2>
                <ol>
                    <li><strong>Remove Old Plugins:</strong> If you have any previous versions of the "Annapoorna" or "MCO" integration plugins, please deactivate and delete them from your WordPress admin dashboard to avoid conflicts.</li>
                    <li><strong>Create New Plugin File:</strong> In your WordPress installation, navigate to the <code>/wp-content/plugins/</code> directory. Create a new folder named <code>mco-exam-integration</code>. Inside this folder, create a new file named <code>mco-exam-integration.php</code>.</li>
                    <li><strong>Copy & Paste Code:</strong> Copy the entire PHP code block below and paste it into the <code>mco-exam-integration.php</code> file you just created.</li>
                    <li><strong>Define JWT Secret:</strong> Open your <code>wp-config.php</code> file (in the root of your WordPress installation) and add the following line. <strong>Important:</strong> Replace the placeholder key with a long, random string from a <a href="https://api.wordpress.org/secret-key/1.1/salt/" target="_blank" rel="noopener noreferrer">secure key generator</a>.
                        <pre className="bg-slate-100 p-2 rounded text-sm"><code>define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');</code></pre>
                    </li>
                     <li><strong>(Optional) Enable Debugging:</strong> To diagnose sheet parsing issues, add the following line to <code>wp-config.php</code>. This will write detailed logs to your server's error log file.
                        <pre className="bg-slate-100 p-2 rounded text-sm"><code>define('MCO_DEBUG', true);</code></pre>
                    </li>
                    <li><strong>Activate Plugin:</strong> Go to the "Plugins" page in your WordPress admin dashboard. You should see "MCO Exam App Integration". Click "Activate".</li>
                </ol>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Usage</h2>
                 <p>Once activated, the plugin provides three useful shortcodes:</p>
                <ul>
                    <li><code>[mco_exam_showcase]</code>: This is the primary shortcode to display all your available exams in a clean, card-based layout for your visitors.</li>
                    <li><code>[mco_exam_login]</code>: Creates the secure login form that enables Single Sign-On into the exam application. Create a page called "Exam Login" (with slug <code>exam-login</code>) and place this shortcode on it.</li>
                    <li><code>[exam_user_details]</code>: This is a diagnostic shortcode for admins. Place it on any page to display the currently logged-in user's details, including their purchased exams, synced test results, and a live test of the Google Sheet fetching capability.</li>
                </ul>

                <div className="mt-8">
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="text-xl font-bold text-slate-800">Plugin Code (mco-exam-integration.php)</h3>
                         <button onClick={copyToClipboard} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition text-sm">Copy Code</button>
                    </div>
                    <pre className="bg-slate-800 text-white p-4 rounded-lg max-h-96 overflow-auto text-xs">
                        <code>{phpCode}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default Integration;