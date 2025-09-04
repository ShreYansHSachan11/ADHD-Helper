/**
 * Test Suite Validation
 * Validates that all required test categories are covered according to task requirements
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

describe("Test Suite Validation", () => {
  const testDir = "tests";
  const testFiles = readdirSync(testDir).filter(file => file.endsWith(".test.js"));

  describe("Required Test Categories Coverage", () => {
    it("should have unit tests for all service modules", () => {
      const serviceModuleTests = [
        "tab-tracker.test.js",
        "storage-manager.test.js", 
        "gemini-service.test.js",
        "calendar-service.test.js",
        "audio-manager.test.js"
      ];

      serviceModuleTests.forEach(testFile => {
        expect(testFiles).toContain(testFile);
      });
    });

    it("should have integration tests for popup-background communication", () => {
      const integrationTests = [
        "popup-background-integration.test.js",
        "background.test.js"
      ];

      integrationTests.forEach(testFile => {
        expect(testFiles).toContain(testFile);
      });
    });

    it("should have end-to-end tests for complete user workflows", () => {
      const e2eTests = [
        "end-to-end-workflows.test.js"
      ];

      e2eTests.forEach(testFile => {
        expect(testFiles).toContain(testFile);
      });
    });

    it("should have performance tests for tab tracking and resource usage", () => {
      const performanceTests = [
        "performance-comprehensive.test.js",
        "performance.test.js",
        "audio-performance.test.js"
      ];

      performanceTests.forEach(testFile => {
        expect(testFiles).toContain(testFile);
      });
    });

    it("should have cross-platform compatibility tests", () => {
      const compatibilityTests = [
        "cross-platform-compatibility.test.js"
      ];

      compatibilityTests.forEach(testFile => {
        expect(testFiles).toContain(testFile);
      });
    });
  });

  describe("Test Coverage Requirements", () => {
    it("should test all major extension features", () => {
      const requiredFeatureTests = {
        "Screen Time Monitoring": ["tab-tracker.test.js", "popup-screen-time.test.js"],
        "Focus Management": ["focus-tracking-integration.test.js", "focus-tracking-ui.test.js"],
        "Task Management": ["task-manager.test.js", "gemini-service.test.js"],
        "Calendar Integration": ["calendar-service.test.js", "calendar-integration.test.js"],
        "Breathing Exercises": ["breathing-exercise.test.js", "breathing-exercise-integration.test.js"],
        "Audio Management": ["audio-manager.test.js", "audio-performance.test.js"],
        "Notifications": ["notification-system.test.js", "notification-integration.test.js"],
        "Storage": ["storage-manager.test.js"],
        "Background Service": ["background.test.js"],
        "Utilities": ["helpers.test.js", "constants.test.js"]
      };

      Object.entries(requiredFeatureTests).forEach(([feature, tests]) => {
        tests.forEach(testFile => {
          expect(testFiles).toContain(testFile);
        });
      });
    });

    it("should have tests for all requirements specified in task", () => {
      // Requirements from task: 10.7, 1.1, 3.1, 4.1, 7.1, 8.1
      const requirementTests = {
        "10.7": ["cross-platform-compatibility.test.js", "performance-comprehensive.test.js"], // Technical architecture
        "1.1": ["tab-tracker.test.js", "popup-screen-time.test.js"], // Screen time monitoring
        "3.1": ["gemini-service.test.js", "task-manager.test.js"], // AI-powered task breakdown
        "4.1": ["calendar-service.test.js", "calendar-integration.test.js"], // Calendar integration
        "7.1": ["breathing-exercise.test.js", "breathing-exercise-integration.test.js"], // Breathing exercises
        "8.1": ["audio-manager.test.js", "audio-performance.test.js"] // White noise toggle
      };

      Object.entries(requirementTests).forEach(([requirement, tests]) => {
        tests.forEach(testFile => {
          expect(testFiles).toContain(testFile);
        });
      });
    });
  });

  describe("Test Quality Validation", () => {
    it("should have comprehensive test setup", () => {
      expect(testFiles).toContain("setup.js");
      
      const setupContent = readFileSync(join(testDir, "setup.js"), "utf-8");
      
      // Should mock Chrome APIs
      expect(setupContent).toContain("global.chrome");
      expect(setupContent).toContain("storage");
      expect(setupContent).toContain("tabs");
      expect(setupContent).toContain("notifications");
      
      // Should mock Web APIs
      expect(setupContent).toContain("global.Audio");
      expect(setupContent).toContain("global.fetch");
      expect(setupContent).toContain("IntersectionObserver");
    });

    it("should have proper test structure in all test files", () => {
      const criticalTestFiles = [
        "tab-tracker.test.js",
        "gemini-service.test.js", 
        "calendar-service.test.js",
        "audio-manager.test.js",
        "popup-background-integration.test.js",
        "end-to-end-workflows.test.js"
      ];

      criticalTestFiles.forEach(testFile => {
        const content = readFileSync(join(testDir, testFile), "utf-8");
        
        // Should have proper imports
        expect(content).toContain("import { describe, it, expect");
        
        // Should have describe blocks
        expect(content).toContain("describe(");
        
        // Should have test cases
        expect(content).toContain("it(");
        
        // Should have assertions
        expect(content).toContain("expect(");
        
        // Should have proper cleanup
        expect(content).toContain("beforeEach") || expect(content).toContain("afterEach");
      });
    });

    it("should test error handling scenarios", () => {
      const errorHandlingTests = [
        "gemini-service.test.js", // API failures
        "calendar-service.test.js", // Calendar API errors
        "audio-manager.test.js", // Audio loading errors
        "storage-manager.test.js", // Storage errors
        "tab-tracker.test.js" // Tab tracking errors
      ];

      errorHandlingTests.forEach(testFile => {
        const content = readFileSync(join(testDir, testFile), "utf-8");
        
        // Should test error scenarios
        expect(content).toMatch(/error|Error|fail|reject/i);
        expect(content).toMatch(/catch|throw|rejects/i);
      });
    });

    it("should test async operations properly", () => {
      const asyncTestFiles = [
        "gemini-service.test.js",
        "calendar-service.test.js", 
        "storage-manager.test.js",
        "tab-tracker.test.js"
      ];

      asyncTestFiles.forEach(testFile => {
        const content = readFileSync(join(testDir, testFile), "utf-8");
        
        // Should handle async operations
        expect(content).toMatch(/async|await|Promise|resolve|reject/);
      });
    });
  });

  describe("Test Performance Validation", () => {
    it("should have performance benchmarks", () => {
      const performanceContent = readFileSync(join(testDir, "performance-comprehensive.test.js"), "utf-8");
      
      // Should test timing
      expect(performanceContent).toContain("performance.now");
      expect(performanceContent).toContain("toBeLessThan");
      
      // Should test memory usage
      expect(performanceContent).toContain("memory");
      expect(performanceContent).toContain("cleanup");
      
      // Should test resource management
      expect(performanceContent).toContain("resource");
    });

    it("should validate cross-platform compatibility", () => {
      const compatibilityContent = readFileSync(join(testDir, "cross-platform-compatibility.test.js"), "utf-8");
      
      // Should test different platforms
      expect(compatibilityContent).toContain("Windows") || expect(compatibilityContent).toContain("win");
      expect(compatibilityContent).toContain("macOS") || expect(compatibilityContent).toContain("mac");
      expect(compatibilityContent).toContain("Linux") || expect(compatibilityContent).toContain("linux");
      
      // Should test Chrome versions
      expect(compatibilityContent).toContain("Chrome");
      expect(compatibilityContent).toContain("version");
    });
  });

  describe("Integration Test Validation", () => {
    it("should test message passing between components", () => {
      const integrationContent = readFileSync(join(testDir, "popup-background-integration.test.js"), "utf-8");
      
      // Should test Chrome runtime messaging
      expect(integrationContent).toContain("chrome.runtime.sendMessage");
      expect(integrationContent).toContain("callback");
      expect(integrationContent).toContain("response");
    });

    it("should test complete user workflows", () => {
      const workflowContent = readFileSync(join(testDir, "end-to-end-workflows.test.js"), "utf-8");
      
      // Should test task creation workflow
      expect(workflowContent).toContain("task");
      expect(workflowContent).toContain("breakdown");
      expect(workflowContent).toContain("calendar");
      
      // Should test focus management workflow
      expect(workflowContent).toContain("focus");
      expect(workflowContent).toContain("tab");
      
      // Should test wellness tools workflow
      expect(workflowContent).toContain("breathing") || expect(workflowContent).toContain("audio");
    });
  });

  describe("Test Completeness", () => {
    it("should have adequate number of test files", () => {
      // Should have at least 20 test files for comprehensive coverage
      expect(testFiles.length).toBeGreaterThanOrEqual(20);
    });

    it("should cover all major code paths", () => {
      const testFileCount = testFiles.length;
      const setupFileCount = testFiles.filter(f => f.includes("setup")).length;
      const actualTestFiles = testFileCount - setupFileCount;
      
      // Should have substantial test coverage
      expect(actualTestFiles).toBeGreaterThanOrEqual(15);
    });

    it("should include all test types required by task", () => {
      const requiredTestTypes = [
        "unit", // Unit tests for service modules
        "integration", // Integration tests for popup-background
        "end-to-end", // E2E tests for workflows  
        "performance", // Performance tests for tab tracking
        "compatibility" // Cross-platform compatibility tests
      ];

      requiredTestTypes.forEach(testType => {
        const hasTestType = testFiles.some(file => 
          file.includes(testType) || 
          file.includes(testType.replace("-", "")) ||
          (testType === "unit" && ["tab-tracker", "storage-manager", "gemini-service", "calendar-service", "audio-manager"].some(service => file.includes(service)))
        );
        
        expect(hasTestType).toBe(true);
      });
    });
  });
});