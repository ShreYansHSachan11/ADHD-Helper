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
let pomodoroService = null;
let breakTimerManager = null;
let breakNotificationSystem = null;
let distractionReminderService = null;

// Distraction Reminder Variables (directly in background)
let focusTabId = null;
let focusTabUrl = null;
let distractionTimer = null;
let lastReminderTime = 0;
let reminderCount = 0;
let distractionReminderEnabled = true;

// Distraction Reminder Config
const DISTRACTION_CONFIG = {
  distractionDelayMs: 3000, // 3 seconds delay before showing reminder
  reminderCooldownMs: 2 * 60 * 1000, // 2 minutes between reminders
  maxRemindersPerSession: 10, // Max reminders per session
};

// Import service dependencies
try {
  importScripts(
    "/utils/constants.js",
    "/utils/helpers.js",
    "/utils/break-error-handler.js",
    "/utils/performance-monitor.js",
    "/services/storage-manager.js",
    "/services/break-settings-manager.js",
    "/services/break-timer-manager.js",
    "/services/break-notification-system.js",
    "/services/break-analytics-tracker.js",
    "/services/tab-tracker.js",
    "/services/gemini-service.js",
    "/services/pomodoro-service.js"
  );
  console.log("All service dependencies loaded successfully");
} catch (error) {
  console.error("Error loading service dependencies:", error);
}

console.log("Background script loaded with service dependencies");

/**
 * Extension installation and startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/updated:", details.reason);

  try {
    // Initialize storage manager (singleton pattern)
    if (!storageManager && typeof StorageManager !== 'undefined') {
      console.log("Getting StorageManager instance...");
      console.log("StorageManager.getInstance available:", typeof StorageManager.getInstance);

      if (typeof StorageManager.getInstance === 'function') {
        storageManager = StorageManager.getInstance();
      } else {
        console.log("getInstance not available, creating new instance");
        storageManager = new StorageManager();
      }
      console.log("StorageManager instance obtained successfully");
    }

    // Initialize default settings if this is a fresh install
    if (details.reason === "install") {
      await initializeDefaultSettings();
    }

    // Initialize break timer manager first (required by tab tracker)
    if (!breakTimerManager && typeof BreakTimerManager !== 'undefined') {
      console.log("Initializing BreakTimerManager...");
      breakTimerManager = new BreakTimerManager();
      // Set storage manager dependency
      if (storageManager) {
        breakTimerManager.storageManager = storageManager;
      }
      await breakTimerManager.init();
      console.log("BreakTimerManager initialized successfully");
    }

    // Initialize break notification system
    if (!breakNotificationSystem && typeof BreakNotificationSystem !== 'undefined') {
      console.log("Initializing BreakNotificationSystem...");
      breakNotificationSystem = new BreakNotificationSystem();
      if (breakTimerManager) {
        breakNotificationSystem.setBreakTimerManager(breakTimerManager);
      }
      console.log("BreakNotificationSystem initialized successfully");
    }

    // Initialize distraction reminder (direct in background)
    initializeDistractionReminder();

    // Initialize tab tracker (will integrate with break timer manager)
    if (!tabTracker && typeof TabTracker !== 'undefined') {
      console.log("Initializing TabTracker...");
      try {
        tabTracker = new TabTracker();
        // Set all dependencies BEFORE initialization
        if (storageManager) {
          tabTracker.storageManager = storageManager;
        }
        if (typeof CONSTANTS !== 'undefined') {
          tabTracker.constants = CONSTANTS;
        }
        if (typeof HELPERS !== 'undefined') {
          tabTracker.helpers = HELPERS;
        }
        // Set break timer manager reference for integration
        if (breakTimerManager) {
          tabTracker.setBreakTimerManager(breakTimerManager);
        }

        console.log("TabTracker initialized successfully");
      } catch (error) {
        console.error("Error initializing TabTracker:", error);
        tabTracker = null;
      }
    } else if (!tabTracker) {
      console.warn("TabTracker class not available");
    }

    // Initialize Gemini service
    if (!geminiService && typeof GeminiService !== 'undefined') {
      geminiService = new GeminiService();
    }

    // Initialize Pomodoro service for background alarms
    if (!pomodoroService && typeof PomodoroService !== 'undefined') {
      pomodoroService = new PomodoroService();
    }

    // Initialize notification system
    await initializeNotificationSystem();

    // Distraction reminder is now initialized directly in background

    console.log("Background service worker initialized successfully with integrated work time tracking");
  } catch (error) {
    console.error("Error initializing background service worker:", error);
  }
});

/**
 * Service worker startup (when browser starts)
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log("Browser startup detected - recovering work time tracking state");

  try {
    // Reinitialize components if needed
    if (!storageManager && typeof StorageManager !== 'undefined') {
      if (typeof StorageManager.getInstance === 'function') {
        storageManager = StorageManager.getInstance();
      } else {
        storageManager = new StorageManager();
      }
    }

    // Initialize break timer manager first for state recovery
    if (!breakTimerManager && typeof BreakTimerManager !== 'undefined') {
      breakTimerManager = new BreakTimerManager();
    }

    // Initialize break notification system
    if (!breakNotificationSystem && typeof BreakNotificationSystem !== 'undefined') {
      breakNotificationSystem = new BreakNotificationSystem();
      if (breakTimerManager) {
        breakNotificationSystem.setBreakTimerManager(breakTimerManager);
      }
    }

    // Initialize distraction reminder (direct in background)
    initializeDistractionReminder();

    // Initialize tab tracker (will recover timer state)
    if (!tabTracker && typeof TabTracker !== 'undefined') {
      try {
        tabTracker = new TabTracker();
        // Set all dependencies BEFORE initialization
        if (storageManager) {
          tabTracker.storageManager = storageManager;
        }
        if (typeof CONSTANTS !== 'undefined') {
          tabTracker.constants = CONSTANTS;
        }
        if (typeof HELPERS !== 'undefined') {
          tabTracker.helpers = HELPERS;
        }
        // Set break timer manager reference for integration
        if (breakTimerManager) {
          tabTracker.setBreakTimerManager(breakTimerManager);
        }

        console.log("TabTracker initialized on startup");
      } catch (error) {
        console.error("Error initializing TabTracker on startup:", error);
        tabTracker = null;
      }
    } else if (tabTracker) {
      // If tab tracker exists, trigger state recovery
      try {
        await tabTracker.recoverTimerStateAfterRestart();
      } catch (error) {
        console.error("Error recovering tab tracker state:", error);
      }
    }

    // Reinitialize notification system
    await initializeNotificationSystem();

    console.log("Browser startup recovery completed - work time tracking restored");
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
        notificationsEnabled: true,
      },
      focusSettings: {
        reminderCooldownMinutes: 5,
        trackingEnabled: true,
      },
      breathingSettings: {
        inhaleSeconds: 4,
        holdSeconds: 4,
        exhaleSeconds: 4,
        pauseSeconds: 2,
      },
      audioSettings: {
        whiteNoise: {
          enabled: false,
          volume: 0.5,
          currentSound: "rain",
        },
      },
      tabHistory: {},
      currentSession: {},
      tasks: [],
      apiKeys: {},
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

    // Set up periodic break timer checking
    await chrome.alarms.create("break_timer_check", {
      delayInMinutes: 1,
      periodInMinutes: 1
    });

    // Set up periodic distraction reminder checking
    await chrome.alarms.create("distraction-reminder-check", {
      delayInMinutes: 0.5, // Check every 30 seconds
      periodInMinutes: 0.5
    });

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
 * Show break timer notification (30-minute work time threshold)
 */
