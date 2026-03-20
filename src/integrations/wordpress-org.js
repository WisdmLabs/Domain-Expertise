// File: ./src/integrations/wordpress-org.js

const axios = require('axios');

/**
 * WordPress.org API integration for plugin metadata enrichment
 */
class WordPressOrgAPI {
    constructor() {
        this.baseUrl = 'https://api.wordpress.org/plugins/info/1.2/';
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
    }

    /**
     * Get plugin information from WordPress.org API
     * @param {string} pluginSlug - Plugin slug (e.g., 'akismet')
     * @returns {Promise<object|null>}
     */
    async getPluginInfo(pluginSlug) {
        if (!pluginSlug) return null;

        // Check cache first
        if (this.cache.has(pluginSlug)) {
            return this.cache.get(pluginSlug);
        }

        // Add to queue to avoid rate limiting
        return new Promise((resolve) => {
            this.requestQueue.push({ pluginSlug, resolve });
            this.processQueue();
        });
    }

    /**
     * Process request queue with rate limiting
     */
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) return;

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const { pluginSlug, resolve } = this.requestQueue.shift();
            
            try {
                const pluginInfo = await this.fetchPluginInfo(pluginSlug);
                this.cache.set(pluginSlug, pluginInfo);
                resolve(pluginInfo);
            } catch (error) {
                console.warn(`Failed to fetch plugin info for ${pluginSlug}:`, error.message);
                this.cache.set(pluginSlug, null);
                resolve(null);
            }

            // Rate limiting: wait 100ms between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isProcessing = false;
    }

    /**
     * Fetch plugin info from WordPress.org API
     * @param {string} pluginSlug 
     * @returns {Promise<object|null>}
     */
    async fetchPluginInfo(pluginSlug) {
        try {
            // Use the 1.0 JSON endpoint — the 1.2 endpoint returns 400 for GET requests
            const response = await axios.get(
                `https://api.wordpress.org/plugins/info/1.0/${encodeURIComponent(pluginSlug)}.json`,
                {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'WordPress Analyzer/1.0'
                    }
                }
            );

            if (response.data && !response.data.error) {
                const data = response.data;
                return {
                    slug: pluginSlug,
                    name: data.name || pluginSlug,
                    version: data.version || null,
                    rating: data.rating || 0,
                    num_ratings: data.num_ratings || 0,
                    active_installs: data.active_installs || 0,
                    last_updated: data.last_updated || null,
                    short_description: data.short_description || '',
                    homepage: data.homepage || null,
                    tags: data.tags || {},
                    requires: data.requires || null,
                    tested: data.tested || null,
                    requires_php: data.requires_php || null
                };
            }

            return null;
        } catch (error) {
            if (error.response?.status === 404) {
                // Plugin not found on WordPress.org
                return null;
            }
            throw error;
        }
    }

    /**
     * Get multiple plugins info in batch
     * @param {string[]} pluginSlugs 
     * @returns {Promise<Map>}
     */
    async getMultiplePluginsInfo(pluginSlugs) {
        const results = new Map();
        
        // Process all requests
        const promises = pluginSlugs.map(async (slug) => {
            const info = await this.getPluginInfo(slug);
            if (info) {
                results.set(slug, info);
            }
        });

        await Promise.all(promises);
        return results;
    }

    /**
     * Extract plugin slug from various plugin identifiers
     * @param {string} pluginIdentifier 
     * @returns {string|null}
     */
    static extractPluginSlug(pluginIdentifier) {
        if (!pluginIdentifier) return null;

        // Common patterns for plugin identification
        const patterns = [
            // Direct slug
            /^[a-z0-9-]+$/i,
            // Plugin folder path
            /plugins\/([^\/]+)/i,
            // Plugin file path
            /plugins\/([^\/]+)\/[^\/]+\.php$/i,
            // Plugin header
            /Plugin Name: .*?\(([^)]+)\)/i
        ];

        for (const pattern of patterns) {
            const match = pluginIdentifier.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }

        // Fallback: clean up the identifier
        return pluginIdentifier
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}

module.exports = WordPressOrgAPI;

















