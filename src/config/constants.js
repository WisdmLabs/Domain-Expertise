// File: ./src/config/constants.js

/**
 * Configuration constants for WordPress analyzer
 */

module.exports = {
    // HTTP Configuration
    HTTP: {
        TIMEOUT: 10000, // 10 seconds
        MAX_REDIRECTS: 5,
        USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },

    // WordPress Detection Patterns
    WORDPRESS_INDICATORS: {
        PATHS: [
            '/wp-content/',
            '/wp-includes/',
            '/wp-admin/',
            'wp-json'
        ],
        CLASSES: [
            'wp-',
            'wordpress',
            'wpadminbar'
        ],
        META_NAMES: [
            'generator'
        ]
    },

    // Version Detection Endpoints
    VERSION_ENDPOINTS: {
        README: '/readme.html',
        OPML: '/wp-links-opml.php',
        RSS: '/feed/',
        SITEMAP: '/wp-sitemap.xml'
    },

    // WordPress.org API
    WORDPRESS_API: {
        BASE_URL: 'https://api.wordpress.org',
        PLUGIN_INFO: '/plugins/info/1.0/',
        THEME_INFO: '/themes/info/1.1/'
    },

    // Common Plugin Indicators
    PLUGIN_INDICATORS: [
        { pattern: /wp-rocket/i, name: 'wp-rocket', displayName: 'WP Rocket' },
        { pattern: /yoast/i, name: 'wordpress-seo', displayName: 'Yoast SEO' },
        { pattern: /elementor/i, name: 'elementor', displayName: 'Elementor' },
        { pattern: /contact-form-7/i, name: 'contact-form-7', displayName: 'Contact Form 7' },
        { pattern: /woocommerce/i, name: 'woocommerce', displayName: 'WooCommerce' },
        { pattern: /jetpack/i, name: 'jetpack', displayName: 'Jetpack' },
        { pattern: /wpforms/i, name: 'wpforms-lite', displayName: 'WPForms' },
        { pattern: /akismet/i, name: 'akismet', displayName: 'Akismet' },
        { pattern: /wordfence/i, name: 'wordfence', displayName: 'Wordfence Security' },
        { pattern: /rank-math/i, name: 'seo-by-rank-math', displayName: 'Rank Math SEO' },
        // Additional popular plugins
        { pattern: /gravity.*forms/i, name: 'gravityforms', displayName: 'Gravity Forms' },
        { pattern: /ninja.*forms/i, name: 'ninja-forms', displayName: 'Ninja Forms' },
        { pattern: /advanced.*custom.*fields/i, name: 'advanced-custom-fields', displayName: 'Advanced Custom Fields' },
        { pattern: /wp.*bakery/i, name: 'js_composer', displayName: 'WPBakery Page Builder' },
        { pattern: /visual.*composer/i, name: 'js_composer', displayName: 'Visual Composer' },
        { pattern: /slider.*revolution/i, name: 'revslider', displayName: 'Slider Revolution' },
        { pattern: /layer.*slider/i, name: 'layerslider', displayName: 'LayerSlider' },
        { pattern: /mailchimp/i, name: 'mailchimp-for-wp', displayName: 'Mailchimp for WordPress' },
        { pattern: /constant.*contact/i, name: 'constant-contact-forms', displayName: 'Constant Contact Forms' },
        { pattern: /wp.*super.*cache/i, name: 'wp-super-cache', displayName: 'WP Super Cache' },
        { pattern: /w3.*total.*cache/i, name: 'w3-total-cache', displayName: 'W3 Total Cache' },
        { pattern: /litespeed/i, name: 'litespeed-cache', displayName: 'LiteSpeed Cache' },
        { pattern: /autoptimize/i, name: 'autoptimize', displayName: 'Autoptimize' },
        { pattern: /wp.*optimize/i, name: 'wp-optimize', displayName: 'WP-Optimize' },
        { pattern: /smush/i, name: 'wp-smushit', displayName: 'Smush' },
        { pattern: /wp.*fastest.*cache/i, name: 'wp-fastest-cache', displayName: 'WP Fastest Cache' }
    ],

    // Common Plugin CSS Selectors
    PLUGIN_SELECTORS: [
        { selector: '.wp-block-', name: 'gutenberg-blocks', displayName: 'Gutenberg Blocks' },
        { selector: '[class*="elementor"]', name: 'elementor', displayName: 'Elementor' },
        { selector: '[class*="woocommerce"]', name: 'woocommerce', displayName: 'WooCommerce' },
        { selector: '[class*="yoast"]', name: 'wordpress-seo', displayName: 'Yoast SEO' },
        { selector: '[id*="jetpack"]', name: 'jetpack', displayName: 'Jetpack' },
        // Additional CSS selectors
        { selector: '.wpcf7', name: 'contact-form-7', displayName: 'Contact Form 7' },
        { selector: '.wpforms-form', name: 'wpforms-lite', displayName: 'WPForms' },
        { selector: '.gform_wrapper', name: 'gravityforms', displayName: 'Gravity Forms' },
        { selector: '.nf-form-wrap', name: 'ninja-forms', displayName: 'Ninja Forms' },
        { selector: '.acf-field', name: 'advanced-custom-fields', displayName: 'Advanced Custom Fields' },
        { selector: '.vc_row', name: 'js_composer', displayName: 'Visual Composer' },
        { selector: '.wpb_row', name: 'js_composer', displayName: 'WPBakery Page Builder' },
        { selector: '#rev_slider', name: 'revslider', displayName: 'Slider Revolution' },
        { selector: '.ls-container', name: 'layerslider', displayName: 'LayerSlider' },
        { selector: '.rank-math-breadcrumb', name: 'seo-by-rank-math', displayName: 'Rank Math SEO' },
        { selector: '.wp-rocket-vimeo-lazyload', name: 'wp-rocket', displayName: 'WP Rocket' }
    ],

    // REST API Endpoints for Plugin Detection
    REST_API_ENDPOINTS: [
        { endpoint: '/wp-json/yoast/v1/', name: 'wordpress-seo', displayName: 'Yoast SEO' },
        { endpoint: '/wp-json/wc/v3/', name: 'woocommerce', displayName: 'WooCommerce' },
        { endpoint: '/wp-json/elementor/v1/', name: 'elementor', displayName: 'Elementor' },
        { endpoint: '/wp-json/contact-form-7/v1/', name: 'contact-form-7', displayName: 'Contact Form 7' },
        { endpoint: '/wp-json/wpforms/v1/', name: 'wpforms-lite', displayName: 'WPForms' },
        { endpoint: '/wp-json/gf/v2/', name: 'gravityforms', displayName: 'Gravity Forms' },
        { endpoint: '/wp-json/jetpack/v4/', name: 'jetpack', displayName: 'Jetpack' },
        { endpoint: '/wp-json/rankmath/v1/', name: 'seo-by-rank-math', displayName: 'Rank Math SEO' }
    ],

    // JavaScript Variables and Objects
    JS_VARIABLES: [
        { variable: 'woocommerce_params', name: 'woocommerce', displayName: 'WooCommerce' },
        { variable: 'elementorFrontendConfig', name: 'elementor', displayName: 'Elementor' },
        { variable: 'yoast_seo', name: 'wordpress-seo', displayName: 'Yoast SEO' },
        { variable: 'wpcf7', name: 'contact-form-7', displayName: 'Contact Form 7' },
        { variable: 'wpforms_settings', name: 'wpforms-lite', displayName: 'WPForms' },
        { variable: 'gform', name: 'gravityforms', displayName: 'Gravity Forms' },
        { variable: 'wpforms', name: 'wpforms-lite', displayName: 'WPForms' },
        { variable: 'jetpackL10n', name: 'jetpack', displayName: 'Jetpack' },
        { variable: 'rankMathSettings', name: 'seo-by-rank-math', displayName: 'Rank Math SEO' },
        { variable: 'wpRocketData', name: 'wp-rocket', displayName: 'WP Rocket' },
        { variable: 'wordfenceVars', name: 'wordfence', displayName: 'Wordfence Security' }
    ],

    // Meta Tag Patterns
    META_TAG_PATTERNS: [
        { name: 'generator', pattern: /elementor/i, plugin: 'elementor', displayName: 'Elementor' },
        { name: 'generator', pattern: /yoast/i, plugin: 'wordpress-seo', displayName: 'Yoast SEO' },
        { name: 'generator', pattern: /rank.*math/i, plugin: 'seo-by-rank-math', displayName: 'Rank Math SEO' },
        { property: 'article:publisher', pattern: /yoast/i, plugin: 'wordpress-seo', displayName: 'Yoast SEO' }
    ],

    // Possible main plugin files
    PLUGIN_MAIN_FILES: [
        '{plugin}.php',
        'index.php',
        '{plugin}/index.php',
        'main.php',
        '{plugin}.class.php'
    ],

    // Analysis result confidence levels
    CONFIDENCE_LEVELS: {
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },

    // Detection methods
    DETECTION_METHODS: {
        META_GENERATOR: 'meta_generator',
        README_HTML: 'readme_html',
        SCRIPT_VERSION: 'script_version_param',
        CSS_VERSION: 'css_version_param',
        OPML_FILE: 'opml_file',
        RSS_FEED: 'rss_feed',
        STYLESHEET_LINK: 'stylesheet_link',
        BODY_CLASS: 'body_class',
        ASSET_PATH: 'asset_path',
        PATH_DETECTION: 'path_detection'
    },

    // Error messages
    ERRORS: {
        INVALID_URL: 'Invalid URL provided',
        FETCH_FAILED: 'Failed to fetch page content. The site may be down or blocking our requests.',
        NOT_WORDPRESS: 'Site does not appear to be WordPress',
        TIMEOUT: 'Request timeout exceeded',
        NETWORK_ERROR: 'Network error occurred',
        BOT_PROTECTION: 'Site has bot protection enabled and is blocking analysis requests',
        RATE_LIMITED: 'Too many requests - site is rate limiting our access',
        SITE_UNAVAILABLE: 'Site is temporarily unavailable',
        ACCESS_DENIED: 'Access to site was denied'
    }
};
