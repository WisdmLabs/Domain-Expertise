// File: ./src/detectors/enhanced-wordpress-detector.js

const { WORDPRESS_INDICATORS } = require('../config/constants');
const HttpClient = require('../utils/http-client');
const UrlHelper = require('../utils/url-helper');

/**
 * Enhanced WordPress detection with advanced techniques
 * Combines multiple detection methods for maximum accuracy
 */
class EnhancedWordPressDetector {
    constructor(httpClient) {
        this.httpClient = httpClient || new HttpClient();
    }

    /**
     * Comprehensive WordPress detection using multiple advanced methods
     * @param {string} baseUrl - Base URL of the site
     * @param {Object} $ - Cheerio instance
     * @param {string} html - Raw HTML content
     * @returns {Object} Detection result with confidence level
     */
    async detect(baseUrl, $, html) {
        const indicators = [];

        // Phase 1: Fast local detection (no HTTP requests) — runs first
        const localMethods = [
            () => this.detectFromMetaTags($),
            () => this.detectFromHtmlStructure($, html),
            () => this.detectFromAssetPaths($),
            () => this.detectFromJavaScriptVariables($, html),
            () => this.detectFromCssClasses($),
            () => this.detectFromComments($, html),
            () => this.detectFromInlineScripts($, html)
        ];

        for (const method of localMethods) {
            try {
                const result = await method();
                if (result && result.indicators) {
                    indicators.push(...result.indicators);
                }
            } catch (error) {
                continue;
            }
        }

        // If we already have high confidence from HTML alone, skip network probes
        const earlyConfidence = this.calculateConfidence(indicators);
        if (earlyConfidence === 'high') {
            console.log('✅ WordPress detected from HTML analysis — skipping network probes');
        } else {
            // Phase 2: Network-based detection (only if needed)
            const networkMethods = [
                () => this.detectFromRestApi(baseUrl),
                () => this.detectFromWordPressFiles(baseUrl),
                () => this.detectFromHeaders(baseUrl),
                () => this.detectFromSitemap(baseUrl),
                () => this.detectFromRobotsTxt(baseUrl),
                () => this.detectFromFeedEndpoints(baseUrl),
                () => this.detectFromAdminEndpoints(baseUrl),
                () => this.detectFromPluginThemes(baseUrl)
            ];

            for (const method of networkMethods) {
                try {
                    const result = await method();
                    if (result && result.indicators) {
                        indicators.push(...result.indicators);
                    }
                    // Stop early if we reach high confidence
                    if (this.calculateConfidence(indicators) === 'high') break;
                } catch (error) {
                    continue;
                }
            }
        }

        // Calculate final confidence and score
        const confidence = this.calculateConfidence(indicators);
        const score = this.calculateScore(indicators);
        const isWordPress = indicators.length > 0;

        return {
            isWordPress,
            confidence,
            indicators,
            score,
            detectionMethods: indicators.length,
            summary: this.generateSummary({ isWordPress, confidence, score, indicators })
        };
    }

    /**
     * Detect WordPress from meta tags
     */
    detectFromMetaTags($) {
        const indicators = [];
        
        // Check meta generator tag (highest confidence)
        const generator = $('meta[name="generator"]').attr('content');
        if (generator && generator.toLowerCase().includes('wordpress')) {
            indicators.push({
                type: 'meta_generator',
                value: generator,
                confidence: 'high',
                method: 'meta_tags'
            });
        }

        // Check other meta tags
        const metaTags = [
            { name: 'generator', pattern: /wordpress/i },
            { name: 'application-name', pattern: /wordpress/i },
            { property: 'og:site_name', pattern: /wordpress/i }
        ];

        metaTags.forEach(tag => {
            const selector = tag.name ? `meta[name="${tag.name}"]` : `meta[property="${tag.property}"]`;
            const content = $(selector).attr('content');
            if (content && tag.pattern.test(content)) {
                indicators.push({
                    type: 'meta_tag',
                    value: content,
                    confidence: 'medium',
                    method: 'meta_tags'
                });
            }
        });

        return { indicators };
    }

