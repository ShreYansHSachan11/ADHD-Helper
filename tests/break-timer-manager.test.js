/**
 * Break Timer Manager Tests
 * Tests for work time tracking, timer state management, and break functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  windows: {
    onFocusChanged: {
      addListener: vi.fn()
    },
    WINDOW_ID_NONE: -1
  }
};

global.chrome = mockChrome;

// Mock dependencies
const mockStorageManager = {
  get: vi.fn(),
  set: vi.fn(),
  setMultiple: vi.fn(),
  remove: vi.fn()
};

const mockConstants = {
  STORAGE_KEYS: {
    BREAK_TIMER_STATE: 'breakTimerState',
    WORK_SESSION_DATA: 'workSessionData',
    BREAK_SETTINGS: 'breakSettings'
  }
};

const mockHelpers = {
  TimeUtils: {
    now: () => Date.now(),
    timeDiff: (startTime) => Date.now() - startTime
  }
};

// Mock global imports
global.importScripts = vi.fn();
global.StorageManager = function() { return mockStorageManager; };
global.CONSTANTS = mockConstants;
global.HELPERS = mockHelpers;

// Import the class after mocks are set up
const BreakTimerManager = (await import('../services/break-timer-manager.js')).default;

describe('BreakTimerManager', () => {
  let breakTimerManager;
  let mockDate;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock Date.now() for consistent testing
    mockDate = 1000000000000; // Fixed timestamp
    vi.spyOn(Date, 'now').mockReturnValue(mockDate);
    
    // Setup default mock returns
    mockStorageManager.get.mockResolvedValue(null);
    mockStorageManager.set.mockResolvedValue(true);
    mockStorageManager.setMultiple.mockResolvedValue(true);
    
    // Create new instance
    breakTimerManager = new BreakTimerManager();
    
    // Manually set dependencies to avoid async init issues in tests
    breakTimerManager.storageManager = mockStorageManager;
    breakTimerManager.constants = mockConstants;
    breakTimerManager.helpers = mockHelpers;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(breakTimerManager.workStartTime).toBeNull();
      expect(breakTimerManager.totalWorkTime).toBe(0);
      expect(breakTimerManager.isWorkTimerActive).toBe(false);
      expect(breakTimerManager.isOnBreak).toBe(false);
      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should load persisted state on initialization', async () => {
      const mockTimerState = {
        isWorkTimerActive: true,
        isOnBreak: false,
        workTimeThreshold: 25 * 60 * 1000
      };
      
      const mockWorkSessionData = {
        workStartTime: mockDate - 1000,
        totalWorkTime: 5000
      };

      // Clear previous mock calls and set up specific returns
      mockStorageManager.get.mockClear();
      mockStorageManager.get
        .mockImplementation((key) => {
          if (key === mockConstants.STORAGE_KEYS.BREAK_TIMER_STATE) {
            return Promise.resolve(mockTimerState);
          }
          if (key === mockConstants.STORAGE_KEYS.WORK_SESSION_DATA) {
            return Promise.resolve(mockWorkSessionData);
          }
          if (key === mockConstants.STORAGE_KEYS.BREAK_SETTINGS) {
            return Promise.resolve({ workTimeThresholdMinutes: 25 }); // Return existing settings
          }
          return Promise.resolve(null);
        });

      // Test the state loading directly without recovery
      breakTimerManager.isWorkTimerActive = false; // Reset to test loading
      breakTimerManager.totalWorkTime = 0; // Reset to test loading
      
      // Mock the recovery method to avoid side effects
      const originalRecover = breakTimerManager.recoverFromBrowserRestart;
      breakTimerManager.recoverFromBrowserRestart = vi.fn();
      
      await breakTimerManager.loadPersistedState();

      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.workTimeThreshold).toBe(25 * 60 * 1000);
      expect(breakTimerManager.totalWorkTime).toBe(5000);
      
      // Restore original method
      breakTimerManager.recoverFromBrowserRestart = originalRecover;
    });
  });

  describe('Work Timer Management', () => {
    it('should start work timer successfully', async () => {
      const result = await breakTimerManager.startWorkTimer();

      expect(result).toBe(true);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.workStartTime).toBe(mockDate);
      expect(breakTimerManager.lastActivityTime).toBe(mockDate);
      expect(mockStorageManager.setMultiple).toHaveBeenCalled();
    });

    it('should not start work timer when on break', async () => {
      breakTimerManager.isOnBreak = true;
      
      const result = await breakTimerManager.startWorkTimer();

      expect(result).toBe(false);
      expect(breakTimerManager.isWorkTimerActive).toBe(false);
    });

    it('should return true if work timer already active', async () => {
      breakTimerManager.isWorkTimerActive = true;
      
      const result = await breakTimerManager.startWorkTimer();

      expect(result).toBe(true);
    });

    it('should pause work timer and accumulate time', async () => {
      // Start timer first
      breakTimerManager.workStartTime = mockDate - 5000; // 5 seconds ago
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.totalWorkTime = 10000; // 10 seconds existing

      const result = await breakTimerManager.pauseWorkTimer();

      expect(result).toBe(true);
      expect(breakTimerManager.isWorkTimerActive).toBe(false);
      expect(breakTimerManager.workStartTime).toBeNull();
      expect(breakTimerManager.totalWorkTime).toBe(15000); // 10000 + 5000
    });

    it('should resume work timer', async () => {
      breakTimerManager.isWorkTimerActive = false;
      breakTimerManager.isOnBreak = false;

      const result = await breakTimerManager.resumeWorkTimer();

      expect(result).toBe(true);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.workStartTime).toBe(mockDate);
    });

    it('should reset work timer', async () => {
      breakTimerManager.totalWorkTime = 15000;
      breakTimerManager.isWorkTimerActive = false;

      const result = await breakTimerManager.resetWorkTimer();

      expect(result).toBe(true);
      expect(breakTimerManager.totalWorkTime).toBe(0);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
      expect(breakTimerManager.workStartTime).toBe(mockDate);
    });
  });

  describe('Break Management', () => {
    it('should start break successfully', async () => {
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.workStartTime = mockDate - 1000;

      const result = await breakTimerManager.startBreak('short', 5);

      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
      expect(breakTimerManager.breakType).toBe('short');
      expect(breakTimerManager.breakStartTime).toBe(mockDate);
      expect(breakTimerManager.breakDuration).toBe(5 * 60 * 1000); // 5 minutes in ms
      expect(breakTimerManager.isWorkTimerActive).toBe(false); // Should pause work timer
    });

    it('should not start break when already on break', async () => {
      breakTimerManager.isOnBreak = true;

      const result = await breakTimerManager.startBreak('short', 5);

      expect(result).toBe(false);
    });

    it('should end break and reset work timer', async () => {
      breakTimerManager.isOnBreak = true;
      breakTimerManager.breakType = 'short';
      breakTimerManager.breakStartTime = mockDate - 1000;
      breakTimerManager.breakDuration = 5 * 60 * 1000;

      const result = await breakTimerManager.endBreak();

      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(false);
      expect(breakTimerManager.breakType).toBeNull();
      expect(breakTimerManager.breakStartTime).toBeNull();
      expect(breakTimerManager.breakDuration).toBe(0);
      expect(breakTimerManager.isWorkTimerActive).toBe(true); // Should reset work timer
      expect(breakTimerManager.totalWorkTime).toBe(0); // Should reset accumulated time
    });

    it('should calculate remaining break time correctly', () => {
      breakTimerManager.isOnBreak = true;
      breakTimerManager.breakStartTime = mockDate - 2 * 60 * 1000; // 2 minutes ago
      breakTimerManager.breakDuration = 5 * 60 * 1000; // 5 minutes total

      const remainingTime = breakTimerManager.getRemainingBreakTime();

      expect(remainingTime).toBe(3 * 60 * 1000); // 3 minutes remaining
    });

    it('should return 0 remaining time when not on break', () => {
      breakTimerManager.isOnBreak = false;

      const remainingTime = breakTimerManager.getRemainingBreakTime();

      expect(remainingTime).toBe(0);
    });
  });

  describe('Work Time Calculations', () => {
    it('should calculate current work time with active timer', () => {
      breakTimerManager.totalWorkTime = 10000; // 10 seconds
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.workStartTime = mockDate - 5000; // 5 seconds ago

      const currentWorkTime = breakTimerManager.getCurrentWorkTime();

      expect(currentWorkTime).toBe(15000); // 10000 + 5000
    });

    it('should return total work time when timer inactive', () => {
      breakTimerManager.totalWorkTime = 10000;
      breakTimerManager.isWorkTimerActive = false;

      const currentWorkTime = breakTimerManager.getCurrentWorkTime();

      expect(currentWorkTime).toBe(10000);
    });

    it('should detect when work time threshold is exceeded', () => {
      breakTimerManager.totalWorkTime = 35 * 60 * 1000; // 35 minutes
      breakTimerManager.workTimeThreshold = 30 * 60 * 1000; // 30 minutes

      const isExceeded = breakTimerManager.isWorkTimeThresholdExceeded();

      expect(isExceeded).toBe(true);
    });

    it('should detect when work time threshold is not exceeded', () => {
      breakTimerManager.totalWorkTime = 25 * 60 * 1000; // 25 minutes
      breakTimerManager.workTimeThreshold = 30 * 60 * 1000; // 30 minutes

      const isExceeded = breakTimerManager.isWorkTimeThresholdExceeded();

      expect(isExceeded).toBe(false);
    });
  });

  describe('Browser Focus Handling', () => {
    it('should handle browser focus lost', async () => {
      breakTimerManager.isBrowserFocused = true;

      await breakTimerManager.handleBrowserFocusLost();

      expect(breakTimerManager.isBrowserFocused).toBe(false);
      expect(breakTimerManager.lastFocusChangeTime).toBe(mockDate);
    });

    it('should handle browser focus gained', async () => {
      breakTimerManager.isBrowserFocused = false;
      breakTimerManager.isWorkTimerActive = false;
      breakTimerManager.isOnBreak = false;

      await breakTimerManager.handleBrowserFocusGained();

      expect(breakTimerManager.isBrowserFocused).toBe(true);
      expect(breakTimerManager.lastActivityTime).toBe(mockDate);
      expect(breakTimerManager.isWorkTimerActive).toBe(true); // Should resume timer
    });

    it('should not resume timer when on break', async () => {
      breakTimerManager.isBrowserFocused = false;
      breakTimerManager.isWorkTimerActive = false;
      breakTimerManager.isOnBreak = true;

      await breakTimerManager.handleBrowserFocusGained();

      expect(breakTimerManager.isWorkTimerActive).toBe(false); // Should not resume
    });
  });

  describe('Activity Tracking', () => {
    it('should update activity timestamp', async () => {
      breakTimerManager.lastActivityTime = mockDate - 10000;

      await breakTimerManager.updateActivity();

      expect(breakTimerManager.lastActivityTime).toBe(mockDate);
    });

    it('should resume timer on activity when paused', async () => {
      breakTimerManager.isWorkTimerActive = false;
      breakTimerManager.isOnBreak = false;
      breakTimerManager.isBrowserFocused = true;

      await breakTimerManager.updateActivity();

      expect(breakTimerManager.isWorkTimerActive).toBe(true);
    });
  });

  describe('Timer Status', () => {
    it('should return complete timer status', () => {
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.isOnBreak = false;
      breakTimerManager.totalWorkTime = 15 * 60 * 1000; // 15 minutes
      breakTimerManager.workStartTime = mockDate - 5 * 60 * 1000; // 5 minutes ago
      breakTimerManager.workTimeThreshold = 30 * 60 * 1000; // 30 minutes

      const status = breakTimerManager.getTimerStatus();

      expect(status).toEqual({
        isWorkTimerActive: true,
        isOnBreak: false,
        breakType: null,
        workStartTime: expect.any(Number),
        currentWorkTime: 20 * 60 * 1000, // 15 + 5 minutes
        totalWorkTime: 15 * 60 * 1000,
        workTimeThreshold: 30 * 60 * 1000,
        isThresholdExceeded: false,
        remainingBreakTime: 0,
        lastActivityTime: breakTimerManager.lastActivityTime,
        isBrowserFocused: true
      });
    });
  });

  describe('Settings Management', () => {
    it('should update work time threshold', async () => {
      const newThresholdMinutes = 45;
      mockStorageManager.get.mockResolvedValue({});

      const result = await breakTimerManager.updateWorkTimeThreshold(newThresholdMinutes);

      expect(result).toBe(true);
      expect(breakTimerManager.workTimeThreshold).toBe(45 * 60 * 1000);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        mockConstants.STORAGE_KEYS.BREAK_SETTINGS,
        { workTimeThresholdMinutes: 45 }
      );
    });
  });

  describe('State Persistence', () => {
    it('should persist timer state to storage', async () => {
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.isOnBreak = false;
      breakTimerManager.workStartTime = mockDate;
      breakTimerManager.totalWorkTime = 5000;

      await breakTimerManager.persistTimerState();

      expect(mockStorageManager.setMultiple).toHaveBeenCalledWith({
        [mockConstants.STORAGE_KEYS.BREAK_TIMER_STATE]: {
          isWorkTimerActive: true,
          isOnBreak: false,
          breakType: null,
          lastActivityTime: breakTimerManager.lastActivityTime,
          workTimeThreshold: breakTimerManager.workTimeThreshold
        },
        [mockConstants.STORAGE_KEYS.WORK_SESSION_DATA]: {
          workStartTime: mockDate,
          totalWorkTime: 5000,
          breakStartTime: null,
          breakDuration: 0
        }
      });
    });
  });

  describe('Browser Restart Recovery', () => {
    it('should recover active work timer after restart', async () => {
      // Simulate state before restart
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.workStartTime = mockDate - 2000; // 2 seconds ago (within threshold)
      
      await breakTimerManager.recoverFromBrowserRestart();

      expect(breakTimerManager.lastActivityTime).toBe(mockDate);
      expect(breakTimerManager.isWorkTimerActive).toBe(true); // Should remain active
    });

    it('should pause timer if inactive too long during restart', async () => {
      // Simulate long inactivity during restart
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.workStartTime = mockDate - (10 * 60 * 1000); // 10 minutes ago
      
      await breakTimerManager.recoverFromBrowserRestart();

      expect(breakTimerManager.isWorkTimerActive).toBe(false); // Should be paused
    });

    it('should end break if it expired during restart', async () => {
      // Simulate break that should have ended
      breakTimerManager.isOnBreak = true;
      breakTimerManager.breakStartTime = mockDate - (10 * 60 * 1000); // 10 minutes ago
      breakTimerManager.breakDuration = 5 * 60 * 1000; // 5 minute break

      await breakTimerManager.recoverFromBrowserRestart();

      expect(breakTimerManager.isOnBreak).toBe(false); // Break should be ended
      expect(breakTimerManager.isWorkTimerActive).toBe(true); // Work timer should be reset
    });
  });
});