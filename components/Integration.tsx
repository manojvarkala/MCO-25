
import React, { FC } from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A multi-tenant engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and API services. Provides [exam_login] and [exam_program_page] shortcodes.
 * Version:           26.0.0 (Server-Centric Architecture)
 * Author:            Annapoorna Infotech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define('MCO_PLUGIN_VERSION', '26.0.0');

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

function mco_plugin_activate() {
    if (!file_exists(plugin_dir_path(__FILE__) . 'data')) {
        mkdir(plugin_dir_path(__FILE__) . 'data', 0755, true);
        file_put_contents(plugin_dir_path(__FILE__) . 'data/medical-coding-config.json', '{"organizations":[]}');
        file_put_contents(plugin_dir_path(__FILE__) . 'data/annapoorna-config.json', '{"organizations":[]}');
    }
    mco_register_rest_api_routes();
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
        mco_register_rest_api_routes();
        flush_rewrite_rules();
        update_option('mco_plugin_version', MCO_PLUGIN_VERSION);
    }
}
add_action('plugins_loaded', 'mco_check_plugin_version');

// --- INITIALIZATION ---
add_action('init', function() {
    add_action('admin_notices', 'mco_check_dependencies');
    add_action('admin_menu', 'mco_exam_add_admin_menu');
    add_action('admin_init', 'mco_exam_register_settings');
    add_action('rest_api_init', 'mco_register_rest_api_routes');
    add_shortcode('exam_login', 'mco_exam_login_shortcode');
    add_shortcode('exam_program_page', 'mco_exam_program_page_shortcode');
    add_action('template_redirect', 'mco_handle_my_account_redirect');
});

// --- DEPENDENCY CHECKS ---
function mco_check_dependencies() {
    if (!class_exists('WooCommerce')) {
        echo '<div class="notice notice-error"><p><strong>Exam App Integration:</strong> WooCommerce is required for this plugin to function.</p></div>';
    }
    if (!defined('MCO_JWT_SECRET') || empty(MCO_JWT_SECRET)) {
        echo '<div class="notice notice-warning"><p><strong>Exam App Integration:</strong> <strong>MCO_JWT_SECRET</strong> constant is not defined in your wp-config.php. SSO will not work. Please add <code>define(\\'MCO_JWT_SECRET\\', \\'your-very-long-and-random-secret-key\\');</code></p></div>';
    }
}

// --- ADMIN SETTINGS PAGE ---
function mco_exam_add_admin_menu() {
    add_menu_page('Exam App Settings', 'Exam App', 'manage_options', 'mco-exam-app', 'mco_exam_settings_page_html', 'dashicons-welcome-learn-more', 26);
}

function mco_exam_register_settings() {
    register_setting('mco-exam-settings', 'mco_exam_app_url');
}

function mco_exam_settings_page_html() { ?>
    <div class="wrap">
        <h1>Exam App Integration Settings (v<?php echo MCO_PLUGIN_VERSION; ?>)</h1>
        <p>This plugin is the bridge between WordPress and the React Exam Application.</p>
        
        <div style="background: #fff; border: 1px solid #ccd0d4; padding: 1rem 2rem; margin-top: 2rem;">
            <h2><span class="dashicons dashicons-admin-settings" style="vertical-align: middle;"></span> Core Setup</h2>
            <form method="post" action="options.php">
                <?php settings_fields('mco-exam-settings'); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Exam App URL</th>
                        <td>
                            <input type="url" name="mco_exam_app_url" value="<?php echo esc_attr(get_option('mco_exam_app_url')); ?>" class="regular-text" placeholder="https://exams.yourdomain.com" />
                            <p class="description">The full URL where the React exam application is hosted. This is crucial for login and purchase redirects.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>

        <div style="background: #fff; border: 1px solid #ccd0d4; padding: 1rem 2rem; margin-top: 2rem;">
            <h2><span class="dashicons dashicons-text-page" style="vertical-align: middle;"></span> Platform Blueprint</h2>
            <p>This plugin acts as the server and single source of truth for the exam app.</p>
            <ul>
                <li>✔️ <strong>Authentication:</strong> Handles Single Sign-On (SSO) using JWT tokens.</li>
                <li>✔️ <strong>Configuration:</strong> Provides all exam, category, and book data via a new <code>/wp-json/mco-app/v1/app-config</code> API endpoint.</li>
                <li>✔️ <strong>Data Sync:</strong> Saves user results, prizes, and other data to WordPress user meta fields.</li>
                <li>✔️ <strong>Shortcodes:</strong> Includes <code>[exam_login]</code> and <code>[exam_program_page]</code> for easy integration into your pages.</li>
            </ul>
        </div>
    </div>
<?php }

