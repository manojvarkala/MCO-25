<?php
if (!defined('ABSPATH')) exit;

/**
 * MCO MASTER ROUTE REGISTRY
 * Maps every frontend service call to an industrial handler.
 */

add_action('rest_api_init', function() {
    $namespace = 'mco-app/v1';

    // --- PUBLIC ENDPOINTS ---
    register_rest_route($namespace, '/config', [
        'methods' => 'GET',
        'callback' => 'mco_handle_get_config',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/hit', [
        'methods' => 'POST',
        'callback' => 'mco_handle_record_hit',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/register-tester', [
        'methods' => 'POST',
        'callback' => 'mco_handle_register_tester',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/resend-onboarding-email', [
        'methods' => 'POST',
        'callback' => 'mco_handle_resend_onboarding_email',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/redeem-tester-token', [
        'methods' => 'POST',
        'callback' => 'mco_handle_redeem_tester_token',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/verify-certificate/(?P<id>[a-zA-Z0-9\-_]+)', [
        'methods' => 'GET',
        'callback' => 'mco_handle_verify_certificate',
        'permission_callback' => '__return_true'
    ]);

    // --- PROTECTED USER ENDPOINTS ---
    $user_auth = ['permission_callback' => 'mco_api_validate_jwt'];

    // Real-time Entitlement Sync
    register_rest_route($namespace, '/sync-auth', array_merge($user_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_sync_auth'
    ]));

    register_rest_route($namespace, '/user-results', array_merge($user_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_get_user_results'
    ]));

    register_rest_route($namespace, '/submit-result', array_merge($user_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_submit_result'
    ]));

    register_rest_route($namespace, '/questions-from-sheet', array_merge($user_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_questions_from_sheet'
    ]));

    register_rest_route($namespace, '/create-checkout-session', array_merge($user_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_create_checkout_session'
    ]));

    register_rest_route($namespace, '/certificate-data/(?P<id>[a-zA-Z0-9\-_]+)', array_merge($user_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_get_certificate_data'
    ]));

    register_rest_route($namespace, '/update-name', array_merge($user_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_update_name'
    ]));

    register_rest_route($namespace, '/submit-feedback', array_merge($user_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_submit_feedback'
    ]));

    register_rest_route($namespace, '/submit-review', array_merge($user_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_submit_review'
    ]));

    register_rest_route($namespace, '/log-engagement', array_merge($user_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_log_engagement'
    ]));

    // --- PROTECTED ADMIN ENDPOINTS ---
    $admin_auth = ['permission_callback' => 'mco_api_validate_admin_jwt'];

    register_rest_route($namespace, '/debug-details', array_merge($admin_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_get_debug_details'
    ]));

    register_rest_route($namespace, '/exam-stats', array_merge($admin_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_get_exam_stats'
    ]));

    register_rest_route($namespace, '/admin/beta-testers', array_merge($admin_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_admin_get_beta_testers'
    ]));

    register_rest_route($namespace, '/admin/resend-beta-email', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_resend_beta_email'
    ]));

    register_rest_route($namespace, '/admin/system-status', array_merge($admin_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_admin_get_status'
    ]));

    register_rest_route($namespace, '/admin/test-sheet-url', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_test_sheet_url'
    ]));

    register_rest_route($namespace, '/admin/clear-config-cache', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_clear_config_cache'
    ]));

    register_rest_route($namespace, '/admin/clear-question-caches', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_clear_question_caches'
    ]));

    register_rest_route($namespace, '/admin/clear-all-results', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_clear_all_results'
    ]));

    register_rest_route($namespace, '/admin/update-exam-program', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_update_exam_program'
    ]));

    register_rest_route($namespace, '/admin/create-exam-program', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_create_exam_program'
    ]));

    register_rest_route($namespace, '/admin/upsert-product', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_upsert_product'
    ]));

    register_rest_route($namespace, '/admin/delete-post', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_delete_post'
    ]));

    register_rest_route($namespace, '/admin/toggle-beta-status', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_toggle_beta_status'
    ]));

    register_rest_route($namespace, '/admin/post-creation-data', array_merge($admin_auth, [
        'methods' => 'GET',
        'callback' => 'mco_handle_admin_get_post_creation_data'
    ]));

    register_rest_route($namespace, '/admin/create-post-from-app', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_create_post'
    ]));

    register_rest_route($namespace, '/admin/update-global-settings', array_merge($admin_auth, [
        'methods' => 'POST',
        'callback' => 'mco_handle_admin_update_settings'
    ]));
});