import { describe, it, expect, beforeEach, vi } from "vitest";

// Import the helpers
const HelpersModule = await import("../utils/helpers.js");
const HELPERS = HelpersModule.default || HelpersModule.HELPERS || HelpersModule;
const { TimeUtils, FormatUtils, ValidationUtils, GeneralUtils } = HELPERS;

describe("TimeUtils", () => {
  describe("msToMinutes", () => {
    it("should convert milliseconds to minutes correctly", () => {
      expect(TimeUtils.msToMinutes(60000)).toBe(1);
      expect(TimeUtils.msToMinutes(90000)).toBe(2); // rounds up
      expect(TimeUtils.msToMinutes(30000)).toBe(1); // rounds up
    });
  });

  describe("minutesToMs", () => {
    it("should convert minutes to milliseconds correctly", () => {
      expect(TimeUtils.minutesToMs(1)).toBe(60000);
      expect(TimeUtils.minutesToMs(5)).toBe(300000);
    });
  });

  describe("timeDiff", () => {
    it("should calculate time difference correctly", () => {
      const start = 1000;
      const end = 2000;
      expect(TimeUtils.timeDiff(start, end)).toBe(1000);
    });

    it("should return 0 for negative differences", () => {
      const start = 2000;
      const end = 1000;
      expect(TimeUtils.timeDiff(start, end)).toBe(0);
    });
  });

  describe("hasTimePassed", () => {
    it("should return true when time has passed", () => {
      const timestamp = Date.now() - 2000; // 2 seconds ago
      expect(TimeUtils.hasTimePassed(timestamp, 1000)).toBe(true);
    });

    it("should return false when time has not passed", () => {
      const timestamp = Date.now() - 500; // 0.5 seconds ago
      expect(TimeUtils.hasTimePassed(timestamp, 1000)).toBe(false);
    });
  });

  describe("addTime", () => {
    it("should add time correctly", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const result = TimeUtils.addTime(date, {
        days: 1,
        hours: 2,
        minutes: 30,
      });

      expect(result.getUTCDate()).toBe(2);
      expect(result.getUTCHours()).toBe(2);
      expect(result.getUTCMinutes()).toBe(30);
    });
  });

  describe("subtractTime", () => {
    it("should subtract time correctly", () => {
      const date = new Date("2024-01-02T02:30:00Z");
      const result = TimeUtils.subtractTime(date, {
        days: 1,
        hours: 2,
        minutes: 30,
      });

      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
    });
  });
});

describe("FormatUtils", () => {
  describe("formatDuration", () => {
    it("should format duration without seconds", () => {
      expect(FormatUtils.formatDuration(3661000)).toBe("1h 1m"); // 1h 1m 1s
      expect(FormatUtils.formatDuration(61000)).toBe("1m"); // 1m 1s
      expect(FormatUtils.formatDuration(1000)).toBe("0m"); // 1s
    });

    it("should format duration with seconds", () => {
      expect(FormatUtils.formatDuration(3661000, true)).toBe("1h 1m 1s");
      expect(FormatUtils.formatDuration(61000, true)).toBe("1m 1s");
      expect(FormatUtils.formatDuration(1000, true)).toBe("1s");
    });

    it("should handle zero and negative values", () => {
      expect(FormatUtils.formatDuration(0)).toBe("0m");
      expect(FormatUtils.formatDuration(-1000)).toBe("0m");
    });
  });

  describe("formatTimeForUI", () => {
    it("should format time for UI display", () => {
      expect(FormatUtils.formatTimeForUI(3600000)).toBe("1h"); // 1 hour
      expect(FormatUtils.formatTimeForUI(3660000)).toBe("1h 1m"); // 1h 1m
      expect(FormatUtils.formatTimeForUI(60000)).toBe("1m"); // 1 minute
      expect(FormatUtils.formatTimeForUI(30000)).toBe("1m"); // Less than 1 minute shows as 1m
    });
  });

  describe("formatPercentage", () => {
    it("should format percentage correctly", () => {
      expect(FormatUtils.formatPercentage(0.5)).toBe("50.0%");
      expect(FormatUtils.formatPercentage(0.333, 2)).toBe("33.30%");
      expect(FormatUtils.formatPercentage(1)).toBe("100.0%");
    });
  });
});

