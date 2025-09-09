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
      // Initialize error handler if available
      if (typeof errorHandler !== 'undefined') {
        this.errorHandler = errorHandler;
      }

      const result = await chrome.storage.local.get([
        "calendarApiKey",
        "calendarAccessToken",
      ]);
      this.apiKey = result.calendarApiKey || null;
      this.accessToken = result.calendarAccessToken || null;
      this.isAuthenticated = !!(this.apiKey && this.accessToken);
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handleStorageError(error, 'loadCredentials');
      } else {
        console.error("Error loading calendar credentials:", error);
      }
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
      const error = new Error("Calendar API not authenticated. Please configure API access.");
      error.name = 'AuthenticationError';
      throw error;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `${this.baseUrl}/calendars/primary/events?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } catch (parseError) {
          // Use default error message if parsing fails
        }

        // Create specific error types
        if (response.status === 401) {
          const error = new Error('Calendar API authentication failed. Please reconfigure your credentials.');
          error.name = 'AuthenticationError';
          error.status = 401;
          throw error;
        } else if (response.status === 403) {
          const error = new Error('Calendar API access denied. Please check your permissions.');
          error.name = 'PermissionError';
          error.status = 403;
          throw error;
        } else if (response.status === 429) {
          const error = new Error('Calendar API rate limit exceeded. Please try again later.');
          error.name = 'RateLimitError';
          error.status = 429;
          throw error;
        } else if (response.status >= 500) {
          const error = new Error('Calendar API server error. Please try again later.');
          error.name = 'ServerError';
          error.status = response.status;
          throw error;
        }

        const error = new Error(`Calendar API error: ${errorMessage}`);
        error.status = response.status;
        throw error;
      }

      const result = await response.json();
      
      // Validate response
      if (!result || !result.id) {
        throw new Error('Invalid response from Calendar API');
      }

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Calendar API request timed out. Please try again.');
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      // Network errors
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        const networkError = new Error('Network error. Please check your internet connection.');
        networkError.name = 'NetworkError';
        throw networkError;
      }

      // Re-throw with preserved error information
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
      // Validate inputs
      if (!taskName || typeof taskName !== 'string' || taskName.trim().length === 0) {
        const error = new Error('Task name is required');
        if (this.errorHandler) {
          return this.errorHandler.handleApiError(error, 'Calendar Reminders', {
            showToUser: true,
            allowRetry: false,
            fallbackMessage: 'Please enter a task name'
          });
        }
        throw error;
      }

      if (!deadline || !(deadline instanceof Date) || isNaN(deadline.getTime())) {
        const error = new Error('Valid deadline is required');
        if (this.errorHandler) {
          return this.errorHandler.handleApiError(error, 'Calendar Reminders', {
            showToUser: true,
            allowRetry: false,
            fallbackMessage: 'Please enter a valid deadline'
          });
        }
        throw error;
      }

      if (!this.isAuthenticated) {
        const error = new Error('Calendar API not configured. Please set up API access in settings.');
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(
            'Calendar API not configured. Please set up your Google Calendar integration.',
            'warning',
            {
              context: 'Calendar Reminders',
              persistent: true,
              actions: [{
                label: 'Setup Calendar',
                handler: () => {
                  // Open calendar configuration
                  console.log('Open calendar configuration');
                }
              }]
            }
          );
          
          return {
            success: false,
            error: 'Calendar API not configured',
            needsSetup: true,
            fallbackReminders: this.generateFallbackReminders(taskName, deadline, priority)
          };
        }
        throw error;
      }

      const reminderTimes = this.calculateReminderTimes(deadline, priority);

      if (reminderTimes.length === 0) {
        const error = new Error('All reminder times are in the past. Please check the task deadline.');
        if (this.errorHandler) {
          return this.errorHandler.handleApiError(error, 'Calendar Reminders', {
            showToUser: true,
            allowRetry: false,
            fallbackMessage: 'Deadline is too close. Please choose a future deadline.'
          });
        }
        throw error;
      }

      const createdEvents = [];
      const failedEvents = [];
      const priorityLabels = {
        high: "High Priority",
        medium: "Medium Priority",
        low: "Low Priority",
      };

      // Show progress feedback
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          `Creating ${reminderTimes.length} calendar reminders...`,
          'info',
          { duration: 2000 }
        );
      }

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
          failedEvents.push({ index: i + 1, error: eventError.message });
          
          // Don't show individual error for each failed event to avoid spam
          // Will show summary at the end
        }
      }

      if (createdEvents.length === 0) {
        const error = new Error('Failed to create any calendar reminders. Please check your calendar API configuration.');
        if (this.errorHandler) {
          const result = this.errorHandler.handleApiError(error, 'Calendar Reminders', {
            showToUser: true,
            allowRetry: true,
            fallbackMessage: 'Failed to create calendar reminders'
          });
          
          result.fallbackReminders = this.generateFallbackReminders(taskName, deadline, priority);
          return result;
        }
        throw error;
      }

      // Show success/partial success feedback
      if (this.errorHandler) {
        if (failedEvents.length === 0) {
          this.errorHandler.showUserFeedback(
            `Successfully created ${createdEvents.length} calendar reminders!`,
            'success',
            { duration: 3000 }
          );
        } else {
          this.errorHandler.showUserFeedback(
            `Created ${createdEvents.length} of ${reminderTimes.length} reminders. ${failedEvents.length} failed.`,
            'warning',
            { duration: 4000 }
          );
        }
      }

      return {
        success: true,
        createdCount: createdEvents.length,
        totalRequested: reminderTimes.length,
        failedCount: failedEvents.length,
        events: createdEvents,
        failures: failedEvents
      };
    } catch (error) {
      if (this.errorHandler) {
        const result = this.errorHandler.handleApiError(error, 'Calendar Reminders', {
          showToUser: true,
          allowRetry: true,
          fallbackMessage: 'Failed to create calendar reminders'
        });
        
        result.fallbackReminders = this.generateFallbackReminders(taskName, deadline, priority);
        return result;
      } else {
        console.error("Error creating task reminders:", error);
        throw error;
      }
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
   * Generate fallback reminders when API is not available
   * @param {string} taskName - Name of the task
   * @param {Date} deadline - Task deadline
   * @param {string} priority - Task priority
   * @returns {Object} Fallback reminders object
   */
  generateFallbackReminders(taskName, deadline, priority) {
    const reminderTimes = this.calculateReminderTimes(deadline, priority);
    
    const fallbackReminders = reminderTimes.map((time, index) => {
      const timeUntilDeadline = this.getTimeUntilDeadline(time, deadline);
      return {
        time: time.toLocaleString(),
        message: `Reminder ${index + 1}: ${taskName}`,
        description: `Task: ${taskName}\nDeadline: ${deadline.toLocaleString()}\nTime until deadline: ${timeUntilDeadline}`,
        priority: priority
      };
    });

    return {
      taskName,
      deadline: deadline.toLocaleString(),
      priority,
      reminders: fallbackReminders,
      instructions: [
        "Calendar integration is not available. Please manually create these reminders:",
        "1. Open your calendar application",
        "2. Create events for each reminder time listed below",
        "3. Set appropriate notifications for each event"
      ]
    };
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
