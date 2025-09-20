<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A multi-tenant engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and API services. Provides [mco_exam_login] and [mco_exam_showcase] shortcodes.
 * Version:           27.4.0 (Feature Management & Tools)
 * Author:            Annapoorna Infotech
 */

if (!defined('ABSPATH')) exit;

// --- NEW: Handle OPTIONS requests early for CORS Preflight ---
if (!function_exists('mco_handle_preflight_requests')) {
    function mco_handle_preflight_requests() {
        if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            // Our existing CORS function already has the logic to check the origin and send headers.
            // It also gracefully exits for OPTIONS requests if the origin is allowed.
            mco_add_cors_support();
        }
    }
}
// Hook into 'init' with an early priority to catch the request before routing.
// This allows us to respond to preflight checks without needing a valid WP route.
add_action('init', 'mco_handle_preflight_requests', 5);


define('MCO_PLUGIN_VERSION', '27.4.0');
define('MCO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MCO_PLUGIN_URL', plugin_dir_url(__FILE__));

// --- FAILSAFE DEPENDENCY CHECK ---
if (!function_exists('mco_failsafe_dependency_check')) {
    function mco_failsafe_dependency_check() {
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', 'mco_dependency_error_notice');
            deactivate_plugins(plugin_basename(__FILE__));
            if (isset($_GET['activate'])) {
                unset($_GET['activate']);
            }
        }
    }
}
if (!function_exists('mco_dependency_error_notice')) {
    function mco_dependency_error_notice() {
        echo '<div class="notice notice-error is-dismissible">';
        echo '<p><strong>Exam App Integration Engine</strong> has been automatically deactivated because it requires the <strong>WooCommerce</strong> plugin to be installed and active. Please install or activate WooCommerce, then try activating this plugin again.</p>';
        echo '</div>';
    }
}
add_action('admin_init', 'mco_failsafe_dependency_check');

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

if (!function_exists('mco_plugin_activate')) {
    function mco_plugin_activate() {
        require_once MCO_PLUGIN_DIR . 'includes/mco-cpts.php';
        mco_register_custom_post_types();
        flush_rewrite_rules();
        update_option('mco_plugin_version', MCO_PLUGIN_VERSION);
    }
}

if (!function_exists('mco_plugin_deactivate')) {
    function mco_plugin_deactivate() {
        flush_rewrite_rules();
        delete_option('mco_plugin_version');
    }
}

// --- INITIALIZATION & UPDATE CHECKER ---
if (!function_exists('mco_plugin_init')) {
    function mco_plugin_init() {
        // On init, check if the plugin version has changed. If so, flush rewrite rules.
        // This ensures API routes are always correctly registered after an update.
        if (get_option('mco_plugin_version') !== MCO_PLUGIN_VERSION) {
            flush_rewrite_rules();
            update_option('mco_plugin_version', MCO_PLUGIN_VERSION);
        }
        
        if (!class_exists('WooCommerce')) {
            return;
        }

        require_once MCO_PLUGIN_DIR . 'includes/mco-cpts.php';
        require_once MCO_PLUGIN_DIR . 'includes/mco-admin.php';
        require_once MCO_PLUGIN_DIR . 'includes/mco-data.php';
        require_once MCO_PLUGIN_DIR . 'includes/mco-api.php';
        require_once MCO_PLUGIN_DIR . 'includes/mco-shortcodes.php';

        // CRITICAL FIX: Register Custom Post Types directly within the 'init' action.
        // This ensures they are available before any other hooks (like admin_menu or rest_api_init) need them.
        mco_register_custom_post_types();

        mco_register_admin_hooks();
        mco_register_admin_tabs();
        mco_register_api_hooks();
        mco_register_shortcode_hooks();

        // Add CORS support for direct API calls from the React app
        add_action('rest_api_init', function() {
            remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
            add_filter('rest_pre_serve_request', function($value) {
                mco_add_cors_support();
                return $value;
            }, 15);
        });
    }
}
add_action('init', 'mco_plugin_init');


// --- CORS SUPPORT FOR DYNAMIC FRONTEND ---
if (!function_exists('mco_add_cors_support')) {
    function mco_add_cors_support() {
        $origin = get_http_origin();
        if (!$origin) {
            return; // Not a CORS request.
        }

        $is_allowed = false;

        // 1. Check against the explicitly configured URL in settings. This is the highest priority override.
        $app_url_setting = get_option('mco_exam_app_url');
        if (!empty($app_url_setting)) {
            $setting_origin = rtrim($app_url_setting, '/');
            if ($origin === $setting_origin) {
                $is_allowed = true;
            }
        }

        // 2. If not allowed by the explicit setting, dynamically check if the origin is a subdomain of this site.
        // This provides flexible multi-tenancy support without hardcoding subdomain names like 'exams.' or 'app.'.
        if (!$is_allowed) {
            $site_host = parse_url(site_url(), PHP_URL_HOST);
            $origin_host = parse_url($origin, PHP_URL_HOST);

            if ($site_host && $origin_host) {
                // Remove 'www.' to get the base domain for comparison.
                $base_domain = preg_replace('/^www\\./', '', $site_host);

                // An origin is allowed if:
                // a) It's the exact same host (e.g., www.example.com)
                // b) It's the base domain (e.g., example.com)
                // c) It's any subdomain of the base domain (e.g., exams.example.com, app.example.com, etc.)
                if (
                    $origin_host === $site_host ||
                    $origin_host === $base_domain ||
                    preg_match('/\\.' . preg_quote($base_domain) . '$/', $origin_host)
                ) {
                    $is_allowed = true;
                }
            }
        }
        
        // Allow known Vercel preview domain for staging
        if (!$is_allowed && $origin === 'https://mco-25.vercel.app') {
            $is_allowed = true;
        }

        if ($is_allowed) {
            header('Access-Control-Allow-Origin: ' . esc_url($origin));
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');

            if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
                status_header(200);
                exit();
            }
        }
    }
}
?>