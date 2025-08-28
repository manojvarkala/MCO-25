import * as React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: React.FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       MCO Exam App Integration (Restored)
 * Description:       A unified plugin to integrate the React examination app with WordPress, handling SSO, data sync, and WooCommerce cart/checkout styling. This is a restored, self-contained version.
 * Version:           11.0.1 (Restored)
 * Author:            Annapoorna Infotech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- CONFIGURATION ---
// IMPORTANT: You MUST define your secret key in your wp-config.php file. Example:
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// --- END CONFIGURATION ---

// --- INITIALIZATION ---
add_action('init', 'mco_exam_app_init');
function mco_exam_app_init() {
    add_action('admin_notices', 'mco_check_dependencies');
    add_action('woocommerce_thankyou', 'mco_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'mco_exam_register_rest_api');
    
    add_shortcode('mco_exam_login', 'mco_exam_login_shortcode');
    add_shortcode('mco_exam_showcase', 'mco_exam_showcase_shortcode');

    add_action('wp_head', 'mco_add_custom_wc_styles_to_head');
    add_filter('woocommerce_order_button_text', 'mco_custom_order_button_text');
}

function mco_check_dependencies() { 
    if (!class_exists('WooCommerce')) {
        echo '<div class="notice notice-error"><p><strong>MCO Exam App:</strong> WooCommerce is not active. This plugin requires it to function.</p></div>'; 
    }
    if (!defined('MCO_JWT_SECRET') || strlen(MCO_JWT_SECRET) < 32) {
        echo '<div class="notice notice-error"><p><strong>MCO Exam App:</strong> A secure <strong>MCO_JWT_SECRET</strong> (at least 32 characters long) is not defined in your wp-config.php file for security. SSO will not work.</p></div>';
    }
}

function mco_get_exam_app_url($is_admin = false) {
    // In this version, URLs are hardcoded for simplicity as per the original working file.
    $production_url = 'https://exams.coding-online.net/';
    $test_url = 'https://mco-25.vercel.app/'; // A previous test URL, kept for consistency
    if ($is_admin) {
        // Simple check if an admin user has a preference cookie or query param (can be expanded)
        return isset($_GET['mco_mode']) && $_GET['mco_mode'] === 'test' ? $test_url : $production_url;
    }
    return $production_url;
}

// --- DATA SOURCE & JWT ---
function mco_exam_get_payload($user_id) {
    $user = get_userdata($user_id);
    if (!$user) return null;
    
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $paid_exam_ids = []; 
    $exam_prices = new stdClass();
    $is_subscribed = false;
    
    $spins_available = get_user_meta($user_id, 'mco_spins_available', true);
    if ($spins_available === '') $spins_available = 1; // Default to 1 spin for new users
    $spins_available = intval($spins_available);
    
    $won_prize = get_user_meta($user_id, 'mco_wheel_prize', true);

    // Admins always get a spin for testing purposes
    if (user_can($user, 'administrator')) $spins_available = 1;
    
    if (class_exists('WooCommerce')) {
        $all_exam_skus = ['exam-cpc-cert', 'exam-cca-cert', 'exam-ccs-cert', 'exam-billing-cert', 'exam-risk-cert', 'exam-icd-cert', 'exam-cpb-cert', 'exam-crc-cert', 'exam-cpma-cert', 'exam-coc-cert', 'exam-cic-cert', 'exam-mta-cert', 'exam-ap-cert', 'exam-em-cert', 'exam-rcm-cert', 'exam-hi-cert', 'exam-mcf-cert'];
        $base_subscription_skus = ['sub-monthly', 'sub-yearly', 'sub-1mo-addon'];
        $specific_bundle_skus = ['exam-cpc-cert-1', 'exam-cca-cert-bundle'];
        $addon_skus = array_map(function($sku) { return $sku . '-1mo-addon'; }, $all_exam_skus);
        $subscription_skus = array_unique(array_merge($base_subscription_skus, $addon_skus));
        $all_skus_for_pricing = array_unique(array_merge($all_exam_skus, $subscription_skus, $specific_bundle_skus));
        
        $exam_prices = get_transient('mco_exam_prices_v4');
        if (false === $exam_prices) {
            $exam_prices = new stdClass();
            foreach ($all_skus_for_pricing as $sku) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $price_data = ['price' => (float)$product->get_price(), 'regularPrice' => (float)$product->get_regular_price(), 'productId' => $product_id];
                    
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
    
    return ['iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (24 * HOUR_IN_SECONDS), 'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => user_can($user, 'administrator')], 'paidExamIds' => $paid_exam_ids, 'examPrices' => $exam_prices, 'isSubscribed' => $is_subscribed, 'spinsAvailable' => $spins_available, 'wonPrize' => $won_prize];
}

function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

function mco_generate_exam_jwt($user_id) {
    if (!defined('MCO_JWT_SECRET')) return false;
    if (!$payload = mco_exam_get_payload($user_id)) return null;
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
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
    $payload = json_decode(mco_base64url_decode($payload_encoded), true);
    if (json_last_error() !== JSON_ERROR_NONE) return false;
    if (isset($payload['exp']) && $payload['exp'] < time()) return false;
    return $payload;
}

function mco_redirect_after_purchase($order_id) {
    if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return;

    if ($user_id > 0 && $order->has_status(['completed', 'processing'])) {
        $all_exam_skus = ['exam-cpc-cert', 'exam-cca-cert', 'exam-ccs-cert', 'exam-billing-cert', 'exam-risk-cert', 'exam-icd-cert', 'exam-cpb-cert', 'exam-crc-cert', 'exam-cpma-cert', 'exam-coc-cert', 'exam-cic-cert', 'exam-mta-cert', 'exam-ap-cert', 'exam-em-cert', 'exam-rcm-cert', 'exam-hi-cert', 'exam-mcf-cert'];
        $base_subscription_skus = ['sub-monthly', 'sub-yearly', 'sub-1mo-addon'];
        $specific_bundle_skus = ['exam-cpc-cert-1', 'exam-cca-cert-bundle'];
        $addon_skus = array_map(function($sku) { return $sku . '-1mo-addon'; }, $all_exam_skus);
        $skus_that_trigger_redirect = array_unique(array_merge($all_exam_skus, $base_subscription_skus, $specific_bundle_skus, $addon_skus));

        $should_redirect = false;
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if ($product && in_array($product->get_sku(), $skus_that_trigger_redirect)) {
                $should_redirect = true;
                break;
            }
        }

        if ($should_redirect && ($token = mco_generate_exam_jwt($user_id))) {
            wp_redirect(mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard');
            exit;
        }
    }
}

// --- REST API ENDPOINTS ---
function mco_exam_register_rest_api() {
    $namespace = 'mco-app/v1';
    register_rest_route($namespace, '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/certificate-data/(?P<testId>[a-zA-Z0-9_-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/submit-review', ['methods' => 'POST', 'callback' => 'mco_exam_submit_review_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/spin-wheel', ['methods' => 'POST', 'callback' => 'mco_spin_wheel_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route($namespace, '/search-user', ['methods' => 'POST', 'callback' => 'mco_search_user_callback', 'permission_callback' => 'mco_exam_api_admin_check']);
    register_rest_route($namespace, '/add-spins', ['methods' => 'POST', 'callback' => 'mco_add_spins_callback', 'permission_callback' => 'mco_exam_api_admin_check']);
    register_rest_route($namespace, '/grant-prize', ['methods' => 'POST', 'callback' => 'mco_grant_prize_callback', 'permission_callback' => 'mco_exam_api_admin_check']);
    register_rest_route($namespace, '/reset-spins', ['methods' => 'POST', 'callback' => 'mco_reset_spins_callback', 'permission_callback' => 'mco_exam_api_admin_check']);
    register_rest_route($namespace, '/remove-prize', ['methods' => 'POST', 'callback' => 'mco_remove_prize_callback', 'permission_callback' => 'mco_exam_api_admin_check']);
    register_rest_route($namespace, '/exam-stats', ['methods' => 'GET', 'callback' => 'mco_get_exam_stats_callback', 'permission_callback' => 'mco_exam_api_admin_check']);
}

function mco_exam_api_permission_check($request) {
    $auth_header = $request->get_header('Authorization');
    if (!$auth_header || sscanf($auth_header, 'Bearer %s', $token) !== 1) return new WP_Error('jwt_auth_no_token', 'Authorization token not found.', ['status' => 403]);
    $payload = mco_verify_exam_jwt($token);
    if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_auth_invalid_token', 'Invalid token.', ['status' => 403]);
    $request->set_param('jwt_payload', $payload);
    return true;
}

function mco_exam_api_admin_check($request) {
    if (is_wp_error($permission = mco_exam_api_permission_check($request))) return $permission;
    $payload = $request->get_param('jwt_payload');
    if (empty($payload['user']['isAdmin'])) return new WP_Error('jwt_auth_not_admin', 'Administrator access required.', ['status' => 403]);
    return true;
}

// API Callbacks are here for brevity. In a larger plugin, they'd be in separate files.
function mco_get_user_results_callback(WP_REST_Request $request) { $user_id = $request->get_param('jwt_payload')['user']['id']; $results = get_user_meta($user_id, 'mco_exam_results', true) ?: []; return new WP_REST_Response(array_values($results), 200); }
function mco_get_certificate_data_callback(WP_REST_Request $request) { $user_id = $request->get_param('jwt_payload')['user']['id']; $test_id = $request->get_param('testId'); $results = get_user_meta($user_id, 'mco_exam_results', true) ?: []; if (!isset($results[$test_id])) return new WP_Error('not_found', 'Test result not found.', ['status' => 404]); $result = $results[$test_id]; $user = get_userdata($user_id); return new WP_REST_Response(['certificateNumber' => strtoupper(substr(md5($test_id . $user_id), 0, 12)), 'candidateName' => $user->display_name, 'finalScore' => $result['score'], 'date' => date('F j, Y', $result['timestamp'] / 1000), 'examId' => $result['examId']], 200); }
function mco_exam_update_user_name_callback($request) { $user_id = $request->get_param('jwt_payload')['user']['id']; $params = $request->get_json_params(); $new_name = sanitize_text_field($params['fullName']); if (empty($new_name)) return new WP_Error('bad_request', 'Full name cannot be empty.', ['status' => 400]); wp_update_user(['ID' => $user_id, 'display_name' => $new_name]); return new WP_REST_Response(['success' => true], 200); }
function mco_exam_submit_result_callback(WP_REST_Request $request) { $user_id = $request->get_param('jwt_payload')['user']['id']; $new_result = $request->get_json_params(); if (empty($new_result['testId'])) return new WP_Error('bad_request', 'Missing testId.', ['status' => 400]); $results = get_user_meta($user_id, 'mco_exam_results', true) ?: []; $results[$new_result['testId']] = $new_result; update_user_meta($user_id, 'mco_exam_results', $results); return new WP_REST_Response(['success' => true], 200); }
function mco_get_questions_from_sheet_callback(WP_REST_Request $request) { $params = $request->get_json_params(); $sheet_url = esc_url_raw($params['sheetUrl']); $count = intval($params['count']); if (!filter_var($sheet_url, FILTER_VALIDATE_URL)) return new WP_Error('invalid_url', 'The provided sheet URL is not valid.', ['status' => 400]); $csv_export_url = str_replace(['/edit?usp=sharing', '/edit'], '/export?format=csv', $sheet_url); $response = wp_remote_get($csv_export_url, ['timeout' => 15]); if (is_wp_error($response)) return new WP_Error('fetch_failed', 'Could not retrieve questions.', ['status' => 500]); $body = wp_remote_retrieve_body($response); $lines = explode("\\n", $body); array_shift($lines); $questions = []; foreach ($lines as $line) { $data = str_getcsv(trim($line)); if (count($data) >= 7 && !empty(trim($data[1]))) { $questions[] = ['id' => intval(trim($data[0])), 'question' => trim($data[1]), 'options' => array_map('trim', array_slice($data, 2, 4)), 'correctAnswer' => intval(trim($data[6]))]; } } shuffle($questions); return new WP_REST_Response(array_slice($questions, 0, $count), 200); }
function mco_exam_submit_review_callback(WP_REST_Request $request) { $params = $request->get_json_params(); $exam_id = sanitize_text_field($params['examId']); $rating = intval($params['rating']); $cert_sku = mco_get_cert_sku_for_exam($exam_id); $product_id = wc_get_product_id_by_sku($cert_sku); if (!$product_id) return new WP_Error('product_not_found', 'Product not found for SKU: ' . $cert_sku, ['status' => 404]); $ratings = get_post_meta($product_id, '_mco_exam_ratings', true) ?: []; $ratings[] = $rating; $count = count($ratings); $avg = $count > 0 ? round(array_sum($ratings) / $count, 2) : 0; update_post_meta($product_id, '_mco_exam_ratings', $ratings); update_post_meta($product_id, '_mco_exam_avg_rating', $avg); update_post_meta($product_id, '_mco_exam_review_count', $count); delete_transient('mco_exam_prices_v4'); return new WP_REST_Response(['success' => true], 200); }
function mco_spin_wheel_callback($request) { $user_id = $request->get_param('jwt_payload')['user']['id']; $is_admin = $request->get_param('jwt_payload')['user']['isAdmin']; $spins = get_user_meta($user_id, 'mco_spins_available', true); if ($spins === '') $spins = 1; if (!$is_admin && intval($spins) <= 0) return new WP_Error('no_spins', 'No spins available.', ['status' => 403]); $prizes = [['id' => 'SUB_YEARLY', 'label' => 'Annual Subscription', 'weight' => 0.5], ['id' => 'SUB_MONTHLY', 'label' => 'Monthly Subscription', 'weight' => 1.5], ['id' => 'SUB_WEEKLY', 'label' => 'Weekly Subscription', 'weight' => 15], ['id' => 'EXAM_CPC', 'label' => 'Free CPC Exam', 'weight' => 4], ['id' => 'EXAM_CCA', 'label' => 'Free CCA Exam', 'weight' => 4], ['id' => 'NEXT_TIME', 'label' => 'Better Luck Next Time', 'weight' => 75]]; $total_weight = array_sum(array_column($prizes, 'weight')); $rand = mt_rand(1, (int)($total_weight * 100)) / 100.0; $cumulative_weight = 0; $chosen_prize = end($prizes); foreach ($prizes as $prize) { $cumulative_weight += $prize['weight']; if ($rand <= $cumulative_weight) { $chosen_prize = $prize; break; } } if ($chosen_prize['id'] !== 'NEXT_TIME') { mco_grant_prize_logic($user_id, $chosen_prize['id'], $chosen_prize['label']); } if (!$is_admin) update_user_meta($user_id, 'mco_spins_available', intval($spins) - 1); return new WP_REST_Response(['prizeId' => $chosen_prize['id'], 'prizeLabel' => $chosen_prize['label'], 'newToken' => mco_generate_exam_jwt($user_id)], 200); }
function mco_grant_prize_logic($user_id, $prize_id, $prize_label) { $current_expiry = get_user_meta($user_id, 'mco_subscription_expiry', true) ?: time(); if ($prize_id === 'SUB_YEARLY') update_user_meta($user_id, 'mco_subscription_expiry', $current_expiry + YEAR_IN_SECONDS); if ($prize_id === 'SUB_MONTHLY') update_user_meta($user_id, 'mco_subscription_expiry', $current_expiry + MONTH_IN_SECONDS); if ($prize_id === 'SUB_WEEKLY') update_user_meta($user_id, 'mco_subscription_expiry', $current_expiry + WEEK_IN_SECONDS); if ($prize_id === 'EXAM_CPC' || $prize_id === 'EXAM_CCA') { $sku = ($prize_id === 'EXAM_CPC') ? 'exam-cpc-cert' : 'exam-cca-cert'; $granted = get_user_meta($user_id, 'mco_granted_skus', true) ?: []; if (!in_array($sku, $granted)) { $granted[] = $sku; update_user_meta($user_id, 'mco_granted_skus', $granted); } } update_user_meta($user_id, 'mco_wheel_prize', ['prizeId' => $prize_id, 'prizeLabel' => $prize_label]); }
function mco_search_user_callback($request) { $params = $request->get_json_params(); $search_term = sanitize_text_field($params['searchTerm']); $user_query = new WP_User_Query(['search' => '*' . esc_attr($search_term) . '*', 'search_columns' => ['user_login', 'user_email', 'display_name'], 'number' => 10]); $users = []; foreach ($user_query->get_results() as $user) $users[] = ['id' => (string)$user->ID, 'name' => $user->display_name, 'email' => $user->user_email]; return new WP_REST_Response($users, 200); }
function mco_add_spins_callback($request) { $params = $request->get_json_params(); $target_user_id = intval($params['userId']); $spins_to_add = intval($params['spins']); $current_spins = get_user_meta($target_user_id, 'mco_spins_available', true) ?: 0; update_user_meta($target_user_id, 'mco_spins_available', intval($current_spins) + $spins_to_add); return new WP_REST_Response(['success' => true], 200); }
function mco_grant_prize_callback($request) { $params = $request->get_json_params(); $target_user_id = intval($params['userId']); $prize_id = sanitize_text_field($params['prizeId']); $prize_label_map = ['SUB_YEARLY' => 'Annual Subscription', 'SUB_MONTHLY' => 'Monthly Subscription', 'SUB_WEEKLY' => 'Weekly Subscription', 'EXAM_CPC' => 'Free CPC Exam', 'EXAM_CCA' => 'Free CCA Exam']; mco_grant_prize_logic($target_user_id, $prize_id, $prize_label_map[$prize_id] ?? 'Awarded Prize'); return new WP_REST_Response(['success' => true], 200); }
function mco_reset_spins_callback($request) { $params = $request->get_json_params(); $target_user_id = intval($params['userId']); update_user_meta($target_user_id, 'mco_spins_available', 0); return new WP_REST_Response(['success' => true], 200); }
function mco_remove_prize_callback($request) { $params = $request->get_json_params(); $target_user_id = intval($params['userId']); delete_user_meta($target_user_id, 'mco_wheel_prize'); delete_user_meta($target_user_id, 'mco_subscription_expiry'); return new WP_REST_Response(['success' => true], 200); }
function mco_get_exam_stats_callback($request) { $stats = get_transient('mco_exam_stats_v2'); if (false !== $stats) return new WP_REST_Response($stats, 200); $exam_configs = ['exam-cpc-cert' => ['name' => 'CPC Certification Exam', 'passScore' => 70], 'exam-cca-cert' => ['name' => 'CCA Certification Exam', 'passScore' => 70]]; $all_users = get_users(['fields' => ['ID']]); $stats = []; foreach ($exam_configs as $id => $cfg) $stats[$id] = ['examId' => $id, 'examName' => $cfg['name'], 'totalSales' => 0, 'totalAttempts' => 0, 'passed' => 0, 'failed' => 0, '_total_score' => 0]; foreach ($all_users as $user) { $results = get_user_meta($user->ID, 'mco_exam_results', true) ?: []; foreach ($results as $res) { if (isset($stats[$res['examId']])) { $stats[$res['examId']]['totalAttempts']++; $stats[$res['examId']]['_total_score'] += $res['score']; if ($res['score'] >= $exam_configs[$res['examId']]['passScore']) $stats[$res['examId']]['passed']++; else $stats[$res['examId']]['failed']++; } } } $final_stats = []; foreach ($stats as $id => $stat) { $p_id = wc_get_product_id_by_sku($id); $stat['totalSales'] = $p_id ? (int)get_post_meta($p_id, 'total_sales', true) : 0; $stat['passRate'] = $stat['totalAttempts'] > 0 ? ($stat['passed'] / $stat['totalAttempts']) * 100 : 0; $stat['averageScore'] = $stat['totalAttempts'] > 0 ? $stat['_total_score'] / $stat['totalAttempts'] : 0; unset($stat['_total_score']); $final_stats[] = $stat; } set_transient('mco_exam_stats_v2', $final_stats, HOUR_IN_SECONDS); return new WP_REST_Response($final_stats, 200); }
function mco_get_cert_sku_for_exam($exam_id) { $map = ['exam-cpc-practice' => 'exam-cpc-cert', 'exam-cca-practice' => 'exam-cca-cert']; return $map[$exam_id] ?? $exam_id; }

// --- SHORTCODES & FORMS ---
function mco_exam_login_shortcode() {
    if (is_user_logged_in()) {
        $token = mco_generate_exam_jwt(get_current_user_id());
        $sync_url = mco_get_exam_app_url(current_user_can('administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard';
        return '<div style="text-align:center;"><p>You are logged in. Redirecting to your dashboard...</p><script>window.location.href="' . esc_url_raw($sync_url) . '";</script></div>';
    }

    $error_message = '';
    if (isset($_POST['mco_login_submit']) && wp_verify_nonce($_POST['mco_login_nonce'], 'mco_login_action')) {
        $user = wp_signon(['user_login' => sanitize_user($_POST['log']), 'user_password' => $_POST['pwd']], false);
        if (is_wp_error($user)) {
            $error_message = '<p style="color:red;">' . esc_html($user->get_error_message()) . '</p>';
        } else {
            if ($token = mco_generate_exam_jwt($user->ID)) {
                $redirect_url = mco_get_exam_app_url(user_can($user, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard';
                wp_redirect($redirect_url);
                exit;
            } else {
                $error_message = '<p style="color:red;">Could not create secure session.</p>';
            }
        }
    }
    
    ob_start();
    ?>
    <div style="font-family:sans-serif;max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)">
        <h2 style="text-align:center;font-size:24px;margin-bottom:30px">Exam Portal Login</h2>
        <?php echo $error_message; ?>
        <form name="loginform" action="" method="post">
            <p style="margin-bottom:20px"><label for="log" style="display:block;margin-bottom:8px;font-weight:600">Username or Email</label><input type="text" name="log" id="log" required style="width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box"></p>
            <p style="margin-bottom:20px"><label for="pwd" style="display:block;margin-bottom:8px;font-weight:600">Password</label><input type="password" name="pwd" id="pwd" required style="width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box"></p>
            <p><button type="submit" name="mco_login_submit" style="width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer">Log In</button></p>
            <?php wp_nonce_field('mco_login_action', 'mco_login_nonce'); ?>
        </form>
    </div>
    <?php
    return ob_get_clean();
}

function mco_exam_showcase_shortcode() { /* This can be re-implemented if needed */ return 'Exam showcase is temporarily disabled.'; }

// --- WooCommerce Styling Functions (Unified) ---
function mco_add_custom_wc_styles_to_head() {
    if ( function_exists('is_woocommerce') && (is_cart() || is_checkout()) ) {
        echo '<style type="text/css">
            body.woocommerce-cart, body.woocommerce-checkout { background-color: #f8fafc !important; }
            .woocommerce form .form-row input.input-text, .woocommerce select { border-radius: 0.5rem !important; border: 1px solid #cbd5e1 !important; padding: 0.75rem 1rem !important; box-shadow: none !important; }
            .woocommerce .button.alt, .woocommerce #place_order { background-color: #0891b2 !important; color: white !important; border-radius: 0.5rem !important; }
            @media (min-width: 992px) {
                .woocommerce-checkout form.checkout { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; align-items: flex-start; }
                .woocommerce-checkout .col2-set { width: 100% !important; }
                .woocommerce-checkout .woocommerce-checkout-review-order { grid-column: 2 / 3; position: sticky; top: 2rem; }
            }
        </style>';
    }
}
function mco_custom_order_button_text() { return 'Complete Enrollment & Pay Securely'; }

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
                <h2 className="text-xl font-bold mb-2">Restored Integration Plugin</h2>
                <p className="mb-4">
                   This is the restored, self-contained version of the integration plugin based on the code you provided. It should resolve the API and shortcode issues you were experiencing.
                </p>
                <p className="mb-4">
                    Copy the code below, save it as a new plugin file (e.g., <code>mco-exam-engine.php</code>) in your WordPress <code>/wp-content/plugins/</code> directory, and then activate it from your WordPress admin panel.
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
