# Requirements Document

## Introduction

The white noise module in the focus productivity extension needs to be simplified to work directly in the popup without background complexity. Users should be able to cycle through different white noise sounds easily while the popup is open, with a clean and simple interface that just works.

## Requirements

### Requirement 1

**User Story:** As a user, I want to toggle white noise on and off directly in the popup so that I can use ambient sounds to help me focus.

#### Acceptance Criteria

1. WHEN I click the white noise button THEN the system SHALL start playing the currently selected white noise sound in the popup
2. WHEN white noise is playing AND I click the white noise button THEN the system SHALL pause the white noise
3. WHEN white noise is toggled THEN the system SHALL update the button state to reflect the current playing status
4. WHEN white noise is playing THEN the system SHALL display the current sound name correctly

### Requirement 2

**User Story:** As a user, I want to cycle through different white noise sounds easily so that I can find the most suitable ambient sound for my focus needs.

#### Acceptance Criteria

1. WHEN I click the next sound button THEN the system SHALL change to a different white noise sound immediately
2. WHEN the sound changes THEN the system SHALL display the correct sound name in the UI
3. WHEN the sound changes AND white noise is currently playing THEN the system SHALL seamlessly switch to the new sound
4. WHEN I cycle through sounds THEN the system SHALL remember my current selection

### Requirement 3

**User Story:** As a user, I want to adjust the white noise volume so that I can set it to a comfortable level.

#### Acceptance Criteria

1. WHEN I move the volume slider THEN the system SHALL adjust the white noise volume in real-time
2. WHEN I change the volume THEN the system SHALL display the current volume percentage
3. WHEN I change the volume THEN the system SHALL remember the volume setting
4. WHEN the volume is set to 0 THEN the system SHALL mute the audio

### Requirement 4

**User Story:** As a user, I want a simple and reliable white noise experience that works every time I open the popup.

#### Acceptance Criteria

1. WHEN I open the popup THEN the system SHALL show the correct sound name and volume settings
2. WHEN I interact with the white noise controls THEN the system SHALL respond immediately without delays
3. WHEN I switch sounds THEN the system SHALL work reliably without showing "unknown" or other errors
4. WHEN the popup is open THEN the white noise SHALL work without requiring background processes
