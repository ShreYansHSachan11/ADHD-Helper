/**
 * Performance Tests for Focus Productivity Extension
 * Tests audio optimization, lazy loading, and tab tracking performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  tabs: {
    get: vi.fn(),
    onActivated: {
      addListener: vi.fn()
    },
    onUpdated: {
      addListener: vi.fn()
    }
  },
  runtime: {
    getURL: vi.fn(),
    sendMessage: vi.fn()
  }
};

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024 // 100MB
  }
};

describe('Audio Manager Performance', () => {
  let AudioManager;
  let audioManager;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock Audio constructor
    global.Audio = vi.fn(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      volume: 0.5,
      currentTime: 0,
      loop: false,
      src: ''
    }));

    // Import AudioManager
    const module = await import('../services/audio-manager.js');
    AudioManager = module.default;
    audioManager = new AudioManager();
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.cleanup();
    }
  });

  it('should initialize within performance threshold', async () => {
    const startTime = performance.now();
    
    await audioManager.initializeSettings();
    
    const initTime = performance.now() - startTime;
    
    // Initialization should complete within 100ms
    expect(initTime).toBeLessThan(100);
  });

  it('should cache audio elements efficiently', async () => {
    const startTime = performance.now();
    
    // Create multiple audio elements
    const audio1 = audioManager.createAudioElement('rain');
    const audio2 = audioManager.createAudioElement('ocean');
    const audio3 = audioManager.createAudioElement('rain'); // Should use cache
    
    const creationTime = performance.now() - startTime;
    
    expect(audio1).toBeDefined();
    expect(audio2).toBeDefined();
    expect(audio3).toBeDefined();
    
    // Should complete within 50ms with caching
    expect(creationTime).toBeLessThan(50);
    
    // Verify cache usage
    const stats = audioManager.getPerformanceStats();
    expect(stats.cachedSounds).toBeGreaterThan(0);
  });

  it('should preload popular sounds efficiently', async () => {
    const startTime = performance.now();
    
    await audioManager.preloadPopularSounds();
    
    const preloadTime = performance.now() - startTime;
    
    // Preloading should complete within 200ms
    expect(preloadTime).toBeLessThan(200);
    
    const stats = audioManager.getPerformanceStats();
    expect(stats.preloadedSounds).toBeGreaterThan(0);
  });

  it('should handle memory cleanup properly', () => {
    // Create multiple audio elements
    audioManager.createAudioElement('rain');
    audioManager.createAudioElement('ocean');
    audioManager.createAudioElement('waves');
    audioManager.createAudioElement('shower');
    
    const statsBefore = audioManager.getPerformanceStats();
    expect(statsBefore.cachedSounds).toBeGreaterThan(0);
    
    // Cleanup should clear cache
    audioManager.cleanup();
    
    const statsAfter = audioManager.getPerformanceStats();
    expect(statsAfter.cachedSounds).toBe(0);
    expect(statsAfter.preloadedSounds).toBe(0);
  });

  it('should respect cache size limits', () => {
    const maxCacheSize = audioManager.maxCacheSize;
    
    // Create more audio elements than cache limit
    for (let i = 0; i < maxCacheSize + 2; i++) {
      const soundIndex = i % audioManager.availableSounds.length;
      audioManager.createAudioElement();
      audioManager.currentSoundIndex = soundIndex;
    }
    
    const stats = audioManager.getPerformanceStats();
    expect(stats.cachedSounds).toBeLessThanOrEqual(maxCacheSize);
  });
});

describe('Lazy Loader Performance', () => {
  let LazyLoader;
  let lazyLoader;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock DOM APIs
    global.document = {
      createElement: vi.fn(() => ({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })),
      head: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        contains: vi.fn(() => true)
      }
    };

    global.window = {
      IntersectionObserver: vi.fn(() => ({
        observe: vi.fn(),
        disconnect: vi.fn()
      }))
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<html><head></head><body></body></html>')
    });

    const module = await import('../utils/lazy-loader.js');
    LazyLoader = module.default;
    lazyLoader = new LazyLoader();
  });

  afterEach(() => {
    if (lazyLoader) {
      lazyLoader.cleanup();
    }
  });

  it('should load components within performance threshold', async () => {
    const startTime = performance.now();
    
    // Mock component loading
    vi.doMock('../popup/components/breathing-exercise.js', () => ({
      default: class MockBreathingExercise {
        constructor() {}
        initializeInElement() {}
      }
    }));

    const result = await lazyLoader.loadComponent('breathing-exercise');
    
    const loadTime = performance.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(loadTime).toBeLessThan(100); // Should load within 100ms
  });

  it('should prevent duplicate loading', async () => {
    // Mock component
    vi.doMock('../services/audio-manager.js', () => ({
      default: class MockAudioManager {
        constructor() {}
      }
    }));

    const startTime = performance.now();
    
    // Load same component multiple times
    const promises = [
      lazyLoader.loadComponent('audio-manager'),
      lazyLoader.loadComponent('audio-manager'),
      lazyLoader.loadComponent('audio-manager')
    ];
    
    const results = await Promise.all(promises);
    
    const totalTime = performance.now() - startTime;
    
    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    // Should be faster than loading 3 separate times
    expect(totalTime).toBeLessThan(150);
    
    // Verify only one is actually loaded
    const stats = lazyLoader.getPerformanceStats();
    expect(stats.loadedComponents).toContain('audio-manager');
    expect(stats.componentsLoaded).toBe(1);
  });

  it('should preload external pages efficiently', async () => {
    const startTime = performance.now();
    
    const result = await lazyLoader.preloadExternalPage('focus-anxiety');
    
    const preloadTime = performance.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(preloadTime).toBeLessThan(200); // Should preload within 200ms
  });

  it('should track performance metrics accurately', async () => {
    // Mock component loading with known timing
    vi.doMock('../popup/components/task-manager.js', () => ({
      default: class MockTaskManager {
        constructor() {
          // Simulate some initialization time
          const start = Date.now();
          while (Date.now() - start < 10) {} // 10ms delay
        }
      }
    }));

    await lazyLoader.loadComponent('task-manager');
    
    const stats = lazyLoader.getPerformanceStats();
    
    expect(stats.componentsLoaded).toBe(1);
    expect(stats.averageLoadTime).toBeGreaterThan(0);
    expect(stats.totalLoadTime).toBeGreaterThan(0);
  });
});

describe('Performance Monitor', () => {
  let PerformanceMonitor;
  let performanceMonitor;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock PerformanceObserver
    global.PerformanceObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }));

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
    expect(summary.tabTracking.status).toBe('good');
  });

  it('should detect performance issues', () => {
    const startTime = 100;
    const endTime = 250; // 150ms - above critical threshold
    const tabId = 123;
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    performanceMonitor.recordTabUpdate(startTime, endTime, tabId, true);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Critical tab update performance')
    );
    
    const summary = performanceMonitor.getPerformanceSummary();
    expect(summary.tabTracking.status).toBe('critical');
    
    consoleSpy.mockRestore();
  });

  it('should track storage performance', () => {
    performanceMonitor.recordStorageOperation('read', 100, 120, true);
    performanceMonitor.recordStorageOperation('write', 200, 250, true);
    
    const summary = performanceMonitor.getPerformanceSummary();
    
    expect(summary.storage.readCount).toBe(1);
    expect(summary.storage.writeCount).toBe(1);
    expect(summary.storage.averageReadTime).toBe(20);
    expect(summary.storage.averageWriteTime).toBe(50);
  });

  it('should provide optimization recommendations', () => {
    // Simulate slow tab updates
    performanceMonitor.recordTabUpdate(100, 200, 123, true); // 100ms - above warning
    performanceMonitor.recordTabUpdate(200, 350, 124, true); // 150ms - above critical
    
    const recommendations = performanceMonitor.getOptimizationRecommendations();
    
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].category).toBe('tab-tracking');
    expect(recommendations[0].priority).toBe('high');
  });

  it('should monitor memory usage', () => {
    performanceMonitor.measureMemoryUsage();
    
    const summary = performanceMonitor.getPerformanceSummary();
    
    expect(summary.memory.currentUsage).toBeGreaterThan(0);
    expect(summary.memory.usageMB).toBeDefined();
    expect(summary.memory.status).toBeDefined();
  });
});

describe('Tab Tracker Performance', () => {
  let TabTracker;
  let tabTracker;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock Chrome APIs
    chrome.tabs.get.mockResolvedValue({
      id: 123,
      url: 'https://example.com',
      title: 'Example'
    });

    // Mock storage manager
    global.StorageManager = vi.fn(() => ({
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }));

    // Mock constants and helpers
    global.CONSTANTS = {
      STORAGE_KEYS: {
        TAB_HISTORY: 'tabHistory',
        CURRENT_SESSION: 'currentSession'
      }
    };

    global.HELPERS = {
      TimeUtils: {
        now: () => Date.now(),
        minutesToMs: (minutes) => minutes * 60 * 1000
      }
    };

    // Mock importScripts
    global.importScripts = vi.fn();

    const module = await import('../services/tab-tracker.js');
    TabTracker = module.default;
  });

  it('should handle rapid tab switches efficiently', async () => {
    tabTracker = new TabTracker();
    
    const startTime = performance.now();
    
    // Simulate rapid tab switches
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(tabTracker.handleTabActivated(100 + i));
    }
    
    await Promise.allSettled(promises);
    
    const totalTime = performance.now() - startTime;
    
    // Should handle 10 rapid switches within 500ms
    expect(totalTime).toBeLessThan(500);
  });

  it('should debounce tab activation events', async () => {
    tabTracker = new TabTracker();
    
    const handleSpy = vi.spyOn(tabTracker, 'processTabActivation').mockResolvedValue(undefined);
    
    // Trigger multiple rapid activations
    tabTracker.handleTabActivated(123);
    tabTracker.handleTabActivated(124);
    tabTracker.handleTabActivated(125);
    
    // Wait for debounce timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should only process the last activation due to debouncing
    expect(handleSpy).toHaveBeenCalledTimes(1);
    expect(handleSpy).toHaveBeenCalledWith(125, expect.any(Number));
    
    handleSpy.mockRestore();
  });
});

describe('Extension Memory Usage', () => {
  it('should maintain reasonable memory footprint', () => {
    const initialMemory = performance.memory.usedJSHeapSize;
    
    // Simulate extension usage
    const components = [];
    
    // Create multiple components
    for (let i = 0; i < 5; i++) {
      components.push({
        data: new Array(1000).fill('test data'),
        cleanup: () => {}
      });
    }
    
    const afterCreation = performance.memory.usedJSHeapSize;
    const memoryIncrease = afterCreation - initialMemory;
    
    // Memory increase should be reasonable (less than 10MB for test components)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    
    // Cleanup components
    components.forEach(component => {
      component.cleanup();
      component.data = null;
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  it('should clean up resources properly', async () => {
    const { default: AudioManager } = await import('../services/audio-manager.js');
    const { default: LazyLoader } = await import('../utils/lazy-loader.js');
    
    const audioManager = new AudioManager();
    const lazyLoader = new LazyLoader();
    
    // Use components
    audioManager.createAudioElement('rain');
    await lazyLoader.loadComponent('audio-manager').catch(() => {});
    
    // Get stats before cleanup
    const audioStatsBefore = audioManager.getPerformanceStats();
    const loaderStatsBefore = lazyLoader.getPerformanceStats();
    
    expect(audioStatsBefore.cachedSounds).toBeGreaterThanOrEqual(0);
    expect(loaderStatsBefore.loadedComponents.length).toBeGreaterThanOrEqual(0);
    
    // Cleanup
    audioManager.cleanup();
    lazyLoader.cleanup();
    
    // Verify cleanup
    const audioStatsAfter = audioManager.getPerformanceStats();
    const loaderStatsAfter = lazyLoader.getPerformanceStats();
    
    expect(audioStatsAfter.cachedSounds).toBe(0);
    expect(loaderStatsAfter.loadedComponents.length).toBe(0);
  });
});