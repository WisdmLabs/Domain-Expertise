// File: ./src/detectors/enhanced-version-detector.js

const { VERSION_ENDPOINTS, DETECTION_METHODS, CONFIDENCE_LEVELS } = require('../config/constants');
const HttpClient = require('../utils/http-client');
const UrlHelper = require('../utils/url-helper');
const HttpRangeClient = require('../utils/http-range');

/**
 * Enhanced WordPress and plugin version detection with advanced pattern matching
 * Combines WordPress-specific detection with sophisticated version extraction
 */
class EnhancedVersionDetector {
    constructor(httpClient) {
        this.httpClient = httpClient || new HttpClient();
        this.rangeClient = new HttpRangeClient();
        
        // Advanced version patterns from your VersionDetector
        this.versionPatterns = {
            // URL patterns
            urlVersion: /[?&]ver=([^&]+)/i,
            urlVersionAlt: /[?&]version=([^&]+)/i,
            urlV: /[?&]v=([^&]+)/i,
            
            // File name patterns
            filenameVersion: /[.-]v?(\d+\.\d+(?:\.\d+)?)/i,
            filenameVersionAlt: /[.-](\d+\.\d+(?:\.\d+)?)/i,
            
            // CSS/JS comment patterns
            cssCommentVersion: /\/\*\s*Version:\s*([^\s*]+)/i,
            jsCommentVersion: /\/\/\s*Version:\s*([^\s*]+)/i,
            multiLineComment: /\/\*[\s\S]*?Version:\s*([^\s*\n]+)[\s\S]*?\*\//i,
            
            // WordPress specific patterns
            wpVersion: /wp-content\/(?:plugins|themes)\/[^\/]+\/([^\/]+)\/(\d+\.\d+(?:\.\d+)?)/i,
            
            // Plugin header patterns
            pluginVersion: /Plugin\s+Version:\s*([^\n\r]+)/i,
            themeVersion: /Theme\s+Version:\s*([^\n\r]+)/i,
            
            // JavaScript variable patterns
            jsVarVersion: /version\s*[:=]\s*["']([^"']+)["']/i,
            jsObjectVersion: /["']version["']\s*:\s*["']([^"']+)["']/i
        };
    }

    /**
     * Detect WordPress version using conservative, accurate methods
     * @param {string} baseUrl - Base URL of the site
     * @param {Object} $ - Cheerio instance
     * @param {string} html - Raw HTML content
     * @returns {Object} Version information
     */
    async detectBestVersion(baseUrl, $, html) {
        const results = [];

        // HIGH CONFIDENCE METHODS - Only these can definitively identify WordPress version
        const highConfidenceMethods = [
            () => this.detectFromMetaGenerator($),
            () => this.detectFromWpIncludesAssets($, html),
            () => this.detectFromReadmeFile(baseUrl),
            () => this.detectFromRestAPI(baseUrl),
            // () => this.detectFromWordPressCoreFiles(baseUrl) // Disabled to avoid delays
        ];

        // MEDIUM CONFIDENCE METHODS - WordPress-specific but need validation
        const mediumConfidenceMethods = [
            () => this.detectFromOpmlFile(baseUrl),
            () => this.detectFromRssFeed(baseUrl),
            () => this.detectFromWordPressComments(html)
        ];

        // Run high confidence methods first
        for (const method of highConfidenceMethods) {
            try {
                const result = await method();
                if (result && result.version && this.isValidWordPressVersion(result.version)) {
                    results.push(result);
                }
            } catch (error) {
                console.warn('High confidence version detection method failed:', error.message);
            }
        }

        // If we found a high confidence result, return it immediately
        if (results.length > 0) {
            const bestResult = this.selectBestVersion(results);
            if (bestResult.confidence === CONFIDENCE_LEVELS.HIGH) {
                return bestResult;
            }
        }

        // Only run medium confidence methods if no high confidence result found
        for (const method of mediumConfidenceMethods) {
            try {
                const result = await method();
                if (result && result.version && this.isValidWordPressVersion(result.version)) {
                    results.push(result);
                }
            } catch (error) {
                console.warn('Medium confidence version detection method failed:', error.message);
            }
        }

        // Return best result or unknown
        return this.selectBestVersion(results);
    }



    /**
     * Extract version from asset content with context awareness
     * @param {string} url - Asset URL
     * @param {string} content - Asset content
     * @param {Object} headers - HTTP headers
     * @param {string} context - Context ('plugin', 'theme', 'wordpress', 'generic')
     * @returns {Array} Array of version objects
     */
    async extractVersionFromAsset(url, content = null, headers = {}, context = 'generic') {
        // Use context-specific extraction for plugins
        if (context === 'plugin') {
            return this.extractPluginVersionFromAsset(url, content, headers);
        }
        
        const versions = [];
        
        // 1. Extract from URL query parameters
        const urlVersions = this.extractFromUrl(url);
        versions.push(...urlVersions);
        
        // 2. Extract from filename
        const filenameVersions = this.extractFromFilename(url);
        versions.push(...filenameVersions);
        
        // 3. Extract from content if available
        if (content) {
            const contentVersions = this.extractFromContent(content, headers);
            versions.push(...contentVersions);
        }
        
        // 4. Extract from headers
        const headerVersions = this.extractFromHeaders(headers);
        versions.push(...headerVersions);
        
        return this.normalizeVersions(versions);
    }

    /**
     * Extract version from URL query parameters
     */
    extractFromUrl(url) {
        const versions = [];
        
        for (const [patternName, pattern] of Object.entries(this.versionPatterns)) {
            if (patternName.startsWith('url')) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    versions.push({
                        version: match[1],
                        source: 'url',
                        pattern: patternName,
                        confidence: 0.9
                    });
                }
            }
        }
        
        return versions;
    }

