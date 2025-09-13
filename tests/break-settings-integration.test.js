/**
 * Break Settings Integration Tests
 * Tests for break reminder settings integration with timer manager and notifications
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Break Settings Integration', () => {
  let breakTimerManager;
  let breakNotificationSystem;
  let settingsManager;
  let mockStorageManager;

  beforeEach(() => {
    // Mock StorageManager
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
      setMultiple: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    };

    // Mock global dependencies
    global.StorageManager = vi.fn(() => mockStorageManager);
    global.importScripts = vi.fn();
    global.chrome = {
      storage: { local: mockStorageManager },
      notifications: {
        create: vi.fn(),
        clear: vi.fn(),
        getPermissionLevel: vi.fn().mockResolvedValue('granted')
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
        setTitle: vi.fn()
      },
      windows: {
        onFocusChanged: {
          addListener: vi.fn()
        },
        WINDOW_ID_NONE: -1
      }
    };

    // Import classes
    const BreakSettingsManager = require('../services/break-settings-manager.js');
    const BreakTimerManager = require('../services/break-timer-manager.js');
    const BreakNotificationSystem = require('../services/break-notification-system.js');

    settingsManager = new BreakSettingsManager();
    settingsManager.storageManager = mockStorageManager;

    breakTimerManager = new BreakTimerManager();
    breakTimerManager.storageManager = mockStorageManager;
    breakTimerManager.settingsManager = settingsManager;

    breakNotificationSystem = new BreakNotificationSystem();
    breakNotificationSystem.storageManager = mockStorageManager;
    breakNotificationSystem.setBreakTimerManager(breakTimerManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Settings and Timer Manager Integration', () => {
    test('should load work time threshold from settings manager', async () => {
      const customSettings = {
        workTimeThresholdMinutes: 45,
        notificationsEnabled: true,
        breakTypes: {
          short: { duration: 5, label: "Short Break (5 min)" },
          medium: { duration: 15, label: "Medium Break (15 min)" },
          long: { duration: 30, label: "Long Break (30 min)" }
        },
        version: 1
      };

      mockStorageManager.get.mockResolvedValue(customSettings);
      mockStorageManager.set.mockResolvedValue(true);
      mockStorageManager.setMultiple.mockResolvedValue(true);

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      expect(breakTimerManager.workTimeThreshold).toBe(45 * 60 * 1000);
    });

    test('should update timer threshold when settings change', async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      // Initial threshold should be default (30 minutes)
      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);

      // Update settings
      await settingsManager.updateWorkTimeThreshold(60);
      await breakTimerManager.updateWorkTimeThreshold(60);

      expect(breakTimerManager.workTimeThreshold).toBe(60 * 60 * 1000);
    });

    test('should check notifications enabled setting', async () => {
      mockStorageManager.get.mockResolvedValue({
        workTimeThresholdMinutes: 30,
        notificationsEnabled: false,
        breakTypes: {},
        version: 1
      });

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      expect(breakTimerManager.areNotificationsEnabled()).toBe(false);
    });

    test('should handle missing settings manager gracefully', async () => {
      breakTimerManager.settingsManager = null;

      await breakTimerManager.loadSettingsFromManager();

      // Should fall back to default threshold
      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);
      expect(breakTimerManager.areNotificationsEnabled()).toBe(true);
    });
  });

  describe('Settings and Notification System Integration', () => {
    test('should respect notifications disabled setting', async () => {
      mockStorageManager.get.mockResolvedValue({
        workTimeThresholdMinutes: 30,
        notificationsEnabled: false,
        breakTypes: {},
        version: 1
      });

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      // Mock timer status
      breakTimerManager.getTimerStatus = vi.fn().mockReturnValue({
        isOnBreak: false,
        currentWorkTime: 31 * 60 * 1000 // Over threshold
      });

      const notificationShown = await breakNotificationSystem.showWorkTimeThresholdNotification(31);

      expect(notificationShown).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    test('should show notifications when enabled', async () => {
      mockStorageManager.get.mockResolvedValue({
        workTimeThresholdMinutes: 30,
        notificationsEnabled: true,
        breakTypes: {},
        version: 1
      });

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      // Mock timer status
      breakTimerManager.getTimerStatus = vi.fn().mockReturnValue({
        isOnBreak: false,
        currentWorkTime: 31 * 60 * 1000 // Over threshold
      });

      chrome.notifications.create.mockResolvedValue();

      const notificationShown = await breakNotificationSystem.showWorkTimeThresholdNotification(31);

      expect(notificationShown).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalled();
    });

    test('should not show notifications when already on break', async () => {
      mockStorageManager.get.mockResolvedValue({
        workTimeThresholdMinutes: 30,
        notificationsEnabled: true,
        breakTypes: {},
        version: 1
      });

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      // Mock timer status - already on break
      breakTimerManager.getTimerStatus = vi.fn().mockReturnValue({
        isOnBreak: true,
        currentWorkTime: 31 * 60 * 1000
      });

      const notificationShown = await breakNotificationSystem.showWorkTimeThresholdNotification(31);

      expect(notificationShown).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('Settings Persistence Integration', () => {
    test('should persist settings changes across components', async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);
      mockStorageManager.setMultiple.mockResolvedValue(true);

      // Initialize with defaults
      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);

      // Update settings through settings manager
      await settingsManager.updateWorkTimeThreshold(45);

      // Update timer manager with new settings
      await breakTimerManager.updateWorkTimeThreshold(45);

      expect(breakTimerManager.workTimeThreshold).toBe(45 * 60 * 1000);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'breakSettings',
        expect.objectContaining({ workTimeThresholdMinutes: 45 })
      );
    });

    test('should handle storage errors gracefully', async () => {
      mockStorageManager.get.mockRejectedValue(new Error('Storage error'));
      mockStorageManager.set.mockResolvedValue(false);

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      // Should fall back to defaults
      expect(settingsManager.settings).toEqual(settingsManager.DEFAULT_SETTINGS);
      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);

      // Update should fail gracefully
      const success = await settingsManager.updateWorkTimeThreshold(45);
      expect(success).toBe(false);
    });
  });

  describe('Settings Validation Integration', () => {
    test('should validate settings before applying to timer manager', async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);

      await settingsManager.loadSettings();

      // Try to set invalid threshold
      const success = await settingsManager.updateWorkTimeThreshold(200); // Invalid: > 180
      expect(success).toBe(false);

      // Timer manager should still have default threshold
      await breakTimerManager.loadSettingsFromManager();
      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);
    });

    test('should handle corrupted settings data', async () => {
      // Mock corrupted settings data
      mockStorageManager.get.mockResolvedValue({
        workTimeThresholdMinutes: 'invalid',
        notificationsEnabled: 'not_boolean',
        breakTypes: null
      });
      mockStorageManager.set.mockResolvedValue(true);

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      // Should merge with defaults and handle invalid data
      expect(settingsManager.settings.workTimeThresholdMinutes).toBe(30);
      expect(settingsManager.settings.notificationsEnabled).toBe(true);
      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    test('should handle complete settings workflow', async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);
      mockStorageManager.setMultiple.mockResolvedValue(true);

      // 1. Initialize with defaults
      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);
      expect(breakTimerManager.areNotificationsEnabled()).toBe(true);

      // 2. User changes work time threshold to 45 minutes
      await settingsManager.updateWorkTimeThreshold(45);
      await breakTimerManager.updateWorkTimeThreshold(45);

      expect(breakTimerManager.workTimeThreshold).toBe(45 * 60 * 1000);

      // 3. User disables notifications
      await settingsManager.updateNotificationsEnabled(false);

      expect(breakTimerManager.areNotificationsEnabled()).toBe(false);

      // 4. Notification system should respect disabled setting
      breakTimerManager.getTimerStatus = vi.fn().mockReturnValue({
        isOnBreak: false,
        currentWorkTime: 46 * 60 * 1000 // Over threshold
      });

      const notificationShown = await breakNotificationSystem.showWorkTimeThresholdNotification(46);
      expect(notificationShown).toBe(false);

      // 5. User re-enables notifications
      await settingsManager.updateNotificationsEnabled(true);

      expect(breakTimerManager.areNotificationsEnabled()).toBe(true);

      // 6. Notification should now be shown
      chrome.notifications.create.mockResolvedValue();
      const notificationShownAfterEnable = await breakNotificationSystem.showWorkTimeThresholdNotification(46);
      expect(notificationShownAfterEnable).toBe(true);
    });

    test('should handle settings reset scenario', async () => {
      // Start with custom settings
      const customSettings = {
        workTimeThresholdMinutes: 60,
        notificationsEnabled: false,
        breakTypes: {
          short: { duration: 3, label: "Quick Break (3 min)" },
          medium: { duration: 10, label: "Medium Break (10 min)" },
          long: { duration: 20, label: "Long Break (20 min)" }
        },
        version: 1
      };

      mockStorageManager.get.mockResolvedValue(customSettings);
      mockStorageManager.set.mockResolvedValue(true);

      await settingsManager.loadSettings();
      await breakTimerManager.loadSettingsFromManager();

      expect(breakTimerManager.workTimeThreshold).toBe(60 * 60 * 1000);
      expect(breakTimerManager.areNotificationsEnabled()).toBe(false);

      // Reset to defaults
      await settingsManager.resetToDefaults();
      await breakTimerManager.loadSettingsFromManager();

      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);
      expect(breakTimerManager.areNotificationsEnabled()).toBe(true);
      expect(settingsManager.getBreakTypes()).toEqual(settingsManager.DEFAULT_SETTINGS.breakTypes);
    });
  });
});