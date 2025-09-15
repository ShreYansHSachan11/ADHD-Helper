// Popup JavaScript - Main initialization and event handling

class PopupManager {
  constructor() {
    this.isInitialized = false;
    this.currentBreathingSession = null;
    this.whiteNoiseActive = false;
    this.simpleAudioManager = null;
    this.taskManager = null;
    this.pomodoroTimer = null;
    this.breathingExercise = null;
    this.errorHandler = null;
    this.lazyLoader = null;
    this.performanceMonitor = {
      initStartTime: performance.now(),
      componentsLoadTime: new Map(),
    };

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

      // Initialize lazy loader for performance optimization
      try {
        // LazyLoader should be available globally since it's loaded as a script
        if (typeof LazyLoader !== "undefined") {
          this.lazyLoader = new LazyLoader();
        } else {
          console.warn("LazyLoader not available");
          this.lazyLoader = null;
        }
      } catch (error) {
        console.warn("Failed to initialize lazy loader:", error);
        // Continue without lazy loader
        this.lazyLoader = null;
      }

      // Initialize UI elements
      this.initializeElements();

      // Initialize break timer manager and components
      await this.initializeBreakTimer();

      // Initialize break settings UI
      await this.initializeBreakSettings();

      // Performance optimization: Lazy load heavy components
      await this.initializeComponentsLazily();

      // Preload critical components in background
      if (this.lazyLoader) {
        this.lazyLoader.preloadCriticalComponents().catch((error) => {
          console.warn("Failed to preload critical components:", error);
        });
      }

      // Set up event listeners
      this.setupEventListeners();

      // Load initial data with error handling
      await this.loadInitialDataWithErrorHandling();

      // Update UI with current state
      this.updateUI();

      // Load saved feature preference (updated for grid interface)
      await this.loadSavedTab();

      this.isInitialized = true;

      // Log performance metrics
      const totalInitTime =
        performance.now() - this.performanceMonitor.initStartTime;
      console.log(
        `Popup initialized successfully (${totalInitTime.toFixed(2)}ms)`
      );

      // Show success feedback
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          "Extension loaded successfully!",
          "success",
          { duration: 2000 }
        );
      }
    } catch (error) {
      console.error("Failed to initialize popup:", error);

      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(error, "Popup Init");
      } else {
        this.showError(
          "Failed to initialize extension. Please try refreshing."
        );
      }
    }
  }

  /**
   * Performance optimization: Initialize components lazily
   */
  async initializeComponentsLazily() {
    // Initialize task manager lazily (only when needed)
    this.setupLazyTaskManager();

    // Initialize breathing exercise lazily (only when accessed)
    this.setupLazyBreathingExercise();

    // Pomodoro timer will be initialized when its tab is accessed

    // Setup lazy loading for external pages
    this.setupLazyExternalPages();
  }

  /**
   * Setup lazy loading for task manager
   */
  setupLazyTaskManager() {
    const taskSection = document.querySelector(".task-section");

    if (taskSection && this.lazyLoader) {
      this.lazyLoader.registerLazyElement(taskSection, "task-manager");

      // Load on first interaction
      const taskInput = document.getElementById("taskInput");
      const taskButton = document.getElementById("getBreakdownBtn");

      const loadTaskManager = async () => {
        if (!this.taskManager) {
          const startTime = performance.now();

          try {
            const result = await this.lazyLoader.loadComponent("task-manager");

            if (result.success) {
              this.taskManager = result.component;

              const loadTime = performance.now() - startTime;
              this.performanceMonitor.componentsLoadTime.set(
                "task-manager",
                loadTime
              );

              console.log(
                `Task manager loaded lazily (${loadTime.toFixed(2)}ms)`
              );
            }
          } catch (error) {
            console.error("Failed to lazy load task manager:", error);

            // Fallback: Initialize synchronously
            try {
              this.taskManager = new TaskManager();
            } catch (fallbackError) {
              console.error(
                "Fallback task manager init failed:",
                fallbackError
              );
            }
          }
        }
      };

      taskInput?.addEventListener("focus", loadTaskManager, { once: true });
      taskButton?.addEventListener("click", loadTaskManager, { once: true });
    } else {
      // Fallback: Initialize synchronously
      try {
        this.taskManager = new TaskManager();
      } catch (error) {
        console.error("Failed to initialize task manager:", error);
      }
    }
  }

  /**
   * Setup API settings UI for task breakdown feature
   */
  setupApiSettingsUI() {
    try {
      const apiSettingsContainer = document.getElementById(
        "apiSettingsContainer"
      );
      if (apiSettingsContainer && typeof ApiSettingsUI !== "undefined") {
        this.apiSettingsUI = new ApiSettingsUI("apiSettingsContainer");
        console.log("API settings UI initialized successfully");
      } else {
        console.warn("ApiSettingsUI not available or container not found");
      }
    } catch (error) {
      console.error("Failed to initialize API settings UI:", error);
    }

    // Initialize distraction reminder settings
    try {
      if (typeof DistractionReminderSettings !== "undefined") {
        this.distractionReminderSettings = new DistractionReminderSettings();
        console.log("Distraction reminder settings initialized successfully");
      } else {
        console.warn("DistractionReminderSettings not available");
      }
    } catch (error) {
      console.error(
        "Failed to initialize distraction reminder settings:",
        error
      );
    }
  }

  /**
   * Setup Pomodoro timer component
   */
  setupPomodoroTimer() {
    if (this.pomodoroTimer) return; // Already initialized

    try {
      if (typeof PomodoroTimer !== "undefined") {
        this.pomodoroTimer = new PomodoroTimer("pomodoroContainer");
        console.log("Pomodoro timer initialized successfully");

        // Update overview when Pomodoro stats change
        if (this.pomodoroTimer.pomodoroService) {
          this.pomodoroTimer.pomodoroService.addEventListener((event, data) => {
            if (event === "sessionCompleted" || event === "sessionStarted") {
              setTimeout(() => this.updateOverviewPanel(), 100);
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
   * Setup lazy loading for breathing exercise
   */
  setupLazyBreathingExercise() {
    const breathingSection = document.querySelector(".breathing-section");

    if (breathingSection && this.lazyLoader) {
      this.lazyLoader.registerLazyElement(
        breathingSection,
        "breathing-exercise"
      );

      // Load on first interaction
      const breathingButton = document.getElementById("startBreathingBtn");

      const loadBreathingExercise = async () => {
        if (!this.breathingExercise) {
          const startTime = performance.now();

          try {
            const result = await this.lazyLoader.loadComponent(
              "breathing-exercise"
            );

            if (result.success) {
              this.breathingExercise = result.component;

              const loadTime = performance.now() - startTime;
              this.performanceMonitor.componentsLoadTime.set(
                "breathing-exercise",
                loadTime
              );

              console.log(
                `Breathing exercise loaded lazily (${loadTime.toFixed(2)}ms)`
              );
            }
          } catch (error) {
            console.error("Failed to lazy load breathing exercise:", error);

            // Fallback: Initialize synchronously
            try {
              this.breathingExercise = new BreathingExercise();
            } catch (fallbackError) {
              console.error(
                "Fallback breathing exercise init failed:",
                fallbackError
              );
            }
          }
        }
      };

      breathingButton?.addEventListener("click", loadBreathingExercise, {
        once: true,
      });
    } else {
      // Fallback: Initialize synchronously
      try {
        this.breathingExercise = new BreathingExercise();
      } catch (error) {
        console.error("Failed to initialize breathing exercise:", error);
      }
    }
  }

  /**
   * Setup lazy loading for external pages
   */
  setupLazyExternalPages() {
    if (!this.lazyLoader) return;

    const focusAnxietyBtn = document.getElementById("wellnessToolsBtn");
    const asmrFidgetBtn = document.getElementById("asmrToysBtn");

    // Preload external pages on hover (anticipatory loading)
    focusAnxietyBtn?.addEventListener(
      "mouseenter",
      () => {
        this.lazyLoader
          .loadComponent("external-page-focus-anxiety")
          .catch((error) => {
            console.warn("Failed to preload focus-anxiety page:", error);
          });
      },
      { once: true }
    );

    asmrFidgetBtn?.addEventListener(
      "mouseenter",
      () => {
        this.lazyLoader
          .loadComponent("external-page-asmr-fidget")
          .catch((error) => {
            console.warn("Failed to preload asmr-fidget page:", error);
          });
      },
      { once: true }
    );
  }

  initializeElements() {
    // Feature navigation elements (updated for grid interface)
    this.featureBtns = document.querySelectorAll(".feature-btn");
    this.featurePanels = document.querySelectorAll(".feature-panel");
    this.homePanel = document.getElementById("homePanel");

    // Home panel elements
    this.todayScreenTime = document.getElementById("todayScreenTime");
    this.todayPomodoros = document.getElementById("todayPomodoros");

    // Screen Time elements
    this.currentTimeEl = document.getElementById("currentTime");
    this.timeLimitInput = document.getElementById("timeLimitInput");
    // takeBreakBtn removed - handled by BreakControlsUI component
    this.resetScreenTimeBtn = document.getElementById("resetScreenTimeBtn");

    // Break status elements
    this.breakStatus = document.getElementById("breakStatus");
    this.workControls = document.getElementById("workControls");
    this.breakType = document.getElementById("breakType");
    this.breakTimeRemaining = document.getElementById("breakTimeRemaining");
    this.endBreakBtn = document.getElementById("endBreakBtn");

    // Break type modal elements
    this.breakTypeModal = document.getElementById("breakTypeModal");
    this.closeBreakTypeBtn = document.getElementById("closeBreakTypeBtn");
    this.breakTypeButtons = document.querySelectorAll(".break-type-btn");

    // Break timer manager instance
    this.breakTimerManager = null;
    this.breakUpdateInterval = null;
    this.breakAnalyticsDisplay = null;
    this.breakSettingsUI = null;

    // Focus elements
    this.focusUrlEl = document.getElementById("focusUrl");
    this.setFocusBtn = document.getElementById("setFocusBtn");
    this.resetFocusBtn = document.getElementById("resetFocusBtn");
    this.distractionSettingsBtn = document.getElementById(
      "distractionSettingsBtn"
    );
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

    // Task elements (managed by TaskManager component)
    // Task management is now handled by the TaskManager component

    // Calendar elements
    this.prioritySelect = document.getElementById("prioritySelect");
    this.createRemindersBtn = document.getElementById("createRemindersBtn");
    this.calendarStatus = document.getElementById("calendarStatus");

    // Calendar configuration elements
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

    // Calendar reminder form elements
    this.reminderTaskInput = document.getElementById("reminderTaskInput");
    this.reminderDeadlineInput = document.getElementById(
      "reminderDeadlineInput"
    );
    this.priorityInfo = document.getElementById("priorityInfo");

    // Manual reminder fallback elements
    this.manualReminderFallback = document.getElementById(
      "manualReminderFallback"
    );
    this.manualReminderList = document.getElementById("manualReminderList");
    this.copyRemindersBtn = document.getElementById("copyRemindersBtn");
    this.hideManualBtn = document.getElementById("hideManualBtn");

    // Wellness elements
    this.breathingBtn = document.getElementById("breathingBtn");
    this.whiteNoiseBtn = document.getElementById("whiteNoiseToggleBtn");
    this.audioControls = document.getElementById("audioControls");
    this.volumeSlider = document.getElementById("volumeSlider");
    this.volumeValue = document.getElementById("volumeValue");
    this.nextSoundBtn = document.getElementById("nextSoundBtn");
    this.currentSoundName = document.getElementById("currentSoundName");

    // External page elements
    this.focusAnxietyBtn = document.getElementById("wellnessToolsBtn");
    this.asmrFidgetBtn = document.getElementById("asmrToysBtn");

    console.log("External page elements bound:", {
      focusAnxietyBtn: !!this.focusAnxietyBtn,
      asmrFidgetBtn: !!this.asmrFidgetBtn,
    });

    // Modal elements
    this.breathingModal = document.getElementById("breathingModal");
    this.closeBreathingBtn = document.getElementById("closeBreathingBtn");
    this.startBreathingBtn = document.getElementById("startBreathingBtn");
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
    // Feature navigation listeners (updated for grid interface)
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
    // takeBreakBtn event listener removed - handled by BreakControlsUI component
    this.resetScreenTimeBtn?.addEventListener("click", () =>
      this.resetScreenTimeData()
    );

    // Break control event listeners
    this.endBreakBtn?.addEventListener("click", () => this.handleEndBreak());
    this.closeBreakTypeBtn?.addEventListener("click", () =>
      this.closeBreakTypeModal()
    );

    // Break type selection event listeners
    this.breakTypeButtons?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const breakType = btn.dataset.breakType;
        const duration = parseInt(btn.dataset.duration);
        this.handleBreakTypeSelection(breakType, duration);
      });
    });

    // Focus listeners
    this.setFocusBtn?.addEventListener("click", () => this.handleSetFocus());
    this.resetFocusBtn?.addEventListener("click", () =>
      this.handleResetFocus()
    );
    this.distractionSettingsBtn?.addEventListener("click", () =>
      this.toggleDistractionSettings()
    );

    // Test distraction reminder button
    const testDistractionBtn = document.getElementById("testDistractionBtn");
    testDistractionBtn?.addEventListener("click", () =>
      this.testDistractionReminder()
    );
    this.toggleHistoryBtn?.addEventListener("click", () =>
      this.toggleDeviationHistory()
    );

    // Task listeners (handled by TaskManager component)
    // Task management event listeners are now handled by the TaskManager component

    // Calendar listeners
    this.createRemindersBtn?.addEventListener("click", () =>
      this.handleCreateReminders()
    );

    // Calendar configuration listeners
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

    // Priority selection listener for info update
    this.prioritySelect?.addEventListener("change", () =>
      this.updatePriorityInfo()
    );

    // Manual reminder fallback listeners
    this.copyRemindersBtn?.addEventListener("click", () =>
      this.handleCopyReminders()
    );
    this.hideManualBtn?.addEventListener("click", () =>
      this.hideManualReminderFallback()
    );

    // Wellness listeners
    this.breathingBtn?.addEventListener("click", () =>
      this.showBreathingModal()
    );
    this.whiteNoiseBtn?.addEventListener("click", () =>
      this.handleWhiteNoiseToggle()
    );
    const whiteNoiseBtn3 = document.getElementById("whiteNoiseBtn");
    const whiteNoisePanel = document.getElementById("whiteNoisePanel");

    if (whiteNoiseBtn3 && whiteNoisePanel) {
      whiteNoiseBtn3.addEventListener("click", () => {
        whiteNoisePanel.style.display =
          whiteNoisePanel.style.display === "none" ||
          whiteNoisePanel.style.display === ""
            ? "block"
            : "none";
      });
    }

    this.volumeSlider?.addEventListener("input", (e) =>
      this.handleVolumeChange(e.target.value)
    );

    this.nextSoundBtn?.addEventListener("click", () => this.handleNextSound());

    // External page listeners
    if (this.focusAnxietyBtn) {
      this.focusAnxietyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Focus & Anxiety button clicked");
        this.openExternalPage("focus-anxiety");
      });
      console.log("Focus & Anxiety button listener attached");
    } else {
      console.error("Focus & Anxiety button not found");
    }

    if (this.asmrFidgetBtn) {
      this.asmrFidgetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("ASMR & Fidget button clicked");
        this.openExternalPage("asmr-fidget");
      });
      console.log("ASMR & Fidget button listener attached");
    } else {
      console.error("ASMR & Fidget button not found");
    }

    // Modal listeners
    this.closeBreathingBtn?.addEventListener("click", () =>
      this.hideBreathingModal()
    );
    this.startBreathingBtn?.addEventListener("click", () =>
      this.startBreathingExercise()
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

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => this.cleanup());
  }

  /**
   * Cleanup resources when popup is closed
   */
  cleanup() {
    try {
      if (this.breakUpdateInterval) {
        clearInterval(this.breakUpdateInterval);
        this.breakUpdateInterval = null;
      }

      if (this.breakControlsUI) {
        this.breakControlsUI.destroy();
        this.breakControlsUI = null;
      }

      if (this.breakAnalyticsDisplay) {
        this.breakAnalyticsDisplay.destroy();
        this.breakAnalyticsDisplay = null;
      }

      if (this.breakSettingsUI) {
        this.breakSettingsUI.destroy();
        this.breakSettingsUI = null;
      }

      if (this.apiSettingsUI) {
        this.apiSettingsUI.destroy();
        this.apiSettingsUI = null;
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Show error message to user
   */
  showError(message) {
    try {
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(message, "error", {
          duration: 4000,
        });
      } else {
        console.error("Error:", message);
        // Fallback: show alert if no error handler
        alert(message);
      }
    } catch (error) {
      console.error("Error showing error message:", error);
    }
  }

  async loadInitialDataWithErrorHandling() {
    const loadingTasks = [
      { name: "Screen Time Settings", fn: () => this.loadScreenTimeSettings() },
      { name: "Focus Tracking Data", fn: () => this.loadFocusTrackingData() },
      { name: "Audio Settings", fn: () => this.loadAudioSettings() },
      {
        name: "Calendar Configuration",
        fn: () => this.loadCalendarConfiguration(),
      },
      { name: "Current Tab Stats", fn: () => this.updateCurrentTimeDisplay() },
    ];

    // Show loading indicator
    const loadingId = this.showLoadingState("Loading extension data...");

    try {
      const results = await Promise.allSettled(
        loadingTasks.map(async (task, index) => {
          try {
            // Update progress
            this.updateLoadingProgress(
              loadingId,
              (index / loadingTasks.length) * 100,
              `Loading ${task.name}...`
            );

            await task.fn();
            return { success: true, task: task.name };
          } catch (error) {
            console.error(`Failed to load ${task.name}:`, error);
            if (this.errorHandler) {
              this.errorHandler.handleExtensionError(
                error,
                `Load ${task.name}`
              );
            }
            return { success: false, task: task.name, error };
          }
        })
      );

      // Complete progress
      this.updateLoadingProgress(loadingId, 100, "Loading complete");

      // Check for any failures
      const failures = results.filter(
        (result) => result.status === "rejected" || !result.value.success
      );

      if (failures.length > 0) {
        console.warn(`${failures.length} data loading tasks failed`);

        if (this.errorHandler && failures.length < loadingTasks.length) {
          this.errorHandler.showUserFeedback(
            `Extension loaded with limited functionality (${failures.length} features unavailable)`,
            "warning",
            { duration: 4000 }
          );
        }
      }
    } finally {
      // Hide loading indicator
      setTimeout(() => {
        this.hideLoadingState(loadingId);
      }, 500);
    }
  }

  /**
   * Show loading state with progress indicator
   */
  showLoadingState(message) {
    const loadingId = `loading-${Date.now()}`;

    const loadingEl = document.createElement("div");
    loadingEl.id = loadingId;
    loadingEl.className = "loading-overlay";
    loadingEl.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">0%</div>
        </div>
      </div>
    `;

    document.body.appendChild(loadingEl);

    // Animate in
    setTimeout(() => {
      loadingEl.classList.add("visible");
    }, 10);

    return loadingId;
  }

  /**
   * Update loading progress
   */
  updateLoadingProgress(loadingId, percentage, message) {
    const loadingEl = document.getElementById(loadingId);
    if (!loadingEl) return;

    const progressFill = loadingEl.querySelector(".progress-fill");
    const progressText = loadingEl.querySelector(".progress-text");
    const messageEl = loadingEl.querySelector(".loading-message");

    if (progressFill) {
      progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }

    if (progressText) {
      progressText.textContent = `${Math.round(percentage)}%`;
    }

    if (messageEl && message) {
      messageEl.textContent = message;
    }
  }

  /**
   * Hide loading state
   */
  hideLoadingState(loadingId) {
    const loadingEl = document.getElementById(loadingId);
    if (!loadingEl) return;

    loadingEl.classList.add("hiding");

    setTimeout(() => {
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
    }, 300);
  }

  async loadAudioSettings() {
    try {
      // Initialize simple audio manager
      this.initSimpleAudioManager();

      // Set defaults
      this.whiteNoiseActive = false;
      this.updateWhiteNoiseButton();

      console.log("Audio settings loaded with simple audio manager");
    } catch (error) {
      console.error("Failed to load audio settings:", error);
      // Set defaults
      this.whiteNoiseActive = false;
      this.updateWhiteNoiseButton();
      throw error;
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
      throw error;
    }
  }

  updateUI() {
    // Update current time display
    this.updateCurrentTimeDisplay();

    // Update overview panel
    this.updateOverviewPanel();

    // Set up periodic updates
    setInterval(() => {
      this.updateCurrentTimeDisplay();
      this.updateOverviewPanel();
    }, 1000);

    // Set up periodic focus tracking updates (every 5 seconds for basic updates)
    // Real-time updates will be handled separately when focus is active
    setInterval(() => {
      if (!this.focusUpdateInterval) {
        this.loadFocusSessionStats();
        this.checkCurrentTabValidity(); // Also check tab validity periodically
      }
    }, 5000);
  }

  /**
   * Switch to a specific feature (updated for grid interface)
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
          this.setupLazyTaskManager();
        }
        // Initialize API settings UI for task breakdown
        if (!this.apiSettingsUI && typeof ApiSettingsUI !== "undefined") {
          this.setupApiSettingsUI();
        }
        break;
      case "breathing":
        if (
          !this.breathingExercise &&
          typeof BreathingExercise !== "undefined"
        ) {
          this.setupLazyBreathingExercise();
        }
        break;
      case "white-noise":
        // Initialize audio manager if needed
        this.initSimpleAudioManager();
        break;
    }
  }

  /**
   * Update overview panel with current stats
   */
  async updateOverviewPanel() {
    try {
      // Update screen time overview
      if (this.overviewCurrentTime && this.currentTimeEl) {
        this.overviewCurrentTime.textContent = this.currentTimeEl.textContent;
      }

      // Update focus status overview
      if (this.overviewFocusStatusDot && this.overviewFocusStatusText) {
        const focusStatusDot = document.getElementById("focusStatusDot");
        const focusStatusText = document.getElementById("focusStatusText");

        if (focusStatusDot && focusStatusText) {
          this.overviewFocusStatusDot.className = focusStatusDot.className;
          this.overviewFocusStatusText.textContent =
            focusStatusText.textContent;
        }
      }

      // Update Pomodoro overview
      if (this.overviewPomodoroSessions && this.pomodoroTimer) {
        const todayStats = await this.pomodoroTimer.getTodayStats();
        if (todayStats) {
          this.overviewPomodoroSessions.textContent =
            todayStats.workSessions || 0;
        }
      }
    } catch (error) {
      console.warn("Failed to update overview panel:", error);
    }
  }

  /**
   * Load saved tab preference
   */
  async loadSavedTab() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        const result = await chrome.storage.local.get("currentTab");
        const savedTab = result.currentTab || "overview";
        this.switchToFeature(savedTab);
      }
    } catch (error) {
      console.warn("Failed to load saved tab:", error);
      this.switchToFeature("break-reminder");
    }
  }

  /**
   * Initialize break timer manager and related components
   */
  async initializeBreakTimer() {
    try {
      // Initialize break controls UI if container exists
      const controlsContainer = document.getElementById(
        "breakControlsContainer"
      );
      if (controlsContainer && typeof BreakControlsUI !== "undefined") {
        this.breakControlsUI = new BreakControlsUI("breakControlsContainer");
        console.log("Break controls UI initialized successfully");
      } else {
        console.warn("BreakControlsUI not available or container not found");
      }

      // Initialize break analytics display
      await this.initializeBreakAnalytics();
    } catch (error) {
      console.error("Failed to initialize break timer components:", error);
    }
  }

  /**
   * Initialize break analytics display component
   */
  async initializeBreakAnalytics() {
    try {
      // Check if container exists, create if missing
      let analyticsContainer = document.getElementById("breakAnalyticsContainer");
      if (!analyticsContainer) {
        const breakPanel = document.getElementById("break-reminderPanel");
        if (breakPanel) {
          const panelContent = breakPanel.querySelector(".panel-content");
          if (panelContent) {
            analyticsContainer = document.createElement("div");
            analyticsContainer.id = "breakAnalyticsContainer";
            analyticsContainer.className = "break-analytics";
            panelContent.appendChild(analyticsContainer);
          }
        }
      }

      if (analyticsContainer && typeof BreakAnalyticsDisplay !== "undefined") {
        this.breakAnalyticsDisplay = new BreakAnalyticsDisplay(
          "breakAnalyticsContainer"
        );
        console.log("Break analytics display initialized successfully");
      } else {
        console.warn("BreakAnalyticsDisplay not available or container missing");
      }
    } catch (error) {
      console.error("Failed to initialize break analytics display:", error);
    }
  }



  /**
   * Initialize break settings UI component
   */
  async initializeBreakSettings() {
    try {
      if (typeof BreakSettingsUI !== "undefined") {
        this.breakSettingsUI = new BreakSettingsUI("breakSettingsContainer");

        // Listen for settings changes
        document.addEventListener("breakSettingsChanged", (event) => {
          this.handleBreakSettingsChanged(event.detail);
        });

        console.log("Break settings UI initialized successfully");
      } else {
        console.warn("BreakSettingsUI not available");
      }
    } catch (error) {
      console.error("Failed to initialize break settings UI:", error);
    }
  }

  /**
   * Start periodic updates for break controls UI
   */
  startBreakControlsUpdates() {
    // Update immediately
    this.updateBreakControlsUI();

    // Update every second
    this.breakUpdateInterval = setInterval(() => {
      this.updateBreakControlsUI();
    }, 1000);
  }

  /**
   * Update break controls UI based on current timer status
   */
  async updateBreakControlsUI() {
    try {
      // Get break timer status from background script
      const response = await chrome.runtime.sendMessage({
        type: "GET_BREAK_TIMER_STATUS",
      });

      if (!response || !response.success) {
        console.warn("Failed to get break timer status");
        return;
      }

      const status = response.data;
      if (!status) return;

      // Update work timer display
      const workTimeMinutes = Math.floor(status.currentWorkTime / (1000 * 60));
      const workTimeSeconds = Math.floor(
        (status.currentWorkTime % (1000 * 60)) / 1000
      );
      const workTimeDisplay = `${workTimeMinutes}m ${workTimeSeconds}s`;

      if (this.currentTimeEl) {
        this.currentTimeEl.textContent = workTimeDisplay;

        // Add visual indicators based on work time
        this.currentTimeEl.classList.remove("time-warning", "time-danger");
        if (status.isThresholdExceeded) {
          this.currentTimeEl.classList.add("time-danger");
        } else if (workTimeMinutes >= 20) {
          this.currentTimeEl.classList.add("time-warning");
        }
      }

      // Update break status display
      if (status.isOnBreak) {
        this.showBreakStatus(status);
      } else {
        this.showWorkControls(status);
      }

      // Update work time threshold input
      if (this.timeLimitInput && status.workTimeThreshold) {
        const thresholdMinutes = Math.floor(
          status.workTimeThreshold / (1000 * 60)
        );
        if (parseInt(this.timeLimitInput.value) !== thresholdMinutes) {
          this.timeLimitInput.value = thresholdMinutes;
        }
      }
    } catch (error) {
      console.error("Error updating break controls UI:", error);
    }
  }

  /**
   * Show break status when user is on break
   */
  showBreakStatus(status) {
    try {
      if (this.breakStatus && this.workControls) {
        this.breakStatus.style.display = "block";
        this.workControls.style.display = "none";

        // Update break type display
        if (this.breakType && status.breakType) {
          const breakTypeLabels = {
            short: "Short Break",
            medium: "Medium Break",
            long: "Long Break",
          };
          this.breakType.textContent =
            breakTypeLabels[status.breakType] || status.breakType;
        }

        // Update remaining time display
        if (this.breakTimeRemaining) {
          const remainingMs = status.remainingBreakTime;
          const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
          const remainingSeconds = Math.floor(
            (remainingMs % (1000 * 60)) / 1000
          );
          this.breakTimeRemaining.textContent = `${remainingMinutes}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;
        }

        // Enable end break button
        if (this.endBreakBtn) {
          this.endBreakBtn.disabled = false;
        }
      }
    } catch (error) {
      console.error("Error showing break status:", error);
    }
  }

  /**
   * Show work controls when user is working
   */
  showWorkControls(status) {
    try {
      if (this.breakStatus && this.workControls) {
        this.breakStatus.style.display = "none";
        this.workControls.style.display = "block";

        // Button state management is now handled by BreakControlsUI component
      }
    } catch (error) {
      console.error("Error showing work controls:", error);
    }
  }

  /**
   * Handle take break button click
   */
  async handleTakeBreak() {
    try {
      if (!this.breakTimerManager) {
        console.error("Break timer manager not available");
        return;
      }

      // Show break type selection modal
      this.showBreakTypeModal();
    } catch (error) {
      console.error("Error handling take break:", error);
      this.showError("Failed to start break. Please try again.");
    }
  }

  /**
   * Show break type selection modal
   */
  showBreakTypeModal() {
    try {
      if (this.breakTypeModal) {
        this.breakTypeModal.style.display = "flex";

        // Focus first break type button for accessibility
        const firstButton =
          this.breakTypeModal.querySelector(".break-type-btn");
        if (firstButton) {
          firstButton.focus();
        }
      }
    } catch (error) {
      console.error("Error showing break type modal:", error);
    }
  }

  /**
   * Close break type selection modal
   */
  closeBreakTypeModal() {
    try {
      if (this.breakTypeModal) {
        this.breakTypeModal.style.display = "none";
      }
    } catch (error) {
      console.error("Error closing break type modal:", error);
    }
  }

  /**
   * Handle break type selection
   */
  async handleBreakTypeSelection(breakType, duration) {
    try {
      // Close modal first
      this.closeBreakTypeModal();

      // Start the selected break via background script
      const response = await chrome.runtime.sendMessage({
        type: "START_BREAK",
        breakType: breakType,
        durationMinutes: duration,
      });

      if (response && response.success) {
        console.log(`Started ${breakType} break for ${duration} minutes`);

        // Update UI immediately
        await this.updateBreakControlsUI();

        // Show success message
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(
            `${
              breakType.charAt(0).toUpperCase() + breakType.slice(1)
            } break started! Enjoy your ${duration}-minute break.`,
            "success",
            { duration: 3000 }
          );
        }
      } else {
        console.error("Failed to start break:", response?.error);
        this.showError("Failed to start break. Please try again.");
      }
    } catch (error) {
      console.error("Error handling break type selection:", error);
      this.showError("Failed to start break. Please try again.");
    }
  }

  /**
   * Handle end break button click
   */
  async handleEndBreak() {
    try {
      // End the break via background script
      const response = await chrome.runtime.sendMessage({
        type: "END_BREAK",
      });

      if (response && response.success) {
        console.log("Break ended successfully");

        // Update UI immediately
        await this.updateBreakControlsUI();

        // Show success message
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(
            "Break ended. Work timer has been reset.",
            "success",
            { duration: 2000 }
          );
        }
      } else {
        console.error("Failed to end break:", response?.error);
        this.showError("Failed to end break. Please try again.");
      }
    } catch (error) {
      console.error("Error handling end break:", error);
      this.showError("Failed to end break. Please try again.");
    }
  }

  /**
   * Clean all analytics data
   */
  async cleanAnalyticsData() {
    try {
      if (!confirm("Are you sure you want to clean all break analytics data? This action cannot be undone.")) {
        return;
      }

      console.log("Cleaning analytics data...");
      
      const response = await chrome.runtime.sendMessage({
        type: "CLEAN_ANALYTICS_DATA",
      });

      if (response && response.success) {
        console.log("Analytics data cleaned successfully");
        
        // Show success message
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(
            "All break analytics data has been cleaned successfully.",
            "success",
            { duration: 3000 }
          );
        } else {
          alert("All break analytics data has been cleaned successfully.");
        }
        
        // Refresh analytics display if it exists
        if (this.breakAnalyticsDisplay && typeof this.breakAnalyticsDisplay.refreshData === 'function') {
          await this.breakAnalyticsDisplay.refreshData();
        }
      } else {
        console.error("Failed to clean analytics data:", response?.error);
        const errorMsg = "Failed to clean analytics data: " + (response?.error || "Unknown error");
        
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(errorMsg, "error", { duration: 5000 });
        } else {
          alert(errorMsg);
        }
      }
    } catch (error) {
      console.error("Error cleaning analytics data:", error);
      const errorMsg = "Error cleaning analytics data: " + error.message;
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(errorMsg, "error", { duration: 5000 });
      } else {
        alert(errorMsg);
      }
    }
  }

  /**
   * Handle break settings changes
   */
  async handleBreakSettingsChanged(newSettings) {
    try {
      console.log("Break settings changed:", newSettings);

      // Update work time threshold via background script
      if (newSettings.workTimeThresholdMinutes) {
        const response = await chrome.runtime.sendMessage({
          type: "UPDATE_WORK_TIME_THRESHOLD",
          minutes: newSettings.workTimeThresholdMinutes,
        });

        if (response && response.success) {
          // Update the time limit input in the UI to reflect the new setting
          if (this.timeLimitInput) {
            this.timeLimitInput.value = newSettings.workTimeThresholdMinutes;
          }
        } else {
          console.error(
            "Failed to update work time threshold:",
            response?.error
          );
        }
      }

      // Show feedback to user
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          "Break reminder settings updated successfully!",
          "success",
          { duration: 2000 }
        );
      }
    } catch (error) {
      console.error("Error handling break settings change:", error);
      this.showError("Failed to apply new settings. Please try again.");
    }
  }

  // Screen Time Methods
  async handleTimeLimitChange(event) {
    const newLimit = parseInt(event.target.value);
    if (newLimit >= 5 && newLimit <= 180) {
      try {
        // Update work time threshold via background script
        const response = await chrome.runtime.sendMessage({
          type: "UPDATE_WORK_TIME_THRESHOLD",
          minutes: newLimit,
        });

        if (response && response.success) {
          console.log("Work time threshold updated:", newLimit);

          // Also update legacy screen time settings for compatibility
          const settings =
            (await chrome.storage.local.get("screenTimeSettings")) || {};
          const currentSettings = settings.screenTimeSettings || {
            limitMinutes: 30,
            enabled: true,
            notificationsEnabled: true,
          };

          currentSettings.limitMinutes = newLimit;
          await chrome.storage.local.set({
            screenTimeSettings: currentSettings,
          });

          this.showScreenTimeStatus(
            "Time limit updated successfully!",
            "success"
          );
        } else {
          console.error(
            "Failed to update work time threshold:",
            response?.error
          );
          this.showScreenTimeStatus("Failed to save time limit", "error");
        }
      } catch (error) {
        console.error("Failed to save time limit:", error);
        this.showScreenTimeStatus("Failed to save time limit", "error");
      }
    } else {
      this.showScreenTimeStatus(
        "Time limit must be between 5 and 180 minutes",
        "error"
      );
      // Reset input to previous valid value
      await this.loadScreenTimeSettings();
    }
  }

  async handleTakeBreak() {
    try {
      // Show break type selection modal
      this.showBreakTypeModal();
    } catch (error) {
      console.error("Failed to show break type modal:", error);
      this.showScreenTimeStatus("Failed to show break options", "error");
    }
  }

  showBreakTypeModal() {
    if (this.breakTypeModal) {
      this.breakTypeModal.style.display = "flex";
    }
  }

  closeBreakTypeModal() {
    if (this.breakTypeModal) {
      this.breakTypeModal.style.display = "none";
    }
  }

  async handleBreakTypeSelection(breakType, duration) {
    try {
      this.closeBreakTypeModal();

      // Start the selected break
      const response = await chrome.runtime.sendMessage({
        type: "START_BREAK",
        breakType: breakType,
        durationMinutes: duration,
      });

      if (response && response.success) {
        this.showScreenTimeStatus(`${breakType} break started!`, "success");
        // Update break status display
        await this.updateBreakStatus();
      } else {
        this.showScreenTimeStatus("Failed to start break", "error");
      }
    } catch (error) {
      console.error("Failed to start break:", error);
      this.showScreenTimeStatus("Failed to start break", "error");
    }
  }

  async handleEndBreak() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "CANCEL_BREAK",
      });

      if (response && response.success) {
        this.showScreenTimeStatus("Break ended early", "success");
        // Update break status display
        await this.updateBreakStatus();
      } else {
        this.showScreenTimeStatus("Failed to end break", "error");
      }
    } catch (error) {
      console.error("Failed to end break:", error);
      this.showScreenTimeStatus("Failed to end break", "error");
    }
  }

  async updateCurrentTimeDisplay() {
    try {
      // Try to get integrated timer status first (break timer + tab tracking)
      const integratedResponse = await chrome.runtime.sendMessage({
        type: "GET_INTEGRATED_TIMER_STATUS",
      });

      if (
        integratedResponse &&
        integratedResponse.success &&
        integratedResponse.data
      ) {
        const integratedData = integratedResponse.data;

        // Use break timer data if available, otherwise fall back to tab stats
        if (
          integratedData.breakTimer &&
          integratedData.breakTimer.currentWorkTime !== undefined
        ) {
          const workTimeMinutes = Math.floor(
            integratedData.breakTimer.currentWorkTime / (1000 * 60)
          );
          this.updateCurrentTime(workTimeMinutes);

          // Update break controls UI is handled separately
          return;
        }
      }

      // Fallback to legacy tab stats
      const response = await chrome.runtime.sendMessage({
        type: "GET_TAB_STATS",
      });

      if (response && response.success && response.data) {
        const stats = response.data;
        // Show current session time in minutes
        const sessionMinutes = Math.floor(
          stats.currentSessionTime / (1000 * 60)
        );
        this.updateCurrentTime(sessionMinutes);

        // Update break reminder count if available
        if (stats.breakRemindersShown > 0) {
          this.updateBreakReminderCount(stats.breakRemindersShown);
        } else {
          this.updateBreakReminderCount(0);
        }
      } else {
        // Fallback to 0 if no data available
        this.updateCurrentTime(0);
        this.updateBreakReminderCount(0);
      }
    } catch (error) {
      console.error("Failed to get current time:", error);
      this.updateCurrentTime(0);
      this.updateBreakReminderCount(0);
    }
  }

  updateCurrentTime(minutes) {
    if (this.currentTimeEl) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (hours > 0) {
        this.currentTimeEl.textContent = `${hours}h ${remainingMinutes}m`;
      } else {
        this.currentTimeEl.textContent = `${minutes}m`;
      }

      // Add visual indicator if approaching limit
      this.updateTimeIndicator(minutes);
    }
  }

  async updateTimeIndicator(currentMinutes) {
    try {
      const settings = await chrome.storage.local.get("screenTimeSettings");
      const screenTimeSettings = settings.screenTimeSettings || {
        limitMinutes: 30,
      };
      const limit = screenTimeSettings.limitMinutes;

      // Remove existing classes
      this.currentTimeEl.classList.remove("time-warning", "time-danger");

      // Add warning/danger classes based on time spent
      const percentage = (currentMinutes / limit) * 100;
      if (percentage >= 90) {
        this.currentTimeEl.classList.add("time-danger");
      } else if (percentage >= 75) {
        this.currentTimeEl.classList.add("time-warning");
      }
    } catch (error) {
      console.error("Failed to update time indicator:", error);
    }
  }

  updateBreakReminderCount(count) {
    // Add or update break reminder count display
    let reminderCountEl = document.getElementById("breakReminderCount");
    if (!reminderCountEl) {
      reminderCountEl = document.createElement("span");
      reminderCountEl.id = "breakReminderCount";
      reminderCountEl.className = "reminder-count";
      this.currentTimeEl.parentNode.appendChild(reminderCountEl);
    }

    if (count > 0) {
      reminderCountEl.textContent = `(${count} reminder${
        count > 1 ? "s" : ""
      })`;
      reminderCountEl.style.display = "inline";
    } else {
      reminderCountEl.style.display = "none";
    }
  }

  async loadScreenTimeSettings() {
    try {
      const result = await chrome.storage.local.get("screenTimeSettings");
      const settings = result.screenTimeSettings || {
        limitMinutes: 30,
        enabled: true,
        notificationsEnabled: true,
      };

      // Update UI elements
      if (this.timeLimitInput) {
        this.timeLimitInput.value = settings.limitMinutes;
      }

      // Update enabled state if we have toggle controls
      this.updateScreenTimeToggleState(settings.enabled);

      return settings;
    } catch (error) {
      console.error("Failed to load screen time settings:", error);
      return { limitMinutes: 30, enabled: true, notificationsEnabled: true };
    }
  }

  updateScreenTimeToggleState(enabled) {
    // Update any toggle controls for screen time monitoring
    const screenTimeSection = document.querySelector(".screen-time-section");
    if (screenTimeSection) {
      if (enabled) {
        screenTimeSection.classList.remove("disabled");
      } else {
        screenTimeSection.classList.add("disabled");
      }
    }
  }

  showScreenTimeStatus(message, type) {
    // Create or update status display
    let statusEl = document.getElementById("screenTimeStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "screenTimeStatus";
      statusEl.className = "screen-time-status";

      // Insert after the time limit control
      const timeLimitControl = document.querySelector(".time-limit-control");
      if (timeLimitControl) {
        timeLimitControl.parentNode.insertBefore(
          statusEl,
          timeLimitControl.nextSibling
        );
      }
    }

    statusEl.textContent = message;
    statusEl.className = `screen-time-status ${type}`;
    statusEl.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  }

  async resetScreenTimeData() {
    try {
      // Clear tab history and reset current session
      const response = await chrome.runtime.sendMessage({
        type: "CLEAR_TAB_HISTORY",
      });

      if (response && response.success) {
        // Reset current time display
        this.updateCurrentTime(0);
        this.updateBreakReminderCount(0);
        this.showScreenTimeStatus(
          "Screen time data reset successfully!",
          "success"
        );
      } else {
        this.showScreenTimeStatus("Failed to reset screen time data", "error");
      }
    } catch (error) {
      console.error("Failed to reset screen time data:", error);
      this.showScreenTimeStatus("Failed to reset screen time data", "error");
    }
  }

  // Focus Methods
  async loadFocusTrackingData() {
    try {
      // Get focus tab information
      const focusResponse = await chrome.runtime.sendMessage({
        type: "GET_FOCUS_INFO",
      });

      if (focusResponse && focusResponse.success && focusResponse.data) {
        const focusInfo = focusResponse.data;
        this.updateFocusDisplay(focusInfo);
      }

      // Check current tab validity
      await this.checkCurrentTabValidity();

      // Get focus session statistics
      await this.loadFocusSessionStats();

      // Get focus deviation history
      await this.loadFocusDeviationHistory();
    } catch (error) {
      console.error("Failed to load focus tracking data:", error);
    }
  }

  async loadFocusSessionStats() {
    try {
      const sessionResponse = await chrome.runtime.sendMessage({
        type: "GET_FOCUS_SESSION_STATS",
      });

      if (sessionResponse && sessionResponse.success && sessionResponse.data) {
        this.updateFocusSessionInfo(sessionResponse.data);
      }
    } catch (error) {
      console.error("Failed to load focus session stats:", error);
    }
  }

  async loadFocusDeviationHistory() {
    try {
      const historyResponse = await chrome.runtime.sendMessage({
        type: "GET_FOCUS_DEVIATION_HISTORY",
      });

      if (historyResponse && historyResponse.success && historyResponse.data) {
        this.updateDeviationHistory(historyResponse.data);
      }
    } catch (error) {
      console.error("Failed to load focus deviation history:", error);
    }
  }

  updateFocusDisplay(focusInfo) {
    if (focusInfo.isSet && focusInfo.url) {
      this.focusUrlEl.textContent = this.formatUrl(focusInfo.url);
      this.updateFocusStatus("active");
      this.focusSessionInfo.style.display = "block";
      this.focusDeviationHistory.style.display = "block";

      // Show the enhanced visualization
      const visualization = document.getElementById(
        "focusSessionVisualization"
      );
      if (visualization) {
        visualization.style.display = "block";
        this.startRealTimeUpdates();
      }
    } else {
      this.focusUrlEl.textContent = "Not set";
      this.updateFocusStatus("inactive");
      this.focusSessionInfo.style.display = "none";
      this.focusDeviationHistory.style.display = "none";

      // Hide the enhanced visualization
      const visualization = document.getElementById(
        "focusSessionVisualization"
      );
      if (visualization) {
        visualization.style.display = "none";
        this.stopRealTimeUpdates();
      }
    }
  }

  updateFocusStatus(status) {
    // Remove existing status classes
    this.focusStatusDot.classList.remove("active", "deviation", "inactive");

    // Update status indicator
    const stateIndicator = document.getElementById("focusStateIndicator");
    const stateIcon = document.getElementById("stateIcon");
    const stateText = document.getElementById("stateText");

    switch (status) {
      case "active":
        this.focusStatusDot.classList.add("active");
        this.focusStatusText.textContent = "🟢 Active";
        if (stateIndicator) {
          stateIndicator.className = "focus-state-indicator active";
          if (stateIcon) stateIcon.textContent = "🎯";
          if (stateText) stateText.textContent = "On Focus";
        }
        break;
      case "deviation":
        this.focusStatusDot.classList.add("deviation");
        this.focusStatusText.textContent = "🟡 Off Focus";
        if (stateIndicator) {
          stateIndicator.className = "focus-state-indicator deviation";
          if (stateIcon) stateIcon.textContent = "⚠️";
          if (stateText) stateText.textContent = "Distracted";
        }
        break;
      case "inactive":
      default:
        this.focusStatusDot.classList.add("inactive");
        this.focusStatusText.textContent = "⚫ Not Active";
        if (stateIndicator) {
          stateIndicator.className = "focus-state-indicator";
          if (stateIcon) stateIcon.textContent = "⏸️";
          if (stateText) stateText.textContent = "Inactive";
        }
        break;
    }
  }

  updateFocusSessionInfo(sessionData) {
    // Update session time
    const sessionMinutes = Math.floor(sessionData.sessionTime / (1000 * 60));
    const hours = Math.floor(sessionMinutes / 60);
    const minutes = sessionMinutes % 60;

    const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    if (this.focusSessionTime) {
      this.focusSessionTime.textContent = timeText;
    }

    // Update deviation count
    if (this.focusDeviationCount) {
      this.focusDeviationCount.textContent = sessionData.deviationCount || 0;
    }

    // Update last reminder time
    if (this.lastFocusReminder) {
      if (sessionData.lastReminderTime) {
        const timeSince = Date.now() - sessionData.lastReminderTime;
        const minutesSince = Math.floor(timeSince / (1000 * 60));

        if (minutesSince < 1) {
          this.lastFocusReminder.textContent = "Just now";
        } else if (minutesSince < 60) {
          this.lastFocusReminder.textContent = `${minutesSince}m ago`;
        } else {
          const hoursSince = Math.floor(minutesSince / 60);
          this.lastFocusReminder.textContent = `${hoursSince}h ago`;
        }
      } else {
        this.lastFocusReminder.textContent = "Never";
      }
    }

    // Update enhanced visualization elements
    this.updateVisualizationMetrics(sessionData, timeText);

    // Update status based on current state
    if (sessionData.isCurrentlyOnFocus) {
      this.updateFocusStatus("active");
    } else if (sessionData.deviationCount > 0) {
      this.updateFocusStatus("deviation");
    }
  }

  updateVisualizationMetrics(sessionData, timeText) {
    // Update progress ring
    const progressTime = document.getElementById("progressTime");
    const progressRingFill = document.getElementById("progressRingFill");

    if (progressTime) {
      progressTime.textContent = timeText;
    }

    // Calculate progress angle (assuming 60 minutes = full circle)
    const sessionMinutes = Math.floor(sessionData.sessionTime / (1000 * 60));
    const progressAngle = Math.min((sessionMinutes / 60) * 360, 360);

    if (progressRingFill) {
      progressRingFill.style.setProperty(
        "--progress-angle",
        `${progressAngle}deg`
      );
    }

    // Update metric cards
    const sessionTimeMetric = document.getElementById("sessionTimeMetric");
    const deviationMetric = document.getElementById("deviationMetric");
    const focusScoreMetric = document.getElementById("focusScoreMetric");

    if (sessionTimeMetric) {
      sessionTimeMetric.textContent = timeText;
    }

    if (deviationMetric) {
      deviationMetric.textContent = sessionData.deviationCount || 0;
    }

    if (focusScoreMetric) {
      // Calculate focus score based on deviations vs time
      const deviations = sessionData.deviationCount || 0;
      const focusScore =
        sessionMinutes > 0 ? Math.max(0, 100 - deviations * 10) : 100;
      focusScoreMetric.textContent = `${focusScore}%`;

      // Add color coding
      if (focusScore >= 80) {
        focusScoreMetric.style.color = "var(--md-sys-color-primary)";
      } else if (focusScore >= 60) {
        focusScoreMetric.style.color = "#ff8c42";
      } else {
        focusScoreMetric.style.color = "#ff6b35";
      }
    }
  }

  updateDeviationHistory(historyData) {
    if (
      !historyData ||
      !historyData.deviations ||
      historyData.deviations.length === 0
    ) {
      this.toggleHistoryBtn.style.display = "none";
      return;
    }

    this.toggleHistoryBtn.style.display = "block";

    // Clear existing deviation items with fade out animation
    const existingItems =
      this.deviationList.querySelectorAll(".deviation-item");
    existingItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.opacity = "0";
        item.style.transform = "translateX(-20px)";
        setTimeout(() => item.remove(), 200);
      }, index * 50);
    });

    // Add recent deviations (limit to 5 most recent) with staggered animation
    const recentDeviations = historyData.deviations.slice(-5).reverse();

    setTimeout(() => {
      recentDeviations.forEach((deviation, index) => {
        const deviationItem = document.createElement("div");
        deviationItem.className = "deviation-item";

        // Start with hidden state for animation
        deviationItem.style.opacity = "0";
        deviationItem.style.transform = "translateX(20px)";

        const fromDomain = this.formatUrl(deviation.fromUrl);
        const toDomain = this.formatUrl(deviation.toUrl);
        const timeAgo = this.formatTimeAgo(deviation.timestamp);

        deviationItem.innerHTML = `
          <div class="deviation-from" title="${deviation.fromUrl}">${fromDomain}</div>
          <span class="deviation-arrow">→</span>
          <div class="deviation-to" title="${deviation.toUrl}">${toDomain}</div>
          <div class="deviation-time">${timeAgo}</div>
        `;

        this.deviationList.appendChild(deviationItem);

        // Animate in with stagger
        setTimeout(() => {
          deviationItem.style.transition =
            "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
          deviationItem.style.opacity = "1";
          deviationItem.style.transform = "translateX(0)";
        }, index * 100);

        // Add click interaction for detailed view
        deviationItem.addEventListener("click", () => {
          this.showDeviationDetails(deviation);
        });
      });
    }, existingItems.length * 50 + 100);
  }

  showDeviationDetails(deviation) {
    // Create a temporary tooltip or modal for deviation details
    const tooltip = document.createElement("div");
    tooltip.className = "deviation-tooltip";
    tooltip.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--md-sys-color-surface);
      border: 2px solid var(--md-sys-color-primary);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      max-width: 300px;
      opacity: 0;
      transition: all 0.3s ease;
    `;

    const date = new Date(deviation.timestamp);
    tooltip.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: var(--md-sys-color-primary);">
        Focus Deviation Details
      </div>
      <div style="margin-bottom: 8px;">
        <strong>From:</strong> ${deviation.fromUrl}
      </div>
      <div style="margin-bottom: 8px;">
        <strong>To:</strong> ${deviation.toUrl}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Time:</strong> ${date.toLocaleString()}
      </div>
      <button id="closeTooltip" style="
        background: var(--md-sys-color-primary);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        width: 100%;
      ">Close</button>
    `;

    document.body.appendChild(tooltip);

    // Animate in
    setTimeout(() => {
      tooltip.style.opacity = "1";
    }, 10);

    // Close functionality
    const closeBtn = tooltip.querySelector("#closeTooltip");
    const closeTooltip = () => {
      tooltip.style.opacity = "0";
      setTimeout(() => tooltip.remove(), 300);
    };

    closeBtn.addEventListener("click", closeTooltip);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener("click", function outsideClick(e) {
        if (!tooltip.contains(e.target)) {
          closeTooltip();
          document.removeEventListener("click", outsideClick);
        }
      });
    }, 100);

    // Auto close after 5 seconds
    setTimeout(closeTooltip, 5000);
  }

  /**
   * Check if a URL is restricted (browser pages, extensions, etc.)
   */
  isRestrictedTab(url) {
    return (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:") ||
      url.startsWith("moz-extension://") ||
      url === "about:blank" ||
      url.startsWith("file://")
    );
  }

  /**
   * Check if current tab is valid for focus tracking
   */
  async checkCurrentTabValidity() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTabInfo = document.getElementById("currentTabInfo");
      const setFocusBtn = document.getElementById("setFocusBtn");

      if (tabs.length > 0 && currentTabInfo && setFocusBtn) {
        const currentTab = tabs[0];
        const isRestricted = this.isRestrictedTab(currentTab.url);

        if (isRestricted) {
          currentTabInfo.style.display = "block";
          setFocusBtn.disabled = true;
          setFocusBtn.style.opacity = "0.5";
          setFocusBtn.title = "Cannot set focus on browser pages";
        } else {
          currentTabInfo.style.display = "none";
          setFocusBtn.disabled = false;
          setFocusBtn.style.opacity = "1";
          setFocusBtn.title = "Set current tab as focus";
        }
      }
    } catch (error) {
      console.error("Error checking current tab validity:", error);
    }
  }

  toggleDistractionSettings() {
    if (this.distractionReminderSettings) {
      const container = document.getElementById(
        "distraction-reminder-settings"
      );
      const isVisible = container && container.style.display !== "none";

      if (isVisible) {
        // Hide settings
        container.style.display = "none";
        this.distractionSettingsBtn.textContent = "⚙️ Reminder Settings";
      } else {
        // Show settings
        if (container) {
          container.style.display = "block";
          this.distractionSettingsBtn.textContent = "❌ Hide Settings";
        }
      }
    }
  }

  async testDistractionReminder() {
    try {
      console.log("Testing distraction reminder...");

      // Direct test of distraction reminder service
      const response = await chrome.runtime.sendMessage({
        type: "TEST_DISTRACTION_REMINDER",
      });

      if (response?.success) {
        const message =
          response.message ||
          "Test notifications sent! Check for immediate notification and another in 10 seconds.";
        this.showFocusStatus(message, "success");
      } else {
        this.showFocusStatus(
          "Failed to send test reminder: " +
            (response?.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("Error testing distraction reminder:", error);
      this.showFocusStatus("Error testing reminder: " + error.message, "error");
    }
  }

  toggleDeviationHistory() {
    const isVisible = this.deviationList.style.display !== "none";

    if (isVisible) {
      // Animate out
      this.deviationList.style.opacity = "0";
      this.deviationList.style.transform = "translateY(-10px)";
      this.deviationList.style.maxHeight = "0";

      setTimeout(() => {
        this.deviationList.style.display = "none";
        this.toggleHistoryBtn.innerHTML = "📊 Show History";
      }, 300);
    } else {
      // Animate in
      this.deviationList.style.display = "block";
      this.deviationList.style.opacity = "0";
      this.deviationList.style.transform = "translateY(-10px)";
      this.deviationList.style.maxHeight = "0";

      setTimeout(() => {
        this.deviationList.style.transition =
          "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        this.deviationList.style.opacity = "1";
        this.deviationList.style.transform = "translateY(0)";
        this.deviationList.style.maxHeight = "200px";
        this.toggleHistoryBtn.innerHTML = "📊 Hide History";
      }, 10);
    }
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) {
      return "now";
    } else if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    }
  }

  async handleSetFocus() {
    try {
      // First check if current tab is valid
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        if (this.isRestrictedTab(currentTab.url)) {
          this.showFocusStatus(
            "Cannot set focus on browser pages. Please navigate to a regular website first.",
            "error"
          );
          return;
        }
      }

      const response = await chrome.runtime.sendMessage({
        type: "SET_FOCUS_TAB",
      });

      if (response && response.success) {
        // Reload focus tracking data to update UI
        await this.loadFocusTrackingData();

        // Reset distraction reminder session for new focus tab
        try {
          await chrome.runtime.sendMessage({
            type: "RESET_DISTRACTION_REMINDER_SESSION",
          });
        } catch (error) {
          console.warn("Failed to reset distraction reminder session:", error);
        }

        this.showFocusStatus("Focus tab set successfully!", "success");
      } else {
        // Show specific error message if available
        const errorMessage = response?.error || "Failed to set focus tab";
        this.showFocusStatus(errorMessage, "error");
      }
    } catch (error) {
      console.error("Failed to set focus tab:", error);
      // Show user-friendly error message
      let errorMessage = "Failed to set focus tab";
      if (error.message && error.message.includes("restricted")) {
        errorMessage =
          "Cannot set focus on browser pages. Please navigate to a regular website first.";
      }
      this.showFocusStatus(errorMessage, "error");
    }
  }

  async handleResetFocus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "RESET_FOCUS_TAB",
      });

      if (response && response.success) {
        // Update UI immediately
        this.focusUrlEl.textContent = "Not set";
        this.updateFocusStatus("inactive");
        this.focusSessionInfo.style.display = "none";
        this.focusDeviationHistory.style.display = "none";

        // Hide enhanced visualization
        const visualization = document.getElementById(
          "focusSessionVisualization"
        );
        if (visualization) {
          visualization.style.display = "none";
          this.stopRealTimeUpdates();
        }

        // Reset distraction reminder session
        try {
          await chrome.runtime.sendMessage({
            type: "RESET_DISTRACTION_REMINDER_SESSION",
          });
        } catch (error) {
          console.warn("Failed to reset distraction reminder session:", error);
        }

        this.showFocusStatus("Focus tracking reset", "success");
      } else {
        this.showFocusStatus("Failed to reset focus tab", "error");
      }
    } catch (error) {
      console.error("Failed to reset focus tab:", error);
      this.showFocusStatus("Failed to reset focus tab", "error");
    }
  }

  startRealTimeUpdates() {
    // Clear any existing interval
    if (this.focusUpdateInterval) {
      clearInterval(this.focusUpdateInterval);
    }

    // Start real-time updates every 2 seconds for smooth animations
    this.focusUpdateInterval = setInterval(() => {
      this.loadFocusSessionStats();
    }, 2000);

    console.log("Started real-time focus tracking updates");
  }

  stopRealTimeUpdates() {
    if (this.focusUpdateInterval) {
      clearInterval(this.focusUpdateInterval);
      this.focusUpdateInterval = null;
      console.log("Stopped real-time focus tracking updates");
    }
  }

  // Cleanup function for when popup is closed
  cleanup() {
    this.stopRealTimeUpdates();

    // Remove any temporary tooltips
    const tooltips = document.querySelectorAll(".deviation-tooltip");
    tooltips.forEach((tooltip) => tooltip.remove());
  }

  showFocusStatus(message, type) {
    // Create or update status display
    let statusEl = document.getElementById("focusStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "focusStatus";
      statusEl.className = "focus-status";

      // Insert after the focus controls
      const focusControls = document.querySelector(".focus-controls");
      if (focusControls) {
        focusControls.parentNode.insertBefore(
          statusEl,
          focusControls.nextSibling
        );
      }
    }

    statusEl.textContent = message;
    statusEl.className = `focus-status ${type}`;
    statusEl.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  }

  // Task Methods (now handled by TaskManager component)
  // Task management methods are now handled by the TaskManager component

  // Calendar Methods
  async loadCalendarConfiguration() {
    try {
      // Initialize calendar service if not already done
      if (!this.calendarService) {
        this.calendarService = new CalendarService();
      }

      // Load stored credentials
      await this.calendarService.loadStoredCredentials();

      // Update connection status
      this.updateCalendarConnectionStatus();

      // Show/hide configuration panel based on connection status
      if (!this.calendarService.isAuthenticated) {
        this.calendarConfig.style.display = "block";
      }

      // Update priority info
      this.updatePriorityInfo();
    } catch (error) {
      console.error("Failed to load calendar configuration:", error);
      this.updateCalendarConnectionStatus(false, "Configuration Error");
    }
  }

  updateCalendarConnectionStatus(connected = null, statusText = null) {
    const isConnected =
      connected !== null
        ? connected
        : this.calendarService && this.calendarService.isAuthenticated;

    // Update connection indicator
    this.connectionDot.classList.remove("connected", "testing");
    if (isConnected) {
      this.connectionDot.classList.add("connected");
      this.connectionText.textContent = statusText || "Connected";
    } else {
      this.connectionText.textContent = statusText || "Not Connected";
    }
  }

  toggleCalendarConfig() {
    const isVisible = this.configContent.style.display === "block";

    if (isVisible) {
      this.configContent.style.display = "none";
      this.toggleConfigBtn.textContent = "Show Setup";
    } else {
      this.configContent.style.display = "block";
      this.toggleConfigBtn.textContent = "Hide Setup";
    }
  }

  async handleSaveCalendarConfig() {
    const apiKey = this.apiKeyInput.value.trim();
    const accessToken = this.accessTokenInput.value.trim();

    if (!apiKey || !accessToken) {
      this.showCalendarStatus(
        "Please enter both API key and access token",
        "error"
      );
      return;
    }

    this.setButtonLoading(this.saveConfigBtn, true);

    try {
      // Initialize calendar service if not already done
      if (!this.calendarService) {
        this.calendarService = new CalendarService();
      }

      // Store credentials
      const success = await this.calendarService.storeCredentials(
        apiKey,
        accessToken
      );

      if (success) {
        this.showCalendarStatus("Configuration saved successfully!", "success");
        this.updateCalendarConnectionStatus(true, "Configured");

        // Clear input fields for security
        this.apiKeyInput.value = "";
        this.accessTokenInput.value = "";

        // Hide config panel
        this.configContent.style.display = "none";
        this.toggleConfigBtn.textContent = "Show Setup";
      } else {
        this.showCalendarStatus("Failed to save configuration", "error");
      }
    } catch (error) {
      console.error("Failed to save calendar configuration:", error);
      this.showCalendarStatus("Failed to save configuration", "error");
    } finally {
      this.setButtonLoading(this.saveConfigBtn, false);
    }
  }

  async handleTestConnection() {
    if (!this.calendarService || !this.calendarService.isAuthenticated) {
      this.showCalendarStatus(
        "Please configure API credentials first",
        "warning"
      );
      return;
    }

    this.setButtonLoading(this.testConnectionBtn, true);
    this.connectionDot.classList.add("testing");
    this.connectionText.textContent = "Testing...";

    try {
      const result = await this.calendarService.testConnection();

      if (result.success) {
        this.updateCalendarConnectionStatus(
          true,
          `Connected to ${result.calendarName}`
        );
        this.showCalendarStatus("Connection test successful!", "success");
      } else {
        this.updateCalendarConnectionStatus(false, "Connection Failed");
        this.showCalendarStatus(`Connection failed: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      this.updateCalendarConnectionStatus(false, "Test Failed");
      this.showCalendarStatus("Connection test failed", "error");
    } finally {
      this.setButtonLoading(this.testConnectionBtn, false);
      this.connectionDot.classList.remove("testing");
    }
  }

  async handleClearCalendarConfig() {
    if (confirm("Are you sure you want to clear the calendar configuration?")) {
      try {
        if (this.calendarService) {
          await this.calendarService.clearCredentials();
        }

        // Clear input fields
        this.apiKeyInput.value = "";
        this.accessTokenInput.value = "";

        // Update status
        this.updateCalendarConnectionStatus(false, "Not Connected");
        this.showCalendarStatus("Configuration cleared", "success");

        // Show config panel
        this.calendarConfig.style.display = "block";
      } catch (error) {
        console.error("Failed to clear calendar configuration:", error);
        this.showCalendarStatus("Failed to clear configuration", "error");
      }
    }
  }

  updatePriorityInfo() {
    const priority = this.prioritySelect.value;
    const infoTexts = {
      high: "High Priority: Reminders at 1 week, 3 days, 1 day, and 2 hours before deadline",
      medium:
        "Medium Priority: Reminders at 3 days, 1 day, and 4 hours before deadline",
      low: "Low Priority: Reminders at 1 week, 2 days, and 8 hours before deadline",
    };

    if (this.priorityInfo) {
      this.priorityInfo.innerHTML = `<small>${
        infoTexts[priority] || infoTexts.medium
      }</small>`;
    }
  }

  async handleCreateReminders() {
    // Get task name from reminder input or task manager
    let taskName = this.reminderTaskInput.value.trim();
    let deadline = this.reminderDeadlineInput.value;

    // If no task name in reminder input, try to get from task manager
    if (!taskName && this.taskManager && this.taskManager.taskNameInput) {
      taskName = this.taskManager.taskNameInput.value.trim();
    }

    // If no deadline in reminder input, try to get from task manager
    if (!deadline && this.taskManager && this.taskManager.taskDeadlineInput) {
      deadline = this.taskManager.taskDeadlineInput.value;
    }

    const priority = this.prioritySelect.value;

    if (!taskName || !deadline) {
      this.showCalendarStatus("Please enter task name and deadline", "error");
      return;
    }

    // Check if calendar is configured
    if (!this.calendarService || !this.calendarService.isAuthenticated) {
      this.showManualReminderFallback(taskName, deadline, priority);
      return;
    }

    this.setButtonLoading(this.createRemindersBtn, true);
    this.showCalendarStatus("Creating calendar reminders...", "loading");

    try {
      const deadlineDate = new Date(deadline);
      const result = await this.calendarService.createTaskReminders(
        taskName,
        deadlineDate,
        priority
      );

      if (result.success) {
        this.showCalendarStatus(
          `Successfully created ${result.createdCount} of ${result.totalRequested} reminders!`,
          "success"
        );

        // Clear the reminder form
        this.reminderTaskInput.value = "";
        this.reminderDeadlineInput.value = "";
      } else {
        this.showCalendarStatus("Failed to create reminders", "error");
        this.showManualReminderFallback(taskName, deadline, priority);
      }
    } catch (error) {
      console.error("Failed to create reminders:", error);
      this.showCalendarStatus(
        `Failed to create reminders: ${error.message}`,
        "error"
      );
      this.showManualReminderFallback(taskName, deadline, priority);
    } finally {
      this.setButtonLoading(this.createRemindersBtn, false);
    }
  }

  showManualReminderFallback(taskName, deadline, priority) {
    // Calculate reminder times manually
    const deadlineDate = new Date(deadline);
    const reminderTimes = this.calculateManualReminderTimes(
      deadlineDate,
      priority
    );

    // Clear existing manual reminders
    this.manualReminderList.innerHTML = "";

    // Add reminder items
    reminderTimes.forEach((reminder, index) => {
      const reminderItem = document.createElement("div");
      reminderItem.className = "manual-reminder-item";

      reminderItem.innerHTML = `
        <div>
          <div class="reminder-time">${reminder.time}</div>
          <div class="reminder-description">${reminder.description}</div>
        </div>
      `;

      this.manualReminderList.appendChild(reminderItem);
    });

    // Show fallback panel
    this.manualReminderFallback.style.display = "block";
    this.showCalendarStatus(
      "Calendar integration unavailable. Manual reminders shown below.",
      "warning"
    );
  }

  calculateManualReminderTimes(deadline, priority) {
    const reminderTimes = [];
    const deadlineTime = deadline.getTime();

    // Define reminder intervals in milliseconds
    const intervals = {
      week: 7 * 24 * 60 * 60 * 1000,
      threeDays: 3 * 24 * 60 * 60 * 1000,
      twoDays: 2 * 24 * 60 * 60 * 1000,
      oneDay: 24 * 60 * 60 * 1000,
      eightHours: 8 * 60 * 60 * 1000,
      fourHours: 4 * 60 * 60 * 1000,
      twoHours: 2 * 60 * 60 * 1000,
    };

    let reminderIntervals = [];

    switch (priority.toLowerCase()) {
      case "high":
        reminderIntervals = [
          { interval: intervals.week, description: "1 week before" },
          { interval: intervals.threeDays, description: "3 days before" },
          { interval: intervals.oneDay, description: "1 day before" },
          { interval: intervals.twoHours, description: "2 hours before" },
        ];
        break;
      case "medium":
        reminderIntervals = [
          { interval: intervals.threeDays, description: "3 days before" },
          { interval: intervals.oneDay, description: "1 day before" },
          { interval: intervals.fourHours, description: "4 hours before" },
        ];
        break;
      case "low":
      default:
        reminderIntervals = [
          { interval: intervals.week, description: "1 week before" },
          { interval: intervals.twoDays, description: "2 days before" },
          { interval: intervals.eightHours, description: "8 hours before" },
        ];
        break;
    }

    // Calculate actual reminder times
    const now = new Date();
    reminderIntervals.forEach((reminder) => {
      const reminderTime = new Date(deadlineTime - reminder.interval);
      if (reminderTime > now) {
        reminderTimes.push({
          time: reminderTime.toLocaleString(),
          description: reminder.description,
        });
      }
    });

    return reminderTimes;
  }

  async handleCopyReminders() {
    try {
      const reminderItems = this.manualReminderList.querySelectorAll(
        ".manual-reminder-item"
      );
      let reminderText = "Task Reminders:\n\n";

      reminderItems.forEach((item) => {
        const time = item.querySelector(".reminder-time").textContent;
        const description = item.querySelector(
          ".reminder-description"
        ).textContent;
        reminderText += `${time} (${description})\n`;
      });

      await navigator.clipboard.writeText(reminderText);
      this.showCalendarStatus("Reminders copied to clipboard!", "success");
    } catch (error) {
      console.error("Failed to copy reminders:", error);
      this.showCalendarStatus("Failed to copy reminders", "error");
    }
  }

  hideManualReminderFallback() {
    this.manualReminderFallback.style.display = "none";
  }

  showCalendarStatus(message, type) {
    this.calendarStatus.textContent = message;
    this.calendarStatus.className = `calendar-status ${type}`;

    // Auto-hide after 5 seconds for success/error messages
    if (type === "success" || type === "error") {
      setTimeout(() => {
        this.calendarStatus.style.display = "none";
      }, 5000);
    }
  }

  // Wellness Methods
  showBreathingModal() {
    this.breathingModal.style.display = "flex";

    // Initialize breathing exercise component if not already done
    if (!this.breathingExercise) {
      console.log("Initializing breathing exercise component");
      this.breathingExercise = new BreathingExercise();
    } else {
      // Re-bind elements in case they weren't accessible before
      this.breathingExercise.bindElements();
    }

    // Reset the breathing exercise component state
    if (this.breathingExercise && this.breathingExercise.isActive) {
      this.breathingExercise.stopExercise();
    }

    // Set initial text
    this.breathingText.textContent = "Click Start to begin";
  }

  hideBreathingModal() {
    this.breathingModal.style.display = "none";

    // Stop any active breathing exercise
    if (this.breathingExercise && this.breathingExercise.isActive) {
      this.breathingExercise.stopExercise();
    }
  }

  startBreathingExercise() {
    if (!this.breathingExercise) {
      console.log("Initializing breathing exercise component on start");
      this.breathingExercise = new BreathingExercise();
    }

    if (this.breathingExercise) {
      this.breathingExercise.startExercise();
    } else {
      console.error("Failed to initialize breathing exercise component");
      this.showBreathingStatus("Failed to start breathing exercise", "error");
    }
  }

  stopBreathingExercise() {
    if (this.breathingExercise) {
      this.breathingExercise.stopExercise();
    }
  }

  showBreathingStatus(message, type) {
    // Create or update status display in the breathing modal
    let statusEl = document.getElementById("breathingStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "breathingStatus";
      statusEl.className = "breathing-status";

      // Insert after the breathing text
      if (this.breathingText) {
        this.breathingText.parentNode.insertBefore(
          statusEl,
          this.breathingText.nextSibling
        );
      }
    }

    statusEl.textContent = message;
    statusEl.className = `breathing-status ${type}`;
    statusEl.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  }

  async handleWhiteNoiseToggle() {
    try {
      // Initialize simple audio manager if not exists
      if (!this.simpleAudioManager) {
        this.initSimpleAudioManager();
      }

      // Toggle audio
      const result = this.simpleAudioManager.toggle();

      if (result.success) {
        this.whiteNoiseActive = result.isPlaying;
        this.updateWhiteNoiseButton();

        // Update sound name display
        if (this.currentSoundName) {
          this.currentSoundName.textContent = result.soundName;
        }

        console.log(
          `White noise ${result.isPlaying ? "started" : "stopped"}: ${
            result.soundName
          }`
        );
      } else {
        console.error("Failed to toggle white noise:", result.error);
      }
    } catch (error) {
      console.error("Failed to toggle white noise:", error);
    }
  }

  updateWhiteNoiseButton() {
    if (this.whiteNoiseBtn) {
      if (this.whiteNoiseActive) {
        this.whiteNoiseBtn.classList.add("active");
        this.audioControls.style.display = "block";
      } else {
        this.whiteNoiseBtn.classList.remove("active");
        this.audioControls.style.display = "none";
      }
    }
  }

  showWhiteNoiseStatus(message, type) {
    // Create or update status display
    let statusEl = document.getElementById("whiteNoiseStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "whiteNoiseStatus";
      statusEl.className = "white-noise-status";

      // Insert after the wellness controls
      const wellnessControls = document.querySelector(".wellness-controls");
      if (wellnessControls) {
        wellnessControls.parentNode.insertBefore(
          statusEl,
          wellnessControls.nextSibling
        );
      }
    }

    statusEl.textContent = message;
    statusEl.className = `white-noise-status ${type}`;
    statusEl.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  }

  async loadAudioStatus() {
    try {
      if (!this.simpleAudioManager) {
        this.initSimpleAudioManager();
      }

      // Update volume slider to default
      if (this.volumeSlider && this.volumeValue) {
        const volumePercent = Math.round(this.simpleAudioManager.volume * 100);
        this.volumeSlider.value = volumePercent;
        this.volumeValue.textContent = `${volumePercent}%`;
      }

      // Update current sound display
      if (this.currentSoundName) {
        this.currentSoundName.textContent =
          this.simpleAudioManager.getCurrentSound().name;
      }
    } catch (error) {
      console.error("Failed to load audio status:", error);
    }
  }

  async handleVolumeChange(value) {
    try {
      if (!this.simpleAudioManager) {
        this.initSimpleAudioManager();
      }

      const volume = parseInt(value) / 100;
      const newVolume = this.simpleAudioManager.setVolume(volume);
      this.volumeValue.textContent = `${Math.round(newVolume * 100)}%`;
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  }

  initSimpleAudioManager() {
    if (!this.simpleAudioManager) {
      this.simpleAudioManager = new SimpleAudioManager();

      // Initialize the sound name display
      if (this.currentSoundName) {
        this.currentSoundName.textContent =
          this.simpleAudioManager.getCurrentSound().name;
      }

      console.log("Simple audio manager initialized");
    }
  }

  async handleNextSound() {
    try {
      // Simple direct audio management in popup
      if (!this.simpleAudioManager) {
        this.initSimpleAudioManager();
      }

      const result = this.simpleAudioManager.nextSound();
      if (result.success) {
        this.currentSoundName.textContent = result.soundName;
        console.log(`Switched to: ${result.soundName}`);
      }
    } catch (error) {
      console.error("Failed to change sound:", error);
    }
  }

  // External Page Methods
  async openExternalPage(page) {
    try {
      console.log(`Attempting to open external page: ${page}`);

      const urls = {
        "focus-anxiety": chrome.runtime.getURL(
          "external-pages/focus-anxiety.html"
        ),
        "asmr-fidget": chrome.runtime.getURL("external-pages/asmr-fidget.html"),
      };

      if (!urls[page]) {
        console.error(`Unknown page: ${page}`);
        this.showExternalPageStatus(`Unknown page: ${page}`, "error");
        return;
      }

      console.log(`URL to open: ${urls[page]}`);

      // Create new tab with the external page
      const tab = await chrome.tabs.create({
        url: urls[page],
        active: true,
      });

      if (tab) {
        console.log(
          `Successfully opened external page: ${page} in tab ${tab.id}`
        );
        this.showExternalPageStatus(`Opening ${page} page...`, "success");
      } else {
        console.error("Failed to create new tab");
        this.showExternalPageStatus("Failed to open page", "error");
      }
    } catch (error) {
      console.error(`Failed to open external page ${page}:`, error);

      // Fallback: try to open in same tab
      try {
        window.open(
          chrome.runtime.getURL(`external-pages/${page}.html`),
          "_blank"
        );
        console.log(`Fallback: opened ${page} with window.open`);
        this.showExternalPageStatus(`Opening ${page} page...`, "success");
      } catch (fallbackError) {
        console.error(`Fallback also failed:`, fallbackError);
        this.showExternalPageStatus("Failed to open page", "error");
      }
    }
  }

  // External Page Status Methods
  showExternalPageStatus(message, type) {
    // Create or update status display
    let statusEl = document.getElementById("externalPageStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "externalPageStatus";
      statusEl.className = "external-page-status";
      statusEl.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        max-width: 200px;
        word-wrap: break-word;
      `;
      document.body.appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.className = `external-page-status ${type}`;

    // Set colors based on type
    if (type === "success") {
      statusEl.style.backgroundColor = "#d4edda";
      statusEl.style.color = "#155724";
      statusEl.style.border = "1px solid #c3e6cb";
    } else if (type === "error") {
      statusEl.style.backgroundColor = "#f8d7da";
      statusEl.style.color = "#721c24";
      statusEl.style.border = "1px solid #f5c6cb";
    } else {
      statusEl.style.backgroundColor = "#d1ecf1";
      statusEl.style.color = "#0c5460";
      statusEl.style.border = "1px solid #bee5eb";
    }

    statusEl.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (statusEl && statusEl.parentNode) {
        statusEl.style.display = "none";
      }
    }, 3000);
  }

  // Settings Methods
  handleSettings() {
    // Placeholder for settings functionality
    console.log("Settings clicked - functionality to be implemented");
  }

  // Utility Methods
  formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.length > 30 ? url.substring(0, 30) + "..." : url;
    }
  }

  setButtonLoading(button, loading) {
    if (loading) {
      button.classList.add("loading");
      button.disabled = true;
    } else {
      button.classList.remove("loading");
      button.disabled = false;
    }
  }

  showError(message) {
    // Simple error display - could be enhanced with a proper notification system
    console.error(message);
    alert(message); // Temporary - should be replaced with better UI
  }

  handleKeydown(event) {
    // Handle Escape key to close modals
    if (event.key === "Escape") {
      if (this.breathingModal.style.display === "flex") {
        this.hideBreathingModal();
      }
    }
  }

  async updateBreakStatus() {
    try {
      // Get break timer status from background
      const response = await chrome.runtime.sendMessage({
        type: "GET_BREAK_TIMER_STATUS",
      });

      if (response && response.success && response.data) {
        const status = response.data;

        if (status.isOnBreak) {
          // Show break status, hide work controls
          this.showBreakStatus(status);
        } else {
          // Show work controls, hide break status
          this.showWorkControls();
        }
      } else {
        // Default to work controls if no status available
        this.showWorkControls();
      }
    } catch (error) {
      console.error("Failed to get break status:", error);
      this.showWorkControls();
    }
  }

  showBreakStatus(status) {
    if (this.breakStatus && this.workControls) {
      this.breakStatus.style.display = "block";
      this.workControls.style.display = "none";

      // Update break type display
      if (this.breakType) {
        const breakTypeLabels = {
          short: "Short Break",
          medium: "Medium Break",
          long: "Long Break",
        };
        this.breakType.textContent =
          breakTypeLabels[status.breakType] || "Break";
      }

      // Update remaining time display
      if (this.breakTimeRemaining && status.remainingBreakTime) {
        const remainingMinutes = Math.ceil(
          status.remainingBreakTime / (1000 * 60)
        );
        const minutes = Math.floor(remainingMinutes);
        const seconds = Math.floor(
          (status.remainingBreakTime % (1000 * 60)) / 1000
        );
        this.breakTimeRemaining.textContent = `${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`;
      }
    }
  }

  showWorkControls() {
    if (this.breakStatus && this.workControls) {
      this.breakStatus.style.display = "none";
      this.workControls.style.display = "block";
    }
  }
}

