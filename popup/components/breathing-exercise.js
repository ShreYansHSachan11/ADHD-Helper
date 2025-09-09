// Breathing Exercise Component
// Provides guided breathing exercises with animated circle and customizable timing

class BreathingExercise {
  constructor(options = {}) {
    // Default breathing pattern (4-7-8 technique)
    this.defaultDurations = {
      inhale: 4000, // 4 seconds
      holdIn: 7000, // 7 seconds
      exhale: 8000, // 8 seconds
      holdOut: 1000, // 1 second pause
    };

    // Customizable durations
    this.durations = { ...this.defaultDurations, ...options.durations };

    // Breathing phases
    this.phases = ["inhale", "holdIn", "exhale", "holdOut"];
    this.phaseTexts = {
      inhale: "Breathe in...",
      holdIn: "Hold...",
      exhale: "Breathe out...",
      holdOut: "Pause...",
    };

    // State management
    this.currentPhase = 0;
    this.isActive = false;
    this.sessionStartTime = null;
    this.completedCycles = 0;
    this.animationId = null;
    this.phaseTimeout = null;

    // DOM elements
    this.circleElement = null;
    this.textElement = null;
    this.startButton = null;
    this.stopButton = null;

    // Session tracking
    this.sessionData = {
      totalTime: 0,
      cyclesCompleted: 0,
      startTime: null,
      endTime: null,
    };

    this.init();
  }

  init() {
    this.bindElements();
    this.loadCustomDurations();
    this.setupEventListeners();
  }

  bindElements() {
    this.circleElement = document.getElementById("breathingCircle");
    this.textElement = document.getElementById("breathingText");
    this.startButton = document.getElementById("startBreathingBtn");
    this.stopButton = document.getElementById("stopBreathingBtn");

    if (!this.circleElement || !this.textElement) {
      console.error("Breathing exercise elements not found");
      return;
    }
  }

