/**
 * Break Notification System Error Handling Tests
 * Tests error handling and fallback mechanisms in the BreakNotificationSystem
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    getPermissionLevel: vi.fn()
  }
};

global.chrome = mockChrome;
global.importScripts = vi.fn();

// Import classes to test
import BreakNotificationSystem from '../services/break-notification-system.js';
import BreakErrorHandler from '../utils/break-error-handler.js';

describe('BreakNotificationSystem Error Handling', () => {
  let breakNotificationSystem;
  let mockStorageManager;
  let mockBreakErrorHandler;
  let mockBreakTimerManager;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock dependencies
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn()
    };
    
    mockBreakErrorHandler = {
      init: vi.fn(),
      validateAndSanitizeBreakData: vi.fn(),
      handleNotificationFailure: vi.fn(),
      handleChromeApiUnavailable: vi.fn(),
      showUserFeedback: vi.fn()
    };
    
    mockBreakTimerManager = {
      areNotificationsEnabled: vi.fn().mockReturnValue(true),
      getTimerStatus: vi.fn().mockReturnValue({
        isOnBreak: false,
        isWorkTimerActive: true
      }),
      startBreak: vi.fn().mockResolvedValue(true),
      resetWorkTimer: vi.fn().mockResolvedValue(true)
    };
    
    breakNotificationSystem = new BreakNotificationSystem();
    breakNotificationSystem.storageManager = mockStorageManager;
    breakNotificationSystem.breakErrorHandler = mockBreakErrorHandler;
    breakNotificationSystem.breakTimerManager = mockBreakTimerManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization Error Handling', () => {
    it('should initialize fallback mode when normal initialization fails', async () => {
      mockBreakErrorHandler.init.mockRejectedValue(new Error('Initialization failed'));

      await breakNotificationSystem.init();

      // Should not throw and should have basic functionality
      expect(breakNotificationSystem.notificationPermissionGranted).toBe(false);
      expect(breakNotificationSystem.breakErrorHandler).toBeDefined();
    });

    it('should create minimal error handler in fallback mode', async () => {
      breakNotificationSystem.breakErrorHandler = null;

      await breakNotificationSystem.initializeFallbackMode();

      expect(breakNotificationSystem.breakErrorHandler).toBeDefined();
      expect(typeof breakNotificationSystem.breakErrorHandler.handleNotificationFailure).toBe('function');
    });
  });

  describe('Permission Checking Error Handling', () => {
    it('should handle Chrome notifications API unavailability', async () => {
      mockChrome.notifications.getPermissionLevel.mockRejectedValue(new Error('API unavailable'));

      mockBreakErrorHandler.handleChromeApiUnavailable.mockResolvedValue({
        success: false,
        fallbackMode: true
      });

      const result = await breakNotificationSystem.checkNotificationPermissionWithErrorHandling();

      expect(result).toBe(false);
      expect(mockBreakErrorHandler.handleChromeApiUnavailable).toHaveBeenCalledWith(
        'notifications',
        'getPermissionLevel'
      );
    });

    it('should handle permission check success', async () => {
      mockChrome.notifications.getPermissionLevel.mockResolvedValue('granted');

      const result = await breakNotificationSystem.checkNotificationPermissionWithErrorHandling();

      expect(result).toBe(true);
      expect(breakNotificationSystem.notificationPermissionGranted).toBe(true);
    });
  });

  describe('Notification Creation Error Handling', () => {
    it('should validate notification data before creation', async () => {
      const options = {
        title: '<script>alert("xss")</script>Test',
        message: 'Test message'
      };

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: false,
        sanitizedData: {
          title: 'Test',
          message: 'Test message'
        },
        errors: ['Invalid title format']
      });

      breakNotificationSystem.notificationPermissionGranted = true;
      mockChrome.notifications.create.mockResolvedValue();

      await breakNotificationSystem.createNotification('test_id', options);

      expect(mockBreakErrorHandler.validateAndSanitizeBreakData).toHaveBeenCalled();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        'test_id',
        expect.objectContaining({
          title: 'Test',
          message: 'Test message'
        })
      );
    });

    it('should handle permission denied with fallback', async () => {
      const options = {
        title: 'Test Notification',
        message: 'Test message'
      };

      breakNotificationSystem.notificationPermissionGranted = false;

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: options,
        errors: []
      });

      mockBreakErrorHandler.handleNotificationFailure.mockResolvedValue({
        success: true,
        method: 'badge_notification'
      });

      const result = await breakNotificationSystem.createNotification('test_id', options);

      expect(result).toBe(true);
      expect(mockBreakErrorHandler.handleNotificationFailure).toHaveBeenCalledWith(
        { title: options.title, message: options.message },
        expect.any(Error),
        'permission_denied'
      );
    });

    it('should handle notification creation failure with fallback', async () => {
      const options = {
        title: 'Test Notification',
        message: 'Test message'
      };

      breakNotificationSystem.notificationPermissionGranted = true;
      mockChrome.notifications.create.mockRejectedValue(new Error('Notification creation failed'));

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: options,
        errors: []
      });

      mockBreakErrorHandler.handleNotificationFailure.mockResolvedValue({
        success: true,
        method: 'console_notification'
      });

      const result = await breakNotificationSystem.createNotification('test_id', options);

      expect(result).toBe(true);
      expect(mockBreakErrorHandler.handleNotificationFailure).toHaveBeenCalledWith(
        { title: options.title, message: options.message },
        expect.any(Error),
        'create_notification'
      );
    });

    it('should handle complete notification failure', async () => {
      const options = {
        title: 'Test Notification',
        message: 'Test message'
      };

      breakNotificationSystem.notificationPermissionGranted = true;
      mockChrome.notifications.create.mockRejectedValue(new Error('Complete failure'));

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: options,
        errors: []
      });

      mockBreakErrorHandler.handleNotificationFailure.mockResolvedValue({
        success: false,
        error: 'All fallbacks failed'
      });

      const result = await breakNotificationSystem.createNotification('test_id', options);

      expect(result).toBe(false);
    });
  });

  describe('Work Time Threshold Notification Error Handling', () => {
    it('should handle disabled notifications gracefully', async () => {
      mockBreakTimerManager.areNotificationsEnabled.mockReturnValue(false);

      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(30);

      expect(result).toBe(false);
      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });

    it('should handle cooldown period correctly', async () => {
      breakNotificationSystem.lastBreakNotificationTime = Date.now() - 1000; // 1 second ago
      breakNotificationSystem.cooldownPeriod = 5000; // 5 seconds

      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(30);

      expect(result).toBe(false);
      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });

    it('should handle user already on break', async () => {
      mockBreakTimerManager.getTimerStatus.mockReturnValue({
        isOnBreak: true,
        isWorkTimerActive: false
      });

      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(30);

      expect(result).toBe(false);
      expect(mockChrome.notifications.create).not.toHaveBeenCalled();
    });

    it('should handle notification creation errors during threshold notification', async () => {
      breakNotificationSystem.notificationPermissionGranted = true;
      breakNotificationSystem.lastBreakNotificationTime = 0; // No cooldown

      mockChrome.notifications.create.mockRejectedValue(new Error('Notification failed'));

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: { title: 'Break Reminder! ⏰', message: 'Test' },
        errors: []
      });

      mockBreakErrorHandler.handleNotificationFailure.mockResolvedValue({
        success: true,
        method: 'badge_notification'
      });

      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(30);

      expect(result).toBe(true);
      expect(mockBreakErrorHandler.handleNotificationFailure).toHaveBeenCalled();
    });
  });

  describe('Break Completion Notification Error Handling', () => {
    it('should handle break completion notification errors', async () => {
      breakNotificationSystem.notificationPermissionGranted = true;
      mockChrome.notifications.create.mockRejectedValue(new Error('Notification failed'));

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: { title: 'Break Complete! 🎯', message: 'Test' },
        errors: []
      });

      mockBreakErrorHandler.handleNotificationFailure.mockResolvedValue({
        success: true,
        method: 'title_notification'
      });

      const result = await breakNotificationSystem.showBreakCompletionNotification('short');

      expect(result).toBe(true);
      expect(mockBreakErrorHandler.handleNotificationFailure).toHaveBeenCalled();
    });
  });

  describe('Notification Interaction Error Handling', () => {
    it('should handle notification click errors gracefully', async () => {
      mockChrome.notifications.clear.mockRejectedValue(new Error('Clear failed'));

      const result = await breakNotificationSystem.handleNotificationClick('test_notification');

      // Should still return true even if clearing fails
      expect(result).toBe(true);
    });

    it('should handle notification button click errors', async () => {
      const notificationId = 'break-timer-123';
      const buttonIndex = 0;

      mockChrome.notifications.clear.mockResolvedValue();
      mockBreakTimerManager.startBreak.mockResolvedValue(false); // Simulate failure but no exception

      const result = await breakNotificationSystem.handleNotificationButtonClick(notificationId, buttonIndex);

      // Should still return true even if break start fails (graceful handling)
      expect(result).toBe(true);
    });

    it('should handle notification dismissal tracking', async () => {
      const notificationId = 'break-timer-456';
      
      breakNotificationSystem.activeNotifications.set(notificationId, {
        createdAt: Date.now(),
        options: {}
      });

      mockBreakTimerManager.resetWorkTimer.mockResolvedValue(true);

      const result = await breakNotificationSystem.handleNotificationDismissal(notificationId, true);

      expect(result).toBe(true);
      expect(breakNotificationSystem.activeNotifications.has(notificationId)).toBe(false);
    });
  });

  describe('Notification Clearing Error Handling', () => {
    it('should handle individual notification clearing errors', async () => {
      mockChrome.notifications.clear.mockRejectedValue(new Error('Clear failed'));

      const result = await breakNotificationSystem.clearNotification('test_id');

      expect(result).toBe(false);
    });

    it('should handle clearing all notifications with some failures', async () => {
      breakNotificationSystem.activeNotifications.set('notification_1', {});
      breakNotificationSystem.activeNotifications.set('notification_2', {});
      breakNotificationSystem.activeNotifications.set('notification_3', {});

      // Mock some successes and some failures
      mockChrome.notifications.clear
        .mockResolvedValueOnce() // notification_1 succeeds
        .mockRejectedValueOnce(new Error('Clear failed')) // notification_2 fails
        .mockResolvedValueOnce(); // notification_3 succeeds

      const result = await breakNotificationSystem.clearAllNotifications();

      expect(result).toBe(true); // Should still return true
      expect(breakNotificationSystem.activeNotifications.size).toBe(0);
    });
  });

  describe('Break Type Update Error Handling', () => {
    it('should handle storage errors during break type updates', async () => {
      const newBreakTypes = {
        short: { duration: 3, label: "Quick Break (3 min)" },
        medium: { duration: 10, label: "Medium Break (10 min)" },
        long: { duration: 20, label: "Long Break (20 min)" }
      };

      mockStorageManager.get.mockResolvedValue({});
      mockStorageManager.set.mockRejectedValue(new Error('Storage quota exceeded'));

      const result = await breakNotificationSystem.updateBreakTypes(newBreakTypes);

      expect(result).toBe(false);
      expect(breakNotificationSystem.breakTypes).toEqual(expect.objectContaining(newBreakTypes));
    });

    it('should handle storage unavailability during break type updates', async () => {
      const newBreakTypes = {
        short: { duration: 3, label: "Quick Break (3 min)" }
      };

      mockStorageManager.get.mockRejectedValue(new Error('Storage API unavailable'));
      mockStorageManager.set.mockRejectedValue(new Error('Storage API unavailable'));

      const result = await breakNotificationSystem.updateBreakTypes(newBreakTypes);

      // Should still update in-memory break types even if storage fails
      expect(breakNotificationSystem.breakTypes).toEqual(expect.objectContaining(newBreakTypes));
    });
  });

  describe('Notification Status and Statistics', () => {
    it('should return notification status even with errors', () => {
      breakNotificationSystem.notificationPermissionGranted = true;
      breakNotificationSystem.activeNotifications.set('test_1', {});
      breakNotificationSystem.activeNotifications.set('test_2', {});
      breakNotificationSystem.lastBreakNotificationTime = Date.now() - 1000;
      breakNotificationSystem.cooldownPeriod = 5000;

      const status = breakNotificationSystem.getNotificationStatus();

      expect(status).toEqual({
        permissionGranted: true,
        activeNotifications: 2,
        lastNotificationTime: expect.any(Number),
        cooldownRemaining: expect.any(Number)
      });
    });
  });

  describe('Integration Error Scenarios', () => {
    it('should handle complete system failure gracefully', async () => {
      // Simulate complete Chrome API failure
      mockChrome.notifications.getPermissionLevel.mockRejectedValue(new Error('API unavailable'));
      mockChrome.notifications.create.mockRejectedValue(new Error('API unavailable'));
      mockChrome.notifications.clear.mockRejectedValue(new Error('API unavailable'));

      // Initialize in fallback mode
      await breakNotificationSystem.initializeFallbackMode();

      // Try to show notification
      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(30);

      // Should not throw errors and should handle gracefully
      expect(typeof result).toBe('boolean');
    });

    it('should maintain functionality with partial API failures', async () => {
      // Permission check works, but notification creation fails
      mockChrome.notifications.getPermissionLevel.mockResolvedValue('granted');
      mockChrome.notifications.create.mockRejectedValue(new Error('Create failed'));

      breakNotificationSystem.notificationPermissionGranted = true;

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: { title: 'Test', message: 'Test' },
        errors: []
      });

      mockBreakErrorHandler.handleNotificationFailure.mockResolvedValue({
        success: true,
        method: 'badge_notification'
      });

      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(30);

      expect(result).toBe(true);
      expect(mockBreakErrorHandler.handleNotificationFailure).toHaveBeenCalled();
    });
  });
});