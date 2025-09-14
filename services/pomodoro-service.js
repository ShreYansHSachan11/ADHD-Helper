/**
 * Pomodoro Service - Timer management with persistent storage and tracking
 * Provides comprehensive Pomodoro technique implementation with statistics
 */

class PomodoroService {
  constructor() {
    this.storageManager = window.storageManager || new StorageManager();
    this.isRunning = false;
    this.currentSession = null;
    this.timer = null;
    this.listeners = new Set();

    // Default settings
    this.defaultSettings = {
      workDuration: 25, // minutes
      shortBreakDuration: 5, // minutes
      longBreakDuration: 15, // minutes
      sessionsUntilLongBreak: 4,
      autoStartBreaks: false,
      autoStartWork: false,
      soundEnabled: true,
      notificationsEnabled: true,
    };

    this.init();
  }

  async init() {
    try {
      // Load settings and current session
      await this.loadSettings();
      await this.loadCurrentSession();

      // Resume timer if there was an active session
      if (this.currentSession && this.currentSession.isActive) {
        await this.resumeSession();
      }
    } catch (error) {
      console.error("Failed to initialize Pomodoro service:", error);
    }
  }

  /**
   * Load Pomodoro settings from storage
   */
  async loadSettings() {
    try {
      const settings = await this.storageManager.get("pomodoroSettings");
      this.settings = { ...this.defaultSettings, ...settings };
      return this.settings;
    } catch (error) {
      console.error("Failed to load Pomodoro settings:", error);
      this.settings = { ...this.defaultSettings };
      return this.settings;
    }
  }

