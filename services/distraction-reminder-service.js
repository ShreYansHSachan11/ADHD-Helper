/**
 * Distraction Reminder Service - Advanced popup system for focus tracking
 * Monitors focus deviations and shows intelligent, non-intrusive reminders
 */

class DistractionReminderService {
  constructor() {
    this.isInitialized = false;
    this.monitoringInterval = null;
    this.activePopups = new Map();
    this.lastReminderTime = 0;
    this.reminderCount = 0;
    this.sessionStartTime = Date.now();
    
    // Smart timing configuration
    this.config = {
      monitoringIntervalMs: 5000, // Check every 5 seconds
      baseReminderCooldownMs: 2 * 60 * 1000, // 2 minutes base cooldown
      maxReminderCooldownMs: 15 * 60 * 1000, // 15 minutes max cooldown
      reminderEscalationFactor: 1.5, // Increase cooldown by this factor each time
      maxRemindersPerSession: 10, // Max reminders per focus session
      legitimateBreakThresholdMs: 10 * 60 * 1000, // 10 minutes = legitimate break
      popupDisplayDurationMs: 8000, // 8 seconds auto-dismiss
      fadeAnimationDurationMs: 300, // 300ms fade animations
    };

    // User preferences (will be loaded from storage)
    this.preferences = {
      enabled: true,
      reminderStyle: 'gentle', // 'gentle', 'standard', 'assertive'
      frequency: 'adaptive', // 'low', 'medium', 'high', 'adaptive'
      showDuringBreaks: false,
      customMessages: [],
      soundEnabled: false,
      vibrationEnabled: false, // For future mobile support
    };

    // Dependencies
    this.storageManager = null;
    this.tabTracker = null;
    this.breakTimerManager = null;
    
    this.init();
  }

