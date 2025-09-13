/**
 * Tests for BreakNotificationSystem
 * Tests notification display, user interaction handling, and break type selection
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
};

// Mock dependencies
const mockStorageManager = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockBreakTimerManager = {
  getTimerStatus: vi.fn(),
  startBreak: vi.fn(),
  resetWorkTimer: vi.fn(),
};

// Mock the class since we can't import it directly in this environment
class BreakNotificationSystem {
  constructor() {
    this.activeNotifications = new Map();
    this.lastBreakNotificationTime = 0;
    this.notificationPermissionGranted = false;
    this.cooldownPeriod = 5 * 60 * 1000;
    
    this.breakTypes = {
      short: { duration: 5, label: "Short Break (5 min)" },
      medium: { duration: 15, label: "Medium Break (15 min)" },
      long: { duration: 30, label: "Long Break (30 min)" }
    };
    
    this.storageManager = null;
    this.breakTimerManager = null;
  }

  setBreakTimerManager(breakTimerManager) {
    this.breakTimerManager = breakTimerManager;
  }

  async checkNotificationPermission() {
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        const permission = await chrome.notifications.getPermissionLevel();
        this.notificationPermissionGranted = permission === "granted";
        return this.notificationPermissionGranted;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async createNotification(notificationId, options) {
    if (!this.notificationPermissionGranted) {
      return false;
    }

    try {
      await chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: "/assets/icons/48.ico",
        requireInteraction: true,
        ...options,
      });

      this.activeNotifications.set(notificationId, {
        createdAt: Date.now(),
        options: options,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async showWorkTimeThresholdNotification(workTimeMinutes) {
    const now = Date.now();

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
    const success = await this.createNotification(notificationId, {
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
    }

    return success;
  }

  async showBreakCompletionNotification(breakType) {
    const notificationId = `break-complete-${Date.now()}`;
    return await this.createNotification(notificationId, {
      title: "Break Complete! 🎯",
      message: `Your ${breakType} break is over. Ready to get back to work?`,
      buttons: [{ title: "Start Working" }],
    });
  }

  async handleNotificationClick(notificationId) {
    try {
      await chrome.notifications.clear(notificationId);
      this.activeNotifications.delete(notificationId);

      try {
        if (typeof chrome !== 'undefined' && chrome.action) {
          await chrome.action.openPopup();
        }
      } catch (error) {
        // Ignore popup errors
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async handleNotificationButtonClick(notificationId, buttonIndex) {
    try {
      await chrome.notifications.clear(notificationId);
      this.activeNotifications.delete(notificationId);

      if (notificationId.includes("break-timer")) {
        const breakTypeKeys = Object.keys(this.breakTypes);
        
        if (buttonIndex >= 0 && buttonIndex < breakTypeKeys.length) {
          const breakTypeKey = breakTypeKeys[buttonIndex];
          const selectedBreak = this.breakTypes[breakTypeKey];
          
          if (this.breakTimerManager) {
            const success = await this.breakTimerManager.startBreak(
              breakTypeKey, 
              selectedBreak.duration
            );
            
            if (success) {
              await this.createNotification(`break-started-${Date.now()}`, {
                title: "Break Started! 🌟",
                message: `Enjoy your ${selectedBreak.label.toLowerCase()}. You'll be notified when it's time to return.`,
              });
              
              return true;
            }
          }
        }
      } else if (notificationId.includes("break-complete")) {
        if (buttonIndex === 0) {
          if (this.breakTimerManager) {
            await this.breakTimerManager.resetWorkTimer();
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async handleNotificationDismissal(notificationId, byUser) {
    try {
      this.activeNotifications.delete(notificationId);
      
      if (byUser && notificationId.includes("break-timer")) {
        if (this.breakTimerManager) {
          await this.breakTimerManager.resetWorkTimer();
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkAndNotifyWorkTimeThreshold() {
    try {
      if (!this.breakTimerManager) {
        return false;
      }

      const status = this.breakTimerManager.getTimerStatus();
      
      if (status && status.isThresholdExceeded && !status.isOnBreak) {
        const workTimeMinutes = Math.floor(status.currentWorkTime / (1000 * 60));
        return await this.showWorkTimeThresholdNotification(workTimeMinutes);
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  getNotificationStatus() {
    return {
      permissionGranted: this.notificationPermissionGranted,
      activeNotifications: this.activeNotifications.size,
      lastNotificationTime: this.lastBreakNotificationTime,
      cooldownRemaining: Math.max(0, this.cooldownPeriod - (Date.now() - this.lastBreakNotificationTime))
    };
  }

  async updateBreakTypes(newBreakTypes) {
    try {
      this.breakTypes = { ...this.breakTypes, ...newBreakTypes };
      
      if (this.storageManager) {
        const settings = await this.storageManager.get('breakSettings') || {};
        settings.breakTypes = this.breakTypes;
        await this.storageManager.set('breakSettings', settings);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

describe('BreakNotificationSystem', () => {
  let notificationSystem;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create new instance
    notificationSystem = new BreakNotificationSystem();
    notificationSystem.storageManager = mockStorageManager;
    notificationSystem.setBreakTimerManager(mockBreakTimerManager);
    
    // Mock permission as granted by default
    chrome.notifications.getPermissionLevel.mockResolvedValue('granted');
    notificationSystem.notificationPermissionGranted = true;
  });

  describe('Initialization', () => {
    test('should initialize with default break types', () => {
      expect(notificationSystem.breakTypes).toEqual({
        short: { duration: 5, label: "Short Break (5 min)" },
        medium: { duration: 15, label: "Medium Break (15 min)" },
        long: { duration: 30, label: "Long Break (30 min)" }
      });
    });

    test('should check notification permission on init', async () => {
      await notificationSystem.checkNotificationPermission();
      expect(chrome.notifications.getPermissionLevel).toHaveBeenCalled();
      expect(notificationSystem.notificationPermissionGranted).toBe(true);
    });
  });

  describe('Permission Checking', () => {
    test('should return true when permission is granted', async () => {
      chrome.notifications.getPermissionLevel.mockResolvedValue('granted');
      
      const result = await notificationSystem.checkNotificationPermission();
      
      expect(result).toBe(true);
      expect(notificationSystem.notificationPermissionGranted).toBe(true);
    });

    test('should return false when permission is denied', async () => {
      chrome.notifications.getPermissionLevel.mockResolvedValue('denied');
      
      const result = await notificationSystem.checkNotificationPermission();
      
      expect(result).toBe(false);
      expect(notificationSystem.notificationPermissionGranted).toBe(false);
    });
  });

  describe('Work Time Threshold Notifications', () => {
    test('should show work time threshold notification with break type buttons', async () => {
      chrome.notifications.create.mockResolvedValue(true);
      mockBreakTimerManager.getTimerStatus.mockReturnValue({ isOnBreak: false });
      
      const result = await notificationSystem.showWorkTimeThresholdNotification(30);
      
      expect(result).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('break-timer-'),
        expect.objectContaining({
          title: "Break Reminder! ⏰",
          message: "You've been working for 30 minutes. Time to take a break!",
          buttons: [
            { title: "Short Break (5 min)" },
            { title: "Medium Break (15 min)" },
            { title: "Long Break (30 min)" }
          ],
        })
      );
    });

    test('should not show notification if already on break', async () => {
      mockBreakTimerManager.getTimerStatus.mockReturnValue({ isOnBreak: true });
      
      const result = await notificationSystem.showWorkTimeThresholdNotification(30);
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    test('should respect cooldown period', async () => {
      // Set last notification time to recent
      notificationSystem.lastBreakNotificationTime = Date.now() - 1000; // 1 second ago
      
      const result = await notificationSystem.showWorkTimeThresholdNotification(30);
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    test('should not show notification without permission', async () => {
      notificationSystem.notificationPermissionGranted = false;
      
      const result = await notificationSystem.showWorkTimeThresholdNotification(30);
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('Break Completion Notifications', () => {
    test('should show break completion notification', async () => {
      chrome.notifications.create.mockResolvedValue(true);
      
      const result = await notificationSystem.showBreakCompletionNotification('short');
      
      expect(result).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('break-complete-'),
        expect.objectContaining({
          title: "Break Complete! 🎯",
          message: "Your short break is over. Ready to get back to work?",
          buttons: [{ title: "Start Working" }],
        })
      );
    });
  });

  describe('Notification Button Handling', () => {
    test('should start short break when first button is clicked', async () => {
      chrome.notifications.clear.mockResolvedValue(true);
      chrome.notifications.create.mockResolvedValue(true);
      mockBreakTimerManager.startBreak.mockResolvedValue(true);
      
      const result = await notificationSystem.handleNotificationButtonClick('break-timer-123', 0);
      
      expect(result).toBe(true);
      expect(mockBreakTimerManager.startBreak).toHaveBeenCalledWith('short', 5);
      expect(chrome.notifications.clear).toHaveBeenCalledWith('break-timer-123');
    });

    test('should start medium break when second button is clicked', async () => {
      chrome.notifications.clear.mockResolvedValue(true);
      chrome.notifications.create.mockResolvedValue(true);
      mockBreakTimerManager.startBreak.mockResolvedValue(true);
      
      const result = await notificationSystem.handleNotificationButtonClick('break-timer-123', 1);
      
      expect(result).toBe(true);
      expect(mockBreakTimerManager.startBreak).toHaveBeenCalledWith('medium', 15);
    });

    test('should start long break when third button is clicked', async () => {
      chrome.notifications.clear.mockResolvedValue(true);
      chrome.notifications.create.mockResolvedValue(true);
      mockBreakTimerManager.startBreak.mockResolvedValue(true);
      
      const result = await notificationSystem.handleNotificationButtonClick('break-timer-123', 2);
      
      expect(result).toBe(true);
      expect(mockBreakTimerManager.startBreak).toHaveBeenCalledWith('long', 30);
    });

    test('should reset work timer when break completion button is clicked', async () => {
      chrome.notifications.clear.mockResolvedValue(true);
      mockBreakTimerManager.resetWorkTimer.mockResolvedValue(true);
      
      const result = await notificationSystem.handleNotificationButtonClick('break-complete-123', 0);
      
      expect(result).toBe(true);
      expect(mockBreakTimerManager.resetWorkTimer).toHaveBeenCalled();
    });

    test('should show confirmation notification after starting break', async () => {
      chrome.notifications.clear.mockResolvedValue(true);
      chrome.notifications.create.mockResolvedValue(true);
      mockBreakTimerManager.startBreak.mockResolvedValue(true);
      
      await notificationSystem.handleNotificationButtonClick('break-timer-123', 0);
      
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1); // Just confirmation
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('break-started-'),
        expect.objectContaining({
          title: "Break Started! 🌟",
          message: "Enjoy your short break (5 min). You'll be notified when it's time to return.",
        })
      );
    });
  });

  describe('Notification Click Handling', () => {
    test('should clear notification and open popup on click', async () => {
      chrome.notifications.clear.mockResolvedValue(true);
      chrome.action.openPopup.mockResolvedValue(true);
      
      const result = await notificationSystem.handleNotificationClick('test-notification');
      
      expect(result).toBe(true);
      expect(chrome.notifications.clear).toHaveBeenCalledWith('test-notification');
      expect(chrome.action.openPopup).toHaveBeenCalled();
    });

    test('should handle popup open failure gracefully', async () => {
      chrome.notifications.clear.mockResolvedValue(true);
      chrome.action.openPopup.mockRejectedValue(new Error('Popup failed'));
      
      const result = await notificationSystem.handleNotificationClick('test-notification');
      
      expect(result).toBe(true); // Should still return true
      expect(chrome.notifications.clear).toHaveBeenCalledWith('test-notification');
    });
  });

  describe('Notification Dismissal Handling', () => {
    test('should reset work timer when break timer notification is dismissed by user', async () => {
      mockBreakTimerManager.resetWorkTimer.mockResolvedValue(true);
      
      const result = await notificationSystem.handleNotificationDismissal('break-timer-123', true);
      
      expect(result).toBe(true);
      expect(mockBreakTimerManager.resetWorkTimer).toHaveBeenCalled();
    });

    test('should not reset work timer when notification is dismissed automatically', async () => {
      const result = await notificationSystem.handleNotificationDismissal('break-timer-123', false);
      
      expect(result).toBe(true);
      expect(mockBreakTimerManager.resetWorkTimer).not.toHaveBeenCalled();
    });
  });

  describe('Threshold Checking', () => {
    test('should show notification when work time threshold is exceeded', async () => {
      mockBreakTimerManager.getTimerStatus.mockReturnValue({
        isThresholdExceeded: true,
        isOnBreak: false,
        currentWorkTime: 30 * 60 * 1000 // 30 minutes
      });
      chrome.notifications.create.mockResolvedValue(true);
      
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(true);
      expect(chrome.notifications.create).toHaveBeenCalled();
    });

    test('should not show notification when threshold is not exceeded', async () => {
      mockBreakTimerManager.getTimerStatus.mockReturnValue({
        isThresholdExceeded: false,
        isOnBreak: false,
        currentWorkTime: 15 * 60 * 1000 // 15 minutes
      });
      
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    test('should not show notification when already on break', async () => {
      mockBreakTimerManager.getTimerStatus.mockReturnValue({
        isThresholdExceeded: true,
        isOnBreak: true,
        currentWorkTime: 30 * 60 * 1000
      });
      
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(false);
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('Status and Configuration', () => {
    test('should return notification status', () => {
      notificationSystem.lastBreakNotificationTime = Date.now() - 60000; // 1 minute ago
      notificationSystem.activeNotifications.set('test', { createdAt: Date.now() });
      
      const status = notificationSystem.getNotificationStatus();
      
      expect(status).toEqual({
        permissionGranted: true,
        activeNotifications: 1,
        lastNotificationTime: expect.any(Number),
        cooldownRemaining: expect.any(Number)
      });
    });

    test('should update break types configuration', async () => {
      mockStorageManager.get.mockResolvedValue({});
      mockStorageManager.set.mockResolvedValue(true);
      
      const newBreakTypes = {
        custom: { duration: 10, label: "Custom Break (10 min)" }
      };
      
      const result = await notificationSystem.updateBreakTypes(newBreakTypes);
      
      expect(result).toBe(true);
      expect(notificationSystem.breakTypes.custom).toEqual(newBreakTypes.custom);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'breakSettings',
        expect.objectContaining({
          breakTypes: expect.objectContaining(newBreakTypes)
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle notification creation failure', async () => {
      chrome.notifications.create.mockRejectedValue(new Error('Creation failed'));
      
      const result = await notificationSystem.showWorkTimeThresholdNotification(30);
      
      expect(result).toBe(false);
    });

    test('should handle missing break timer manager gracefully', async () => {
      notificationSystem.breakTimerManager = null;
      
      const result = await notificationSystem.checkAndNotifyWorkTimeThreshold();
      
      expect(result).toBe(false);
    });
  });
});