// Simple Audio Manager for popup-only white noise
class SimpleAudioManager {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.currentSoundIndex = 2; // Default to rain
    this.volume = 0.5;

    this.sounds = [
      { name: "Air Conditioner", file: "assets/sounds/air-white-noise.mp3" },
      { name: "Ocean Waves", file: "assets/sounds/ocean-white-noise.mp3" },
      { name: "Rain Drops", file: "assets/sounds/rain-white-noise.mp3" },
      { name: "Shower", file: "assets/sounds/shower-white-noise.mp3" },
      { name: "Train Journey", file: "assets/sounds/train-white-noise.mp3" },
      { name: "Flowing Water", file: "assets/sounds/water-white-noise.mp3" },
      { name: "Waterfall", file: "assets/sounds/waterfall-white-noise.mp3" },
    ];
  }

  getCurrentSound() {
    return this.sounds[this.currentSoundIndex];
  }

  createAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    const sound = this.getCurrentSound();
    this.audio = new Audio(chrome.runtime.getURL(sound.file));
    this.audio.loop = true;
    this.audio.volume = this.volume;

    return this.audio;
  }

  toggle() {
    try {
      if (this.isPlaying) {
        // Stop audio
        if (this.audio) {
          this.audio.pause();
        }
        this.isPlaying = false;
        return {
          success: true,
          isPlaying: false,
          soundName: this.getCurrentSound().name,
        };
      } else {
        // Start audio
        this.createAudio();
        this.audio.play();
        this.isPlaying = true;
        return {
          success: true,
          isPlaying: true,
          soundName: this.getCurrentSound().name,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        isPlaying: this.isPlaying,
        soundName: this.getCurrentSound().name,
      };
    }
  }

  nextSound() {
    // Cycle to next sound
    this.currentSoundIndex = (this.currentSoundIndex + 1) % this.sounds.length;

    // If currently playing, restart with new sound
    if (this.isPlaying) {
      this.createAudio();
      this.audio.play();
    }

    return {
      success: true,
      soundName: this.getCurrentSound().name,
      soundIndex: this.currentSoundIndex,
    };
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    return this.volume;
  }
}
document.getElementById("backgroundBtn").addEventListener("click", async () => {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: "../external-pages/offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play white noise in the background",
    });
  }

  chrome.runtime.sendMessage({
    type: "PLAY_OFFSCREEN_AUDIO",
    soundIndex: 2,
    volume: 1,
  });
});

