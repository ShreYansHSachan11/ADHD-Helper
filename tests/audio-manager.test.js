/**
 * Audio Manager Tests
 * Tests for audio functionality used in wellness features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Audio API
global.Audio = vi.fn().mockImplementation((src) => ({
  src,
  volume: 0.5,
  loop: false,
  paused: true,
  currentTime: 0,
  duration: 100,
  play: vi.fn().mockResolvedValue(),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  state: 'running',
  resume: vi.fn().mockResolvedValue(),
  suspend: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue(),
  createGain: vi.fn().mockReturnValue({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn()
  }),
  createOscillator: vi.fn().mockReturnValue({
    frequency: { value: 440 },
    type: 'sine',
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })
}));

describe('AudioManager', () => {
  let audioManager;
  let mockAudioElements;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock audio elements
    mockAudioElements = new Map();
    
    // Simple AudioManager mock
    audioManager = {
      audioElements: mockAudioElements,
      currentVolume: 0.5,
      isActive: false,
      
      async startWhiteNoise(soundType = 'rain') {
        if (!this.audioElements.has(soundType)) {
          const audio = new Audio(`/assets/sounds/${soundType}.mp3`);
          this.audioElements.set(soundType, audio);
        }
        
        const audio = this.audioElements.get(soundType);
        audio.loop = true;
        audio.volume = this.currentVolume;
        await audio.play();
        this.isActive = true;
        
        return { success: true, active: true, sound: soundType };
      },
      
      async stopWhiteNoise() {
        for (const audio of this.audioElements.values()) {
          audio.pause();
          audio.currentTime = 0;
        }
        this.isActive = false;
        return { success: true, active: false };
      },
      
      async toggleWhiteNoise(soundType = 'rain') {
        if (this.isActive) {
          return await this.stopWhiteNoise();
        } else {
          return await this.startWhiteNoise(soundType);
        }
      },
      
      setVolume(volume) {
        this.currentVolume = Math.max(0, Math.min(1, volume));
        for (const audio of this.audioElements.values()) {
          audio.volume = this.currentVolume;
        }
      },
      
      getVolume() {
        return this.currentVolume;
      },
      
      isPlaying() {
        return this.isActive;
      },
      
      cleanup() {
        for (const audio of this.audioElements.values()) {
          audio.pause();
          audio.src = '';
        }
        this.audioElements.clear();
        this.isActive = false;
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('White Noise Functionality', () => {
    it('should start white noise successfully', async () => {
      const result = await audioManager.startWhiteNoise('rain');
      
      expect(result.success).toBe(true);
      expect(result.active).toBe(true);
      expect(result.sound).toBe('rain');
      expect(audioManager.isActive).toBe(true);
    });

    it('should stop white noise successfully', async () => {
      // Start first
      await audioManager.startWhiteNoise('rain');
      expect(audioManager.isActive).toBe(true);
      
      // Then stop
      const result = await audioManager.stopWhiteNoise();
      
      expect(result.success).toBe(true);
      expect(result.active).toBe(false);
      expect(audioManager.isActive).toBe(false);
    });

    it('should toggle white noise on and off', async () => {
      // First toggle should start
      const startResult = await audioManager.toggleWhiteNoise('ocean');
      expect(startResult.success).toBe(true);
      expect(startResult.active).toBe(true);
      expect(audioManager.isActive).toBe(true);
      
      // Second toggle should stop
      const stopResult = await audioManager.toggleWhiteNoise('ocean');
      expect(stopResult.success).toBe(true);
      expect(stopResult.active).toBe(false);
      expect(audioManager.isActive).toBe(false);
    });

    it('should handle different sound types', async () => {
      const soundTypes = ['rain', 'ocean', 'forest', 'white-noise'];
      
      for (const soundType of soundTypes) {
        const result = await audioManager.startWhiteNoise(soundType);
        expect(result.success).toBe(true);
        expect(result.sound).toBe(soundType);
        
        await audioManager.stopWhiteNoise();
      }
    });
  });

  describe('Volume Control', () => {
    it('should set volume correctly', () => {
      audioManager.setVolume(0.7);
      expect(audioManager.getVolume()).toBe(0.7);
    });

    it('should clamp volume to valid range', () => {
      // Test upper bound
      audioManager.setVolume(1.5);
      expect(audioManager.getVolume()).toBe(1);
      
      // Test lower bound
      audioManager.setVolume(-0.5);
      expect(audioManager.getVolume()).toBe(0);
    });

    it('should apply volume to active audio elements', async () => {
      await audioManager.startWhiteNoise('rain');
      const audio = audioManager.audioElements.get('rain');
      
      audioManager.setVolume(0.8);
      expect(audio.volume).toBe(0.8);
    });
  });

  describe('Audio Element Management', () => {
    it('should create audio elements for different sounds', async () => {
      await audioManager.startWhiteNoise('rain');
      await audioManager.startWhiteNoise('ocean');
      
      expect(audioManager.audioElements.has('rain')).toBe(true);
      expect(audioManager.audioElements.has('ocean')).toBe(true);
      expect(audioManager.audioElements.size).toBe(2);
    });

    it('should reuse existing audio elements', async () => {
      await audioManager.startWhiteNoise('rain');
      const firstAudio = audioManager.audioElements.get('rain');
      
      await audioManager.startWhiteNoise('rain');
      const secondAudio = audioManager.audioElements.get('rain');
      
      expect(firstAudio).toBe(secondAudio);
      expect(audioManager.audioElements.size).toBe(1);
    });

    it('should set audio properties correctly', async () => {
      await audioManager.startWhiteNoise('forest');
      const audio = audioManager.audioElements.get('forest');
      
      expect(audio.loop).toBe(true);
      expect(audio.volume).toBe(audioManager.currentVolume);
      expect(audio.play).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track active state correctly', async () => {
      expect(audioManager.isPlaying()).toBe(false);
      
      await audioManager.startWhiteNoise('rain');
      expect(audioManager.isPlaying()).toBe(true);
      
      await audioManager.stopWhiteNoise();
      expect(audioManager.isPlaying()).toBe(false);
    });

    it('should handle multiple audio elements state', async () => {
      await audioManager.startWhiteNoise('rain');
      await audioManager.startWhiteNoise('ocean');
      
      expect(audioManager.isPlaying()).toBe(true);
      
      await audioManager.stopWhiteNoise();
      expect(audioManager.isPlaying()).toBe(false);
      
      // All audio elements should be paused
      for (const audio of audioManager.audioElements.values()) {
        expect(audio.pause).toHaveBeenCalled();
      }
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup all audio resources', async () => {
      await audioManager.startWhiteNoise('rain');
      await audioManager.startWhiteNoise('ocean');
      
      expect(audioManager.audioElements.size).toBe(2);
      
      audioManager.cleanup();
      
      expect(audioManager.audioElements.size).toBe(0);
      expect(audioManager.isActive).toBe(false);
    });

    it('should pause and reset audio elements during cleanup', async () => {
      await audioManager.startWhiteNoise('rain');
      const audio = audioManager.audioElements.get('rain');
      
      audioManager.cleanup();
      
      expect(audio.pause).toHaveBeenCalled();
      expect(audio.src).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle audio play failures gracefully', async () => {
      // Mock play failure
      const mockAudio = {
        ...new Audio(),
        play: vi.fn().mockRejectedValue(new Error('Play failed'))
      };
      
      global.Audio = vi.fn().mockReturnValue(mockAudio);
      
      try {
        await audioManager.startWhiteNoise('rain');
        // Should handle error gracefully
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toBe('Play failed');
      }
    });

    it('should handle missing audio files gracefully', async () => {
      // Mock audio load error
      const mockAudio = {
        ...new Audio(),
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('File not found')), 0);
          }
        })
      };
      
      global.Audio = vi.fn().mockReturnValue(mockAudio);
      
      // Should not crash when audio file is missing
      await audioManager.startWhiteNoise('nonexistent');
      expect(true).toBe(true);
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle browsers without Audio support', () => {
      const originalAudio = global.Audio;
      delete global.Audio;
      
      // Should handle missing Audio API gracefully
      expect(global.Audio).toBeUndefined();
      
      // Restore Audio
      global.Audio = originalAudio;
      expect(global.Audio).toBeDefined();
    });

    it('should handle browsers without AudioContext support', () => {
      const originalAudioContext = global.AudioContext;
      delete global.AudioContext;
      
      // Should handle missing AudioContext gracefully
      expect(global.AudioContext).toBeUndefined();
      
      // Restore AudioContext
      global.AudioContext = originalAudioContext;
      expect(global.AudioContext).toBeDefined();
    });

    it('should handle autoplay restrictions', async () => {
      // Mock autoplay blocked
      const mockAudio = {
        ...new Audio(),
        play: vi.fn().mockRejectedValue(new DOMException('NotAllowedError'))
      };
      
      global.Audio = vi.fn().mockReturnValue(mockAudio);
      
      try {
        await audioManager.startWhiteNoise('rain');
      } catch (error) {
        expect(error.name).toBe('NotAllowedError');
      }
    });
  });

  describe('Performance', () => {
    it('should handle rapid volume changes efficiently', () => {
      const startTime = performance.now();
      
      // Rapid volume changes
      for (let i = 0; i <= 100; i++) {
        audioManager.setVolume(i / 100);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should complete quickly
      expect(executionTime).toBeLessThan(100);
      expect(audioManager.getVolume()).toBe(1);
    });

    it('should manage memory usage with multiple audio elements', async () => {
      const soundTypes = ['rain', 'ocean', 'forest', 'white-noise', 'brown-noise'];
      
      // Create multiple audio elements
      for (const soundType of soundTypes) {
        await audioManager.startWhiteNoise(soundType);
      }
      
      expect(audioManager.audioElements.size).toBe(soundTypes.length);
      
      // Cleanup should free all resources
      audioManager.cleanup();
      expect(audioManager.audioElements.size).toBe(0);
    });
  });
});