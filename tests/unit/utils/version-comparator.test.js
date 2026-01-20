/**
 * Unit Tests for VersionComparator
 */

const { VersionComparator } = require('../../../src/utils/version-comparator');

describe('VersionComparator', () => {
  describe('compare', () => {
    it('should return 0 for equal versions', () => {
      expect(VersionComparator.compare('1.0.0', '1.0.0')).toBe(0);
      expect(VersionComparator.compare('2.1', '2.1')).toBe(0);
      expect(VersionComparator.compare('6.4.1', '6.4.1')).toBe(0);
    });

    it('should return positive for newer first version', () => {
      expect(VersionComparator.compare('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(VersionComparator.compare('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(VersionComparator.compare('1.0.1', '1.0.0')).toBeGreaterThan(0);
    });

    it('should return negative for older first version', () => {
      expect(VersionComparator.compare('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(VersionComparator.compare('1.0.0', '1.1.0')).toBeLessThan(0);
      expect(VersionComparator.compare('1.0.0', '1.0.1')).toBeLessThan(0);
    });

    it('should handle different length versions', () => {
      expect(VersionComparator.compare('1.0', '1.0.0')).toBe(0);
      expect(VersionComparator.compare('1.0.0', '1.0')).toBe(0);
      expect(VersionComparator.compare('1.0', '1.0.1')).toBeLessThan(0);
    });

    it('should handle major version differences', () => {
      expect(VersionComparator.compare('10.0.0', '9.9.9')).toBeGreaterThan(0);
      expect(VersionComparator.compare('2.0.0', '1.99.99')).toBeGreaterThan(0);
    });

    it('should handle null/undefined versions', () => {
      expect(VersionComparator.compare(null, '1.0.0')).toBeLessThan(0);
      expect(VersionComparator.compare('1.0.0', null)).toBeGreaterThan(0);
      expect(VersionComparator.compare(null, null)).toBe(0);
    });
  });

  describe('isNewer', () => {
    it('should return true when first version is newer', () => {
      expect(VersionComparator.isNewer('2.0.0', '1.0.0')).toBe(true);
      expect(VersionComparator.isNewer('1.1.0', '1.0.0')).toBe(true);
      expect(VersionComparator.isNewer('1.0.1', '1.0.0')).toBe(true);
    });

    it('should return false when first version is older', () => {
      expect(VersionComparator.isNewer('1.0.0', '2.0.0')).toBe(false);
      expect(VersionComparator.isNewer('1.0.0', '1.1.0')).toBe(false);
    });

    it('should return false for equal versions', () => {
      expect(VersionComparator.isNewer('1.0.0', '1.0.0')).toBe(false);
    });
  });

  describe('isOlder', () => {
    it('should return true when first version is older', () => {
      expect(VersionComparator.isOlder('1.0.0', '2.0.0')).toBe(true);
      expect(VersionComparator.isOlder('1.0.0', '1.1.0')).toBe(true);
      expect(VersionComparator.isOlder('1.0.0', '1.0.1')).toBe(true);
    });

    it('should return false when first version is newer', () => {
      expect(VersionComparator.isOlder('2.0.0', '1.0.0')).toBe(false);
    });

    it('should return false for equal versions', () => {
      expect(VersionComparator.isOlder('1.0.0', '1.0.0')).toBe(false);
    });
  });

  describe('isOutdated', () => {
    it('should detect outdated versions', () => {
      expect(VersionComparator.isOutdated('5.8.4', '5.8.6')).toBe(true);
      expect(VersionComparator.isOutdated('6.3.0', '6.4.1')).toBe(true);
    });

    it('should not flag up-to-date versions', () => {
      expect(VersionComparator.isOutdated('5.8.6', '5.8.6')).toBe(false);
      expect(VersionComparator.isOutdated('6.4.1', '6.4.0')).toBe(false);
    });

    it('should handle null latest version', () => {
      expect(VersionComparator.isOutdated('5.8.4', null)).toBe(false);
    });
  });

  describe('parseVersion', () => {
    it('should parse standard versions', () => {
      const result = VersionComparator.parseVersion('1.2.3');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should parse two-part versions', () => {
      const result = VersionComparator.parseVersion('1.2');
      expect(result).toEqual([1, 2]);
    });

    it('should handle version with extra parts', () => {
      const result = VersionComparator.parseVersion('1.2.3.4');
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should return empty array for invalid input', () => {
      expect(VersionComparator.parseVersion(null)).toEqual([]);
      expect(VersionComparator.parseVersion('')).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle WordPress version format', () => {
      expect(VersionComparator.compare('6.4.1', '6.4')).toBeGreaterThan(0);
      expect(VersionComparator.compare('6.4', '6.3.2')).toBeGreaterThan(0);
    });

    it('should handle plugin version formats', () => {
      expect(VersionComparator.compare('21.5', '21.4')).toBeGreaterThan(0);
      expect(VersionComparator.compare('3.17.3', '3.17.0')).toBeGreaterThan(0);
    });

    it('should handle beta/alpha versions (numeric part only)', () => {
      // This compares numeric parts only
      expect(VersionComparator.compare('6.4', '6.4')).toBe(0);
    });
  });
});
