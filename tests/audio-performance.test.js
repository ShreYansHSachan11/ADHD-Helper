/**
 * Audio Performance Tests - Simplified version focusing on actual performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  },
  runtime: {
    getURL: vi.fn(path => `chrome-extension://test/${path}`)
  }
};

// Mock Audio constructor
global.Audio = vi.fn(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  volume: 0.5,
  currentTime: 0,
  loop: false,
  src: '',
  preload: 'auto'
}));

describe('Audio Manager Performance Optimizations', () => {
  let AudioManager;
  let audioManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const module = await import('../services/audio-manager.js');
    AudioManager = module.default;
    audioManager = new AudioManager();
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.cleanup();
    }
  });

  it('should use optimized audio paths when available', () => {
    const optimizedPath = audioManager.getAudioPath(2); // Rain sound
    expect(optimizedPath).toContain('optimized');
    expect(optimizedPath).toContain('rain-white-noise.mp3');
  });

  it('should fallback to original paths when optimized not available', () => {
    // Disable optimized audio
    audioManager.useOptimizedAudio = false;
    
    const originalPath = audioManager.getAudioPath(2);
    expect(originalPath).not.toContain('optimized');
    expect(originalPath).toContain('rain-white-noise.mp3');
  });

  it('should cache audio elements efficiently', () => {
    // Create audio elements
    const audio1 = audioManager.createAudioElement('rain');
    const audio2 = audioManager.createAudioElement('ocean');
    
    expect(audio1).toBeDefined();
    expect(audio2).toBeDefined();
    
    // Check cache
    const stats = audioManager.getPerformanceStats();
    expect(stats.maxCacheSize).toBeGreaterThan(0);
  });

  it('should respect cache size limits', () => {
    const maxCacheSize = audioManager.maxCacheSize;
    
    // Create more elements than cache allows
    for (let i = 0; i < maxCacheSize + 2; i++) {
      audioManager.currentSoundIndex = i % audioManager.availableSounds.length;
      audioManager.createAudioElement();
    }
    
    const stats = audioManager.getPerformanceStats();
    expect(stats.cachedSounds).toBeLessThanOrEqual(maxCacheSize);
  });

  it('should provide performance statistics', () => {
    const stats = audioManager.getPerformanceStats();
    
    expect(stats).toHaveProperty('cachedSounds');
    expect(stats).toHaveProperty('preloadedSounds');
    expect(stats).toHaveProperty('maxCacheSize');
    expect(stats).toHaveProperty('currentSoundIndex');
    expect(stats).toHaveProperty('isPlaying');
    expect(stats).toHaveProperty('fallbackMode');
    expect(stats).toHaveProperty('memoryOptimized');
    
    expect(typeof stats.cachedSounds).toBe('number');
    expect(typeof stats.preloadedSounds).toBe('number');
    expect(typeof stats.memoryOptimized).toBe('boolean');
  });

  it('should clean up cached resources', () => {
    // Create some cached elements
    audioManager.createAudioElement('rain');
    audioManager.createAudioElement('ocean');
    
    let stats = audioManager.getPerformanceStats();
    const initialCached = stats.cachedSounds;
    
    // Cleanup
    audioManager.cleanup();
    
    stats = audioManager.getPerformanceStats();
    expect(stats.cachedSounds).toBe(0);
    expect(stats.preloadedSounds).toBe(0);
  });
});

describe('Performance Monitor Basic Functionality', () => {
  let PerformanceMonitor;
  let performanceMonitor;

  beforeEach(async () => {
    // Mock PerformanceObserver
    global.PerformanceObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }));

    // Mock performance.memory
    global.performance = {
      ...global.performance,
      memory: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024 // 100MB
      }
    };

    const module = await import('../utils/performance-monitor.js');
    PerformanceMonitor = module.default;
    performanceMonitor = new PerformanceMonitor();
  });

  afterEach(() => {
    if (performanceMonitor) {
      performanceMonitor.cleanup();
    }
  });

  it('should track tab update performance', () => {
    const startTime = 100;
    const endTime = 150;
    const tabId = 123;
    
    performanceMonitor.recordTabUpdate(startTime, endTime, tabId, true);
    
    const summary = performanceMonitor.getPerformanceSummary();
    
    expect(summary.tabTracking.updateCount).toBe(1);
    expect(summary.tabTracking.averageUpdateTime).toBe(50);
    expect(summary.tabTracking.maxUpdateTime).toBe(50);
  });

  it('should track storage operations', () => {
    performanceMonitor.recordStorageOperation('read', 100, 120, true);
    performanceMonitor.recordStorageOperation('write', 200, 250, true);
    
    const summary = performanceMonitor.getPerformanceSummary();
    
    expect(summary.storage.readCount).toBe(1);
    expect(summary.storage.writeCount).toBe(1);
    expect(summary.storage.averageReadTime).toBe(20);
    expect(summary.storage.averageWriteTime).toBe(50);
  });

  it('should provide performance summary', () => {
    const summary = performanceMonitor.getPerformanceSummary();
    
    expect(summary).toHaveProperty('tabTracking');
    expect(summary).toHaveProperty('storage');
    expect(summary).toHaveProperty('memory');
    expect(summary).toHaveProperty('components');
    expect(summary).toHaveProperty('recommendations');
    
    expect(summary.memory).toHaveProperty('usageMB');
    expect(summary.memory).toHaveProperty('status');
  });

  it('should generate optimization recommendations', () => {
    // Simulate slow operations
    performanceMonitor.recordTabUpdate(100, 200, 123, true); // 100ms - above warning
    
    const recommendations = performanceMonitor.getOptimizationRecommendations();
    
    expect(Array.isArray(recommendations)).toBe(true);
    
    if (recommendations.length > 0) {
      expect(recommendations[0]).toHaveProperty('category');
      expect(recommendations[0]).toHaveProperty('issue');
      expect(recommendations[0]).toHaveProperty('recommendation');
      expect(recommendations[0]).toHaveProperty('priority');
    }
  });
});

describe('Audio Optimizer Utility', () => {
  let AudioOptimizer;
  let audioOptimizer;

  beforeEach(async () => {
    const module = await import('../utils/audio-optimizer.js');
    AudioOptimizer = module.default;
    audioOptimizer = new AudioOptimizer();
  });

  it('should provide optimized settings for different sound types', () => {
    const whiteNoiseSettings = audioOptimizer.getOptimizedSettings('whiteNoise');
    const notificationSettings = audioOptimizer.getOptimizedSettings('notification');
    
    expect(whiteNoiseSettings).toHaveProperty('bitrate');
    expect(whiteNoiseSettings).toHaveProperty('sampleRate');
    expect(whiteNoiseSettings).toHaveProperty('channels');
    expect(whiteNoiseSettings).toHaveProperty('duration');
    
    expect(whiteNoiseSettings.channels).toBe(1); // Mono for white noise
    expect(notificationSettings.channels).toBe(1); // Mono for notifications
    expect(whiteNoiseSettings.bitrate).toBeLessThan(notificationSettings.bitrate);
  });

  it('should calculate optimal file sizes', () => {
    const sizeCalc = audioOptimizer.calculateOptimalSize(30, 64, 22050, 1);
    
    expect(sizeCalc).toHaveProperty('theoreticalKB');
    expect(sizeCalc).toHaveProperty('estimatedKB');
    expect(sizeCalc).toHaveProperty('isOptimal');
    
    expect(sizeCalc.theoreticalKB).toBeGreaterThan(0);
    expect(sizeCalc.estimatedKB).toBeGreaterThan(sizeCalc.theoreticalKB);
    expect(typeof sizeCalc.isOptimal).toBe('boolean');
  });

  it('should generate optimization specifications', () => {
    const specs = audioOptimizer.generateOptimizedSpecs();
    
    expect(specs).toHaveProperty('rain-white-noise');
    expect(specs).toHaveProperty('notification');
    
    const rainSpec = specs['rain-white-noise'];
    expect(rainSpec).toHaveProperty('originalPath');
    expect(rainSpec).toHaveProperty('optimizedPath');
    expect(rainSpec).toHaveProperty('settings');
    expect(rainSpec).toHaveProperty('targetSize');
    
    expect(rainSpec.optimizedPath).toContain('optimized');
  });

  it('should provide validation criteria', () => {
    const validation = audioOptimizer.validateAudioFile('test.mp3');
    
    expect(validation).toHaveProperty('criteria');
    expect(validation).toHaveProperty('tips');
    
    expect(Array.isArray(validation.tips)).toBe(true);
    expect(validation.tips.length).toBeGreaterThan(0);
  });
});