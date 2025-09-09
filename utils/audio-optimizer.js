/**
 * Audio Optimization Utility
 * Provides functions to optimize audio files for web extension use
 */

class AudioOptimizer {
  constructor() {
    this.targetBitrate = 64; // kbps - good balance for white noise
    this.targetSampleRate = 22050; // Hz - sufficient for white noise
    this.maxFileSizeKB = 2048; // 2MB max per file
    this.compressionQuality = 0.7; // 0-1 scale
  }

  /**
   * Get optimized audio settings for different types of sounds
   */
  getOptimizedSettings(soundType) {
    const settings = {
      whiteNoise: {
        bitrate: 64,
        sampleRate: 22050,
        channels: 1, // Mono for white noise
        duration: 30, // Loop 30 second clips
        format: 'mp3'
      },
      notification: {
        bitrate: 96,
        sampleRate: 44100,
        channels: 1,
        duration: 2, // Short notification sounds
        format: 'mp3'
      },
      ambient: {
        bitrate: 80,
        sampleRate: 32000,
        channels: 2, // Stereo for ambient sounds
        duration: 60,
        format: 'mp3'
      }
    };

    return settings[soundType] || settings.whiteNoise;
  }

  /**
   * Calculate optimal file size for looping audio
   */
  calculateOptimalSize(durationSeconds, bitrate, sampleRate, channels = 1) {
    // Calculate theoretical file size
    const bitsPerSecond = bitrate * 1000;
    const theoreticalSize = (durationSeconds * bitsPerSecond) / 8; // bytes
    
    // Add overhead for MP3 format (approximately 10-15%)
    const withOverhead = theoreticalSize * 1.15;
    
    return {
      theoreticalKB: Math.round(theoreticalSize / 1024),
      estimatedKB: Math.round(withOverhead / 1024),
      isOptimal: withOverhead < (this.maxFileSizeKB * 1024)
    };
  }

  /**
   * Generate optimized audio file specifications
   */
  generateOptimizedSpecs() {
    const sounds = [
      'air-white-noise',
      'ocean-white-noise', 
      'rain-white-noise',
      'shower-white-noise',
      'train-white-noise',
      'water-white-noise',
      'waterfall-white-noise',
      'waves-white-noise'
    ];

    const specs = {};
    
    sounds.forEach(sound => {
      const settings = this.getOptimizedSettings('whiteNoise');
      const sizeCalc = this.calculateOptimalSize(
        settings.duration,
        settings.bitrate,
        settings.sampleRate,
        settings.channels
      );

      specs[sound] = {
        originalPath: `assets/sounds/${sound}.mp3`,
        optimizedPath: `assets/sounds/optimized/${sound}.mp3`,
        settings: settings,
        targetSize: sizeCalc,
        compressionCommand: this.generateCompressionCommand(sound, settings)
      };
    });

    // Add notification sound
    const notificationSettings = this.getOptimizedSettings('notification');
    const notificationSize = this.calculateOptimalSize(
      notificationSettings.duration,
      notificationSettings.bitrate,
      notificationSettings.sampleRate
    );

    specs['notification'] = {
      originalPath: 'assets/sounds/notification.mp3',
      optimizedPath: 'assets/sounds/optimized/notification.mp3',
      settings: notificationSettings,
      targetSize: notificationSize,
      compressionCommand: this.generateCompressionCommand('notification', notificationSettings)
    };

    return specs;
  }

  /**
   * Generate FFmpeg command for audio compression
   */
  generateCompressionCommand(filename, settings) {
    return `ffmpeg -i "assets/sounds/${filename}.mp3" ` +
           `-acodec mp3 ` +
           `-ab ${settings.bitrate}k ` +
           `-ar ${settings.sampleRate} ` +
           `-ac ${settings.channels} ` +
           `-t ${settings.duration} ` +
           `-y "assets/sounds/optimized/${filename}.mp3"`;
  }

  /**
   * Create optimized placeholder files (for development)
   */
  createOptimizedPlaceholders() {
    const specs = this.generateOptimizedSpecs();
    const placeholders = {};

    Object.keys(specs).forEach(soundName => {
      const spec = specs[soundName];
      placeholders[soundName] = {
        path: spec.optimizedPath,
        size: `${spec.targetSize.estimatedKB}KB`,
        settings: spec.settings,
        note: 'Optimized for web extension use'
      };
    });

    return placeholders;
  }

  /**
   * Validate audio file for web extension use
   */
  validateAudioFile(filePath, maxSizeKB = 2048) {
    // This would be implemented with actual file system access
    // For now, return validation criteria
    return {
      criteria: {
        maxSize: `${maxSizeKB}KB`,
        recommendedBitrate: '64-96 kbps',
        recommendedSampleRate: '22050-44100 Hz',
        recommendedChannels: '1 (mono) for white noise, 2 (stereo) for ambient',
        recommendedDuration: '30-60 seconds for looping sounds'
      },
      tips: [
        'Use mono audio for white noise to reduce file size',
        'Loop shorter clips rather than long recordings',
        'Use lower bitrates (64kbps) for simple white noise',
        'Consider OGG format as fallback for better compression'
      ]
    };
  }
}

export default AudioOptimizer;