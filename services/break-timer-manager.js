/**
 * Break Timer Manager - Tracks work time and manages break reminders
 * Handles continuous work time tracking and break reminder logic
 */

class BreakTimerManager {
  constructor() {
    this.workStartTime = null;
    this.totalWorkTime = 0;
    this.isWorkTimerActive = false;
    this.isOnBreak = false;
    this.breakStartTime = null;
    this.breakDuration = 0;
    this.breakType = null;
    this.lastActivityTime = null;
    this.inactivityThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.workTimeThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    // Storage and dependencies
    this.storageManager = null;
    this.settingsManager = null;
    this.constants = null;
    this.helpers = null;
    this.breakErrorHandler = null;
    
    // Browser focus state
    this.isBrowserFocused = true;
    this.lastFocusChangeTime = null;
    
    // Timer state persistence keys
    this.STORAGE_KEYS = {
      BREAK_TIMER_STATE: 'breakTimerState',
      WORK_SESSION_DATA: 'workSessionData',
      BREAK_SETTINGS: 'breakSettings'
    };
    
    // Initialize when ready
    this.init();
  }

  /**
   * Initialize the break timer manager
   */
  async init() {
    try {
      // Import dependencies if in service worker context
      if (typeof importScripts !== "undefined") {
        importScripts(
          "/services/storage-manager.js",
          "/services/break-settings-manager.js",
          "/utils/constants.js",
          "/utils/helpers.js",
          "/utils/break-error-handler.js"
        );
        this.storageManager = new StorageManager();
        this.settingsManager = new BreakSettingsManager();
        this.constants = CONSTANTS;
        this.helpers = HELPERS;
        this.breakErrorHandler = new BreakErrorHandler();
      } else {
        // For testing environment, use globally available dependencies
        this.storageManager = this.storageManager || new StorageManager();
        this.settingsManager = this.settingsManager || new BreakSettingsManager();
        this.constants = this.constants || CONSTANTS;
        this.helpers = this.helpers || HELPERS;
        this.breakErrorHandler = this.breakErrorHandler || new BreakErrorHandler();
      }
      
      // Initialize error handler
      if (this.breakErrorHandler) {
        await this.breakErrorHandler.init();
      }
      
      // Initialize settings manager
      if (this.settingsManager) {
        await this.settingsManager.init();
      }
      
      // Load persisted state with error handling
      await this.loadPersistedStateWithErrorHandling();
      
      // Setup browser focus detection
      await this.setupFocusDetection();
      
      // Load settings from settings manager
      await this.loadSettingsFromManager();
      
      console.log("BreakTimerManager initialized successfully");
    } catch (error) {
      console.error("BreakTimerManager initialization error:", error);
      // Try to continue with minimal functionality
      await this.initializeFallbackMode();
    }
  }

