# Break Reminder Debug Implementation

## Overview
Added comprehensive debugging and testing functionality to diagnose and fix break reminder notification issues. The break reminder should automatically show notifications after the configured "Break reminder after:" time period.

## Changes Made

### 1. Enhanced Break Notification System (`services/break-notification-system.js`)

#### Added Detailed Logging
- **`checkAndNotifyWorkTimeThreshold()`**: Added comprehensive debug logging to track:
  - Break timer manager availability
  - Timer status details (work time, threshold, active state)
  - Work time vs threshold comparison
  - Notification trigger conditions

### 2. Enhanced Background Script (`background.js`)

#### Added Debug Logging to Break Timer Check
- **`handleBreakTimerCheck()`**: Added detailed logging to track:
  - Component availability (break timer manager, notification system)
  - Current timer status
  - Break state vs work state
  - Notification trigger attempts

#### Added Manual Work Timer Start
- **New message handler**: `START_WORK_TIMER` - allows manual work timer activation
- Useful for testing and troubleshooting timer initialization issues

### 3. Enhanced Break Timer Manager (`services/break-timer-manager.js`)

#### Added Work Timer Debugging
- **`startWorkTimer()`**: Added logging with timestamps and threshold info
- **`resumeWorkTimer()`**: Added logging with timestamps and threshold info
- **`getCurrentWorkTime()`**: Added periodic debug logging (10% sample rate) showing:
  - Total work time accumulation
  - Current session calculation
  - Timer active state
  - Work time in minutes

### 4. Enhanced Tab Tracker (`services/tab-tracker.js`)

#### Added Continuous Tracking Debug
- **`startContinuousWorkTimeTracking()`**: Added detailed logging to track:
  - Break timer manager availability
  - Timer status when starting tracking
  - Work timer activation attempts
  - Initialization success/failure

### 5. Created Test Script (`test-break-reminder.js`)

#### Test Functions Available
- **`testBreakReminder()`**: Comprehensive status check
- **`startWorkTimer()`**: Manual work timer activation
- **`forceBreakReminder()`**: Force notification for immediate testing

## How Break Reminders Work

### Normal Flow
1. **Tab Activation**: User switches to a tab
2. **Work Timer Start**: Tab tracker starts work timer via break timer manager
3. **Continuous Tracking**: Work time accumulates while user is active
4. **Periodic Check**: Background script checks every minute via alarm
5. **Threshold Check**: Notification system checks if work time exceeds threshold
6. **Notification**: Shows break reminder with break type options

### Key Components
- **Break Timer Manager**: Tracks work time and manages timer state
- **Break Notification System**: Handles notification display and threshold checking
- **Tab Tracker**: Integrates with break timer for activity-based tracking
- **Background Script**: Coordinates periodic checks via alarms

## Troubleshooting Guide

### Step 1: Check Timer Status
```javascript
testBreakReminder()
```
This will show:
- Current work time vs threshold
- Timer active state
- Break state
- Notification permissions

### Step 2: Manual Timer Start (if needed)
```javascript
startWorkTimer()
```
Use if timer is not automatically starting

### Step 3: Force Notification Test
```javascript
forceBreakReminder()
```
Tests notification system directly

### Step 4: Check Console Logs
Look for these debug messages:
- `BreakTimerManager: Work timer started at [time]`
- `TabTracker: Continuous work time tracking started`
- `=== BREAK TIMER CHECK ===`
- `BreakNotificationSystem: Work time threshold exceeded!`

## Common Issues and Solutions

### Issue 1: Work Timer Not Starting
**Symptoms**: `testBreakReminder()` shows timer not active
**Solution**: 
1. Check if break timer manager is initialized
2. Run `startWorkTimer()` manually
3. Check console for initialization errors

### Issue 2: Threshold Not Being Reached
**Symptoms**: Work time stays low despite usage
**Solution**:
1. Check if timer is paused due to inactivity
2. Verify threshold setting (default 30 minutes)
3. Check if browser focus is being tracked

### Issue 3: Notifications Not Showing
**Symptoms**: Threshold exceeded but no notification
**Solution**:
1. Check notification permissions
2. Verify break notification system is initialized
3. Check cooldown period (5 minutes between notifications)

### Issue 4: Timer Resets Unexpectedly
**Symptoms**: Work time resets to 0 frequently
**Solution**:
1. Check for break timer manager errors
2. Verify storage persistence
3. Check browser restart recovery

## Default Settings

- **Work Time Threshold**: 30 minutes
- **Notification Cooldown**: 5 minutes
- **Periodic Check**: Every 1 minute
- **Break Types**: Short (5min), Medium (15min), Long (30min)

## Testing Recommendations

### For Development
1. Reduce work time threshold to 1-2 minutes for faster testing
2. Use `forceBreakReminder()` for immediate notification testing
3. Monitor console logs for debug information

### For Users
1. Ensure active browser usage for timer to track properly
2. Check notification permissions are granted
3. Wait for full threshold period (default 30 minutes)
4. Use test functions to diagnose issues

## Debug Log Examples

### Successful Timer Start
```
TabTracker: Starting continuous work time tracking...
TabTracker: Current timer status: {isWorkTimerActive: false, isOnBreak: false, ...}
TabTracker: Starting work timer for continuous tracking
BreakTimerManager: Work timer started at 2:30:15 PM
BreakTimerManager: Work time threshold is 30 minutes
```

### Threshold Exceeded
```
=== BREAK TIMER CHECK ===
BreakNotificationSystem: Timer status check: {currentWorkTime: 1800000, workTimeThreshold: 1800000, isThresholdExceeded: true}
BreakNotificationSystem: Work time threshold exceeded! Showing notification for 30 minutes
```

This debugging implementation provides comprehensive visibility into the break reminder system and should help identify why notifications aren't appearing as expected.