// // Breathing Exercise Component
// // Provides guided breathing exercises with animated circle and customizable timing

// class BreathingExercise {
//   constructor(options = {}) {
//     // Default breathing pattern (4-7-8 technique)
//     this.defaultDurations = {
//       inhale: 4000, // 4 seconds
//       holdIn: 7000, // 7 seconds
//       exhale: 8000, // 8 seconds
//       holdOut: 1000, // 1 second pause
//     };

//     // Customizable durations
//     this.durations = { ...this.defaultDurations, ...options.durations };

//     // Breathing phases
//     this.phases = ["inhale", "holdIn", "exhale", "holdOut"];
//     this.phaseTexts = {
//       inhale: "Breathe in...",
//       holdIn: "Hold...",
//       exhale: "Breathe out...",
//       holdOut: "Pause...",
//     };

//     // State management
//     this.currentPhase = 0;
//     this.isActive = false;
//     this.sessionStartTime = null;
//     this.completedCycles = 0;
//     this.animationId = null;
//     this.phaseTimeout = null;

//     // DOM elements
//     this.circleElement = null;
//     this.textElement = null;
//     this.startButton = null;
//     this.stopButton = null;

//     // Session tracking
//     this.sessionData = {
//       totalTime: 0,
//       cyclesCompleted: 0,
//       startTime: null,
//       endTime: null,
//     };

//     this.init();
//   }

//   init() {
//     this.bindElements();
//     this.loadCustomDurations();
//     this.setupEventListeners();
//   }

//   bindElements() {
//     this.circleElement = document.getElementById("breathingCircle");
//     this.textElement = document.getElementById("breathingText");
//     this.startButton = document.getElementById("startBreathingBtn");
//     this.stopButton = document.getElementById("stopBreathingBtn");

//     console.log("Binding breathing exercise elements:");
//     console.log("Circle element:", this.circleElement);
//     console.log("Text element:", this.textElement);
//     console.log("Start button:", this.startButton);
//     console.log("Stop button:", this.stopButton);

//     if (!this.circleElement || !this.textElement) {
//       console.error("Breathing exercise elements not found");
//       console.error("Available elements with 'breathing' in ID:");
//       const allElements = document.querySelectorAll('[id*="breathing"]');
//       allElements.forEach((el) => console.log(`- ${el.id}:`, el));
//       return;
//     }

//     // Test if CSS animations work on this element
//     this.testAnimationSupport();

//     // Apply Chrome animation fix immediately
//     this.applyChromeAnimationFix();
//   }

//   testAnimationSupport() {
//     if (!this.circleElement) return;

//     console.log("Testing animation support...");

//     // Test CSS support
//     const supportsAnimation = CSS.supports("animation", "test 1s");
//     const supportsTransform = CSS.supports("transform", "scale(1.5)");
//     const supportsTransition = CSS.supports("transition", "transform 1s");

//     console.log("CSS Animation support:", supportsAnimation);
//     console.log("CSS Transform support:", supportsTransform);
//     console.log("CSS Transition support:", supportsTransition);

//     // Test a simple animation
//     const originalTransform = this.circleElement.style.transform;
//     this.circleElement.style.transition = "transform 0.5s ease";
//     this.circleElement.style.transform = "scale(1.1)";

//     setTimeout(() => {
//       this.circleElement.style.transform = originalTransform;
//       this.circleElement.style.transition = "";
//       console.log("Animation test completed");
//     }, 600);
//   }

//   applyChromeAnimationFix() {
//     if (!this.circleElement) return;

//     console.log("Applying Chrome animation fix...");

//     // Make element appear interactive to prevent Chrome from pausing animations
//     this.circleElement.style.pointerEvents = "auto";
//     this.circleElement.style.cursor = "pointer";
//     this.circleElement.style.userSelect = "none";

