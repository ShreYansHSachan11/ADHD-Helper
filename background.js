/**
 * Background Service Worker - Focus Productivity Extension
 * Handles tab tracking, notifications, and persistent background functionality
 */

// Initialize service worker
console.log("Focus Productivity Extension background service worker loaded");

// Global instances
let tabTracker = null;
let storageManager = null;
let geminiService = null;

// No imports - self-contained background script
console.log("Background script loaded without imports");

/**
 * Extension installation and startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/updated:", details.reason);

  try {
    // Initialize storage manager
    if (!storageManager) {
      storageManager = new StorageManager();
    }

    // Initialize default settings if this is a fresh install
    if (details.reason === "install") {
      await initializeDefaultSettings();
    }

    // Initialize tab tracker
    if (!tabTracker) {
      tabTracker = new TabTracker();
    }

    // Initialize Gemini service
    if (!geminiService) {
      geminiService = new GeminiService();
    }

    // Initialize notification system
    await initializeNotificationSystem();

    console.log("Background service worker initialized successfully");
  } catch (error) {
    console.error("Error initializing background service worker:", error);
  }
});

/**
 * Service worker startup (when browser starts)
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log("Browser startup detected");

  try {
    // Reinitialize components if needed
    if (!storageManager) {
      storageManager = new StorageManager();
    }
    if (!tabTracker) {
      tabTracker = new TabTracker();
    }

    // Reinitialize notification system
    await initializeNotificationSystem();
  } catch (error) {
    console.error("Error on startup:", error);
  }
});

/**
 * Initialize default settings for fresh installation
 */
async function initializeDefaultSettings() {
  try {
    const defaultData = {
      screenTimeSettings: {
        limitMinutes: 30,
        enabled: true,
        notificationsEnabled: true
      },
      focusSettings: {
        reminderCooldownMinutes: 5,
        trackingEnabled: true
      },
      breathingSettings: {
        inhaleSeconds: 4,
        holdSeconds: 4,
        exhaleSeconds: 4,
        pauseSeconds: 2
      },
      audioSettings: {
        whiteNoise: {
          enabled: false,
          volume: 0.5,
          currentSound: "rain"
        }
      },
      tabHistory: {},
      currentSession: {},
      tasks: [],
      apiKeys: {}
    };

    await storageManager.setMultiple(defaultData);
    console.log("Default settings initialized");
  } catch (error) {
    console.error("Error initializing default settings:", error);
  }
}

/**
 * Notification System
 */

// Notification state tracking
let notificationState = {
  activeNotifications: new Map(),
  lastBreakNotificationTime: 0,
  lastFocusNotificationTime: 0,
  notificationPermissionGranted: false,
};

/**
 * Initialize notification system and check permissions
 */
async function initializeNotificationSystem() {
  try {
    // Check if notifications permission is granted
    const permission = await chrome.notifications.getPermissionLevel();
    notificationState.notificationPermissionGranted = permission === "granted";

    if (!notificationState.notificationPermissionGranted) {
      console.warn("Notifications permission not granted");
    }

    console.log("Notification system initialized, permission:", permission);
  } catch (error) {
    console.error("Error initializing notification system:", error);
  }
}

/**
 * Create and display a notification with proper error handling
 */
