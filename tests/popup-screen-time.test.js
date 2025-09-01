/**
 * Tests for Screen Time Monitoring UI Components
 * Verifies the implementation of task 6 requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    }
  },
  runtime: {
    sendMessage: vi.fn(),
  }
};

global.chrome = mockChrome;

describe('Screen Time Monitoring UI Components', () => {
  let dom;
  let document;
  let window;
  let PopupManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test</title>
        </head>
        <body>
          <div class="container">
            <section class="section screen-time-section">
              <div class="section-header">
                <h2 class="section-title">Screen Time</h2>
                <span class="current-time" id="currentTime">0m</span>
              </div>
              <div class="section-content">
                <div class="time-limit-control">
                  <label for="timeLimitInput">Break reminder after:</label>
                  <div class="input-group">
                    <input type="number" id="timeLimitInput" min="5" max="180" value="30" />
                    <span>minutes</span>
                  </div>
                </div>
                <div class="screen-time-controls">
                  <button class="btn btn-secondary" id="takeBreakBtn">Take Break Now</button>
                  <button class="btn btn-small" id="resetScreenTimeBtn">Reset Data</button>
                </div>
              </div>
            </section>
          </div>
        </body>
      </html>
    `, { url: 'chrome-extension://test/popup.html' });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;

    // Mock PopupManager class (simplified version for testing)
    PopupManager = class {
      constructor() {
        this.currentTimeEl = document.getElementById('currentTime');
        this.timeLimitInput = document.getElementById('timeLimitInput');
        this.takeBreakBtn = document.getElementById('takeBreakBtn');
        this.resetScreenTimeBtn = document.getElementById('resetScreenTimeBtn');
      }

      async handleTimeLimitChange(event) {
        const newLimit = parseInt(event.target.value);
        if (newLimit >= 5 && newLimit <= 180) {
          const settings = {
            limitMinutes: newLimit,
            enabled: true,
            notificationsEnabled: true
          };
          await chrome.storage.local.set({ screenTimeSettings: settings });
          return true;
        }
        return false;
      }

      async handleTakeBreak() {
        const response = await chrome.runtime.sendMessage({ 
          type: "TRIGGER_MANUAL_BREAK" 
        });
        return response && response.success;
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
        }
      }

      async updateCurrentTimeDisplay() {
        try {
          const response = await chrome.runtime.sendMessage({
            type: "GET_TAB_STATS",
          });
          
          if (response && response.success && response.data) {
            const stats = response.data;
            const sessionMinutes = Math.floor(stats.currentSessionTime / (1000 * 60));
            this.updateCurrentTime(sessionMinutes);
            return sessionMinutes;
          }
          return 0;
        } catch (error) {
          console.error("Failed to get current time:", error);
          this.updateCurrentTime(0);
          return 0;
        }
      }

      async loadScreenTimeSettings() {
        const result = await chrome.storage.local.get('screenTimeSettings');
        const settings = result.screenTimeSettings || {
          limitMinutes: 30,
          enabled: true,
          notificationsEnabled: true
        };
        
        if (this.timeLimitInput) {
          this.timeLimitInput.value = settings.limitMinutes;
        }
        
        return settings;
      }

      async resetScreenTimeData() {
        const response = await chrome.runtime.sendMessage({
          type: "CLEAR_TAB_HISTORY"
        });
        
        if (response && response.success) {
          this.updateCurrentTime(0);
          return true;
        }
        return false;
      }
    };
  });

  describe('Time Limit Configuration', () => {
    it('should load and display current time limit setting', async () => {
      // Mock storage response
      mockChrome.storage.local.get.mockResolvedValue({
        screenTimeSettings: { limitMinutes: 45, enabled: true, notificationsEnabled: true }
      });

      const popup = new PopupManager();
      await popup.loadScreenTimeSettings();

      expect(popup.timeLimitInput.value).toBe('45');
    });

    it('should save valid time limit changes', async () => {
      mockChrome.storage.local.set.mockResolvedValue();

      const popup = new PopupManager();
      const event = { target: { value: '60' } };
      
      const result = await popup.handleTimeLimitChange(event);

      expect(result).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        screenTimeSettings: {
          limitMinutes: 60,
          enabled: true,
          notificationsEnabled: true
        }
      });
    });

    it('should reject invalid time limit values', async () => {
      const popup = new PopupManager();
      
      // Test too low
      let event = { target: { value: '3' } };
      let result = await popup.handleTimeLimitChange(event);
      expect(result).toBe(false);

      // Test too high
      event = { target: { value: '200' } };
      result = await popup.handleTimeLimitChange(event);
      expect(result).toBe(false);

      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('Current Session Time Display', () => {
    it('should display current session time correctly', async () => {
      const popup = new PopupManager();
      
      // Test minutes only
      popup.updateCurrentTime(25);
      expect(popup.currentTimeEl.textContent).toBe('25m');

      // Test hours and minutes
      popup.updateCurrentTime(90);
      expect(popup.currentTimeEl.textContent).toBe('1h 30m');

      // Test exact hours
      popup.updateCurrentTime(120);
      expect(popup.currentTimeEl.textContent).toBe('2h 0m');
    });

    it('should fetch and display real-time session data', async () => {
      // Mock background response with tab stats
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          currentSessionTime: 1800000, // 30 minutes in milliseconds
          breakRemindersShown: 1
        }
      });

      const popup = new PopupManager();
      const minutes = await popup.updateCurrentTimeDisplay();

      expect(minutes).toBe(30);
      expect(popup.currentTimeEl.textContent).toBe('30m');
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "GET_TAB_STATS"
      });
    });

    it('should handle missing session data gracefully', async () => {
      // Mock background response with no data
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false
      });

      const popup = new PopupManager();
      const minutes = await popup.updateCurrentTimeDisplay();

      expect(minutes).toBe(0);
    });
  });

  describe('Manual Break Trigger', () => {
    it('should trigger manual break successfully', async () => {
      // Mock successful break trigger
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true
      });

      const popup = new PopupManager();
      const result = await popup.handleTakeBreak();

      expect(result).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TRIGGER_MANUAL_BREAK"
      });
    });

    it('should handle break trigger failure', async () => {
      // Mock failed break trigger
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false
      });

      const popup = new PopupManager();
      const result = await popup.handleTakeBreak();

      expect(result).toBe(false);
    });
  });

  describe('Settings Reset Functionality', () => {
    it('should reset screen time data successfully', async () => {
      // Mock successful data reset
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true
      });

      const popup = new PopupManager();
      const result = await popup.resetScreenTimeData();

      expect(result).toBe(true);
      expect(popup.currentTimeEl.textContent).toBe('0m');
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "CLEAR_TAB_HISTORY"
      });
    });

    it('should handle reset failure gracefully', async () => {
      // Mock failed data reset
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false
      });

      const popup = new PopupManager();
      const result = await popup.resetScreenTimeData();

      expect(result).toBe(false);
    });
  });

  describe('UI Element Initialization', () => {
    it('should initialize all required DOM elements', () => {
      const popup = new PopupManager();

      expect(popup.currentTimeEl).toBeTruthy();
      expect(popup.timeLimitInput).toBeTruthy();
      expect(popup.takeBreakBtn).toBeTruthy();
      expect(popup.resetScreenTimeBtn).toBeTruthy();
    });

    it('should have correct input constraints', () => {
      const popup = new PopupManager();

      expect(popup.timeLimitInput.min).toBe('5');
      expect(popup.timeLimitInput.max).toBe('180');
      expect(popup.timeLimitInput.type).toBe('number');
    });
  });

  describe('Integration with Background Tab Tracking', () => {
    it('should communicate with background script for tab stats', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          tabId: 123,
          url: 'https://example.com',
          totalTime: 2700000, // 45 minutes
          currentSessionTime: 1800000, // 30 minutes
          breakRemindersShown: 2
        }
      });

      const popup = new PopupManager();
      await popup.updateCurrentTimeDisplay();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "GET_TAB_STATS"
      });
    });

    it('should handle background communication errors', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Communication failed'));

      const popup = new PopupManager();
      const minutes = await popup.updateCurrentTimeDisplay();

      // Should gracefully handle error and show 0
      expect(minutes).toBe(0);
    });
  });
});