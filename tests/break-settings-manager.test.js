/**
 * Break Settings Manager Tests
 * Tests for break reminder settings and configuration functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('BreakSettingsManager', () => {
  let settingsManager;
  let mockStorageManager;

  beforeEach(async () => {
    // Mock StorageManager
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    };

    // Mock global dependencies
    global.StorageManager = vi.fn(() => mockStorageManager);
    global.importScripts = vi.fn();

    // Import the class dynamically
    const { default: BreakSettingsManager } = await import('../services/break-settings-manager.js');
    settingsManager = new BreakSettingsManager();
    settingsManager.storageManager = mockStorageManager;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default settings when no stored settings exist', async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);

      await settingsManager.loadSettings();

      expect(settingsManager.settings).toEqual(settingsManager.DEFAULT_SETTINGS);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'breakSettings',
        settingsManager.DEFAULT_SETTINGS
      );
    });

    test('should load existing settings from storage', async () => {
      const existingSettings = {
        workTimeThresholdMinutes: 45,
        notificationsEnabled: false,
        breakTypes: {
          short: { duration: 10, label: "Short Break (10 min)" },
          medium: { duration: 20, label: "Medium Break (20 min)" },
          long: { duration: 40, label: "Long Break (40 min)" }
        },
        version: 1
      };

      mockStorageManager.get.mockResolvedValue(existingSettings);

      await settingsManager.loadSettings();

      expect(settingsManager.settings).toEqual({
        ...settingsManager.DEFAULT_SETTINGS,
        ...existingSettings
      });
    });

    test('should handle storage errors gracefully', async () => {
      mockStorageManager.get.mockRejectedValue(new Error('Storage error'));

      await settingsManager.loadSettings();

      expect(settingsManager.settings).toEqual(settingsManager.DEFAULT_SETTINGS);
    });
  });

  describe('Settings Getters', () => {
    beforeEach(async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);
      await settingsManager.loadSettings();
    });

    test('should return work time threshold in minutes', () => {
      const minutes = settingsManager.getWorkTimeThresholdMinutes();
      expect(minutes).toBe(30);
    });

    test('should return work time threshold in milliseconds', () => {
      const ms = settingsManager.getWorkTimeThresholdMs();
      expect(ms).toBe(30 * 60 * 1000);
    });

    test('should return notifications enabled status', () => {
      const enabled = settingsManager.areNotificationsEnabled();
      expect(enabled).toBe(true);
    });

    test('should return break types configuration', () => {
      const breakTypes = settingsManager.getBreakTypes();
      expect(breakTypes).toEqual(settingsManager.DEFAULT_SETTINGS.breakTypes);
    });

    test('should return copy of settings', () => {
      const settings = settingsManager.getSettings();
      expect(settings).toEqual(settingsManager.settings);
      expect(settings).not.toBe(settingsManager.settings); // Should be a copy
    });
  });

  describe('Settings Updates', () => {
    beforeEach(async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);
      await settingsManager.loadSettings();
    });

    test('should update work time threshold successfully', async () => {
      const newThreshold = 45;
      const success = await settingsManager.updateWorkTimeThreshold(newThreshold);

      expect(success).toBe(true);
      expect(settingsManager.settings.workTimeThresholdMinutes).toBe(newThreshold);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'breakSettings',
        expect.objectContaining({ workTimeThresholdMinutes: newThreshold })
      );
    });

    test('should reject invalid work time threshold', async () => {
      const invalidThresholds = [0, -5, 200, 3.5, 'invalid'];

      for (const threshold of invalidThresholds) {
        const success = await settingsManager.updateWorkTimeThreshold(threshold);
        expect(success).toBe(false);
      }
    });

    test('should update notifications enabled setting', async () => {
      const success = await settingsManager.updateNotificationsEnabled(false);

      expect(success).toBe(true);
      expect(settingsManager.settings.notificationsEnabled).toBe(false);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'breakSettings',
        expect.objectContaining({ notificationsEnabled: false })
      );
    });

    test('should reject invalid notifications enabled value', async () => {
      const invalidValues = ['true', 1, 0, null, undefined];

      for (const value of invalidValues) {
        const success = await settingsManager.updateNotificationsEnabled(value);
        expect(success).toBe(false);
      }
    });

    test('should update break types configuration', async () => {
      const newBreakTypes = {
        short: { duration: 3, label: "Quick Break (3 min)" },
        medium: { duration: 10, label: "Medium Break (10 min)" },
        long: { duration: 25, label: "Long Break (25 min)" }
      };

      const success = await settingsManager.updateBreakTypes(newBreakTypes);

      expect(success).toBe(true);
      expect(settingsManager.settings.breakTypes).toEqual(newBreakTypes);
    });

    test('should reject invalid break types configuration', async () => {
      const invalidBreakTypes = [
        null,
        undefined,
        'invalid',
        {},
        { short: { duration: 'invalid' } },
        { short: { duration: 5 } }, // Missing label
        { short: { duration: 5, label: "Short" } } // Missing other types
      ];

      for (const breakTypes of invalidBreakTypes) {
        const success = await settingsManager.updateBreakTypes(breakTypes);
        expect(success).toBe(false);
      }
    });

    test('should update multiple settings at once', async () => {
      const newSettings = {
        workTimeThresholdMinutes: 60,
        notificationsEnabled: false
      };

      const success = await settingsManager.updateSettings(newSettings);

      expect(success).toBe(true);
      expect(settingsManager.settings.workTimeThresholdMinutes).toBe(60);
      expect(settingsManager.settings.notificationsEnabled).toBe(false);
    });

    test('should handle storage save errors', async () => {
      mockStorageManager.set.mockResolvedValue(false);

      const success = await settingsManager.updateWorkTimeThreshold(45);

      expect(success).toBe(false);
    });
  });

  describe('Settings Reset', () => {
    test('should reset settings to defaults', async () => {
      // First modify settings
      settingsManager.settings = {
        workTimeThresholdMinutes: 60,
        notificationsEnabled: false,
        breakTypes: {},
        version: 1
      };

      mockStorageManager.set.mockResolvedValue(true);

      const success = await settingsManager.resetToDefaults();

      expect(success).toBe(true);
      expect(settingsManager.settings).toEqual(settingsManager.DEFAULT_SETTINGS);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'breakSettings',
        settingsManager.DEFAULT_SETTINGS
      );
    });
  });

  describe('Settings Validation', () => {
    test('should validate work time threshold correctly', () => {
      expect(settingsManager.isValidWorkTimeThreshold(5)).toBe(true);
      expect(settingsManager.isValidWorkTimeThreshold(30)).toBe(true);
      expect(settingsManager.isValidWorkTimeThreshold(180)).toBe(true);

      expect(settingsManager.isValidWorkTimeThreshold(4)).toBe(false);
      expect(settingsManager.isValidWorkTimeThreshold(181)).toBe(false);
      expect(settingsManager.isValidWorkTimeThreshold(30.5)).toBe(false);
      expect(settingsManager.isValidWorkTimeThreshold('30')).toBe(false);
      expect(settingsManager.isValidWorkTimeThreshold(null)).toBe(false);
    });

    test('should validate break types correctly', () => {
      const validBreakTypes = {
        short: { duration: 5, label: "Short Break" },
        medium: { duration: 15, label: "Medium Break" },
        long: { duration: 30, label: "Long Break" }
      };

      expect(settingsManager.isValidBreakTypes(validBreakTypes)).toBe(true);

      const invalidBreakTypes = [
        null,
        undefined,
        {},
        { short: { duration: 5 } }, // Missing label
        { short: { duration: 'invalid', label: "Short" } }, // Invalid duration
        { short: { duration: 5, label: "Short" } } // Missing other types
      ];

      invalidBreakTypes.forEach(breakTypes => {
        expect(settingsManager.isValidBreakTypes(breakTypes)).toBe(false);
      });
    });

    test('should validate settings object correctly', () => {
      const validSettings = {
        workTimeThresholdMinutes: 45,
        notificationsEnabled: false
      };

      const validated = settingsManager.validateSettings(validSettings);
      expect(validated).toEqual(validSettings);

      expect(() => {
        settingsManager.validateSettings({ workTimeThresholdMinutes: 'invalid' });
      }).toThrow();

      expect(() => {
        settingsManager.validateSettings({ notificationsEnabled: 'invalid' });
      }).toThrow();
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);
      await settingsManager.loadSettings();
    });

    test('should export settings as JSON', () => {
      const exported = settingsManager.exportSettings();
      const parsed = JSON.parse(exported);
      expect(parsed).toEqual(settingsManager.settings);
    });

    test('should import valid settings from JSON', async () => {
      const settingsToImport = {
        workTimeThresholdMinutes: 45,
        notificationsEnabled: false
      };

      const success = await settingsManager.importSettings(JSON.stringify(settingsToImport));

      expect(success).toBe(true);
      expect(settingsManager.settings.workTimeThresholdMinutes).toBe(45);
      expect(settingsManager.settings.notificationsEnabled).toBe(false);
    });

    test('should reject invalid JSON during import', async () => {
      const success = await settingsManager.importSettings('invalid json');
      expect(success).toBe(false);
    });

    test('should reject invalid settings during import', async () => {
      const invalidSettings = { workTimeThresholdMinutes: 'invalid' };
      const success = await settingsManager.importSettings(JSON.stringify(invalidSettings));
      expect(success).toBe(false);
    });
  });

  describe('Settings Summary', () => {
    beforeEach(async () => {
      mockStorageManager.get.mockResolvedValue(null);
      mockStorageManager.set.mockResolvedValue(true);
      await settingsManager.loadSettings();
    });

    test('should return settings summary', () => {
      const summary = settingsManager.getSettingsSummary();

      expect(summary).toEqual({
        workTimeThreshold: '30 minutes',
        notificationsEnabled: 'Enabled',
        breakTypesCount: 3,
        version: 1
      });
    });
  });

  describe('Settings Migration', () => {
    test('should handle settings migration', async () => {
      const oldSettings = {
        workTimeThresholdMinutes: 30,
        notificationsEnabled: true,
        version: 0 // Old version
      };

      mockStorageManager.get.mockResolvedValue(oldSettings);
      mockStorageManager.set.mockResolvedValue(true);

      await settingsManager.loadSettings();

      expect(settingsManager.settings.version).toBe(settingsManager.DEFAULT_SETTINGS.version);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'breakSettings',
        expect.objectContaining({ version: settingsManager.DEFAULT_SETTINGS.version })
      );
    });
  });
});