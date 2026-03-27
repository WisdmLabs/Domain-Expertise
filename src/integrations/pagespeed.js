// File: ./src/integrations/pagespeed.js

const axios = require('axios');

/**
 * Lightweight Google PageSpeed Insights integration.
 * Requires an API key to avoid strict quota limits (set via env: PSI_API_KEY).
 */
class PageSpeedInsights {
    /**
     * Fetch complete PSI report for both mobile and desktop in a single call
     * @param {string} url
     * @param {string} apiKey optional
     * @param {number} maxRetries optional retry count
     * @returns {Promise<object|null>} Object with mobile and desktop data
     */
    static async fetchBoth(url, apiKey = process.env.PSI_API_KEY, maxRetries = 3) {
        console.log(`🔍 PSI fetching both mobile and desktop for ${url} (concurrent)`);
        
        // Create async tasks for both strategies with individual retry logic
        const mobileTask = this.fetchWithRetry(url, 'mobile', apiKey, maxRetries);
        const desktopTask = this.fetchWithRetry(url, 'desktop', apiKey, maxRetries);
        
        // Execute both tasks concurrently - this is the most efficient approach
        // since PSI API doesn't support multiple strategies in single request
        const [mobileResult, desktopResult] = await Promise.allSettled([mobileTask, desktopTask]);
        
        const result = {
            mobile: mobileResult.status === 'fulfilled' ? mobileResult.value : null,
            desktop: desktopResult.status === 'fulfilled' ? desktopResult.value : null
        };
        
        if (result.mobile) {
            console.log('✅ PSI mobile data fetched successfully');
        } else {
            console.warn('⚠️ PSI mobile data fetch failed:', mobileResult.reason?.message || 'Unknown error');
        }
        
        if (result.desktop) {
            console.log('✅ PSI desktop data fetched successfully');
        } else {
            console.warn('⚠️ PSI desktop data fetch failed:', desktopResult.reason?.message || 'Unknown error');
        }
        
        return result;
    }