// Initialize the popup when the script loads
const popupManager = new PopupManager();

// Cleanup when popup is closed
window.addEventListener("beforeunload", () => {
  if (popupManager && typeof popupManager.cleanup === "function") {
    popupManager.cleanup();
  }
});
const priorityConfig = {
  low: [24], // 1 reminder, 24h before
  medium: [48, 4], // 2 reminders, 2 days and 4 hours before
  high: [72, 24, 4], // 3 reminders, 3 days, 1 day, 4 hours before
};

const taskInput = document.getElementById("reminderTaskInput");
const deadlineInput = document.getElementById("reminderDeadlineInput");
const prioritySelect = document.getElementById("prioritySelect");
const buttonsContainer = document.getElementById("reminderButtonsContainer");
const downloadICSBtn = document.getElementById("downloadICSBtn");

// Update buttons on priority change
prioritySelect.addEventListener("change", renderReminderButtons);
renderReminderButtons();

// Render Google Calendar buttons
function renderReminderButtons() {
  buttonsContainer.innerHTML = "";
  const selectedPriority = prioritySelect.value;
  const offsets = priorityConfig[selectedPriority];

  offsets.forEach((hoursBefore, idx) => {
    const btn = document.createElement("button");
    btn.textContent = `Add Reminder ${
      idx + 1
    } (${hoursBefore}h before deadline)`;
    btn.addEventListener("click", () => createGoogleCalendarEvent(hoursBefore));
    buttonsContainer.appendChild(btn);
  });
}

