// Test script for distraction reminder functionality
// Run this in the browser console on the extension's background page

// Function to manually trigger a distraction reminder for testing
async function testDistractionReminder() {
  try {
    console.log("=== TESTING DISTRACTION REMINDER ===");
    
    // Set up test focus tab (use current active tab)
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      focusTabId = tabs[0].id;
      focusTabUrl = tabs[0].url;
      console.log("Set test focus tab:", focusTabId, focusTabUrl);
    }
    
    // Enable distraction reminder
    distractionReminderEnabled = true;
    
    // Reset cooldown to allow immediate testing
    lastReminderTime = 0;
    reminderCount = 0;
    
    console.log("Calling showDistractionReminder()...");
    const result = await showDistractionReminder();
    
    console.log("Result:", result);
    console.log("=== END TEST ===");
    
    return result;
  } catch (error) {
    console.error("Error testing distraction reminder:", error);
    return false;
  }
}

// Function to check current state
function checkDistractionReminderState() {
  console.log("=== DISTRACTION REMINDER STATE ===");
  console.log("Enabled:", distractionReminderEnabled);
  console.log("Focus tab ID:", focusTabId);
  console.log("Focus tab URL:", focusTabUrl);
  console.log("Last reminder time:", lastReminderTime);
  console.log("Reminder count:", reminderCount);
  console.log("Distraction timer active:", !!distractionTimer);
  console.log("Config:", DISTRACTION_CONFIG);
  console.log("=== END STATE ===");
}

// Function to manually set focus tab for testing
async function setTestFocusTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      focusTabId = tabs[0].id;
      focusTabUrl = tabs[0].url;
      reminderCount = 0;
      console.log("Test focus tab set:", focusTabId, focusTabUrl);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error setting test focus tab:", error);
    return false;
  }
}

console.log("Distraction reminder test functions loaded:");
console.log("- testDistractionReminder() - manually trigger a reminder");
console.log("- checkDistractionReminderState() - check current state");
console.log("- setTestFocusTab() - set current tab as focus tab for testing");