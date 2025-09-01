/**
 * Focus Tracking UI Tests
 * Tests for the enhanced focus tracking UI components and integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    getURL: vi.fn((path) => `chrome-extension://test/${path}`)
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    update: vi.fn()
  }
};

global.chrome = mockChrome;

describe('Focus Tracking UI', () => {
  let dom;
  let document;
  let window;
  let PopupManager;

  beforeEach(() => {
    // Reset all mocks
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
            <section class="section focus-section">
              <div class="section-header">
                <h2 class="section-title">Focus Tracking</h2>
                <div class="focus-status-indicator" id="focusStatusIndicator">
                  <span class="status-dot" id="focusStatusDot"></span>
                  <span class="status-text" id="focusStatusText">Not Active</span>
                </div>
              </div>
              <div class="section-content">
                <div class="focus-tab-display">
                  <span class="focus-label">Focus Tab:</span>
                  <span class="focus-url" id="focusUrl">Not set</span>
                </div>
                
                <div class="focus-session-info" id="focusSessionInfo" style="display: none;">
                  <div class="session-stat">
                    <span class="stat-label">Session Time:</span>
                    <span class="stat-value" id="focusSessionTime">0m</span>
                  </div>
                  <div class="session-stat">
                    <span class="stat-label">Deviations:</span>
                    <span class="stat-value" id="focusDeviationCount">0</span>
                  </div>
                  <div class="session-stat">
                    <span class="stat-label">Last Reminder:</span>
                    <span class="stat-value" id="lastFocusReminder">Never</span>
                  </div>
                </div>

                <div class="focus-controls">
                  <button class="btn btn-secondary" id="setFocusBtn">
                    Set Current Tab as Focus
                  </button>
                  <button class="btn btn-small" id="resetFocusBtn">Reset</button>
                </div>

                <div class="focus-deviation-history" id="focusDeviationHistory" style="display: none;">
                  <h4 class="history-title">Recent Deviations</h4>
                  <div class="deviation-list" id="deviationList"></div>
                  <button class="btn btn-small btn-text" id="toggleHistoryBtn">
                    Show History
                  </button>
                </div>
              </div>
            </section>
          </div>
        </body>
      </html>
    `, { url: 'http://localhost' });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;

    // Mock PopupManager class with focus tracking methods
    PopupManager = class {
      constructor() {
        this.initializeElements();
      }

      initializeElements() {
        this.focusUrlEl = document.getElementById("focusUrl");
        this.focusStatusDot = document.getElementById("focusStatusDot");
        this.focusStatusText = document.getElementById("focusStatusText");
        this.focusSessionInfo = document.getElementById("focusSessionInfo");
        this.focusSessionTime = document.getElementById("focusSessionTime");
        this.focusDeviationCount = document.getElementById("focusDeviationCount");
        this.lastFocusReminder = document.getElementById("lastFocusReminder");
        this.focusDeviationHistory = document.getElementById("focusDeviationHistory");
        this.deviationList = document.getElementById("deviationList");
        this.toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
        this.setFocusBtn = document.getElementById("setFocusBtn");
        this.resetFocusBtn = document.getElementById("resetFocusBtn");
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
        const sessionMinutes = Math.floor(sessionData.sessionTime / (1000 * 60));
        const hours = Math.floor(sessionMinutes / 60);
        const minutes = sessionMinutes % 60;
        
        if (hours > 0) {
          this.focusSessionTime.textContent = `${hours}h ${minutes}m`;
        } else {
          this.focusSessionTime.textContent = `${minutes}m`;
        }

        this.focusDeviationCount.textContent = sessionData.deviationCount || 0;

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
        this.deviationList.innerHTML = '';

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

      formatUrl(url) {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname;
        } catch {
          return url.length > 30 ? url.substring(0, 30) + "..." : url;
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
        const response = await chrome.runtime.sendMessage({
          type: "SET_FOCUS_TAB"
        });
        return response;
      }

      async handleResetFocus() {
        const response = await chrome.runtime.sendMessage({
          type: "RESET_FOCUS_TAB"
        });
        return response;
      }
    };
  });

  describe('Focus Status Display', () => {
    it('should show inactive status when no focus tab is set', () => {
      const popup = new PopupManager();
      
      popup.updateFocusDisplay({ isSet: false, url: null });
      
      expect(popup.focusUrlEl.textContent).toBe('Not set');
      expect(popup.focusStatusText.textContent).toBe('Not Active');
      expect(popup.focusStatusDot.classList.contains('inactive')).toBe(true);
      expect(popup.focusSessionInfo.style.display).toBe('none');
    });

    it('should show active status when focus tab is set', () => {
      const popup = new PopupManager();
      
      popup.updateFocusDisplay({ 
        isSet: true, 
        url: 'https://example.com/page' 
      });
      
      expect(popup.focusUrlEl.textContent).toBe('example.com');
      expect(popup.focusStatusText.textContent).toBe('Active');
      expect(popup.focusStatusDot.classList.contains('active')).toBe(true);
      expect(popup.focusSessionInfo.style.display).toBe('block');
    });

    it('should show deviation status when user is off focus', () => {
      const popup = new PopupManager();
      
      popup.updateFocusStatus('deviation');
      
      expect(popup.focusStatusText.textContent).toBe('Off Focus');
      expect(popup.focusStatusDot.classList.contains('deviation')).toBe(true);
    });
  });

  describe('Focus Session Information', () => {
    it('should display session time correctly', () => {
      const popup = new PopupManager();
      
      // Test minutes only
      popup.updateFocusSessionInfo({
        sessionTime: 25 * 60 * 1000, // 25 minutes
        deviationCount: 3,
        lastReminderTime: null,
        isCurrentlyOnFocus: true
      });
      
      expect(popup.focusSessionTime.textContent).toBe('25m');
      expect(popup.focusDeviationCount.textContent).toBe('3');
      expect(popup.lastFocusReminder.textContent).toBe('Never');
    });

    it('should display hours and minutes for longer sessions', () => {
      const popup = new PopupManager();
      
      // Test hours and minutes
      popup.updateFocusSessionInfo({
        sessionTime: 90 * 60 * 1000, // 90 minutes (1h 30m)
        deviationCount: 5,
        lastReminderTime: Date.now() - (10 * 60 * 1000), // 10 minutes ago
        isCurrentlyOnFocus: false
      });
      
      expect(popup.focusSessionTime.textContent).toBe('1h 30m');
      expect(popup.focusDeviationCount.textContent).toBe('5');
      expect(popup.lastFocusReminder.textContent).toBe('10m ago');
    });

    it('should show "Just now" for recent reminders', () => {
      const popup = new PopupManager();
      
      popup.updateFocusSessionInfo({
        sessionTime: 15 * 60 * 1000,
        deviationCount: 1,
        lastReminderTime: Date.now() - 30000, // 30 seconds ago
        isCurrentlyOnFocus: false
      });
      
      expect(popup.lastFocusReminder.textContent).toBe('Just now');
    });
  });

  describe('Deviation History', () => {
    it('should hide history button when no deviations exist', () => {
      const popup = new PopupManager();
      
      popup.updateDeviationHistory({ deviations: [] });
      
      expect(popup.toggleHistoryBtn.style.display).toBe('none');
    });

    it('should display deviation history correctly', () => {
      const popup = new PopupManager();
      
      const historyData = {
        deviations: [
          {
            fromUrl: 'https://work.example.com',
            toUrl: 'https://social.example.com',
            timestamp: Date.now() - (5 * 60 * 1000) // 5 minutes ago
          },
          {
            fromUrl: 'https://social.example.com',
            toUrl: 'https://news.example.com',
            timestamp: Date.now() - (2 * 60 * 1000) // 2 minutes ago
          }
        ]
      };
      
      popup.updateDeviationHistory(historyData);
      
      expect(popup.toggleHistoryBtn.style.display).toBe('block');
      expect(popup.deviationList.children.length).toBe(2);
      
      // Check first deviation item (most recent)
      const firstItem = popup.deviationList.children[0];
      expect(firstItem.querySelector('.deviation-from').textContent).toBe('social.example.com');
      expect(firstItem.querySelector('.deviation-to').textContent).toBe('news.example.com');
      expect(firstItem.querySelector('.deviation-time').textContent).toBe('2m');
    });

    it('should limit deviation history to 5 most recent items', () => {
      const popup = new PopupManager();
      
      const deviations = [];
      for (let i = 0; i < 10; i++) {
        deviations.push({
          fromUrl: `https://site${i}.com`,
          toUrl: `https://site${i+1}.com`,
          timestamp: Date.now() - (i * 60 * 1000)
        });
      }
      
      popup.updateDeviationHistory({ deviations });
      
      expect(popup.deviationList.children.length).toBe(5);
    });

    it('should toggle deviation history visibility', () => {
      const popup = new PopupManager();
      
      // Initially hidden
      popup.deviationList.style.display = 'none';
      popup.toggleHistoryBtn.textContent = 'Show History';
      
      // Toggle to show
      popup.toggleDeviationHistory();
      expect(popup.deviationList.style.display).toBe('block');
      expect(popup.toggleHistoryBtn.textContent).toBe('Hide History');
      
      // Toggle to hide
      popup.toggleDeviationHistory();
      expect(popup.deviationList.style.display).toBe('none');
      expect(popup.toggleHistoryBtn.textContent).toBe('Show History');
    });
  });

  describe('Focus Control Actions', () => {
    it('should handle set focus action', async () => {
      const popup = new PopupManager();
      
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true
      });
      
      const response = await popup.handleSetFocus();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "SET_FOCUS_TAB"
      });
      expect(response.success).toBe(true);
    });

    it('should handle reset focus action', async () => {
      const popup = new PopupManager();
      
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true
      });
      
      const response = await popup.handleResetFocus();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "RESET_FOCUS_TAB"
      });
      expect(response.success).toBe(true);
    });
  });

  describe('URL Formatting', () => {
    it('should format URLs to show hostname only', () => {
      const popup = new PopupManager();
      
      expect(popup.formatUrl('https://www.example.com/path/to/page')).toBe('www.example.com');
      expect(popup.formatUrl('http://subdomain.example.org')).toBe('subdomain.example.org');
    });

    it('should handle invalid URLs gracefully', () => {
      const popup = new PopupManager();
      
      expect(popup.formatUrl('invalid-url')).toBe('invalid-url');
      expect(popup.formatUrl('a-very-long-url-that-exceeds-thirty-characters')).toBe('a-very-long-url-that-exceeds-t...');
    });
  });

  describe('Time Formatting', () => {
    it('should format time ago correctly', () => {
      const popup = new PopupManager();
      
      const now = Date.now();
      
      expect(popup.formatTimeAgo(now)).toBe('now');
      expect(popup.formatTimeAgo(now - (5 * 60 * 1000))).toBe('5m');
      expect(popup.formatTimeAgo(now - (90 * 60 * 1000))).toBe('1h');
      expect(popup.formatTimeAgo(now - (150 * 60 * 1000))).toBe('2h');
    });
  });
});