// Google Calendar event
function formatDateUTC(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function createGoogleCalendarEvent(hoursBefore) {
  const taskName = taskInput.value || "Untitled Task";
  const deadlineStr = deadlineInput.value;
  if (!deadlineStr) {
    alert("Please enter a deadline.");
    return;
  }
  const deadline = new Date(deadlineStr);
  const start = new Date(deadline.getTime() - hoursBefore * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 15 * 60 * 1000);

  const url =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent("Reminder: " + taskName)}` +
    `&details=${encodeURIComponent(hoursBefore + "h before deadline")}` +
    `&dates=${formatDateUTC(start)}/${formatDateUTC(end)}` +
    `&location=${encodeURIComponent("Nudge")}`;

  window.open(url, "_blank");
}

// ICS generation
downloadICSBtn.addEventListener("click", () => {
  const taskName = taskInput.value || "Untitled Task";
  const deadlineStr = deadlineInput.value;
  if (!deadlineStr) {
    alert("Please enter a deadline.");
    return;
  }
  const deadline = new Date(deadlineStr);
  const selectedPriority = prioritySelect.value;
  const offsets = priorityConfig[selectedPriority];
  const reminders = offsets.map((hoursBefore) => {
    const start = new Date(deadline.getTime() - hoursBefore * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    return { start, end, label: `${hoursBefore}h before deadline` };
  });

  generateICS(taskName, reminders);
});

function generateICS(taskName, reminders) {
  let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Nudge//EN\n`;

  reminders.forEach((rem, idx) => {
    icsContent += `BEGIN:VEVENT\n`;
    icsContent += `UID:${idx}@nudge\n`;
    icsContent += `DTSTAMP:${formatDateUTC(new Date())}\n`;
    icsContent += `DTSTART:${formatDateUTC(rem.start)}\n`;
    icsContent += `DTEND:${formatDateUTC(rem.end)}\n`;
    icsContent += `SUMMARY:Reminder: ${taskName}\n`;
    icsContent += `DESCRIPTION:${rem.label}\n`;
    icsContent += `END:VEVENT\n`;
  });

  icsContent += `END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${taskName.replace(/\s+/g, "_")}_reminders.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
