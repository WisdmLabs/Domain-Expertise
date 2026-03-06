// File: ./src/detectors/plugin-detector.js

const { PLUGIN_INDICATORS, PLUGIN_SELECTORS, PLUGIN_MAIN_FILES, WORDPRESS_API, REST_API_ENDPOINTS, JS_VARIABLES, META_TAG_PATTERNS } = require('../config/constants');
const HttpClient = require('../utils/http-client');
const UrlHelper = require('../utils/url-helper');
const VersionComparator = require('../utils/version-comparator');
const AssetInspector = require('./asset-inspector');
const EnhancedVersionDetector = require('./enhanced-version-detector');
const WordPressOrgAPI = require('../integrations/wordpress-org');

/**
 * WordPress plugin detection with comprehensive pattern matching
 * Based on systematic approach from Python implementation
 */
class PluginDetector {
    constructor(httpClient) {
        this.httpClient = httpClient || new HttpClient();
        this.assetInspector = new AssetInspector(this.httpClient);
        this.versionDetector = new EnhancedVersionDetector(this.httpClient);
        this.wpOrgAPI = new WordPressOrgAPI();
    }

    /**
     * Detect WordPress plugins using comprehensive approach
     * @param {string} baseUrl - Base URL of the site
     * @param {Object} $ - Cheerio instance
     * @param {string} html - Raw HTML content
     * @returns {Array} Array of plugin objects
     */
    async detect(baseUrl, $, html) {
        console.log('🔍 Starting comprehensive plugin detection...');
        
        // Phase 1: Extract all plugin references from HTML
        console.log('Phase 1: Analyzing HTML source...');
        const htmlData = this.extractAllPluginReferences(html);
        
        // Phase 2: Analyze inline scripts and styles
        console.log('Phase 2: Analyzing inline scripts and styles...');
        const inlineData = this.findInlinePluginData(html);
        
        // Phase 3: Analyze network resources
        console.log('Phase 3: Analyzing network resources...');
        const networkData = this.extractFromNetworkResources($);
        
        // Phase 4: Asset introspection (optimized)
        console.log('Phase 4: Performing asset introspection...');
        const assetData = await this.detectFromAssetIntrospection($);
        
        // Phase 5: Merge all detection results
        console.log('Phase 5: Merging detection results...');
        const mergedData = this.mergePluginData(htmlData, inlineData, networkData, assetData);
        
        // Phase 6: Enhance with file-based detection (TEMPORARILY DISABLED)
        console.log('Phase 6: Fetching additional version info... (DISABLED)');
        // const enhancedData = await this.enhanceWithFileDetection(baseUrl, mergedData);
        const enhancedData = mergedData; // Skip file-based detection
        
        // Phase 7: Convert to final format and filter
        console.log('Phase 7: Finalizing results...');
        const plugins = this.convertToFinalFormat(enhancedData);
        const filteredPlugins = this.filterFalsePositives(plugins);
        
        // Phase 8: Check for outdated plugins
        console.log('Phase 8: Checking plugin versions...');
        for (const plugin of filteredPlugins) {
            await this.checkPluginVersion(plugin);
        }
        
        // Phase 9: Enrich with WordPress.org metadata
        console.log('Phase 9: Enriching with WordPress.org metadata...');
        const enrichedPlugins = await this.enrichPluginsWithMetadata(filteredPlugins);
        
        console.log(`✅ Plugin detection complete: ${enrichedPlugins.length} plugins found`);
        return enrichedPlugins;
    }