  /**
   * Save Pomodoro settings to storage
   */
  async saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.storageManager.set("pomodoroSettings", this.settings);
      this.notifyListeners("settingsUpdated", this.settings);
      return true;
    } catch (error) {
      console.error("Failed to save Pomodoro settings:", error);
      return false;
    }
  }

  /**
   * Load current session from storage
   */
  async loadCurrentSession() {
    try {
      const session = await this.storageManager.get("pomodoroCurrentSession");
      if (session) {
        this.currentSession = session;
        return session;
      }
      return null;
    } catch (error) {
      console.error("Failed to load current session:", error);
      return null;
    }
  }

  /**
   * Save current session to storage
   */
  async saveCurrentSession() {
    try {
      if (this.currentSession) {
        await this.storageManager.set(
          "pomodoroCurrentSession",
          this.currentSession
        );
      }
      return true;
    } catch (error) {
      console.error("Failed to save current session:", error);
      return false;
    }
  }

  /**
   * Start a new Pomodoro session
   */
  async startSession(type = "work") {
    try {
      // Stop any existing session
      if (this.isRunning) {
        await this.stopSession();
      }

      const duration = this.getSessionDuration(type);
      const now = Date.now();

      this.currentSession = {
        id: `pomodoro_${now}`,
        type, // 'work', 'shortBreak', 'longBreak'
        duration: duration * 60 * 1000, // Convert to milliseconds
        startTime: now,
        endTime: now + duration * 60 * 1000,
        remainingTime: duration * 60 * 1000,
        isActive: true,
        isPaused: false,
      };

      this.isRunning = true;
      await this.saveCurrentSession();

      // Start the timer
      this.startTimer();

      // Update statistics
      await this.updateSessionStats("started", type);

      this.notifyListeners("sessionStarted", this.currentSession);

      // Show notification
      if (this.settings.notificationsEnabled) {
        this.showNotification(
          `${this.formatSessionType(type)} started!`,
          `${duration} minutes of ${
            type === "work" ? "focused work" : "break time"
          }`
        );
      }

      return this.currentSession;
    } catch (error) {
      console.error("Failed to start Pomodoro session:", error);
      return null;
    }
  }

  /**
   * Pause the current session
   */
  async pauseSession() {
    if (!this.isRunning || !this.currentSession) return false;

    try {
      this.currentSession.isPaused = true;
      this.currentSession.pausedAt = Date.now();

      this.clearTimer();
      await this.saveCurrentSession();

      this.notifyListeners("sessionPaused", this.currentSession);
      return true;
    } catch (error) {
      console.error("Failed to pause session:", error);
      return false;
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession() {
    if (!this.currentSession) return false;

    try {
      if (this.currentSession.isPaused) {
        // Calculate time lost during pause
        const pauseDuration = Date.now() - this.currentSession.pausedAt;
        this.currentSession.endTime += pauseDuration;
        this.currentSession.isPaused = false;
        delete this.currentSession.pausedAt;
      }

      // Check if session should still be running
      const now = Date.now();
      if (now >= this.currentSession.endTime) {
        // Session has expired, complete it
        await this.completeSession();
        return false;
      }

      this.currentSession.remainingTime = this.currentSession.endTime - now;
      this.isRunning = true;

      this.startTimer();
      await this.saveCurrentSession();

      this.notifyListeners("sessionResumed", this.currentSession);
      return true;
    } catch (error) {
      console.error("Failed to resume session:", error);
      return false;
    }
  }

  /**
   * Stop the current session
   */
  async stopSession() {
    if (!this.currentSession) return false;

    try {
      this.clearTimer();

      // Clear Chrome alarm if available
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime
          .sendMessage({
            type: "POMODORO_STOP_SESSION",
            sessionId: this.currentSession.id,
          })
          .catch((error) => {
            console.warn("Failed to clear Chrome alarm:", error);
          });
      }

      // Update statistics
      await this.updateSessionStats("stopped", this.currentSession.type);

      this.currentSession.isActive = false;
      this.currentSession.stoppedAt = Date.now();
      this.isRunning = false;

      await this.saveCurrentSession();
      await this.storageManager.remove("pomodoroCurrentSession");

      this.notifyListeners("sessionStopped", this.currentSession);

      const stoppedSession = this.currentSession;
      this.currentSession = null;

      return stoppedSession;
    } catch (error) {
      console.error("Failed to stop session:", error);
      return false;
    }
  }

  /**
   * Complete the current session
   */
  async completeSession() {
    if (!this.currentSession) return false;

    try {
      this.clearTimer();

      const completedSession = { ...this.currentSession };
      completedSession.isActive = false;
      completedSession.completedAt = Date.now();
      completedSession.wasCompleted = true;

      // Update statistics
      await this.updateSessionStats("completed", completedSession.type);

      // Save completed session to history
      await this.saveCompletedSession(completedSession);

      this.isRunning = false;
      this.currentSession = null;

      await this.storageManager.remove("pomodoroCurrentSession");

      this.notifyListeners("sessionCompleted", completedSession);

      // Show completion notification
      if (this.settings.notificationsEnabled) {
        this.showNotification(
          `${this.formatSessionType(completedSession.type)} completed!`,
          "Great job! Time for the next session."
        );
      }

      // Auto-start next session if enabled
      await this.handleAutoStart(completedSession);

      return completedSession;
    } catch (error) {
      console.error("Failed to complete session:", error);
      return false;
    }
  }

  /**
   * Handle auto-start logic for next session
   */
  async handleAutoStart(completedSession) {
    try {
      const stats = await this.getTodayStats();
      let nextSessionType;

      if (completedSession.type === "work") {
        // Determine break type
        const workSessionsToday = stats.workSessions || 0;
        const shouldTakeLongBreak =
          workSessionsToday % this.settings.sessionsUntilLongBreak === 0;
        nextSessionType = shouldTakeLongBreak ? "longBreak" : "shortBreak";

        if (this.settings.autoStartBreaks) {
          setTimeout(() => this.startSession(nextSessionType), 2000);
        }
      } else {
        // Break completed, next is work
        nextSessionType = "work";

        if (this.settings.autoStartWork) {
          setTimeout(() => this.startSession(nextSessionType), 2000);
        }
      }

      this.notifyListeners("nextSessionReady", { type: nextSessionType });
    } catch (error) {
      console.error("Failed to handle auto-start:", error);
    }
  }

  /**
   * Start the countdown timer
   */
  startTimer() {
    this.clearTimer();

    // Set up Chrome alarm for reliable completion (if available)
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      this.currentSession
    ) {
      const durationMinutes = Math.ceil(
        this.currentSession.remainingTime / (60 * 1000)
      );
      chrome.runtime
        .sendMessage({
          type: "POMODORO_START_SESSION",
          sessionId: this.currentSession.id,
          duration: durationMinutes,
        })
        .catch((error) => {
          console.warn(
            "Failed to set Chrome alarm, using fallback timer:",
            error
          );
        });
    }

    this.timer = setInterval(async () => {
      if (!this.currentSession || this.currentSession.isPaused) return;

      const now = Date.now();
      this.currentSession.remainingTime = Math.max(
        0,
        this.currentSession.endTime - now
      );

      // Update listeners with current time
      this.notifyListeners("tick", {
        remainingTime: this.currentSession.remainingTime,
        session: this.currentSession,
      });

      // Check if session is complete
      if (this.currentSession.remainingTime <= 0) {
        await this.completeSession();
      } else {
        // Save progress periodically (every 30 seconds)
        if (Math.floor(now / 30000) !== Math.floor((now - 1000) / 30000)) {
          await this.saveCurrentSession();
        }
      }
    }, 1000);
  }

  /**
   * Clear the current timer
   */
  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Get session duration based on type
   */
  getSessionDuration(type) {
    switch (type) {
      case "work":
        return this.settings.workDuration;
      case "shortBreak":
        return this.settings.shortBreakDuration;
      case "longBreak":
        return this.settings.longBreakDuration;
      default:
        return this.settings.workDuration;
    }
  }

  /**
   * Format session type for display
   */
  formatSessionType(type) {
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
   * Save completed session to history
   */
  async saveCompletedSession(session) {
    try {
      const history = (await this.storageManager.get("pomodoroHistory")) || [];
      history.push(session);

      // Keep only last 100 sessions to manage storage
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      await this.storageManager.set("pomodoroHistory", history);
      return true;
    } catch (error) {
      console.error("Failed to save completed session:", error);
      return false;
    }
  }

  /**
   * Update session statistics
   */
  async updateSessionStats(action, sessionType) {
    try {
      const today = new Date().toDateString();
      const stats = (await this.storageManager.get("pomodoroStats")) || {};

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

      // Update action counts
      if (action === "started") {
        todayStats.sessionsStarted++;
      } else if (action === "completed") {
        todayStats.sessionsCompleted++;

        // Update session type counts and time
        if (sessionType === "work") {
          todayStats.workSessions++;
          todayStats.totalWorkTime += this.settings.workDuration;
        } else if (sessionType === "shortBreak") {
          todayStats.shortBreaks++;
          todayStats.totalBreakTime += this.settings.shortBreakDuration;
        } else if (sessionType === "longBreak") {
          todayStats.longBreaks++;
          todayStats.totalBreakTime += this.settings.longBreakDuration;
        }
      } else if (action === "stopped") {
        todayStats.sessionsStopped++;
      }

      await this.storageManager.set("pomodoroStats", stats);
      return todayStats;
    } catch (error) {
      console.error("Failed to update session stats:", error);
      return null;
    }
  }

  /**
   * Get today's statistics
   */
  async getTodayStats() {
    try {
      const today = new Date().toDateString();
      const stats = (await this.storageManager.get("pomodoroStats")) || {};
      return (
        stats[today] || {
          workSessions: 0,
          shortBreaks: 0,
          longBreaks: 0,
          totalWorkTime: 0,
          totalBreakTime: 0,
          sessionsStarted: 0,
          sessionsCompleted: 0,
          sessionsStopped: 0,
        }
      );
    } catch (error) {
      console.error("Failed to get today stats:", error);
      return {};
    }
  }

  /**
   * Get historical statistics
   */
  async getHistoricalStats(days = 7) {
    try {
      const stats = (await this.storageManager.get("pomodoroStats")) || {};
      const result = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();

        result.push({
          date: dateString,
          stats: stats[dateString] || {
            workSessions: 0,
            shortBreaks: 0,
            longBreaks: 0,
            totalWorkTime: 0,
            totalBreakTime: 0,
            sessionsStarted: 0,
            sessionsCompleted: 0,
            sessionsStopped: 0,
          },
        });
      }

      return result;
    } catch (error) {
      console.error("Failed to get historical stats:", error);
      return [];
    }
  }

  /**
   * Get session history
   */
  async getSessionHistory(limit = 20) {
    try {
      const history = (await this.storageManager.get("pomodoroHistory")) || [];
      return history.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.error("Failed to get session history:", error);
      return [];
    }
  }

  /**
   * Show browser notification
   */
  showNotification(title, message) {
    if (typeof chrome !== "undefined" && chrome.notifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icons/48.ico",
        title,
        message,
      });
    }
  }

  /**
   * Format time for display
   */
  formatTime(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error in Pomodoro listener:", error);
      }
    });
  }

  /**
   * Get current session info
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Check if timer is running
   */
  isTimerRunning() {
    return this.isRunning;
  }

  /**
   * Reset all data (for testing/debugging)
   */
  async resetAllData() {
    try {
      await this.stopSession();
      await this.storageManager.removeMultiple([
        "pomodoroSettings",
        "pomodoroCurrentSession",
        "pomodoroHistory",
        "pomodoroStats",
      ]);

      this.settings = { ...this.defaultSettings };
      this.currentSession = null;
      this.isRunning = false;

      this.notifyListeners("dataReset");
      return true;
    } catch (error) {
      console.error("Failed to reset Pomodoro data:", error);
      return false;
    }
  }
}

// Export for use in extension
if (typeof module !== "undefined" && module.exports) {
  module.exports = PomodoroService;
} else {
  // Make available globally in both service worker and popup contexts
  globalThis.PomodoroService = PomodoroService;
}
