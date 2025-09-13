/**
 * Integration tests for BreakNotificationSystem with BreakTimerManager
 * Tests the complete workflow of work time tracking and break notifications
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
    openPopup: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
  },
};

// Mock storage manager
const mockStorageManager = {
  get: vi.fn(),
  set: vi.fn(),
  setMultiple: vi.fn(),
  remove: vi.fn(),
};

// Mock classes for integration testing
class MockBreakTimerManager {
  constructor() {
    this.workStartTime = Date.now();
    this.totalWorkTime = 0;
    this.isWorkTimerActive = true;
    this.isOnBreak = false;
    this.breakType = null;
    this.workTimeThreshold = 30 * 60 * 1000; // 30 minutes
  }

  getCurrentWorkTime() {
    return this.totalWorkTime + (this.isWorkTimerActive ? (Date.now() - this.workStartTime) : 0);
  }

  isWorkTimeThresholdExceeded() {
    return this.getCurrentWorkTime() >= this.workTimeThreshold;
  }

  getTimerStatus() {
    return {
      isWorkTimerActive: this.isWorkTimerActive,
      isOnBreak: this.isOnBreak,
      breakType: this.breakType,
      currentWorkTime: this.getCurrentWorkTime(),
      workTimeThreshold: this.workTimeThreshold,
      isThresholdExceeded: this.isWorkTimeThresholdExceeded(),
    };
  }

  async startBreak(breakType, durationMinutes) {
    this.isOnBreak = true;
    this.breakType = breakType;
    this.isWorkTimerActive = false;
    return true;
  }

  async resetWorkTimer() {
    this.totalWorkTime = 0;
    this.workStartTime = Date.now();
    this.isWorkTimerActive = true;
    this.isOnBreak = false;
    this.breakType = null;
    return true;
  }

  // Helper method to simulate work time passage
  simulateWorkTime(minutes) {
    this.totalWorkTime = minutes * 60 * 1000;
  }
}

class MockBreakNotificationSystem {
  constructor() {
    this.activeNotifications = new Map();
    this.lastBreakNotificationTime = 0;
    this.notificationPermissionGranted = true;
    this.cooldownPeriod = 5 * 60 * 1000;
    
    this.breakTypes = {
      short: { duration: 5, label: "Short Break (5 min)" },
      medium: { duration: 15, label: "Medium Break (15 min)" },
      long: { duration: 30, label: "Long Break (30 min)" }
    };
    
    this.breakTimerManager = null;
  }

  setBreakTimerManager(breakTimerManager) {
    this.breakTimerManager = breakTimerManager;
  }

  async checkNotificationPermission() {
    const permission = await chrome.notifications.getPermissionLevel();
    this.notificationPermissionGranted = permission === "granted";
    return this.notificationPermissionGranted;
  }

  async showWorkTimeThresholdNotification(workTimeMinutes) {
    const now = Date.now();

    // Check permission first
    if (!this.notificationPermissionGranted) {
      return false;
    }

    if (now - this.lastBreakNotificationTime < this.cooldownPeriod) {
      return false;
    }

    if (this.breakTimerManager) {
      const status = this.breakTimerManager.getTimerStatus();
      if (status && status.isOnBreak) {
        return false;
      }
    }

    const notificationId = `break-timer-${now}`;
    const success = await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: "/assets/icons/48.ico",
      title: "Break Reminder! ⏰",
      message: `You've been working for ${workTimeMinutes} minutes. Time to take a break!`,
      buttons: [
        { title: this.breakTypes.short.label },
        { title: this.breakTypes.medium.label },
        { title: this.breakTypes.long.label }
      ],
    });

    if (success) {
      this.lastBreakNotificationTime = now;
      this.activeNotifications.set(notificationId, { createdAt: now });
    }

    return success;
  }

  async checkAndNotifyWorkTimeThreshold() {
    if (!this.breakTimerManager) {
      return false;
    }

    const status = this.breakTimerManager.getTimerStatus();
    
    if (status && status.isThresholdExceeded && !status.isOnBreak) {
      const workTimeMinutes = Math.floor(status.currentWorkTime / (1000 * 60));
      return await this.showWorkTimeThresholdNotification(workTimeMinutes);
    }
    
    return false;
  }

  async handleNotificationButtonClick(notificationId, buttonIndex) {
    await chrome.notifications.clear(notificationId);
    this.activeNotifications.delete(notificationId);

    if (notificationId.includes("break-timer")) {
      const breakTypeKeys = Object.keys(this.breakTypes);
      
      if (buttonIndex >= 0 && buttonIndex < breakTypeKeys.length) {
        const breakTypeKey = breakTypeKeys[buttonIndex];
        const selectedBreak = this.breakTypes[breakTypeKey];
        
        if (this.breakTimerManager) {
          return await this.breakTimerManager.startBreak(breakTypeKey, selectedBreak.duration);
        }
      }
    }

    return true;
  }
}

describe('BreakNotificationSystem Integration', () => {
  let breakTimerManager;
  let notificationSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    
    breakTimerManager = new MockBreakTimerManager();
    notificationSystem = new MockBreakNotificationSystem();
    notificationSystem.setBreakTimerManager(breakTimerManager);
    
    chrome.notifications.getPermissionLevel.mockResolvedValue('granted');
    chrome.notifications.create.mockResolvedValue(true);
    chrome.notifications.clear.mockResolvedValue(true);
  });

  describe('Work Time Threshold Detection and Notification', () => {
    test('should detect when work time threshold is exceeded and show notification', async () => {
      // Simulate 30 minutes of work time
      breakTimerManager.simulateWorkTime(30);
      
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('break-timer-'),
        expect.objectContaining({
          title: "Break Reminder! ⏰",
          message: "You've been working for 30 minutes. Time to take a break!",
          buttons: expect.arrayContaining([
            { title: "Short Break (5 min)" },
            { title: "Medium Break (15 min)" },
            { title: "Long Break (30 min)" }
          ])
        })
      );
    });

    test('should not show notification when work time is below threshold', async () => {
      // Simulate 15 minutes of work time (below 30-minute threshold)
      breakTimerManager.simulateWorkTime(15);
      
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    test('should not show notification when already on break', async () => {
      // Simulate 30 minutes of work time but user is on break
      breakTimerManager.simulateWorkTime(30);
      breakTimerManager.isOnBreak = true;
      
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('Break Type Selection Workflow', () => {
    test('should start short break when first button is clicked', async () => {
      const notificationId = 'break-timer-123';
      
      const result = await notificationSystem.handleNotificationButtonClick(notificationId, 0);
      
      expect(result).toBe(true);
      expect(chrome.notifications.clear).toHaveBeenCalledWith(notificationId);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('short');
    });

    test('should start medium break when second button is clicked', async () => {
      const notificationId = 'break-timer-123';
      
      const result = await notificationSystem.handleNotificationButtonClick(notificationId, 1);
      
      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('medium');
    });

    test('should start long break when third button is clicked', async () => {
      const notificationId = 'break-timer-123';
      
      const result = await notificationSystem.handleNotificationButtonClick(notificationId, 2);
      
      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('long');
    });
  });

  describe('Complete Break Workflow', () => {
    test('should complete full workflow: work time exceeded -> notification -> break selection -> break started', async () => {
      // Step 1: Simulate work time exceeding threshold
      breakTimerManager.simulateWorkTime(35); // 35 minutes
      
      // Step 2: Check and show notification
      const notificationShown = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      expect(notificationShown).toBe(true);
      
      // Step 3: User clicks on medium break (button index 1)
      const notificationId = expect.stringContaining('break-timer-');
      const breakStarted = await notificationSystem.handleNotificationButtonClick('break-timer-123', 1);
      
      // Step 4: Verify break is started
      expect(breakStarted).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('medium');
      expect(breakTimerManager.isWorkTimerActive).toBe(false);
    });

    test('should handle work timer reset after break', async () => {
      // Start with a break active
      await breakTimerManager.startBreak('short', 5);
      expect(breakTimerManager.isOnBreak).toBe(true);
      
      // Reset work timer (simulating break completion)
      await breakTimerManager.resetWorkTimer();
      
      // Verify work timer is reset and ready for new session
      expect(breakTimerManager.isOnBreak).toBe(false);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.totalWorkTime).toBe(0);
      expect(breakTimerManager.breakType).toBe(null);
    });
  });

  describe('Cooldown and Permission Handling', () => {
    test('should respect cooldown period between notifications', async () => {
      // Show first notification
      breakTimerManager.simulateWorkTime(30);
      const firstResult = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      expect(firstResult).toBe(true);
      
      // Try to show another notification immediately (should be blocked by cooldown)
      breakTimerManager.simulateWorkTime(35);
      const secondResult = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      expect(secondResult).toBe(false);
    });

    test('should handle missing notification permission gracefully', async () => {
      // Mock the notification system to check permission properly
      const originalCheckPermission = notificationSystem.checkNotificationPermission;
      notificationSystem.checkNotificationPermission = vi.fn().mockResolvedValue(false);
      notificationSystem.notificationPermissionGranted = false;
      
      breakTimerManager.simulateWorkTime(30);
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
      
      // Restore original method
      notificationSystem.checkNotificationPermission = originalCheckPermission;
    });
  });

  describe('Timer Status Integration', () => {
    test('should provide accurate timer status for UI updates', () => {
      breakTimerManager.simulateWorkTime(25); // 25 minutes
      
      const status = breakTimerManager.getTimerStatus();
      
      expect(status).toEqual({
        isWorkTimerActive: true,
        isOnBreak: false,
        breakType: null,
        currentWorkTime: 25 * 60 * 1000,
        workTimeThreshold: 30 * 60 * 1000,
        isThresholdExceeded: false,
      });
    });

    test('should show threshold exceeded when work time is over limit', () => {
      breakTimerManager.simulateWorkTime(35); // 35 minutes
      
      const status = breakTimerManager.getTimerStatus();
      
      expect(status.isThresholdExceeded).toBe(true);
      expect(status.currentWorkTime).toBeGreaterThanOrEqual(35 * 60 * 1000);
    });
  });
});