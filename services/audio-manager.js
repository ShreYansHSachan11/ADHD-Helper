class AudioManager {
  constructor() {
    this.whiteNoiseAudio = null;
    this.currentSoundIndex = 2;
    this.isPlaying = false;
    this.volume = 0.5;
    this.defaultSound = "rain";
    this.fadeInterval = null;

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

    this.initializeSettings();
  }

  initializeSettings() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      this.loadSettings().catch((error) => {
        console.error("Failed to initialize settings:", error);
      });
    }
  }

  async loadSettings() {
    try {
      if (typeof chrome === "undefined" || !chrome.storage) return;

      const result = await chrome.storage.local.get("audioSettings");
      const settings = result.audioSettings || {
        whiteNoise: { enabled: false, volume: 0.5, currentSound: "rain" },
      };

      this.volume = settings.whiteNoise.volume || 0.5;

      if (settings.whiteNoise.currentSound) {
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
        this.currentSoundIndex =
          soundMap[settings.whiteNoise.currentSound] || 2;
      } else {
        this.currentSoundIndex = 2;
      }

      if (this.currentSoundIndex >= this.availableSounds.length) {
        this.currentSoundIndex = 2;
      }

      if (settings.whiteNoise.enabled) {
        this.play();
      }
    } catch (error) {
      console.error("Failed to load audio settings:", error);
    }
  }

  async saveSettings() {
    try {
      if (typeof chrome === "undefined" || !chrome.storage) return;

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

  createAudioElement(soundKey) {
    if (soundKey) {
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
      } else {
        this.currentSoundIndex = 2;
      }
    }

    try {
      const soundPath = this.availableSounds[this.currentSoundIndex];
      const audio = new Audio(soundPath);

      audio.loop = true;
      audio.volume = this.volume;
      audio.preload = "auto";

      audio.addEventListener("error", (e) => {
        console.error("Audio loading error for:", soundPath, e);
        this.handleAudioError();
      });

      audio.addEventListener("canplaythrough", () => {
        console.log(`Audio loaded successfully: ${this.getCurrentSoundName()}`);
      });

      audio.addEventListener("ended", () => {
        if (this.isPlaying) {
          audio.currentTime = 0;
          audio.play().catch((e) => console.error("Loop playback error:", e));
        }
      });

      return audio;
    } catch (error) {
      console.error("Failed to create audio element:", error);
      return null;
    }
  }

  handleAudioError() {
    console.warn("Audio playback failed, trying next sound");
    this.nextRandomSound();
  }

  async play() {
    try {
      if (this.whiteNoiseAudio) {
        this.whiteNoiseAudio.pause();
        this.whiteNoiseAudio = null;
      }

      this.whiteNoiseAudio = this.createAudioElement();
      await this.whiteNoiseAudio.play();
      this.isPlaying = true;
      await this.saveSettings();

      console.log(`White noise started: ${this.getCurrentSoundName()}`);
      return {
        success: true,
        active: true,
        sound: this.getCurrentSoundName(),
        soundIndex: this.currentSoundIndex,
      };
    } catch (error) {
      console.error("Failed to start white noise:", error);
      this.isPlaying = false;
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
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

    this.isPlaying = false;
  }
}

export default AudioManager;
