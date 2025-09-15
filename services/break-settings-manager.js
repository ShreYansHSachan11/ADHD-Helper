/**
 * Break Settings Manager - Handles break reminder settings and configuration
 * Manages work time threshold, notification preferences, and settings persistence
 */

class BreakSettingsManager {
  constructor() {
    this.storageManager = null;
    this.settings = null;
    
    // Storage key for break settings
    this.STORAGE_KEY = 'breakSettings';
    
    // Default settings configuration
    this.DEFAULT_SETTINGS = {
      workTimeThresholdMinutes: 5,
      notificationsEnabled: true,
      breakTypes: {
        short: { duration: 5, label: "Short Break (5 min)" },
        medium: { duration: 15, label: "Medium Break (15 min)" },
        long: { duration: 30, label: "Long Break (30 min)" }
      },
      version: 1 // For future migrations
    };
    
    this.init();
  }

  /**
   * Initialize the settings manager
   */
  async init() {
    try {
      // Initialize storage manager (avoid duplicate imports)
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
      } else {
        console.warn('StorageManager not available');
      }
      
      // Load existing settings or initialize defaults
      await this.loadSettings();
      
      console.log("BreakSettingsManager initialized successfully");
    } catch (error) {
      console.error("BreakSettingsManager initialization error:", error);
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const storedSettings = await this.storageManager.get(this.STORAGE_KEY);
      
      if (storedSettings) {
        // Merge with defaults to handle missing properties
        this.settings = { ...this.DEFAULT_SETTINGS, ...storedSettings };
        
        // Handle version migrations if needed
        await this.migrateSettings();
      } else {
        // Initialize with default settings
        this.settings = { ...this.DEFAULT_SETTINGS };
        await this.saveSettings();
      }
      
      console.log("Break settings loaded:", this.settings);
    } catch (error) {
      console.error("Error loading break settings:", error);
      // Fallback to defaults
      this.settings = { ...this.DEFAULT_SETTINGS };
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      if (!this.settings) {
        throw new Error("No settings to save");
      }
      
      const success = await this.storageManager.set(this.STORAGE_KEY, this.settings);
      
      if (success) {
        console.log("Break settings saved successfully");
      } else {
        throw new Error("Failed to save settings to storage");
      }
      
      return success;
    } catch (error) {
      console.error("Error saving break settings:", error);
      return false;
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return this.settings ? { ...this.settings } : { ...this.DEFAULT_SETTINGS };
  }

  /**
   * Get work time threshold in minutes
   */
  getWorkTimeThresholdMinutes() {
    return this.settings?.workTimeThresholdMinutes || this.DEFAULT_SETTINGS.workTimeThresholdMinutes;
  }

