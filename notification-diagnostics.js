// Notification diagnostics - paste into service worker console

async function runNotificationDiagnostics() {
  console.log("🔍 NOTIFICATION DIAGNOSTICS");
  console.log("=" .repeat(50));
  
  try {
    // Check 1: Permission level
    const permission = await chrome.notifications.getPermissionLevel();
    console.log("📋 Permission level:", permission);
    
    // Check 2: Try to get all active notifications
    try {
      const activeNotifications = await chrome.notifications.getAll();
      console.log("📋 Active notifications:", Object.keys(activeNotifications).length);
      console.log("📋 Active notification IDs:", Object.keys(activeNotifications));
    } catch (error) {
      console.log("📋 Could not get active notifications:", error.message);
    }
    
    // Check 3: Test notification creation with detailed logging
    console.log("📋 Creating test notification with detailed logging...");
    
    const testId = `diagnostic-${Date.now()}`;
    const options = {
      type: "basic",
      title: "DIAGNOSTIC TEST",
      message: "If you see this, Chrome notifications are working!",
      iconUrl: "/assets/icons/icon48.png",
      priority: 2,
      requireInteraction: true
    };
    
    console.log("📋 Test notification ID:", testId);
    console.log("📋 Test notification options:", options);
    
    // Create notification and log result
    await chrome.notifications.create(testId, options);
    console.log("✅ Notification created successfully");
    
    // Wait a moment then check if it exists
    setTimeout(async () => {
      try {
        const allNotifications = await chrome.notifications.getAll();
        const exists = testId in allNotifications;
        console.log("📋 Notification exists in system:", exists);
        
        if (exists) {
          console.log("📋 Notification data:", allNotifications[testId]);
        }
      } catch (error) {
        console.log("📋 Error checking notification existence:", error.message);
      }
    }, 1000);
    
    // Check 4: Test different notification types
    setTimeout(async () => {
      console.log("📋 Testing list notification...");
      try {
        await chrome.notifications.create("test-list", {
          type: "list",
          title: "List Notification Test",
          message: "This is a list notification",
          iconUrl: "/assets/icons/icon48.png",
          items: [
            { title: "Item 1", message: "First item" },
            { title: "Item 2", message: "Second item" }
          ]
        });
        console.log("✅ List notification created");
      } catch (error) {
        console.log("❌ List notification failed:", error.message);
      }
    }, 3000);
    
    console.log("🔍 DIAGNOSTICS COMPLETE");
    console.log("If you don't see any notifications, the issue is likely:");
    console.log("1. Windows notification settings");
    console.log("2. Chrome notification settings");
    console.log("3. Focus Assist mode blocking notifications");
    
  } catch (error) {
    console.error("❌ Diagnostic error:", error);
  }
}

runNotificationDiagnostics();