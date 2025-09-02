/**
 * Tests for Calendar Service
 * Testing Google Calendar API integration, reminder calculation, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
};

// Mock fetch
global.fetch = vi.fn();

// Import CalendarService
const CalendarService = await import("../services/calendar-service.js").then(
  (m) => m.default || m.CalendarService
);

describe("CalendarService", () => {
  let calendarService;

  beforeEach(() => {
    calendarService = new CalendarService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with default values", () => {
      expect(calendarService.apiKey).toBeNull();
      expect(calendarService.accessToken).toBeNull();
      expect(calendarService.isAuthenticated).toBe(false);
      expect(calendarService.baseUrl).toBe(
        "https://www.googleapis.com/calendar/v3"
      );
    });

    it("should load stored credentials on initialization", async () => {
      const mockCredentials = {
        calendarApiKey: "test-api-key",
        calendarAccessToken: "test-access-token",
      };

      chrome.storage.local.get.mockResolvedValue(mockCredentials);

      await calendarService.loadStoredCredentials();

      expect(calendarService.apiKey).toBe("test-api-key");
      expect(calendarService.accessToken).toBe("test-access-token");
      expect(calendarService.isAuthenticated).toBe(true);
    });
  });

  describe("Credential Management", () => {
    it("should store credentials successfully", async () => {
      chrome.storage.local.set.mockResolvedValue();

      const result = await calendarService.storeCredentials(
        "api-key",
        "access-token"
      );

      expect(result).toBe(true);
      expect(calendarService.apiKey).toBe("api-key");
      expect(calendarService.accessToken).toBe("access-token");
      expect(calendarService.isAuthenticated).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        calendarApiKey: "api-key",
        calendarAccessToken: "access-token",
      });
    });

    it("should handle credential storage errors", async () => {
      chrome.storage.local.set.mockRejectedValue(new Error("Storage error"));

      const result = await calendarService.storeCredentials(
        "api-key",
        "access-token"
      );

      expect(result).toBe(false);
    });

    it("should clear credentials successfully", async () => {
      chrome.storage.local.remove.mockResolvedValue();
      calendarService.apiKey = "test-key";
      calendarService.accessToken = "test-token";
      calendarService.isAuthenticated = true;

      const result = await calendarService.clearCredentials();

      expect(result).toBe(true);
      expect(calendarService.apiKey).toBeNull();
      expect(calendarService.accessToken).toBeNull();
      expect(calendarService.isAuthenticated).toBe(false);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        "calendarApiKey",
        "calendarAccessToken",
      ]);
    });
  });

  describe("Reminder Time Calculation", () => {
    it("should calculate high priority reminder times correctly", () => {
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const reminderTimes = calendarService.calculateReminderTimes(
        deadline,
        "high"
      );

      expect(reminderTimes).toHaveLength(4);

      // Check that reminders are at correct intervals (1 week, 3 days, 1 day, 2 hours before)
      const deadlineTime = deadline.getTime();
      const expectedTimes = [
        deadlineTime - 7 * 24 * 60 * 60 * 1000, // 1 week
        deadlineTime - 3 * 24 * 60 * 60 * 1000, // 3 days
        deadlineTime - 24 * 60 * 60 * 1000, // 1 day
        deadlineTime - 2 * 60 * 60 * 1000, // 2 hours
      ];

      reminderTimes.forEach((time, index) => {
        expect(time.getTime()).toBe(expectedTimes[index]);
      });
    });

    it("should calculate medium priority reminder times correctly", () => {
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const reminderTimes = calendarService.calculateReminderTimes(
        deadline,
        "medium"
      );

      expect(reminderTimes).toHaveLength(3);

      // Check that reminders are at correct intervals (3 days, 1 day, 4 hours before)
      const deadlineTime = deadline.getTime();
      const expectedTimes = [
        deadlineTime - 3 * 24 * 60 * 60 * 1000, // 3 days
        deadlineTime - 24 * 60 * 60 * 1000, // 1 day
        deadlineTime - 4 * 60 * 60 * 1000, // 4 hours
      ];

      reminderTimes.forEach((time, index) => {
        expect(time.getTime()).toBe(expectedTimes[index]);
      });
    });

    it("should calculate low priority reminder times correctly", () => {
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const reminderTimes = calendarService.calculateReminderTimes(
        deadline,
        "low"
      );

      expect(reminderTimes).toHaveLength(3);

      // Check that reminders are at correct intervals (1 week, 2 days, 8 hours before)
      const deadlineTime = deadline.getTime();
      const expectedTimes = [
        deadlineTime - 7 * 24 * 60 * 60 * 1000, // 1 week
        deadlineTime - 2 * 24 * 60 * 60 * 1000, // 2 days
        deadlineTime - 8 * 60 * 60 * 1000, // 8 hours
      ];

      reminderTimes.forEach((time, index) => {
        expect(time.getTime()).toBe(expectedTimes[index]);
      });
    });

    it("should filter out past reminder times", () => {
      // Set deadline to 1 hour from now (all reminders should be filtered out)
      const deadline = new Date(Date.now() + 60 * 60 * 1000);
      const reminderTimes = calendarService.calculateReminderTimes(
        deadline,
        "high"
      );

      expect(reminderTimes).toHaveLength(0);
    });

    it("should handle invalid priority by defaulting to low", () => {
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const reminderTimes = calendarService.calculateReminderTimes(
        deadline,
        "invalid"
      );

      expect(reminderTimes).toHaveLength(3); // Same as low priority
    });
  });

  describe("Calendar Event Creation", () => {
    beforeEach(() => {
      calendarService.apiKey = "test-api-key";
      calendarService.accessToken = "test-access-token";
      calendarService.isAuthenticated = true;
    });

    it("should create calendar event successfully", async () => {
      const mockResponse = {
        id: "event-123",
        summary: "Test Event",
        start: { dateTime: "2024-12-31T10:00:00Z" },
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const eventData = {
        summary: "Test Event",
        description: "Test Description",
        startTime: new Date("2024-12-31T10:00:00Z"),
      };

      const result = await calendarService.createCalendarEvent(eventData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/calendars/primary/events"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should throw error when not authenticated", async () => {
      calendarService.isAuthenticated = false;

      const eventData = {
        summary: "Test Event",
        startTime: new Date(),
      };

      await expect(
        calendarService.createCalendarEvent(eventData)
      ).rejects.toThrow("Calendar API not authenticated");
    });

    it("should handle API errors", async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: { message: "Invalid credentials" },
          }),
      });

      const eventData = {
        summary: "Test Event",
        startTime: new Date(),
      };

      await expect(
        calendarService.createCalendarEvent(eventData)
      ).rejects.toThrow("Calendar API error: Invalid credentials");
    });
  });

  describe("Task Reminder Creation", () => {
    beforeEach(() => {
      calendarService.apiKey = "test-api-key";
      calendarService.accessToken = "test-access-token";
      calendarService.isAuthenticated = true;
    });

    it("should create task reminders successfully", async () => {
      const mockEvent = {
        id: "event-123",
        summary: "Task Reminder: Test Task",
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEvent),
      });

      // Set deadline far enough in future to have reminders
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const result = await calendarService.createTaskReminders(
        "Test Task",
        deadline,
        "high"
      );

      expect(result.success).toBe(true);
      expect(result.createdCount).toBeGreaterThan(0);
      expect(result.events).toHaveLength(result.createdCount);
    });

    it("should throw error when not authenticated", async () => {
      calendarService.isAuthenticated = false;

      const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await expect(
        calendarService.createTaskReminders("Test Task", deadline, "high")
      ).rejects.toThrow("Calendar API not configured");
    });

    it("should throw error when all reminder times are in the past", async () => {
      const deadline = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await expect(
        calendarService.createTaskReminders("Test Task", deadline, "high")
      ).rejects.toThrow("All reminder times are in the past");
    });

    it("should handle partial failures gracefully", async () => {
      let callCount = 0;
      fetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: "event-1" }),
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: { message: "Server error" } }),
          });
        }
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const result = await calendarService.createTaskReminders(
        "Test Task",
        deadline,
        "high"
      );

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(1);
      expect(result.totalRequested).toBeGreaterThan(1);
    });
  });

  describe("Connection Testing", () => {
    it("should test connection successfully", async () => {
      calendarService.apiKey = "test-api-key";
      calendarService.accessToken = "test-access-token";
      calendarService.isAuthenticated = true;

      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            summary: "Primary Calendar",
          }),
      });

      const result = await calendarService.testConnection();

      expect(result.success).toBe(true);
      expect(result.calendarName).toBe("Primary Calendar");
    });

    it("should handle connection test when not authenticated", async () => {
      calendarService.isAuthenticated = false;

      const result = await calendarService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe("API credentials not configured");
    });

    it("should handle connection test API errors", async () => {
      calendarService.apiKey = "test-api-key";
      calendarService.accessToken = "invalid-token";
      calendarService.isAuthenticated = true;

      fetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: "Invalid token" },
          }),
      });

      const result = await calendarService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid token");
    });
  });

  describe("Utility Functions", () => {
    it("should format time until deadline correctly", () => {
      const fromTime = new Date("2024-01-01T00:00:00");
      const deadline = new Date("2024-01-03T12:00:00"); // 2 days and 12 hours later

      const result = calendarService.getTimeUntilDeadline(fromTime, deadline);

      expect(result).toBe("2 days and 12 hours");
    });

    it("should format hours only when less than a day", () => {
      const fromTime = new Date("2024-01-01T00:00:00");
      const deadline = new Date("2024-01-01T08:00:00"); // 8 hours later

      const result = calendarService.getTimeUntilDeadline(fromTime, deadline);

      expect(result).toBe("8 hours");
    });

    it("should return setup instructions", () => {
      const instructions = calendarService.getSetupInstructions();

      expect(instructions.title).toBe("Google Calendar API Setup");
      expect(instructions.steps).toHaveLength(6);
      expect(instructions.links.console).toBe(
        "https://console.cloud.google.com"
      );
      expect(instructions.links.documentation).toContain(
        "developers.google.com"
      );
    });
  });
});