//     // Force hardware acceleration
//     this.circleElement.style.willChange = "transform, box-shadow";
//     this.circleElement.style.backfaceVisibility = "hidden";
//     this.circleElement.style.transform = "translateZ(0)";

//     // Force a reflow to ensure styles are applied
//     this.circleElement.offsetHeight;

//     console.log("Chrome animation fix applied");
//   }

//   setupEventListeners() {
//     if (this.startButton) {
//       this.startButton.addEventListener("click", () => this.startExercise());
//     }

//     if (this.stopButton) {
//       this.stopButton.addEventListener("click", () => this.stopExercise());
//     }

//     // Keyboard shortcuts
//     document.addEventListener("keydown", (e) => {
//       if (e.key === "Escape" && this.isActive) {
//         this.stopExercise();
//       }
//     });
//   }

//   async loadCustomDurations() {
//     try {
//       const result = await chrome.storage.local.get("breathingSettings");
//       const settings = result.breathingSettings || {};

//       if (settings.customDurations) {
//         this.durations = {
//           ...this.defaultDurations,
//           ...settings.customDurations,
//         };
//       }
//     } catch (error) {
//       console.error("Failed to load breathing settings:", error);
//     }
//   }

//   async saveCustomDurations() {
//     try {
//       const settings = {
//         customDurations: this.durations,
//       };
//       await chrome.storage.local.set({ breathingSettings: settings });
//     } catch (error) {
//       console.error("Failed to save breathing settings:", error);
//     }
//   }

//   startExercise() {
//     if (this.isActive) return;

//     this.isActive = true;
//     this.sessionStartTime = Date.now();
//     this.sessionData.startTime = this.sessionStartTime;
//     this.completedCycles = 0;
//     this.currentPhase = 0;

//     // Update UI
//     this.updateButtonStates();
//     if (this.textElement) {
//       this.textElement.textContent = "Get ready...";
//     }

//     // CRITICAL FIX: Force Chrome to recognize element as interactive and enable animations
//     if (this.circleElement) {
//       // Make element appear interactive to prevent Chrome from pausing animations
//       this.circleElement.style.pointerEvents = "auto";
//       this.circleElement.style.cursor = "pointer";
//       this.circleElement.style.userSelect = "none";

//       // Force hardware acceleration
//       this.circleElement.style.transform = "translateZ(0)";
//       this.circleElement.style.willChange = "transform, box-shadow";
//       this.circleElement.style.backfaceVisibility = "hidden";

//       // Trigger a tiny movement to "wake up" the animation engine
//       this.circleElement.style.transform = "translateZ(0) scale(1.001)";
//       this.circleElement.offsetHeight; // Force reflow
//       this.circleElement.style.transform = "translateZ(0)";

//       // Ensure the element is visible and ready for animation
//       this.circleElement.style.visibility = "visible";
//       this.circleElement.style.display = "flex";

//       console.log("Applied Chrome animation fix");
//     }

//     // Start the breathing cycle after a brief delay
//     setTimeout(() => {
//       if (this.isActive) {
//         this.runPhase();
//       }
//     }, 1000);

//     // Track session start
//     this.trackEvent("breathing_session_started");
//   }

//   stopExercise() {
//     if (!this.isActive) return;

//     this.isActive = false;

//     // Clear any running timeouts or animations
//     if (this.phaseTimeout) {
//       clearTimeout(this.phaseTimeout);
//       this.phaseTimeout = null;
//     }

//     if (this.animationId) {
//       cancelAnimationFrame(this.animationId);
//       this.animationId = null;
//     }

//     // Calculate session data
//     const sessionEndTime = Date.now();
//     this.sessionData.endTime = sessionEndTime;
//     this.sessionData.totalTime = sessionEndTime - this.sessionStartTime;
//     this.sessionData.cyclesCompleted = this.completedCycles;

//     // Reset visual state
//     this.resetCircleAnimation();
//     this.showCompletionFeedback();
//     this.updateButtonStates();

