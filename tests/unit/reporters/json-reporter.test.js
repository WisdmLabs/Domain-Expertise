/**
 * Unit Tests for JsonReporter
 */

const { JsonReporter } = require('../../../src/reporters/json-reporter');

describe('JsonReporter', () => {
  let reporter;
  let mockResults;

  beforeEach(() => {
    reporter = new JsonReporter();

    mockResults = {
      url: 'https://example.com',
      startTime: new Date().toISOString(),
      duration: 2500,
      wordpress: {
        isWordPress: true,
        confidence: 'high',
        score: 95,
        indicators: [
          { type: 'meta_generator', description: 'WordPress 6.4.1', confidence: 'high' }
        ]
      },
      version: {
        detected: true,
        version: '6.4.1',
        method: 'meta_generator',
        confidence: 'high'
      },
      theme: {
        detected: true,
        name: 'twentytwentythree',
        displayName: 'Twenty Twenty-Three',
        version: '1.3',
        author: 'WordPress Team'
      },
      plugins: [
        {
          name: 'contact-form-7',
          displayName: 'Contact Form 7',
          version: '5.8.4',
          latestVersion: '5.8.6',
          isOutdated: true
        },
        {
          name: 'elementor',
          displayName: 'Elementor',
          version: '3.17.3',
          latestVersion: '3.17.3',
          isOutdated: false
        }
      ],
      performance: {
        mobile: { score: 75 },
        desktop: { score: 90 }
      }
    };
  });

  describe('generate', () => {
    it('should generate valid JSON structure', () => {
      const result = reporter.generate(mockResults);

      expect(result).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.wordpress).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.theme).toBeDefined();
      expect(result.plugins).toBeDefined();
    });

    it('should include meta section with correct data', () => {
      const result = reporter.generate(mockResults);

      expect(result.meta.url).toBe('https://example.com');
      expect(result.meta.analyzedAt).toBeDefined();
      expect(result.meta.duration).toBe(2500);
      expect(result.meta.analyzer).toBeDefined();
    });

    it('should include WordPress detection data', () => {
      const result = reporter.generate(mockResults);

      expect(result.wordpress.detected).toBe(true);
      expect(result.wordpress.confidence).toBe('high');
      expect(result.wordpress.score).toBe(95);
      expect(result.wordpress.indicators).toHaveLength(1);
    });

    it('should include version data', () => {
      const result = reporter.generate(mockResults);

      expect(result.version.detected).toBe(true);
      expect(result.version.version).toBe('6.4.1');
      expect(result.version.method).toBe('meta_generator');
    });

    it('should include theme data', () => {
      const result = reporter.generate(mockResults);

      expect(result.theme.detected).toBe(true);
      expect(result.theme.name).toBe('twentytwentythree');
      expect(result.theme.version).toBe('1.3');
    });

    it('should include plugin data with statistics', () => {
      const result = reporter.generate(mockResults);

      expect(result.plugins.statistics).toBeDefined();
      expect(result.plugins.statistics.total).toBe(2);
      expect(result.plugins.statistics.outdated).toBe(1);
      expect(result.plugins.statistics.upToDate).toBe(1);
      expect(result.plugins.list).toHaveLength(2);
    });

    it('should mark outdated plugins correctly', () => {
      const result = reporter.generate(mockResults);

      const cf7 = result.plugins.list.find(p => p.name === 'contact-form-7');
      expect(cf7.isOutdated).toBe(true);

      const elementor = result.plugins.list.find(p => p.name === 'elementor');
      expect(elementor.isOutdated).toBe(false);
    });
  });

  describe('generate with options', () => {
    it('should include raw data when requested', () => {
      const result = reporter.generate(mockResults, { includeRawData: true });

      expect(result.rawData).toBeDefined();
    });

    it('should exclude performance when not present', () => {
      delete mockResults.performance;
      const result = reporter.generate(mockResults);

      expect(result.performance).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty plugins array', () => {
      mockResults.plugins = [];
      const result = reporter.generate(mockResults);

      expect(result.plugins.statistics.total).toBe(0);
      expect(result.plugins.list).toHaveLength(0);
    });

    it('should handle missing theme', () => {
      mockResults.theme = { detected: false };
      const result = reporter.generate(mockResults);

      expect(result.theme.detected).toBe(false);
    });

    it('should handle non-WordPress detection', () => {
      mockResults.wordpress = {
        isWordPress: false,
        confidence: 'high',
        score: 5
      };
      const result = reporter.generate(mockResults);

      expect(result.wordpress.detected).toBe(false);
    });

    it('should be valid JSON string when stringified', () => {
      const result = reporter.generate(mockResults);
      const jsonString = JSON.stringify(result);

      expect(() => JSON.parse(jsonString)).not.toThrow();
    });
  });
});
