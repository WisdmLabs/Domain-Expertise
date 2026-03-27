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
const axios = require('axios');
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

            // Fetch main page content (skip Puppeteer on first try — if blocked,
            // we try the RSS feed first which is much faster than Puppeteer)
            console.log('📥 Fetching main page content...');
            let mainPageResponse = await this.httpClient.fetchPage(normalizedUrl, {
                noPuppeteerFallback: true
            });

            // If blocked by bot protection, try RSS feed first (fast),
            // then Puppeteer as last resort (slow, often fails on Turnstile)
            if (!mainPageResponse || mainPageResponse.status === 403 || mainPageResponse.status === 503) {
                const statusCode = mainPageResponse?.status || 'no response';
                console.log(`🛡️ Main page blocked (${statusCode}), trying RSS feed fallback...`);

                const feedResults = await this.analyzeFromFeed(normalizedUrl, startTime);
                if (feedResults) {
                    return feedResults;
                }

                // Feed didn't work either — try Wayback Machine (Internet Archive)
                console.log('📚 Feed fallback failed, trying Wayback Machine...');
                const waybackResults = await this.analyzeFromWaybackMachine(normalizedUrl, startTime);
                if (waybackResults) {
                    return waybackResults;
                }

                // Wayback Machine didn't work — try Puppeteer as last resort
                console.log('🌐 Wayback Machine fallback failed, trying Puppeteer...');
                mainPageResponse = await this.httpClient.fetchWithPuppeteer(normalizedUrl);
                if (!mainPageResponse) {
                    throw new Error(ERRORS.FETCH_FAILED);
                }
            }

            if (!mainPageResponse) {
                throw new Error(ERRORS.FETCH_FAILED);
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
     * Fallback analysis using RSS feed when main page is blocked by bot protection.
     * Fills all report sections: WordPress detection, version, theme, plugins, and
     * performance (via PageSpeed Insights API which uses Google's own crawlers).
     *
     * Edge cases handled:
     *   - /feed/ returns 403 or non-200 → returns null (caller tries Puppeteer)
     *   - Feed exists but is not WordPress → returns null
     *   - Feed has no content:encoded blocks → still detects from XML
     *   - PSI quota exceeded or fails → continues without performance data
     *   - No generator tag → version stays null
     *   - No wp-content/themes/ paths → tries stylesheet URL fetch
     *
     * @param {string} baseUrl - Base URL
     * @param {number} startTime - Analysis start timestamp
     * @returns {Object|null} Analysis results or null if feed is also inaccessible
     */
    async analyzeFromFeed(baseUrl, startTime) {
        try {
            // ── Step 1: Fetch RSS feed (direct axios, domain may be marked bot-protected) ──
            const feedUrl = baseUrl.replace(/\/$/, '') + '/feed/';
            const feedResponse = await axios.get(feedUrl, {
                headers: {
                    'User-Agent': HTTP.USER_AGENT,
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                },
                timeout: 15000,
                validateStatus: s => s >= 200 && s < 600,
            }).catch(() => null);

            if (!feedResponse || feedResponse.status !== 200 || !feedResponse.data) {
                console.log('❌ RSS feed not accessible');
                return null;
            }

            const feedXml = feedResponse.data;

            // Confirm it's a WordPress feed
            const isWordPressFeed = feedXml.includes('xmlns:wfw') ||
                feedXml.includes('wp-content') ||
                feedXml.includes('WordPress');

            if (!isWordPressFeed) {
                console.log('❌ RSS feed does not appear to be WordPress');
                return null;
            }

            console.log('✅ WordPress confirmed via RSS feed (site has bot protection)');

            // ── Initialize results ──
            const results = {
                url: baseUrl,
                timestamp: new Date().toISOString(),
                wordpress: {
                    isWordPress: true,
                    confidence: 'high',
                    score: 80,
                    indicators: ['rss_feed_format'],
                    note: 'Detected via RSS feed fallback (main page blocked by Cloudflare/bot protection)'
                },
                version: null,
                theme: null,
                plugins: [],
                performance: null,
                recommendations: null,
                duration: null,
                limited_analysis: true,
                limitation_reason: 'Site has Cloudflare/bot protection. Analysis performed using RSS feed + PageSpeed Insights.'
            };

            // ── Step 2: Extract HTML from content:encoded CDATA blocks ──
            const contentMatches = feedXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/gi) || [];
            let combinedHtml = '';
            for (const match of contentMatches) {
                combinedHtml += match
                    .replace(/<content:encoded><!\[CDATA\[/i, '')
                    .replace(/\]\]><\/content:encoded>/i, '') + '\n';
            }
            const allContent = combinedHtml + '\n' + feedXml;

            // ── Step 3: WordPress version from generator tag ──
            const generatorMatch = feedXml.match(/<generator>https?:\/\/wordpress\.org\/\?v=([\d.]+)<\/generator>/i);
            if (generatorMatch) {
                results.version = {
                    version: generatorMatch[1],
                    method: 'rss_feed_generator',
                    confidence: 'high'
                };
                console.log(`✅ Version detected from feed: ${generatorMatch[1]}`);
            } else {
                console.log('⚠️  WordPress version not in feed (may be hidden by security plugin)');
            }

            // ── Step 4: Detect plugins ──
            // Run three detection strategies in parallel, all safe for feed content
            if (this.options.includePlugins) {
                console.log('🔌 Detecting plugins from feed content...');
                try {
                    const $ = cheerio.load(combinedHtml || '<html></html>');

                    // Strategy A: Regex indicators (matches "elementor", "woocommerce", etc.)
                    const indicatorPlugins = this.pluginDetector.detectFromIndicators(allContent);

                    // Strategy B: CSS selectors (matches class="elementor-*", etc.)
                    const selectorPlugins = this.pluginDetector.detectFromSelectors($);

                    // Strategy C: wp-content/plugins/ paths from HTML only (not XML)
                    // Also extract ?ver= version numbers
                    const pluginVersionMap = this.extractPluginVersionsFromHtml(combinedHtml);
                    const pathPluginNames = [...pluginVersionMap.keys()];

                    // Merge and deduplicate
                    const { PLUGIN_INDICATORS } = require('./config/constants');
                    const seenPlugins = new Map();

                    for (const p of [...indicatorPlugins, ...selectorPlugins]) {
                        if (!seenPlugins.has(p.name)) {
                            const extractedVersion = pluginVersionMap.get(p.name);
                            seenPlugins.set(p.name, {
                                name: p.name,
                                displayName: p.displayName,
                                slug: p.name,
                                detectedVersion: extractedVersion || null,
                                version: extractedVersion || null,
                                source: p.source || p.type || 'feed_content',
                                confidence: 'medium'
                            });
                        }
                    }

                    for (const name of pathPluginNames) {
                        if (!seenPlugins.has(name)) {
                            const indicator = PLUGIN_INDICATORS.find(ind => ind.name === name);
                            const extractedVersion = pluginVersionMap.get(name);
                            seenPlugins.set(name, {
                                name: name,
                                displayName: indicator?.displayName || name,
                                slug: name,
                                detectedVersion: extractedVersion || null,
                                version: extractedVersion || null,
                                source: 'feed_path_detection',
                                confidence: 'high'
                            });
                        }
                    }

                    // Enrich with WordPress.org metadata (latest version, etc.)
                    const plugins = [...seenPlugins.values()];
                    for (const plugin of plugins) {
                        await this.pluginDetector.checkPluginVersion(plugin);
                    }
                    results.plugins = await this.pluginDetector.enrichPluginsWithMetadata(plugins);
                    console.log(`✅ Plugins detected from feed: ${results.plugins.length}`);
                } catch (err) {
                    console.error('❌ Plugin detection from feed failed:', err.message);
                }
            }

            // ── Step 5: Detect theme ──
            if (this.options.includeTheme) {
                const themeVersionMap = this.extractThemeVersionsFromHtml(allContent);
                const themeMatch = allContent.match(/wp-content\/themes\/([a-zA-Z0-9_-]+)\//);
                if (themeMatch) {
                    const themeName = themeMatch[1];
                    const themeVersion = themeVersionMap.get(themeName) || null;
                    console.log(`🎨 Theme detected from feed path: ${themeName}${themeVersion ? ` v${themeVersion}` : ''}`);
                    results.theme = {
                        name: themeName,
                        displayName: themeName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                        version: themeVersion,
                        method: 'feed_path_detection',
                        confidence: 'high'
                    };
                }
            }

            // ── Step 6: Performance via PageSpeed Insights (Google bypasses Cloudflare) ──
            if (this.options.includePerformance) {
                try {
                    console.log('⚡ Fetching PageSpeed Insights...');
                    const PageSpeed = require('./integrations/pagespeed');
                    const psiResult = await PageSpeed.fetchBoth(baseUrl);

                    if (psiResult && (psiResult.mobile || psiResult.desktop)) {
                        results.performance = {
                            main_page_timing: {},
                            plugin_performance: {},
                            usage_analysis: {},
                            optimization_opportunities: [],
                            pagespeed: {
                                mobile: psiResult.mobile || null,
                                desktop: psiResult.desktop || null
                            },
                            recommendations: []
                        };

                        const mobileScore = psiResult.mobile?.performance_score;
                        const desktopScore = psiResult.desktop?.performance_score;
                        if (mobileScore != null) console.log(`✅ PSI Mobile score: ${mobileScore}`);
                        if (desktopScore != null) console.log(`✅ PSI Desktop score: ${desktopScore}`);
                    } else {
                        console.log('⚠️  PageSpeed data unavailable (quota or network issue)');
                    }
                } catch (err) {
                    console.error('❌ PageSpeed fetch failed:', err.message);
                }
            }

            // ── Step 7: Generate recommendations ──
            if (this.options.includeRecommendations && results.plugins.length > 0) {
                try {
                    const $ = cheerio.load(combinedHtml || '<html></html>');
                    const recommendations = await this.recommendationEngine.generateRecommendations(
                        baseUrl, $, allContent, results, results.performance
                    );
                    results.recommendations = recommendations;
                } catch (err) {
                    console.error('❌ Recommendations failed:', err.message);
                }
            }

            results.duration = Date.now() - startTime;
            console.log(`✅ Feed-based analysis completed in ${results.duration}ms`);
            console.log('⚠️  Note: Limited analysis due to bot protection — plugin/theme data may be incomplete.');

            return results;

        } catch (error) {
            console.error('❌ Feed fallback failed:', error.message);
            return null;
        }
    }

    /**
     * Fallback analysis using Wayback Machine (Internet Archive) when both the main
     * page and RSS feed are blocked by Cloudflare/bot protection.
     *
     * Uses the most recent archived snapshot of the site from web.archive.org.
     * The archived HTML contains wp-content paths, theme references, and plugin
     * indicators — enough to populate all report sections.
     *
     * Edge cases handled:
     *   - No snapshot exists → returns null (caller tries Puppeteer)
     *   - Snapshot is very old (>1 year) → still uses it but adds warning
     *   - Wayback Machine is rate-limited (429) → returns null
     *   - Archived HTML has Wayback toolbar injected → stripped before parsing
     *   - Version info in Wayback URLs uses archived timestamps → extracted correctly
     *   - PSI quota exceeded → continues without performance data
     *
     * @param {string} baseUrl - Base URL
     * @param {number} startTime - Analysis start timestamp
     * @returns {Object|null} Analysis results or null if archive unavailable
     */
    async analyzeFromWaybackMachine(baseUrl, startTime) {
        try {
            // ── Fire PSI early so it runs in parallel with Wayback Machine fetch ──
            let psiPromise = null;
            if (this.options.includePerformance) {
                console.log('⚡ Starting PageSpeed Insights in background (runs parallel with archive fetch)...');
                const PageSpeed = require('./integrations/pagespeed');
                psiPromise = PageSpeed.fetchBoth(baseUrl).catch(err => {
                    console.error('❌ PageSpeed fetch failed:', err.message);
                    return null;
                });
            }

            // ── Step 1: Find the latest snapshot URL via CDX API (fast, reliable) ──
            const domain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
            console.log('📚 Checking Wayback Machine CDX API for cached snapshot...');

            // Try CDX API with retry (Wayback Machine can be slow)
            let cdxResponse = null;
            for (let attempt = 1; attempt <= 2; attempt++) {
                cdxResponse = await axios.get('https://web.archive.org/cdx/search/cdx', {
                    params: {
                        url: domain,
                        output: 'json',
                        limit: '-1',
                        fl: 'timestamp,statuscode,original'
                    },
                    timeout: 30000,
                    headers: { 'User-Agent': HTTP.USER_AGENT }
                }).catch(err => {
                    console.warn(`⚠️  CDX API attempt ${attempt} error: ${err.code || err.message}`);
                    return null;
                });

                if (cdxResponse && cdxResponse.data && cdxResponse.data.length >= 2) break;
                if (attempt < 2) {
                    console.log('⏳ Retrying CDX API...');
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (!cdxResponse || !cdxResponse.data || cdxResponse.data.length < 2) {
                console.log('❌ No Wayback Machine snapshot found');
                return null;
            }

            // CDX returns [header, ...rows] — last row is most recent
            const rows = cdxResponse.data;
            const latest = rows[rows.length - 1];
            const snapshotTimestamp = latest[0];
            const snapshotOriginalUrl = latest[2];
            const snapshotUrl = `https://web.archive.org/web/${snapshotTimestamp}/${snapshotOriginalUrl}`;

            // Extract snapshot date from timestamp (format: 20251219040451)
            let snapshotDate = null;
            let snapshotAge = null;
            if (snapshotTimestamp && snapshotTimestamp.length >= 8) {
                const y = snapshotTimestamp.slice(0, 4);
                const m = snapshotTimestamp.slice(4, 6);
                const d = snapshotTimestamp.slice(6, 8);
                snapshotDate = `${y}-${m}-${d}`;
                const snapshotTime = new Date(`${y}-${m}-${d}`);
                snapshotAge = Math.floor((Date.now() - snapshotTime.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`📅 Snapshot date: ${snapshotDate} (${snapshotAge} days ago)`);
            }

            // ── Step 2: Fetch the archived page ──
            console.log(`📥 Fetching Wayback Machine snapshot: ${snapshotUrl}`);
            const archiveResponse = await axios.get(snapshotUrl, {
                timeout: 30000,
                headers: { 'User-Agent': HTTP.USER_AGENT },
                maxRedirects: 5,
                validateStatus: s => s >= 200 && s < 400,
            }).catch(() => null);

            if (!archiveResponse || !archiveResponse.data) {
                console.log('❌ Failed to fetch Wayback Machine snapshot');
                return null;
            }

            // Strip Wayback Machine toolbar/injected content
            let html = archiveResponse.data;
            html = html.replace(/<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/gi, '');

            // Rewrite Wayback Machine URLs back to original domain
            // Wayback rewrites urls like: /web/20251219040451cs_/https://example.com/wp-content/...
            // Suffixes include: cs_ (css), js_ (js), im_ (image), if_ (iframe), etc.
            html = html.replace(/(?:https?:)?\/\/web\.archive\.org\/web\/\d+[a-z_]*\//gi, '');

            const htmlLength = html.length;
            if (htmlLength < 1000) {
                console.log(`❌ Wayback snapshot too small (${htmlLength} bytes), likely not useful`);
                return null;
            }

            console.log(`✅ Got ${htmlLength} bytes from Wayback Machine`);

            // Confirm it's a WordPress site
            const isWordPress = html.includes('wp-content') ||
                html.includes('wordpress') ||
                html.includes('wp-json') ||
                html.includes('wp-includes');

            if (!isWordPress) {
                console.log('❌ Wayback snapshot does not appear to be a WordPress site');
                return null;
            }

            console.log('✅ WordPress confirmed via Wayback Machine snapshot');

            // ── Initialize results ──
            const ageWarning = snapshotAge && snapshotAge > 365
                ? ` Warning: snapshot is ${snapshotAge} days old — data may be outdated.`
                : '';
            const results = {
                url: baseUrl,
                timestamp: new Date().toISOString(),
                wordpress: {
                    isWordPress: true,
                    confidence: 'high',
                    score: 75,
                    indicators: ['wayback_machine_archive'],
                    note: `Detected via Wayback Machine (snapshot: ${snapshotDate || 'unknown'}).${ageWarning} Main page and RSS feed blocked by Cloudflare/bot protection.`
                },
                version: null,
                theme: null,
                plugins: [],
                performance: null,
                recommendations: null,
                duration: null,
                limited_analysis: true,
                limitation_reason: `Site has strict Cloudflare/bot protection (all endpoints blocked). Analysis performed using Wayback Machine archive${snapshotDate ? ` from ${snapshotDate}` : ''} + PageSpeed Insights.`
            };

            const $ = cheerio.load(html);

            // ── Step 3: WordPress version ──
            const generatorMeta = $('meta[name="generator"]').attr('content') || '';
            const wpVersionMatch = generatorMeta.match(/WordPress\s+([\d.]+)/i);
            if (wpVersionMatch) {
                results.version = {
                    version: wpVersionMatch[1],
                    method: 'wayback_meta_generator',
                    confidence: 'medium',
                    note: `From Wayback Machine snapshot${snapshotDate ? ` (${snapshotDate})` : ''} — may not be current`
                };
                console.log(`✅ Version detected: ${wpVersionMatch[1]} (from archived meta tag)`);
            } else {
                // Try generator in RSS link or other patterns
                const generatorComment = html.match(/WordPress\s+([\d.]+)/i);
                if (generatorComment) {
                    results.version = {
                        version: generatorComment[1],
                        method: 'wayback_html_pattern',
                        confidence: 'low',
                        note: `From Wayback Machine snapshot — may not be current`
                    };
                    console.log(`✅ Version detected: ${generatorComment[1]} (from archived HTML pattern)`);
                } else {
                    console.log('⚠️  WordPress version not found in archive');
                }
            }

            // ── Step 4: Detect plugins ──
            // Extract version numbers from ?ver= query strings in HTML
            const pluginVersionMap = this.extractPluginVersionsFromHtml(html);

            if (this.options.includePlugins) {
                console.log('🔌 Detecting plugins from Wayback Machine snapshot...');
                try {
                    // Strategy A: Regex indicators
                    const indicatorPlugins = this.pluginDetector.detectFromIndicators(html);

                    // Strategy B: CSS selectors
                    const selectorPlugins = this.pluginDetector.detectFromSelectors($);

                    // Strategy C: wp-content/plugins/ paths (already in pluginVersionMap)
                    const pathPluginNames = [...pluginVersionMap.keys()];

                    // Merge and deduplicate
                    const { PLUGIN_INDICATORS } = require('./config/constants');
                    const seenPlugins = new Map();

                    for (const p of [...indicatorPlugins, ...selectorPlugins]) {
                        if (!seenPlugins.has(p.name)) {
                            const extractedVersion = pluginVersionMap.get(p.name);
                            seenPlugins.set(p.name, {
                                name: p.name,
                                displayName: p.displayName,
                                slug: p.name,
                                detectedVersion: extractedVersion || null,
                                version: extractedVersion || null,
                                source: p.source || p.type || 'wayback_content',
                                confidence: 'medium'
                            });
                        }
                    }

                    for (const name of pathPluginNames) {
                        if (!seenPlugins.has(name)) {
                            const indicator = PLUGIN_INDICATORS.find(ind => ind.name === name);
                            const extractedVersion = pluginVersionMap.get(name);
                            seenPlugins.set(name, {
                                name: name,
                                displayName: indicator?.displayName || name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                                slug: name,
                                detectedVersion: extractedVersion || null,
                                version: extractedVersion || null,
                                source: 'wayback_path_detection',
                                confidence: 'high'
                            });
                        }
                    }

                    // Enrich with WordPress.org metadata
                    const plugins = [...seenPlugins.values()];
                    for (const plugin of plugins) {
                        await this.pluginDetector.checkPluginVersion(plugin);
                    }
                    results.plugins = await this.pluginDetector.enrichPluginsWithMetadata(plugins);
                    console.log(`✅ Plugins detected from archive: ${results.plugins.length}`);
                } catch (err) {
                    console.error('❌ Plugin detection from archive failed:', err.message);
                }
            }

            // ── Step 5: Detect theme ──
            if (this.options.includeTheme) {
                const themeVersionMap = this.extractThemeVersionsFromHtml(html);
                const themeMatch = html.match(/wp-content\/themes\/([a-zA-Z0-9_-]+)\//);
                if (themeMatch) {
                    const themeName = themeMatch[1];
                    const themeVersion = themeVersionMap.get(themeName) || null;
                    console.log(`🎨 Theme detected from archive: ${themeName}${themeVersion ? ` v${themeVersion}` : ''}`);
                    results.theme = {
                        name: themeName,
                        displayName: themeName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                        version: themeVersion,
                        method: 'wayback_path_detection',
                        confidence: 'high'
                    };

                    // Check for child theme
                    const allThemes = [...new Set(
                        (html.match(/wp-content\/themes\/([a-zA-Z0-9_-]+)\//g) || [])
                            .map(p => p.match(/wp-content\/themes\/([a-zA-Z0-9_-]+)\//)[1])
                    )];
                    if (allThemes.length > 1) {
                        // If there's a child theme (contains "-child"), use the parent as parentTheme
                        const childTheme = allThemes.find(t => t.includes('-child'));
                        const parentTheme = allThemes.find(t => !t.includes('-child'));
                        if (childTheme && parentTheme) {
                            results.theme.name = childTheme;
                            results.theme.displayName = childTheme.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            results.theme.parentTheme = parentTheme;
                            console.log(`🎨 Child theme: ${childTheme}, Parent: ${parentTheme}`);
                        }
                    }
                } else {
                    console.log('⚠️  Theme not found in archive');
                }
            }

            // ── Step 6: Await PSI results (started in parallel at the top) ──
            if (psiPromise) {
                try {
                    console.log('⏳ Waiting for PageSpeed Insights results...');
                    const psiResult = await psiPromise;

                    if (psiResult && (psiResult.mobile || psiResult.desktop)) {
                        results.performance = {
                            main_page_timing: {},
                            plugin_performance: {},
                            usage_analysis: {},
                            optimization_opportunities: [],
                            pagespeed: {
                                mobile: psiResult.mobile || null,
                                desktop: psiResult.desktop || null
                            },
                            recommendations: []
                        };

                        const mobileScore = psiResult.mobile?.performance_score;
                        const desktopScore = psiResult.desktop?.performance_score;
                        if (mobileScore != null) console.log(`✅ PSI Mobile score: ${mobileScore}`);
                        if (desktopScore != null) console.log(`✅ PSI Desktop score: ${desktopScore}`);
                    } else {
                        console.log('⚠️  PageSpeed data unavailable (quota or network issue)');
                    }
                } catch (err) {
                    console.error('❌ PageSpeed fetch failed:', err.message);
                }
            }

            // ── Step 7: Generate recommendations ──
            if (this.options.includeRecommendations && results.plugins.length > 0) {
                try {
                    const recommendations = await this.recommendationEngine.generateRecommendations(
                        baseUrl, $, html, results, results.performance
                    );
                    results.recommendations = recommendations;
                } catch (err) {
                    console.error('❌ Recommendations failed:', err.message);
                }
            }

            results.duration = Date.now() - startTime;
            console.log(`✅ Wayback Machine analysis completed in ${results.duration}ms`);
            console.log('⚠️  Note: Data from Wayback Machine archive — plugin versions and theme may have changed since snapshot.');

            return results;

        } catch (error) {
            console.error('❌ Wayback Machine fallback failed:', error.message);
            return null;
        }
    }

    /**
     * Extract plugin versions from ?ver= query strings in HTML.
     * Parses patterns like: wp-content/plugins/{slug}/...?ver=X.Y.Z
     * Returns a Map of slug → best version string.
     * @param {string} html - HTML content
     * @returns {Map<string, string>} Map of plugin slug to detected version
     */
    extractPluginVersionsFromHtml(html) {
        const pluginOwnVersions = new Map();  // slug → Set (from plugin's own files)
        const pluginAllVersions = new Map();   // slug → Set (includes bundled libs)

        // Match: wp-content/plugins/{slug}/{path}?...ver={version}
        const pattern = /wp-content\/plugins\/([a-zA-Z0-9_-]+)\/([^"'\s]*)\?[^"'\s]*ver=([0-9][0-9a-z._-]*)/gi;
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const slug = match[1];
            const filePath = match[2];
            const ver = match[3];

            if (!pluginAllVersions.has(slug)) {
                pluginAllVersions.set(slug, new Set());
                pluginOwnVersions.set(slug, new Set());
            }
            pluginAllVersions.get(slug).add(ver);

            // Exclude bundled libraries (/lib/, /vendor/, /node_modules/)
            // These contain third-party versions (e.g. Swiper 8.4.5 inside Elementor 3.35.5)
            if (!/\/(lib|vendor|node_modules)\//.test(filePath)) {
                pluginOwnVersions.get(slug).add(ver);
            }
        }

        // Also catch plugins referenced without ?ver= (just the path)
        const pathPattern = /wp-content\/plugins\/([a-zA-Z0-9_-]+)\//g;
        while ((match = pathPattern.exec(html)) !== null) {
            const slug = match[1];
            if (!pluginAllVersions.has(slug)) {
                pluginAllVersions.set(slug, new Set());
                pluginOwnVersions.set(slug, new Set());
            }
        }

        // Pick version: prefer plugin's own files, fall back to all files
        const result = new Map();
        for (const [slug] of pluginAllVersions) {
            const ownVer = this.pluginDetector.getBestVersion(pluginOwnVersions.get(slug));
            const allVer = this.pluginDetector.getBestVersion(pluginAllVersions.get(slug));
            result.set(slug, ownVer || allVer);
        }
        return result;
    }

    /**
     * Extract theme versions from ?ver= query strings in HTML.
     * Parses patterns like: wp-content/themes/{name}/...?ver=X.Y.Z
     * @param {string} html - HTML content
     * @returns {Map<string, string>} Map of theme name to detected version
     */
    extractThemeVersionsFromHtml(html) {
        const themeVersions = new Map(); // name → Set of versions
        const pattern = /wp-content\/themes\/([a-zA-Z0-9_-]+)\/[^"'\s]*\?[^"'\s]*ver=([0-9][0-9a-z._-]*)/gi;
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const name = match[1];
            const ver = match[2];
            if (!themeVersions.has(name)) {
                themeVersions.set(name, new Set());
            }
            themeVersions.get(name).add(ver);
        }

        // Pick the best version for each theme
        const result = new Map();
        for (const [name, versions] of themeVersions) {
            result.set(name, this.pluginDetector.getBestVersion(versions));
        }
        return result;
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
        const performance = await performanceAnalyzer.analyze(html);
        
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
