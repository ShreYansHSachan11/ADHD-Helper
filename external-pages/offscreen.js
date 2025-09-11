// Persistent audio object
let audio = null;

// List of all sounds
const sounds = [
  { name: "Air Conditioner", file: "../assets/sounds/air-white-noise.mp3" },
  { name: "Ocean Waves", file: "../assets/sounds/ocean-white-noise.mp3" },
  { name: "Rain Drops", file: "../assets/sounds/rain-white-noise.mp3" },
  { name: "Shower", file: "../assets/sounds/shower-white-noise.mp3" },
  { name: "Train Journey", file: "../assets/sounds/train-white-noise.mp3" },
  { name: "Flowing Water", file: "../assets/sounds/water-white-noise.mp3" },
  { name: "Waterfall", file: "../assets/sounds/waterfall-white-noise.mp3" },
];

// Handle messages from background/popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PLAY_IN_OFFSCREEN") {
    const soundIndex = msg.soundIndex ?? 2; // default to Rain Drops
    const volume = msg.volume ?? 0.5;

    const selectedSound = sounds[soundIndex];

    if (!selectedSound) return;

    // Stop existing audio if playing
    if (audio) audio.pause();

    // Create new audio
    audio = new Audio(chrome.runtime.getURL(selectedSound.file));
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err) => console.error("Audio playback failed:", err));

    console.log(
      "Playing in offscreen:",
      selectedSound.name,
      "Volume:",
      audio.volume
    );
  }

  // Optional: add stop command
  if (msg.type === "STOP_OFFSCREEN_AUDIO" && audio) {
    audio.pause();
    audio = null;
    console.log("Offscreen audio stopped");
  }
});
