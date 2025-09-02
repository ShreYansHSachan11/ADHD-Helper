import AudioManager from "./services/audio-manager.js";

const audioManager = new AudioManager();
console.log("currentSound:", audioManager.currentSound);
console.log("defaultSound:", audioManager.defaultSound);
console.log("currentSoundIndex:", audioManager.currentSoundIndex);
console.log("getCurrentSound():", audioManager.getCurrentSound());
