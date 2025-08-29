# Requirements Document

## Introduction

This Chrome extension is designed to help users maintain focus, manage tasks effectively, and reduce anxiety through various productivity and wellness features. The extension combines screen time monitoring, task management with AI assistance, calendar integration, and wellness tools including breathing exercises, ASMR sounds, and white noise functionality.

## Requirements

### Requirement 1: Screen Time Monitoring

**User Story:** As a user, I want to be reminded when I've been on the same tab for too long, so that I can take regular breaks and maintain healthy browsing habits.

#### Acceptance Criteria

1. WHEN a user stays on the same active tab for more than the configured time limit (default 30 minutes) THEN the system SHALL display a popup notification reminding them to take a break
2. WHEN a user configures a custom time limit THEN the system SHALL use that value instead of the default 30 minutes
3. WHEN a user switches to a different tab THEN the system SHALL reset the timer for the new active tab
4. WHEN a user dismisses the break reminder THEN the system SHALL reset the timer for the current tab

### Requirement 2: Focus Maintenance

**User Story:** As a user, I want to be reminded when I switch away from my initial task tab, so that I can stay focused on my primary objective.

#### Acceptance Criteria

1. WHEN a user starts a browsing session THEN the system SHALL record the initial active tab as the focus tab
2. WHEN a user switches away from the initial focus tab THEN the system SHALL display a popup reminder to stay focused on the initial website
3. WHEN a user manually sets a new focus tab THEN the system SHALL update the focus tab reference
4. WHEN a user dismisses the focus reminder THEN the system SHALL not show another focus reminder for 5 minutes

### Requirement 3: AI-Powered Task Breakdown

**User Story:** As a user, I want to input a task and get an AI-generated breakdown of actionable steps, so that I can approach complex tasks systematically.

#### Acceptance Criteria

1. WHEN a user inputs a task name and deadline THEN the system SHALL send this information to the Google Gemini API
2. WHEN the Gemini API responds THEN the system SHALL display a structured breakdown of actionable steps in the extension popup
3. WHEN the API call fails THEN the system SHALL display an appropriate error message
4. WHEN a user saves a task breakdown THEN the system SHALL store it locally for future reference
5. IF no API key is configured THEN the system SHALL display a placeholder message with setup instructions

### Requirement 4: Calendar Integration for Task Reminders

**User Story:** As a user, I want to automatically create calendar reminders for my tasks based on priority and deadline, so that I don't miss important deadlines.

#### Acceptance Criteria

1. WHEN a user inputs task name, deadline, and priority THEN the system SHALL create at least 3 reminders in Google Calendar for every task
2. WHEN priority is set to "High" THEN the system SHALL create more frequent reminders (minimum 4 reminders: 1 week, 3 days, 1 day, and 2 hours before deadline)
3. WHEN priority is set to "Medium" THEN the system SHALL create moderate frequency reminders (minimum 3 reminders: 3 days, 1 day, and 4 hours before deadline)
4. WHEN priority is set to "Low" THEN the system SHALL create less frequent reminders (minimum 3 reminders: 1 week, 2 days, and 8 hours before deadline)
5. WHEN calendar integration fails THEN the system SHALL display an error message and allow manual reminder creation
6. IF no calendar API access is configured THEN the system SHALL display setup instructions


### Requirement 5: Focus and Anxiety Management

**User Story:** As a user, I want access to focus and anxiety management tools, so that I can maintain mental wellness while working.

#### Acceptance Criteria

1. WHEN a user clicks on "Focus & Anxiety Management" THEN the system SHALL open an external HTML page with wellness resources
2. WHEN the external page loads THEN it SHALL display various anxiety management techniques and focus strategies
3. WHEN a user interacts with the wellness tools THEN the system SHALL track usage for personal insights
4. WHEN the external page is closed THEN the user SHALL return to the main extension interface

### Requirement 6: ASMR and Fidgeting Tools

**User Story:** As a user, I want access to ASMR sounds and fidgeting tools, so that I can manage stress and maintain focus through sensory engagement.

#### Acceptance Criteria

1. WHEN a user clicks on "Fidgeting & ASMR Sounds" THEN the system SHALL open an external HTML page with interactive tools
2. WHEN the ASMR page loads THEN it SHALL provide various sound options and interactive fidgeting elements
3. WHEN a user selects an ASMR sound THEN the system SHALL play the audio with volume controls
4. WHEN a user interacts with fidgeting tools THEN the system SHALL provide responsive visual and audio feedback
5. WHEN the user closes the ASMR page THEN audio SHALL stop automatically

### Requirement 7: Breathing Exercise Module

**User Story:** As a user, I want guided breathing exercises directly in the extension popup, so that I can quickly access stress relief without leaving my current workflow.

#### Acceptance Criteria

1. WHEN a user clicks on the breathing exercise feature THEN the system SHALL display an animated breathing guide in the popup
2. WHEN the breathing exercise starts THEN the system SHALL show an expanding/contracting circle animation
3. WHEN the animation plays THEN the system SHALL display guided text ("Breathe in… Hold… Breathe out…") synchronized with the animation
4. WHEN a user wants to customize the breathing pattern THEN the system SHALL allow adjustment of inhale, hold, and exhale durations
5. WHEN a user completes a breathing session THEN the system SHALL track the session duration and provide completion feedback

### Requirement 8: White Noise Toggle

**User Story:** As a user, I want a simple toggle to activate white noise, so that I can create a consistent audio environment for focus.

#### Acceptance Criteria

1. WHEN a user clicks the white noise toggle THEN the system SHALL start or stop white noise playback
2. WHEN white noise is active THEN the toggle SHALL show an "on" state with visual indication
3. WHEN white noise is playing THEN the system SHALL provide volume control
4. WHEN a user closes the extension popup THEN white noise SHALL continue playing in the background
5. WHEN a user reopens the extension THEN the toggle state SHALL reflect the current white noise status
6. WHEN the browser is closed THEN white noise SHALL stop automatically

### Requirement 9: Extension Popup Interface

**User Story:** As a user, I want all extension features to be easily accessible from the main popup, so that I can quickly access any functionality without navigating through multiple screens.

#### Acceptance Criteria

1. WHEN a user opens the extension popup THEN all modules SHALL be visible and accessible from the default view
2. WHEN the popup loads THEN it SHALL display controls for screen time settings, focus tracking, task breakdown, calendar integration, breathing exercises, and white noise toggle
3. WHEN a user wants to access external pages (Focus & Anxiety Management, ASMR tools) THEN the buttons SHALL be prominently displayed in the main popup
4. WHEN the popup is displayed THEN it SHALL maintain a clean, organized layout despite showing all features
5. WHEN a user interacts with any feature THEN the response SHALL be immediate and intuitive

### Requirement 10: Technical Architecture

**User Story:** As a developer, I want the extension to follow modern Chrome extension standards and be maintainable, so that it can be easily updated and extended.

#### Acceptance Criteria

1. WHEN the extension is built THEN it SHALL use Manifest V3 format
2. WHEN the code is organized THEN it SHALL have separate modules for tab tracking, popup UI, and API integrations
3. WHEN APIs are integrated THEN the system SHALL use placeholder configurations for API keys
4. WHEN the UI is designed THEN it SHALL be clean, minimal, and responsive
5. WHEN the extension is installed THEN it SHALL request only necessary permissions
6. WHEN data is stored THEN it SHALL use Chrome's storage API appropriately
7. WHEN the extension runs THEN it SHALL handle errors gracefully and provide user feedback