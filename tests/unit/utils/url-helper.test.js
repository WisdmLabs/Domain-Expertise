/**
 * Unit Tests for UrlHelper
 */

const { UrlHelper } = require('../../../src/utils/url-helper');

describe('UrlHelper', () => {
  describe('normalizeUrl', () => {
    it('should add https protocol if missing', () => {
      const result = UrlHelper.normalizeUrl('example.com');
      expect(result).toBe('https://example.com');
    });

    it('should preserve existing https protocol', () => {
      const result = UrlHelper.normalizeUrl('https://example.com');
      expect(result).toBe('https://example.com');
    });

    it('should preserve existing http protocol', () => {
      const result = UrlHelper.normalizeUrl('http://example.com');
      expect(result).toBe('http://example.com');
    });

    it('should remove trailing slash', () => {
      const result = UrlHelper.normalizeUrl('https://example.com/');
      expect(result).toBe('https://example.com');
    });

    it('should handle URLs with paths', () => {
      const result = UrlHelper.normalizeUrl('example.com/path/to/page');
      expect(result).toBe('https://example.com/path/to/page');
    });

    it('should handle URLs with query strings', () => {
      const result = UrlHelper.normalizeUrl('example.com?foo=bar');
      expect(result).toBe('https://example.com?foo=bar');
    });

    it('should handle subdomains', () => {
      const result = UrlHelper.normalizeUrl('blog.example.com');
      expect(result).toBe('https://blog.example.com');
    });

    it('should handle localhost', () => {
      const result = UrlHelper.normalizeUrl('localhost:3000');
      expect(result).toContain('localhost:3000');
    });

    it('should handle IP addresses', () => {
      const result = UrlHelper.normalizeUrl('192.168.1.1');
      expect(result).toBe('https://192.168.1.1');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from full URL', () => {
      const result = UrlHelper.extractDomain('https://www.example.com/path');
      expect(result).toBe('www.example.com');
    });

    it('should handle URL without www', () => {
      const result = UrlHelper.extractDomain('https://example.com');
      expect(result).toBe('example.com');
    });

    it('should handle subdomains', () => {
      const result = UrlHelper.extractDomain('https://blog.example.com');
      expect(result).toBe('blog.example.com');
    });

    it('should handle URLs with ports', () => {
      const result = UrlHelper.extractDomain('https://example.com:8080/path');
      expect(result).toBe('example.com:8080');
    });
  });

  describe('resolveUrl', () => {
    it('should resolve relative URL to absolute', () => {
      const result = UrlHelper.resolveUrl('https://example.com', '/path/to/file.js');
      expect(result).toBe('https://example.com/path/to/file.js');
    });

    it('should handle absolute URLs', () => {
      const result = UrlHelper.resolveUrl('https://example.com', 'https://cdn.example.com/file.js');
      expect(result).toBe('https://cdn.example.com/file.js');
    });

    it('should handle protocol-relative URLs', () => {
      const result = UrlHelper.resolveUrl('https://example.com', '//cdn.example.com/file.js');
      expect(result).toBe('https://cdn.example.com/file.js');
    });

    it('should resolve relative paths', () => {
      const result = UrlHelper.resolveUrl('https://example.com/page/', '../assets/file.js');
      expect(result).toContain('example.com');
      expect(result).toContain('file.js');
    });

    it('should handle URLs with query strings', () => {
      const result = UrlHelper.resolveUrl('https://example.com', '/file.js?ver=1.0');
      expect(result).toBe('https://example.com/file.js?ver=1.0');
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(UrlHelper.isValidUrl('https://example.com')).toBe(true);
      expect(UrlHelper.isValidUrl('http://example.com')).toBe(true);
      expect(UrlHelper.isValidUrl('https://sub.example.com/path')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(UrlHelper.isValidUrl('')).toBe(false);
      expect(UrlHelper.isValidUrl('not a url')).toBe(false);
      expect(UrlHelper.isValidUrl(null)).toBe(false);
      expect(UrlHelper.isValidUrl(undefined)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(UrlHelper.isValidUrl('javascript:alert(1)')).toBe(false);
      expect(UrlHelper.isValidUrl('file:///etc/passwd')).toBe(false);
    });
  });
});
