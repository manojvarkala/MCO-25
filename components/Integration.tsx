

import React from 'react';
import toast from 'react-hot-toast';
import { logoBase64 } from '@/assets/logo.ts';

const Integration: React.FC = () => {

    const phpCode = `<?php
/**
 * Plugin Name:       MCO Exam App Integration
 * Description:       A unified plugin to integrate the React examination app with WordPress, handling SSO, purchases, and results sync.
 * Version:           6.2.0
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
function mco_get_all_app_data() {
    static $app_data = null;
    if ($app_data !== null) return $app_data;
    
    $logo_base64 = '${logoBase64}';

    $CERTIFICATE_TEMPLATES = [
        ['id' => 'cert-practice-1', 'title' => 'Medical Coding Proficiency', 'body' => 'For successfully demonstrating proficiency in medical coding principles and practices with a final score of <strong>{finalScore}%</strong>. This certifies the holder\\'s competence in the standards required for this certification.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-cpc', 'title' => 'Certified Professional Coder (CPC)', 'body' => 'For successfully demonstrating proficiency in medical coding principles and practices with a final score of <strong>{finalScore}%</strong>. This certifies competence in the standards required for the CPC credential.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-cca', 'title' => 'Certified Coding Associate (CCA)', 'body' => 'Awarded for exceptional performance and mastery in coding topics, achieving a score of <strong>{finalScore}%</strong>. This signifies a high level of expertise for the CCA credential.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-billing', 'title' => 'Medical Billing Specialist', 'body' => 'For successfully demonstrating proficiency in medical billing and reimbursement with a final score of <strong>{finalScore}%</strong>. This achievement certifies competence in specialized billing standards.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-ccs', 'title' => 'Certified Coding Specialist (CCS)', 'body' => 'For demonstrating mastery in classifying medical data from patient records with a final score of <strong>{finalScore}%</strong>, as required for the CCS credential.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-risk', 'title' => 'Certified Risk Adjustment Coder (CRC)', 'body' => 'Awarded for demonstrating expertise in risk adjustment coding with a score of <strong>{finalScore}%</strong>. This signifies competence in linking diagnosis codes to patient conditions for accurate risk assessment.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-icd', 'title' => 'ICD-10-CM Proficiency', 'body' => 'For successfully demonstrating advanced proficiency in the International Classification of Diseases, Tenth Revision, Clinical Modification (ICD-10-CM) with a final score of <strong>{finalScore}%</strong>.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor']
    ];
    
    $EXAM_PRODUCT_CATEGORIES = [
        ['id' => 'prod-cpc', 'name' => 'CPC', 'description' => 'A test series designed to prepare you for the AAPC CPC (Certified Professional Coder) exam.', 'practiceExamId' => 'exam-cpc-practice', 'certificationExamId' => 'exam-cpc-cert'],
        ['id' => 'prod-cca', 'name' => 'CCA', 'description' => 'A test series for the AHIMA CCA (Certified Coding Associate) credential.', 'practiceExamId' => 'exam-cca-practice', 'certificationExamId' => 'exam-cca-cert'],
        ['id' => 'prod-billing', 'name' => 'Medical Billing', 'description' => 'A test series covering the essentials of medical billing and reimbursement.', 'practiceExamId' => 'exam-billing-practice', 'certificationExamId' => 'exam-billing-cert'],
        ['id' => 'prod-ccs', 'name' => 'CCS', 'description' => 'A test series for the AHIMA CCS (Certified Coding Specialist) credential.', 'practiceExamId' => 'exam-ccs-practice', 'certificationExamId' => 'exam-ccs-cert'],
        ['id' => 'prod-risk', 'name' => 'Risk Adjustment', 'description' => 'A test series for the Risk Adjustment Coder (CRC) credential.', 'practiceExamId' => 'exam-risk-practice', 'certificationExamId' => 'exam-risk-cert'],
        ['id' => 'prod-icd', 'name' => 'ICD-10-CM', 'description' => 'A test series for ICD-10-CM coding proficiency.', 'practiceExamId' => 'exam-icd-practice', 'certificationExamId' => 'exam-icd-cert'],
    ];

    $ALL_EXAMS = [
        // Practice Exams
        ['id' => 'exam-cpc-practice', 'name' => 'CPC Practice Test', 'description' => 'A short practice test to prepare for the CPC certification.', 'price' => 0, 'productSku' => 'exam-cpc-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing'],
        ['id' => 'exam-cca-practice', 'name' => 'CCA Practice Test', 'description' => 'A short practice test for the Certified Coding Associate exam.', 'price' => 0, 'productSku' => 'exam-cca-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing'],
        ['id' => 'exam-billing-practice', 'name' => 'Medical Billing Practice Test', 'description' => 'A short practice test for medical billing concepts.', 'price' => 0, 'productSku' => 'exam-billing-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => 20, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing'],
        ['id' => 'exam-ccs-practice', 'name' => 'CCS Practice Test', 'description' => 'Practice for the Certified Coding Specialist exam.', 'price' => 0, 'productSku' => 'exam-ccs-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing'],
        ['id' => 'exam-risk-practice', 'name' => 'Risk Adjustment Practice Test', 'description' => 'Practice for the Risk Adjustment (CRC) exam.', 'price' => 0, 'productSku' => 'exam-risk-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing'],
        ['id' => 'exam-icd-practice', 'name' => 'ICD-10-CM Practice Test', 'description' => 'Practice for the ICD-10-CM proficiency exam.', 'price' => 0, 'productSku' => 'exam-icd-practice', 'numberOfQuestions' => 10, 'passScore' => 75, 'certificateTemplateId' => 'cert-practice-1', 'isPractice' => true, 'durationMinutes' => 20, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing'],
        // Certification Exams
        ['id' => 'exam-cpc-cert', 'name' => 'CPC Certification Exam', 'description' => 'Full certification exam for Certified Professional Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpc-cert', 'productSlug' => 'cpc-certification-exam-preparation', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-cpc', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing', 'recommendedBookId' => 'book-cpc-guide'],
        ['id' => 'exam-cca-cert', 'name' => 'CCA Certification Exam', 'description' => 'Full certification exam for Certified Coding Associate.', 'price' => 120, 'regularPrice' => 120, 'productSku' => 'exam-cca-cert', 'productSlug' => 'cca-certification-exam-preparation', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-cca', 'isPractice' => false, 'durationMinutes' => 180, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing', 'recommendedBookId' => 'book-step-by-step'],
        ['id' => 'exam-ccs-cert', 'name' => 'CCS Certification Exam', 'description' => 'Full certification exam for Certified Coding Specialist.', 'price' => 160, 'regularPrice' => 160, 'productSku' => 'exam-ccs-cert', 'productSlug' => 'ccs-certification-exam-preparation', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-ccs', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing', 'recommendedBookId' => 'book-icd10-cm'],
        ['id' => 'exam-billing-cert', 'name' => 'Medical Billing Certification Exam', 'description' => 'Comprehensive exam covering medical billing and reimbursement.', 'price' => 100, 'regularPrice' => 100, 'productSku' => 'exam-billing-cert', 'productSlug' => 'medical-billing-certification-exam-preparation', 'numberOfQuestions' => 100, 'passScore' => 75, 'certificateTemplateId' => 'cert-billing', 'isPractice' => false, 'durationMinutes' => 150, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing', 'recommendedBookId' => 'book-medical-billing'],
        ['id' => 'exam-risk-cert', 'name' => 'Risk Adjustment (CRC) Certification Exam', 'description' => 'Exam for Certified Risk Adjustment Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-risk-cert', 'productSlug' => 'risk-adjustment-crc-certification-exam', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-risk', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing', 'recommendedBookId' => 'book-cpc-guide'],
        ['id' => 'exam-icd-cert', 'name' => 'ICD-10-CM Certification Exam', 'description' => 'Proficiency exam for ICD-10-CM coding.', 'price' => 90, 'regularPrice' => 90, 'productSku' => 'exam-icd-cert', 'productSlug' => 'icd-10-cm-certification-exam-preparation', 'numberOfQuestions' => 100, 'passScore' => 75, 'certificateTemplateId' => 'cert-icd', 'isPractice' => false, 'durationMinutes' => 120, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing', 'recommendedBookId' => 'book-icd10-cm']
    ];

    $SUGGESTED_BOOKS = [
        ['id' => 'book-cpc-guide', 'title' => 'Official CPC® Certification Study Guide', 'description' => "AAPC's official CPC exam study guide — anatomy, medical terminology, ICD-10-CM, CPT, HCPCS, practice questions and exam tips.", 'affiliateLinks' => [ 'com' => 'https://www.amazon.com/dp/1635278910?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1635278910?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1285427998?tag=medical0f1-21']],
        ['id' => 'book-icd10-cm', 'title' => "Buck's ICD-10-CM for Physicians 2026", 'description' => "Physician-focused ICD-10-CM code manual with full-color illustrations, Netter's Anatomy, and detailed guidelines.", 'affiliateLinks' => [ 'com' => 'https://www.amazon.com/dp/0443380783?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/0443380783?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/0443380783?tag=medical0f1-21']],
        ['id' => 'book-cpt-pro', 'title' => 'AMA CPT® Professional 2026', 'description' => 'The official Current Procedural Terminology (CPT) codebook from the American Medical Association, essential for every coder.', 'affiliateLinks' => [ 'com' => 'https://www.amazon.com/dp/1640163354?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1640163354?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1640163354?tag=medical0f1-21']],
        ['id' => 'book-hcpcs-level2', 'title' => 'HCPCS Level II Professional 2026', 'description' => 'Comprehensive guide for HCPCS Level II codes used for supplies, equipment, and drugs administered by physicians.', 'affiliateLinks' => [ 'com' => 'https://www.amazon.com/dp/1622029947?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1622029947?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1622029947?tag=medical0f1-21']],
        ['id' => 'book-medical-billing', 'title' => 'Medical Billing & Coding For Dummies', 'description' => 'An easy-to-understand guide covering the basics of medical billing and coding, perfect for beginners.', 'affiliateLinks' => [ 'com' => 'https://www.amazon.com/dp/1119750393?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1119750393?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1119750393?tag=medical0f1-21']],
        ['id' => 'book-step-by-step', 'title' => 'Step-by-Step Medical Coding, 2024 Edition', 'description' => 'This guide provides a solid foundation with a practical approach to mastering medical coding concepts and applications.', 'affiliateLinks' => [ 'com' => 'https://www.amazon.com/dp/0323930872?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/0323930872?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/0323930872?tag=medical0f1-21']],
    ];

    $app_data = [
        [
            'id' => 'org-mco', 'name' => 'Medical Coding Online', 'website' => 'www.coding-online.net',
            'logo' => $logo_base64,
            'exams' => $ALL_EXAMS,
            'examProductCategories' => $EXAM_PRODUCT_CATEGORIES,
            'certificateTemplates' => $CERTIFICATE_TEMPLATES,
            'suggestedBooks' => $SUGGESTED_BOOKS,
        ]
    ];
    return $app_data;
}

// ... (Rest of the functions: mco_exam_get_payload, mco_generate_exam_jwt, etc.)

function mco_exam_get_payload($user_id) {
    if (!$user = get_userdata($user_id)) return null;
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $paid_exam_ids = []; $exam_prices = new stdClass();
    
    if (class_exists('WooCommerce')) {
        $all_exam_skus_raw = mco_get_all_app_data()[0]['exams'];
        $all_exam_skus = array_column(array_filter($all_exam_skus_raw, function($e) { return !$e['isPractice'] && isset($e['productSku']); }), 'productSku');
        
        $exam_prices = get_transient('mco_exam_prices');
        if (false === $exam_prices) {
            mco_debug_log('Exam prices cache miss. Fetching from DB.');
            $exam_prices = new stdClass();
            foreach ($all_exam_skus as $sku) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $price = (float) $product->get_price();
                    $regular_price = (float) $product->get_regular_price();
                    if ($regular_price > $price) {
                        $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => $regular_price];
                    } else {
                        $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => $price];
                    }
                }
            }
            set_transient('mco_exam_prices', $exam_prices, 12 * HOUR_IN_SECONDS);
        }

        $customer_orders = wc_get_orders(['customer' => $user_id, 'status' => ['wc-completed', 'wc-processing'], 'limit' => -1]);
        $purchased_skus = [];
        if ($customer_orders) {
            foreach ($customer_orders as $order) {
                foreach ($order->get_items() as $item) {
                    $product = $item->get_product();
                    if ($product && $product->get_sku()) $purchased_skus[] = $product->get_sku();
                }
            }
        }
        $paid_exam_ids = array_values(array_intersect($all_exam_skus, array_unique($purchased_skus)));
    }
    
    return ['iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (60 * 60 * 2), 'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => user_can($user, 'administrator')], 'paidExamIds' => array_unique($paid_exam_ids), 'examPrices' => $exam_prices];
}

function mco_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function mco_verify_exam_jwt($token) { $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32) return null; $parts = explode('.', $token); if (count($parts) !== 3) return null; list($header_b64, $payload_b64, $signature_b64) = $parts; $signature = base64_decode(strtr($signature_b64, '-_', '+/')); $expected_signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); if (!hash_equals($expected_signature, $signature)) return null; $payload = json_decode(base64_decode(strtr($payload_b64, '-_', '+/')), true); return (isset($payload['exp']) && $payload['exp'] < time()) ? null : $payload; }
function mco_generate_exam_jwt($user_id) { $secret_key = defined('MCO_JWT_SECRET') ? MCO_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32 || strpos($secret_key, 'your-very-strong-secret-key') !== false) { mco_debug_log('JWT Secret is not configured or is too weak.'); return null; } if (!$payload = mco_exam_get_payload($user_id)) return null; $header_b64 = mco_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256'])); $payload_b64 = mco_base64url_encode(json_encode($payload)); $signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); $signature_b64 = mco_base64url_encode($signature); return "$header_b64.$payload_b64.$signature_b64"; }

function mco_redirect_after_purchase($order_id) { if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return; if ($user_id > 0 && $order->has_status(['completed', 'processing', 'on-hold'])) { if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart(); if ($token = mco_generate_exam_jwt($user_id)) { wp_redirect(mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard'); exit; } } }

// --- REST API ENDPOINTS ---
function mco_exam_register_rest_api() {
    register_rest_route('mco-app/v1', '/app-config', ['methods' => 'GET', 'callback' => 'mco_get_app_config_callback', 'permission_callback' => '__return_true']);
    register_rest_route('mco-app/v1', '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/result/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'mco_get_single_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/certificate-data/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/update-name', ['methods' => 'POST', 'callback' => 'mco_exam_update_user_name_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/submit-result', ['methods' => 'POST', 'callback' => 'mco_exam_submit_result_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
    register_rest_route('mco-app/v1', '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet_callback', 'permission_callback' => 'mco_exam_api_permission_check']);
}

function mco_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) return new WP_Error('jwt_missing', 'Authorization token not found.', ['status' => 401]);
    $payload = mco_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_invalid', 'Invalid or expired token.', ['status' => 403]);
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

function mco_get_app_config_callback() { return new WP_REST_Response(mco_get_all_app_data(), 200); }

function mco_get_questions_from_sheet_callback($request) {
    $params = $request->get_json_params(); $sheet_url = isset($params['sheetUrl']) ? esc_url_raw($params['sheetUrl']) : ''; $count = isset($params['count']) ? intval($params['count']) : 100;
    if (empty($sheet_url) || !filter_var($sheet_url, FILTER_VALIDATE_URL)) return new WP_Error('invalid_url', 'Invalid Google Sheet URL.', ['status' => 400]);
    $csv_url = str_replace(['/edit?usp=sharing', '/edit#gid='], ['/export?format=csv', '/export?format=csv&gid='], $sheet_url);
    $response = wp_remote_get($csv_url, ['timeout' => 20]);
    if (is_wp_error($response)) { mco_debug_log('Sheet fetch failed: ' . $response->get_error_message()); return new WP_Error('fetch_failed', 'Could not get questions.', ['status' => 500]); }
    $body = wp_remote_retrieve_body($response); $lines = explode("\\n", trim($body)); array_walk($lines, function(&$line) { $line = trim($line); });
    $header = str_getcsv(array_shift($lines)); $questions = [];
    foreach ($lines as $line) {
        if (empty(trim($line))) continue; $row = str_getcsv($line);
        if (count($row) < 3) continue;
        $options = array_slice($row, 1, -1); $options = array_map('trim', array_filter($options, 'trim'));
        $correct_answer_text = trim(end($row)); $correct_answer_index = array_search($correct_answer_text, $options);
        if (count($options) < 2 || $correct_answer_index === false) continue;
        $questions[] = ['id' => count($questions) + 1, 'question' => trim($row[0]), 'options' => $options, 'correctAnswer' => $correct_answer_index + 1];
    }
    if (empty($questions)) return new WP_Error('parse_failed', 'No valid questions could be parsed.', ['status' => 500]);
    shuffle($questions); $selected_questions = array_slice($questions, 0, $count);
    $final_questions = []; foreach($selected_questions as $index => $q) { $q['id'] = $index + 1; $final_questions[] = $q; }
    return new WP_REST_Response($final_questions, 200);
}

function mco_get_user_results_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); if ($user_id <= 0) return new WP_Error('invalid_user', 'Invalid user.', ['status' => 403]); $results = get_user_meta($user_id, 'mco_exam_results', true); return new WP_REST_Response(empty($results) || !is_array($results) ? [] : array_values($results), 200); }
function mco_get_single_result_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); $test_id = sanitize_key($request['test_id']); $all_results = get_user_meta($user_id, 'mco_exam_results', true); if (is_array($all_results) && isset($all_results[$test_id])) return new WP_REST_Response($all_results[$test_id], 200); return new WP_Error('not_found', 'Result not found.', ['status' => 404]); }
function mco_get_certificate_data_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id'); $test_id = $request['test_id']; $user = get_userdata($user_id); if (!$user) return new WP_Error('user_not_found', 'User not found.', ['status' => 404]);
    $org = mco_get_all_app_data()[0];
    if ($test_id === 'sample') { $template = $org['certificateTemplates'][0]; $candidate_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name; return new WP_REST_Response(['certificateNumber' => "SAMPLE-" . time(), 'candidateName' => $candidate_name, 'finalScore' => 95.5, 'date' => date('F j, Y'), 'totalQuestions' => 100, 'organization' => $org, 'template' => $template], 200); }
    $all_results = get_user_meta($user_id, 'mco_exam_results', true); if (!is_array($all_results) || !isset($all_results[sanitize_key($test_id)])) return new WP_Error('not_found', 'Result not found.', ['status' => 404]);
    $result = $all_results[sanitize_key($test_id)]; $exam = null; foreach ($org['exams'] as $e) { if ($e['id'] === $result['examId']) { $exam = $e; break; } }
    if (!$exam || ($result['score'] < $exam['passScore'] && !user_can($user, 'administrator'))) return new WP_Error('not_earned', 'Certificate not earned.', ['status' => 403]);
    $template = null; foreach ($org['certificateTemplates'] as $t) { if ($t['id'] === $exam['certificateTemplateId']) { $template = $t; break; } }
    if (!$template) return new WP_Error('not_found', 'Certificate template not found.', ['status' => 404]);
    $candidate_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    return new WP_REST_Response(['certificateNumber' => substr($user_id, 0, 4) . '-' . substr(md5($test_id), 0, 6), 'candidateName' => $candidate_name, 'finalScore' => $result['score'], 'date' => date('F j, Y', $result['timestamp'] / 1000), 'totalQuestions' => $result['totalQuestions'], 'organization' => $org, 'template' => $template], 200);
}
function mco_exam_update_user_name_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); if (!get_userdata($user_id)) return new WP_Error('user_not_found', 'User not found.', ['status' => 404]); $full_name = isset($request->get_json_params()['fullName']) ? sanitize_text_field($request->get_json_params()['fullName']) : ''; if (empty($full_name)) return new WP_Error('name_empty', 'Full name cannot be empty.', ['status' => 400]); $name_parts = explode(' ', $full_name, 2); update_user_meta($user_id, 'first_name', $name_parts[0]); update_user_meta($user_id, 'last_name', isset($name_parts[1]) ? $name_parts[1] : ''); return new WP_REST_Response(['success' => true, 'message' => 'Name updated successfully.'], 200); }
function mco_exam_submit_result_callback($request) { $user_id = (int)$request->get_param('jwt_user_id'); $result_data = $request->get_json_params(); foreach (['testId', 'examId', 'score', 'correctCount', 'totalQuestions', 'timestamp'] as $key) { if (!isset($result_data[$key])) return new WP_Error('invalid_data', "Missing key: {$key}", ['status' => 400]); } $result_data['userId'] = (string)$user_id; $all_results = get_user_meta($user_id, 'mco_exam_results', true); if (!is_array($all_results)) $all_results = []; $all_results[$result_data['testId']] = $result_data; update_user_meta($user_id, 'mco_exam_results', $all_results); return new WP_REST_Response($result_data, 200); }

// --- SHORTCODES & FORMS ---
function mco_exam_login_shortcode() {
    if (!defined('MCO_JWT_SECRET')) {
        return "<p class='mco-portal-error'>Configuration error: A strong MCO_JWT_SECRET must be defined in wp-config.php.</p>";
    }
    $login_error_message = '';
    $user_id = 0;
    if ('POST' === $_SERVER['REQUEST_METHOD'] && !empty($_POST['mco_login_nonce']) && wp_verify_nonce($_POST['mco_login_nonce'], 'mco_login_action')) {
        $user = wp_signon(['user_login' => sanitize_user($_POST['log']), 'user_password' => $_POST['pwd'], 'remember' => true], false);
        if (is_wp_error($user)) { $login_error_message = 'Invalid username or password.'; } else { $user_id = $user->ID; }
    }
    if (is_user_logged_in() && $user_id === 0) { $user_id = get_current_user_id(); }
    if ($user_id > 0) {
        $token = mco_generate_exam_jwt($user_id);
        if ($token) {
            $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard';
            $final_url = mco_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            echo "<div class='mco-portal-container' style='text-align:center;'><p>Login successful. Redirecting...</p><script>window.location.href='" . esc_url_raw($final_url) . "';</script></div>";
            return;
        } else { $login_error_message = 'Could not create a secure session. Please contact support.'; }
    }
    ob_start(); ?>
    <style>.mco-portal-container{font-family:sans-serif;max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)}.mco-portal-container h2{text-align:center;font-size:24px;margin-bottom:30px}.mco-portal-container .form-row{margin-bottom:20px}.mco-portal-container label{display:block;margin-bottom:8px;font-weight:600}.mco-portal-container input{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}.mco-portal-container button{width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}.mco-portal-container button:hover{background-color:#067a8e}.mco-portal-links{margin-top:20px;text-align:center}.mco-portal-error{color:red;text-align:center;margin-bottom:20px}</style>
    <div class="mco-portal-container">
        <h2>Exam Portal Login</h2>
        <?php if ($login_error_message) echo "<p class='mco-portal-error'>" . esc_html($login_error_message) . "</p>"; ?>
        <form name="loginform" action="<?php echo esc_url(get_permalink()); ?>" method="post">
            <div class="form-row"><label for="log">Username or Email</label><input type="text" name="log" id="log" required></div>
            <div class="form-row"><label for="pwd">Password</label><input type="password" name="pwd" id="pwd" required></div>
            <div class="form-row"><button type="submit">Log In</button></div>
            <?php wp_nonce_field('mco_login_action', 'mco_login_nonce'); ?>
            <?php if (isset($_REQUEST['redirect_to'])): ?><input type="hidden" name="redirect_to" value="<?php echo esc_attr(urlencode($_REQUEST['redirect_to'])); ?>" /><?php endif; ?>
        </form>
        <div class="mco-portal-links"><a href="<?php echo esc_url(wp_registration_url()); ?>">Register</a> | <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Lost Password?</a></div>
    </div>
    <?php return ob_get_clean();
}

function mco_exam_showcase_shortcode() {
    $all_data = mco_get_all_app_data();
    $categories = $all_data[0]['examProductCategories'];
    $exam_map = array_column($all_data[0]['exams'], null, 'id');
    $app_base_url = mco_get_exam_app_url();
    ob_start(); ?>
    <style> .mco-showcase-container{font-family:sans-serif;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:2rem;margin:2rem 0}.mco-showcase-card{background-color:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1);border:1px solid #e2e8f0;overflow:hidden;display:flex;flex-direction:column}.mco-showcase-card-header{background-color:#f8fafc;padding:1.5rem;border-bottom:1px solid #e2e8f0}.mco-showcase-card-header h3{font-size:1.5rem;font-weight:700;color:#1e293b;margin:0}.mco-showcase-card-header p{font-size:.9rem;color:#64748b;margin:.5rem 0 0}.mco-showcase-card-body{padding:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;flex-grow:1}.mco-showcase-section{display:flex;flex-direction:column;justify-content:space-between}.mco-showcase-section h4{font-size:1.1rem;font-weight:600;color:#334155;margin:0 0 .5rem}.mco-showcase-section .exam-name{font-size:.95rem;color:#475569;flex-grow:1;margin-bottom:1rem}.mco-showcase-price{margin-bottom:1rem}.mco-showcase-btn{display:block;text-align:center;padding:.75rem 1rem;border-radius:8px;text-decoration:none;font-weight:600;transition:background-color .2s}.btn-practice{background-color:#e2e8f0;color:#334155}.btn-practice:hover{background-color:#cbd5e1}.btn-cert{background-color:#0891b2;color:#fff}.btn-cert:hover{background-color:#067a8e}@media (max-width:768px){.mco-showcase-card-body{grid-template-columns:1fr}} </style>
    <div class="mco-showcase-container">
        <?php foreach ($categories as $category): ?>
            <?php $practice_exam = $exam_map[$category['practiceExamId']] ?? null; $cert_exam = $exam_map[$category['certificationExamId']] ?? null; ?>
            <div class="mco-showcase-card">
                <div class="mco-showcase-card-header"><h3><?php echo esc_html($category['name']); ?> Program</h3><p><?php echo esc_html($category['description']); ?></p></div>
                <div class="mco-showcase-card-body">
                    <?php if ($practice_exam): ?>
                        <div class="mco-showcase-section"><div><h4>Free Practice Test</h4><p class="exam-name"><?php echo esc_html($practice_exam['name']); ?></p></div><a href="<?php echo esc_url($app_base_url . '#/test/' . $practice_exam['id']); ?>" class="mco-showcase-btn btn-practice">Start Practice</a></div>
                    <?php endif; ?>
                    <?php if ($cert_exam && isset($cert_exam['productSlug'])): ?>
                         <div class="mco-showcase-section">
                            <div><h4>Certification Exam</h4><p class="exam-name"><?php echo esc_html($cert_exam['name']); ?></p>
                                <div class="mco-showcase-price">
                                    <?php if (isset($cert_exam['regularPrice']) && $cert_exam['regularPrice'] > $cert_exam['price']): ?>
                                        <del style="color:#94a3b8;font-size:1.2rem;margin-right:.5rem;">$<?php echo esc_html(number_format($cert_exam['regularPrice'], 2)); ?></del>
                                        <ins style="color:#10b981;font-size:1.75rem;text-decoration:none;font-weight:bold;">$<?php echo esc_html(number_format($cert_exam['price'], 2)); ?></ins>
                                    <?php else: ?>
                                        <span style="color:#0891b2;font-size:1.75rem;font-weight:bold;">$<?php echo esc_html(number_format($cert_exam['price'], 2)); ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <a href="<?php echo esc_url(home_url('/product/' . $cert_exam['productSlug'] . '/')); ?>" class="mco-showcase-btn btn-cert">Purchase Exam</a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php return ob_get_clean();
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
                    <li><strong>Activate Plugin:</strong> Go to the "Plugins" page in your WordPress admin dashboard. You should see "MCO Exam App Integration". Click "Activate".</li>
                </ol>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Usage</h2>
                 <p>Once activated, the plugin provides two shortcodes:</p>
                <ul>
                    <li><code>[mco_exam_login]</code>: Creates the secure login form that enables Single Sign-On into the exam application. Create a page called "Exam Login" and place this shortcode on it.</li>
                    <li><code>[mco_exam_showcase]</code>: Displays a dynamic, styled grid of your exam programs, pulling data directly from this plugin file.</li>
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