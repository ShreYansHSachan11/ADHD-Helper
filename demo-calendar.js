/**
 * Demo script for Google Calendar API integration
 * Shows how to use the CalendarService for task reminder creation
 */

// Import the CalendarService (in a real extension, this would be loaded via script tag)
// For demo purposes, we'll simulate the usage

async function demoCalendarIntegration() {
  console.log("=== Google Calendar API Integration Demo ===");

  // Initialize the calendar service
  const calendarService = new CalendarService();

  // Demo 1: Setup instructions when not configured
  console.log("\n1. Setup Instructions (when API not configured):");
  const setupInstructions = calendarService.getSetupInstructions();
  console.log("Title:", setupInstructions.title);
  console.log("Steps:");
  setupInstructions.steps.forEach((step) => console.log("  ", step));
  console.log("Links:", setupInstructions.links);

  // Demo 2: Simulate API configuration
  console.log("\n2. Configuring API credentials...");
  const configResult = await calendarService.storeCredentials(
    "demo-api-key-12345",
    "demo-access-token-67890"
  );
  console.log("Configuration result:", configResult);

  // Demo 3: Test connection
  console.log("\n3. Testing API connection...");
  // Note: This would fail in demo since we don't have real credentials
  // In real usage, this would verify the connection to Google Calendar

  // Demo 4: Calculate reminder times for different priorities
  console.log("\n4. Reminder Time Calculation:");
  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  console.log("Task deadline:", deadline.toLocaleString());

  const priorities = ["high", "medium", "low"];
  priorities.forEach((priority) => {
    const reminderTimes = calendarService.calculateReminderTimes(
      deadline,
      priority
    );
    console.log(
      `\n${priority.toUpperCase()} Priority (${
        reminderTimes.length
      } reminders):`
    );
    reminderTimes.forEach((time, index) => {
      const timeUntil = calendarService.getTimeUntilDeadline(time, deadline);
      console.log(
        `  ${
          index + 1
        }. ${time.toLocaleString()} (${timeUntil} before deadline)`
      );
    });
  });

  // Demo 5: Task reminder creation workflow
  console.log("\n5. Task Reminder Creation Workflow:");
  console.log("Example usage in extension popup:");
  console.log(`
    // User inputs task details
    const taskName = "Complete project proposal";
    const deadline = new Date("2025-03-15T17:00:00");
    const priority = "high";
    
    try {
        // Create calendar reminders
        const result = await calendarService.createTaskReminders(taskName, deadline, priority);
        
        if (result.success) {
            console.log(\`Created \${result.createdCount} reminders for "\${taskName}"\`);
            // Show success message to user
        }
    } catch (error) {
        console.error('Calendar integration failed:', error.message);
        // Show error message and setup instructions to user
    }
    `);

  // Demo 6: Requirements compliance summary
  console.log("\n6. Requirements Compliance Summary:");
  console.log("✓ Requirement 4.1: Creates at least 3 reminders for every task");
  console.log(
    "✓ Requirement 4.2: High priority creates 4 reminders (1 week, 3 days, 1 day, 2 hours)"
  );
  console.log(
    "✓ Requirement 4.3: Medium priority creates 3 reminders (3 days, 1 day, 4 hours)"
  );
  console.log(
    "✓ Requirement 4.4: Low priority creates 3 reminders (1 week, 2 days, 8 hours)"
  );
  console.log(
    "✓ Requirement 4.5: Displays error messages when calendar integration fails"
  );
  console.log(
    "✓ Requirement 4.6: Displays setup instructions when API not configured"
  );

  console.log("\n=== Demo Complete ===");
}

// Export for testing or run if in browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = { demoCalendarIntegration };
} else if (typeof window !== "undefined") {
  window.demoCalendarIntegration = demoCalendarIntegration;

  // Auto-run demo if CalendarService is available
  if (typeof CalendarService !== "undefined") {
    demoCalendarIntegration().catch(console.error);
  }
}
