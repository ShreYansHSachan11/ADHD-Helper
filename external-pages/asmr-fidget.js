/**
 * ASMR and Fidgeting Tools Page
 * Provides interactive ASMR sounds and fidgeting elements with comprehensive error handling
 */

class ASMRFidgetManager {
  constructor() {
    this.errorHandler = null;
    this.isInitialized = false;
    this.activeAudio = new Map();
    this.fidgetElements = new Map();
    this.audioContext = null;
    this.fallbackMode = false;
    
    this.init();
  }

  /**
   * Initialize the ASMR and fidgeting page
   */
  async init() {
    try {
      // Initialize error handler
      if (typeof errorHandler !== 'undefined') {
        this.errorHandler = errorHandler;
      }

      // Set up error handling for the page
      this.setupGlobalErrorHandling();

      // Check audio support
      await this.checkAudioSupport();

      // Initialize page components
      await this.initializeComponents();

      // Set up event listeners
      this.setupEventListeners();

      // Track page usage
      this.trackPageUsage();

      this.isInitialized = true;
      console.log('ASMR & Fidgeting Tools page initialized successfully');

      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'ASMR tools loaded successfully',
          'success',
          { duration: 2000 }
        );
      }

    } catch (error) {
      console.error('Failed to initialize ASMR & Fidgeting Tools page:', error);
      
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(error, 'ASMR Fidget Page Init');
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
      console.error('Unhandled promise rejection in ASMR & Fidgeting page:', event.reason);
      
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(event.reason, 'ASMR Fidget Page');
      }
      
      event.preventDefault();
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      console.error('Error in ASMR & Fidgeting page:', event.error);
      
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(event.error, 'ASMR Fidget Page');
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
   * Check if browser supports required audio features
   */
  async checkAudioSupport() {
    try {
      // Check if Audio constructor is available
      if (typeof Audio === 'undefined') {
        throw new Error('Audio playback not supported in this browser');
      }

      // Check if we can create audio context
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
        }
      } catch (error) {
        console.warn('AudioContext not available, using basic audio only');
      }

      // Test basic audio creation
      const testAudio = new Audio();
      testAudio.volume = 0;
      testAudio.muted = true;
      
      return true;
    } catch (error) {
      console.warn('Limited audio support detected:', error);
      this.fallbackMode = true;
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Audio features running in limited mode',
          'warning',
          { duration: 4000 }
        );
      }
      
      return false;
    }
  }

  /**
   * Initialize page components with error handling
   */
  async initializeComponents() {
    const components = [
      { name: 'ASMR Audio Controls', fn: () => this.initializeASMRAudio() },
      { name: 'Fidgeting Elements', fn: () => this.initializeFidgetElements() },
      { name: 'Interactive Feedback', fn: () => this.initializeInteractiveFeedback() },
      { name: 'Volume Controls', fn: () => this.initializeVolumeControls() },
      { name: 'Usage Tracking', fn: () => this.initializeUsageTracking() }
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
   * Initialize ASMR audio controls
   */
  initializeASMRAudio() {
    if (this.fallbackMode) {
      console.log('ASMR audio initialized in fallback mode');
      return;
    }

    // Placeholder for ASMR audio initialization
    console.log('ASMR audio controls initialized');
  }

  /**
   * Initialize fidgeting elements
   */
  initializeFidgetElements() {
    // Placeholder for fidget elements initialization
    console.log('Fidgeting elements initialized');
  }

  /**
   * Initialize interactive feedback systems
   */
  initializeInteractiveFeedback() {
    // Placeholder for interactive feedback initialization
    console.log('Interactive feedback systems initialized');
  }

  /**
   * Initialize volume controls
   */
  initializeVolumeControls() {
    // Placeholder for volume controls initialization
    console.log('Volume controls initialized');
  }

  /**
   * Initialize usage tracking
   */
  initializeUsageTracking() {
    // Placeholder for usage tracking initialization
    console.log('Usage tracking initialized');
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

      // Add touch event listeners for mobile fidgeting
      document.addEventListener('touchstart', (event) => {
        this.handleTouch(event);
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
      // Handle ASMR sound triggers
      if (event.target.matches('.asmr-trigger')) {
        this.playASMRSound(event.target);
      }
      
      // Handle fidget interactions
      if (event.target.matches('.fidget-element')) {
        this.triggerFidgetFeedback(event.target);
      }
      
    } catch (error) {
      console.error('Error handling click:', error);
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Interaction failed',
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
        this.stopAllAudio();
      }
    } catch (error) {
      console.error('Error handling keydown:', error);
    }
  }

  /**
   * Handle touch events for mobile fidgeting
   */
  handleTouch(event) {
    try {
      // Handle touch-based fidgeting
      if (event.target.matches('.touch-fidget')) {
        this.handleTouchFidget(event.target, event);
      }
    } catch (error) {
      console.error('Error handling touch:', error);
    }
  }

  /**
   * Play ASMR sound with error handling
   */
  async playASMRSound(triggerElement) {
    try {
      const soundType = triggerElement.dataset.sound;
      
      if (!soundType) {
        throw new Error('Sound type not specified');
      }

      if (this.fallbackMode) {
        this.showFallbackFeedback('Audio playback not available');
        return;
      }

      // Check if audio context needs to be resumed
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (error) {
          console.warn('Could not resume audio context:', error);
        }
      }

      // Create and play audio (placeholder implementation)
      const audio = new Audio();
      audio.volume = 0.7;
      
      // Set up error handling for audio
      audio.addEventListener('error', (e) => {
        console.error('ASMR audio error:', e);
        
        if (this.errorHandler) {
          this.errorHandler.handleAudioError(
            new Error('ASMR audio playback failed'), 
            'ASMR Sound'
          );
        }
      });

      // Store active audio for cleanup
      this.activeAudio.set(soundType, audio);

      console.log(`Playing ASMR sound: ${soundType}`);

      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          `Playing: ${soundType}`,
          'info',
          { duration: 2000 }
        );
      }

    } catch (error) {
      console.error('Failed to play ASMR sound:', error);
      
      if (this.errorHandler) {
        this.errorHandler.handleAudioError(error, 'ASMR Sound');
      }
    }
  }

  /**
   * Trigger fidget feedback with error handling
   */
  triggerFidgetFeedback(fidgetElement) {
    try {
      const fidgetType = fidgetElement.dataset.fidget;
      
      if (!fidgetType) {
        throw new Error('Fidget type not specified');
      }

      // Add visual feedback
      fidgetElement.classList.add('active');
      
      setTimeout(() => {
        fidgetElement.classList.remove('active');
      }, 200);

      // Track fidget usage
      this.trackFidgetUsage(fidgetType);

      console.log(`Fidget interaction: ${fidgetType}`);

    } catch (error) {
      console.error('Failed to trigger fidget feedback:', error);
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Fidget interaction failed',
          'error',
          { duration: 3000 }
        );
      }
    }
  }

  /**
   * Handle touch-based fidgeting
   */
  handleTouchFidget(element, touchEvent) {
    try {
      // Prevent default touch behavior
      touchEvent.preventDefault();
      
      // Add touch feedback
      element.classList.add('touched');
      
      setTimeout(() => {
        element.classList.remove('touched');
      }, 300);

    } catch (error) {
      console.error('Error handling touch fidget:', error);
    }
  }

  /**
   * Stop all active audio
   */
  stopAllAudio() {
    try {
      this.activeAudio.forEach((audio, soundType) => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          console.warn(`Could not stop audio ${soundType}:`, error);
        }
      });
      
      this.activeAudio.clear();
      
      console.log('All ASMR audio stopped');

    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  /**
   * Show fallback feedback when features are unavailable
   */
  showFallbackFeedback(message) {
    if (this.errorHandler) {
      this.errorHandler.showUserFeedback(
        message,
        'warning',
        { duration: 3000 }
      );
    } else {
      console.warn('Fallback:', message);
    }
  }

  /**
   * Track page usage for insights
   */
  trackPageUsage() {
    try {
      const usage = {
        timestamp: Date.now(),
        page: 'asmr-fidget',
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
   * Track fidget usage
   */
  trackFidgetUsage(fidgetType) {
    try {
      const fidgetUsage = {
        timestamp: Date.now(),
        fidget: fidgetType,
        page: 'asmr-fidget'
      };

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('fidgetUsage').then(result => {
          const usageData = result.fidgetUsage || [];
          usageData.push(fidgetUsage);
          
          // Keep only last 200 entries
          const limitedData = usageData.slice(-200);
          
          chrome.storage.local.set({ fidgetUsage: limitedData });
        }).catch(error => {
          console.warn('Could not save fidget usage data:', error);
        });
      }

    } catch (error) {
      console.warn('Could not track fidget usage:', error);
    }
  }

  /**
   * Handle page becoming hidden
   */
  handlePageHidden() {
    try {
      // Pause all audio when page is hidden
      this.activeAudio.forEach((audio) => {
        try {
          audio.pause();
        } catch (error) {
          console.warn('Could not pause audio:', error);
        }
      });
      
      console.log('ASMR & Fidgeting page hidden, pausing audio');

    } catch (error) {
      console.error('Error handling page hidden:', error);
    }
  }

  /**
   * Handle page becoming visible
   */
  handlePageVisible() {
    try {
      // Resume audio context if needed
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(error => {
          console.warn('Could not resume audio context:', error);
        });
      }
      
      console.log('ASMR & Fidgeting page visible');

    } catch (error) {
      console.error('Error handling page visible:', error);
    }
  }

  /**
   * Initialize fallback mode when full initialization fails
   */
  initializeFallbackMode() {
    console.warn('ASMR & Fidgeting Tools page running in fallback mode');
    
    // Create basic error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'fallback-message';
    errorMessage.innerHTML = `
      <h2>Limited Functionality</h2>
      <p>Some ASMR and fidgeting tools may not be available due to technical issues.</p>
      <p>Please try refreshing the page or check your browser's audio settings.</p>
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
      // Stop all audio
      this.stopAllAudio();
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(error => {
          console.warn('Could not close audio context:', error);
        });
      }
      
      console.log('ASMR & Fidgeting page cleanup completed');

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Initialize the ASMR fidget manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.asmrFidgetManager = new ASMRFidgetManager();
  } catch (error) {
    console.error('Failed to initialize ASMR & Fidgeting Tools page:', error);
  }
});

console.log('ASMR & Fidgeting Tools page script loaded');