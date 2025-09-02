/**
 * Integration tests for Calendar Service
 * Testing complete workflow with different priority levels and reminder frequencies
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

describe("Calendar Service Integration", () => {
  let calendarService;

  beforeEach(async () => {
    calendarService = new CalendarService();
    // Mock the storage to return credentials
    chrome.storage.local.get.mockResolvedValue({
      calendarApiKey: "test-api-key",
      calendarAccessToken: "test-access-token",
    });
    // Load credentials to set authentication
    await calendarService.loadStoredCredentials();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Priority-based Reminder Creation", () => {
    it("should create correct number of reminders for high priority tasks", async () => {
      // Mock successful API responses
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event-123",
            summary: "Task Reminder: High Priority Task",
          }),
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const result = await calendarService.createTaskReminders(
        "High Priority Task",
        deadline,
        "high"
      );

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(4); // High priority should create 4 reminders
      expect(result.totalRequested).toBe(4);
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it("should create correct number of reminders for medium priority tasks", async () => {
      // Mock successful API responses
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event-456",
            summary: "Task Reminder: Medium Priority Task",
          }),
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const result = await calendarService.createTaskReminders(
        "Medium Priority Task",
        deadline,
        "medium"
      );

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(3); // Medium priority should create 3 reminders
      expect(result.totalRequested).toBe(3);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("should create correct number of reminders for low priority tasks", async () => {
      // Mock successful API responses
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event-789",
            summary: "Task Reminder: Low Priority Task",
          }),
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const result = await calendarService.createTaskReminders(
        "Low Priority Task",
        deadline,
        "low"
      );

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(3); // Low priority should create 3 reminders
      expect(result.totalRequested).toBe(3);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Reminder Timing Verification", () => {
    it("should create reminders at correct intervals for high priority", async () => {
      const capturedRequests = [];

      fetch.mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        capturedRequests.push({
          startTime: new Date(body.start.dateTime),
          summary: body.summary,
        });

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: `event-${capturedRequests.length}`,
              summary: body.summary,
            }),
        });
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      await calendarService.createTaskReminders(
        "High Priority Task",
        deadline,
        "high"
      );

      expect(capturedRequests).toHaveLength(4);

      // Verify reminder intervals (1 week, 3 days, 1 day, 2 hours before deadline)
      const deadlineTime = deadline.getTime();
      const expectedIntervals = [
        7 * 24 * 60 * 60 * 1000, // 1 week
        3 * 24 * 60 * 60 * 1000, // 3 days
        24 * 60 * 60 * 1000, // 1 day
        2 * 60 * 60 * 1000, // 2 hours
      ];

      capturedRequests.forEach((request, index) => {
        const expectedTime = deadlineTime - expectedIntervals[index];
        expect(request.startTime.getTime()).toBe(expectedTime);
      });
    });

    it("should create reminders at correct intervals for medium priority", async () => {
      const capturedRequests = [];

      fetch.mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        capturedRequests.push({
          startTime: new Date(body.start.dateTime),
          summary: body.summary,
        });

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: `event-${capturedRequests.length}`,
              summary: body.summary,
            }),
        });
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      await calendarService.createTaskReminders(
        "Medium Priority Task",
        deadline,
        "medium"
      );

      expect(capturedRequests).toHaveLength(3);

      // Verify reminder intervals (3 days, 1 day, 4 hours before deadline)
      const deadlineTime = deadline.getTime();
      const expectedIntervals = [
        3 * 24 * 60 * 60 * 1000, // 3 days
        24 * 60 * 60 * 1000, // 1 day
        4 * 60 * 60 * 1000, // 4 hours
      ];

      capturedRequests.forEach((request, index) => {
        const expectedTime = deadlineTime - expectedIntervals[index];
        expect(request.startTime.getTime()).toBe(expectedTime);
      });
    });

    it("should create reminders at correct intervals for low priority", async () => {
      const capturedRequests = [];

      fetch.mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        capturedRequests.push({
          startTime: new Date(body.start.dateTime),
          summary: body.summary,
        });

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: `event-${capturedRequests.length}`,
              summary: body.summary,
            }),
        });
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      await calendarService.createTaskReminders(
        "Low Priority Task",
        deadline,
        "low"
      );

      expect(capturedRequests).toHaveLength(3);

      // Verify reminder intervals (1 week, 2 days, 8 hours before deadline)
      const deadlineTime = deadline.getTime();
      const expectedIntervals = [
        7 * 24 * 60 * 60 * 1000, // 1 week
        2 * 24 * 60 * 60 * 1000, // 2 days
        8 * 60 * 60 * 1000, // 8 hours
      ];

      capturedRequests.forEach((request, index) => {
        const expectedTime = deadlineTime - expectedIntervals[index];
        expect(request.startTime.getTime()).toBe(expectedTime);
      });
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle authentication failures gracefully", async () => {
      calendarService.isAuthenticated = false;

      try {
        const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await calendarService.createTaskReminders(
          "Test Task",
          deadline,
          "high"
        );
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain("Calendar API not configured");
      }
    });

    it("should handle API failures and provide meaningful error messages", async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () =>
          Promise.resolve({
            error: { message: "Insufficient permissions" },
          }),
      });

      try {
        const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await calendarService.createTaskReminders(
          "Test Task",
          deadline,
          "high"
        );
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain(
          "Failed to create any calendar reminders"
        );
      }
    });

    it("should handle partial failures and report success for created reminders", async () => {
      let callCount = 0;
      fetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: `event-${callCount}`,
                summary: "Task Reminder",
              }),
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () =>
              Promise.resolve({
                error: { message: "Server error" },
              }),
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
      expect(result.createdCount).toBe(2); // Only first 2 succeeded
      expect(result.totalRequested).toBe(4); // High priority requests 4 reminders
    });
  });

  describe("Requirements Compliance", () => {
    it("should meet requirement 4.1: create at least 3 reminders for every task", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "event-123" }),
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Test all priority levels
      const priorities = ["high", "medium", "low"];

      for (const priority of priorities) {
        vi.clearAllMocks();
        const result = await calendarService.createTaskReminders(
          `${priority} Task`,
          deadline,
          priority
        );

        expect(result.createdCount).toBeGreaterThanOrEqual(3);
      }
    });

    it("should meet requirement 4.2: high priority creates minimum 4 reminders", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "event-123" }),
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const result = await calendarService.createTaskReminders(
        "High Priority Task",
        deadline,
        "high"
      );

      expect(result.createdCount).toBeGreaterThanOrEqual(4);
    });

    it("should meet requirement 4.3: medium priority creates minimum 3 reminders", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "event-123" }),
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const result = await calendarService.createTaskReminders(
        "Medium Priority Task",
        deadline,
        "medium"
      );

      expect(result.createdCount).toBeGreaterThanOrEqual(3);
    });

    it("should meet requirement 4.4: low priority creates minimum 3 reminders", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "event-123" }),
      });

      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const result = await calendarService.createTaskReminders(
        "Low Priority Task",
        deadline,
        "low"
      );

      expect(result.createdCount).toBeGreaterThanOrEqual(3);
    });

    it("should meet requirement 4.5: display error message when calendar integration fails", async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: { message: "Server error" },
          }),
      });

      try {
        const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await calendarService.createTaskReminders(
          "Test Task",
          deadline,
          "high"
        );
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toBeTruthy();
        expect(typeof error.message).toBe("string");
      }
    });

    it("should meet requirement 4.6: display setup instructions when API not configured", () => {
      calendarService.isAuthenticated = false;

      const instructions = calendarService.getSetupInstructions();

      expect(instructions.title).toBeTruthy();
      expect(instructions.steps).toBeInstanceOf(Array);
      expect(instructions.steps.length).toBeGreaterThan(0);
      expect(instructions.links).toBeTruthy();
    });
  });
});
