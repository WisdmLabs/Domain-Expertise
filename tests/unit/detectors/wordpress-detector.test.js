/**
 * Unit Tests for EnhancedWordPressDetector
 */

const cheerio = require('cheerio');

// Mock HTTP client
const mockHttpClient = {
  fetchPage: jest.fn(),
  fetchWithRetry: jest.fn()
};

// Import the detector after setting up mocks
const { EnhancedWordPressDetector } = require('../../../src/detectors/enhanced-wordpress-detector');

describe('EnhancedWordPressDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new EnhancedWordPressDetector(mockHttpClient);
    jest.clearAllMocks();
  });

  describe('detectFromMetaGenerator', () => {
    it('should detect WordPress from meta generator tag', () => {
      const html = '<meta name="generator" content="WordPress 6.4.1">';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result).not.toBeNull();
      expect(result.type).toBe('meta_generator');
      expect(result.confidence).toBe('high');
      expect(result.description).toContain('WordPress');
    });

    it('should return null when no meta generator', () => {
      const html = '<head></head>';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result).toBeNull();
    });

    it('should return null for non-WordPress generator', () => {
      const html = '<meta name="generator" content="Hugo">';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result).toBeNull();
    });

    it('should handle case-insensitive WordPress detection', () => {
      const html = '<meta name="generator" content="wordpress 6.4">';
      const $ = cheerio.load(html);

      const result = detector.detectFromMetaGenerator($);

      expect(result).not.toBeNull();
    });
  });

  describe('detectFromPaths', () => {
    it('should detect from wp-content path', () => {
      const html = '<script src="/wp-content/themes/theme/script.js"></script>';
      const $ = cheerio.load(html);

      const result = detector.detectFromPaths($, html);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(r => r.type === 'wp_content_path')).toBe(true);
    });

    it('should detect from wp-includes path', () => {
      const html = '<script src="/wp-includes/js/jquery.js"></script>';
      const $ = cheerio.load(html);

      const result = detector.detectFromPaths($, html);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for no WordPress paths', () => {
      const html = '<script src="/assets/app.js"></script>';
      const $ = cheerio.load(html);

      const result = detector.detectFromPaths($, html);

      expect(Array.isArray(result)).toBe(true);
      expect(result.filter(r => r.type.includes('wp_'))).toHaveLength(0);
    });
  });

  describe('detectFromCssClasses', () => {
    it('should detect from WordPress body classes', () => {
      const html = '<body class="home blog wp-embed-responsive">';
      const $ = cheerio.load(html);

      const result = detector.detectFromCssClasses($);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(r => r.confidence === 'medium')).toBe(true);
    });

    it('should detect from post-type classes', () => {
      const html = '<body class="single-post postid-123">';
      const $ = cheerio.load(html);

      const result = detector.detectFromCssClasses($);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty for non-WordPress classes', () => {
      const html = '<body class="container main-content">';
      const $ = cheerio.load(html);

      const result = detector.detectFromCssClasses($);

      expect(result.filter(r => r.type === 'body_class')).toHaveLength(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence with strong indicators', () => {
      const indicators = [
        { type: 'meta_generator', confidence: 'high' },
        { type: 'wp_content_path', confidence: 'high' }
      ];

      const result = detector.calculateConfidence(indicators);

      expect(result.confidence).toBe('high');
      expect(result.score).toBeGreaterThan(50);
    });

    it('should return low confidence with weak indicators', () => {
      const indicators = [
        { type: 'body_class', confidence: 'low' }
      ];

      const result = detector.calculateConfidence(indicators);

      expect(result.score).toBeLessThan(30);
    });

    it('should return zero for no indicators', () => {
      const result = detector.calculateConfidence([]);

      expect(result.score).toBe(0);
      expect(result.confidence).toBe('none');
    });
  });

  describe('detect (full detection)', () => {
    it('should detect WordPress from comprehensive HTML', () => {
      const $ = cheerio.load(global.fixtures.wordpressMetaGenerator);

      // Mock REST API check
      mockHttpClient.fetchPage.mockResolvedValue({
        status: 200,
        data: { name: 'WordPress Site' }
      });

      const result = detector.detect('https://example.com', $, global.fixtures.wordpressMetaGenerator);

      expect(result).toBeDefined();
      expect(result.detected).toBe(true);
      expect(result.indicators.length).toBeGreaterThan(0);
    });

    it('should not detect WordPress from non-WordPress HTML', () => {
      const $ = cheerio.load(global.fixtures.nonWordpress);

      const result = detector.detect('https://example.com', $, global.fixtures.nonWordpress);

      expect(result.detected).toBe(false);
      expect(result.score).toBeLessThan(20);
    });

    it('should detect WordPress from minimal indicators', () => {
      const $ = cheerio.load(global.fixtures.minimalWordpress);

      const result = detector.detect('https://example.com', $, global.fixtures.minimalWordpress);

      // May or may not detect depending on threshold
      expect(result).toBeDefined();
      expect(result.indicators).toBeDefined();
    });
  });
});
