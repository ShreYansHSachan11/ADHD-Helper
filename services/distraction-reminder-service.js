/**
 * Distraction Reminder Service - Simple and effective focus tracking
 * Shows notifications when user switches away from focus tab
 */

class DistractionReminderService {
  constructor() {
    this.isInitialized = false;
    this.focusTabId = null;
    this.focusTabUrl = null;
    this.distractionTimer = null;
    this.lastReminderTime = 0;
    this.reminderCount = 0;

    // Simple configuration
    this.config = {
      distractionDelayMs: 3000,
      reminderCooldownMs: 30 * 1000, // 30 seconds between reminders
      maxRemindersPerSession: 50, // Max reminders per session
      baseReminderCooldownMs: 2 * 60 * 1000, // 2 minutes base cooldown
      maxReminderCooldownMs: 15 * 60 * 1000, // 15 minutes max cooldown
      reminderEscalationFactor: 1.5, // Escalation factor for adaptive frequency
      legitimateBreakThresholdMs: 10 * 60 * 1000, // 10 minutes for legitimate break
      popupDisplayDurationMs: 10 * 1000 // 10 seconds popup display
    };

    // User preferences
    this.preferences = {
      enabled: true,
      reminderStyle: "standard",
      customMessage: "",
    };

    // Dependencies
    this.storageManager = null;

    this.init();
  }

  /**
   * Initialize the distraction reminder service
   */
  async init() {
    try {
      console.log("Initializing DistractionReminderService...");

      // Initialize dependencies
      if (typeof StorageManager !== "undefined") {
        this.storageManager = new StorageManager();
      }

      // Load user preferences and focus tab info
      await this.loadUserPreferences();
      await this.loadFocusTabInfo();

      this.isInitialized = true;
      console.log("DistractionReminderService initialized successfully");
    } catch (error) {
      console.error("Error initializing DistractionReminderService:", error);
      this.isInitialized = false;
    }
  }

  /**
   * Load focus tab information from storage
   */
  async loadFocusTabInfo() {
    try {
      if (!this.storageManager) return;

      const sessionData = await this.storageManager.get("currentSession");
      if (sessionData) {
        this.focusTabId = sessionData.focusTabId;
        this.focusTabUrl = sessionData.focusUrl;
        console.log("Loaded focus tab:", this.focusTabId, this.focusTabUrl);
      }
    } catch (error) {
      console.error("Error loading focus tab info:", error);
    }
  }

  /**
   * Set focus tab (called when user sets a new focus tab)
   */
  async setFocusTab(tabId, url) {
    this.focusTabId = tabId;
    this.focusTabUrl = url;
    this.reminderCount = 0; // Reset reminder count for new session
    console.log("DistractionReminderService: Focus tab set to", tabId, url);
  }

  /**
   * Reset focus tab
   */
  resetFocusTab() {
    this.focusTabId = null;
    this.focusTabUrl = null;
    this.reminderCount = 0;
    this.clearDistractionTimer();
    console.log("DistractionReminderService: Focus tab reset");
  }

  /**
   * Load user preferences from storage
   */
  async loadUserPreferences() {
    try {
      if (!this.storageManager) return;

      const stored = await this.storageManager.get(
        "distractionReminderPreferences"
      );
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
      low: 2.0, // Double the cooldown times
      medium: 1.0, // Default timing
      high: 0.5, // Half the cooldown times
      adaptive: 1.0, // Will be adjusted dynamically
    };

    const multiplier = frequencyMultipliers[this.preferences.frequency] || 1.0;

    this.config.baseReminderCooldownMs = Math.floor(2 * 60 * 1000 * multiplier);
    this.config.maxReminderCooldownMs = Math.floor(15 * 60 * 1000 * multiplier);
  }

  /**
   * Handle tab activation (called when user switches tabs)
   */
  async handleTabActivated(tabId) {
    try {
      if (!this.preferences.enabled || !this.focusTabId) {
        return; // Not enabled or no focus tab set
      }

      console.log(
        "DistractionReminderService: Tab activated:",
        tabId,
        "Focus tab:",
        this.focusTabId
      );

      if (tabId === this.focusTabId) {
        // User returned to focus tab - clear any pending reminder
        this.clearDistractionTimer();
        console.log("DistractionReminderService: User returned to focus tab");
      } else {
        // User switched away from focus tab - start distraction timer
        this.startDistractionTimer();
        console.log(
          "DistractionReminderService: User switched away from focus tab, starting timer"
        );
      }
    } catch (error) {
      console.error("Error handling tab activation:", error);
    }
  }

