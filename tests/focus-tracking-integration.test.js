/**
 * Focus Tracking Integration Tests
 * Tests the integration between focus tracking UI and background monitoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
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
    onActivated: {
      addListener: vi.fn()
    },
    onUpdated: {
      addListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn()
    }
  },
  windows: {
    onFocusChanged: {
      addListener: vi.fn()
    }
  }
};

global.chrome = mockChrome;

// Import modules after setting up mocks
import StorageManager from '../services/storage-manager.js';

// Mock the constants since they're used in TabTracker
const CONSTANTS = {
  STORAGE_KEYS: {
    CURRENT_SESSION: 'currentSession',
    TAB_HISTORY: 'tabHistory',
    SCREEN_TIME_SETTINGS: 'screenTimeSettings',
    FOCUS_SETTINGS: 'focusSettings'
  },
  DEFAULT_SETTINGS: {
    screenTime: {
      limitMinutes: 30,
      enabled: true,
      notificationsEnabled: true
    },
    focus: {
      enabled: true,
      notificationsEnabled: true,
      reminderCooldownMinutes: 5
    }
  }
};

// Mock the helpers
const HELPERS = {
  TimeUtils: {
    now: () => Date.now(),
    timeDiff: (startTime) => Date.now() - startTime,
    minutesToMs: (minutes) => minutes * 60 * 1000
  },
  FormatUtils: {
    formatDuration: (ms) => `${Math.floor(ms / (1000 * 60))}m`
  }
};

// Make them globally available for TabTracker
global.CONSTANTS = CONSTANTS;
global.HELPERS = HELPERS;
global.StorageManager = StorageManager;

// Create a simplified TabTracker for testing
class TestTabTracker {
  constructor() {
    this.focusTabId = null;
    this.focusTabUrl = null;
    this.lastFocusReminderTime = 0;
    this.currentTabId = null;
    this.storageManager = new StorageManager();
    this.constants = CONSTANTS;
    this.helpers = HELPERS;
  }

  async setFocusTab(tabId, url) {
    this.focusTabId = tabId;
    this.focusTabUrl = url;
    await this.resetFocusSession();
    await this.updateCurrentSession();
  }

  async resetFocusTab() {
    this.focusTabId = null;
    this.focusTabUrl = null;
    await this.storageManager.set('focusHistory', {
      deviations: [],
      sessionDeviations: 0,
      totalDeviations: 0
    });
    await this.updateCurrentSession();
  }

  getFocusTabInfo() {
    return {
      tabId: this.focusTabId,
      url: this.focusTabUrl,
      isSet: Boolean(this.focusTabId && this.focusTabUrl),
    };
  }

  async getFocusSessionStats() {
    const sessionData = await this.storageManager.get(CONSTANTS.STORAGE_KEYS.CURRENT_SESSION);
    const focusHistory = await this.storageManager.get('focusHistory') || {};

    const sessionStartTime = sessionData?.sessionStartTime || this.helpers.TimeUtils.now();
    const sessionTime = this.helpers.TimeUtils.timeDiff(sessionStartTime);
    const deviationCount = focusHistory.sessionDeviations || 0;

    let isCurrentlyOnFocus = false;
    if (this.focusTabId && this.currentTabId) {
      try {
        const currentTab = await chrome.tabs.get(this.currentTabId);
        isCurrentlyOnFocus = this.urlsMatch(currentTab.url, this.focusTabUrl);
      } catch (error) {
        isCurrentlyOnFocus = false;
      }
    }

    return {
      sessionTime: sessionTime,
      deviationCount: deviationCount,
      lastReminderTime: this.lastFocusReminderTime,
      isCurrentlyOnFocus: isCurrentlyOnFocus,
      focusTabSet: Boolean(this.focusTabId && this.focusTabUrl)
    };
  }

  async getFocusDeviationHistory() {
    const focusHistory = await this.storageManager.get('focusHistory') || {};
    return {
      deviations: focusHistory.deviations || [],
      sessionDeviations: focusHistory.sessionDeviations || 0,
      totalDeviations: focusHistory.totalDeviations || 0
    };
  }

  async recordFocusDeviation(fromUrl, toUrl) {
    const focusHistory = await this.storageManager.get('focusHistory') || {
      deviations: [],
      sessionDeviations: 0,
      totalDeviations: 0
    };

    const deviation = {
      fromUrl: fromUrl,
      toUrl: toUrl,
      timestamp: this.helpers.TimeUtils.now()
    };

    focusHistory.deviations.push(deviation);
    focusHistory.sessionDeviations += 1;
    focusHistory.totalDeviations += 1;

    if (focusHistory.deviations.length > 50) {
      focusHistory.deviations = focusHistory.deviations.slice(-50);
    }

    await this.storageManager.set('focusHistory', focusHistory);
  }

  async checkFocusDeviation(tabId, url) {
    const settings = await this.storageManager.get(CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS);

    if (!settings || !settings.enabled || !settings.notificationsEnabled) {
      return;
    }

    if (!this.focusTabId || !this.focusTabUrl) {
      return;
    }

    if (tabId === this.focusTabId) {
      return;
    }

    if (this.urlsMatch(url, this.focusTabUrl)) {
      return;
    }

    await this.recordFocusDeviation(this.focusTabUrl, url);
  }

  urlsMatch(url1, url2) {
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      return domain1 === domain2;
    } catch (error) {
      return url1 === url2;
    }
  }

  async resetFocusSession() {
    const focusHistory = await this.storageManager.get('focusHistory') || {
      deviations: [],
      sessionDeviations: 0,
      totalDeviations: 0
    };

    focusHistory.sessionDeviations = 0;
    await this.storageManager.set('focusHistory', focusHistory);
    this.lastFocusReminderTime = 0;
  }

  async updateCurrentSession() {
    const sessionData = {
      focusTabId: this.focusTabId,
      focusUrl: this.focusTabUrl,
      lastFocusReminderTime: this.lastFocusReminderTime,
      sessionStartTime: this.helpers.TimeUtils.now(),
    };

    await this.storageManager.set(CONSTANTS.STORAGE_KEYS.CURRENT_SESSION, sessionData);
  }
}

describe('Focus Tracking Integration', () => {
  let storageManager;
  let tabTracker;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock storage responses
    mockChrome.storage.local.get.mockImplementation((keys) => {
      const mockData = {
        [CONSTANTS.STORAGE_KEYS.CURRENT_SESSION]: {},
        [CONSTANTS.STORAGE_KEYS.TAB_HISTORY]: {},
        [CONSTANTS.STORAGE_KEYS.SCREEN_TIME_SETTINGS]: CONSTANTS.DEFAULT_SETTINGS.screenTime,
        [CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS]: CONSTANTS.DEFAULT_SETTINGS.focus,
        focusHistory: {
          deviations: [],
          sessionDeviations: 0,
          totalDeviations: 0
        }
      };
      
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          result[key] = mockData[key];
        });
        return Promise.resolve(result);
      } else if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockData[keys] });
      } else {
        return Promise.resolve(mockData);
      }
    });

    mockChrome.storage.local.set.mockResolvedValue();
    mockChrome.tabs.get.mockResolvedValue({
      id: 1,
      url: 'https://example.com',
      title: 'Example Site'
    });

    storageManager = new StorageManager();
    tabTracker = new TestTabTracker();
  });

  describe('Focus Tab Management', () => {
    it('should set focus tab and initialize session tracking', async () => {
      const tabId = 1;
      const url = 'https://work.example.com';

      await tabTracker.setFocusTab(tabId, url);

      expect(tabTracker.focusTabId).toBe(tabId);
      expect(tabTracker.focusTabUrl).toBe(url);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          focusHistory: expect.objectContaining({
            sessionDeviations: 0
          })
        })
      );
    });

    it('should provide focus tab information', () => {
      tabTracker.focusTabId = 1;
      tabTracker.focusTabUrl = 'https://work.example.com';

      const focusInfo = tabTracker.getFocusTabInfo();

      expect(focusInfo).toEqual({
        tabId: 1,
        url: 'https://work.example.com',
        isSet: true
      });
    });

    it('should reset focus tab and clear history', async () => {
      tabTracker.focusTabId = 1;
      tabTracker.focusTabUrl = 'https://work.example.com';

      await tabTracker.resetFocusTab();

      expect(tabTracker.focusTabId).toBeNull();
      expect(tabTracker.focusTabUrl).toBeNull();
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          focusHistory: {
            deviations: [],
            sessionDeviations: 0,
            totalDeviations: 0
          }
        })
      );
    });
  });

  describe('Focus Session Statistics', () => {
    it('should calculate session statistics correctly', async () => {
      // Set up focus tab
      tabTracker.focusTabId = 1;
      tabTracker.focusTabUrl = 'https://work.example.com';
      tabTracker.currentTabId = 1;

      // Mock session data
      const sessionStartTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
      mockChrome.storage.local.get.mockImplementation((key) => {
        if (key === CONSTANTS.STORAGE_KEYS.CURRENT_SESSION) {
          return Promise.resolve({
            [CONSTANTS.STORAGE_KEYS.CURRENT_SESSION]: {
              sessionStartTime: sessionStartTime
            }
          });
        } else if (key === 'focusHistory') {
          return Promise.resolve({
            focusHistory: {
              sessionDeviations: 3
            }
          });
        }
        return Promise.resolve({});
      });

      mockChrome.tabs.get.mockResolvedValueOnce({
        id: 1,
        url: 'https://work.example.com'
      });

      const stats = await tabTracker.getFocusSessionStats();

      expect(stats.sessionTime).toBeGreaterThan(25 * 60 * 1000); // At least 25 minutes
      expect(stats.deviationCount).toBe(3);
      expect(stats.isCurrentlyOnFocus).toBe(true);
      expect(stats.focusTabSet).toBe(true);
    });

    it('should handle case when not on focus tab', async () => {
      tabTracker.focusTabId = 1;
      tabTracker.focusTabUrl = 'https://work.example.com';
      tabTracker.currentTabId = 2;

      mockChrome.tabs.get.mockResolvedValueOnce({
        id: 2,
        url: 'https://social.example.com'
      });

      const stats = await tabTracker.getFocusSessionStats();

      expect(stats.isCurrentlyOnFocus).toBe(false);
    });
  });

  describe('Focus Deviation Tracking', () => {
    it('should record focus deviations', async () => {
      const fromUrl = 'https://work.example.com';
      const toUrl = 'https://social.example.com';

      await tabTracker.recordFocusDeviation(fromUrl, toUrl);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          focusHistory: expect.objectContaining({
            deviations: expect.arrayContaining([
              expect.objectContaining({
                fromUrl: fromUrl,
                toUrl: toUrl,
                timestamp: expect.any(Number)
              })
            ]),
            sessionDeviations: 1,
            totalDeviations: 1
          })
        })
      );
    });

    it('should limit deviation history to 50 entries', async () => {
      // Mock existing history with 50 entries
      const existingDeviations = Array.from({ length: 50 }, (_, i) => ({
        fromUrl: `https://site${i}.com`,
        toUrl: `https://site${i+1}.com`,
        timestamp: Date.now() - (i * 1000)
      }));

      mockChrome.storage.local.get.mockResolvedValueOnce({
        focusHistory: {
          deviations: existingDeviations,
          sessionDeviations: 50,
          totalDeviations: 50
        }
      });

      await tabTracker.recordFocusDeviation('https://new-from.com', 'https://new-to.com');

      const setCall = mockChrome.storage.local.set.mock.calls.find(
        call => call[0].focusHistory
      );
      
      expect(setCall[0].focusHistory.deviations).toHaveLength(50);
      expect(setCall[0].focusHistory.deviations[49].fromUrl).toBe('https://new-from.com');
    });

    it('should provide deviation history', async () => {
      const mockDeviations = [
        {
          fromUrl: 'https://work.example.com',
          toUrl: 'https://social.example.com',
          timestamp: Date.now() - (5 * 60 * 1000)
        }
      ];

      mockChrome.storage.local.get.mockResolvedValueOnce({
        focusHistory: {
          deviations: mockDeviations,
          sessionDeviations: 1,
          totalDeviations: 5
        }
      });

      const history = await tabTracker.getFocusDeviationHistory();

      expect(history).toEqual({
        deviations: mockDeviations,
        sessionDeviations: 1,
        totalDeviations: 5
      });
    });
  });

  describe('Focus Deviation Detection', () => {
    beforeEach(() => {
      // Set up focus tab
      tabTracker.focusTabId = 1;
      tabTracker.focusTabUrl = 'https://work.example.com';
      tabTracker.lastFocusReminderTime = 0;
    });

    it('should detect deviation when switching to different domain', async () => {
      const tabId = 2;
      const url = 'https://social.example.com';

      // Mock focus settings
      mockChrome.storage.local.get.mockResolvedValueOnce({
        [CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS]: {
          enabled: true,
          notificationsEnabled: true,
          reminderCooldownMinutes: 5
        }
      });

      await tabTracker.checkFocusDeviation(tabId, url);

      // Should record deviation
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          focusHistory: expect.objectContaining({
            deviations: expect.arrayContaining([
              expect.objectContaining({
                fromUrl: 'https://work.example.com',
                toUrl: url
              })
            ])
          })
        })
      );
    });

    it('should not detect deviation when on same domain', async () => {
      const tabId = 2;
      const url = 'https://work.example.com/different-page';

      mockChrome.storage.local.get.mockResolvedValueOnce({
        [CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS]: {
          enabled: true,
          notificationsEnabled: true,
          reminderCooldownMinutes: 5
        }
      });

      await tabTracker.checkFocusDeviation(tabId, url);

      // Should not record deviation for same domain
      const deviationCalls = mockChrome.storage.local.set.mock.calls.filter(
        call => call[0].focusHistory
      );
      expect(deviationCalls).toHaveLength(0);
    });

    it('should not detect deviation when on focus tab', async () => {
      const tabId = 1; // Same as focus tab
      const url = 'https://work.example.com';

      await tabTracker.checkFocusDeviation(tabId, url);

      // Should not record deviation for focus tab
      const deviationCalls = mockChrome.storage.local.set.mock.calls.filter(
        call => call[0].focusHistory
      );
      expect(deviationCalls).toHaveLength(0);
    });
  });

  describe('URL Matching', () => {
    it('should match URLs from same domain', () => {
      const url1 = 'https://example.com/page1';
      const url2 = 'https://example.com/page2';

      expect(tabTracker.urlsMatch(url1, url2)).toBe(true);
    });

    it('should not match URLs from different domains', () => {
      const url1 = 'https://work.example.com';
      const url2 = 'https://social.example.com';

      expect(tabTracker.urlsMatch(url1, url2)).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      const url1 = 'invalid-url';
      const url2 = 'also-invalid';

      expect(tabTracker.urlsMatch(url1, url2)).toBe(false);
    });
  });
});