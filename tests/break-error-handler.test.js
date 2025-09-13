/**
 * Break Error Handler Tests
 * Comprehensive tests for error handling and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    getPermissionLevel: vi.fn()
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setTitle: vi.fn()
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn()
  }
};

global.chrome = mockChrome;
global.importScripts = vi.fn();

// Import the class to test
import BreakErrorHandler from '../utils/break-error-handler.js';

describe('BreakErrorHandler', () => {
  let breakErrorHandler;
  let mockStorageManager;
  let mockErrorHandler;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock dependencies
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
      setMultiple: vi.fn()
    };
    
    mockErrorHandler = {
      showUserFeedback: vi.fn()
    };
    
    breakErrorHandler = new BreakErrorHandler();
    breakErrorHandler.storageManager = mockStorageManager;
    breakErrorHandler.errorHandler = mockErrorHandler;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Timer State Corruption Handling', () => {
    it('should recover valid timer state from corrupted data', async () => {
      const corruptedState = {
        isWorkTimerActive: true,
        workStartTime: Date.now() - 1000000, // 16 minutes ago
        totalWorkTime: 900000, // 15 minutes
        workTimeThreshold: 1800000, // 30 minutes
        lastActivityTime: Date.now() - 60000, // 1 minute ago
        isOnBreak: false,
        breakType: null
      };

      mockStorageManager.setMultiple.mockResolvedValue(true);

      const result = await breakErrorHandler.handleTimerStateCorruption(corruptedState, 'test');

      expect(result.success).toBe(true);
      expect(result.recoveredState).toBeDefined();
      expect(result.recoveredState.isWorkTimerActive).toBe(true);
      expect(result.recoveredState.workTimeThreshold).toBe(1800000);
      expect(mockStorageManager.setMultiple).toHaveBeenCalled();
    });

    it('should reset to clean state when recovery fails', async () => {
      const corruptedState = {
        isWorkTimerActive: "invalid",
        workStartTime: "not_a_timestamp",
        totalWorkTime: -1000,
        workTimeThreshold: "invalid_threshold"
      };

      // Mock the recovery to fail, triggering fallback
      breakErrorHandler.recoverTimerState = vi.fn().mockResolvedValue({
        success: false,
        error: 'Recovery failed'
      });

      mockStorageManager.setMultiple.mockResolvedValue(true);

      const result = await breakErrorHandler.handleTimerStateCorruption(corruptedState, 'test');

      expect(result.success).toBe(true);
      expect(result.wasReset).toBe(true);
      expect(result.recoveredState.isWorkTimerActive).toBe(false);
      expect(result.recoveredState.totalWorkTime).toBe(0);
    });

    it('should handle storage errors during recovery', async () => {
      const corruptedState = { isWorkTimerActive: true };
      
      // Mock the recovery to fail due to storage error
      breakErrorHandler.recoverTimerState = vi.fn().mockRejectedValue(new Error('Storage error'));
      mockStorageManager.setMultiple.mockResolvedValue(true); // Fallback storage should work

      const result = await breakErrorHandler.handleTimerStateCorruption(corruptedState, 'test');

      expect(result.success).toBe(true); // Should still succeed with fallback
      expect(result.wasReset).toBe(true);
    });

    it('should respect error cooldown periods', async () => {
      const corruptedState = { isWorkTimerActive: true };
      
      // First call
      await breakErrorHandler.handleTimerStateCorruption(corruptedState, 'test');
      
      // Second call immediately after (should be in cooldown)
      const result = await breakErrorHandler.handleTimerStateCorruption(corruptedState, 'test');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('cooldown');
    });
  });

  describe('Notification Failure Handling', () => {
    it('should try basic notification fallback', async () => {
      const notificationData = {
        title: "Test Notification",
        message: "Test message"
      };
      
      mockChrome.notifications.create.mockResolvedValue();

      const result = await breakErrorHandler.handleNotificationFailure(
        notificationData, 
        new Error('Button notification failed'), 
        'test'
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('basic_notification');
    });

    it('should try badge notification when basic fails', async () => {
      const notificationData = {
        title: "Test Notification",
        message: "Test message"
      };
      
      mockChrome.notifications.create.mockRejectedValue(new Error('Notification API failed'));
      mockChrome.action.setBadgeText.mockResolvedValue();
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue();
      mockChrome.action.setTitle.mockResolvedValue();

      const result = await breakErrorHandler.handleNotificationFailure(
        notificationData, 
        new Error('Notification failed'), 
        'test'
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('badge_notification');
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: "!" });
    });

    it('should fall back to console notification when all else fails', async () => {
      const notificationData = {
        title: "Test Notification",
        message: "Test message"
      };
      
      // Mock all Chrome APIs to fail
      mockChrome.notifications.create.mockRejectedValue(new Error('API failed'));
      mockChrome.action.setBadgeText.mockRejectedValue(new Error('API failed'));
      mockChrome.action.setTitle.mockRejectedValue(new Error('API failed'));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await breakErrorHandler.handleNotificationFailure(
        notificationData, 
        new Error('All notifications failed'), 
        'test'
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('console_notification');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Chrome API Unavailability Handling', () => {
    it('should handle notifications API unavailability', async () => {
      const result = await breakErrorHandler.handleChromeApiUnavailable(
        'notifications', 
        'create', 
        { title: 'Test', message: 'Test message' }
      );

      expect(result.fallbackMode).toBe(true);
      expect(breakErrorHandler.fallbackMode).toBe(true);
    });

    it('should handle storage API unavailability with localStorage fallback', async () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn()
      };
      global.localStorage = mockLocalStorage;

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ test: 'data' }));

      const result = await breakErrorHandler.handleChromeApiUnavailable(
        'storage', 
        'get', 
        { key: 'test_key' }
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('localStorage');
      expect(result.fallbackMode).toBe(true);
    });

    it('should handle alarms API unavailability with setTimeout fallback', async () => {
      vi.useFakeTimers();
      
      const result = await breakErrorHandler.handleChromeApiUnavailable(
        'alarms', 
        'create', 
        { name: 'test_alarm', delayInMinutes: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('setTimeout');
      expect(result.fallbackMode).toBe(true);
      expect(breakErrorHandler.fallbackAlarms.has('test_alarm')).toBe(true);
      
      vi.useRealTimers();
    });

    it('should handle action API unavailability with in-memory fallback', async () => {
      const result = await breakErrorHandler.handleChromeApiUnavailable(
        'action', 
        'setBadgeText', 
        { text: 'Test' }
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('in_memory_badge');
      expect(result.fallbackMode).toBe(true);
      expect(breakErrorHandler.fallbackActionState.badgeText).toBe('Test');
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should validate and sanitize break type', () => {
      const data = {
        breakType: 'invalid_type',
        duration: 5,
        startTime: Date.now()
      };

      const result = breakErrorHandler.validateAndSanitizeBreakData(data, 'test');

      expect(result.isValid).toBe(false);
      expect(result.sanitizedData.breakType).toBe('short'); // Default fallback
      expect(result.errors).toContain('Invalid break type: invalid_type');
    });

    it('should validate and sanitize duration', () => {
      const data = {
        breakType: 'short',
        duration: -5, // Invalid negative duration
        startTime: Date.now()
      };

      const result = breakErrorHandler.validateAndSanitizeBreakData(data, 'test');

      expect(result.isValid).toBe(false);
      expect(result.sanitizedData.duration).toBe(5); // Default fallback
      expect(result.errors).toContain('Invalid duration: -5');
    });

    it('should validate and sanitize timestamps', () => {
      const data = {
        breakType: 'short',
        duration: 5,
        startTime: 'invalid_timestamp',
        endTime: Date.now() + (48 * 60 * 60 * 1000) // 48 hours in future (invalid)
      };

      const result = breakErrorHandler.validateAndSanitizeBreakData(data, 'test');

      expect(result.isValid).toBe(false);
      expect(result.sanitizedData.startTime).toBeCloseTo(Date.now(), -3); // Should be current time
      expect(result.sanitizedData.endTime).toBeCloseTo(Date.now(), -3); // Should be current time
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate work time values', () => {
      const data = {
        workTime: -1000, // Invalid negative work time
        workTimeThreshold: 2 * 60 * 1000 // 2 minutes (too short)
      };

      const result = breakErrorHandler.validateAndSanitizeBreakData(data, 'test');

      expect(result.isValid).toBe(false);
      expect(result.sanitizedData.workTime).toBe(0);
      expect(result.sanitizedData.workTimeThreshold).toBe(30 * 60 * 1000); // Default 30 minutes
    });

    it('should sanitize string fields', () => {
      const data = {
        message: '<script>alert("xss")</script>Test message',
        title: 'Test<>Title',
        context: 'A'.repeat(600) // Too long
      };

      const result = breakErrorHandler.validateAndSanitizeBreakData(data, 'test');

      expect(result.sanitizedData.message).toBe('scriptalert("xss")/scriptTest message');
      expect(result.sanitizedData.title).toBe('TestTitle');
      expect(result.sanitizedData.context.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Error Tracking and Statistics', () => {
    it('should track error counts', () => {
      breakErrorHandler.recordError('TEST_ERROR');
      breakErrorHandler.recordError('TEST_ERROR');
      breakErrorHandler.recordError('ANOTHER_ERROR');

      const stats = breakErrorHandler.getErrorStats();

      expect(stats.errorCounts.TEST_ERROR).toBe(2);
      expect(stats.errorCounts.ANOTHER_ERROR).toBe(1);
    });

    it('should respect error cooldown periods', () => {
      breakErrorHandler.recordError('TEST_ERROR');
      
      expect(breakErrorHandler.isInErrorCooldown('TEST_ERROR')).toBe(true);
      expect(breakErrorHandler.isInErrorCooldown('OTHER_ERROR')).toBe(false);
    });

    it('should reset error tracking', () => {
      breakErrorHandler.recordError('TEST_ERROR');
      breakErrorHandler.resetErrorTracking();

      const stats = breakErrorHandler.getErrorStats();

      expect(Object.keys(stats.errorCounts)).toHaveLength(0);
      expect(stats.fallbackMode).toBe(false);
    });
  });

  describe('Fallback Functionality', () => {
    it('should store and retrieve fallback notifications', () => {
      const notification = {
        title: 'Test Notification',
        message: 'Test message'
      };

      // Simulate fallback notification creation
      breakErrorHandler.fallbackNotifications = [];
      breakErrorHandler.fallbackNotifications.push({
        id: 'test_1',
        ...notification,
        timestamp: Date.now(),
        type: 'fallback'
      });

      const notifications = breakErrorHandler.getFallbackNotifications();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Test Notification');
    });

    it('should limit fallback notifications to 5', async () => {
      // Create 7 fallback notifications
      for (let i = 0; i < 7; i++) {
        await breakErrorHandler.handleNotificationApiFallback('create', {
          title: `Notification ${i}`,
          message: `Message ${i}`
        });
      }

      const notifications = breakErrorHandler.getFallbackNotifications();

      expect(notifications).toHaveLength(5); // Should be limited to 5
    });

    it('should clear fallback notifications', () => {
      breakErrorHandler.fallbackNotifications = [
        { id: 'test_1', title: 'Test 1' },
        { id: 'test_2', title: 'Test 2' }
      ];

      breakErrorHandler.clearFallbackNotifications();

      expect(breakErrorHandler.getFallbackNotifications()).toHaveLength(0);
    });
  });

  describe('Permission Handling', () => {
    it('should request notification permission in Chrome extension context', async () => {
      mockChrome.notifications.getPermissionLevel.mockResolvedValue('granted');

      const result = await breakErrorHandler.requestNotificationPermission();

      expect(result).toBe(true);
      expect(mockChrome.notifications.getPermissionLevel).toHaveBeenCalled();
    });

    it('should handle permission request failures', async () => {
      mockChrome.notifications.getPermissionLevel.mockRejectedValue(new Error('Permission error'));

      const result = await breakErrorHandler.requestNotificationPermission();

      expect(result).toBe(false);
    });
  });

  describe('Integration with Main Error Handler', () => {
    it('should delegate user feedback to main error handler', () => {
      breakErrorHandler.showUserFeedback('Test message', 'error', { context: 'Test' });

      expect(mockErrorHandler.showUserFeedback).toHaveBeenCalledWith(
        'Test message',
        'error',
        { context: 'Test' }
      );
    });

    it('should fall back to console logging when main error handler unavailable', () => {
      breakErrorHandler.errorHandler = null;
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      breakErrorHandler.showUserFeedback('Test message', 'warning');

      expect(consoleSpy).toHaveBeenCalledWith('User Feedback [WARNING]: Test message');
      
      consoleSpy.mockRestore();
    });
  });
});