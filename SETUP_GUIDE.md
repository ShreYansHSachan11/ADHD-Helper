# Focus Productivity Extension - Developer Setup Guide

## Quick Start

### Prerequisites
- Chrome 88+ or Chromium-based browser
- Node.js 16+ (for development and testing)
- Git (for version control)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/focus-productivity-extension.git
   cd focus-productivity-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Load extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

### Development Workflow
1. Make changes to source files
2. Reload extension in `chrome://extensions/`
3. Test changes in browser
4. Run tests: `npm test`
5. Build for production: `npm run build`

## API Configuration for Development

### Google Gemini AI API
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create `.env` file in project root:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Or configure through extension popup during testing

### Google Calendar API
1. Create project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Calendar API
3. Create API key and OAuth 2.0 credentials
4. Configure in extension popup for testing

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Performance tests
npm run test:performance
```

### Test Coverage
```bash
npm run test:coverage
```

## Building for Production

### Create Distribution Package
```bash
npm run build
```

This creates a `dist/` folder with:
- Minified JavaScript files
- Optimized CSS
- Compressed assets
- Production manifest.json

### Package for Chrome Web Store
```bash
npm run package
```

Creates `extension.zip` ready for Chrome Web Store upload.

## Project Structure

```
focus-productivity-extension/
├── manifest.json              # Extension manifest
├── background.js             # Service worker
├── popup/                    # Main popup interface
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   └── components/           # UI components
├── services/                 # Core services
│   ├── audio-manager.js
│   ├── calendar-service.js
│   ├── gemini-service.js
│   ├── storage-manager.js
│   └── tab-tracker.js
├── external-pages/           # Standalone pages
│   ├── focus-anxiety.html
│   ├── asmr-fidget.html
│   └── ...
├── utils/                    # Utility modules
│   ├── constants.js
│   ├── helpers.js
│   ├── error-handler.js
│   └── accessibility.js
├── assets/                   # Static assets
│   ├── icons/
│   └── sounds/
└── tests/                    # Test files
    ├── unit/
    ├── integration/
    └── performance/
```

## Key Development Notes

### Manifest V3 Considerations
- Uses service workers instead of background pages
- Dynamic imports for code splitting
- Proper message passing between components
- Chrome storage API for persistence

### Performance Optimizations
- Lazy loading for heavy components
- Audio file optimization
- Efficient tab tracking
- Memory cleanup on component destruction

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

### Security Best Practices
- Content Security Policy enforcement
- Secure API key storage
- Input sanitization
- XSS prevention

## Common Development Tasks

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement feature with tests
3. Update documentation
4. Submit pull request

### Debugging
1. Open Chrome DevTools
2. Go to Extensions tab
3. Find your extension and click "Inspect views: popup"
4. Use console and debugger as normal

### Performance Monitoring
- Use Chrome DevTools Performance tab
- Monitor memory usage in Task Manager
- Run performance tests regularly
- Profile audio and animation performance

## Troubleshooting Development Issues

### Extension Not Loading
- Check manifest.json syntax
- Verify all file paths are correct
- Check browser console for errors
- Ensure all required permissions are declared

### Tests Failing
- Run `npm install` to ensure dependencies are current
- Check for Chrome version compatibility
- Verify mock setup in test files
- Clear browser data and restart

### API Integration Issues
- Verify API keys are valid and have correct permissions
- Check network connectivity
- Review API quotas and rate limits
- Test with minimal API calls first

## Contributing Guidelines

### Code Style
- Use ESLint configuration provided
- Follow existing naming conventions
- Add JSDoc comments for functions
- Maintain consistent indentation (2 spaces)

### Testing Requirements
- Write unit tests for all new functions
- Add integration tests for user workflows
- Include performance tests for heavy operations
- Maintain minimum 80% code coverage

### Documentation
- Update README.md for significant changes
- Add inline comments for complex logic
- Update user guide for new features
- Include setup instructions for new APIs

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Ensure all tests pass
5. Submit PR with clear description
6. Address review feedback
7. Merge after approval

## Release Process

### Version Management
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in manifest.json and package.json
- Tag releases in Git
- Maintain changelog

### Pre-release Checklist
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Accessibility audit complete
- [ ] Security review done
- [ ] Documentation updated
- [ ] API integrations tested
- [ ] Cross-browser compatibility verified

### Chrome Web Store Submission
1. Build production package
2. Test thoroughly in clean environment
3. Update store listing and screenshots
4. Submit for review
5. Monitor for approval/feedback

## Support and Resources

### Documentation
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### APIs
- [Google Gemini AI Documentation](https://ai.google.dev/docs)
- [Google Calendar API Reference](https://developers.google.com/calendar/api)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Extension Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse/)

---

**Happy coding!** 🚀

For questions or issues, please open an issue on GitHub or contact the development team.