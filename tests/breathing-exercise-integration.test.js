// Breathing Exercise Integration Tests

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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

// Mock DOM environment
global.document = {
  getElementById: vi.fn(),
  addEventListener: vi.fn(),
};

describe("BreathingExercise Integration", () => {
  let BreathingExercise;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Import the component
    const module = await import("../popup/components/breathing-exercise.js");
    BreathingExercise = module.default;
  });

  it("should be importable as a module", () => {
    expect(BreathingExercise).toBeDefined();
    expect(typeof BreathingExercise).toBe("function");
  });

  it("should create instance without throwing when DOM elements are missing", () => {
    document.getElementById.mockReturnValue(null);

    expect(() => {
      new BreathingExercise();
    }).not.toThrow();
  });

  it("should handle Chrome storage API calls", async () => {
    const breathingExercise = new BreathingExercise();

    await breathingExercise.loadCustomDurations();

    expect(chrome.storage.local.get).toHaveBeenCalledWith("breathingSettings");
  });

  it("should have correct default configuration", () => {
    const breathingExercise = new BreathingExercise();

    expect(breathingExercise.defaultDurations).toEqual({
      inhale: 4000,
      holdIn: 7000,
      exhale: 8000,
      holdOut: 1000,
    });

    expect(breathingExercise.phases).toEqual([
      "inhale",
      "holdIn",
      "exhale",
      "holdOut",
    ]);
  });

  it("should initialize with correct state", () => {
    const breathingExercise = new BreathingExercise();

    expect(breathingExercise.isActive).toBe(false);
    expect(breathingExercise.currentPhase).toBe(0);
    expect(breathingExercise.completedCycles).toBe(0);
  });

  it("should handle pattern setting correctly", () => {
    const breathingExercise = new BreathingExercise();

    breathingExercise.setPattern("4-4-4-4");

    expect(breathingExercise.durations).toEqual({
      inhale: 4000,
      holdIn: 4000,
      exhale: 4000,
      holdOut: 4000,
    });
  });

  it("should handle custom duration setting", () => {
    const breathingExercise = new BreathingExercise();

    breathingExercise.setDuration("inhale", 5000);

    expect(breathingExercise.durations.inhale).toBe(5000);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it("should validate duration inputs", () => {
    const breathingExercise = new BreathingExercise();
    const originalDuration = breathingExercise.durations.inhale;

    // Should not set negative duration
    breathingExercise.setDuration("inhale", -1000);
    expect(breathingExercise.durations.inhale).toBe(originalDuration);

    // Should not set duration for invalid phase
    breathingExercise.setDuration("invalidPhase", 5000);
    expect(breathingExercise.durations.invalidPhase).toBeUndefined();
  });

  it("should handle session data correctly", async () => {
    chrome.storage.local.get.mockResolvedValue({ breathingSessions: [] });

    const breathingExercise = new BreathingExercise();
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

  it("should calculate session statistics correctly", async () => {
    const mockSessions = [
      { totalTime: 30000, cyclesCompleted: 2 },
      { totalTime: 60000, cyclesCompleted: 4 },
    ];

    chrome.storage.local.get.mockResolvedValue({
      breathingSessions: mockSessions,
    });

    const breathingExercise = new BreathingExercise();
    const stats = await breathingExercise.getSessionStats();

    expect(stats.totalSessions).toBe(2);
    expect(stats.totalTime).toBe(90000);
    expect(stats.totalCycles).toBe(6);
    expect(stats.averageSessionTime).toBe(45000);
  });

  it("should handle errors gracefully", async () => {
    chrome.storage.local.get.mockRejectedValue(new Error("Storage error"));

    const breathingExercise = new BreathingExercise();

    // Should not throw on storage errors
    await expect(
      breathingExercise.loadCustomDurations()
    ).resolves.not.toThrow();
    await expect(breathingExercise.getSessionStats()).resolves.not.toThrow();
  });

  it("should track events correctly", () => {
    const breathingExercise = new BreathingExercise();

    breathingExercise.trackEvent("test_event", { data: "test" });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "TRACK_WELLNESS_EVENT",
      event: "test_event",
      data: expect.objectContaining({
        data: "test",
        timestamp: expect.any(Number),
        component: "breathing_exercise",
      }),
    });
  });

  it("should cleanup without errors", () => {
    const breathingExercise = new BreathingExercise();

    expect(() => {
      breathingExercise.destroy();
    }).not.toThrow();
  });
});