async function showBreakTimerNotification(workTime, workMinutes) {
  try {
    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000; // 5 minutes

    // Check cooldown period
    if (now - notificationState.lastBreakNotificationTime < cooldownMs) {
      console.log("Break timer notification on cooldown");
      return false;
    }

    const notificationId = `break-timer-${now}`;

    const success = await createNotification(notificationId, {
      title: "Break Reminder! ⏰",
      message: `You've been working for ${workMinutes} minutes. Time to take a break!`,
      buttons: [
        { title: "Short Break (5 min)" },
        { title: "Medium Break (15 min)" },
        { title: "Long Break (30 min)" }
      ],
    });

    if (success) {
      notificationState.lastBreakNotificationTime = now;
      console.log("Break timer notification shown, work time:", workMinutes, "minutes");
    }

    return success;
  } catch (error) {
    console.error("Error showing break timer notification:", error);
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
 * Handle Chrome alarms for Pomodoro timer and break timers
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log("Alarm triggered:", alarm.name);

  if (alarm.name.startsWith("pomodoro_")) {
    await handlePomodoroAlarm(alarm);
  } else if (alarm.name.startsWith("break_")) {
    await handleBreakAlarm(alarm);
  } else if (alarm.name === "break_timer_check") {
    await handleBreakTimerCheck();
  } else if (alarm.name === "distraction-reminder-check") {
    await handleDistractionReminderCheck();
  }
});

/**
 * Handle Pomodoro timer alarms
 */
