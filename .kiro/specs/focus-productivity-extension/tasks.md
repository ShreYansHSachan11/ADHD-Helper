# Implementation Plan

- [x] 1. Set up Chrome extension project structure and manifest

  - Create directory structure with all necessary folders (popup, services, external-pages, assets, utils)
  - Create manifest.json file with Manifest V3 configuration and required permissions
  - Add placeholder icon files and basic project setup
  - _Requirements: 10.1, 10.2, 10.5_

- [x] 2. Implement core storage and utility modules

  - Create storage-manager.js with Chrome storage API wrapper functions
  - Implement constants.js with default settings and configuration values
  - Create helpers.js with common utility functions for time calculations and formatting
  - Write unit tests for storage and utility functions
  - _Requirements: 10.6, 10.7_

- [ ] 3. Build tab tracking service worker functionality

  - Implement background.js service worker with tab event listeners
  - Create tab-tracker.js module for monitoring active tab changes and time tracking
  - Add screen time limit checking and break reminder logic
  - Implement focus tab tracking and deviation detection
  - Write tests for tab tracking accuracy and timer calculations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Create notification system for reminders

  - Implement notification display functions in background service worker
  - Add break reminder notifications with proper timing and dismissal handling
  - Create focus reminder notifications with cooldown period management
  - Test notification permissions and fallback handling
  - _Requirements: 1.1, 1.4, 2.2, 2.4_

- [ ] 5. Build main popup interface structure

  - Create popup.html with organized sections for all features
  - Implement popup.css with clean, minimal, and responsive design
  - Create basic popup.js with initialization and event handling setup
  - Ensure all modules are visible and accessible from default view
  - Test popup responsiveness and layout across different screen sizes
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.4_

- [ ] 6. Implement screen time monitoring UI components

  - Add screen time display and settings controls to popup interface
  - Create time limit configuration functionality with save/load from storage
  - Implement current session time display with real-time updates
  - Add manual break trigger and settings reset functionality
  - Test screen time UI integration with background tab tracking
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 7. Build focus tracking UI and controls

  - Implement focus tab display and manual focus tab setting controls
  - Add focus session status indicators and reset functionality
  - Create focus deviation history and statistics display
  - Test focus tracking UI integration with background monitoring
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 8. Create Gemini API integration service

  - Implement gemini-service.js with API key management and request handling
  - Add task breakdown request formatting and response parsing
  - Create error handling for API failures and network issues
  - Implement placeholder functionality when API key is not configured
  - Write tests for API integration with mock responses
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. Build task management UI component

  - Create task-manager.js component for task input and breakdown display
  - Implement task input form with name and deadline fields
  - Add AI breakdown request functionality with loading states
  - Create structured breakdown display with actionable steps
  - Implement local storage for task history and breakdown results
  - Test complete task breakdown workflow from input to display
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 10. Implement Google Calendar API integration

  - Create calendar-service.js with Google Calendar API authentication
  - Implement reminder calculation logic based on task priority levels
  - Add calendar event creation with proper timing for high/medium/low priority tasks
  - Create error handling for calendar API failures and authentication issues
  - Test calendar integration with different priority levels and reminder frequencies
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 11. Build calendar integration UI controls

  - Add task reminder creation form with priority selection
  - Implement calendar integration status display and error messaging
  - Create manual reminder creation fallback interface
  - Add API key configuration interface with setup instructions
  - Test complete calendar workflow from task input to reminder creation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 12. Create breathing exercise component

  - Implement breathing-exercise.js with animated circle and timing logic
  - Add breathing phase management (inhale, hold, exhale, hold) with customizable durations
  - Create smooth CSS animations for expanding/contracting circle
  - Implement guided text display synchronized with breathing phases
  - Add session tracking and completion feedback
  - Test breathing exercise timing accuracy and animation smoothness
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 13. Implement white noise audio system

  - Create audio-manager.js with white noise playback controls
  - Add white noise toggle functionality with persistent state management
  - Implement volume control and background playback continuation
  - Create audio file loading and error handling for playback issues
  - Add visual toggle state indicators and cleanup on browser close
  - Test white noise functionality across popup open/close cycles
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 14. Build Focus & Anxiety Management external page

  - Create focus-anxiety.html with comprehensive wellness resources and techniques
  - Implement focus-anxiety.js with interactive elements and usage tracking
  - Add focus-anxiety.css with calming, accessible design
  - Create various anxiety management techniques and focus strategies
  - Implement usage tracking for personal insights
  - Test external page loading and integration with main extension
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 15. Create ASMR and Fidgeting Tools external page

  - Build asmr-fidget.html with interactive ASMR sounds and fidgeting elements
  - Implement asmr-fidget.js with audio controls and interactive feedback systems
  - Create asmr-fidget.css with engaging visual design for fidgeting tools
  - Add multiple ASMR sound options with volume controls and audio management
  - Implement responsive visual and audio feedback for fidgeting interactions
  - Test ASMR page functionality and automatic audio cleanup on page close
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 16. Integrate external page access in main popup

  - Add prominent buttons for Focus & Anxiety Management and ASMR tools in popup
  - Implement external page opening functionality with proper URL handling
  - Create seamless navigation between main popup and external pages
  - Test external page access and return navigation flow
  - _Requirements: 5.1, 6.1, 9.3_

- [ ] 17. Implement comprehensive error handling and user feedback

  - Add error handling for all API integrations with user-friendly messages
  - Implement graceful degradation for missing permissions or restricted tabs
  - Create user feedback systems for all major actions and state changes
  - Add loading states and progress indicators for async operations
  - Test error scenarios and recovery mechanisms across all features
  - _Requirements: 10.7, 3.3, 4.5, 5.4, 6.5_

- [ ] 18. Add audio assets and optimize performance

  - Create or source white noise audio file and notification sounds
  - Optimize audio file sizes for fast loading and minimal storage usage
  - Implement lazy loading for heavy components and external pages
  - Add performance monitoring and optimization for tab tracking overhead
  - Test extension performance impact and memory usage
  - _Requirements: 8.1, 8.3, 8.6_

- [ ] 19. Create comprehensive test suite

  - Write unit tests for all service modules (tab-tracker, API services, storage)
  - Implement integration tests for popup-background communication
  - Add end-to-end tests for complete user workflows (task creation, reminders, wellness tools)
  - Create performance tests for tab tracking accuracy and resource usage
  - Test extension across different Chrome versions and operating systems
  - _Requirements: 10.7, 1.1, 3.1, 4.1, 7.1, 8.1_

- [ ] 20. Final integration and polish
  - Integrate all components and test complete extension functionality
  - Implement final UI polish with consistent styling and smooth interactions
  - Add accessibility features and WCAG 2.1 compliance
  - Create user documentation and setup instructions for API keys
  - Perform final testing of all features and edge cases
  - Package extension for distribution and testing
  - _Requirements: 9.4, 9.5, 10.4, 10.7_
