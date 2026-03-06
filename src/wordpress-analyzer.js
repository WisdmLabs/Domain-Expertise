// File: ./src/wordpress-analyzer.js

const cheerio = require('cheerio');

// Import utilities
const HttpClient = require('./utils/http-client');
const UrlHelper = require('./utils/url-helper');

// Import detectors
const EnhancedWordPressDetector = require('./detectors/enhanced-wordpress-detector');
const EnhancedVersionDetector = require('./detectors/enhanced-version-detector');
const ThemeDetector = require('./detectors/theme-detector');
const PluginDetector = require('./detectors/plugin-detector');
const PerformanceAnalyzer = require('./detectors/performance-analyzer');

// Import recommendation system
const PluginRecommendationEngine = require('./recommendations/plugin-recommendation-engine');

// Import reporters
const ConsoleReporter = require('./reporters/console-reporter');
const JsonReporter = require('./reporters/json-reporter');
const HtmlReporter = require('./reporters/html-reporter');
const PdfReporter = require('./reporters/pdf-reporter');

// Import configuration
const { HTTP, ERRORS } = require('./config/constants');

/**
 * Main WordPress site analyzer class
 */
class WordPressAnalyzer {
    /**
     * Initialize the analyzer
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.httpClient = new HttpClient({
            userAgent: options.userAgent || HTTP.USER_AGENT,
            timeout: options.timeout || HTTP.TIMEOUT,
            maxRedirects: options.maxRedirects || HTTP.MAX_REDIRECTS
        });

        // Initialize detectors
        this.wordpressDetector = new EnhancedWordPressDetector(this.httpClient);
        this.versionDetector = new EnhancedVersionDetector(this.httpClient);
        this.themeDetector = new ThemeDetector(this.httpClient);
        this.pluginDetector = new PluginDetector(this.httpClient);
        
        // Initialize recommendation engine
        this.recommendationEngine = new PluginRecommendationEngine(this.httpClient);

        // Options
        this.options = {
            includePlugins: options.includePlugins !== false,
            includeTheme: options.includeTheme !== false,
            includeVersion: options.includeVersion !== false,
            checkVersions: options.checkVersions !== false,
            includePerformance: options.includePerformance !== false,
            includeRecommendations: options.includeRecommendations !== false,
            maxConcurrentRequests: options.maxConcurrentRequests || 5,
            ...options
        };
    }

    /**
     * Analyze a WordPress site
     * @param {string} url - The WordPress site URL
     * @param {Object} options - Analysis options
     * @returns {Object} Analysis results
     */
    async analyzeSite(url, options = {}) {
        const startTime = Date.now();
        
        try {
            // Normalize and validate URL
            const normalizedUrl = UrlHelper.normalizeUrl(url);
            console.log(`🔍 Analyzing WordPress site: ${normalizedUrl}`);

            // Initialize results object
            const results = {
                url: normalizedUrl,
                timestamp: new Date().toISOString(),
                wordpress: { isWordPress: false },
                version: null,
                theme: null,
                plugins: [],
                performance: null,
                recommendations: null,
                duration: null
            };

            // Fetch main page content
            console.log('📥 Fetching main page content...');
            const mainPageResponse = await this.httpClient.fetchPage(normalizedUrl);

            if (!mainPageResponse) {
                throw new Error(ERRORS.FETCH_FAILED);
            }

            // Check for HTTP errors that indicate the site is blocking us
            if (mainPageResponse.status === 403) {
                throw new Error(ERRORS.ACCESS_DENIED);
            }
            if (mainPageResponse.status === 503) {
                throw new Error(ERRORS.SITE_UNAVAILABLE);
            }
            if (mainPageResponse.status === 429) {
                throw new Error(ERRORS.RATE_LIMITED);
            }
            if (mainPageResponse.status >= 500) {
                throw new Error(`Site returned server error (HTTP ${mainPageResponse.status})`);
            }

            const $ = cheerio.load(mainPageResponse.data);
            
            // Step 1: Detect WordPress
            console.log('🔍 Detecting WordPress...');
            results.wordpress = await this.wordpressDetector.detect(normalizedUrl, $, mainPageResponse.data);
            
            if (!results.wordpress.isWordPress) {
                console.log('❌ Site does not appear to be WordPress');
                results.duration = Date.now() - startTime;
                return results;
            }

            console.log(`✅ WordPress detected (${results.wordpress.confidence} confidence)`);

            // Step 2: Parallel detection of version, theme, and plugins
            const detectionTasks = [];

            if (this.options.includeVersion) {
                detectionTasks.push(
                    this.detectVersionWithProgress(normalizedUrl, $, mainPageResponse.data)
                        .then(version => { results.version = version; })
                        .catch(err => { console.error('❌ Version detection failed:', err.message); })
                );
            }

            if (this.options.includeTheme) {
                detectionTasks.push(
                    this.detectThemeWithProgress(normalizedUrl, $)
                        .then(theme => { results.theme = theme; })
                        .catch(err => { console.error('❌ Theme detection failed:', err.message); })
                );
            }

            if (this.options.includePlugins) {
                detectionTasks.push(
                    this.detectPluginsWithProgress(normalizedUrl, $, mainPageResponse.data)
                        .then(plugins => { results.plugins = plugins; })
                        .catch(err => { console.error('❌ Plugin detection failed:', err.message); })
                );
            }

            // Wait for all detection tasks to complete
            await Promise.all(detectionTasks);

            // Step 3: Performance analysis (if enabled)
            if (this.options.includePerformance && results.wordpress.isWordPress) {
                try {
                    const performance = await this.analyzePerformanceWithProgress(normalizedUrl, mainPageResponse.data);
                    results.performance = performance;
                } catch (err) {
                    console.error('❌ Performance analysis failed:', err.message);
                }
            }

            // Step 4: Plugin recommendations (if enabled)
            if (this.options.includeRecommendations && results.wordpress.isWordPress) {
                try {
                    const recommendations = await this.generateRecommendationsWithProgress(normalizedUrl, $, mainPageResponse.data, results);
                    results.recommendations = recommendations;
                } catch (err) {
                    console.error('❌ Recommendation generation failed:', err.message);
                }
            }

            results.duration = Date.now() - startTime;
            console.log(`✅ Analysis completed in ${results.duration}ms`);

            // Close shared Puppeteer browser after analysis
            await HttpClient.closeSharedBrowser();

            return results;

        } catch (error) {
            // Close shared Puppeteer browser on error too
            await HttpClient.closeSharedBrowser();
            console.error('❌ Analysis failed:', error.message);
            throw error;
        }
    }

