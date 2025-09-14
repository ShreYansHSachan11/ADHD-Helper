// Simple manual test - paste this into the service worker console

async function testNow() {
  console.log("🧪 MANUAL TEST");
  
  // Reset cooldowns
  lastReminderTime = 0;
  reminderCount = 0;
  
  console.log("Calling showDistractionReminder()...");
  const result = await showDistractionReminder();
  console.log("Result:", result);
  
  return result;
}

console.log("Run: testNow()");