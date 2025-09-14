/**
 * Audio Manager - Simple audio management for wellness features
 * Handles white noise and notification sounds
 */

class AudioManager {
  constructor() {
    this.audioElements = new Map();
    this.currentVolume = 0.5;
    this.isActive = false;
    this.currentSound = null;
  }

  /**
   * Start white noise
   * @param {string} soundType - Type of sound to play
   * @returns {Promise<Object>} - Result object
   */
  async startWhiteNoise(soundType = 'rain') {
    try {
      if (!this.audioElements.has(soundType)) {
        const audio = new Audio(`/assets/sounds/${soundType}.mp3`);
        audio.loop = true;
        audio.volume = this.currentVolume;
        this.audioElements.set(soundType, audio);
      }
      
      const audio = this.audioElements.get(soundType);
      audio.volume = this.currentVolume;
      await audio.play();
      
      this.isActive = true;
      this.currentSound = soundType;
      
      return { success: true, active: true, sound: soundType };
    } catch (error) {
      console.error('Error starting white noise:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop white noise
   * @returns {Promise<Object>} - Result object
   */
  async stopWhiteNoise() {
    try {
      for (const audio of this.audioElements.values()) {
        audio.pause();
        audio.currentTime = 0;
      }
      
      this.isActive = false;
      this.currentSound = null;
      
      return { success: true, active: false };
    } catch (error) {
      console.error('Error stopping white noise:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle white noise
   * @param {string} soundType - Type of sound to play
   * @returns {Promise<Object>} - Result object
   */
  async toggleWhiteNoise(soundType = 'rain') {
    if (this.isActive) {
      return await this.stopWhiteNoise();
    } else {
      return await this.startWhiteNoise(soundType);
    }
  }

  /**
   * Set volume
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    for (const audio of this.audioElements.values()) {
      audio.volume = this.currentVolume;
    }
  }

  /**
   * Get current volume
   * @returns {number} - Current volume level
   */
  getVolume() {
    return this.currentVolume;
  }

  /**
   * Check if audio is playing
   * @returns {boolean} - Whether audio is active
   */
  isPlaying() {
    return this.isActive;
  }

  /**
   * Cleanup audio resources
   */
  cleanup() {
    for (const audio of this.audioElements.values()) {
      audio.pause();
      audio.src = '';
    }
    this.audioElements.clear();
    this.isActive = false;
    this.currentSound = null;
  }
}

// Export for use in popup and other contexts
if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
}