  /**
   * Start distraction timer (3-5 second delay before showing reminder)
   */
  startDistractionTimer() {
    // Clear any existing timer
    this.clearDistractionTimer();

    // Start new timer
    this.distractionTimer = setTimeout(async () => {
      await this.showDistractionReminder();
    }, this.config.distractionDelayMs);

    console.log("DistractionReminderService: Distraction timer started");
  }

  /**
   * Clear distraction timer
   */
  clearDistractionTimer() {
    if (this.distractionTimer) {
      clearTimeout(this.distractionTimer);
      this.distractionTimer = null;
      console.log("DistractionReminderService: Distraction timer cleared");
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
        console.log(
          "DistractionReminderService: User is currently focused, no reminder needed"
        );
        return; // User is focused, no reminder needed
      }

      // Check if we're in a legitimate break period
      const isLegitimateBreak = await this.isLegitimateBreakTime();
      console.log(
        "DistractionReminderService: Is legitimate break:",
        isLegitimateBreak
      );

      if (isLegitimateBreak) {
        return;
      }

      // Check if we should show a reminder based on smart timing
      const shouldShow = await this.shouldShowReminder(sessionStats);
      console.log(
        "DistractionReminderService: Should show reminder:",
        shouldShow
      );

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

    if (this.preferences.frequency === "adaptive") {
      // Adaptive frequency: increase cooldown with each reminder
      cooldownMs = Math.min(
        this.config.baseReminderCooldownMs *
        Math.pow(this.config.reminderEscalationFactor, this.reminderCount),
        this.config.maxReminderCooldownMs
      );
    }

    // Check cooldown period
    const timeSinceLastReminder = now - this.lastReminderTime;
    if (timeSinceLastReminder < cooldownMs) {
      return false;
    }

    // Additional logic for different reminder styles
    if (this.preferences.reminderStyle === "gentle") {
      // Gentle style: only remind if deviation count is significant
      return sessionStats.deviationCount >= 3;
    } else if (this.preferences.reminderStyle === "assertive") {
      // Assertive style: remind more frequently
      return sessionStats.deviationCount >= 1;
    }

    // Standard style: remind after 2 deviations
    return sessionStats.deviationCount >= 2;
  }

  /**
   * Show distraction reminder notification
   */
  async showDistractionReminder() {
    try {
      const now = Date.now();

      // Check cooldown period
      if (now - this.lastReminderTime < this.config.reminderCooldownMs) {
        console.log("DistractionReminderService: Still in cooldown period");
        return false;
      }

      // Check max reminders per session
      if (this.reminderCount >= this.config.maxRemindersPerSession) {
        console.log(
          "DistractionReminderService: Max reminders reached for this session"
        );
        return false;
      }

      console.log("DistractionReminderService: Showing distraction reminder");

      const notificationId = `distraction-reminder-${now}`;
      const message = this.generateReminderMessage();

      const notificationOptions = {
        type: "basic",
        iconUrl: "assets/icons/icon48.png",
        title: "🎯 Stay Focused!",
        message: message,
        priority: 2,
        requireInteraction: true,
        buttons: [{ title: "Return to Focus" }, { title: "Remove Focus Tab" }],
      };

      await chrome.notifications.create(notificationId, notificationOptions);

      // Update tracking
      this.lastReminderTime = now;
      this.reminderCount++;

      console.log(
        `DistractionReminderService: Notification shown (${this.reminderCount}/${this.config.maxRemindersPerSession})`
      );
      return true;
    } catch (error) {
      console.error("Error showing distraction reminder:", error);
      return false;
    }
  }

