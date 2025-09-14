// Test script to verify notification functionality
// Run this in the browser console on the extension's background page

async function testNotification() {
  try {
    console.log("Testing notification system...");
    
    // Check permission
    const permission = await chrome.notifications.getPermissionLevel();
    console.log("Notification permission:", permission);
    
    if (permission !== "granted") {
      console.error("Notification permission not granted!");
      return;
    }
    
    // Test basic notification
    const notificationId = `test-notification-${Date.now()}`;
    const options = {
      type: "basic",
      iconUrl: "/assets/icons/icon48.png",
      title: "Test Notification",
      message: "This is a test notification to verify the system is working.",
      priority: 2
    };
    
    console.log("Creating test notification with options:", options);
    
    await chrome.notifications.create(notificationId, options);
    console.log("Test notification created successfully!");
    
    // Auto-clear after 5 seconds
    setTimeout(async () => {
      try {
        await chrome.notifications.clear(notificationId);
        console.log("Test notification cleared");
      } catch (error) {
        console.log("Error clearing test notification:", error);
      }
    }, 5000);
    
  } catch (error) {
    console.error("Error testing notification:", error);
  }
}

// Run the test
testNotification();