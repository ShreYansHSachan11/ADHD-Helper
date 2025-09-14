/**
 * API Settings UI Component - Manages API key configuration interface
 * Provides secure API key input, validation, and management
 */

class ApiSettingsUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.geminiService = null;
    this.isVisible = false;
    
    // UI elements
    this.settingsToggle = null;
    this.settingsPanel = null;
    this.apiKeyInput = null;
    this.validateButton = null;
    this.saveButton = null;
    this.clearButton = null;
    this.statusMessage = null;
    this.keyStatusIndicator = null;
    
    this.init();
  }

  /**
   * Initialize the API settings UI component
   */
  async init() {
    try {
      // Initialize Gemini service
      if (typeof GeminiService !== 'undefined') {
        this.geminiService = new GeminiService();
        await this.geminiService.init();
      }
      
      // Create UI elements
      this.createSettingsUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load current API key status
      await this.loadCurrentStatus();
      
      console.log("ApiSettingsUI initialized successfully");
    } catch (error) {
      console.error("ApiSettingsUI initialization error:", error);
    }
  }

  /**
   * Create the API settings UI elements
   */
  createSettingsUI() {
    if (!this.container) {
      console.error("API settings container not found");
      return;
    }

    // Create settings section HTML
    const settingsHTML = `
      <div class="api-settings-section">
        <div class="settings-header">
          <button class="settings-toggle-btn" id="apiSettingsToggle">
            <span class="settings-icon">🔑</span>
            <span class="settings-label">API Configuration</span>
            <span class="toggle-arrow">▼</span>
          </button>
          <div class="key-status-indicator" id="keyStatusIndicator">
            <span class="status-dot" id="statusDot"></span>
            <span class="status-text" id="statusText">Not configured</span>
          </div>
        </div>
        
        <div class="settings-panel" id="apiSettingsPanel" style="display: none;">
          <div class="settings-content">
            
            <!-- API Key Configuration -->
            <div class="setting-group">
              <label for="geminiApiKeyInput" class="setting-label">
                Gemini API Key:
              </label>
              <div class="setting-input-group">
                <input
                  type="password"
                  id="geminiApiKeyInput"
                  class="setting-input api-key-input"
                  placeholder="Enter your Gemini API key (AIzaSy...)"
                  title="Enter your Google Gemini API key"
                />
                <button class="btn btn-small btn-secondary" id="toggleApiKeyVisibility" type="button">
                  👁️
                </button>
              </div>
              <div class="setting-description">
                Your API key is encrypted and stored locally. 
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener">
                  Get your API key here
                </a>
              </div>
            </div>

            <!-- API Key Actions -->
            <div class="settings-actions">
              <button class="btn btn-secondary btn-small" id="validateApiKey">
                Validate Key
              </button>
              <button class="btn btn-primary btn-small" id="saveApiKey">
                Save Key
              </button>
              <button class="btn btn-danger btn-small" id="clearApiKey">
                Clear Key
              </button>
            </div>

            <!-- API Key Status -->
            <div class="api-key-status" id="apiKeyStatus">
              <div class="status-info">
                <strong>Current Status:</strong>
                <span id="currentKeyStatus">Checking...</span>
              </div>
              <div class="last-validated" id="lastValidated" style="display: none;">
                <strong>Last Validated:</strong>
                <span id="lastValidatedTime"></span>
              </div>
            </div>

            <!-- Status Message -->
            <div class="settings-status" id="apiSettingsStatus" style="display: none;">
              <!-- Status messages will appear here -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert settings HTML into container
    this.container.insertAdjacentHTML('beforeend', settingsHTML);

    // Get references to UI elements
    this.settingsToggle = document.getElementById('apiSettingsToggle');
    this.settingsPanel = document.getElementById('apiSettingsPanel');
    this.apiKeyInput = document.getElementById('geminiApiKeyInput');
    this.toggleVisibilityBtn = document.getElementById('toggleApiKeyVisibility');
    this.validateButton = document.getElementById('validateApiKey');
    this.saveButton = document.getElementById('saveApiKey');
    this.clearButton = document.getElementById('clearApiKey');
    this.statusMessage = document.getElementById('apiSettingsStatus');
    this.keyStatusIndicator = document.getElementById('keyStatusIndicator');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.currentKeyStatus = document.getElementById('currentKeyStatus');
    this.lastValidated = document.getElementById('lastValidated');
    this.lastValidatedTime = document.getElementById('lastValidatedTime');
  }

  /**
   * Setup event listeners for API settings UI
   */
  setupEventListeners() {
    // Settings toggle button
    this.settingsToggle?.addEventListener('click', () => {
      this.toggleSettingsPanel();
    });

    // API key input
    this.apiKeyInput?.addEventListener('input', () => {
      this.validateApiKeyInput();
    });

    // Toggle API key visibility
    this.toggleVisibilityBtn?.addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    // Validate button
    this.validateButton?.addEventListener('click', () => {
      this.handleValidateApiKey();
    });

    // Save button
    this.saveButton?.addEventListener('click', () => {
      this.handleSaveApiKey();
    });

    // Clear button
    this.clearButton?.addEventListener('click', () => {
      this.handleClearApiKey();
    });

    // Enter key to save
    this.apiKeyInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSaveApiKey();
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
   * Toggle API key visibility
   */
  toggleApiKeyVisibility() {
    if (this.apiKeyInput) {
      const isPassword = this.apiKeyInput.type === 'password';
      this.apiKeyInput.type = isPassword ? 'text' : 'password';
      
      if (this.toggleVisibilityBtn) {
        this.toggleVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
      }
    }
  }

  /**
   * Validate API key input format
   */
  validateApiKeyInput() {
    if (!this.apiKeyInput) return false;
    
    const value = this.apiKeyInput.value.trim();
    const isValid = value.startsWith('AIzaSy') && value.length >= 30;
    
    // Update input styling
    if (value.length === 0) {
      this.apiKeyInput.classList.remove('valid', 'invalid');
    } else if (isValid) {
      this.apiKeyInput.classList.remove('invalid');
      this.apiKeyInput.classList.add('valid');
    } else {
      this.apiKeyInput.classList.remove('valid');
      this.apiKeyInput.classList.add('invalid');
    }
    
    return isValid;
  }

  /**
   * Handle validate API key button click
   */
  async handleValidateApiKey() {
    try {
      if (!this.geminiService) {
        throw new Error("Gemini service not available");
      }

      const apiKey = this.apiKeyInput?.value?.trim();
      if (!apiKey) {
        this.showStatusMessage("Please enter an API key", "error");
        return;
      }

      if (!this.validateApiKeyInput()) {
        this.showStatusMessage("Invalid API key format", "error");
        return;
      }

      this.showStatusMessage("Validating API key...", "info");
      this.validateButton.disabled = true;

      const isValid = await this.geminiService.validateApiKey(apiKey);
      
      if (isValid) {
        this.showStatusMessage("API key is valid!", "success");
        this.updateKeyStatus('valid', 'Valid');
      } else {
        this.showStatusMessage("API key validation failed", "error");
        this.updateKeyStatus('invalid', 'Invalid');
      }
      
    } catch (error) {
      console.error("Error validating API key:", error);
      this.showStatusMessage("Error validating API key: " + error.message, "error");
    } finally {
      this.validateButton.disabled = false;
    }
  }

  /**
   * Handle save API key button click
   */
  async handleSaveApiKey() {
    try {
      if (!this.geminiService) {
        throw new Error("Gemini service not available");
      }

      const apiKey = this.apiKeyInput?.value?.trim();
      if (!apiKey) {
        this.showStatusMessage("Please enter an API key", "error");
        return;
      }

      if (!this.validateApiKeyInput()) {
        this.showStatusMessage("Invalid API key format", "error");
        return;
      }

      this.showStatusMessage("Saving API key...", "info");
      this.saveButton.disabled = true;

      const success = await this.geminiService.saveApiKey(apiKey);
      
      if (success) {
        this.showStatusMessage("API key saved successfully!", "success");
        this.updateKeyStatus('configured', 'Configured');
        this.updateLastValidated();
        
        // Clear the input for security
        if (this.apiKeyInput) {
          this.apiKeyInput.value = '';
        }
      } else {
        this.showStatusMessage("Failed to save API key", "error");
      }
      
    } catch (error) {
      console.error("Error saving API key:", error);
      this.showStatusMessage("Error saving API key: " + error.message, "error");
    } finally {
      this.saveButton.disabled = false;
    }
  }

  /**
   * Handle clear API key button click
   */
  async handleClearApiKey() {
    try {
      if (!this.geminiService) {
        throw new Error("Gemini service not available");
      }

      const confirmed = confirm("Are you sure you want to clear the stored API key?");
      if (!confirmed) {
        return;
      }

      this.showStatusMessage("Clearing API key...", "info");
      this.clearButton.disabled = true;

      const success = await this.geminiService.clearApiKey();
      
      if (success) {
        this.showStatusMessage("API key cleared successfully", "success");
        this.updateKeyStatus('not_configured', 'Not configured');
        
        // Clear the input
        if (this.apiKeyInput) {
          this.apiKeyInput.value = '';
          this.apiKeyInput.classList.remove('valid', 'invalid');
        }
      } else {
        this.showStatusMessage("Failed to clear API key", "error");
      }
      
    } catch (error) {
      console.error("Error clearing API key:", error);
      this.showStatusMessage("Error clearing API key: " + error.message, "error");
    } finally {
      this.clearButton.disabled = false;
    }
  }

  /**
   * Load current API key status
   */
  async loadCurrentStatus() {
    try {
      if (!this.geminiService) {
        this.updateKeyStatus('not_configured', 'Service unavailable');
        return;
      }

      const isConfigured = this.geminiService.isConfigured();
      
      if (isConfigured) {
        this.updateKeyStatus('configured', 'Configured');
        this.updateLastValidated();
      } else {
        this.updateKeyStatus('not_configured', 'Not configured');
      }
      
    } catch (error) {
      console.error("Error loading current status:", error);
      this.updateKeyStatus('error', 'Error loading status');
    }
  }

  /**
   * Update key status indicator
   */
  updateKeyStatus(status, text) {
    if (this.statusDot) {
      this.statusDot.className = `status-dot ${status}`;
    }
    
    if (this.statusText) {
      this.statusText.textContent = text;
    }
    
    if (this.currentKeyStatus) {
      this.currentKeyStatus.textContent = text;
    }
  }

  /**
   * Update last validated timestamp
   */
  updateLastValidated() {
    if (this.lastValidated && this.lastValidatedTime) {
      this.lastValidated.style.display = 'block';
      this.lastValidatedTime.textContent = new Date().toLocaleString();
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
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (this.statusMessage) {
        this.statusMessage.style.display = 'none';
      }
    }, 5000);
  }

  /**
   * Get current API key configuration status
   */
  getConfigurationStatus() {
    return {
      isConfigured: this.geminiService ? this.geminiService.isConfigured() : false,
      hasService: !!this.geminiService
    };
  }

  /**
   * Destroy the API settings UI component
   */
  destroy() {
    try {
      // Remove event listeners
      this.settingsToggle?.removeEventListener('click', this.toggleSettingsPanel);
      
      // Clear references
      this.geminiService = null;
      this.container = null;
      this.settingsToggle = null;
      this.settingsPanel = null;
      this.apiKeyInput = null;
      this.validateButton = null;
      this.saveButton = null;
      this.clearButton = null;
      this.statusMessage = null;
      this.keyStatusIndicator = null;
      
      console.log("ApiSettingsUI destroyed");
    } catch (error) {
      console.error("Error destroying ApiSettingsUI:", error);
    }
  }
}

// Export for use in popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = ApiSettingsUI;
} else if (typeof window !== "undefined") {
  window.ApiSettingsUI = ApiSettingsUI;
}