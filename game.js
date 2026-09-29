const MAX_TRIES = 6;
const KEYS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];
const STORE = "syntaxl.v1";
const $ = (id) => document.getElementById(id);

let prefs = load();           // { Python: "Beginner", ... } – only known languages
let stats = { played: 0, won: 0, streak: 0 };
let puzzle, guesses, current, over, keyState, hintShown;

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch {}
}

// ---------- setup screen ----------
function buildSetup() {
  const box = $("langs");
  box.innerHTML = "";
  for (const lang of Object.keys(BANK)) {
    const row = document.createElement("div");
    row.className = "lang";
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = lang in prefs;
    label.append(cb, lang);
    const sel = document.createElement("select");
    LEVELS.forEach((l) => sel.add(new Option(l, l)));
    sel.value = prefs[lang] || LEVELS[0];
    sel.disabled = !cb.checked;
    cb.onchange = () => (sel.disabled = !cb.checked);
    row.append(label, sel);
    row.dataset.lang = lang;
    box.append(row);
  }
}

$("startBtn").onclick = () => {
  const next = {};
  document.querySelectorAll(".lang").forEach((row) => {
    if (row.querySelector("input").checked) next[row.dataset.lang] = row.querySelector("select").value;
  });
  $("setupError").hidden = Object.keys(next).length > 0;
  if (!Object.keys(next).length) return;
  prefs = next;
  save();
  $("setup").hidden = true;
  $("game").hidden = false;
  newRound();
};
$("settingsBtn").onclick = () => {
  buildSetup();
  $("game").hidden = true;
  $("setup").hidden = false;
};

// ---------- game ----------
function pick() {
  const langs = Object.keys(prefs);
  const lang = langs[Math.floor(Math.random() * langs.length)];
  const level = prefs[lang];
  const pool = BANK[lang][LEVELS.indexOf(level)].filter(([w]) => w !== (puzzle && puzzle.word));
  const [word, hint] = pool[Math.floor(Math.random() * pool.length)];
  return { lang, level, word, hint };
}

function newRound() {
  puzzle = pick();
  guesses = [];
  current = "";
  over = false;
  hintShown = false;
  keyState = {};
  $("tag").textContent = `${puzzle.lang} · ${puzzle.level} · ${puzzle.word.length} letters`;
  $("hint").hidden = true;
  $("hintBtn").disabled = false;
  $("nextBtn").hidden = true;
  $("msg").textContent = "";
  buildKeyboard();
  render();
  renderStats();
}

function score(guess, answer) {
  const res = Array(answer.length).fill("absent");
  const left = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = "correct";
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < answer.length; i++) {
    if (res[i] === "correct") continue;
    if (left[guess[i]] > 0) { res[i] = "present"; left[guess[i]]--; }
  }
  return res;
}

function render() {
  const n = puzzle.word.length;
  const board = $("board");
  board.innerHTML = "";
  for (let r = 0; r < MAX_TRIES; r++) {
    const row = document.createElement("div");
    row.className = "row";
    const g = guesses[r];
    const res = g && score(g, puzzle.word);
    for (let c = 0; c < n; c++) {
      const t = document.createElement("div");
      t.className = "tile";
      if (g) { t.textContent = g[c]; t.classList.add(res[c]); }
      else if (r === guesses.length && !over && current[c]) { t.textContent = current[c]; t.classList.add("filled"); }
      row.append(t);
    }
    board.append(row);
  }
  document.querySelectorAll(".key").forEach((k) => {
    k.classList.remove("correct", "present", "absent");
    if (keyState[k.dataset.k]) k.classList.add(keyState[k.dataset.k]);
  });
}

function submit() {
  const n = puzzle.word.length;
  if (current.length < n) return flash(`Need ${n} letters`);
  const res = score(current, puzzle.word);
  const rank = { absent: 0, present: 1, correct: 2 };
  [...current].forEach((ch, i) => {
    if (!keyState[ch] || rank[res[i]] > rank[keyState[ch]]) keyState[ch] = res[i];
  });
  guesses.push(current);
  const won = current === puzzle.word;
  current = "";
  if (won || guesses.length === MAX_TRIES) finish(won);
  render();
}

function finish(won) {
  over = true;
  stats.played++;
  if (won) { stats.won++; stats.streak++; } else stats.streak = 0;
  $("msg").textContent = won
    ? `Solved in ${guesses.length}! "${puzzle.word}" – ${puzzle.hint}`
    : `Out of tries. It was "${puzzle.word}" – ${puzzle.hint}`;
  $("nextBtn").hidden = false;
  $("hintBtn").disabled = true;
  renderStats();
}

function renderStats() {
  $("stats").textContent = `Played ${stats.played} · Won ${stats.won} · Streak ${stats.streak}`;
}

function flash(text) {
  $("msg").textContent = text;
  setTimeout(() => { if (!over && $("msg").textContent === text) $("msg").textContent = ""; }, 1500);
}

function press(k) {
  if (over) return;
  if (k === "enter") submit();
  else if (k === "back") current = current.slice(0, -1);
  else if (/^[a-z]$/.test(k) && current.length < puzzle.word.length) current += k;
  else return;
  render();
}

function buildKeyboard() {
  const kb = $("keyboard");
  kb.innerHTML = "";
  KEYS.forEach((row) => {
    const div = document.createElement("div");
    div.className = "krow";
    for (const ch of row) {
      const b = document.createElement("button");
      b.className = "key";
      if (ch === "+") { b.textContent = "Enter"; b.dataset.k = "enter"; b.classList.add("wide"); }
      else if (ch === "-") { b.textContent = "⌫"; b.dataset.k = "back"; b.classList.add("wide"); }
      else { b.textContent = ch; b.dataset.k = ch; }
      b.onclick = () => press(b.dataset.k);
      div.append(b);
    }
    kb.append(div);
  });
}

$("hintBtn").onclick = () => {
  $("hint").textContent = `Hint: ${puzzle.hint}`;
  $("hint").hidden = false;
};
$("nextBtn").onclick = newRound;

document.addEventListener("keydown", (e) => {
  if ($("game").hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
  const k = e.key === "Enter" ? "enter" : e.key === "Backspace" ? "back" : e.key.toLowerCase();
  press(k);
});

buildSetup();
