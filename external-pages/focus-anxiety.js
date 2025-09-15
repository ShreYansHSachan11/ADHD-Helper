/* ------------------ SOUND ------------------ */
const popSound = new Audio("../assets/sounds/pop.mp3");

/* ------------------ DATA POOL ------------------ */
const ITEMS = [
  "Table",
  "Chair",
  "Sofa",
  "Bed",
  "Pillow",
  "Blanket",
  "Window",
  "Door",
  "Lamp",
  "Mirror",
  "Clock",
  "Fan",
  "Light bulb",
  "Remote",
  "Television",
  "Phone",
  "Laptop",
  "Keyboard",
  "Mouse",
  "Book",
  "Pen",
  "Paper",
  "Cup",
  "Plate",
  "Spoon",
  "Fork",
  "Knife",
  "Bottle",
  "Glass",
  "Bag",
  "Shirt",
  "Pants",
  "Jacket",
  "Hat",
  "Shoes",
  "Socks",
  "Scarf",
  "Belt",
  "Gloves",
  "Watch",
  "Ring",
  "Earrings",
  "Glasses",
  "Bowl",
  "Mug",
  "Pan",
  "Pot",
  "Fridge",
  "Oven",
  "Toaster",
  "Cutting board",
  "Apple",
  "Banana",
  "Orange",
  "Bread",
  "Milk",
  "Cheese",
  "Tree",
  "Leaf",
  "Flower",
  "Grass",
  "Rock",
  "Bench",
  "Bike",
  "Car",
  "Road",
  "Fence",
  "Ball",
  "Backpack",
  "Key",
  "Wallet",
  "Umbrella",
  "Brush",
  "Comb",
  "Toothbrush",
  "Towel",
  "Soap",
  "Bottle cap",
  "Candle",
  "Camera",
  "Toy",
  "Headphones",
  "Earbuds",
];

/* ------------------ ELEMENTS ------------------ */
const memoryOptionBtn = document.getElementById("memoryOption");
const anxietyOptionBtn = document.getElementById("anxietyOption");

const memoryModal = document.getElementById("memoryModal");
const anxietyModal = document.getElementById("anxietyModal");

const closeButtons = document.querySelectorAll("[data-close]");

const startMemoryBtn = document.getElementById("startMemoryBtn");
const restartMemoryBtn = document.getElementById("restartMemoryBtn");
const memoryBoard = document.getElementById("memoryBoard");
const timerEl = document.getElementById("timer");

const startAnxietyBtn = document.getElementById("startAnxietyBtn");
const restartAnxietyBtn = document.getElementById("restartAnxietyBtn");
const bubbleContainer = document.getElementById("bubbleContainer");
const groundingPrompt = document.getElementById("groundingPrompt");

/* ------------------ MODAL LOGIC ------------------ */
function openModal(modal) {
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}
function closeModal(modal) {
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

// link openers
memoryOptionBtn.addEventListener("click", () => {
  openModal(memoryModal);
});
anxietyOptionBtn.addEventListener("click", () => {
  openModal(anxietyModal);
});

// close buttons
closeButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const id = btn.dataset.close;
    if (id === "memoryModal") stopMemoryTimer();
    closeModal(document.getElementById(id));
  });
});

/* ------------------ MEMORY GAME ------------------ */
const EMOJIS = ["🍎", "🍌", "🍇", "🍓", "🍒", "🍍", "🍉", "🍋"];
let pairs = EMOJIS.length;
let totalCards = pairs * 2;

let memoryState = {
  board: [],
  first: null,
  second: null,
  matchedPairs: 0,
  lock: false,
  timerId: null,
  startTime: null,
  elapsed: 0,
};

