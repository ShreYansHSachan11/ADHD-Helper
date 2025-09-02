/**
 * Google Calendar API Integration Service
 * Handles authentication, reminder calculation, and calendar event creation
 */

class CalendarService {
  constructor() {
    this.apiKey = null;
    this.accessToken = null;
    this.isAuthenticated = false;
    this.baseUrl = "https://www.googleapis.com/calendar/v3";

    // Load stored credentials on initialization
    this.loadStoredCredentials();
  }

  /**
   * Load stored API credentials from Chrome storage
   */
  async loadStoredCredentials() {
    try {
      const result = await chrome.storage.local.get([
        "calendarApiKey",
        "calendarAccessToken",
      ]);
      this.apiKey = result.calendarApiKey || null;
      this.accessToken = result.calendarAccessToken || null;
      this.isAuthenticated = !!(this.apiKey && this.accessToken);
    } catch (error) {
      console.error("Error loading calendar credentials:", error);
      this.isAuthenticated = false;
    }
  }

  /**
   * Store API credentials in Chrome storage
   */
  async storeCredentials(apiKey, accessToken) {
    try {
      await chrome.storage.local.set({
        calendarApiKey: apiKey,
        calendarAccessToken: accessToken,
      });
      this.apiKey = apiKey;
      this.accessToken = accessToken;
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error("Error storing calendar credentials:", error);
      return false;
    }
  }

  /**
   * Calculate reminder times based on task priority and deadline
   * @param {Date} deadline - Task deadline
   * @param {string} priority - Task priority ('high', 'medium', 'low')
   * @returns {Array} Array of reminder times as Date objects
   */
  calculateReminderTimes(deadline, priority) {
    const reminderTimes = [];
    const deadlineTime = new Date(deadline).getTime();

    // Define reminder intervals in milliseconds
    const intervals = {
      week: 7 * 24 * 60 * 60 * 1000, // 1 week
      threeDays: 3 * 24 * 60 * 60 * 1000, // 3 days
      twoDays: 2 * 24 * 60 * 60 * 1000, // 2 days
      oneDay: 24 * 60 * 60 * 1000, // 1 day
      eightHours: 8 * 60 * 60 * 1000, // 8 hours
      fourHours: 4 * 60 * 60 * 1000, // 4 hours
      twoHours: 2 * 60 * 60 * 1000, // 2 hours
    };

    switch (priority.toLowerCase()) {
      case "high":
        // High priority: 4 reminders (1 week, 3 days, 1 day, 2 hours before)
        reminderTimes.push(new Date(deadlineTime - intervals.week));
        reminderTimes.push(new Date(deadlineTime - intervals.threeDays));
        reminderTimes.push(new Date(deadlineTime - intervals.oneDay));
        reminderTimes.push(new Date(deadlineTime - intervals.twoHours));
        break;

      case "medium":
        // Medium priority: 3 reminders (3 days, 1 day, 4 hours before)
        reminderTimes.push(new Date(deadlineTime - intervals.threeDays));
        reminderTimes.push(new Date(deadlineTime - intervals.oneDay));
        reminderTimes.push(new Date(deadlineTime - intervals.fourHours));
        break;

      case "low":
      default:
        // Low priority: 3 reminders (1 week, 2 days, 8 hours before)
        reminderTimes.push(new Date(deadlineTime - intervals.week));
        reminderTimes.push(new Date(deadlineTime - intervals.twoDays));
        reminderTimes.push(new Date(deadlineTime - intervals.eightHours));
        break;
    }

    // Filter out past reminder times
    const now = new Date();
    return reminderTimes.filter((time) => time > now);
  }

