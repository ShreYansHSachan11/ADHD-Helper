/**
 * Helpers - Common utility functions
 * Time calculations, formatting, and general utility functions
 */

/**
 * Time Calculation Utilities
 */
const TimeUtils = {
  /**
   * Convert milliseconds to minutes
   * @param {number} ms - Milliseconds
   * @returns {number} - Minutes (rounded)
   */
  msToMinutes(ms) {
    return Math.round(ms / (1000 * 60));
  },

  /**
   * Convert minutes to milliseconds
   * @param {number} minutes - Minutes
   * @returns {number} - Milliseconds
   */
  minutesToMs(minutes) {
    return minutes * 60 * 1000;
  },

  /**
   * Convert milliseconds to seconds
   * @param {number} ms - Milliseconds
   * @returns {number} - Seconds (rounded)
   */
  msToSeconds(ms) {
    return Math.round(ms / 1000);
  },

  /**
   * Get current timestamp
   * @returns {number} - Current timestamp in milliseconds
   */
  now() {
    return Date.now();
  },

  /**
   * Calculate time difference between two timestamps
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp (optional, defaults to now)
   * @returns {number} - Time difference in milliseconds
   */
  timeDiff(startTime, endTime = Date.now()) {
    return Math.max(0, endTime - startTime);
  },

  /**
   * Check if a given time has passed since a timestamp
   * @param {number} timestamp - Reference timestamp
   * @param {number} durationMs - Duration in milliseconds
   * @returns {boolean} - Whether the duration has passed
   */
  hasTimePassed(timestamp, durationMs) {
    return Date.now() - timestamp >= durationMs;
  },

  /**
   * Add time to a date
   * @param {Date|number} date - Date object or timestamp
   * @param {Object} duration - Duration object {days, hours, minutes, seconds}
   * @returns {Date} - New date with added time
   */
  addTime(date, duration = {}) {
    const newDate = new Date(date);

    if (duration.days) newDate.setDate(newDate.getDate() + duration.days);
    if (duration.hours) newDate.setHours(newDate.getHours() + duration.hours);
    if (duration.minutes)
      newDate.setMinutes(newDate.getMinutes() + duration.minutes);
    if (duration.seconds)
      newDate.setSeconds(newDate.getSeconds() + duration.seconds);

    return newDate;
  },

  /**
   * Subtract time from a date
   * @param {Date|number} date - Date object or timestamp
   * @param {Object} duration - Duration object {days, hours, minutes, seconds}
   * @returns {Date} - New date with subtracted time
   */
  subtractTime(date, duration = {}) {
    const negativeDuration = {};
    Object.keys(duration).forEach((key) => {
      negativeDuration[key] = -duration[key];
    });
    return this.addTime(date, negativeDuration);
  },
};

/**
 * Formatting Utilities
 */
const FormatUtils = {
  /**
   * Format milliseconds to human-readable time string
   * @param {number} ms - Milliseconds
   * @param {boolean} includeSeconds - Whether to include seconds
   * @returns {string} - Formatted time string (e.g., "1h 23m" or "23m 45s")
   */
  formatDuration(ms, includeSeconds = false) {
    if (ms < 0) return "0m";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (includeSeconds && seconds % 60 > 0) parts.push(`${seconds % 60}s`);

    return parts.length > 0 ? parts.join(" ") : includeSeconds ? "0s" : "0m";
  },

  /**
   * Format time for display in UI (always shows minutes)
   * @param {number} ms - Milliseconds
   * @returns {string} - Formatted time string
   */
  formatTimeForUI(ms) {
    const minutes = Math.max(1, TimeUtils.msToMinutes(ms));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }

    return `${minutes}m`;
  },

  /**
   * Format date for calendar events
   * @param {Date} date - Date object
   * @returns {string} - ISO string for calendar API
   */
  formatDateForCalendar(date) {
    return date.toISOString();
  },

  /**
   * Format date for display
   * @param {Date} date - Date object
   * @param {boolean} includeTime - Whether to include time
   * @returns {string} - Formatted date string
   */
  formatDateForDisplay(date, includeTime = false) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return date.toLocaleDateString("en-US", options);
  },

  /**
   * Format percentage
   * @param {number} value - Decimal value (0-1)
   * @param {number} decimals - Number of decimal places
   * @returns {string} - Formatted percentage
   */
  formatPercentage(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
  },
};

/**
 * Validation Utilities
 */
const ValidationUtils = {
  /**
   * Validate time limit input
   * @param {number} minutes - Time limit in minutes
   * @returns {boolean} - Whether the input is valid
   */
  isValidTimeLimit(minutes) {
    return (
      typeof minutes === "number" &&
      minutes >= 5 &&
      minutes <= 180 &&
      Number.isInteger(minutes)
    );
  },

  /**
   * Validate task name
   * @param {string} name - Task name
   * @returns {boolean} - Whether the name is valid
   */
  isValidTaskName(name) {
    return (
      typeof name === "string" && name.trim().length > 0 && name.length <= 200
    );
  },

  /**
   * Validate priority level
   * @param {string} priority - Priority level
   * @returns {boolean} - Whether the priority is valid
   */
  isValidPriority(priority) {
    return ["low", "medium", "high"].includes(priority);
  },

  /**
   * Validate date
   * @param {Date|string} date - Date to validate
   * @returns {boolean} - Whether the date is valid and in the future
   */
  isValidFutureDate(date) {
    const dateObj = new Date(date);
    return (
      dateObj instanceof Date &&
      !isNaN(dateObj.getTime()) &&
      dateObj > new Date()
    );
  },

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether the URL is valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate volume level
   * @param {number} volume - Volume level (0-1)
   * @returns {boolean} - Whether the volume is valid
   */
  isValidVolume(volume) {
    return typeof volume === "number" && volume >= 0 && volume <= 1;
  },
};

/**
 * General Utilities
 */
const GeneralUtils = {
  /**
   * Generate unique ID
   * @returns {string} - Unique identifier
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Deep clone an object
   * @param {any} obj - Object to clone
   * @returns {any} - Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item));

    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = this.deepClone(obj[key]);
    });
    return cloned;
  },

  /**
   * Debounce function calls
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} - Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Throttle function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} - Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Sanitize string for display
   * @param {string} str - String to sanitize
   * @returns {string} - Sanitized string
   */
  sanitizeString(str) {
    if (typeof str !== "string") return "";
    return str.replace(/[<>]/g, "").trim();
  },

  /**
   * Check if extension has required permissions
   * @param {string[]} permissions - Required permissions
   * @returns {Promise<boolean>} - Whether all permissions are granted
   */
  async hasPermissions(permissions) {
    if (!chrome.permissions) return false;

    try {
      return await chrome.permissions.contains({ permissions });
    } catch (error) {
      console.error("Permission check error:", error);
      return false;
    }
  },

  /**
   * Request permissions from user
   * @param {string[]} permissions - Permissions to request
   * @returns {Promise<boolean>} - Whether permissions were granted
   */
  async requestPermissions(permissions) {
    if (!chrome.permissions) return false;

    try {
      return await chrome.permissions.request({ permissions });
    } catch (error) {
      console.error("Permission request error:", error);
      return false;
    }
  },
};
// Export all utilities
const HELPERS = {
  TimeUtils,
  FormatUtils,
  ValidationUtils,
  GeneralUtils,
};

// For use in service worker and popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = HELPERS;
} else {
  // Make available globally in both service worker and popup contexts
  globalThis.HELPERS = HELPERS;
}
