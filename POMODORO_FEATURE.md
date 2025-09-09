# Pomodoro Timer Feature

## Overview

The Pomodoro Timer is a comprehensive productivity feature that implements the Pomodoro Technique with persistent storage, detailed tracking, and seamless integration with the Focus Productivity Extension.

## Features

### Core Functionality

- **Work Sessions**: Default 25-minute focused work periods
- **Short Breaks**: Default 5-minute breaks between work sessions
- **Long Breaks**: Default 15-minute extended breaks after every 4 work sessions
- **Customizable Durations**: All session lengths can be adjusted in settings
- **Pause/Resume**: Sessions can be paused and resumed as needed
- **Auto-start Options**: Configurable automatic session transitions

### Visual Interface

- **Circular Progress Timer**: Visual countdown with smooth animations
- **Session Type Indicators**: Clear visual distinction between work and break sessions
- **Real-time Updates**: Live countdown display with remaining time
- **Material Design 3**: Modern, accessible UI following Google's design system
- **Responsive Layout**: Works on different screen sizes

### Persistent Storage & Tracking

- **Session History**: Tracks all completed sessions with timestamps
- **Daily Statistics**: Comprehensive stats including:
  - Work sessions completed
  - Total focus time
  - Break sessions taken
  - Completion percentage
- **Historical Data**: 7-day rolling statistics view
- **Data Persistence**: All data survives browser restarts and extension updates

### Smart Features

- **Chrome Alarms Integration**: Uses Chrome's alarm API for reliable notifications even when popup is closed
- **Background Notifications**: Desktop notifications for session completion
- **Auto-break Logic**: Intelligent suggestion of break types based on work session count
- **Settings Persistence**: All preferences saved and restored automatically

## Technical Implementation

### Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Pomodoro Timer    │    │   Pomodoro Service   │    │   Storage Manager   │
│   (UI Component)    │◄──►│   (Business Logic)   │◄──►│   (Data Layer)      │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                           │                           │
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│     popup.html      │    │   background.js      │    │  Chrome Storage     │
│   (User Interface)  │    │  (Chrome Alarms)     │    │   (Persistence)     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Files Structure

```
services/
├── pomodoro-service.js          # Core business logic and state management
└── storage-manager.js           # Data persistence layer

popup/
├── components/
│   └── pomodoro-timer.js        # UI component and user interactions
├── popup.html                   # HTML structure with Pomodoro section
├── popup.css                    # Styling including Pomodoro-specific styles
└── popup.js                     # Main popup integration

background.js                    # Chrome alarms and notifications
tests/
└── pomodoro-service.test.js     # Comprehensive test suite
```

### Data Storage Schema

#### Settings (`pomodoroSettings`)

```javascript
{
  workDuration: 25,              // minutes
  shortBreakDuration: 5,         // minutes
  longBreakDuration: 15,         // minutes
  sessionsUntilLongBreak: 4,     // number of work sessions
  autoStartBreaks: false,        // boolean
  autoStartWork: false,          // boolean
  soundEnabled: true,            // boolean
  notificationsEnabled: true     // boolean
}
```

#### Current Session (`pomodoroCurrentSession`)

```javascript
{
  id: "pomodoro_1234567890",     // unique session identifier
  type: "work",                  // "work" | "shortBreak" | "longBreak"
  duration: 1500000,             // total duration in milliseconds
  startTime: 1234567890000,      // start timestamp
  endTime: 1234569390000,        // end timestamp
  remainingTime: 900000,         // remaining time in milliseconds
  isActive: true,                // boolean
  isPaused: false,               // boolean
  pausedAt: null                 // timestamp when paused (if applicable)
}
```

#### Session History (`pomodoroHistory`)

```javascript
[
  {
    id: "pomodoro_1234567890",
    type: "work",
    duration: 1500000,
    startTime: 1234567890000,
    endTime: 1234569390000,
    completedAt: 1234569390000,
    wasCompleted: true,
  },
  // ... up to 100 most recent sessions
];
```

#### Daily Statistics (`pomodoroStats`)

```javascript
{
  "Mon Oct 09 2023": {
    workSessions: 6,
    shortBreaks: 5,
    longBreaks: 1,
    totalWorkTime: 150,           // minutes
    totalBreakTime: 40,           // minutes
    sessionsStarted: 12,
    sessionsCompleted: 12,
    sessionsStopped: 0
  }
  // ... data for each day
}
```

