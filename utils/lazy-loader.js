/**
 * Lazy Loading Utility for Performance Optimization
 * Handles lazy loading of heavy components and external resources
 */

class LazyLoader {
  constructor() {
    this.loadedComponents = new Set();
    this.loadingPromises = new Map();
    this.intersectionObserver = null;
    this.performanceMetrics = {
      componentsLoaded: 0,
      totalLoadTime: 0,
      averageLoadTime: 0
    };
    
    this.initializeIntersectionObserver();
  }

  /**
   * Initialize Intersection Observer for viewport-based lazy loading
   */
  initializeIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target;
              const componentName = element.dataset.lazyComponent;
              
              if (componentName && !this.loadedComponents.has(componentName)) {
                this.loadComponent(componentName, element);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Load 50px before element comes into view
          threshold: 0.1
        }
      );
    }
  }

  /**
   * Register an element for lazy loading
   */
  registerLazyElement(element, componentName) {
    if (!element || !componentName) return;
    
    element.dataset.lazyComponent = componentName;
    
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Lazy load a component with performance tracking
   */
  async loadComponent(componentName, targetElement = null) {
    // Prevent duplicate loading
    if (this.loadedComponents.has(componentName)) {
      return { success: true, cached: true };
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(componentName)) {
      return await this.loadingPromises.get(componentName);
    }

    const startTime = performance.now();
    
    const loadPromise = this.performComponentLoad(componentName, targetElement, startTime);
    this.loadingPromises.set(componentName, loadPromise);

    try {
      const result = await loadPromise;
      this.loadedComponents.add(componentName);
      
      // Update performance metrics
      const loadTime = performance.now() - startTime;
      this.updatePerformanceMetrics(loadTime);
      
      console.log(`Lazy loaded component: ${componentName} (${loadTime.toFixed(2)}ms)`);
      
      return result;
      
    } catch (error) {
      console.error(`Failed to lazy load component ${componentName}:`, error);
      throw error;
      
    } finally {
      this.loadingPromises.delete(componentName);
    }
  }

  /**
   * Perform the actual component loading
   */
  async performComponentLoad(componentName, targetElement, startTime) {
    switch (componentName) {
      case 'breathing-exercise':
        return await this.loadBreathingExercise(targetElement);
        
      case 'task-manager':
        return await this.loadTaskManager(targetElement);
        
      case 'audio-manager':
        return await this.loadAudioManager(targetElement);
        
      case 'external-page-focus-anxiety':
        return await this.preloadExternalPage('focus-anxiety');
        
      case 'external-page-asmr-fidget':
        return await this.preloadExternalPage('asmr-fidget');
        
      default:
        throw new Error(`Unknown component: ${componentName}`);
    }
  }

  /**
   * Lazy load breathing exercise component
   */
  async loadBreathingExercise(targetElement) {
    try {
      // Dynamic import of breathing exercise
      const { default: BreathingExercise } = await import('../popup/components/breathing-exercise.js');
      
      const breathingExercise = new BreathingExercise();
      
      if (targetElement) {
        // Initialize in target element if provided
        breathingExercise.initializeInElement(targetElement);
      }
      
      return { 
        success: true, 
        component: breathingExercise,
        type: 'breathing-exercise'
      };
      
    } catch (error) {
      console.error('Failed to load breathing exercise:', error);
      return { 
        success: false, 
        error: error.message,
        fallback: 'Basic breathing instructions available'
      };
    }
  }

  /**
   * Lazy load task manager component
   */
  async loadTaskManager(targetElement) {
    try {
      // Dynamic import of task manager
      const { default: TaskManager } = await import('../popup/components/task-manager.js');
      
      const taskManager = new TaskManager();
      
      return { 
        success: true, 
        component: taskManager,
        type: 'task-manager'
      };
      
    } catch (error) {
      console.error('Failed to load task manager:', error);
      return { 
        success: false, 
        error: error.message,
        fallback: 'Manual task entry available'
      };
    }
  }

  /**
   * Lazy load audio manager component
   */
  async loadAudioManager(targetElement) {
    try {
      // Dynamic import of audio manager
      const { default: AudioManager } = await import('../services/audio-manager.js');
      
      const audioManager = new AudioManager();
      
      return { 
        success: true, 
        component: audioManager,
        type: 'audio-manager'
      };
      
    } catch (error) {
      console.error('Failed to load audio manager:', error);
      return { 
        success: false, 
        error: error.message,
        fallback: 'Basic audio controls available'
      };
    }
  }

  /**
   * Preload external page resources
   */
  async preloadExternalPage(pageName) {
    try {
      const urls = {
        'focus-anxiety': 'external-pages/focus-anxiety.html',
        'asmr-fidget': 'external-pages/asmr-fidget.html'
      };

      const pageUrl = urls[pageName];
      if (!pageUrl) {
        throw new Error(`Unknown page: ${pageName}`);
      }

      // Preload the HTML content
      const response = await fetch(chrome.runtime.getURL(pageUrl));
      
      if (!response.ok) {
        throw new Error(`Failed to preload ${pageName}: ${response.status}`);
      }

      const htmlContent = await response.text();
      
      // Parse and preload linked resources
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Preload CSS files
      const cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
      const cssPromises = Array.from(cssLinks).map(link => {
        return this.preloadResource(link.href, 'style');
      });

      // Preload JavaScript files
      const scriptTags = doc.querySelectorAll('script[src]');
      const scriptPromises = Array.from(scriptTags).map(script => {
        return this.preloadResource(script.src, 'script');
      });

      await Promise.all([...cssPromises, ...scriptPromises]);

      return { 
        success: true, 
        page: pageName,
        resourcesPreloaded: cssLinks.length + scriptTags.length
      };
      
    } catch (error) {
      console.error(`Failed to preload external page ${pageName}:`, error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Preload a specific resource
   */
  async preloadResource(url, type) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = type;
      
      link.onload = () => {
        resolve(url);
        document.head.removeChild(link); // Clean up
      };
      
      link.onerror = () => {
        reject(new Error(`Failed to preload ${url}`));
        document.head.removeChild(link); // Clean up
      };
      
      document.head.appendChild(link);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error(`Preload timeout for ${url}`));
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      }, 5000);
    });
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(loadTime) {
    this.performanceMetrics.componentsLoaded++;
    this.performanceMetrics.totalLoadTime += loadTime;
    this.performanceMetrics.averageLoadTime = 
      this.performanceMetrics.totalLoadTime / this.performanceMetrics.componentsLoaded;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      loadedComponents: Array.from(this.loadedComponents),
      currentlyLoading: Array.from(this.loadingPromises.keys())
    };
  }

  /**
   * Preload critical components based on user behavior
   */
  async preloadCriticalComponents() {
    const criticalComponents = [
      'audio-manager', // Most commonly used
      'breathing-exercise' // Quick access needed
    ];

    const preloadPromises = criticalComponents.map(component => 
      this.loadComponent(component).catch(error => {
        console.warn(`Failed to preload critical component ${component}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    this.loadedComponents.clear();
    this.loadingPromises.clear();
  }
}

export default LazyLoader;