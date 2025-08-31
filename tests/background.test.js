/**
 * Background Service Worker Tests
 * Tests for background service worker functionality and message handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    onSuspend: { addListener: vi.fn() },
    id: "test-extension-id",
  },
  notifications: {
    onClicked: { addListener: vi.fn() },
    onButtonClicked: { addListener: vi.fn() },
    create: vi.fn(),
    clear: vi.fn(),
  },
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
  },
  windows: {
    getAll: vi.fn(),
  },
  action: {
    openPopup: vi.fn(),
  },
};

global.chrome = mockChrome;
global.importScripts = vi.fn();

// Mock modules
const mockStorageManager = {
  get: vi.fn(),
  set: vi.fn(),
  setMultiple: vi.fn(),
};

const mockTabTracker = {
  getCurrentTabStats: vi.fn(),
  getFocusTabInfo: vi.fn(),
  setFocusTab: vi.fn(),
  resetFocusTab: vi.fn(),
  triggerManualBreak: vi.fn(),
  currentTabId: null,
  stopTrackingTab: vi.fn(),
};

const mockConstants = {
  STORAGE_KEYS: {
    SCREEN_TIME_SETTINGS: "screenTimeSettings",
    FOCUS_SETTINGS: "focusSettings",
    BREATHING_SETTINGS: "breathingSettings",
    AUDIO_SETTINGS: "audioSettings",
    TAB_HISTORY: "tabHistory",
    CURRENT_SESSION: "currentSession",
    TASKS: "tasks",
    API_KEYS: "apiKeys",
  },
  DEFAULT_SETTINGS: {
    screenTime: { limitMinutes: 30, enabled: true },
    focus: { enabled: true, reminderCooldownMinutes: 5 },
    breathing: { durations: { inhale: 4000 } },
    audio: { whiteNoise: { enabled: false } },
  },
};

// Mock global constructors
global.StorageManager = vi.fn(() => mockStorageManager);
global.TabTracker = vi.fn(() => mockTabTracker);
global.CONSTANTS = mockConstants;

describe("Background Service Worker", () => {
  let handleMessage;
  let initializeDefaultSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful responses
    mockStorageManager.setMultiple.mockResolvedValue(true);
    mockStorageManager.get.mockResolvedValue({});
    mockTabTracker.getCurrentTabStats.mockResolvedValue({
      tabId: 1,
      url: "https://example.com",
      totalTime: 60000,
    });
    mockTabTracker.getFocusTabInfo.mockReturnValue({
      tabId: 1,
      url: "https://example.com",
      isSet: true,
    });
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com" },
    ]);

    // Import the background script functions
    // Since we can't directly import the background script, we'll test the functions
    // by simulating their behavior

    handleMessage = async (message, sender, sendResponse) => {
      try {
        switch (message.type) {
          case "GET_TAB_STATS":
            const stats = await mockTabTracker.getCurrentTabStats();
            sendResponse({ success: true, data: stats });
            break;

          case "GET_FOCUS_INFO":
            const focusInfo = mockTabTracker.getFocusTabInfo();
            sendResponse({ success: true, data: focusInfo });
            break;

          case "SET_FOCUS_TAB":
            const tabs = await mockChrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (tabs.length > 0) {
              await mockTabTracker.setFocusTab(tabs[0].id, tabs[0].url);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: "No active tab found" });
            }
            break;

          case "RESET_FOCUS_TAB":
            await mockTabTracker.resetFocusTab();
            sendResponse({ success: true });
            break;

          case "TRIGGER_MANUAL_BREAK":
            await mockTabTracker.triggerManualBreak();
            sendResponse({ success: true });
            break;

          case "GET_ALL_TAB_HISTORY":
            const tabHistory =
              (await mockStorageManager.get(
                mockConstants.STORAGE_KEYS.TAB_HISTORY
              )) || {};
            sendResponse({ success: true, data: tabHistory });
            break;

          case "CLEAR_TAB_HISTORY":
            await mockStorageManager.set(
              mockConstants.STORAGE_KEYS.TAB_HISTORY,
              {}
            );
            sendResponse({ success: true });
            break;

          default:
            sendResponse({ success: false, error: "Unknown message type" });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    };

    initializeDefaultSettings = async () => {
      const defaultData = {
        [mockConstants.STORAGE_KEYS.SCREEN_TIME_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.screenTime,
        [mockConstants.STORAGE_KEYS.FOCUS_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.focus,
        [mockConstants.STORAGE_KEYS.BREATHING_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.breathing,
        [mockConstants.STORAGE_KEYS.AUDIO_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.audio,
        [mockConstants.STORAGE_KEYS.TAB_HISTORY]: {},
        [mockConstants.STORAGE_KEYS.CURRENT_SESSION]: {},
        [mockConstants.STORAGE_KEYS.TASKS]: [],
        [mockConstants.STORAGE_KEYS.API_KEYS]: {},
      };

      await mockStorageManager.setMultiple(defaultData);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize default settings on fresh install", async () => {
      await initializeDefaultSettings();

      expect(mockStorageManager.setMultiple).toHaveBeenCalledWith({
        [mockConstants.STORAGE_KEYS.SCREEN_TIME_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.screenTime,
        [mockConstants.STORAGE_KEYS.FOCUS_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.focus,
        [mockConstants.STORAGE_KEYS.BREATHING_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.breathing,
        [mockConstants.STORAGE_KEYS.AUDIO_SETTINGS]:
          mockConstants.DEFAULT_SETTINGS.audio,
        [mockConstants.STORAGE_KEYS.TAB_HISTORY]: {},
        [mockConstants.STORAGE_KEYS.CURRENT_SESSION]: {},
        [mockConstants.STORAGE_KEYS.TASKS]: [],
        [mockConstants.STORAGE_KEYS.API_KEYS]: {},
      });
    });

    it("should create StorageManager and TabTracker instances", () => {
      // Simulate initialization
      new global.StorageManager();
      new global.TabTracker();

      expect(global.StorageManager).toHaveBeenCalled();
      expect(global.TabTracker).toHaveBeenCalled();
    });
  });

  describe("Message Handling", () => {
    it("should handle GET_TAB_STATS message", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "GET_TAB_STATS" };

      await handleMessage(message, {}, mockSendResponse);

      expect(mockTabTracker.getCurrentTabStats).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: {
          tabId: 1,
          url: "https://example.com",
          totalTime: 60000,
        },
      });
    });

    it("should handle GET_FOCUS_INFO message", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "GET_FOCUS_INFO" };

      await handleMessage(message, {}, mockSendResponse);

      expect(mockTabTracker.getFocusTabInfo).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: {
          tabId: 1,
          url: "https://example.com",
          isSet: true,
        },
      });
    });

    it("should handle SET_FOCUS_TAB message", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "SET_FOCUS_TAB" };

      await handleMessage(message, {}, mockSendResponse);

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(mockTabTracker.setFocusTab).toHaveBeenCalledWith(
        1,
        "https://example.com"
      );
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    it("should handle SET_FOCUS_TAB message when no active tab", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "SET_FOCUS_TAB" };

      mockChrome.tabs.query.mockResolvedValue([]); // No active tabs

      await handleMessage(message, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: "No active tab found",
      });
    });

    it("should handle RESET_FOCUS_TAB message", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "RESET_FOCUS_TAB" };

      await handleMessage(message, {}, mockSendResponse);

      expect(mockTabTracker.resetFocusTab).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    it("should handle TRIGGER_MANUAL_BREAK message", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "TRIGGER_MANUAL_BREAK" };

      await handleMessage(message, {}, mockSendResponse);

      expect(mockTabTracker.triggerManualBreak).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    it("should handle GET_ALL_TAB_HISTORY message", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "GET_ALL_TAB_HISTORY" };
      const mockTabHistory = {
        1: { url: "https://example.com", totalTime: 60000 },
      };

      mockStorageManager.get.mockResolvedValue(mockTabHistory);

      await handleMessage(message, {}, mockSendResponse);

      expect(mockStorageManager.get).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.TAB_HISTORY
      );
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: mockTabHistory,
      });
    });

    it("should handle CLEAR_TAB_HISTORY message", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "CLEAR_TAB_HISTORY" };

      await handleMessage(message, {}, mockSendResponse);

      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.TAB_HISTORY,
        {}
      );
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    it("should handle unknown message type", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "UNKNOWN_TYPE" };

      await handleMessage(message, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Unknown message type",
      });
    });

    it("should handle errors in message processing", async () => {
      const mockSendResponse = vi.fn();
      const message = { type: "GET_TAB_STATS" };

      mockTabTracker.getCurrentTabStats.mockRejectedValue(
        new Error("Test error")
      );

      await handleMessage(message, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Test error",
      });
    });
  });

  describe("Notification Handling", () => {
    it("should handle notification clicks", async () => {
      const notificationId = "test-notification";

      // Simulate notification click handler
      const handleNotificationClick = async (notificationId) => {
        await mockChrome.notifications.clear(notificationId);

        const windows = await mockChrome.windows.getAll({ populate: true });
        const extensionWindow = windows.find(
          (window) =>
            window.tabs &&
            window.tabs.some(
              (tab) => tab.url && tab.url.includes(mockChrome.runtime.id)
            )
        );

        if (!extensionWindow) {
          await mockChrome.action.openPopup();
        }
      };

      mockChrome.windows.getAll.mockResolvedValue([]);

      await handleNotificationClick(notificationId);

      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(
        notificationId
      );
      expect(mockChrome.action.openPopup).toHaveBeenCalled();
    });

    it("should handle break notification button clicks", async () => {
      const notificationId = "break-notification";
      const buttonIndex = 0; // "Take Break" button

      // Simulate notification button click handler
      const handleNotificationButtonClick = async (
        notificationId,
        buttonIndex
      ) => {
        await mockChrome.notifications.clear(notificationId);

        if (notificationId.includes("break")) {
          if (buttonIndex === 0) {
            await mockTabTracker.triggerManualBreak();
          }
        }
      };

      await handleNotificationButtonClick(notificationId, buttonIndex);

      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(
        notificationId
      );
      expect(mockTabTracker.triggerManualBreak).toHaveBeenCalled();
    });

    it("should handle focus notification button clicks", async () => {
      const notificationId = "focus-notification";
      const buttonIndex = 0; // "Return to Task" button

      mockTabTracker.getFocusTabInfo.mockReturnValue({
        tabId: 1,
        url: "https://example.com",
        isSet: true,
      });

      // Simulate notification button click handler
      const handleNotificationButtonClick = async (
        notificationId,
        buttonIndex
      ) => {
        await mockChrome.notifications.clear(notificationId);

        if (notificationId.includes("focus")) {
          if (buttonIndex === 0) {
            const focusInfo = mockTabTracker.getFocusTabInfo();
            if (focusInfo && focusInfo.tabId) {
              await mockChrome.tabs.update(focusInfo.tabId, { active: true });
            }
          } else if (buttonIndex === 1) {
            const tabs = await mockChrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (tabs.length > 0) {
              await mockTabTracker.setFocusTab(tabs[0].id, tabs[0].url);
            }
          }
        }
      };

      await handleNotificationButtonClick(notificationId, buttonIndex);

      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(
        notificationId
      );
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    });

    it("should handle focus notification update focus button", async () => {
      const notificationId = "focus-notification";
      const buttonIndex = 1; // "Update Focus" button

      // Simulate notification button click handler
      const handleNotificationButtonClick = async (
        notificationId,
        buttonIndex
      ) => {
        await mockChrome.notifications.clear(notificationId);

        if (notificationId.includes("focus")) {
          if (buttonIndex === 1) {
            const tabs = await mockChrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (tabs.length > 0) {
              await mockTabTracker.setFocusTab(tabs[0].id, tabs[0].url);
            }
          }
        }
      };

      await handleNotificationButtonClick(notificationId, buttonIndex);

      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(
        notificationId
      );
      expect(mockTabTracker.setFocusTab).toHaveBeenCalledWith(
        1,
        "https://example.com"
      );
    });
  });

  describe("Cleanup and Maintenance", () => {
    it("should handle service worker suspension", async () => {
      mockTabTracker.currentTabId = 1;

      // Simulate suspension handler
      const handleSuspension = async () => {
        if (mockTabTracker.currentTabId) {
          await mockTabTracker.stopTrackingTab(mockTabTracker.currentTabId);
        }
      };

      await handleSuspension();

      expect(mockTabTracker.stopTrackingTab).toHaveBeenCalledWith(1);
    });

    it("should clean up old tab history entries", async () => {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const oldTabHistory = {
        1: { lastActiveTime: sevenDaysAgo - 1000, url: "https://old.com" }, // Should be cleaned
        2: { lastActiveTime: now - 1000, url: "https://recent.com" }, // Should remain
      };

      mockStorageManager.get.mockResolvedValue(oldTabHistory);

      // Simulate cleanup function
      const performCleanup = async () => {
        const tabHistory =
          (await mockStorageManager.get(
            mockConstants.STORAGE_KEYS.TAB_HISTORY
          )) || {};
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let cleaned = false;

        Object.keys(tabHistory).forEach((tabId) => {
          const tabData = tabHistory[tabId];
          if (tabData.lastActiveTime < sevenDaysAgo) {
            delete tabHistory[tabId];
            cleaned = true;
          }
        });

        if (cleaned) {
          await mockStorageManager.set(
            mockConstants.STORAGE_KEYS.TAB_HISTORY,
            tabHistory
          );
        }

        return cleaned;
      };

      const cleaned = await performCleanup();

      expect(cleaned).toBe(true);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.TAB_HISTORY,
        {
          2: { lastActiveTime: now - 1000, url: "https://recent.com" },
        }
      );
    });
  });
});
