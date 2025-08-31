import { describe, it, expect, beforeEach, vi } from "vitest";

// Import the StorageManager class
const StorageManagerModule = await import("../services/storage-manager.js");
const StorageManager =
  StorageManagerModule.default ||
  StorageManagerModule.StorageManager ||
  StorageManagerModule;

describe("StorageManager", () => {
  let storageManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create new instance for each test
    storageManager = new StorageManager();
  });

  describe("get", () => {
    it("should return stored value when key exists", async () => {
      const testKey = "testKey";
      const testValue = "testValue";

      chrome.storage.local.get.mockResolvedValue({ [testKey]: testValue });

      const result = await storageManager.get(testKey);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(testKey);
      expect(result).toBe(testValue);
    });

    it("should return null when key does not exist", async () => {
      const testKey = "nonExistentKey";

      chrome.storage.local.get.mockResolvedValue({});

      const result = await storageManager.get(testKey);

      expect(result).toBeNull();
    });

    it("should return null when storage operation fails", async () => {
      const testKey = "testKey";

      chrome.storage.local.get.mockRejectedValue(new Error("Storage error"));

      const result = await storageManager.get(testKey);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("getMultiple", () => {
    it("should return multiple values", async () => {
      const keys = ["key1", "key2"];
      const values = { key1: "value1", key2: "value2" };

      chrome.storage.local.get.mockResolvedValue(values);

      const result = await storageManager.getMultiple(keys);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(keys);
      expect(result).toEqual(values);
    });

    it("should return empty object on error", async () => {
      const keys = ["key1", "key2"];

      chrome.storage.local.get.mockRejectedValue(new Error("Storage error"));

      const result = await storageManager.getMultiple(keys);

      expect(result).toEqual({});
    });
  });

  describe("set", () => {
    it("should store value successfully", async () => {
      const testKey = "testKey";
      const testValue = "testValue";

      chrome.storage.local.set.mockResolvedValue();

      const result = await storageManager.set(testKey, testValue);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [testKey]: testValue,
      });
      expect(result).toBe(true);
    });

    it("should return false on storage error", async () => {
      const testKey = "testKey";
      const testValue = "testValue";

      chrome.storage.local.set.mockRejectedValue(new Error("Storage error"));

      const result = await storageManager.set(testKey, testValue);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("setMultiple", () => {
    it("should store multiple values successfully", async () => {
      const items = { key1: "value1", key2: "value2" };

      chrome.storage.local.set.mockResolvedValue();

      const result = await storageManager.setMultiple(items);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(items);
      expect(result).toBe(true);
    });
  });

  describe("remove", () => {
    it("should remove key successfully", async () => {
      const testKey = "testKey";

      chrome.storage.local.remove.mockResolvedValue();

      const result = await storageManager.remove(testKey);

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(testKey);
      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      const testKey = "testKey";

      chrome.storage.local.remove.mockRejectedValue(new Error("Storage error"));

      const result = await storageManager.remove(testKey);

      expect(result).toBe(false);
    });
  });

  describe("exists", () => {
    it("should return true when key exists", async () => {
      const testKey = "testKey";

      chrome.storage.local.get.mockResolvedValue({ [testKey]: "value" });

      const result = await storageManager.exists(testKey);

      expect(result).toBe(true);
    });

    it("should return false when key does not exist", async () => {
      const testKey = "testKey";

      chrome.storage.local.get.mockResolvedValue({});

      const result = await storageManager.exists(testKey);

      expect(result).toBe(false);
    });
  });

  describe("getUsage", () => {
    it("should return storage usage information", async () => {
      const bytesInUse = 1000;
      const quota = chrome.storage.local.QUOTA_BYTES;

      chrome.storage.local.getBytesInUse.mockResolvedValue(bytesInUse);

      const result = await storageManager.getUsage();

      expect(result).toEqual({
        bytesInUse,
        quota,
        percentUsed: (bytesInUse / quota) * 100,
      });
    });

    it("should return default values on error", async () => {
      chrome.storage.local.getBytesInUse.mockRejectedValue(
        new Error("Storage error")
      );

      const result = await storageManager.getUsage();

      expect(result).toEqual({
        bytesInUse: 0,
        quota: 0,
        percentUsed: 0,
      });
    });
  });
});
