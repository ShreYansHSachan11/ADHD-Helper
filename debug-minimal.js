import TestAudioManager from "./test-minimal.js";

const audioManager = new TestAudioManager();
console.log("currentSound:", audioManager.currentSound);
console.log("defaultSound:", audioManager.defaultSound);
console.log("getCurrentSound():", audioManager.getCurrentSound());
