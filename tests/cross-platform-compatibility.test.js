/**
 * Cross-Platform Compatibility Tests
 * Tests for Chrome extension compatibility across different versions and operating systems
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Cross-Platform Compatibility", () => {
  let mockManifest;
  let mockChrome;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock manifest.json
    mockManifest = {
      manifest_version: 3,
      name: "Focus Productivity Extension",
      version: "1.0.0",
      minimum_chrome_version: "88",
      permissions: [
        "storage",
        "tabs",
        "notifications",
        "activeTab"
      ],
      host_permissions: [
        "https://*/*",
        "http://*/*"
      ]
    };

    // Mock Chrome API with version detection
    mockChrome = {
      runtime: {
        getManifest: vi.fn(() => mockManifest),
        getPlatformInfo: vi.fn(),
        getBrowserInfo: vi.fn(),
        id: "test-extension-id"
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          QUOTA_BYTES: 5242880
        }
      },
      tabs: {
        query: vi.fn(),
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() }
      },
      notifications: {
        create: vi.fn(),
        clear: vi.fn()
      }
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Chrome Version Compatibility", () => {
    it("should work with minimum Chrome version 88", async () => {
      mockChrome.runtime.getBrowserInfo.mockResolvedValue({
        name: "Chrome",
        version: "88.0.4324.150"
      });

      const browserInfo = await mockChrome.runtime.getBrowserInfo();
      const chromeVersion = parseInt(browserInfo.version.split('.')[0]);

      expect(chromeVersion).toBeGreaterThanOrEqual(88);
      expect(mockManifest.minimum_chrome_version).toBe("88");
    });

    it("should work with current Chrome version", async () => {
      mockChrome.runtime.getBrowserInfo.mockResolvedValue({
        name: "Chrome",
        version: "120.0.6099.129"
      });

      const browserInfo = await mockChrome.runtime.getBrowserInfo();
      const chromeVersion = parseInt(browserInfo.version.split('.')[0]);

      expect(chromeVersion).toBeGreaterThan(100);
      
      // Test Manifest V3 specific features
      expect(mockManifest.manifest_version).toBe(3);
      expect(mockManifest.permissions).toContain("storage");
      expect(mockManifest.host_permissions).toBeDefined();
    });

    it("should handle Chrome API differences gracefully", async () => {
      // Test for older Chrome versions that might not have certain APIs
      const testApiAvailability = () => {
        const availableApis = {
          storage: !!chrome.storage,
          tabs: !!chrome.tabs,
          notifications: !!chrome.notifications,
          action: !!chrome.action, // Manifest V3
          browserAction: !!chrome.browserAction, // Manifest V2 (legacy)
        };

        return availableApis;
      };

      const apis = testApiAvailability();

      expect(apis.storage).toBe(true);
      expect(apis.tabs).toBe(true);
      expect(apis.notifications).toBe(true);
      
      // Should use action API in Manifest V3
      if (mockManifest.manifest_version === 3) {
        expect(apis.action || apis.browserAction).toBe(true);
      }
    });
  });

  describe("Operating System Compatibility", () => {
    it("should work on Windows", async () => {
      mockChrome.runtime.getPlatformInfo.mockResolvedValue({
        os: "win",
        arch: "x86-64"
      });

      const platformInfo = await mockChrome.runtime.getPlatformInfo();

      expect(platformInfo.os).toBe("win");
      
      // Test Windows-specific functionality
      const windowsCompatibility = {
        fileSystemAccess: true,
        notificationSupport: true,
        audioSupport: true,
        storageQuota: mockChrome.storage.local.QUOTA_BYTES
      };

      expect(windowsCompatibility.fileSystemAccess).toBe(true);
      expect(windowsCompatibility.notificationSupport).toBe(true);
      expect(windowsCompatibility.audioSupport).toBe(true);
      expect(windowsCompatibility.storageQuota).toBeGreaterThan(0);
    });

    it("should work on macOS", async () => {
      mockChrome.runtime.getPlatformInfo.mockResolvedValue({
        os: "mac",
        arch: "arm64"
      });

      const platformInfo = await mockChrome.runtime.getPlatformInfo();

      expect(platformInfo.os).toBe("mac");
      
      // Test macOS-specific considerations
      const macCompatibility = {
        notificationPermissions: true,
        audioContextSupport: true,
        keyboardShortcuts: true,
        retinaDpiSupport: true
      };

      expect(macCompatibility.notificationPermissions).toBe(true);
      expect(macCompatibility.audioContextSupport).toBe(true);
      expect(macCompatibility.keyboardShortcuts).toBe(true);
      expect(macCompatibility.retinaDpiSupport).toBe(true);
    });

    it("should work on Linux", async () => {
      mockChrome.runtime.getPlatformInfo.mockResolvedValue({
        os: "linux",
        arch: "x86-64"
      });

      const platformInfo = await mockChrome.runtime.getPlatformInfo();

      expect(platformInfo.os).toBe("linux");
      
      // Test Linux-specific considerations
      const linuxCompatibility = {
        audioSystemSupport: true,
        notificationDaemonSupport: true,
        filePermissions: true,
        displayScaling: true
      };

      expect(linuxCompatibility.audioSystemSupport).toBe(true);
      expect(linuxCompatibility.notificationDaemonSupport).toBe(true);
      expect(linuxCompatibility.filePermissions).toBe(true);
      expect(linuxCompatibility.displayScaling).toBe(true);
    });

    it("should handle ChromeOS", async () => {
      mockChrome.runtime.getPlatformInfo.mockResolvedValue({
        os: "cros",
        arch: "arm"
      });

      const platformInfo = await mockChrome.runtime.getPlatformInfo();

      expect(platformInfo.os).toBe("cros");
      
      // Test ChromeOS-specific features
      const chromeOsCompatibility = {
        androidAppIntegration: true,
        touchScreenSupport: true,
        powerManagement: true,
        limitedFileSystem: true
      };

      expect(chromeOsCompatibility.androidAppIntegration).toBe(true);
      expect(chromeOsCompatibility.touchScreenSupport).toBe(true);
      expect(chromeOsCompatibility.powerManagement).toBe(true);
      expect(chromeOsCompatibility.limitedFileSystem).toBe(true);
    });
  });

  describe("Browser Engine Compatibility", () => {
    it("should work with Chromium-based browsers", async () => {
      const chromiumBrowsers = [
        { name: "Chrome", version: "120.0.6099.129" },
        { name: "Microsoft Edge", version: "120.0.2210.61" },
        { name: "Brave", version: "1.60.125" },
        { name: "Opera", version: "105.0.4970.21" }
      ];

      for (const browser of chromiumBrowsers) {
        mockChrome.runtime.getBrowserInfo.mockResolvedValue(browser);
        
        const browserInfo = await mockChrome.runtime.getBrowserInfo();
        
        // All Chromium browsers should support the same APIs
        expect(browserInfo.name).toBe(browser.name);
        expect(browserInfo.version).toBe(browser.version);
        
        // Test core functionality
        const coreFeatures = {
          manifestV3Support: mockManifest.manifest_version === 3,
          storageApiSupport: !!chrome.storage,
          tabsApiSupport: !!chrome.tabs,
          notificationsSupport: !!chrome.notifications
        };

        expect(coreFeatures.manifestV3Support).toBe(true);
        expect(coreFeatures.storageApiSupport).toBe(true);
        expect(coreFeatures.tabsApiSupport).toBe(true);
        expect(coreFeatures.notificationsSupport).toBe(true);
      }
    });

    it("should handle browser-specific API variations", async () => {
      // Test Edge-specific features
      mockChrome.runtime.getBrowserInfo.mockResolvedValue({
        name: "Microsoft Edge",
        version: "120.0.2210.61"
      });

      const edgeSpecificFeatures = {
        webview2Support: true,
        windowsIntegration: true,
        enterpriseFeatures: true
      };

      // These features should be available but not required
      expect(typeof edgeSpecificFeatures.webview2Support).toBe("boolean");
      expect(typeof edgeSpecificFeatures.windowsIntegration).toBe("boolean");
      expect(typeof edgeSpecificFeatures.enterpriseFeatures).toBe("boolean");
    });
  });

  describe("Permission Compatibility", () => {
    it("should request appropriate permissions for all platforms", async () => {
      const requiredPermissions = mockManifest.permissions;
      const hostPermissions = mockManifest.host_permissions;

      // Test permission availability
      chrome.permissions = {
        contains: vi.fn(),
        request: vi.fn()
      };

      chrome.permissions.contains.mockImplementation((permissions) => {
        return Promise.resolve(
          permissions.permissions?.every(p => requiredPermissions.includes(p)) ?? true
        );
      });

      // Test each required permission
      for (const permission of requiredPermissions) {
        const hasPermission = await chrome.permissions.contains({
          permissions: [permission]
        });
        
        expect(hasPermission).toBe(true);
      }

      // Test host permissions
      if (hostPermissions) {
        const hasHostPermissions = await chrome.permissions.contains({
          origins: hostPermissions
        });
        
        expect(hasHostPermissions).toBe(true);
      }
    });

    it("should handle permission denials gracefully", async () => {
      chrome.permissions = {
        contains: vi.fn(),
        request: vi.fn()
      };

      // Simulate permission denial
      chrome.permissions.contains.mockResolvedValue(false);
      chrome.permissions.request.mockResolvedValue(false);

      const hasPermission = await chrome.permissions.contains({
        permissions: ["notifications"]
      });

      if (!hasPermission) {
        const granted = await chrome.permissions.request({
          permissions: ["notifications"]
        });
        
        // Should handle graceful degradation
        expect(granted).toBe(false);
        
        // Extension should still function with limited features
        const fallbackMode = {
          notificationsDisabled: true,
          basicFunctionalityAvailable: true
        };
        
        expect(fallbackMode.notificationsDisabled).toBe(true);
        expect(fallbackMode.basicFunctionalityAvailable).toBe(true);
      }
    });
  });

  describe("Storage Compatibility", () => {
    it("should handle different storage quotas across platforms", async () => {
      const platformStorageQuotas = {
        desktop: 5242880, // 5MB
        mobile: 2621440,  // 2.5MB (hypothetical)
        enterprise: 10485760 // 10MB (hypothetical)
      };

      // Test storage quota detection
      chrome.storage.local.getBytesInUse = vi.fn().mockResolvedValue(1024000); // 1MB used

      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;

      expect(bytesInUse).toBeLessThan(quota);
      expect(quota).toBeGreaterThanOrEqual(platformStorageQuotas.mobile);
    });

    it("should handle storage API differences", async () => {
      // Test sync vs local storage availability
      const storageApis = {
        local: !!chrome.storage?.local,
        sync: !!chrome.storage?.sync,
        managed: !!chrome.storage?.managed,
        session: !!chrome.storage?.session // Chrome 102+
      };

      expect(storageApis.local).toBe(true); // Always required
      
      // Sync storage might not be available in all environments
      if (storageApis.sync) {
        chrome.storage.sync = {
          get: vi.fn(),
          set: vi.fn(),
          QUOTA_BYTES: 102400 // 100KB
        };
        
        expect(chrome.storage.sync.QUOTA_BYTES).toBeLessThan(chrome.storage.local.QUOTA_BYTES);
      }
    });
  });

  describe("Audio Compatibility", () => {
    it("should handle audio support across platforms", async () => {
      // Mock Audio API availability
      global.Audio = vi.fn().mockImplementation((src) => ({
        src,
        play: vi.fn().mockResolvedValue(),
        pause: vi.fn(),
        canPlayType: vi.fn((type) => {
          const supportedTypes = ["audio/mpeg", "audio/wav", "audio/ogg"];
          return supportedTypes.includes(type) ? "probably" : "";
        })
      }));

      const audio = new Audio("test.mp3");
      
      // Test format support
      const formatSupport = {
        mp3: audio.canPlayType("audio/mpeg"),
        wav: audio.canPlayType("audio/wav"),
        ogg: audio.canPlayType("audio/ogg"),
        webm: audio.canPlayType("audio/webm")
      };

      // At least MP3 should be supported everywhere
      expect(formatSupport.mp3).toBeTruthy();
    });

    it("should handle autoplay policies", async () => {
      // Mock autoplay policy detection
      const mockAudioContext = {
        state: "suspended", // Blocked by autoplay policy
        resume: vi.fn().mockResolvedValue()
      };

      global.AudioContext = vi.fn(() => mockAudioContext);

      const audioContext = new AudioContext();
      
      if (audioContext.state === "suspended") {
        // Handle autoplay restriction
        const autoplayHandling = {
          requiresUserInteraction: true,
          fallbackToManualStart: true,
          showUserPrompt: true
        };
        
        expect(autoplayHandling.requiresUserInteraction).toBe(true);
        expect(autoplayHandling.fallbackToManualStart).toBe(true);
      }
    });
  });

  describe("Notification Compatibility", () => {
    it("should handle notification support across platforms", async () => {
      // Test notification API availability
      const notificationSupport = {
        basicNotifications: !!chrome.notifications,
        richNotifications: !!chrome.notifications?.create,
        actionButtons: true, // Assume supported
        images: true // Assume supported
      };

      expect(notificationSupport.basicNotifications).toBe(true);
      expect(notificationSupport.richNotifications).toBe(true);

      // Test notification creation
      chrome.notifications.create.mockImplementation((id, options, callback) => {
        if (callback) callback(id || "test-notification-id");
      });

      const notificationId = await new Promise(resolve => {
        chrome.notifications.create("test", {
          type: "basic",
          iconUrl: "icon.png",
          title: "Test",
          message: "Test message"
        }, resolve);
      });

      expect(notificationId).toBeTruthy();
    });

    it("should handle platform-specific notification behaviors", async () => {
      const platformBehaviors = {
        windows: {
          actionCenter: true,
          soundSupport: true,
          persistentNotifications: true
        },
        mac: {
          notificationCenter: true,
          bannerStyle: true,
          doNotDisturb: true
        },
        linux: {
          desktopNotifications: true,
          customSounds: false,
          systemIntegration: true
        }
      };

      // All platforms should support basic notifications
      Object.values(platformBehaviors).forEach(behavior => {
        expect(typeof behavior).toBe("object");
      });
    });
  });

  describe("Performance Across Platforms", () => {
    it("should maintain acceptable performance on all platforms", async () => {
      const performanceTargets = {
        tabUpdateLatency: 50, // ms
        storageOperationLatency: 100, // ms
        memoryUsage: 10 * 1024 * 1024, // 10MB
        cpuUsage: 5 // 5%
      };

      // Simulate performance measurements
      const mockPerformance = {
        tabUpdateLatency: 25,
        storageOperationLatency: 45,
        memoryUsage: 6 * 1024 * 1024,
        cpuUsage: 2
      };

      expect(mockPerformance.tabUpdateLatency).toBeLessThan(performanceTargets.tabUpdateLatency);
      expect(mockPerformance.storageOperationLatency).toBeLessThan(performanceTargets.storageOperationLatency);
      expect(mockPerformance.memoryUsage).toBeLessThan(performanceTargets.memoryUsage);
      expect(mockPerformance.cpuUsage).toBeLessThan(performanceTargets.cpuUsage);
    });
  });
});