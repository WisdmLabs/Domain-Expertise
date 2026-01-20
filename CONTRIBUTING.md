# Contributing to WordPress Site Analyzer

Thank you for your interest in contributing to WordPress Site Analyzer! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and stack traces

### Suggesting Features

1. Check existing issues for similar suggestions
2. Describe the use case
3. Explain why it would benefit users
4. Consider implementation complexity

### Code Contributions

#### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/wordpress-site-analyzer.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Making Changes

1. Follow the existing code style
2. Write meaningful commit messages
3. Add tests for new functionality
4. Update documentation as needed

#### Code Style

- Use ES6+ syntax
- Prefer async/await over callbacks
- Use meaningful variable and function names
- Add JSDoc comments for public methods
- Keep functions focused and small

```javascript
// Good
async function detectWordPressVersion(url, $) {
  const generator = this.detectFromMetaGenerator($);
  if (generator) return generator;

  const readme = await this.detectFromReadme(url);
  if (readme) return readme;

  return null;
}

// Avoid
function detect(u, d) {
  return new Promise((res, rej) => {
    // callback hell...
  });
}
```

#### Testing

Run existing tests before submitting:

```bash
npm run test-api
npm run test-pdf
npm run test-email
```

If adding new features, add corresponding tests.

#### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `style`: Formatting, missing semicolons, etc.
- `chore`: Maintenance tasks

Examples:
```
feat(detector): add Gutenberg block detection
fix(pdf): resolve timeout on large sites
docs(readme): update installation instructions
test(version): add unit tests for version detector
```

### Pull Request Process

1. Update documentation for any changed functionality
2. Ensure all tests pass
3. Update CHANGELOG.md if applicable
4. Submit PR against `main` branch
5. Request review from maintainers

#### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Follows code style
- [ ] Commits are clean
```

## Development Areas

### High Priority

- [ ] Add proper testing framework (Jest recommended)
- [ ] Increase test coverage to 80%+
- [ ] Add TypeScript type definitions
- [ ] Implement rate limiting on API

### Medium Priority

- [ ] Add caching layer (Redis)
- [ ] Improve plugin detection accuracy
- [ ] Add more page builder detection
- [ ] WebSocket support for real-time progress

### Low Priority

- [ ] Multi-language support
- [ ] Dark mode for web UI
- [ ] Export to more formats (XML, CSV)
- [ ] Browser extension

## Adding Detection Methods

### WordPress Detection

1. Add method to `EnhancedWordPressDetector`:
   ```javascript
   detectFromNewSource($, html) {
     // Your logic
     return indicator || null;
   }
   ```

2. Call in main `detect()` method

3. Add test case

### Plugin Detection

1. Add pattern to `constants.js`:
   ```javascript
   {
     name: 'plugin-slug',
     displayName: 'Plugin Name',
     patterns: ['identifiable-path'],
     selectors: ['.plugin-class'],
     variables: ['pluginJsVar']
   }
   ```

2. Test with real WordPress sites using the plugin

### Version Detection

1. Add method to `EnhancedVersionDetector`
2. Include version validation
3. Set appropriate confidence level

## Documentation

When adding features, update:

- README.md (if user-facing)
- docs/DEVELOPER.md (if API changes)
- docs/USER_GUIDE.md (if usage changes)
- JSDoc comments in code

## Questions?

- Open a GitHub issue for questions
- Tag with `question` label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