// --- JWT HELPER FUNCTIONS ---
function base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

// --- MAIN JWT GENERATION ---
function mco_generate_jwt_token_for_user($user) {
    if (!defined('MCO_JWT_SECRET') || empty(MCO_JWT_SECRET) || !$user instanceof WP_User) return false;
    
    $secret_key = MCO_JWT_SECRET;
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);

    $paid_exam_skus = [];
    if (class_exists('WooCommerce')) {
        $customer_orders = wc_get_orders(['customer_id' => $user->ID, 'status' => ['wc-completed', 'wc-processing']]);
        foreach ($customer_orders as $order) {
            foreach ($order->get_items() as $item) {
                $product = $item->get_product();
                if ($product && $product->get_sku()) $paid_exam_skus[] = $product->get_sku();
            }
        }
    }

    $exam_prices = [];
    $products_query = new WC_Product_Query(['status' => 'publish', 'limit' => -1]);
    $products = $products_query->get_products();
    foreach ($products as $product) {
        if ($product->get_sku()) {
            $reviews = get_comments(['post_id' => $product->get_id(), 'status' => 'approve', 'type' => 'review']);
            $avg_rating = 0;
            if ($reviews) {
                $total_rating = 0;
                foreach ($reviews as $review) $total_rating += intval(get_comment_meta($review->comment_ID, 'rating', true));
                if (count($reviews) > 0) $avg_rating = $total_rating / count($reviews);
            }
            $exam_prices[$product->get_sku()] = [
                'price' => (float) $product->get_price(), 'regularPrice' => (float) $product->get_regular_price(),
                'productId' => $product->get_id(), 'avgRating' => round($avg_rating, 2), 'reviewCount' => count($reviews)
            ];
        }
    }
    
    $is_subscribed = function_exists('wcs_user_has_subscription') && wcs_user_has_subscription($user->ID, '', 'active');
    $spins_available = (int) get_user_meta($user->ID, 'mco_spins_available', true);
    $won_prize_meta = get_user_meta($user->ID, 'mco_won_prize', true);
    $won_prize = is_array($won_prize_meta) ? $won_prize_meta : null;

    $payload_data = [
        'user' => ['id' => $user->ID, 'name' => $user->display_name, 'email' => $user->user_email, 'isAdmin' => in_array('administrator', $user->roles)],
        'paidExamIds' => array_values(array_unique($paid_exam_skus)), 'examPrices' => $exam_prices, 'isSubscribed' => $is_subscribed,
        'spinsAvailable' => $spins_available, 'wonPrize' => $won_prize, 'iat' => time(), 'exp' => time() + (24 * 60 * 60)
    ];
    
    $config = mco_get_app_config_data_array();
    if($config) {
        $first_org = isset($config['organizations'][0]) ? $config['organizations'][0] : [];
        $payload_data['suggestedBooks'] = $first_org['suggestedBooks'] ?? [];
        $payload_data['exams'] = $first_org['exams'] ?? [];
        $payload_data['examProductCategories'] = $first_org['examProductCategories'] ?? [];
    }

    $payload = json_encode($payload_data);
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payload);
    $signature_raw = hash_hmac('sha256', "$base64UrlHeader.$base64UrlPayload", $secret_key, true);
    $base64UrlSignature = base64url_encode($signature_raw);
    
    return "$base64UrlHeader.$base64UrlPayload.$base64UrlSignature";
}

