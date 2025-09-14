/**
 * Simple test script to verify extension loading
 */

console.log("Testing extension loading...");

// Test if Chrome APIs are available
if (typeof chrome !== 'undefined') {
  console.log("✅ Chrome APIs available");
  
  // Test storage
  if (chrome.storage && chrome.storage.local) {
    console.log("✅ Chrome storage API available");
  } else {
    console.log("❌ Chrome storage API not available");
  }
  
  // Test notifications
  if (chrome.notifications) {
    console.log("✅ Chrome notifications API available");
  } else {
    console.log("❌ Chrome notifications API not available");
  }
  
  // Test tabs
  if (chrome.tabs) {
    console.log("✅ Chrome tabs API available");
  } else {
    console.log("❌ Chrome tabs API not available");
  }
} else {
  console.log("❌ Chrome APIs not available");
}

// Test if global dependencies are loaded
if (typeof CONSTANTS !== 'undefined') {
  console.log("✅ CONSTANTS loaded");
} else {
  console.log("❌ CONSTANTS not loaded");
}

if (typeof HELPERS !== 'undefined') {
  console.log("✅ HELPERS loaded");
} else {
  console.log("❌ HELPERS not loaded");
}

if (typeof StorageManager !== 'undefined') {
  console.log("✅ StorageManager loaded");
} else {
  console.log("❌ StorageManager not loaded");
}

if (typeof BreakTimerManager !== 'undefined') {
  console.log("✅ BreakTimerManager loaded");
} else {
  console.log("❌ BreakTimerManager not loaded");
}

console.log("Extension loading test complete");