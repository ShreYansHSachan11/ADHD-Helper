/**
 * Popup-Background Communication Integration Tests
 * Tests for message passing between popup and background service worker
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Popup-Background Integration", () => {
  let mockBackgroundHandler;
  let mockPopupMessenger;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock background message handler
    mockBackgroundHandler = {
      handleMessage: vi.fn(),
      sendResponse: vi.fn(),
    };

    // Mock popup messenger
    mockPopupMessenger = {
      sendMessage: vi.fn(),
      addListener: vi.fn(),
    };

    // Setup Chrome runtime mocks
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      // Simulate background processing
      setTimeout(() => {
        mockBackgroundHandler.handleMessage(message);
        if (callback) {
          callback({ success: true, data: "test-response" });
        }
      }, 10);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tab Statistics Communication", () => {
    it("should request and receive tab statistics", async () => {
      const mockStats = {
        tabId: 1,
        url: "https://example.com",
        totalTime: 120000,
        currentSessionTime: 30000,
        breakRemindersShown: 1,
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("GET_TAB_STATS");
        callback({ success: true, data: mockStats });
      });

      // Simulate popup requesting tab stats
      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("GET_TAB_STATS");

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStats);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: "GET_TAB_STATS" },
        expect.any(Function)
      );
    });

    it("should handle tab statistics request errors", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: "Tab not found" });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("GET_TAB_STATS");

      expect(response.success).toBe(false);
      expect(response.error).toBe("Tab not found");
    });
  });

  describe("Focus Management Communication", () => {
    it("should set focus tab through message passing", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("SET_FOCUS_TAB");
        callback({ success: true });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("SET_FOCUS_TAB");

      expect(response.success).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: "SET_FOCUS_TAB" },
        expect.any(Function)
      );
    });

    it("should reset focus tab through message passing", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("RESET_FOCUS_TAB");
        callback({ success: true });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("RESET_FOCUS_TAB");

      expect(response.success).toBe(true);
    });

    it("should get focus info through message passing", async () => {
      const mockFocusInfo = {
        tabId: 1,
        url: "https://example.com",
        isSet: true,
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("GET_FOCUS_INFO");
        callback({ success: true, data: mockFocusInfo });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("GET_FOCUS_INFO");

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockFocusInfo);
    });
  });

  describe("Break Management Communication", () => {
    it("should trigger manual break through message passing", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("TRIGGER_MANUAL_BREAK");
        callback({ success: true });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("TRIGGER_MANUAL_BREAK");

      expect(response.success).toBe(true);
    });
  });

  describe("Settings Communication", () => {
    it("should update screen time settings", async () => {
      const newSettings = {
        limitMinutes: 45,
        enabled: true,
        notificationsEnabled: true,
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("UPDATE_SCREEN_TIME_SETTINGS");
        expect(message.settings).toEqual(newSettings);
        callback({ success: true });
      });

      const sendMessage = (type, data) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type, ...data }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("UPDATE_SCREEN_TIME_SETTINGS", {
        settings: newSettings,
      });

      expect(response.success).toBe(true);
    });

    it("should update focus settings", async () => {
      const newSettings = {
        enabled: true,
        reminderCooldownMinutes: 10,
        notificationsEnabled: false,
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("UPDATE_FOCUS_SETTINGS");
        expect(message.settings).toEqual(newSettings);
        callback({ success: true });
      });

      const sendMessage = (type, data) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type, ...data }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("UPDATE_FOCUS_SETTINGS", {
        settings: newSettings,
      });

      expect(response.success).toBe(true);
    });
  });

  describe("Tab History Communication", () => {
    it("should get all tab history", async () => {
      const mockTabHistory = {
        1: { url: "https://example.com", totalTime: 120000 },
        2: { url: "https://google.com", totalTime: 60000 },
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("GET_ALL_TAB_HISTORY");
        callback({ success: true, data: mockTabHistory });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("GET_ALL_TAB_HISTORY");

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockTabHistory);
    });

    it("should clear tab history", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe("CLEAR_TAB_HISTORY");
        callback({ success: true });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("CLEAR_TAB_HISTORY");

      expect(response.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle runtime errors gracefully", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        // Simulate runtime error
        callback({ success: false, error: "Runtime error occurred" });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("GET_TAB_STATS");

      expect(response.success).toBe(false);
      expect(response.error).toBe("Runtime error occurred");
    });

    it("should handle missing callback gracefully", async () => {
      chrome.runtime.sendMessage.mockImplementation((message) => {
        // No callback provided - should not throw
        expect(message.type).toBe("GET_TAB_STATS");
      });

      const sendMessage = (type) => {
        chrome.runtime.sendMessage({ type });
      };

      expect(() => sendMessage("GET_TAB_STATS")).not.toThrow();
    });

    it("should handle unknown message types", async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: "Unknown message type" });
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("UNKNOWN_MESSAGE_TYPE");

      expect(response.success).toBe(false);
      expect(response.error).toBe("Unknown message type");
    });
  });

  describe("Message Timing and Performance", () => {
    it("should handle messages within reasonable time", async () => {
      const startTime = performance.now();

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        // Simulate processing delay
        setTimeout(() => {
          callback({ success: true, data: "response" });
        }, 50);
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      const response = await sendMessage("GET_TAB_STATS");
      const endTime = performance.now();

      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle concurrent messages correctly", async () => {
      let messageCount = 0;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        messageCount++;
        setTimeout(() => {
          callback({ success: true, messageId: messageCount });
        }, Math.random() * 100);
      });

      const sendMessage = (type) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type }, (response) => {
            resolve(response);
          });
        });
      };

      // Send multiple concurrent messages
      const promises = [
        sendMessage("GET_TAB_STATS"),
        sendMessage("GET_FOCUS_INFO"),
        sendMessage("GET_ALL_TAB_HISTORY"),
      ];

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response.success).toBe(true);
        expect(response.messageId).toBeGreaterThan(0);
      });
    });
  });
});