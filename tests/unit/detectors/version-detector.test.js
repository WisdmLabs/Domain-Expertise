/**
 * Unit Tests for EnhancedVersionDetector
 */

const cheerio = require('cheerio');

// Mock HTTP client
const mockHttpClient = {
  fetchPage: jest.fn(),
  fetchWithRetry: jest.fn()
};

// Import the detector
const { EnhancedVersionDetector } = require('../../../src/detectors/enhanced-version-detector');

describe('EnhancedVersionDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new EnhancedVersionDetector(mockHttpClient);
    jest.clearAllMocks();
  });

  describe('detectFromMetaGenerator', () => {
    it('should extract version from meta generator', () => {
      const html = '<meta name="generator" content="WordPress 6.4.1">';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result).not.toBeNull();
      expect(result.version).toBe('6.4.1');
      expect(result.method).toBe('meta_generator');
      expect(result.confidence).toBe('high');
    });

    it('should handle version without patch number', () => {
      const html = '<meta name="generator" content="WordPress 6.4">';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result.version).toBe('6.4');
    });

    it('should return null when no version in generator', () => {
      const html = '<meta name="generator" content="WordPress">';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result).toBeNull();
    });

    it('should return null for non-WordPress generator', () => {
      const html = '<meta name="generator" content="Hugo 0.120.4">';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result).toBeNull();
    });
  });

  describe('detectFromScripts', () => {
    it('should extract version from script ver parameter', () => {
      const html = '<script src="/wp-includes/js/jquery.min.js?ver=6.4.1"></script>';
      const $ = cheerio.load(html);

      const result = detector.detectFromScripts($);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle multiple scripts with different versions', () => {
      const html = `
        <script src="/wp-includes/js/a.js?ver=6.4.1"></script>
        <script src="/wp-includes/js/b.js?ver=6.4.1"></script>
      `;
      const $ = cheerio.load(html);

      const result = detector.detectFromScripts($);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should not extract plugin versions as WP version', () => {
      const html = '<script src="/wp-content/plugins/cf7/js/script.js?ver=5.8.4"></script>';
      const $ = cheerio.load(html);

      const result = detector.detectFromScripts($);

      // Should not return plugin version as WP version
      const wpVersions = result.filter(r => !r.isPlugin);
      expect(wpVersions.every(v => v.version !== '5.8.4')).toBe(true);
    });
  });

  describe('validateVersion', () => {
    it('should accept valid WordPress versions', () => {
      expect(detector.validateVersion('6.4.1')).toBe(true);
      expect(detector.validateVersion('6.4')).toBe(true);
      expect(detector.validateVersion('5.9.5')).toBe(true);
      expect(detector.validateVersion('4.0')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(detector.validateVersion('abc')).toBe(false);
      expect(detector.validateVersion('')).toBe(false);
      expect(detector.validateVersion(null)).toBe(false);
      expect(detector.validateVersion(undefined)).toBe(false);
    });

    it('should reject unrealistic WordPress versions', () => {
      expect(detector.validateVersion('100.0.0')).toBe(false);
      expect(detector.validateVersion('0.0.1')).toBe(false);
    });

    it('should reject plugin-like versions', () => {
      expect(detector.validateVersion('5.8.4.1')).toBe(false);
      expect(detector.validateVersion('21.5')).toBe(false); // Too high for WP
    });
  });

  describe('detectFromReadme', () => {
    it('should extract version from readme.html', async () => {
      mockHttpClient.fetchPage.mockResolvedValue({
        status: 200,
        data: '<html><body>Version 6.4.1</body></html>'
      });

      const result = await detector.detectFromReadme('https://example.com');

      expect(mockHttpClient.fetchPage).toHaveBeenCalledWith(
        expect.stringContaining('readme.html'),
        expect.any(Object)
      );
    });

    it('should handle readme not found', async () => {
      mockHttpClient.fetchPage.mockResolvedValue({
        status: 404
      });

      const result = await detector.detectFromReadme('https://example.com');

      expect(result).toBeNull();
    });

    it('should handle network error gracefully', async () => {
      mockHttpClient.fetchPage.mockRejectedValue(new Error('Network error'));

      const result = await detector.detectFromReadme('https://example.com');

      expect(result).toBeNull();
    });
  });

  describe('detectBestVersion', () => {
    it('should prefer high confidence methods', async () => {
      const html = `
        <meta name="generator" content="WordPress 6.4.1">
        <script src="/wp-includes/js/test.js?ver=6.4.0"></script>
      `;
      const $ = cheerio.load(html);

      const result = await detector.detectBestVersion('https://example.com', $, html);

      expect(result.version).toBe('6.4.1');
      expect(result.method).toBe('meta_generator');
    });

    it('should return null for non-WordPress site', async () => {
      const html = '<html><body>Non-WordPress</body></html>';
      const $ = cheerio.load(html);

      const result = await detector.detectBestVersion('https://example.com', $, html);

      expect(result.detected).toBe(false);
    });
  });
});
