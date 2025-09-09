/**
 * Pomodoro Service Tests
 * Tests for the Pomodoro timer functionality
 */

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      QUOTA_BYTES: 5242880,
    },
  },
  notifications: {
    create: jest.fn(),
  },
};

// Mock StorageManager
class MockStorageManager {
  constructor() {
    this.data = {};
  }

  async get(key) {
    return this.data[key] || null;
  }

  async set(key, value) {
    this.data[key] = value;
    return true;
  }

  async remove(key) {
    delete this.data[key];
    return true;
  }

  async removeMultiple(keys) {
    keys.forEach((key) => delete this.data[key]);
    return true;
  }

  async clear() {
    this.data = {};
    return true;
  }
}

// Import the service
const PomodoroService = require("../services/pomodoro-service.js");

describe("PomodoroService", () => {
  let pomodoroService;
  let mockStorageManager;

  beforeEach(() => {
    mockStorageManager = new MockStorageManager();
    pomodoroService = new PomodoroService();
    pomodoroService.storageManager = mockStorageManager;

    // Reset timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (pomodoroService) {
      pomodoroService.clearTimer();
    }
  });

  describe("Initialization", () => {
    test("should initialize with default settings", () => {
      expect(pomodoroService.settings).toEqual({
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        soundEnabled: true,
        notificationsEnabled: true,
      });
    });

    test("should not be running initially", () => {
      expect(pomodoroService.isTimerRunning()).toBe(false);
      expect(pomodoroService.getCurrentSession()).toBeNull();
    });
  });

  describe("Settings Management", () => {
    test("should save and load settings", async () => {
      const newSettings = {
        workDuration: 30,
        shortBreakDuration: 10,
        notificationsEnabled: false,
      };

      await pomodoroService.saveSettings(newSettings);

      expect(mockStorageManager.data.pomodoroSettings).toEqual({
        ...pomodoroService.defaultSettings,
        ...newSettings,
      });
    });

    test("should load settings from storage", async () => {
      const savedSettings = {
        workDuration: 20,
        longBreakDuration: 20,
      };

      mockStorageManager.data.pomodoroSettings = savedSettings;

      await pomodoroService.loadSettings();

      expect(pomodoroService.settings.workDuration).toBe(20);
      expect(pomodoroService.settings.longBreakDuration).toBe(20);
      expect(pomodoroService.settings.shortBreakDuration).toBe(5); // Default value
    });
  });

  describe("Session Management", () => {
    test("should start a work session", async () => {
      const session = await pomodoroService.startSession("work");

      expect(session).toBeTruthy();
      expect(session.type).toBe("work");
      expect(session.duration).toBe(25 * 60 * 1000); // 25 minutes in ms
      expect(session.isActive).toBe(true);
      expect(session.isPaused).toBe(false);
      expect(pomodoroService.isTimerRunning()).toBe(true);
    });

    test("should start a short break session", async () => {
      const session = await pomodoroService.startSession("shortBreak");

      expect(session).toBeTruthy();
      expect(session.type).toBe("shortBreak");
      expect(session.duration).toBe(5 * 60 * 1000); // 5 minutes in ms
    });

    test("should start a long break session", async () => {
      const session = await pomodoroService.startSession("longBreak");

      expect(session).toBeTruthy();
      expect(session.type).toBe("longBreak");
      expect(session.duration).toBe(15 * 60 * 1000); // 15 minutes in ms
    });

    test("should pause and resume a session", async () => {
      await pomodoroService.startSession("work");

      // Pause the session
      const pauseResult = await pomodoroService.pauseSession();
      expect(pauseResult).toBe(true);
      expect(pomodoroService.currentSession.isPaused).toBe(true);

      // Resume the session
      const resumeResult = await pomodoroService.resumeSession();
      expect(resumeResult).toBe(true);
      expect(pomodoroService.currentSession.isPaused).toBe(false);
    });

    test("should stop a session", async () => {
      await pomodoroService.startSession("work");

      const stoppedSession = await pomodoroService.stopSession();

      expect(stoppedSession).toBeTruthy();
      expect(stoppedSession.isActive).toBe(false);
      expect(pomodoroService.isTimerRunning()).toBe(false);
      expect(pomodoroService.getCurrentSession()).toBeNull();
    });

    test("should complete a session after timer expires", async () => {
      const listeners = [];
      pomodoroService.addEventListener((event, data) => {
        listeners.push({ event, data });
      });

      await pomodoroService.startSession("work");

      // Fast-forward time to complete the session
      jest.advanceTimersByTime(25 * 60 * 1000 + 1000); // 25 minutes + 1 second

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(pomodoroService.isTimerRunning()).toBe(false);
      expect(pomodoroService.getCurrentSession()).toBeNull();

      // Check if completion event was fired
      const completionEvent = listeners.find(
        (l) => l.event === "sessionCompleted"
      );
      expect(completionEvent).toBeTruthy();
    });
  });

  describe("Statistics Tracking", () => {
    test("should track session statistics", async () => {
      // Start and complete a work session
      await pomodoroService.startSession("work");
      await pomodoroService.completeSession();

      const stats = await pomodoroService.getTodayStats();

      expect(stats.workSessions).toBe(1);
      expect(stats.totalWorkTime).toBe(25);
      expect(stats.sessionsCompleted).toBe(1);
    });

    test("should track break statistics", async () => {
      // Start and complete a short break
      await pomodoroService.startSession("shortBreak");
      await pomodoroService.completeSession();

      const stats = await pomodoroService.getTodayStats();

      expect(stats.shortBreaks).toBe(1);
      expect(stats.totalBreakTime).toBe(5);
      expect(stats.sessionsCompleted).toBe(1);
    });

    test("should track stopped sessions", async () => {
      await pomodoroService.startSession("work");
      await pomodoroService.stopSession();

      const stats = await pomodoroService.getTodayStats();

      expect(stats.sessionsStarted).toBe(1);
      expect(stats.sessionsStopped).toBe(1);
      expect(stats.sessionsCompleted).toBe(0);
    });

    test("should get historical statistics", async () => {
      // Add some test data
      const testStats = {};
      const today = new Date().toDateString();
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toDateString();

      testStats[today] = { workSessions: 3, totalWorkTime: 75 };
      testStats[yesterday] = { workSessions: 2, totalWorkTime: 50 };

      mockStorageManager.data.pomodoroStats = testStats;

      const historical = await pomodoroService.getHistoricalStats(2);

      expect(historical).toHaveLength(2);
      expect(historical[1].stats.workSessions).toBe(3); // Today (most recent)
      expect(historical[0].stats.workSessions).toBe(2); // Yesterday
    });
  });

  describe("Session History", () => {
    test("should save completed sessions to history", async () => {
      await pomodoroService.startSession("work");
      const completedSession = await pomodoroService.completeSession();

      const history = await pomodoroService.getSessionHistory();

      expect(history).toHaveLength(1);
      expect(history[0].type).toBe("work");
      expect(history[0].wasCompleted).toBe(true);
    });

    test("should limit history to 100 sessions", async () => {
      // Create 101 sessions in history
      const sessions = [];
      for (let i = 0; i < 101; i++) {
        sessions.push({
          id: `session_${i}`,
          type: "work",
          completedAt: Date.now() - i * 1000,
        });
      }

      mockStorageManager.data.pomodoroHistory = sessions;

      // Add one more session
      await pomodoroService.startSession("work");
      await pomodoroService.completeSession();

      const history = mockStorageManager.data.pomodoroHistory;
      expect(history).toHaveLength(100);
    });
  });

  describe("Time Formatting", () => {
    test("should format time correctly", () => {
      expect(pomodoroService.formatTime(0)).toBe("00:00");
      expect(pomodoroService.formatTime(60000)).toBe("01:00"); // 1 minute
      expect(pomodoroService.formatTime(90000)).toBe("01:30"); // 1.5 minutes
      expect(pomodoroService.formatTime(3600000)).toBe("60:00"); // 1 hour
    });

    test("should format session types", () => {
      expect(pomodoroService.formatSessionType("work")).toBe("Work Session");
      expect(pomodoroService.formatSessionType("shortBreak")).toBe(
        "Short Break"
      );
      expect(pomodoroService.formatSessionType("longBreak")).toBe("Long Break");
    });
  });

  describe("Event Listeners", () => {
    test("should add and remove event listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      pomodoroService.addEventListener(listener1);
      pomodoroService.addEventListener(listener2);

      expect(pomodoroService.listeners.size).toBe(2);

      pomodoroService.removeEventListener(listener1);

      expect(pomodoroService.listeners.size).toBe(1);
    });

    test("should notify listeners of events", () => {
      const listener = jest.fn();
      pomodoroService.addEventListener(listener);

      pomodoroService.notifyListeners("test", { data: "test" });

      expect(listener).toHaveBeenCalledWith("test", { data: "test" });
    });
  });

  describe("Data Reset", () => {
    test("should reset all data", async () => {
      // Set up some data
      await pomodoroService.startSession("work");
      await pomodoroService.saveSettings({ workDuration: 30 });

      // Reset all data
      const result = await pomodoroService.resetAllData();

      expect(result).toBe(true);
      expect(pomodoroService.getCurrentSession()).toBeNull();
      expect(pomodoroService.isTimerRunning()).toBe(false);
      expect(pomodoroService.settings).toEqual(pomodoroService.defaultSettings);
    });
  });

  describe("Auto-start Logic", () => {
    test("should suggest long break after configured work sessions", async () => {
      const listener = jest.fn();
      pomodoroService.addEventListener(listener);

      // Set up stats for 4 work sessions (default long break interval)
      const today = new Date().toDateString();
      mockStorageManager.data.pomodoroStats = {
        [today]: { workSessions: 4 },
      };

      await pomodoroService.startSession("work");
      await pomodoroService.completeSession();

      // Check if next session ready event was fired with long break
      const nextSessionEvent = listener.mock.calls.find(
        (call) => call[0] === "nextSessionReady"
      );

      expect(nextSessionEvent).toBeTruthy();
      expect(nextSessionEvent[1].type).toBe("longBreak");
    });

    test("should suggest short break after work session (not at long break interval)", async () => {
      const listener = jest.fn();
      pomodoroService.addEventListener(listener);

      // Set up stats for 2 work sessions (not at long break interval)
      const today = new Date().toDateString();
      mockStorageManager.data.pomodoroStats = {
        [today]: { workSessions: 2 },
      };

      await pomodoroService.startSession("work");
      await pomodoroService.completeSession();

      // Check if next session ready event was fired with short break
      const nextSessionEvent = listener.mock.calls.find(
        (call) => call[0] === "nextSessionReady"
      );

      expect(nextSessionEvent).toBeTruthy();
      expect(nextSessionEvent[1].type).toBe("shortBreak");
    });
  });
});
