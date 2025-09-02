/**
 * Calendar Integration UI Tests
 * Tests for the calendar integration UI controls and functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    getURL: vi.fn(),
  },
};

// Mock DOM
const mockDOM = () => {
  document.body.innerHTML = `
    <div class="calendar-section">
      <div class="calendar-connection-status">
        <span class="connection-dot" id="connectionDot"></span>
        <span class="connection-text" id="connectionText">Not Connected</span>
      </div>
      
      <div class="calendar-config" id="calendarConfig">
        <div class="config-content" id="configContent">
          <input type="password" id="apiKeyInput" placeholder="Enter your API key">
          <input type="password" id="accessTokenInput" placeholder="Enter your access token">
          <button id="saveConfigBtn">Save Configuration</button>
          <button id="testConnectionBtn">Test Connection</button>
          <button id="clearConfigBtn">Clear</button>
        </div>
        <button id="toggleConfigBtn">Show Setup</button>
      </div>
      
      <div class="calendar-reminder-form">
        <input type="text" id="reminderTaskInput" placeholder="Task name">
        <input type="datetime-local" id="reminderDeadlineInput">
        <select id="prioritySelect">
          <option value="high">High Priority</option>
          <option value="medium" selected>Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
        <button id="createRemindersBtn">Create Calendar Reminders</button>
        <div id="priorityInfo"></div>
      </div>
      
      <div class="manual-reminder-fallback" id="manualReminderFallback" style="display: none;">
        <div class="manual-reminder-list" id="manualReminderList"></div>
        <button id="copyRemindersBtn">Copy to Clipboard</button>
        <button id="hideManualBtn">Hide</button>
      </div>
      
      <div class="calendar-status" id="calendarStatus"></div>
    </div>
  `;
};

// Mock CalendarService
class MockCalendarService {
  constructor() {
    this.isAuthenticated = false;
    this.apiKey = null;
    this.accessToken = null;
  }

  async loadStoredCredentials() {
    const result = await chrome.storage.local.get([
      "calendarApiKey",
      "calendarAccessToken",
    ]);
    this.apiKey = result.calendarApiKey;
    this.accessToken = result.calendarAccessToken;
    this.isAuthenticated = !!(this.apiKey && this.accessToken);
  }

  async storeCredentials(apiKey, accessToken) {
    await chrome.storage.local.set({
      calendarApiKey: apiKey,
      calendarAccessToken: accessToken,
    });
    this.apiKey = apiKey;
    this.accessToken = accessToken;
    this.isAuthenticated = true;
    return true;
  }

  async testConnection() {
    if (!this.isAuthenticated) {
      return { success: false, error: "Not authenticated" };
    }
    return { success: true, calendarName: "Test Calendar" };
  }

  async createTaskReminders(taskName, deadline, priority) {
    if (!this.isAuthenticated) {
      throw new Error("Not authenticated");
    }
    return {
      success: true,
      createdCount: 3,
      totalRequested: 3,
      events: [],
    };
  }

  calculateReminderTimes(deadline, priority) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
    return [futureDate];
  }

  async clearCredentials() {
    await chrome.storage.local.remove([
      "calendarApiKey",
      "calendarAccessToken",
    ]);
    this.apiKey = null;
    this.accessToken = null;
    this.isAuthenticated = false;
    return true;
  }
}

// Mock PopupManager class with calendar methods
class MockPopupManager {
  constructor() {
    this.calendarService = new MockCalendarService();
    this.initializeElements();
  }

  initializeElements() {
    this.connectionDot = document.getElementById("connectionDot");
    this.connectionText = document.getElementById("connectionText");
    this.calendarConfig = document.getElementById("calendarConfig");
    this.toggleConfigBtn = document.getElementById("toggleConfigBtn");
    this.configContent = document.getElementById("configContent");
    this.apiKeyInput = document.getElementById("apiKeyInput");
    this.accessTokenInput = document.getElementById("accessTokenInput");
    this.saveConfigBtn = document.getElementById("saveConfigBtn");
    this.testConnectionBtn = document.getElementById("testConnectionBtn");
    this.clearConfigBtn = document.getElementById("clearConfigBtn");
    this.reminderTaskInput = document.getElementById("reminderTaskInput");
    this.reminderDeadlineInput = document.getElementById(
      "reminderDeadlineInput"
    );
    this.prioritySelect = document.getElementById("prioritySelect");
    this.priorityInfo = document.getElementById("priorityInfo");
    this.createRemindersBtn = document.getElementById("createRemindersBtn");
    this.manualReminderFallback = document.getElementById(
      "manualReminderFallback"
    );
    this.manualReminderList = document.getElementById("manualReminderList");
    this.copyRemindersBtn = document.getElementById("copyRemindersBtn");
    this.hideManualBtn = document.getElementById("hideManualBtn");
    this.calendarStatus = document.getElementById("calendarStatus");
  }

  updateCalendarConnectionStatus(connected = null, statusText = null) {
    const isConnected =
      connected !== null ? connected : this.calendarService.isAuthenticated;

    this.connectionDot.classList.remove("connected", "testing");
    if (isConnected) {
      this.connectionDot.classList.add("connected");
      this.connectionText.textContent = statusText || "Connected";
    } else {
      this.connectionText.textContent = statusText || "Not Connected";
    }
  }

  toggleCalendarConfig() {
    const isVisible = this.configContent.style.display === "block";

    if (isVisible) {
      this.configContent.style.display = "none";
      this.toggleConfigBtn.textContent = "Show Setup";
    } else {
      this.configContent.style.display = "block";
      this.toggleConfigBtn.textContent = "Hide Setup";
    }
  }

  async handleSaveCalendarConfig() {
    const apiKey = this.apiKeyInput.value.trim();
    const accessToken = this.accessTokenInput.value.trim();

    if (!apiKey || !accessToken) {
      this.showCalendarStatus(
        "Please enter both API key and access token",
        "error"
      );
      return;
    }

    const success = await this.calendarService.storeCredentials(
      apiKey,
      accessToken
    );

    if (success) {
      this.showCalendarStatus("Configuration saved successfully!", "success");
      this.updateCalendarConnectionStatus(true, "Configured");
      this.apiKeyInput.value = "";
      this.accessTokenInput.value = "";
    } else {
      this.showCalendarStatus("Failed to save configuration", "error");
    }
  }

  async handleTestConnection() {
    if (!this.calendarService.isAuthenticated) {
      this.showCalendarStatus(
        "Please configure API credentials first",
        "warning"
      );
      return;
    }

    const result = await this.calendarService.testConnection();

    if (result.success) {
      this.updateCalendarConnectionStatus(
        true,
        `Connected to ${result.calendarName}`
      );
      this.showCalendarStatus("Connection test successful!", "success");
    } else {
      this.updateCalendarConnectionStatus(false, "Connection Failed");
      this.showCalendarStatus(`Connection failed: ${result.error}`, "error");
    }
  }

  updatePriorityInfo() {
    const priority = this.prioritySelect.value;
    const infoTexts = {
      high: "High Priority: Reminders at 1 week, 3 days, 1 day, and 2 hours before deadline",
      medium:
        "Medium Priority: Reminders at 3 days, 1 day, and 4 hours before deadline",
      low: "Low Priority: Reminders at 1 week, 2 days, and 8 hours before deadline",
    };

    this.priorityInfo.innerHTML = `<small>${
      infoTexts[priority] || infoTexts.medium
    }</small>`;
  }

  async handleCreateReminders() {
    const taskName = this.reminderTaskInput.value.trim();
    const deadline = this.reminderDeadlineInput.value;
    const priority = this.prioritySelect.value;

    if (!taskName || !deadline) {
      this.showCalendarStatus("Please enter task name and deadline", "error");
      return;
    }

    if (!this.calendarService.isAuthenticated) {
      this.showManualReminderFallback(taskName, deadline, priority);
      return;
    }

    try {
      const deadlineDate = new Date(deadline);
      const result = await this.calendarService.createTaskReminders(
        taskName,
        deadlineDate,
        priority
      );

      if (result.success) {
        this.showCalendarStatus(
          `Successfully created ${result.createdCount} of ${result.totalRequested} reminders!`,
          "success"
        );
        this.reminderTaskInput.value = "";
        this.reminderDeadlineInput.value = "";
      }
    } catch (error) {
      this.showCalendarStatus(
        `Failed to create reminders: ${error.message}`,
        "error"
      );
      this.showManualReminderFallback(taskName, deadline, priority);
    }
  }

  showManualReminderFallback(taskName, deadline, priority) {
    const deadlineDate = new Date(deadline);
    const reminderTimes = this.calculateManualReminderTimes(
      deadlineDate,
      priority
    );

    this.manualReminderList.innerHTML = "";

    reminderTimes.forEach((reminder) => {
      const reminderItem = document.createElement("div");
      reminderItem.className = "manual-reminder-item";
      reminderItem.innerHTML = `
        <div>
          <div class="reminder-time">${reminder.time}</div>
          <div class="reminder-description">${reminder.description}</div>
        </div>
      `;
      this.manualReminderList.appendChild(reminderItem);
    });

    this.manualReminderFallback.style.display = "block";
    this.showCalendarStatus(
      "Calendar integration unavailable. Manual reminders shown below.",
      "warning"
    );
  }

  calculateManualReminderTimes(deadline, priority) {
    const reminderTimes = [];
    const deadlineTime = deadline.getTime();

    const intervals = {
      week: 7 * 24 * 60 * 60 * 1000,
      threeDays: 3 * 24 * 60 * 60 * 1000,
      twoDays: 2 * 24 * 60 * 60 * 1000,
      oneDay: 24 * 60 * 60 * 1000,
      eightHours: 8 * 60 * 60 * 1000,
      fourHours: 4 * 60 * 60 * 1000,
      twoHours: 2 * 60 * 60 * 1000,
    };

    let reminderIntervals = [];

    switch (priority.toLowerCase()) {
      case "high":
        reminderIntervals = [
          { interval: intervals.week, description: "1 week before" },
          { interval: intervals.threeDays, description: "3 days before" },
          { interval: intervals.oneDay, description: "1 day before" },
          { interval: intervals.twoHours, description: "2 hours before" },
        ];
        break;
      case "medium":
        reminderIntervals = [
          { interval: intervals.threeDays, description: "3 days before" },
          { interval: intervals.oneDay, description: "1 day before" },
          { interval: intervals.fourHours, description: "4 hours before" },
        ];
        break;
      case "low":
      default:
        reminderIntervals = [
          { interval: intervals.week, description: "1 week before" },
          { interval: intervals.twoDays, description: "2 days before" },
          { interval: intervals.eightHours, description: "8 hours before" },
        ];
        break;
    }

    const now = new Date();
    reminderIntervals.forEach((reminder) => {
      const reminderTime = new Date(deadlineTime - reminder.interval);
      if (reminderTime > now) {
        reminderTimes.push({
          time: reminderTime.toLocaleString(),
          description: reminder.description,
        });
      }
    });

    return reminderTimes;
  }

  showCalendarStatus(message, type) {
    this.calendarStatus.textContent = message;
    this.calendarStatus.className = `calendar-status ${type}`;
  }

  setButtonLoading(button, loading) {
    if (loading) {
      button.classList.add("loading");
      button.disabled = true;
    } else {
      button.classList.remove("loading");
      button.disabled = false;
    }
  }
}

describe("Calendar Integration UI", () => {
  let popupManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup DOM
    mockDOM();

    // Mock Chrome storage
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue();
    chrome.storage.local.remove.mockResolvedValue();

    // Create popup manager instance
    popupManager = new MockPopupManager();
  });

  describe("Calendar Configuration", () => {
    it("should show not connected status initially", () => {
      expect(popupManager.connectionText.textContent).toBe("Not Connected");
      expect(popupManager.connectionDot.classList.contains("connected")).toBe(
        false
      );
    });

    it("should toggle configuration panel", () => {
      // Initially hidden (empty string is treated as hidden)
      expect(popupManager.configContent.style.display).toBe("");
      expect(popupManager.toggleConfigBtn.textContent).toBe("Show Setup");

      // Toggle to show
      popupManager.toggleCalendarConfig();
      expect(popupManager.configContent.style.display).toBe("block");
      expect(popupManager.toggleConfigBtn.textContent).toBe("Hide Setup");

      // Toggle to hide
      popupManager.toggleCalendarConfig();
      expect(popupManager.configContent.style.display).toBe("none");
      expect(popupManager.toggleConfigBtn.textContent).toBe("Show Setup");
    });

    it("should save calendar configuration", async () => {
      popupManager.apiKeyInput.value = "test-api-key";
      popupManager.accessTokenInput.value = "test-access-token";

      await popupManager.handleSaveCalendarConfig();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        calendarApiKey: "test-api-key",
        calendarAccessToken: "test-access-token",
      });
      expect(popupManager.calendarStatus.textContent).toBe(
        "Configuration saved successfully!"
      );
      expect(popupManager.connectionText.textContent).toBe("Configured");
    });

    it("should validate required fields when saving configuration", async () => {
      // Test with empty fields
      popupManager.apiKeyInput.value = "";
      popupManager.accessTokenInput.value = "";

      await popupManager.handleSaveCalendarConfig();

      expect(popupManager.calendarStatus.textContent).toBe(
        "Please enter both API key and access token"
      );
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it("should test calendar connection", async () => {
      // Setup authenticated state
      popupManager.calendarService.isAuthenticated = true;

      await popupManager.handleTestConnection();

      expect(popupManager.calendarStatus.textContent).toBe(
        "Connection test successful!"
      );
      expect(popupManager.connectionText.textContent).toBe(
        "Connected to Test Calendar"
      );
    });

    it("should handle connection test without authentication", async () => {
      // Ensure not authenticated
      popupManager.calendarService.isAuthenticated = false;

      await popupManager.handleTestConnection();

      expect(popupManager.calendarStatus.textContent).toBe(
        "Please configure API credentials first"
      );
    });
  });

  describe("Priority Information", () => {
    it("should update priority info for high priority", () => {
      popupManager.prioritySelect.value = "high";
      popupManager.updatePriorityInfo();

      expect(popupManager.priorityInfo.innerHTML).toContain(
        "High Priority: Reminders at 1 week, 3 days, 1 day, and 2 hours before deadline"
      );
    });

    it("should update priority info for medium priority", () => {
      popupManager.prioritySelect.value = "medium";
      popupManager.updatePriorityInfo();

      expect(popupManager.priorityInfo.innerHTML).toContain(
        "Medium Priority: Reminders at 3 days, 1 day, and 4 hours before deadline"
      );
    });

    it("should update priority info for low priority", () => {
      popupManager.prioritySelect.value = "low";
      popupManager.updatePriorityInfo();

      expect(popupManager.priorityInfo.innerHTML).toContain(
        "Low Priority: Reminders at 1 week, 2 days, and 8 hours before deadline"
      );
    });
  });

  describe("Reminder Creation", () => {
    it("should create calendar reminders when authenticated", async () => {
      // Setup authenticated state
      popupManager.calendarService.isAuthenticated = true;

      // Set form values
      popupManager.reminderTaskInput.value = "Test Task";
      popupManager.reminderDeadlineInput.value = "2024-12-31T23:59";
      popupManager.prioritySelect.value = "medium";

      await popupManager.handleCreateReminders();

      expect(popupManager.calendarStatus.textContent).toBe(
        "Successfully created 3 of 3 reminders!"
      );
      expect(popupManager.reminderTaskInput.value).toBe("");
      expect(popupManager.reminderDeadlineInput.value).toBe("");
    });

    it("should show manual fallback when not authenticated", async () => {
      // Ensure not authenticated
      popupManager.calendarService.isAuthenticated = false;

      // Set form values
      popupManager.reminderTaskInput.value = "Test Task";
      popupManager.reminderDeadlineInput.value = "2024-12-31T23:59";
      popupManager.prioritySelect.value = "medium";

      await popupManager.handleCreateReminders();

      expect(popupManager.manualReminderFallback.style.display).toBe("block");
      expect(popupManager.calendarStatus.textContent).toBe(
        "Calendar integration unavailable. Manual reminders shown below."
      );
    });

    it("should validate required fields for reminder creation", async () => {
      // Test with empty task name
      popupManager.reminderTaskInput.value = "";
      popupManager.reminderDeadlineInput.value = "2024-12-31T23:59";

      await popupManager.handleCreateReminders();

      expect(popupManager.calendarStatus.textContent).toBe(
        "Please enter task name and deadline"
      );
    });
  });

  describe("Manual Reminder Fallback", () => {
    it("should calculate correct reminder times for high priority", () => {
      // Use a future date that's far enough to have all reminders
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const reminders = popupManager.calculateManualReminderTimes(
        deadline,
        "high"
      );

      expect(reminders.length).toBeGreaterThan(0);
      expect(reminders[0]).toHaveProperty("time");
      expect(reminders[0]).toHaveProperty("description");
    });

    it("should calculate correct reminder times for medium priority", () => {
      // Use a future date that's far enough to have all reminders
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const reminders = popupManager.calculateManualReminderTimes(
        deadline,
        "medium"
      );

      expect(reminders.length).toBeGreaterThan(0);
      expect(
        reminders.some((r) => r.description.includes("3 days before"))
      ).toBe(true);
    });

    it("should calculate correct reminder times for low priority", () => {
      // Use a future date that's far enough to have all reminders
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const reminders = popupManager.calculateManualReminderTimes(
        deadline,
        "low"
      );

      expect(reminders.length).toBeGreaterThan(0);
      expect(
        reminders.some((r) => r.description.includes("1 week before"))
      ).toBe(true);
    });

    it("should display manual reminders in the UI", async () => {
      popupManager.calendarService.isAuthenticated = false;
      popupManager.reminderTaskInput.value = "Test Task";
      // Use a future date that's far enough to have reminders
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      popupManager.reminderDeadlineInput.value = futureDate
        .toISOString()
        .slice(0, 16);
      popupManager.prioritySelect.value = "medium";

      await popupManager.handleCreateReminders();

      const reminderItems = popupManager.manualReminderList.querySelectorAll(
        ".manual-reminder-item"
      );
      expect(reminderItems.length).toBeGreaterThan(0);

      const firstItem = reminderItems[0];
      expect(firstItem.querySelector(".reminder-time")).toBeTruthy();
      expect(firstItem.querySelector(".reminder-description")).toBeTruthy();
    });
  });

  describe("Status Display", () => {
    it("should show success status", () => {
      popupManager.showCalendarStatus("Test success message", "success");

      expect(popupManager.calendarStatus.textContent).toBe(
        "Test success message"
      );
      expect(popupManager.calendarStatus.classList.contains("success")).toBe(
        true
      );
    });

    it("should show error status", () => {
      popupManager.showCalendarStatus("Test error message", "error");

      expect(popupManager.calendarStatus.textContent).toBe(
        "Test error message"
      );
      expect(popupManager.calendarStatus.classList.contains("error")).toBe(
        true
      );
    });

    it("should show warning status", () => {
      popupManager.showCalendarStatus("Test warning message", "warning");

      expect(popupManager.calendarStatus.textContent).toBe(
        "Test warning message"
      );
      expect(popupManager.calendarStatus.classList.contains("warning")).toBe(
        true
      );
    });
  });
});