    /**
     * Extract version from filename
     */
    extractFromFilename(url) {
        const versions = [];
        const filename = url.split('/').pop().split('?')[0];
        
        for (const [patternName, pattern] of Object.entries(this.versionPatterns)) {
            if (patternName.startsWith('filename')) {
                const match = filename.match(pattern);
                if (match && match[1]) {
                    versions.push({
                        version: match[1],
                        source: 'filename',
                        pattern: patternName,
                        confidence: 0.8
                    });
                }
            }
        }
        
        return versions;
    }

    /**
     * Extract version from file content
     */
    extractFromContent(content, headers = {}) {
        const versions = [];
        const contentType = headers['content-type'] || headers['Content-Type'] || '';
        
        // CSS files
        if (contentType.includes('text/css') || content.includes('/*')) {
            const patterns = ['cssCommentVersion', 'multiLineComment'];
            for (const patternName of patterns) {
                const match = content.match(this.versionPatterns[patternName]);
                if (match && match[1]) {
                    versions.push({
                        version: match[1],
                        source: 'css_comment',
                        pattern: patternName,
                        confidence: 0.85
                    });
                }
            }
        }
        
        // JavaScript files
        if (contentType.includes('javascript') || content.includes('//') || content.includes('var ')) {
            const patterns = ['jsCommentVersion', 'jsVarVersion', 'jsObjectVersion'];
            for (const patternName of patterns) {
                const match = content.match(this.versionPatterns[patternName]);
                if (match && match[1]) {
                    versions.push({
                        version: match[1],
                        source: 'js_content',
                        pattern: patternName,
                        confidence: 0.85
                    });
                }
            }
        }
        
        // Plugin/Theme headers
        const headerPatterns = ['pluginVersion', 'themeVersion'];
        for (const patternName of headerPatterns) {
            const match = content.match(this.versionPatterns[patternName]);
            if (match && match[1]) {
                versions.push({
                    version: match[1],
                    source: 'plugin_header',
                    pattern: patternName,
                    confidence: 0.95
                });
            }
        }
        
        return versions;
    }

