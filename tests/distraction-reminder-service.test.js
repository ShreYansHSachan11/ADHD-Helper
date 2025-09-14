/**
 * Distraction Reminder Service Tests
 * Tests for the distraction reminder popup system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    getPermissionLevel: vi.fn().mockResolvedValue('granted'),
  },
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
  },
};

// Mock global classes
global.StorageManager = class {
  constructor() {}
  get() { return Promise.resolve({}); }
  set() { return Promise.resolve(); }
};

// Import the service after mocking - load as text and evaluate
import fs from 'fs';
import path from 'path';

const serviceCode = fs.readFileSync(
  path.resolve('./services/distraction-reminder-service.js'), 
  'utf8'
);

// Evaluate the service code to make DistractionReminderService available
eval(serviceCode);
const DistractionReminderService = global.DistractionReminderService;

describe('DistractionReminderService', () => {
  let service;
  let mockTabTracker;
  let mockBreakTimerManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock dependencies
    mockTabTracker = {
      getFocusTabInfo: vi.fn().mockReturnValue({
        isSet: true,
        tabId: 123,
        url: 'https://example.com'
      }),
      getFocusSessionStats: vi.fn().mockResolvedValue({
        isCurrentlyOnFocus: false,
        deviationCount: 3,
        sessionTime: 300000 // 5 minutes
      })
    };

    mockBreakTimerManager = {
      getTimerStatus: vi.fn().mockReturnValue({
        isOnBreak: false,
        isWorkTimerActive: true
      }),
      startBreak: vi.fn().mockResolvedValue(true)
    };

    // Create service instance
    service = new DistractionReminderService();
    service.setDependencies(mockTabTracker, mockBreakTimerManager);
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default preferences', () => {
      expect(service.preferences.enabled).toBe(true);
      expect(service.preferences.reminderStyle).toBe('gentle');
      expect(service.preferences.frequency).toBe('adaptive');
    });

    it('should set up monitoring interval when enabled', async () => {
      const spy = vi.spyOn(global, 'setInterval');
      await service.startMonitoring();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Smart Timing Logic', () => {
    it('should not show reminder if user is currently focused', async () => {
      mockTabTracker.getFocusSessionStats.mockResolvedValue({
        isCurrentlyOnFocus: true,
        deviationCount: 5
      });

      const shouldShow = await service.shouldShowReminder({ deviationCount: 5 });
      expect(shouldShow).toBe(false);
    });

    it('should show reminder based on deviation count and style', async () => {
      service.preferences.reminderStyle = 'gentle';
      service.lastReminderTime = 0; // No previous reminders
      
      // Gentle style requires 3+ deviations
      let shouldShow = await service.shouldShowReminder({ deviationCount: 2 });
      expect(shouldShow).toBe(false);
      
      shouldShow = await service.shouldShowReminder({ deviationCount: 3 });
      expect(shouldShow).toBe(true);
    });

    it('should respect cooldown periods', async () => {
      service.lastReminderTime = Date.now() - 1000; // 1 second ago
      service.config.baseReminderCooldownMs = 2000; // 2 second cooldown
      
      const shouldShow = await service.shouldShowReminder({ deviationCount: 5 });
      expect(shouldShow).toBe(false);
    });

    it('should implement adaptive frequency escalation', async () => {
      service.preferences.frequency = 'adaptive';
      service.reminderCount = 2;
      service.lastReminderTime = 0;
      
      const shouldShow = await service.shouldShowReminder({ deviationCount: 3 });
      expect(shouldShow).toBe(true);
    });
  });

  describe('Legitimate Break Detection', () => {
    it('should detect official breaks', async () => {
      mockBreakTimerManager.getTimerStatus.mockReturnValue({
        isOnBreak: true
      });
      service.preferences.showDuringBreaks = false;
      
      const isLegitimate = await service.isLegitimateBreakTime();
      expect(isLegitimate).toBe(true);
    });

    it('should detect long deviations as legitimate breaks', async () => {
      service.lastReminderTime = Date.now() - (11 * 60 * 1000); // 11 minutes ago
      service.config.legitimateBreakThresholdMs = 10 * 60 * 1000; // 10 minutes
      
      const isLegitimate = await service.isLegitimateBreakTime();
      expect(isLegitimate).toBe(true);
    });
  });

  describe('Notification Creation', () => {
    it('should create system notifications with proper options', async () => {
      const mockCreate = chrome.notifications.create;
      mockCreate.mockResolvedValue(true);
      
      const success = await service.createSystemNotification('test-id', {
        title: 'Test Title',
        message: 'Test Message'
      });
      
      expect(success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith('test-id', expect.objectContaining({
        title: 'Test Title',
        message: 'Test Message',
        type: 'basic',
        requireInteraction: false
      }));
    });

    it('should handle notification permission denied', async () => {
      chrome.notifications.getPermissionLevel.mockResolvedValue('denied');
      
      const success = await service.createSystemNotification('test-id', {
        title: 'Test',
        message: 'Test'
      });
      
      expect(success).toBe(false);
    });
  });

  describe('Message Generation', () => {
    it('should generate contextual messages based on style', () => {
      const focusInfo = { url: 'https://github.com' };
      const sessionStats = { deviationCount: 3 };
      
      service.preferences.reminderStyle = 'gentle';
      const gentleMessage = service.generateReminderMessage(focusInfo, sessionStats);
      expect(gentleMessage).toContain('github.com');
      expect(gentleMessage.toLowerCase()).toMatch(/gentle|friendly|nudge/);
      
      service.preferences.reminderStyle = 'assertive';
      const assertiveMessage = service.generateReminderMessage(focusInfo, sessionStats);
      expect(assertiveMessage).toContain('github.com');
      expect(assertiveMessage.toLowerCase()).toMatch(/alert|focus|track/);
    });

    it('should use custom messages when available', () => {
      service.preferences.customMessages = ['Custom reminder message'];
      
      const message = service.generateReminderMessage(
        { url: 'https://example.com' },
        { deviationCount: 1 }
      );
      
      expect(message).toBe('Custom reminder message');
    });
  });

  describe('Button Click Handling', () => {
    it('should handle "Return to Focus" button', async () => {
      const mockUpdate = chrome.tabs.update;
      mockUpdate.mockResolvedValue(true);
      
      await service.handleNotificationButtonClick('distraction-reminder-123', 0);
      
      expect(mockUpdate).toHaveBeenCalledWith(123, { active: true });
      expect(service.reminderCount).toBe(0); // Should decrease
    });

    it('should handle "Take Break" button', async () => {
      const mockStartBreak = mockBreakTimerManager.startBreak;
      
      await service.handleNotificationButtonClick('distraction-reminder-123', 1);
      
      expect(mockStartBreak).toHaveBeenCalledWith('short', 5);
    });

    it('should handle "Dismiss" button with cooldown increase', async () => {
      const originalTime = service.lastReminderTime;
      
      await service.handleNotificationButtonClick('distraction-reminder-123', 2);
      
      expect(service.lastReminderTime).toBeGreaterThan(originalTime);
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences and apply settings', async () => {
      const newPreferences = {
        enabled: false,
        reminderStyle: 'assertive',
        frequency: 'high'
      };
      
      const success = await service.updatePreferences(newPreferences);
      
      expect(success).toBe(true);
      expect(service.preferences.enabled).toBe(false);
      expect(service.preferences.reminderStyle).toBe('assertive');
      expect(service.preferences.frequency).toBe('high');
    });

    it('should restart monitoring when enabled/disabled', async () => {
      const startSpy = vi.spyOn(service, 'startMonitoring');
      const stopSpy = vi.spyOn(service, 'stopMonitoring');
      
      // Disable
      await service.updatePreferences({ enabled: false });
      expect(stopSpy).toHaveBeenCalled();
      
      // Re-enable
      await service.updatePreferences({ enabled: true });
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should reset session tracking', () => {
      service.reminderCount = 5;
      service.lastReminderTime = Date.now();
      
      service.resetSession();
      
      expect(service.reminderCount).toBe(0);
      expect(service.lastReminderTime).toBe(0);
    });

    it('should track reminder statistics', async () => {
      service.reminderCount = 3;
      
      const status = service.getStatus();
      
      expect(status.sessionStats.reminderCount).toBe(3);
      expect(status.isInitialized).toBe(true);
    });
  });

  describe('Cross-platform Compatibility', () => {
    it('should fall back to browser Notification API when Chrome notifications unavailable', async () => {
      // Mock browser Notification API
      global.Notification = vi.fn();
      global.Notification.permission = 'granted';
      
      // Disable Chrome notifications
      delete global.chrome.notifications;
      
      const success = await service.createFallbackNotification({
        title: 'Test',
        message: 'Test Message'
      });
      
      expect(success).toBe(true);
      expect(global.Notification).toHaveBeenCalledWith('Test', expect.objectContaining({
        body: 'Test Message'
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle tab tracker unavailable gracefully', async () => {
      service.setDependencies(null, mockBreakTimerManager);
      
      // Should not throw error
      await expect(service.checkForDistractions()).resolves.not.toThrow();
    });

    it('should handle notification creation failures', async () => {
      chrome.notifications.create.mockRejectedValue(new Error('Permission denied'));
      
      const success = await service.createSystemNotification('test', {
        title: 'Test',
        message: 'Test'
      });
      
      expect(success).toBe(false);
    });
  });
});