// --- CONFIGURATION DATA SOURCE ---
function mco_get_app_config_data_array() {
    $host = $_SERVER['HTTP_HOST'] ?? 'default';
    if (strpos($host, 'annapoornainfo.com') !== false) {
        $config_path = plugin_dir_path(__FILE__) . 'data/annapoorna-config.json';
    } else {
        $config_path = plugin_dir_path(__FILE__) . 'data/medical-coding-config.json';
    }
    return file_exists($config_path) ? json_decode(file_get_contents($config_path), true) : ['organizations' => []];
}

// --- JWT Verifier & User Fetcher ---
function mco_get_user_from_jwt(WP_REST_Request $request) {
    if (!defined('MCO_JWT_SECRET') || empty(MCO_JWT_SECRET)) return new WP_Error('jwt_no_secret', 'JWT secret key is not configured.', ['status' => 500]);
    
    $auth_header = $request->get_header('Authorization');
    if (!$auth_header || !preg_match('/Bearer\\s(\\S+)/', $auth_header, $matches)) return new WP_Error('jwt_no_header', 'Authorization header missing or invalid.', ['status' => 401]);
    
    $token = $matches[1];
    $parts = explode('.', $token);
    if (count($parts) !== 3) return new WP_Error('jwt_invalid_token', 'Invalid token structure.', ['status' => 401]);

    list($header, $payload, $signature) = $parts;
    $signature_check = base64url_encode(hash_hmac('sha256', "$header.$payload", MCO_JWT_SECRET, true));

    if (!hash_equals($signature_check, $signature)) return new WP_Error('jwt_signature_failed', 'Token signature verification failed.', ['status' => 403]);

    $decoded_payload = json_decode(base64url_decode($payload), true);
    if (!$decoded_payload || !isset($decoded_payload['exp']) || !isset($decoded_payload['user']['id'])) return new WP_Error('jwt_invalid_payload', 'Invalid payload.', ['status' => 401]);

    if ($decoded_payload['exp'] < time()) return new WP_Error('jwt_expired', 'Token has expired.', ['status' => 401]);
    
    $user = get_userdata($decoded_payload['user']['id']);
    return $user ?: new WP_Error('jwt_user_not_found', 'User not found.', ['status' => 404]);
}

