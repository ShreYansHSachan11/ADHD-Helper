/**
 * Constants - Default settings and configuration values
 * Centralized configuration for the Focus Productivity Extension
 */

// Screen Time Monitoring Constants
const SCREEN_TIME = {
  DEFAULT_LIMIT_MINUTES: 30,
  MIN_LIMIT_MINUTES: 5,
  MAX_LIMIT_MINUTES: 180,
  NOTIFICATION_COOLDOWN_MS: 60000, // 1 minute
  TIMER_UPDATE_INTERVAL_MS: 1000, // 1 second
};

// Focus Management Constants
const FOCUS = {
  REMINDER_COOLDOWN_MINUTES: 5,
  DEFAULT_ENABLED: true,
  DEVIATION_THRESHOLD_MS: 3000, // 3 seconds before considering tab switch
};

// Task Management Constants
const TASKS = {
  MAX_TASK_NAME_LENGTH: 200,
  MAX_BREAKDOWN_ITEMS: 20,
  PRIORITY_LEVELS: ["low", "medium", "high"],
  DEFAULT_PRIORITY: "medium",
};

// Calendar Integration Constants
const CALENDAR = {
  REMINDER_SCHEDULES: {
    high: [
      { days: 7, hours: 0 }, // 1 week before
      { days: 3, hours: 0 }, // 3 days before
      { days: 1, hours: 0 }, // 1 day before
      { days: 0, hours: 2 }, // 2 hours before
    ],
    medium: [
      { days: 3, hours: 0 }, // 3 days before
      { days: 1, hours: 0 }, // 1 day before
      { days: 0, hours: 4 }, // 4 hours before
    ],
    low: [
      { days: 7, hours: 0 }, // 1 week before
      { days: 2, hours: 0 }, // 2 days before
      { days: 0, hours: 8 }, // 8 hours before
    ],
  },
  MAX_REMINDERS_PER_TASK: 10,
};

// Breathing Exercise Constants
const BREATHING = {
  DEFAULT_DURATIONS: {
    inhale: 4000, // 4 seconds
    holdIn: 1000, // 1 second
    exhale: 4000, // 4 seconds
    holdOut: 1000, // 1 second
  },
  MIN_DURATION: 1000, // 1 second
  MAX_DURATION: 10000, // 10 seconds
  PHASES: ["inhale", "holdIn", "exhale", "holdOut"],
  PHASE_LABELS: {
    inhale: "Breathe in...",
    holdIn: "Hold...",
    exhale: "Breathe out...",
    holdOut: "Hold...",
  },
};

// Audio Constants
const AUDIO = {
  WHITE_NOISE: {
    DEFAULT_VOLUME: 0.5,
    MIN_VOLUME: 0,
    MAX_VOLUME: 1,
    FADE_DURATION_MS: 500,
    SOUNDS: {
      AIR: "assets/sounds/air-white-noise.mp3",
      OCEAN: "assets/sounds/ocean-white-noise.mp3",
      RAIN: "assets/sounds/rain-white-noise.mp3",
      SHOWER: "assets/sounds/shower-white-noise.mp3",
      TRAIN: "assets/sounds/train-white-noise.mp3",
      WATER: "assets/sounds/water-white-noise.mp3",
      WATERFALL: "assets/sounds/waterfall-white-noise.mp3",
      WAVES: "assets/sounds/waves-white-noise.mp3",
    },
    DEFAULT_SOUND: "assets/sounds/rain-white-noise.mp3",
  },
  NOTIFICATION_SOUNDS: {
    BREAK_REMINDER: "assets/sounds/notification.mp3",
    FOCUS_REMINDER: "assets/sounds/notification.mp3",
  },
};

// Storage Keys
const STORAGE_KEYS = {
  // Tab tracking
  TAB_HISTORY: "tabHistory",
  CURRENT_SESSION: "currentSession",

  // Settings
  SCREEN_TIME_SETTINGS: "screenTimeSettings",
  FOCUS_SETTINGS: "focusSettings",
  BREATHING_SETTINGS: "breathingSettings",
  AUDIO_SETTINGS: "audioSettings",

  // Tasks and calendar
  TASKS: "tasks",
  API_KEYS: "apiKeys",

  // External pages usage
  WELLNESS_USAGE: "wellnessUsage",
  ASMR_USAGE: "asmrUsage",
};

// API Configuration
const API = {
  GEMINI: {
    BASE_URL:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    MAX_RETRIES: 3,
    TIMEOUT_MS: 10000,
    RATE_LIMIT_DELAY_MS: 1000,
  },
  GOOGLE_CALENDAR: {
    BASE_URL: "https://www.googleapis.com/calendar/v3",
    SCOPES: ["https://www.googleapis.com/auth/calendar.events"],
    MAX_RETRIES: 3,
    TIMEOUT_MS: 15000,
  },
};

// UI Constants
const UI = {
  POPUP: {
    WIDTH: 400,
    MIN_HEIGHT: 500,
    MAX_HEIGHT: 600,
  },
  ANIMATION: {
    FADE_DURATION_MS: 200,
    SLIDE_DURATION_MS: 300,
    BREATHING_CIRCLE_SIZE: {
      MIN: 50,
      MAX: 120,
    },
  },
  COLORS: {
    PRIMARY: "#4285f4",
    SUCCESS: "#34a853",
    WARNING: "#fbbc04",
    ERROR: "#ea4335",
    BACKGROUND: "#ffffff",
    TEXT: "#202124",
  },
};

// Extension Permissions
const PERMISSIONS = {
  REQUIRED: ["storage", "tabs", "activeTab", "notifications"],
  OPTIONAL: ["identity", "background"],
};

// Default Settings Objects
const DEFAULT_SETTINGS = {
  screenTime: {
    limitMinutes: SCREEN_TIME.DEFAULT_LIMIT_MINUTES,
    enabled: true,
    notificationsEnabled: true,
  },
  focus: {
    enabled: FOCUS.DEFAULT_ENABLED,
    reminderCooldownMinutes: FOCUS.REMINDER_COOLDOWN_MINUTES,
    notificationsEnabled: true,
  },
  breathing: {
    durations: { ...BREATHING.DEFAULT_DURATIONS },
    enabled: true,
  },
  audio: {
    whiteNoise: {
      enabled: false,
      volume: AUDIO.WHITE_NOISE.DEFAULT_VOLUME,
    },
    notifications: {
      enabled: true,
      volume: 0.7,
    },
  },
};

// Error Messages
const ERROR_MESSAGES = {
  STORAGE_QUOTA_EXCEEDED: "Storage quota exceeded. Please clear some data.",
  API_KEY_MISSING: "API key not configured. Please check settings.",
  NETWORK_ERROR: "Network error. Please check your connection.",
  PERMISSION_DENIED: "Permission denied. Please grant required permissions.",
  INVALID_INPUT: "Invalid input provided.",
  UNKNOWN_ERROR: "An unexpected error occurred.",
};
// Export all constants
const CONSTANTS = {
  SCREEN_TIME,
  FOCUS,
  TASKS,
  CALENDAR,
  BREATHING,
  AUDIO,
  STORAGE_KEYS,
  API,
  UI,
  PERMISSIONS,
  DEFAULT_SETTINGS,
  ERROR_MESSAGES,
};

// For use in service worker and popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONSTANTS;
} else if (typeof window !== "undefined") {
  window.CONSTANTS = CONSTANTS;
}
