class AudioManager {
  constructor() {
    this.whiteNoiseAudio = null;
    this.currentSoundIndex = 2;
    this.isPlaying = false;
    this.volume = 0.5;
    this.defaultSound = "rain";
    this.fadeInterval = null;
    this.errorHandler = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.audioContext = null;
    this.fallbackMode = false;
    this.loadingPromise = null;
    
    // Performance optimization: Use smaller, optimized audio files
    this.useOptimizedAudio = true;
    this.audioCache = new Map();
    this.preloadedSounds = new Set();
    this.maxCacheSize = 3; // Limit cached audio elements

    this.availableSounds = [
      "assets/sounds/air-white-noise.mp3",
      "assets/sounds/ocean-white-noise.mp3",
      "assets/sounds/rain-white-noise.mp3",
      "assets/sounds/shower-white-noise.mp3",
      "assets/sounds/train-white-noise.mp3",
      "assets/sounds/water-white-noise.mp3",
      "assets/sounds/waterfall-white-noise.mp3",
      "assets/sounds/waves-white-noise.mp3",
    ];

    // Optimized audio paths (smaller files for better performance)
    this.optimizedSounds = [
      "assets/sounds/optimized/air-white-noise.mp3",
      "assets/sounds/optimized/ocean-white-noise.mp3", 
      "assets/sounds/optimized/rain-white-noise.mp3",
      "assets/sounds/optimized/shower-white-noise.mp3",
      "assets/sounds/optimized/train-white-noise.mp3",
      "assets/sounds/optimized/water-white-noise.mp3",
      "assets/sounds/optimized/waterfall-white-noise.mp3",
      "assets/sounds/optimized/waves-white-noise.mp3",
    ];

    this.soundNames = [
      "Air Conditioner",
      "Ocean Waves",
      "Rain Drops",
      "Shower",
      "Train Journey",
      "Flowing Water",
      "Waterfall",
      "Beach Waves",
    ];

    // Initialize error handler if available
    if (typeof errorHandler !== 'undefined') {
      this.errorHandler = errorHandler;
    }

    this.initializeSettings();
  }

  async initializeSettings() {
    try {
      // Check browser audio support
      await this.checkAudioSupport();
      
      // Load settings with error handling
      if (typeof chrome !== "undefined" && chrome.storage) {
        await this.loadSettingsWithErrorHandling();
      } else {
        console.warn('Chrome storage not available, using defaults');
        this.setDefaultSettings();
      }
      
      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.error("Failed to initialize AudioManager:", error);
      
      if (this.errorHandler) {
        this.errorHandler.handleAudioError(error, 'Audio Manager Init');
      }
      
      this.initializeFallbackMode();
    }
  }

