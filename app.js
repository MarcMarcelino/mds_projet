const ROUNDS = [
  {
    id: 1,
    title: "Round 1 — School & Phones",
    stars: "★☆☆",
    duration: 180,
    penaltyPercent: 25,
    keywords: [
      { label: "SMARTPHONES", accepted: ["smartphone", "smartphones", "phone", "phones", "mobile"] },
      { label: "EXAMS", accepted: ["exam", "exams", "test", "tests"] },
      { label: "CHEATING", accepted: ["cheating", "cheat", "cheats"] }
    ]
  },
  {
    id: 2,
    title: "Round 2 — US & Iran Sanctions",
    stars: "★★☆",
    duration: 150,
    penaltyPercent: 25,
    keywords: [
      { label: "UNITED STATES", accepted: ["united states", "usa", "us", "america"] },
      { label: "SANCTIONS", accepted: ["sanction", "sanctions", "embargo"] },
      { label: "IRAN", accepted: ["iran", "iranian"] },
      { label: "REVENUE", accepted: ["revenue", "revenues", "money", "income", "funds"] }
    ]
  }
];

const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // ~326.73

let currentRound = ROUNDS[0];
let timeLeft = currentRound.duration;
let intervalId = null;
let unlockedIndices = new Set();

const roundSelect = document.getElementById("roundSelect");
const difficultyBadge = document.getElementById("difficultyBadge");
const progressRing = document.getElementById("progressRing");
const timerDisplay = document.getElementById("timerDisplay");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const feedbackMsg = document.getElementById("feedbackMsg");
const keywordCounter = document.getElementById("keywordCounter");
const locksList = document.getElementById("locksList");
const keywordForm = document.getElementById("keywordForm");
const keywordInput = document.getElementById("keywordInput");

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatTime(sec) {
  const safe = Math.max(0, Math.ceil(sec));
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function setFeedback(text, status = "neutral") {
  feedbackMsg.textContent = text;
  feedbackMsg.className = "min-h-[20px] text-xs font-extrabold px-1";
  if (status === "ok") feedbackMsg.classList.add("text-emerald-700");
  else if (status === "err") feedbackMsg.classList.add("text-red-600");
  else feedbackMsg.classList.add("text-zinc-800");
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timeLeft);
  const ratio = currentRound.duration > 0 ? timeLeft / currentRound.duration : 0;
  const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, ratio)));
  progressRing.style.strokeDashoffset = offset;
}

function renderLocks() {
  locksList.innerHTML = "";
  currentRound.keywords.forEach((kw, idx) => {
    const unlocked = unlockedIndices.has(idx);
    const strip = document.createElement("div");

    if (unlocked) {
      // Bande jaune fluo débloquée (style "SOLEIL" sur la maquette)
      strip.className =
        "torn-strip bg-[#d9ff3f] text-zinc-950 py-2.5 px-4 text-center font-black italic text-lg tracking-wide uppercase shadow-sm transition-all";
      strip.textContent = kw.label;
    } else {
      // Bande papier verrouillée avec texte flouté + cadenas au centre
      strip.className =
        "torn-strip relative bg-[#e6dfd3]/95 border-y border-black/10 py-2.5 px-4 flex items-center justify-center shadow-sm";
      strip.innerHTML = `
        <span class="font-black text-base tracking-widest text-zinc-800/40 blur-[4px] select-none" aria-hidden="true">
          ${"●".repeat(kw.label.length)}
        </span>
        <span class="absolute text-zinc-950 text-base" aria-label="Locked keyword">🔒</span>
      `;
    }

    locksList.appendChild(strip);
  });

  keywordCounter.textContent = `${unlockedIndices.size}/${currentRound.keywords.length}`;
}

function stopTimer() {
  clearInterval(intervalId);
  intervalId = null;
  startPauseBtn.textContent = "Start";
}

function startTimer() {
  if (intervalId || timeLeft <= 0) return;
  startPauseBtn.textContent = "Pause";
  intervalId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    renderTimer();
    if (timeLeft === 0) {
      stopTimer();
      setFeedback("Time's up!", "err");
    }
  }, 1000);
}

function triggerPenaltyFlash() {
  timerDisplay.classList.add("text-red-600");
  progressRing.setAttribute("stroke", "#dc2626");
  setTimeout(() => {
    timerDisplay.classList.remove("text-red-600");
    progressRing.setAttribute("stroke", "#d9ff3f");
  }, 550);
}

function loadRound(roundId) {
  stopTimer();
  currentRound = ROUNDS.find((r) => r.id === Number(roundId)) || ROUNDS[0];
  timeLeft = currentRound.duration;
  unlockedIndices = new Set();
  difficultyBadge.textContent = currentRound.stars;
  setFeedback("");
  keywordInput.value = "";
  renderTimer();
  renderLocks();
}

function populateSelect() {
  ROUNDS.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.title;
    opt.className = "text-black";
    roundSelect.appendChild(opt);
  });
  const urlRound = new URLSearchParams(window.location.search).get("round");
  const initialId = urlRound ? Number(urlRound) : ROUNDS[0].id;
  roundSelect.value = initialId;
  loadRound(initialId);
}

startPauseBtn.addEventListener("click", () => {
  if (intervalId) stopTimer();
  else startTimer();
});

resetBtn.addEventListener("click", () => loadRound(currentRound.id));
roundSelect.addEventListener("change", (e) => loadRound(e.target.value));

keywordForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = keywordInput.value;
  const guess = normalize(raw);
  keywordInput.value = "";
  if (!guess) return;

  // Lance le chrono automatiquement si le joueur soumet un mot avant d'appuyer sur Start
  if (!intervalId && timeLeft > 0) startTimer();

  const matchIndex = currentRound.keywords.findIndex((kw) =>
    kw.accepted.some((word) => normalize(word) === guess)
  );

  if (matchIndex !== -1) {
    if (unlockedIndices.has(matchIndex)) {
      setFeedback(`Already unlocked!`, "ok");
    } else {
      unlockedIndices.add(matchIndex);
      renderLocks();
      if (unlockedIndices.size === currentRound.keywords.length) {
        stopTimer();
        setFeedback("All keywords unlocked! Well done!", "ok");
      } else {
        setFeedback("Good keyword!", "ok");
      }
    }
  } else {
    const lost = timeLeft * (currentRound.penaltyPercent / 100);
    timeLeft = Math.max(0, timeLeft - lost);
    renderTimer();
    triggerPenaltyFlash();
    setFeedback(`Wrong word! -${currentRound.penaltyPercent}% time!`, "err");
    if (timeLeft === 0) stopTimer();
  }
});

populateSelect();