// Breathing Exercise Timing Tests

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
};

// Mock DOM elements with proper methods
const createMockElement = () => ({
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
  },
  style: {
    transitionDuration: "",
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  textContent: "",
});

global.document = {
  getElementById: vi.fn((id) => {
    const elementMap = {
      breathingCircle: createMockElement(),
      breathingText: createMockElement(),
      startBreathingBtn: createMockElement(),
      stopBreathingBtn: createMockElement(),
    };
    return elementMap[id] || null;
  }),
  addEventListener: vi.fn(),
};

describe("BreathingExercise Timing", () => {
  let BreathingExercise;
  let breathingExercise;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await import("../popup/components/breathing-exercise.js");
    BreathingExercise = module.default;
    breathingExercise = new BreathingExercise();
  });

  it("should have correct default timing durations", () => {
    expect(breathingExercise.durations.inhale).toBe(4000);
    expect(breathingExercise.durations.holdIn).toBe(7000);
    expect(breathingExercise.durations.exhale).toBe(8000);
    expect(breathingExercise.durations.holdOut).toBe(1000);
  });

  it("should calculate total cycle time correctly", () => {
    const totalCycleTime = Object.values(breathingExercise.durations).reduce(
      (sum, duration) => sum + duration,
      0
    );
    expect(totalCycleTime).toBe(20000); // 20 seconds for default 4-7-8-1 pattern
  });

  it("should set custom durations correctly", () => {
    breathingExercise.setDuration("inhale", 5000);
    expect(breathingExercise.durations.inhale).toBe(5000);

    breathingExercise.setDuration("holdIn", 3000);
    expect(breathingExercise.durations.holdIn).toBe(3000);
  });

  it("should validate duration ranges", () => {
    const originalDuration = breathingExercise.durations.inhale;

    // Should not accept negative durations
    breathingExercise.setDuration("inhale", -1000);
    expect(breathingExercise.durations.inhale).toBe(originalDuration);

    // Should not accept zero duration
    breathingExercise.setDuration("inhale", 0);
    expect(breathingExercise.durations.inhale).toBe(originalDuration);
  });

  it("should apply preset patterns correctly", () => {
    // Test 4-4-4-4 pattern
    breathingExercise.setPattern("4-4-4-4");
    expect(breathingExercise.durations.inhale).toBe(4000);
    expect(breathingExercise.durations.holdIn).toBe(4000);
    expect(breathingExercise.durations.exhale).toBe(4000);
    expect(breathingExercise.durations.holdOut).toBe(4000);

    // Test quick pattern
    breathingExercise.setPattern("quick");
    expect(breathingExercise.durations.inhale).toBe(3000);
    expect(breathingExercise.durations.holdIn).toBe(1000);
    expect(breathingExercise.durations.exhale).toBe(3000);
    expect(breathingExercise.durations.holdOut).toBe(500);

    // Test deep pattern
    breathingExercise.setPattern("deep");
    expect(breathingExercise.durations.inhale).toBe(6000);
    expect(breathingExercise.durations.holdIn).toBe(4000);
    expect(breathingExercise.durations.exhale).toBe(8000);
    expect(breathingExercise.durations.holdOut).toBe(2000);
  });

  it("should handle invalid patterns gracefully", () => {
    const originalDurations = { ...breathingExercise.durations };

    breathingExercise.setPattern("invalid-pattern");

    // Durations should remain unchanged
    expect(breathingExercise.durations).toEqual(originalDurations);
  });

  it("should track session timing correctly", () => {
    const startTime = Date.now();
    breathingExercise.sessionStartTime = startTime;
    breathingExercise.sessionData.startTime = startTime;

    // Simulate 60 seconds later
    const endTime = startTime + 60000;
    breathingExercise.sessionData.endTime = endTime;
    breathingExercise.sessionData.totalTime = endTime - startTime;

    expect(breathingExercise.sessionData.totalTime).toBe(60000);
  });

  it("should calculate completed cycles correctly", () => {
    // With default 20-second cycle, 3 cycles should take 60 seconds
    const cycleTime = Object.values(breathingExercise.durations).reduce(
      (sum, duration) => sum + duration,
      0
    );
    const sessionTime = 60000; // 1 minute
    const expectedCycles = Math.floor(sessionTime / cycleTime);

    expect(expectedCycles).toBe(3); // 60000ms / 20000ms = 3 cycles
  });

  it("should provide accurate duration getter", () => {
    expect(breathingExercise.getDuration("inhale")).toBe(4000);
    expect(breathingExercise.getDuration("holdIn")).toBe(7000);
    expect(breathingExercise.getDuration("exhale")).toBe(8000);
    expect(breathingExercise.getDuration("holdOut")).toBe(1000);

    // Should fallback to default inhale for invalid phases
    expect(breathingExercise.getDuration("invalidPhase")).toBe(4000);
  });

  it("should reset to default timings correctly", () => {
    // Modify durations
    breathingExercise.setDuration("inhale", 5000);
    breathingExercise.setDuration("exhale", 6000);

    // Reset to defaults
    breathingExercise.resetToDefaults();

    expect(breathingExercise.durations.inhale).toBe(4000);
    expect(breathingExercise.durations.holdIn).toBe(7000);
    expect(breathingExercise.durations.exhale).toBe(8000);
    expect(breathingExercise.durations.holdOut).toBe(1000);
  });

  it("should handle animation timing correctly", () => {
    const mockCircle = createMockElement();
    document.getElementById.mockReturnValue(mockCircle);

    breathingExercise.circleElement = mockCircle;

    // Test inhale animation
    breathingExercise.animateCircle("inhale", 4000);
    expect(mockCircle.classList.add).toHaveBeenCalledWith("inhale");
    expect(mockCircle.style.transitionDuration).toBe("4000ms");

    // Test exhale animation
    breathingExercise.animateCircle("exhale", 8000);
    expect(mockCircle.classList.add).toHaveBeenCalledWith("exhale");
    expect(mockCircle.style.transitionDuration).toBe("8000ms");

    // Test hold animation
    breathingExercise.animateCircle("holdIn", 7000);
    expect(mockCircle.classList.add).toHaveBeenCalledWith("hold");
    expect(mockCircle.style.transitionDuration).toBe("7000ms");
  });

  it("should format completion feedback with correct timing", () => {
    const mockText = createMockElement();
    document.getElementById.mockReturnValue(mockText);

    breathingExercise.textElement = mockText;
    breathingExercise.completedCycles = 3;
    breathingExercise.sessionData.totalTime = 65000; // 1 minute 5 seconds

    breathingExercise.showCompletionFeedback();

    expect(mockText.textContent).toContain("3 cycles completed");
    expect(mockText.textContent).toContain("1m 5s");
  });

  it("should handle short session timing correctly", () => {
    const mockText = createMockElement();
    document.getElementById.mockReturnValue(mockText);

    breathingExercise.textElement = mockText;
    breathingExercise.completedCycles = 0;
    breathingExercise.sessionData.totalTime = 5000; // 5 seconds

    breathingExercise.showCompletionFeedback();

    expect(mockText.textContent).toBe("Session complete!");
  });
});
