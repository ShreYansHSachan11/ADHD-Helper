// Comprehensive test for distraction reminder system
// Run this in the extension's service worker console

async function runComprehensiveTest() {
  console.log("🧪 STARTING COMPREHENSIVE DISTRACTION REMINDER TEST");
  console.log("=" .repeat(60));
  
  try {
    // Step 1: Check basic setup
    console.log("📋 STEP 1: Checking basic setup");
    console.log("Chrome notifications API available:", !!chrome.notifications);
    console.log("showDistractionReminder function available:", typeof showDistractionReminder);
    console.log("Global variables defined:");
    console.log("  - distractionReminderEnabled:", distractionReminderEnabled);
    console.log("  - focusTabId:", focusTabId);
    console.log("  - focusTabUrl:", focusTabUrl);
    console.log("  - DISTRACTION_CONFIG:", DISTRACTION_CONFIG);
    
    // Step 2: Check permissions
    console.log("\n🔐 STEP 2: Checking permissions");
    try {
      const permission = await chrome.notifications.getPermissionLevel();
      console.log("Notification permission:", permission);
      
      if (permission !== "granted") {
        console.error("❌ Notification permission not granted!");
        return false;
      } else {
        console.log("✅ Notification permission granted");
      }
    } catch (error) {
      console.error("❌ Error checking permissions:", error);
      return false;
    }
    
    // Step 3: Test basic notification
    console.log("\n📢 STEP 3: Testing basic notification");
    try {
      const testId = `test-basic-${Date.now()}`;
      await chrome.notifications.create(testId, {
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        title: "Test Notification",
        message: "This is a basic test notification"
      });
      console.log("✅ Basic notification created successfully");
      
      // Clear it after 3 seconds
      setTimeout(() => chrome.notifications.clear(testId), 3000);
    } catch (error) {
      console.error("❌ Failed to create basic notification:", error);
      return false;
    }
    
    // Step 4: Setup focus tab
    console.log("\n🎯 STEP 4: Setting up focus tab");
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      console.error("❌ No active tab found");
      return false;
    }
    
    const currentTab = tabs[0];
    focusTabId = currentTab.id;
    focusTabUrl = currentTab.url;
    distractionReminderEnabled = true;
    lastReminderTime = 0;
    reminderCount = 0;
    
    console.log("✅ Focus tab set:");
    console.log("  - ID:", focusTabId);
    console.log("  - URL:", focusTabUrl);
    
    // Step 5: Test distraction reminder function directly
    console.log("\n⚡ STEP 5: Testing distraction reminder function directly");
    try {
      const result = await showDistractionReminder();
      console.log("Distraction reminder result:", result);
      
      if (result) {
        console.log("✅ Distraction reminder function works!");
      } else {
        console.log("❌ Distraction reminder function returned false");
      }
    } catch (error) {
      console.error("❌ Error calling showDistractionReminder:", error);
      return false;
    }
    
    // Step 6: Test alarm system
    console.log("\n⏰ STEP 6: Testing alarm system");
    try {
      // Manually trigger the alarm handler
      await handleDistractionReminderCheck();
      console.log("✅ Alarm handler executed");
    } catch (error) {
      console.error("❌ Error in alarm handler:", error);
    }
    
    // Step 7: Test tab activation
    console.log("\n📑 STEP 7: Testing tab activation handler");
    try {
      // Test with a different tab ID to simulate switching away
      await handleTabActivated(999999); // Fake tab ID
      console.log("✅ Tab activation handler executed");
    } catch (error) {
      console.error("❌ Error in tab activation handler:", error);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 COMPREHENSIVE TEST COMPLETED");
    console.log("If you saw notifications appear, the system is working!");
    console.log("If not, check the error messages above.");
    
    return true;
    
  } catch (error) {
    console.error("❌ COMPREHENSIVE TEST FAILED:", error);
    return false;
  }
}

// Quick setup function
async function quickSetup() {
  console.log("🚀 QUICK SETUP");
  
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    focusTabId = tabs[0].id;
    focusTabUrl = tabs[0].url;
    distractionReminderEnabled = true;
    lastReminderTime = 0;
    reminderCount = 0;
    
    console.log("✅ Setup complete!");
    console.log("Focus tab:", focusTabId, focusTabUrl);
    console.log("Now switch to another tab to test");
  }
}

// Manual trigger function
async function manualTrigger() {
  console.log("🔥 MANUAL TRIGGER");
  lastReminderTime = 0;
  reminderCount = 0;
  
  const result = await showDistractionReminder();
  console.log("Result:", result);
  return result;
}

console.log("🧪 Test functions loaded:");
console.log("- runComprehensiveTest() - Full system test");
console.log("- quickSetup() - Quick setup for testing");
console.log("- manualTrigger() - Force trigger a notification");
console.log("");
console.log("Start with: runComprehensiveTest()");