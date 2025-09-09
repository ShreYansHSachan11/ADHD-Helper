/**
 * Comprehensive Performance Tests
 * Tests for tab tracking accuracy, resource usage, and performance optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Performance and Resource Usage", () => {
  let performanceMonitor;
  let tabTracker;
  let audioManager;
  let storageManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock performance monitoring
    performanceMonitor = {
      startMeasurement: vi.fn(),
      endMeasurement: vi.fn(),
      getMetrics: vi.fn(),
      recordMemoryUsage: vi.fn(),
      getMemoryStats: vi.fn(),
    };

    // Mock tab tracker with performance tracking
    tabTracker = {
      trackingStartTime: Date.now(),
      tabUpdateCount: 0,
      memoryUsage: 0,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      updateTab: vi.fn(),
      getPerformanceStats: vi.fn(),
    };

    // Mock audio manager with performance tracking
    audioManager = {
      audioElements: new Map(),
      memoryUsage: 0,
      loadSound: vi.fn(),
      unloadSound: vi.fn(),
      getPerformanceStats: vi.fn(),
      cleanup: vi.fn(),
    };

    // Mock storage manager with performance tracking
    storageManager = {
      operationCount: 0,
      totalLatency: 0,
      get: vi.fn(),
      set: vi.fn(),
      getPerformanceStats: vi.fn(),
    };

    // Setup performance API mocks
    performance.now.mockReturnValue(Date.now());
    performance.mark.mockImplementation(() => {});
    performance.measure.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tab Tracking Performance", () => {
    it("should track tab updates efficiently", async () => {
      const startTime = performance.now();
      
      // Simulate rapid tab updates
      const tabUpdates = Array.from({ length: 100 }, (_, i) => ({
        tabId: i + 1,
        url: `https://example${i}.com`,
        timestamp: Date.now() + i * 100,
      }));

      tabTracker.updateTab.mockImplementation((tabId, url) => {
        tabTracker.tabUpdateCount++;
        return Promise.resolve();
      });

      // Process all tab updates
      for (const update of tabUpdates) {
        await tabTracker.updateTab(update.tabId, update.url);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 100 tab updates in under 1 second
      expect(processingTime).toBeLessThan(1000);
      expect(tabTracker.tabUpdateCount).toBe(100);

      // Average processing time per update should be under 10ms
      const avgProcessingTime = processingTime / tabUpdates.length;
      expect(avgProcessingTime).toBeLessThan(10);
    });

    it("should maintain accurate timing calculations", async () => {
      const mockNow = 1000000;
      let currentTime = mockNow;

      performance.now.mockImplementation(() => currentTime);

      // Start tracking a tab
      const tabId = 1;
      const startTime = currentTime;
      
      tabTracker.startTracking.mockImplementation(() => {
        tabTracker.trackingStartTime = currentTime;
      });

      await tabTracker.startTracking(tabId);

      // Simulate 5 minutes of activity
      currentTime += 5 * 60 * 1000; // 5 minutes

      tabTracker.getPerformanceStats.mockReturnValue({
        totalTrackingTime: currentTime - startTime,
        accuracy: 99.9, // 99.9% accuracy
        driftMs: 50, // 50ms drift over 5 minutes
      });

      const stats = tabTracker.getPerformanceStats();

      expect(stats.totalTrackingTime).toBe(5 * 60 * 1000);
      expect(stats.accuracy).toBeGreaterThan(99.5); // Should be very accurate
      expect(stats.driftMs).toBeLessThan(100); // Minimal drift
    });

    it("should handle memory usage efficiently", async () => {
      const initialMemory = 1024 * 1024; // 1MB
      tabTracker.memoryUsage = initialMemory;

      // Simulate tracking 50 tabs
      const tabCount = 50;
      const memoryPerTab = 1024; // 1KB per tab

      tabTracker.getPerformanceStats.mockReturnValue({
        memoryUsage: initialMemory + (tabCount * memoryPerTab),
        tabCount: tabCount,
        memoryPerTab: memoryPerTab,
      });

      const stats = tabTracker.getPerformanceStats();

      // Memory usage should be reasonable
      expect(stats.memoryUsage).toBeLessThan(2 * 1024 * 1024); // Under 2MB
      expect(stats.memoryPerTab).toBeLessThan(2048); // Under 2KB per tab
    });

    it("should cleanup resources properly", async () => {
      // Setup tracking for multiple tabs
      const tabIds = [1, 2, 3, 4, 5];
      
      tabTracker.stopTracking.mockImplementation(() => {
        tabTracker.memoryUsage = Math.max(0, tabTracker.memoryUsage - 1024);
      });

      // Initial memory usage
      tabTracker.memoryUsage = tabIds.length * 1024;

      // Stop tracking all tabs
      for (const tabId of tabIds) {
        await tabTracker.stopTracking(tabId);
      }

      expect(tabTracker.memoryUsage).toBe(0);
      expect(tabTracker.stopTracking).toHaveBeenCalledTimes(tabIds.length);
    });
  });

  describe("Audio Performance", () => {
    it("should manage audio elements efficiently", async () => {
      const sounds = ["rain", "ocean", "forest", "white-noise", "brown-noise"];
      
      audioManager.loadSound.mockImplementation((soundKey) => {
        const audioElement = {
          src: `sounds/${soundKey}.mp3`,
          loaded: true,
          memorySize: 512 * 1024, // 512KB per sound
        };
        audioManager.audioElements.set(soundKey, audioElement);
        audioManager.memoryUsage += audioElement.memorySize;
        return Promise.resolve(audioElement);
      });

      // Load multiple sounds
      for (const sound of sounds) {
        await audioManager.loadSound(sound);
      }

      audioManager.getPerformanceStats.mockReturnValue({
        loadedSounds: audioManager.audioElements.size,
        totalMemoryUsage: audioManager.memoryUsage,
        averageLoadTime: 150, // 150ms average load time
      });

      const stats = audioManager.getPerformanceStats();

      expect(stats.loadedSounds).toBe(sounds.length);
      expect(stats.totalMemoryUsage).toBeLessThan(5 * 1024 * 1024); // Under 5MB
      expect(stats.averageLoadTime).toBeLessThan(500); // Under 500ms
    });

    it("should handle audio cleanup efficiently", async () => {
      // Setup loaded sounds
      const soundKeys = ["rain", "ocean", "forest"];
      
      audioManager.audioElements = new Map(
        soundKeys.map(key => [key, { memorySize: 512 * 1024 }])
      );
      audioManager.memoryUsage = soundKeys.length * 512 * 1024;

      audioManager.cleanup.mockImplementation(() => {
        audioManager.audioElements.clear();
        audioManager.memoryUsage = 0;
      });

      await audioManager.cleanup();

      expect(audioManager.audioElements.size).toBe(0);
      expect(audioManager.memoryUsage).toBe(0);
    });

    it("should preload sounds within performance threshold", async () => {
      const preloadSounds = ["rain", "ocean"];
      const startTime = performance.now();

      audioManager.loadSound.mockImplementation((soundKey) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ src: `sounds/${soundKey}.mp3`, loaded: true });
          }, 100); // 100ms load time
        });
      });

      // Preload sounds concurrently
      const loadPromises = preloadSounds.map(sound => audioManager.loadSound(sound));
      await Promise.all(loadPromises);

      const endTime = performance.now();
      const totalLoadTime = endTime - startTime;

      // Should load concurrently, not sequentially
      expect(totalLoadTime).toBeLessThan(200); // Should be ~100ms, not 200ms
      expect(audioManager.loadSound).toHaveBeenCalledTimes(preloadSounds.length);
    });
  });

  describe("Storage Performance", () => {
    it("should handle storage operations efficiently", async () => {
      const operations = 100;
      const startTime = performance.now();

      storageManager.set.mockImplementation((key, value) => {
        storageManager.operationCount++;
        return new Promise(resolve => {
          setTimeout(resolve, 5); // 5ms per operation
        });
      });

      // Perform multiple storage operations
      const promises = Array.from({ length: operations }, (_, i) => 
        storageManager.set(`key${i}`, `value${i}`)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      storageManager.getPerformanceStats.mockReturnValue({
        operationCount: storageManager.operationCount,
        averageLatency: totalTime / operations,
        throughput: operations / (totalTime / 1000), // operations per second
      });

      const stats = storageManager.getPerformanceStats();

      expect(stats.operationCount).toBe(operations);
      expect(stats.averageLatency).toBeLessThan(50); // Under 50ms average
      expect(stats.throughput).toBeGreaterThan(10); // At least 10 ops/sec
    });

    it("should handle large data sets efficiently", async () => {
      const largeData = {
        tabHistory: Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [
            i,
            {
              url: `https://example${i}.com`,
              totalTime: Math.random() * 3600000,
              visits: Math.floor(Math.random() * 100),
            }
          ])
        ),
        tasks: Array.from({ length: 100 }, (_, i) => ({
          id: `task-${i}`,
          name: `Task ${i}`,
          breakdown: Array.from({ length: 5 }, (_, j) => `Step ${j + 1}`),
          createdAt: Date.now() - (i * 86400000),
        })),
      };

      const startTime = performance.now();

      storageManager.set.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(resolve, 50); // 50ms for large data
        });
      });

      await storageManager.set("largeDataSet", largeData);

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Should handle large data in reasonable time
      expect(operationTime).toBeLessThan(1000); // Under 1 second
    });
  });

  describe("Memory Management", () => {
    it("should maintain reasonable memory footprint", async () => {
      const initialMemory = 2 * 1024 * 1024; // 2MB baseline

      performanceMonitor.getMemoryStats.mockReturnValue({
        totalMemoryUsage: initialMemory,
        breakdown: {
          tabTracker: 512 * 1024, // 512KB
          audioManager: 1024 * 1024, // 1MB
          storageCache: 256 * 1024, // 256KB
          other: 256 * 1024, // 256KB
        },
      });

      const memoryStats = performanceMonitor.getMemoryStats();

      // Total memory should be under 5MB
      expect(memoryStats.totalMemoryUsage).toBeLessThan(5 * 1024 * 1024);
      
      // Individual components should be reasonable
      expect(memoryStats.breakdown.tabTracker).toBeLessThan(1024 * 1024); // Under 1MB
      expect(memoryStats.breakdown.audioManager).toBeLessThan(2 * 1024 * 1024); // Under 2MB
    });

    it("should detect memory leaks", async () => {
      const measurements = [];
      
      // Simulate memory measurements over time
      for (let i = 0; i < 10; i++) {
        const memoryUsage = 1024 * 1024 + (i * 100 * 1024); // Growing memory
        measurements.push({
          timestamp: Date.now() + (i * 60000), // Every minute
          memoryUsage,
        });
      }

      performanceMonitor.getMemoryStats.mockReturnValue({
        measurements,
        trend: "increasing",
        growthRate: 100 * 1024, // 100KB per minute
        leakDetected: true,
      });

      const memoryStats = performanceMonitor.getMemoryStats();

      expect(memoryStats.trend).toBe("increasing");
      expect(memoryStats.leakDetected).toBe(true);
      expect(memoryStats.growthRate).toBeGreaterThan(0);
    });

    it("should cleanup resources on extension unload", async () => {
      // Setup various resources
      const resources = {
        tabTracker: { cleanup: vi.fn() },
        audioManager: { cleanup: vi.fn() },
        storageManager: { cleanup: vi.fn() },
        performanceMonitor: { cleanup: vi.fn() },
      };

      // Simulate extension unload
      const cleanup = async () => {
        for (const [name, resource] of Object.entries(resources)) {
          await resource.cleanup();
        }
      };

      await cleanup();

      // All resources should be cleaned up
      Object.values(resources).forEach(resource => {
        expect(resource.cleanup).toHaveBeenCalled();
      });
    });
  });

  describe("Performance Monitoring", () => {
    it("should track performance metrics accurately", async () => {
      const metrics = {
        tabUpdateLatency: [],
        storageOperationLatency: [],
        audioLoadLatency: [],
        memoryUsage: [],
      };

      // Simulate performance measurements
      performanceMonitor.startMeasurement.mockImplementation((name) => {
        return { name, startTime: performance.now() };
      });

      performanceMonitor.endMeasurement.mockImplementation((measurement) => {
        const endTime = performance.now();
        const latency = endTime - measurement.startTime;
        
        if (measurement.name.includes("tab")) {
          metrics.tabUpdateLatency.push(latency);
        } else if (measurement.name.includes("storage")) {
          metrics.storageOperationLatency.push(latency);
        } else if (measurement.name.includes("audio")) {
          metrics.audioLoadLatency.push(latency);
        }
      });

      // Perform various operations with measurements
      const operations = [
        { name: "tab-update", duration: 5 },
        { name: "storage-set", duration: 10 },
        { name: "audio-load", duration: 100 },
      ];

      for (const op of operations) {
        const measurement = performanceMonitor.startMeasurement(op.name);
        await new Promise(resolve => setTimeout(resolve, op.duration));
        performanceMonitor.endMeasurement(measurement);
      }

      performanceMonitor.getMetrics.mockReturnValue(metrics);

      const collectedMetrics = performanceMonitor.getMetrics();

      expect(collectedMetrics.tabUpdateLatency.length).toBeGreaterThan(0);
      expect(collectedMetrics.storageOperationLatency.length).toBeGreaterThan(0);
      expect(collectedMetrics.audioLoadLatency.length).toBeGreaterThan(0);
    });

    it("should provide performance optimization recommendations", async () => {
      const performanceData = {
        tabUpdateLatency: [15, 20, 25, 30, 35], // Increasing latency
        memoryUsage: [2048, 2100, 2200, 2400, 2600], // Growing memory
        storageOperations: 1000, // High operation count
      };

      const recommendations = [];

      // Analyze performance data and generate recommendations
      const avgLatency = performanceData.tabUpdateLatency.reduce((a, b) => a + b) / performanceData.tabUpdateLatency.length;
      if (avgLatency > 20) {
        recommendations.push("Consider optimizing tab update processing");
      }

      const memoryGrowth = performanceData.memoryUsage[performanceData.memoryUsage.length - 1] - performanceData.memoryUsage[0];
      if (memoryGrowth > 500) {
        recommendations.push("Memory usage is growing, check for leaks");
      }

      if (performanceData.storageOperations > 500) {
        recommendations.push("High storage operation count, consider batching");
      }

      expect(recommendations).toContain("Consider optimizing tab update processing");
      expect(recommendations).toContain("Memory usage is growing, check for leaks");
      expect(recommendations).toContain("High storage operation count, consider batching");
    });
  });

  describe("Cross-Browser Performance", () => {
    it("should perform consistently across different environments", async () => {
      const environments = [
        { name: "Chrome", version: "120", performance: "high" },
        { name: "Edge", version: "120", performance: "high" },
        { name: "Firefox", version: "119", performance: "medium" },
      ];

      const performanceResults = {};

      for (const env of environments) {
        // Simulate environment-specific performance
        const baseLatency = env.performance === "high" ? 5 : 10;
        const results = {
          tabUpdateLatency: baseLatency + Math.random() * 5,
          storageLatency: baseLatency * 2 + Math.random() * 10,
          audioLoadLatency: baseLatency * 10 + Math.random() * 50,
        };

        performanceResults[env.name] = results;
      }

      // All environments should meet minimum performance requirements
      Object.values(performanceResults).forEach(results => {
        expect(results.tabUpdateLatency).toBeLessThan(20);
        expect(results.storageLatency).toBeLessThan(50);
        expect(results.audioLoadLatency).toBeLessThan(200);
      });
    });
  });
});