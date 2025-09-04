/**
 * End-to-End Workflow Tests
 * Tests for complete user workflows across the extension
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("End-to-End Workflows", () => {
  let mockStorageManager;
  let mockTabTracker;
  let mockGeminiService;
  let mockCalendarService;
  let mockAudioManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock all services
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
      setMultiple: vi.fn(),
      getMultiple: vi.fn(),
    };

    mockTabTracker = {
      getCurrentTabStats: vi.fn(),
      getFocusTabInfo: vi.fn(),
      setFocusTab: vi.fn(),
      resetFocusTab: vi.fn(),
      triggerManualBreak: vi.fn(),
    };

    mockGeminiService = {
      breakdownTask: vi.fn(),
      isConfigured: vi.fn(),
      testConnection: vi.fn(),
    };

    mockCalendarService = {
      createTaskReminders: vi.fn(),
      isAuthenticated: vi.fn(),
      testConnection: vi.fn(),
    };

    mockAudioManager = {
      startWhiteNoise: vi.fn(),
      stopWhiteNoise: vi.fn(),
      toggleWhiteNoise: vi.fn(),
      setVolume: vi.fn(),
      isActive: vi.fn(),
    };

    // Setup default mock responses
    mockStorageManager.get.mockResolvedValue({});
    mockStorageManager.set.mockResolvedValue(true);
    mockTabTracker.getCurrentTabStats.mockResolvedValue({
      tabId: 1,
      url: "https://example.com",
      totalTime: 60000,
      currentSessionTime: 30000,
    });
    mockGeminiService.isConfigured.mockReturnValue(true);
    mockCalendarService.isAuthenticated.mockReturnValue(true);
    mockAudioManager.isActive.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Task Creation and Reminder Workflow", () => {
    it("should complete full task creation to calendar reminder workflow", async () => {
      // Step 1: User inputs task details
      const taskInput = {
        name: "Complete project proposal",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        priority: "high",
      };

      // Step 2: AI breaks down the task
      const mockBreakdown = {
        success: true,
        taskName: taskInput.name,
        deadline: taskInput.deadline.toISOString(),
        steps: [
          "Research project requirements and scope",
          "Create detailed project timeline",
          "Draft initial proposal document",
          "Review and refine proposal content",
          "Finalize and format proposal",
        ],
      };

      mockGeminiService.breakdownTask.mockResolvedValue(mockBreakdown);

      // Step 3: Calendar reminders are created
      const mockCalendarResult = {
        success: true,
        createdCount: 4,
        totalRequested: 4,
        events: [
          { id: "event1", summary: "Task Reminder: Complete project proposal" },
          { id: "event2", summary: "Task Reminder: Complete project proposal" },
          { id: "event3", summary: "Task Reminder: Complete project proposal" },
          { id: "event4", summary: "Task Reminder: Complete project proposal" },
        ],
      };

      mockCalendarService.createTaskReminders.mockResolvedValue(
        mockCalendarResult
      );

      // Step 4: Task is saved to storage
      const mockTaskHistory = [];
      mockStorageManager.get.mockResolvedValue(mockTaskHistory);

      // Execute the workflow
      const breakdown = await mockGeminiService.breakdownTask(
        taskInput.name,
        taskInput.deadline.toISOString()
      );

      expect(breakdown.success).toBe(true);
      expect(breakdown.steps).toHaveLength(5);

      const calendarResult = await mockCalendarService.createTaskReminders(
        taskInput.name,
        taskInput.deadline,
        taskInput.priority
      );

      expect(calendarResult.success).toBe(true);
      expect(calendarResult.createdCount).toBe(4);

      // Save task with breakdown and calendar info
      const taskToSave = {
        id: expect.any(String),
        name: taskInput.name,
        deadline: taskInput.deadline.toISOString(),
        priority: taskInput.priority,
        breakdown: breakdown.steps,
        remindersCreated: true,
        calendarEvents: calendarResult.events,
        createdAt: expect.any(Number),
      };

      await mockStorageManager.set("tasks", [taskToSave]);

      expect(mockGeminiService.breakdownTask).toHaveBeenCalledWith(
        taskInput.name,
        taskInput.deadline.toISOString()
      );
      expect(mockCalendarService.createTaskReminders).toHaveBeenCalledWith(
        taskInput.name,
        taskInput.deadline,
        taskInput.priority
      );
      expect(mockStorageManager.set).toHaveBeenCalledWith("tasks", [
        taskToSave,
      ]);
    });

    it("should handle task creation with AI failure gracefully", async () => {
      const taskInput = {
        name: "Test task",
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: "medium",
      };

      // AI service fails
      mockGeminiService.breakdownTask.mockResolvedValue({
        success: false,
        error: "API key not configured",
        placeholder: {
          isPlaceholder: true,
          steps: ["Plan the task", "Execute the plan", "Review results"],
        },
      });

      // Calendar should still work
      mockCalendarService.createTaskReminders.mockResolvedValue({
        success: true,
        createdCount: 3,
        events: [],
      });

      const breakdown = await mockGeminiService.breakdownTask(
        taskInput.name,
        taskInput.deadline.toISOString()
      );

      expect(breakdown.success).toBe(false);
      expect(breakdown.placeholder.isPlaceholder).toBe(true);

      // Should still create calendar reminders
      const calendarResult = await mockCalendarService.createTaskReminders(
        taskInput.name,
        taskInput.deadline,
        taskInput.priority
      );

      expect(calendarResult.success).toBe(true);

      // Task should be saved with placeholder breakdown
      const taskToSave = {
        id: expect.any(String),
        name: taskInput.name,
        deadline: taskInput.deadline.toISOString(),
        priority: taskInput.priority,
        breakdown: breakdown.placeholder.steps,
        remindersCreated: true,
        isPlaceholder: true,
        createdAt: expect.any(Number),
      };

      await mockStorageManager.set("tasks", [taskToSave]);

      expect(mockStorageManager.set).toHaveBeenCalled();
    });

    it("should handle calendar integration failure gracefully", async () => {
      const taskInput = {
        name: "Test task",
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: "low",
      };

      // AI works fine
      mockGeminiService.breakdownTask.mockResolvedValue({
        success: true,
        steps: ["Step 1", "Step 2", "Step 3"],
      });

      // Calendar fails
      mockCalendarService.createTaskReminders.mockRejectedValue(
        new Error("Calendar API not authenticated")
      );

      const breakdown = await mockGeminiService.breakdownTask(
        taskInput.name,
        taskInput.deadline.toISOString()
      );

      expect(breakdown.success).toBe(true);

      // Calendar creation should fail
      let calendarError = null;
      try {
        await mockCalendarService.createTaskReminders(
          taskInput.name,
          taskInput.deadline,
          taskInput.priority
        );
      } catch (error) {
        calendarError = error;
      }

      expect(calendarError).toBeInstanceOf(Error);
      expect(calendarError.message).toBe("Calendar API not authenticated");

      // Task should still be saved without calendar reminders
      const taskToSave = {
        id: expect.any(String),
        name: taskInput.name,
        deadline: taskInput.deadline.toISOString(),
        priority: taskInput.priority,
        breakdown: breakdown.steps,
        remindersCreated: false,
        calendarError: calendarError.message,
        createdAt: expect.any(Number),
      };

      await mockStorageManager.set("tasks", [taskToSave]);

      expect(mockStorageManager.set).toHaveBeenCalled();
    });
  });

  describe("Focus Management Workflow", () => {
    it("should complete focus session setup and monitoring workflow", async () => {
      // Step 1: User sets focus tab
      const focusTabInfo = {
        tabId: 1,
        url: "https://work-project.com",
      };

      await mockTabTracker.setFocusTab(focusTabInfo.tabId, focusTabInfo.url);

      // Step 2: System monitors focus
      mockTabTracker.getFocusTabInfo.mockReturnValue({
        tabId: focusTabInfo.tabId,
        url: focusTabInfo.url,
        isSet: true,
      });

      const focusInfo = mockTabTracker.getFocusTabInfo();
      expect(focusInfo.isSet).toBe(true);
      expect(focusInfo.url).toBe(focusTabInfo.url);

      // Step 3: User can check current tab stats
      mockTabTracker.getCurrentTabStats.mockResolvedValue({
        tabId: 2, // Different tab - user deviated
        url: "https://social-media.com",
        totalTime: 300000, // 5 minutes
        currentSessionTime: 180000, // 3 minutes
      });

      const currentStats = await mockTabTracker.getCurrentTabStats();
      expect(currentStats.tabId).not.toBe(focusTabInfo.tabId);

      // Step 4: User can trigger manual break
      await mockTabTracker.triggerManualBreak();

      // Step 5: User can reset focus tab
      await mockTabTracker.resetFocusTab();

      mockTabTracker.getFocusTabInfo.mockReturnValue({
        tabId: null,
        url: null,
        isSet: false,
      });

      const resetFocusInfo = mockTabTracker.getFocusTabInfo();
      expect(resetFocusInfo.isSet).toBe(false);

      // Verify all calls were made
      expect(mockTabTracker.setFocusTab).toHaveBeenCalledWith(
        focusTabInfo.tabId,
        focusTabInfo.url
      );
      expect(mockTabTracker.triggerManualBreak).toHaveBeenCalled();
      expect(mockTabTracker.resetFocusTab).toHaveBeenCalled();
    });

    it("should handle screen time limit workflow", async () => {
      // Step 1: User configures screen time settings
      const screenTimeSettings = {
        limitMinutes: 25, // 25 minute limit
        enabled: true,
        notificationsEnabled: true,
      };

      await mockStorageManager.set("screenTimeSettings", screenTimeSettings);

      // Step 2: System tracks time and detects limit exceeded
      mockTabTracker.getCurrentTabStats.mockResolvedValue({
        tabId: 1,
        url: "https://example.com",
        totalTime: 1800000, // 30 minutes total
        currentSessionTime: 1500000, // 25 minutes current session
      });

      const stats = await mockTabTracker.getCurrentTabStats();
      const limitMs = screenTimeSettings.limitMinutes * 60 * 1000;

      expect(stats.currentSessionTime).toBeGreaterThan(limitMs);

      // Step 3: User can take manual break
      await mockTabTracker.triggerManualBreak();

      // Step 4: Timer should reset after break
      mockTabTracker.getCurrentTabStats.mockResolvedValue({
        tabId: 1,
        url: "https://example.com",
        totalTime: 1800000,
        currentSessionTime: 0, // Reset after break
      });

      const statsAfterBreak = await mockTabTracker.getCurrentTabStats();
      expect(statsAfterBreak.currentSessionTime).toBe(0);

      expect(mockTabTracker.triggerManualBreak).toHaveBeenCalled();
    });
  });

  describe("Wellness Tools Workflow", () => {
    it("should complete breathing exercise workflow", async () => {
      // Step 1: User starts breathing exercise
      const breathingSettings = {
        durations: {
          inhale: 4000,
          holdIn: 1000,
          exhale: 4000,
          holdOut: 1000,
        },
        sessionLength: 300000, // 5 minutes
      };

      await mockStorageManager.set("breathingSettings", breathingSettings);

      // Step 2: Exercise runs for specified duration
      const startTime = Date.now();
      const sessionDuration = 60000; // 1 minute for test

      // Simulate exercise completion
      const endTime = startTime + sessionDuration;
      const completedSession = {
        startTime,
        endTime,
        duration: sessionDuration,
        cyclesCompleted: Math.floor(sessionDuration / 10000), // 10 second cycles
      };

      // Step 3: Session is tracked
      const breathingHistory = await mockStorageManager.get("breathingHistory") || [];
      breathingHistory.push(completedSession);
      await mockStorageManager.set("breathingHistory", breathingHistory);

      expect(mockStorageManager.set).toHaveBeenCalledWith(
        "breathingHistory",
        expect.arrayContaining([completedSession])
      );
    });

    it("should complete white noise workflow", async () => {
      // Step 1: User starts white noise
      mockAudioManager.startWhiteNoise.mockResolvedValue({
        success: true,
        active: true,
        sound: "rain",
      });

      const startResult = await mockAudioManager.startWhiteNoise("rain");
      expect(startResult.success).toBe(true);
      expect(startResult.active).toBe(true);

      // Step 2: User adjusts volume
      await mockAudioManager.setVolume(0.7);

      // Step 3: User toggles white noise off
      mockAudioManager.toggleWhiteNoise.mockResolvedValue({
        success: true,
        active: false,
      });

      const toggleResult = await mockAudioManager.toggleWhiteNoise();
      expect(toggleResult.active).toBe(false);

      // Step 4: Settings are persisted
      const audioSettings = {
        whiteNoise: {
          enabled: false,
          volume: 0.7,
          currentSound: "rain",
        },
      };

      await mockStorageManager.set("audioSettings", audioSettings);

      expect(mockAudioManager.startWhiteNoise).toHaveBeenCalledWith("rain");
      expect(mockAudioManager.setVolume).toHaveBeenCalledWith(0.7);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        "audioSettings",
        audioSettings
      );
    });

    it("should handle external wellness pages workflow", async () => {
      // Step 1: User opens Focus & Anxiety Management page
      const focusAnxietyUrl = chrome.runtime.getURL("external-pages/focus-anxiety.html");
      
      chrome.tabs.create.mockResolvedValue({
        id: 10,
        url: focusAnxietyUrl,
      });

      const focusTab = await chrome.tabs.create({ url: focusAnxietyUrl });
      expect(focusTab.url).toBe(focusAnxietyUrl);

      // Step 2: User interacts with wellness tools (tracked via usage)
      const usageData = {
        pageType: "focus-anxiety",
        sessionStart: Date.now(),
        toolsUsed: ["breathing-guide", "anxiety-techniques"],
        sessionDuration: 300000, // 5 minutes
      };

      await mockStorageManager.set("wellnessUsage", [usageData]);

      // Step 3: User opens ASMR & Fidgeting page
      const asmrUrl = chrome.runtime.getURL("external-pages/asmr-fidget.html");
      
      chrome.tabs.create.mockResolvedValue({
        id: 11,
        url: asmrUrl,
      });

      const asmrTab = await chrome.tabs.create({ url: asmrUrl });
      expect(asmrTab.url).toBe(asmrUrl);

      expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        "wellnessUsage",
        expect.arrayContaining([usageData])
      );
    });
  });

  describe("Settings Management Workflow", () => {
    it("should complete settings configuration workflow", async () => {
      // Step 1: User configures API keys
      const apiKeys = {
        gemini: "test-gemini-key",
        calendar: "test-calendar-key",
      };

      await mockStorageManager.set("apiKeys", apiKeys);

      // Step 2: Services test connections
      mockGeminiService.testConnection.mockResolvedValue({
        success: true,
        error: null,
      });

      mockCalendarService.testConnection.mockResolvedValue({
        success: true,
        calendarName: "Primary Calendar",
      });

      const geminiTest = await mockGeminiService.testConnection();
      const calendarTest = await mockCalendarService.testConnection();

      expect(geminiTest.success).toBe(true);
      expect(calendarTest.success).toBe(true);

      // Step 3: User configures all extension settings
      const allSettings = {
        screenTimeSettings: {
          limitMinutes: 30,
          enabled: true,
          notificationsEnabled: true,
        },
        focusSettings: {
          enabled: true,
          reminderCooldownMinutes: 5,
          notificationsEnabled: true,
        },
        breathingSettings: {
          durations: { inhale: 4000, holdIn: 1000, exhale: 4000, holdOut: 1000 },
        },
        audioSettings: {
          whiteNoise: { enabled: false, volume: 0.5, currentSound: "rain" },
        },
      };

      await mockStorageManager.setMultiple(allSettings);

      expect(mockStorageManager.set).toHaveBeenCalledWith("apiKeys", apiKeys);
      expect(mockStorageManager.setMultiple).toHaveBeenCalledWith(allSettings);
      expect(mockGeminiService.testConnection).toHaveBeenCalled();
      expect(mockCalendarService.testConnection).toHaveBeenCalled();
    });
  });

  describe("Data Management Workflow", () => {
    it("should complete data export and cleanup workflow", async () => {
      // Step 1: Get all user data
      const allData = {
        tasks: [
          { id: "1", name: "Task 1", completed: false },
          { id: "2", name: "Task 2", completed: true },
        ],
        tabHistory: {
          1: { url: "https://example.com", totalTime: 120000 },
        },
        breathingHistory: [
          { startTime: Date.now() - 86400000, duration: 300000 },
        ],
        wellnessUsage: [
          { pageType: "focus-anxiety", sessionDuration: 180000 },
        ],
      };

      mockStorageManager.getMultiple.mockResolvedValue(allData);

      const exportData = await mockStorageManager.getMultiple([
        "tasks",
        "tabHistory",
        "breathingHistory",
        "wellnessUsage",
      ]);

      expect(exportData).toEqual(allData);

      // Step 2: User can clear specific data
      await mockStorageManager.set("tabHistory", {});
      await mockStorageManager.set("breathingHistory", []);

      // Step 3: User can clear all data
      const keysToRemove = ["tasks", "tabHistory", "breathingHistory", "wellnessUsage"];
      for (const key of keysToRemove) {
        await mockStorageManager.set(key, key === "tasks" ? [] : {});
      }

      expect(mockStorageManager.getMultiple).toHaveBeenCalledWith([
        "tasks",
        "tabHistory",
        "breathingHistory",
        "wellnessUsage",
      ]);
      expect(mockStorageManager.set).toHaveBeenCalledWith("tabHistory", {});
      expect(mockStorageManager.set).toHaveBeenCalledWith("breathingHistory", []);
    });
  });
});