  /**
   * Load persisted timer state from storage with comprehensive error handling
   */
  async loadPersistedStateWithErrorHandling() {
    try {
      const timerState = await this.storageManager.get(this.STORAGE_KEYS.BREAK_TIMER_STATE);
      const workSessionData = await this.storageManager.get(this.STORAGE_KEYS.WORK_SESSION_DATA);
      
      // Validate and sanitize timer state
      if (timerState) {
        const validation = this.breakErrorHandler.validateAndSanitizeBreakData(timerState, 'timer_state');
        
        if (!validation.isValid) {
          console.warn("Timer state validation failed, attempting recovery");
          const recoveryResult = await this.breakErrorHandler.handleTimerStateCorruption(timerState, 'timer_state');
          
          if (recoveryResult.success) {
            const recovered = recoveryResult.recoveredState;
            this.isWorkTimerActive = recovered.isWorkTimerActive;
            this.isOnBreak = recovered.isOnBreak;
            this.breakType = recovered.breakType;
            this.lastActivityTime = recovered.lastActivityTime;
            this.workTimeThreshold = recovered.workTimeThreshold;
          } else {
            // Use defaults if recovery failed
            await this.initializeDefaultState();
          }
        } else {
          // Use sanitized data
          const sanitized = validation.sanitizedData;
          this.isWorkTimerActive = sanitized.isWorkTimerActive || false;
          this.isOnBreak = sanitized.isOnBreak || false;
          this.breakType = sanitized.breakType || null;
          this.lastActivityTime = sanitized.lastActivityTime || Date.now();
          this.workTimeThreshold = sanitized.workTimeThreshold || (30 * 60 * 1000);
        }
      }
      
      // Validate and sanitize work session data
      if (workSessionData) {
        const validation = this.breakErrorHandler.validateAndSanitizeBreakData(workSessionData, 'work_session_data');
        
        if (!validation.isValid) {
          console.warn("Work session data validation failed, attempting recovery");
          const recoveryResult = await this.breakErrorHandler.handleTimerStateCorruption(workSessionData, 'work_session');
          
          if (recoveryResult.success) {
            const recovered = recoveryResult.recoveredState;
            this.workStartTime = recovered.workStartTime;
            this.totalWorkTime = recovered.totalWorkTime;
            this.breakStartTime = recovered.breakStartTime;
            this.breakDuration = recovered.breakDuration;
          } else {
            // Use defaults if recovery failed
            this.workStartTime = null;
            this.totalWorkTime = 0;
            this.breakStartTime = null;
            this.breakDuration = 0;
          }
        } else {
          // Use sanitized data
          const sanitized = validation.sanitizedData;
          this.workStartTime = sanitized.workStartTime || null;
          this.totalWorkTime = sanitized.workTime || 0;
          this.breakStartTime = sanitized.startTime || null;
          this.breakDuration = sanitized.duration || 0;
        }
        
        // Validate and recover from browser restart
        await this.recoverFromBrowserRestartWithErrorHandling();
      }
      
    } catch (error) {
      console.error("Error loading persisted state:", error);
      
      if (this.breakErrorHandler) {
        await this.breakErrorHandler.handleChromeApiUnavailable('storage', 'get', {
          key: 'timer_state',
          operation: 'load_persisted_state'
        });
      }
      
      // Initialize with defaults
      await this.initializeDefaultState();
    }
  }

  /**
   * Load persisted timer state from storage (legacy method for compatibility)
   */
  async loadPersistedState() {
    return await this.loadPersistedStateWithErrorHandling();
  }

  /**
   * Recover timer state after browser restart
   */
  async recoverFromBrowserRestart() {
    try {
      const now = Date.now();
      
      // If work timer was active before restart, calculate elapsed time
      if (this.isWorkTimerActive && this.workStartTime) {
        const elapsedTime = now - this.workStartTime;
        
        // If more than inactivity threshold passed, consider it as inactivity
        if (elapsedTime > this.inactivityThreshold) {
          console.log("Browser was inactive during restart, pausing work timer");
          await this.pauseWorkTimer();
        } else {
          // Continue tracking from where we left off
          console.log("Recovering work timer state after browser restart");
          this.lastActivityTime = now;
        }
      }
      
      // If on break before restart, check if break should have ended
      if (this.isOnBreak && this.breakStartTime && this.breakDuration > 0) {
        const breakElapsed = now - this.breakStartTime;
        
        if (breakElapsed >= this.breakDuration) {
          console.log("Break ended during browser restart, resuming work timer");
          await this.endBreak();
        }
      }
      
    } catch (error) {
      console.error("Error recovering from browser restart:", error);
    }
  }

  /**
   * Setup browser focus detection
   */
  async setupFocusDetection() {
    try {
      // Listen for window focus changes if in service worker context
      if (typeof chrome !== 'undefined' && chrome.windows) {
        chrome.windows.onFocusChanged.addListener((windowId) => {
          if (windowId === chrome.windows.WINDOW_ID_NONE) {
            this.handleBrowserFocusLost();
          } else {
            this.handleBrowserFocusGained();
          }
        });
      }
    } catch (error) {
      console.error("Error setting up focus detection:", error);
    }
  }

