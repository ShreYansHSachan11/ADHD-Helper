/**
 * Break Notification System - Handles Chrome notifications for break reminders
 * Manages 30-minute work time threshold detection and break type selection
 */

class BreakNotificationSystem {
  constructor() {
    this.activeNotifications = new Map();
    this.lastBreakNotificationTime = 0;
    this.notificationPermissionGranted = false;
    this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Break type configurations
    this.breakTypes = {
      short: { duration: 5, label: "Short Break (5 min)" },
      medium: { duration: 15, label: "Medium Break (15 min)" },
      long: { duration: 30, label: "Long Break (30 min)" }
    };
    
    // Dependencies
    this.storageManager = null;
    this.breakTimerManager = null;
    this.breakErrorHandler = null;
    
    this.init();
  }

  /**
   * Initialize the notification system
   */
  async init() {
    try {
      // Initialize dependencies (avoid duplicate imports)
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
      }
      if (typeof BreakErrorHandler !== 'undefined') {
        this.breakErrorHandler = new BreakErrorHandler();
      }
      
      // Initialize error handler
      if (this.breakErrorHandler) {
        await this.breakErrorHandler.init();
      }
      
      await this.checkNotificationPermissionWithErrorHandling();
      console.log("BreakNotificationSystem initialized successfully");
    } catch (error) {
      console.error("BreakNotificationSystem initialization error:", error);
      // Continue with limited functionality
      await this.initializeFallbackMode();
    }
  }

  /**
   * Set break timer manager reference
   */
  setBreakTimerManager(breakTimerManager) {
    this.breakTimerManager = breakTimerManager;
  }

  /**
   * Check and update notification permission status
   */
  async checkNotificationPermission() {
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        const permission = await chrome.notifications.getPermissionLevel();
        this.notificationPermissionGranted = permission === "granted";
        
        if (!this.notificationPermissionGranted) {
          console.warn("Notifications permission not granted");
        }
        
        return this.notificationPermissionGranted;
      }
      return false;
    } catch (error) {
      console.error("Error checking notification permission:", error);
      return false;
    }
  }

  /**
   * Initialize fallback mode when normal initialization fails
   */
  async initializeFallbackMode() {
    try {
      console.log("Initializing BreakNotificationSystem in fallback mode");
      
      this.notificationPermissionGranted = false;
      
      // Create minimal error handler if not available
      if (!this.breakErrorHandler) {
        this.breakErrorHandler = {
          handleNotificationFailure: async (data, error) => {
            console.warn("Notification failed (fallback mode):", error);
            return { success: false, fallbackMode: true };
          },
          handleChromeApiUnavailable: async () => ({ success: false, fallbackMode: true })
        };
      }
      
      console.log("BreakNotificationSystem fallback mode initialized");
    } catch (error) {
      console.error("Error initializing notification fallback mode:", error);
    }
  }

  /**
   * Check notification permission with error handling
   */
  async checkNotificationPermissionWithErrorHandling() {
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        const permission = await chrome.notifications.getPermissionLevel();
        this.notificationPermissionGranted = permission === "granted";
        
        if (!this.notificationPermissionGranted) {
          console.warn("Notifications permission not granted");
        }
        
        return this.notificationPermissionGranted;
      }
      return false;
    } catch (error) {
      console.error("Error checking notification permission:", error);
      
      if (this.breakErrorHandler) {
        await this.breakErrorHandler.handleChromeApiUnavailable('notifications', 'getPermissionLevel');
      }
      
      return false;
    }
  }

  /**
   * Create and display a Chrome notification with comprehensive error handling
   */
  async createNotification(notificationId, options) {
    try {
      // Validate notification data
      if (this.breakErrorHandler) {
        const validation = this.breakErrorHandler.validateAndSanitizeBreakData({
          title: options.title,
          message: options.message,
          notificationId: notificationId
        }, 'notification_data');
        
        if (!validation.isValid) {
          console.warn("Notification data validation failed, using sanitized data");
          options.title = validation.sanitizedData.title || "Break Reminder";
          options.message = validation.sanitizedData.message || "Time for a break!";
        }
      }

      // Check permission first
      if (!this.notificationPermissionGranted) {
        console.warn("Cannot show notification: permission not granted");
        
        // Try fallback notification methods
        if (this.breakErrorHandler) {
          const fallbackResult = await this.breakErrorHandler.handleNotificationFailure(
            { title: options.title, message: options.message },
            new Error("Permission not granted"),
            'permission_denied'
          );
          return fallbackResult.success;
        }
        
        return false;
      }

      // Clear any existing notification with the same ID
      if (this.activeNotifications.has(notificationId)) {
        try {
          await chrome.notifications.clear(notificationId);
        } catch (error) {
          console.warn("Error clearing existing notification:", error);
        }
      }

      // Create the notification with default settings
      const notificationOptions = {
        type: "basic",
        iconUrl: "/assets/icons/48.ico",
        requireInteraction: true, // Keep notification visible until user interacts
        ...options,
      };

      try {
        await chrome.notifications.create(notificationId, notificationOptions);
      } catch (error) {
        console.error("Failed to create notification:", error);
        
        // Try fallback notification methods
        if (this.breakErrorHandler) {
          const fallbackResult = await this.breakErrorHandler.handleNotificationFailure(
            { title: options.title, message: options.message },
            error,
            'create_notification'
          );
          return fallbackResult.success;
        }
        
        return false;
      }

      // Track the notification
      this.activeNotifications.set(notificationId, {
        createdAt: Date.now(),
        options: notificationOptions,
      });

      return true;
    } catch (error) {
      console.error("Error creating notification:", error);
      
      // Try fallback notification methods
      if (this.breakErrorHandler) {
        const fallbackResult = await this.breakErrorHandler.handleNotificationFailure(
          { title: options.title, message: options.message },
          error,
          'create_notification_error'
        );
        return fallbackResult.success;
      }
      
      return false;
    }
  }

  /**
   * Show 30-minute work time threshold notification with break type selection
   */
  async showWorkTimeThresholdNotification(workTimeMinutes) {
    try {
      const now = Date.now();

      // Check if notifications are enabled
      if (this.breakTimerManager && !this.breakTimerManager.areNotificationsEnabled()) {
        console.log("Break notifications are disabled");
        return false;
      }

      // Check cooldown period to prevent spam
      if (now - this.lastBreakNotificationTime < this.cooldownPeriod) {
        console.log("Break notification on cooldown");
        return false;
      }

      // Check if already on break
      if (this.breakTimerManager) {
        const status = this.breakTimerManager.getTimerStatus();
        if (status && status.isOnBreak) {
          console.log("Already on break, not showing notification");
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
        console.log("Work time threshold notification shown:", workTimeMinutes, "minutes");
      }

      return success;
    } catch (error) {
      console.error("Error showing work time threshold notification:", error);
      return false;
    }
  }

  /**
   * Show break completion notification
   */
  async showBreakCompletionNotification(breakType) {
    try {
      const notificationId = `break-complete-${Date.now()}`;

      const success = await this.createNotification(notificationId, {
        title: "Break Complete! 🎯",
        message: `Your ${breakType} break is over. Ready to get back to work?`,
        buttons: [{ title: "Start Working" }],
      });

      if (success) {
        console.log("Break completion notification shown for:", breakType);
      }

      return success;
    } catch (error) {
      console.error("Error showing break completion notification:", error);
      return false;
    }
  }

  /**
   * Handle notification click (when user clicks on notification body)
   */
  async handleNotificationClick(notificationId) {
    try {
      // Clear the notification
      await this.clearNotification(notificationId);

      // Open extension popup if possible
      try {
        if (typeof chrome !== 'undefined' && chrome.action) {
          await chrome.action.openPopup();
        }
      } catch (error) {
        console.log("Could not open popup:", error);
      }

      console.log("Notification clicked:", notificationId);
      return true;
    } catch (error) {
      console.error("Error handling notification click:", error);
      return false;
    }
  }

  /**
   * Handle notification button clicks for break type selection
   */
  async handleNotificationButtonClick(notificationId, buttonIndex) {
    try {
      // Clear the notification first
      await this.clearNotification(notificationId);

      // Handle break timer notifications (break type selection)
      if (notificationId.includes("break-timer")) {
        const breakTypeKeys = Object.keys(this.breakTypes);
        
        if (buttonIndex >= 0 && buttonIndex < breakTypeKeys.length) {
          const breakTypeKey = breakTypeKeys[buttonIndex];
          const selectedBreak = this.breakTypes[breakTypeKey];
          
          // Start the selected break
          if (this.breakTimerManager) {
            const success = await this.breakTimerManager.startBreak(
              breakTypeKey, 
              selectedBreak.duration
            );
            
            if (success) {
              console.log(`Started ${breakTypeKey} break (${selectedBreak.duration} min) from notification`);
              
              // Show confirmation notification
              await this.createNotification(`break-started-${Date.now()}`, {
                title: "Break Started! 🌟",
                message: `Enjoy your ${selectedBreak.label.toLowerCase()}. You'll be notified when it's time to return.`,
              });
              
              return true;
            }
          }
        }
      }
      
      // Handle break completion notifications
      else if (notificationId.includes("break-complete")) {
        if (buttonIndex === 0) { // "Start Working" button
          // Reset work timer to start new work session
          if (this.breakTimerManager) {
            await this.breakTimerManager.resetWorkTimer();
            console.log("Work timer reset from break completion notification");
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Error handling notification button click:", error);
      return false;
    }
  }

  /**
   * Handle notification dismissal
   */
  async handleNotificationDismissal(notificationId, byUser) {
    try {
      this.activeNotifications.delete(notificationId);
      
      if (byUser) {
        console.log("Notification dismissed by user:", notificationId);
        
        // If user dismisses break timer notification, reset work timer
        if (notificationId.includes("break-timer")) {
          if (this.breakTimerManager) {
            await this.breakTimerManager.resetWorkTimer();
            console.log("Work timer reset due to notification dismissal");
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error handling notification dismissal:", error);
      return false;
    }
  }

  /**
   * Clear a specific notification
   */
  async clearNotification(notificationId) {
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        await chrome.notifications.clear(notificationId);
      }
      this.activeNotifications.delete(notificationId);
      return true;
    } catch (error) {
      console.error("Error clearing notification:", error);
      return false;
    }
  }

  /**
   * Clear all active notifications
   */
  async clearAllNotifications() {
    try {
      const promises = Array.from(this.activeNotifications.keys()).map(
        notificationId => this.clearNotification(notificationId)
      );
      
      await Promise.all(promises);
      this.activeNotifications.clear();
      
      console.log("All notifications cleared");
      return true;
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      return false;
    }
  }

  /**
   * Check if work time threshold is exceeded and show notification if needed
   */
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
      console.error("Error checking work time threshold:", error);
      return false;
    }
  }

  /**
   * Get notification system status
   */
  getNotificationStatus() {
    return {
      permissionGranted: this.notificationPermissionGranted,
      activeNotifications: this.activeNotifications.size,
      lastNotificationTime: this.lastBreakNotificationTime,
      cooldownRemaining: Math.max(0, this.cooldownPeriod - (Date.now() - this.lastBreakNotificationTime))
    };
  }

  /**
   * Update break type configurations
   */
  async updateBreakTypes(newBreakTypes) {
    try {
      this.breakTypes = { ...this.breakTypes, ...newBreakTypes };
      
      // Save to storage if storage manager is available
      if (this.storageManager) {
        const settings = await this.storageManager.get('breakSettings') || {};
        settings.breakTypes = this.breakTypes;
        await this.storageManager.set('breakSettings', settings);
      }
      
      console.log("Break types updated:", this.breakTypes);
      return true;
    } catch (error) {
      console.error("Error updating break types:", error);
      return false;
    }
  }
}

// Export for use in service worker and other contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreakNotificationSystem;
} else {
  // Make available globally in service worker context
  globalThis.BreakNotificationSystem = BreakNotificationSystem;
}