## API Reference

### PomodoroService

#### Methods

- `startSession(type)` - Start a new session ('work', 'shortBreak', 'longBreak')
- `pauseSession()` - Pause the current session
- `resumeSession()` - Resume a paused session
- `stopSession()` - Stop the current session
- `completeSession()` - Mark session as completed (usually called automatically)
- `saveSettings(settings)` - Update and save settings
- `getTodayStats()` - Get today's statistics
- `getHistoricalStats(days)` - Get historical statistics
- `getSessionHistory(limit)` - Get recent session history
- `formatTime(milliseconds)` - Format time for display
- `addEventListener(callback)` - Add event listener
- `removeEventListener(callback)` - Remove event listener

#### Events

- `sessionStarted` - Fired when a session starts
- `sessionPaused` - Fired when a session is paused
- `sessionResumed` - Fired when a session resumes
- `sessionStopped` - Fired when a session is manually stopped
- `sessionCompleted` - Fired when a session completes naturally
- `tick` - Fired every second with remaining time
- `nextSessionReady` - Fired when next session type is determined
- `settingsUpdated` - Fired when settings are changed

### PomodoroTimer Component

#### Methods

- `startWorkSession()` - Start a work session
- `startBreakSession(isLong)` - Start a break session
- `getCurrentSessionInfo()` - Get current session information
- `getTodayStats()` - Get today's statistics

## Usage Examples

### Basic Usage

```javascript
// Initialize the Pomodoro timer
const pomodoroTimer = new PomodoroTimer("pomodoroContainer");

// Start a work session
await pomodoroTimer.startWorkSession();

// Start a short break
await pomodoroTimer.startBreakSession(false);

// Start a long break
await pomodoroTimer.startBreakSession(true);
```

### Advanced Usage with Service

```javascript
// Initialize service directly
const pomodoroService = new PomodoroService();

// Listen for events
pomodoroService.addEventListener((event, data) => {
  switch (event) {
    case "sessionCompleted":
      console.log("Session completed:", data.type);
      break;
    case "tick":
      console.log(
        "Time remaining:",
        pomodoroService.formatTime(data.remainingTime)
      );
      break;
  }
});

// Start custom session
await pomodoroService.startSession("work");

// Update settings
await pomodoroService.saveSettings({
  workDuration: 30,
  shortBreakDuration: 10,
  autoStartBreaks: true,
});

// Get statistics
const todayStats = await pomodoroService.getTodayStats();
console.log("Work sessions today:", todayStats.workSessions);
```

## Testing

The Pomodoro feature includes comprehensive tests covering:

- Service initialization and configuration
- Session management (start, pause, resume, stop, complete)
- Statistics tracking and historical data
- Event system and listeners
- Data persistence and recovery
- Auto-start logic and break intervals
- Time formatting and display

Run tests with:

```bash
npm test tests/pomodoro-service.test.js
```

## Demo

A standalone demo is available at `demo-pomodoro-timer.html` that showcases:

- Full Pomodoro timer functionality
- Real-time debugging information
- Mock Chrome APIs for testing
- Responsive design demonstration

## Browser Compatibility

- **Chrome Extension Manifest V3**: Full support with Chrome alarms
- **Modern Browsers**: Fallback timer support for demo/testing
- **Notifications**: Uses Chrome notifications API with browser fallback
- **Storage**: Chrome storage API with graceful degradation

## Performance Considerations

- **Lazy Loading**: Timer component loads only when needed
- **Efficient Updates**: 1-second intervals with optimized DOM updates
- **Storage Optimization**: Automatic cleanup of old data (100 session limit)
- **Memory Management**: Proper cleanup of timers and event listeners
- **Background Efficiency**: Chrome alarms reduce CPU usage when popup is closed

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all controls
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **High Contrast**: Material Design 3 color system with dark mode support
- **Focus Management**: Clear focus indicators and logical tab order
- **Reduced Motion**: Respects user's motion preferences

## Future Enhancements

- **Sound Notifications**: Customizable completion sounds
- **Themes**: Additional color themes and customization
- **Export Data**: CSV/JSON export of statistics and history
- **Goals & Streaks**: Daily/weekly goals and streak tracking
- **Integration**: Calendar integration for automatic work session scheduling
- **Analytics**: Advanced productivity insights and trends