//     // Save session data
//     this.saveSessionData();

//     // Track session completion
//     this.trackEvent("breathing_session_completed", {
//       duration: this.sessionData.totalTime,
//       cycles: this.sessionData.cyclesCompleted,
//     });
//   }

//   runPhase() {
//     if (!this.isActive) return;

//     const phase = this.phases[this.currentPhase];
//     const duration = this.durations[phase];

//     // Update text and styling
//     if (this.textElement) {
//       this.textElement.textContent = this.phaseTexts[phase];

//       // Remove existing phase classes (check if classList exists)
//       if (this.textElement.classList) {
//         this.textElement.classList.remove(
//           "inhale-text",
//           "exhale-text",
//           "hold-text"
//         );

//         // Add appropriate phase class
//         switch (phase) {
//           case "inhale":
//             this.textElement.classList.add("inhale-text");
//             break;
//           case "exhale":
//             this.textElement.classList.add("exhale-text");
//             break;
//           case "holdIn":
//           case "holdOut":
//             this.textElement.classList.add("hold-text");
//             break;
//         }
//       }
//     }

//     // Start animation
//     this.animateCircle(phase, duration);

//     // Schedule next phase
//     this.phaseTimeout = setTimeout(() => {
//       if (!this.isActive) return;

//       this.currentPhase = (this.currentPhase + 1) % this.phases.length;

//       // If we completed a full cycle (back to inhale)
//       if (this.currentPhase === 0) {
//         this.completedCycles++;
//       }

//       this.runPhase();
//     }, duration);
//   }

//   animateCircle(phase, duration) {
//     if (!this.circleElement) {
//       console.error("Breathing circle element not found");
//       return;
//     }

//     console.log(
//       `Animating circle for phase: ${phase}, duration: ${duration}ms`
//     );

//     // Remove all existing animation classes and styles
//     this.circleElement.classList.remove(
//       "inhale",
//       "exhale",
//       "hold",
//       "inhale-animation",
//       "exhale-animation",
//       "hold-animation",
//       "animate-inhale-4s",
//       "animate-inhale-7s",
//       "animate-exhale-4s",
//       "animate-exhale-8s",
//       "animate-hold-1s",
//       "animate-hold-4s",
//       "animate-hold-7s"
//     );
//     this.circleElement.style.animation = "";
//     this.circleElement.style.transitionDuration = "";

//     // Force a reflow to ensure the class removal is processed
//     this.circleElement.offsetHeight;

//     // Apply appropriate animation using CSS keyframes
//     requestAnimationFrame(() => {
//       console.log(`Adding animation for phase: ${phase}`);

//       const animationDuration = `${duration}ms`;

//       // Force browser to recognize the element and prepare for animation
//       this.circleElement.style.display = "flex";
//       this.circleElement.style.visibility = "visible";

//       // Force a style recalculation
//       const computedStyle = window.getComputedStyle(this.circleElement);
//       const currentTransform = computedStyle.transform;
//       console.log(
//         "Current computed transform before animation:",
//         currentTransform
//       );

//       // Use CSS classes for predefined durations, fallback to inline styles for custom durations
//       const durationSeconds = Math.round(duration / 1000);