  /**
   * Load settings from settings manager
   */
  async loadSettingsFromManager() {
    try {
      if (this.settingsManager) {
        this.workTimeThreshold = this.settingsManager.getWorkTimeThresholdMs();
        console.log(`Work time threshold loaded: ${this.workTimeThreshold / 1000 / 60} minutes`);
      } else {
        // Fallback to default
        this.workTimeThreshold = 30 * 60 * 1000;
        console.warn("Settings manager not available, using default threshold");
      }
    } catch (error) {
      console.error("Error loading settings from manager:", error);
      this.workTimeThreshold = 30 * 60 * 1000;
    }
  }

  /**
   * Start work timer
   */
  async startWorkTimer() {
    try {
      if (this.isOnBreak) {
        console.log("Cannot start work timer while on break");
        return false;
      }
      
      if (this.isWorkTimerActive) {
        console.log("Work timer already active");
        return true;
      }
      
      this.workStartTime = Date.now();
      this.isWorkTimerActive = true;
      this.lastActivityTime = this.workStartTime;
      
      try {
        await this.persistTimerStateWithErrorHandling();
      } catch (error) {
        console.error("Error persisting timer state during start:", error);
        // Continue anyway for better user experience
      }
      
      console.log("Work timer started");
      return true;
    } catch (error) {
      console.error("Error starting work timer:", error);
      return false;
    }
  }

  /**
   * Pause work timer (due to inactivity or focus loss)
   */
  async pauseWorkTimer() {
    try {
      if (!this.isWorkTimerActive || this.isOnBreak) {
        return false;
      }
      
      // Calculate and add elapsed work time
      if (this.workStartTime) {
        const elapsedTime = Date.now() - this.workStartTime;
        this.totalWorkTime += elapsedTime;
      }
      
      this.isWorkTimerActive = false;
      this.workStartTime = null;
      
      await this.persistTimerState();
      
      console.log("Work timer paused");
      return true;
    } catch (error) {
      console.error("Error pausing work timer:", error);
      return false;
    }
  }

  /**
   * Resume work timer (after activity or focus gained)
   */
  async resumeWorkTimer() {
    try {
      if (this.isWorkTimerActive || this.isOnBreak) {
        return false;
      }
      
      this.workStartTime = Date.now();
      this.isWorkTimerActive = true;
      this.lastActivityTime = this.workStartTime;
      
      await this.persistTimerState();
      
      console.log("Work timer resumed");
      return true;
    } catch (error) {
      console.error("Error resuming work timer:", error);
      return false;
    }
  }

  /**
   * Reset work timer (after break or manual reset)
   */
  async resetWorkTimer() {
    try {
      this.totalWorkTime = 0;
      this.workStartTime = Date.now();
      this.isWorkTimerActive = true;
      this.lastActivityTime = this.workStartTime;
      
      await this.persistTimerState();
      
      console.log("Work timer reset");
      return true;
    } catch (error) {
      console.error("Error resetting work timer:", error);
      return false;
    }
  }

  /**
   * Start a break with specified type and duration
   */
  async startBreak(breakType, durationMinutes) {
    try {
      if (this.isOnBreak) {
        console.log("Already on break");
        return false;
      }
      
      // Pause work timer first
      try {
        await this.pauseWorkTimer();
      } catch (error) {
        console.error("Error pausing work timer:", error);
        // Continue anyway
      }
      
      this.isOnBreak = true;
      this.breakType = breakType;
      this.breakStartTime = Date.now();
      this.breakDuration = durationMinutes * 60 * 1000; // Convert to milliseconds
      
      try {
        await this.persistTimerStateWithErrorHandling();
      } catch (error) {
        console.error("Error persisting timer state during break start:", error);
        // Continue anyway for better user experience
      }
      
      // Update extension badge to show break status
      try {
        await this.updateExtensionBadgeWithErrorHandling();
      } catch (error) {
        console.error("Error updating badge during break start:", error);
        // Continue anyway
      }
      
      console.log(`Started ${breakType} break for ${durationMinutes} minutes`);
      return true;
    } catch (error) {
      console.error("Error starting break:", error);
      return false;
    }
  }