  /**
   * Get work time threshold in milliseconds
   */
  getWorkTimeThresholdMs() {
    return this.getWorkTimeThresholdMinutes() * 60 * 1000;
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled() {
    return this.settings?.notificationsEnabled !== false; // Default to true
  }

  /**
   * Get break types configuration
   */
  getBreakTypes() {
    return this.settings?.breakTypes || this.DEFAULT_SETTINGS.breakTypes;
  }

  /**
   * Update work time threshold
   */
  async updateWorkTimeThreshold(minutes) {
    try {
      // Validate input
      if (!this.isValidWorkTimeThreshold(minutes)) {
        throw new Error(`Invalid work time threshold: ${minutes} minutes`);
      }
      
      this.settings.workTimeThresholdMinutes = minutes;
      const success = await this.saveSettings();
      
      if (success) {
        console.log(`Work time threshold updated to ${minutes} minutes`);
      }
      
      return success;
    } catch (error) {
      console.error("Error updating work time threshold:", error);
      return false;
    }
  }

  /**
   * Update notifications enabled setting
   */
  async updateNotificationsEnabled(enabled) {
    try {
      if (typeof enabled !== 'boolean') {
        throw new Error(`Invalid notifications enabled value: ${enabled}`);
      }
      
      this.settings.notificationsEnabled = enabled;
      const success = await this.saveSettings();
      
      if (success) {
        console.log(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
      }
      
      return success;
    } catch (error) {
      console.error("Error updating notifications setting:", error);
      return false;
    }
  }

  /**
   * Update break types configuration
   */
  async updateBreakTypes(breakTypes) {
    try {
      // Validate break types
      if (!this.isValidBreakTypes(breakTypes)) {
        throw new Error("Invalid break types configuration");
      }
      
      this.settings.breakTypes = { ...breakTypes };
      const success = await this.saveSettings();
      
      if (success) {
        console.log("Break types updated:", breakTypes);
      }
      
      return success;
    } catch (error) {
      console.error("Error updating break types:", error);
      return false;
    }
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(newSettings) {
    try {
      // Validate all settings
      const validatedSettings = this.validateSettings(newSettings);
      
      // Merge with current settings
      this.settings = { ...this.settings, ...validatedSettings };
      
      const success = await this.saveSettings();
      
      if (success) {
        console.log("Settings updated successfully:", validatedSettings);
      }
      
      return success;
    } catch (error) {
      console.error("Error updating settings:", error);
      return false;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults() {
    try {
      this.settings = { ...this.DEFAULT_SETTINGS };
      const success = await this.saveSettings();
      
      if (success) {
        console.log("Settings reset to defaults");
      }
      
      return success;
    } catch (error) {
      console.error("Error resetting settings:", error);
      return false;
    }
  }

  /**
   * Validate work time threshold
   */
  isValidWorkTimeThreshold(minutes) {
    return (
      typeof minutes === 'number' &&
      minutes >= 5 &&
      minutes <= 180 &&
      Number.isInteger(minutes)
    );
  }

  /**
   * Validate break types configuration
   */
  isValidBreakTypes(breakTypes) {
    if (!breakTypes || typeof breakTypes !== 'object') {
      return false;
    }
    
    const requiredTypes = ['short', 'medium', 'long'];
    
    for (const type of requiredTypes) {
      if (!breakTypes[type] || 
          typeof breakTypes[type].duration !== 'number' ||
          typeof breakTypes[type].label !== 'string' ||
          breakTypes[type].duration <= 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate settings object
   */
  validateSettings(settings) {
    const validated = {};
    
    // Validate work time threshold
    if (settings.workTimeThresholdMinutes !== undefined) {
      if (this.isValidWorkTimeThreshold(settings.workTimeThresholdMinutes)) {
        validated.workTimeThresholdMinutes = settings.workTimeThresholdMinutes;
      } else {
        throw new Error(`Invalid work time threshold: ${settings.workTimeThresholdMinutes}`);
      }
    }
    
    // Validate notifications enabled
    if (settings.notificationsEnabled !== undefined) {
      if (typeof settings.notificationsEnabled === 'boolean') {
        validated.notificationsEnabled = settings.notificationsEnabled;
      } else {
        throw new Error(`Invalid notifications enabled value: ${settings.notificationsEnabled}`);
      }
    }
    
    // Validate break types
    if (settings.breakTypes !== undefined) {
      if (this.isValidBreakTypes(settings.breakTypes)) {
        validated.breakTypes = settings.breakTypes;
      } else {
        throw new Error("Invalid break types configuration");
      }
    }
    
    return validated;
  }

  /**
   * Handle settings migrations for future versions
   */
  async migrateSettings() {
    try {
      const currentVersion = this.settings.version || 1;
      
      if (currentVersion < this.DEFAULT_SETTINGS.version) {
        console.log(`Migrating settings from version ${currentVersion} to ${this.DEFAULT_SETTINGS.version}`);
        
        // Add migration logic here for future versions
        // For now, just update the version
        this.settings.version = this.DEFAULT_SETTINGS.version;
        
        await this.saveSettings();
        console.log("Settings migration completed");
      }
    } catch (error) {
      console.error("Error during settings migration:", error);
    }
  }

  /**
   * Export settings for backup
   */
  exportSettings() {
    return JSON.stringify(this.getSettings(), null, 2);
  }

  /**
   * Import settings from backup
   */
  async importSettings(settingsJson) {
    try {
      const importedSettings = JSON.parse(settingsJson);
      const validatedSettings = this.validateSettings(importedSettings);
      
      return await this.updateSettings(validatedSettings);
    } catch (error) {
      console.error("Error importing settings:", error);
      return false;
    }
  }

  /**
   * Get settings summary for display
   */
  getSettingsSummary() {
    const settings = this.getSettings();
    
    return {
      workTimeThreshold: `${settings.workTimeThresholdMinutes} minutes`,
      notificationsEnabled: settings.notificationsEnabled ? 'Enabled' : 'Disabled',
      breakTypesCount: Object.keys(settings.breakTypes).length,
      version: settings.version
    };
  }
}

// Export for use in service worker and popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreakSettingsManager;
} else {
  // Make available globally in service worker context
  globalThis.BreakSettingsManager = BreakSettingsManager;
}