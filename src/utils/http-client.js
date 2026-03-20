// File: ./src/utils/http-client.js

const axios = require('axios');
const { HTTP } = require('../config/constants');

const isVercel = !!process.env.VERCEL;

// Shared Puppeteer state across all HttpClient instances
let sharedBrowser = null;
let browserLaunchPromise = null;
let stealthInitialized = false;
const botProtectedDomains = new Set();

/**
 * HTTP client utility for making web requests
 * Includes Puppeteer fallback for Cloudflare-protected sites
 * Reuses a single browser instance to avoid launching Chrome 16+ times
 */
class HttpClient {
    constructor(options = {}) {
        this.userAgent = options.userAgent || HTTP.USER_AGENT;
        this.timeout = options.timeout || HTTP.TIMEOUT;
        this.maxRedirects = options.maxRedirects || HTTP.MAX_REDIRECTS;
        this.usePuppeteerFallback = options.usePuppeteerFallback !== false;
    }

    /**
     * Get or create a shared Puppeteer browser instance
     */
    async getSharedBrowser() {
        if (sharedBrowser && sharedBrowser.connected) {
            return sharedBrowser;
        }

        // Prevent multiple simultaneous launches
        if (browserLaunchPromise) {
            return browserLaunchPromise;
        }

        browserLaunchPromise = (async () => {
            try {
                const launchArgs = [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080'
                ];

                const launchOptions = {
                    headless: 'new',
                    args: launchArgs
                };

                console.log('🌐 Launching shared Puppeteer browser...');

                if (isVercel) {
                    // On Vercel: use puppeteer-core + @sparticuz/chromium + stealth
                    const puppeteerCore = require('puppeteer-core');
                    const chromium = require('@sparticuz/chromium');
                    const { addExtra } = require('puppeteer-extra');
                    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
                    const puppeteerWithStealth = addExtra(puppeteerCore);
                    puppeteerWithStealth.use(StealthPlugin());
                    launchOptions.args = chromium.args.concat(launchArgs);
                    launchOptions.executablePath = await chromium.executablePath();
                    launchOptions.headless = chromium.headless;
                    sharedBrowser = await puppeteerWithStealth.launch(launchOptions);
                } else {
                    // Locally: use puppeteer-extra with stealth plugin
                    const puppeteer = require('puppeteer-extra');
                    if (!stealthInitialized) {
                        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
                        puppeteer.use(StealthPlugin());
                        stealthInitialized = true;
                    }
                    sharedBrowser = await puppeteer.launch(launchOptions);
                }

                sharedBrowser.on('disconnected', () => {
                    sharedBrowser = null;
                });

                return sharedBrowser;
            } finally {
                browserLaunchPromise = null;
            }
        })();

        return browserLaunchPromise;
    }

    /**
     * Close the shared browser (call when analysis is complete)
     */
    static async closeSharedBrowser() {
        if (sharedBrowser) {
            await sharedBrowser.close().catch(() => {});
            sharedBrowser = null;
        }
    }

    /**
     * Extract domain from URL
     */
    getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    }

    /**
     * Fetch using Puppeteer with stealth mode (reuses shared browser)
     */
    async fetchWithPuppeteer(url, options = {}) {
        let page = null;
        try {
            const browser = await this.getSharedBrowser();
            page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            // Wait for Cloudflare challenge to complete
            let attempts = 0;
            while (attempts < 10) {
                const title = await page.title();
                if (!title.includes('Just a moment') && !title.includes('Checking')) {
                    break;
                }
                console.log(`⏳ Waiting for Cloudflare challenge... (${attempts + 1}/10)`);
                await new Promise(r => setTimeout(r, 2000));
                attempts++;
            }

            const content = await page.content();
            const title = await page.title();

            await page.close();

            if (title.includes('Just a moment') || content.length < 5000) {
                console.warn(`❌ Cloudflare challenge not bypassed for ${url}`);
                return null;
            }

            console.log(`✅ Puppeteer: Got ${content.length} bytes from ${url}`);
            return { status: 200, data: content, method: 'puppeteer' };

        } catch (error) {
            console.warn(`❌ Puppeteer failed for ${url}:`, error.message);
            if (page) await page.close().catch(() => {});
            return null;
        }
    }

    /**
     * Fetch a page with proper headers and error handling
     * If domain is known to be bot-protected, skip axios and go straight to Puppeteer
     */
    async fetchPage(url, options = {}) {
        const domain = this.getDomain(url);
        const domainIsProtected = domain && botProtectedDomains.has(domain);

        // Skip axios entirely for known bot-protected domains
        if (!domainIsProtected) {
            try {
                const config = {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Sec-CH-UA': '"Chromium";v="131", "Not_A Brand";v="24"',
                        'Sec-CH-UA-Mobile': '?0',
                        'Sec-CH-UA-Platform': '"Windows"',
                        ...options.headers
                    },
                    timeout: options.timeout || this.timeout,
                    maxRedirects: this.maxRedirects,
                    validateStatus: function (status) {
                        return status >= 200 && status < 600;
                    },
                    ...options
                };

                const response = await axios.get(url, config);

                // If we got a bot-protection status code, try Puppeteer before returning
                if (this.usePuppeteerFallback && !options.noPuppeteerFallback &&
                    (response.status === 403 || response.status === 502 || response.status === 503)) {
                    console.log(`🛡️ Got HTTP ${response.status}, trying Puppeteer for ${url}`);
                    if (domain) botProtectedDomains.add(domain);
                    const puppeteerResult = await this.fetchWithPuppeteer(url, options);
                    if (puppeteerResult) return puppeteerResult;
                }

                return response;
            } catch (error) {
                if (this.usePuppeteerFallback && !options.noPuppeteerFallback) {
                    // Mark domain as bot-protected so future requests skip axios
                    if (domain) {
                        console.log(`🛡️ Marking ${domain} as bot-protected (will use Puppeteer directly)`);
                        botProtectedDomains.add(domain);
                    }
                    return await this.fetchWithPuppeteer(url, options);
                }
                console.warn(`Failed to fetch ${url}:`, error.message);
                return null;
            }
        }

        // Domain is known to be bot-protected — use Puppeteer directly
        if (this.usePuppeteerFallback && !options.noPuppeteerFallback) {
            return await this.fetchWithPuppeteer(url, options);
        }
        console.warn(`Skipped ${url}: bot-protected and Puppeteer fallback disabled`);
        return null;
    }

    /**
     * Fetch multiple URLs concurrently
     * @param {Array} urls - Array of URLs to fetch
     * @param {Object} options - Options for each request
     * @returns {Array} Array of responses (null for failed requests)
     */
    async fetchMultiple(urls, options = {}) {
        const promises = urls.map(url => this.fetchPage(url, options));
        const results = await Promise.allSettled(promises);
        
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.warn(`Failed to fetch ${urls[index]}:`, result.reason?.message);
                return null;
            }
        });
    }

    /**
     * Check if a URL is accessible
     * @param {string} url - URL to check
     * @returns {boolean} Whether the URL is accessible
     */
    async isAccessible(url) {
        try {
            const response = await this.fetchPage(url, { timeout: 5000 });
            return response && response.status >= 200 && response.status < 400;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clear bot-protected domain cache (useful between analyses)
     */
    static clearProtectedDomains() {
        botProtectedDomains.clear();
    }
}

module.exports = HttpClient;
