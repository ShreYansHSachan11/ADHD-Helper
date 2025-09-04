/**
 * Tab Tracker - Monitor active tab changes and time tracking
 * Handles screen time monitoring and focus tab tracking
 */
class TabTracker {
  constructor() {
    this.currentTabId = null;
    this.currentTabStartTime = null;
    this.focusTabId = null;
    this.focusTabUrl = null;
    this.lastFocusReminderTime = 0;
    this.lastBreakReminderTime = 0;
    this.isInitialized = false;
    // Performance optimization
    this.performanceMonitor = null;
    this.updateQueue = [];
    this.isProcessingQueue = false;
    this.debounceTimeout = null;
    this.updateThrottleMs = 1000; // Throttle updates to once per second
    // Import storage manager and constants
    this.storageManager = null;
    this.constants = null;
    // Initialize when ready
    this.init();
  }
  /**
   * Initialize the tab tracker
   */
  async init() {
    try {
      // Initialize error handler if available
      if (typeof errorHandler !== 'undefined') {
        this.errorHandler = errorHandler;
      }
      // Initialize performance monitoring
      try {
        if (typeof importScripts !== "undefined") {
          importScripts("/utils/performance-monitor.js");
          this.performanceMonitor = new PerformanceMonitor();
          this.performanceMonitor.startTabTrackingMonitoring();
        }
      } catch (error) {
        console.warn('Failed to initialize performance monitoring:', error);
      }
      // Import dependencies (they should be available in service worker context)
      if (typeof importScripts !== "undefined") {
        importScripts(
          "/services/storage-manager.js",
          "/utils/constants.js",
          "/utils/helpers.js"
        );
        this.storageManager = new StorageManager();
        this.constants = CONSTANTS;
        this.helpers = HELPERS;
      }
      await this.loadStoredData();
      await this.setupEventListeners();
      await this.initializeCurrentTab();
      this.isInitialized = true;
      } catch (error) {
      console.error("TabTracker initialization error:", error);
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(error, 'TabTracker Init');
      }
      // Set partial initialization to allow basic functionality
      this.isInitialized = false;
      // Retry initialization after delay
      setTimeout(() => {
        this.init();
      }, 5000);
    }
  }
  /**
   * Load stored data from Chrome storage
   */
  async loadStoredData() {
    try {
      const data = await this.storageManager.getMultiple([
        this.constants.STORAGE_KEYS.CURRENT_SESSION,
        this.constants.STORAGE_KEYS.TAB_HISTORY,
        this.constants.STORAGE_KEYS.SCREEN_TIME_SETTINGS,
        this.constants.STORAGE_KEYS.FOCUS_SETTINGS,
      ]);
      // Load current session data
      const currentSession =
        data[this.constants.STORAGE_KEYS.CURRENT_SESSION] || {};
      this.focusTabId = currentSession.focusTabId || null;
      this.focusTabUrl = currentSession.focusUrl || null;
      this.lastFocusReminderTime = currentSession.lastFocusReminderTime || 0;
      this.lastBreakReminderTime = currentSession.lastBreakReminderTime || 0;
      // Initialize settings if they don't exist
      if (!data[this.constants.STORAGE_KEYS.SCREEN_TIME_SETTINGS]) {
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.SCREEN_TIME_SETTINGS,
          this.constants.DEFAULT_SETTINGS.screenTime
        );
      }
      if (!data[this.constants.STORAGE_KEYS.FOCUS_SETTINGS]) {
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.FOCUS_SETTINGS,
          this.constants.DEFAULT_SETTINGS.focus
        );
      }
      // Initialize tab history if it doesn't exist
      if (!data[this.constants.STORAGE_KEYS.TAB_HISTORY]) {
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.TAB_HISTORY,
          {}
        );
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
    }
  }
  /**
   * Setup Chrome tab event listeners
   */
  async setupEventListeners() {
    // Listen for tab activation (user switches tabs)
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId);
    });
    // Listen for tab updates (URL changes, page loads)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.active) {
        this.handleTabUpdated(tabId, tab.url);
      }
    });
    // Listen for tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });
    // Listen for window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus
        this.handleBrowserFocusLost();
      } else {
        // Browser gained focus
        this.handleBrowserFocusGained();
      }
    });
  }
  /**
   * Initialize tracking for the currently active tab
   */
  async initializeCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0) {
        const tab = tabs[0];
        await this.startTrackingTab(tab.id, tab.url);
        // Set as focus tab if none is set
        if (!this.focusTabId) {
          await this.setFocusTab(tab.id, tab.url);
        }
      }
    } catch (error) {
      console.error("Error initializing current tab:", error);
    }
  }
  /**
   * Handle tab activation event with performance monitoring
   */
  async handleTabActivated(tabId) {
    const startTime = performance.now();
    let success = false;
    try {
      // Performance optimization: Debounce rapid tab switches
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(async () => {
        await this.processTabActivation(tabId, startTime);
      }, 100); // 100ms debounce
    } catch (error) {
      console.error("Error handling tab activation:", error);
      if (this.performanceMonitor) {
        this.performanceMonitor.recordTabUpdate(startTime, performance.now(), tabId, false);
      }
      if (this.errorHandler) {
        // Don't show user feedback for tab access errors as they're common
        if (error.message.includes('No tab with id')) {
          } else {
          this.errorHandler.handleExtensionError(error, 'Tab Activation');
        }
      }
    }
  }
  /**
   * Process tab activation with performance optimization
   */
  async processTabActivation(tabId, startTime) {
    try {
      // Stop tracking previous tab
      if (this.currentTabId && this.currentTabId !== tabId) {
        await this.stopTrackingTab(this.currentTabId);
      }
      // Get tab info and start tracking
      const tab = await chrome.tabs.get(tabId);
      // Check if tab is accessible
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        return;
      }
      await this.startTrackingTab(tabId, tab.url);
      // Check for focus deviation
      await this.checkFocusDeviation(tabId, tab.url);
      // Record successful performance
      if (this.performanceMonitor) {
        this.performanceMonitor.recordTabUpdate(startTime, performance.now(), tabId, true);
      }
    } catch (error) {
      console.error("Error processing tab activation:", error);
      if (this.performanceMonitor) {
        this.performanceMonitor.recordTabUpdate(startTime, performance.now(), tabId, false);
      }
      if (this.errorHandler) {
        // Don't show user feedback for tab access errors as they're common
        if (error.message.includes('No tab with id')) {
          } else {
          this.errorHandler.handleExtensionError(error, 'Tab Activation');
        }
      }
    }
  }
  /**
   * Handle tab update event (URL changes)
   */
  async handleTabUpdated(tabId, url) {
    try {
      if (tabId === this.currentTabId) {
        // Update current tab URL
        await this.updateTabUrl(tabId, url);
        // Check for focus deviation with new URL
        await this.checkFocusDeviation(tabId, url);
      }
    } catch (error) {
      console.error("Error handling tab update:", error);
    }
  }
  /**
   * Handle tab removal event
   */
  async handleTabRemoved(tabId) {
    try {
      // Stop tracking if it was the current tab
      if (this.currentTabId === tabId) {
        await this.stopTrackingTab(tabId);
        this.currentTabId = null;
        this.currentTabStartTime = null;
      }
      // Clear focus tab if it was removed
      if (this.focusTabId === tabId) {
        this.focusTabId = null;
        this.focusTabUrl = null;
        await this.updateCurrentSession();
      }
      // Clean up tab history entry
      await this.cleanupTabHistory(tabId);
    } catch (error) {
      console.error("Error handling tab removal:", error);
    }
  }
  /**
   * Handle browser focus lost
   */
  async handleBrowserFocusLost() {
    if (this.currentTabId) {
      await this.stopTrackingTab(this.currentTabId);
    }
  }
  /**
   * Handle browser focus gained
   */
  async handleBrowserFocusGained() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0) {
        const tab = tabs[0];
        await this.startTrackingTab(tab.id, tab.url);
      }
    } catch (error) {
      console.error("Error handling browser focus gained:", error);
    }
  }
  /**
   * Start tracking a tab
   */
  async startTrackingTab(tabId, url) {
    try {
      // Stop tracking previous tab first
      if (this.currentTabId && this.currentTabId !== tabId) {
        await this.stopTrackingTab(this.currentTabId);
      }
      this.currentTabId = tabId;
      this.currentTabStartTime = this.helpers.TimeUtils.now();
      // Initialize tab history entry if it doesn't exist
      await this.initializeTabHistoryEntry(tabId, url);
      } catch (error) {
      console.error("Error starting tab tracking:", error);
    }
  }
  /**
   * Stop tracking a tab and update its total time
   */
  async stopTrackingTab(tabId) {
    try {
      if (!this.currentTabStartTime) return;
      const sessionTime = this.helpers.TimeUtils.timeDiff(
        this.currentTabStartTime
      );
      await this.updateTabTime(tabId, sessionTime);
      // Check if break reminder should be shown
      await this.checkScreenTimeLimit(tabId, sessionTime);
      }`
      );
    } catch (error) {
      console.error("Error stopping tab tracking:", error);
    }
  }
  /**
   * Update tab URL in current tracking
   */
  async updateTabUrl(tabId, url) {
    try {
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};
      if (tabHistory[tabId]) {
        tabHistory[tabId].url = url;
        tabHistory[tabId].lastActiveTime = this.helpers.TimeUtils.now();
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.TAB_HISTORY,
          tabHistory
        );
      }
    } catch (error) {
      console.error("Error updating tab URL:", error);
    }
  }
  /**
   * Initialize tab history entry
   */
  async initializeTabHistoryEntry(tabId, url) {
    try {
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};
      if (!tabHistory[tabId]) {
        tabHistory[tabId] = {
          url: url,
          totalTime: 0,
          lastActiveTime: this.helpers.TimeUtils.now(),
          breakRemindersShown: 0,
          sessionStartTime: this.helpers.TimeUtils.now(),
        };
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.TAB_HISTORY,
          tabHistory
        );
      } else {
        // Update existing entry
        tabHistory[tabId].url = url;
        tabHistory[tabId].lastActiveTime = this.helpers.TimeUtils.now();
        tabHistory[tabId].sessionStartTime = this.helpers.TimeUtils.now();
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.TAB_HISTORY,
          tabHistory
        );
      }
    } catch (error) {
      console.error("Error initializing tab history entry:", error);
    }
  }
  /**
   * Update tab total time with performance monitoring
   */
  async updateTabTime(tabId, sessionTime) {
    const startTime = performance.now();
    try {
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};
      if (tabHistory[tabId]) {
        tabHistory[tabId].totalTime += sessionTime;
        tabHistory[tabId].lastActiveTime = this.helpers.TimeUtils.now();
        const storageStartTime = performance.now();
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.TAB_HISTORY,
          tabHistory
        );
        // Record storage performance
        if (this.performanceMonitor) {
          this.performanceMonitor.recordStorageOperation(
            'write', 
            storageStartTime, 
            performance.now(), 
            true
          );
        }
      }
    } catch (error) {
      console.error("Error updating tab time:", error);
      // Record storage error
      if (this.performanceMonitor) {
        this.performanceMonitor.recordStorageOperation(
          'write', 
          startTime, 
          performance.now(), 
          false
        );
      }
    }
  }
  /**
   * Check screen time limit and show break reminder if needed
   */
  async checkScreenTimeLimit(tabId, sessionTime) {
    try {
      const settings = await this.storageManager.get(
        this.constants.STORAGE_KEYS.SCREEN_TIME_SETTINGS
      );
      if (!settings || !settings.enabled || !settings.notificationsEnabled) {
        return;
      }
      const limitMs = this.helpers.TimeUtils.minutesToMs(settings.limitMinutes);
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};
      const tabData = tabHistory[tabId];
      if (!tabData) return;
      // Check if current session exceeds limit
      if (sessionTime >= limitMs) {
        // Check cooldown period
        const now = this.helpers.TimeUtils.now();
        const cooldownMs = this.constants.SCREEN_TIME.NOTIFICATION_COOLDOWN_MS;
        if (now - this.lastBreakReminderTime >= cooldownMs) {
          await this.showBreakReminder(tabId);
          this.lastBreakReminderTime = now;
          // Update reminder count
          tabData.breakRemindersShown = (tabData.breakRemindersShown || 0) + 1;
          await this.storageManager.set(
            this.constants.STORAGE_KEYS.TAB_HISTORY,
            tabHistory
          );
          await this.updateCurrentSession();
        }
      }
    } catch (error) {
      console.error("Error checking screen time limit:", error);
    }
  }
  /**
   * Set focus tab
   */
  async setFocusTab(tabId, url) {
    try {
      this.focusTabId = tabId;
      this.focusTabUrl = url;
      // Reset session statistics when setting new focus tab
      await this.resetFocusSession();
      await this.updateCurrentSession();
      } catch (error) {
      console.error("Error setting focus tab:", error);
    }
  }
  /**
   * Reset focus session statistics
   */
  async resetFocusSession() {
    try {
      const focusHistory = await this.storageManager.get('focusHistory') || {
        deviations: [],
        sessionDeviations: 0,
        totalDeviations: 0
      };
      // Reset session-specific counters but keep total history
      focusHistory.sessionDeviations = 0;
      await this.storageManager.set('focusHistory', focusHistory);
      // Reset reminder times
      this.lastFocusReminderTime = 0;
      } catch (error) {
      console.error("Error resetting focus session:", error);
    }
  }
  /**
   * Check for focus deviation and show reminder if needed
   */
  async checkFocusDeviation(tabId, url) {
    try {
      const settings = await this.storageManager.get(
        this.constants.STORAGE_KEYS.FOCUS_SETTINGS
      );
      if (!settings || !settings.enabled || !settings.notificationsEnabled) {
        return;
      }
      // Skip if no focus tab is set
      if (!this.focusTabId || !this.focusTabUrl) {
        return;
      }
      // Skip if current tab is the focus tab
      if (tabId === this.focusTabId) {
        return;
      }
      // Check if URLs match (handle URL variations)
      if (this.urlsMatch(url, this.focusTabUrl)) {
        return;
      }
      // Record the deviation
      await this.recordFocusDeviation(this.focusTabUrl, url);
      // Check cooldown period for notifications
      const now = this.helpers.TimeUtils.now();
      const cooldownMs = this.helpers.TimeUtils.minutesToMs(
        settings.reminderCooldownMinutes
      );
      if (now - this.lastFocusReminderTime >= cooldownMs) {
        await this.showFocusReminder(this.focusTabUrl);
        this.lastFocusReminderTime = now;
        await this.updateCurrentSession();
      }
    } catch (error) {
      console.error("Error checking focus deviation:", error);
    }
  }
  /**
   * Record a focus deviation in the history
   */
  async recordFocusDeviation(fromUrl, toUrl) {
    try {
      const focusHistory = await this.storageManager.get('focusHistory') || {
        deviations: [],
        sessionDeviations: 0,
        totalDeviations: 0
      };
      // Add new deviation to history
      const deviation = {
        fromUrl: fromUrl,
        toUrl: toUrl,
        timestamp: this.helpers.TimeUtils.now()
      };
      focusHistory.deviations.push(deviation);
      focusHistory.sessionDeviations += 1;
      focusHistory.totalDeviations += 1;
      // Keep only last 50 deviations to prevent storage bloat
      if (focusHistory.deviations.length > 50) {
        focusHistory.deviations = focusHistory.deviations.slice(-50);
      }
      await this.storageManager.set('focusHistory', focusHistory);
      } catch (error) {
      console.error("Error recording focus deviation:", error);
    }
  }
  /**
   * Check if two URLs are considered the same for focus tracking
   */
  urlsMatch(url1, url2) {
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      return domain1 === domain2;
    } catch (error) {
      return url1 === url2;
    }
  }
  /**
   * Show break reminder notification
   */
  async showBreakReminder(tabId) {
    try {
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};
      const tabData = tabHistory[tabId];
      if (!tabData) {
        console.warn("No tab data found for break reminder");
        return;
      }
      const currentSessionTime = this.currentTabStartTime
        ? this.helpers.TimeUtils.timeDiff(this.currentTabStartTime)
        : 0;
      const totalTime = tabData.totalTime + currentSessionTime;
      // Send message to background script to show notification
      try {
        await chrome.runtime.sendMessage({
          type: "SHOW_BREAK_NOTIFICATION",
          tabId: tabId,
          timeSpent: totalTime,
        });
        } catch (error) {
        console.error("Error sending break reminder request:", error);
      }
    } catch (error) {
      console.error("Error showing break reminder:", error);
    }
  }
  /**
   * Show focus reminder notification
   */
  async showFocusReminder(focusUrl) {
    try {
      // Get current tab URL for context
      let currentUrl = null;
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs.length > 0) {
          currentUrl = tabs[0].url;
        }
      } catch (error) {
        console.warn("Could not get current tab URL for focus reminder");
      }
      // Send message to background script to show notification
      try {
        await chrome.runtime.sendMessage({
          type: "SHOW_FOCUS_NOTIFICATION",
          focusUrl: focusUrl,
          currentUrl: currentUrl,
        });
        } catch (error) {
        console.error("Error sending focus reminder request:", error);
      }
    } catch (error) {
      console.error("Error showing focus reminder:", error);
    }
  }
  /**
   * Update current session data in storage
   */
  async updateCurrentSession() {
    try {
      const sessionData = {
        focusTabId: this.focusTabId,
        focusUrl: this.focusTabUrl,
        lastFocusReminderTime: this.lastFocusReminderTime,
        lastBreakReminderTime: this.lastBreakReminderTime,
        sessionStartTime: this.helpers.TimeUtils.now(),
      };
      await this.storageManager.set(
        this.constants.STORAGE_KEYS.CURRENT_SESSION,
        sessionData
      );
    } catch (error) {
      console.error("Error updating current session:", error);
    }
  }
  /**
   * Clean up tab history entry
   */
  async cleanupTabHistory(tabId) {
    try {
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};
      if (tabHistory[tabId]) {
        delete tabHistory[tabId];
        await this.storageManager.set(
          this.constants.STORAGE_KEYS.TAB_HISTORY,
          tabHistory
        );
      }
    } catch (error) {
      console.error("Error cleaning up tab history:", error);
    }
  }
  /**
   * Reset focus tab
   */
  async resetFocusTab() {
    try {
      this.focusTabId = null;
      this.focusTabUrl = null;
      // Clear focus history when resetting
      await this.storageManager.set('focusHistory', {
        deviations: [],
        sessionDeviations: 0,
        totalDeviations: 0
      });
      await this.updateCurrentSession();
      } catch (error) {
      console.error("Error resetting focus tab:", error);
    }
  }
  /**
   * Get current tab statistics
   */
  async getCurrentTabStats() {
    try {
      if (!this.currentTabId) return null;
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};
      const tabData = tabHistory[this.currentTabId];
      if (!tabData) return null;
      const currentSessionTime = this.currentTabStartTime
        ? this.helpers.TimeUtils.timeDiff(this.currentTabStartTime)
        : 0;
      return {
        tabId: this.currentTabId,
        url: tabData.url,
        totalTime: tabData.totalTime + currentSessionTime,
        currentSessionTime: currentSessionTime,
        breakRemindersShown: tabData.breakRemindersShown || 0,
      };
    } catch (error) {
      console.error("Error getting current tab stats:", error);
      return null;
    }
  }
  /**
   * Get focus tab information
   */
  getFocusTabInfo() {
    return {
      tabId: this.focusTabId,
      url: this.focusTabUrl,
      isSet: Boolean(this.focusTabId && this.focusTabUrl),
    };
  }
  /**
   * Get focus session statistics
   */
  async getFocusSessionStats() {
    try {
      const sessionData = await this.storageManager.get(
        this.constants.STORAGE_KEYS.CURRENT_SESSION
      );
      const focusHistory = await this.storageManager.get('focusHistory') || {};
      // Calculate session time since focus was set
      const sessionStartTime = sessionData?.sessionStartTime || this.helpers.TimeUtils.now();
      const sessionTime = this.helpers.TimeUtils.timeDiff(sessionStartTime);
      // Get deviation count for current session
      const deviationCount = focusHistory.sessionDeviations || 0;
      // Check if currently on focus tab
      let isCurrentlyOnFocus = false;
      if (this.focusTabId && this.currentTabId) {
        try {
          const currentTab = await chrome.tabs.get(this.currentTabId);
          isCurrentlyOnFocus = this.urlsMatch(currentTab.url, this.focusTabUrl);
        } catch (error) {
          // Tab might not exist anymore
          isCurrentlyOnFocus = false;
        }
      }
      return {
        sessionTime: sessionTime,
        deviationCount: deviationCount,
        lastReminderTime: this.lastFocusReminderTime,
        isCurrentlyOnFocus: isCurrentlyOnFocus,
        focusTabSet: Boolean(this.focusTabId && this.focusTabUrl)
      };
    } catch (error) {
      console.error("Error getting focus session stats:", error);
      return {
        sessionTime: 0,
        deviationCount: 0,
        lastReminderTime: 0,
        isCurrentlyOnFocus: false,
        focusTabSet: false
      };
    }
  }
  /**
   * Get focus deviation history
   */
  async getFocusDeviationHistory() {
    try {
      const focusHistory = await this.storageManager.get('focusHistory') || {};
      return {
        deviations: focusHistory.deviations || [],
        sessionDeviations: focusHistory.sessionDeviations || 0,
        totalDeviations: focusHistory.totalDeviations || 0
      };
    } catch (error) {
      console.error("Error getting focus deviation history:", error);
      return {
        deviations: [],
        sessionDeviations: 0,
        totalDeviations: 0
      };
    }
  }
  /**
   * Manual break trigger (reset current tab timer)
   */
  async triggerManualBreak() {
    try {
      if (this.currentTabId) {
        await this.stopTrackingTab(this.currentTabId);
        // Reset the session start time
        this.currentTabStartTime = this.helpers.TimeUtils.now();
        // Reset break reminder time to prevent immediate notifications
        this.lastBreakReminderTime = this.helpers.TimeUtils.now();
        await this.updateCurrentSession();
        }
    } catch (error) {
      console.error("Error triggering manual break:", error);
    }
  }
}
// Export for use in service worker
if (typeof module !== "undefined" && module.exports) {
  module.exports = TabTracker;
} else if (typeof self !== "undefined") {
  self.TabTracker = TabTracker;
}