// --- REST API ENDPOINTS ---
function mco_register_rest_api_routes() {
    $namespace = 'mco-app/v1';
    $permission_callback = fn($req) => !is_wp_error(mco_get_user_from_jwt($req));
    $admin_permission_callback = function($req) {
        $user = mco_get_user_from_jwt($req);
        return !is_wp_error($user) && in_array('administrator', $user->roles);
    };

    register_rest_route($namespace, '/app-config', ['methods' => 'GET', 'callback' => 'mco_get_app_config_data', 'permission_callback' => '__return_true']);
    register_rest_route($namespace, '/user-results', ['methods' => 'GET', 'callback' => 'mco_get_user_results', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/submit-result', ['methods' => 'POST', 'callback' => 'mco_submit_user_result', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/certificate-data/(?P<testId>[a-zA-Z0-9-]+)', ['methods' => 'GET', 'callback' => 'mco_get_certificate_data', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/update-name', ['methods' => 'POST', 'callback' => 'mco_update_user_name', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'mco_get_questions_from_sheet', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/submit-feedback', ['methods' => 'POST', 'callback' => 'mco_submit_feedback', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/submit-review', ['methods' => 'POST', 'callback' => 'mco_submit_review', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/spin-wheel', ['methods' => 'POST', 'callback' => 'mco_spin_wheel', 'permission_callback' => $permission_callback]);
    register_rest_route($namespace, '/exam-stats', ['methods' => 'GET', 'callback' => 'mco_get_exam_stats', 'permission_callback' => $admin_permission_callback]);
    register_rest_route($namespace, '/debug-details', ['methods' => 'GET', 'callback' => 'mco_get_debug_details', 'permission_callback' => $admin_permission_callback]);
    register_rest_route($namespace, '/search-user', ['methods' => 'POST', 'callback' => 'mco_search_user', 'permission_callback' => $admin_permission_callback]);
    register_rest_route($namespace, '/add-spins', ['methods' => 'POST', 'callback' => 'mco_add_spins', 'permission_callback' => $admin_permission_callback]);
    register_rest_route($namespace, '/reset-spins', ['methods' => 'POST', 'callback' => 'mco_reset_spins', 'permission_callback' => $admin_permission_callback]);
    register_rest_route($namespace, '/grant-prize', ['methods' => 'POST', 'callback' => 'mco_grant_prize', 'permission_callback' => $admin_permission_callback]);
    register_rest_route($namespace, '/remove-prize', ['methods' => 'POST', 'callback' => 'mco_remove_prize', 'permission_callback' => $admin_permission_callback]);
}

// --- API CALLBACKS ---
function mco_get_app_config_data() { return new WP_REST_Response(mco_get_app_config_data_array(), 200); }

function mco_get_user_results(WP_REST_Request $req) {
    $user = mco_get_user_from_jwt($req);
    $results = get_user_meta($user->ID, 'mco_exam_results', true);
    return new WP_REST_Response(is_array($results) ? array_values($results) : [], 200);
}

function mco_submit_user_result(WP_REST_Request $req) {
    $user = mco_get_user_from_jwt($req);
    $result_data = $req->get_json_params();
    if (empty($result_data['testId'])) return new WP_Error('bad_request', 'Missing testId.', ['status' => 400]);
    $results = get_user_meta($user->ID, 'mco_exam_results', true) ?: [];
    $results[$result_data['testId']] = $result_data;
    update_user_meta($user->ID, 'mco_exam_results', $results);
    return new WP_REST_Response(['success' => true], 200);
}

function mco_get_certificate_data(WP_REST_Request $req) {
    $user = mco_get_user_from_jwt($req);
    $test_id = $req['testId'];
    $results = get_user_meta($user->ID, 'mco_exam_results', true);
    if (empty($results) || !isset($results[$test_id])) return new WP_Error('not_found', 'Test result not found.', ['status' => 404]);
    $result = $results[$test_id];
    $config = mco_get_app_config_data_array();
    $exam = current(array_filter($config['organizations'][0]['exams'], fn($e) => $e['id'] === $result['examId']));
    if (!$exam) return new WP_Error('not_found', 'Exam configuration not found.', ['status' => 404]);
    if ($result['score'] < $exam['passScore'] && !in_array('administrator', $user->roles)) return new WP_Error('forbidden', 'Certificate not earned for this exam.', ['status' => 403]);
    return new WP_REST_Response([
        'certificateNumber' => strtoupper(substr(md5($user->ID . $test_id), 0, 10)), 'candidateName' => $user->display_name,
        'finalScore' => $result['score'], 'date' => date('F j, Y', $result['timestamp'] / 1000), 'examId' => $result['examId'],
    ], 200);
}

function mco_update_user_name(WP_REST_Request $req) {
    $user = mco_get_user_from_jwt($req);
    $full_name = sanitize_text_field($req->get_param('fullName'));
    if (empty($full_name)) return new WP_Error('bad_request', 'Full name cannot be empty.', ['status' => 400]);
    wp_update_user(['ID' => $user->ID, 'display_name' => $full_name]);
    return new WP_REST_Response(['success' => true, 'name' => $full_name], 200);
}

function mco_get_questions_from_sheet(WP_REST_Request $req) {
    // A full implementation would use Google API client library or cURL to fetch from sheetUrl.
    // This is a placeholder for demonstration.
    return new WP_REST_Response([], 501, ['message' => 'Not implemented. The server must be configured to fetch from Google Sheets.']);
}

function mco_submit_feedback(WP_REST_Request $req) {
    $user = mco_get_user_from_jwt($req);
    $params = $req->get_json_params();
    $admin_email = get_option('admin_email');
    $subject = "Exam App Feedback: " . sanitize_text_field($params['category']);
    $body = "From: " . $user->user_email . "\\n\\n" . sanitize_textarea_field($params['message']);
    wp_mail($admin_email, $subject, $body);
    return new WP_REST_Response(['success' => true], 200);
}

function mco_submit_review(WP_REST_Request $req) {
    if (!class_exists('WooCommerce')) return new WP_Error('no_woocommerce', 'WooCommerce is not active.', ['status' => 500]);
    $user = mco_get_user_from_jwt($req);
    $params = $req->get_json_params();
    $config = mco_get_app_config_data_array();
    $exam = current(array_filter($config['organizations'][0]['exams'], fn($e) => $e['id'] === $params['examId']));
    $product = wc_get_product_id_by_sku($exam['productSku']);
    if (!$product) return new WP_Error('not_found', 'Product for review not found.', ['status' => 404]);
    
    $commentdata = ['comment_post_ID' => $product, 'comment_author' => $user->display_name, 'comment_author_email' => $user->user_email,
        'comment_content' => sanitize_textarea_field($params['reviewText']), 'user_id' => $user->ID, 'comment_type' => 'review', 'comment_approved' => 1,];
    $comment_id = wp_insert_comment($commentdata);
    update_comment_meta($comment_id, 'rating', intval($params['rating']));
    return new WP_REST_Response(['success' => true], 200);
}

function mco_spin_wheel(WP_REST_Request $req) {
    $user = mco_get_user_from_jwt($req);
    $spins = (int) get_user_meta($user->ID, 'mco_spins_available', true);
    if ($spins <= 0 && !in_array('administrator', $user->roles)) return new WP_Error('forbidden', 'No spins available.', ['status' => 403]);
    if (!in_array('administrator', $user->roles)) update_user_meta($user->ID, 'mco_spins_available', $spins - 1);
    
    $prizes = [['id' => 'SUB_MONTHLY', 'label' => 'Monthly Subscription'], ['id' => 'NEXT_TIME', 'label' => 'Better Luck Next Time']];
    $won = $prizes[array_rand($prizes)];
    $prize_data = ['prizeId' => $won['id'], 'prizeLabel' => $won['label']];
    update_user_meta($user->ID, 'mco_won_prize', $prize_data);
    return new WP_REST_Response(['prizeId' => $won['id'], 'prizeLabel' => $won['label'], 'newToken' => mco_generate_jwt_token_for_user($user)], 200);
}

function mco_get_exam_stats(WP_REST_Request $req) { return new WP_REST_Response([], 200); }

function mco_get_debug_details(WP_REST_Request $req) {
    $user = mco_get_user_from_jwt($req);
    $results = get_user_meta($user->ID, 'mco_exam_results', true);
    $purchases = [];
    if (class_exists('WooCommerce')) {
        $orders = wc_get_orders(['customer_id' => $user->ID, 'status' => ['wc-completed', 'wc-processing']]);
        foreach ($orders as $order) foreach ($order->get_items() as $item) if($p = $item->get_product()) $purchases[] = $p->get_sku();
    }
    return new WP_REST_Response(['user' => ['id' => $user->ID, 'name' => $user->display_name, 'email' => $user->user_email],
        'purchases' => array_unique($purchases), 'results' => is_array($results) ? array_values($results) : [],
        'sheetTest' => ['success' => false, 'message' => 'Google Sheets test not implemented in plugin.']], 200);
}

function mco_search_user(WP_REST_Request $req) {
    $term = sanitize_text_field($req->get_param('searchTerm'));
    $users = get_users(['search' => "*{$term}*", 'search_columns' => ['user_login', 'user_email', 'display_name']]);
    $results = array_map(fn($u) => ['id' => $u->ID, 'name' => $u->display_name, 'email' => $u->user_email], $users);
    return new WP_REST_Response($results, 200);
}

function mco_add_spins(WP_REST_Request $req) {
    $user_id = (int)$req->get_param('userId'); $spins = (int)$req->get_param('spins');
    $new_total = (int)get_user_meta($user_id, 'mco_spins_available', true) + $spins;
    update_user_meta($user_id, 'mco_spins_available', $new_total);
    return new WP_REST_Response(['success' => true, 'newTotal' => $new_total], 200);
}

function mco_reset_spins(WP_REST_Request $req) {
    update_user_meta((int)$req->get_param('userId'), 'mco_spins_available', 0);
    return new WP_REST_Response(['success' => true, 'message' => 'Spins reset.'], 200);
}

function mco_grant_prize(WP_REST_Request $req) {
    $prize_data = ['prizeId' => $req->get_param('prizeId'), 'prizeLabel' => "Prize: ".$req->get_param('prizeId')];
    update_user_meta((int)$req->get_param('userId'), 'mco_won_prize', $prize_data);
    return new WP_REST_Response(['success' => true, 'message' => 'Prize granted.'], 200);
}

function mco_remove_prize(WP_REST_Request $req) {
    delete_user_meta((int)$req->get_param('userId'), 'mco_won_prize');
    return new WP_REST_Response(['success' => true, 'message' => 'Prize removed.'], 200);
}

// --- SHORTCODES & REDIRECTS ---
function mco_exam_login_shortcode() {
    if (!is_user_logged_in()) {
        $login_url = wp_login_url($_SERVER['REQUEST_URI']);
        return '<a href="'.esc_url($login_url).'" class="button">Log In to Access Exams</a>';
    }
    $app_url = get_option('mco_exam_app_url');
    $token = mco_generate_jwt_token_for_user(wp_get_current_user());
    if (!$app_url || !$token) return '<p>Exam portal is not configured correctly. Please contact an administrator.</p>';
    $redirect_url = rtrim($app_url, '/') . '/#/auth?token=' . $token . '&redirect_to=/dashboard';
    return '<a href="'.esc_url($redirect_url).'" class="button">Go to Your Dashboard</a>';
}

function mco_exam_program_page_shortcode() {
    // This shortcode can be expanded to display dynamic content from the config.
    // For now, it provides a simple link to the app.
    $app_url = get_option('mco_exam_app_url');
    if (!$app_url) return '<p>Exam portal URL not set.</p>';
    return '<a href="'.esc_url($app_url).'" class="button">Browse All Exam Programs</a>';
}

function mco_handle_my_account_redirect() {
    if (is_user_logged_in() && function_exists('is_account_page') && is_account_page() && !is_wc_endpoint_url()) {
        $user = wp_get_current_user();
        $token = mco_generate_jwt_token_for_user($user);
        $app_url = get_option('mco_exam_app_url', '');
        if ($app_url && $token) {
            wp_safe_redirect(rtrim($app_url, '/') . '/#/auth?token=' . $token . '&redirect_to=/dashboard');
            exit;
        }
    }
}
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
                <h2 className="text-xl font-bold mb-2">The Integration Engine (v26.0)</h2>
                <p className="mb-4">
                    This is the master plugin for integrating the exam app with your WordPress site. It handles Single Sign-On (SSO), data synchronization, and provides powerful shortcodes for displaying content. <strong>This version makes WordPress the single source of truth for all application configuration.</strong>
                </p>
                <p className="mb-4">
                    <strong>Instructions:</strong>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                        <li>Copy the code below and save it as a new PHP file (e.g., <code>mco-integration-engine.php</code>).</li>
                        <li>Create a folder named <code>data</code> inside your new plugin folder.</li>
                        <li>Inside <code>data</code>, place your configuration files: <code>medical-coding-config.json</code> and <code>annapoorna-config.json</code>. The plugin will automatically select the correct one based on the domain.</li>
                        <li>Upload the entire plugin folder to your WordPress <code>/wp-content/plugins/</code> directory.</li>
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