function shuffleArray(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function buildMemoryBoard() {
  const doubled = shuffleArray([...EMOJIS, ...EMOJIS]);
  memoryState.board = doubled;
  memoryBoard.innerHTML = "";
  memoryState.matchedPairs = 0;
  memoryState.first = null;
  memoryState.second = null;
  memoryState.lock = true;
  totalCards = doubled.length;

  doubled.forEach((emoji, idx) => {
    const card = document.createElement("div");
    card.className = "memory-card";
    card.dataset.index = idx;

    const inner = document.createElement("div");
    inner.className = "card-inner";
    inner.setAttribute("data-value", emoji);

    const front = document.createElement("div");
    front.className = "card-face front";
    front.textContent = "?";

    const back = document.createElement("div");
    back.className = "card-face back";
    back.textContent = emoji;

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener("click", () => onMemoryCardClick(card, inner));

    memoryBoard.appendChild(card);
  });

  if (window.innerWidth < 520) {
    memoryBoard.style.gridTemplateColumns = "repeat(2, 120px)";
  } else {
    memoryBoard.style.gridTemplateColumns = "repeat(4, 120px)";
  }
}

function revealAllThenHide(ms = 2000) {
  const inners = memoryBoard.querySelectorAll(".card-inner");
  inners.forEach((i) => i.classList.add("flipped"));
  setTimeout(() => {
    inners.forEach((i) => i.classList.remove("flipped"));
    memoryState.lock = false;
    startMemoryTimer();
    restartMemoryBtn.style.display = "inline-block";
    startMemoryBtn.style.display = "none";
  }, ms);
}

function onMemoryCardClick(cardElem, innerElem) {
  if (memoryState.lock) return;
  if (innerElem.classList.contains("flipped")) return;
  innerElem.classList.add("flipped");

  if (!memoryState.first) {
    memoryState.first = innerElem;
    return;
  }
  memoryState.second = innerElem;
  memoryState.lock = true;

  const val1 = memoryState.first.dataset.value;
  const val2 = memoryState.second.dataset.value;

  if (val1 === val2) {
    memoryState.matchedPairs += 1;
    memoryState.first.classList.add("matched");
    memoryState.second.classList.add("matched");
    memoryState.first = null;
    memoryState.second = null;
    memoryState.lock = false;

    if (memoryState.matchedPairs === pairs) {
      stopMemoryTimer();
      setTimeout(() => {
        console.log(`Nice! You completed the memory game in ${memoryState.elapsed}s`);
      }, 250);
    }
  } else {
    setTimeout(() => {
      memoryState.first.classList.remove("flipped");
      memoryState.second.classList.remove("flipped");
      memoryState.first = null;
      memoryState.second = null;
      memoryState.lock = false;
    }, 800);
  }
}

function startMemoryTimer() {
  stopMemoryTimer();
  memoryState.startTime = Date.now();
  memoryState.elapsed = 0;
  timerEl.textContent = `Time: 0s`;
  memoryState.timerId = setInterval(() => {
    memoryState.elapsed = Math.floor(
      (Date.now() - memoryState.startTime) / 1000
    );
    timerEl.textContent = `Time: ${memoryState.elapsed}s`;
  }, 1000);
}

function stopMemoryTimer() {
  if (memoryState.timerId) clearInterval(memoryState.timerId);
  memoryState.timerId = null;
}

startMemoryBtn.addEventListener("click", () => {
  pairs = EMOJIS.length;
  buildMemoryBoard();
  revealAllThenHide(2000);
});

restartMemoryBtn.addEventListener("click", () => {
  stopMemoryTimer();
  timerEl.textContent = `Time: 0s`;
  startMemoryBtn.style.display = "inline-block";
  restartMemoryBtn.style.display = "none";
  buildMemoryBoard();
  memoryState.lock = true;
});

/* ------------------ ANXIETY GAME ------------------ */
const STEPS = [
  { count: 5, text: "things you can see" },
  { count: 4, text: "things you can touch" },
  { count: 3, text: "things you can hear" },
  { count: 2, text: "things you can smell" },
  { count: 1, text: "thing you can taste" },
];

let anxietyState = {
  stepIndex: 0,
  poppedInStep: 0,
  required: STEPS[0].count,
  active: false,
};

function setAnxietyPrompt() {
  const s = STEPS[anxietyState.stepIndex];
  groundingPrompt.textContent = `Pop ${s.count} ${s.text}`;
}

function generateBubbles(count = 40) {
  bubbleContainer.innerHTML = "";
  const pool = shuffleArray(ITEMS).slice(0, count);
  pool.forEach((label) => {
    const b = document.createElement("div");
    b.className = "bubble";
    b.textContent = label;

    const size = 48 + Math.random() * 96;
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;

    const top = Math.random() * 82 + 4;
    const left = Math.random() * 86 + 4;
    b.style.top = `${top}%`;
    b.style.left = `${left}%`;

    b.addEventListener("click", () => {
      if (!anxietyState.active) return;

      popSound.currentTime = 0;
      popSound.play();

      b.classList.add("pop");
      anxietyState.poppedInStep += 1;

      setTimeout(() => {
        if (b.parentNode) b.parentNode.removeChild(b);
      }, 220);

      const required = STEPS[anxietyState.stepIndex].count;
      if (anxietyState.poppedInStep >= required) {
        anxietyState.stepIndex += 1;
        anxietyState.poppedInStep = 0;
        if (anxietyState.stepIndex < STEPS.length) {
          setTimeout(() => {
            setAnxietyPrompt();
            generateBubbles(40);
          }, 550);
        } else {
          anxietyState.active = false;
          groundingPrompt.textContent =
            "✨ Well done! You completed the grounding exercise.";
          startAnxietyBtn.style.display = "none";
          restartAnxietyBtn.style.display = "inline-block";
        }
      }
    });

    bubbleContainer.appendChild(b);
  });
}

startAnxietyBtn.addEventListener("click", () => {
  anxietyState.stepIndex = 0;
  anxietyState.poppedInStep = 0;
  anxietyState.active = true;
  startAnxietyBtn.style.display = "none";
  restartAnxietyBtn.style.display = "inline-block";
  setAnxietyPrompt();
  generateBubbles(40);
});

restartAnxietyBtn.addEventListener("click", () => {
  anxietyState.stepIndex = 0;
  anxietyState.poppedInStep = 0;
  anxietyState.active = false;
  groundingPrompt.textContent = "Click start to begin";
  bubbleContainer.innerHTML = "";
  startAnxietyBtn.style.display = "inline-block";
  restartAnxietyBtn.style.display = "none";
});

/* ------------------ CLEANUP ------------------ */
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (memoryModal.style.display === "flex") {
      closeModal(memoryModal);
      stopMemoryTimer();
    }
    if (anxietyModal.style.display === "flex") {
      closeModal(anxietyModal);
      anxietyState.active = false;
      bubbleContainer.innerHTML = "";
      startAnxietyBtn.style.display = "inline-block";
      restartAnxietyBtn.style.display = "none";
      groundingPrompt.textContent = "Click start to begin";
    }
  }
});

/* ------------------ Init ------------------ */
buildMemoryBoard();