  /**
   * End current break and reset work timer
   */
  async endBreak() {
    try {
      if (!this.isOnBreak) {
        console.log("Not currently on break");
        return false;
      }
      
      this.isOnBreak = false;
      this.breakType = null;
      this.breakStartTime = null;
      this.breakDuration = 0;
      
      // Reset work timer for new work session
      await this.resetWorkTimer();
      
      // Clear extension badge
      await this.clearExtensionBadgeWithErrorHandling();
      
      console.log("Break ended, work timer reset");
      return true;
    } catch (error) {
      console.error("Error ending break:", error);
      return false;
    }
  }

  /**
   * Handle browser focus lost
   */
  async handleBrowserFocusLost() {
    try {
      this.isBrowserFocused = false;
      this.lastFocusChangeTime = Date.now();
      
      // Don't pause immediately, wait for inactivity threshold
      setTimeout(async () => {
        if (!this.isBrowserFocused) {
          const inactiveTime = Date.now() - this.lastFocusChangeTime;
          if (inactiveTime >= this.inactivityThreshold) {
            await this.pauseWorkTimer();
          }
        }
      }, this.inactivityThreshold);
      
    } catch (error) {
      console.error("Error handling browser focus lost:", error);
    }
  }

  /**
   * Handle browser focus gained
   */
  async handleBrowserFocusGained() {
    try {
      this.isBrowserFocused = true;
      this.lastFocusChangeTime = Date.now();
      this.lastActivityTime = Date.now();
      
      // Resume work timer if it was paused and we're not on break
      if (!this.isWorkTimerActive && !this.isOnBreak) {
        await this.resumeWorkTimer();
      }
      
    } catch (error) {
      console.error("Error handling browser focus gained:", error);
    }
  }

