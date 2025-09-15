/**
 * Performance Monitor for Extension Optimization
 * Tracks and optimizes performance across all extension components
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      tabTracking: {
        updateCount: 0,
        totalUpdateTime: 0,
        averageUpdateTime: 0,
        maxUpdateTime: 0,
        lastUpdateTime: 0,
        errorsCount: 0
      },
      storage: {
        readCount: 0,
        writeCount: 0,
        totalReadTime: 0,
        totalWriteTime: 0,
        averageReadTime: 0,
        averageWriteTime: 0,
        errorsCount: 0
      },
      memory: {
        initialUsage: 0,
        currentUsage: 0,
        peakUsage: 0,
        lastMeasurement: 0
      },
      components: {
        loadTimes: new Map(),
        initTimes: new Map(),
        errorCounts: new Map()
      }
    };

    this.thresholds = {
      tabUpdateWarning: 50, // ms
      tabUpdateCritical: 100, // ms
      storageWarning: 100, // ms
      storageCritical: 200, // ms
      memoryWarning: 50 * 1024 * 1024, // 50MB
      memoryCritical: 100 * 1024 * 1024 // 100MB
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.performanceObserver = null;

    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    try {
      // Check if we're in a service worker context (no window object)
      const globalScope = typeof window !== 'undefined' ? window : globalThis;
      
      // Initialize Performance Observer if available
      if ('PerformanceObserver' in globalScope) {
        this.performanceObserver = new PerformanceObserver((list) => {
          this.processPerformanceEntries(list.getEntries());
        });

        this.performanceObserver.observe({ 
          entryTypes: ['measure', 'navigation', 'resource'] 
        });
      }

      // Start memory monitoring (only if not in service worker)
      if (typeof window !== 'undefined') {
        this.startMemoryMonitoring();
      }

      console.log('Performance monitoring initialized');
    } catch (error) {
      console.warn('Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Start monitoring tab tracking performance
   */
  startTabTrackingMonitoring() {
    this.isMonitoring = true;
    console.log('Tab tracking performance monitoring started');
  }

  /**
   * Record tab tracking update performance
   */
  recordTabUpdate(startTime, endTime, tabId, success = true) {
    const updateTime = endTime - startTime;
    
    this.metrics.tabTracking.updateCount++;
    this.metrics.tabTracking.totalUpdateTime += updateTime;
    this.metrics.tabTracking.averageUpdateTime = 
      this.metrics.tabTracking.totalUpdateTime / this.metrics.tabTracking.updateCount;
    this.metrics.tabTracking.maxUpdateTime = Math.max(
      this.metrics.tabTracking.maxUpdateTime, 
      updateTime
    );
    this.metrics.tabTracking.lastUpdateTime = updateTime;

    if (!success) {
      this.metrics.tabTracking.errorsCount++;
    }

    // Check for performance issues
    if (updateTime > this.thresholds.tabUpdateCritical) {
      console.warn(`Critical tab update performance: ${updateTime.toFixed(2)}ms for tab ${tabId}`);
      this.reportPerformanceIssue('tab-tracking', 'critical', updateTime);
    } else if (updateTime > this.thresholds.tabUpdateWarning) {
      console.warn(`Slow tab update: ${updateTime.toFixed(2)}ms for tab ${tabId}`);
    }

    // Performance mark for debugging (check if we're in a browser context)
    if (typeof window !== 'undefined' && 'performance' in window && performance.mark) {
      performance.mark(`tab-update-${tabId}-${Date.now()}`);
    } else if (typeof performance !== 'undefined' && performance.mark) {
      // Service worker context
      performance.mark(`tab-update-${tabId}-${Date.now()}`);
    }
  }

  /**
   * Record storage operation performance
   */
  recordStorageOperation(operation, startTime, endTime, success = true) {
    const operationTime = endTime - startTime;
    
    if (operation === 'read') {
      this.metrics.storage.readCount++;
      this.metrics.storage.totalReadTime += operationTime;
      this.metrics.storage.averageReadTime = 
        this.metrics.storage.totalReadTime / this.metrics.storage.readCount;
    } else if (operation === 'write') {
      this.metrics.storage.writeCount++;
      this.metrics.storage.totalWriteTime += operationTime;
      this.metrics.storage.averageWriteTime = 
        this.metrics.storage.totalWriteTime / this.metrics.storage.writeCount;
    }

    if (!success) {
      this.metrics.storage.errorsCount++;
    }

    // Check for performance issues
    const threshold = operation === 'read' ? this.thresholds.storageWarning : this.thresholds.storageCritical;
    if (operationTime > threshold) {
      console.warn(`Slow storage ${operation}: ${operationTime.toFixed(2)}ms`);
      this.reportPerformanceIssue('storage', 'warning', operationTime);
    }
  }

  /**
   * Record component performance
   */
  recordComponentPerformance(componentName, operation, time, success = true) {
    if (operation === 'load') {
      this.metrics.components.loadTimes.set(componentName, time);
    } else if (operation === 'init') {
      this.metrics.components.initTimes.set(componentName, time);
    }

    if (!success) {
      const currentErrors = this.metrics.components.errorCounts.get(componentName) || 0;
      this.metrics.components.errorCounts.set(componentName, currentErrors + 1);
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    // Check if memory API is available
    if ('memory' in performance) {
      this.metrics.memory.initialUsage = performance.memory.usedJSHeapSize;
      
      // Monitor memory every 30 seconds
      this.monitoringInterval = setInterval(() => {
        this.measureMemoryUsage();
      }, 30000);
    }
  }

  /**
   * Measure current memory usage
   */
  measureMemoryUsage() {
    if ('memory' in performance) {
      const currentUsage = performance.memory.usedJSHeapSize;
      
      this.metrics.memory.currentUsage = currentUsage;
      this.metrics.memory.peakUsage = Math.max(
        this.metrics.memory.peakUsage, 
        currentUsage
      );
      this.metrics.memory.lastMeasurement = Date.now();

      // Check for memory issues
      if (currentUsage > this.thresholds.memoryCritical) {
        console.error(`Critical memory usage: ${(currentUsage / 1024 / 1024).toFixed(2)}MB`);
        this.reportPerformanceIssue('memory', 'critical', currentUsage);
      } else if (currentUsage > this.thresholds.memoryWarning) {
        console.warn(`High memory usage: ${(currentUsage / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }

  /**
   * Process performance entries from PerformanceObserver
   */
  processPerformanceEntries(entries) {
    entries.forEach(entry => {
      if (entry.entryType === 'measure') {
        // Process custom performance measures
        if (entry.name.startsWith('tab-tracking-')) {
          this.recordTabUpdate(entry.startTime, entry.startTime + entry.duration, 'unknown');
        }
      } else if (entry.entryType === 'resource') {
        // Monitor resource loading times
        if (entry.name.includes('assets/sounds/')) {
          console.log(`Audio resource loaded: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
        }
      }
    });
  }

  /**
   * Report performance issue
   */
  reportPerformanceIssue(category, severity, value) {
    const issue = {
      category,
      severity,
      value,
      timestamp: Date.now(),
      metrics: this.getRelevantMetrics(category)
    };

    console.warn('Performance issue detected:', issue);

    // Could send to analytics or error reporting service
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'PERFORMANCE_ISSUE',
        data: issue
      }).catch(error => {
        console.warn('Failed to report performance issue:', error);
      });
    }
  }

  /**
   * Get relevant metrics for a category
   */
  getRelevantMetrics(category) {
    switch (category) {
      case 'tab-tracking':
        return this.metrics.tabTracking;
      case 'storage':
        return this.metrics.storage;
      case 'memory':
        return this.metrics.memory;
      default:
        return {};
    }
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];

    // Tab tracking recommendations
    if (this.metrics.tabTracking.averageUpdateTime > this.thresholds.tabUpdateWarning) {
      recommendations.push({
        category: 'tab-tracking',
        issue: 'Slow tab updates',
        recommendation: 'Consider debouncing tab update events or reducing tracking frequency',
        priority: 'high'
      });
    }

    // Storage recommendations
    if (this.metrics.storage.averageWriteTime > this.thresholds.storageWarning) {
      recommendations.push({
        category: 'storage',
        issue: 'Slow storage writes',
        recommendation: 'Batch storage operations or use local caching',
        priority: 'medium'
      });
    }

    // Memory recommendations
    if (this.metrics.memory.currentUsage > this.thresholds.memoryWarning) {
      recommendations.push({
        category: 'memory',
        issue: 'High memory usage',
        recommendation: 'Implement cleanup routines and limit cached data',
        priority: 'high'
      });
    }

    // Component recommendations
    const slowComponents = Array.from(this.metrics.components.loadTimes.entries())
      .filter(([name, time]) => time > 100)
      .map(([name, time]) => ({ name, time }));

    if (slowComponents.length > 0) {
      recommendations.push({
        category: 'components',
        issue: 'Slow component loading',
        recommendation: 'Implement lazy loading for heavy components',
        priority: 'medium',
        details: slowComponents
      });
    }

    return recommendations;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return {
      tabTracking: {
        ...this.metrics.tabTracking,
        status: this.getPerformanceStatus('tab-tracking')
      },
      storage: {
        ...this.metrics.storage,
        status: this.getPerformanceStatus('storage')
      },
      memory: {
        ...this.metrics.memory,
        usageMB: (this.metrics.memory.currentUsage / 1024 / 1024).toFixed(2),
        peakUsageMB: (this.metrics.memory.peakUsage / 1024 / 1024).toFixed(2),
        status: this.getPerformanceStatus('memory')
      },
      components: {
        loadedCount: this.metrics.components.loadTimes.size,
        averageLoadTime: this.getAverageComponentLoadTime(),
        errorCount: Array.from(this.metrics.components.errorCounts.values())
          .reduce((sum, count) => sum + count, 0)
      },
      recommendations: this.getOptimizationRecommendations()
    };
  }

  /**
   * Get performance status for a category
   */
  getPerformanceStatus(category) {
    switch (category) {
      case 'tab-tracking':
        if (this.metrics.tabTracking.averageUpdateTime > this.thresholds.tabUpdateCritical) {
          return 'critical';
        } else if (this.metrics.tabTracking.averageUpdateTime > this.thresholds.tabUpdateWarning) {
          return 'warning';
        }
        return 'good';

      case 'storage':
        const avgTime = Math.max(
          this.metrics.storage.averageReadTime, 
          this.metrics.storage.averageWriteTime
        );
        if (avgTime > this.thresholds.storageCritical) {
          return 'critical';
        } else if (avgTime > this.thresholds.storageWarning) {
          return 'warning';
        }
        return 'good';

      case 'memory':
        if (this.metrics.memory.currentUsage > this.thresholds.memoryCritical) {
          return 'critical';
        } else if (this.metrics.memory.currentUsage > this.thresholds.memoryWarning) {
          return 'warning';
        }
        return 'good';

      default:
        return 'unknown';
    }
  }

  /**
   * Get average component load time
   */
  getAverageComponentLoadTime() {
    const loadTimes = Array.from(this.metrics.components.loadTimes.values());
    if (loadTimes.length === 0) return 0;
    
    const total = loadTimes.reduce((sum, time) => sum + time, 0);
    return total / loadTimes.length;
  }

  /**
   * Clean up monitoring resources
   */
  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.isMonitoring = false;
    console.log('Performance monitoring cleaned up');
  }
}

// Export for use in service worker and other contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = PerformanceMonitor;
} else {
  // Make available globally in service worker context
  globalThis.PerformanceMonitor = PerformanceMonitor;
}