  /**
   * Check if browser supports required audio features
   */
  async checkAudioSupport() {
    // Check if Audio constructor is available
    if (typeof Audio === 'undefined') {
      throw new Error('Audio playback not supported in this browser');
    }

    // Check if we can create audio context (for advanced features)
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }
    } catch (error) {
      console.warn('AudioContext not available, using basic audio only');
    }

    // Test basic audio creation
    try {
      const testAudio = new Audio();
      testAudio.volume = 0;
      testAudio.muted = true;
      
      // Test if we can set source
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      
      return true;
    } catch (error) {
      throw new Error('Basic audio functionality not available: ' + error.message);
    }
  }

  /**
   * Load settings with comprehensive error handling
   */
  async loadSettingsWithErrorHandling() {
    try {
      await this.loadSettings();
    } catch (error) {
      console.error('Failed to load audio settings:', error);
      
      if (this.errorHandler) {
        this.errorHandler.handleStorageError(error, 'Load Audio Settings');
      }
      
      // Use default settings as fallback
      this.setDefaultSettings();
    }
  }

  /**
   * Set default settings when loading fails
   */
  setDefaultSettings() {
    this.volume = 0.5;
    this.currentSoundIndex = 2; // Rain as default
    this.isPlaying = false;
    
    console.log('Using default audio settings');
  }

  /**
   * Initialize fallback mode when audio features are limited
   */
  initializeFallbackMode() {
    this.fallbackMode = true;
    this.setDefaultSettings();
    
    console.warn('AudioManager running in fallback mode with limited functionality');
    
    if (this.errorHandler) {
      this.errorHandler.showUserFeedback(
        'Audio features running in limited mode',
        'warning',
        { duration: 3000 }
      );
    }
  }

  /**
   * Performance optimization: Get the appropriate audio path
   */
  getAudioPath(soundIndex) {
    // Use optimized audio if available and enabled
    if (this.useOptimizedAudio && soundIndex < this.optimizedSounds.length) {
      return this.optimizedSounds[soundIndex];
    }
    
    // Fallback to original audio
    return this.availableSounds[soundIndex];
  }

  /**
   * Performance optimization: Preload commonly used sounds
   */
  async preloadSound(soundIndex) {
    if (this.preloadedSounds.has(soundIndex)) {
      return; // Already preloaded
    }

    try {
      const audioPath = this.getAudioPath(soundIndex);
      const audio = new Audio();
      
      // Set up for preloading
      audio.preload = "metadata"; // Load metadata only, not full audio
      audio.volume = 0;
      audio.muted = true;
      
      // Create promise for load completion
      const loadPromise = new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Preload timeout')), 5000);
      });

      audio.src = audioPath;
      
      await loadPromise;
      
      // Cache the preloaded audio element
      this.cacheAudioElement(soundIndex, audio);
      this.preloadedSounds.add(soundIndex);
      
      console.log(`Preloaded sound: ${this.soundNames[soundIndex]}`);
      
    } catch (error) {
      console.warn(`Failed to preload sound ${soundIndex}:`, error);
    }
  }

  /**
   * Performance optimization: Cache management for audio elements
   */
  cacheAudioElement(soundIndex, audioElement) {
    // Implement LRU cache behavior
    if (this.audioCache.size >= this.maxCacheSize) {
      // Remove oldest cached element
      const oldestKey = this.audioCache.keys().next().value;
      const oldAudio = this.audioCache.get(oldestKey);
      
      if (oldAudio && oldAudio !== this.whiteNoiseAudio) {
        oldAudio.src = ''; // Free memory
      }
      
      this.audioCache.delete(oldestKey);
      this.preloadedSounds.delete(oldestKey);
    }
    
    this.audioCache.set(soundIndex, audioElement);
  }

  /**
   * Performance optimization: Get cached audio element or create new one
   */
  getCachedAudioElement(soundIndex) {
    if (this.audioCache.has(soundIndex)) {
      const cachedAudio = this.audioCache.get(soundIndex);
      
      // Move to end (most recently used)
      this.audioCache.delete(soundIndex);
      this.audioCache.set(soundIndex, cachedAudio);
      
      return cachedAudio;
    }
    
    return null;
  }

  /**
   * Performance optimization: Preload default and popular sounds
   */
  async preloadPopularSounds() {
    const popularSounds = [2, 1, 7]; // Rain, Ocean, Waves - most commonly used
    
    for (const soundIndex of popularSounds) {
      await this.preloadSound(soundIndex);
      
      // Small delay between preloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async loadSettings() {
    if (typeof chrome === "undefined" || !chrome.storage) {
      throw new Error('Chrome storage not available');
    }

    try {
      const result = await chrome.storage.local.get("audioSettings");
      
      // Validate settings structure
      const settings = this.validateAudioSettings(result.audioSettings);

      // Apply validated settings
      this.volume = Math.max(0, Math.min(1, settings.whiteNoise.volume || 0.5));

      if (settings.whiteNoise.currentSound) {
        const soundIndex = this.getSoundIndexFromKey(settings.whiteNoise.currentSound);
        this.currentSoundIndex = soundIndex;
      } else {
        this.currentSoundIndex = 2; // Default to rain
      }

      // Validate sound index
      if (this.currentSoundIndex >= this.availableSounds.length || this.currentSoundIndex < 0) {
        console.warn('Invalid sound index, resetting to default');
        this.currentSoundIndex = 2;
      }

      // Auto-start if previously enabled (with user gesture check)
      if (settings.whiteNoise.enabled) {
        // Don't auto-start immediately, wait for user interaction
        console.log('Audio was previously enabled, ready to resume on user interaction');
      }

      // Performance optimization: Preload popular sounds in background
      this.preloadPopularSounds().catch(error => {
        console.warn('Failed to preload popular sounds:', error);
      });
      
    } catch (error) {
      if (error.message.includes('quota')) {
        throw new Error('Storage quota exceeded while loading audio settings');
      } else if (error.message.includes('corrupted')) {
        throw new Error('Audio settings data is corrupted');
      } else {
        throw new Error('Failed to load audio settings: ' + error.message);
      }
    }
  }

  /**
   * Validate and sanitize audio settings
   */
  validateAudioSettings(settings) {
    const defaultSettings = {
      whiteNoise: { 
        enabled: false, 
        volume: 0.5, 
        currentSound: "rain" 
      }
    };

    if (!settings || typeof settings !== 'object') {
      return defaultSettings;
    }

    if (!settings.whiteNoise || typeof settings.whiteNoise !== 'object') {
      return defaultSettings;
    }

    // Validate volume
    if (typeof settings.whiteNoise.volume !== 'number' || 
        isNaN(settings.whiteNoise.volume) ||
        settings.whiteNoise.volume < 0 || 
        settings.whiteNoise.volume > 1) {
      settings.whiteNoise.volume = 0.5;
    }

    // Validate enabled flag
    if (typeof settings.whiteNoise.enabled !== 'boolean') {
      settings.whiteNoise.enabled = false;
    }

    // Validate current sound
    const validSounds = ['air', 'ocean', 'rain', 'shower', 'train', 'water', 'waterfall', 'waves'];
    if (!validSounds.includes(settings.whiteNoise.currentSound)) {
      settings.whiteNoise.currentSound = 'rain';
    }

    return settings;
  }

  /**
   * Get sound index from sound key with validation
   */
  getSoundIndexFromKey(soundKey) {
    const soundMap = {
      air: 0,
      ocean: 1,
      rain: 2,
      shower: 3,
      train: 4,
      water: 5,
      waterfall: 6,
      waves: 7,
    };

    return soundMap[soundKey] !== undefined ? soundMap[soundKey] : 2;
  }

  async saveSettings() {
    try {
      if (typeof chrome === "undefined" || !chrome.storage) {
        console.warn('Chrome storage not available, cannot save settings');
        return false;
      }

      const settings = {
        whiteNoise: {
          enabled: this.isPlaying,
          volume: Math.max(0, Math.min(1, this.volume)), // Ensure valid range
          currentSound: this.getCurrentSound(),
        },
      };
      
      await chrome.storage.local.set({ audioSettings: settings });
      return true;
      
    } catch (error) {
      console.error("Failed to save audio settings:", error);
      
      if (this.errorHandler) {
        this.errorHandler.handleStorageError(error, 'Save Audio Settings');
      }
      
      return false;
    }
  }

  createAudioElement(soundKey) {
    try {
      // Update sound index if provided
      if (soundKey) {
        const soundIndex = this.getSoundIndexFromKey(soundKey);
        this.currentSoundIndex = soundIndex;
      }

      // Validate current sound index
      if (this.currentSoundIndex >= this.availableSounds.length || this.currentSoundIndex < 0) {
        console.warn('Invalid sound index, using default');
        this.currentSoundIndex = 2;
      }

      // Performance optimization: Try to use cached audio element first
      let audio = this.getCachedAudioElement(this.currentSoundIndex);
      
      if (audio) {
        console.log(`Using cached audio: ${this.getCurrentSoundName()}`);
        
        // Reset audio state for reuse
        audio.currentTime = 0;
        audio.volume = Math.max(0, Math.min(1, this.volume));
        
        return audio;
      }

      // Create new audio element with optimized path
      const soundPath = this.getAudioPath(this.currentSoundIndex);
      
      if (!soundPath) {
        throw new Error('Sound path not found for index: ' + this.currentSoundIndex);
      }

      audio = new Audio();
      
      // Set up audio properties before setting source
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, this.volume));
      audio.preload = "auto";
      audio.crossOrigin = "anonymous"; // For CORS if needed

      // Set up comprehensive error handling
      audio.addEventListener("error", (e) => {
        const errorDetails = this.getAudioErrorDetails(e);
        console.error("Audio loading error for:", soundPath, errorDetails);
        this.handleAudioError(e);
      });

      audio.addEventListener("canplaythrough", () => {
        console.log(`Audio loaded successfully: ${this.getCurrentSoundName()}`);
        this.retryCount = 0; // Reset retry count on success
      });

      audio.addEventListener("ended", () => {
        if (this.isPlaying) {
          this.handleAudioLoop(audio);
        }
      });

      // Add additional event listeners for better error handling
      audio.addEventListener("loadstart", () => {
        console.log(`Loading audio: ${this.getCurrentSoundName()}`);
      });

      audio.addEventListener("loadeddata", () => {
        console.log(`Audio data loaded: ${this.getCurrentSoundName()}`);
      });

      audio.addEventListener("stalled", () => {
        console.warn(`Audio loading stalled: ${this.getCurrentSoundName()}`);
      });

      audio.addEventListener("suspend", () => {
        console.log(`Audio loading suspended: ${this.getCurrentSoundName()}`);
      });

      audio.addEventListener("abort", () => {
        console.warn(`Audio loading aborted: ${this.getCurrentSoundName()}`);
      });

      // Set source after event listeners are set up
      audio.src = soundPath;

      return audio;
      
    } catch (error) {
      console.error("Failed to create audio element:", error);
      
      if (this.errorHandler) {
        this.errorHandler.handleAudioError(error, 'Create Audio Element');
      }
      
      return null;
    }
  }

  /**
   * Get detailed audio error information
   */
  getAudioErrorDetails(errorEvent) {
    if (!errorEvent.target || !errorEvent.target.error) {
      return 'Unknown audio error';
    }

    const error = errorEvent.target.error;
    const errorCodes = {
      1: 'MEDIA_ERR_ABORTED - Audio loading was aborted',
      2: 'MEDIA_ERR_NETWORK - Network error occurred while loading audio',
      3: 'MEDIA_ERR_DECODE - Audio decoding error',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Audio format not supported'
    };

    return errorCodes[error.code] || `Unknown error code: ${error.code}`;
  }

  /**
   * Handle audio looping with error recovery
   */
  async handleAudioLoop(audio) {
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.error("Loop playback error:", error);
      
      // Try to recover by recreating the audio element
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Attempting to recover audio loop (attempt ${this.retryCount})`);
        
        setTimeout(() => {
          this.play().catch(e => console.error('Recovery attempt failed:', e));
        }, 1000);
      } else {
        console.error('Max retry attempts reached, stopping audio');
        this.isPlaying = false;
        
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(
            'Audio playback failed after multiple attempts',
            'error',
            { duration: 5000 }
          );
        }
      }
    }
  }

  handleAudioError(errorEvent) {
    console.warn("Audio playback failed, attempting recovery");
    
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      console.log(`Attempting recovery (${this.retryCount}/${this.maxRetries})`);
      
      // Try next sound as recovery
      setTimeout(() => {
        this.nextRandomSound();
      }, 1000 * this.retryCount); // Increasing delay
      
    } else {
      console.error('Max retry attempts reached, entering fallback mode');
      this.isPlaying = false;
      this.retryCount = 0;
      
      if (this.errorHandler) {
        this.errorHandler.handleAudioError(
          new Error('Audio playback failed after multiple attempts'), 
          'Audio Playback'
        );
      }
    }
  }

  async play() {
    try {
      // Check if we're in fallback mode
      if (this.fallbackMode) {
        throw new Error('Audio manager in fallback mode - limited functionality');
      }

      // Clean up existing audio
      if (this.whiteNoiseAudio) {
        this.whiteNoiseAudio.pause();
        this.whiteNoiseAudio.src = '';
        this.whiteNoiseAudio = null;
      }

      // Create new audio element
      this.whiteNoiseAudio = this.createAudioElement();
      
      if (!this.whiteNoiseAudio) {
        throw new Error('Failed to create audio element');
      }

      // Check if audio context needs to be resumed (for autoplay policy)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (error) {
          console.warn('Could not resume audio context:', error);
        }
      }

      // Attempt to play with user gesture detection
      try {
        await this.whiteNoiseAudio.play();
      } catch (playError) {
        if (playError.name === 'NotAllowedError') {
          throw new Error('Audio blocked by browser. Please click to enable audio.');
        } else if (playError.name === 'NotSupportedError') {
          throw new Error('Audio format not supported by your browser.');
        } else {
          throw playError;
        }
      }

      this.isPlaying = true;
      this.retryCount = 0; // Reset retry count on success
      
      // Save settings (don't fail if this doesn't work)
      this.saveSettings().catch(error => {
        console.warn('Could not save audio settings:', error);
      });

      console.log(`White noise started: ${this.getCurrentSoundName()}`);
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          `Playing: ${this.getCurrentSoundName()}`,
          'success',
          { duration: 2000 }
        );
      }

      return {
        success: true,
        active: true,
        sound: this.getCurrentSoundName(),
        soundIndex: this.currentSoundIndex,
      };
      
    } catch (error) {
      console.error("Failed to start white noise:", error);
      this.isPlaying = false;
      
      if (this.errorHandler) {
        const result = this.errorHandler.handleAudioError(error, 'White Noise Play');
        return {
          success: false,
          error: result.error,
          errorType: result.errorType,
          canRetry: result.canRetry
        };
      } else {
        return { 
          success: false, 
          error: error.message,
          canRetry: !error.message.includes('not supported')
        };
      }
    }
  }

  async pause() {
    try {
      if (this.whiteNoiseAudio && this.isPlaying) {
        this.whiteNoiseAudio.pause();
      }

      this.isPlaying = false;
      
      // Save settings (don't fail if this doesn't work)
      this.saveSettings().catch(error => {
        console.warn('Could not save audio settings:', error);
      });

      console.log("White noise paused");
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Audio paused',
          'info',
          { duration: 1500 }
        );
      }

      return { success: true, active: false };
      
    } catch (error) {
      console.error("Failed to pause white noise:", error);
      
      // Force stop even if pause failed
      this.isPlaying = false;
      
      if (this.errorHandler) {
        this.errorHandler.handleAudioError(error, 'White Noise Pause');
      }
      
      return { 
        success: false, 
        error: error.message,
        active: false // Still report as inactive since we forced stop
      };
    }
  }

  async togglePlayPause() {
    if (this.isPlaying) {
      return await this.pause();
    } else {
      return await this.play();
    }
  }

  setVolume(newVolume) {
    this.volume = Math.max(0, Math.min(1, newVolume));

    if (this.whiteNoiseAudio) {
      this.whiteNoiseAudio.volume = this.volume;
    }

    this.saveSettings();
    return this.volume;
  }

  getVolume() {
    return this.volume;
  }

  nextRandomSound() {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this.availableSounds.length);
    } while (
      newIndex === this.currentSoundIndex &&
      this.availableSounds.length > 1
    );

    this.currentSoundIndex = newIndex;

    if (this.isPlaying) {
      this.play();
    } else {
      this.saveSettings();
    }

    return {
      success: true,
      sound: this.getCurrentSoundName(),
      soundIndex: this.currentSoundIndex,
    };
  }

  changeSound(soundKey) {
    const soundMap = {
      air: 0,
      ocean: 1,
      rain: 2,
      shower: 3,
      train: 4,
      water: 5,
      waterfall: 6,
      waves: 7,
    };

    if (soundKey in soundMap) {
      this.currentSoundIndex = soundMap[soundKey];

      if (this.isPlaying) {
        this.play();
      } else {
        this.saveSettings();
      }

      return {
        success: true,
        sound: this.getCurrentSoundName(),
        soundIndex: this.currentSoundIndex,
      };
    } else {
      return {
        success: false,
        error: "Invalid sound key",
      };
    }
  }

  getCurrentSoundName() {
    return this.soundNames[this.currentSoundIndex] || "Unknown Sound";
  }

  getCurrentSoundIndex() {
    return this.currentSoundIndex;
  }

  getCurrentSound() {
    const soundKeys = [
      "air",
      "ocean",
      "rain",
      "shower",
      "train",
      "water",
      "waterfall",
      "waves",
    ];
    return soundKeys[this.currentSoundIndex] || "rain";
  }

  getAvailableSounds() {
    return [
      "air",
      "ocean",
      "rain",
      "shower",
      "train",
      "water",
      "waterfall",
      "waves",
    ];
  }

  async startWhiteNoise(soundKey) {
    if (soundKey) {
      this.changeSound(soundKey);
    }
    return await this.play();
  }

  async stopWhiteNoise() {
    return await this.pause();
  }

  async toggleWhiteNoise() {
    return await this.togglePlayPause();
  }

  isActive() {
    return this.isPlaying;
  }

  get currentSound() {
    return this.getCurrentSound();
  }

  getStatus() {
    return {
      active: this.isPlaying,
      volume: this.volume,
      currentSound: this.getCurrentSoundName(),
      currentSoundIndex: this.currentSoundIndex,
      totalSounds: this.availableSounds.length,
    };
  }

  cleanup() {
    if (this.whiteNoiseAudio) {
      this.whiteNoiseAudio.pause();
      this.whiteNoiseAudio = null;
    }

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    // Performance optimization: Clean up cached audio elements
    this.audioCache.forEach((audio, index) => {
      if (audio && audio !== this.whiteNoiseAudio) {
        audio.pause();
        audio.src = ''; // Free memory
      }
    });
    
    this.audioCache.clear();
    this.preloadedSounds.clear();

    this.isPlaying = false;
  }

  /**
   * Performance monitoring: Get memory usage statistics
   */
  getPerformanceStats() {
    return {
      cachedSounds: this.audioCache.size,
      preloadedSounds: this.preloadedSounds.size,
      maxCacheSize: this.maxCacheSize,
      currentSoundIndex: this.currentSoundIndex,
      isPlaying: this.isPlaying,
      fallbackMode: this.fallbackMode,
      memoryOptimized: this.useOptimizedAudio
    };
  }
}

export default AudioManager;