  setupEventListeners() {
    if (this.startButton) {
      this.startButton.addEventListener("click", () => this.startExercise());
    }

    if (this.stopButton) {
      this.stopButton.addEventListener("click", () => this.stopExercise());
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isActive) {
        this.stopExercise();
      }
    });
  }

  async loadCustomDurations() {
    try {
      const result = await chrome.storage.local.get("breathingSettings");
      const settings = result.breathingSettings || {};

      if (settings.customDurations) {
        this.durations = {
          ...this.defaultDurations,
          ...settings.customDurations,
        };
      }
    } catch (error) {
      console.error("Failed to load breathing settings:", error);
    }
  }

  async saveCustomDurations() {
    try {
      const settings = {
        customDurations: this.durations,
      };
      await chrome.storage.local.set({ breathingSettings: settings });
    } catch (error) {
      console.error("Failed to save breathing settings:", error);
    }
  }

  startExercise() {
    if (this.isActive) return;

    this.isActive = true;
    this.sessionStartTime = Date.now();
    this.sessionData.startTime = this.sessionStartTime;
    this.completedCycles = 0;
    this.currentPhase = 0;

    // Update UI
    this.updateButtonStates();
    if (this.textElement) {
      this.textElement.textContent = "Get ready...";
    }

    // Start the breathing cycle after a brief delay
    setTimeout(() => {
      if (this.isActive) {
        this.runPhase();
      }
    }, 1000);

    // Track session start
    this.trackEvent("breathing_session_started");
  }

  stopExercise() {
    if (!this.isActive) return;

    this.isActive = false;

    // Clear any running timeouts or animations
    if (this.phaseTimeout) {
      clearTimeout(this.phaseTimeout);
      this.phaseTimeout = null;
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Calculate session data
    const sessionEndTime = Date.now();
    this.sessionData.endTime = sessionEndTime;
    this.sessionData.totalTime = sessionEndTime - this.sessionStartTime;
    this.sessionData.cyclesCompleted = this.completedCycles;

    // Reset visual state
    this.resetCircleAnimation();
    this.showCompletionFeedback();
    this.updateButtonStates();

    // Save session data
    this.saveSessionData();

    // Track session completion
    this.trackEvent("breathing_session_completed", {
      duration: this.sessionData.totalTime,
      cycles: this.sessionData.cyclesCompleted,
    });
  }

  runPhase() {
    if (!this.isActive) return;

    const phase = this.phases[this.currentPhase];
    const duration = this.durations[phase];

    // Update text and styling
    if (this.textElement) {
      this.textElement.textContent = this.phaseTexts[phase];

      // Remove existing phase classes (check if classList exists)
      if (this.textElement.classList) {
        this.textElement.classList.remove(
          "inhale-text",
          "exhale-text",
          "hold-text"
        );

        // Add appropriate phase class
        switch (phase) {
          case "inhale":
            this.textElement.classList.add("inhale-text");
            break;
          case "exhale":
            this.textElement.classList.add("exhale-text");
            break;
          case "holdIn":
          case "holdOut":
            this.textElement.classList.add("hold-text");
            break;
        }
      }
    }

    // Start animation
    this.animateCircle(phase, duration);

    // Schedule next phase
    this.phaseTimeout = setTimeout(() => {
      if (!this.isActive) return;

      this.currentPhase = (this.currentPhase + 1) % this.phases.length;

      // If we completed a full cycle (back to inhale)
      if (this.currentPhase === 0) {
        this.completedCycles++;
      }

      this.runPhase();
    }, duration);
  }

  animateCircle(phase, duration) {
    if (!this.circleElement) return;

    // Set CSS transition duration first
    if (this.circleElement.style) {
      this.circleElement.style.transitionDuration = `${duration}ms`;
    }

    // Remove existing animation classes
    this.circleElement.classList.remove("inhale", "exhale", "hold");

    // Force a reflow to ensure the class removal is processed
    this.circleElement.offsetHeight;

    // Apply appropriate animation class after a small delay to ensure smooth transition
    requestAnimationFrame(() => {
      switch (phase) {
        case "inhale":
          this.circleElement.classList.add("inhale");
          break;
        case "exhale":
          this.circleElement.classList.add("exhale");
          break;
        case "holdIn":
        case "holdOut":
          this.circleElement.classList.add("hold");
          break;
      }
    });
  }

  resetCircleAnimation() {
    if (!this.circleElement) return;

    // Remove all animation classes
    this.circleElement.classList.remove("inhale", "exhale", "hold");

    // Reset transition duration to default
    this.circleElement.style.transitionDuration = "";

    // Force a reflow to ensure changes are applied
    this.circleElement.offsetHeight;

    // Reset text styling
    if (this.textElement && this.textElement.classList) {
      this.textElement.classList.remove(
        "inhale-text",
        "exhale-text",
        "hold-text"
      );
    }
  }

  showCompletionFeedback() {
    if (!this.textElement) return;

    const cycles = this.completedCycles;
    const minutes = Math.floor(this.sessionData.totalTime / 60000);
    const seconds = Math.floor((this.sessionData.totalTime % 60000) / 1000);

    let message = "Session complete!";
    if (cycles > 0) {
      message = `Great job! ${cycles} cycle${cycles > 1 ? "s" : ""} completed`;
      if (minutes > 0 || seconds > 0) {
        message += ` in ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
      }
    }

    this.textElement.textContent = message;

    // Show completion animation
    if (this.circleElement) {
      this.circleElement.style.animation = "breathing-complete 1s ease-in-out";
      setTimeout(() => {
        if (this.circleElement) {
          this.circleElement.style.animation = "";
        }
      }, 1000);
    }
  }

  updateButtonStates() {
    if (this.startButton && this.stopButton) {
      if (this.isActive) {
        this.startButton.style.display = "none";
        this.stopButton.style.display = "inline-flex";
      } else {
        this.startButton.style.display = "inline-flex";
        this.stopButton.style.display = "none";
      }
    }
  }

  async saveSessionData() {
    try {
      // Get existing session history
      const result = await chrome.storage.local.get("breathingSessions");
      const sessions = result.breathingSessions || [];

      // Add current session
      sessions.push({
        ...this.sessionData,
        timestamp: Date.now(),
      });

      // Keep only last 50 sessions
      const recentSessions = sessions.slice(-50);

      await chrome.storage.local.set({ breathingSessions: recentSessions });
    } catch (error) {
      console.error("Failed to save breathing session data:", error);
    }
  }

  trackEvent(eventName, data = {}) {
    try {
      // Send analytics event to background script
      const message = chrome.runtime.sendMessage({
        type: "TRACK_WELLNESS_EVENT",
        event: eventName,
        data: {
          ...data,
          timestamp: Date.now(),
          component: "breathing_exercise",
        },
      });

      // Handle promise rejection silently
      if (message && typeof message.catch === "function") {
        message.catch((error) => {
          console.error("Failed to track breathing exercise event:", error);
        });
      }
    } catch (error) {
      console.error("Failed to track breathing exercise event:", error);
    }
  }

  // Customization methods
  setDuration(phase, milliseconds) {
    if (this.phases.includes(phase) && milliseconds > 0) {
      this.durations[phase] = milliseconds;
      this.saveCustomDurations();
    }
  }

  getDuration(phase) {
    return (
      this.durations[phase] ||
      this.defaultDurations[phase] ||
      this.defaultDurations.inhale
    );
  }

  resetToDefaults() {
    this.durations = { ...this.defaultDurations };
    this.saveCustomDurations();
  }

  // Preset breathing patterns
  setPattern(patternName) {
    const patterns = {
      "4-7-8": { inhale: 4000, holdIn: 7000, exhale: 8000, holdOut: 1000 },
      "4-4-4-4": { inhale: 4000, holdIn: 4000, exhale: 4000, holdOut: 4000 },
      "6-2-6-2": { inhale: 6000, holdIn: 2000, exhale: 6000, holdOut: 2000 },
      triangle: { inhale: 4000, holdIn: 4000, exhale: 4000, holdOut: 0 },
      coherent: { inhale: 5000, holdIn: 0, exhale: 5000, holdOut: 0 },
      quick: { inhale: 3000, holdIn: 1000, exhale: 3000, holdOut: 500 },
      deep: { inhale: 6000, holdIn: 4000, exhale: 8000, holdOut: 2000 },
      "stress-relief": {
        inhale: 4000,
        holdIn: 2000,
        exhale: 6000,
        holdOut: 1000,
      },
    };

    if (patterns[patternName]) {
      this.durations = { ...patterns[patternName] };
      this.saveCustomDurations();
    }
  }

  // Get session statistics
  async getSessionStats() {
    try {
      const result = await chrome.storage.local.get("breathingSessions");
      const sessions = result.breathingSessions || [];

      const totalSessions = sessions.length;
      const totalTime = sessions.reduce(
        (sum, session) => sum + (session.totalTime || 0),
        0
      );
      const totalCycles = sessions.reduce(
        (sum, session) => sum + (session.cyclesCompleted || 0),
        0
      );
      const averageSessionTime =
        totalSessions > 0 ? totalTime / totalSessions : 0;

      return {
        totalSessions,
        totalTime,
        totalCycles,
        averageSessionTime,
        recentSessions: sessions.slice(-10),
      };
    } catch (error) {
      console.error("Failed to get session stats:", error);
      return {
        totalSessions: 0,
        totalTime: 0,
        totalCycles: 0,
        averageSessionTime: 0,
        recentSessions: [],
      };
    }
  }

  // Cleanup method
  destroy() {
    this.stopExercise();

    // Remove event listeners if they exist
    if (this.startButton && this.startButton.removeEventListener) {
      this.startButton.removeEventListener("click", this.startExercise);
    }
    if (this.stopButton && this.stopButton.removeEventListener) {
      this.stopButton.removeEventListener("click", this.stopExercise);
    }
  }
}

// Export for use in popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreathingExercise;
}
