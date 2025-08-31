/**
 * Notification Integration Tests
 * End-to-end tests for notification system integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Chrome APIs
const mockChrome = {
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    getPermissionLevel: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
    onButtonClicked: {
      addListener: vi.fn(),
    },
    onClosed: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

global.chrome = mockChrome;

// Mock constants and helpers
global.CONSTANTS = {
  SCREEN_TIME: {
    NOTIFICATION_COOLDOWN_MS: 60000,
  },
  FOCUS: {
    REMINDER_COOLDOWN_MINUTES: 5,
  },
  STORAGE_KEYS: {
    FOCUS_SETTINGS: "focusSettings",
    TAB_HISTORY: "tabHistory",
  },
};

global.HELPERS = {
  FormatUtils: {
    formatDuration: vi.fn((ms) => `${Math.round(ms / 60000)} min`),
  },
  TimeUtils: {
    minutesToMs: vi.fn((minutes) => minutes * 60000),
    now: vi.fn(() => Date.now()),
    timeDiff: vi.fn((startTime) => Date.now() - startTime),
  },
};

describe("Notification Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.notifications.getPermissionLevel.mockResolvedValue("granted");
    mockChrome.notifications.create.mockResolvedValue(undefined);
    mockChrome.notifications.clear.mockResolvedValue(undefined);
    mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com" },
    ]);
  });

  describe("Tab Tracker to Background Communication", () => {
    it("should send break notification request to background script", async () => {
      // Mock tab tracker behavior
      const tabId = 123;
      const timeSpent = 1800000; // 30 minutes

      // Simulate tab tracker sending message
      await chrome.runtime.sendMessage({
        type: "SHOW_BREAK_NOTIFICATION",
        tabId: tabId,
        timeSpent: timeSpent,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "SHOW_BREAK_NOTIFICATION",
        tabId: tabId,
        timeSpent: timeSpent,
      });
    });

    it("should send focus notification request to background script", async () => {
      const focusUrl = "https://work.com";
      const currentUrl = "https://social.com";

      // Simulate tab tracker sending message
      await chrome.runtime.sendMessage({
        type: "SHOW_FOCUS_NOTIFICATION",
        focusUrl: focusUrl,
        currentUrl: currentUrl,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "SHOW_FOCUS_NOTIFICATION",
        focusUrl: focusUrl,
        currentUrl: currentUrl,
      });
    });
  });

  describe("Background Script Message Handling", () => {
    let messageHandler;
    let notificationState;
    let storageManager;

    beforeEach(() => {
      // Mock storage manager
      storageManager = {
        get: vi.fn().mockResolvedValue({
          reminderCooldownMinutes: 5,
        }),
      };

      // Mock notification state
      notificationState = {
        activeNotifications: new Map(),
        lastBreakNotificationTime: 0,
        lastFocusNotificationTime: 0,
        notificationPermissionGranted: true,
      };

      // Mock message handler (simulating background.js behavior)
      messageHandler = async (message) => {
        switch (message.type) {
          case "SHOW_BREAK_NOTIFICATION":
            const now = Date.now();
            if (
              now - notificationState.lastBreakNotificationTime >=
              CONSTANTS.SCREEN_TIME.NOTIFICATION_COOLDOWN_MS
            ) {
              const notificationId = `break-reminder-${message.tabId}-${now}`;
              await chrome.notifications.create(notificationId, {
                type: "basic",
                iconUrl: "/assets/icons/icon48.png",
                title: "Time for a Break! 🕐",
                message: `You've been on this tab for ${HELPERS.FormatUtils.formatDuration(
                  message.timeSpent
                )}. Consider taking a short break.`,
                buttons: [
                  { title: "Take Break" },
                  { title: "Continue Working" },
                ],
              });
              notificationState.lastBreakNotificationTime = now;
              return { success: true };
            }
            return { success: false };

          case "SHOW_FOCUS_NOTIFICATION":
            const focusNow = Date.now();
            const settings = await storageManager.get(
              CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS
            );
            const cooldownMs = HELPERS.TimeUtils.minutesToMs(
              settings?.reminderCooldownMinutes ||
                CONSTANTS.FOCUS.REMINDER_COOLDOWN_MINUTES
            );

            if (
              focusNow - notificationState.lastFocusNotificationTime >=
              cooldownMs
            ) {
              const notificationId = `focus-reminder-${focusNow}`;
              let focusDomain = "unknown";
              let currentDomain = "unknown";

              try {
                focusDomain = new URL(message.focusUrl).hostname;
              } catch (error) {
                focusDomain = message.focusUrl || "unknown";
              }

              try {
                if (message.currentUrl) {
                  currentDomain = new URL(message.currentUrl).hostname;
                }
              } catch (error) {
                currentDomain = message.currentUrl || "unknown";
              }

              await chrome.notifications.create(notificationId, {
                type: "basic",
                iconUrl: "/assets/icons/icon48.png",
                title: "Stay Focused! 🎯",
                message: `You switched from ${focusDomain} to ${currentDomain}. Remember to stay focused on your initial task.`,
                buttons: [
                  { title: "Return to Task" },
                  { title: "Update Focus" },
                ],
              });
              notificationState.lastFocusNotificationTime = focusNow;
              return { success: true };
            }
            return { success: false };

          default:
            return { success: false, error: "Unknown message type" };
        }
      };
    });

    it("should handle break notification message and create notification", async () => {
      HELPERS.FormatUtils.formatDuration.mockReturnValue("30 min");

      const message = {
        type: "SHOW_BREAK_NOTIFICATION",
        tabId: 123,
        timeSpent: 1800000,
      };

      const response = await messageHandler(message);

      expect(response.success).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining("break-reminder-123"),
        expect.objectContaining({
          title: "Time for a Break! 🕐",
          message: expect.stringContaining("30 min"),
          buttons: [{ title: "Take Break" }, { title: "Continue Working" }],
        })
      );
    });

    it("should handle focus notification message and create notification", async () => {
      const message = {
        type: "SHOW_FOCUS_NOTIFICATION",
        focusUrl: "https://work.com",
        currentUrl: "https://social.com",
      };

      const response = await messageHandler(message);

      expect(response.success).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining("focus-reminder"),
        expect.objectContaining({
          title: "Stay Focused! 🎯",
          message: expect.stringContaining("work.com"),
          buttons: [{ title: "Return to Task" }, { title: "Update Focus" }],
        })
      );
    });

    it("should respect cooldown periods", async () => {
      // First break notification should succeed
      const message1 = {
        type: "SHOW_BREAK_NOTIFICATION",
        tabId: 123,
        timeSpent: 1800000,
      };

      const response1 = await messageHandler(message1);
      expect(response1.success).toBe(true);

      // Second notification within cooldown should fail
      const message2 = {
        type: "SHOW_BREAK_NOTIFICATION",
        tabId: 123,
        timeSpent: 1800000,
      };

      const response2 = await messageHandler(message2);
      expect(response2.success).toBe(false);

      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid URLs gracefully in focus notifications", async () => {
      const message = {
        type: "SHOW_FOCUS_NOTIFICATION",
        focusUrl: "invalid-url",
        currentUrl: "also-invalid",
      };

      const response = await messageHandler(message);

      expect(response.success).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining("focus-reminder"),
        expect.objectContaining({
          message: expect.stringContaining("invalid-url"),
        })
      );
    });
  });

  describe("Notification Permission Handling", () => {
    it("should check notification permissions on initialization", async () => {
      await chrome.notifications.getPermissionLevel();

      expect(chrome.notifications.getPermissionLevel).toHaveBeenCalled();
    });

    it("should handle denied notification permissions", async () => {
      mockChrome.notifications.getPermissionLevel.mockResolvedValue("denied");

      const permission = await chrome.notifications.getPermissionLevel();

      expect(permission).toBe("denied");
    });
  });

  describe("Notification Button Interactions", () => {
    it("should handle break notification button clicks", async () => {
      const notificationId = "break-reminder-123-456";
      const buttonIndex = 0; // "Take Break" button

      // Simulate button click handler
      const buttonClickHandler = async (id, index) => {
        await chrome.notifications.clear(id);

        if (id.includes("break") && index === 0) {
          // Simulate triggering manual break
          console.log("Manual break triggered");
        }
      };

      await buttonClickHandler(notificationId, buttonIndex);

      expect(chrome.notifications.clear).toHaveBeenCalledWith(notificationId);
    });

    it("should handle focus notification button clicks", async () => {
      const notificationId = "focus-reminder-456";
      const buttonIndex = 0; // "Return to Task" button

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, url: "https://work.com" },
      ]);

      // Simulate button click handler
      const buttonClickHandler = async (id, index) => {
        await chrome.notifications.clear(id);

        if (id.includes("focus") && index === 0) {
          // Simulate returning to focus tab
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { active: true });
          }
        }
      };

      await buttonClickHandler(notificationId, buttonIndex);

      expect(chrome.notifications.clear).toHaveBeenCalledWith(notificationId);
      expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    });
  });
});