async function handlePomodoroAlarm(alarm) {
  try {
    const sessionId = alarm.name.replace("pomodoro_", "");

    // Get current session from storage
    const currentSession = await storageManager.get("pomodoroCurrentSession");

    if (currentSession && currentSession.id === sessionId) {
      // Session completed
      await completePomodoroSession(currentSession);
    }
  } catch (error) {
    console.error("Error handling Pomodoro alarm:", error);
  }
}

/**
 * Complete a Pomodoro session
 */
async function completePomodoroSession(session) {
  try {
    // Mark session as completed
    session.isActive = false;
    session.completedAt = Date.now();
    session.wasCompleted = true;

    // Save to history
    const history = (await storageManager.get("pomodoroHistory")) || [];
    history.push(session);

    // Keep only last 100 sessions
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    await storageManager.set("pomodoroHistory", history);

    // Update statistics
    await updatePomodoroStats("completed", session.type);

    // Remove current session
    await storageManager.remove("pomodoroCurrentSession");

    // Show completion notification
    const sessionTypeName = formatPomodoroSessionType(session.type);
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icons/48.ico",
      title: `${sessionTypeName} Completed!`,
      message: "Great job! Time for the next session.",
      priority: 2,
    });

    console.log("Pomodoro session completed:", session.type);
  } catch (error) {
    console.error("Error completing Pomodoro session:", error);
  }
}

/**
 * Update Pomodoro statistics
 */
async function updatePomodoroStats(action, sessionType) {
  try {
    const today = new Date().toDateString();
    const stats = (await storageManager.get("pomodoroStats")) || {};

    if (!stats[today]) {
      stats[today] = {
        workSessions: 0,
        shortBreaks: 0,
        longBreaks: 0,
        totalWorkTime: 0,
        totalBreakTime: 0,
        sessionsStarted: 0,
        sessionsCompleted: 0,
        sessionsStopped: 0,
      };
    }

    const todayStats = stats[today];

    if (action === "completed") {
      todayStats.sessionsCompleted++;

      // Get default durations (should match PomodoroService defaults)
      const durations = {
        work: 25,
        shortBreak: 5,
        longBreak: 15,
      };

      if (sessionType === "work") {
        todayStats.workSessions++;
        todayStats.totalWorkTime += durations.work;
      } else if (sessionType === "shortBreak") {
        todayStats.shortBreaks++;
        todayStats.totalBreakTime += durations.shortBreak;
      } else if (sessionType === "longBreak") {
        todayStats.longBreaks++;
        todayStats.totalBreakTime += durations.longBreak;
      }
    }

    await storageManager.set("pomodoroStats", stats);
    return todayStats;
  } catch (error) {
    console.error("Error updating Pomodoro stats:", error);
    return null;
  }
}

/**
 * Handle break timer alarms
 */
async function handleBreakAlarm(alarm) {
  try {
    if (!breakTimerManager) return;

    const timerStatus = breakTimerManager.getTimerStatus();

    if (timerStatus && timerStatus.isOnBreak) {
      // Check if break should end
      const remainingTime = breakTimerManager.getRemainingBreakTime();

      if (remainingTime <= 0) {
        await breakTimerManager.endBreak();

        // Show break completion notification
        await createNotification(`break-complete-${Date.now()}`, {
          title: "Break Complete! 🎯",
          message: "Your break is over. Ready to get back to work?",
          buttons: [{ title: "Start Working" }],
        });

        console.log("Break completed via alarm");
      }
    }
  } catch (error) {
    console.error("Error handling break alarm:", error);
  }
}

/**
 * Handle periodic break timer checks
 */
async function handleBreakTimerCheck() {
  try {
    if (!breakTimerManager || !breakNotificationSystem) return;

    const timerStatus = breakTimerManager.getTimerStatus();

    if (timerStatus && timerStatus.isOnBreak) {
      const remainingTime = breakTimerManager.getRemainingBreakTime();

      // Update badge with remaining time
      await breakTimerManager.updateExtensionBadge();

      // If break time is up, end the break
      if (remainingTime <= 0) {
        await breakTimerManager.endBreak();

        // Show break completion notification using the notification system
        await breakNotificationSystem.showBreakCompletionNotification(timerStatus.breakType || "break");

        console.log("Break completed via periodic check");
      }
    } else {
      // Check if work time threshold is exceeded and show notification
      await breakNotificationSystem.checkAndNotifyWorkTimeThreshold();
    }
  } catch (error) {
    console.error("Error in break timer check:", error);
  }
}

/**
 * Handle periodic distraction reminder checks
 */
