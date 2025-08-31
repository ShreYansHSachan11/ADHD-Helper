/**
 * Tab Tracker Tests
 * Tests for tab tracking accuracy and timer calculations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    onActivated: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    query: vi.fn(),
    get: vi.fn(),
  },
  windows: {
    onFocusChanged: { addListener: vi.fn() },
    WINDOW_ID_NONE: -1,
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      QUOTA_BYTES: 5242880,
    },
  },
  runtime: {
    id: "test-extension-id",
  },
};

global.chrome = mockChrome;
global.importScripts = vi.fn();

// Mock modules
const mockStorageManager = {
  get: vi.fn(),
  set: vi.fn(),
  getMultiple: vi.fn(),
  setMultiple: vi.fn(),
};

const mockConstants = {
  STORAGE_KEYS: {
    CURRENT_SESSION: "currentSession",
    TAB_HISTORY: "tabHistory",
    SCREEN_TIME_SETTINGS: "screenTimeSettings",
    FOCUS_SETTINGS: "focusSettings",
  },
  DEFAULT_SETTINGS: {
    screenTime: {
      limitMinutes: 30,
      enabled: true,
      notificationsEnabled: true,
    },
    focus: {
      enabled: true,
      reminderCooldownMinutes: 5,
      notificationsEnabled: true,
    },
  },
  SCREEN_TIME: {
    NOTIFICATION_COOLDOWN_MS: 60000,
  },
};

const mockHelpers = {
  TimeUtils: {
    now: vi.fn(() => Date.now()),
    timeDiff: vi.fn((start, end = Date.now()) => Math.max(0, end - start)),
    minutesToMs: vi.fn((minutes) => minutes * 60 * 1000),
  },
  FormatUtils: {
    formatDuration: vi.fn((ms) => `${Math.round(ms / 60000)}m`),
    formatTimeForUI: vi.fn((ms) => `${Math.round(ms / 60000)}m`),
  },
};

// Import TabTracker after mocking
const TabTracker = await import("../services/tab-tracker.js").then((module) => {
  // Mock the dependencies in the module
  global.StorageManager = function () {
    return mockStorageManager;
  };
  global.CONSTANTS = mockConstants;
  global.HELPERS = mockHelpers;

  return module.default || module.TabTracker;
});

describe("TabTracker", () => {
  let tabTracker;
  let mockNow = 1000000;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup time mock
    mockHelpers.TimeUtils.now.mockReturnValue(mockNow);
    mockHelpers.TimeUtils.timeDiff.mockImplementation((start, end = mockNow) =>
      Math.max(0, end - start)
    );

    // Setup storage mocks
    mockStorageManager.getMultiple.mockResolvedValue({});
    mockStorageManager.get.mockResolvedValue({});
    mockStorageManager.set.mockResolvedValue(true);

    // Setup Chrome API mocks
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com" },
    ]);
    mockChrome.tabs.get.mockResolvedValue({
      id: 1,
      url: "https://example.com",
    });

    // Create new instance
    tabTracker = new TabTracker();

    // Mock the initialization to avoid async issues in tests
    tabTracker.storageManager = mockStorageManager;
    tabTracker.constants = mockConstants;
    tabTracker.helpers = mockHelpers;
    tabTracker.isInitialized = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tab Time Tracking", () => {
    it("should start tracking a tab correctly", async () => {
      const tabId = 1;
      const url = "https://example.com";

      await tabTracker.startTrackingTab(tabId, url);

      expect(tabTracker.currentTabId).toBe(tabId);
      expect(tabTracker.currentTabStartTime).toBe(mockNow);
      expect(mockStorageManager.get).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.TAB_HISTORY
      );
    });

    it("should stop tracking and calculate session time correctly", async () => {
      const tabId = 1;
      const sessionDuration = 30000; // 30 seconds

      // Start tracking
      tabTracker.currentTabId = tabId;
      tabTracker.currentTabStartTime = mockNow;

      // Mock time progression
      const endTime = mockNow + sessionDuration;
      mockHelpers.TimeUtils.timeDiff.mockReturnValue(sessionDuration);

      // Mock existing tab history
      mockStorageManager.get.mockResolvedValue({
        [tabId]: {
          url: "https://example.com",
          totalTime: 60000, // 1 minute existing
          lastActiveTime: mockNow,
        },
      });

      await tabTracker.stopTrackingTab(tabId);

      expect(mockHelpers.TimeUtils.timeDiff).toHaveBeenCalledWith(mockNow);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.TAB_HISTORY,
        expect.objectContaining({
          [tabId]: expect.objectContaining({
            totalTime: 90000, // 60000 + 30000
          }),
        })
      );
    });

    it("should handle tab switching correctly", async () => {
      const tab1Id = 1;
      const tab2Id = 2;
      const url1 = "https://example.com";
      const url2 = "https://google.com";

      // Start tracking tab 1
      await tabTracker.startTrackingTab(tab1Id, url1);
      expect(tabTracker.currentTabId).toBe(tab1Id);

      // Switch to tab 2
      mockChrome.tabs.get.mockResolvedValue({ id: tab2Id, url: url2 });
      await tabTracker.handleTabActivated(tab2Id);

      expect(tabTracker.currentTabId).toBe(tab2Id);
      expect(mockHelpers.TimeUtils.timeDiff).toHaveBeenCalled(); // Should calculate time for tab 1
    });

    it("should initialize tab history entry for new tabs", async () => {
      const tabId = 1;
      const url = "https://example.com";

      mockStorageManager.get.mockResolvedValue({}); // Empty tab history

      await tabTracker.initializeTabHistoryEntry(tabId, url);

      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.TAB_HISTORY,
        {
          [tabId]: {
            url: url,
            totalTime: 0,
            lastActiveTime: mockNow,
            breakRemindersShown: 0,
            sessionStartTime: mockNow,
          },
        }
      );
    });
  });

  describe("Screen Time Limit Checking", () => {
    it("should show break reminder when limit is exceeded", async () => {
      const tabId = 1;
      const limitMinutes = 30;
      const sessionTime = 35 * 60 * 1000; // 35 minutes

      // Mock settings
      mockStorageManager.get.mockImplementation((key) => {
        if (key === mockConstants.STORAGE_KEYS.SCREEN_TIME_SETTINGS) {
          return Promise.resolve({
            limitMinutes: limitMinutes,
            enabled: true,
            notificationsEnabled: true,
          });
        }
        if (key === mockConstants.STORAGE_KEYS.TAB_HISTORY) {
          return Promise.resolve({
            [tabId]: {
              url: "https://example.com",
              totalTime: 0,
              breakRemindersShown: 0,
            },
          });
        }
        return Promise.resolve({});
      });

      mockHelpers.TimeUtils.minutesToMs.mockReturnValue(
        limitMinutes * 60 * 1000
      );

      // Set up cooldown check
      tabTracker.lastBreakReminderTime = 0;

      await tabTracker.checkScreenTimeLimit(tabId, sessionTime);

      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Time for a Break!",
          message: expect.stringContaining("break"),
        })
      );
    });

    it("should respect cooldown period for break reminders", async () => {
      const tabId = 1;
      const sessionTime = 35 * 60 * 1000; // 35 minutes

      // Set recent reminder time (within cooldown)
      tabTracker.lastBreakReminderTime = mockNow - 30000; // 30 seconds ago

      mockStorageManager.get.mockImplementation((key) => {
        if (key === mockConstants.STORAGE_KEYS.SCREEN_TIME_SETTINGS) {
          return Promise.resolve({
            limitMinutes: 30,
            enabled: true,
            notificationsEnabled: true,
          });
        }
        return Promise.resolve({});
      });

      await tabTracker.checkScreenTimeLimit(tabId, sessionTime);

      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });

    it("should not show reminders when notifications are disabled", async () => {
      const tabId = 1;
      const sessionTime = 35 * 60 * 1000;

      mockStorageManager.get.mockResolvedValue({
        limitMinutes: 30,
        enabled: true,
        notificationsEnabled: false, // Disabled
      });

      await tabTracker.checkScreenTimeLimit(tabId, sessionTime);

      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe("Focus Tab Tracking", () => {
    it("should set focus tab correctly", async () => {
      const tabId = 1;
      const url = "https://example.com";

      await tabTracker.setFocusTab(tabId, url);

      expect(tabTracker.focusTabId).toBe(tabId);
      expect(tabTracker.focusTabUrl).toBe(url);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.CURRENT_SESSION,
        expect.objectContaining({
          focusTabId: tabId,
          focusUrl: url,
        })
      );
    });

    it("should detect focus deviation and show reminder", async () => {
      const focusTabId = 1;
      const focusUrl = "https://example.com";
      const currentTabId = 2;
      const currentUrl = "https://google.com";

      // Set focus tab
      tabTracker.focusTabId = focusTabId;
      tabTracker.focusTabUrl = focusUrl;
      tabTracker.lastFocusReminderTime = 0; // No recent reminders

      // Mock settings
      mockStorageManager.get.mockResolvedValue({
        enabled: true,
        reminderCooldownMinutes: 5,
        notificationsEnabled: true,
      });

      await tabTracker.checkFocusDeviation(currentTabId, currentUrl);

      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Stay Focused!",
          message: expect.stringContaining("example.com"),
        })
      );
    });

    it("should not show focus reminder for same domain", async () => {
      const focusTabId = 1;
      const focusUrl = "https://example.com/page1";
      const currentTabId = 2;
      const currentUrl = "https://example.com/page2"; // Same domain

      tabTracker.focusTabId = focusTabId;
      tabTracker.focusTabUrl = focusUrl;

      mockStorageManager.get.mockResolvedValue({
        enabled: true,
        reminderCooldownMinutes: 5,
        notificationsEnabled: true,
      });

      await tabTracker.checkFocusDeviation(currentTabId, currentUrl);

      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });

    it("should respect cooldown period for focus reminders", async () => {
      const focusTabId = 1;
      const focusUrl = "https://example.com";
      const currentTabId = 2;
      const currentUrl = "https://google.com";

      tabTracker.focusTabId = focusTabId;
      tabTracker.focusTabUrl = focusUrl;
      tabTracker.lastFocusReminderTime = mockNow - 60000; // 1 minute ago

      mockStorageManager.get.mockResolvedValue({
        enabled: true,
        reminderCooldownMinutes: 5, // 5 minute cooldown
        notificationsEnabled: true,
      });

      mockHelpers.TimeUtils.minutesToMs.mockReturnValue(5 * 60 * 1000);

      await tabTracker.checkFocusDeviation(currentTabId, currentUrl);

      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });

    it("should reset focus tab correctly", async () => {
      tabTracker.focusTabId = 1;
      tabTracker.focusTabUrl = "https://example.com";

      await tabTracker.resetFocusTab();

      expect(tabTracker.focusTabId).toBeNull();
      expect(tabTracker.focusTabUrl).toBeNull();
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.CURRENT_SESSION,
        expect.objectContaining({
          focusTabId: null,
          focusUrl: null,
        })
      );
    });
  });

  describe("Manual Break Functionality", () => {
    it("should trigger manual break and reset timer", async () => {
      const tabId = 1;

      tabTracker.currentTabId = tabId;
      tabTracker.currentTabStartTime = mockNow - 30000; // 30 seconds ago

      await tabTracker.triggerManualBreak();

      expect(tabTracker.currentTabStartTime).toBe(mockNow); // Should be reset to current time
      expect(tabTracker.lastBreakReminderTime).toBe(mockNow);
    });
  });

  describe("Statistics and Information", () => {
    it("should return current tab statistics correctly", async () => {
      const tabId = 1;
      const url = "https://example.com";
      const totalTime = 120000; // 2 minutes
      const sessionStartTime = mockNow - 30000; // 30 seconds ago

      tabTracker.currentTabId = tabId;
      tabTracker.currentTabStartTime = sessionStartTime;

      mockStorageManager.get.mockResolvedValue({
        [tabId]: {
          url: url,
          totalTime: totalTime,
          breakRemindersShown: 1,
        },
      });

      mockHelpers.TimeUtils.timeDiff.mockReturnValue(30000); // 30 seconds current session

      const stats = await tabTracker.getCurrentTabStats();

      expect(stats).toEqual({
        tabId: tabId,
        url: url,
        totalTime: totalTime + 30000, // Total + current session
        currentSessionTime: 30000,
        breakRemindersShown: 1,
      });
    });

    it("should return focus tab information correctly", () => {
      const tabId = 1;
      const url = "https://example.com";

      tabTracker.focusTabId = tabId;
      tabTracker.focusTabUrl = url;

      const focusInfo = tabTracker.getFocusTabInfo();

      expect(focusInfo).toEqual({
        tabId: tabId,
        url: url,
        isSet: true,
      });
    });

    it("should return empty focus info when no focus tab is set", () => {
      tabTracker.focusTabId = null;
      tabTracker.focusTabUrl = null;

      const focusInfo = tabTracker.getFocusTabInfo();

      expect(focusInfo).toEqual({
        tabId: null,
        url: null,
        isSet: false,
      });
    });
  });

  describe("URL Matching", () => {
    it("should match URLs from same domain", () => {
      const url1 = "https://example.com/page1";
      const url2 = "https://example.com/page2";

      const match = tabTracker.urlsMatch(url1, url2);

      expect(match).toBe(true);
    });

    it("should not match URLs from different domains", () => {
      const url1 = "https://example.com/page1";
      const url2 = "https://google.com/page1";

      const match = tabTracker.urlsMatch(url1, url2);

      expect(match).toBe(false);
    });

    it("should handle invalid URLs gracefully", () => {
      const url1 = "invalid-url";
      const url2 = "https://example.com";

      const match = tabTracker.urlsMatch(url1, url2);

      expect(match).toBe(false);
    });
  });

  describe("Tab Cleanup", () => {
    it("should clean up tab history when tab is removed", async () => {
      const tabId = 1;

      mockStorageManager.get.mockResolvedValue({
        [tabId]: {
          url: "https://example.com",
          totalTime: 60000,
        },
        2: {
          url: "https://google.com",
          totalTime: 30000,
        },
      });

      await tabTracker.cleanupTabHistory(tabId);

      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.TAB_HISTORY,
        {
          2: {
            url: "https://google.com",
            totalTime: 30000,
          },
        }
      );
    });

    it("should handle tab removal correctly", async () => {
      const tabId = 1;

      tabTracker.currentTabId = tabId;
      tabTracker.focusTabId = tabId;

      await tabTracker.handleTabRemoved(tabId);

      expect(tabTracker.currentTabId).toBeNull();
      expect(tabTracker.focusTabId).toBeNull();
    });
  });
});
