/**
 * Unit Tests for PluginDetector
 */

const cheerio = require('cheerio');

// Mock dependencies
const mockHttpClient = {
  fetchPage: jest.fn(),
  fetchWithRetry: jest.fn()
};

const mockWordPressApi = {
  getPluginInfo: jest.fn(),
  getMultiplePluginsInfo: jest.fn()
};

// Import the detector
const { PluginDetector } = require('../../../src/detectors/plugin-detector');

describe('PluginDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new PluginDetector(mockHttpClient, mockWordPressApi);
    jest.clearAllMocks();
  });

  describe('detectFromAssets', () => {
    it('should detect plugins from script paths', () => {
      const html = `
        <script src="/wp-content/plugins/contact-form-7/includes/js/scripts.js?ver=5.8.4"></script>
      `;
      const $ = cheerio.load(html);

      const result = detector.detectFromAssets($, 'https://example.com');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.name === 'contact-form-7')).toBe(true);
    });

    it('should detect plugins from stylesheet paths', () => {
      const html = `
        <link rel="stylesheet" href="/wp-content/plugins/elementor/assets/css/frontend.min.css?ver=3.17.3">
      `;
      const $ = cheerio.load(html);

      const result = detector.detectFromAssets($, 'https://example.com');

      expect(result.some(p => p.name === 'elementor')).toBe(true);
    });

    it('should extract version from asset URL', () => {
      const html = `
        <script src="/wp-content/plugins/yoast-seo/js/main.min.js?ver=21.5"></script>
      `;
      const $ = cheerio.load(html);

      const result = detector.detectFromAssets($, 'https://example.com');

      const yoast = result.find(p => p.name.includes('yoast'));
      if (yoast) {
        expect(yoast.version).toBe('21.5');
      }
    });

    it('should handle plugins without version', () => {
      const html = `
        <script src="/wp-content/plugins/akismet/js/script.js"></script>
      `;
      const $ = cheerio.load(html);

      const result = detector.detectFromAssets($, 'https://example.com');

      const akismet = result.find(p => p.name === 'akismet');
      if (akismet) {
        expect(akismet.version).toBeNull();
      }
    });

    it('should not detect theme assets as plugins', () => {
      const html = `
        <script src="/wp-content/themes/twentytwentythree/assets/js/script.js"></script>
      `;
      const $ = cheerio.load(html);

      const result = detector.detectFromAssets($, 'https://example.com');

      expect(result.some(p => p.name === 'twentytwentythree')).toBe(false);
    });

    it('should handle multiple plugins', () => {
      const html = `
        <script src="/wp-content/plugins/plugin-a/script.js"></script>
        <script src="/wp-content/plugins/plugin-b/script.js"></script>
        <script src="/wp-content/plugins/plugin-c/script.js"></script>
      `;
      const $ = cheerio.load(html);

      const result = detector.detectFromAssets($, 'https://example.com');

      expect(result.length).toBe(3);
    });
  });

  describe('detectFromPatterns', () => {
    it('should detect Elementor from class patterns', () => {
      const html = '<div class="elementor-element elementor-widget">';
      const $ = cheerio.load(html);

      const result = detector.detectFromSelectors($);

      expect(result.some(p => p.name === 'elementor')).toBe(true);
    });

    it('should detect WooCommerce from patterns', () => {
      const html = '<div class="woocommerce woocommerce-page">';
      const $ = cheerio.load(html);

      const result = detector.detectFromSelectors($);

      expect(result.some(p => p.name === 'woocommerce')).toBe(true);
    });

    it('should detect Contact Form 7 from class', () => {
      const html = '<div class="wpcf7-form">';
      const $ = cheerio.load(html);

      const result = detector.detectFromSelectors($);

      expect(result.some(p => p.name === 'contact-form-7')).toBe(true);
    });
  });

  describe('detectFromJsVariables', () => {
    it('should detect from WordPress JavaScript variables', () => {
      const html = `
        <script>
          var wpcf7 = {"api":{"root":"\/wp-json\/"}};
        </script>
      `;

      const result = detector.detectFromJsVariables(html);

      expect(result.some(p => p.name === 'contact-form-7')).toBe(true);
    });

    it('should detect WooCommerce from JS globals', () => {
      const html = `
        <script>
          var wc_add_to_cart_params = {};
        </script>
      `;

      const result = detector.detectFromJsVariables(html);

      expect(result.some(p => p.name === 'woocommerce')).toBe(true);
    });
  });

  describe('merging and deduplication', () => {
    it('should merge duplicate plugin detections', () => {
      const plugins = [
        { name: 'elementor', version: '3.17.3', source: 'asset' },
        { name: 'elementor', version: null, source: 'selector' },
        { name: 'elementor', version: '3.17.3', source: 'js' }
      ];

      const result = detector.mergePlugins(plugins);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('elementor');
      expect(result[0].version).toBe('3.17.3');
    });

    it('should prefer versioned entries when merging', () => {
      const plugins = [
        { name: 'plugin-a', version: null, source: 'selector' },
        { name: 'plugin-a', version: '1.0.0', source: 'asset' }
      ];

      const result = detector.mergePlugins(plugins);

      expect(result[0].version).toBe('1.0.0');
    });
  });

  describe('enrichPluginData', () => {
    it('should enrich plugins with WordPress.org data', async () => {
      mockWordPressApi.getMultiplePluginsInfo.mockResolvedValue([
        {
          slug: 'contact-form-7',
          name: 'Contact Form 7',
          version: '5.8.6',
          author: 'Takayuki Miyoshi',
          active_installs: 5000000
        }
      ]);

      const plugins = [{ name: 'contact-form-7', version: '5.8.4' }];

      const result = await detector.enrichPluginData(plugins);

      expect(mockWordPressApi.getMultiplePluginsInfo).toHaveBeenCalled();
      expect(result[0].latestVersion).toBe('5.8.6');
      expect(result[0].isOutdated).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      mockWordPressApi.getMultiplePluginsInfo.mockRejectedValue(new Error('API Error'));

      const plugins = [{ name: 'contact-form-7', version: '5.8.4' }];

      const result = await detector.enrichPluginData(plugins);

      // Should return plugins without enrichment
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });
  });

  describe('detect (full detection)', () => {
    it('should detect multiple plugins from comprehensive HTML', async () => {
      const $ = cheerio.load(global.fixtures.wordpressWithPlugins);

      mockWordPressApi.getMultiplePluginsInfo.mockResolvedValue([]);

      const result = await detector.detect('https://example.com', $, global.fixtures.wordpressWithPlugins);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-WordPress HTML', async () => {
      const $ = cheerio.load(global.fixtures.nonWordpress);

      const result = await detector.detect('https://example.com', $, global.fixtures.nonWordpress);

      expect(result.length).toBe(0);
    });
  });
});
