/**
 * Distraction Reminder Settings Component
 * Provides UI for configuring distraction reminder preferences
 */

class DistractionReminderSettings {
  constructor() {
    this.preferences = {
      enabled: true,
      reminderStyle: 'gentle',
      frequency: 'adaptive',
      showDuringBreaks: false,
      customMessages: [],
      soundEnabled: false,
      vibrationEnabled: false,
    };
    
    this.isInitialized = false;
    this.container = null;
    
    this.init();
  }

  /**
   * Initialize the settings component
   */
  async init() {
    try {
      await this.loadPreferences();
      this.createSettingsUI();
      this.isInitialized = true;
      console.log("DistractionReminderSettings initialized");
    } catch (error) {
      console.error("Error initializing DistractionReminderSettings:", error);
    }
  }

  /**
   * Load preferences from background service
   */
  async loadPreferences() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_DISTRACTION_REMINDER_STATUS"
      });
      
      if (response && response.success && response.data.preferences) {
        this.preferences = { ...this.preferences, ...response.data.preferences };
      }
    } catch (error) {
      console.error("Error loading distraction reminder preferences:", error);
    }
  }

  /**
   * Save preferences to background service
   */
  async savePreferences() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "UPDATE_DISTRACTION_REMINDER_PREFERENCES",
        preferences: this.preferences
      });
      
      if (response && response.success) {
        this.showFeedback("Settings saved successfully!", "success");
      } else {
        this.showFeedback("Failed to save settings", "error");
      }
    } catch (error) {
      console.error("Error saving distraction reminder preferences:", error);
      this.showFeedback("Error saving settings", "error");
    }
  }

  /**
   * Create the settings UI
   */
  createSettingsUI() {
    const settingsHTML = `
      <div class="distraction-reminder-settings">
        <div class="settings-header">
          <h3>🎯 Distraction Reminders</h3>
          <p class="settings-description">Configure intelligent reminders to help you stay focused</p>
        </div>

        <div class="settings-section">
          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" id="dr-enabled" ${this.preferences.enabled ? 'checked' : ''}>
              <span class="setting-title">Enable Distraction Reminders</span>
            </label>
            <p class="setting-description">Show smart reminders when you deviate from your focus task</p>
          </div>
        </div>

        <div class="settings-section ${!this.preferences.enabled ? 'disabled' : ''}">
          <div class="setting-item">
            <label class="setting-title">Reminder Style</label>
            <select id="dr-style" class="setting-select">
              <option value="gentle" ${this.preferences.reminderStyle === 'gentle' ? 'selected' : ''}>
                🌱 Gentle - Soft, encouraging reminders
              </option>
              <option value="standard" ${this.preferences.reminderStyle === 'standard' ? 'selected' : ''}>
                🎯 Standard - Balanced reminder approach
              </option>
              <option value="assertive" ${this.preferences.reminderStyle === 'assertive' ? 'selected' : ''}>
                ⚡ Assertive - Direct, action-oriented reminders
              </option>
            </select>
          </div>

          <div class="setting-item">
            <label class="setting-title">Reminder Frequency</label>
            <select id="dr-frequency" class="setting-select">
              <option value="low" ${this.preferences.frequency === 'low' ? 'selected' : ''}>
                🐌 Low - Fewer reminders, longer cooldowns
              </option>
              <option value="medium" ${this.preferences.frequency === 'medium' ? 'selected' : ''}>
                🚶 Medium - Balanced reminder frequency
              </option>
              <option value="high" ${this.preferences.frequency === 'high' ? 'selected' : ''}>
                🏃 High - More frequent reminders
              </option>
              <option value="adaptive" ${this.preferences.frequency === 'adaptive' ? 'selected' : ''}>
                🧠 Adaptive - Smart frequency based on your behavior
              </option>
            </select>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" id="dr-during-breaks" ${this.preferences.showDuringBreaks ? 'checked' : ''}>
              <span class="setting-title">Show During Breaks</span>
            </label>
            <p class="setting-description">Show reminders even when you're on an official break</p>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" id="dr-sound" ${this.preferences.soundEnabled ? 'checked' : ''}>
              <span class="setting-title">Sound Notifications</span>
            </label>
            <p class="setting-description">Play a subtle sound with reminders</p>
          </div>
        </div>

        <div class="settings-section ${!this.preferences.enabled ? 'disabled' : ''}">
          <div class="setting-item">
            <label class="setting-title">Custom Messages</label>
            <div class="custom-messages-container">
              <textarea 
                id="dr-custom-messages" 
                class="setting-textarea"
                placeholder="Enter custom reminder messages, one per line..."
                rows="4"
              >${this.preferences.customMessages.join('\\n')}</textarea>
              <p class="setting-description">
                Add personalized reminder messages. Leave empty to use default messages.
              </p>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button id="dr-save" class="btn btn-primary">Save Settings</button>
          <button id="dr-reset" class="btn btn-secondary">Reset to Defaults</button>
          <button id="dr-test" class="btn btn-outline">Test Reminder</button>
        </div>

        <div id="dr-feedback" class="settings-feedback" style="display: none;"></div>

        <div class="settings-stats ${!this.preferences.enabled ? 'disabled' : ''}">
          <h4>📊 Reminder Statistics</h4>
          <div id="dr-stats-container" class="stats-grid">
            <div class="stat-item">
              <span class="stat-value" id="dr-total-reminders">-</span>
              <span class="stat-label">Total Reminders</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="dr-session-reminders">-</span>
              <span class="stat-label">This Session</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="dr-avg-reminders">-</span>
              <span class="stat-label">Avg per Session</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Find or create container
    this.container = document.getElementById('distraction-reminder-settings');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'distraction-reminder-settings';
      this.container.className = 'settings-panel';
      
      // Add to settings container or create one
      const settingsContainer = document.getElementById('settings-container') || document.body;
      settingsContainer.appendChild(this.container);
    }

    this.container.innerHTML = settingsHTML;
    this.attachEventListeners();
    this.loadStatistics();
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // Enable/disable toggle
    const enabledCheckbox = document.getElementById('dr-enabled');
    enabledCheckbox?.addEventListener('change', (e) => {
      this.preferences.enabled = e.target.checked;
      this.updateUIState();
    });

    // Reminder style
    const styleSelect = document.getElementById('dr-style');
    styleSelect?.addEventListener('change', (e) => {
      this.preferences.reminderStyle = e.target.value;
    });

    // Frequency
    const frequencySelect = document.getElementById('dr-frequency');
    frequencySelect?.addEventListener('change', (e) => {
      this.preferences.frequency = e.target.value;
    });

    // Show during breaks
    const duringBreaksCheckbox = document.getElementById('dr-during-breaks');
    duringBreaksCheckbox?.addEventListener('change', (e) => {
      this.preferences.showDuringBreaks = e.target.checked;
    });

    // Sound notifications
    const soundCheckbox = document.getElementById('dr-sound');
    soundCheckbox?.addEventListener('change', (e) => {
      this.preferences.soundEnabled = e.target.checked;
    });

    // Custom messages
    const customMessagesTextarea = document.getElementById('dr-custom-messages');
    customMessagesTextarea?.addEventListener('blur', (e) => {
      const messages = e.target.value
        .split('\\n')
        .map(msg => msg.trim())
        .filter(msg => msg.length > 0);
      this.preferences.customMessages = messages;
    });

    // Save button
    const saveButton = document.getElementById('dr-save');
    saveButton?.addEventListener('click', () => {
      this.savePreferences();
    });

    // Reset button
    const resetButton = document.getElementById('dr-reset');
    resetButton?.addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Test button
    const testButton = document.getElementById('dr-test');
    testButton?.addEventListener('click', () => {
      this.testReminder();
    });
  }

  /**
   * Update UI state based on enabled/disabled
   */
  updateUIState() {
    const sections = this.container.querySelectorAll('.settings-section:not(:first-child)');
    sections.forEach(section => {
      if (this.preferences.enabled) {
        section.classList.remove('disabled');
      } else {
        section.classList.add('disabled');
      }
    });
  }

  /**
   * Load and display statistics
   */
  async loadStatistics() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_DISTRACTION_REMINDER_STATUS"
      });
      
      if (response && response.success && response.data) {
        const stats = response.data.sessionStats;
        
        // Update stat displays
        const totalElement = document.getElementById('dr-total-reminders');
        const sessionElement = document.getElementById('dr-session-reminders');
        const avgElement = document.getElementById('dr-avg-reminders');
        
        if (totalElement) totalElement.textContent = stats.totalReminders || 0;
        if (sessionElement) sessionElement.textContent = stats.reminderCount || 0;
        if (avgElement) avgElement.textContent = (stats.averageRemindersPerSession || 0).toFixed(1);
      }
    } catch (error) {
      console.error("Error loading distraction reminder statistics:", error);
    }
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults() {
    this.preferences = {
      enabled: true,
      reminderStyle: 'gentle',
      frequency: 'adaptive',
      showDuringBreaks: false,
      customMessages: [],
      soundEnabled: false,
      vibrationEnabled: false,
    };
    
    this.createSettingsUI();
    this.showFeedback("Settings reset to defaults", "info");
  }

  /**
   * Test reminder functionality
   */
  async testReminder() {
    try {
      // Create a test notification
      const testNotification = {
        title: this.getReminderTitle(),
        message: "This is a test reminder to show you how notifications will appear.",
        iconUrl: "/assets/icons/48.ico",
        type: "basic",
        requireInteraction: false,
        buttons: [
          { title: "Return to Focus" },
          { title: "Remove Focus Tab" }
        ]
      };

      await chrome.notifications.create(`test-reminder-${Date.now()}`, testNotification);
      this.showFeedback("Test reminder sent!", "success");
    } catch (error) {
      console.error("Error testing reminder:", error);
      this.showFeedback("Failed to send test reminder", "error");
    }
  }

  /**
   * Get reminder title based on current style
   */
  getReminderTitle() {
    const titles = {
      gentle: "Gentle Focus Reminder 🌱",
      standard: "Focus Reminder 🎯",
      assertive: "Focus Alert! ⚡"
    };
    
    return titles[this.preferences.reminderStyle] || titles.standard;
  }

  /**
   * Show feedback message
   */
  showFeedback(message, type = 'info') {
    const feedbackElement = document.getElementById('dr-feedback');
    if (!feedbackElement) return;

    feedbackElement.textContent = message;
    feedbackElement.className = `settings-feedback ${type}`;
    feedbackElement.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      feedbackElement.style.display = 'none';
    }, 3000);
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Update preferences externally
   */
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    if (this.isInitialized) {
      this.createSettingsUI();
    }
  }

  /**
   * Show/hide the settings panel
   */
  toggle(show = null) {
    if (!this.container) return;
    
    if (show === null) {
      show = this.container.style.display === 'none';
    }
    
    this.container.style.display = show ? 'block' : 'none';
    
    if (show) {
      this.loadStatistics();
    }
  }

  /**
   * Cleanup when component is destroyed
   */
  destroy() {
    if (this.container) {
      this.container.remove();
    }
    this.isInitialized = false;
  }
}

// Export for use in popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = DistractionReminderSettings;
} else {
  // Make available globally
  window.DistractionReminderSettings = DistractionReminderSettings;
}