    /**
     * Fetch PSI data with retry logic for a single strategy
     * @param {string} url
     * @param {string} strategy
     * @param {string} apiKey
     * @param {number} maxRetries
     * @returns {Promise<object|null>}
     */
    static async fetchWithRetry(url, strategy, apiKey, maxRetries) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍 PSI attempt ${attempt}/${maxRetries} for ${url} (${strategy})`);
                return await this.fetchSingle(url, strategy, apiKey, attempt - 1);
            } catch (err) {
                const isLastAttempt = attempt === maxRetries;
                const isRetryableError = this.isRetryableError(err);
                
                if (isLastAttempt || !isRetryableError) {
                    throw err; // Re-throw on last attempt or non-retryable error
                }
                
                console.warn(`⚠️ PSI attempt ${attempt} failed for ${url} (${strategy}), retrying in ${attempt * 2}s...`);
                await this.delay(attempt * 2000); // Exponential backoff
            }
        }
    }

    /**
     * Fetch complete PSI report for a URL and strategy (mobile/desktop)
     * @param {string} url
     * @param {('mobile'|'desktop')} strategy
     * @param {string} apiKey optional
     * @param {number} maxRetries optional retry count
     * @returns {Promise<object|null>}
     */
    static async fetch(url, strategy = 'mobile', apiKey = process.env.PSI_API_KEY, maxRetries = 3) {
        return await this.fetchWithRetry(url, strategy, apiKey, maxRetries);
    }


    /**
     * Single PSI fetch attempt
     * @param {string} url
     * @param {string} strategy
     * @param {string} apiKey
     * @returns {Promise<object|null>}
     */
    static async fetchSingle(url, strategy, apiKey, retryAttempt = 0) {
        try {
            // Validate and normalize URL
            const normalizedUrl = this.normalizeUrl(url);
            if (!normalizedUrl) {
                throw new Error(`Invalid URL format: ${url}`);
            }


            console.log(`🔍 PSI analyzing: ${normalizedUrl} (${strategy})`);

            const params = new URLSearchParams();
            params.set('url', normalizedUrl);
            params.set('strategy', strategy);
            if (apiKey) params.set('key', apiKey);

            // Adaptive timeout: increase timeout on retries for slow sites
            // Some sites (e.g. thetutorverse.com) take 75-80s for PSI to analyze
            const baseTimeout = 90000; // 90s base — covers most slow sites on first attempt
            const timeout = baseTimeout + retryAttempt * 20000; // 90s, 110s, 130s
            
            console.log(`⏱️ Using timeout: ${timeout}ms for ${strategy}`);

            const resp = await axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
                timeout: timeout,
                validateStatus: () => true
            });

            // Handle non-200 responses with detailed logging
            if (resp.status !== 200) {
                console.error(`❌ PSI API returned status ${resp.status} for ${url} (${strategy}):`, {
                    status: resp.status,
                    statusText: resp.statusText,
                    data: resp.data ? JSON.stringify(resp.data).substring(0, 300) : null
                });

                if (resp.status === 400) {
                    console.error(`🔑 PSI Bad Request (400) - Invalid URL or API key issue for ${url}`);
                } else if (resp.status === 403) {
                    console.error(`🔒 PSI Forbidden (403) - API key quota exceeded or invalid for ${url}`);
                } else if (resp.status === 404) {
                    console.error(`🔍 PSI Not Found (404) - Site may not be accessible for ${url}`);
                } else if (resp.status === 429) {
                    console.error(`⏳ PSI Rate Limited (429) - Too many requests, retry later for ${url}`);
                } else if (resp.status >= 500) {
                    console.error(`🖥️ PSI Server Error (${resp.status}) - Google PSI service issue for ${url}`);
                }

                // Throw on retryable status codes so fetchWithRetry can retry them
                if (resp.status === 429 || resp.status >= 500) {
                    const err = new Error(`PSI API returned ${resp.status} for ${url} (${strategy})`);
                    err.response = { status: resp.status, statusText: resp.statusText };
                    throw err;
                }

                return null;
            }

            if (!resp.data) {
                console.error(`❌ PSI returned empty data for ${url} (${strategy})`);
                return null;
            }

            const lighthouse = resp.data.lighthouseResult || {};
            const audits = lighthouse.audits || {};
            const categories = lighthouse.categories || {};
            const configSettings = lighthouse.configSettings || {};
            const environment = lighthouse.environment || {};

            // Extract comprehensive metrics
            const metrics = this.extractCoreWebVitals(audits);
            const opportunities = this.extractOpportunities(audits);
            const diagnostics = this.extractDiagnostics(audits);
            const categoriesData = this.extractCategories(categories);
            const networkAnalysis = this.extractNetworkAnalysis(audits);
            const accessibility = this.extractAccessibilityData(audits);
            const bestPractices = this.extractBestPracticesData(audits);
            const seo = this.extractSEOData(audits);

            // Build result object
            const result = {
                strategy,
                timestamp: new Date().toISOString(),
                url: lighthouse.finalUrl || url,
                userAgent: configSettings.emulatedFormFactor || 'desktop',
                throttling: configSettings.throttlingMethod || 'simulate',
                
                // Core Web Vitals and Performance
                core_web_vitals: metrics,
                performance_score: categoriesData.performance?.score || null,
                
                // Detailed analysis sections
                opportunities: opportunities,
                diagnostics: diagnostics,
                categories: categoriesData,
                network_analysis: networkAnalysis,
                accessibility: accessibility,
                best_practices: bestPractices,
                seo: seo,
                
                // Raw data for advanced analysis
                raw_audits: this.sanitizeAudits(audits),
                environment: environment,
                
                // Summary for quick reference
                summary: this.generateSummary(metrics, opportunities, categoriesData)
            };
            
            return result;
        } catch (err) {
            // Enhanced error logging for PSI failures
            const errorDetails = {
                url: url,
                strategy: strategy,
                errorType: err.code || 'UNKNOWN',
                errorMessage: err.message,
                status: err.response?.status,
                statusText: err.response?.statusText,
                responseData: err.response?.data ? JSON.stringify(err.response.data).substring(0, 200) : null,
                timeout: err.code === 'ECONNABORTED' || err.message.includes('timeout'),
                networkError: err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET',
                apiError: err.response?.status >= 400 && err.response?.status < 500,
                serverError: err.response?.status >= 500
            };

            console.error(`❌ PSI fetch failed for ${url} (${strategy}):`, {
                error: errorDetails.errorMessage,
                type: errorDetails.errorType,
                status: errorDetails.status,
                timeout: errorDetails.timeout,
                networkError: errorDetails.networkError,
                apiError: errorDetails.apiError,
                serverError: errorDetails.serverError
            });

            // Log specific error types
            if (errorDetails.timeout) {
                console.error(`⏱️ PSI timeout for ${url} - Site may be slow or unresponsive`);
            } else if (errorDetails.networkError) {
                console.error(`🌐 PSI network error for ${url} - Site may be down or unreachable`);
            } else if (errorDetails.apiError) {
                console.error(`🔑 PSI API error for ${url} - Check API key or site accessibility`);
            } else if (errorDetails.serverError) {
                console.error(`🖥️ PSI server error for ${url} - Google's PSI service may be having issues`);
            }

            return null;
        }
    }

    /**
     * Check if an error is retryable
     * @param {Error} err - Error object
     * @returns {boolean} Whether the error is retryable
     */
    static isRetryableError(err) {
        // Retry on network errors, timeouts, and 5xx server errors
        const retryableCodes = ['ECONNABORTED', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'];
        const isNetworkError = retryableCodes.includes(err.code);
        const isTimeout = err.message.includes('timeout') || err.code === 'ECONNABORTED';
        const isServerError = err.response?.status >= 500;
        const isRateLimited = err.response?.status === 429;
        
        return isNetworkError || isTimeout || isServerError || isRateLimited;
    }

    /**
     * Delay utility for retry backoff
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    /**
     * Normalize URL for PSI API
     * @param {string} url - Input URL
     * @returns {string|null} Normalized URL or null if invalid
     */
    static normalizeUrl(url) {
        try {
            // Remove trailing slash and normalize
            let normalized = url.trim();
            if (normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            
            // Ensure protocol
            if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
                normalized = 'https://' + normalized;
            }
            
            // Validate URL
            new URL(normalized);
            return normalized;
        } catch (error) {
            console.error(`❌ Invalid URL format: ${url}`, error.message);
            return null;
        }
    }

    /**
     * Extract Core Web Vitals and key performance metrics
     */
    static extractCoreWebVitals(audits) {
        return {
            // Core Web Vitals
            lcp: {
                value: audits['largest-contentful-paint']?.numericValue || null,
                score: audits['largest-contentful-paint']?.score || null,
                displayValue: audits['largest-contentful-paint']?.displayValue || null,
                status: this.getMetricStatus(audits['largest-contentful-paint']?.numericValue, [2500, 4000])
            },
            cls: {
                value: audits['cumulative-layout-shift']?.numericValue || null,
                score: audits['cumulative-layout-shift']?.score || null,
                displayValue: audits['cumulative-layout-shift']?.displayValue || null,
                status: this.getMetricStatus(audits['cumulative-layout-shift']?.numericValue, [0.1, 0.25])
            },
            inp: {
                value: audits['interactive']?.numericValue || null,
                score: audits['interactive']?.score || null,
                displayValue: audits['interactive']?.displayValue || null,
                status: this.getMetricStatus(audits['interactive']?.numericValue, [200, 500])
            },
            
            // Additional performance metrics
            fcp: {
                value: audits['first-contentful-paint']?.numericValue || null,
                score: audits['first-contentful-paint']?.score || null,
                displayValue: audits['first-contentful-paint']?.displayValue || null
            },
            tbt: {
                value: audits['total-blocking-time']?.numericValue || null,
                score: audits['total-blocking-time']?.score || null,
                displayValue: audits['total-blocking-time']?.displayValue || null
            },
            speed_index: {
                value: audits['speed-index']?.numericValue || null,
                score: audits['speed-index']?.score || null,
                displayValue: audits['speed-index']?.displayValue || null
            },
            tti: {
                value: audits['interactive']?.numericValue || null,
                score: audits['interactive']?.score || null,
                displayValue: audits['interactive']?.displayValue || null
            }
        };
    }

    /**
     * Extract optimization opportunities
     */
    static extractOpportunities(audits) {
        const opportunityAudits = [
            'unused-css-rules', 'unused-javascript', 'render-blocking-resources',
            'unminified-css', 'unminified-javascript', 'unused-css-rules',
            'efficient-animated-content', 'offscreen-images', 'uses-webp-images',
            'uses-optimized-images', 'uses-text-compression', 'uses-responsive-images',
            'modern-image-formats', 'uses-rel-preconnect', 'uses-rel-preload',
            'critical-request-chains', 'dom-size', 'duplicated-javascript',
            'legacy-javascript', 'no-document-write', 'preload-lcp-image',
            'uses-long-cache-ttl', 'total-byte-weight', 'uses-http2'
        ];

        const opportunities = {};
        
        opportunityAudits.forEach(auditId => {
            const audit = audits[auditId];
            if (audit && audit.score !== null && audit.score < 0.9) {
                opportunities[auditId] = {
                    id: auditId,
                    title: audit.title,
                    description: audit.description,
                    score: audit.score,
                    displayValue: audit.displayValue,
                    details: audit.details,
                    savings: this.calculateSavings(audit),
                    impact: this.getImpactLevel(audit.score)
                };
            }
        });

        return opportunities;
    }

    /**
     * Extract diagnostic information
     */
    static extractDiagnostics(audits) {
        return {
            long_tasks: {
                count: audits['long-tasks']?.details?.items?.length || 0,
                total_duration: audits['long-tasks']?.details?.items?.reduce((sum, task) => sum + (task.duration || 0), 0) || 0,
                details: audits['long-tasks']?.details?.items || []
            },
            render_blocking_resources: {
                count: audits['render-blocking-resources']?.details?.items?.length || 0,
                total_waste: audits['render-blocking-resources']?.details?.items?.reduce((sum, resource) => sum + (resource.wastedMs || 0), 0) || 0,
                details: audits['render-blocking-resources']?.details?.items || []
            },
            third_party_summary: {
                count: audits['third-party-summary']?.details?.items?.length || 0,
                total_waste: audits['third-party-summary']?.details?.items?.reduce((sum, item) => sum + (item.mainThreadTime || 0), 0) || 0,
                details: audits['third-party-summary']?.details?.items || []
            },
            main_thread_work: {
                total_time: audits['mainthread-work-breakdown']?.details?.items?.reduce((sum, item) => sum + (item.duration || 0), 0) || 0,
                details: audits['mainthread-work-breakdown']?.details?.items || []
            },
            dom_nodes: {
                count: audits['dom-size']?.numericValue || 0,
                score: audits['dom-size']?.score || null
            },
            network_requests: {
                count: audits['network-requests']?.details?.items?.length || 0,
                details: audits['network-requests']?.details?.items || []
            }
        };
    }

    /**
     * Extract all category scores and details
     */
    static extractCategories(categories) {
        const result = {};
        
        Object.keys(categories).forEach(categoryId => {
            const category = categories[categoryId];
            result[categoryId] = {
                id: categoryId,
                title: category.title,
                score: category.score,
                displayValue: category.displayValue,
                description: category.description,
                manualDescription: category.manualDescription,
                scoreDisplayMode: category.scoreDisplayMode
            };
        });

        return result;
    }

    /**
     * Extract network analysis data
     */
    static extractNetworkAnalysis(audits) {
        return {
            total_byte_weight: {
                value: audits['total-byte-weight']?.numericValue || 0,
                score: audits['total-byte-weight']?.score || null,
                displayValue: audits['total-byte-weight']?.displayValue || null
            },
            network_requests: {
                count: audits['network-requests']?.details?.items?.length || 0,
                details: audits['network-requests']?.details?.items || []
            },
            uses_http2: {
                score: audits['uses-http2']?.score || null,
                details: audits['uses-http2']?.details || null
            },
            uses_text_compression: {
                score: audits['uses-text-compression']?.score || null,
                details: audits['uses-text-compression']?.details || null
            },
            uses_long_cache_ttl: {
                score: audits['uses-long-cache-ttl']?.score || null,
                details: audits['uses-long-cache-ttl']?.details || null
            }
        };
    }

    /**
     * Extract accessibility data
     */
    static extractAccessibilityData(audits) {
        const accessibilityAudits = [
            'color-contrast', 'image-alt', 'label', 'link-name', 'list',
            'listitem', 'meta-refresh', 'object-alt', 'tabindex', 'td-headers',
            'th-has-data-cells', 'valid-lang', 'video-caption', 'video-description'
        ];

        const issues = {};
        accessibilityAudits.forEach(auditId => {
            const audit = audits[auditId];
            if (audit && audit.score !== null) {
                issues[auditId] = {
                    title: audit.title,
                    description: audit.description,
                    score: audit.score,
                    details: audit.details
                };
            }
        });

        return issues;
    }

    /**
     * Extract best practices data
     */
    static extractBestPracticesData(audits) {
        const bestPracticesAudits = [
            'is-on-https', 'uses-http2', 'no-document-write', 'no-vulnerable-libraries',
            'notification-on-start', 'deprecations', 'console-errors', 'user-timings',
            'geolocation-on-start', 'csp-xss', 'no-unload-listeners'
        ];

        const issues = {};
        bestPracticesAudits.forEach(auditId => {
            const audit = audits[auditId];
            if (audit && audit.score !== null) {
                issues[auditId] = {
                    title: audit.title,
                    description: audit.description,
                    score: audit.score,
                    details: audit.details
                };
            }
        });

        return issues;
    }

    /**
     * Extract SEO data
     */
    static extractSEOData(audits) {
        const seoAudits = [
            'document-title', 'meta-description', 'link-text', 'is-crawlable',
            'robots-txt', 'hreflang', 'canonical', 'font-display', 'crawlable-anchors',
            'is-on-https', 'plugins', 'viewport', 'tap-targets'
        ];

        const issues = {};
        seoAudits.forEach(auditId => {
            const audit = audits[auditId];
            if (audit && audit.score !== null) {
                issues[auditId] = {
                    title: audit.title,
                    description: audit.description,
                    score: audit.score,
                    details: audit.details
                };
            }
        });

        return issues;
    }

    /**
     * Helper methods
     */
    static getMetricStatus(value, thresholds) {
        if (value === null || value === undefined) return 'unknown';
        if (value <= thresholds[0]) return 'good';
        if (value <= thresholds[1]) return 'needs-improvement';
        return 'poor';
    }

    static calculateSavings(audit) {
        if (!audit.details || !audit.details.overallSavingsMs) return null;
        return {
            time: audit.details.overallSavingsMs,
            bytes: audit.details.overallSavingsBytes || 0
        };
    }

    static getImpactLevel(score) {
        if (score >= 0.9) return 'low';
        if (score >= 0.5) return 'medium';
        return 'high';
    }

    static sanitizeAudits(audits) {
        // Remove sensitive data and large objects for storage
        const sanitized = {};
        Object.keys(audits).forEach(key => {
            const audit = audits[key];
            sanitized[key] = {
                id: audit.id,
                title: audit.title,
                description: audit.description,
                score: audit.score,
                displayValue: audit.displayValue,
                scoreDisplayMode: audit.scoreDisplayMode
            };
        });
        return sanitized;
    }

    static generateSummary(metrics, opportunities, categories) {
        const cwvStatus = {
            lcp: metrics.lcp?.status || 'unknown',
            cls: metrics.cls?.status || 'unknown',
            inp: metrics.inp?.status || 'unknown'
        };

        const opportunityCount = Object.keys(opportunities).length;
        const highImpactOpportunities = Object.values(opportunities).filter(opp => opp.impact === 'high').length;

        return {
            overall_score: categories.performance?.score || null,
            cwv_status: cwvStatus,
            opportunities_count: opportunityCount,
            high_impact_opportunities: highImpactOpportunities,
            categories_scores: {
                performance: categories.performance?.score || null,
                accessibility: categories.accessibility?.score || null,
                best_practices: categories['best-practices']?.score || null,
                seo: categories.seo?.score || null
            }
        };
    }
}

module.exports = PageSpeedInsights;