  /**
   * Create a calendar event
   * @param {Object} eventData - Event data object
   * @returns {Promise} Promise resolving to event creation result
   */
  async createCalendarEvent(eventData) {
    if (!this.isAuthenticated) {
      throw new Error(
        "Calendar API not authenticated. Please configure API access."
      );
    }

    const event = {
      summary: eventData.summary,
      description: eventData.description || "",
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(
          eventData.startTime.getTime() + 15 * 60 * 1000
        ).toISOString(), // 15 min duration
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 10 },
          { method: "email", minutes: 60 },
        ],
      },
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/primary/events?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Calendar API error: ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw error;
    }
  }

  /**
   * Create task reminders in Google Calendar
   * @param {string} taskName - Name of the task
   * @param {Date} deadline - Task deadline
   * @param {string} priority - Task priority ('high', 'medium', 'low')
   * @returns {Promise} Promise resolving to array of created events
   */
  async createTaskReminders(taskName, deadline, priority) {
    try {
      if (!this.isAuthenticated) {
        throw new Error(
          "Calendar API not configured. Please set up API access in settings."
        );
      }

      const reminderTimes = this.calculateReminderTimes(deadline, priority);

      if (reminderTimes.length === 0) {
        throw new Error(
          "All reminder times are in the past. Please check the task deadline."
        );
      }

      const createdEvents = [];
      const priorityLabels = {
        high: "High Priority",
        medium: "Medium Priority",
        low: "Low Priority",
      };

      for (let i = 0; i < reminderTimes.length; i++) {
        const reminderTime = reminderTimes[i];
        const timeUntilDeadline = this.getTimeUntilDeadline(
          reminderTime,
          deadline
        );

        const eventData = {
          summary: `Task Reminder: ${taskName}`,
          description: `${
            priorityLabels[priority.toLowerCase()] || "Priority"
          } task reminder\n\nTask: ${taskName}\nDeadline: ${deadline.toLocaleString()}\nTime until deadline: ${timeUntilDeadline}`,
          startTime: reminderTime,
        };

        try {
          const event = await this.createCalendarEvent(eventData);
          createdEvents.push(event);
        } catch (eventError) {
          console.error(`Error creating reminder ${i + 1}:`, eventError);
          // Continue with other reminders even if one fails
        }
      }

      if (createdEvents.length === 0) {
        throw new Error(
          "Failed to create any calendar reminders. Please check your calendar API configuration."
        );
      }

      return {
        success: true,
        createdCount: createdEvents.length,
        totalRequested: reminderTimes.length,
        events: createdEvents,
      };
    } catch (error) {
      console.error("Error creating task reminders:", error);
      throw error;
    }
  }

  /**
   * Get human-readable time until deadline
   * @param {Date} fromTime - Starting time
   * @param {Date} deadline - Deadline time
   * @returns {string} Human-readable time difference
   */
  getTimeUntilDeadline(fromTime, deadline) {
    const timeDiff = deadline.getTime() - fromTime.getTime();
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""} and ${hours} hour${
        hours !== 1 ? "s" : ""
      }`;
    } else {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
  }

  /**
   * Test calendar API connection
   * @returns {Promise} Promise resolving to connection test result
   */
  async testConnection() {
    try {
      if (!this.isAuthenticated) {
        return {
          success: false,
          error: "API credentials not configured",
        };
      }

      const response = await fetch(
        `${this.baseUrl}/calendars/primary?key=${this.apiKey}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const calendarData = await response.json();
        return {
          success: true,
          calendarName: calendarData.summary || "Primary Calendar",
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error?.message || "Authentication failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear stored credentials
   */
  async clearCredentials() {
    try {
      await chrome.storage.local.remove([
        "calendarApiKey",
        "calendarAccessToken",
      ]);
      this.apiKey = null;
      this.accessToken = null;
      this.isAuthenticated = false;
      return true;
    } catch (error) {
      console.error("Error clearing calendar credentials:", error);
      return false;
    }
  }

  /**
   * Get setup instructions for calendar API
   * @returns {Object} Setup instructions object
   */
  getSetupInstructions() {
    return {
      title: "Google Calendar API Setup",
      steps: [
        "1. Go to Google Cloud Console (console.cloud.google.com)",
        "2. Create a new project or select existing project",
        "3. Enable the Google Calendar API",
        "4. Create credentials (API Key and OAuth 2.0)",
        "5. Configure OAuth consent screen",
        "6. Add your API key and access token in extension settings",
      ],
      links: {
        console: "https://console.cloud.google.com",
        documentation:
          "https://developers.google.com/calendar/api/quickstart/js",
      },
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CalendarService;
} else if (typeof window !== "undefined") {
  window.CalendarService = CalendarService;
}
