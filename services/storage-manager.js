/**
 * Storage Manager - Chrome Extension Storage API Wrapper
 * Provides simplified interface for Chrome storage operations
 */

class StorageManager {
  constructor() {
    this.storage = chrome.storage.local;
  }

  /**
   * Get a single value from storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} - Stored value or null if not found
   */
  async get(key) {
    try {
      const result = await this.storage.get(key);
      return result[key] || null;
    } catch (error) {
      console.error("Storage get error:", error);
      return null;
    }
  }

  /**
   * Get multiple values from storage
   * @param {string[]} keys - Array of storage keys
   * @returns {Promise<Object>} - Object with key-value pairs
   */
  async getMultiple(keys) {
    try {
      const result = await this.storage.get(keys);
      return result;
    } catch (error) {
      console.error("Storage getMultiple error:", error);
      return {};
    }
  }

  /**
   * Set a single value in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value) {
    try {
      await this.storage.set({ [key]: value });
      return true;
    } catch (error) {
      console.error("Storage set error:", error);
      return false;
    }
  }

  /**
   * Set multiple values in storage
   * @param {Object} items - Object with key-value pairs to store
   * @returns {Promise<boolean>} - Success status
   */
  async setMultiple(items) {
    try {
      await this.storage.set(items);
      return true;
    } catch (error) {
      console.error("Storage setMultiple error:", error);
      return false;
    }
  }

  /**
   * Remove a single key from storage
   * @param {string} key - Storage key to remove
   * @returns {Promise<boolean>} - Success status
   */
  async remove(key) {
    try {
      await this.storage.remove(key);
      return true;
    } catch (error) {
      console.error("Storage remove error:", error);
      return false;
    }
  }

  /**
   * Remove multiple keys from storage
   * @param {string[]} keys - Array of storage keys to remove
   * @returns {Promise<boolean>} - Success status
   */
  async removeMultiple(keys) {
    try {
      await this.storage.remove(keys);
      return true;
    } catch (error) {
      console.error("Storage removeMultiple error:", error);
      return false;
    }
  }

  /**
   * Clear all storage data
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      await this.storage.clear();
      return true;
    } catch (error) {
      console.error("Storage clear error:", error);
      return false;
    }
  }

  /**
   * Get all storage data
   * @returns {Promise<Object>} - All stored data
   */
  async getAll() {
    try {
      const result = await this.storage.get(null);
      return result;
    } catch (error) {
      console.error("Storage getAll error:", error);
      return {};
    }
  }

  /**
   * Check if a key exists in storage
   * @param {string} key - Storage key to check
   * @returns {Promise<boolean>} - Whether key exists
   */
  async exists(key) {
    try {
      const result = await this.storage.get(key);
      return key in result;
    } catch (error) {
      console.error("Storage exists error:", error);
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} - Storage usage stats
   */
  async getUsage() {
    try {
      const bytesInUse = await this.storage.getBytesInUse();
      return {
        bytesInUse,
        quota: chrome.storage.local.QUOTA_BYTES,
        percentUsed: (bytesInUse / chrome.storage.local.QUOTA_BYTES) * 100,
      };
    } catch (error) {
      console.error("Storage getUsage error:", error);
      return { bytesInUse: 0, quota: 0, percentUsed: 0 };
    }
  }
}

// Export singleton instance
const storageManager = new StorageManager();

// For use in service worker and popup
if (typeof module !== "undefined" && module.exports) {
  module.exports = StorageManager;
} else if (typeof window !== "undefined") {
  window.StorageManager = StorageManager;
  window.storageManager = storageManager;
}