async function handleDistractionReminderCheck() {
  try {
    console.log("=== DISTRACTION REMINDER CHECK ===");
    console.log("Enabled:", distractionReminderEnabled);
    console.log("Focus tab ID:", focusTabId);
    console.log("Focus tab URL:", focusTabUrl);
    
    if (!distractionReminderEnabled) {
      console.log("Distraction reminder disabled, skipping check");
      return;
    }
    
    if (!focusTabId) {
      console.log("No focus tab set, skipping check");
      return;
    }

    // Check if the focus tab is currently active
    let focusTabInfo;
    try {
      focusTabInfo = await chrome.tabs.get(focusTabId);
      console.log("Focus tab info:", focusTabInfo.active, focusTabInfo.url);
    } catch (error) {
      console.log("Focus tab no longer exists:", error.message);
      // Focus tab was closed, reset
      focusTabId = null;
      focusTabUrl = null;
      clearDistractionTimer();
      return;
    }
    
    // If focus tab is currently active, clear any pending timer
    if (focusTabInfo.active) {
      console.log("Focus tab is currently active, clearing timer");
      clearDistractionTimer();
      return;
    }

    console.log("Focus tab is NOT currently active");
    console.log("Distraction timer active:", !!distractionTimer);
    
    // If focus tab is not active and no timer is running, start one
    if (!distractionTimer) {
      console.log("Starting distraction timer");
      startDistractionTimer();
    } else {
      console.log("Distraction timer already running");
    }
    
    console.log("=== END DISTRACTION REMINDER CHECK ===");

  } catch (error) {
    console.error("Error in distraction reminder check:", error);
  }
}

/**
 * Initialize distraction reminder directly in background script
 */
function initializeDistractionReminder() {
  console.log("Initializing distraction reminder in background script");

  // Load focus tab info from storage
  loadFocusTabInfo();

  // Set up tab change listeners
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await handleTabActivated(activeInfo.tabId);
  });

  // Listen for window focus changes
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus - clear any pending timers
      clearDistractionTimer();
    }
  });

  console.log("Distraction reminder initialized successfully");
}

/**
 * Load focus tab info from storage
 */
async function loadFocusTabInfo() {
  try {
    if (!storageManager) return;

    const sessionData = await storageManager.get('currentSession');
    if (sessionData) {
      focusTabId = sessionData.focusTabId;
      focusTabUrl = sessionData.focusUrl;
      console.log("Loaded focus tab:", focusTabId, focusTabUrl);
    }
  } catch (error) {
    console.error("Error loading focus tab info:", error);
  }
}

/**
 * Handle tab activation (user switches tabs)
 */
async function handleTabActivated(tabId) {
  try {
    console.log("=== TAB ACTIVATION ===");
    console.log("Tab activated:", tabId);
    console.log("Distraction reminder enabled:", distractionReminderEnabled);
    console.log("Focus tab ID:", focusTabId);
    
    if (!distractionReminderEnabled) {
      console.log("Distraction reminder disabled, ignoring tab activation");
      return;
    }
    
    if (!focusTabId) {
      console.log("No focus tab set, ignoring tab activation");
      return;
    }

    if (tabId === focusTabId) {
      // User returned to focus tab - clear any pending reminder
      console.log("User returned to focus tab, clearing timer");
      clearDistractionTimer();
    } else {
      // User switched away from focus tab - start distraction timer
      console.log("User switched away from focus tab, starting timer");
      startDistractionTimer();
    }
    console.log("=== END TAB ACTIVATION ===");
  } catch (error) {
    console.error("Error handling tab activation:", error);
  }
}

/**
 * Start distraction timer (3 second delay before showing reminder)
 */
function startDistractionTimer() {
  // Clear any existing timer
  clearDistractionTimer();

  // Start new timer
  distractionTimer = setTimeout(async () => {
    await showDistractionReminder();
  }, DISTRACTION_CONFIG.distractionDelayMs);

  console.log("Distraction timer started");
}

/**
 * Clear distraction timer
 */
function clearDistractionTimer() {
  if (distractionTimer) {
    clearTimeout(distractionTimer);
    distractionTimer = null;
    console.log("Distraction timer cleared");
  }
}

/**
 * Show distraction reminder notification
 */