  /**
   * Generate reminder message
   */
  generateReminderMessage() {
    // Use custom message if available
    if (this.preferences.customMessage) {
      return this.preferences.customMessage;
    }

    // Get focus domain for context
    const focusDomain = this.focusTabUrl
      ? this.extractDomain(this.focusTabUrl)
      : "your focus tab";

    const messages = [
      `Your focus tab (${focusDomain}) is waiting for you! 🚀`,
      `Stay focused! Return to ${focusDomain} to continue your work.`,
      `Distraction detected! Time to get back to ${focusDomain}.`,
      `Focus reminder: You were working on ${focusDomain}. Ready to continue?`,
      `Don't lose momentum! Your focus task on ${focusDomain} needs attention.`,
    ];

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  /**
   * Get reminder title based on style
   */
  getReminderTitle() {
    const titles = {
      gentle: "Gentle Focus Reminder 🌱",
      standard: "Focus Reminder 🎯",
      assertive: "Focus Alert! ⚡",
    };

    return titles[this.preferences.reminderStyle] || titles.standard;
  }

  /**
   * Create system notification with cross-platform compatibility
   */
  async createSystemNotification(notificationId, options) {
    try {
      console.log(
        "DistractionReminderService: Creating system notification:",
        notificationId
      );

      // Check if Chrome notifications are available
      if (typeof chrome !== "undefined" && chrome.notifications) {
        console.log(
          "DistractionReminderService: Chrome notifications available"
        );

        // Check permission
        const permission = await chrome.notifications.getPermissionLevel();
        console.log(
          "DistractionReminderService: Notification permission:",
          permission
        );

        if (permission !== "granted") {
          console.warn(
            "DistractionReminderService: Notification permission not granted"
          );
          return false;
        }

        // Create Chrome notification
        console.log(
          "DistractionReminderService: Creating Chrome notification with ID:",
          notificationId
        );
        await chrome.notifications.create(notificationId, options);
        console.log(
          "DistractionReminderService: Chrome notification created successfully"
        );

        // Track active popup
        this.activePopups.set(notificationId, {
          createdAt: Date.now(),
          options: options,
        });

        return true;
      }

      // Fallback for other environments
      console.warn(
        "DistractionReminderService: Chrome notifications not available, using fallback"
      );
      return await this.createFallbackNotification(options);
    } catch (error) {
      console.error(
        "DistractionReminderService: Error creating system notification:",
        error
      );
      return false;
    }
  }

  /**
   * Fallback notification method for environments without Chrome notifications
   */
  async createFallbackNotification(options) {
    try {
      // Try browser Notification API
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(options.title, {
          body: options.message,
          icon: options.iconUrl,
          requireInteraction: false,
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
        case 1: // "Remove Focus Tab"
          await this.handleRemoveFocusTab();
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
        await this.breakTimerManager.startBreak("short", 5); // 5-minute break
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
      this.lastReminderTime =
        Date.now() + this.config.baseReminderCooldownMs * 0.5;

      console.log("User dismissed reminder");
    } catch (error) {
      console.error("Error handling dismiss:", error);
    }
  }

  /**
   * Handle "Remove Focus Tab" action
   */
  async handleRemoveFocusTab() {
    try {
      console.log("User requested to remove focus tab - stopping distraction reminders");
      
      // Reset focus tab to stop future reminders
      this.resetFocusTab();
      
      // Clear any pending timers
      this.clearDistractionTimer();
      
      // Reset reminder count
      this.reminderCount = 0;
      
      // Notify tab tracker if available
      if (this.tabTracker && typeof this.tabTracker.resetFocusTab === 'function') {
        try {
          await this.tabTracker.resetFocusTab();
          console.log("Focus tab reset in tab tracker");
        } catch (error) {
          console.error("Error resetting focus tab in tab tracker:", error);
        }
      }
      
      console.log("Focus tab removed successfully - no more distraction reminders will be shown");
    } catch (error) {
      console.error("Error handling remove focus tab:", error);
    }
  }

  /**
   * Dismiss a specific popup
   */
  async dismissPopup(popupId) {
    try {
      if (typeof chrome !== "undefined" && chrome.notifications) {
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
      return urlObj.hostname.replace("www.", "");
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

      const stats = (await this.storageManager.get(
        "distractionReminderStats"
      )) || {
        totalReminders: 0,
        sessionsWithReminders: 0,
        averageRemindersPerSession: 0,
        lastReminderTime: 0,
      };

      stats.totalReminders++;
      stats.lastReminderTime = Date.now();

      // Update session stats
      if (this.reminderCount === 1) {
        stats.sessionsWithReminders++;
      }

      stats.averageRemindersPerSession =
        stats.totalReminders / Math.max(1, stats.sessionsWithReminders);

      await this.storageManager.set("distractionReminderStats", stats);
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
        await this.storageManager.set(
          "distractionReminderPreferences",
          this.preferences
        );
      }

      // Apply new settings
      this.applyFrequencySettings();

      // Restart monitoring if enabled/disabled
      if (this.preferences.enabled && !this.monitoringInterval) {
        await this.startMonitoring();
      } else if (!this.preferences.enabled && this.monitoringInterval) {
        this.stopMonitoring();
      }

      console.log(
        "Distraction reminder preferences updated:",
        this.preferences
      );
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
        lastReminderTime: this.lastReminderTime,
      },
      activePopups: this.activePopups.size,
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
