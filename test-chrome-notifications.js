// Test Chrome notifications system - paste into service worker console

async function testChromeNotifications() {
  console.log("🔔 Testing Chrome notification system...");
  
  try {
    // Test 1: Basic notification
    console.log("Test 1: Basic notification");
    await chrome.notifications.create("test-basic", {
      type: "basic",
      iconUrl: "/assets/icons/icon48.png",
      title: "Test Notification",
      message: "This is a test notification from Chrome extension"
    });
    console.log("✅ Basic notification created");
    
    // Test 2: High priority notification
    setTimeout(async () => {
      console.log("Test 2: High priority notification");
      await chrome.notifications.create("test-priority", {
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        title: "HIGH PRIORITY TEST",
        message: "This is a high priority test notification",
        priority: 2,
        requireInteraction: true
      });
      console.log("✅ High priority notification created");
    }, 2000);
    
    // Test 3: Notification with buttons
    setTimeout(async () => {
      console.log("Test 3: Notification with buttons");
      await chrome.notifications.create("test-buttons", {
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        title: "Button Test",
        message: "This notification has buttons",
        buttons: [
          { title: "Button 1" },
          { title: "Button 2" }
        ]
      });
      console.log("✅ Button notification created");
    }, 4000);
    
    // Test 4: Simple notification without icon
    setTimeout(async () => {
      console.log("Test 4: Simple notification without icon");
      await chrome.notifications.create("test-simple", {
        type: "basic",
        title: "Simple Test",
        message: "Simple notification without icon"
      });
      console.log("✅ Simple notification created");
    }, 6000);
    
    console.log("🔔 All notification tests queued. Check if any appear on screen!");
    
  } catch (error) {
    console.error("❌ Error testing notifications:", error);
  }
}

testChromeNotifications();