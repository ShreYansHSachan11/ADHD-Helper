/**
 * Pomodoro Timer Component - UI component for Pomodoro functionality
 * Provides timer interface, controls, and statistics display
 */

class PomodoroTimer {
  constructor(containerId = "pomodoroContainer") {
    this.containerId = containerId;
    this.container = null;
    this.pomodoroService = null;
    this.isInitialized = false;

    // UI elements
    this.elements = {};

    // State
    this.currentSession = null;
    this.todayStats = null;

    this.init();
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Initialize Pomodoro service
      this.pomodoroService = new PomodoroService();

      // Set up event listeners
      this.pomodoroService.addEventListener((event, data) => {
        this.handleServiceEvent(event, data);
      });

      // Create UI
      this.createUI();

      // Load initial data
      await this.loadInitialData();

      this.isInitialized = true;
      console.log("Pomodoro Timer component initialized");
    } catch (error) {
      console.error("Failed to initialize Pomodoro Timer:", error);
    }
  }

  createUI() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Pomodoro container ${this.containerId} not found`);
      return;
    }

    this.container.innerHTML = `
      <div class="pomodoro-timer">
        <!-- Timer Display -->
        <div class="timer-display">
          <div class="session-type" id="pomodoroSessionType">Ready to Focus</div>
          <div class="timer-circle">
            <svg width="160" height="160">
              <circle cx="80" cy="80" r="45" class="timer-progress" id="pomodoroProgress" />
            </svg>
            <div class="timer-time" id="pomodoroTime">25:00</div>
          </div>
          <div class="session-info" id="pomodoroSessionInfo">Click Start to begin</div>
        </div>

        <!-- Controls -->
        <div class="timer-controls">
          <button class="btn btn-primary" id="pomodoroStartBtn">
            <span class="btn-icon">▶</span>
            <span class="btn-text">Start</span>
          </button>
          <button class="btn btn-secondary" id="pomodoroPauseBtn" style="display: none;">
            <span class="btn-icon">⏸</span>
            <span class="btn-text">Pause</span>
          </button>
          <button class="btn btn-danger" id="pomodoroStopBtn" style="display: none;">
            <span class="btn-icon">⏹</span>
            <span class="btn-text">Stop</span>
          </button>
        </div>

        <!-- Session Type Selector -->
        <div class="session-selector" id="pomodoroSessionSelector">
          <button class="session-btn active" data-type="work">
            <span class="session-icon">🍅</span>
            <span class="session-label">Work</span>
            <span class="session-duration" id="workDuration">25m</span>
          </button>
          <button class="session-btn" data-type="shortBreak">
            <span class="session-icon">☕</span>
            <span class="session-label">Short Break</span>
            <span class="session-duration" id="shortBreakDuration">5m</span>
          </button>
          <button class="session-btn" data-type="longBreak">
            <span class="session-icon">🌟</span>
            <span class="session-label">Long Break</span>
            <span class="session-duration" id="longBreakDuration">15m</span>
          </button>
        </div>

        <!-- Today's Stats -->
        <div class="pomodoro-stats">
          <h4>Today's Progress</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value" id="todayWorkSessions">0</div>
              <div class="stat-label">Work Sessions</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="todayTotalTime">0m</div>
              <div class="stat-label">Focus Time</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="todayBreaks">0</div>
              <div class="stat-label">Breaks</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="todayCompletion">0%</div>
              <div class="stat-label">Completion</div>
            </div>
          </div>
        </div>

        <!-- Settings Toggle -->
        <div class="pomodoro-settings-toggle">
          <button class="btn btn-link" id="pomodoroSettingsBtn">
            <span class="btn-icon">⚙️</span>
            <span class="btn-text">Settings</span>
          </button>
        </div>

        <!-- Settings Panel -->
        <div class="pomodoro-settings" id="pomodoroSettings" style="display: none;">
          <h4>Pomodoro Settings</h4>
          
          <div class="setting-group">
            <label for="workDurationSetting">Work Duration (minutes)</label>
            <input type="number" id="workDurationSetting" min="1" max="60" value="25">
          </div>
          
          <div class="setting-group">
            <label for="shortBreakSetting">Short Break (minutes)</label>
            <input type="number" id="shortBreakSetting" min="1" max="30" value="5">
          </div>
          
          <div class="setting-group">
            <label for="longBreakSetting">Long Break (minutes)</label>
            <input type="number" id="longBreakSetting" min="1" max="60" value="15">
          </div>
          
          <div class="setting-group">
            <label for="longBreakInterval">Long Break Interval</label>
            <input type="number" id="longBreakInterval" min="2" max="10" value="4">
            <small>After how many work sessions</small>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" id="autoStartBreaks">
              <span class="checkmark"></span>
              Auto-start breaks
            </label>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" id="autoStartWork">
              <span class="checkmark"></span>
              Auto-start work sessions
            </label>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" id="notificationsEnabled" checked>
              <span class="checkmark"></span>
              Enable notifications
            </label>
          </div>
          
          <div class="settings-actions">
            <button class="btn btn-primary" id="saveSettingsBtn">Save Settings</button>
            <button class="btn btn-secondary" id="resetSettingsBtn">Reset to Default</button>
          </div>
        </div>
      </div>
    `;

    this.bindElements();
    this.setupEventListeners();
  }

  bindElements() {
    // Timer display elements
    this.elements.sessionType = document.getElementById("pomodoroSessionType");
    this.elements.progress = document.getElementById("pomodoroProgress");
    this.elements.time = document.getElementById("pomodoroTime");
    this.elements.sessionInfo = document.getElementById("pomodoroSessionInfo");

    // Control elements
    this.elements.startBtn = document.getElementById("pomodoroStartBtn");
    this.elements.pauseBtn = document.getElementById("pomodoroPauseBtn");
    this.elements.stopBtn = document.getElementById("pomodoroStopBtn");

    // Session selector
    this.elements.sessionSelector = document.getElementById(
      "pomodoroSessionSelector"
    );
    this.elements.sessionBtns =
      this.elements.sessionSelector.querySelectorAll(".session-btn");

    // Stats elements
    this.elements.todayWorkSessions =
      document.getElementById("todayWorkSessions");
    this.elements.todayTotalTime = document.getElementById("todayTotalTime");
    this.elements.todayBreaks = document.getElementById("todayBreaks");
    this.elements.todayCompletion = document.getElementById("todayCompletion");

    // Settings elements
    this.elements.settingsBtn = document.getElementById("pomodoroSettingsBtn");
    this.elements.settingsPanel = document.getElementById("pomodoroSettings");
    this.elements.workDurationSetting = document.getElementById(
      "workDurationSetting"
    );
    this.elements.shortBreakSetting =
      document.getElementById("shortBreakSetting");
    this.elements.longBreakSetting =
      document.getElementById("longBreakSetting");
    this.elements.longBreakInterval =
      document.getElementById("longBreakInterval");
    this.elements.autoStartBreaks = document.getElementById("autoStartBreaks");
    this.elements.autoStartWork = document.getElementById("autoStartWork");
    this.elements.notificationsEnabled = document.getElementById(
      "notificationsEnabled"
    );
    this.elements.saveSettingsBtn = document.getElementById("saveSettingsBtn");
    this.elements.resetSettingsBtn =
      document.getElementById("resetSettingsBtn");

    // Duration display elements
    this.elements.workDuration = document.getElementById("workDuration");
    this.elements.shortBreakDuration =
      document.getElementById("shortBreakDuration");
    this.elements.longBreakDuration =
      document.getElementById("longBreakDuration");
  }

  setupEventListeners() {
    // Control buttons
    this.elements.startBtn?.addEventListener("click", () => this.handleStart());
    this.elements.pauseBtn?.addEventListener("click", () => this.handlePause());
    this.elements.stopBtn?.addEventListener("click", () => this.handleStop());

    // Session type buttons
    this.elements.sessionBtns?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.type;
        this.selectSessionType(type);
      });
    });

    // Settings
    this.elements.settingsBtn?.addEventListener("click", () =>
      this.toggleSettings()
    );
    this.elements.saveSettingsBtn?.addEventListener("click", () =>
      this.saveSettings()
    );
    this.elements.resetSettingsBtn?.addEventListener("click", () =>
      this.resetSettings()
    );
  }

  async loadInitialData() {
    try {
      // Load current session
      this.currentSession = this.pomodoroService.getCurrentSession();

      // Load today's stats
      this.todayStats = await this.pomodoroService.getTodayStats();

      // Load settings
      const settings = this.pomodoroService.getSettings();

      // Update UI
      this.updateTimerDisplay();
      this.updateStatsDisplay();
      this.updateSettingsDisplay(settings);
      this.updateDurationLabels(settings);
      this.updateControlsState();
    } catch (error) {
      console.error("Failed to load initial Pomodoro data:", error);
    }
  }

  handleServiceEvent(event, data) {
    switch (event) {
      case "sessionStarted":
        this.currentSession = data;
        this.updateTimerDisplay();
        this.updateControlsState();
        break;

      case "sessionPaused":
        this.currentSession = data;
        this.updateControlsState();
        break;

      case "sessionResumed":
        this.currentSession = data;
        this.updateControlsState();
        break;

      case "sessionStopped":
      case "sessionCompleted":
        this.currentSession = null;
        this.updateTimerDisplay();
        this.updateControlsState();
        this.loadTodayStats(); // Refresh stats
        break;

      case "tick":
        this.updateTimerProgress(data.remainingTime, data.session);
        break;

      case "nextSessionReady":
        this.highlightNextSession(data.type);
        break;

      case "settingsUpdated":
        this.updateDurationLabels(data);
        break;
    }
  }

  async handleStart() {
    try {
      if (this.currentSession && this.currentSession.isPaused) {
        // Resume paused session
        await this.pomodoroService.resumeSession();
      } else {
        // Start new session
        const selectedType = this.getSelectedSessionType();
        await this.pomodoroService.startSession(selectedType);
      }
    } catch (error) {
      console.error("Failed to start Pomodoro session:", error);
    }
  }

  async handlePause() {
    try {
      await this.pomodoroService.pauseSession();
    } catch (error) {
      console.error("Failed to pause Pomodoro session:", error);
    }
  }

  async handleStop() {
    try {
      await this.pomodoroService.stopSession();
    } catch (error) {
      console.error("Failed to stop Pomodoro session:", error);
    }
  }

  selectSessionType(type) {
    // Update active button
    this.elements.sessionBtns?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });
  }

  getSelectedSessionType() {
    const activeBtn = this.elements.sessionSelector?.querySelector(
      ".session-btn.active"
    );
    return activeBtn?.dataset.type || "work";
  }

  updateTimerDisplay() {
    if (
      !this.elements.sessionType ||
      !this.elements.time ||
      !this.elements.sessionInfo
    )
      return;

    if (this.currentSession) {
      // Active session
      this.elements.sessionType.textContent =
        this.pomodoroService.formatSessionType(this.currentSession.type);
      this.elements.time.textContent = this.pomodoroService.formatTime(
        this.currentSession.remainingTime
      );

      if (this.currentSession.isPaused) {
        this.elements.sessionInfo.textContent = "Session paused";
      } else {
        this.elements.sessionInfo.textContent = "Session in progress";
      }

      // Update progress circle
      this.updateTimerProgress(
        this.currentSession.remainingTime,
        this.currentSession
      );
    } else {
      // No active session
      const selectedType = this.getSelectedSessionType();
      const duration = this.pomodoroService.getSessionDuration(selectedType);

      this.elements.sessionType.textContent = "Ready to Focus";
      this.elements.time.textContent = this.pomodoroService.formatTime(
        duration * 60 * 1000
      );
      this.elements.sessionInfo.textContent = "Click Start to begin";

      // Reset progress circle
      if (this.elements.progress) {
        this.elements.progress.style.strokeDashoffset = "283"; // Full circle
      }
    }
  }

  updateTimerProgress(remainingTime, session) {
    if (!this.elements.progress || !session) return;

    const totalTime = session.duration;
    const elapsed = totalTime - remainingTime;
    const progress = elapsed / totalTime;

    // Update progress circle (circumference = 2 * π * 45 ≈ 283)
    const circumference = 283;
    const offset = circumference - progress * circumference;
    this.elements.progress.style.strokeDashoffset = offset.toString();

    // Update time display
    if (this.elements.time) {
      this.elements.time.textContent =
        this.pomodoroService.formatTime(remainingTime);
    }
  }

  updateControlsState() {
    if (
      !this.elements.startBtn ||
      !this.elements.pauseBtn ||
      !this.elements.stopBtn
    )
      return;

    if (this.currentSession) {
      if (this.currentSession.isPaused) {
        // Paused state
        this.elements.startBtn.style.display = "inline-flex";
        this.elements.startBtn.querySelector(".btn-text").textContent =
          "Resume";
        this.elements.pauseBtn.style.display = "none";
        this.elements.stopBtn.style.display = "inline-flex";
      } else {
        // Running state
        this.elements.startBtn.style.display = "none";
        this.elements.pauseBtn.style.display = "inline-flex";
        this.elements.stopBtn.style.display = "inline-flex";
      }
    } else {
      // Idle state
      this.elements.startBtn.style.display = "inline-flex";
      this.elements.startBtn.querySelector(".btn-text").textContent = "Start";
      this.elements.pauseBtn.style.display = "none";
      this.elements.stopBtn.style.display = "none";
    }
  }

  async loadTodayStats() {
    try {
      this.todayStats = await this.pomodoroService.getTodayStats();
      this.updateStatsDisplay();
    } catch (error) {
      console.error("Failed to load today stats:", error);
    }
  }

  updateStatsDisplay() {
    if (!this.todayStats) return;

    if (this.elements.todayWorkSessions) {
      this.elements.todayWorkSessions.textContent =
        this.todayStats.workSessions || 0;
    }

    if (this.elements.todayTotalTime) {
      const totalMinutes = this.todayStats.totalWorkTime || 0;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours > 0) {
        this.elements.todayTotalTime.textContent = `${hours}h ${minutes}m`;
      } else {
        this.elements.todayTotalTime.textContent = `${minutes}m`;
      }
    }

    if (this.elements.todayBreaks) {
      const totalBreaks =
        (this.todayStats.shortBreaks || 0) + (this.todayStats.longBreaks || 0);
      this.elements.todayBreaks.textContent = totalBreaks;
    }

    if (this.elements.todayCompletion) {
      const started = this.todayStats.sessionsStarted || 0;
      const completed = this.todayStats.sessionsCompleted || 0;
      const completion =
        started > 0 ? Math.round((completed / started) * 100) : 0;
      this.elements.todayCompletion.textContent = `${completion}%`;
    }
  }

  updateSettingsDisplay(settings) {
    if (!settings) return;

    if (this.elements.workDurationSetting) {
      this.elements.workDurationSetting.value = settings.workDuration;
    }
    if (this.elements.shortBreakSetting) {
      this.elements.shortBreakSetting.value = settings.shortBreakDuration;
    }
    if (this.elements.longBreakSetting) {
      this.elements.longBreakSetting.value = settings.longBreakDuration;
    }
    if (this.elements.longBreakInterval) {
      this.elements.longBreakInterval.value = settings.sessionsUntilLongBreak;
    }
    if (this.elements.autoStartBreaks) {
      this.elements.autoStartBreaks.checked = settings.autoStartBreaks;
    }
    if (this.elements.autoStartWork) {
      this.elements.autoStartWork.checked = settings.autoStartWork;
    }
    if (this.elements.notificationsEnabled) {
      this.elements.notificationsEnabled.checked =
        settings.notificationsEnabled;
    }
  }

  updateDurationLabels(settings) {
    if (this.elements.workDuration) {
      this.elements.workDuration.textContent = `${settings.workDuration}m`;
    }
    if (this.elements.shortBreakDuration) {
      this.elements.shortBreakDuration.textContent = `${settings.shortBreakDuration}m`;
    }
    if (this.elements.longBreakDuration) {
      this.elements.longBreakDuration.textContent = `${settings.longBreakDuration}m`;
    }
  }

  toggleSettings() {
    if (!this.elements.settingsPanel) return;

    const isVisible = this.elements.settingsPanel.style.display !== "none";
    this.elements.settingsPanel.style.display = isVisible ? "none" : "block";
  }

  async saveSettings() {
    try {
      const newSettings = {
        workDuration: parseInt(this.elements.workDurationSetting?.value) || 25,
        shortBreakDuration:
          parseInt(this.elements.shortBreakSetting?.value) || 5,
        longBreakDuration:
          parseInt(this.elements.longBreakSetting?.value) || 15,
        sessionsUntilLongBreak:
          parseInt(this.elements.longBreakInterval?.value) || 4,
        autoStartBreaks: this.elements.autoStartBreaks?.checked || false,
        autoStartWork: this.elements.autoStartWork?.checked || false,
        notificationsEnabled:
          this.elements.notificationsEnabled?.checked || false,
      };

      const success = await this.pomodoroService.saveSettings(newSettings);

      if (success) {
        this.showMessage("Settings saved successfully!", "success");
        this.toggleSettings(); // Hide settings panel
      } else {
        this.showMessage("Failed to save settings", "error");
      }
    } catch (error) {
      console.error("Failed to save Pomodoro settings:", error);
      this.showMessage("Failed to save settings", "error");
    }
  }

  async resetSettings() {
    try {
      const defaultSettings = {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        notificationsEnabled: true,
      };

      const success = await this.pomodoroService.saveSettings(defaultSettings);

      if (success) {
        this.updateSettingsDisplay(defaultSettings);
        this.showMessage("Settings reset to default", "success");
      } else {
        this.showMessage("Failed to reset settings", "error");
      }
    } catch (error) {
      console.error("Failed to reset Pomodoro settings:", error);
      this.showMessage("Failed to reset settings", "error");
    }
  }

  highlightNextSession(type) {
    // Temporarily highlight the next session type
    const nextBtn = this.elements.sessionSelector?.querySelector(
      `[data-type="${type}"]`
    );
    if (nextBtn) {
      nextBtn.classList.add("next-session");
      setTimeout(() => {
        nextBtn.classList.remove("next-session");
      }, 3000);
    }
  }

  showMessage(message, type = "info") {
    // Create or update message display
    let messageEl = this.container.querySelector(".pomodoro-message");
    if (!messageEl) {
      messageEl = document.createElement("div");
      messageEl.className = "pomodoro-message";
      this.container.insertBefore(messageEl, this.container.firstChild);
    }

    messageEl.textContent = message;
    messageEl.className = `pomodoro-message ${type}`;
    messageEl.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.style.display = "none";
    }, 3000);
  }

  // Public methods for external control
  async startWorkSession() {
    this.selectSessionType("work");
    return await this.handleStart();
  }

  async startBreakSession(isLong = false) {
    this.selectSessionType(isLong ? "longBreak" : "shortBreak");
    return await this.handleStart();
  }

  getCurrentSessionInfo() {
    return this.currentSession;
  }

  async getTodayStats() {
    return await this.pomodoroService.getTodayStats();
  }
}

// Export for use in extension
if (typeof window !== "undefined") {
  window.PomodoroTimer = PomodoroTimer;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PomodoroTimer;
}