async function showDistractionReminder() {
  try {
    console.log("=== DISTRACTION REMINDER DEBUG ===");
    console.log("Focus tab ID:", focusTabId);
    console.log("Focus tab URL:", focusTabUrl);
    console.log("Distraction reminder enabled:", distractionReminderEnabled);
    
    const now = Date.now();

    // Check cooldown period
    const timeSinceLastReminder = now - lastReminderTime;
    console.log("Time since last reminder:", timeSinceLastReminder, "ms");
    console.log("Cooldown period:", DISTRACTION_CONFIG.reminderCooldownMs, "ms");
    
    if (timeSinceLastReminder < DISTRACTION_CONFIG.reminderCooldownMs) {
      console.log("Still in cooldown period, skipping reminder");
      return false;
    }

    // Check max reminders per session
    console.log("Current reminder count:", reminderCount);
    console.log("Max reminders per session:", DISTRACTION_CONFIG.maxRemindersPerSession);
    
    if (reminderCount >= DISTRACTION_CONFIG.maxRemindersPerSession) {
      console.log("Max reminders reached for this session");
      return false;
    }

    console.log("All checks passed, proceeding to show distraction reminder");

    // Check notification permission first
    try {
      const permission = await chrome.notifications.getPermissionLevel();
      console.log("Notification permission level:", permission);
      
      if (permission !== "granted") {
        console.warn("Notification permission not granted, cannot show distraction reminder");
        return false;
      }
    } catch (permError) {
      console.error("Error checking notification permission:", permError);
      return false;
    }

    const notificationId = `distraction-reminder-${now}`;
    const focusDomain = focusTabUrl ? extractDomain(focusTabUrl) : 'your focus tab';

    const messages = [
      `Your focus tab (${focusDomain}) is waiting for you! 🚀`,
      `Stay focused! Return to ${focusDomain} to continue your work.`,
      `Distraction detected! Time to get back to ${focusDomain}.`,
      `Focus reminder: You were working on ${focusDomain}. Ready to continue?`,
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];

    const notificationOptions = {
      type: "basic",
      iconUrl: "/assets/icons/icon48.png", // Fixed path with leading slash
      title: "🎯 Stay Focused!",
      message: message,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: "Return to Focus" },
        { title: "Dismiss" }
      ]
    };

    console.log("Creating notification with ID:", notificationId);
    console.log("Notification options:", notificationOptions);

    try {
      await chrome.notifications.create(notificationId, notificationOptions);
      console.log("✅ Notification created successfully with ID:", notificationId);
    } catch (createError) {
      console.error("❌ Failed to create notification:", createError);
      
      // Try with simpler options as fallback
      const fallbackOptions = {
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        title: "🎯 Stay Focused!",
        message: message
      };
      
      console.log("Trying fallback notification options:", fallbackOptions);
      await chrome.notifications.create(notificationId, fallbackOptions);
      console.log("✅ Fallback notification created successfully");
    }

    // Update tracking
    lastReminderTime = now;
    reminderCount++;

    console.log(`✅ Distraction reminder shown (${reminderCount}/${DISTRACTION_CONFIG.maxRemindersPerSession})`);
    console.log("=== END DISTRACTION REMINDER DEBUG ===");
    return true;

  } catch (error) {
    console.error("❌ Error showing distraction reminder:", error);
    console.log("=== END DISTRACTION REMINDER DEBUG ===");
    return false;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}

/**
 * Handle distraction reminder notification button clicks
 */
async function handleDistractionReminderButtonClick(notificationId, buttonIndex) {
  try {
    // Clear the notification
    await chrome.notifications.clear(notificationId);

    if (buttonIndex === 0) {
      // "Return to Focus" button
      if (focusTabId) {
        try {
          await chrome.tabs.update(focusTabId, { active: true });
          console.log("Switched to focus tab from notification");
        } catch (error) {
          console.error("Error switching to focus tab:", error);
        }
      }
    }
    // Button index 1 is "Dismiss" - just clear the notification (already done above)

  } catch (error) {
    console.error("Error handling distraction reminder button click:", error);
  }
}



/**
 * Format Pomodoro session type for display
 */
function formatPomodoroSessionType(type) {
  switch (type) {
    case "work":
      return "Work Session";
    case "shortBreak":
      return "Short Break";
    case "longBreak":
      return "Long Break";
    default:
      return "Session";
  }
}