    /**
     * Detect WordPress version with progress logging
     * @param {string} baseUrl - Base URL
     * @param {Object} $ - Cheerio instance  
     * @param {string} html - HTML content
     * @returns {Object} Version detection result
     */
    async detectVersionWithProgress(baseUrl, $, html) {
        console.log('🔖 Detecting WordPress version...');
        const version = await this.versionDetector.detectBestVersion(baseUrl, $, html);
        
        if (version.version) {
            console.log(`✅ Version detected: ${version.version} (${version.method})`);
        } else {
            console.log('❌ Could not detect WordPress version');
        }
        
        return version;
    }

    /**
     * Detect theme with progress logging
     * @param {string} baseUrl - Base URL
     * @param {Object} $ - Cheerio instance
     * @returns {Object} Theme detection result
     */
    async detectThemeWithProgress(baseUrl, $) {
        console.log('🎨 Detecting active theme...');
        const theme = await this.themeDetector.detect(baseUrl, $);
        
        if (theme.name) {
            console.log(`✅ Theme detected: ${theme.displayName || theme.name}`);
        } else {
            console.log('❌ Could not detect active theme');
        }
        
        return theme;
    }

    /**
     * Detect plugins with progress logging
     * @param {string} baseUrl - Base URL
     * @param {Object} $ - Cheerio instance
     * @param {string} html - HTML content
     * @returns {Array} Plugin detection results
     */
    async detectPluginsWithProgress(baseUrl, $, html) {
        console.log('🔌 Detecting plugins...');
        const plugins = await this.pluginDetector.detect(baseUrl, $, html);
        
        console.log(`✅ Plugins detected: ${plugins.length}`);
        
        if (plugins.length > 0) {
            const outdated = plugins.filter(p => p.isOutdated === true).length;
            if (outdated > 0) {
                console.log(`⚠️  ${outdated} outdated plugin(s) found`);
            }
        }
        
        return plugins;
    }

