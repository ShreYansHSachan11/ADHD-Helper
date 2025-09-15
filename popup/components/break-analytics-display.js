/**
 * Break Analytics Display Component
 * Displays break statistics and patterns in the popup interface
 */

class BreakAnalyticsDisplay {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.analyticsTracker = null;
    this.currentPeriod = 'today';
    this.updateInterval = null;
    
    this.init();
  }

  /**
   * Initialize the analytics display component
   */
  async init() {
    try {
      // Get container element
      this.container = document.getElementById(this.containerId);
      if (!this.container) {
        console.error(`Analytics container not found: ${this.containerId}`);
        // Try to create container if it doesn't exist
        this.createContainerIfMissing();
        return;
      }

      // Initialize analytics tracker with error handling
      try {
        if (typeof BreakAnalyticsTracker !== 'undefined') {
          this.analyticsTracker = new BreakAnalyticsTracker();
          await this.analyticsTracker.init();
        } else {
          console.warn('BreakAnalyticsTracker not available, using fallback mode');
          this.initializeFallbackMode();
          return;
        }
      } catch (error) {
        console.warn('Failed to initialize BreakAnalyticsTracker, using fallback:', error);
        this.initializeFallbackMode();
        return;
      }

      // Create the UI
      this.createAnalyticsUI();
      
      // Load initial data with error handling
      try {
        await this.loadAnalyticsData();
      } catch (error) {
        console.error('Failed to load initial analytics data:', error);
        this.showError();
      }
      
      // Set up periodic updates (every 30 seconds)
      this.updateInterval = setInterval(() => {
        this.loadAnalyticsData().catch(error => {
          console.error('Failed to update analytics data:', error);
        });
      }, 30000);
      
      console.log('Break Analytics Display initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Break Analytics Display:', error);
      this.initializeFallbackMode();
    }
  }

  /**
   * Create container if missing
   */
  createContainerIfMissing() {
    const breakReminderPanel = document.getElementById('break-reminderPanel');
    if (breakReminderPanel) {
      const analyticsContainer = document.createElement('div');
      analyticsContainer.id = this.containerId;
      analyticsContainer.className = 'break-analytics';
      breakReminderPanel.querySelector('.panel-content').appendChild(analyticsContainer);
      this.container = analyticsContainer;
      
      // Retry initialization
      setTimeout(() => this.init(), 100);
    }
  }

  /**
   * Initialize fallback mode when analytics tracker is not available
   */
  initializeFallbackMode() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="analytics-fallback">
        <div class="fallback-icon">📊</div>
        <div class="fallback-message">
          <h4>Analytics Unavailable</h4>
          <p>Break analytics will be available once you start taking breaks.</p>
        </div>
      </div>
    `;
    
    console.log('Break Analytics Display running in fallback mode');
  }



  /**
   * Create the analytics UI structure
   */
  createAnalyticsUI() {
    this.container.innerHTML = `
      <div class="analytics-header">
        <h3>Break Analytics</h3>
        <div class="analytics-controls">
          <div class="period-selector">
            <button class="period-btn active" data-period="today">Today</button>
            <button class="period-btn" data-period="week">This Week</button>
            <button class="period-btn" data-period="month">This Month</button>
          </div>
          <button class="clean-data-btn" id="cleanAnalyticsBtn" title="Clean all analytics data">
            🗑️
          </button>
        </div>
      </div>
      
      <div class="analytics-content">
        <div class="analytics-loading" id="analyticsLoading">
          <div class="loading-spinner"></div>
          <span>Loading analytics...</span>
        </div>
        
        <div class="analytics-stats" id="analyticsStats" style="display: none;">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">⏰</div>
              <div class="stat-info">
                <div class="stat-value" id="totalBreaks">0</div>
                <div class="stat-label">Total Breaks</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">⏱️</div>
              <div class="stat-info">
                <div class="stat-value" id="totalBreakTime">0m</div>
                <div class="stat-label">Break Time</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-info">
                <div class="stat-value" id="averageDuration">0m</div>
                <div class="stat-label">Avg Duration</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-info">
                <div class="stat-value" id="completionRate">0%</div>
                <div class="stat-label">Completion Rate</div>
              </div>
            </div>
          </div>
          
          <div class="break-type-distribution">
            <h4>Break Type Distribution</h4>
            <div class="distribution-bars">
              <div class="distribution-item">
                <div class="distribution-header">
                  <span class="break-type-label">
                    <span class="break-type-icon">⏱️</span>
                    Short (5min)
                  </span>
                  <span class="break-type-count" id="shortBreakCount">0</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill short-break" id="shortBreakProgress" style="width: 0%"></div>
                </div>
                <div class="break-type-percentage" id="shortBreakPercentage">0%</div>
              </div>
              
              <div class="distribution-item">
                <div class="distribution-header">
                  <span class="break-type-label">
                    <span class="break-type-icon">⏰</span>
                    Medium (15min)
                  </span>
                  <span class="break-type-count" id="mediumBreakCount">0</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill medium-break" id="mediumBreakProgress" style="width: 0%"></div>
                </div>
                <div class="break-type-percentage" id="mediumBreakPercentage">0%</div>
              </div>
              
              <div class="distribution-item">
                <div class="distribution-header">
                  <span class="break-type-label">
                    <span class="break-type-icon">🕐</span>
                    Long (30min)
                  </span>
                  <span class="break-type-count" id="longBreakCount">0</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill long-break" id="longBreakProgress" style="width: 0%"></div>
                </div>
                <div class="break-type-percentage" id="longBreakPercentage">0%</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="analytics-empty" id="analyticsEmpty" style="display: none;">
          <div class="empty-icon">📊</div>
          <div class="empty-message">
            <h4>No break data yet</h4>
            <p>Start taking breaks to see your analytics!</p>
          </div>
        </div>
        
        <div class="analytics-error" id="analyticsError" style="display: none;">
          <div class="error-icon">⚠️</div>
          <div class="error-message">
            <h4>Unable to load analytics</h4>
            <p>Please try again later.</p>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for the analytics UI
   */
  setupEventListeners() {
    // Period selector buttons
    const periodButtons = this.container.querySelectorAll('.period-btn');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const period = e.target.dataset.period;
        this.switchPeriod(period);
      });
    });

    // Clean analytics data button
    const cleanBtn = this.container.querySelector('#cleanAnalyticsBtn');
    if (cleanBtn) {
      cleanBtn.addEventListener('click', () => {
        this.handleCleanAnalytics();
      });
    }
  }

  /**
   * Switch to a different time period
   */
  async switchPeriod(period) {
    if (this.currentPeriod === period) return;
    
    // Update button states
    const periodButtons = this.container.querySelectorAll('.period-btn');
    periodButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    
    this.currentPeriod = period;
    
    // Reload data for new period
    await this.loadAnalyticsData();
  }

  /**
   * Load analytics data for the current period
   */
  async loadAnalyticsData() {
    try {
      this.showLoading();
      
      if (!this.analyticsTracker) {
        console.log('Analytics tracker not available, checking for raw data...');
        await this.loadRawAnalyticsData();
        return;
      }

      // Get comprehensive analytics
      const analytics = await this.analyticsTracker.getComprehensiveAnalytics();
      
      console.log('Analytics data loaded:', analytics);
      
      if (!analytics) {
        console.log('No analytics data returned, showing empty state');
        this.showEmpty();
        return;
      }

      // Get data for current period
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

      console.log(`Period data for ${this.currentPeriod}:`, periodData);

      // Check if we have any data
      if (!periodData || periodData.totalBreaks === 0) {
        console.log('No break data for current period, showing empty state');
        this.showEmpty();
        return;
      }

      // Update the display
      this.updateAnalyticsDisplay(periodData);
      this.showStats();
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      this.showError();
    }
  }

  /**
   * Load raw analytics data when tracker is not available
   */
  async loadRawAnalyticsData() {
    try {
      if (typeof StorageManager === 'undefined') {
        this.showEmpty();
        return;
      }

      const storageManager = new StorageManager();
      
      // Check for existing break sessions
      const sessions = await storageManager.get('breakSessions') || [];
      const dailyStats = await storageManager.get('dailyBreakStats') || {};
      
      console.log('Raw data check - Sessions:', sessions.length, 'Daily stats:', Object.keys(dailyStats).length);
      
      if (sessions.length === 0 && Object.keys(dailyStats).length === 0) {
        this.showEmpty();
        return;
      }

      // Try to create analytics from raw data
      const today = new Date().toISOString().split('T')[0];
      const todayStats = dailyStats[today];
      
      if (todayStats && todayStats.totalBreaks > 0) {
        console.log('Found today stats:', todayStats);
        this.updateAnalyticsDisplay(todayStats);
        this.showStats();
      } else {
        this.showEmpty();
      }
      
    } catch (error) {
      console.error('Failed to load raw analytics data:', error);
      this.showError();
    }
  }

  /**
   * Update the analytics display with data
   */
  updateAnalyticsDisplay(data) {
    try {
      // Update main stats
      this.updateElement('totalBreaks', data.totalBreaks || 0);
      this.updateElement('totalBreakTime', this.formatTime(data.totalBreakTime || 0));
      this.updateElement('averageDuration', this.formatTime(data.averageDuration || 0));
      
      // Calculate completion rate
      const completionRate = data.totalBreaks > 0 
        ? Math.round((data.completedBreaks || 0) / data.totalBreaks * 100)
        : 0;
      this.updateElement('completionRate', `${completionRate}%`);

      // Update break type distribution
      this.updateBreakTypeDistribution(data.breaksByType || {});
      
    } catch (error) {
      console.error('Failed to update analytics display:', error);
    }
  }

  /**
   * Update break type distribution visualization
   */
  updateBreakTypeDistribution(breaksByType) {
    const types = ['short', 'medium', 'long'];
    const total = Object.values(breaksByType).reduce((sum, count) => sum + count, 0);
    
    types.forEach(type => {
      const count = breaksByType[type] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      
      // Update count
      this.updateElement(`${type}BreakCount`, count);
      
      // Update percentage
      this.updateElement(`${type}BreakPercentage`, `${percentage}%`);
      
      // Update progress bar with animation
      const progressBar = document.getElementById(`${type}BreakProgress`);
      if (progressBar) {
        // Animate the progress bar
        setTimeout(() => {
          progressBar.style.width = `${percentage}%`;
        }, 100);
      }
    });
  }

  /**
   * Update a DOM element's text content
   */
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      // Add animation class for value changes
      if (element.textContent !== value.toString()) {
        element.classList.add('value-updating');
        setTimeout(() => {
          element.textContent = value;
          element.classList.remove('value-updating');
        }, 150);
      }
    }
  }

  /**
   * Format time in minutes to human readable format
   */
  formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.hideAllStates();
    const loading = document.getElementById('analyticsLoading');
    if (loading) {
      loading.style.display = 'flex';
    }
  }

  /**
   * Show statistics
   */
  showStats() {
    this.hideAllStates();
    const stats = document.getElementById('analyticsStats');
    if (stats) {
      stats.style.display = 'block';
      // Add fade-in animation
      stats.classList.add('fade-in');
      setTimeout(() => {
        stats.classList.remove('fade-in');
      }, 300);
    }
  }

  /**
   * Show empty state
   */
  showEmpty() {
    this.hideAllStates();
    const empty = document.getElementById('analyticsEmpty');
    if (empty) {
      empty.style.display = 'block';
    }
  }

  /**
   * Show error state
   */
  showError() {
    this.hideAllStates();
    const error = document.getElementById('analyticsError');
    if (error) {
      error.style.display = 'block';
    }
  }

  /**
   * Hide all state displays
   */
  hideAllStates() {
    const states = ['analyticsLoading', 'analyticsStats', 'analyticsEmpty', 'analyticsError'];
    states.forEach(stateId => {
      const element = document.getElementById(stateId);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  /**
   * Refresh analytics data
   */
  async refresh() {
    await this.loadAnalyticsData();
  }

  /**
   * Refresh analytics data (alias for external calls)
   */
  async refreshData() {
    await this.loadAnalyticsData();
  }

  /**
   * Handle clean analytics button click
   */
  async handleCleanAnalytics() {
    try {
      console.log("Cleaning analytics data from component...");
      
      // Send message to background script to clean data
      const response = await chrome.runtime.sendMessage({
        type: "CLEAN_ANALYTICS_DATA",
      });

      if (response && response.success) {
        console.log("Analytics data cleaned successfully");
        
        // Show success feedback
        this.showTemporaryMessage("Analytics data cleaned successfully!", "success");
        
        // Refresh the display to show empty state
        await this.loadAnalyticsData();
      } else {
        console.error("Failed to clean analytics data:", response?.error);
        this.showTemporaryMessage("Failed to clean analytics data: " + (response?.error || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Error cleaning analytics data:", error);
      this.showTemporaryMessage("Error cleaning analytics data: " + error.message, "error");
    }
  }

  /**
   * Show temporary message to user
   */
  showTemporaryMessage(message, type = "info") {
    // Create temporary message element
    const messageEl = document.createElement('div');
    messageEl.className = `analytics-message analytics-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      animation: fadeInOut 3s ease-in-out;
    `;
    
    // Add CSS animation if not already present
    if (!document.querySelector('#analytics-message-styles')) {
      const style = document.createElement('style');
      style.id = 'analytics-message-styles';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    this.container.style.position = 'relative';
    this.container.appendChild(messageEl);
    
    // Remove message after animation
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  /**
   * Cleanup when component is destroyed
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BreakAnalyticsDisplay;
} else if (typeof self !== 'undefined') {
  self.BreakAnalyticsDisplay = BreakAnalyticsDisplay;
}