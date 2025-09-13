/**
 * Break Controls UI Tests
 * Tests the popup break controls interface functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(),
    }
  },
  action: {
    setBadgeText: vi.fn().mockResolvedValue(),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(),
    setTitle: vi.fn().mockResolvedValue(),
  }
};

global.chrome = mockChrome;

describe('Break Controls UI', () => {
  let dom;
  let document;
  let window;
  let BreakTimerManager;
  let breakControls;

  beforeEach(async () => {
    // Create DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <!-- Break Reminder Panel -->
          <div class="feature-panel" id="breakReminderPanel">
            <div class="panel-header">
              <h2>Break Reminder</h2>
              <span class="current-time" id="currentTime">0m 0s</span>
            </div>
            <div class="panel-content">
              <!-- Break Status Display -->
              <div class="break-status" id="breakStatus" style="display: none;">
                <div class="break-info">
                  <span class="break-type" id="breakType">Short Break</span>
                  <span class="break-time-remaining" id="breakTimeRemaining">5:00</span>
                </div>
                <div class="break-controls">
                  <button class="btn btn-small btn-secondary" id="endBreakBtn">
                    End Break Early
                  </button>
                </div>
              </div>
              
              <!-- Work Timer Controls -->
              <div class="work-controls" id="workControls">
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
            </div>
          </div>

          <!-- Break Type Selection Modal -->
          <div class="modal" id="breakTypeModal" style="display: none">
            <div class="modal-content">
              <div class="modal-header">
                <h3>Choose Break Type</h3>
                <button class="close-btn" id="closeBreakTypeBtn">&times;</button>
              </div>
              <div class="break-type-container">
                <div class="break-type-options">
                  <button class="break-type-btn" data-break-type="short" data-duration="5">
                    <span class="break-type-icon">⏱️</span>
                    <span class="break-type-label">Short Break</span>
                    <span class="break-type-duration">5 minutes</span>
                  </button>
                  <button class="break-type-btn" data-break-type="medium" data-duration="15">
                    <span class="break-type-icon">⏰</span>
                    <span class="break-type-label">Medium Break</span>
                    <span class="break-type-duration">15 minutes</span>
                  </button>
                  <button class="break-type-btn" data-break-type="long" data-duration="30">
                    <span class="break-type-icon">🕐</span>
                    <span class="break-type-label">Long Break</span>
                    <span class="break-type-duration">30 minutes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `, { 
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;

    // Load dependencies
    const { default: StorageManager } = await import('../services/storage-manager.js');
    const { default: BreakTimerManagerClass } = await import('../services/break-timer-manager.js');
    
    BreakTimerManager = BreakTimerManagerClass;
    global.StorageManager = StorageManager;
    global.BreakTimerManager = BreakTimerManager;

    // Create break controls instance
    breakControls = new TestBreakControls();
  });

  afterEach(() => {
    if (breakControls && breakControls.breakUpdateInterval) {
      clearInterval(breakControls.breakUpdateInterval);
    }
    dom?.window?.close();
  });

  describe('UI Element Initialization', () => {
    it('should initialize all required DOM elements', () => {
      expect(breakControls.currentTimeEl).toBeTruthy();
      expect(breakControls.timeLimitInput).toBeTruthy();
      expect(breakControls.takeBreakBtn).toBeTruthy();
      expect(breakControls.breakStatus).toBeTruthy();
      expect(breakControls.workControls).toBeTruthy();
      expect(breakControls.breakTypeModal).toBeTruthy();
      expect(breakControls.breakTypeButtons).toHaveLength(3);
    });

    it('should initialize break timer manager', () => {
      expect(breakControls.breakTimerManager).toBeInstanceOf(BreakTimerManager);
    });

    it('should start periodic UI updates', () => {
      expect(breakControls.breakUpdateInterval).toBeTruthy();
    });
  });

  describe('Work Timer Display', () => {
    it('should display work time correctly', async () => {
      // Simulate 25 minutes of work time
      breakControls.breakTimerManager.totalWorkTime = 25 * 60 * 1000;
      breakControls.breakTimerManager.workStartTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      breakControls.breakTimerManager.isWorkTimerActive = true;

      await breakControls.updateBreakControlsUI();

      const displayText = breakControls.currentTimeEl.textContent;
      expect(displayText).toMatch(/30m \d+s/); // Should show ~30 minutes
    });

    it('should add warning class when approaching threshold', async () => {
      // Simulate 22 minutes of work time
      breakControls.breakTimerManager.totalWorkTime = 22 * 60 * 1000;
      breakControls.breakTimerManager.isWorkTimerActive = true;

      await breakControls.updateBreakControlsUI();

      expect(breakControls.currentTimeEl.classList.contains('time-warning')).toBe(true);
    });

    it('should add danger class when threshold exceeded', async () => {
      // Simulate 35 minutes of work time (exceeds 30 min threshold)
      breakControls.breakTimerManager.totalWorkTime = 35 * 60 * 1000;
      breakControls.breakTimerManager.isWorkTimerActive = true;

      await breakControls.updateBreakControlsUI();

      expect(breakControls.currentTimeEl.classList.contains('time-danger')).toBe(true);
    });
  });

  describe('Work Controls Display', () => {
    it('should show work controls when not on break', async () => {
      breakControls.breakTimerManager.isOnBreak = false;
      breakControls.breakTimerManager.isWorkTimerActive = true;

      await breakControls.updateBreakControlsUI();

      expect(breakControls.workControls.style.display).toBe('block');
      expect(breakControls.breakStatus.style.display).toBe('none');
    });

    it('should enable take break button when work timer is active', async () => {
      breakControls.breakTimerManager.isWorkTimerActive = true;
      breakControls.breakTimerManager.isOnBreak = false;

      await breakControls.updateBreakControlsUI();

      expect(breakControls.takeBreakBtn.disabled).toBe(false);
    });

    it('should update button text when threshold exceeded', async () => {
      breakControls.breakTimerManager.totalWorkTime = 35 * 60 * 1000;
      breakControls.breakTimerManager.isWorkTimerActive = true;
      breakControls.breakTimerManager.isOnBreak = false;

      await breakControls.updateBreakControlsUI();

      expect(breakControls.takeBreakBtn.textContent).toBe('Take Break Now (Recommended)');
      expect(breakControls.takeBreakBtn.classList.contains('btn-primary')).toBe(true);
    });
  });

  describe('Break Status Display', () => {
    it('should show break status when on break', async () => {
      breakControls.breakTimerManager.isOnBreak = true;
      breakControls.breakTimerManager.breakType = 'short';
      breakControls.breakTimerManager.breakStartTime = Date.now();
      breakControls.breakTimerManager.breakDuration = 5 * 60 * 1000; // 5 minutes

      await breakControls.updateBreakControlsUI();

      expect(breakControls.breakStatus.style.display).toBe('block');
      expect(breakControls.workControls.style.display).toBe('none');
      expect(breakControls.breakType.textContent).toBe('Short Break');
    });

    it('should display remaining break time correctly', async () => {
      const now = Date.now();
      breakControls.breakTimerManager.isOnBreak = true;
      breakControls.breakTimerManager.breakType = 'medium';
      breakControls.breakTimerManager.breakStartTime = now - (2 * 60 * 1000); // Started 2 minutes ago
      breakControls.breakTimerManager.breakDuration = 15 * 60 * 1000; // 15 minutes total

      await breakControls.updateBreakControlsUI();

      const remainingText = breakControls.breakTimeRemaining.textContent;
      expect(remainingText).toMatch(/13:\d{2}/); // Should show ~13 minutes remaining
    });
  });

  describe('Break Type Modal', () => {
    it('should show modal when take break button is clicked', async () => {
      breakControls.breakTimerManager.isWorkTimerActive = true;
      
      await breakControls.handleTakeBreak();

      expect(breakControls.breakTypeModal.style.display).toBe('flex');
    });

    it('should close modal when close button is clicked', () => {
      breakControls.breakTypeModal.style.display = 'flex';
      
      breakControls.closeBreakTypeModal();

      expect(breakControls.breakTypeModal.style.display).toBe('none');
    });

    it('should start break when break type is selected', async () => {
      const startBreakSpy = vi.spyOn(breakControls.breakTimerManager, 'startBreak').mockResolvedValue(true);
      
      await breakControls.handleBreakTypeSelection('medium', 15);

      expect(startBreakSpy).toHaveBeenCalledWith('medium', 15);
      expect(breakControls.breakTypeModal.style.display).toBe('none');
    });
  });

  describe('Break Management', () => {
    it('should end break when end break button is clicked', async () => {
      const endBreakSpy = vi.spyOn(breakControls.breakTimerManager, 'endBreak').mockResolvedValue(true);
      
      await breakControls.handleEndBreak();

      expect(endBreakSpy).toHaveBeenCalled();
    });

    it('should update work time threshold when input changes', async () => {
      const updateThresholdSpy = vi.spyOn(breakControls.breakTimerManager, 'updateWorkTimeThreshold').mockResolvedValue(true);
      
      breakControls.timeLimitInput.value = '45';
      breakControls.timeLimitInput.dispatchEvent(new window.Event('change'));

      expect(updateThresholdSpy).toHaveBeenCalledWith(45);
    });
  });

  describe('Event Handling', () => {
    it('should handle break type button clicks', () => {
      const handleSelectionSpy = vi.spyOn(breakControls, 'handleBreakTypeSelection');
      
      const shortBreakBtn = document.querySelector('[data-break-type="short"]');
      shortBreakBtn.click();

      expect(handleSelectionSpy).toHaveBeenCalledWith('short', 5);
    });

    it('should handle modal close button click', () => {
      const closeModalSpy = vi.spyOn(breakControls, 'closeBreakTypeModal');
      
      breakControls.closeBreakTypeBtn.click();

      expect(closeModalSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle break timer manager initialization failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create instance without BreakTimerManager available
      global.BreakTimerManager = undefined;
      const failedControls = new TestBreakControls();

      expect(failedControls.breakTimerManager).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('BreakTimerManager not available')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle UI update errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Remove required DOM element to trigger error
      breakControls.currentTimeEl = null;
      
      await breakControls.updateBreakControlsUI();

      // Should not throw error
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});

// Test implementation of break controls
class TestBreakControls {
  constructor() {
    this.breakTimerManager = null;
    this.breakUpdateInterval = null;
    this.initializeElements();
    this.setupEventListeners();
    this.initializeBreakTimer();
  }

  initializeElements() {
    this.currentTimeEl = document.getElementById("currentTime");
    this.timeLimitInput = document.getElementById("timeLimitInput");
    this.takeBreakBtn = document.getElementById("takeBreakBtn");
    this.resetScreenTimeBtn = document.getElementById("resetScreenTimeBtn");
    
    this.breakStatus = document.getElementById("breakStatus");
    this.workControls = document.getElementById("workControls");
    this.breakType = document.getElementById("breakType");
    this.breakTimeRemaining = document.getElementById("breakTimeRemaining");
    this.endBreakBtn = document.getElementById("endBreakBtn");
    
    this.breakTypeModal = document.getElementById("breakTypeModal");
    this.closeBreakTypeBtn = document.getElementById("closeBreakTypeBtn");
    this.breakTypeButtons = document.querySelectorAll(".break-type-btn");
  }

  setupEventListeners() {
    this.takeBreakBtn?.addEventListener("click", () => this.handleTakeBreak());
    this.endBreakBtn?.addEventListener("click", () => this.handleEndBreak());
    this.closeBreakTypeBtn?.addEventListener("click", () => this.closeBreakTypeModal());
    
    this.breakTypeButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        const breakType = btn.dataset.breakType;
        const duration = parseInt(btn.dataset.duration);
        this.handleBreakTypeSelection(breakType, duration);
      });
    });

    this.timeLimitInput?.addEventListener("change", (e) => {
      const newLimit = parseInt(e.target.value);
      if (this.breakTimerManager && newLimit >= 5 && newLimit <= 180) {
        this.breakTimerManager.updateWorkTimeThreshold(newLimit);
      }
    });
  }

  async initializeBreakTimer() {
    try {
      if (typeof BreakTimerManager !== 'undefined') {
        this.breakTimerManager = new BreakTimerManager();
        this.startBreakControlsUpdates();
        console.log("Break timer manager initialized successfully");
      } else {
        console.warn("BreakTimerManager not available");
        this.breakTimerManager = null;
      }
    } catch (error) {
      console.error("Failed to initialize break timer manager:", error);
      this.breakTimerManager = null;
    }
  }

  startBreakControlsUpdates() {
    this.updateBreakControlsUI();
    this.breakUpdateInterval = setInterval(() => {
      this.updateBreakControlsUI();
    }, 1000);
  }

  async updateBreakControlsUI() {
    try {
      if (!this.breakTimerManager) return;
      
      const status = this.breakTimerManager.getTimerStatus();
      if (!status) return;
      
      // Update work timer display
      const workTimeMinutes = Math.floor(status.currentWorkTime / (1000 * 60));
      const workTimeSeconds = Math.floor((status.currentWorkTime % (1000 * 60)) / 1000);
      const workTimeDisplay = `${workTimeMinutes}m ${workTimeSeconds}s`;
      
      if (this.currentTimeEl) {
        this.currentTimeEl.textContent = workTimeDisplay;
        
        this.currentTimeEl.classList.remove('time-warning', 'time-danger');
        if (status.isThresholdExceeded) {
          this.currentTimeEl.classList.add('time-danger');
        } else if (workTimeMinutes >= 20) {
          this.currentTimeEl.classList.add('time-warning');
        }
      }
      
      // Update break status display
      if (status.isOnBreak) {
        this.showBreakStatus(status);
      } else {
        this.showWorkControls(status);
      }
      
    } catch (error) {
      console.error("Error updating break controls UI:", error);
    }
  }

  showBreakStatus(status) {
    if (this.breakStatus && this.workControls) {
      this.breakStatus.style.display = 'block';
      this.workControls.style.display = 'none';
      
      if (this.breakType && status.breakType) {
        const breakTypeLabels = {
          short: 'Short Break',
          medium: 'Medium Break', 
          long: 'Long Break'
        };
        this.breakType.textContent = breakTypeLabels[status.breakType] || status.breakType;
      }
      
      if (this.breakTimeRemaining) {
        const remainingMs = status.remainingBreakTime;
        const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
        const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        this.breakTimeRemaining.textContent = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
      
      if (this.endBreakBtn) {
        this.endBreakBtn.disabled = false;
      }
    }
  }

  showWorkControls(status) {
    if (this.breakStatus && this.workControls) {
      this.breakStatus.style.display = 'none';
      this.workControls.style.display = 'block';
      
      if (this.takeBreakBtn) {
        this.takeBreakBtn.disabled = !status.isWorkTimerActive;
        
        if (status.isThresholdExceeded) {
          this.takeBreakBtn.textContent = 'Take Break Now (Recommended)';
          this.takeBreakBtn.classList.add('btn-primary');
          this.takeBreakBtn.classList.remove('btn-secondary');
        } else {
          this.takeBreakBtn.textContent = 'Take Break Now';
          this.takeBreakBtn.classList.add('btn-secondary');
          this.takeBreakBtn.classList.remove('btn-primary');
        }
      }
    }
  }

  async handleTakeBreak() {
    this.showBreakTypeModal();
  }

  showBreakTypeModal() {
    if (this.breakTypeModal) {
      this.breakTypeModal.style.display = 'flex';
    }
  }

  closeBreakTypeModal() {
    if (this.breakTypeModal) {
      this.breakTypeModal.style.display = 'none';
    }
  }

  async handleBreakTypeSelection(breakType, duration) {
    this.closeBreakTypeModal();
    
    if (this.breakTimerManager) {
      const success = await this.breakTimerManager.startBreak(breakType, duration);
      if (success) {
        console.log(`Started ${breakType} break for ${duration} minutes`);
      }
    }
  }

  async handleEndBreak() {
    if (this.breakTimerManager) {
      const success = await this.breakTimerManager.endBreak();
      if (success) {
        console.log("Break ended successfully");
      }
    }
  }
}