    /**
     * Analyze performance with progress logging
     * @param {string} baseUrl - Base URL
     * @param {string} html - HTML content
     * @returns {Object} Performance analysis results
     */
    async analyzePerformanceWithProgress(baseUrl, html) {
        console.log('⚡ Analyzing plugin performance impact...');
        const performanceAnalyzer = new PerformanceAnalyzer(baseUrl);
        const performance = await performanceAnalyzer.analyze();
        
        if (performance) {
            const pluginCount = Object.keys(performance.plugin_performance).length;
            const recommendations = performance.recommendations.length;
            console.log(`✅ Performance analysis complete: ${pluginCount} plugins analyzed, ${recommendations} recommendations`);
        } else {
            console.log('❌ Performance analysis failed');
        }
        
        return performance;
    }

    /**
     * Generate plugin recommendations with progress logging
     * @param {string} baseUrl - Base URL
     * @param {Object} $ - Cheerio instance
     * @param {string} html - HTML content
     * @param {Object} siteData - Current site analysis data
     * @returns {Object} Plugin recommendations
     */
    async generateRecommendationsWithProgress(baseUrl, $, html, siteData) {
        console.log('🎯 Generating plugin recommendations...');
        
        try {
            const recommendations = await this.recommendationEngine.generateRecommendations(
                baseUrl, 
                $, 
                html, 
                siteData, 
                siteData.performance
            );
            
            if (recommendations && recommendations.summary) {
                console.log(`✅ Generated ${recommendations.summary.total_recommendations} recommendations`);
                console.log(`📊 Priority breakdown: ${recommendations.summary.priority_breakdown.high} high, ${recommendations.summary.priority_breakdown.medium} medium, ${recommendations.summary.priority_breakdown.low} low`);
            } else {
                console.log('❌ Recommendation generation failed');
            }
            
            return recommendations;
        } catch (error) {
            console.error('❌ Recommendation generation failed:', error.message);
            return null;
        }
    }

    /**
     * Generate console report
     * @param {Object} results - Analysis results
     * @returns {string} Formatted console report
     */
    generateReport(results) {
        return ConsoleReporter.generate(results);
    }

    /**
     * Generate JSON report
     * @param {Object} results - Analysis results
     * @param {Object} options - Report options
     * @returns {Object} Structured JSON report
     */
    generateJsonReport(results, options = {}) {
        return JsonReporter.generate(results, options);
    }

    /**
     * Generate HTML report
     * @param {Object} results - Analysis results
     * @param {Object} options - Report options
     * @returns {string} Complete HTML document
     */
    generateHtmlReport(results, options = {}) {
        return HtmlReporter.generate(results, options);
    }

    /**
     * Generate PDF report
     * @param {Object} results - Analysis results
     * @param {Object} options - PDF generation options
     * @returns {Promise<Buffer>} PDF buffer
     */
    async generatePdfReport(results, options = {}) {
        return await PdfReporter.generate(results, options);
    }

    /**
     * Generate PDF report with custom filename
     * @param {Object} results - Analysis results
     * @param {string} filename - Custom filename
     * @param {Object} options - PDF generation options
     * @returns {Promise<Object>} Object with PDF buffer and metadata
     */
    async generatePdfReportWithFilename(results, filename, options = {}) {
        return await PdfReporter.generateWithFilename(results, filename, options);
    }

