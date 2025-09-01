// Popup JavaScript - Main initialization and event handling

class PopupManager {
  constructor() {
    this.isInitialized = false;
    this.currentBreathingSession = null;
    this.whiteNoiseActive = false;
    this.taskManager = null;

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

      // Initialize task manager component
      this.taskManager = new TaskManager();

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
    this.focusDeviationHistory = document.getElementById("focusDeviationHistory");
    this.deviationList = document.getElementById("deviationList");
    this.toggleHistoryBtn = document.getElementById("toggleHistoryBtn");

    // Task elements (managed by TaskManager component)
    // Task management is now handled by the TaskManager component

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
    this.timeLimitInput?.addEventListener("blur", (e) =>
      this.handleTimeLimitChange(e)
    );
    this.takeBreakBtn?.addEventListener("click", () => this.handleTakeBreak());
    this.resetScreenTimeBtn?.addEventListener("click", () => this.resetScreenTimeData());

    // Focus listeners
    this.setFocusBtn?.addEventListener("click", () => this.handleSetFocus());
    this.resetFocusBtn?.addEventListener("click", () =>
      this.handleResetFocus()
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
      // Load screen time settings
      await this.loadScreenTimeSettings();

      // Load focus tab information and session data
      await this.loadFocusTrackingData();

      // Load audio settings
      const audioResult = await chrome.storage.local.get('audioSettings');
      const audioSettings = audioResult.audioSettings || { whiteNoise: { enabled: false } };
      this.whiteNoiseActive = audioSettings.whiteNoise.enabled;
      this.updateWhiteNoiseButton();

      // Load current tab stats
      await this.updateCurrentTimeDisplay();
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

    // Set up periodic focus tracking updates (every 5 seconds)
    setInterval(() => {
      this.loadFocusSessionStats();
    }, 5000);
  }

  // Screen Time Methods
  async handleTimeLimitChange(event) {
    const newLimit = parseInt(event.target.value);
    if (newLimit >= 5 && newLimit <= 180) {
      try {
        // Update storage with new limit
        const settings = await chrome.storage.local.get('screenTimeSettings') || {};
        const currentSettings = settings.screenTimeSettings || {
          limitMinutes: 30,
          enabled: true,
          notificationsEnabled: true
        };
        
        currentSettings.limitMinutes = newLimit;
        await chrome.storage.local.set({ screenTimeSettings: currentSettings });
        
        console.log("Time limit updated:", newLimit);
        this.showScreenTimeStatus("Time limit updated successfully!", "success");
      } catch (error) {
        console.error("Failed to save time limit:", error);
        this.showScreenTimeStatus("Failed to save time limit", "error");
      }
    } else {
      this.showScreenTimeStatus("Time limit must be between 5 and 180 minutes", "error");
      // Reset input to previous valid value
      await this.loadScreenTimeSettings();
    }
  }

  async handleTakeBreak() {
    try {
      // Send message to background script to trigger manual break
      const response = await chrome.runtime.sendMessage({ 
        type: "TRIGGER_MANUAL_BREAK" 
      });
      
      if (response && response.success) {
        this.showScreenTimeStatus("Break started! Timer reset.", "success");
        // Update the current time display immediately
        this.updateCurrentTime(0);
      } else {
        this.showScreenTimeStatus("Failed to trigger break", "error");
      }
    } catch (error) {
      console.error("Failed to trigger break:", error);
      this.showScreenTimeStatus("Failed to trigger break", "error");
    }
  }

  async updateCurrentTimeDisplay() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_TAB_STATS",
      });
      
      if (response && response.success && response.data) {
        const stats = response.data;
        // Show current session time in minutes
        const sessionMinutes = Math.floor(stats.currentSessionTime / (1000 * 60));
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
      const settings = await chrome.storage.local.get('screenTimeSettings');
      const screenTimeSettings = settings.screenTimeSettings || { limitMinutes: 30 };
      const limit = screenTimeSettings.limitMinutes;
      
      // Remove existing classes
      this.currentTimeEl.classList.remove('time-warning', 'time-danger');
      
      // Add warning/danger classes based on time spent
      const percentage = (currentMinutes / limit) * 100;
      if (percentage >= 90) {
        this.currentTimeEl.classList.add('time-danger');
      } else if (percentage >= 75) {
        this.currentTimeEl.classList.add('time-warning');
      }
    } catch (error) {
      console.error("Failed to update time indicator:", error);
    }
  }

  updateBreakReminderCount(count) {
    // Add or update break reminder count display
    let reminderCountEl = document.getElementById('breakReminderCount');
    if (!reminderCountEl) {
      reminderCountEl = document.createElement('span');
      reminderCountEl.id = 'breakReminderCount';
      reminderCountEl.className = 'reminder-count';
      this.currentTimeEl.parentNode.appendChild(reminderCountEl);
    }
    
    if (count > 0) {
      reminderCountEl.textContent = `(${count} reminder${count > 1 ? 's' : ''})`;
      reminderCountEl.style.display = 'inline';
    } else {
      reminderCountEl.style.display = 'none';
    }
  }

  async loadScreenTimeSettings() {
    try {
      const result = await chrome.storage.local.get('screenTimeSettings');
      const settings = result.screenTimeSettings || {
        limitMinutes: 30,
        enabled: true,
        notificationsEnabled: true
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
    const screenTimeSection = document.querySelector('.screen-time-section');
    if (screenTimeSection) {
      if (enabled) {
        screenTimeSection.classList.remove('disabled');
      } else {
        screenTimeSection.classList.add('disabled');
      }
    }
  }

  showScreenTimeStatus(message, type) {
    // Create or update status display
    let statusEl = document.getElementById('screenTimeStatus');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'screenTimeStatus';
      statusEl.className = 'screen-time-status';
      
      // Insert after the time limit control
      const timeLimitControl = document.querySelector('.time-limit-control');
      if (timeLimitControl) {
        timeLimitControl.parentNode.insertBefore(statusEl, timeLimitControl.nextSibling);
      }
    }
    
    statusEl.textContent = message;
    statusEl.className = `screen-time-status ${type}`;
    statusEl.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }

  async resetScreenTimeData() {
    try {
      // Clear tab history and reset current session
      const response = await chrome.runtime.sendMessage({
        type: "CLEAR_TAB_HISTORY"
      });
      
      if (response && response.success) {
        // Reset current time display
        this.updateCurrentTime(0);
        this.updateBreakReminderCount(0);
        this.showScreenTimeStatus("Screen time data reset successfully!", "success");
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
        type: "GET_FOCUS_INFO"
      });
      
      if (focusResponse && focusResponse.success && focusResponse.data) {
        const focusInfo = focusResponse.data;
        this.updateFocusDisplay(focusInfo);
      }

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
        type: "GET_FOCUS_SESSION_STATS"
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
        type: "GET_FOCUS_DEVIATION_HISTORY"
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
      this.updateFocusStatus('active');
      this.focusSessionInfo.style.display = 'block';
      this.focusDeviationHistory.style.display = 'block';
    } else {
      this.focusUrlEl.textContent = "Not set";
      this.updateFocusStatus('inactive');
      this.focusSessionInfo.style.display = 'none';
      this.focusDeviationHistory.style.display = 'none';
    }
  }

  updateFocusStatus(status) {
    // Remove existing status classes
    this.focusStatusDot.classList.remove('active', 'deviation', 'inactive');
    
    switch (status) {
      case 'active':
        this.focusStatusDot.classList.add('active');
        this.focusStatusText.textContent = 'Active';
        break;
      case 'deviation':
        this.focusStatusDot.classList.add('deviation');
        this.focusStatusText.textContent = 'Off Focus';
        break;
      case 'inactive':
      default:
        this.focusStatusDot.classList.add('inactive');
        this.focusStatusText.textContent = 'Not Active';
        break;
    }
  }

  updateFocusSessionInfo(sessionData) {
    // Update session time
    const sessionMinutes = Math.floor(sessionData.sessionTime / (1000 * 60));
    const hours = Math.floor(sessionMinutes / 60);
    const minutes = sessionMinutes % 60;
    
    if (hours > 0) {
      this.focusSessionTime.textContent = `${hours}h ${minutes}m`;
    } else {
      this.focusSessionTime.textContent = `${minutes}m`;
    }

    // Update deviation count
    this.focusDeviationCount.textContent = sessionData.deviationCount || 0;

    // Update last reminder time
    if (sessionData.lastReminderTime) {
      const timeSince = Date.now() - sessionData.lastReminderTime;
      const minutesSince = Math.floor(timeSince / (1000 * 60));
      
      if (minutesSince < 1) {
        this.lastFocusReminder.textContent = 'Just now';
      } else if (minutesSince < 60) {
        this.lastFocusReminder.textContent = `${minutesSince}m ago`;
      } else {
        const hoursSince = Math.floor(minutesSince / 60);
        this.lastFocusReminder.textContent = `${hoursSince}h ago`;
      }
    } else {
      this.lastFocusReminder.textContent = 'Never';
    }

    // Update status based on current state
    if (sessionData.isCurrentlyOnFocus) {
      this.updateFocusStatus('active');
    } else if (sessionData.deviationCount > 0) {
      this.updateFocusStatus('deviation');
    }
  }

  updateDeviationHistory(historyData) {
    if (!historyData || !historyData.deviations || historyData.deviations.length === 0) {
      this.toggleHistoryBtn.style.display = 'none';
      return;
    }

    this.toggleHistoryBtn.style.display = 'block';
    
    // Clear existing deviation items
    this.deviationList.innerHTML = '';

    // Add recent deviations (limit to 5 most recent)
    const recentDeviations = historyData.deviations.slice(-5).reverse();
    
    recentDeviations.forEach(deviation => {
      const deviationItem = document.createElement('div');
      deviationItem.className = 'deviation-item';
      
      const fromDomain = this.formatUrl(deviation.fromUrl);
      const toDomain = this.formatUrl(deviation.toUrl);
      const timeAgo = this.formatTimeAgo(deviation.timestamp);
      
      deviationItem.innerHTML = `
        <div class="deviation-from">${fromDomain}</div>
        <span class="deviation-arrow">→</span>
        <div class="deviation-to">${toDomain}</div>
        <div class="deviation-time">${timeAgo}</div>
      `;
      
      this.deviationList.appendChild(deviationItem);
    });
  }

  toggleDeviationHistory() {
    const isVisible = this.deviationList.style.display !== 'none';
    
    if (isVisible) {
      this.deviationList.style.display = 'none';
      this.toggleHistoryBtn.textContent = 'Show History';
    } else {
      this.deviationList.style.display = 'block';
      this.toggleHistoryBtn.textContent = 'Hide History';
    }
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) {
      return 'now';
    } else if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    }
  }

  async handleSetFocus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SET_FOCUS_TAB"
      });
      
      if (response && response.success) {
        // Reload focus tracking data to update UI
        await this.loadFocusTrackingData();
        this.showFocusStatus("Focus tab set successfully!", "success");
      } else {
        this.showFocusStatus("Failed to set focus tab", "error");
      }
    } catch (error) {
      console.error("Failed to set focus tab:", error);
      this.showFocusStatus("Failed to set focus tab", "error");
    }
  }

  async handleResetFocus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "RESET_FOCUS_TAB"
      });
      
      if (response && response.success) {
        // Update UI immediately
        this.focusUrlEl.textContent = "Not set";
        this.updateFocusStatus('inactive');
        this.focusSessionInfo.style.display = 'none';
        this.focusDeviationHistory.style.display = 'none';
        this.showFocusStatus("Focus tracking reset", "success");
      } else {
        this.showFocusStatus("Failed to reset focus tab", "error");
      }
    } catch (error) {
      console.error("Failed to reset focus tab:", error);
      this.showFocusStatus("Failed to reset focus tab", "error");
    }
  }

  showFocusStatus(message, type) {
    // Create or update status display
    let statusEl = document.getElementById('focusStatus');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'focusStatus';
      statusEl.className = 'focus-status';
      
      // Insert after the focus controls
      const focusControls = document.querySelector('.focus-controls');
      if (focusControls) {
        focusControls.parentNode.insertBefore(statusEl, focusControls.nextSibling);
      }
    }
    
    statusEl.textContent = message;
    statusEl.className = `focus-status ${type}`;
    statusEl.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }

  // Task Methods (now handled by TaskManager component)
  // Task management methods are now handled by the TaskManager component

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
