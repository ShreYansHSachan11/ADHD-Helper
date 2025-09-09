/**
 * Offscreen Audio Manager
 * Handles background audio playback for the extension
 */

class OffscreenAudioManager {
  constructor() {
    this.whiteNoiseAudio = null;
    this.currentSoundIndex = 2; // Default to rain
    this.isPlaying = false;
    this.volume = 0.5;
    this.retryCount = 0;
    this.maxRetries = 3;

    // Removed "Beach Waves" from the list (was index 7)
    this.availableSounds = [
      "assets/sounds/air-white-noise.mp3",
      "assets/sounds/ocean-white-noise.mp3",
      "assets/sounds/rain-white-noise.mp3",
      "assets/sounds/shower-white-noise.mp3",
      "assets/sounds/train-white-noise.mp3",
      "assets/sounds/water-white-noise.mp3",
      "assets/sounds/waterfall-white-noise.mp3",
    ];

    this.soundNames = [
      "Air Conditioner",
      "Ocean Waves",
      "Rain Drops",
      "Shower",
      "Train Journey",
      "Flowing Water",
      "Waterfall",
    ];

    // Initialize settings
    this.initializeSettings();

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    console.log("Offscreen Audio Manager initialized");
  }

  async initializeSettings() {
    try {
      const result = await chrome.storage.local.get("audioSettings");
      const settings = result.audioSettings || {
        whiteNoise: { enabled: false, volume: 0.5, currentSound: "rain" },
      };

      this.volume = Math.max(0, Math.min(1, settings.whiteNoise.volume || 0.5));
      this.currentSoundIndex = this.getSoundIndexFromKey(
        settings.whiteNoise.currentSound || "rain"
      );

      // Auto-resume if previously playing
      if (settings.whiteNoise.enabled) {
        console.log("Auto-resuming white noise from previous session");
        setTimeout(() => {
          this.play().catch((error) => {
            console.warn("Failed to auto-resume audio:", error);
          });
        }, 1000); // Small delay to ensure everything is loaded
      }
    } catch (error) {
      console.error("Failed to load audio settings:", error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case "AUDIO_PLAY":
          const playResult = await this.play(message.soundKey);
          sendResponse(playResult);
          break;

        case "AUDIO_PAUSE":
          const pauseResult = await this.pause();
          sendResponse(pauseResult);
          break;

        case "AUDIO_TOGGLE":
          const toggleResult = await this.togglePlayPause();
          sendResponse(toggleResult);
          break;

        case "AUDIO_SET_VOLUME":
          const volumeResult = this.setVolume(message.volume);
          sendResponse({ success: true, volume: volumeResult });
          break;

        case "AUDIO_NEXT_SOUND":
          const nextResult = this.nextRandomSound();
          sendResponse(nextResult);
          break;

        case "AUDIO_CHANGE_SOUND":
          const changeResult = this.changeSound(message.soundKey);
          sendResponse(changeResult);
          break;

        case "AUDIO_GET_STATUS":
          const status = this.getStatus();
          sendResponse({ success: true, data: status });
          break;

        default:
          sendResponse({ success: false, error: "Unknown audio message type" });
      }
    } catch (error) {
      console.error("Error handling audio message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  getSoundIndexFromKey(soundKey) {
    const soundMap = {
      air: 0,
      ocean: 1,
      rain: 2,
      shower: 3,
      train: 4,
      water: 5,
      waterfall: 6,
    };
    return soundMap[soundKey] !== undefined ? soundMap[soundKey] : 2;
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
    ];
    return soundKeys[this.currentSoundIndex] || "rain";
  }

  getCurrentSoundName() {
    return this.soundNames[this.currentSoundIndex] || "Unknown Sound";
  }

  getAudioPath(soundIndex) {
    if (soundIndex < 0 || soundIndex >= this.availableSounds.length) {
      soundIndex = 2; // Default to rain
    }

    const relativePath = this.availableSounds[soundIndex];

    // Convert to Chrome extension URL
    if (chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(relativePath);
    }

    return relativePath;
  }

  createAudioElement(soundKey) {
    try {
      // Update sound index if provided
      if (soundKey) {
        this.currentSoundIndex = this.getSoundIndexFromKey(soundKey);
      }

      const soundPath = this.getAudioPath(this.currentSoundIndex);
      const audio = new Audio();

      // Set up audio properties
      audio.loop = true;
      audio.volume = this.volume;
      audio.preload = "auto";

      // Set up event listeners - removed user notifications
      audio.addEventListener("error", (e) => {
        console.error("Audio loading error:", e);
        this.handleAudioError();
      });

      audio.addEventListener("canplaythrough", () => {
        console.log(`Audio loaded: ${this.getCurrentSoundName()}`);
        this.retryCount = 0;
      });

      audio.addEventListener("ended", () => {
        if (this.isPlaying) {
          this.handleAudioLoop(audio);
        }
      });

      audio.src = soundPath;
      return audio;
    } catch (error) {
      console.error("Failed to create audio element:", error);
      return null;
    }
  }

  async handleAudioLoop(audio) {
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.error("Loop playback error:", error);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => {
          this.play().catch((e) => console.error("Recovery failed:", e));
        }, 1000);
      }
    }
  }

  handleAudioError() {
    this.retryCount++;
    if (this.retryCount <= this.maxRetries) {
      console.log(
        `Attempting recovery (${this.retryCount}/${this.maxRetries})`
      );
      setTimeout(() => {
        this.nextRandomSound();
      }, 1000 * this.retryCount);
    } else {
      console.error("Max retry attempts reached");
      this.isPlaying = false;
      this.retryCount = 0;
    }
  }

  async play(soundKey) {
    try {
      // Clean up existing audio
      if (this.whiteNoiseAudio) {
        this.whiteNoiseAudio.pause();
        this.whiteNoiseAudio.src = "";
        this.whiteNoiseAudio = null;
      }

      // Create new audio element
      this.whiteNoiseAudio = this.createAudioElement(soundKey);
      if (!this.whiteNoiseAudio) {
        throw new Error("Failed to create audio element");
      }

      // Attempt to play
      await this.whiteNoiseAudio.play();
      this.isPlaying = true;
      this.retryCount = 0;

      // Save settings
      await this.saveSettings();

      console.log(`White noise started: ${this.getCurrentSoundName()}`);

      // Return success without showing user notification
      return {
        success: true,
        active: true,
        sound: this.getCurrentSoundName(),
        soundIndex: this.currentSoundIndex,
      };
    } catch (error) {
      console.error("Failed to start white noise:", error);
      this.isPlaying = false;
      return {
        success: false,
        error: error.message,
        canRetry: !error.message.includes("not supported"),
      };
    }
  }

  async pause() {
    try {
      if (this.whiteNoiseAudio && this.isPlaying) {
        this.whiteNoiseAudio.pause();
      }
      this.isPlaying = false;
      await this.saveSettings();
      console.log("White noise paused");
      return { success: true, active: false };
    } catch (error) {
      console.error("Failed to pause white noise:", error);
      this.isPlaying = false;
      return { success: false, error: error.message, active: false };
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

    // Return success without showing user notification
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
      return { success: false, error: "Invalid sound key" };
    }
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

  async saveSettings() {
    try {
      const settings = {
        whiteNoise: {
          enabled: this.isPlaying,
          volume: this.volume,
          currentSound: this.getCurrentSound(),
        },
      };
      await chrome.storage.local.set({ audioSettings: settings });
    } catch (error) {
      console.error("Failed to save audio settings:", error);
    }
  }

  cleanup() {
    if (this.whiteNoiseAudio) {
      this.whiteNoiseAudio.pause();
      this.whiteNoiseAudio = null;
    }
    this.isPlaying = false;
  }
}

// Initialize the offscreen audio manager
const offscreenAudioManager = new OffscreenAudioManager();

// Keep the offscreen document alive
console.log("Offscreen audio document loaded and ready");
