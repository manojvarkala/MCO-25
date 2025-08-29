import React, { FC } from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';

const Integration: FC = () => {
    const phpCode = `<?php
/**
 * Plugin Name:       Exam App Integration Engine
 * Description:       A generic engine to integrate the React examination app with any WordPress/WooCommerce site, handling SSO, dynamic data, and styling.
 * Version:           24.5.2 (Auto-flush rewrite rules on update)
 * Author:            Annapoorna Infotech (Multi-Tenant Engine)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define('MCO_PLUGIN_VERSION', '24.5.2');

// --- ACTIVATION / DEACTIVATION HOOKS ---
register_activation_hook(__FILE__, 'mco_plugin_activate');
register_deactivation_hook(__FILE__, 'mco_plugin_deactivate');

function mco_plugin_activate() {
    mco_register_custom_post_types();
    flush_rewrite_rules();
    set_transient('mco_admin_notice_activation', true, 5);
    add_option('mco_plugin_version', MCO_PLUGIN_VERSION);
}

function mco_plugin_deactivate() {
    flush_rewrite_rules();
    delete_option('mco_plugin_version');
}

// --- CONFIGURATION ---
// IMPORTANT: Define this in your wp-config.php file. Example:
// define('MCO_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// --- END CONFIGURATION ---

// --- INITIALIZATION ---
add_action('init', 'mco_exam_app_init');
function mco_exam_app_init() {
    mco_register_custom_post_types();
    add_action('admin_notices', 'mco_check_dependencies');
    add_action('admin_menu', 'mco_exam_add_admin_menu');
    add_action('admin_init', 'mco_exam_register_settings');
    add_action('woocommerce_thankyou', 'mco_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'mco_exam_register_rest_api');
    
    add_action('add_meta_boxes', 'mco_add_meta_boxes');
    
    add