/**
 * Handle different types of messages
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    // Validate message structure
    if (!message || typeof message !== "object" || !message.type) {
      sendResponse({ success: false, error: "Invalid message format" });
      return;
    }

    switch (message.type) {
      case "GET_TAB_STATS":
        try {
          const stats = tabTracker
            ? await tabTracker.getCurrentTabStats()
            : null;
          sendResponse({ success: true, data: stats });
        } catch (error) {
          console.error("Error getting tab stats:", error);
          sendResponse({
            success: false,
            error: "Failed to get tab statistics",
          });
        }
        break;

      case "GET_FOCUS_INFO":
        try {
          const focusInfo = tabTracker ? tabTracker.getFocusTabInfo() : null;
          sendResponse({ success: true, data: focusInfo });
        } catch (error) {
          console.error("Error getting focus info:", error);
          sendResponse({
            success: false,
            error: "Failed to get focus information",
          });
        }
        break;

      case "SET_FOCUS_TAB":
        try {
          if (!tabTracker) {
            throw new Error("Tab tracker not initialized");
          }

          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          if (tabs.length === 0) {
            throw new Error("No active tab found");
          }

          // Check if tab is accessible
          const tab = tabs[0];
          if (
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("chrome-extension://") ||
            tab.url.startsWith("edge://") ||
            tab.url.startsWith("about:") ||
            tab.url.startsWith("moz-extension://") ||
            tab.url === "about:blank"
          ) {
            const domain = new URL(tab.url).protocol;
            throw new Error(`Cannot set focus on ${domain} pages. Please navigate to a regular website first.`);
          }

          await tabTracker.setFocusTab(tab.id, tab.url);

          // Set focus tab for distraction reminder
          focusTabId = tab.id;
          focusTabUrl = tab.url;
          reminderCount = 0; // Reset reminder count for new session
          console.log("Focus tab set for distraction reminder:", focusTabId, focusTabUrl);

          sendResponse({ success: true });
        } catch (error) {
          console.error("Error setting focus tab:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "RESET_FOCUS_TAB":
        if (tabTracker) {
          await tabTracker.resetFocusTab();

          // Reset focus tab for distraction reminder
          focusTabId = null;
          focusTabUrl = null;
          reminderCount = 0;
          clearDistractionTimer();
          console.log("Focus tab reset for distraction reminder");

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

      // SHOW_FOCUS_NOTIFICATION is no longer needed - handled directly by tab listeners

      case "SHOW_BREAK_TIMER_NOTIFICATION":
        try {
          if (!breakNotificationSystem) {
            throw new Error("Break notification system not initialized");
          }

          const breakTimerSuccess = await breakNotificationSystem.showWorkTimeThresholdNotification(
            message.workMinutes
          );
          sendResponse({ success: breakTimerSuccess });
        } catch (error) {
          console.error("Error showing break timer notification:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "CHECK_NOTIFICATION_PERMISSION":
        try {
          if (breakNotificationSystem) {
            const granted = await breakNotificationSystem.checkNotificationPermission();
            const permission = await chrome.notifications.getPermissionLevel();
            sendResponse({
              success: true,
              data: {
                permission: permission,
                granted: granted,
              },
            });
          } else {
            const permission = await chrome.notifications.getPermissionLevel();
            sendResponse({
              success: true,
              data: {
                permission: permission,
                granted: permission === "granted",
              },
            });
          }
        } catch (error) {
          console.error("Error checking notification permission:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "POMODORO_START_SESSION":
        try {
          const { type, duration } = message;
          const sessionId = `pomodoro_${Date.now()}`;

          // Create alarm for session completion
          await chrome.alarms.create(sessionId, {
            delayInMinutes: duration,
          });

          sendResponse({
            success: true,
            sessionId: sessionId,
          });
        } catch (error) {
          console.error("Error starting Pomodoro session:", error);
          sendResponse({
            success: false,
            error: error.message,
          });
        }
        break;

      case "POMODORO_STOP_SESSION":
        try {
          const { sessionId } = message;

          // Clear the alarm
          if (sessionId) {
            await chrome.alarms.clear(sessionId);
          }

          sendResponse({
            success: true,
          });
        } catch (error) {
          console.error("Error stopping Pomodoro session:", error);
          sendResponse({
            success: false,
            error: error.message,
          });
        }
        break;

      case "GET_BREAK_TIMER_STATUS":
        try {
          if (!breakTimerManager) {
            throw new Error("Break timer manager not initialized");
          }

          const status = breakTimerManager.getTimerStatus();
          sendResponse({ success: true, data: status });
        } catch (error) {
          console.error("Error getting break timer status:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "START_BREAK":
        try {
          if (!breakTimerManager) {
            throw new Error("Break timer manager not initialized");
          }

          const { breakType, durationMinutes } = message;
          const success = await breakTimerManager.startBreak(breakType, durationMinutes);

          if (success) {
            // Set up alarm for break completion
            const alarmName = `break_${breakType}_${Date.now()}`;
            await chrome.alarms.create(alarmName, {
              delayInMinutes: durationMinutes
            });
            console.log(`Break alarm set for ${durationMinutes} minutes`);
          }

          sendResponse({ success: success });
        } catch (error) {
          console.error("Error starting break:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "END_BREAK":
        try {
          if (!breakTimerManager) {
            throw new Error("Break timer manager not initialized");
          }

          const success = await breakTimerManager.endBreak();
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error ending break:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "CANCEL_BREAK":
        try {
          if (!breakTimerManager) {
            throw new Error("Break timer manager not initialized");
          }

          const success = await breakTimerManager.cancelBreak();
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error cancelling break:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "RESET_WORK_TIMER":
        try {
          if (!breakTimerManager) {
            throw new Error("Break timer manager not initialized");
          }

          const success = await breakTimerManager.resetWorkTimer();
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error resetting work timer:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "GET_INTEGRATED_TIMER_STATUS":
        try {
          if (!tabTracker) {
            throw new Error("Tab tracker not initialized");
          }

          const status = await tabTracker.getIntegratedTimerStatus();
          sendResponse({ success: true, data: status });
        } catch (error) {
          console.error("Error getting integrated timer status:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "UPDATE_WORK_TIME_THRESHOLD":
        try {
          if (!breakTimerManager) {
            throw new Error("Break timer manager not initialized");
          }

          const { minutes } = message;
          const success = await breakTimerManager.updateWorkTimeThreshold(minutes);
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error updating work time threshold:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "GET_NOTIFICATION_STATUS":
        try {
          if (!breakNotificationSystem) {
            throw new Error("Break notification system not initialized");
          }

          const status = breakNotificationSystem.getNotificationStatus();
          sendResponse({ success: true, data: status });
        } catch (error) {
          console.error("Error getting notification status:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "CLEAR_ALL_NOTIFICATIONS":
        try {
          if (!breakNotificationSystem) {
            throw new Error("Break notification system not initialized");
          }

          const success = await breakNotificationSystem.clearAllNotifications();
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error clearing all notifications:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "UPDATE_BREAK_TYPES":
        try {
          if (!breakNotificationSystem) {
            throw new Error("Break notification system not initialized");
          }

          const { breakTypes } = message;
          const success = await breakNotificationSystem.updateBreakTypes(breakTypes);
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error updating break types:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "GET_DISTRACTION_REMINDER_STATUS":
        try {
          if (!distractionReminderService) {
            throw new Error("Distraction reminder service not initialized");
          }

          const status = distractionReminderService.getStatus();
          sendResponse({ success: true, data: status });
        } catch (error) {
          console.error("Error getting distraction reminder status:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "UPDATE_DISTRACTION_REMINDER_PREFERENCES":
        try {
          if (!distractionReminderService) {
            throw new Error("Distraction reminder service not initialized");
          }

          const { preferences } = message;
          const success = await distractionReminderService.updatePreferences(preferences);
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error updating distraction reminder preferences:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "RESET_DISTRACTION_REMINDER_SESSION":
        try {
          if (!distractionReminderService) {
            throw new Error("Distraction reminder service not initialized");
          }

          distractionReminderService.resetSession();
          sendResponse({ success: true });
        } catch (error) {
          console.error("Error resetting distraction reminder session:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "DISMISS_DISTRACTION_REMINDER":
        try {
          if (!distractionReminderService) {
            throw new Error("Distraction reminder service not initialized");
          }

          const { popupId } = message;
          const success = await distractionReminderService.dismissPopup(popupId);
          sendResponse({ success: success });
        } catch (error) {
          console.error("Error dismissing distraction reminder:", error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      case "TEST_DISTRACTION_REMINDER":
        try {
          console.log("Testing distraction reminder notification...");

          // Create a direct test notification to verify the system works
          const testNotificationId = `test-distraction-reminder-${Date.now()}`;

          const testNotification = {
            type: "basic",
            iconUrl: "assets/icons/icon48.png",
            title: "🎯 Test Focus Reminder",
            message: "This is a test distraction reminder. If you see this, the system is working!",
            priority: 2,
            requireInteraction: true,
            buttons: [
              { title: "Return to Focus" },
              { title: "Take Break" },
              { title: "Dismiss" }
            ]
          };

          await chrome.notifications.create(testNotificationId, testNotification);
          console.log("Test notification created successfully");

          // Also test the direct distraction reminder
          if (focusTabId) {
            setTimeout(async () => {
              await showDistractionReminder();
            }, 2000); // Show in 2 seconds
            console.log("Direct distraction reminder test scheduled");
          }

          sendResponse({ success: true, message: "Test notification shown immediately. If focus tab is set, another will appear in 2 seconds." });
        } catch (error) {
          console.error("Error testing distraction reminder:", error);
          sendResponse({ success: false, error: error.message });
        }
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
    // Handle distraction reminder notifications
    if (notificationId.includes("distraction-reminder")) {
      await chrome.notifications.clear(notificationId);
      
      // Return to focus tab when notification is clicked
      if (focusTabId) {
        try {
          await chrome.tabs.update(focusTabId, { active: true });
          console.log("Switched to focus tab from notification click");
        } catch (error) {
          console.error("Error switching to focus tab:", error);
        }
      }
      return;
    }

    if (breakNotificationSystem) {
      await breakNotificationSystem.handleNotificationClick(notificationId);
    } else {
      // Fallback to legacy handling
      await chrome.notifications.clear(notificationId);
      notificationState.activeNotifications.delete(notificationId);

      // Open extension popup
      try {
        await chrome.action.openPopup();
      } catch (error) {
        console.log("Could not open popup:", error);
      }
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
      // Handle distraction reminder notifications first
      if (notificationId.includes("distraction-reminder")) {
        await handleDistractionReminderButtonClick(notificationId, buttonIndex);
        return;
      }

      if (breakNotificationSystem) {
        await breakNotificationSystem.handleNotificationButtonClick(notificationId, buttonIndex);
      } else {
        // Fallback to legacy handling
        await chrome.notifications.clear(notificationId);
        notificationState.activeNotifications.delete(notificationId);

        // Handle different notification types based on button clicked
        if (notificationId.includes("break-timer")) {
          // Break timer notification with break type selection
          const breakTypes = [
            { type: "short", duration: 5 },
            { type: "medium", duration: 15 },
            { type: "long", duration: 30 }
          ];

          if (buttonIndex >= 0 && buttonIndex < breakTypes.length) {
            const selectedBreak = breakTypes[buttonIndex];

            if (breakTimerManager) {
              await breakTimerManager.startBreak(selectedBreak.type, selectedBreak.duration);
              console.log(`Started ${selectedBreak.type} break (${selectedBreak.duration} min) from notification`);
            }

            if (tabTracker) {
              await tabTracker.triggerManualBreak();
            }
          }
        } else if (notificationId.includes("break")) {
          // Legacy break reminder notification
          if (buttonIndex === 0) {
            // "Take Break" button clicked
            if (tabTracker) {
              await tabTracker.triggerManualBreak();
              console.log("Manual break triggered from notification");
            }
          }
          // "Continue Working" (buttonIndex === 1) - no action needed, just dismiss
        }
      }
    } catch (error) {
      console.error("Error handling notification button click:", error);
    }
  }
);

/**
 * Handle notification dismissal (when user closes notification)
 */