  /**
   * Initialize the distraction reminder service
   */
  async init() {
    try {
      console.log("Initializing DistractionReminderService...");
      
      // Initialize dependencies
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
      }
      
      // Load user preferences
      await this.loadUserPreferences();
      
      // Start monitoring if enabled
      if (this.preferences.enabled) {
        await this.startMonitoring();
      }
      
      this.isInitialized = true;
      console.log("DistractionReminderService initialized successfully");
    } catch (error) {
      console.error("Error initializing DistractionReminderService:", error);
      this.isInitialized = false;
    }
  }

  /**
   * Set dependencies from background script
   */
  setDependencies(tabTracker, breakTimerManager) {
    this.tabTracker = tabTracker;
    this.breakTimerManager = breakTimerManager;
  }

  /**
   * Load user preferences from storage
   */
  async loadUserPreferences() {
    try {
      if (!this.storageManager) return;
      
      const stored = await this.storageManager.get('distractionReminderPreferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...stored };
      }
      
      // Apply frequency-based config adjustments
      this.applyFrequencySettings();
      
      console.log("Distraction reminder preferences loaded:", this.preferences);
    } catch (error) {
      console.error("Error loading distraction reminder preferences:", error);
    }
  }

  /**
   * Apply frequency settings to configuration
   */
  applyFrequencySettings() {
    const frequencyMultipliers = {
      'low': 2.0,      // Double the cooldown times
      'medium': 1.0,   // Default timing
      'high': 0.5,     // Half the cooldown times
      'adaptive': 1.0  // Will be adjusted dynamically
    };
    
    const multiplier = frequencyMultipliers[this.preferences.frequency] || 1.0;
    
    this.config.baseReminderCooldownMs = Math.floor(2 * 60 * 1000 * multiplier);
    this.config.maxReminderCooldownMs = Math.floor(15 * 60 * 1000 * multiplier);
  }

  /**
   * Start monitoring for distractions
   */
  async startMonitoring() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
      this.monitoringInterval = setInterval(async () => {
        await this.checkForDistractions();
      }, this.config.monitoringIntervalMs);
      
      console.log("Distraction monitoring started");
    } catch (error) {
      console.error("Error starting distraction monitoring:", error);
    }
  }

  /**
   * Stop monitoring for distractions
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("Distraction monitoring stopped");
    }
  }

  /**
   * Main monitoring logic - check for distractions and decide whether to show reminder
   */
  async checkForDistractions() {
    try {
      console.log("DistractionReminderService: Checking for distractions...");
      
      if (!this.preferences.enabled) {
        console.log("DistractionReminderService: Service disabled");
        return;
      }
      
      if (!this.tabTracker) {
        console.log("DistractionReminderService: No tab tracker available");
        return;
      }

      // Get current focus status
      const focusInfo = this.tabTracker.getFocusTabInfo();
      console.log("DistractionReminderService: Focus info:", focusInfo);
      
      if (!focusInfo.isSet) {
        console.log("DistractionReminderService: No focus tab set");
        return; // No focus tab set
      }

      // Get focus session stats
      const sessionStats = await this.tabTracker.getFocusSessionStats();
      console.log("DistractionReminderService: Session stats:", sessionStats);
      
      if (!sessionStats) {
        console.log("DistractionReminderService: No session stats available");
        return;
      }

      // Check if currently on focus tab
      if (sessionStats.isCurrentlyOnFocus) {
        console.log("DistractionReminderService: User is currently focused, no reminder needed");
        return; // User is focused, no reminder needed
      }

      // Check if we're in a legitimate break period
      const isLegitimateBreak = await this.isLegitimateBreakTime();
      console.log("DistractionReminderService: Is legitimate break:", isLegitimateBreak);
      
      if (isLegitimateBreak) {
        return;
      }

      // Check if we should show a reminder based on smart timing
      const shouldShow = await this.shouldShowReminder(sessionStats);
      console.log("DistractionReminderService: Should show reminder:", shouldShow);
      
      if (shouldShow) {
        console.log("DistractionReminderService: Showing distraction reminder");
        await this.showDistractionReminder(focusInfo, sessionStats);
      }
      
    } catch (error) {
      console.error("Error in distraction monitoring:", error);
    }
  }

  /**
   * Determine if current time represents a legitimate break
   */
  async isLegitimateBreakTime() {
    try {
      // Check if user is on an official break
      if (this.breakTimerManager) {
        const timerStatus = this.breakTimerManager.getTimerStatus();
        if (timerStatus && timerStatus.isOnBreak) {
          return !this.preferences.showDuringBreaks;
        }
      }

      // Check if deviation has been going on for a long time (legitimate break)
      const now = Date.now();
      const timeSinceLastFocus = now - this.lastReminderTime;
      
      return timeSinceLastFocus > this.config.legitimateBreakThresholdMs;
    } catch (error) {
      console.error("Error checking legitimate break time:", error);
      return false;
    }
  }

  /**
   * Smart timing logic to determine if reminder should be shown
   */
  async shouldShowReminder(sessionStats) {
    const now = Date.now();
    
    // Check if we've exceeded max reminders for this session
    if (this.reminderCount >= this.config.maxRemindersPerSession) {
      return false;
    }

    // Calculate dynamic cooldown based on reminder count and frequency setting
    let cooldownMs = this.config.baseReminderCooldownMs;
    
    if (this.preferences.frequency === 'adaptive') {
      // Adaptive frequency: increase cooldown with each reminder
      cooldownMs = Math.min(
        this.config.baseReminderCooldownMs * Math.pow(this.config.reminderEscalationFactor, this.reminderCount),
        this.config.maxReminderCooldownMs
      );
    }

    // Check cooldown period
    const timeSinceLastReminder = now - this.lastReminderTime;
    if (timeSinceLastReminder < cooldownMs) {
      return false;
    }

    // Additional logic for different reminder styles
    if (this.preferences.reminderStyle === 'gentle') {
      // Gentle style: only remind if deviation count is significant
      return sessionStats.deviationCount >= 3;
    } else if (this.preferences.reminderStyle === 'assertive') {
      // Assertive style: remind more frequently
      return sessionStats.deviationCount >= 1;
    }
    
    // Standard style: remind after 2 deviations
    return sessionStats.deviationCount >= 2;
  }

  /**
   * Show distraction reminder popup
   */
  async showDistractionReminder(focusInfo, sessionStats) {
    try {
      console.log("DistractionReminderService: Attempting to show distraction reminder");
      
      const now = Date.now();
      const popupId = `distraction-reminder-${now}`;
      
      // Create reminder message
      const message = this.generateReminderMessage(focusInfo, sessionStats);
      console.log("DistractionReminderService: Generated message:", message);
      
      // Show system notification with modern styling
      const notificationOptions = {
        title: this.getReminderTitle(),
        message: message,
        iconUrl: "assets/icons/icon48.png",
        type: "basic",
        requireInteraction: false, // Allow auto-dismiss
        buttons: [
          { title: "Return to Focus" },
          { title: "Take Break" },
          { title: "Dismiss" }
        ]
      };
      
      console.log("DistractionReminderService: Creating notification with options:", notificationOptions);
      
      const success = await this.createSystemNotification(popupId, notificationOptions);
      console.log("DistractionReminderService: Notification creation success:", success);

      if (success) {
        // Update tracking variables
        this.lastReminderTime = now;
        this.reminderCount++;
        
        // Schedule auto-dismiss
        setTimeout(async () => {
          await this.dismissPopup(popupId);
        }, this.config.popupDisplayDurationMs);
        
        // Save reminder statistics
        await this.saveReminderStats();
        
        console.log(`Distraction reminder shown successfully (${this.reminderCount}/${this.config.maxRemindersPerSession})`);
      } else {
        console.error("DistractionReminderService: Failed to create notification");
      }
      
    } catch (error) {
      console.error("Error showing distraction reminder:", error);
    }
  }

  /**
   * Generate contextual reminder message
   */
  generateReminderMessage(focusInfo, sessionStats) {
    const focusDomain = this.extractDomain(focusInfo.url);
    const deviationCount = sessionStats.deviationCount;
    
    // Use custom messages if available
    if (this.preferences.customMessages.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.preferences.customMessages.length);
      return this.preferences.customMessages[randomIndex];
    }
    
    // Generate contextual messages based on reminder style
    const messages = {
      gentle: [
        `Gentle reminder: You set ${focusDomain} as your focus. Would you like to return?`,
        `You've wandered from your focus task. No worries - ready to get back on track?`,
        `Just a friendly nudge: Your focus session on ${focusDomain} is waiting for you.`
      ],
      standard: [
        `You've been distracted ${deviationCount} times. Time to refocus on ${focusDomain}?`,
        `Focus check: You were working on ${focusDomain}. Ready to continue?`,
        `Distraction detected! Your focus task on ${focusDomain} needs attention.`
      ],
      assertive: [
        `Focus alert! You've deviated ${deviationCount} times from ${focusDomain}. Get back on track!`,
        `Stay focused! Return to your important work on ${focusDomain} now.`,
        `Productivity reminder: ${focusDomain} is your priority. Don't let distractions win!`
      ]
    };
    
    const styleMessages = messages[this.preferences.reminderStyle] || messages.standard;
    const randomIndex = Math.floor(Math.random() * styleMessages.length);
    return styleMessages[randomIndex];
  }

  /**
   * Get reminder title based on style
   */
  getReminderTitle() {
    const titles = {
      gentle: "Gentle Focus Reminder 🌱",
      standard: "Focus Reminder 🎯",
      assertive: "Focus Alert! ⚡"
    };
    
    return titles[this.preferences.reminderStyle] || titles.standard;
  }

  /**
   * Create system notification with cross-platform compatibility
   */
  async createSystemNotification(notificationId, options) {
    try {
      console.log("DistractionReminderService: Creating system notification:", notificationId);
      
      // Check if Chrome notifications are available
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        console.log("DistractionReminderService: Chrome notifications available");
        
        // Check permission
        const permission = await chrome.notifications.getPermissionLevel();
        console.log("DistractionReminderService: Notification permission:", permission);
        
        if (permission !== 'granted') {
          console.warn("DistractionReminderService: Notification permission not granted");
          return false;
        }
        
        // Create Chrome notification
        console.log("DistractionReminderService: Creating Chrome notification with ID:", notificationId);
        await chrome.notifications.create(notificationId, options);
        console.log("DistractionReminderService: Chrome notification created successfully");
        
        // Track active popup
        this.activePopups.set(notificationId, {
          createdAt: Date.now(),
          options: options
        });
        
        return true;
      }
      
      // Fallback for other environments
      console.warn("DistractionReminderService: Chrome notifications not available, using fallback");
      return await this.createFallbackNotification(options);
      
    } catch (error) {
      console.error("DistractionReminderService: Error creating system notification:", error);
      return false;
    }
  }

  /**
   * Fallback notification method for environments without Chrome notifications
   */
  async createFallbackNotification(options) {
    try {
      // Try browser Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(options.title, {
          body: options.message,
          icon: options.iconUrl,
          requireInteraction: false
        });
        
        // Auto-dismiss after configured time
        setTimeout(() => {
          notification.close();
        }, this.config.popupDisplayDurationMs);
        
        return true;
      }
      
      console.warn("No notification methods available");
      return false;
    } catch (error) {
      console.error("Error creating fallback notification:", error);
      return false;
    }
  }

  /**
   * Handle notification button clicks
   */
  async handleNotificationButtonClick(notificationId, buttonIndex) {
    try {
      await this.dismissPopup(notificationId);
      
      switch (buttonIndex) {
        case 0: // "Return to Focus"
          await this.handleReturnToFocus();
          break;
        case 1: // "Take Break"
          await this.handleTakeBreak();
          break;
        case 2: // "Dismiss"
          await this.handleDismiss();
          break;
      }
      
      return true;
    } catch (error) {
      console.error("Error handling notification button click:", error);
      return false;
    }
  }

  /**
   * Handle "Return to Focus" action
   */
  async handleReturnToFocus() {
    try {
      // Try to switch to focus tab
      if (this.tabTracker) {
        const focusInfo = this.tabTracker.getFocusTabInfo();
        if (focusInfo.tabId) {
          await chrome.tabs.update(focusInfo.tabId, { active: true });
        }
      }
      
      // Reset reminder count as user is returning to focus
      this.reminderCount = Math.max(0, this.reminderCount - 1);
      
      console.log("User returned to focus from reminder");
    } catch (error) {
      console.error("Error handling return to focus:", error);
    }
  }

  /**
   * Handle "Take Break" action
   */
  async handleTakeBreak() {
    try {
      // Start a break if break timer manager is available
      if (this.breakTimerManager) {
        await this.breakTimerManager.startBreak('short', 5); // 5-minute break
      }
      
      // Pause reminders during break
      this.stopMonitoring();
      
      // Resume monitoring after break
      setTimeout(() => {
        if (this.preferences.enabled) {
          this.startMonitoring();
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      console.log("User started break from reminder");
    } catch (error) {
      console.error("Error handling take break:", error);
    }
  }

  /**
   * Handle "Dismiss" action
   */
  async handleDismiss() {
    try {
      // Increase cooldown for next reminder
      this.lastReminderTime = Date.now() + (this.config.baseReminderCooldownMs * 0.5);
      
      console.log("User dismissed reminder");
    } catch (error) {
      console.error("Error handling dismiss:", error);
    }
  }

  /**
   * Dismiss a specific popup
   */
  async dismissPopup(popupId) {
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        await chrome.notifications.clear(popupId);
      }
      
      this.activePopups.delete(popupId);
      return true;
    } catch (error) {
      console.error("Error dismissing popup:", error);
      return false;
    }
  }

  /**
   * Extract domain from URL for display
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      return url;
    }
  }

  /**
   * Save reminder statistics
   */
  async saveReminderStats() {
    try {
      if (!this.storageManager) return;
      
      const stats = await this.storageManager.get('distractionReminderStats') || {
        totalReminders: 0,
        sessionsWithReminders: 0,
        averageRemindersPerSession: 0,
        lastReminderTime: 0
      };
      
      stats.totalReminders++;
      stats.lastReminderTime = Date.now();
      
      // Update session stats
      if (this.reminderCount === 1) {
        stats.sessionsWithReminders++;
      }
      
      stats.averageRemindersPerSession = stats.totalReminders / Math.max(1, stats.sessionsWithReminders);
      
      await this.storageManager.set('distractionReminderStats', stats);
    } catch (error) {
      console.error("Error saving reminder stats:", error);
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(newPreferences) {
    try {
      this.preferences = { ...this.preferences, ...newPreferences };
      
      if (this.storageManager) {
        await this.storageManager.set('distractionReminderPreferences', this.preferences);
      }
      
      // Apply new settings
      this.applyFrequencySettings();
      
      // Restart monitoring if enabled/disabled
      if (this.preferences.enabled && !this.monitoringInterval) {
        await this.startMonitoring();
      } else if (!this.preferences.enabled && this.monitoringInterval) {
        this.stopMonitoring();
      }
      
      console.log("Distraction reminder preferences updated:", this.preferences);
      return true;
    } catch (error) {
      console.error("Error updating preferences:", error);
      return false;
    }
  }

  /**
   * Reset session tracking (call when focus tab changes)
   */
  resetSession() {
    this.reminderCount = 0;
    this.sessionStartTime = Date.now();
    this.lastReminderTime = 0;
    console.log("Distraction reminder session reset");
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isMonitoring: !!this.monitoringInterval,
      preferences: this.preferences,
      sessionStats: {
        reminderCount: this.reminderCount,
        sessionStartTime: this.sessionStartTime,
        lastReminderTime: this.lastReminderTime
      },
      activePopups: this.activePopups.size
    };
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy() {
    this.stopMonitoring();
    
    // Clear all active popups
    for (const popupId of this.activePopups.keys()) {
      this.dismissPopup(popupId);
    }
    
    this.isInitialized = false;
    console.log("DistractionReminderService destroyed");
  }
}

// Export for use in service worker and other contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = DistractionReminderService;
} else {
  // Make available globally in service worker context
  globalThis.DistractionReminderService = DistractionReminderService;
}