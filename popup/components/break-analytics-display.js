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
        return;
      }

      // Initialize analytics tracker
      if (typeof BreakAnalyticsTracker !== 'undefined') {
        this.analyticsTracker = new BreakAnalyticsTracker();
        await this.analyticsTracker.init();
      } else {
        console.error('BreakAnalyticsTracker not available');
        return;
      }

      // Create the UI
      this.createAnalyticsUI();
      
      // Load initial data
      await this.loadAnalyticsData();
      
      // Set up periodic updates (every 30 seconds)
      this.updateInterval = setInterval(() => {
        this.loadAnalyticsData();
      }, 30000);
      
      console.log('Break Analytics Display initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Break Analytics Display:', error);
    }
  }

  /**
   * Create the analytics UI structure
   */
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
        this.showError();
        return;
      }

      // Get comprehensive analytics
      const analytics = await this.analyticsTracker.getComprehensiveAnalytics();
      
      if (!analytics) {
        this.showError();
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

      // Check if we have any data
      if (!periodData || periodData.totalBreaks === 0) {
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