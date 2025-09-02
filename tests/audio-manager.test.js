// Audio Manager Tests

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// Mock Audio API
global.Audio = vi.fn().mockImplementation((src) => {
  const mockAudio = {
    src,
    loop: false,
    volume: 0.5,
    currentTime: 0,
    play: vi.fn().mockResolvedValue(),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return mockAudio;
});

describe("AudioManager", () => {
  let AudioManager;
  let audioManager;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock storage responses
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue();

    // Import the AudioManager
    AudioManager = (await import("../services/audio-manager.js")).default;
    audioManager = new AudioManager();
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.cleanup();
    }
  });

  describe("Initialization", () => {
    it("should initialize with default settings", () => {
      expect(audioManager.isPlaying).toBe(false);
      expect(audioManager.volume).toBe(0.5);
      expect(audioManager.currentSound).toBe("rain");
      expect(audioManager.defaultSound).toBe("rain");
    });

    it("should have all expected sound files", () => {
      const expectedSounds = [
        "air",
        "ocean",
        "rain",
        "shower",
        "train",
        "water",
        "waterfall",
        "waves",
      ];

      const availableSounds = audioManager.getAvailableSounds();
      expectedSounds.forEach((sound) => {
        expect(availableSounds).toContain(sound);
      });
    });

    it("should load settings from storage", async () => {
      const mockSettings = {
        audioSettings: {
          whiteNoise: {
            enabled: true,
            volume: 0.7,
            currentSound: "ocean",
          },
        },
      };

      chrome.storage.local.get.mockResolvedValue(mockSettings);

      const newAudioManager = new AudioManager();
      await newAudioManager.loadSettings();

      expect(newAudioManager.volume).toBe(0.7);
      expect(newAudioManager.currentSound).toBe("ocean");
    });
  });

  describe("Sound Management", () => {
    it("should create audio element with correct properties", () => {
      const audio = audioManager.createAudioElement("rain");

      expect(Audio).toHaveBeenCalledWith("assets/sounds/rain-white-noise.mp3");
      expect(audio.loop).toBe(true);
      expect(audio.volume).toBe(0.5);
    });

    it("should fallback to default sound for invalid sound key", () => {
      const audio = audioManager.createAudioElement("invalid-sound");

      expect(Audio).toHaveBeenCalledWith("assets/sounds/rain-white-noise.mp3");
    });

    it("should change sound correctly", () => {
      const result = audioManager.changeSound("ocean");

      expect(result.success).toBe(true);
      expect(result.sound).toBe("ocean");
      expect(audioManager.currentSound).toBe("ocean");
    });

    it("should reject invalid sound keys", () => {
      const result = audioManager.changeSound("invalid");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid sound");
    });
  });

  describe("Volume Control", () => {
    it("should set volume within valid range", () => {
      audioManager.setVolume(0.8);
      expect(audioManager.volume).toBe(0.8);

      audioManager.setVolume(1.5); // Above max
      expect(audioManager.volume).toBe(1);

      audioManager.setVolume(-0.2); // Below min
      expect(audioManager.volume).toBe(0);
    });

    it("should return current volume", () => {
      audioManager.setVolume(0.6);
      expect(audioManager.getVolume()).toBe(0.6);
    });

    it("should update audio element volume when playing", async () => {
      await audioManager.startWhiteNoise();
      const mockAudio = audioManager.whiteNoiseAudio;

      audioManager.setVolume(0.3);
      expect(mockAudio.volume).toBe(0.3);
    });
  });

  describe("Playback Control", () => {
    it("should start white noise successfully", async () => {
      const result = await audioManager.startWhiteNoise();

      expect(result.success).toBe(true);
      expect(result.active).toBe(true);
      expect(audioManager.isPlaying).toBe(true);
      expect(audioManager.whiteNoiseAudio.play).toHaveBeenCalled();
    });

    it("should stop white noise successfully", async () => {
      await audioManager.startWhiteNoise();
      const result = await audioManager.stopWhiteNoise();

      expect(result.success).toBe(true);
      expect(result.active).toBe(false);
      expect(audioManager.isPlaying).toBe(false);
    });

    it("should toggle white noise correctly", async () => {
      // Start from stopped state
      expect(audioManager.isPlaying).toBe(false);

      const startResult = await audioManager.toggleWhiteNoise();
      expect(startResult.active).toBe(true);
      expect(audioManager.isPlaying).toBe(true);

      const stopResult = await audioManager.toggleWhiteNoise();
      expect(stopResult.active).toBe(false);
      expect(audioManager.isPlaying).toBe(false);
    });

    it("should handle playback errors gracefully", async () => {
      // Mock play method to reject
      Audio.mockImplementation((src) => ({
        src,
        loop: false,
        volume: 0.5,
        currentTime: 0,
        play: vi.fn().mockRejectedValue(new Error("Playback failed")),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const result = await audioManager.startWhiteNoise();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Playback failed");
      expect(audioManager.isPlaying).toBe(false);
    });
  });

  describe("Settings Persistence", () => {
    it("should save settings when starting white noise", async () => {
      await audioManager.startWhiteNoise("ocean");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        audioSettings: {
          whiteNoise: {
            enabled: true,
            volume: 0.5,
            currentSound: "ocean",
          },
        },
      });
    });

    it("should save settings when stopping white noise", async () => {
      await audioManager.startWhiteNoise();
      await audioManager.stopWhiteNoise();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        audioSettings: {
          whiteNoise: {
            enabled: false,
            volume: 0.5,
            currentSound: "rain",
          },
        },
      });
    });

    it("should save settings when changing volume", () => {
      audioManager.setVolume(0.7);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        audioSettings: {
          whiteNoise: {
            enabled: false,
            volume: 0.7,
            currentSound: "rain",
          },
        },
      });
    });
  });

  describe("Status Methods", () => {
    it("should return correct active status", async () => {
      expect(audioManager.isActive()).toBe(false);

      await audioManager.startWhiteNoise();
      expect(audioManager.isActive()).toBe(true);

      await audioManager.stopWhiteNoise();
      expect(audioManager.isActive()).toBe(false);
    });

    it("should return current sound", () => {
      expect(audioManager.getCurrentSound()).toBe("rain");

      audioManager.changeSound("ocean");
      expect(audioManager.getCurrentSound()).toBe("ocean");
    });

    it("should return available sounds list", () => {
      const sounds = audioManager.getAvailableSounds();
      expect(Array.isArray(sounds)).toBe(true);
      expect(sounds.length).toBeGreaterThan(0);
      expect(sounds).toContain("rain");
      expect(sounds).toContain("ocean");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources properly", async () => {
      await audioManager.startWhiteNoise();
      const mockAudio = audioManager.whiteNoiseAudio;

      audioManager.cleanup();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioManager.whiteNoiseAudio).toBe(null);
      expect(audioManager.isPlaying).toBe(false);
    });

    it("should clear fade intervals on cleanup", () => {
      audioManager.fadeInterval = setInterval(() => {}, 100);
      const intervalId = audioManager.fadeInterval;

      audioManager.cleanup();

      expect(audioManager.fadeInterval).toBe(null);
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      chrome.storage.local.get.mockRejectedValue(new Error("Storage error"));

      await expect(audioManager.loadSettings()).resolves.not.toThrow();
    });

    it("should handle save errors gracefully", async () => {
      chrome.storage.local.set.mockRejectedValue(new Error("Save error"));

      await expect(audioManager.saveSettings()).resolves.not.toThrow();
    });
  });
});
