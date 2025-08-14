
import React from 'react';
import toast from 'react-hot-toast';

const Integration: React.FC = () => {

    const phpCode = `<?php
/**
 * Plugin Name:       MCO Exam App Integration
 * Description:       A unified plugin to integrate the React examination app with WordPress, handling SSO, purchases, and results sync.
 * Version:           6.0.0
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
// This function is now the single source of truth for the app's configuration.
function mco_get_all_app_data() {
    static $app_data = null;
    if ($app_data !== null) return $app_data;

    $logo_base64 = 'data:image/png;base64,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';
    $logo_base64_dark = 'data:image/png;base64,...'; // Add a dark mode logo if available

    $CERTIFICATE_TEMPLATES = [
        ['id' => 'cert-mco-1', 'title' => 'Medical Coding Proficiency', 'body' => 'For successfully demonstrating proficiency in medical coding principles and practices with a final score of <strong>{finalScore}%</strong>. This achievement certifies the holder\'s competence in the standards required for this certification.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-mco-2', 'title' => 'Advanced Specialty Coding', 'body' => 'Awarded for exceptional performance and mastery in advanced specialty coding topics, achieving a score of <strong>{finalScore}%</strong>. This signifies a high level of expertise and dedication to the field.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor']
    ];
    
    $EXAM_PRODUCT_CATEGORIES = [
        ['id' => 'prod-cpc', 'name' => 'CPC', 'description' => 'A test series designed to prepare you for the AAPC CPC (Certified Professional Coder) exam.', 'practiceExamId' => 'exam-cpc-practice', 'certificationExamId' => 'exam-cpc-cert'],
        ['id' => 'prod-cca', 'name' => 'CCA', 'description' => 'A test series for the AHIMA CCA (Certified Coding Associate) credential.', 'practiceExamId' => 'exam-cca-practice', 'certificationExamId' => 'exam-cca-cert'],
        ['id' => 'prod-billing', 'name' => 'Medical Billing', 'description' => 'A test series covering the essentials of medical billing and reimbursement.', 'practiceExamId' => 'exam-billing-practice', 'certificationExamId' => 'exam-billing-cert']
    ];

    $SUGGESTED_BOOKS = [
        ['id' => 'book-cpc-guide', 'title' => 'Official CPC® Certification Study Guide', 'description' => "AAPC's official CPC exam study guide — anatomy, medical terminology, ICD-10-CM, CPT, HCPCS, practice questions and exam tips.", 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1635278910?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1635278910?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1285427998?tag=medical0f1-21']],
        ['id' => 'book-icd10-cm', 'title' => "Buck's ICD-10-CM for Physicians 2026", 'description' => "Physician-focused ICD-10-CM code manual with full-color illustrations, Netter's Anatomy, and detailed guidelines.", 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/0443380783?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/0443380783?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/0443380783?tag=medical0f1-21']],
        ['id' => 'book-step-by-step', 'title' => 'Step-by-Step Medical Coding, 2024 Edition', 'description' => 'This guide provides a solid foundation with a practical approach to mastering medical coding concepts and applications.', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/0323930872?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/0323930872?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/0323930872?tag=medical0f1-21']],
        ['id' => 'book-medical-billing', 'title' => 'Medical Billing & Coding For Dummies', 'description' => 'An easy-to-understand guide covering the basics of medical billing and coding, perfect for beginners.', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1119750393?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1119750393?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1119750393?tag=medical0f1-21']],
    ];

    $DEFAULT_QUESTION_URL = 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing';

    $ALL_EXAMS = [
        // Practice Exams
        ['id' => 'exam-cpc-practice', 'name' => 'CPC Practice Test', 'description' => 'A short practice test to prepare for the CPC certification.', 'price' => 0, 'productSku' => 'exam-cpc-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => $DEFAULT_QUESTION_URL],
        ['id' => 'exam-cca-practice', 'name' => 'CCA Practice Test', 'description' => 'A short practice test for the Certified Coding Associate exam.', 'price' => 0, 'productSku' => 'exam-cca-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => $DEFAULT_QUESTION_URL],
        ['id' => 'exam-billing-practice', 'name' => 'Medical Billing Practice Test', 'description' => 'A short practice test for medical billing concepts.', 'price' => 0, 'productSku' => 'exam-billing-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => true, 'durationMinutes' => 20, 'questionSourceUrl' => $DEFAULT_QUESTION_URL],
        ['id' => 'exam-ccs-practice', 'name' => 'CCS Practice Test', 'description' => 'Practice for the Certified Coding Specialist exam.', 'price' => 0, 'productSku' => 'exam-ccs-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => $DEFAULT_QUESTION_URL],
        ['id' => 'exam-risk-practice', 'name' => 'Risk Adjustment Practice Test', 'description' => 'Practice for the Risk Adjustment (CRC) exam.', 'price' => 0, 'productSku' => 'exam-risk-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => $DEFAULT_QUESTION_URL],
        ['id' => 'exam-icd-practice', 'name' => 'ICD-10-CM Practice Test', 'description' => 'Practice for the ICD-10-CM proficiency exam.', 'price' => 0, 'productSku' => 'exam-icd-practice', 'numberOfQuestions' => 10, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 20, 'questionSourceUrl' => $DEFAULT_QUESTION_URL],
        // Certification Exams
        ['id' => 'exam-cpc-cert', 'name' => 'CPC Certification Exam', 'description' => 'Full certification exam for Certified Professional Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpc-cert', 'productSlug' => 'exam-cpc-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => $DEFAULT_QUESTION_URL, 'recommendedBookId' => 'book-cpc-guide'],
        ['id' => 'exam-cca-cert', 'name' => 'CCA Certification Exam', 'description' => 'Full certification exam for Certified Coding Associate.', 'price' => 120, 'regularPrice' => 120, 'productSku' => 'exam-cca-cert', 'productSlug' => 'exam-cca-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 180, 'questionSourceUrl' => $DEFAULT_QUESTION_URL, 'recommendedBookId' => 'book-step-by-step'],
        ['id' => 'exam-ccs-cert', 'name' => 'CCS Certification Exam', 'description' => 'Full certification exam for Certified Coding Specialist.', 'price' => 160, 'regularPrice' => 160, 'productSku' => 'exam-ccs-cert', 'productSlug' => 'exam-ccs-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => $DEFAULT_QUESTION_URL, 'recommendedBookId' => 'book-icd10-cm'],
        ['id' => 'exam-billing-cert', 'name' => 'Medical Billing Certification Exam', 'description' => 'Comprehensive exam covering medical billing and reimbursement.', 'price' => 100, 'regularPrice' => 100, 'productSku' => 'exam-billing-cert', 'productSlug' => 'exam-billing-cert', 'numberOfQuestions' => 100, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => false, 'durationMinutes' => 150, 'questionSourceUrl' => $DEFAULT_QUESTION_URL, 'recommendedBookId' => 'book-medical-billing'],
        ['id' => 'exam-risk-cert', 'name' => 'Risk Adjustment (CRC) Certification Exam', 'description' => 'Exam for Certified Risk Adjustment Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-risk-cert', 'productSlug' => 'exam-risk-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => $DEFAULT_QUESTION_URL, 'recommendedBookId' => 'book-cpc-guide'],
        ['id' => 'exam-icd-cert', 'name' => 'ICD-10-CM Certification Exam', 'description' => 'Proficiency exam for ICD-10-CM coding.', 'price' => 90, 'regularPrice' => 90, 'productSku' => 'exam-icd-cert', 'productSlug' => 'exam-icd-cert', 'numberOfQuestions' => 100, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 120, 'questionSourceUrl' => $DEFAULT_QUESTION_URL, 'recommendedBookId' => 'book-icd10-cm']
    ];

    $app_data = [
        [
            'id' => 'org-mco', 'name' => 'Medical Coding Online', 'website' => 'www.coding-online.net',
            'logo' => $logo_base64,
            'exams' => $ALL_EXAMS,
            'examProductCategories' => $EXAM_PRODUCT_CATEGORIES,
            'certificateTemplates' => $CERTIFICATE_TEMPLATES,
            'suggestedBooks' => $SUGGESTED_BOOKS
        ]
    ];
    return $app_data;
}

function mco_exam_get_payload($user_id) {
    if (!$user = get_userdata($user_id)) return null;
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $paid_exam_ids = []; $exam_prices = new stdClass();
    
    if (class_exists('WooCommerce')) {
        $all_exam_skus_raw = mco_get_all_app_data()[0]['exams'];
        $all_exam_skus = array_column(array_filter($all_exam_skus_raw, function($e) { return !$e['isPractice'] && isset($e['productSku']); }), 'productSku');
        
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
    register_rest_route('mco-app/v1', '/app-config', ['methods' => 'GET', 'callback' => 'mco_get_app_config_callback', 'permission_callback' => '__return_true']);
    register_rest_route('mco-app/v1', '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/certificate-data/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
}

function mco_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) return new WP_Error('jwt_missing', 'Auth token not found.', ['status' => 401]);
    $payload = mco_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_invalid', 'Invalid token.', ['status' => 403]);
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

function mco_get_app_config_callback() { return new WP_REST_Response(mco_get_all_app_data(), 200); }

function mco_get_questions_from_sheet_callback($request) {
    $params = $request->get_json_params();
    $sheet_url = isset($params['sheetUrl']) ? esc_url_raw($params['sheetUrl']) : '';
    $count = isset($params['count']) ? intval($params['count']) : 100;
    if (empty($sheet_url) || !filter_var($sheet_url, FILTER_VALIDATE_URL)) return new WP_Error('invalid_url', 'Invalid Sheet URL.', ['status' => 400]);
    
    $csv_url = str_replace(['/edit?usp=sharing', '/edit#gid='], ['/export?format=csv', '/export?format=csv&gid='], $sheet_url);
    $response = wp_remote_get($csv_url, ['timeout' => 20]);

    if (is_wp_error($response)) return new WP_Error('fetch_failed', 'Could not retrieve questions source.', ['status' => 500]);
    if (wp_remote_retrieve_response_code($response) !== 200) return new WP_Error('fetch_permission_denied', 'Could not access question source.', ['status' => 502]);

    $lines = explode("\\n", trim(wp_remote_retrieve_body($response)));
    $header = str_getcsv(strtolower(array_shift($lines)));
    $q_idx = array_search('question', $header);
    $o_idx = array_search('options', $header);
    $a_idx = array_search('correct_answer', $header);
    if ($q_idx === false || $o_idx === false || $a_idx === false) return new WP_Error('parse_failed', 'CSV header mismatch.', ['status' => 500]);
    
    $questions = [];
    foreach ($lines as $line) {
        if (empty(trim($line))) continue;
        $row = str_getcsv($line);
        $question_text = trim($row[$q_idx] ?? '');
        $options_str = trim($row[$o_idx] ?? '');
        $correct_answer_text = trim($row[$a_idx] ?? '');

        if (empty($question_text) || empty($options_str) || empty($correct_answer_text)) continue;

        $options = array_map('trim', explode('|', $options_str));
        $correct_answer_index = array_search($correct_answer_text, $options);
        
        if (count($options) >= 2 && $correct_answer_index !== false) {
            $questions[] = [ 'id' => count($questions) + 1, 'question' => $question_text, 'options' => $options, 'correctAnswer' => $correct_answer_index + 1 ];
        }
    }
    
    if (empty($questions)) return new WP_Error('parse_failed', 'No valid questions parsed.', ['status' => 500]);
    shuffle($questions);
    return new WP_REST_Response(array_slice($questions, 0, $count), 200);
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

    $org = mco_get_all_app_data()[0];
    
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
    $all_data = mco_get_all_app_data();
    $categories = $all_data[0]['examProductCategories'];
    $exam_map = array_column($all_data[0]['exams'], null, 'id');
    $app_base_url = mco_get_exam_app_url();

    ob_start(); ?>
    <style>.mco-showcase-container{font-family:sans-serif;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:2rem;margin:2rem 0}.mco-showcase-card{background-color:#fff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);border:1px solid #e2e8f0;overflow:hidden;display:flex;flex-direction:column}.mco-showcase-card-header{background-color:#f8fafc;padding:1.5rem;border-bottom:1px solid #e2e8f0}.mco-showcase-card-header h3{font-size:1.5rem;margin:0}.mco-showcase-card-header p{color:#64748b;margin:.5rem 0 0}.mco-showcase-card-body{padding:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;flex-grow:1}.mco-showcase-section{display:flex;flex-direction:column;justify-content:space-between}.mco-showcase-section h4{margin:0 0 .5rem}.mco-showcase-section .exam-name{flex-grow:1;margin-bottom:1rem}.mco-showcase-price{font-size:1.75rem;font-weight:700;color:#0d9488;margin-bottom:1rem}.mco-showcase-btn{display:block;text-align:center;padding:.75rem 1rem;border-radius:8px;text-decoration:none;font-weight:600}.btn-practice{background-color:#e2e8f0;color:#334155}.btn-cert{background-color:#0891b2;color:#fff}@media (max-width:768px){.mco-showcase-card-body{grid-template-columns:1fr}}</style>
    <div class="mco-showcase-container">
        <?php foreach ($categories as $category):
            $practice_exam = $exam_map[$category['practiceExamId']] ?? null;
            $cert_exam = $exam_map[$category['certificationExamId']] ?? null;
            if (!$practice_exam && !$cert_exam) continue;
        ?>
            <div class="mco-showcase-card">
                <div class="mco-showcase-card-header">
                    <h3><?php echo esc_html($category['name']); ?> Program</h3>
                    <p><?php echo esc_html($category['description']); ?></p>
                </div>
                <div class="mco-showcase-card-body">
                    <?php if ($practice_exam): ?>
                        <div class="mco-showcase-section">
                            <div><h4>Free Practice Test</h4><p class="exam-name"><?php echo esc_html($practice_exam['name']); ?></p></div>
                            <a href="<?php echo esc_url($app_base_url . '#/test/' . $practice_exam['id']); ?>" class="mco-showcase-btn btn-practice">Start Practice</a>
                        </div>
                    <?php endif; ?>
                    <?php if ($cert_exam && isset($cert_exam['productSlug'])): ?>
                         <div class="mco-showcase-section">
                            <div><h4>Certification Exam</h4><p class="exam-name"><?php echo esc_html($cert_exam['name']); ?></p><p class="mco-showcase-price">$<?php echo esc_html(number_format($cert_exam['price'], 2)); ?></p></div>
                            <a href="<?php echo esc_url(home_url('/product/' . $cert_exam['productSlug'] . '/')); ?>" class="mco-showcase-btn btn-cert">Purchase Exam</a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php return ob_get_clean();
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