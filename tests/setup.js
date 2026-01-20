/**
 * Jest Test Setup
 *
 * This file runs before each test suite.
 */

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Global test utilities
global.createMockHtml = (content) => {
  const cheerio = require('cheerio');
  return cheerio.load(content);
};

// WordPress HTML fixtures
global.fixtures = {
  wordpressMetaGenerator: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="generator" content="WordPress 6.4.1">
    </head>
    <body class="home blog wp-embed-responsive">
      <script src="/wp-content/themes/theme/script.js"></script>
    </body>
    </html>
  `,

  nonWordpress: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="generator" content="Hugo">
    </head>
    <body>
      <p>This is not a WordPress site.</p>
    </body>
    </html>
  `,

  wordpressWithPlugins: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="generator" content="WordPress 6.4.1">
      <link rel="stylesheet" href="/wp-content/plugins/contact-form-7/css/styles.css?ver=5.8.4">
      <link rel="stylesheet" href="/wp-content/plugins/elementor/assets/css/frontend.min.css?ver=3.17.3">
    </head>
    <body class="home blog elementor-default">
      <script src="/wp-content/plugins/yoast-seo/js/main.min.js?ver=21.5"></script>
    </body>
    </html>
  `,

  wordpressWithTheme: `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="/wp-content/themes/twentytwentythree/style.css?ver=1.3">
    </head>
    <body class="theme-twentytwentythree">
    </body>
    </html>
  `,

  minimalWordpress: `
    <!DOCTYPE html>
    <html>
    <body class="wp-embed-responsive">
      <a href="/wp-login.php">Login</a>
    </body>
    </html>
  `
};