    /**
     * Generate print-optimized PDF report
     * @param {Object} results - Analysis results
     * @param {Object} options - PDF generation options
     * @returns {Promise<Buffer>} PDF buffer
     */
    async generatePrintOptimizedPdfReport(results, options = {}) {
        return await PdfReporter.generatePrintOptimized(results, options);
    }

    /**
     * Generate landscape PDF report
     * @param {Object} results - Analysis results
     * @param {Object} options - PDF generation options
     * @returns {Promise<Buffer>} PDF buffer
     */
    async generateLandscapePdfReport(results, options = {}) {
        return await PdfReporter.generateLandscape(results, options);
    }

    /**
     * Generate compact summary
     * @param {Object} results - Analysis results
     * @returns {string} Compact summary
     */
    generateSummary(results) {
        return ConsoleReporter.generateCompactSummary(results);
    }

    /**
     * Analyze multiple sites concurrently
     * @param {Array} urls - Array of URLs to analyze
     * @param {Object} options - Analysis options
     * @returns {Array} Array of analysis results
     */
    async analyzeMultipleSites(urls, options = {}) {
        console.log(`🔍 Starting analysis of ${urls.length} sites...`);
        
        const concurrency = options.concurrency || this.options.maxConcurrentRequests;
        const results = [];
        
        // Process sites in batches to control concurrency
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);
            console.log(`📦 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(urls.length / concurrency)}`);
            
            const batchPromises = batch.map(async (url) => {
                try {
                    return await this.analyzeSite(url, options);
                } catch (error) {
                    console.error(`Failed to analyze ${url}:`, error.message);
                    return {
                        url: url,
                        error: error.message,
                        timestamp: new Date().toISOString(),
                        wordpress: { isWordPress: false }
                    };
                }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(result => 
                result.status === 'fulfilled' ? result.value : result.reason
            ));
            
            // Add delay between batches to be respectful
            if (i + concurrency < urls.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`✅ Completed analysis of ${urls.length} sites`);
        return results;
    }

    /**
     * Quick WordPress detection without full analysis
     * @param {string} url - URL to check
     * @returns {Object} Quick detection result
     */
    async quickDetect(url) {
        try {
            const normalizedUrl = UrlHelper.normalizeUrl(url);
            const response = await this.httpClient.fetchPage(normalizedUrl);
            
            if (!response) {
                return { isWordPress: false, error: 'Failed to fetch page' };
            }

            const $ = cheerio.load(response.data);
            const detection = this.wordpressDetector.detect($, response.data);
            
            return {
                url: normalizedUrl,
                isWordPress: detection.isWordPress,
                confidence: detection.confidence,
                score: detection.score
            };
            
        } catch (error) {
            return {
                url: url,
                isWordPress: false,
                error: error.message
            };
        }
    }

    /**
     * Get analyzer statistics and capabilities
     * @returns {Object} Analyzer information
     */
    getInfo() {
        return {
            name: 'WordPress Site Analyzer',
            version: '2.0.0',
            capabilities: {
                wordpressDetection: true,
                versionDetection: true,
                themeDetection: true,
                pluginDetection: true,
                securityAnalysis: true,
                performanceInsights: true,
                multiSiteAnalysis: true,
                concurrentProcessing: true
            },
            detectionMethods: {
                wordpress: ['meta_generator', 'path_indicators', 'css_classes', 'script_tags'],
                version: ['meta_generator', 'readme_html', 'script_version', 'css_version', 'opml_file', 'rss_feed'],
                theme: ['stylesheet_link', 'body_class', 'asset_path', 'template_hints'],
                plugins: ['asset_paths', 'html_comments', 'content_indicators', 'css_selectors', 'javascript_objects']
            },
            supportedReports: ['console', 'json', 'summary'],
            configuration: this.options
        };
    }
}

module.exports = WordPressAnalyzer;