//       switch (phase) {
//         case "inhale":
//           if (durationSeconds === 4) {
//             this.circleElement.classList.add("animate-inhale-4s");
//           } else if (durationSeconds === 7) {
//             this.circleElement.classList.add("animate-inhale-7s");
//           } else {
//             this.circleElement.style.animation = `breatheIn ${animationDuration} cubic-bezier(0.4, 0, 0.6, 1) forwards`;
//           }
//           this.circleElement.classList.add("inhale");
//           break;
//         case "exhale":
//           if (durationSeconds === 4) {
//             this.circleElement.classList.add("animate-exhale-4s");
//           } else if (durationSeconds === 8) {
//             this.circleElement.classList.add("animate-exhale-8s");
//           } else {
//             this.circleElement.style.animation = `breatheOut ${animationDuration} cubic-bezier(0.4, 0, 0.6, 1) forwards`;
//           }
//           this.circleElement.classList.add("exhale");
//           break;
//         case "holdIn":
//         case "holdOut":
//           if (durationSeconds === 1) {
//             this.circleElement.classList.add("animate-hold-1s");
//           } else if (durationSeconds === 4) {
//             this.circleElement.classList.add("animate-hold-4s");
//           } else if (durationSeconds === 7) {
//             this.circleElement.classList.add("animate-hold-7s");
//           } else {
//             this.circleElement.style.animation = `breatheHold ${animationDuration} cubic-bezier(0.4, 0, 0.6, 1) forwards`;
//           }
//           this.circleElement.classList.add("hold");
//           break;
//       }

//       // Force another reflow to ensure animation starts
//       this.circleElement.offsetHeight;

//       // Log current state for debugging
//       console.log("Current circle classes:", this.circleElement.className);
//       console.log(
//         "Current animation style:",
//         this.circleElement.style.animation
//       );

//       // Verify animation is actually running
//       setTimeout(() => {
//         const animationState = window.getComputedStyle(
//           this.circleElement
//         ).animationPlayState;
//         console.log("Animation play state:", animationState);
//       }, 100);
//     });
//   }

//   resetCircleAnimation() {
//     if (!this.circleElement) return;

//     // Remove all animation classes
//     this.circleElement.classList.remove(
//       "inhale",
//       "exhale",
//       "hold",
//       "inhale-animation",
//       "exhale-animation",
//       "hold-animation",
//       "animate-inhale-4s",
//       "animate-inhale-7s",
//       "animate-exhale-4s",
//       "animate-exhale-8s",
//       "animate-hold-1s",
//       "animate-hold-4s",
//       "animate-hold-7s"
//     );

//     // Reset all animation styles
//     this.circleElement.style.animation = "";
//     this.circleElement.style.transitionDuration = "";

//     // Force a reflow to ensure changes are applied
//     this.circleElement.offsetHeight;

//     // Reset text styling
//     if (this.textElement && this.textElement.classList) {
//       this.textElement.classList.remove(
//         "inhale-text",
//         "exhale-text",
//         "hold-text"
//       );
//     }
//   }

//   showCompletionFeedback() {
//     if (!this.textElement) return;

//     const cycles = this.completedCycles;
//     const minutes = Math.floor(this.sessionData.totalTime / 60000);
//     const seconds = Math.floor((this.sessionData.totalTime % 60000) / 1000);

//     let message = "Session complete!";
//     if (cycles > 0) {
//       message = `Great job! ${cycles} cycle${cycles > 1 ? "s" : ""} completed`;
//       if (minutes > 0 || seconds > 0) {
//         message += ` in ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
//       }
//     }

//     this.textElement.textContent = message;

//     // Show completion animation
//     if (this.circleElement) {
//       this.circleElement.style.animation = "breathingComplete 1s ease-in-out";
//       setTimeout(() => {
//         if (this.circleElement) {
//           this.circleElement.style.animation = "";
//         }
//       }, 1000);
//     }
//   }

//   updateButtonStates() {
//     if (this.startButton && this.stopButton) {
//       if (this.isActive) {
//         this.startButton.style.display = "none";
//         this.stopButton.style.display = "inline-flex";
//       } else {
//         this.startButton.style.display = "inline-flex";
//         this.stopButton.style.display = "none";
//       }
//     }
//   }

//   async saveSessionData() {
//     try {
//       // Get existing session history
//       const result = await chrome.storage.local.get("breathingSessions");
//       const sessions = result.breathingSessions || [];

//       // Add current session
//       sessions.push({
//         ...this.sessionData,
//         timestamp: Date.now(),
//       });

