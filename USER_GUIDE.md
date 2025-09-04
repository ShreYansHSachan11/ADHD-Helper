# Focus Productivity Extension - User Guide

## Table of Contents
1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Features Overview](#features-overview)
4. [API Setup Instructions](#api-setup-instructions)
5. [Feature Guides](#feature-guides)
6. [Troubleshooting](#troubleshooting)
7. [Accessibility Features](#accessibility-features)
8. [Privacy & Security](#privacy--security)

## Installation

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store
2. Search for "Focus Productivity Extension"
3. Click "Add to Chrome"
4. Confirm installation when prompted

### Manual Installation (Developer Mode)
1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## Getting Started

### First Launch
1. Click the extension icon in your Chrome toolbar
2. The popup will open showing all available features
3. Start with basic features like screen time monitoring
4. Set up API integrations for advanced features (optional)

### Quick Setup Checklist
- [ ] Set your preferred break reminder time (default: 30 minutes)
- [ ] Try the breathing exercise feature
- [ ] Test white noise functionality
- [ ] Explore external wellness pages
- [ ] Set up API keys for AI and calendar features (optional)

## Features Overview

### 🕒 Screen Time Monitoring
- **Purpose**: Reminds you to take breaks during long browsing sessions
- **Default**: 30-minute break reminders
- **Customizable**: 5-180 minutes
- **Benefits**: Reduces eye strain and promotes healthy browsing habits

### 🎯 Focus Tracking
- **Purpose**: Helps maintain focus on your primary task
- **How it works**: Tracks when you deviate from your initial focus tab
- **Features**: Focus session statistics, deviation history
- **Benefits**: Improves concentration and reduces distractions

### 🤖 AI Task Breakdown
- **Purpose**: Breaks complex tasks into manageable steps
- **Powered by**: Google Gemini AI (requires API key)
- **Fallback**: Generic task breakdown when AI unavailable
- **Benefits**: Makes overwhelming tasks more approachable

### 📅 Calendar Integration
- **Purpose**: Automatically creates task reminders
- **Powered by**: Google Calendar API (requires setup)
- **Features**: Priority-based reminder scheduling
- **Benefits**: Never miss important deadlines

### 🧘 Wellness Tools
- **Breathing Exercises**: Guided breathing with visual animations
- **White Noise**: Background sounds for focus
- **Focus & Anxiety Management**: External page with techniques
- **ASMR & Fidgeting Tools**: Interactive stress relief tools

## API Setup Instructions

### Google Gemini AI Setup (For Task Breakdown)

#### Step 1: Get API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

#### Step 2: Configure in Extension
1. Open the extension popup
2. Scroll to "AI Task Breakdown" section
3. Click the settings icon (⚙️) if available, or
4. The extension will prompt for API key on first use
5. Paste your API key when prompted
6. Click "Save" or "Test Connection"

#### Step 3: Verify Setup
1. Enter a test task name and deadline
2. Click "Get AI Breakdown"
3. You should see an AI-generated task breakdown

### Google Calendar API Setup (For Reminders)

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### Step 2: Create Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. (Optional) Restrict the API key to Calendar API only

#### Step 3: Set up OAuth (For Calendar Access)
1. In "Credentials", click "Create Credentials" > "OAuth 2.0 Client IDs"
2. Configure OAuth consent screen if prompted
3. Choose "Web application" as application type
4. Add authorized redirect URIs:
   - `chrome-extension://[your-extension-id]/popup/popup.html`
5. Download the OAuth client configuration

#### Step 4: Configure in Extension
1. Open extension popup
2. Go to "Calendar Reminders" section
3. Click "Show Setup" to expand configuration
4. Enter your API key and OAuth details
5. Click "Test Connection"
6. Authorize calendar access when prompted

#### Step 5: Verify Setup
1. Create a test task with deadline and priority
2. Click "Create Calendar Reminders"
3. Check your Google Calendar for new reminder events

## Feature Guides

### Screen Time Management

#### Setting Break Reminders
1. Open extension popup
2. Find "Screen Time" section
3. Adjust "Break reminder after" value (5-180 minutes)
4. Changes save automatically

#### Taking Manual Breaks
1. Click "Take Break Now" button
2. Timer resets for current tab
3. Consider using this when switching tasks

#### Resetting Data
1. Click "Reset Data" to clear all screen time history
2. Useful for starting fresh or troubleshooting

### Focus Tracking

#### Setting Focus Tab
1. Navigate to your primary work tab
2. Open extension popup
3. Click "Set Current Tab as Focus"
4. Extension will track deviations from this tab

#### Understanding Focus Statistics
- **Session Time**: How long you've been in current focus session
- **Deviations**: Number of times you switched away from focus tab
- **Last Reminder**: When you last received a focus reminder

#### Managing Focus History
1. Click "Show History" to see recent deviations
2. Review patterns to identify common distractions
3. Use insights to improve focus habits

### Task Management

#### Creating Task Breakdowns
1. Enter task name (be specific and descriptive)
2. Set realistic deadline using date/time picker
3. Click "Get AI Breakdown"
4. Review generated steps and modify if needed

#### Managing Task History
1. Completed tasks are automatically saved
2. Access recent tasks from history section
3. Reuse or modify previous task breakdowns

#### Working with Fallback Mode
- When AI is unavailable, extension provides generic breakdown
- Steps are still useful for task organization
- Consider setting up AI integration for personalized breakdowns

### Calendar Reminders

#### Understanding Priority Levels
- **High Priority**: 4 reminders (1 week, 3 days, 1 day, 2 hours before)
- **Medium Priority**: 3 reminders (3 days, 1 day, 4 hours before)
- **Low Priority**: 3 reminders (1 week, 2 days, 8 hours before)

#### Creating Effective Reminders
1. Choose priority based on task importance and urgency
2. Set realistic deadlines with buffer time
3. Use descriptive task names for clear calendar events

#### Manual Reminder Fallback
- When calendar integration fails, extension shows manual reminder times
- Copy these to your preferred calendar application
- Use "Copy to Clipboard" for easy transfer

### Wellness Features

#### Breathing Exercises
1. Click "Breathing Exercise" button
2. Follow the animated circle and text guidance
3. Customize timing if needed (inhale/hold/exhale durations)
4. Use during stress or between tasks

#### White Noise
1. Click "White Noise" toggle to start/stop
2. Adjust volume using slider
3. Click "Next Sound" to cycle through available sounds
4. Audio continues when popup is closed

#### External Wellness Pages
- **Focus & Anxiety Management**: Techniques and strategies
- **ASMR & Fidgeting Tools**: Interactive stress relief
- Pages open in new tabs for extended use

## Troubleshooting

### Common Issues

#### Extension Not Loading
1. Refresh the page and try again
2. Check if extension is enabled in `chrome://extensions/`
3. Try disabling and re-enabling the extension
4. Restart Chrome browser

#### API Features Not Working
1. Verify API keys are correctly entered
2. Check internet connection
3. Ensure API quotas haven't been exceeded
4. Try regenerating API keys if issues persist

#### Screen Time Not Tracking
1. Ensure extension has necessary permissions
2. Check if you're on a restricted page (chrome://, etc.)
3. Try refreshing the current tab
4. Reset extension data if needed

#### Audio Not Playing
1. Check browser audio permissions
2. Ensure volume is not muted
3. Try different audio files using "Next Sound"
4. Check if other tabs are blocking audio

### Performance Issues

#### Extension Running Slowly
1. Close unnecessary browser tabs
2. Clear extension data and restart
3. Check for browser updates
4. Disable other extensions temporarily to isolate issues

#### High Memory Usage
1. Extension automatically manages memory
2. Restart browser if issues persist
3. Report persistent issues to developers

### Data and Privacy

#### Clearing Extension Data
1. Go to `chrome://extensions/`
2. Find Focus Productivity Extension
3. Click "Details" > "Extension options"
4. Use reset/clear data options

#### Backup and Restore
- Task history is stored locally in browser
- Export important tasks before clearing data
- API keys need to be re-entered after data clearing

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate between elements
- **Enter/Space**: Activate buttons and controls
- **Escape**: Close modals and dialogs
- **Arrow Keys**: Navigate lists and grids

### Screen Reader Support
- All interactive elements have proper labels
- Status updates are announced to screen readers
- Form validation errors are clearly communicated
- Skip links available for efficient navigation

### Visual Accessibility
- High contrast mode support
- Reduced motion support for sensitive users
- Scalable text and interface elements
- Clear focus indicators for keyboard users

### Customization Options
- Adjustable timing for all features
- Volume controls for audio features
- Customizable break intervals
- Flexible reminder scheduling

## Privacy & Security

### Data Storage
- All personal data stored locally in browser
- No data transmitted to external servers (except API calls)
- Task history and settings remain private
- Clear data anytime through extension settings

### API Usage
- API keys stored securely in browser storage
- Only necessary data sent to AI and calendar services
- No personal information shared beyond task details
- API calls made directly from your browser

### Permissions
Extension requests minimal permissions:
- **Storage**: Save settings and task history
- **Tabs**: Monitor active tab for screen time tracking
- **Notifications**: Show break and focus reminders
- **Host Permissions**: Access AI and calendar APIs when configured

### Security Best Practices
- Keep API keys private and secure
- Regularly review and rotate API keys
- Only use trusted networks for API setup
- Report security concerns to developers

## Support and Feedback

### Getting Help
1. Check this user guide first
2. Review troubleshooting section
3. Check browser console for error messages
4. Contact support with specific details

### Providing Feedback
- Report bugs with steps to reproduce
- Suggest new features or improvements
- Share usage patterns and preferences
- Rate and review in Chrome Web Store

### Updates and Changelog
- Extension updates automatically through Chrome
- Check version number in `chrome://extensions/`
- Review changelog for new features and fixes
- Backup important data before major updates

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Compatibility**: Chrome 88+, Manifest V3

For additional support, visit our [GitHub repository](https://github.com/your-repo/focus-productivity-extension) or contact support through the Chrome Web Store.