    /**
     * Extract ALL plugin references using comprehensive patterns
     * @param {string} html - Raw HTML content
     * @returns {Object} Plugin data with files, versions, and URLs
     */
    extractAllPluginReferences(html) {
        const pluginData = new Map();
        
        // Comprehensive patterns to find ANY plugin references
        const patterns = [
            // Standard wp-content/plugins paths with version parameters
            /\/wp-content\/plugins\/([^\/\s"'?]+)(?:\/([^?\s"']+))?(?:\?[^?\s"']*ver=([^&\s"']+))?/gi,
            /wp-content\/plugins\/([^\/\s"'?]+)(?:\/([^?\s"']+))?(?:\?[^?\s"']*ver=([^&\s"']+))?/gi,
            
            // Plugin handles in wp_enqueue_script/style
            /wp-content\/plugins\/([^\/\s"'?]+)\/[^?\s"']*\?[^?\s"']*ver=([^&\s"']+)/gi,
            
            // Plugin directory references
            /plugins\/([^\/\s"'?]+)\//gi,
            
            // Plugin-specific URL patterns
            /[?&]plugin=([^&\s"']+)/gi,
            /[?&]p=([^&\s"']+)/gi,
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const pluginName = match[1] ? match[1].trim() : null;
                if (pluginName && pluginName.length > 1) {
                    if (!pluginData.has(pluginName)) {
                        pluginData.set(pluginName, {
                            files: new Set(),
                            versions: new Set(),
                            urls: new Set(),
                            sources: new Set()
                        });
                    }
                    
                    const data = pluginData.get(pluginName);
                    
                    // Add file if present
                    if (match[2]) {
                        data.files.add(match[2]);
                    }
                    
                    // Add version if present
                    if (match[3]) {
                        data.versions.add(match[3]);
                    }
                    
                    // Add source method
                    data.sources.add('html_pattern');
                }
            }
        }
        
        return pluginData;
    }

    /**
     * Find plugin data in inline JavaScript/CSS
     * @param {string} html - Raw HTML content
     * @returns {Object} Plugin data
     */
    findInlinePluginData(html) {
        const pluginData = new Map();
        
        // Look for plugin objects in JavaScript
        const jsPatterns = [
            /([a-zA-Z0-9_-]+)\s*:\s*{[^}]*version["\']?\s*:\s*["\']([^"']+)["\']/gi,
            /plugin["\']?\s*:\s*["\']([^"']+)["\'][^}]*version["\']?\s*:\s*["\']([^"']+)["\']/gi,
            /([a-zA-Z0-9_-]+)\.version\s*=\s*["\']([^"']+)["\']/gi,
            /window\.([a-zA-Z0-9_-]+)\s*=\s*{[^}]*version["\']?\s*:\s*["\']([^"']+)["\']/gi,
        ];
        
        for (const pattern of jsPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                if (match.length >= 3) {
                    const pluginName = match[1];
                    const version = match[2];
                    
                    if (!pluginData.has(pluginName)) {
                        pluginData.set(pluginName, {
                            files: new Set(),
                            versions: new Set(),
                            urls: new Set(),
                            sources: new Set()
                        });
                    }
                    
                    const data = pluginData.get(pluginName);
                    data.versions.add(version);
                    data.sources.add('inline_js');
                }
            }
        }
        
        // Look for meta tags with plugin info
        const metaPatterns = [
            /<meta[^>]*name=["\']generator["\'][^>]*content=["\'][^"']*plugin[^"']*([a-zA-Z0-9_-]+)\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)[^"']*["\'][^>]*>/gi,
        ];
        
        for (const pattern of metaPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                if (match.length >= 3) {
                    const pluginName = match[1];
                    const version = match[2];
                    
                    if (!pluginData.has(pluginName)) {
                        pluginData.set(pluginName, {
                            files: new Set(),
                            versions: new Set(),
                            urls: new Set(),
                            sources: new Set()
                        });
                    }
                    
                    const data = pluginData.get(pluginName);
                    data.versions.add(version);
                    data.sources.add('meta_tag');
                }
            }
        }
        
        return pluginData;
    }

    /**
     * Extract plugin info from linked CSS/JS resources
     * @param {Object} $ - Cheerio instance
     * @returns {Object} Plugin data
     */
    extractFromNetworkResources($) {
        const pluginData = new Map();
        
        // Find all CSS and JS links
        const resources = [];
        resources.push(...$('link[rel="stylesheet"]').toArray());
        resources.push(...$('script[src]').toArray());
        
        for (const resource of resources) {
            const url = $(resource).attr('href') || $(resource).attr('src');
            if (!url) continue;
            
            // Check if it's a plugin resource
            const pluginMatch = url.match(/\/wp-content\/plugins\/([^\/]+)\//);
            if (pluginMatch) {
                const pluginName = pluginMatch[1];
                
                if (!pluginData.has(pluginName)) {
                    pluginData.set(pluginName, {
                        files: new Set(),
                        versions: new Set(),
                        urls: new Set(),
                        sources: new Set()
                    });
                }
                
                const data = pluginData.get(pluginName);
                
                // Extract version from URL
                const versionMatch = url.match(/[?&]ver=([^&\s"']+)/);
                if (versionMatch) {
                    data.versions.add(versionMatch[1]);
                }
                
                // Store the resource URL
                data.urls.add(url);
                
                // Extract filename
                const filenameMatch = url.match(/\/([^\/?]+)(?:\?|$)/);
                if (filenameMatch) {
                    data.files.add(filenameMatch[1]);
                }
                
                data.sources.add('network_resource');
            }
        }
        
        return pluginData;
    }

    /**
     * Merge data from multiple detection methods
     * @param {...Object} dataSources - Multiple plugin data objects
     * @returns {Object} Merged plugin data
     */
    mergePluginData(...dataSources) {
        const merged = new Map();
        
        for (const dataSource of dataSources) {
            for (const [pluginName, info] of dataSource.entries()) {
                if (!merged.has(pluginName)) {
                    merged.set(pluginName, {
                        files: new Set(),
                        versions: new Set(),
                        urls: new Set(),
                        sources: new Set()
                    });
                }
                
                const mergedInfo = merged.get(pluginName);
                mergedInfo.files = new Set([...mergedInfo.files, ...info.files]);
                mergedInfo.versions = new Set([...mergedInfo.versions, ...info.versions]);
                mergedInfo.urls = new Set([...mergedInfo.urls, ...info.urls]);
                mergedInfo.sources = new Set([...mergedInfo.sources, ...info.sources]);
            }
        }
        
        return merged;
    }

    /**
     * Enhance plugin data with file-based detection
     * @param {string} baseUrl - Base URL
     * @param {Object} pluginData - Plugin data to enhance
     * @returns {Object} Enhanced plugin data
     */
    async enhanceWithFileDetection(baseUrl, pluginData) {
        const enhanced = new Map();
        
        for (const [pluginName, data] of pluginData.entries()) {
            console.log(`  Checking ${pluginName}...`);
            
            // Try readme files
            const readmeVersion = await this.fetchPluginReadme(baseUrl, pluginName);
            if (readmeVersion) {
                data.versions.add(readmeVersion);
                data.sources.add('readme_file');
            }
            
            // Skip main plugin file fetching to avoid delays - versions already detected from other sources
            // const mainVersion = await this.fetchMainPluginFile(baseUrl, pluginName);
            // if (mainVersion) {
            //     data.versions.add(mainVersion);
            //     data.sources.add('main_file');
            // }
            
            enhanced.set(pluginName, data);
        }
        
        return enhanced;
    }

    /**
     * Try to fetch plugin readme for version info
     * @param {string} baseUrl - Base URL
     * @param {string} pluginName - Plugin name
     * @returns {string|null} Version or null
     */
    async fetchPluginReadme(baseUrl, pluginName) {
        // Skip README.md files as they're usually not present and cause delays
        const readmeFiles = ['readme.txt', 'README.txt'];
        
        for (const readme of readmeFiles) {
            const url = `${baseUrl}/wp-content/plugins/${pluginName}/${readme}`;
            try {
                const response = await this.httpClient.fetchPage(url, { timeout: 2000 });
                if (response && response.data) {
                    const content = response.data;
                    
                    // Look for version in readme
                    const versionPatterns = [
                        /Stable tag:\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
                        /Version:\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
                        /Current version:\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
                    ];
                    
                    for (const pattern of versionPatterns) {
                        const match = content.match(pattern);
                        if (match) {
                            return match[1];
                        }
                    }
                }
            } catch (error) {
                // Continue to next file
                continue;
            }
        }
        
        return null;
    }

    /**
     * Try to fetch main plugin PHP file for version info
     * @param {string} baseUrl - Base URL
     * @param {string} pluginName - Plugin name
     * @returns {string|null} Version or null
     */
    async fetchMainPluginFile(baseUrl, pluginName) {
        // Common main file patterns
        const mainFiles = [
            `${pluginName}.php`,
            `${pluginName.replace(/-/g, '_')}.php`,
            `${pluginName.replace(/_/g, '-')}.php`,
            "index.php",
            "main.php"
        ];
        
        for (const mainFile of mainFiles) {
            const url = `${baseUrl}/wp-content/plugins/${pluginName}/${mainFile}`;
            try {
                const response = await this.httpClient.fetchPage(url, { timeout: 5000 });
                if (response && response.data) {
                    const content = response.data;
                    
                    // Look for WordPress plugin header
                    const versionPatterns = [
                        /Version:\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:\.[0-9]+)?)/i,
                        /define\s*\(\s*["\'][^"']*VERSION[^"']*["\']\s*,\s*["\']([^"']+)["\']/i,
                        /\$version\s*=\s*["\']([0-9]+\.[0-9]+(?:\.[0-9]+)?)["\']/i,
                    ];
                    
                    for (const pattern of versionPatterns) {
                        const match = content.match(pattern);
                        if (match) {
                            return match[1];
                        }
                    }
                }
            } catch (error) {
                // Continue to next file
                continue;
            }
        }
        
        return null;
    }

    /**
     * Get the best version from multiple version candidates
     * @param {Set} versions - Set of version candidates
     * @returns {string|null} Best version or null
     */
    getBestVersion(versions) {
        if (!versions || versions.size === 0) {
            return null;
        }
        
        // Convert to array and filter out obviously wrong versions
        const versionArray = Array.from(versions);
        const validVersions = [];
        
        for (const v of versionArray) {
            const versionStr = String(v).trim();
            
            // Skip empty or very short versions
            if (!versionStr || versionStr.length < 2) continue;
            
            // Accept various version formats
            if (/^[0-9]+\.[0-9]+(?:\.[0-9]+)?(?:\.[0-9]+)?$/.test(versionStr) || // Standard semver
                /^[0-9]+\.[0-9]+$/.test(versionStr) || // Major.minor
                (/^[0-9]+$/.test(versionStr) && parseInt(versionStr) < 1000)) { // Single number (like "1") but not large numbers
                validVersions.push(versionStr);
            }
        }
        
        if (validVersions.length === 0) {
            // Return any non-empty version if no valid format found
            const nonEmptyVersions = versionArray.filter(v => String(v).trim().length > 0);
            return nonEmptyVersions.length > 0 ? String(nonEmptyVersions[0]).trim() : null;
        }
        
        // Return the most specific version (most dots)
        return validVersions.reduce((best, current) => {
            return current.split('.').length > best.split('.').length ? current : best;
        });
    }

    /**
     * Convert merged data to final plugin format
     * @param {Object} pluginData - Merged plugin data
     * @returns {Array} Array of plugin objects
     */
    convertToFinalFormat(pluginData) {
        const plugins = [];
        
        for (const [pluginName, data] of pluginData.entries()) {
            const pluginInfo = {
                name: pluginName,
                displayName: null,
                version: this.getBestVersion(data.versions),
                author: null,
                description: null,
                path: `/wp-content/plugins/${pluginName}/`,
                detectionMethods: Array.from(data.sources),
                isOutdated: null,
                latestVersion: null,
                confidence: this.calculateConfidence(Array.from(data.sources)),
                files: Array.from(data.files),
                resourceUrls: Array.from(data.urls),
                fileCount: data.files.size,
                versionCandidates: Array.from(data.versions),
                versionSource: this.determineVersionSource(data)
            };
            
            // Try to get display name from indicators
            const indicator = PLUGIN_INDICATORS.find(ind => ind.name === pluginName);
            if (indicator) {
                pluginInfo.displayName = indicator.displayName;
            }
            
            plugins.push(pluginInfo);
        }
        
        return plugins;
    }

    /**
     * Determine the source of the version
     * @param {Object} data - Plugin data
     * @returns {string} Version source
     */
    determineVersionSource(data) {
        const sources = Array.from(data.sources);
        
        // Priority order for version sources
        const priorityOrder = [
            'main_file',
            'readme_file', 
            'plugin_header',
            'inline_js',
            'network_resource',
            'html_pattern',
            'asset_introspection'
        ];
        
        for (const priority of priorityOrder) {
            if (sources.includes(priority)) {
                return priority;
            }
        }
        
        return sources[0] || 'unknown';
    }

    /**
     * Calculate detection confidence based on methods used
     * @param {Array} methods - Detection methods for a plugin
     * @returns {string} Confidence level
     */
    calculateConfidence(methods) {
        if (methods.length === 0) return 'low';
        
        const hasHighConfidence = methods.some(m => 
            ['main_file', 'readme_file', 'plugin_header'].includes(m)
        );
        const methodCount = methods.length;
        
        if (hasHighConfidence && methodCount >= 2) return 'high';
        if (hasHighConfidence || methodCount >= 3) return 'medium';
        return 'low';
    }

    /**
     * Filter out false positive plugin detections
     * @param {Array} plugins - Array of detected plugins
     * @returns {Array} Filtered plugins
     */
    filterFalsePositives(plugins) {
        const falsePositivePatterns = [
            /^[a-zA-Z]$/, // Single letters like 'v'
            /^\.$/, // Single dots
            /^[a-zA-Z0-9_-]{1}$/, // Single character strings
            /^[a-zA-Z0-9_-]*[^a-zA-Z0-9_-]+[a-zA-Z0-9_-]*$/, // Contains invalid characters
        ];

        return plugins.filter(plugin => {
            // Skip plugins with invalid names
            for (const pattern of falsePositivePatterns) {
                if (pattern.test(plugin.name)) {
                    return false;
                }
            }
            
            // Skip plugins with very low confidence and no version, unless they have multiple detection methods
            if (plugin.confidence === 'low' && !plugin.version && plugin.detectionMethods.length < 2) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Detect plugins from asset paths (scripts and stylesheets)
     * @param {Object} $ - Cheerio instance
     * @returns {Array} Array of plugin detection results
     */
    detectFromAssetPaths($) {
        const plugins = [];
        const assetTags = $('script[src*="/wp-content/plugins/"], link[href*="/wp-content/plugins/"]');
        
        assetTags.each((i, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('href');
            if (src) {
                const pluginName = UrlHelper.extractPluginName(src);
                if (pluginName) {
                    plugins.push({
                        name: pluginName,
                        source: src,
                        type: $(elem).is('script') ? 'script' : 'stylesheet'
                    });
                }
            }
        });

        return plugins;
    }

    /**
     * Detect plugins from HTML comments
     * @param {string} html - Raw HTML content
     * @returns {Array} Array of plugin detection results
     */
    detectFromComments(html) {
        const plugins = [];
        
        // Look for plugin-specific comments
        const commentPatterns = [
            /<!--.*?\/wp-content\/plugins\/([^\/\s]+).*?-->/g,
            /<!-- .*?Plugin:?\s*([^-\n]+?).*?-->/gi,
            /<!-- .*?Generated by\s+([^-\n]+?).*?-->/gi
        ];

        commentPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const pluginName = match[1].trim().toLowerCase().replace(/\s+/g, '-');
                if (pluginName && !pluginName.includes('/')) {
                    plugins.push({
                        name: pluginName,
                        source: match[0],
                        type: 'comment'
                    });
                }
            }
        });

        return plugins;
    }

    /**
     * Detect plugins from content indicators
     * @param {string} html - Raw HTML content
     * @returns {Array} Array of plugin detection results
     */
    detectFromIndicators(html) {
        const plugins = [];
        
        PLUGIN_INDICATORS.forEach(indicator => {
            if (indicator.pattern.test(html)) {
                plugins.push({
                    name: indicator.name,
                    displayName: indicator.displayName,
                    source: 'content_pattern',
                    type: 'indicator'
                });
            }
        });

        return plugins;
    }

    /**
     * Detect plugins from CSS selectors
     * @param {Object} $ - Cheerio instance
     * @returns {Array} Array of plugin detection results
     */
    detectFromSelectors($) {
        const plugins = [];
        
        PLUGIN_SELECTORS.forEach(selector => {
            if ($(selector.selector).length > 0) {
                plugins.push({
                    name: selector.name,
                    displayName: selector.displayName,
                    source: selector.selector,
                    type: 'css_selector',
                    elementCount: $(selector.selector).length
                });
            }
        });

        return plugins;
    }

    /**
     * Detect plugins from JavaScript objects and variables
     * @param {string} html - Raw HTML content
     * @returns {Array} Array of plugin detection results
     */
    detectFromJavaScript(html) {
        const plugins = [];
        
        // Common plugin JavaScript patterns
        const jsPatterns = [
            { pattern: /window\.elementor/i, name: 'elementor', displayName: 'Elementor' },
            { pattern: /window\.wc_add_to_cart_params/i, name: 'woocommerce', displayName: 'WooCommerce' },
            { pattern: /window\.wpforms/i, name: 'wpforms-lite', displayName: 'WPForms' },
            { pattern: /window\.yoast/i, name: 'wordpress-seo', displayName: 'Yoast SEO' },
            { pattern: /window\.jetpack/i, name: 'jetpack', displayName: 'Jetpack' },
            { pattern: /window\.rankMath/i, name: 'seo-by-rank-math', displayName: 'Rank Math SEO' },
            { pattern: /window\.wordfence/i, name: 'wordfence', displayName: 'Wordfence Security' }
        ];

        jsPatterns.forEach(jsPattern => {
            if (jsPattern.pattern.test(html)) {
                plugins.push({
                    name: jsPattern.name,
                    displayName: jsPattern.displayName,
                    source: 'javascript_object',
                    type: 'js_detection'
                });
            }
        });

        return plugins;
    }

    /**
     * Get detailed plugin information
     * @param {string} baseUrl - Base URL of the site
     * @param {string} pluginPath - Plugin directory name
     * @param {Array} detectionMethods - Array of detection methods used
     * @returns {Object} Plugin information
     */
    async getPluginDetails(baseUrl, pluginPath, detectionMethods) {
        const pluginInfo = {
            name: pluginPath,
            displayName: null,
            version: null,
            author: null,
            description: null,
            path: `/wp-content/plugins/${pluginPath}/`,
            detectionMethods: detectionMethods.filter(m => m.plugin === pluginPath),
            isOutdated: null,
            latestVersion: null,
            confidence: this.calculateConfidence(detectionMethods.filter(m => m.plugin === pluginPath))
        };

        // Try to get display name from indicators
        const indicator = PLUGIN_INDICATORS.find(ind => ind.name === pluginPath);
        if (indicator) {
            pluginInfo.displayName = indicator.displayName;
        }

        // Check if we have version info from asset introspection
        const assetIntrospectionMethod = detectionMethods.find(m => m.plugin === pluginPath && m.method === 'asset_introspection');
        if (assetIntrospectionMethod && assetIntrospectionMethod.version && !pluginInfo.version) {
            pluginInfo.version = assetIntrospectionMethod.version;
            pluginInfo.detectionSource = 'asset_introspection';
        }

        // Try to read plugin header information
        await this.fetchPluginHeader(baseUrl, pluginInfo);

        // Check if plugin is outdated
        await this.checkPluginVersion(pluginInfo);

        return pluginInfo;
    }

    /**
     * Fetch plugin header information from main plugin file
     * @param {string} baseUrl - Base URL
     * @param {Object} pluginInfo - Plugin info object to update
     */
    async fetchPluginHeader(baseUrl, pluginInfo) {
        const possibleFiles = PLUGIN_MAIN_FILES.map(file => 
            file.replace('{plugin}', pluginInfo.name)
        );

        for (const mainFile of possibleFiles) {
            const pluginFileUrl = UrlHelper.joinPath(baseUrl, `/wp-content/plugins/${mainFile}`);
            
            try {
                const response = await this.httpClient.fetchPage(pluginFileUrl);
                
                if (response && response.data && response.data.includes('Plugin Name:')) {
                    this.parsePluginHeader(response.data, pluginInfo);
                    
                    // Use enhanced version detection on the plugin file content
                    if (!pluginInfo.version) {
                        const versionResults = await this.versionDetector.extractVersionFromAsset(
                            pluginFileUrl, 
                            response.data, 
                            response.headers
                        );
                        
                        if (versionResults.length > 0) {
                            const bestVersion = versionResults[0];
                            pluginInfo.version = bestVersion.version;
                            pluginInfo.versionSource = 'enhanced_header_analysis';
                            pluginInfo.versionConfidence = bestVersion.confidence;
                        }
                    }
                    break;
                }
            } catch (error) {
                // Plugin file not accessible, continue to next possible file
                continue;
            }
        }
    }

    /**
     * Parse plugin header information
     * @param {string} pluginContent - Plugin file content
     * @param {Object} pluginInfo - Plugin info object to update
     */
    parsePluginHeader(pluginContent, pluginInfo) {
        const headerPatterns = {
            name: /Plugin Name:\s*(.+)/i,
            version: /Version:\s*(.+)/i,
            author: /Author:\s*(.+)/i,
            description: /Description:\s*(.+)/i,
            pluginUri: /Plugin URI:\s*(.+)/i,
            textDomain: /Text Domain:\s*(.+)/i,
            domainPath: /Domain Path:\s*(.+)/i,
            requiresWp: /Requires at least:\s*(.+)/i,
            testedWp: /Tested up to:\s*(.+)/i,
            requiresPhp: /Requires PHP:\s*(.+)/i,
            network: /Network:\s*(.+)/i,
            license: /License:\s*(.+)/i
        };

        for (const [key, pattern] of Object.entries(headerPatterns)) {
            const match = pluginContent.match(pattern);
            if (match) {
                const value = match[1].trim();
                
                switch (key) {
                    case 'name':
                        pluginInfo.displayName = value;
                        break;
                    case 'version':
                        pluginInfo.version = value;
                        break;
                    case 'author':
                        pluginInfo.author = value;
                        break;
                    case 'description':
                        pluginInfo.description = value;
                        break;
                    default:
                        pluginInfo[key] = value;
                }
            }
        }
    }

    /**
     * Check if plugin version is outdated by querying WordPress.org API
     * @param {Object} pluginInfo - Plugin information object
     */
    async checkPluginVersion(pluginInfo) {
        try {
            const apiUrl = `${WORDPRESS_API.BASE_URL}${WORDPRESS_API.PLUGIN_INFO}${pluginInfo.name}.json`;
            const response = await this.httpClient.fetchPage(apiUrl, { noPuppeteerFallback: true });
            
            if (response && response.data) {
                const pluginData = typeof response.data === 'string' 
                    ? JSON.parse(response.data) 
                    : response.data;
                
                if (pluginData.version) {
                    // Basic version information
                    pluginInfo.latestVersion = pluginData.version;
                    pluginInfo.downloadCount = pluginData.downloaded;
                    pluginInfo.rating = pluginData.rating;
                    pluginInfo.numRatings = pluginData.num_ratings;
                    pluginInfo.lastUpdated = pluginData.last_updated;
                    
                    // Enhanced plugin information
                    pluginInfo.pluginName = pluginData.name;
                    pluginInfo.pluginSlug = pluginData.slug;
                    pluginInfo.author = pluginData.author;
                    pluginInfo.authorProfile = pluginData.author_profile;
                    pluginInfo.pluginUrl = pluginData.plugin_url;
                    pluginInfo.description = pluginData.description;
                    pluginInfo.shortDescription = pluginData.short_description;
                    pluginInfo.requires = pluginData.requires;
                    pluginInfo.tested = pluginData.tested;
                    pluginInfo.requiresPhp = pluginData.requires_php;
                    pluginInfo.stableTag = pluginData.stable_tag;
                    pluginInfo.downloadLink = pluginData.download_link;
                    pluginInfo.donateLink = pluginData.donate_link;
                    
                    // Tags and categories
                    pluginInfo.tags = pluginData.tags || {};
                    pluginInfo.categories = pluginData.categories || {};
                    
                    // Screenshots
                    pluginInfo.screenshots = pluginData.screenshots || {};
                    
                    // Version history
                    pluginInfo.versions = pluginData.versions || {};
                    
                    // Contributors
                    pluginInfo.contributors = pluginData.contributors || {};
                    
                    // Additional sections
                    pluginInfo.sections = pluginData.sections || {};
                    
                    // Calculate rating percentage
                    if (pluginData.rating && pluginData.num_ratings) {
                        // WordPress.org API returns rating as a number out of 100, not out of 5
                        pluginInfo.ratingPercentage = pluginData.rating;
                        pluginInfo.ratingOutOfFive = (pluginData.rating / 20).toFixed(1); // Convert to 5-star scale
                    }
                    
                    // Determine plugin popularity
                    if (pluginData.downloaded) {
                        if (pluginData.downloaded >= 1000000) {
                            pluginInfo.popularity = 'very_popular';
                        } else if (pluginData.downloaded >= 100000) {
                            pluginInfo.popularity = 'popular';
                        } else if (pluginData.downloaded >= 10000) {
                            pluginInfo.popularity = 'moderate';
                        } else {
                            pluginInfo.popularity = 'niche';
                        }
                    }
                    
                    // Determine plugin health score
                    pluginInfo.healthScore = this.calculatePluginHealthScore(pluginData);
                    
                    // Generate recommendations
                    pluginInfo.recommendations = this.generatePluginRecommendations(pluginData, pluginInfo);
                    
                    if (pluginInfo.version) {
                        pluginInfo.isOutdated = VersionComparator.isOlder(
                            pluginInfo.version, 
                            pluginData.version
                        );
                    }
                }
            }
        } catch (error) {
            console.warn(`Could not check version for plugin: ${pluginInfo.name} - ${error.message}`);
        }
    }

    /**
     * Detect plugins from REST API endpoints
     * @param {string} baseUrl - Base URL of the site
     * @returns {Array} Array of plugin detection results
     */
    async detectFromRestAPI(baseUrl) {
        const plugins = [];
        
        for (const endpoint of REST_API_ENDPOINTS) {
            try {
                const endpointUrl = UrlHelper.joinPath(baseUrl, endpoint.endpoint);
                const response = await this.httpClient.fetchPage(endpointUrl, { timeout: 3000 });
                
                if (response && (response.status === 200 || response.status === 401)) {
                    // Even 401 responses indicate the endpoint exists
                    plugins.push({
                        name: endpoint.name,
                        displayName: endpoint.displayName,
                        source: endpoint.endpoint,
                        type: 'rest_api'
                    });
                }
            } catch (error) {
                // Endpoint doesn't exist or is not accessible
                continue;
            }
        }
        
        return plugins;
    }

    /**
     * Detect plugins from meta tags
     * @param {Object} $ - Cheerio instance
     * @returns {Array} Array of plugin detection results
     */
    detectFromMetaTags($) {
        const plugins = [];
        
        META_TAG_PATTERNS.forEach(pattern => {
            let metaContent = '';
            
            if (pattern.name) {
                metaContent = $(`meta[name="${pattern.name}"]`).attr('content') || '';
            } else if (pattern.property) {
                metaContent = $(`meta[property="${pattern.property}"]`).attr('content') || '';
            }
            
            if (pattern.pattern.test(metaContent)) {
                plugins.push({
                    name: pattern.plugin,
                    displayName: pattern.displayName,
                    source: metaContent,
                    type: 'meta_tag'
                });
            }
        });
        
        return plugins;
    }

    /**
     * Enhanced JavaScript variable detection
     * @param {string} html - Raw HTML content
     * @returns {Array} Array of plugin detection results
     */
    detectFromJSVariables(html) {
        const plugins = [];
        
        JS_VARIABLES.forEach(jsVar => {
            // Look for variable declarations and assignments
            const patterns = [
                new RegExp(`window\\.${jsVar.variable}\\s*=`, 'i'),
                new RegExp(`var\\s+${jsVar.variable}\\s*=`, 'i'),
                new RegExp(`"${jsVar.variable}"\\s*:`, 'i'),
                new RegExp(`'${jsVar.variable}'\\s*:`, 'i'),
                new RegExp(`${jsVar.variable}\\s*=\\s*\\{`, 'i')
            ];
            
            const found = patterns.some(pattern => pattern.test(html));
            
            if (found) {
                plugins.push({
                    name: jsVar.name,
                    displayName: jsVar.displayName,
                    source: jsVar.variable,
                    type: 'js_variable'
                });
            }
        });
        
        return plugins;
    }

    /**
     * Advanced asset introspection for plugin detection (Optimized)
     * @param {Object} $ - Cheerio instance
     * @returns {Object} Plugin data
     */
    async detectFromAssetIntrospection($) {
        const pluginData = new Map();
        const assetUrls = new Set(); // Use Set to avoid duplicates

        // Collect unique plugin/theme assets from the page
        $('script[src*="wp-content"], link[href*="wp-content"]').each((i, element) => {
            const url = $(element).attr('src') || $(element).attr('href');
            if (url && (url.includes('/plugins/') || url.includes('/themes/'))) {
                assetUrls.add(url);
            }
        });

        if (assetUrls.size === 0) return pluginData;

        // Smart asset selection: prioritize plugin assets and limit to 8 most promising
        const assetArray = Array.from(assetUrls);
        const prioritizedAssets = this.prioritizeAssets(assetArray);
        const limitedUrls = prioritizedAssets.slice(0, 8); // Reduced from 20 to 8
        
        console.log(`🔍 Performing optimized asset introspection on ${limitedUrls.length} assets...`);
        
        // Process assets in parallel with optimized batching
        const assetResults = await this.assetInspector.inspectAssetsOptimized(limitedUrls);
        
        // Process results and add to plugin data
        for (const result of assetResults) {
            if (result.type === 'plugin' && result.slug) {
                if (!pluginData.has(result.slug)) {
                    pluginData.set(result.slug, {
                        files: new Set(),
                        versions: new Set(),
                        urls: new Set(),
                        sources: new Set()
                    });
                }
                
                const data = pluginData.get(result.slug);
                
                // Add version if found
                if (result.version) {
                    data.versions.add(result.version);
                }
                
                // Add URL
                if (result.url) {
                    data.urls.add(result.url);
                }
                
                // Add source method
                data.sources.add('asset_introspection');
                
                // Only attempt additional version detection if we don't have one and it's a high-confidence result
                if (!result.version && result.confidence === 'high' && result.url) {
                    try {
                        console.log(`🔍 Attempting version detection for ${result.slug} from asset: ${result.url}`);
                        const versionResults = await this.versionDetector.extractVersionFromAsset(result.url, null, {}, 'plugin');
                        if (versionResults.length > 0) {
                            const bestVersion = versionResults[0];
                            data.versions.add(bestVersion.version);
                            console.log(`✅ Found version for ${result.slug}: ${bestVersion.version} (source: ${bestVersion.source})`);
                        }
                    } catch (error) {
                        // Continue without version if detection fails
                        console.log(`❌ Version detection failed for ${result.slug}: ${error.message}`);
                    }
                }
            }
        }

        return pluginData;
    }

    /**
     * Prioritize assets for faster processing
     * @param {Array} assetUrls - Array of asset URLs
     * @returns {Array} Prioritized asset URLs
     */
    prioritizeAssets(assetUrls) {
        return assetUrls.sort((a, b) => {
            // Priority 1: Plugin assets over theme assets
            const aIsPlugin = a.includes('/plugins/');
            const bIsPlugin = b.includes('/plugins/');
            if (aIsPlugin && !bIsPlugin) return -1;
            if (!aIsPlugin && bIsPlugin) return 1;
            
            // Priority 2: JavaScript files over CSS files (more likely to contain version info)
            const aIsJS = a.includes('.js');
            const bIsJS = b.includes('.js');
            if (aIsJS && !bIsJS) return -1;
            if (!aIsJS && bIsJS) return 1;
            
            // Priority 3: Smaller file names (likely main plugin files)
            const aName = a.split('/').pop().split('?')[0];
            const bName = b.split('/').pop().split('?')[0];
            if (aName.length < bName.length) return -1;
            if (aName.length > bName.length) return 1;
            
            return 0;
        });
    }

    /**
     * Calculate plugin health score based on various factors
     * @param {Object} pluginData - Plugin data from WordPress.org API
     * @returns {number} Health score (0-100)
     */
    calculatePluginHealthScore(pluginData) {
        let score = 0;
        
        // Rating factor (40% weight)
        if (pluginData.rating && pluginData.num_ratings) {
            // WordPress.org API returns rating as a number out of 100, not out of 5
            const ratingScore = (pluginData.rating / 100) * 40;
            score += ratingScore;
        }
        
        // Download count factor (20% weight)
        if (pluginData.downloaded) {
            let downloadScore = 0;
            if (pluginData.downloaded >= 1000000) downloadScore = 20;
            else if (pluginData.downloaded >= 100000) downloadScore = 15;
            else if (pluginData.downloaded >= 10000) downloadScore = 10;
            else if (pluginData.downloaded >= 1000) downloadScore = 5;
            score += downloadScore;
        }
        
        // Update frequency factor (20% weight)
        if (pluginData.last_updated) {
            const lastUpdate = new Date(pluginData.last_updated);
            const now = new Date();
            const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
            
            let updateScore = 0;
            if (daysSinceUpdate <= 30) updateScore = 20;
            else if (daysSinceUpdate <= 90) updateScore = 15;
            else if (daysSinceUpdate <= 180) updateScore = 10;
            else if (daysSinceUpdate <= 365) updateScore = 5;
            score += updateScore;
        }
        
        // WordPress compatibility factor (10% weight)
        if (pluginData.tested) {
            const testedVersion = parseFloat(pluginData.tested);
            if (testedVersion >= 6.0) score += 10;
            else if (testedVersion >= 5.0) score += 7;
            else if (testedVersion >= 4.0) score += 5;
        }
        
        // PHP compatibility factor (10% weight)
        if (pluginData.requires_php) {
            const requiredPhp = parseFloat(pluginData.requires_php);
            if (requiredPhp >= 8.0) score += 10;
            else if (requiredPhp >= 7.4) score += 8;
            else if (requiredPhp >= 7.0) score += 5;
        }
        
        return Math.round(score);
    }
    
    /**
     * Generate recommendations for a plugin
     * @param {Object} pluginData - Plugin data from WordPress.org API
     * @param {Object} pluginInfo - Current plugin information
     * @returns {Array} Array of recommendations
     */
    generatePluginRecommendations(pluginData, pluginInfo) {
        const recommendations = [];
        
        // Version update recommendations
        if (pluginInfo.isOutdated) {
            recommendations.push({
                type: 'update',
                priority: 'high',
                message: `Update ${pluginInfo.name} from version ${pluginInfo.version} to ${pluginInfo.latestVersion}`,
                action: 'update_plugin'
            });
        }
        
        // Rating-based recommendations
        if (pluginData.rating && pluginData.rating < 3.0) {
            recommendations.push({
                type: 'rating',
                priority: 'medium',
                message: `${pluginInfo.name} has a low rating (${pluginData.rating}/5). Consider alternatives.`,
                action: 'research_alternatives'
            });
        }
        
        // Update frequency recommendations
        if (pluginData.last_updated) {
            const lastUpdate = new Date(pluginData.last_updated);
            const now = new Date();
            const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
            
            if (daysSinceUpdate > 365) {
                recommendations.push({
                    type: 'maintenance',
                    priority: 'medium',
                    message: `${pluginInfo.name} hasn't been updated in over a year. Consider if it's still needed.`,
                    action: 'review_necessity'
                });
            }
        }
        
        // Popularity recommendations
        if (pluginData.downloaded && pluginData.downloaded < 1000) {
            recommendations.push({
                type: 'popularity',
                priority: 'low',
                message: `${pluginInfo.name} has very few downloads. Verify it's from a trusted source.`,
                action: 'verify_source'
            });
        }
        
        // WordPress compatibility recommendations
        if (pluginData.tested) {
            const testedVersion = parseFloat(pluginData.tested);
            if (testedVersion < 5.0) {
                recommendations.push({
                    type: 'compatibility',
                    priority: 'medium',
                    message: `${pluginInfo.name} was last tested with WordPress ${pluginData.tested}. Test compatibility.`,
                    action: 'test_compatibility'
                });
            }
        }
        
        // Security recommendations
        if (pluginData.sections && pluginData.sections.changelog) {
            const changelog = pluginData.sections.changelog.toLowerCase();
            if (changelog.includes('security') || changelog.includes('vulnerability')) {
                recommendations.push({
                    type: 'security',
                    priority: 'high',
                    message: `${pluginInfo.name} has recent security updates. Update immediately.`,
                    action: 'update_security'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * Enrich detected plugins with WordPress.org metadata
     * @param {Array} plugins - Array of detected plugins
     * @returns {Array} Enriched plugins with metadata
     */
    async enrichPluginsWithMetadata(plugins) {
        if (!plugins || plugins.length === 0) return plugins;

        console.log(`📊 Enriching ${plugins.length} plugins with WordPress.org metadata...`);
        
        const enrichedPlugins = [];
        
        for (const plugin of plugins) {
            try {
                // Extract plugin slug from various identifiers
                const pluginSlug = WordPressOrgAPI.extractPluginSlug(
                    plugin.slug || plugin.name || plugin.identifier
                );
                
                if (pluginSlug) {
                    const metadata = await this.wpOrgAPI.getPluginInfo(pluginSlug);
                    
                    if (metadata) {
                        // Merge metadata with existing plugin data
                        enrichedPlugins.push({
                            ...plugin,
                            wp_org_metadata: {
                                slug: metadata.slug,
                                name: metadata.name,
                                version: metadata.version,
                                rating: metadata.rating,
                                num_ratings: metadata.num_ratings,
                                active_installs: metadata.active_installs,
                                last_updated: metadata.last_updated,
                                short_description: metadata.short_description,
                                homepage: metadata.homepage,
                                tags: metadata.tags,
                                requires: metadata.requires,
                                tested: metadata.tested,
                                requires_php: metadata.requires_php,
                                quality_score: this.calculatePluginQualityScore(metadata)
                            }
                        });
                    } else {
                        // Keep original plugin data if no metadata found
                        enrichedPlugins.push(plugin);
                    }
                } else {
                    // Keep original plugin data if no slug could be extracted
                    enrichedPlugins.push(plugin);
                }
            } catch (error) {
                console.warn(`Failed to enrich plugin ${plugin.name}:`, error.message);
                enrichedPlugins.push(plugin);
            }
        }
        
        console.log(`✅ Enriched ${enrichedPlugins.filter(p => p.wp_org_metadata).length} plugins with metadata`);
        return enrichedPlugins;
    }

    /**
     * Calculate a quality score for a plugin based on WordPress.org data
     * @param {Object} metadata - WordPress.org plugin metadata
     * @returns {number} Quality score (0-100)
     */
    calculatePluginQualityScore(metadata) {
        let score = 0;
        
        // Rating weight (40%)
        if (metadata.rating && metadata.num_ratings > 0) {
            score += (metadata.rating / 5) * 40;
        }
        
        // Active installs weight (30%)
        if (metadata.active_installs) {
            if (metadata.active_installs >= 1000000) score += 30;
            else if (metadata.active_installs >= 100000) score += 25;
            else if (metadata.active_installs >= 10000) score += 20;
            else if (metadata.active_installs >= 1000) score += 15;
            else if (metadata.active_installs >= 100) score += 10;
            else score += 5;
        }
        
        // Update frequency weight (20%)
        if (metadata.last_updated) {
            const lastUpdate = new Date(metadata.last_updated);
            const now = new Date();
            const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
            
            if (daysSinceUpdate <= 30) score += 20;
            else if (daysSinceUpdate <= 90) score += 15;
            else if (daysSinceUpdate <= 180) score += 10;
            else if (daysSinceUpdate <= 365) score += 5;
        }
        
        // WordPress compatibility weight (10%)
        if (metadata.tested) {
            const testedVersion = parseFloat(metadata.tested);
            if (testedVersion >= 6.0) score += 10;
            else if (testedVersion >= 5.0) score += 7;
            else if (testedVersion >= 4.0) score += 5;
        }
        
        return Math.round(Math.min(score, 100));
    }

    /**
     * Get plugins with version analysis
     * @param {string} baseUrl - Base URL
     * @param {Object} $ - Cheerio instance
     * @param {string} html - Raw HTML content
     * @returns {Object} Plugin analysis results
     */
    async analyzePlugins(baseUrl, $, html) {
        const plugins = await this.detect(baseUrl, $, html);
        
        const analysis = {
            total: plugins.length,
            outdated: plugins.filter(p => p.isOutdated === true).length,
            unknown: plugins.filter(p => p.isOutdated === null).length,
            upToDate: plugins.filter(p => p.isOutdated === false).length,
            plugins: plugins
        };

        return analysis;
    }
}

module.exports = PluginDetector;
