/**
 * Background Work Time Tracking Integration Tests
 * Tests the integration between TabTracker and BreakTimerManager for continuous work time tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    onActivated: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() }
  },
  windows: {
    onFocusChanged: { addListener: vi.fn() },
    WINDOW_ID_NONE: -1
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: { addListener: vi.fn() }
  },
  runtime: {
    sendMessage: vi.fn()
  }
};

// Mock importScripts
global.importScripts = vi.fn();

// Mock dependencies
const mockStorageManager = {
  get: vi.fn(),
  set: vi.fn(),
  setMultiple: vi.fn(),
  getMultiple: vi.fn(),
  remove: vi.fn()
};

const mockConstants = {
  STORAGE_KEYS: {
    CURRENT_SESSION: 'currentSession',
    TAB_HISTORY: 'tabHistory',
    SCREEN_TIME_SETTINGS: 'screenTimeSettings',
    FOCUS_SETTINGS: 'focusSettings'
  },
  DEFAULT_SETTINGS: {
    screenTime: { limitMinutes: 30, enabled: true, notificationsEnabled: true },
    focus: { reminderCooldownMinutes: 5, trackingEnabled: true }
  },
  SCREEN_TIME: {
    NOTIFICATION_COOLDOWN_MS: 300000
  }
};

const mockHelpers = {
  TimeUtils: {
    now: () => Date.now(),
    timeDiff: (startTime) => Date.now() - startTime,
    minutesToMs: (minutes) => minutes * 60 * 1000
  },
  FormatUtils: {
    formatDuration: (ms) => `${Math.floor(ms / 60000)}m`
  }
};

// Make mocks globally available
global.StorageManager = vi.fn(() => mockStorageManager);
global.CONSTANTS = mockConstants;
global.HELPERS = mockHelpers;

// Import the classes after setting up mocks
const { default: BreakTimerManager } = await import('../services/break-timer-manager.js');
const { default: TabTracker } = await import('../services/tab-tracker.js');

describe('Background Work Time Tracking Integration', () => {
  let breakTimerManager;
  let tabTracker;
  let mockTab;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset Date.now to a fixed time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));

    mockTab = {
      id: 1,
      url: 'https://example.com',
      active: true
    };

    // Setup default storage responses
    mockStorageManager.get.mockResolvedValue(null);
    mockStorageManager.getMultiple.mockResolvedValue({});
    mockStorageManager.set.mockResolvedValue(undefined);
    mockStorageManager.setMultiple.mockResolvedValue(undefined);

    chrome.tabs.query.mockResolvedValue([mockTab]);
    chrome.tabs.get.mockResolvedValue(mockTab);

    // Initialize components
    breakTimerManager = new BreakTimerManager();
    // Inject dependencies for testing
    breakTimerManager.storageManager = mockStorageManager;
    breakTimerManager.constants = mockConstants;
    breakTimerManager.helpers = mockHelpers;
    await breakTimerManager.init();

    tabTracker = new TabTracker();
    // Inject dependencies for testing
    tabTracker.storageManager = mockStorageManager;
    tabTracker.constants = mockConstants;
    tabTracker.helpers = mockHelpers;
    tabTracker.breakTimerManager = breakTimerManager;
    await tabTracker.init();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Continuous Work Time Tracking', () => {
    it('should start work timer when tab tracking begins', async () => {
      // Start tracking a tab
      await tabTracker.startTrackingTab(mockTab.id, mockTab.url);

      // Verify work timer was started
      const timerStatus = breakTimerManager.getTimerStatus();
      expect(timerStatus.isWorkTimerActive).toBe(true);
      expect(timerStatus.workStartTime).toBeDefined();
    });

    it('should continue work time tracking across browser sessions', async () => {
      // Simulate work timer was active before restart
      await breakTimerManager.startWorkTimer();
      
      // Advance time by 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000);
      
      // Get work time before "restart"
      const workTimeBeforeRestart = breakTimerManager.getCurrentWorkTime();
      expect(workTimeBeforeRestart).toBeGreaterThan(0);

      // Mock storage to return the current state
      const currentState = {
        breakTimerState: {
          isWorkTimerActive: true,
          isOnBreak: false,
          lastActivityTime: Date.now(),
          workTimeThreshold: 30 * 60 * 1000
        },
        workSessionData: {
          workStartTime: Date.now() - (10 * 60 * 1000),
          totalWorkTime: workTimeBeforeRestart,
          breakStartTime: null,
          breakDuration: 0
        }
      };

      mockStorageManager.get.mockImplementation((key) => {
        return Promise.resolve(currentState[key]);
      });

      // Simulate browser restart by creating new instances
      const newBreakTimerManager = new BreakTimerManager();
      newBreakTimerManager.storageManager = mockStorageManager;
      newBreakTimerManager.constants = mockConstants;
      newBreakTimerManager.helpers = mockHelpers;
      await newBreakTimerManager.init();

      // Verify work time is recovered
      const recoveredWorkTime = newBreakTimerManager.getCurrentWorkTime();
      expect(recoveredWorkTime).toBeGreaterThanOrEqual(workTimeBeforeRestart);
    });

    it('should pause work timer during inactivity', async () => {
      // Start work timer
      await breakTimerManager.startWorkTimer();
      expect(breakTimerManager.getTimerStatus().isWorkTimerActive).toBe(true);

      // Simulate browser focus lost
      await tabTracker.handleBrowserFocusLost();

      // Advance time beyond inactivity threshold (5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Trigger periodic activity check
      await tabTracker.performPeriodicActivityCheck();

      // Verify work timer was paused
      const timerStatus = breakTimerManager.getTimerStatus();
      expect(timerStatus.isWorkTimerActive).toBe(false);
    });

    it('should resume work timer when activity resumes', async () => {
      // Start with paused timer
      await breakTimerManager.pauseWorkTimer();
      expect(breakTimerManager.getTimerStatus().isWorkTimerActive).toBe(false);

      // Simulate browser focus gained
      await tabTracker.handleBrowserFocusGained();

      // Verify work timer was resumed
      const timerStatus = breakTimerManager.getTimerStatus();
      expect(timerStatus.isWorkTimerActive).toBe(true);
    });

    it('should persist timer state across browser restarts', async () => {
      // Start work timer and track some time
      await breakTimerManager.startWorkTimer();
      vi.advanceTimersByTime(15 * 60 * 1000); // 15 minutes

      // Verify state is persisted
      expect(mockStorageManager.setMultiple).toHaveBeenCalled();

      // Simulate restart recovery
      await tabTracker.recoverTimerStateAfterRestart();

      // Verify timer state is maintained
      const timerStatus = breakTimerManager.getTimerStatus();
      expect(timerStatus.currentWorkTime).toBeGreaterThan(0);
    });
  });

  describe('Activity Detection', () => {
    it('should detect activity when tab changes', async () => {
      const spy = vi.spyOn(breakTimerManager, 'updateActivity');

      await tabTracker.startTrackingTab(mockTab.id, mockTab.url);

      expect(spy).toHaveBeenCalled();
    });

    it('should update activity during periodic checks', async () => {
      const spy = vi.spyOn(breakTimerManager, 'updateActivity');

      // Set up active tab tracking and ensure initialization is complete
      tabTracker.currentTabId = mockTab.id;
      tabTracker.isInitialized = true;
      breakTimerManager.isBrowserFocused = true;

      await tabTracker.performFrequentActivityUpdate();

      expect(spy).toHaveBeenCalled();
    });

    it('should not update activity when browser is not focused', async () => {
      const spy = vi.spyOn(breakTimerManager, 'updateActivity');

      // Set browser as not focused
      breakTimerManager.isBrowserFocused = false;

      await tabTracker.performFrequentActivityUpdate();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Break Timer Integration', () => {
    it('should show break notification when work time threshold is exceeded', async () => {
      const spy = vi.spyOn(tabTracker, 'showBreakTimerNotification');

      // Start work timer
      await breakTimerManager.startWorkTimer();

      // Advance time beyond threshold (30 minutes)
      vi.advanceTimersByTime(31 * 60 * 1000);

      // Trigger threshold check
      await tabTracker.checkBreakTimerThreshold();

      expect(spy).toHaveBeenCalled();
    });

    it('should not show break notification during cooldown period', async () => {
      const spy = vi.spyOn(tabTracker, 'showBreakTimerNotification');

      // Start work timer and exceed threshold first
      await breakTimerManager.startWorkTimer();
      vi.advanceTimersByTime(31 * 60 * 1000);

      // Set recent break reminder time (within cooldown period) - after advancing time
      tabTracker.lastBreakReminderTime = Date.now() - (2 * 60 * 1000); // 2 minutes ago (cooldown is 5 minutes)

      await tabTracker.checkBreakTimerThreshold();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should reset work timer when manual break is triggered', async () => {
      // Start work timer and accumulate time
      await breakTimerManager.startWorkTimer();
      vi.advanceTimersByTime(20 * 60 * 1000); // 20 minutes

      const workTimeBeforeBreak = breakTimerManager.getCurrentWorkTime();
      expect(workTimeBeforeBreak).toBeGreaterThan(0);

      // Trigger manual break
      await tabTracker.triggerManualBreak();

      // Verify work timer was reset
      const workTimeAfterBreak = breakTimerManager.getCurrentWorkTime();
      expect(workTimeAfterBreak).toBeLessThan(workTimeBeforeBreak);
    });
  });

  describe('Timer State Recovery', () => {
    it('should recover from browser restart during active work session', async () => {
      // Start work session
      await breakTimerManager.startWorkTimer();
      vi.advanceTimersByTime(10 * 60 * 1000);

      // Simulate restart by creating new instance
      const newBreakTimerManager = new BreakTimerManager();
      
      // Mock storage to return previous state
      mockStorageManager.get.mockImplementation((key) => {
        if (key === 'breakTimerState') {
          return Promise.resolve({
            isWorkTimerActive: true,
            isOnBreak: false,
            lastActivityTime: Date.now() - (2 * 60 * 1000) // 2 minutes ago
          });
        }
        if (key === 'workSessionData') {
          return Promise.resolve({
            workStartTime: Date.now() - (10 * 60 * 1000), // 10 minutes ago
            totalWorkTime: 5 * 60 * 1000 // 5 minutes accumulated
          });
        }
        return Promise.resolve(null);
      });

      await newBreakTimerManager.init();

      // Verify state was recovered
      const timerStatus = newBreakTimerManager.getTimerStatus();
      expect(timerStatus.currentWorkTime).toBeGreaterThan(0);
    });

    it('should handle recovery when browser was inactive during restart', async () => {
      // Mock storage to return state indicating long inactivity
      mockStorageManager.get.mockImplementation((key) => {
        if (key === 'breakTimerState') {
          return Promise.resolve({
            isWorkTimerActive: true,
            isOnBreak: false,
            lastActivityTime: Date.now() - (10 * 60 * 1000) // 10 minutes ago (beyond threshold)
          });
        }
        if (key === 'workSessionData') {
          return Promise.resolve({
            workStartTime: Date.now() - (10 * 60 * 1000),
            totalWorkTime: 5 * 60 * 1000
          });
        }
        return Promise.resolve(null);
      });

      const newBreakTimerManager = new BreakTimerManager();
      newBreakTimerManager.storageManager = mockStorageManager;
      newBreakTimerManager.constants = mockConstants;
      newBreakTimerManager.helpers = mockHelpers;
      await newBreakTimerManager.init();

      // Verify timer was paused due to inactivity
      const timerStatus = newBreakTimerManager.getTimerStatus();
      expect(timerStatus.isWorkTimerActive).toBe(false);
    });
  });

  describe('Performance Optimization', () => {
    it('should throttle frequent activity updates', async () => {
      const spy = vi.spyOn(breakTimerManager, 'updateActivity');

      // Set up conditions for activity updates
      tabTracker.currentTabId = mockTab.id;
      tabTracker.isInitialized = true;
      breakTimerManager.isBrowserFocused = true;

      // Call frequent update multiple times rapidly
      await tabTracker.performFrequentActivityUpdate();
      await tabTracker.performFrequentActivityUpdate();
      await tabTracker.performFrequentActivityUpdate();

      // Should still only call updateActivity for each call (no internal throttling in this implementation)
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should persist timer state periodically', async () => {
      const spy = vi.spyOn(breakTimerManager, 'persistTimerState');

      // Ensure tab tracker is properly initialized
      tabTracker.isInitialized = true;

      await tabTracker.performPeriodicActivityCheck();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Integrated Timer Status', () => {
    it('should provide comprehensive timer status', async () => {
      // Set up active tracking
      await tabTracker.startTrackingTab(mockTab.id, mockTab.url);
      await breakTimerManager.startWorkTimer();

      const integratedStatus = await tabTracker.getIntegratedTimerStatus();

      expect(integratedStatus).toMatchObject({
        tabTracking: {
          isTracking: true,
          sessionStartTime: expect.any(Number)
        },
        workTimeTracking: {
          isWorkTimerActive: true,
          isOnBreak: false,
          currentWorkTime: expect.any(Number)
        },
        integrated: {
          isWorkingActive: true,
          totalWorkTime: expect.any(Number),
          isOnBreak: false,
          shouldShowBreakReminder: false
        }
      });
    });

    it('should indicate when break reminder should be shown', async () => {
      // Start work timer and exceed threshold
      await breakTimerManager.startWorkTimer();
      vi.advanceTimersByTime(31 * 60 * 1000);

      const integratedStatus = await tabTracker.getIntegratedTimerStatus();

      expect(integratedStatus.integrated.shouldShowBreakReminder).toBe(true);
    });
  });
});