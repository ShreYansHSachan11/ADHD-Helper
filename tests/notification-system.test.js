/**
 * Notification System Tests
 * Tests for the notification functionality in the background service worker
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
  },
};

global.HELPERS = {
  FormatUtils: {
    formatDuration: vi.fn((ms) => `${Math.round(ms / 60000)} min`),
  },
  TimeUtils: {
    minutesToMs: vi.fn((minutes) => minutes * 60000),
  },
};

// Mock storage manager
const mockStorageManager = {
  get: vi.fn(),
};

describe("Notification System", () => {
  let notificationState;
  let initializeNotificationSystem;
  let createNotification;
  let showBreakReminderNotification;
  let showFocusReminderNotification;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset notification state
    notificationState = {
      activeNotifications: new Map(),
      lastBreakNotificationTime: 0,
      lastFocusNotificationTime: 0,
      notificationPermissionGranted: false,
    };

    // Mock functions that would be in background.js
    initializeNotificationSystem = async () => {
      const permission = await chrome.notifications.getPermissionLevel();
      notificationState.notificationPermissionGranted =
        permission === "granted";
    };

    createNotification = async (notificationId, options) => {
      try {
        if (!notificationState.notificationPermissionGranted) {
          return false;
        }

        if (notificationState.activeNotifications.has(notificationId)) {
          await chrome.notifications.clear(notificationId);
        }

        await chrome.notifications.create(notificationId, {
          type: "basic",
          iconUrl: "/assets/icons/icon48.png",
          ...options,
        });

        notificationState.activeNotifications.set(notificationId, {
          createdAt: Date.now(),
          options: options,
        });

        return true;
      } catch (error) {
        return false;
      }
    };

    showBreakReminderNotification = async (tabId, timeSpent) => {
      const now = Date.now();
      const cooldownMs = CONSTANTS.SCREEN_TIME.NOTIFICATION_COOLDOWN_MS;

      if (now - notificationState.lastBreakNotificationTime < cooldownMs) {
        return false;
      }

      const notificationId = `break-reminder-${tabId}-${now}`;
      const timeFormatted = HELPERS.FormatUtils.formatDuration(timeSpent);

      const success = await createNotification(notificationId, {
        title: "Time for a Break! 🕐",
        message: `You've been on this tab for ${timeFormatted}. Consider taking a short break to rest your eyes and mind.`,
        buttons: [{ title: "Take Break" }, { title: "Continue Working" }],
      });

      if (success) {
        notificationState.lastBreakNotificationTime = now;
      }

      return success;
    };

    showFocusReminderNotification = async (focusUrl, currentUrl) => {
      const now = Date.now();
      const settings = await mockStorageManager.get(
        CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS
      );
      const cooldownMs = HELPERS.TimeUtils.minutesToMs(
        settings?.reminderCooldownMinutes ||
          CONSTANTS.FOCUS.REMINDER_COOLDOWN_MINUTES
      );

      if (now - notificationState.lastFocusNotificationTime < cooldownMs) {
        return false;
      }

      const notificationId = `focus-reminder-${now}`;

      // Safely extract domain names with error handling
      let focusDomain = "unknown";
      let currentDomain = "unknown";

      try {
        focusDomain = new URL(focusUrl).hostname;
      } catch (error) {
        focusDomain = focusUrl || "unknown";
      }

      try {
        if (currentUrl) {
          currentDomain = new URL(currentUrl).hostname;
        }
      } catch (error) {
        currentDomain = currentUrl || "unknown";
      }

      const success = await createNotification(notificationId, {
        title: "Stay Focused! 🎯",
        message: `You switched from ${focusDomain} to ${currentDomain}. Remember to stay focused on your initial task.`,
        buttons: [{ title: "Return to Task" }, { title: "Update Focus" }],
      });

      if (success) {
        notificationState.lastFocusNotificationTime = now;
      }

      return success;
    };
  });

  describe("Notification Permission Handling", () => {
    it("should initialize notification system and check permissions", async () => {
      mockChrome.notifications.getPermissionLevel.mockResolvedValue("granted");

      await initializeNotificationSystem();

      expect(chrome.notifications.getPermissionLevel).toHaveBeenCalled();
      expect(notificationState.notificationPermissionGranted).toBe(true);
    });

    it("should handle denied notification permissions", async () => {
      mockChrome.notifications.getPermissionLevel.mockResolvedValue("denied");

      await initializeNotificationSystem();

      expect(notificationState.notificationPermissionGranted).toBe(false);
    });

    it("should not create notifications when permission is denied", async () => {
      notificationState.notificationPermissionGranted = false;

      const success = await createNotification("test-notification", {
        title: "Test",
        message: "Test message",
      });

      expect(success).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe("Break Reminder Notifications", () => {
    beforeEach(() => {
      notificationState.notificationPermissionGranted = true;
      mockChrome.notifications.create.mockResolvedValue(undefined);
      HELPERS.FormatUtils.formatDuration.mockReturnValue("30 min");
    });

    it("should show break reminder notification", async () => {
      const tabId = 123;
      const timeSpent = 1800000; // 30 minutes

      const success = await showBreakReminderNotification(tabId, timeSpent);

      expect(success).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining("break-reminder-123"),
        expect.objectContaining({
          type: "basic",
          title: "Time for a Break! 🕐",
          message: expect.stringContaining("30 min"),
          buttons: [{ title: "Take Break" }, { title: "Continue Working" }],
        })
      );
      expect(notificationState.activeNotifications.size).toBe(1);
    });

    it("should respect cooldown period for break notifications", async () => {
      const tabId = 123;
      const timeSpent = 1800000;

      // First notification should succeed
      const success1 = await showBreakReminderNotification(tabId, timeSpent);
      expect(success1).toBe(true);

      // Second notification within cooldown should fail
      const success2 = await showBreakReminderNotification(tabId, timeSpent);
      expect(success2).toBe(false);

      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });

    it("should allow break notifications after cooldown period", async () => {
      const tabId = 123;
      const timeSpent = 1800000;

      // First notification
      await showBreakReminderNotification(tabId, timeSpent);

      // Simulate cooldown period passing
      notificationState.lastBreakNotificationTime =
        Date.now() - CONSTANTS.SCREEN_TIME.NOTIFICATION_COOLDOWN_MS - 1000;

      // Second notification should succeed
      const success = await showBreakReminderNotification(tabId, timeSpent);
      expect(success).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("Focus Reminder Notifications", () => {
    beforeEach(() => {
      notificationState.notificationPermissionGranted = true;
      mockChrome.notifications.create.mockResolvedValue(undefined);
      mockStorageManager.get.mockResolvedValue({
        reminderCooldownMinutes: 5,
      });
      HELPERS.TimeUtils.minutesToMs.mockReturnValue(300000); // 5 minutes
    });

    it("should show focus reminder notification", async () => {
      const focusUrl = "https://example.com/work";
      const currentUrl = "https://social.com/distraction";

      const success = await showFocusReminderNotification(focusUrl, currentUrl);

      expect(success).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining("focus-reminder"),
        expect.objectContaining({
          type: "basic",
          title: "Stay Focused! 🎯",
          message: expect.stringContaining("example.com"),
          buttons: [{ title: "Return to Task" }, { title: "Update Focus" }],
        })
      );
    });

    it("should respect cooldown period for focus notifications", async () => {
      const focusUrl = "https://example.com/work";
      const currentUrl = "https://social.com/distraction";

      // First notification should succeed
      const success1 = await showFocusReminderNotification(
        focusUrl,
        currentUrl
      );
      expect(success1).toBe(true);

      // Second notification within cooldown should fail
      const success2 = await showFocusReminderNotification(
        focusUrl,
        currentUrl
      );
      expect(success2).toBe(false);

      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });

    it("should handle URLs without current URL context", async () => {
      const focusUrl = "https://example.com/work";
      const currentUrl = null;

      const success = await showFocusReminderNotification(focusUrl, currentUrl);

      expect(success).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining("focus-reminder"),
        expect.objectContaining({
          message: expect.stringContaining("unknown"),
        })
      );
    });
  });

  describe("Notification Management", () => {
    beforeEach(() => {
      notificationState.notificationPermissionGranted = true;
      mockChrome.notifications.create.mockResolvedValue(undefined);
      mockChrome.notifications.clear.mockResolvedValue(undefined);
    });

    it("should clear existing notification before creating new one with same ID", async () => {
      const notificationId = "test-notification";

      // Add existing notification to state
      notificationState.activeNotifications.set(notificationId, {
        createdAt: Date.now(),
        options: {},
      });

      await createNotification(notificationId, {
        title: "Test",
        message: "Test message",
      });

      expect(chrome.notifications.clear).toHaveBeenCalledWith(notificationId);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        notificationId,
        expect.objectContaining({
          type: "basic",
          iconUrl: "/assets/icons/icon48.png",
          title: "Test",
          message: "Test message",
        })
      );
    });

    it("should track active notifications", async () => {
      const notificationId = "test-notification";

      await createNotification(notificationId, {
        title: "Test",
        message: "Test message",
      });

      expect(notificationState.activeNotifications.has(notificationId)).toBe(
        true
      );
      const notificationData =
        notificationState.activeNotifications.get(notificationId);
      expect(notificationData).toHaveProperty("createdAt");
      expect(notificationData).toHaveProperty("options");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      notificationState.notificationPermissionGranted = true;
    });

    it("should handle notification creation errors gracefully", async () => {
      mockChrome.notifications.create.mockRejectedValue(
        new Error("Notification failed")
      );

      const success = await createNotification("test-notification", {
        title: "Test",
        message: "Test message",
      });

      expect(success).toBe(false);
    });

    it("should handle invalid URLs in focus notifications", async () => {
      const focusUrl = "invalid-url";
      const currentUrl = "https://example.com";

      // Should not throw error, but may not create notification
      await expect(
        showFocusReminderNotification(focusUrl, currentUrl)
      ).resolves.not.toThrow();
    });
  });
});