//       // Keep only last 50 sessions
//       const recentSessions = sessions.slice(-50);

//       await chrome.storage.local.set({ breathingSessions: recentSessions });
//     } catch (error) {
//       console.error("Failed to save breathing session data:", error);
//     }
//   }

//   trackEvent(eventName, data = {}) {
//     try {
//       // Send analytics event to background script
//       const message = chrome.runtime.sendMessage({
//         type: "TRACK_WELLNESS_EVENT",
//         event: eventName,
//         data: {
//           ...data,
//           timestamp: Date.now(),
//           component: "breathing_exercise",
//         },
//       });

//       // Handle promise rejection silently
//       if (message && typeof message.catch === "function") {
//         message.catch((error) => {
//           console.error("Failed to track breathing exercise event:", error);
//         });
//       }
//     } catch (error) {
//       console.error("Failed to track breathing exercise event:", error);
//     }
//   }

//   // Customization methods
//   setDuration(phase, milliseconds) {
//     if (this.phases.includes(phase) && milliseconds > 0) {
//       this.durations[phase] = milliseconds;
//       this.saveCustomDurations();
//     }
//   }

//   getDuration(phase) {
//     return (
//       this.durations[phase] ||
//       this.defaultDurations[phase] ||
//       this.defaultDurations.inhale
//     );
//   }

//   resetToDefaults() {
//     this.durations = { ...this.defaultDurations };
//     this.saveCustomDurations();
//   }

//   // Preset breathing patterns
//   setPattern(patternName) {
//     const patterns = {
//       "4-7-8": { inhale: 4000, holdIn: 7000, exhale: 8000, holdOut: 1000 },
//       "4-4-4-4": { inhale: 4000, holdIn: 4000, exhale: 4000, holdOut: 4000 },
//       "6-2-6-2": { inhale: 6000, holdIn: 2000, exhale: 6000, holdOut: 2000 },
//       triangle: { inhale: 4000, holdIn: 4000, exhale: 4000, holdOut: 0 },
//       coherent: { inhale: 5000, holdIn: 0, exhale: 5000, holdOut: 0 },
//       quick: { inhale: 3000, holdIn: 1000, exhale: 3000, holdOut: 500 },
//       deep: { inhale: 6000, holdIn: 4000, exhale: 8000, holdOut: 2000 },
//       "stress-relief": {
//         inhale: 4000,
//         holdIn: 2000,
//         exhale: 6000,
//         holdOut: 1000,
//       },
//     };

//     if (patterns[patternName]) {
//       this.durations = { ...patterns[patternName] };
//       this.saveCustomDurations();
//     }
//   }

//   // Get session statistics
//   async getSessionStats() {
//     try {
//       const result = await chrome.storage.local.get("breathingSessions");
//       const sessions = result.breathingSessions || [];

//       const totalSessions = sessions.length;
//       const totalTime = sessions.reduce(
//         (sum, session) => sum + (session.totalTime || 0),
//         0
//       );
//       const totalCycles = sessions.reduce(
//         (sum, session) => sum + (session.cyclesCompleted || 0),
//         0
//       );
//       const averageSessionTime =
//         totalSessions > 0 ? totalTime / totalSessions : 0;

//       return {
//         totalSessions,
//         totalTime,
//         totalCycles,
//         averageSessionTime,
//         recentSessions: sessions.slice(-10),
//       };
//     } catch (error) {
//       console.error("Failed to get session stats:", error);
//       return {
//         totalSessions: 0,
//         totalTime: 0,
//         totalCycles: 0,
//         averageSessionTime: 0,
//         recentSessions: [],
//       };
//     }
//   }

//   // Cleanup method
//   destroy() {
//     this.stopExercise();

//     // Remove event listeners if they exist
//     if (this.startButton && this.startButton.removeEventListener) {
//       this.startButton.removeEventListener("click", this.startExercise);
//     }
//     if (this.stopButton && this.stopButton.removeEventListener) {
//       this.stopButton.removeEventListener("click", this.stopExercise);
//     }
//   }
// }

