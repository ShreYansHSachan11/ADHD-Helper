/**
 * Break Settings UI Component - Handles break reminder settings interface
 * Provides UI for work time threshold and notification preferences
 */

class BreakSettingsUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.settingsManager = null;
    this.isVisible = false;
    
    // UI elements
    this.settingsToggle = null;
    this.settingsPanel = null;
    this.workTimeThresholdInput = null;
    this.notificationsToggle = null;
    this.saveButton = null;
    this.resetButton = null;
    this.statusMessage = null;
    
    this.init();
  }

  /**
   * Initialize the settings UI component
   */
  async init() {
    try {
      // Initialize settings manager
      this.settingsManager = new BreakSettingsManager();
      await this.settingsManager.init();
      
      // Create UI elements
      this.createSettingsUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load current settings
      await this.loadCurrentSettings();
      
      console.log("BreakSettingsUI initialized successfully");
    } catch (error) {
      console.error("BreakSettingsUI initialization error:", error);
    }
  }

  /**
   * Create the settings UI elements
   */
  createSettingsUI() {
    if (!this.container) {
      console.error("Settings container not found");
      return;
    }

    // Create settings section HTML
    const settingsHTML = `
      <div class="break-settings-section">
        <div class="settings-header">
          <button class="settings-toggle-btn" id="breakSettingsToggle">
            <span class="settings-icon">⚙️</span>
            <span class="settings-label">Settings</span>
            <span class="toggle-arrow">▼</span>
          </button>
        </div>
        
        <div class="settings-panel" id="breakSettingsPanel" style="display: none;">
          <div class="settings-content">
            
            <!-- Work Time Threshold Setting -->
            <div class="setting-group">
              <label for="workTimeThresholdSetting" class="setting-label">
                Break reminder after:
              </label>
              <div class="setting-input-group">
                <input
                  type="number"
                  id="workTimeThresholdSetting"
                  class="setting-input"
                  min="5"
                  max="180"
                  step="5"
                  title="Set work time before break reminder (5-180 minutes)"
                />
                <span class="input-suffix">minutes</span>
              </div>
              <div class="setting-description">
                How long to work before showing break reminders
              </div>
            </div>

            <!-- Notifications Toggle Setting -->
            <div class="setting-group">
              <label class="setting-label">
                Break notifications:
              </label>
              <div class="setting-toggle-group">
                <label class="toggle-switch">
                  <input
                    type="checkbox"
                    id="notificationsToggleSetting"
                    class="toggle-input"
                  />
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label" id="notificationsToggleLabel">Enabled</span>
              </div>
              <div class="setting-description">
                Show browser notifications for break reminders
              </div>
            </div>

            <!-- Settings Actions -->
            <div class="settings-actions">
              <button class="btn btn-primary btn-small" id="saveBreakSettings">
                Save Settings
              </button>
              <button class="btn btn-secondary btn-small" id="resetBreakSettings">
                Reset to Defaults
              </button>
            </div>

            <!-- Status Message -->
            <div class="settings-status" id="breakSettingsStatus" style="display: none;">
              <!-- Status messages will appear here -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert settings HTML into container
    this.container.insertAdjacentHTML('beforeend', settingsHTML);

    // Get references to UI elements
    this.settingsToggle = document.getElementById('breakSettingsToggle');
    this.settingsPanel = document.getElementById('breakSettingsPanel');
    this.workTimeThresholdInput = document.getElementById('workTimeThresholdSetting');
    this.notificationsToggle = document.getElementById('notificationsToggleSetting');
    this.notificationsToggleLabel = document.getElementById('notificationsToggleLabel');
    this.saveButton = document.getElementById('saveBreakSettings');
    this.resetButton = document.getElementById('resetBreakSettings');
    this.statusMessage = document.getElementById('breakSettingsStatus');
  }

  /**
   * Setup event listeners for settings UI
   */
  setupEventListeners() {
    // Settings toggle button
    this.settingsToggle?.addEventListener('click', () => {
      this.toggleSettingsPanel();
    });

    // Work time threshold input
    this.workTimeThresholdInput?.addEventListener('change', () => {
      this.validateWorkTimeThreshold();
    });

    this.workTimeThresholdInput?.addEventListener('input', () => {
      this.validateWorkTimeThreshold();
    });

    // Notifications toggle
    this.notificationsToggle?.addEventListener('change', () => {
      this.updateNotificationsToggleLabel();
    });

    // Save button
    this.saveButton?.addEventListener('click', () => {
      this.handleSaveSettings();
    });

    // Reset button
    this.resetButton?.addEventListener('click', () => {
      this.handleResetSettings();
    });

    // Enter key to save
    this.workTimeThresholdInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSaveSettings();
      }
    });
  }

  /**
   * Toggle settings panel visibility
   */
  toggleSettingsPanel() {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.showSettingsPanel();
    } else {
      this.hideSettingsPanel();
    }
  }

  /**
   * Show settings panel
   */
  showSettingsPanel() {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'block';
      this.settingsToggle?.classList.add('active');
      
      // Update arrow direction
      const arrow = this.settingsToggle?.querySelector('.toggle-arrow');
      if (arrow) {
        arrow.textContent = '▲';
      }
      
      this.isVisible = true;
    }
  }

  /**
   * Hide settings panel
   */
  hideSettingsPanel() {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'none';
      this.settingsToggle?.classList.remove('active');
      
      // Update arrow direction
      const arrow = this.settingsToggle?.querySelector('.toggle-arrow');
      if (arrow) {
        arrow.textContent = '▼';
      }
      
      this.isVisible = false;
    }
  }

  /**
   * Load current settings into UI
   */
  async loadCurrentSettings() {
    try {
      if (!this.settingsManager) {
        return;
      }

      const settings = this.settingsManager.getSettings();
      
      // Load work time threshold
      if (this.workTimeThresholdInput) {
        this.workTimeThresholdInput.value = settings.workTimeThresholdMinutes;
      }
      
      // Load notifications setting
      if (this.notificationsToggle) {
        this.notificationsToggle.checked = settings.notificationsEnabled;
        this.updateNotificationsToggleLabel();
      }
      
      console.log("Current settings loaded into UI");
    } catch (error) {
      console.error("Error loading current settings:", error);
      this.showStatusMessage("Error loading settings", "error");
    }
  }

  /**
   * Validate work time threshold input
   */
  validateWorkTimeThreshold() {
    if (!this.workTimeThresholdInput) return true;
    
    const value = parseInt(this.workTimeThresholdInput.value);
    const isValid = this.settingsManager?.isValidWorkTimeThreshold(value);
    
    // Update input styling
    if (isValid) {
      this.workTimeThresholdInput.classList.remove('invalid');
      this.workTimeThresholdInput.classList.add('valid');
    } else {
      this.workTimeThresholdInput.classList.remove('valid');
      this.workTimeThresholdInput.classList.add('invalid');
    }
    
    return isValid;
  }

  /**
   * Update notifications toggle label
   */
  updateNotificationsToggleLabel() {
    if (this.notificationsToggleLabel && this.notificationsToggle) {
      this.notificationsToggleLabel.textContent = 
        this.notificationsToggle.checked ? 'Enabled' : 'Disabled';
    }
  }

  /**
   * Handle save settings button click
   */
  async handleSaveSettings() {
    try {
      if (!this.settingsManager) {
        throw new Error("Settings manager not available");
      }

      // Validate inputs
      if (!this.validateWorkTimeThreshold()) {
        this.showStatusMessage("Invalid work time threshold (5-180 minutes)", "error");
        return;
      }

      // Collect settings from UI
      const newSettings = {
        workTimeThresholdMinutes: parseInt(this.workTimeThresholdInput.value),
        notificationsEnabled: this.notificationsToggle.checked
      };

      // Save settings
      const success = await this.settingsManager.updateSettings(newSettings);
      
      if (success) {
        this.showStatusMessage("Settings saved successfully!", "success");
        
        // Notify other components about settings change
        this.notifySettingsChanged(newSettings);
      } else {
        this.showStatusMessage("Failed to save settings", "error");
      }
      
    } catch (error) {
      console.error("Error saving settings:", error);
      this.showStatusMessage("Error saving settings", "error");
    }
  }

  /**
   * Handle reset settings button click
   */
  async handleResetSettings() {
    try {
      if (!this.settingsManager) {
        throw new Error("Settings manager not available");
      }

      // Reset without confirmation

      // Reset settings
      const success = await this.settingsManager.resetToDefaults();
      
      if (success) {
        // Reload UI with default settings
        await this.loadCurrentSettings();
        this.showStatusMessage("Settings reset to defaults", "success");
        
        // Notify other components about settings change
        const defaultSettings = this.settingsManager.getSettings();
        this.notifySettingsChanged(defaultSettings);
      } else {
        this.showStatusMessage("Failed to reset settings", "error");
      }
      
    } catch (error) {
      console.error("Error resetting settings:", error);
      this.showStatusMessage("Error resetting settings", "error");
    }
  }

  /**
   * Show status message
   */
  showStatusMessage(message, type = "info") {
    if (!this.statusMessage) return;
    
    this.statusMessage.textContent = message;
    this.statusMessage.className = `settings-status ${type}`;
    this.statusMessage.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (this.statusMessage) {
        this.statusMessage.style.display = 'none';
      }
    }, 3000);
  }

  /**
   * Notify other components about settings changes
   */
  notifySettingsChanged(newSettings) {
    try {
      // Dispatch custom event for other components to listen to
      const event = new CustomEvent('breakSettingsChanged', {
        detail: newSettings
      });
      
      document.dispatchEvent(event);
      
      console.log("Settings change notification sent:", newSettings);
    } catch (error) {
      console.error("Error notifying settings change:", error);
    }
  }

  /**
   * Get current settings from UI
   */
  getCurrentUISettings() {
    return {
      workTimeThresholdMinutes: parseInt(this.workTimeThresholdInput?.value || 30),
      notificationsEnabled: this.notificationsToggle?.checked !== false
    };
  }

  /**
   * Update UI with new settings (for external updates)
   */
  async updateUI(newSettings) {
    try {
      if (newSettings.workTimeThresholdMinutes !== undefined && this.workTimeThresholdInput) {
        this.workTimeThresholdInput.value = newSettings.workTimeThresholdMinutes;
      }
      
      if (newSettings.notificationsEnabled !== undefined && this.notificationsToggle) {
        this.notificationsToggle.checked = newSettings.notificationsEnabled;
        this.updateNotificationsToggleLabel();
      }
      
      console.log("Settings UI updated with new settings");
    } catch (error) {
      console.error("Error updating settings UI:", error);
    }
  }

  /**
   * Destroy the settings UI component
   */
  destroy() {
    try {
      // Remove event listeners
      this.settingsToggle?.removeEventListener('click', this.toggleSettingsPanel);
      
      // Clear references
      this.settingsManager = null;
      this.container = null;
      this.settingsToggle = null;
      this.settingsPanel = null;
      this.workTimeThresholdInput = null;
      this.notificationsToggle = null;
      this.saveButton = null;
      this.resetButton = null;
      this.statusMessage = null;
      
      console.log("BreakSettingsUI destroyed");
    } catch (error) {
      console.error("Error destroying BreakSettingsUI:", error);
    }
  }
}

// Export for use in popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreakSettingsUI;
} else if (typeof window !== "undefined") {
  window.BreakSettingsUI = BreakSettingsUI;
}