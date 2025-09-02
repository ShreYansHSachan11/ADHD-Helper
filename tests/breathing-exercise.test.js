// Breathing Exercise Component Tests

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
  },
};

// Mock DOM elements
const mockElements = {
  breathingCircle: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    style: {},
  },
  breathingText: {
    textContent: "",
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  },
  startButton: {
    addEventListener: vi.fn(),
    style: { display: "inline-flex" },
  },
  stopButton: {
    addEventListener: vi.fn(),
    style: { display: "none" },
  },
};

// Mock document methods
global.document = {
  getElementById: vi.fn((id) => {
    const elementMap = {
      breathingCircle: mockElements.breathingCircle,
      breathingText: mockElements.breathingText,
      startBreathingBtn: mockElements.startButton,
      stopBreathingBtn: mockElements.stopButton,
    };
    return elementMap[id] || null;
  }),
  addEventListener: vi.fn(),
};

// Mock clearTimeout for cleanup tests
global.clearTimeout = vi.fn();

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  callback();
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Import the component after mocking
const BreathingExercise = await import(
  "../popup/components/breathing-exercise.js"
);

describe("BreathingExercise Component", () => {
  let breathingExercise;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock element states
    mockElements.breathingCircle.classList.add.mockClear();
    mockElements.breathingCircle.classList.remove.mockClear();
    mockElements.breathingText.textContent = "";

    // Mock storage responses
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue();
    chrome.runtime.sendMessage.mockResolvedValue({ success: true });

    // Create new instance
    breathingExercise = new BreathingExercise.default();
  });

  afterEach(() => {
    if (breathingExercise) {
      breathingExercise.destroy();
    }
  });

  describe("Initialization", () => {
    it("should initialize with default durations", () => {
      expect(breathingExercise.durations.inhale).toBe(4000);
      expect(breathingExercise.durations.holdIn).toBe(7000);
      expect(breathingExercise.durations.exhale).toBe(8000);
      expect(breathingExercise.durations.holdOut).toBe(1000);
    });

    it("should initialize with inactive state", () => {
      expect(breathingExercise.isActive).toBe(false);
      expect(breathingExercise.currentPhase).toBe(0);
      expect(breathingExercise.completedCycles).toBe(0);
    });

    it("should bind DOM elements correctly", () => {
      expect(document.getElementById).toHaveBeenCalledWith("breathingCircle");
      expect(document.getElementById).toHaveBeenCalledWith("breathingText");
      expect(document.getElementById).toHaveBeenCalledWith("startBreathingBtn");
      expect(document.getElementById).toHaveBeenCalledWith("stopBreathingBtn");
    });
  });

  describe("Exercise Control", () => {
    it("should start exercise correctly", () => {
      vi.useFakeTimers();

      breathingExercise.startExercise();

      expect(breathingExercise.isActive).toBe(true);
      expect(breathingExercise.sessionStartTime).toBeTruthy();
      expect(breathingExercise.sessionData.startTime).toBeTruthy();

      vi.useRealTimers();
    });

    it("should not start if already active", () => {
      breathingExercise.isActive = true;
      const initialStartTime = breathingExercise.sessionStartTime;

      breathingExercise.startExercise();

      expect(breathingExercise.sessionStartTime).toBe(initialStartTime);
    });

    it("should stop exercise correctly", () => {
      vi.useFakeTimers();

      breathingExercise.startExercise();

      // Advance time to simulate some session duration
      vi.advanceTimersByTime(1000);

      breathingExercise.stopExercise();

      expect(breathingExercise.isActive).toBe(false);
      expect(breathingExercise.sessionData.endTime).toBeTruthy();
      expect(breathingExercise.sessionData.totalTime).toBeGreaterThanOrEqual(0);

      vi.useRealTimers();
    });

    it("should handle stop when not active", () => {
      expect(() => {
        breathingExercise.stopExercise();
      }).not.toThrow();
    });
  });

  describe("Animation Control", () => {
    it("should apply correct animation classes for inhale phase", () => {
      breathingExercise.animateCircle("inhale", 4000);

      expect(
        mockElements.breathingCircle.classList.remove
      ).toHaveBeenCalledWith("inhale", "exhale", "hold");
      expect(mockElements.breathingCircle.classList.add).toHaveBeenCalledWith(
        "inhale"
      );
      expect(mockElements.breathingCircle.style.transitionDuration).toBe(
        "4000ms"
      );
    });

    it("should apply correct animation classes for exhale phase", () => {
      breathingExercise.animateCircle("exhale", 8000);

      expect(
        mockElements.breathingCircle.classList.remove
      ).toHaveBeenCalledWith("inhale", "exhale", "hold");
      expect(mockElements.breathingCircle.classList.add).toHaveBeenCalledWith(
        "exhale"
      );
      expect(mockElements.breathingCircle.style.transitionDuration).toBe(
        "8000ms"
      );
    });

    it("should apply correct animation classes for hold phases", () => {
      breathingExercise.animateCircle("holdIn", 7000);

      expect(
        mockElements.breathingCircle.classList.remove
      ).toHaveBeenCalledWith("inhale", "exhale", "hold");
      expect(mockElements.breathingCircle.classList.add).toHaveBeenCalledWith(
        "hold"
      );
      expect(mockElements.breathingCircle.style.transitionDuration).toBe(
        "7000ms"
      );
    });

    it("should reset animation correctly", () => {
      breathingExercise.resetCircleAnimation();

      expect(
        mockElements.breathingCircle.classList.remove
      ).toHaveBeenCalledWith("inhale", "exhale", "hold");
      expect(mockElements.breathingCircle.style.transitionDuration).toBe(
        "0.3s"
      );
    });
  });

  describe("Phase Management", () => {
    it("should have correct phase texts", () => {
      expect(breathingExercise.phaseTexts.inhale).toBe("Breathe in...");
      expect(breathingExercise.phaseTexts.holdIn).toBe("Hold...");
      expect(breathingExercise.phaseTexts.exhale).toBe("Breathe out...");
      expect(breathingExercise.phaseTexts.holdOut).toBe("Pause...");
    });

    it("should cycle through phases correctly", () => {
      vi.useFakeTimers();

      breathingExercise.isActive = true;

      // Test phase progression
      expect(breathingExercise.currentPhase).toBe(0);

      breathingExercise.runPhase();

      // Advance timers to trigger the callback
      vi.advanceTimersByTime(breathingExercise.durations.inhale);

      expect(breathingExercise.currentPhase).toBe(1);

      vi.useRealTimers();
    });

    it("should increment completed cycles after full cycle", () => {
      vi.useFakeTimers();

      breathingExercise.isActive = true;
      breathingExercise.currentPhase = 3; // Last phase
      const initialCycles = breathingExercise.completedCycles;

      breathingExercise.runPhase();

      // Advance timers to trigger the callback
      vi.advanceTimersByTime(breathingExercise.durations.holdOut);

      expect(breathingExercise.completedCycles).toBe(initialCycles + 1);
      expect(breathingExercise.currentPhase).toBe(0);

      vi.useRealTimers();
    });
  });

  describe("Customization", () => {
    it("should set custom duration correctly", () => {
      breathingExercise.setDuration("inhale", 5000);

      expect(breathingExercise.durations.inhale).toBe(5000);
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it("should not set invalid duration", () => {
      const originalDuration = breathingExercise.durations.inhale;

      breathingExercise.setDuration("inhale", -1000);

      expect(breathingExercise.durations.inhale).toBe(originalDuration);
    });

    it("should not set duration for invalid phase", () => {
      const originalDurations = { ...breathingExercise.durations };

      breathingExercise.setDuration("invalidPhase", 5000);

      expect(breathingExercise.durations).toEqual(originalDurations);
    });

    it("should get duration correctly", () => {
      expect(breathingExercise.getDuration("inhale")).toBe(4000);
      expect(breathingExercise.getDuration("invalidPhase")).toBe(4000); // fallback to default inhale
    });

    it("should reset to defaults correctly", () => {
      breathingExercise.setDuration("inhale", 5000);
      breathingExercise.resetToDefaults();

      expect(breathingExercise.durations.inhale).toBe(4000);
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe("Preset Patterns", () => {
    it("should set 4-7-8 pattern correctly", () => {
      breathingExercise.setPattern("4-7-8");

      expect(breathingExercise.durations.inhale).toBe(4000);
      expect(breathingExercise.durations.holdIn).toBe(7000);
      expect(breathingExercise.durations.exhale).toBe(8000);
      expect(breathingExercise.durations.holdOut).toBe(1000);
    });

    it("should set 4-4-4-4 pattern correctly", () => {
      breathingExercise.setPattern("4-4-4-4");

      expect(breathingExercise.durations.inhale).toBe(4000);
      expect(breathingExercise.durations.holdIn).toBe(4000);
      expect(breathingExercise.durations.exhale).toBe(4000);
      expect(breathingExercise.durations.holdOut).toBe(4000);
    });

    it("should handle invalid pattern gracefully", () => {
      const originalDurations = { ...breathingExercise.durations };

      breathingExercise.setPattern("invalid-pattern");

      expect(breathingExercise.durations).toEqual(originalDurations);
    });
  });

  describe("Session Tracking", () => {
    it("should save session data correctly", async () => {
      chrome.storage.local.get.mockResolvedValue({ breathingSessions: [] });

      breathingExercise.sessionData = {
        totalTime: 60000,
        cyclesCompleted: 3,
        startTime: Date.now() - 60000,
        endTime: Date.now(),
      };

      await breathingExercise.saveSessionData();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        breathingSessions: expect.arrayContaining([
          expect.objectContaining({
            totalTime: 60000,
            cyclesCompleted: 3,
            timestamp: expect.any(Number),
          }),
        ]),
      });
    });

    it("should limit session history to 50 entries", async () => {
      const existingSessions = Array(55)
        .fill()
        .map((_, i) => ({ id: i }));
      chrome.storage.local.get.mockResolvedValue({
        breathingSessions: existingSessions,
      });

      await breathingExercise.saveSessionData();

      const savedData = chrome.storage.local.set.mock.calls[0][0];
      expect(savedData.breathingSessions).toHaveLength(50);
    });

    it("should get session stats correctly", async () => {
      const mockSessions = [
        { totalTime: 30000, cyclesCompleted: 2 },
        { totalTime: 60000, cyclesCompleted: 4 },
        { totalTime: 45000, cyclesCompleted: 3 },
      ];

      chrome.storage.local.get.mockResolvedValue({
        breathingSessions: mockSessions,
      });

      const stats = await breathingExercise.getSessionStats();

      expect(stats.totalSessions).toBe(3);
      expect(stats.totalTime).toBe(135000);
      expect(stats.totalCycles).toBe(9);
      expect(stats.averageSessionTime).toBe(45000);
    });
  });

  describe("Event Tracking", () => {
    it("should track session start event", () => {
      breathingExercise.trackEvent("breathing_session_started");

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TRACK_WELLNESS_EVENT",
        event: "breathing_session_started",
        data: expect.objectContaining({
          timestamp: expect.any(Number),
          component: "breathing_exercise",
        }),
      });
    });

    it("should track session completion event with data", () => {
      const eventData = { duration: 60000, cycles: 3 };

      breathingExercise.trackEvent("breathing_session_completed", eventData);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TRACK_WELLNESS_EVENT",
        event: "breathing_session_completed",
        data: expect.objectContaining({
          ...eventData,
          timestamp: expect.any(Number),
          component: "breathing_exercise",
        }),
      });
    });
  });

  describe("Button State Management", () => {
    it("should update button states when active", () => {
      breathingExercise.isActive = true;
      breathingExercise.updateButtonStates();

      expect(mockElements.startButton.style.display).toBe("none");
      expect(mockElements.stopButton.style.display).toBe("inline-flex");
    });

    it("should update button states when inactive", () => {
      breathingExercise.isActive = false;
      breathingExercise.updateButtonStates();

      expect(mockElements.startButton.style.display).toBe("inline-flex");
      expect(mockElements.stopButton.style.display).toBe("none");
    });
  });

  describe("Completion Feedback", () => {
    it("should show completion feedback with cycle count", () => {
      breathingExercise.completedCycles = 3;
      breathingExercise.sessionData.totalTime = 180000; // 3 minutes

      breathingExercise.showCompletionFeedback();

      expect(mockElements.breathingText.textContent).toContain(
        "3 cycles completed"
      );
      expect(mockElements.breathingText.textContent).toContain("3m 0s");
    });

    it("should show completion feedback with no cycles", () => {
      breathingExercise.completedCycles = 0;
      breathingExercise.sessionData.totalTime = 5000;

      breathingExercise.showCompletionFeedback();

      expect(mockElements.breathingText.textContent).toBe("Session complete!");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing DOM elements gracefully", () => {
      document.getElementById.mockReturnValue(null);

      expect(() => {
        new BreathingExercise.default();
      }).not.toThrow();
    });

    it("should handle storage errors gracefully", async () => {
      chrome.storage.local.get.mockRejectedValue(new Error("Storage error"));

      await expect(
        breathingExercise.loadCustomDurations()
      ).resolves.not.toThrow();
    });

    it("should handle tracking errors gracefully", async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error("Runtime error"));

      await expect(async () => {
        breathingExercise.trackEvent("test_event");
      }).not.toThrow();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup correctly on destroy", () => {
      vi.useFakeTimers();

      breathingExercise.startExercise();
      breathingExercise.destroy();

      expect(breathingExercise.isActive).toBe(false);

      vi.useRealTimers();
    });
  });
});
