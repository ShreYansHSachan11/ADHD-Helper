/**
 * Comprehensive Error Handler for Focus Productivity Extension
 * Provides centralized error handling, user feedback, and graceful degradation
 */

class ErrorHandler {
  constructor() {
    this.feedbackContainer = null;
    this.activeNotifications = new Map();
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
    this.baseRetryDelay = 1000; // 1 second

    this.init();
  }

  /**
   * Initialize error handler
   */
  init() {
    this.createFeedbackContainer();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Create feedback container for user notifications
   */
  createFeedbackContainer() {
    // Only create in popup context
    if (typeof document !== "undefined") {
      this.feedbackContainer = document.createElement("div");
      this.feedbackContainer.id = "error-feedback-container";
      this.feedbackContainer.className = "error-feedback-container";

      // Add to document when DOM is ready
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          if (document.body) {
            document.body.appendChild(this.feedbackContainer);
          }
        });
      } else {
        if (document.body) {
          document.body.appendChild(this.feedbackContainer);
        }
      }
    }
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        console.error("Unhandled promise rejection:", event.reason);
        this.handleExtensionError(event.reason, "Unhandled Promise");
        event.preventDefault();
      });

      // Handle general errors
      window.addEventListener("error", (event) => {
        console.error("Global error:", event.error);
        this.handleExtensionError(event.error, "Global Error");
      });
    }
  }

  /**
   * Handle API-related errors with specific error types
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @param {Object} options - Error handling options
   * @returns {Object} - Error result object
   */
  handleApiError(error, context, options = {}) {
    const {
      showToUser = true,
      allowRetry = false,
      fallbackMessage = "An error occurred",
      retryHandler = null,
    } = options;

    console.error(`API Error in ${context}:`, error);

    let userMessage = fallbackMessage;
    let errorType = "error";
    let canRetry = allowRetry;

    // Handle specific error types
    switch (error.name) {
      case "AuthenticationError":
        userMessage =
          "Authentication failed. Please check your API credentials.";
        errorType = "warning";
        canRetry = false;
        break;

      case "RateLimitError":
        userMessage = "Rate limit exceeded. Please try again in a few minutes.";
        errorType = "warning";
        canRetry = true;
        break;

      case "NetworkError":
        userMessage =
          "Network connection error. Please check your internet connection.";
        errorType = "warning";
        canRetry = true;
        break;

      case "TimeoutError":
        userMessage = "Request timed out. Please try again.";
        errorType = "warning";
        canRetry = true;
        break;

      case "ServerError":
        userMessage = "Server error. Please try again later.";
        errorType = "warning";
        canRetry = true;
        break;

      case "ValidationError":
        userMessage = error.message || "Invalid input. Please check your data.";
        errorType = "error";
        canRetry = false;
        break;

      case "PermissionError":
        userMessage = "Permission denied. Please check your access rights.";
        errorType = "error";
        canRetry = false;
        break;

      default:
        if (error.message) {
          userMessage = error.message;
        }
        break;
    }

    // Show user feedback if requested
    if (showToUser) {
      const feedbackOptions = {
        context,
        persistent: !canRetry,
        actions: [],
      };

      if (canRetry && retryHandler) {
        feedbackOptions.actions.push({
          label: "Retry",
          handler: retryHandler,
        });
      }

      this.showUserFeedback(userMessage, errorType, feedbackOptions);
    }

    return {
      success: false,
      error: error.message || "Unknown error",
      errorType: error.name || "UnknownError",
      canRetry,
      userMessage,
    };
  }

  /**
   * Handle extension-specific errors
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   */
  handleExtensionError(error, context) {
    console.error(`Extension Error in ${context}:`, error);

    let userMessage = "Extension error occurred";
    let errorType = "error";

    // Handle Chrome extension specific errors
    if (error.message) {
      if (error.message.includes("Extension context invalidated")) {
        userMessage = "Extension was updated. Please refresh the page.";
        errorType = "warning";
      } else if (error.message.includes("permissions")) {
        userMessage = "Missing permissions. Please check extension settings.";
        errorType = "warning";
      } else if (error.message.includes("storage")) {
        userMessage = "Storage error. Extension data may be corrupted.";
        errorType = "error";
      } else {
        userMessage = `Error: ${error.message}`;
      }
    }

    this.showUserFeedback(userMessage, errorType, {
      context,
      persistent: true,
    });
  }

  /**
   * Handle storage-related errors
   * @param {Error} error - The error object
   * @param {string} operation - Storage operation that failed
   */
  handleStorageError(error, operation) {
    console.error(`Storage Error during ${operation}:`, error);

    let userMessage = "Storage operation failed";

    if (error.message) {
      if (error.message.includes("quota")) {
        userMessage =
          "Storage quota exceeded. Please clear some extension data.";
      } else if (error.message.includes("permissions")) {
        userMessage =
          "Storage permission denied. Please check extension permissions.";
      } else {
        userMessage = `Storage error: ${error.message}`;
      }
    }

    this.showUserFeedback(userMessage, "error", {
      context: `Storage ${operation}`,
      persistent: true,
    });
  }

  /**
   * Handle audio-related errors
   * @param {Error} error - The error object
   * @param {string} context - Context where audio error occurred
   * @returns {Object} - Error result object
   */
  handleAudioError(error, context) {
    console.error(`Audio Error in ${context}:`, error);

    let userMessage = "Audio error occurred";
    let errorType = "error";
    let canRetry = true;

    if (error.message) {
      if (
        error.message.includes("blocked by browser") ||
        error.message.includes("NotAllowedError")
      ) {
        userMessage =
          "Audio blocked by browser. Please click to enable audio playback.";
        errorType = "warning";
        canRetry = true;
      } else if (
        error.message.includes("not supported") ||
        error.message.includes("NotSupportedError")
      ) {
        userMessage = "Audio format not supported by your browser.";
        errorType = "error";
        canRetry = false;
      } else if (
        error.message.includes("network") ||
        error.message.includes("MEDIA_ERR_NETWORK")
      ) {
        userMessage =
          "Network error loading audio. Please check your connection.";
        errorType = "warning";
        canRetry = true;
      } else if (
        error.message.includes("decode") ||
        error.message.includes("MEDIA_ERR_DECODE")
      ) {
        userMessage = "Audio file corrupted or invalid format.";
        errorType = "error";
        canRetry = false;
      } else if (error.message.includes("fallback mode")) {
        userMessage =
          "Audio running in limited mode due to browser restrictions.";
        errorType = "warning";
        canRetry = false;
      } else {
        userMessage = `Audio error: ${error.message}`;
      }
    }

    this.showUserFeedback(userMessage, errorType, {
      context,
      persistent: !canRetry,
      actions: canRetry
        ? [
            {
              label: "Try Again",
              handler: () => {
                // This will be handled by the calling component
                console.log("Audio retry requested");
              },
            },
          ]
        : [],
    });

    return {
      success: false,
      error: error.message || "Unknown audio error",
      errorType: error.name || "AudioError",
      canRetry,
      userMessage,
    };
  }

  /**
   * Handle tab access errors (restricted tabs, permissions, etc.)
   * @param {Error} error - The error object
   * @param {string} tabUrl - URL that caused the error
   */
  handleTabAccessError(error, tabUrl) {
    console.warn(`Tab Access Error for ${tabUrl}:`, error);

    let userMessage = "Cannot access this tab";

    if (tabUrl) {
      if (
        tabUrl.startsWith("chrome://") ||
        tabUrl.startsWith("chrome-extension://")
      ) {
        userMessage = "Cannot monitor Chrome internal pages";
      } else if (
        tabUrl.startsWith("moz-extension://") ||
        tabUrl.startsWith("about:")
      ) {
        userMessage = "Cannot monitor browser internal pages";
      } else {
        userMessage = "Tab access restricted for this page";
      }
    }

    // Don't show persistent notifications for tab access errors
    // as they're expected for certain pages
    this.showUserFeedback(userMessage, "info", {
      context: "Tab Access",
      duration: 3000,
    });
  }

  /**
   * Show user feedback with various options
   * @param {string} message - Message to display
   * @param {string} type - Type of feedback ('success', 'error', 'warning', 'info')
   * @param {Object} options - Feedback options
   */
  showUserFeedback(message, type = "info", options = {}) {
    const {
      duration = type === "error" ? 5000 : 3000,
      persistent = false,
      context = "",
      actions = [],
    } = options;

    // Only show in popup context
    if (!this.feedbackContainer) {
      console.log(`User Feedback [${type.toUpperCase()}]: ${message}`);
      return;
    }

    const feedbackId = `feedback-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create feedback element
    const feedbackEl = document.createElement("div");
    feedbackEl.id = feedbackId;
    feedbackEl.className = `feedback-item feedback-${type}`;

    // Create message content
    const messageEl = document.createElement("div");
    messageEl.className = "feedback-message";
    messageEl.textContent = message;
    feedbackEl.appendChild(messageEl);

    // Add context if provided
    if (context) {
      const contextEl = document.createElement("div");
      contextEl.className = "feedback-context";
      contextEl.textContent = context;
      feedbackEl.appendChild(contextEl);
    }

    // Add actions if provided
    if (actions.length > 0) {
      const actionsEl = document.createElement("div");
      actionsEl.className = "feedback-actions";

      actions.forEach((action) => {
        const actionBtn = document.createElement("button");
        actionBtn.className = "feedback-action-btn";
        actionBtn.textContent = action.label;
        actionBtn.onclick = () => {
          if (typeof action.handler === "function") {
            action.handler();
          }
          this.removeFeedback(feedbackId);
        };
        actionsEl.appendChild(actionBtn);
      });

      feedbackEl.appendChild(actionsEl);
    }

    // Add close button for persistent messages
    if (persistent || actions.length > 0) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "feedback-close-btn";
      closeBtn.innerHTML = "×";
      closeBtn.onclick = () => this.removeFeedback(feedbackId);
      feedbackEl.appendChild(closeBtn);
    }

    // Add to container
    this.feedbackContainer.appendChild(feedbackEl);
    this.activeNotifications.set(feedbackId, feedbackEl);

    // Auto-remove if not persistent
    if (!persistent) {
      setTimeout(() => {
        this.removeFeedback(feedbackId);
      }, duration);
    }

    // Limit number of active notifications
    this.limitActiveNotifications();
  }

  /**
   * Remove a specific feedback notification
   * @param {string} feedbackId - ID of feedback to remove
   */
  removeFeedback(feedbackId) {
    const feedbackEl = this.activeNotifications.get(feedbackId);
    if (feedbackEl && feedbackEl.parentNode) {
      feedbackEl.classList.add("feedback-removing");
      setTimeout(() => {
        if (feedbackEl.parentNode) {
          feedbackEl.parentNode.removeChild(feedbackEl);
        }
        this.activeNotifications.delete(feedbackId);
      }, 300); // Allow for fade-out animation
    }
  }

  /**
   * Limit the number of active notifications
   */
  limitActiveNotifications() {
    const maxNotifications = 5;
    if (this.activeNotifications.size > maxNotifications) {
      const oldestId = this.activeNotifications.keys().next().value;
      this.removeFeedback(oldestId);
    }
  }

  /**
   * Clear all feedback notifications
   */
  clearAllFeedback() {
    this.activeNotifications.forEach((_, feedbackId) => {
      this.removeFeedback(feedbackId);
    });
  }

  /**
   * Show loading state for async operations
   * @param {string} message - Loading message
   * @param {string} context - Context for the loading operation
   * @returns {string} - Loading feedback ID
   */
  showLoading(message, context = "") {
    const loadingId = `loading-${Date.now()}`;

    this.showUserFeedback(message, "info", {
      context,
      persistent: true,
    });

    return loadingId;
  }

  /**
   * Hide loading state
   * @param {string} loadingId - ID returned from showLoading
   */
  hideLoading(loadingId) {
    this.removeFeedback(loadingId);
  }

  /**
   * Retry mechanism with exponential backoff
   * @param {Function} operation - Async operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} - Result of the operation
   */
  async withRetry(operation, options = {}) {
    const {
      maxRetries = this.maxRetryAttempts,
      baseDelay = this.baseRetryDelay,
      context = "Operation",
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Show retry feedback
          this.showUserFeedback(
            `Retrying ${context}... (${attempt}/${maxRetries})`,
            "info",
            { duration: 2000 }
          );

          // Wait with exponential backoff
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await this.delay(delay);
        }

        const result = await operation();

        // Show success feedback if this was a retry
        if (attempt > 0) {
          this.showUserFeedback(
            `${context} succeeded after ${attempt} ${
              attempt === 1 ? "retry" : "retries"
            }`,
            "success",
            { duration: 3000 }
          );
        }

        return result;
      } catch (error) {
        lastError = error;
        console.warn(`${context} attempt ${attempt + 1} failed:`, error);

        // Don't retry for certain error types
        if (
          error.name === "AuthenticationError" ||
          error.name === "ValidationError" ||
          error.name === "PermissionError"
        ) {
          break;
        }
      }
    }

    // All retries failed
    this.showUserFeedback(
      `${context} failed after ${maxRetries} ${
        maxRetries === 1 ? "retry" : "retries"
      }`,
      "error",
      {
        context,
        persistent: true,
        actions: [
          {
            label: "Try Again",
            handler: () => this.withRetry(operation, options),
          },
        ],
      }
    );

    throw lastError;
  }

  /**
   * Graceful degradation helper
   * @param {Function} primaryOperation - Primary operation to try
   * @param {Function} fallbackOperation - Fallback operation if primary fails
   * @param {string} context - Context for the operation
   * @returns {Promise} - Result of primary or fallback operation
   */
  async withFallback(
    primaryOperation,
    fallbackOperation,
    context = "Operation"
  ) {
    try {
      return await primaryOperation();
    } catch (error) {
      console.warn(
        `${context} primary operation failed, using fallback:`,
        error
      );

      this.showUserFeedback(
        `${context} using limited functionality`,
        "warning",
        { duration: 4000 }
      );

      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error(`${context} fallback also failed:`, fallbackError);
        this.handleExtensionError(fallbackError, `${context} Fallback`);
        throw fallbackError;
      }
    }
  }

  /**
   * Validate user input with error feedback
   * @param {any} value - Value to validate
   * @param {Object} rules - Validation rules
   * @param {string} fieldName - Name of the field being validated
   * @returns {Object} - Validation result
   */
  validateInput(value, rules, fieldName) {
    const errors = [];

    // Required validation
    if (
      rules.required &&
      (!value || (typeof value === "string" && value.trim().length === 0))
    ) {
      errors.push(`${fieldName} is required`);
    }

    // Type validation
    if (value && rules.type && typeof value !== rules.type) {
      errors.push(`${fieldName} must be a ${rules.type}`);
    }

    // Length validation for strings
    if (typeof value === "string") {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(
          `${fieldName} must be at least ${rules.minLength} characters`
        );
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(
          `${fieldName} must be no more than ${rules.maxLength} characters`
        );
      }
    }

    // Range validation for numbers
    if (typeof value === "number") {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${fieldName} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${fieldName} must be no more than ${rules.max}`);
      }
    }

    // Pattern validation
    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Custom validation
    if (value && rules.custom && typeof rules.custom === "function") {
      const customResult = rules.custom(value);
      if (customResult !== true) {
        errors.push(customResult || `${fieldName} is invalid`);
      }
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.showUserFeedback(errors.join(". "), "error", {
        context: "Input Validation",
        duration: 4000,
      });
    }

    return {
      isValid,
      errors,
      value: isValid ? value : null,
    };
  }

  /**
   * Utility function to create delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics for debugging
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    return {
      activeNotifications: this.activeNotifications.size,
      retryAttempts: Object.fromEntries(this.retryAttempts),
    };
  }

  /**
   * Set loading state for UI elements
   * @param {string} elementId - ID of the element to show loading state
   * @param {boolean} isLoading - Whether to show or hide loading state
   * @param {string} message - Loading message to display
   */
  setLoadingState(elementId, isLoading, message = "Loading...") {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (isLoading) {
      element.classList.add("loading");
      element.setAttribute("data-loading-message", message);

      // Add loading indicator if not present
      if (!element.querySelector(".loading-indicator")) {
        const indicator = document.createElement("div");
        indicator.className = "loading-indicator";
        indicator.innerHTML = `
          <div class="loading-spinner"></div>
          <span class="loading-text">${message}</span>
        `;
        element.appendChild(indicator);
      }
    } else {
      element.classList.remove("loading");
      element.removeAttribute("data-loading-message");

      // Remove loading indicator
      const indicator = element.querySelector(".loading-indicator");
      if (indicator) {
        indicator.remove();
      }
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ErrorHandler;
} else if (typeof window !== "undefined") {
  window.ErrorHandler = ErrorHandler;
  window.errorHandler = errorHandler;
}
