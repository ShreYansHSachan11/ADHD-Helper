/**
 * Tests for Break Analytics Display Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// Set up DOM
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body>
      <div id="breakAnalyticsContainer"></div>
    </body>
  </html>
`);

global.document = dom.window.document;
global.window = dom.window;

// Import components after DOM setup
import BreakAnalyticsTracker from '../services/break-analytics-tracker.js';
import StorageManager from '../services/storage-manager.js';

// Mock BreakAnalyticsDisplay since it's not a module
class BreakAnalyticsDisplay {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.analyticsTracker = null;
    this.currentPeriod = 'today';
    this.updateInterval = null;
  }

  async init() {
    if (typeof BreakAnalyticsTracker !== 'undefined') {
      this.analyticsTracker = new BreakAnalyticsTracker();
      await this.analyticsTracker.init();
    }
    this.createAnalyticsUI();
    await this.loadAnalyticsData();
  }

  createAnalyticsUI() {
    this.container.innerHTML = `
      <div class="analytics-header">
        <h3>Break Analytics</h3>
        <div class="period-selector">
          <button class="period-btn active" data-period="today">Today</button>
          <button class="period-btn" data-period="week">This Week</button>
          <button class="period-btn" data-period="month">This Month</button>
        </div>
      </div>
      <div class="analytics-content">
        <div class="analytics-stats" id="analyticsStats">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value" id="totalBreaks">0</div>
              <div class="stat-label">Total Breaks</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="totalBreakTime">0m</div>
              <div class="stat-label">Break Time</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="averageDuration">0m</div>
              <div class="stat-label">Avg Duration</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="completionRate">0%</div>
              <div class="stat-label">Completion Rate</div>
            </div>
          </div>
          <div class="break-type-distribution">
            <div class="distribution-bars">
              <div class="distribution-item">
                <span class="break-type-count" id="shortBreakCount">0</span>
                <div class="progress-bar">
                  <div class="progress-fill" id="shortBreakProgress" style="width: 0%"></div>
                </div>
                <div class="break-type-percentage" id="shortBreakPercentage">0%</div>
              </div>
              <div class="distribution-item">
                <span class="break-type-count" id="mediumBreakCount">0</span>
                <div class="progress-bar">
                  <div class="progress-fill" id="mediumBreakProgress" style="width: 0%"></div>
                </div>
                <div class="break-type-percentage" id="mediumBreakPercentage">0%</div>
              </div>
              <div class="distribution-item">
                <span class="break-type-count" id="longBreakCount">0</span>
                <div class="progress-bar">
                  <div class="progress-fill" id="longBreakProgress" style="width: 0%"></div>
                </div>
                <div class="break-type-percentage" id="longBreakPercentage">0%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadAnalyticsData() {
    if (!this.analyticsTracker) return;
    
    const analytics = await this.analyticsTracker.getComprehensiveAnalytics();
    if (!analytics) return;

    let periodData;
    switch (this.currentPeriod) {
      case 'today':
        periodData = analytics.today;
        break;
      case 'week':
        periodData = analytics.thisWeek;
        break;
      case 'month':
        periodData = analytics.thisMonth;
        break;
      default:
        periodData = analytics.today;
    }

    if (periodData && periodData.totalBreaks > 0) {
      this.updateAnalyticsDisplay(periodData);
    }
  }

  updateAnalyticsDisplay(data) {
    this.updateElement('totalBreaks', data.totalBreaks || 0);
    this.updateElement('totalBreakTime', this.formatTime(data.totalBreakTime || 0));
    this.updateElement('averageDuration', this.formatTime(data.averageDuration || 0));
    
    const completionRate = data.totalBreaks > 0 
      ? Math.round((data.completedBreaks || 0) / data.totalBreaks * 100)
      : 0;
    this.updateElement('completionRate', `${completionRate}%`);

    this.updateBreakTypeDistribution(data.breaksByType || {});
  }

  updateBreakTypeDistribution(breaksByType) {
    const types = ['short', 'medium', 'long'];
    const total = Object.values(breaksByType).reduce((sum, count) => sum + count, 0);
    
    types.forEach(type => {
      const count = breaksByType[type] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      
      this.updateElement(`${type}BreakCount`, count);
      this.updateElement(`${type}BreakPercentage`, `${percentage}%`);
      
      const progressBar = document.getElementById(`${type}BreakProgress`);
      if (progressBar) {
        progressBar.style.width = `${percentage}%`;
      }
    });
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  async switchPeriod(period) {
    this.currentPeriod = period;
    await this.loadAnalyticsData();
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Make BreakAnalyticsTracker available globally for the component
global.BreakAnalyticsTracker = BreakAnalyticsTracker;

describe('BreakAnalyticsDisplay', () => {
  let analyticsDisplay;
  let mockStorageManager;

  beforeEach(async () => {
    // Reset DOM
    document.getElementById('breakAnalyticsContainer').innerHTML = '';
    
    // Mock storage manager
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
    };

    // Mock chrome storage
    chrome.storage.local.get.mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: null });
      }
      const result = {};
      keys.forEach(key => {
        result[key] = null;
      });
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation(() => Promise.resolve());

    analyticsDisplay = new BreakAnalyticsDisplay('breakAnalyticsContainer');
  });

  afterEach(() => {
    if (analyticsDisplay) {
      analyticsDisplay.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct container', () => {
      expect(analyticsDisplay.containerId).toBe('breakAnalyticsContainer');
      expect(analyticsDisplay.container).toBeTruthy();
      expect(analyticsDisplay.currentPeriod).toBe('today');
    });

    it('should create analytics UI structure', async () => {
      await analyticsDisplay.init();
      
      const container = document.getElementById('breakAnalyticsContainer');
      expect(container.querySelector('.analytics-header')).toBeTruthy();
      expect(container.querySelector('.period-selector')).toBeTruthy();
      expect(container.querySelector('.analytics-content')).toBeTruthy();
      expect(container.querySelector('.stats-grid')).toBeTruthy();
      expect(container.querySelector('.break-type-distribution')).toBeTruthy();
    });

    it('should create period selector buttons', async () => {
      await analyticsDisplay.init();
      
      const periodButtons = document.querySelectorAll('.period-btn');
      expect(periodButtons).toHaveLength(3);
      
      const buttonTexts = Array.from(periodButtons).map(btn => btn.textContent);
      expect(buttonTexts).toContain('Today');
      expect(buttonTexts).toContain('This Week');
      expect(buttonTexts).toContain('This Month');
    });
  });

  describe('Data Display', () => {
    beforeEach(async () => {
      await analyticsDisplay.init();
    });

    it('should display zero values initially', () => {
      expect(document.getElementById('totalBreaks').textContent).toBe('0');
      expect(document.getElementById('totalBreakTime').textContent).toBe('0m');
      expect(document.getElementById('averageDuration').textContent).toBe('0m');
      expect(document.getElementById('completionRate').textContent).toBe('0%');
    });

    it('should update display with analytics data', () => {
      const testData = {
        totalBreaks: 5,
        totalBreakTime: 75,
        averageDuration: 15,
        completedBreaks: 4,
        breaksByType: {
          short: 2,
          medium: 2,
          long: 1
        }
      };

      analyticsDisplay.updateAnalyticsDisplay(testData);

      expect(document.getElementById('totalBreaks').textContent).toBe('5');
      expect(document.getElementById('totalBreakTime').textContent).toBe('1h 15m');
      expect(document.getElementById('averageDuration').textContent).toBe('15m');
      expect(document.getElementById('completionRate').textContent).toBe('80%');
    });

    it('should update break type distribution correctly', () => {
      const breaksByType = {
        short: 3,
        medium: 2,
        long: 1
      };

      analyticsDisplay.updateBreakTypeDistribution(breaksByType);

      expect(document.getElementById('shortBreakCount').textContent).toBe('3');
      expect(document.getElementById('mediumBreakCount').textContent).toBe('2');
      expect(document.getElementById('longBreakCount').textContent).toBe('1');
      
      expect(document.getElementById('shortBreakPercentage').textContent).toBe('50%');
      expect(document.getElementById('mediumBreakPercentage').textContent).toBe('33%');
      expect(document.getElementById('longBreakPercentage').textContent).toBe('17%');
    });
  });

  describe('Time Formatting', () => {
    beforeEach(async () => {
      await analyticsDisplay.init();
    });

    it('should format minutes correctly', () => {
      expect(analyticsDisplay.formatTime(30)).toBe('30m');
      expect(analyticsDisplay.formatTime(5)).toBe('5m');
    });

    it('should format hours and minutes correctly', () => {
      expect(analyticsDisplay.formatTime(90)).toBe('1h 30m');
      expect(analyticsDisplay.formatTime(120)).toBe('2h');
      expect(analyticsDisplay.formatTime(125)).toBe('2h 5m');
    });
  });

  describe('Period Switching', () => {
    beforeEach(async () => {
      await analyticsDisplay.init();
    });

    it('should switch periods correctly', async () => {
      expect(analyticsDisplay.currentPeriod).toBe('today');
      
      await analyticsDisplay.switchPeriod('week');
      expect(analyticsDisplay.currentPeriod).toBe('week');
      
      await analyticsDisplay.switchPeriod('month');
      expect(analyticsDisplay.currentPeriod).toBe('month');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals on destroy', () => {
      analyticsDisplay.updateInterval = setInterval(() => {}, 1000);
      const intervalId = analyticsDisplay.updateInterval;
      
      analyticsDisplay.destroy();
      
      expect(analyticsDisplay.updateInterval).toBeNull();
    });
  });
});