describe("ValidationUtils", () => {
  describe("isValidTimeLimit", () => {
    it("should validate time limits correctly", () => {
      expect(ValidationUtils.isValidTimeLimit(30)).toBe(true);
      expect(ValidationUtils.isValidTimeLimit(5)).toBe(true);
      expect(ValidationUtils.isValidTimeLimit(180)).toBe(true);

      expect(ValidationUtils.isValidTimeLimit(4)).toBe(false); // Too low
      expect(ValidationUtils.isValidTimeLimit(181)).toBe(false); // Too high
      expect(ValidationUtils.isValidTimeLimit(30.5)).toBe(false); // Not integer
      expect(ValidationUtils.isValidTimeLimit("30")).toBe(false); // Not number
    });
  });

  describe("isValidTaskName", () => {
    it("should validate task names correctly", () => {
      expect(ValidationUtils.isValidTaskName("Valid task")).toBe(true);
      expect(ValidationUtils.isValidTaskName("A")).toBe(true);

      expect(ValidationUtils.isValidTaskName("")).toBe(false);
      expect(ValidationUtils.isValidTaskName("   ")).toBe(false);
      expect(ValidationUtils.isValidTaskName("a".repeat(201))).toBe(false); // Too long
      expect(ValidationUtils.isValidTaskName(123)).toBe(false); // Not string
    });
  });

  describe("isValidPriority", () => {
    it("should validate priority levels correctly", () => {
      expect(ValidationUtils.isValidPriority("low")).toBe(true);
      expect(ValidationUtils.isValidPriority("medium")).toBe(true);
      expect(ValidationUtils.isValidPriority("high")).toBe(true);

      expect(ValidationUtils.isValidPriority("invalid")).toBe(false);
      expect(ValidationUtils.isValidPriority("")).toBe(false);
      expect(ValidationUtils.isValidPriority(null)).toBe(false);
    });
  });

  describe("isValidFutureDate", () => {
    it("should validate future dates correctly", () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const pastDate = new Date(Date.now() - 86400000); // Yesterday

      expect(ValidationUtils.isValidFutureDate(futureDate)).toBe(true);
      expect(ValidationUtils.isValidFutureDate(futureDate.toISOString())).toBe(
        true
      );

      expect(ValidationUtils.isValidFutureDate(pastDate)).toBe(false);
      expect(ValidationUtils.isValidFutureDate("invalid")).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("should validate URLs correctly", () => {
      expect(ValidationUtils.isValidUrl("https://example.com")).toBe(true);
      expect(ValidationUtils.isValidUrl("http://localhost:3000")).toBe(true);

      expect(ValidationUtils.isValidUrl("invalid-url")).toBe(false);
      expect(ValidationUtils.isValidUrl("")).toBe(false);
    });
  });

  describe("isValidVolume", () => {
    it("should validate volume levels correctly", () => {
      expect(ValidationUtils.isValidVolume(0)).toBe(true);
      expect(ValidationUtils.isValidVolume(0.5)).toBe(true);
      expect(ValidationUtils.isValidVolume(1)).toBe(true);

      expect(ValidationUtils.isValidVolume(-0.1)).toBe(false);
      expect(ValidationUtils.isValidVolume(1.1)).toBe(false);
      expect(ValidationUtils.isValidVolume("0.5")).toBe(false);
    });
  });
});

describe("GeneralUtils", () => {
  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = GeneralUtils.generateId();
      const id2 = GeneralUtils.generateId();

      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe("deepClone", () => {
    it("should clone objects deeply", () => {
      const original = {
        a: 1,
        b: {
          c: 2,
          d: [3, 4, { e: 5 }],
        },
        f: new Date("2024-01-01"),
      };

      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
      expect(cloned.f).not.toBe(original.f);
    });

    it("should handle primitive values", () => {
      expect(GeneralUtils.deepClone(null)).toBe(null);
      expect(GeneralUtils.deepClone(42)).toBe(42);
      expect(GeneralUtils.deepClone("string")).toBe("string");
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      const mockFn = vi.fn();
      const debouncedFn = GeneralUtils.debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("sanitizeString", () => {
    it("should sanitize strings correctly", () => {
      expect(GeneralUtils.sanitizeString('<script>alert("xss")</script>')).toBe(
        'scriptalert("xss")/script'
      );
      expect(GeneralUtils.sanitizeString("  normal text  ")).toBe(
        "normal text"
      );
      expect(GeneralUtils.sanitizeString(123)).toBe("");
      expect(GeneralUtils.sanitizeString(null)).toBe("");
    });
  });

  describe("hasPermissions", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should check permissions correctly", async () => {
      chrome.permissions.contains.mockResolvedValue(true);

      const result = await GeneralUtils.hasPermissions(["storage", "tabs"]);

      expect(chrome.permissions.contains).toHaveBeenCalledWith({
        permissions: ["storage", "tabs"],
      });
      expect(result).toBe(true);
    });

    it("should handle permission check errors", async () => {
      chrome.permissions.contains.mockRejectedValue(
        new Error("Permission error")
      );

      const result = await GeneralUtils.hasPermissions(["storage"]);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it("should return false when chrome.permissions is not available", async () => {
      const originalPermissions = chrome.permissions;
      delete chrome.permissions;

      const result = await GeneralUtils.hasPermissions(["storage"]);

      expect(result).toBe(false);

      chrome.permissions = originalPermissions;
    });
  });
});
