import { describe, it, expect } from "vitest";

// Import the constants
const ConstantsModule = await import("../utils/constants.js");
const CONSTANTS =
  ConstantsModule.default || ConstantsModule.CONSTANTS || ConstantsModule;

describe("Constants", () => {
  describe("SCREEN_TIME", () => {
    it("should have valid default values", () => {
      expect(CONSTANTS.SCREEN_TIME.DEFAULT_LIMIT_MINUTES).toBe(30);
      expect(CONSTANTS.SCREEN_TIME.MIN_LIMIT_MINUTES).toBe(5);
      expect(CONSTANTS.SCREEN_TIME.MAX_LIMIT_MINUTES).toBe(180);
      expect(CONSTANTS.SCREEN_TIME.NOTIFICATION_COOLDOWN_MS).toBe(60000);
    });
  });

  describe("FOCUS", () => {
    it("should have valid focus settings", () => {
      expect(CONSTANTS.FOCUS.REMINDER_COOLDOWN_MINUTES).toBe(5);
      expect(CONSTANTS.FOCUS.DEFAULT_ENABLED).toBe(true);
      expect(CONSTANTS.FOCUS.DEVIATION_THRESHOLD_MS).toBe(3000);
    });
  });

  describe("TASKS", () => {
    it("should have valid task configuration", () => {
      expect(CONSTANTS.TASKS.MAX_TASK_NAME_LENGTH).toBe(200);
      expect(CONSTANTS.TASKS.PRIORITY_LEVELS).toEqual([
        "low",
        "medium",
        "high",
      ]);
      expect(CONSTANTS.TASKS.DEFAULT_PRIORITY).toBe("medium");
    });
  });

  describe("CALENDAR", () => {
    it("should have valid reminder schedules for all priorities", () => {
      const schedules = CONSTANTS.CALENDAR.REMINDER_SCHEDULES;

      expect(schedules.high).toHaveLength(4);
      expect(schedules.medium).toHaveLength(3);
      expect(schedules.low).toHaveLength(3);

      // Check that all schedules have valid structure
      Object.values(schedules).forEach((schedule) => {
        schedule.forEach((reminder) => {
          expect(reminder).toHaveProperty("days");
          expect(reminder).toHaveProperty("hours");
          expect(typeof reminder.days).toBe("number");
          expect(typeof reminder.hours).toBe("number");
        });
      });
    });
  });

  describe("BREATHING", () => {
    it("should have valid breathing exercise settings", () => {
      const durations = CONSTANTS.BREATHING.DEFAULT_DURATIONS;

      expect(durations.inhale).toBe(4000);
      expect(durations.holdIn).toBe(1000);
      expect(durations.exhale).toBe(4000);
      expect(durations.holdOut).toBe(1000);

      expect(CONSTANTS.BREATHING.PHASES).toEqual([
        "inhale",
        "holdIn",
        "exhale",
        "holdOut",
      ]);
      expect(CONSTANTS.BREATHING.MIN_DURATION).toBe(1000);
      expect(CONSTANTS.BREATHING.MAX_DURATION).toBe(10000);
    });
  });

  describe("STORAGE_KEYS", () => {
    it("should have all required storage keys", () => {
      const keys = CONSTANTS.STORAGE_KEYS;

      expect(keys.TAB_HISTORY).toBe("tabHistory");
      expect(keys.CURRENT_SESSION).toBe("currentSession");
      expect(keys.SCREEN_TIME_SETTINGS).toBe("screenTimeSettings");
      expect(keys.TASKS).toBe("tasks");
      expect(keys.API_KEYS).toBe("apiKeys");
    });
  });

  describe("DEFAULT_SETTINGS", () => {
    it("should have complete default settings structure", () => {
      const settings = CONSTANTS.DEFAULT_SETTINGS;

      expect(settings.screenTime).toHaveProperty("limitMinutes");
      expect(settings.screenTime).toHaveProperty("enabled");
      expect(settings.focus).toHaveProperty("enabled");
      expect(settings.breathing).toHaveProperty("durations");
      expect(settings.audio).toHaveProperty("whiteNoise");

      expect(settings.screenTime.limitMinutes).toBe(30);
      expect(settings.focus.enabled).toBe(true);
      expect(settings.audio.whiteNoise.volume).toBe(0.5);
    });
  });

  describe("ERROR_MESSAGES", () => {
    it("should have all required error messages", () => {
      const errors = CONSTANTS.ERROR_MESSAGES;

      expect(errors.STORAGE_QUOTA_EXCEEDED).toBeTruthy();
      expect(errors.API_KEY_MISSING).toBeTruthy();
      expect(errors.NETWORK_ERROR).toBeTruthy();
      expect(errors.PERMISSION_DENIED).toBeTruthy();
      expect(errors.INVALID_INPUT).toBeTruthy();
      expect(errors.UNKNOWN_ERROR).toBeTruthy();
    });
  });

  describe("API", () => {
    it("should have valid API configuration", () => {
      expect(CONSTANTS.API.GEMINI.BASE_URL).toContain("googleapis.com");
      expect(CONSTANTS.API.GEMINI.MAX_RETRIES).toBe(3);
      expect(CONSTANTS.API.GEMINI.TIMEOUT_MS).toBe(10000);

      expect(CONSTANTS.API.GOOGLE_CALENDAR.BASE_URL).toContain(
        "googleapis.com"
      );
      expect(CONSTANTS.API.GOOGLE_CALENDAR.SCOPES).toContain(
        "https://www.googleapis.com/auth/calendar.events"
      );
    });
  });

  describe("UI", () => {
    it("should have valid UI configuration", () => {
      expect(CONSTANTS.UI.POPUP.WIDTH).toBe(400);
      expect(CONSTANTS.UI.POPUP.MIN_HEIGHT).toBe(500);

      expect(CONSTANTS.UI.COLORS.PRIMARY).toBe("#4285f4");
      expect(CONSTANTS.UI.COLORS.SUCCESS).toBe("#34a853");

      expect(CONSTANTS.UI.ANIMATION.BREATHING_CIRCLE_SIZE.MIN).toBe(50);
      expect(CONSTANTS.UI.ANIMATION.BREATHING_CIRCLE_SIZE.MAX).toBe(120);
    });
  });
});
