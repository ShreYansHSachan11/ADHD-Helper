# Focus Productivity Extension

A comprehensive Chrome extension designed to enhance productivity through intelligent focus tracking, AI-powered task management, and integrated wellness features.

## 🌟 Features

### 🕒 Screen Time Monitoring
- **Smart Break Reminders**: Customizable break notifications (5-180 minutes)
- **Session Tracking**: Real-time monitoring of browsing sessions
- **Visual Indicators**: Color-coded time warnings and progress tracking
- **Manual Break Control**: Instant break triggers and timer resets

### 🎯 Focus Management
- **Focus Tab Tracking**: Monitors deviation from primary work tabs
- **Deviation Analytics**: Detailed history of focus interruptions
- **Smart Reminders**: Contextual notifications to maintain concentration
- **Session Statistics**: Comprehensive focus session metrics

### 🤖 AI-Powered Task Breakdown
- **Intelligent Analysis**: Google Gemini AI integration for task decomposition
- **Actionable Steps**: Converts complex tasks into manageable subtasks
- **Fallback Support**: Generic breakdowns when AI is unavailable
- **Task History**: Local storage of previous task breakdowns

### 📅 Calendar Integration
- **Automated Reminders**: Priority-based Google Calendar event creation
- **Smart Scheduling**: 
  - High Priority: 4 reminders (1 week, 3 days, 1 day, 2 hours before)
  - Medium Priority: 3 reminders (3 days, 1 day, 4 hours before)
  - Low Priority: 3 reminders (1 week, 2 days, 8 hours before)
- **Manual Fallback**: Copy-paste reminder times when API unavailable

### 🧘 Wellness Tools
- **Guided Breathing Exercises**: Animated breathing guides with customizable patterns
- **White Noise Generator**: Background audio for enhanced focus
- **Focus & Anxiety Management**: External page with comprehensive techniques
- **ASMR & Fidgeting Tools**: Interactive stress relief and sensory tools

### ♿ Accessibility Features
- **WCAG 2.1 AA Compliance**: Full accessibility standard compliance
- **Keyboard Navigation**: Complete keyboard-only operation support
- **Screen Reader Support**: Comprehensive ARIA labels and live regions
- **High Contrast Mode**: Enhanced visibility for visual impairments
- **Reduced Motion Support**: Respects user motion preferences

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link pending)
2. Search for "Focus Productivity Extension"
3. Click "Add to Chrome"
4. Follow the installation prompts

### Manual Installation (Developer Mode)
1. Download the latest release from [GitHub Releases](https://github.com/your-repo/focus-productivity-extension/releases)
2. Extract the ZIP file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top-right corner)
5. Click "Load unpacked" and select the extracted folder
6. The extension icon will appear in your Chrome toolbar

## ⚙️ Setup & Configuration

### Basic Setup
1. Click the extension icon in your Chrome toolbar
2. Configure your preferred break reminder interval (default: 30 minutes)
3. Test the breathing exercise and white noise features
4. Explore the external wellness pages

### API Integration (Optional)

#### Google Gemini AI (For Task Breakdown)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. In the extension popup, navigate to the AI Task Breakdown section
4. Enter your API key when prompted
5. Test with a sample task

#### Google Calendar API (For Automated Reminders)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create API credentials (API Key + OAuth 2.0)
5. Configure in the extension's Calendar Reminders section
6. Authorize calendar access when prompted

For detailed setup instructions, see the [User Guide](USER_GUIDE.md).

## 🎮 Usage

### Quick Start
1. **Set Break Reminders**: Adjust the time limit in Screen Time section
2. **Track Focus**: Click "Set Current Tab as Focus" on your work page
3. **Create Tasks**: Enter task details and get AI-powered breakdowns
4. **Schedule Reminders**: Set priority and create calendar events
5. **Use Wellness Tools**: Access breathing exercises and white noise

### Advanced Features
- **Task History**: Review and reuse previous task breakdowns
- **Focus Analytics**: Analyze deviation patterns and improve habits
- **Custom Breathing**: Adjust inhale/exhale/hold durations
- **Audio Cycling**: Switch between different white noise sounds

## 🛠️ Development

### Prerequisites
- Node.js 16+ 
- Chrome 88+ or Chromium-based browser
- Git

### Setup
```bash
git clone https://github.com/your-repo/focus-productivity-extension.git
cd focus-productivity-extension
npm install
```

