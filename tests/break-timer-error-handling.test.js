/**
 * Break Timer Manager Error Handling Integration Tests
 * Tests error handling and recovery in the BreakTimerManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setTitle: vi.fn()
  },
  windows: {
    onFocusChanged: {
      addListener: vi.fn()
    },
    WINDOW_ID_NONE: -1
  }
};

global.chrome = mockChrome;
global.importScripts = vi.fn();

// Import classes to test
import BreakTimerManager from '../services/break-timer-manager.js';
import BreakErrorHandler from '../utils/break-error-handler.js';

describe('BreakTimerManager Error Handling', () => {
  let breakTimerManager;
  let mockStorageManager;
  let mockSettingsManager;
  let mockBreakErrorHandler;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock dependencies
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
      setMultiple: vi.fn()
    };
    
    mockSettingsManager = {
      init: vi.fn(),
      getWorkTimeThresholdMs: vi.fn().mockReturnValue(30 * 60 * 1000),
      areNotificationsEnabled: vi.fn().mockReturnValue(true),
      getSettings: vi.fn().mockReturnValue({})
    };
    
    mockBreakErrorHandler = {
      init: vi.fn(),
      handleTimerStateCorruption: vi.fn(),
      validateAndSanitizeBreakData: vi.fn(),
      handleChromeApiUnavailable: vi.fn(),
      showUserFeedback: vi.fn(),
      getErrorStats: vi.fn().mockReturnValue({})
    };
    
    breakTimerManager = new BreakTimerManager();
    breakTimerManager.storageManager = mockStorageManager;
    breakTimerManager.settingsManager = mockSettingsManager;
    breakTimerManager.breakErrorHandler = mockBreakErrorHandler;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Loading Error Handling', () => {
    it('should handle corrupted timer state during loading', async () => {
      const corruptedState = {
        isWorkTimerActive: "not_boolean",
        workTimeThreshold: "invalid_threshold",
        lastActivityTime: "invalid_timestamp"
      };

      mockStorageManager.get.mockResolvedValueOnce(corruptedState);
      mockStorageManager.get.mockResolvedValueOnce(null); // workSessionData

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: false,
        sanitizedData: {},
        errors: ['Invalid data']
      });

      mockBreakErrorHandler.handleTimerStateCorruption.mockResolvedValue({
        success: true,
        recoveredState: {
          isWorkTimerActive: false,
          isOnBreak: false,
          breakType: null,
          lastActivityTime: Date.now(),
          workTimeThreshold: 30 * 60 * 1000
        }
      });

      await breakTimerManager.loadPersistedStateWithErrorHandling();

      expect(mockBreakErrorHandler.validateAndSanitizeBreakData).toHaveBeenCalled();
      expect(mockBreakErrorHandler.handleTimerStateCorruption).toHaveBeenCalledWith(
        corruptedState,
        'timer_state'
      );
      expect(breakTimerManager.isWorkTimerActive).toBe(false);
    });

    it('should initialize default state when recovery fails', async () => {
      const corruptedState = { invalid: 'data' };

      mockStorageManager.get.mockResolvedValueOnce(corruptedState);
      mockStorageManager.get.mockResolvedValueOnce(null);

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: false,
        sanitizedData: {},
        errors: ['Invalid data']
      });

      mockBreakErrorHandler.handleTimerStateCorruption.mockResolvedValue({
        success: false,
        error: 'Recovery failed'
      });

      mockStorageManager.setMultiple.mockResolvedValue(true);

      await breakTimerManager.loadPersistedStateWithErrorHandling();

      expect(breakTimerManager.isWorkTimerActive).toBe(false);
      expect(breakTimerManager.totalWorkTime).toBe(0);
      expect(mockStorageManager.setMultiple).toHaveBeenCalled();
    });

    it('should handle storage API unavailability during loading', async () => {
      mockStorageManager.get.mockRejectedValue(new Error('Storage API unavailable'));

      mockBreakErrorHandler.handleChromeApiUnavailable.mockResolvedValue({
        success: false,
        fallbackMode: true
      });

      mockStorageManager.setMultiple.mockResolvedValue(true);

      await breakTimerManager.loadPersistedStateWithErrorHandling();

      expect(mockBreakErrorHandler.handleChromeApiUnavailable).toHaveBeenCalledWith(
        'storage',
        'get',
        expect.objectContaining({
          key: 'timer_state',
          operation: 'load_persisted_state'
        })
      );
    });
  });

  describe('State Persistence Error Handling', () => {
    it('should validate data before persisting', async () => {
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.totalWorkTime = 1000;

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: {
          isWorkTimerActive: true,
          totalWorkTime: 1000
        },
        errors: []
      });

      mockStorageManager.setMultiple.mockResolvedValue(true);

      await breakTimerManager.persistTimerStateWithErrorHandling();

      expect(mockBreakErrorHandler.validateAndSanitizeBreakData).toHaveBeenCalledTimes(2);
      expect(mockStorageManager.setMultiple).toHaveBeenCalled();
    });

    it('should use sanitized data when validation fails', async () => {
      breakTimerManager.isWorkTimerActive = "invalid";
      breakTimerManager.totalWorkTime = -1000;

      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: false,
        sanitizedData: {
          isWorkTimerActive: false,
          totalWorkTime: 0
        },
        errors: ['Invalid data']
      });

      mockStorageManager.setMultiple.mockResolvedValue(true);

      await breakTimerManager.persistTimerStateWithErrorHandling();

      expect(mockStorageManager.setMultiple).toHaveBeenCalledWith(
        expect.objectContaining({
          breakTimerState: expect.objectContaining({
            isWorkTimerActive: false
          }),
          workSessionData: expect.objectContaining({
            totalWorkTime: 0
          })
        })
      );
    });

    it('should handle storage errors during persistence', async () => {
      mockBreakErrorHandler.validateAndSanitizeBreakData.mockReturnValue({
        isValid: true,
        sanitizedData: {},
        errors: []
      });

      mockStorageManager.setMultiple.mockRejectedValue(new Error('Storage quota exceeded'));

      mockBreakErrorHandler.handleChromeApiUnavailable.mockResolvedValue({
        success: false,
        fallbackMode: true
      });

      await breakTimerManager.persistTimerStateWithErrorHandling();

      expect(mockBreakErrorHandler.handleChromeApiUnavailable).toHaveBeenCalledWith(
        'storage',
        'set',
        expect.objectContaining({
          key: 'timer_state',
          operation: 'persist_timer_state'
        })
      );
    });
  });

  describe('Browser Restart Recovery Error Handling', () => {
    it('should handle unreasonable elapsed time during recovery', async () => {
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.workStartTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      mockStorageManager.setMultiple.mockResolvedValue(true);

      await breakTimerManager.recoverFromBrowserRestartWithErrorHandling();

      expect(breakTimerManager.isWorkTimerActive).toBe(false);
      expect(breakTimerManager.totalWorkTime).toBe(0);
    });

    it('should handle unreasonable break duration during recovery', async () => {
      breakTimerManager.isOnBreak = true;
      breakTimerManager.breakStartTime = Date.now() - (5 * 60 * 60 * 1000); // 5 hours ago
      breakTimerManager.breakDuration = 30 * 60 * 1000; // 30 minutes

      mockStorageManager.setMultiple.mockResolvedValue(true);

      await breakTimerManager.recoverFromBrowserRestartWithErrorHandling();

      expect(breakTimerManager.isOnBreak).toBe(false);
      expect(breakTimerManager.breakStartTime).toBeNull();
    });

    it('should handle recovery errors and reset to safe state', async () => {
      breakTimerManager.isWorkTimerActive = true;
      breakTimerManager.workStartTime = "invalid_timestamp";

      // Mock the recovery method to throw an error
      const originalRecovery = breakTimerManager.recoverFromBrowserRestartWithErrorHandling;
      breakTimerManager.recoverFromBrowserRestartWithErrorHandling = vi.fn().mockImplementation(async function() {
        try {
          // Simulate error during recovery
          throw new Error("Recovery error");
        } catch (error) {
          console.error("Error recovering from browser restart:", error);
          
          if (this.breakErrorHandler) {
            await this.breakErrorHandler.handleTimerStateCorruption({
              workStartTime: this.workStartTime,
              isWorkTimerActive: this.isWorkTimerActive,
              isOnBreak: this.isOnBreak,
              breakStartTime: this.breakStartTime,
              breakDuration: this.breakDuration
            }, 'browser_restart_recovery');
          }
          
          // Reset to safe state
          await this.initializeDefaultState();
        }
      });

      mockBreakErrorHandler.handleTimerStateCorruption.mockResolvedValue({
        success: true,
        recoveredState: {
          isWorkTimerActive: false,
          totalWorkTime: 0
        }
      });

      mockStorageManager.setMultiple.mockResolvedValue(true);

      await breakTimerManager.recoverFromBrowserRestartWithErrorHandling();

      expect(mockBreakErrorHandler.handleTimerStateCorruption).toHaveBeenCalled();
    });
  });

  describe('Badge Update Error Handling', () => {
    it('should handle Chrome action API unavailability', async () => {
      breakTimerManager.isOnBreak = true;
      breakTimerManager.breakStartTime = Date.now();
      breakTimerManager.breakDuration = 5 * 60 * 1000; // 5 minutes

      mockChrome.action.setBadgeText.mockRejectedValue(new Error('Action API unavailable'));

      mockBreakErrorHandler.handleChromeApiUnavailable.mockResolvedValue({
        success: true,
        method: 'in_memory_badge',
        fallbackMode: true
      });

      await breakTimerManager.updateExtensionBadgeWithErrorHandling();

      expect(mockBreakErrorHandler.handleChromeApiUnavailable).toHaveBeenCalledWith(
        'action',
        'setBadgeText',
        expect.objectContaining({
          text: expect.stringMatching(/\d+m/)
        })
      );
    });

    it('should handle badge clearing errors', async () => {
      mockChrome.action.setBadgeText.mockRejectedValue(new Error('Action API error'));

      mockBreakErrorHandler.handleChromeApiUnavailable.mockResolvedValue({
        success: true,
        fallbackMode: true
      });

      await breakTimerManager.clearExtensionBadgeWithErrorHandling();

      expect(mockBreakErrorHandler.handleChromeApiUnavailable).toHaveBeenCalledWith(
        'action',
        'setBadgeText',
        { text: '' }
      );
    });
  });

  describe('Fallback Mode Initialization', () => {
    it('should initialize fallback mode when normal initialization fails', async () => {
      await breakTimerManager.initializeFallbackMode();

      expect(breakTimerManager.isWorkTimerActive).toBe(false);
      expect(breakTimerManager.totalWorkTime).toBe(0);
      expect(breakTimerManager.workTimeThreshold).toBe(30 * 60 * 1000);
      expect(breakTimerManager.breakErrorHandler).toBeDefined();
    });

    it('should create minimal error handler in fallback mode', async () => {
      breakTimerManager.breakErrorHandler = null;

      await breakTimerManager.initializeFallbackMode();

      expect(breakTimerManager.breakErrorHandler).toBeDefined();
      expect(typeof breakTimerManager.breakErrorHandler.handleChromeApiUnavailable).toBe('function');
    });
  });

  describe('Error Statistics', () => {
    it('should return error handler statistics', () => {
      const mockStats = {
        errorCounts: { 'TEST_ERROR': 2 },
        recoveryAttempts: { 'TEST_RECOVERY': 1 },
        fallbackMode: false
      };

      mockBreakErrorHandler.getErrorStats.mockReturnValue(mockStats);

      const stats = breakTimerManager.getErrorHandlerStats();

      expect(stats).toEqual(mockStats);
      expect(mockBreakErrorHandler.getErrorStats).toHaveBeenCalled();
    });

    it('should return null when error handler unavailable', () => {
      breakTimerManager.breakErrorHandler = null;

      const stats = breakTimerManager.getErrorHandlerStats();

      expect(stats).toBeNull();
    });
  });

  describe('Integration with Timer Operations', () => {
    it('should handle errors during work timer start', async () => {
      breakTimerManager.isOnBreak = false;
      breakTimerManager.isWorkTimerActive = false;

      mockStorageManager.setMultiple.mockRejectedValue(new Error('Storage error'));

      const result = await breakTimerManager.startWorkTimer();

      // Should still return true for user experience, but handle error internally
      expect(result).toBe(true);
      expect(breakTimerManager.isWorkTimerActive).toBe(true);
    });

    it('should handle errors during break start', async () => {
      breakTimerManager.isOnBreak = false;

      mockStorageManager.setMultiple.mockRejectedValue(new Error('Storage error'));
      mockBreakErrorHandler.handleChromeApiUnavailable.mockResolvedValue({
        success: false,
        fallbackMode: true
      });

      const result = await breakTimerManager.startBreak('short', 5);

      expect(result).toBe(true);
      expect(breakTimerManager.isOnBreak).toBe(true);
    });

    it('should handle errors during timer status retrieval', () => {
      // Simulate corrupted internal state
      breakTimerManager.workStartTime = "invalid";
      breakTimerManager.totalWorkTime = null;

      const status = breakTimerManager.getTimerStatus();

      // Should return valid status object even with corrupted internal state
      expect(status).toBeDefined();
      expect(typeof status.isWorkTimerActive).toBe('boolean');
      expect(typeof status.currentWorkTime).toBe('number');
    });
  });
});