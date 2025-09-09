// Popup JavaScript - Feature Grid Interface

class PopupManager {
  constructor() {
    this.isInitialized = false;
    this.currentFeature = "home";
    this.currentBreathingSession = null;
    this.whiteNoiseActive = false;
    this.simpleAudioManager = null;
    this.taskManager = null;
    this.pomodoroTimer = null;
    this.breathingExercise = null;
    this.errorHandler = null;
    this.lazyLoader = null;

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Initialize error handler
      if (typeof errorHandler !== "undefined") {
        this.errorHandler = errorHandler;
      }

      // Initialize UI elements
      this.initializeElements();

      // Set up event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadInitialData();

      // Update UI with current state
      this.updateUI();

      // Load saved feature preference
      await this.loadSavedFeature();

      this.isInitialized = true;
      console.log("Popup initialized successfully with feature grid interface");
    } catch (error) {
      console.error("Failed to initialize popup:", error);
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(error, "Popup Init");
      }
    }
  }

  initializeElements() {
    // Feature navigation elements
    this.featureBtns = document.querySelectorAll(".feature-btn");
    this.featurePanels = document.querySelectorAll(".feature-panel");
    this.homePanel = document.getElementById("homePanel");

    // Home panel elements
    this.todayScreenTime = document.getElementById("todayScreenTime");
    this.todayPomodoros = document.getElementById("todayPomodoros");

    // Screen Time elements
    this.currentTimeEl = document.getElementById("currentTime");
    this.timeLimitInput = document.getElementById("timeLimitInput");
    this.takeBreakBtn = document.getElementById("takeBreakBtn");
    this.resetScreenTimeBtn = document.getElementById("resetScreenTimeBtn");

    // Focus elements
    this.focusUrlEl = document.getElementById("focusUrl");
    this.setFocusBtn = document.getElementById("setFocusBtn");
    this.resetFocusBtn = document.getElementById("resetFocusBtn");
    this.focusStatusIndicator = document.getElementById("focusStatusIndicator");
    this.focusStatusDot = document.getElementById("focusStatusDot");
    this.focusStatusText = document.getElementById("focusStatusText");
    this.focusSessionInfo = document.getElementById("focusSessionInfo");
    this.focusSessionTime = document.getElementById("focusSessionTime");
    this.focusDeviationCount = document.getElementById("focusDeviationCount");
    this.lastFocusReminder = document.getElementById("lastFocusReminder");
    this.focusDeviationHistory = document.getElementById(
      "focusDeviationHistory"
    );
    this.deviationList = document.getElementById("deviationList");
    this.toggleHistoryBtn = document.getElementById("toggleHistoryBtn");

    // Task elements
    this.taskNameInput = document.getElementById("taskNameInput");
    this.taskDeadlineInput = document.getElementById("taskDeadlineInput");
    this.getBreakdownBtn = document.getElementById("getBreakdownBtn");
    this.taskBreakdown = document.getElementById("taskBreakdown");
    this.breakdownList = document.getElementById("breakdownList");

    // Calendar elements
    this.prioritySelect = document.getElementById("prioritySelect");
    this.createRemindersBtn = document.getElementById("createRemindersBtn");
    this.calendarStatus = document.getElementById("calendarStatus");
    this.calendarConnectionStatus = document.getElementById(
      "calendarConnectionStatus"
    );
    this.connectionDot = document.getElementById("connectionDot");
    this.connectionText = document.getElementById("connectionText");
    this.calendarConfig = document.getElementById("calendarConfig");
    this.toggleConfigBtn = document.getElementById("toggleConfigBtn");
    this.configContent = document.getElementById("configContent");
    this.apiKeyInput = document.getElementById("apiKeyInput");
    this.accessTokenInput = document.getElementById("accessTokenInput");
    this.saveConfigBtn = document.getElementById("saveConfigBtn");
    this.testConnectionBtn = document.getElementById("testConnectionBtn");
    this.clearConfigBtn = document.getElementById("clearConfigBtn");
    this.reminderTaskInput = document.getElementById("reminderTaskInput");
    this.reminderDeadlineInput = document.getElementById(
      "reminderDeadlineInput"
    );
    this.priorityInfo = document.getElementById("priorityInfo");
    this.manualReminderFallback = document.getElementById(
      "manualReminderFallback"
    );
    this.manualReminderList = document.getElementById("manualReminderList");
    this.copyRemindersBtn = document.getElementById("copyRemindersBtn");
    this.hideManualBtn = document.getElementById("hideManualBtn");

    // Wellness elements
    this.startBreathingBtn = document.getElementById("startBreathingBtn");
    this.whiteNoiseToggleBtn = document.getElementById("whiteNoiseToggleBtn");
    this.audioControls = document.getElementById("audioControls");
    this.volumeSlider = document.getElementById("volumeSlider");
    this.volumeValue = document.getElementById("volumeValue");
    this.nextSoundBtn = document.getElementById("nextSoundBtn");
    this.currentSoundName = document.getElementById("currentSoundName");

    // External page elements
    this.focusAnxietyBtn = document.getElementById("focusAnxietyBtn");
    this.asmrFidgetBtn = document.getElementById("asmrFidgetBtn");

    // Modal elements
    this.breathingModal = document.getElementById("breathingModal");
    this.closeBreathingBtn = document.getElementById("closeBreathingBtn");
    this.startBreathingModalBtn = document.getElementById(
      "startBreathingModalBtn"
    );
    this.stopBreathingBtn = document.getElementById("stopBreathingBtn");
    this.breathingCircle = document.getElementById("breathingCircle");
    this.breathingText = document.getElementById("breathingText");

    // Settings
    this.settingsBtn = document.getElementById("settingsBtn");
  }

  setupEventListeners() {
    // Feature navigation listeners
    this.featureBtns?.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const featureId = e.currentTarget.dataset.feature;
        this.switchToFeature(featureId);
      });
    });

    // Screen Time listeners
    this.timeLimitInput?.addEventListener("change", (e) =>
      this.handleTimeLimitChange(e)
    );
    this.timeLimitInput?.addEventListener("blur", (e) =>
      this.handleTimeLimitChange(e)
    );
    this.takeBreakBtn?.addEventListener("click", () => this.handleTakeBreak());
    this.resetScreenTimeBtn?.addEventListener("click", () =>
      this.resetScreenTimeData()
    );

    // Focus listeners
    this.setFocusBtn?.addEventListener("click", () => this.handleSetFocus());
    this.resetFocusBtn?.addEventListener("click", () =>
      this.handleResetFocus()
    );
    this.toggleHistoryBtn?.addEventListener("click", () =>
      this.toggleDeviationHistory()
    );

    // Task listeners
    this.getBreakdownBtn?.addEventListener("click", () =>
      this.handleGetBreakdown()
    );

    // Calendar listeners
    this.createRemindersBtn?.addEventListener("click", () =>
      this.handleCreateReminders()
    );
    this.toggleConfigBtn?.addEventListener("click", () =>
      this.toggleCalendarConfig()
    );
    this.saveConfigBtn?.addEventListener("click", () =>
      this.handleSaveCalendarConfig()
    );
    this.testConnectionBtn?.addEventListener("click", () =>
      this.handleTestConnection()
    );
    this.clearConfigBtn?.addEventListener("click", () =>
      this.handleClearCalendarConfig()
    );
    this.prioritySelect?.addEventListener("change", () =>
      this.updatePriorityInfo()
    );
    this.copyRemindersBtn?.addEventListener("click", () =>
      this.handleCopyReminders()
    );
    this.hideManualBtn?.addEventListener("click", () =>
      this.hideManualReminderFallback()
    );

    // Wellness listeners
    this.startBreathingBtn?.addEventListener("click", () =>
      this.showBreathingModal()
    );
    this.whiteNoiseToggleBtn?.addEventListener("click", () =>
      this.handleWhiteNoiseToggle()
    );
    this.volumeSlider?.addEventListener("input", (e) =>
      this.handleVolumeChange(e.target.value)
    );
    this.nextSoundBtn?.addEventListener("click", () => this.handleNextSound());

    // External page listeners
    this.focusAnxietyBtn?.addEventListener("click", () =>
      this.openExternalPage("focus-anxiety")
    );
    this.asmrFidgetBtn?.addEventListener("click", () =>
      this.openExternalPage("asmr-fidget")
    );

    // Modal listeners
    this.closeBreathingBtn?.addEventListener("click", () =>
      this.hideBreathingModal()
    );
    this.startBreathingModalBtn?.addEventListener("click", () =>
      this.startBreathingExercise()
    );
    this.stopBreathingBtn?.addEventListener("click", () =>
      this.stopBreathingExercise()
    );

    // Settings listener
    this.settingsBtn?.addEventListener("click", () => this.handleSettings());

    // Modal backdrop click
    this.breathingModal?.addEventListener("click", (e) => {
      if (e.target === this.breathingModal) {
        this.hideBreathingModal();
      }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => this.handleKeydown(e));
  }

  /**
   * Switch to a specific feature
   */
  switchToFeature(featureId) {
    // Update feature buttons
    this.featureBtns?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.feature === featureId);
    });

    // Update feature panels with animation
    this.featurePanels?.forEach((panel) => {
      if (
        panel.classList.contains("active") &&
        panel.id !== `${featureId}Panel`
      ) {
        // Fade out current panel
        panel.classList.add("switching-out");
        setTimeout(() => {
          panel.classList.remove("active", "switching-out");
        }, 100);
      }
    });

    // Show new panel or home
    setTimeout(() => {
      let targetPanel;
      if (featureId) {
        targetPanel = document.getElementById(`${featureId}Panel`);
      } else {
        targetPanel = this.homePanel;
      }

      if (targetPanel) {
        targetPanel.classList.add("active");
        this.currentFeature = featureId || "home";

        // Initialize components when switching to their features
        this.initializeFeatureContent(featureId);
      }
    }, 100);

    // Save current feature preference
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local
        .set({ currentFeature: featureId || "home" })
        .catch(console.warn);
    }
  }

  /**
   * Initialize content when switching to specific features
   */
  initializeFeatureContent(featureId) {
    switch (featureId) {
      case "pomodoro":
        if (!this.pomodoroTimer && typeof PomodoroTimer !== "undefined") {
          this.setupPomodoroTimer();
        }
        break;
      case "task-breakdown":
        if (!this.taskManager && typeof TaskManager !== "undefined") {
          this.setupTaskManager();
        }
        break;
      case "breathing":
        if (
          !this.breathingExercise &&
          typeof BreathingExercise !== "undefined"
        ) {
          this.setupBreathingExercise();
        }
        break;
    }
  }

  /**
   * Setup Pomodoro timer component (lazy loaded)
   */
  setupPomodoroTimer() {
    if (this.pomodoroTimer) return; // Already initialized

    try {
      if (typeof PomodoroTimer !== "undefined") {
        this.pomodoroTimer = new PomodoroTimer("pomodoroContainer");
        console.log("Pomodoro timer initialized successfully");

        // Update home stats when Pomodoro stats change
        if (this.pomodoroTimer.pomodoroService) {
          this.pomodoroTimer.pomodoroService.addEventListener((event, data) => {
            if (event === "sessionCompleted" || event === "sessionStarted") {
              setTimeout(() => this.updateHomeStats(), 100);
            }
          });
        }
      } else {
        console.warn("PomodoroTimer class not available");
      }
    } catch (error) {
      console.error("Failed to initialize Pomodoro timer:", error);
    }
  }

  /**
   * Setup task manager component
   */
  setupTaskManager() {
    if (this.taskManager) return;

    try {
      if (typeof TaskManager !== "undefined") {
        this.taskManager = new TaskManager();
        console.log("Task manager initialized successfully");
      } else {
        console.warn("TaskManager class not available");
      }
    } catch (error) {
      console.error("Failed to initialize task manager:", error);
    }
  }

  /**
   * Setup breathing exercise component
   */
  setupBreathingExercise() {
    if (this.breathingExercise) return;

    try {
      if (typeof BreathingExercise !== "undefined") {
        this.breathingExercise = new BreathingExercise();
        console.log("Breathing exercise initialized successfully");
      } else {
        console.warn("BreathingExercise class not available");
      }
    } catch (error) {
      console.error("Failed to initialize breathing exercise:", error);
    }
  }

  async loadInitialData() {
    try {
      // Load screen time settings
      await this.loadScreenTimeSettings();

      // Load focus tab information and session data
      await this.loadFocusTrackingData();

      // Load audio settings
      await this.loadAudioSettings();

      // Load calendar configuration and check connection
      await this.loadCalendarConfiguration();

      // Load current tab stats
      await this.updateCurrentTimeDisplay();
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  }

  updateUI() {
    // Update current time display
    this.updateCurrentTimeDisplay();

    // Update home panel stats
    this.updateHomeStats();

    // Set up periodic updates
    setInterval(() => {
      this.updateCurrentTimeDisplay();
      this.updateHomeStats();
    }, 1000);

    // Set up periodic focus tracking updates (every 5 seconds)
    setInterval(() => {
      this.loadFocusSessionStats();
    }, 5000);
  }

  /**
   * Update home panel statistics
   */
  async updateHomeStats() {
    try {
      // Update screen time
      if (this.todayScreenTime && this.currentTimeEl) {
        this.todayScreenTime.textContent = this.currentTimeEl.textContent;
      }

      // Update Pomodoro stats
      if (this.todayPomodoros && this.pomodoroTimer) {
        const todayStats = await this.pomodoroTimer.getTodayStats();
        if (todayStats) {
          this.todayPomodoros.textContent = todayStats.workSessions || 0;
        }
      }
    } catch (error) {
      console.warn("Failed to update home stats:", error);
    }
  }

  /**
   * Load saved feature preference
   */
  async loadSavedFeature() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        const result = await chrome.storage.local.get("currentFeature");
        const savedFeature = result.currentFeature || "home";
        if (savedFeature !== "home") {
          this.switchToFeature(savedFeature);
        }
      }
    } catch (error) {
      console.warn("Failed to load saved feature:", error);
    }
  }

  // Placeholder methods for existing functionality
  async handleTimeLimitChange(event) {
    // Implementation from original popup.js
    console.log("Time limit change:", event.target.value);
  }

  async handleTakeBreak() {
    // Implementation from original popup.js
    console.log("Take break clicked");
  }

  async resetScreenTimeData() {
    // Implementation from original popup.js
    console.log("Reset screen time data");
  }

  async handleSetFocus() {
    // Implementation from original popup.js
    console.log("Set focus clicked");
  }

  async handleResetFocus() {
    // Implementation from original popup.js
    console.log("Reset focus clicked");
  }

  toggleDeviationHistory() {
    // Implementation from original popup.js
    console.log("Toggle deviation history");
  }

  async handleGetBreakdown() {
    // Implementation from original popup.js
    console.log("Get breakdown clicked");
  }

  async handleCreateReminders() {
    // Implementation from original popup.js
    console.log("Create reminders clicked");
  }

  toggleCalendarConfig() {
    // Implementation from original popup.js
    console.log("Toggle calendar config");
  }

  async handleSaveCalendarConfig() {
    // Implementation from original popup.js
    console.log("Save calendar config");
  }

  async handleTestConnection() {
    // Implementation from original popup.js
    console.log("Test connection clicked");
  }

  async handleClearCalendarConfig() {
    // Implementation from original popup.js
    console.log("Clear calendar config");
  }

  updatePriorityInfo() {
    // Implementation from original popup.js
    console.log("Update priority info");
  }

  async handleCopyReminders() {
    // Implementation from original popup.js
    console.log("Copy reminders clicked");
  }

  hideManualReminderFallback() {
    // Implementation from original popup.js
    console.log("Hide manual reminder fallback");
  }

  showBreathingModal() {
    if (this.breathingModal) {
      this.breathingModal.style.display = "flex";
    }
  }

  hideBreathingModal() {
    if (this.breathingModal) {
      this.breathingModal.style.display = "none";
    }
  }

  startBreathingExercise() {
    console.log("Start breathing exercise");
  }

  stopBreathingExercise() {
    console.log("Stop breathing exercise");
  }

  async handleWhiteNoiseToggle() {
    // Implementation from original popup.js
    console.log("White noise toggle");
  }

  handleVolumeChange(value) {
    // Implementation from original popup.js
    console.log("Volume change:", value);
  }

  handleNextSound() {
    // Implementation from original popup.js
    console.log("Next sound clicked");
  }

  openExternalPage(page) {
    // Implementation from original popup.js
    console.log("Open external page:", page);
  }

  handleSettings() {
    // Implementation from original popup.js
    console.log("Settings clicked");
  }

  handleKeydown(e) {
    // Implementation from original popup.js
    console.log("Key pressed:", e.key);
  }

  async loadScreenTimeSettings() {
    // Implementation from original popup.js
    console.log("Load screen time settings");
  }

  async loadFocusTrackingData() {
    // Implementation from original popup.js
    console.log("Load focus tracking data");
  }

  async loadAudioSettings() {
    // Implementation from original popup.js
    console.log("Load audio settings");
  }

  async loadCalendarConfiguration() {
    // Implementation from original popup.js
    console.log("Load calendar configuration");
  }

  async updateCurrentTimeDisplay() {
    // Implementation from original popup.js
    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = "0m"; // Placeholder
    }
  }

  async loadFocusSessionStats() {
    // Implementation from original popup.js
    console.log("Load focus session stats");
  }
}

// Initialize the popup manager
const popupManager = new PopupManager();