    /**
     * Extract version from HTTP headers
     */
    extractFromHeaders(headers) {
        const versions = [];
        
        // Check for version in ETag
        const etag = headers['etag'] || headers['ETag'];
        if (etag) {
            const etagMatch = etag.match(/["']?([^"']*v?(\d+\.\d+(?:\.\d+)?)[^"']*)["']?/i);
            if (etagMatch && etagMatch[2]) {
                versions.push({
                    version: etagMatch[2],
                    source: 'etag',
                    pattern: 'etag',
                    confidence: 0.7
                });
            }
        }
        
        // Check for version in custom headers
        const versionHeaders = ['x-version', 'x-plugin-version', 'x-theme-version'];
        for (const header of versionHeaders) {
            const value = headers[header] || headers[header.toUpperCase()];
            if (value) {
                versions.push({
                    version: value,
                    source: 'http_header',
                    pattern: header,
                    confidence: 0.8
                });
            }
        }
        
        return versions;
    }

    /**
     * Normalize and deduplicate versions
     */
    normalizeVersions(versions) {
        const uniqueVersions = new Map();
        
        for (const version of versions) {
            const normalized = this.normalizeVersion(version.version);
            if (normalized) {
                const existing = uniqueVersions.get(normalized);
                if (!existing || version.confidence > existing.confidence) {
                    uniqueVersions.set(normalized, {
                        ...version,
                        version: normalized
                    });
                }
            }
        }
        
        return Array.from(uniqueVersions.values())
            .sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Normalize version string to semantic version format
     */
    normalizeVersion(version) {
        if (!version) return null;
        
        // Remove common prefixes/suffixes
        let normalized = version
            .replace(/^v/i, '')
            .replace(/^version\s*/i, '')
            .replace(/\s*$/g, '')
            .replace(/['"]/g, '');
        
        // Extract semantic version pattern
        const semverMatch = normalized.match(/(\d+)\.(\d+)(?:\.(\d+))?(?:[.-](.+))?/);
        if (semverMatch) {
            const [, major, minor, patch = '0', prerelease = ''] = semverMatch;
            return `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ''}`;
        }
        
        return null;
    }

    /**
     * Extract plugin-specific version from asset content
     * Uses more restrictive patterns to avoid picking up generic versions
     * @param {string} url - Asset URL
     * @param {string} content - Asset content
     * @param {Object} headers - HTTP headers
     * @returns {Array} Array of version objects
     */
    extractPluginVersionFromAsset(url, content = null, headers = {}) {
        const versions = [];
        
        // Plugin-specific version patterns (more restrictive)
        const pluginVersionPatterns = {
            // Plugin header patterns (highest confidence)
            pluginHeader: /Plugin\s+Version:\s*([^\n\r]+)/i,
            pluginVersion: /Version:\s*([^\n\r]+)/i,
            
            // Plugin-specific comment patterns
            pluginComment: /\/\*\s*Plugin:\s*[^*]*Version:\s*([^\s*]+)/i,
            pluginBlockComment: /\/\*\s*[^*]*Plugin[^*]*Version:\s*([^\s*]+)[\s\S]*?\*\//i,
            
            // Plugin-specific variable patterns
            pluginVar: /plugin_version\s*[:=]\s*["']([^"']+)["']/i,
            pluginObject: /["']plugin_version["']\s*:\s*["']([^"']+)["']/i,
            pluginConst: /const\s+PLUGIN_VERSION\s*=\s*["']([^"']+)["']/i,
            pluginDefine: /define\s*\(\s*["']PLUGIN_VERSION["']\s*,\s*["']([^"']+)["']/i,
            
            // Plugin-specific function patterns
            pluginFunction: /function\s+get_plugin_version\s*\([^)]*\)\s*{\s*return\s*["']([^"']+)["']/i,
            
            // Plugin file path patterns
            pluginPath: /wp-content\/plugins\/[^\/]+\/([^\/]+)\/(\d+\.\d+(?:\.\d+)?)/i,
            
            // Plugin-specific URL patterns
            pluginUrl: /[?&]plugin_version=([^&]+)/i,
            pluginVer: /[?&]pver=([^&]+)/i
        };
        
        // 1. Extract from URL (plugin-specific patterns only)
        for (const [patternName, pattern] of Object.entries(pluginVersionPatterns)) {
            if (patternName.includes('Url') || patternName.includes('Path')) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    versions.push({
                        version: match[1],
                        source: 'plugin_url',
                        pattern: patternName,
                        confidence: 0.9
                    });
                }
            }
        }
        
        // 2. Extract from filename (plugin-specific patterns only)
        const filename = url.split('/').pop().split('?')[0];
        for (const [patternName, pattern] of Object.entries(pluginVersionPatterns)) {
            if (patternName.includes('Path')) {
                const match = filename.match(pattern);
                if (match && match[1]) {
                    versions.push({
                        version: match[1],
                        source: 'plugin_filename',
                        pattern: patternName,
                        confidence: 0.8
                    });
                }
            }
        }
        
        // 3. Extract from content (plugin-specific patterns only)
        if (content) {
            const contentType = headers['content-type'] || headers['Content-Type'] || '';
            
            // Check all plugin-specific patterns
            for (const [patternName, pattern] of Object.entries(pluginVersionPatterns)) {
                if (!patternName.includes('Url') && !patternName.includes('Path')) {
                    const match = content.match(pattern);
                    if (match && match[1]) {
                        // Additional validation for plugin versions
                        const version = match[1].trim();
                        if (this.isValidPluginVersion(version)) {
                            versions.push({
                                version: version,
                                source: 'plugin_content',
                                pattern: patternName,
                                confidence: patternName.includes('Header') ? 0.95 : 0.85
                            });
                        }
                    }
                }
            }
            
            // Look for plugin-specific comment blocks
            const pluginCommentBlocks = content.match(/\/\*\s*Plugin[^*]*\*\/[\s\S]*?\/\*\s*Version[^*]*\*\/[\s\S]*?\*\//gi);
            if (pluginCommentBlocks) {
                for (const block of pluginCommentBlocks) {
                    const versionMatch = block.match(/Version:\s*([^\s*]+)/i);
                    if (versionMatch && versionMatch[1]) {
                        const version = versionMatch[1].trim();
                        if (this.isValidPluginVersion(version)) {
                            versions.push({
                                version: version,
                                source: 'plugin_comment_block',
                                pattern: 'plugin_comment_block',
                                confidence: 0.9
                            });
                        }
                    }
                }
            }
        }
        
        // 4. Extract from headers (plugin-specific only)
        const pluginHeaders = ['x-plugin-version', 'x-version'];
        for (const header of pluginHeaders) {
            const value = headers[header] || headers[header.toUpperCase()];
            if (value && this.isValidPluginVersion(value)) {
                versions.push({
                    version: value,
                    source: 'plugin_header',
                    pattern: header,
                    confidence: 0.8
                });
            }
        }
        
        return this.normalizeVersions(versions);
    }

    /**
     * Validate if a string is a legitimate plugin version
     * @param {string} version - Version string to validate
     * @returns {boolean} True if valid plugin version
     */
    isValidPluginVersion(version) {
        if (!version || typeof version !== 'string') return false;
        
        const cleanVersion = version.trim();
        
        // Must be at least 3 characters
        if (cleanVersion.length < 3) return false;
        
        // Must contain at least one dot
        if (!cleanVersion.includes('.')) return false;
        
        // Must match semantic version pattern
        const semverPattern = /^\d+\.\d+(?:\.\d+)?(?:[-\w]*)?$/;
        if (!semverPattern.test(cleanVersion)) return false;
        
        // Must not be just a date (YYYY.MM.DD or MM.DD.YYYY)
        const datePatterns = [
            /^\d{4}\.\d{1,2}\.\d{1,2}$/,  // YYYY.MM.DD
            /^\d{1,2}\.\d{1,2}\.\d{4}$/,  // MM.DD.YYYY
            /^\d{4}-\d{1,2}-\d{1,2}$/,    // YYYY-MM-DD
            /^\d{1,2}-\d{1,2}-\d{4}$/     // MM-DD-YYYY
        ];
        
        for (const pattern of datePatterns) {
            if (pattern.test(cleanVersion)) return false;
        }
        
        // Must not be a single character or very short
        if (cleanVersion.length <= 2) return false;
        
        // Must not be just numbers without dots
        if (/^\d+$/.test(cleanVersion)) return false;
        
        return true;
    }

    /**
     * Select the best version from multiple detection results
     */
    selectBestVersion(results) {
        if (results.length === 0) {
            return {
                version: null,
                method: null,
                confidence: CONFIDENCE_LEVELS.LOW
            };
        }

        // Sort by confidence and method priority
        const prioritizedResults = results.sort((a, b) => {
            // First sort by confidence
            const confidenceOrder = { high: 3, medium: 2, low: 1 };
            const aConf = confidenceOrder[a.confidence] || a.confidence || 0;
            const bConf = confidenceOrder[b.confidence] || b.confidence || 0;
            
            if (aConf !== bConf) return bConf - aConf;
            
            // Then by method priority
            const methodPriority = {
                'meta_generator': 10,
                'enhanced_script_version': 9,
                'asset_header_analysis': 8,
                'plugin_header': 7,
                'enhanced_css_version': 6,
                'rest_api': 5,
                'readme_file': 4,
                'script_version_param': 3,
                'css_version_param': 2,
                'javascript_variables': 1
            };
            
            return (methodPriority[b.method] || 0) - (methodPriority[a.method] || 0);
        });

        return prioritizedResults[0];
    }

    /**
     * Get the best version from an array of version candidates
     */
    getBestVersion(versions) {
        if (versions.length === 0) return null;
        
        const sorted = versions.sort((a, b) => b.confidence - a.confidence);
        const best = sorted[0];
        
        return {
            version: best.version,
            method: best.method,
            confidence: this.mapConfidenceToLevel(best.confidence),
            source: best.source
        };
    }

    /**
     * Map numeric confidence to confidence level
     */
    mapConfidenceToLevel(confidence) {
        if (confidence >= 0.8) return CONFIDENCE_LEVELS.HIGH;
        if (confidence >= 0.6) return CONFIDENCE_LEVELS.MEDIUM;
        return CONFIDENCE_LEVELS.LOW;
    }

    // Include all the original detection methods from our current version detector
    async detectFromMetaGenerator($) {
        const generator = $('meta[name="generator"]').attr('content');
        if (generator && generator.toLowerCase().includes('wordpress')) {
            const versionMatch = generator.match(/WordPress\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:[-\w]*)?)/i);
            if (versionMatch) {
                return {
                    version: versionMatch[1],
                    method: 'meta_generator',
                    confidence: CONFIDENCE_LEVELS.HIGH,
                    source: generator
                };
            }
        }
        return null;
    }

    async detectFromReadmeFile(baseUrl) {
        try {
            const readmeUrl = UrlHelper.joinPath(baseUrl, '/readme.html');
            const response = await this.httpClient.fetchPage(readmeUrl);
            
            if (response && response.data) {
                const versionMatch = response.data.match(/Version\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
                if (versionMatch) {
                    return {
                        version: versionMatch[1],
                        method: 'readme_file',
                        confidence: CONFIDENCE_LEVELS.HIGH,
                        source: '/readme.html'
                    };
                }
            }
        } catch (error) {
            // README file not accessible
        }
        return null;
    }

    async detectFromOpmlFile(baseUrl) {
        try {
            const opmlUrl = UrlHelper.joinPath(baseUrl, '/wp-links-opml.php');
            const response = await this.httpClient.fetchPage(opmlUrl);
            
            if (response && response.data) {
                const versionMatch = response.data.match(/generator="WordPress\/([0-9]+\.[0-9]+(?:\.[0-9]+)?)"/i);
                if (versionMatch) {
                    return {
                        version: versionMatch[1],
                        method: 'opml_file',
                        confidence: CONFIDENCE_LEVELS.MEDIUM,
                        source: '/wp-links-opml.php'
                    };
                }
            }
        } catch (error) {
            // OPML file not accessible
        }
        return null;
    }

    async detectFromRssFeed(baseUrl) {
        try {
            const rssUrl = UrlHelper.joinPath(baseUrl, '/feed/');
            const response = await this.httpClient.fetchPage(rssUrl);
            
            if (response && response.data) {
                const versionMatch = response.data.match(/generator[^>]*>WordPress ([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
                if (versionMatch) {
                    return {
                        version: versionMatch[1],
                        method: 'rss_feed',
                        confidence: CONFIDENCE_LEVELS.MEDIUM,
                        source: '/feed/'
                    };
                }
            }
        } catch (error) {
            // RSS feed not accessible
        }
        return null;
    }

    detectFromComments(html) {
        const patterns = [
            /WordPress\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
            /WP\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                return {
                    version: match[1],
                    method: 'html_comments',
                    confidence: CONFIDENCE_LEVELS.LOW,
                    source: 'HTML comment'
                };
            }
        }
        return null;
    }

    async detectFromRestAPI(baseUrl) {
        try {
            const apiUrl = UrlHelper.joinPath(baseUrl, '/wp-json/');
            const response = await this.httpClient.fetchPage(apiUrl);
            
            if (response && response.data) {
                const apiData = typeof response.data === 'string' 
                    ? JSON.parse(response.data) 
                    : response.data;
                
                if (apiData.wordpress_version) {
                    return {
                        version: apiData.wordpress_version,
                        method: 'rest_api',
                        confidence: CONFIDENCE_LEVELS.HIGH,
                        source: '/wp-json/'
                    };
                }
            }
        } catch (error) {
            // API not accessible or doesn't contain version info
        }
        return null;
    }

    detectFromDataAttributes($) {
        const dataAttributes = [
            $('[data-wp-version]').attr('data-wp-version'),
            $('[data-wordpress-version]').attr('data-wordpress-version'),
            $('body').attr('data-wp-version'),
            $('html').attr('data-wp-version')
        ];

        for (const version of dataAttributes) {
            if (version && this.isValidVersion(version)) {
                return {
                    version: version,
                    method: 'data_attributes',
                    confidence: CONFIDENCE_LEVELS.MEDIUM,
                    source: 'HTML data attribute'
                };
            }
        }
        return null;
    }

    detectFromJavaScriptVariables(html) {
        const patterns = [
            /window\.wp_version\s*=\s*["']([^"']+)["']/i,
            /wp_version:\s*["']([^"']+)["']/i,
            /wordpress_version:\s*["']([^"']+)["']/i,
            /"wp_version":\s*"([^"]+)"/i,
            /'wp_version':\s*'([^']+)'/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && this.isValidVersion(match[1])) {
                return {
                    version: match[1],
                    method: 'javascript_variables',
                    confidence: CONFIDENCE_LEVELS.MEDIUM,
                    source: 'JavaScript variable'
                };
            }
        }
        return null;
    }

    isValidVersion(version) {
        if (!version) return false;
        return /^\d+\.\d+(?:\.\d+)?/.test(version);
    }

    /**
     * Validate if a version string is a legitimate WordPress version
     * @param {string} version - Version string to validate
     * @returns {boolean} True if valid WordPress version
     */
    isValidWordPressVersion(version) {
        if (!version || typeof version !== 'string') return false;
        
        // WordPress version patterns
        const wpVersionPatterns = [
            // Standard WordPress versions: 6.4.1, 6.4, 6.4.1-beta1, 6.4.1-rc1
            /^\d+\.\d+(?:\.\d+)?(?:-(?:alpha|beta|rc|dev)\d*)?$/i,
            // WordPress.org specific versions (like 6.9-alpha-60658)
            /^\d+\.\d+(?:\.\d+)?-(?:alpha|beta|rc|dev)-\d+$/i,
            // Development versions
            /^\d+\.\d+(?:\.\d+)?-dev$/i
        ];
        
        // Check if version matches any WordPress pattern
        const isValidPattern = wpVersionPatterns.some(pattern => pattern.test(version));
        
        // Additional validation: version should be reasonable
        if (isValidPattern) {
            const parts = version.split('.');
            const major = parseInt(parts[0]);
            const minor = parseInt(parts[1]);
            
            // WordPress major version should be between 1 and 10 (reasonable range)
            if (major < 1 || major > 10) return false;
            
            // Minor version should be reasonable
            if (minor < 0 || minor > 99) return false;
            
            return true;
        }
        
        return false;
    }

    /**
     * Detect WordPress version from core files (wp-includes/version.php)
     * @param {string} baseUrl - Base URL
     * @returns {Object|null} Version info or null
     */
    async detectFromWordPressCoreFiles(baseUrl) {
        const coreFiles = [
            '/wp-includes/version.php',
            '/wp-includes/wp-version.php',
            '/wp-includes/version.php'
        ];

        for (const file of coreFiles) {
            try {
                const fileUrl = UrlHelper.joinPath(baseUrl, file);
                const response = await this.httpClient.fetchPage(fileUrl, { timeout: 5000 });
                
                if (response && response.data) {
                    // Look for WordPress version constants
                    const versionMatch = response.data.match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
                    if (versionMatch && this.isValidWordPressVersion(versionMatch[1])) {
                        return {
                            version: versionMatch[1],
                            method: 'wordpress_core_file',
                            confidence: CONFIDENCE_LEVELS.HIGH,
                            source: file
                        };
                    }
                }
            } catch (error) {
                // File not accessible, continue to next
                continue;
            }
        }
        
        return null;
    }

    /**
     * Detect WordPress version from WordPress-specific comments
     * @param {string} html - Raw HTML content
     * @returns {Object|null} Version info or null
     */
    /**
     * Detect WordPress version from wp-includes asset URLs
     * Most WordPress sites expose the core version via ?ver= on wp-includes scripts/styles
     */
    detectFromWpIncludesAssets($, html) {
        // Pattern: wp-includes/...?ver=X.X.X — the ver param on core assets IS the WP version
        const wpIncludesPattern = /wp-includes\/[^"']*\?ver=(\d+\.\d+(?:\.\d+)?)/g;
        const versionCounts = {};

        let match;
        while ((match = wpIncludesPattern.exec(html)) !== null) {
            const ver = match[1];
            if (this.isValidWordPressVersion(ver)) {
                versionCounts[ver] = (versionCounts[ver] || 0) + 1;
            }
        }

        // Pick the most frequently occurring version (consensus across multiple assets)
        const sorted = Object.entries(versionCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            return {
                version: sorted[0][0],
                method: 'wp_includes_assets',
                confidence: CONFIDENCE_LEVELS.HIGH,
                source: `wp-includes assets (${sorted[0][1]} matches)`
            };
        }

        return null;
    }

    detectFromWordPressComments(html) {
        // Only look for WordPress-specific comments, not generic version comments
        const wpCommentPatterns = [
            /<!--\s*WordPress\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:[-\w]*)?)\s*-->/i,
            /<!--\s*WP\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:[-\w]*)?)\s*-->/i,
            /<!--\s*generated\s+by\s+WordPress\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:[-\w]*)?)\s*-->/i,
            /<!--\s*powered\s+by\s+WordPress\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:[-\w]*)?)\s*-->/i
        ];

        for (const pattern of wpCommentPatterns) {
            const match = html.match(pattern);
            if (match && this.isValidWordPressVersion(match[1])) {
                return {
                    version: match[1],
                    method: 'wordpress_comments',
                    confidence: CONFIDENCE_LEVELS.MEDIUM,
                    source: match[0]
                };
            }
        }
        
        return null;
    }
}

module.exports = EnhancedVersionDetector;