async function createNotification(notificationId, options) {
  try {
    // Check permission first
    if (!notificationState.notificationPermissionGranted) {
      console.warn("Cannot show notification: permission not granted");
      return false;
    }

    // Clear any existing notification with the same ID
    if (notificationState.activeNotifications.has(notificationId)) {
      try {
        await chrome.notifications.clear(notificationId);
      } catch (error) {
        console.warn("Error clearing existing notification:", error);
      }
    }

    // Create the notification
    try {
      await chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: "/assets/icons/48.ico",
        ...options,
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
      return false;
    }

    // Track the notification
    notificationState.activeNotifications.set(notificationId, {
      createdAt: Date.now(),
      options: options,
    });

    // Auto-clear notification after 10 seconds if not dismissed
    setTimeout(async () => {
      try {
        await chrome.notifications.clear(notificationId);
        notificationState.activeNotifications.delete(notificationId);
      } catch (error) {
        // Notification might already be cleared
      }
    }, 10000);

    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
}

/**
 * Show break reminder notification
 */
async function showBreakReminderNotification(tabId, timeSpent) {
  try {
    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000; // 5 minutes

    // Check cooldown period
    if (now - notificationState.lastBreakNotificationTime < cooldownMs) {
      console.log("Break notification on cooldown");
      return false;
    }

    const notificationId = `break-reminder-${tabId}-${now}`;
    const timeFormatted = Math.floor(timeSpent / (1000 * 60)) + " minutes";

    const success = await createNotification(notificationId, {
      title: "Time for a Break! 🕐",
      message: `You've been on this tab for ${timeFormatted}. Consider taking a short break to rest your eyes and mind.`,
      buttons: [{ title: "Take Break" }, { title: "Continue Working" }],
    });

    if (success) {
      notificationState.lastBreakNotificationTime = now;
      console.log("Break reminder notification shown for tab", tabId);
    }

    return success;
  } catch (error) {
    console.error("Error showing break reminder notification:", error);
    return false;
  }
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

/**
 * Handle different types of messages
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    // Validate message structure
    if (!message || typeof message !== 'object' || !message.type) {
      sendResponse({ success: false, error: 'Invalid message format' });
      return;
    }

    switch (message.type) {
      case "GET_TAB_STATS":
        try {
          const stats = tabTracker ? await tabTracker.getCurrentTabStats() : null;
          sendResponse({ success: true, data: stats });
        } catch (error) {
          console.error('Error getting tab stats:', error);
          sendResponse({ success: false, error: 'Failed to get tab statistics' });
        }
        break;

      case "GET_FOCUS_INFO":
        try {
          const focusInfo = tabTracker ? tabTracker.getFocusTabInfo() : null;
          sendResponse({ success: true, data: focusInfo });
        } catch (error) {
          console.error('Error getting focus info:', error);
          sendResponse({ success: false, error: 'Failed to get focus information' });
        }
        break;

      case "SET_FOCUS_TAB":
        try {
          if (!tabTracker) {
            throw new Error('Tab tracker not initialized');
          }

          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          
          if (tabs.length === 0) {
            throw new Error('No active tab found');
          }

          // Check if tab is accessible
          const tab = tabs[0];
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            throw new Error('Cannot set focus on restricted tabs');
          }

          await tabTracker.setFocusTab(tab.id, tab.url);
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error setting focus tab:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "RESET_FOCUS_TAB":
        if (tabTracker) {
          await tabTracker.resetFocusTab();
          sendResponse({ success: true });
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;

      case "GET_FOCUS_SESSION_STATS":
        if (tabTracker) {
          const sessionStats = await tabTracker.getFocusSessionStats();
          sendResponse({ success: true, data: sessionStats });
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;

      case "GET_FOCUS_DEVIATION_HISTORY":
        if (tabTracker) {
          const deviationHistory = await tabTracker.getFocusDeviationHistory();
          sendResponse({ success: true, data: deviationHistory });
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;

      case "TRIGGER_MANUAL_BREAK":
        if (tabTracker) {
          await tabTracker.triggerManualBreak();
          sendResponse({ success: true });
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;

      case "CLEAR_TAB_HISTORY":
        await storageManager.set("tabHistory", {});
        await storageManager.set("currentSession", {});
        sendResponse({ success: true });
        break;

      case "SHOW_BREAK_NOTIFICATION":
        const breakSuccess = await showBreakReminderNotification(
          message.tabId,
          message.timeSpent
        );
        sendResponse({ success: breakSuccess });
        break;

      case "CHECK_NOTIFICATION_PERMISSION":
        const permission = await chrome.notifications.getPermissionLevel();
        sendResponse({
          success: true,
          data: {
            permission: permission,
            granted: permission === "granted",
          },
        });
        break;

      default:
        sendResponse({ success: false, error: "Unknown message type" });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle notification clicks
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    // Clear the notification
    await chrome.notifications.clear(notificationId);
    notificationState.activeNotifications.delete(notificationId);

    // Open extension popup
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.log("Could not open popup:", error);
    }
  } catch (error) {
    console.error("Error handling notification click:", error);
  }
});

/**
 * Handle notification button clicks
 */
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    try {
      // Clear the notification
      await chrome.notifications.clear(notificationId);
      notificationState.activeNotifications.delete(notificationId);

      // Handle different notification types based on button clicked
      if (notificationId.includes("break")) {
        if (buttonIndex === 0) {
          // "Take Break" button clicked
          if (tabTracker) {
            await tabTracker.triggerManualBreak();
            console.log("Manual break triggered from notification");
          }
        }
        // "Continue Working" (buttonIndex === 1) - no action needed, just dismiss
      }
    } catch (error) {
      console.error("Error handling notification button click:", error);
    }
  }
);

/**
 * Handle notification dismissal (when user closes notification)
 */
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  try {
    notificationState.activeNotifications.delete(notificationId);
    if (byUser) {
      console.log("Notification dismissed by user:", notificationId);
    }
  } catch (error) {
    console.error("Error handling notification dismissal:", error);
  }
});

// Initialize when service worker loads
(async () => {
  try {
    if (!storageManager) {
      storageManager = new StorageManager();
    }
    if (!tabTracker) {
      tabTracker = new TabTracker();
    }
    if (!geminiService) {
      geminiService = new GeminiService();
    }
    await initializeNotificationSystem();
    console.log("Service worker initialization complete");
  } catch (error) {
    console.error("Error during initial load:", error);
  }
})();