    /**
     * Detect WordPress from HTML structure and content
     */
    detectFromHtmlStructure($, html) {
        const indicators = [];

        // Check for WordPress-specific paths in HTML
        const pathPatterns = [
            { pattern: /\/wp-content\//i, confidence: 'high' },
            { pattern: /\/wp-includes\//i, confidence: 'high' },
            { pattern: /\/wp-admin\//i, confidence: 'high' },
            { pattern: /wp-json/i, confidence: 'high' },
            { pattern: /wp-cron\.php/i, confidence: 'high' },
            { pattern: /wp-config\.php/i, confidence: 'high' },
            { pattern: /wp-load\.php/i, confidence: 'high' },
            { pattern: /wp-blog-header\.php/i, confidence: 'high' },
            { pattern: /wp-settings\.php/i, confidence: 'high' },
            { pattern: /wp-links-opml\.php/i, confidence: 'medium' },
            { pattern: /wp-trackback\.php/i, confidence: 'medium' },
            { pattern: /wp-comments-post\.php/i, confidence: 'medium' }
        ];

        pathPatterns.forEach(({ pattern, confidence }) => {
            if (pattern.test(html)) {
                const match = html.match(pattern);
                indicators.push({
                    type: 'path_indicator',
                    value: match[0],
                    confidence,
                    method: 'html_structure'
                });
            }
        });

        // Check for WordPress admin bar
        if ($('#wpadminbar').length > 0) {
            indicators.push({
                type: 'admin_bar',
                value: 'wpadminbar',
                confidence: 'high',
                method: 'html_structure'
            });
        }

        // Check for WordPress login form
        if ($('form[name="loginform"]').length > 0 || html.includes('wp-login.php')) {
            indicators.push({
                type: 'login_form',
                value: 'WordPress login form',
                confidence: 'high',
                method: 'html_structure'
            });
        }

        return { indicators };
    }

    /**
     * Detect WordPress from asset paths (scripts and stylesheets)
     */
    detectFromAssetPaths($) {
        const indicators = [];

        // Check WordPress script tags
        const wpScripts = $('script[src*="wp-includes"], script[src*="wp-content"]');
        if (wpScripts.length > 0) {
            indicators.push({
                type: 'script_tags',
                value: `${wpScripts.length} WordPress scripts found`,
                confidence: 'high',
                method: 'asset_paths'
            });
        }

        // Check WordPress CSS files
        const wpStyles = $('link[href*="wp-content"], link[href*="wp-includes"]');
        if (wpStyles.length > 0) {
            indicators.push({
                type: 'css_files',
                value: `${wpStyles.length} WordPress stylesheets found`,
                confidence: 'high',
                method: 'asset_paths'
            });
        }

        // Check for specific WordPress assets
        const wpAssets = [
            'wp-embed.js',
            'wp-emoji-release.min.js',
            'wp-emoji.js',
            'wp-embed.min.js',
            'wp-emoji-release.js',
            'wp-emoji.min.js'
        ];

        wpAssets.forEach(asset => {
            if ($(`script[src*="${asset}"]`).length > 0) {
                indicators.push({
                    type: 'wp_asset',
                    value: asset,
                    confidence: 'high',
                    method: 'asset_paths'
                });
            }
        });

        return { indicators };
    }

    /**
     * Detect WordPress from JavaScript variables and objects
     */
    detectFromJavaScriptVariables($, html) {
        const indicators = [];

        // Check for WordPress JavaScript variables
        const jsPatterns = [
            { pattern: /window\.wp\s*=/i, confidence: 'high' },
            { pattern: /wp\./i, confidence: 'high' },
            { pattern: /wp_localize_script/i, confidence: 'high' },
            { pattern: /wp_enqueue_script/i, confidence: 'high' },
            { pattern: /wp_enqueue_style/i, confidence: 'high' },
            { pattern: /wp_register_script/i, confidence: 'high' },
            { pattern: /wp_register_style/i, confidence: 'high' },
            { pattern: /wp_deregister_script/i, confidence: 'high' },
            { pattern: /wp_deregister_style/i, confidence: 'high' },
            { pattern: /wp_ajax_url/i, confidence: 'medium' },
            { pattern: /wp_nonce/i, confidence: 'medium' }
        ];

        jsPatterns.forEach(({ pattern, confidence }) => {
            if (pattern.test(html)) {
                indicators.push({
                    type: 'js_variable',
                    value: pattern.source,
                    confidence,
                    method: 'javascript_variables'
                });
            }
        });

        return { indicators };
    }

    /**
     * Detect WordPress from CSS classes and IDs
     */
    detectFromCssClasses($) {
        const indicators = [];

        // Check WordPress-specific body classes
        const bodyClass = $('body').attr('class') || '';
        const wpClasses = [
            'wp-',
            'wordpress',
            'wpadminbar',
            'wp-core-ui',
            'wp-embed-responsive',
            'wp-theme-',
            'wp-child-theme-',
            'wp-custom-logo',
            'wp-block-',
            'wp-element-',
            'wp-components-'
        ];

        wpClasses.forEach(cls => {
            if (bodyClass.includes(cls)) {
                indicators.push({
                    type: 'css_class',
                    value: bodyClass,
                    confidence: 'medium',
                    method: 'css_classes'
                });
                return; // Found one, no need to check others
            }
        });

        // Check for WordPress-specific IDs
        const wpIds = ['wpadminbar', 'wpcontent', 'wpfooter', 'wpsidebar'];
        wpIds.forEach(id => {
            if ($(`#${id}`).length > 0) {
                indicators.push({
                    type: 'css_id',
                    value: id,
                    confidence: 'high',
                    method: 'css_classes'
                });
            }
        });

        return { indicators };
    }

    /**
     * Detect WordPress from HTML comments
     */
    detectFromComments($, html) {
        const indicators = [];

        // Check for WordPress comments
        const commentPatterns = [
            { pattern: /<!--\s*WordPress\s*-->/i, confidence: 'high' },
            { pattern: /<!--\s*WP\s*-->/i, confidence: 'medium' },
            { pattern: /<!--\s*generated\s+by\s+wordpress\s*-->/i, confidence: 'high' },
            { pattern: /<!--\s*powered\s+by\s+wordpress\s*-->/i, confidence: 'high' }
        ];

        commentPatterns.forEach(({ pattern, confidence }) => {
            if (pattern.test(html)) {
                const match = html.match(pattern);
                indicators.push({
                    type: 'html_comment',
                    value: match[0],
                    confidence,
                    method: 'comments'
                });
            }
        });

        return { indicators };
    }

    /**
     * Detect WordPress from REST API endpoints
     */
    async detectFromRestApi(baseUrl) {
        const indicators = [];

        try {
            const apiUrl = UrlHelper.joinPath(baseUrl, '/wp-json/');
            const response = await this.httpClient.fetchPage(apiUrl, { timeout: 5000 });
            
            if (response && response.status === 200) {
                indicators.push({
                    type: 'rest_api',
                    value: 'WordPress REST API accessible',
                    confidence: 'high',
                    method: 'rest_api'
                });
            } else if (response && (response.status === 401 || response.status === 403)) {
                // Even authentication errors indicate the endpoint exists
                indicators.push({
                    type: 'rest_api',
                    value: 'WordPress REST API detected (requires auth)',
                    confidence: 'high',
                    method: 'rest_api'
                });
            }
        } catch (error) {
            // REST API not accessible
        }

        return { indicators };
    }

    /**
     * Detect WordPress from core files
     */
    async detectFromWordPressFiles(baseUrl) {
        const indicators = [];

        const wpFiles = [
            '/readme.html',
            '/wp-config.php',
            '/wp-load.php',
            '/wp-blog-header.php',
            '/wp-settings.php',
            '/wp-cron.php',
            '/wp-links-opml.php',
            '/wp-trackback.php',
            '/wp-comments-post.php',
            '/wp-login.php',
            '/wp-admin/',
            '/wp-includes/',
            '/wp-content/'
        ];

        // Check a few key files
        const filesToCheck = wpFiles.slice(0, 5); // Limit to avoid too many requests
        
        for (const file of filesToCheck) {
            try {
                const fileUrl = UrlHelper.joinPath(baseUrl, file);
                const response = await this.httpClient.fetchPage(fileUrl, { timeout: 3000 });
                
                if (response && response.status < 400) {
                    indicators.push({
                        type: 'wp_file',
                        value: file,
                        confidence: 'high',
                        method: 'wordpress_files'
                    });
                    break; // Found one, that's enough
                }
            } catch (error) {
                // File not accessible
            }
        }

        return { indicators };
    }

    /**
     * Detect WordPress from HTTP headers
     */
    async detectFromHeaders(baseUrl) {
        const indicators = [];

        try {
            const response = await this.httpClient.fetchPage(baseUrl, { timeout: 5000 });
            
            if (response && response.headers) {
                const headers = response.headers;
                
                // Check for WordPress-specific headers
                const wpHeaders = [
                    'x-powered-by',
                    'x-generator',
                    'x-wp-version',
                    'x-wp-total',
                    'x-wp-totalpages'
                ];

                wpHeaders.forEach(header => {
                    const value = headers[header] || headers[header.toUpperCase()];
                    if (value && value.toLowerCase().includes('wordpress')) {
                        indicators.push({
                            type: 'http_header',
                            value: `${header}: ${value}`,
                            confidence: 'high',
                            method: 'headers'
                        });
                    }
                });

                // Check for WordPress in server header
                const server = headers['server'] || headers['Server'];
                if (server && server.toLowerCase().includes('wordpress')) {
                    indicators.push({
                        type: 'server_header',
                        value: server,
                        confidence: 'medium',
                        method: 'headers'
                    });
                }
            }
        } catch (error) {
            // Headers not accessible
        }

        return { indicators };
    }

    /**
     * Detect WordPress from sitemap
     */
    async detectFromSitemap(baseUrl) {
        const indicators = [];

        const sitemapUrls = [
            '/wp-sitemap.xml',
            '/sitemap.xml',
            '/sitemap_index.xml'
        ];

        for (const sitemap of sitemapUrls) {
            try {
                const sitemapUrl = UrlHelper.joinPath(baseUrl, sitemap);
                const response = await this.httpClient.fetchPage(sitemapUrl, { timeout: 3000 });
                
                if (response && response.status === 200 && response.data) {
                    const content = response.data;
                    if (content.includes('wp-sitemap') || content.includes('wordpress')) {
                        indicators.push({
                            type: 'sitemap',
                            value: sitemap,
                            confidence: 'medium',
                            method: 'sitemap'
                        });
                        break;
                    }
                }
            } catch (error) {
                // Sitemap not accessible
            }
        }

        return { indicators };
    }

    /**
     * Detect WordPress from robots.txt
     */
    async detectFromRobotsTxt(baseUrl) {
        const indicators = [];

        try {
            const robotsUrl = UrlHelper.joinPath(baseUrl, '/robots.txt');
            const response = await this.httpClient.fetchPage(robotsUrl, { timeout: 3000 });
            
            if (response && response.status === 200 && response.data) {
                const content = response.data.toLowerCase();
                if (content.includes('wp-') || content.includes('wordpress')) {
                    indicators.push({
                        type: 'robots_txt',
                        value: 'WordPress references in robots.txt',
                        confidence: 'medium',
                        method: 'robots_txt'
                    });
                }
            }
        } catch (error) {
            // robots.txt not accessible
        }

        return { indicators };
    }

    /**
     * Detect WordPress from feed endpoints
     */
    async detectFromFeedEndpoints(baseUrl) {
        const indicators = [];

        const feedUrls = [
            '/feed/',
            '/feed/rss/',
            '/feed/rss2/',
            '/feed/atom/',
            '/rss/',
            '/rss2/',
            '/atom/'
        ];

        for (const feed of feedUrls) {
            try {
                const feedUrl = UrlHelper.joinPath(baseUrl, feed);
                const response = await this.httpClient.fetchPage(feedUrl, { timeout: 3000 });
                
                if (response && response.status === 200 && response.data) {
                    const content = response.data;
                    if (content.includes('generator') && content.includes('wordpress')) {
                        indicators.push({
                            type: 'feed',
                            value: feed,
                            confidence: 'medium',
                            method: 'feed_endpoints'
                        });
                        break;
                    }
                }
            } catch (error) {
                // Feed not accessible
            }
        }

        return { indicators };
    }

    /**
     * Detect WordPress from admin endpoints
     */
    async detectFromAdminEndpoints(baseUrl) {
        const indicators = [];

        const adminUrls = [
            '/wp-admin/',
            '/wp-login.php',
            '/wp-admin/admin-ajax.php'
        ];

        for (const admin of adminUrls) {
            try {
                const adminUrl = UrlHelper.joinPath(baseUrl, admin);
                const response = await this.httpClient.fetchPage(adminUrl, { timeout: 3000 });
                
                if (response && response.status < 400) {
                    indicators.push({
                        type: 'admin_endpoint',
                        value: admin,
                        confidence: 'high',
                        method: 'admin_endpoints'
                    });
                    break;
                }
            } catch (error) {
                // Admin endpoint not accessible
            }
        }

        return { indicators };
    }

    /**
     * Detect WordPress from plugin/theme directories
     */
    async detectFromPluginThemes(baseUrl) {
        const indicators = [];

        const directories = [
            '/wp-content/plugins/',
            '/wp-content/themes/',
            '/wp-content/uploads/'
        ];

        for (const dir of directories) {
            try {
                const dirUrl = UrlHelper.joinPath(baseUrl, dir);
                const response = await this.httpClient.fetchPage(dirUrl, { timeout: 3000 });
                
                if (response && response.status < 400) {
                    indicators.push({
                        type: 'wp_directory',
                        value: dir,
                        confidence: 'high',
                        method: 'plugin_themes'
                    });
                    break;
                }
            } catch (error) {
                // Directory not accessible
            }
        }

        return { indicators };
    }

    /**
     * Detect WordPress from inline scripts
     */
    detectFromInlineScripts($, html) {
        const indicators = [];

        // Check inline scripts for WordPress references
        $('script:not([src])').each((i, element) => {
            const scriptContent = $(element).html() || '';
            if (scriptContent.includes('wp.') || scriptContent.includes('wp_')) {
                indicators.push({
                    type: 'inline_script',
                    value: 'WordPress JavaScript in inline script',
                    confidence: 'medium',
                    method: 'inline_scripts'
                });
                return false; // Break the loop
            }
        });

        return { indicators };
    }

    /**
     * Calculate confidence level based on indicators
     */
    calculateConfidence(indicators) {
        if (indicators.length === 0) return 'low';
        
        const highConfidence = indicators.filter(i => i.confidence === 'high').length;
        const mediumConfidence = indicators.filter(i => i.confidence === 'medium').length;
        
        if (highConfidence >= 2) return 'high';
        if (highConfidence >= 1 || mediumConfidence >= 3) return 'medium';
        return 'low';
    }

    /**
     * Calculate confidence score based on indicators
     */
    calculateScore(indicators) {
        const weights = {
            'meta_generator': 30,
            'admin_bar': 25,
            'rest_api': 25,
            'wp_file': 25,
            'script_tags': 20,
            'css_files': 15,
            'path_indicator': 10,
            'js_variable': 15,
            'css_class': 8,
            'css_id': 12,
            'html_comment': 8,
            'http_header': 15,
            'sitemap': 8,
            'robots_txt': 5,
            'feed': 8,
            'admin_endpoint': 20,
            'wp_directory': 15,
            'inline_script': 8,
            'wp_asset': 12,
            'login_form': 20
        };

        let score = 0;
        const seenTypes = new Set();

        indicators.forEach(indicator => {
            if (!seenTypes.has(indicator.type)) {
                seenTypes.add(indicator.type);
                const weight = weights[indicator.type] || 5;
                const confidenceMultiplier = indicator.confidence === 'high' ? 1 : 
                                           indicator.confidence === 'medium' ? 0.7 : 0.4;
                score += weight * confidenceMultiplier;
            }
        });

        return Math.min(100, Math.round(score));
    }

    /**
     * Generate human-readable summary
     */
    generateSummary(result) {
        if (!result.isWordPress) {
            return 'Site does not appear to be running WordPress';
        }

        const { confidence, score, indicators } = result;
        const methodCount = new Set(indicators.map(i => i.method)).size;
        const indicatorTypes = indicators.map(i => i.type).join(', ');
        
        return `WordPress detected with ${confidence} confidence (score: ${score}/100). ` +
               `Found ${indicators.length} indicators across ${methodCount} detection methods. ` +
               `Indicators: ${indicatorTypes}`;
    }
}

module.exports = EnhancedWordPressDetector;
