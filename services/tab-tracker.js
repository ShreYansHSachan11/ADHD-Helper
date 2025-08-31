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
      console.log("TabTracker initialized successfully");
    } catch (error) {
      console.error("TabTracker initialization error:", error);
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
   * Handle tab activation event
   */
  async handleTabActivated(tabId) {
    try {
      // Stop tracking previous tab
      if (this.currentTabId && this.currentTabId !== tabId) {
        await this.stopTrackingTab(this.currentTabId);
      }

      // Get tab info and start tracking
      const tab = await chrome.tabs.get(tabId);
      await this.startTrackingTab(tabId, tab.url);

      // Check for focus deviation
      await this.checkFocusDeviation(tabId, tab.url);
    } catch (error) {
      console.error("Error handling tab activation:", error);
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

      console.log(`Started tracking tab ${tabId}: ${url}`);
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

      console.log(
        `Stopped tracking tab ${tabId}, session time: ${this.helpers.FormatUtils.formatDuration(
          sessionTime
        )}`
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
   * Update tab total time
   */
  async updateTabTime(tabId, sessionTime) {
    try {
      const tabHistory =
        (await this.storageManager.get(
          this.constants.STORAGE_KEYS.TAB_HISTORY
        )) || {};

      if (tabHistory[tabId]) {
        tabHistory[tabId].totalTime += sessionTime;
        tabHistory[tabId].lastActiveTime = this.helpers.TimeUtils.now();

        await this.storageManager.set(
          this.constants.STORAGE_KEYS.TAB_HISTORY,
          tabHistory
        );
      }
    } catch (error) {
      console.error("Error updating tab time:", error);
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

      await this.updateCurrentSession();

      console.log(`Set focus tab ${tabId}: ${url}`);
    } catch (error) {
      console.error("Error setting focus tab:", error);
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

      // Check cooldown period
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
      const timeSpent = tabData
        ? this.helpers.FormatUtils.formatTimeForUI(tabData.totalTime)
        : "some time";

      await chrome.notifications.create({
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        title: "Time for a Break!",
        message: `You've been on this tab for ${timeSpent}. Consider taking a short break.`,
        buttons: [{ title: "Take Break" }, { title: "Continue Working" }],
      });

      console.log("Break reminder shown for tab", tabId);
    } catch (error) {
      console.error("Error showing break reminder:", error);
    }
  }

  /**
   * Show focus reminder notification
   */
  async showFocusReminder(focusUrl) {
    try {
      const domain = new URL(focusUrl).hostname;

      await chrome.notifications.create({
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        title: "Stay Focused!",
        message: `Remember to stay focused on ${domain}. You switched away from your initial task.`,
        buttons: [{ title: "Return to Task" }, { title: "Update Focus" }],
      });

      console.log("Focus reminder shown for", focusUrl);
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
      await this.updateCurrentSession();

      console.log("Focus tab reset");
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

        console.log("Manual break triggered for tab", this.currentTabId);
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