chrome.notifications.onClosed.addListener(async (notificationId, byUser) => {
  try {
    if (breakNotificationSystem) {
      await breakNotificationSystem.handleNotificationDismissal(notificationId, byUser);
    } else {
      // Fallback to legacy handling
      notificationState.activeNotifications.delete(notificationId);
      if (byUser) {
        console.log("Notification dismissed by user:", notificationId);
      }
    }
  } catch (error) {
    console.error("Error handling notification dismissal:", error);
  }
});

// Initialize when service worker loads
(async () => {
  try {
    console.log("Starting service worker initialization...");

    // Wait a bit for all scripts to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if classes are available
    console.log("Available classes:", {
      StorageManager: typeof StorageManager,
      TabTracker: typeof TabTracker,
      GeminiService: typeof GeminiService,
      BreakTimerManager: typeof BreakTimerManager,
      BreakNotificationSystem: typeof BreakNotificationSystem
    });

    if (!storageManager && typeof StorageManager !== 'undefined') {
      console.log("Creating StorageManager instance...");
      storageManager = new StorageManager();
    }

    if (!tabTracker && typeof TabTracker !== 'undefined') {
      console.log("Creating TabTracker instance...");
      tabTracker = new TabTracker();
      // Set all dependencies BEFORE initialization
      if (storageManager) {
        tabTracker.storageManager = storageManager;
      }
      if (typeof CONSTANTS !== 'undefined') {
        tabTracker.constants = CONSTANTS;
      }
      if (typeof HELPERS !== 'undefined') {
        tabTracker.helpers = HELPERS;
      }
      console.log("TabTracker dependencies set, initializing...");
    }

    if (!geminiService && typeof GeminiService !== 'undefined') {
      console.log("Creating GeminiService instance...");
      geminiService = new GeminiService();
    }

    if (!breakTimerManager && typeof BreakTimerManager !== 'undefined') {
      console.log("Creating BreakTimerManager instance...");
      breakTimerManager = new BreakTimerManager();
    }

    if (!breakNotificationSystem && typeof BreakNotificationSystem !== 'undefined') {
      console.log("Creating BreakNotificationSystem instance...");
      breakNotificationSystem = new BreakNotificationSystem();
      if (breakTimerManager) {
        breakNotificationSystem.setBreakTimerManager(breakTimerManager);
      }
    }

    await initializeNotificationSystem();
    console.log("Service worker initialization complete");
  } catch (error) {
    console.error("Error during initial load:", error);
  }
})();
