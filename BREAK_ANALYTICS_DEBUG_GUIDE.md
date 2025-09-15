# Break Analytics Debug Guide

## Issue Analysis
The break analytics are not displaying properly. This guide helps debug and fix the data persistence and display issues.

## Debug Steps

### 1. Check Analytics Container
The analytics should display in the `breakAnalyticsContainer` div within the Break Reminder panel.

**Location**: Break Reminder → Panel Content → Break Analytics Display

### 2. Debug Controls Added
Temporary debug controls have been added to the Break Reminder panel:

- **Create Test Break**: Creates a sample break session with analytics data
- **Check Storage**: Displays current storage data in console and alert
- **Refresh Analytics**: Forces analytics display to reload

### 3. Storage Keys to Check
The analytics system uses these storage keys:

```javascript
STORAGE_KEYS = {
  BREAK_SESSIONS: 'breakSessions',           // Individual break sessions
  ANALYTICS_SETTINGS: 'analyticsSettings',   // Analytics configuration
  DAILY_STATS: 'dailyBreakStats',           // Daily aggregated data
  WEEKLY_STATS: 'weeklyBreakStats',         // Weekly aggregated data
  MONTHLY_STATS: 'monthlyBreakStats'        // Monthly aggregated data
}
```

### 4. Expected Data Structure

#### Break Session:
```javascript
{
  id: "break_1234567890_abc123",
  type: "short|medium|long",
  plannedDuration: 5,
  actualDuration: 5,
  startTime: 1234567890000,
  endTime: 1234567890300,
  date: "2025-01-15",
  dayOfWeek: 1,
  hour: 14,
  completed: true,
  metadata: {
    workTimeBeforeBreak: 1800000,
    triggeredBy: "manual",
    browserActive: true
  }
}
```

#### Daily Stats:
```javascript
{
  "2025-01-15": {
    date: "2025-01-15",
    totalBreaks: 3,
    totalBreakTime: 35,
    breaksByType: { short: 2, medium: 1, long: 0 },
    breaksByHour: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0,0,0,0,0],
    completedBreaks: 3,
    averageDuration: 12
  }
}
```

## Testing Procedure

### Step 1: Open Extension
1. Open the extension popup
2. Navigate to "Break Reminder" feature
3. Scroll down to see the analytics section

### Step 2: Check Initial State
- If analytics show "Analytics Unavailable" → Analytics tracker failed to initialize
- If analytics show "No break data yet" → No data in storage
- If analytics show loading forever → Data loading error

### Step 3: Create Test Data
1. Click "Create Test Break" button
2. This should create a sample break session
3. Analytics should refresh and show the test data

### Step 4: Verify Storage
1. Click "Check Storage" button
2. Check console for detailed storage data
3. Alert should show summary of stored data

### Step 5: Manual Refresh
1. Click "Refresh Analytics" button
2. Analytics should reload and display current data

## Common Issues and Fixes

### Issue 1: Analytics Container Not Found
**Symptoms**: Console error "Analytics container not found"
**Fix**: The container is auto-created if missing

### Issue 2: StorageManager Not Available
**Symptoms**: Console error "StorageManager not available"
**Fix**: Ensure StorageManager script loads before analytics components

### Issue 3: No Data Displaying
**Symptoms**: Shows "No break data yet" even with data
**Fix**: 
1. Check if data exists using debug controls
2. Verify data format matches expected structure
3. Check console for loading errors

### Issue 4: Analytics Tracker Initialization Failed
**Symptoms**: Falls back to "Analytics Unavailable"
**Fix**:
1. Check if BreakAnalyticsTracker class is loaded
2. Verify StorageManager is available
3. Check for initialization errors in console

## Manual Data Creation

If debug controls don't work, manually create data in browser console:

```javascript
// Create test break session
const storageManager = new StorageManager();
const now = Date.now();
const today = new Date().toISOString().split('T')[0];

const testSession = {
  id: `manual_test_${now}`,
  type: 'short',
  plannedDuration: 5,
  actualDuration: 5,
  startTime: now - (5 * 60 * 1000),
  endTime: now,
  date: today,
  dayOfWeek: new Date().getDay(),
  hour: new Date().getHours(),
  completed: true,
  metadata: {
    workTimeBeforeBreak: 30 * 60 * 1000,
    triggeredBy: 'manual',
    browserActive: true
  }
};

// Save session
const sessions = await storageManager.get('breakSessions') || [];
sessions.push(testSession);
await storageManager.set('breakSessions', sessions);

// Create daily stats
const dailyStats = await storageManager.get('dailyBreakStats') || {};
dailyStats[today] = {
  date: today,
  totalBreaks: 1,
  totalBreakTime: 5,
  breaksByType: { short: 1, medium: 0, long: 0 },
  breaksByHour: Array(24).fill(0),
  completedBreaks: 1,
  averageDuration: 5
};
dailyStats[today].breaksByHour[new Date().getHours()] = 1;

await storageManager.set('dailyBreakStats', dailyStats);

console.log('Manual test data created');
```

## Expected Behavior After Fix

1. **Analytics Display**: Should show break statistics with proper formatting
2. **Period Selector**: Today/Week/Month buttons should work
3. **Stats Cards**: Should display total breaks, break time, average duration, completion rate
4. **Distribution Chart**: Should show break type distribution with progress bars
5. **Real-time Updates**: Should update when new breaks are taken

## Verification Checklist

- [ ] Analytics container exists and is visible
- [ ] BreakAnalyticsTracker initializes without errors
- [ ] StorageManager is available and working
- [ ] Test data can be created successfully
- [ ] Analytics display shows test data correctly
- [ ] Period selector buttons work
- [ ] Stats update when new data is added
- [ ] Progress bars animate correctly
- [ ] No console errors during operation

## Files to Check

1. **popup/popup.html** - Analytics container placement
2. **popup/components/break-analytics-display.js** - Display component
3. **services/break-analytics-tracker.js** - Data tracking service
4. **popup/components/break-analytics-display.css** - Styling
5. **popup/popup.js** - Component initialization

## Next Steps

1. Use debug controls to test functionality
2. Check console for any errors
3. Verify data persistence using storage debug
4. Test analytics display with real break sessions
5. Remove debug controls once working properly

The analytics should now work correctly with proper data persistence and display.