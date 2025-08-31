/**
 * Demo script to test notification system
 * This script can be run in the browser console to test notifications
 */

// Demo function to test break notification
async function testBreakNotification() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "SHOW_BREAK_NOTIFICATION",
      tabId: 123,
      timeSpent: 1800000, // 30 minutes
    });

    console.log("Break notification response:", response);
  } catch (error) {
    console.error("Error testing break notification:", error);
  }
}

// Demo function to test focus notification
async function testFocusNotification() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "SHOW_FOCUS_NOTIFICATION",
      focusUrl: "https://work.example.com",
      currentUrl: "https://social.example.com",
    });

    console.log("Focus notification response:", response);
  } catch (error) {
    console.error("Error testing focus notification:", error);
  }
}

// Demo function to check notification permissions
async function checkNotificationPermission() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_NOTIFICATION_PERMISSION",
    });

    console.log("Notification permission:", response);
  } catch (error) {
    console.error("Error checking notification permission:", error);
  }
}

// Demo function to test notification system
async function demoNotificationSystem() {
  console.log("=== Notification System Demo ===");

  console.log("\n1. Checking notification permissions...");
  await checkNotificationPermission();

  console.log("\n2. Testing break notification...");
  await testBreakNotification();

  console.log("\n3. Waiting 2 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("\n4. Testing focus notification...");
  await testFocusNotification();

  console.log("\n5. Testing cooldown (should fail)...");
  await testBreakNotification();

  console.log("\nDemo complete! Check for notifications in your browser.");
}

// Export functions for manual testing
if (typeof window !== "undefined") {
  window.testBreakNotification = testBreakNotification;
  window.testFocusNotification = testFocusNotification;
  window.checkNotificationPermission = checkNotificationPermission;
  window.demoNotificationSystem = demoNotificationSystem;

  console.log("Notification demo functions loaded:");
  console.log("- testBreakNotification()");
  console.log("- testFocusNotification()");
  console.log("- checkNotificationPermission()");
  console.log("- demoNotificationSystem()");
}
