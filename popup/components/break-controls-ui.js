/**
 * Break Controls UI Component - Handles break timer controls interface
 * Provides UI for manual break initiation and work timer display
 */

class BreakControlsUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.breakTimerManager = null;
    this.updateInterval = null;
    
    // UI elements
    this.workTimerDisplay = null;
    this.breakTimerDisplay = null;
    this.takeBreakButton = null;
    this.endBreakButton = null;
    this.breakTypeModal = null;
    this.breakTypeButtons = null;
    this.workControls = null;
    this.breakControls = null;
    
    this.init();
  }

  /**
   * Initialize the break controls UI component
   */
  async init() {
    try {
      // Create UI elements
      this.createBreakControlsUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize break timer manager connection
      await this.initializeBreakTimerManager();
      
      // Start UI updates
      this.startUIUpdates();
      
      console.log("BreakControlsUI initialized successfully");
    } catch (error) {
      console.error("BreakControlsUI initialization error:", error);
    }
  }

  /**
   * Create the break controls UI elements
   */
  createBreakControlsUI() {
    if (!this.container) {
      console.error("Break controls container not found");
      return;
    }

    // Create break controls HTML
    const controlsHTML = `
      <div class="break-controls-section">
        
        <!-- Work Timer Display -->
        <div class="work-timer-display" id="workTimerDisplay">
          <div class="timer-header">
            <div class="timer-label">Work Session</div>
            <div class="timer-status" id="workTimerStatus">Ready to work</div>
          </div>
          <div class="timer-value" id="workTimerValue">00:00</div>
          <div class="timer-progress">
            <div class="progress-bar">
              <div class="progress-fill" id="workProgressFill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <!-- Work Controls -->
        <div class="work-controls" id="workControls">
          <button class="btn btn-break-primary" id="takeBreakButton">
            <span class="btn-icon">⏰</span>
            <span>Take Break</span>
          </button>
          <div class="secondary-controls">
            <button class="btn btn-break-secondary" id="resetWorkTimerButton">
              <span class="btn-icon">🔄</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        <!-- Break Timer Display -->
        <div class="break-timer-display" id="breakTimerDisplay" style="display: none;">
          <div class="timer-header">
            <div class="timer-label">Break Time</div>
            <div class="timer-status" id="breakTimerStatus">On break</div>
          </div>
          <div class="timer-value" id="breakTimerValue">00:00</div>
          <div class="timer-progress">
            <div class="progress-bar">
              <div class="progress-fill break-progress" id="breakProgressFill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <!-- Break Controls -->
        <div class="break-controls" id="breakControls" style="display: none;">
          <button class="btn btn-break-primary" id="endBreakButton">
            <span class="btn-icon">✅</span>
            <span>End Break</span>
          </button>
          <div class="secondary-controls">
            <button class="btn btn-break-danger" id="cancelBreakButton">
              <span class="btn-icon">❌</span>
              <span>Cancel</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Break Type Selection Modal -->
      <div class="modal-overlay" id="breakTypeModal" style="display: none;">
        <div class="modal-content break-type-modal">
          <div class="modal-header">
            <h3>Choose Your Break</h3>
            <button class="modal-close" id="closeBreakTypeModal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="break-type-options">
              <button class="break-type-btn" data-break-type="short" data-duration="5">
                <div class="break-type-icon">☕</div>
                <div class="break-type-info">
                  <div class="break-type-name">Short Break</div>
                  <div class="break-type-duration">5 minutes</div>
                  <div class="break-type-desc">Quick refresh</div>
                </div>
              </button>
              <button class="break-type-btn" data-break-type="medium" data-duration="15">
                <div class="break-type-icon">🚶</div>
                <div class="break-type-info">
                  <div class="break-type-name">Medium Break</div>
                  <div class="break-type-duration">15 minutes</div>
                  <div class="break-type-desc">Walk around</div>
                </div>
              </button>
              <button class="break-type-btn" data-break-type="long" data-duration="30">
                <div class="break-type-icon">🧘</div>
                <div class="break-type-info">
                  <div class="break-type-name">Long Break</div>
                  <div class="break-type-duration">30 minutes</div>
                  <div class="break-type-desc">Full recharge</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert controls HTML into container
    this.container.insertAdjacentHTML('beforeend', controlsHTML);

    // Get references to UI elements
    this.workTimerDisplay = document.getElementById('workTimerDisplay');
    this.breakTimerDisplay = document.getElementById('breakTimerDisplay');
    this.workTimerValue = document.getElementById('workTimerValue');
    this.workTimerStatus = document.getElementById('workTimerStatus');
    this.breakTimerValue = document.getElementById('breakTimerValue');
    this.breakTimerStatus = document.getElementById('breakTimerStatus');
    
    this.takeBreakButton = document.getElementById('takeBreakButton');
    this.endBreakButton = document.getElementById('endBreakButton');
    this.cancelBreakButton = document.getElementById('cancelBreakButton');
    this.resetWorkTimerButton = document.getElementById('resetWorkTimerButton');
    
    this.workControls = document.getElementById('workControls');
    this.breakControls = document.getElementById('breakControls');
    
    this.breakTypeModal = document.getElementById('breakTypeModal');
    this.closeBreakTypeModal = document.getElementById('closeBreakTypeModal');
    this.breakTypeButtons = document.querySelectorAll('.break-type-btn');
  }

  /**
   * Setup event listeners for break controls
   */
  setupEventListeners() {
    // Take break button
    this.takeBreakButton?.addEventListener('click', () => {
      this.showBreakTypeModal();
    });

    // End break button
    this.endBreakButton?.addEventListener('click', () => {
      this.handleEndBreak();
    });

    // Cancel break button
    this.cancelBreakButton?.addEventListener('click', () => {
      this.handleCancelBreak();
    });

    // Reset work timer button
    this.resetWorkTimerButton?.addEventListener('click', () => {
      this.handleResetWorkTimer();
    });

    // Break type selection buttons
    this.breakTypeButtons?.forEach(button => {
      button.addEventListener('click', () => {
        const breakType = button.dataset.breakType;
        const duration = parseInt(button.dataset.duration);
        this.handleBreakTypeSelection(breakType, duration);
      });
    });

    // Modal close button
    this.closeBreakTypeModal?.addEventListener('click', () => {
      this.hideBreakTypeModal();
    });

    // Modal backdrop click
    this.breakTypeModal?.addEventListener('click', (e) => {
      if (e.target === this.breakTypeModal) {
        this.hideBreakTypeModal();
      }
    });
  }

  /**
   * Initialize break timer manager connection
   */
  async initializeBreakTimerManager() {
    try {
      // Get break timer status from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_BREAK_TIMER_STATUS'
      });

      if (response.success) {
        this.updateUIFromStatus(response.data);
      }
    } catch (error) {
      console.error("Error initializing break timer manager connection:", error);
    }
  }

  /**
   * Start periodic UI updates
   */
  startUIUpdates() {
    // Update every second
    this.updateInterval = setInterval(() => {
      this.updateTimerDisplays();
    }, 1000);
  }

  /**
   * Update timer displays
   */
  async updateTimerDisplays() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_BREAK_TIMER_STATUS'
      });

      if (response.success) {
        this.updateUIFromStatus(response.data);
      }
    } catch (error) {
      console.error("Error updating timer displays:", error);
    }
  }

  /**
   * Update UI from timer status
   */
  updateUIFromStatus(status) {
    if (!status) return;

    // Update work timer display
    if (this.workTimerValue) {
      const workTime = status.currentWorkTime || 0;
      this.workTimerValue.textContent = this.formatTime(workTime);
    }

    // Update work progress bar
    const workProgressFill = document.getElementById('workProgressFill');
    if (workProgressFill && status.workTimeThresholdMs) {
      const workTime = status.currentWorkTime || 0;
      const threshold = status.workTimeThresholdMs || (30 * 60 * 1000); // 30 minutes default
      const progressPercentage = Math.min(100, (workTime / threshold) * 100);
      workProgressFill.style.width = `${progressPercentage}%`;
    }

    if (this.workTimerStatus) {
      if (status.isWorkTimerActive) {
        this.workTimerStatus.textContent = "Working...";
        this.workTimerStatus.className = "timer-status active";
      } else if (status.isOnBreak) {
        this.workTimerStatus.textContent = "On break";
        this.workTimerStatus.className = "timer-status break";
      } else {
        this.workTimerStatus.textContent = "Ready to work";
        this.workTimerStatus.className = "timer-status ready";
      }
    }

    // Update break timer display
    if (status.isOnBreak) {
      this.showBreakControls();
      
      if (this.breakTimerValue) {
        const remainingTime = status.remainingBreakTime || 0;
        this.breakTimerValue.textContent = this.formatTime(remainingTime);
      }

      // Update break progress bar
      const breakProgressFill = document.getElementById('breakProgressFill');
      if (breakProgressFill && status.totalBreakTime) {
        const remainingTime = status.remainingBreakTime || 0;
        const totalTime = status.totalBreakTime || 1;
        const progressPercentage = Math.max(0, ((totalTime - remainingTime) / totalTime) * 100);
        breakProgressFill.style.width = `${progressPercentage}%`;
      }

      if (this.breakTimerStatus) {
        const breakType = status.breakType || 'break';
        this.breakTimerStatus.textContent = `${breakType.charAt(0).toUpperCase() + breakType.slice(1)} break`;
      }
    } else {
      this.showWorkControls();
    }

    // Update take break button state
    if (this.takeBreakButton) {
      const buttonText = this.takeBreakButton.querySelector('span:last-child');
      if (status.isThresholdExceeded) {
        this.takeBreakButton.classList.add('recommended');
        if (buttonText) {
          buttonText.textContent = 'Take Break (Recommended)';
        }
      } else {
        this.takeBreakButton.classList.remove('recommended');
        if (buttonText) {
          buttonText.textContent = 'Take Break';
        }
      }
    }
  }

  /**
   * Show work controls, hide break controls
   */
  showWorkControls() {
    if (this.workControls) {
      this.workControls.style.display = 'block';
    }
    if (this.breakControls) {
      this.breakControls.style.display = 'none';
    }
    if (this.workTimerDisplay) {
      this.workTimerDisplay.style.display = 'block';
    }
    if (this.breakTimerDisplay) {
      this.breakTimerDisplay.style.display = 'none';
    }
  }

  /**
   * Show break controls, hide work controls
   */
  showBreakControls() {
    if (this.workControls) {
      this.workControls.style.display = 'none';
    }
    if (this.breakControls) {
      this.breakControls.style.display = 'block';
    }
    if (this.workTimerDisplay) {
      this.workTimerDisplay.style.display = 'none';
    }
    if (this.breakTimerDisplay) {
      this.breakTimerDisplay.style.display = 'block';
    }
  }

  /**
   * Show break type selection modal
   */
  showBreakTypeModal() {
    if (this.breakTypeModal) {
      this.breakTypeModal.style.display = 'flex';
    }
  }

  /**
   * Hide break type selection modal
   */
  hideBreakTypeModal() {
    if (this.breakTypeModal) {
      this.breakTypeModal.style.display = 'none';
    }
  }

  /**
   * Handle break type selection
   */
  async handleBreakTypeSelection(breakType, duration) {
    try {
      this.hideBreakTypeModal();

      const response = await chrome.runtime.sendMessage({
        type: 'START_BREAK',
        breakType: breakType,
        durationMinutes: duration
      });

      if (response.success) {
        console.log(`Started ${breakType} break for ${duration} minutes`);
        // UI will be updated by the periodic update
      } else {
        console.error("Failed to start break:", response.error);
        this.showError("Failed to start break. Please try again.");
      }
    } catch (error) {
      console.error("Error starting break:", error);
      this.showError("Error starting break. Please try again.");
    }
  }

  /**
   * Handle end break button click
   */
  async handleEndBreak() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'END_BREAK'
      });

      if (response.success) {
        console.log("Break ended successfully");
        // UI will be updated by the periodic update
      } else {
        console.error("Failed to end break:", response.error);
        this.showError("Failed to end break. Please try again.");
      }
    } catch (error) {
      console.error("Error ending break:", error);
      this.showError("Error ending break. Please try again.");
    }
  }

  /**
   * Handle cancel break button click
   */
  async handleCancelBreak() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CANCEL_BREAK'
      });

      if (response.success) {
        console.log("Break cancelled successfully");
        // UI will be updated by the periodic update
      } else {
        console.error("Failed to cancel break:", response.error);
        this.showError("Failed to cancel break. Please try again.");
      }
    } catch (error) {
      console.error("Error cancelling break:", error);
      this.showError("Error cancelling break. Please try again.");
    }
  }

  /**
   * Handle reset work timer button click
   */
  async handleResetWorkTimer() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RESET_WORK_TIMER'
      });

      if (response.success) {
        console.log("Work timer reset successfully");
        // UI will be updated by the periodic update
      } else {
        console.error("Failed to reset work timer:", response.error);
        this.showError("Failed to reset work timer. Please try again.");
      }
    } catch (error) {
      console.error("Error resetting work timer:", error);
      this.showError("Error resetting work timer. Please try again.");
    }
  }

  /**
   * Format time in milliseconds to MM:SS format
   */
  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error("BreakControlsUI Error:", message);
    // You can implement a toast notification or error display here
    console.error("BreakControlsUI:", message); // Replaced alert with console logging
  }

  /**
   * Destroy the break controls UI component
   */
  destroy() {
    try {
      // Clear update interval
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Remove event listeners
      this.takeBreakButton?.removeEventListener('click', this.showBreakTypeModal);
      this.endBreakButton?.removeEventListener('click', this.handleEndBreak);
      this.cancelBreakButton?.removeEventListener('click', this.handleCancelBreak);
      this.resetWorkTimerButton?.removeEventListener('click', this.handleResetWorkTimer);

      // Clear references
      this.container = null;
      this.breakTimerManager = null;
      this.workTimerDisplay = null;
      this.breakTimerDisplay = null;
      this.takeBreakButton = null;
      this.endBreakButton = null;
      this.breakTypeModal = null;
      this.breakTypeButtons = null;
      this.workControls = null;
      this.breakControls = null;

      console.log("BreakControlsUI destroyed");
    } catch (error) {
      console.error("Error destroying BreakControlsUI:", error);
    }
  }
}

// Export for use in popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreakControlsUI;
} else if (typeof window !== "undefined") {
  window.BreakControlsUI = BreakControlsUI;
}