// Debug script for distraction reminder
// Copy and paste this into the extension's service worker console

// Function to manually set focus tab and enable distraction reminder
async function setupDistractionTest() {
  try {
    console.log("=== SETTING UP DISTRACTION TEST ===");
    
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      console.error("No active tab found");
      return false;
    }
    
    const currentTab = tabs[0];
    console.log("Current tab:", currentTab.id, currentTab.url);
    
    // Set as focus tab
    focusTabId = currentTab.id;
    focusTabUrl = currentTab.url;
    distractionReminderEnabled = true;
    
    // Reset counters
    lastReminderTime = 0;
    reminderCount = 0;
    
    console.log("Focus tab set:", focusTabId);
    console.log("Focus URL:", focusTabUrl);
    console.log("Distraction reminder enabled:", distractionReminderEnabled);
    
    // Save to storage
    if (storageManager) {
      await storageManager.set('currentSession', {
        focusTabId: focusTabId,
        focusUrl: focusTabUrl,
        startTime: Date.now()
      });
      console.log("Saved to storage");
    }
    
    console.log("=== SETUP COMPLETE ===");
    console.log("Now switch to a different tab to test the distraction reminder");
    
    return true;
  } catch (error) {
    console.error("Error setting up distraction test:", error);
    return false;
  }
}

// Function to manually trigger distraction reminder
async function triggerDistractionReminder() {
  try {
    console.log("=== MANUALLY TRIGGERING DISTRACTION REMINDER ===");
    
    // Reset cooldown
    lastReminderTime = 0;
    reminderCount = 0;
    
    const result = await showDistractionReminder();
    console.log("Trigger result:", result);
    
    return result;
  } catch (error) {
    console.error("Error triggering distraction reminder:", error);
    return false;
  }
}

// Function to check current state
function checkState() {
  console.log("=== CURRENT STATE ===");
  console.log("distractionReminderEnabled:", distractionReminderEnabled);
  console.log("focusTabId:", focusTabId);
  console.log("focusTabUrl:", focusTabUrl);
  console.log("lastReminderTime:", lastReminderTime);
  console.log("reminderCount:", reminderCount);
  console.log("distractionTimer:", !!distractionTimer);
  console.log("DISTRACTION_CONFIG:", DISTRACTION_CONFIG);
  console.log("=== END STATE ===");
}

console.log("Debug functions loaded:");
console.log("- setupDistractionTest() - Set current tab as focus and enable reminders");
console.log("- triggerDistractionReminder() - Manually trigger a reminder");
console.log("- checkState() - Check current variables");
console.log("");
console.log("To test:");
console.log("1. Run setupDistractionTest()");
console.log("2. Switch to a different tab");
console.log("3. Wait a few seconds for automatic reminder");
console.log("4. Or run triggerDistractionReminder() to test immediately");