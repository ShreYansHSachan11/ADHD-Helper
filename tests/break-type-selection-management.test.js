/**
 * Tests for Break Type Selection and Management
 * Tests complete break cycle from notification to completion including cancellation
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    getPermissionLevel: vi.fn(),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setTitle: vi.fn(),
    openPopup: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
  },
  runtime: {
    sendMessage: vi.fn(),
  },
};

// Mock storage manager
const mockStorageManager = {
  get: vi.fn(),
  set: vi.fn(),
  setMultiple: vi.fn(),
  remove: vi.fn(),
};

// Import the classes we're testing
let BreakTimerManager, BreakNotificationSystem;

// Mock the imports for service worker context
global.importScripts = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  
  // Reset Chrome API mocks
  chrome.notifications.getPermissionLevel.mockResolvedValue('granted');
  chrome.notifications.create.mockResolvedValue(true);
  chrome.notifications.clear.mockResolvedValue(true);
  chrome.action.setBadgeText.mockResolvedValue();
  chrome.action.setBadgeBackgroundColor.mockResolvedValue();
  chrome.action.setTitle.mockResolvedValue();
  
  // Mock storage manager responses
  mockStorageManager.get.mockResolvedValue(null);
  mockStorageManager.set.mockResolvedValue();
  mockStorageManager.setMultiple.mockResolvedValue();
  
  // Import classes after mocking
  const { default: BreakTimerManagerClass } = await import('../services/break-timer-manager.js');
  const { default: BreakNotificationSystemClass } = await import('../services/break-notification-system.js');
  
  BreakTimerManager = BreakTimerManagerClass;
  BreakNotificationSystem = BreakNotificationSystemClass;
});

describe('Break Type Selection and Management', () => {
  let breakTimerManager;
  let breakNotificationSystem;

  beforeEach(async () => {
    breakTimerManager = new BreakTimerManager();
    breakNotificationSystem = new BreakNotificationSystem();
    
    // Mock dependencies
    breakTimerManager.storageManager = mockStorageManager;
    breakNotificationSystem.storageManager = mockStorageManager;
    breakNotificationSystem.setBreakTimerManager(breakTimerManager);
    
    // Initialize
    await breakTimerManager.init();
    await breakNotificationSystem.init();
    
    // Ensure notification permission is granted for tests
    breakNotificationSystem.notificationPermissionGranted = true;
  });

  describe('Break Type Options in Notifications', () => {
    test('should show notification with three break type options', async () => {
      // Simulate work time exceeding threshold
      breakTimerManager.totalWorkTime = 30 * 60 * 1000; // 30 minutes
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.workStartTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      
      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(35);
      
      expect(result).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('break-timer-'),
        expect.objectContaining({
          title: "Break Reminder! ⏰",
          message: "You've been working for 35 minutes. Time to take a break!",
          buttons: [
            { title: "Short Break (5 min)" },
            { title: "Medium Break (15 min)" },
            { title: "Long Break (30 min)" }
          ]
        })
      );
    });

    test('should handle break type selection from notification buttons', async () => {
      const notificationId = 'break-timer-123';
      
      // Test short break selection (button index 0)
      const result = await breakNotificationSystem.handleNotificationButtonClick(notificationId, 0);
      
      expect(result).toBe(true);
      expect(chrome.notifications.clear).toHaveBeenCalledWith(notificationId);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('short');
      expect(breakTimerManager.breakDuration).toBe(5 * 60 * 1000); // 5 minutes in ms
    });
  });

  describe('Break Timer Functionality', () => {
    test('should start break with correct duration for each type', async () => {
      // Test short break
      let result = await breakTimerManager.startBreak('short', 5);
      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('short');
      expect(breakTimerManager.breakDuration).toBe(5 * 60 * 1000);
      
      // Reset for next test
      await breakTimerManager.endBreak();
      
      // Test medium break
      result = await breakTimerManager.startBreak('medium', 15);
      expect(result).toBe(true);
      expect(breakTimerManager.breakType).toBe('medium');
      expect(breakTimerManager.breakDuration).toBe(15 * 60 * 1000);
      
      // Reset for next test
      await breakTimerManager.endBreak();
      
      // Test long break
      result = await breakTimerManager.startBreak('long', 30);
      expect(result).toBe(true);
      expect(breakTimerManager.breakType).toBe('long');
      expect(breakTimerManager.breakDuration).toBe(30 * 60 * 1000);
    });

    test('should update extension badge when break starts', async () => {
      await breakTimerManager.startBreak('short', 5);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5m' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4CAF50' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Break: 5 minutes remaining' });
    });

    test('should clear extension badge when break ends', async () => {
      await breakTimerManager.startBreak('short', 5);
      await breakTimerManager.endBreak();
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Focus Productivity Extension' });
    });

    test('should calculate remaining break time correctly', async () => {
      const startTime = Date.now();
      breakTimerManager.breakStartTime = startTime;
      breakTimerManager.breakDuration = 5 * 60 * 1000; // 5 minutes
      breakTimerManager.isOnBreak = true;
      
      // Simulate 2 minutes passed
      const twoMinutesLater = startTime + (2 * 60 * 1000);
      vi.spyOn(Date, 'now').mockReturnValue(twoMinutesLater);
      
      const remainingTime = breakTimerManager.getRemainingBreakTime();
      expect(remainingTime).toBe(3 * 60 * 1000); // 3 minutes remaining
    });
  });

  describe('Break Completion Notifications', () => {
    test('should show break completion notification', async () => {
      const result = await breakNotificationSystem.showBreakCompletionNotification('short');
      
      expect(result).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('break-complete-'),
        expect.objectContaining({
          title: "Break Complete! 🎯",
          message: "Your short break is over. Ready to get back to work?",
          buttons: [{ title: "Start Working" }]
        })
      );
    });

    test('should reset work timer when break completion button is clicked', async () => {
      const notificationId = 'break-complete-123';
      
      // Start with a break active
      await breakTimerManager.startBreak('short', 5);
      
      // Handle break completion button click
      const result = await breakNotificationSystem.handleNotificationButtonClick(notificationId, 0);
      
      expect(result).toBe(true);
      expect(chrome.notifications.clear).toHaveBeenCalledWith(notificationId);
      // Work timer should be reset and active
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.totalWorkTime).toBe(0);
    });
  });

  describe('Break State Management and Persistence', () => {
    test('should persist break state to storage', async () => {
      await breakTimerManager.startBreak('medium', 15);
      
      expect(mockStorageManager.setMultiple).toHaveBeenCalledWith(
        expect.objectContaining({
          breakTimerState: expect.objectContaining({
            isOnBreak: true,
            breakType: 'medium'
          }),
          workSessionData: expect.objectContaining({
            breakStartTime: expect.any(Number),
            breakDuration: 15 * 60 * 1000
          })
        })
      );
    });

    test('should provide accurate timer status', async () => {
      await breakTimerManager.startBreak('long', 30);
      
      const status = breakTimerManager.getTimerStatus();
      
      expect(status).toEqual(expect.objectContaining({
        isWorkTimerActive: false,
        isOnBreak: true,
        breakType: 'long',
        remainingBreakTime: expect.any(Number)
      }));
    });

    test('should prevent starting multiple breaks simultaneously', async () => {
      await breakTimerManager.startBreak('short', 5);
      
      const result = await breakTimerManager.startBreak('medium', 15);
      
      expect(result).toBe(false);
      expect(breakTimerManager.breakType).toBe('short'); // Should remain unchanged
    });
  });

  describe('Break Cancellation and Early Completion', () => {
    test('should allow cancelling break early', async () => {
      await breakTimerManager.startBreak('long', 30);
      expect(breakTimerManager.isOnBreak).toBe(true);
      
      const result = await breakTimerManager.cancelBreak();
      
      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(false);
      expect(breakTimerManager.breakType).toBe(null);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
    });

    test('should clear badge when break is cancelled', async () => {
      await breakTimerManager.startBreak('medium', 15);
      await breakTimerManager.cancelBreak();
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Focus Productivity Extension' });
    });

    test('should handle cancelling when no break is active', async () => {
      const result = await breakTimerManager.cancelBreak();
      
      expect(result).toBe(false);
      // Should not affect work timer state
      expect(breakTimerManager.isWorkTimerActive).toBe(false); // Default state
    });
  });

  describe('Complete Break Cycle Integration', () => {
    test('should complete full break cycle: work → notification → selection → break → completion', async () => {
      // Step 1: Simulate work time exceeding threshold
      breakTimerManager.totalWorkTime = 30 * 60 * 1000;
      breakTimerManager.isWorkTimerActive = true;
      
      // Step 2: Check and show notification
      const notificationShown = await breakNotificationSystem.checkAndNotifyWorkTimeThreshold();
      expect(notificationShown).toBe(true);
      
      // Step 3: User selects medium break (button index 1)
      const breakStarted = await breakNotificationSystem.handleNotificationButtonClick('break-timer-123', 1);
      expect(breakStarted).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('medium');
      
      // Step 4: Break completes (simulate time passing)
      breakTimerManager.breakStartTime = Date.now() - (15 * 60 * 1000); // 15 minutes ago
      const remainingTime = breakTimerManager.getRemainingBreakTime();
      expect(remainingTime).toBe(0);
      
      // Step 5: End break and reset work timer
      await breakTimerManager.endBreak();
      expect(breakTimerManager.isOnBreak).toBe(false);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.totalWorkTime).toBe(0);
    });

    test('should handle break cycle with early cancellation', async () => {
      // Start break
      await breakTimerManager.startBreak('long', 30);
      expect(breakTimerManager.isOnBreak).toBe(true);
      
      // Cancel early (after 10 minutes instead of 30)
      breakTimerManager.breakStartTime = Date.now() - (10 * 60 * 1000);
      await breakTimerManager.cancelBreak();
      
      // Should be back to work state
      expect(breakTimerManager.isOnBreak).toBe(false);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.totalWorkTime).toBe(0);
    });

    test('should update badge periodically during break', async () => {
      await breakTimerManager.startBreak('short', 5);
      
      // Simulate time passing (2 minutes)
      breakTimerManager.breakStartTime = Date.now() - (2 * 60 * 1000);
      
      // Update badge
      await breakTimerManager.updateExtensionBadge();
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3m' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Break: 3 minutes remaining' });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle Chrome API failures gracefully', async () => {
      chrome.action.setBadgeText.mockRejectedValue(new Error('API Error'));
      
      // Should not throw error
      const result = await breakTimerManager.startBreak('short', 5);
      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
    });

    test('should handle notification permission denied', async () => {
      chrome.notifications.getPermissionLevel.mockResolvedValue('denied');
      await breakNotificationSystem.checkNotificationPermission();
      
      const result = await breakNotificationSystem.showWorkTimeThresholdNotification(30);
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    test('should handle storage failures gracefully', async () => {
      mockStorageManager.setMultiple.mockRejectedValue(new Error('Storage Error'));
      
      // Should not throw error
      const result = await breakTimerManager.startBreak('medium', 15);
      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
    });
  });
});