/**
 * Break Settings UI Tests
 * Tests for break reminder settings interface functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('BreakSettingsUI', () => {
  let settingsUI;
  let mockContainer;
  let mockSettingsManager;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="testContainer"></div>
    `;

    mockContainer = document.getElementById('testContainer');

    // Mock BreakSettingsManager
    mockSettingsManager = {
      init: vi.fn().mockResolvedValue(),
      getSettings: vi.fn().mockReturnValue({
        workTimeThresholdMinutes: 30,
        notificationsEnabled: true,
        breakTypes: {
          short: { duration: 5, label: "Short Break (5 min)" },
          medium: { duration: 15, label: "Medium Break (15 min)" },
          long: { duration: 30, label: "Long Break (30 min)" }
        },
        version: 1
      }),
      updateSettings: vi.fn().mockResolvedValue(true),
      updateWorkTimeThreshold: vi.fn().mockResolvedValue(true),
      updateNotificationsEnabled: vi.fn().mockResolvedValue(true),
      resetToDefaults: vi.fn().mockResolvedValue(true),
      isValidWorkTimeThreshold: vi.fn().mockReturnValue(true)
    };

    global.BreakSettingsManager = vi.fn(() => mockSettingsManager);

    // Import the class
    const BreakSettingsUI = require('../popup/components/break-settings-ui.js');
    settingsUI = new BreakSettingsUI('testContainer');
    settingsUI.settingsManager = mockSettingsManager;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    test('should create settings UI elements', () => {
      settingsUI.createSettingsUI();

      expect(mockContainer.querySelector('.break-settings-section')).toBeTruthy();
      expect(mockContainer.querySelector('#breakSettingsToggle')).toBeTruthy();
      expect(mockContainer.querySelector('#breakSettingsPanel')).toBeTruthy();
      expect(mockContainer.querySelector('#workTimeThresholdSetting')).toBeTruthy();
      expect(mockContainer.querySelector('#notificationsToggleSetting')).toBeTruthy();
      expect(mockContainer.querySelector('#saveBreakSettings')).toBeTruthy();
      expect(mockContainer.querySelector('#resetBreakSettings')).toBeTruthy();
    });

    test('should initialize with settings manager', async () => {
      await settingsUI.init();

      expect(mockSettingsManager.init).toHaveBeenCalled();
      expect(settingsUI.settingsManager).toBe(mockSettingsManager);
    });

    test('should load current settings into UI', async () => {
      settingsUI.createSettingsUI();
      await settingsUI.loadCurrentSettings();

      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      const notificationsToggle = mockContainer.querySelector('#notificationsToggleSetting');

      expect(thresholdInput.value).toBe('30');
      expect(notificationsToggle.checked).toBe(true);
    });
  });

  describe('Settings Panel Toggle', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should toggle settings panel visibility', () => {
      const toggleBtn = mockContainer.querySelector('#breakSettingsToggle');
      const panel = mockContainer.querySelector('#breakSettingsPanel');

      // Initially hidden
      expect(panel.style.display).toBe('none');
      expect(settingsUI.isVisible).toBe(false);

      // Show panel
      settingsUI.showSettingsPanel();
      expect(panel.style.display).toBe('block');
      expect(settingsUI.isVisible).toBe(true);

      // Hide panel
      settingsUI.hideSettingsPanel();
      expect(panel.style.display).toBe('none');
      expect(settingsUI.isVisible).toBe(false);
    });

    test('should update toggle button state', () => {
      const toggleBtn = mockContainer.querySelector('#breakSettingsToggle');
      const arrow = toggleBtn.querySelector('.toggle-arrow');

      settingsUI.showSettingsPanel();
      expect(toggleBtn.classList.contains('active')).toBe(true);
      expect(arrow.textContent).toBe('▲');

      settingsUI.hideSettingsPanel();
      expect(toggleBtn.classList.contains('active')).toBe(false);
      expect(arrow.textContent).toBe('▼');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should validate work time threshold input', () => {
      const input = mockContainer.querySelector('#workTimeThresholdSetting');

      // Valid input
      input.value = '45';
      mockSettingsManager.isValidWorkTimeThreshold.mockReturnValue(true);
      const isValid = settingsUI.validateWorkTimeThreshold();

      expect(isValid).toBe(true);
      expect(input.classList.contains('valid')).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);

      // Invalid input
      input.value = '200';
      mockSettingsManager.isValidWorkTimeThreshold.mockReturnValue(false);
      const isInvalid = settingsUI.validateWorkTimeThreshold();

      expect(isInvalid).toBe(false);
      expect(input.classList.contains('invalid')).toBe(true);
      expect(input.classList.contains('valid')).toBe(false);
    });

    test('should update notifications toggle label', () => {
      const toggle = mockContainer.querySelector('#notificationsToggleSetting');
      const label = mockContainer.querySelector('#notificationsToggleLabel');

      toggle.checked = true;
      settingsUI.updateNotificationsToggleLabel();
      expect(label.textContent).toBe('Enabled');

      toggle.checked = false;
      settingsUI.updateNotificationsToggleLabel();
      expect(label.textContent).toBe('Disabled');
    });
  });

  describe('Settings Save', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should save valid settings successfully', async () => {
      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      const notificationsToggle = mockContainer.querySelector('#notificationsToggleSetting');

      thresholdInput.value = '45';
      notificationsToggle.checked = false;

      mockSettingsManager.isValidWorkTimeThreshold.mockReturnValue(true);
      mockSettingsManager.updateSettings.mockResolvedValue(true);

      await settingsUI.handleSaveSettings();

      expect(mockSettingsManager.updateSettings).toHaveBeenCalledWith({
        workTimeThresholdMinutes: 45,
        notificationsEnabled: false
      });
    });

    test('should reject invalid settings', async () => {
      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      thresholdInput.value = '200';

      mockSettingsManager.isValidWorkTimeThreshold.mockReturnValue(false);

      await settingsUI.handleSaveSettings();

      expect(mockSettingsManager.updateSettings).not.toHaveBeenCalled();
    });

    test('should handle save errors gracefully', async () => {
      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      thresholdInput.value = '45';

      mockSettingsManager.isValidWorkTimeThreshold.mockReturnValue(true);
      mockSettingsManager.updateSettings.mockResolvedValue(false);

      await settingsUI.handleSaveSettings();

      const statusMessage = mockContainer.querySelector('#breakSettingsStatus');
      expect(statusMessage.textContent).toContain('Failed to save settings');
      expect(statusMessage.classList.contains('error')).toBe(true);
    });
  });

  describe('Settings Reset', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should reset settings to defaults with confirmation', async () => {
      // Mock confirm dialog
      global.confirm = vi.fn().mockReturnValue(true);

      mockSettingsManager.resetToDefaults.mockResolvedValue(true);
      mockSettingsManager.getSettings.mockReturnValue({
        workTimeThresholdMinutes: 30,
        notificationsEnabled: true,
        breakTypes: {},
        version: 1
      });

      await settingsUI.handleResetSettings();

      expect(global.confirm).toHaveBeenCalledWith(
        'Reset all break reminder settings to defaults?'
      );
      expect(mockSettingsManager.resetToDefaults).toHaveBeenCalled();
    });

    test('should not reset if user cancels confirmation', async () => {
      global.confirm = vi.fn().mockReturnValue(false);

      await settingsUI.handleResetSettings();

      expect(mockSettingsManager.resetToDefaults).not.toHaveBeenCalled();
    });

    test('should handle reset errors gracefully', async () => {
      global.confirm = vi.fn().mockReturnValue(true);
      mockSettingsManager.resetToDefaults.mockResolvedValue(false);

      await settingsUI.handleResetSettings();

      const statusMessage = mockContainer.querySelector('#breakSettingsStatus');
      expect(statusMessage.textContent).toContain('Failed to reset settings');
      expect(statusMessage.classList.contains('error')).toBe(true);
    });
  });

  describe('Status Messages', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should show status messages with correct styling', () => {
      const statusMessage = mockContainer.querySelector('#breakSettingsStatus');

      settingsUI.showStatusMessage('Success message', 'success');
      expect(statusMessage.textContent).toBe('Success message');
      expect(statusMessage.classList.contains('success')).toBe(true);
      expect(statusMessage.style.display).toBe('block');

      settingsUI.showStatusMessage('Error message', 'error');
      expect(statusMessage.textContent).toBe('Error message');
      expect(statusMessage.classList.contains('error')).toBe(true);

      settingsUI.showStatusMessage('Info message', 'info');
      expect(statusMessage.textContent).toBe('Info message');
      expect(statusMessage.classList.contains('info')).toBe(true);
    });

    test('should auto-hide status messages after timeout', (done) => {
      const statusMessage = mockContainer.querySelector('#breakSettingsStatus');

      settingsUI.showStatusMessage('Test message', 'info');
      expect(statusMessage.style.display).toBe('block');

      // Check that message is hidden after timeout
      setTimeout(() => {
        expect(statusMessage.style.display).toBe('none');
        done();
      }, 3100);
    });
  });

  describe('Settings Change Notification', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should dispatch settings change event', () => {
      const eventListener = vi.fn();
      document.addEventListener('breakSettingsChanged', eventListener);

      const newSettings = {
        workTimeThresholdMinutes: 45,
        notificationsEnabled: false
      };

      settingsUI.notifySettingsChanged(newSettings);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: newSettings
        })
      );
    });
  });

  describe('UI Updates', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should update UI with new settings', async () => {
      const newSettings = {
        workTimeThresholdMinutes: 60,
        notificationsEnabled: false
      };

      await settingsUI.updateUI(newSettings);

      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      const notificationsToggle = mockContainer.querySelector('#notificationsToggleSetting');
      const label = mockContainer.querySelector('#notificationsToggleLabel');

      expect(thresholdInput.value).toBe('60');
      expect(notificationsToggle.checked).toBe(false);
      expect(label.textContent).toBe('Disabled');
    });

    test('should get current UI settings', () => {
      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      const notificationsToggle = mockContainer.querySelector('#notificationsToggleSetting');

      thresholdInput.value = '75';
      notificationsToggle.checked = false;

      const currentSettings = settingsUI.getCurrentUISettings();

      expect(currentSettings).toEqual({
        workTimeThresholdMinutes: 75,
        notificationsEnabled: false
      });
    });
  });

  describe('Component Cleanup', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
    });

    test('should clean up resources on destroy', () => {
      settingsUI.destroy();

      expect(settingsUI.settingsManager).toBeNull();
      expect(settingsUI.container).toBeNull();
      expect(settingsUI.settingsToggle).toBeNull();
      expect(settingsUI.settingsPanel).toBeNull();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      settingsUI.createSettingsUI();
      settingsUI.setupEventListeners();
    });

    test('should handle settings toggle click', () => {
      const toggleBtn = mockContainer.querySelector('#breakSettingsToggle');
      
      expect(settingsUI.isVisible).toBe(false);
      
      toggleBtn.click();
      expect(settingsUI.isVisible).toBe(true);
      
      toggleBtn.click();
      expect(settingsUI.isVisible).toBe(false);
    });

    test('should handle save button click', async () => {
      const saveBtn = mockContainer.querySelector('#saveBreakSettings');
      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      
      thresholdInput.value = '45';
      mockSettingsManager.isValidWorkTimeThreshold.mockReturnValue(true);
      mockSettingsManager.updateSettings.mockResolvedValue(true);

      saveBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSettingsManager.updateSettings).toHaveBeenCalled();
    });

    test('should handle reset button click', async () => {
      global.confirm = vi.fn().mockReturnValue(true);
      const resetBtn = mockContainer.querySelector('#resetBreakSettings');
      
      mockSettingsManager.resetToDefaults.mockResolvedValue(true);

      resetBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSettingsManager.resetToDefaults).toHaveBeenCalled();
    });

    test('should handle Enter key in threshold input', async () => {
      const thresholdInput = mockContainer.querySelector('#workTimeThresholdSetting');
      
      thresholdInput.value = '45';
      mockSettingsManager.isValidWorkTimeThreshold.mockReturnValue(true);
      mockSettingsManager.updateSettings.mockResolvedValue(true);

      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      thresholdInput.dispatchEvent(enterEvent);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSettingsManager.updateSettings).toHaveBeenCalled();
    });
  });
});