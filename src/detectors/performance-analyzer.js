// File: ./src/detectors/performance-analyzer.js

/**
 * WordPress Plugin Performance Analyzer
 * Analyzes the performance impact of WordPress plugins and provides actionable insights
 */

const axios = require('axios');
const cheerio = require('cheerio');

class PerformanceAnalyzer {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.performanceData = {};
        this.session = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
    }

    /**
     * Fetch page with timing measurements
     * @param {string} url - URL to fetch
     * @returns {Object} Page content and timing data
     */
    async fetchPageWithTiming(url = null) {
        const targetUrl = url || this.baseUrl;
        const startTime = Date.now();
        
        try {
            const response = await axios.get(targetUrl, {
                headers: this.session.headers,
                timeout: 30000,
                validateStatus: () => true
            });
            
            const totalTime = (Date.now() - startTime) / 1000;
            
            const timing = {
                total_time: totalTime,
                response_time: totalTime,
                content_length: response.data.length,
                status_code: response.status
            };
            
            return { content: response.data, timing };
        } catch (error) {
            console.error(`Error fetching ${targetUrl}:`, error.message);
            return { content: null, timing: null };
        }
    }

    /**
     * Extract plugin name from URL
     * @param {string} url - Resource URL
     * @returns {string|null} Plugin name
     */
    extractPluginNameFromUrl(url) {
        const match = url.match(/\/wp-content\/plugins\/([^\/]+)\//);
        return match ? match[1] : null;
    }

    /**
     * Analyze resource file performance
     * @param {string} url - Resource URL
     * @param {string} fileType - File type (css/js)
     * @returns {Object|null} Resource performance data
     */
    async analyzeResourceFile(url, fileType) {
        if (!url.startsWith('http')) {
            url = new URL(url, this.baseUrl).href;
        }

        const filename = url.split('/').pop().split('?')[0];
        const startTime = Date.now();
        try {
            const response = await axios.head(url, {
                headers: this.session.headers,
                timeout: 10000,
                validateStatus: () => true
            });

            const loadTime = (Date.now() - startTime) / 1000;

            if (response.status === 200) {
                let size = parseInt(response.headers['content-length'] || '0');

                // If HEAD doesn't give size, try GET
                if (size === 0) {
                    try {
                        const getResponse = await axios.get(url, {
                            headers: this.session.headers,
                            timeout: 10000,
                            validateStatus: () => true
                        });
                        if (getResponse.status === 200) {
                            size = Buffer.byteLength(getResponse.data, 'utf8');
                        }
                    } catch (error) {
                        size = 0;
                    }
                }

                return {
                    url: url,
                    filename: filename,
                    size: size,
                    size_kb: Math.round(size / 1024 * 100) / 100,
                    load_time: Math.round(loadTime * 1000) / 1000,
                    type: fileType,
                    status: response.status
                };
            }
        } catch (error) {
            // Network error — fall through
        }

        // Return basic info even when request fails (bot-protected sites)
        // Resource count and blocking status are still useful without sizes
        return {
            url: url,
            filename: filename,
            size: 0,
            size_kb: 0,
            load_time: 0,
            type: fileType,
            status: 0
        };
    }

    /**
     * Analyze plugin resource performance
     * @param {string} html - Page HTML content
     * @returns {Object} Plugin performance data
     */
    async analyzeResourcePerformance(html) {
        const $ = cheerio.load(html);
        const pluginResources = new Map();
        
        // Helper function to get default plugin data
        const getDefaultPluginData = () => ({
            css_files: [],
            js_files: [],
            css_size: 0,
            js_size: 0,
            css_load_time: 0,
            js_load_time: 0,
            total_requests: 0,
            blocking_resources: 0,
            total_size: 0
        });
        
        // Analyze CSS files
        const cssPromises = [];
        $('link[rel="stylesheet"]').each((i, link) => {
            const href = $(link).attr('href');
            if (href && href.includes('/wp-content/plugins/')) {
                const pluginName = this.extractPluginNameFromUrl(href);
                if (pluginName) {
                    cssPromises.push(this.analyzeResourceFile(href, 'css').then(fileInfo => ({
                        pluginName,
                        fileInfo,
                        media: $(link).attr('media')
                    })).catch(error => {
                        console.warn(`Failed to analyze CSS file ${href}:`, error.message);
                        return { pluginName, fileInfo: null, media: $(link).attr('media') };
                    }));
                }
            }
        });
        
        // Analyze JavaScript files
        const jsPromises = [];
        $('script[src]').each((i, script) => {
            const src = $(script).attr('src');
            if (src && src.includes('/wp-content/plugins/')) {
                const pluginName = this.extractPluginNameFromUrl(src);
                if (pluginName) {
                    jsPromises.push(this.analyzeResourceFile(src, 'js').then(fileInfo => ({
                        pluginName,
                        fileInfo,
                        async: $(script).attr('async'),
                        defer: $(script).attr('defer')
                    })).catch(error => {
                        console.warn(`Failed to analyze JS file ${src}:`, error.message);
                        return { pluginName, fileInfo: null, async: $(script).attr('async'), defer: $(script).attr('defer') };
                    }));
                }
            }
        });
        
        // Wait for all resource analysis to complete
        const allResults = await Promise.allSettled([...cssPromises, ...jsPromises]);
        
        // Process CSS results
        allResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                const { pluginName, fileInfo, media, async, defer } = result.value;
                
                // Skip if fileInfo is null (failed to analyze)
                if (!fileInfo || !fileInfo.type) {
                    return;
                }
                
                if (!pluginResources.has(pluginName)) {
                    pluginResources.set(pluginName, getDefaultPluginData());
                }
                
                const pluginData = pluginResources.get(pluginName);
                
                if (fileInfo.type === 'css') {
                    pluginData.css_files.push(fileInfo);
                    pluginData.css_size += fileInfo.size || 0;
                    pluginData.css_load_time += fileInfo.load_time || 0;
                    pluginData.total_requests += 1;
                    pluginData.total_size += fileInfo.size || 0;
                    
                    // Check if it's render-blocking
                    if (!media || media === 'all') {
                        pluginData.blocking_resources += 1;
                    }
                } else if (fileInfo.type === 'js') {
                    pluginData.js_files.push(fileInfo);
                    pluginData.js_size += fileInfo.size || 0;
                    pluginData.js_load_time += fileInfo.load_time || 0;
                    pluginData.total_requests += 1;
                    pluginData.total_size += fileInfo.size || 0;
                    
                    // Check if it's render-blocking (no async/defer)
                    if (!async && !defer) {
                        pluginData.blocking_resources += 1;
                    }
                }
            }
        });
        
        return Object.fromEntries(pluginResources);
    }

    /**
     * Detect unused CSS/JS resources
     * @param {string} html - Page HTML content
     * @returns {Object} Usage analysis data
     */
    detectUnusedCssJs(html) {
        const $ = cheerio.load(html);
        const pluginUsage = new Map();
        
        const getDefaultUsageData = () => ({
            css_rules_used: 0,
            js_functions_called: 0,
            likely_unused: false,
            page_specific: false
        });
        
        // Simple heuristic: check if plugin CSS classes exist in HTML
        $('link[rel="stylesheet"]').each((i, link) => {
            try {
                const href = $(link).attr('href');
                if (href && href.includes('/wp-content/plugins/')) {
                    const pluginName = this.extractPluginNameFromUrl(href);
                    if (pluginName) {
                        if (!pluginUsage.has(pluginName)) {
                            pluginUsage.set(pluginName, getDefaultUsageData());
                        }
                        
                        // Check if plugin-related classes exist in HTML
                        const pluginClasses = this.findPluginCssUsage(html, pluginName);
                        const usageData = pluginUsage.get(pluginName);
                        usageData.css_rules_used = pluginClasses.length;
                        
                        // If no classes found, likely unused on this page
                        if (pluginClasses.length === 0) {
                            usageData.likely_unused = true;
                        }
                    }
                }
            } catch (error) {
                console.warn('Error analyzing CSS usage:', error.message);
            }
        });
        
        return Object.fromEntries(pluginUsage);
    }

    /**
     * Find plugin CSS usage in HTML
     * @param {string} html - Page HTML content
     * @param {string} pluginName - Plugin name
     * @returns {Array} Found CSS classes
     */
    findPluginCssUsage(html, pluginName) {
        const patterns = [
            pluginName,
            pluginName.replace(/-/g, '_'),
            pluginName.replace(/_/g, '-'),
            pluginName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        ];
        
        const foundClasses = new Set();
        for (const pattern of patterns) {
            const regex = new RegExp(`class="[^"]*${pattern}[^"]*"`, 'gi');
            const matches = html.match(regex) || [];
            matches.forEach(match => foundClasses.add(match));
        }
        
        return Array.from(foundClasses);
    }

    /**
     * Calculate performance score for a plugin
     * @param {Object} pluginData - Plugin performance data
     * @returns {number} Performance score (0-100, higher = worse)
     */
    calculatePerformanceScore(pluginData) {
        let score = 0;
        
        // Size penalty (larger files = higher score)
        const sizeMb = pluginData.total_size / (1024 * 1024);
        score += Math.min(sizeMb * 20, 40); // Max 40 points for size
        
        // Request count penalty
        score += Math.min(pluginData.total_requests * 5, 20); // Max 20 points for requests
        
        // Blocking resources penalty
        score += Math.min(pluginData.blocking_resources * 15, 30); // Max 30 points for blocking
        
        return Math.min(Math.floor(score), 100);
    }

    /**
     * Identify optimization opportunities
     * @param {Object} performanceData - Plugin performance data
     * @returns {Object} Optimization opportunities
     */
    identifyOptimizationOpportunities(performanceData) {
        const opportunities = {
            high_impact_plugins: [],
            unused_resources: [],
            render_blocking: [],
            large_files: [],
            unnecessary_loading: []
        };
        
        for (const [pluginName, data] of Object.entries(performanceData)) {
            // High impact plugins (score > 50)
            if (data.performance_score > 50) {
                opportunities.high_impact_plugins.push({
                    plugin: pluginName,
                    score: data.performance_score,
                    total_size_kb: Math.round(data.total_size / 1024 * 100) / 100,
                    requests: data.total_requests
                });
            }
            
            // Render-blocking resources
            if (data.blocking_resources > 0) {
                opportunities.render_blocking.push({
                    plugin: pluginName,
                    blocking_resources: data.blocking_resources,
                    css_blocking: data.css_files.filter(f => !f.media || f.media === 'all').length,
                    js_blocking: data.js_files.filter(f => !f.async && !f.defer).length
                });
            }
            
            // Large files
            if (data.total_size > 100 * 1024) { // > 100KB
                opportunities.large_files.push({
                    plugin: pluginName,
                    size_kb: Math.round(data.total_size / 1024 * 100) / 100,
                    files: data.total_requests
                });
            }
        }
        
        return opportunities;
    }

    /**
     * Generate actionable recommendations
     * @param {Object} performanceData - Performance analysis data
     * @returns {Array} Actionable recommendations
     */
    generateRecommendations(performanceData) {
        const recommendations = [];
        const opportunities = this.identifyOptimizationOpportunities(performanceData);
        
        // High impact plugins
        if (opportunities.high_impact_plugins.length > 0) {
            const worstPlugin = opportunities.high_impact_plugins[0];
            recommendations.push({
                priority: 'high',
                category: 'performance',
                title: 'Optimize High-Impact Plugin',
                description: `${worstPlugin.plugin} is significantly impacting page performance`,
                action: `Consider optimizing ${worstPlugin.plugin} or finding a lighter alternative`,
                impact: 'High - Can improve page load time by 20-40%',
                effort: 'Medium - Requires plugin configuration or replacement'
            });
        }
        
        // Render-blocking resources
        if (opportunities.render_blocking.length > 0) {
            const blockingPlugin = opportunities.render_blocking[0];
            recommendations.push({
                priority: 'medium',
                category: 'performance',
                title: 'Reduce Render-Blocking Resources',
                description: `${blockingPlugin.plugin} has ${blockingPlugin.blocking_resources} render-blocking resources`,
                action: 'Add async/defer attributes to JavaScript files and optimize CSS loading',
                impact: 'Medium - Can improve First Contentful Paint by 15-30%',
                effort: 'Low - Requires theme/plugin configuration'
            });
        }
        
        // Large files
        if (opportunities.large_files.length > 0) {
            const largePlugin = opportunities.large_files[0];
            recommendations.push({
                priority: 'medium',
                category: 'performance',
                title: 'Optimize Large Plugin Files',
                description: `${largePlugin.plugin} has ${largePlugin.size_kb}KB of resources`,
                action: 'Enable compression, minification, and consider CDN for static assets',
                impact: 'Medium - Can reduce bandwidth usage and improve load times',
                effort: 'Low - Can be automated with caching plugins'
            });
        }
        
        // General recommendations
        if (Object.keys(performanceData).length > 5) {
            recommendations.push({
                priority: 'low',
                category: 'performance',
                title: 'Consider Plugin Audit',
                description: 'Multiple plugins detected that may impact performance',
                action: 'Review and remove unnecessary plugins, consolidate functionality',
                impact: 'High - Can significantly improve overall site performance',
                effort: 'High - Requires careful testing and planning'
            });
        }
        
        return recommendations;
    }

    /**
     * Run comprehensive performance analysis
     * @returns {Object} Complete performance analysis data
     */
    async analyze(preloadedHtml = null) {
        console.log('🔍 Starting plugin performance analysis...');

        try {
            // Optional: pull Core Web Vitals via PageSpeed Insights
            let pagespeedMobile = null;
            let pagespeedDesktop = null;
            try {
                console.log('🔍 Fetching PageSpeed Insights data...');
                const PageSpeed = require('../integrations/pagespeed');

                // Fetch both mobile and desktop data in a single optimized call
                const psiResult = await PageSpeed.fetchBoth(this.baseUrl);

                if (psiResult) {
                    pagespeedMobile = psiResult.mobile;
                    pagespeedDesktop = psiResult.desktop;

                    if (pagespeedMobile) {
                        console.log('✅ PSI mobile data fetched successfully');
                    }
                    if (pagespeedDesktop) {
                        console.log('✅ PSI desktop data fetched successfully');
                    }

                    if (!pagespeedMobile && !pagespeedDesktop) {
                        console.warn('⚠️ PSI data unavailable for both mobile and desktop - continuing without Core Web Vitals');
                    }
                } else {
                    console.warn('⚠️ PSI fetch returned null - continuing without Core Web Vitals');
                }

            } catch (e) {
                console.error('❌ PSI integration failed:', e.message);
                // PSI optional; continue silently
            }
            // Step 1: Basic page analysis (use preloaded HTML if available)
            let content, timing;
            if (preloadedHtml) {
                console.log('📦 Using preloaded HTML for performance analysis');
                content = preloadedHtml;
                timing = { total_time: 0, response_time: 0, content_length: preloadedHtml.length, status_code: 200 };
            } else {
                const result = await this.fetchPageWithTiming();
                content = result.content;
                timing = result.timing;
            }
            if (!content) {
                console.warn('No content fetched for performance analysis');
                return null;
            }
            
            // Step 2: Plugin resource performance
            let performanceData = {};
            try {
                performanceData = await this.analyzeResourcePerformance(content);
            } catch (error) {
                console.warn('Error in resource performance analysis:', error.message);
                performanceData = {};
            }
            
            // Step 3: Usage analysis
            let usageAnalysis = {};
            try {
                usageAnalysis = this.detectUnusedCssJs(content);
            } catch (error) {
                console.warn('Error in usage analysis:', error.message);
                usageAnalysis = {};
            }
            
            // Step 4: Calculate performance scores
            try {
                for (const [pluginName, data] of Object.entries(performanceData)) {
                    if (data && typeof data === 'object') {
                        data.performance_score = this.calculatePerformanceScore(data);
                    }
                }
            } catch (error) {
                console.warn('Error calculating performance scores:', error.message);
            }
            
            // Step 5: Generate recommendations
            let recommendations = [];
            try {
                recommendations = this.generateRecommendations(performanceData);
            } catch (error) {
                console.warn('Error generating recommendations:', error.message);
                recommendations = [];
            }
            
            // Combine all data
            this.performanceData = {
                main_page_timing: timing || {},
                plugin_performance: performanceData || {},
                usage_analysis: usageAnalysis || {},
                optimization_opportunities: this.identifyOptimizationOpportunities(performanceData) || [],
                pagespeed: {
                    mobile: pagespeedMobile,
                    desktop: pagespeedDesktop
                },
                recommendations: recommendations || []
            };
            
            return this.performanceData;
            
        } catch (error) {
            console.error('Critical error in performance analysis:', error.message);
            return {
                main_page_timing: {},
                plugin_performance: {},
                usage_analysis: {},
                optimization_opportunities: [],
                recommendations: [],
                error: error.message
            };
        }
    }
}

module.exports = PerformanceAnalyzer;

