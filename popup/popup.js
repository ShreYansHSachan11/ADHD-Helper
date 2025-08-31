// Popup JavaScript - Main initialization and event handling

class PopupManager {
  constructor() {
    this.isInitialized = false;
    this.currentBreathingSession = null;
    this.whiteNoiseActive = false;

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
      // Initialize UI elements
      this.initializeElements();

      // Set up event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadInitialData();

      // Update UI with current state
      this.updateUI();

      this.isInitialized = true;
      console.log("Popup initialized successfully");
    } catch (error) {
      console.error("Failed to initialize popup:", error);
      this.showError("Failed to initialize extension. Please try refreshing.");
    }
  }

  initializeElements() {
    // Screen Time elements
    this.currentTimeEl = document.getElementById("currentTime");
    this.timeLimitInput = document.getElementById("timeLimitInput");
    this.takeBreakBtn = document.getElementById("takeBreakBtn");

    // Focus elements
    this.focusUrlEl = document.getElementById("focusUrl");
    this.setFocusBtn = document.getElementById("setFocusBtn");
    this.resetFocusBtn = document.getElementById("resetFocusBtn");

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

    // Wellness elements
    this.breathingBtn = document.getElementById("breathingBtn");
    this.whiteNoiseBtn = document.getElementById("whiteNoiseBtn");

    // External page elements
    this.focusAnxietyBtn = document.getElementById("focusAnxietyBtn");
    this.asmrFidgetBtn = document.getElementById("asmrFidgetBtn");

    // Modal elements
    this.breathingModal = document.getElementById("breathingModal");
    this.closeBreathingBtn = document.getElementById("closeBreathingBtn");
    this.startBreathingBtn = document.getElementById("startBreathingBtn");
    this.stopBreathingBtn = document.getElementById("stopBreathingBtn");
    this.breathingCircle = document.getElementById("breathingCircle");
    this.breathingText = document.getElementById("breathingText");

    // Settings
    this.settingsBtn = document.getElementById("settingsBtn");
  }

  setupEventListeners() {
    // Screen Time listeners
    this.timeLimitInput?.addEventListener("change", (e) =>
      this.handleTimeLimitChange(e)
    );
    this.takeBreakBtn?.addEventListener("click", () => this.handleTakeBreak());

    // Focus listeners
    this.setFocusBtn?.addEventListener("click", () => this.handleSetFocus());
    this.resetFocusBtn?.addEventListener("click", () =>
      this.handleResetFocus()
    );

    // Task listeners
    this.getBreakdownBtn?.addEventListener("click", () =>
      this.handleGetBreakdown()
    );
    this.taskNameInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleGetBreakdown();
    });

    // Calendar listeners
    this.createRemindersBtn?.addEventListener("click", () =>
      this.handleCreateReminders()
    );

    // Wellness listeners
    this.breathingBtn?.addEventListener("click", () =>
      this.showBreathingModal()
    );
    this.whiteNoiseBtn?.addEventListener("click", () =>
      this.handleWhiteNoiseToggle()
    );

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
    this.startBreathingBtn?.addEventListener("click", () =>
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

  async loadInitialData() {
    try {
      // Load settings from storage
      const result = await chrome.storage.local.get([
        "screenTimeLimit",
        "focusTab",
        "whiteNoiseActive",
        "currentSessionTime",
      ]);

      // Update time limit input
      if (result.screenTimeLimit) {
        this.timeLimitInput.value = result.screenTimeLimit;
      }

      // Update focus tab display
      if (result.focusTab) {
        this.focusUrlEl.textContent = this.formatUrl(result.focusTab.url);
      }

      // Update white noise state
      this.whiteNoiseActive = result.whiteNoiseActive || false;
      this.updateWhiteNoiseButton();

      // Update current session time
      if (result.currentSessionTime) {
        this.updateCurrentTime(result.currentSessionTime);
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  }

  updateUI() {
    // Update current time display
    this.updateCurrentTimeDisplay();

    // Set up periodic updates
    setInterval(() => {
      this.updateCurrentTimeDisplay();
    }, 1000);
  }

  // Screen Time Methods
  async handleTimeLimitChange(event) {
    const newLimit = parseInt(event.target.value);
    if (newLimit >= 5 && newLimit <= 120) {
      try {
        await chrome.storage.local.set({ screenTimeLimit: newLimit });
        console.log("Time limit updated:", newLimit);
      } catch (error) {
        console.error("Failed to save time limit:", error);
      }
    }
  }

  handleTakeBreak() {
    // Send message to background script to trigger break
    chrome.runtime.sendMessage({ action: "takeBreak" });
    window.close();
  }

  async updateCurrentTimeDisplay() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCurrentTime",
      });
      if (response && response.time !== undefined) {
        this.updateCurrentTime(response.time);
      }
    } catch (error) {
      console.error("Failed to get current time:", error);
    }
  }

  updateCurrentTime(minutes) {
    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = `${Math.floor(minutes)} min`;
    }
  }

  // Focus Methods
  async handleSetFocus() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        await chrome.storage.local.set({
          focusTab: {
            id: tab.id,
            url: tab.url,
            title: tab.title,
          },
        });
        this.focusUrlEl.textContent = this.formatUrl(tab.url);
        console.log("Focus tab set:", tab.url);
      }
    } catch (error) {
      console.error("Failed to set focus tab:", error);
      this.showError("Failed to set focus tab");
    }
  }

  async handleResetFocus() {
    try {
      await chrome.storage.local.remove("focusTab");
      this.focusUrlEl.textContent = "Not set";
      console.log("Focus tab reset");
    } catch (error) {
      console.error("Failed to reset focus tab:", error);
    }
  }

  // Task Methods
  async handleGetBreakdown() {
    const taskName = this.taskNameInput.value.trim();
    const deadline = this.taskDeadlineInput.value;

    if (!taskName) {
      this.showError("Please enter a task name");
      return;
    }

    this.setButtonLoading(this.getBreakdownBtn, true);

    try {
      // Send message to background script for AI breakdown
      const response = await chrome.runtime.sendMessage({
        action: "getTaskBreakdown",
        taskName,
        deadline,
      });

      if (response.success) {
        this.displayTaskBreakdown(response.breakdown);
      } else {
        this.showError(response.error || "Failed to get task breakdown");
      }
    } catch (error) {
      console.error("Failed to get task breakdown:", error);
      this.showError("Failed to connect to AI service");
    } finally {
      this.setButtonLoading(this.getBreakdownBtn, false);
    }
  }

  displayTaskBreakdown(breakdown) {
    this.breakdownList.innerHTML = "";

    if (Array.isArray(breakdown)) {
      breakdown.forEach((step) => {
        const li = document.createElement("li");
        li.textContent = step;
        this.breakdownList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = breakdown;
      this.breakdownList.appendChild(li);
    }

    this.taskBreakdown.style.display = "block";
  }

  // Calendar Methods
  async handleCreateReminders() {
    const taskName = this.taskNameInput.value.trim();
    const deadline = this.taskDeadlineInput.value;
    const priority = this.prioritySelect.value;

    if (!taskName || !deadline) {
      this.showError("Please enter task name and deadline");
      return;
    }

    this.setButtonLoading(this.createRemindersBtn, true);

    try {
      const response = await chrome.runtime.sendMessage({
        action: "createCalendarReminders",
        taskName,
        deadline,
        priority,
      });

      if (response.success) {
        this.showCalendarStatus("Reminders created successfully!", "success");
      } else {
        this.showCalendarStatus(
          response.error || "Failed to create reminders",
          "error"
        );
      }
    } catch (error) {
      console.error("Failed to create reminders:", error);
      this.showCalendarStatus("Failed to create reminders", "error");
    } finally {
      this.setButtonLoading(this.createRemindersBtn, false);
    }
  }

  showCalendarStatus(message, type) {
    this.calendarStatus.textContent = message;
    this.calendarStatus.className = `calendar-status ${type}`;

    setTimeout(() => {
      this.calendarStatus.style.display = "none";
    }, 5000);
  }

  // Wellness Methods
  showBreathingModal() {
    this.breathingModal.style.display = "flex";
    this.breathingText.textContent = "Click Start to begin";
  }

  hideBreathingModal() {
    this.breathingModal.style.display = "none";
    this.stopBreathingExercise();
  }

  startBreathingExercise() {
    this.startBreathingBtn.style.display = "none";
    this.stopBreathingBtn.style.display = "inline-block";

    this.currentBreathingSession = this.runBreathingCycle();
  }

  stopBreathingExercise() {
    if (this.currentBreathingSession) {
      clearTimeout(this.currentBreathingSession);
      this.currentBreathingSession = null;
    }

    this.startBreathingBtn.style.display = "inline-block";
    this.stopBreathingBtn.style.display = "none";
    this.breathingCircle.className = "breathing-circle";
    this.breathingText.textContent = "Click Start to begin";
  }

  runBreathingCycle() {
    const phases = [
      { name: "Breathe in...", class: "inhale", duration: 4000 },
      { name: "Hold...", class: "inhale", duration: 1000 },
      { name: "Breathe out...", class: "exhale", duration: 4000 },
      { name: "Hold...", class: "exhale", duration: 1000 },
    ];

    let currentPhase = 0;

    const runPhase = () => {
      if (!this.currentBreathingSession) return;

      const phase = phases[currentPhase];
      this.breathingText.textContent = phase.name;
      this.breathingCircle.className = `breathing-circle ${phase.class}`;

      this.currentBreathingSession = setTimeout(() => {
        currentPhase = (currentPhase + 1) % phases.length;
        runPhase();
      }, phase.duration);
    };

    runPhase();
    return this.currentBreathingSession;
  }

  async handleWhiteNoiseToggle() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "toggleWhiteNoise",
      });

      if (response.success) {
        this.whiteNoiseActive = response.active;
        this.updateWhiteNoiseButton();
      }
    } catch (error) {
      console.error("Failed to toggle white noise:", error);
    }
  }

  updateWhiteNoiseButton() {
    if (this.whiteNoiseActive) {
      this.whiteNoiseBtn.classList.add("active");
    } else {
      this.whiteNoiseBtn.classList.remove("active");
    }
  }

  // External Page Methods
  openExternalPage(page) {
    const urls = {
      "focus-anxiety": chrome.runtime.getURL(
        "external-pages/focus-anxiety.html"
      ),
      "asmr-fidget": chrome.runtime.getURL("external-pages/asmr-fidget.html"),
    };

    if (urls[page]) {
      chrome.tabs.create({ url: urls[page] });
    }
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
}

// Initialize the popup when the script loads
new PopupManager();