  /**
   * Update activity timestamp (called by tab tracker or other activity detection)
   */
  async updateActivity() {
    try {
      this.lastActivityTime = Date.now();
      
      // Resume work timer if paused due to inactivity
      if (!this.isWorkTimerActive && !this.isOnBreak && this.isBrowserFocused) {
        await this.resumeWorkTimer();
      }
      
      // Update badge if on break
      if (this.isOnBreak) {
        await this.updateExtensionBadgeWithErrorHandling();
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  }

  /**
   * Get current work time (including active session)
   */
  getCurrentWorkTime() {
    try {
      let currentWorkTime = typeof this.totalWorkTime === 'number' ? this.totalWorkTime : 0;
      
      // Add current session time if timer is active
      if (this.isWorkTimerActive && 
          typeof this.workStartTime === 'number' && 
          this.workStartTime > 0) {
        const sessionTime = Date.now() - this.workStartTime;
        if (sessionTime >= 0 && sessionTime < 24 * 60 * 60 * 1000) { // Reasonable session time
          currentWorkTime += sessionTime;
        }
      }
      
      return Math.max(0, currentWorkTime);
    } catch (error) {
      console.error("Error getting current work time:", error);
      return 0;
    }
  }

  /**
   * Check if work time threshold is exceeded
   */
  isWorkTimeThresholdExceeded() {
    try {
      const currentWorkTime = this.getCurrentWorkTime();
      return currentWorkTime >= this.workTimeThreshold;
    } catch (error) {
      console.error("Error checking work time threshold:", error);
      return false;
    }
  }

  /**
   * Get remaining break time
   */
  getRemainingBreakTime() {
    try {
      if (!this.isOnBreak || !this.breakStartTime || !this.breakDuration) {
        return 0;
      }
      
      const elapsedBreakTime = Date.now() - this.breakStartTime;
      const remainingTime = this.breakDuration - elapsedBreakTime;
      
      return Math.max(0, remainingTime);
    } catch (error) {
      console.error("Error getting remaining break time:", error);
      return 0;
    }
  }

  /**
   * Get timer status and statistics
   */
  getTimerStatus() {
    try {
      return {
        isWorkTimerActive: this.isWorkTimerActive,
        isOnBreak: this.isOnBreak,
        breakType: this.breakType,
        workStartTime: this.workStartTime,
        currentWorkTime: this.getCurrentWorkTime(),
        totalWorkTime: this.totalWorkTime,
        workTimeThreshold: this.workTimeThreshold,
        isThresholdExceeded: this.isWorkTimeThresholdExceeded(),
        remainingBreakTime: this.getRemainingBreakTime(),
        lastActivityTime: this.lastActivityTime,
        isBrowserFocused: this.isBrowserFocused
      };
    } catch (error) {
      console.error("Error getting timer status:", error);
      return null;
    }
  }

  /**
   * Update work time threshold setting
   */
  async updateWorkTimeThreshold(minutes) {
    try {
      if (this.settingsManager) {
        const success = await this.settingsManager.updateWorkTimeThreshold(minutes);
        if (success) {
          this.workTimeThreshold = minutes * 60 * 1000;
          console.log(`Work time threshold updated to ${minutes} minutes`);
        }
        return success;
      } else {
        // Fallback to direct storage update
        this.workTimeThreshold = minutes * 60 * 1000;
        const settings = await this.storageManager.get(this.STORAGE_KEYS.BREAK_SETTINGS) || {};
        settings.workTimeThresholdMinutes = minutes;
        await this.storageManager.set(this.STORAGE_KEYS.BREAK_SETTINGS, settings);
        console.log(`Work time threshold updated to ${minutes} minutes (fallback)`);
        return true;
      }
    } catch (error) {
      console.error("Error updating work time threshold:", error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled() {
    try {
      if (this.settingsManager) {
        return this.settingsManager.areNotificationsEnabled();
      }
      return true; // Default to enabled
    } catch (error) {
      console.error("Error checking notifications setting:", error);
      return true;
    }
  }

  /**
   * Get current settings
   */
  getCurrentSettings() {
    try {
      if (this.settingsManager) {
        return this.settingsManager.getSettings();
      }
      return null;
    } catch (error) {
      console.error("Error getting current settings:", error);
      return null;
    }
  }

  /**
   * Update extension badge to show break status
   */
  async updateExtensionBadge() {
    try {
      if (typeof chrome !== 'undefined' && chrome.action) {
        if (this.isOnBreak) {
          const remainingMinutes = Math.ceil(this.getRemainingBreakTime() / (1000 * 60));
          await chrome.action.setBadgeText({ text: `${remainingMinutes}m` });
          await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green for break
          await chrome.action.setTitle({ title: `Break: ${remainingMinutes} minutes remaining` });
        } else {
          await this.clearExtensionBadge();
        }
      }
    } catch (error) {
      console.error("Error updating extension badge:", error);
    }
  }

  /**
   * Clear extension badge
   */
  async clearExtensionBadge() {
    try {
      if (typeof chrome !== 'undefined' && chrome.action) {
        await chrome.action.setBadgeText({ text: '' });
        await chrome.action.setTitle({ title: 'Focus Productivity Extension' });
      }
    } catch (error) {
      console.error("Error clearing extension badge:", error);
    }
  }

  /**
   * Cancel current break early
   */
  async cancelBreak() {
    try {
      if (!this.isOnBreak) {
        console.log("No active break to cancel");
        return false;
      }
      
      console.log(`Cancelling ${this.breakType} break early`);
      
      // End the break and reset work timer
      await this.endBreak();
      
      console.log("Break cancelled successfully");
      return true;
    } catch (error) {
      console.error("Error cancelling break:", error);
      return false;
    }
  }

  /**
   * Initialize fallback mode when normal initialization fails
   */
  async initializeFallbackMode() {
    try {
      console.log("Initializing BreakTimerManager in fallback mode");
      
      // Set up minimal functionality
      this.workStartTime = null;
      this.totalWorkTime = 0;
      this.isWorkTimerActive = false;
      this.isOnBreak = false;
      this.breakStartTime = null;
      this.breakDuration = 0;
      this.breakType = null;
      this.lastActivityTime = Date.now();
      this.workTimeThreshold = 30 * 60 * 1000;
      this.isBrowserFocused = true;
      
      // Create minimal error handler if not available
      if (!this.breakErrorHandler) {
        this.breakErrorHandler = {
          handleChromeApiUnavailable: async () => ({ success: false, fallbackMode: true }),
          validateAndSanitizeBreakData: (data) => ({ isValid: true, sanitizedData: data, errors: [] }),
          showUserFeedback: (message, type) => console.log(`Fallback Feedback [${type}]: ${message}`)
        };
      }
      
      console.log("BreakTimerManager fallback mode initialized");
    } catch (error) {
      console.error("Error initializing fallback mode:", error);
    }
  }

  /**
   * Initialize default state
   */
  async initializeDefaultState() {
    this.workStartTime = null;
    this.totalWorkTime = 0;
    this.isWorkTimerActive = false;
    this.isOnBreak = false;
    this.breakStartTime = null;
    this.breakDuration = 0;
    this.breakType = null;
    this.lastActivityTime = Date.now();
    this.workTimeThreshold = 30 * 60 * 1000;
    this.isBrowserFocused = true;
    
    // Persist default state
    await this.persistTimerStateWithErrorHandling();
  }

  /**
   * Recover from browser restart with error handling
   */
  async recoverFromBrowserRestartWithErrorHandling() {
    try {
      const now = Date.now();
      
      // If work timer was active before restart, calculate elapsed time
      if (this.isWorkTimerActive && this.workStartTime) {
        const elapsedTime = now - this.workStartTime;
        
        // Validate elapsed time is reasonable (not more than 24 hours)
        if (elapsedTime > 24 * 60 * 60 * 1000) {
          console.warn("Unreasonable elapsed time detected, resetting work timer");
          this.isWorkTimerActive = false;
          this.workStartTime = null;
          this.totalWorkTime = 0;
          await this.persistTimerStateWithErrorHandling();
          return;
        }
        
        // If more than inactivity threshold passed, consider it as inactivity
        if (elapsedTime > this.inactivityThreshold) {
          console.log("Browser was inactive during restart, pausing work timer");
          await this.pauseWorkTimer();
        } else {
          // Continue tracking from where we left off
          console.log("Recovering work timer state after browser restart");
          this.lastActivityTime = now;
        }
      }
      
      // If on break before restart, check if break should have ended
      if (this.isOnBreak && this.breakStartTime && this.breakDuration > 0) {
        const breakElapsed = now - this.breakStartTime;
        
        // Validate break duration is reasonable
        if (breakElapsed > 4 * 60 * 60 * 1000) { // More than 4 hours
          console.warn("Unreasonable break duration detected, ending break");
          await this.endBreak();
          return;
        }
        
        if (breakElapsed >= this.breakDuration) {
          console.log("Break ended during browser restart, resuming work timer");
          await this.endBreak();
        }
      }
      
    } catch (error) {
      console.error("Error recovering from browser restart:", error);
      
      if (this.breakErrorHandler) {
        await this.breakErrorHandler.handleTimerStateCorruption({
          workStartTime: this.workStartTime,
          isWorkTimerActive: this.isWorkTimerActive,
          isOnBreak: this.isOnBreak,
          breakStartTime: this.breakStartTime,
          breakDuration: this.breakDuration
        }, 'browser_restart_recovery');
      }
      
      // Reset to safe state
      await this.initializeDefaultState();
    }
  }

  /**
   * Persist timer state to storage with error handling
   */
  async persistTimerStateWithErrorHandling() {
    try {
      const timerState = {
        isWorkTimerActive: this.isWorkTimerActive,
        isOnBreak: this.isOnBreak,
        breakType: this.breakType,
        lastActivityTime: this.lastActivityTime,
        workTimeThreshold: this.workTimeThreshold
      };
      
      const workSessionData = {
        workStartTime: this.workStartTime,
        totalWorkTime: this.totalWorkTime,
        breakStartTime: this.breakStartTime,
        breakDuration: this.breakDuration
      };
      
      // Validate data before persisting
      if (this.breakErrorHandler) {
        const timerValidation = this.breakErrorHandler.validateAndSanitizeBreakData(timerState, 'timer_state_persist');
        const workValidation = this.breakErrorHandler.validateAndSanitizeBreakData(workSessionData, 'work_session_persist');
        
        if (!timerValidation.isValid || !workValidation.isValid) {
          console.warn("Data validation failed during persist, using sanitized data");
        }
        
        // Use sanitized data
        const sanitizedTimerState = timerValidation.sanitizedData;
        const sanitizedWorkData = workValidation.sanitizedData;
        
        await this.storageManager.setMultiple({
          [this.STORAGE_KEYS.BREAK_TIMER_STATE]: sanitizedTimerState,
          [this.STORAGE_KEYS.WORK_SESSION_DATA]: sanitizedWorkData
        });
      } else {
        // Fallback without validation
        await this.storageManager.setMultiple({
          [this.STORAGE_KEYS.BREAK_TIMER_STATE]: timerState,
          [this.STORAGE_KEYS.WORK_SESSION_DATA]: workSessionData
        });
      }
      
    } catch (error) {
      console.error("Error persisting timer state:", error);
      
      if (this.breakErrorHandler) {
        const timerStateData = {
          isWorkTimerActive: this.isWorkTimerActive,
          isOnBreak: this.isOnBreak,
          breakType: this.breakType,
          lastActivityTime: this.lastActivityTime,
          workTimeThreshold: this.workTimeThreshold
        };
        
        const workSessionDataObj = {
          workStartTime: this.workStartTime,
          totalWorkTime: this.totalWorkTime,
          breakStartTime: this.breakStartTime,
          breakDuration: this.breakDuration
        };
        
        await this.breakErrorHandler.handleChromeApiUnavailable('storage', 'set', {
          key: 'timer_state',
          value: { timerState: timerStateData, workSessionData: workSessionDataObj },
          operation: 'persist_timer_state'
        });
      }
    }
  }

  /**
   * Persist timer state to storage (legacy method for compatibility)
   */
  async persistTimerState() {
    return await this.persistTimerStateWithErrorHandling();
  }

  /**
   * Update extension badge with error handling
   */
  async updateExtensionBadgeWithErrorHandling() {
    try {
      if (typeof chrome !== 'undefined' && chrome.action) {
        if (this.isOnBreak) {
          const remainingMinutes = Math.ceil(this.getRemainingBreakTime() / (1000 * 60));
          await chrome.action.setBadgeText({ text: `${remainingMinutes}m` });
          await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green for break
          await chrome.action.setTitle({ title: `Break: ${remainingMinutes} minutes remaining` });
        } else {
          await this.clearExtensionBadge();
        }
      }
    } catch (error) {
      console.error("Error updating extension badge:", error);
      
      if (this.breakErrorHandler) {
        // Try fallback badge update
        if (this.isOnBreak) {
          const remainingMinutes = Math.ceil(this.getRemainingBreakTime() / (1000 * 60));
          await this.breakErrorHandler.handleChromeApiUnavailable('action', 'setBadgeText', {
            text: `${remainingMinutes}m`
          });
          await this.breakErrorHandler.handleChromeApiUnavailable('action', 'setBadgeBackgroundColor', {
            color: '#4CAF50'
          });
          await this.breakErrorHandler.handleChromeApiUnavailable('action', 'setTitle', {
            title: `Break: ${remainingMinutes} minutes remaining`
          });
        } else {
          await this.clearExtensionBadgeWithErrorHandling();
        }
      }
    }
  }

  /**
   * Clear extension badge with error handling
   */
  async clearExtensionBadgeWithErrorHandling() {
    try {
      if (typeof chrome !== 'undefined' && chrome.action) {
        await chrome.action.setBadgeText({ text: '' });
        await chrome.action.setTitle({ title: 'Focus Productivity Extension' });
      }
    } catch (error) {
      console.error("Error clearing extension badge:", error);
      
      if (this.breakErrorHandler) {
        await this.breakErrorHandler.handleChromeApiUnavailable('action', 'setBadgeText', { text: '' });
        await this.breakErrorHandler.handleChromeApiUnavailable('action', 'setTitle', { 
          title: 'Focus Productivity Extension' 
        });
      }
    }
  }

  /**
   * Get error handler statistics
   */
  getErrorHandlerStats() {
    if (this.breakErrorHandler && typeof this.breakErrorHandler.getErrorStats === 'function') {
      return this.breakErrorHandler.getErrorStats();
    }
    return null;
  }
}

// Export for use in service worker and popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreakTimerManager;
} else if (typeof self !== "undefined") {
  self.BreakTimerManager = BreakTimerManager;
}