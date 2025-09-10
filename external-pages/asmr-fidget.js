// ==========================
// Spinner logic
// ==========================
const spinnerImg = document.getElementById("fidgetSpinner");
const spinnerSound = new Audio("../assets/sounds/spinner.wav");
spinnerSound.loop = true;
spinnerSound.volume = 0;

let currentRotation = 0;
let spinVelocity = 0;
let animationFrameId = null;

function spin() {
  currentRotation += spinVelocity;
  spinnerImg.style.transform = `rotate(${currentRotation}deg)`;

  spinVelocity *= 0.985;

  const volume = Math.min(Math.abs(spinVelocity) / 30, 1);
  spinnerSound.volume = volume;

  if (Math.abs(spinVelocity) > 0.1) {
    animationFrameId = requestAnimationFrame(spin);
  } else {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    spinVelocity = 0;
    spinnerSound.volume = 0;
    spinnerSound.pause();
  }
}

function handleSpin() {
  spinVelocity += 20;

  if (spinnerSound.paused) {
    spinnerSound.currentTime = 0;
    spinnerSound.play();
  }

  if (!animationFrameId) {
    spin();
  }
}

spinnerImg.addEventListener("click", handleSpin);
spinnerImg.addEventListener("touchstart", handleSpin, { passive: true });

// ==========================
// Keyboard Keys logic
// ==========================
const keyElements = document.querySelectorAll(".fidgetKey");

keyElements.forEach((keyEl) => {
  keyEl.addEventListener("click", () => {
    const keySound = new Audio("../assets/sounds/keyboard.wav");
    keySound.play();
  });

  keyEl.addEventListener(
    "touchstart",
    () => {
      const keySound = new Audio("../assets/sounds/keyboard.wav");
      keySound.play();
    },
    { passive: true }
  );
});

// ==========================
// Switch logic
// ==========================
// ==========================
// Switch logic (vertical flip, instant)
// ==========================
const switchImg = document.getElementById("fidgetSwitch");
let switchFlipped = false;

function flipSwitch() {
  switchFlipped = !switchFlipped;
  switchImg.style.transform = switchFlipped
    ? "rotateX(180deg)"
    : "rotateX(0deg)";

  const switchSound = new Audio("../assets/sounds/switch.wav");
  switchSound.play();
}

switchImg.addEventListener("click", flipSwitch);
switchImg.addEventListener("touchstart", flipSwitch, { passive: true });

// ==========================
// Soapy bubbles (fourth grid)
// ==========================
const bubbleGrid = document.getElementById("bubbleGrid");
const bubbleSound = new Audio("../assets/sounds/pop.mp3");
const maxBubbles = 5;

function createBubble() {
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");

  // Random size 40-100px
  const size = 40 + Math.random() * 60;
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;

  // Random position within grid
  const gridWidth = bubbleGrid.clientWidth;
  const gridHeight = bubbleGrid.clientHeight;
  const x = Math.random() * (gridWidth - size);
  const y = Math.random() * (gridHeight - size);
  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;

  // Pop on click
  bubble.addEventListener("click", () => {
    bubble.style.transform = "scale(0)";
    bubble.style.opacity = "0";
    bubbleSound.currentTime = 0;
    bubbleSound.play();

    // Remove after animation and create new bubble
    setTimeout(() => {
      bubble.remove();
      createBubble();
    }, 200);
  });

  bubbleGrid.appendChild(bubble);
}

// Initialize bubbles
for (let i = 0; i < maxBubbles; i++) {
  createBubble();
}