### Development Workflow
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Package for distribution
npm run package

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# Performance tests
npm run test:performance

# Cross-platform compatibility
npm run test:compatibility

# Comprehensive test suite
npm run test:comprehensive
```

For detailed development instructions, see the [Setup Guide](SETUP_GUIDE.md).

## 📁 Project Structure

```
focus-productivity-extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js             # Service worker
├── popup/                    # Main popup interface
│   ├── popup.html           # Popup HTML structure
│   ├── popup.js             # Main popup logic
│   ├── popup.css            # Popup styling
│   └── components/          # UI components
│       ├── task-manager.js  # Task management component
│       └── breathing-exercise.js # Breathing exercise component
├── services/                # Core services
│   ├── audio-manager.js     # Audio playback management
│   ├── calendar-service.js  # Google Calendar integration
│   ├── gemini-service.js    # Google Gemini AI integration
│   ├── storage-manager.js   # Chrome storage wrapper
│   └── tab-tracker.js       # Tab monitoring and tracking
├── external-pages/          # Standalone wellness pages
│   ├── focus-anxiety.html   # Focus & anxiety management
│   ├── asmr-fidget.html     # ASMR & fidgeting tools
│   └── ...
├── utils/                   # Utility modules
│   ├── constants.js         # Application constants
│   ├── helpers.js           # Helper functions
│   ├── error-handler.js     # Error handling utilities
│   └── accessibility.js     # Accessibility enhancements
├── assets/                  # Static assets
│   ├── icons/              # Extension icons
│   └── sounds/             # Audio files
└── tests/                  # Test files
    ├── unit/               # Unit tests
    ├── integration/        # Integration tests
    └── performance/        # Performance tests
```

## 🔒 Privacy & Security

### Data Storage
- **Local Only**: All personal data stored locally in browser
- **No External Transmission**: Data never sent to external servers (except API calls)
- **User Control**: Complete control over data with clear/reset options

### API Usage
- **Secure Storage**: API keys encrypted in Chrome storage
- **Minimal Data**: Only necessary task information sent to APIs
- **Direct Calls**: API requests made directly from browser (no proxy servers)

### Permissions
The extension requests minimal permissions:
- `storage`: Save settings and task history
- `tabs`: Monitor active tabs for screen time tracking  
- `notifications`: Display break and focus reminders
- `identity`: OAuth for Google Calendar (optional)
- Host permissions for API endpoints (when configured)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📋 Changelog

### Version 1.0.0 (Current)
- ✨ Initial release
- 🕒 Screen time monitoring with customizable break reminders
- 🎯 Focus tracking with deviation analytics
- 🤖 AI-powered task breakdown using Google Gemini
- 📅 Google Calendar integration for automated reminders
- 🧘 Comprehensive wellness tools (breathing, white noise, ASMR)
- ♿ Full WCAG 2.1 AA accessibility compliance
- 🔒 Privacy-focused design with local data storage

## 🐛 Known Issues

- Audio files may need manual replacement in development builds
- Some tests may fail in environments without proper Chrome API mocking
- Calendar API setup requires Google Cloud Console configuration

## 📞 Support

### Getting Help
1. Check the [User Guide](USER_GUIDE.md) for detailed instructions
2. Review [Troubleshooting](USER_GUIDE.md#troubleshooting) section
3. Search existing [GitHub Issues](https://github.com/your-repo/focus-productivity-extension/issues)
4. Create a new issue with detailed information

### Reporting Bugs
Please include:
- Chrome version and operating system
- Steps to reproduce the issue
- Expected vs actual behavior
- Console error messages (if any)
- Extension version

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent task breakdown capabilities
- **Google Calendar API** for seamless reminder integration
- **Chrome Extension APIs** for robust browser integration
- **Vitest** for comprehensive testing framework
- **Contributors** who helped improve accessibility and functionality

## 🔗 Links

- [Chrome Web Store](https://chrome.google.com/webstore) (pending)
- [GitHub Repository](https://github.com/your-repo/focus-productivity-extension)
- [User Guide](USER_GUIDE.md)
- [Developer Setup](SETUP_GUIDE.md)
- [API Documentation](docs/API.md)

---

**Made with ❤️ for productivity enthusiasts**

*Focus Productivity Extension - Enhance your productivity, one focused session at a time.*