// // Export for use in popup
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = BreathingExercise;
// } else if (typeof window !== "undefined") {
//   window.BreathingExercise = BreathingExercise;
// }
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

    // Track circle size
    this.scaleMin = 1;
    this.scaleMax = 1.5;
    this.currentScale = this.scaleMin;

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

    this.circleElement.style.willChange = "transform";
    this.circleElement.style.backfaceVisibility = "hidden";
    this.circleElement.style.transform = `scale(${this.scaleMin})`;

    this.updateButtonStates();
  }

  setupEventListeners() {
    if (this.startButton) {
      this.startButton.addEventListener("click", () => this.startExercise());
    }
    if (this.stopButton) {
      this.stopButton.addEventListener("click", () => this.stopExercise());
    }
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

  startExercise() {
    if (this.isActive) return;
    this.isActive = true;
    this.sessionStartTime = Date.now();
    this.sessionData.startTime = this.sessionStartTime;
    this.completedCycles = 0;
    this.currentPhase = 0;
    this.currentScale = this.scaleMin;

    this.updateButtonStates();

    if (this.textElement) {
      this.textElement.textContent = "Get ready...";
    }

    setTimeout(() => {
      if (this.isActive) {
        this.runPhase();
      }
    }, 1000);
  }

  stopExercise() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.phaseTimeout) clearTimeout(this.phaseTimeout);
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const sessionEndTime = Date.now();
    this.sessionData.endTime = sessionEndTime;
    this.sessionData.totalTime = sessionEndTime - this.sessionStartTime;
    this.sessionData.cyclesCompleted = this.completedCycles;

    this.resetCircle();
    this.showCompletionFeedback();
    this.updateButtonStates();
  }

  runPhase() {
    if (!this.isActive) return;
    const phase = this.phases[this.currentPhase];
    const duration = this.durations[phase];

    if (this.textElement) {
      this.textElement.textContent = this.phaseTexts[phase];
    }

    if (phase === "inhale") {
      this.animateScale(this.scaleMin, this.scaleMax, duration);
    } else if (phase === "exhale") {
      this.animateScale(this.scaleMax, this.scaleMin, duration);
    } else if (phase === "holdIn") {
      this.setScale(this.scaleMax);
    } else if (phase === "holdOut") {
      this.setScale(this.scaleMin);
    }

    this.phaseTimeout = setTimeout(() => {
      if (!this.isActive) return;
      this.currentPhase = (this.currentPhase + 1) % this.phases.length;
      if (this.currentPhase === 0) this.completedCycles++;
      this.runPhase();
    }, duration);
  }

  animateScale(start, end, duration) {
    if (!this.circleElement) return;

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const scale = start + (end - start) * progress;

      this.circleElement.style.transform = `scale(${scale})`;

      if (progress < 1 && this.isActive) {
        this.animationId = requestAnimationFrame(step);
      } else {
        this.currentScale = end;
      }
    };

    this.animationId = requestAnimationFrame(step);
  }

  setScale(scale) {
    if (!this.circleElement) return;
    this.circleElement.style.transform = `scale(${scale})`;
    this.currentScale = scale;
  }

  resetCircle() {
    this.setScale(this.scaleMin);
  }

  showCompletionFeedback() {
    if (this.textElement) {
      this.textElement.textContent = "Session complete!";
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

  // Cleanup method
  destroy() {
    this.stopExercise();
    if (this.startButton) {
      this.startButton.removeEventListener("click", this.startExercise);
    }
    if (this.stopButton) {
      this.stopButton.removeEventListener("click", this.stopExercise);
    }
  }
}

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreathingExercise;
} else if (typeof window !== "undefined") {
  window.BreathingExercise = BreathingExercise;
}
