/**
 * Focus and Anxiety Management Page
 * Provides wellness tools and techniques with comprehensive error handling
 */
class FocusAnxietyManager {
  constructor() {
    this.errorHandler = null;
    this.isInitialized = false;
    this.activeTools = new Set();
    this.init();
  }
  /**
   * Initialize the focus and anxiety management page
   */
  async init() {
    try {
      // Initialize error handler
      if (typeof errorHandler !== 'undefined') {
        this.errorHandler = errorHandler;
      }
      // Set up error handling for the page
      this.setupGlobalErrorHandling();
      // Initialize page components
      await this.initializeComponents();
      // Set up event listeners
      this.setupEventListeners();
      // Track page usage
      this.trackPageUsage();
      this.isInitialized = true;
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Wellness tools loaded successfully',
          'success',
          { duration: 2000 }
        );
      }
    } catch (error) {
      console.error('Failed to initialize Focus & Anxiety Management page:', error);
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(error, 'Focus Anxiety Page Init');
      }
      this.initializeFallbackMode();
    }
  }
  /**
   * Set up global error handling for the page
   */
  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection in Focus & Anxiety page:', event.reason);
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(event.reason, 'Focus Anxiety Page');
      }
      event.preventDefault();
    });
    // Handle general errors
    window.addEventListener('error', (event) => {
      console.error('Error in Focus & Anxiety page:', event.error);
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(event.error, 'Focus Anxiety Page');
      }
    });
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }
  /**
   * Initialize page components with error handling
   */
  async initializeComponents() {
    const components = [
      { name: 'Breathing Exercises', fn: () => this.initializeBreathingExercises() },
      { name: 'Meditation Tools', fn: () => this.initializeMeditationTools() },
      { name: 'Focus Techniques', fn: () => this.initializeFocusTechniques() },
      { name: 'Anxiety Management', fn: () => this.initializeAnxietyManagement() },
      { name: 'Progress Tracking', fn: () => this.initializeProgressTracking() }
    ];
    for (const component of components) {
      try {
        await component.fn();
      } catch (error) {
        console.error(`Failed to initialize ${component.name}:`, error);
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(
            `${component.name} unavailable`,
            'warning',
            { duration: 3000 }
          );
        }
      }
    }
  }
  /**
   * Initialize breathing exercises component
   */
  initializeBreathingExercises() {
    // Placeholder for breathing exercises
    }
  /**
   * Initialize meditation tools component
   */
  initializeMeditationTools() {
    // Placeholder for meditation tools
    }
  /**
   * Initialize focus techniques component
   */
  initializeFocusTechniques() {
    // Placeholder for focus techniques
    }
  /**
   * Initialize anxiety management component
   */
  initializeAnxietyManagement() {
    // Placeholder for anxiety management
    }
  /**
   * Initialize progress tracking component
   */
  initializeProgressTracking() {
    // Placeholder for progress tracking
    }
  /**
   * Set up event listeners with error handling
   */
  setupEventListeners() {
    try {
      // Add event listeners for interactive elements
      document.addEventListener('click', (event) => {
        this.handleClick(event);
      });
      document.addEventListener('keydown', (event) => {
        this.handleKeydown(event);
      });
    } catch (error) {
      console.error('Failed to set up event listeners:', error);
    }
  }
  /**
   * Handle click events with error handling
   */
  handleClick(event) {
    try {
      // Handle tool interactions
      if (event.target.matches('.wellness-tool')) {
        this.activateWellnessTool(event.target);
      }
    } catch (error) {
      console.error('Error handling click:', error);
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Tool interaction failed',
          'error',
          { duration: 3000 }
        );
      }
    }
  }
  /**
   * Handle keyboard events
   */
  handleKeydown(event) {
    try {
      // Handle keyboard shortcuts
      if (event.key === 'Escape') {
        this.deactivateAllTools();
      }
    } catch (error) {
      console.error('Error handling keydown:', error);
    }
  }
  /**
   * Activate a wellness tool with error handling
   */
  activateWellnessTool(toolElement) {
    try {
      const toolType = toolElement.dataset.tool;
      if (!toolType) {
        throw new Error('Tool type not specified');
      }
      this.activeTools.add(toolType);
      toolElement.classList.add('active');
      // Track tool usage
      this.trackToolUsage(toolType);
      } catch (error) {
      console.error('Failed to activate wellness tool:', error);
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Failed to activate tool',
          'error',
          { duration: 3000 }
        );
      }
    }
  }
  /**
   * Deactivate all active tools
   */
  deactivateAllTools() {
    try {
      this.activeTools.clear();
      document.querySelectorAll('.wellness-tool.active').forEach(tool => {
        tool.classList.remove('active');
      });
      } catch (error) {
      console.error('Error deactivating tools:', error);
    }
  }
  /**
   * Track page usage for insights
   */
  trackPageUsage() {
    try {
      const usage = {
        timestamp: Date.now(),
        page: 'focus-anxiety',
        sessionId: this.generateSessionId()
      };
      // Store usage data (if storage is available)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('wellnessUsage').then(result => {
          const usageData = result.wellnessUsage || [];
          usageData.push(usage);
          // Keep only last 100 entries
          const limitedData = usageData.slice(-100);
          chrome.storage.local.set({ wellnessUsage: limitedData });
        }).catch(error => {
          console.warn('Could not save usage data:', error);
        });
      }
    } catch (error) {
      console.warn('Could not track page usage:', error);
    }
  }
  /**
   * Track individual tool usage
   */
  trackToolUsage(toolType) {
    try {
      const toolUsage = {
        timestamp: Date.now(),
        tool: toolType,
        page: 'focus-anxiety'
      };
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('toolUsage').then(result => {
          const usageData = result.toolUsage || [];
          usageData.push(toolUsage);
          // Keep only last 200 entries
          const limitedData = usageData.slice(-200);
          chrome.storage.local.set({ toolUsage: limitedData });
        }).catch(error => {
          console.warn('Could not save tool usage data:', error);
        });
      }
    } catch (error) {
      console.warn('Could not track tool usage:', error);
    }
  }
  /**
   * Handle page becoming hidden
   */
  handlePageHidden() {
    try {
      // Pause any active tools or timers
      this.pauseActiveTools();
      } catch (error) {
      console.error('Error handling page hidden:', error);
    }
  }
  /**
   * Handle page becoming visible
   */
  handlePageVisible() {
    try {
      // Resume any paused tools
      this.resumeActiveTools();
      } catch (error) {
      console.error('Error handling page visible:', error);
    }
  }
  /**
   * Pause active tools
   */
  pauseActiveTools() {
    // Placeholder for pausing active tools
    }
  /**
   * Resume active tools
   */
  resumeActiveTools() {
    // Placeholder for resuming active tools
    }
  /**
   * Initialize fallback mode when full initialization fails
   */
  initializeFallbackMode() {
    console.warn('Focus & Anxiety Management page running in fallback mode');
    // Create basic error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'fallback-message';
    errorMessage.innerHTML = `
      <h2>Limited Functionality</h2>
      <p>Some wellness tools may not be available due to technical issues.</p>
      <p>Please try refreshing the page or contact support if the problem persists.</p>
    `;
    document.body.insertBefore(errorMessage, document.body.firstChild);
  }
  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  /**
   * Clean up resources when page is unloaded
   */
  cleanup() {
    try {
      // Deactivate all tools
      this.deactivateAllTools();
      // Clear any timers or intervals
      // (placeholder for actual cleanup)
      } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
// Initialize the focus and anxiety manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.focusAnxietyManager = new FocusAnxietyManager();
  } catch (error) {
    console.error('Failed to initialize Focus & Anxiety Management page:', error);
  }
});
