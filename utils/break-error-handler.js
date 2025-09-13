/**
 * Break Error Handler - Comprehensive error handling for break reminder system
 * Handles timer state corruption, notification failures, API unavailability, and data validation
 */

class BreakErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
    this.fallbackMode = false;
    this.lastErrorTime = new Map();
    this.errorCooldown = 5000; // 5 seconds between similar errors
    
    // Error types and their handling strategies
    this.errorStrategies = {
      TIMER_STATE_CORRUPTION: 'reset_and_recover',
      NOTIFICATION_FAILURE: 'fallback_notification',
      CHROME_API_UNAVAILABLE: 'graceful_degradation',
      STORAGE_ERROR: 'retry_with_fallback',
      DATA_VALIDATION_ERROR: 'sanitize_and_retry',
      PERMISSION_DENIED: 'request_permission',
      NETWORK_ERROR: 'retry_with_backoff'
    };
    
    // Dependencies
    this.storageManager = null;
    this.errorHandler = null;
    
    this.init();
  }

  /**
   * Initialize the break error handler
   */
  async init() {
    try {
      // Import dependencies if in service worker context
      if (typeof importScripts !== "undefined") {
        importScripts(
          "/services/storage-manager.js",
          "/utils/error-handler.js"
        );
        this.storageManager = new StorageManager();
        this.errorHandler = new ErrorHandler();
      } else {
        this.storageManager = this.storageManager || new StorageManager();
        this.errorHandler = this.errorHandler || (typeof errorHandler !== 'undefined' ? errorHandler : new ErrorHandler());
      }
      
      console.log("BreakErrorHandler initialized successfully");
    } catch (error) {
      console.error("BreakErrorHandler initialization error:", error);
    }
  }

  /**
   * Handle timer state corruption and recovery
   */
  async handleTimerStateCorruption(corruptedState, context = 'timer') {
    try {
      const errorKey = `TIMER_STATE_CORRUPTION_${context}`;
      
      // Check if we're in error cooldown
      if (this.isInErrorCooldown(errorKey)) {
        return { success: false, reason: 'cooldown' };
      }
      
      this.recordError(errorKey);
      
      console.warn("Timer state corruption detected:", corruptedState);
      
      // Attempt to recover state
      const recoveryResult = await this.recoverTimerState(corruptedState, context);
      
      if (recoveryResult.success) {
        this.showUserFeedback(
          "Timer state recovered successfully",
          "success",
          { context: "Timer Recovery" }
        );
        
        // Reset error count on successful recovery
        this.errorCounts.delete(errorKey);
        this.recoveryAttempts.delete(errorKey);
        
        return recoveryResult;
      } else {
        // If recovery failed, try fallback
        const fallbackResult = await this.fallbackTimerRecovery(context);
        return fallbackResult;
      }
    } catch (error) {
      console.error("Error handling timer state corruption:", error);
      const fallbackResult = await this.fallbackTimerRecovery(context);
      return fallbackResult;
    }
  }

  /**
   * Recover corrupted timer state
   */
  async recoverTimerState(corruptedState, context) {
    try {
      const now = Date.now();
      const recoveredState = {
        isWorkTimerActive: false,
        isOnBreak: false,
        breakType: null,
        lastActivityTime: now,
        workTimeThreshold: 30 * 60 * 1000, // Default 30 minutes
        workStartTime: null,
        totalWorkTime: 0,
        breakStartTime: null,
        breakDuration: 0
      };
      
      // Try to salvage valid data from corrupted state
      if (corruptedState && typeof corruptedState === 'object') {
        // Validate and recover work time threshold
        if (this.isValidWorkTimeThreshold(corruptedState.workTimeThreshold)) {
          recoveredState.workTimeThreshold = corruptedState.workTimeThreshold;
        }
        
        // Validate and recover total work time
        if (this.isValidWorkTime(corruptedState.totalWorkTime)) {
          recoveredState.totalWorkTime = corruptedState.totalWorkTime;
        }
        
        // Validate timestamps
        if (this.isValidTimestamp(corruptedState.lastActivityTime)) {
          recoveredState.lastActivityTime = corruptedState.lastActivityTime;
        }
        
        // Check if we were in a valid work session
        if (this.isValidTimestamp(corruptedState.workStartTime) && 
            corruptedState.isWorkTimerActive === true) {
          const elapsedTime = now - corruptedState.workStartTime;
          
          // If less than 4 hours elapsed, consider it valid
          if (elapsedTime < 4 * 60 * 60 * 1000) {
            recoveredState.workStartTime = corruptedState.workStartTime;
            recoveredState.isWorkTimerActive = true;
            recoveredState.totalWorkTime += elapsedTime;
          }
        }
        
        // Check if we were on a valid break
        if (this.isValidTimestamp(corruptedState.breakStartTime) && 
            corruptedState.isOnBreak === true &&
            this.isValidBreakType(corruptedState.breakType) &&
            this.isValidBreakDuration(corruptedState.breakDuration)) {
          
          const breakElapsed = now - corruptedState.breakStartTime;
          
          // If break hasn't exceeded maximum duration, recover it
          if (breakElapsed < corruptedState.breakDuration) {
            recoveredState.isOnBreak = true;
            recoveredState.breakType = corruptedState.breakType;
            recoveredState.breakStartTime = corruptedState.breakStartTime;
            recoveredState.breakDuration = corruptedState.breakDuration;
          }
        }
      }
      
      // Save recovered state
      if (this.storageManager) {
        await this.storageManager.setMultiple({
          'breakTimerState': {
            isWorkTimerActive: recoveredState.isWorkTimerActive,
            isOnBreak: recoveredState.isOnBreak,
            breakType: recoveredState.breakType,
            lastActivityTime: recoveredState.lastActivityTime,
            workTimeThreshold: recoveredState.workTimeThreshold
          },
          'workSessionData': {
            workStartTime: recoveredState.workStartTime,
            totalWorkTime: recoveredState.totalWorkTime,
            breakStartTime: recoveredState.breakStartTime,
            breakDuration: recoveredState.breakDuration
          }
        });
      }
      
      console.log("Timer state recovered:", recoveredState);
      
      return {
        success: true,
        recoveredState: recoveredState,
        message: "Timer state successfully recovered"
      };
    } catch (error) {
      console.error("Error recovering timer state:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to recover timer state"
      };
    }
  }

  /**
   * Fallback timer recovery when normal recovery fails
   */
  async fallbackTimerRecovery(context) {
    try {
      console.log("Attempting fallback timer recovery");
      
      // Reset to clean state
      const cleanState = {
        isWorkTimerActive: false,
        isOnBreak: false,
        breakType: null,
        lastActivityTime: Date.now(),
        workTimeThreshold: 30 * 60 * 1000,
        workStartTime: null,
        totalWorkTime: 0,
        breakStartTime: null,
        breakDuration: 0
      };
      
      if (this.storageManager) {
        await this.storageManager.setMultiple({
          'breakTimerState': {
            isWorkTimerActive: cleanState.isWorkTimerActive,
            isOnBreak: cleanState.isOnBreak,
            breakType: cleanState.breakType,
            lastActivityTime: cleanState.lastActivityTime,
            workTimeThreshold: cleanState.workTimeThreshold
          },
          'workSessionData': {
            workStartTime: cleanState.workStartTime,
            totalWorkTime: cleanState.totalWorkTime,
            breakStartTime: cleanState.breakStartTime,
            breakDuration: cleanState.breakDuration
          }
        });
      }
      
      this.showUserFeedback(
        "Timer reset to clean state due to corruption",
        "warning",
        { 
          context: "Timer Recovery",
          persistent: true,
          actions: [{
            label: "Start Fresh",
            handler: () => console.log("User acknowledged timer reset")
          }]
        }
      );
      
      return {
        success: true,
        recoveredState: cleanState,
        message: "Timer reset to clean state",
        wasReset: true
      };
    } catch (error) {
      console.error("Fallback timer recovery failed:", error);
      return {
        success: false,
        error: error.message,
        message: "Complete timer recovery failed"
      };
    }
  }

  /**
   * Handle notification failures with fallback mechanisms
   */
  async handleNotificationFailure(notificationData, error, context = 'notification') {
    try {
      const errorKey = `NOTIFICATION_FAILURE_${context}`;
      
      if (this.isInErrorCooldown(errorKey)) {
        return { success: false, reason: 'cooldown' };
      }
      
      this.recordError(errorKey);
      
      console.warn("Notification failure:", error, notificationData);
      
      // Try different fallback strategies
      const fallbackResult = await this.tryNotificationFallbacks(notificationData, context);
      
      if (fallbackResult.success) {
        this.showUserFeedback(
          "Notification delivered via fallback method",
          "info",
          { context: "Notification System" }
        );
        return fallbackResult;
      } else {
        // If all fallbacks fail, show user feedback
        this.showUserFeedback(
          "Unable to show notifications. Please check browser permissions.",
          "warning",
          { 
            context: "Notification System",
            persistent: true,
            actions: [{
              label: "Check Permissions",
              handler: () => this.requestNotificationPermission()
            }]
          }
        );
        
        return fallbackResult;
      }
    } catch (error) {
      console.error("Error handling notification failure:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Try various notification fallback methods
   */
  async tryNotificationFallbacks(notificationData, context) {
    const fallbackMethods = [
      () => this.tryBasicNotification(notificationData),
      () => this.tryBadgeNotification(notificationData),
      () => this.tryTitleNotification(notificationData),
      () => this.tryConsoleNotification(notificationData)
    ];
    
    for (const method of fallbackMethods) {
      try {
        const result = await method();
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn("Fallback method failed:", error);
      }
    }
    
    return { success: false, message: "All notification fallbacks failed" };
  }

  /**
   * Try basic Chrome notification without buttons
   */
  async tryBasicNotification(notificationData) {
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        const basicOptions = {
          type: "basic",
          iconUrl: "/assets/icons/48.ico",
          title: notificationData.title || "Break Reminder",
          message: notificationData.message || "Time for a break!"
        };
        
        const notificationId = `fallback_${Date.now()}`;
        await chrome.notifications.create(notificationId, basicOptions);
        
        return { success: true, method: 'basic_notification', notificationId };
      }
      return { success: false, reason: 'api_unavailable' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Try badge notification as fallback
   */
  async tryBadgeNotification(notificationData) {
    try {
      if (typeof chrome !== 'undefined' && chrome.action) {
        await chrome.action.setBadgeText({ text: "!" });
        await chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
        await chrome.action.setTitle({ 
          title: notificationData.title || "Break Reminder - Click to view"
        });
        
        return { success: true, method: 'badge_notification' };
      }
      return { success: false, reason: 'api_unavailable' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Try title notification as fallback
   */
  async tryTitleNotification(notificationData) {
    try {
      if (typeof chrome !== 'undefined' && chrome.action) {
        const title = `${notificationData.title || "Break Reminder"} - ${notificationData.message || "Time for a break!"}`;
        await chrome.action.setTitle({ title: title.substring(0, 100) });
        
        return { success: true, method: 'title_notification' };
      }
      return { success: false, reason: 'api_unavailable' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Console notification as last resort
   */
  async tryConsoleNotification(notificationData) {
    try {
      const message = `BREAK REMINDER: ${notificationData.title || "Break Time"} - ${notificationData.message || "Time for a break!"}`;
      console.log(`%c${message}`, 'background: #4CAF50; color: white; padding: 10px; font-size: 14px; border-radius: 5px;');
      
      return { success: true, method: 'console_notification' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle Chrome API unavailability with graceful degradation
   */
  async handleChromeApiUnavailable(apiName, operation, fallbackData = null) {
    try {
      const errorKey = `CHROME_API_UNAVAILABLE_${apiName}`;
      
      if (this.isInErrorCooldown(errorKey)) {
        return { success: false, reason: 'cooldown' };
      }
      
      this.recordError(errorKey);
      this.fallbackMode = true;
      
      console.warn(`Chrome API unavailable: ${apiName} for operation: ${operation}`);
      
      // Provide graceful degradation based on API type
      const degradationResult = await this.provideFallbackFunctionality(apiName, operation, fallbackData);
      
      this.showUserFeedback(
        `Running in limited mode due to ${apiName} unavailability`,
        "warning",
        { 
          context: "System Compatibility",
          duration: 5000
        }
      );
      
      return degradationResult;
    } catch (error) {
      console.error("Error handling Chrome API unavailability:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Provide fallback functionality when Chrome APIs are unavailable
   */
  async provideFallbackFunctionality(apiName, operation, fallbackData) {
    switch (apiName) {
      case 'notifications':
        return await this.handleNotificationApiFallback(operation, fallbackData);
      
      case 'storage':
        return await this.handleStorageApiFallback(operation, fallbackData);
      
      case 'alarms':
        return await this.handleAlarmsApiFallback(operation, fallbackData);
      
      case 'action':
        return await this.handleActionApiFallback(operation, fallbackData);
      
      default:
        return { 
          success: false, 
          message: `No fallback available for ${apiName}`,
          fallbackMode: true
        };
    }
  }

  /**
   * Handle notification API fallback
   */
  async handleNotificationApiFallback(operation, fallbackData) {
    try {
      // Use in-memory notification tracking
      const inMemoryNotification = {
        id: `fallback_${Date.now()}`,
        title: fallbackData?.title || "Break Reminder",
        message: fallbackData?.message || "Time for a break!",
        timestamp: Date.now(),
        type: 'fallback'
      };
      
      // Store in memory for popup to display
      if (!this.fallbackNotifications) {
        this.fallbackNotifications = [];
      }
      this.fallbackNotifications.push(inMemoryNotification);
      
      // Limit to 5 notifications
      if (this.fallbackNotifications.length > 5) {
        this.fallbackNotifications.shift();
      }
      
      console.log("Fallback notification created:", inMemoryNotification);
      
      return { 
        success: true, 
        method: 'in_memory_notification',
        notification: inMemoryNotification,
        fallbackMode: true
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle storage API fallback
   */
  async handleStorageApiFallback(operation, fallbackData) {
    try {
      // Use localStorage as fallback
      if (typeof localStorage !== 'undefined') {
        const key = fallbackData?.key || 'fallback_storage';
        
        switch (operation) {
          case 'get':
            const stored = localStorage.getItem(key);
            return { 
              success: true, 
              data: stored ? JSON.parse(stored) : null,
              method: 'localStorage',
              fallbackMode: true
            };
          
          case 'set':
            localStorage.setItem(key, JSON.stringify(fallbackData?.value));
            return { 
              success: true, 
              method: 'localStorage',
              fallbackMode: true
            };
          
          default:
            return { success: false, message: `Unsupported operation: ${operation}` };
        }
      }
      
      // If localStorage unavailable, use in-memory storage
      if (!this.fallbackStorage) {
        this.fallbackStorage = new Map();
      }
      
      const key = fallbackData?.key || 'fallback_storage';
      
      switch (operation) {
        case 'get':
          return { 
            success: true, 
            data: this.fallbackStorage.get(key) || null,
            method: 'in_memory',
            fallbackMode: true
          };
        
        case 'set':
          this.fallbackStorage.set(key, fallbackData?.value);
          return { 
            success: true, 
            method: 'in_memory',
            fallbackMode: true
          };
        
        default:
          return { success: false, message: `Unsupported operation: ${operation}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle alarms API fallback
   */
  async handleAlarmsApiFallback(operation, fallbackData) {
    try {
      // Use setTimeout as fallback
      if (!this.fallbackAlarms) {
        this.fallbackAlarms = new Map();
      }
      
      switch (operation) {
        case 'create':
          const alarmName = fallbackData?.name || `alarm_${Date.now()}`;
          const delayMs = (fallbackData?.delayInMinutes || 1) * 60 * 1000;
          
          const timeoutId = setTimeout(() => {
            console.log(`Fallback alarm triggered: ${alarmName}`);
            // Trigger alarm handler if available
            if (typeof this.onFallbackAlarm === 'function') {
              this.onFallbackAlarm({ name: alarmName });
            }
            this.fallbackAlarms.delete(alarmName);
          }, delayMs);
          
          this.fallbackAlarms.set(alarmName, timeoutId);
          
          return { 
            success: true, 
            method: 'setTimeout',
            alarmName: alarmName,
            fallbackMode: true
          };
        
        case 'clear':
          const clearName = fallbackData?.name;
          if (this.fallbackAlarms.has(clearName)) {
            clearTimeout(this.fallbackAlarms.get(clearName));
            this.fallbackAlarms.delete(clearName);
          }
          
          return { 
            success: true, 
            method: 'clearTimeout',
            fallbackMode: true
          };
        
        default:
          return { success: false, message: `Unsupported operation: ${operation}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle action API fallback
   */
  async handleActionApiFallback(operation, fallbackData) {
    try {
      // Store action state in memory
      if (!this.fallbackActionState) {
        this.fallbackActionState = {
          badgeText: '',
          badgeColor: '#000000',
          title: 'Focus Productivity Extension'
        };
      }
      
      switch (operation) {
        case 'setBadgeText':
          this.fallbackActionState.badgeText = fallbackData?.text || '';
          console.log(`Fallback badge text set: ${this.fallbackActionState.badgeText}`);
          return { 
            success: true, 
            method: 'in_memory_badge',
            fallbackMode: true
          };
        
        case 'setBadgeBackgroundColor':
          this.fallbackActionState.badgeColor = fallbackData?.color || '#000000';
          console.log(`Fallback badge color set: ${this.fallbackActionState.badgeColor}`);
          return { 
            success: true, 
            method: 'in_memory_badge',
            fallbackMode: true
          };
        
        case 'setTitle':
          this.fallbackActionState.title = fallbackData?.title || 'Focus Productivity Extension';
          console.log(`Fallback title set: ${this.fallbackActionState.title}`);
          return { 
            success: true, 
            method: 'in_memory_title',
            fallbackMode: true
          };
        
        default:
          return { success: false, message: `Unsupported operation: ${operation}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate and sanitize break data
   */
  validateAndSanitizeBreakData(data, context = 'break_data') {
    try {
      const sanitized = {};
      const errors = [];
      
      // Validate break type
      if (data.breakType !== undefined) {
        if (this.isValidBreakType(data.breakType)) {
          sanitized.breakType = data.breakType;
        } else {
          errors.push(`Invalid break type: ${data.breakType}`);
          sanitized.breakType = 'short'; // Default fallback
        }
      }
      
      // Validate duration
      if (data.duration !== undefined) {
        if (this.isValidBreakDuration(data.duration)) {
          sanitized.duration = Math.floor(data.duration);
        } else {
          errors.push(`Invalid duration: ${data.duration}`);
          sanitized.duration = 5; // Default 5 minutes
        }
      }
      
      // Validate timestamps
      ['startTime', 'endTime', 'lastActivityTime'].forEach(field => {
        if (data[field] !== undefined) {
          if (this.isValidTimestamp(data[field])) {
            sanitized[field] = data[field];
          } else {
            errors.push(`Invalid timestamp for ${field}: ${data[field]}`);
            sanitized[field] = Date.now(); // Current time as fallback
          }
        }
      });
      
      // Validate work time
      if (data.workTime !== undefined) {
        if (this.isValidWorkTime(data.workTime)) {
          sanitized.workTime = Math.max(0, Math.floor(data.workTime));
        } else {
          errors.push(`Invalid work time: ${data.workTime}`);
          sanitized.workTime = 0;
        }
      }
      
      // Validate work time threshold
      if (data.workTimeThreshold !== undefined) {
        if (this.isValidWorkTimeThreshold(data.workTimeThreshold)) {
          sanitized.workTimeThreshold = data.workTimeThreshold;
        } else {
          errors.push(`Invalid work time threshold: ${data.workTimeThreshold}`);
          sanitized.workTimeThreshold = 30 * 60 * 1000; // 30 minutes default
        }
      }
      
      // Validate boolean fields
      ['isWorkTimerActive', 'isOnBreak', 'notificationsEnabled'].forEach(field => {
        if (data[field] !== undefined) {
          sanitized[field] = Boolean(data[field]);
        }
      });
      
      // Sanitize string fields
      ['message', 'title', 'context'].forEach(field => {
        if (data[field] !== undefined) {
          sanitized[field] = this.sanitizeString(data[field]);
        }
      });
      
      if (errors.length > 0) {
        console.warn(`Data validation errors in ${context}:`, errors);
        this.showUserFeedback(
          `Data validation issues detected and corrected`,
          "warning",
          { context: "Data Validation", duration: 3000 }
        );
      }
      
      return {
        isValid: errors.length === 0,
        sanitizedData: sanitized,
        errors: errors,
        originalData: data
      };
    } catch (error) {
      console.error("Error validating break data:", error);
      return {
        isValid: false,
        sanitizedData: {},
        errors: [`Validation error: ${error.message}`],
        originalData: data
      };
    }
  }

  // Validation helper methods
  isValidBreakType(breakType) {
    return typeof breakType === 'string' && ['short', 'medium', 'long'].includes(breakType);
  }

  isValidBreakDuration(duration) {
    return typeof duration === 'number' && duration > 0 && duration <= 120; // Max 2 hours
  }

  isValidTimestamp(timestamp) {
    return typeof timestamp === 'number' && 
           timestamp > 0 && 
           timestamp <= Date.now() + (24 * 60 * 60 * 1000); // Not more than 24 hours in future
  }

  isValidWorkTime(workTime) {
    return typeof workTime === 'number' && workTime >= 0 && workTime <= 24 * 60 * 60 * 1000; // Max 24 hours
  }

  isValidWorkTimeThreshold(threshold) {
    return typeof threshold === 'number' && 
           threshold >= 5 * 60 * 1000 && // Min 5 minutes
           threshold <= 180 * 60 * 1000; // Max 3 hours
  }

  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim().substring(0, 500); // Limit length
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        // Chrome extension context - permissions should be in manifest
        const permission = await chrome.notifications.getPermissionLevel();
        return permission === 'granted';
      }
      
      // Web context
      if (typeof Notification !== 'undefined') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Error tracking and cooldown management
   */
  recordError(errorKey) {
    const now = Date.now();
    this.lastErrorTime.set(errorKey, now);
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
  }

  isInErrorCooldown(errorKey) {
    const lastError = this.lastErrorTime.get(errorKey);
    if (!lastError) return false;
    return (Date.now() - lastError) < this.errorCooldown;
  }

  /**
   * Show user feedback (delegates to main error handler if available)
   */
  showUserFeedback(message, type = 'info', options = {}) {
    if (this.errorHandler && typeof this.errorHandler.showUserFeedback === 'function') {
      this.errorHandler.showUserFeedback(message, type, options);
    } else {
      console.log(`User Feedback [${type.toUpperCase()}]: ${message}`);
    }
  }

  /**
   * Get fallback notifications for popup display
   */
  getFallbackNotifications() {
    return this.fallbackNotifications || [];
  }

  /**
   * Clear fallback notifications
   */
  clearFallbackNotifications() {
    this.fallbackNotifications = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
      fallbackMode: this.fallbackMode,
      lastErrors: Object.fromEntries(this.lastErrorTime)
    };
  }

  /**
   * Reset error tracking
   */
  resetErrorTracking() {
    this.errorCounts.clear();
    this.recoveryAttempts.clear();
    this.lastErrorTime.clear();
    this.fallbackMode = false;
  }

  /**
   * Set fallback alarm handler
   */
  setFallbackAlarmHandler(handler) {
    this.onFallbackAlarm = handler;
  }
}

// Export for use in service worker and other contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreakErrorHandler;
} else if (typeof self !== "undefined") {
  self.BreakErrorHandler = BreakErrorHandler;
}