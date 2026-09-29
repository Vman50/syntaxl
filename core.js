const MAX_TRIES = 6;
const KEYS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];
const STORE = "syntaxl.v2";
const $ = (id) => document.getElementById(id);

// ---------- profile ----------
const DEFAULTS = {
  name: "Player" + (1000 + Math.floor(Math.random() * 9000)),
  prefs: { "Tech Basics": "Beginner" },
  xp: 0, rating: 1000, wins: 0, losses: 0, draws: 0,
};
let profile = Object.assign({}, DEFAULTS, readStore());
function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function saveProfile() {
  try { localStorage.setItem(STORE, JSON.stringify(profile)); } catch {}
}
const TIERS = [["Bronze", 0, "🥉"], ["Silver", 1000, "🥈"], ["Gold", 1200, "🥇"], ["Platinum", 1400, "💠"], ["Diamond", 1600, "💎"]];
function tierOf(r) {
  let t = TIERS[0];
  for (const x of TIERS) if (r >= x[1]) t = x;
  return t;
}
function bucketOf(r) { return Math.max(0, Math.min(4, Math.floor((r - 800) / 200))); }
function playerLevel() { return 1 + Math.floor(profile.xp / 300); }
function renderProfile() {
  const [name, , icon] = tierOf(profile.rating);
  $("profile").textContent = `Lv ${playerLevel()} · ${profile.xp} XP · ${icon} ${name} ${profile.rating}`;
}

// ---------- navigation ----------
function show(id) {
  document.querySelectorAll("main > section").forEach((s) => (s.hidden = s.id !== id));
  $("banner").hidden = true;
  renderProfile();
  window.scrollTo(0, 0);
}

// ---------- board ----------
class Board {
  constructor(word) {
    this.word = word;
    this.guesses = [];
    this.results = [];
    this.cur = "";
    this.keys = {};
    this.done = false;
    this.won = false;
    this.fresh = false;
  }
  static score(guess, answer) {
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
  press(k) {
    if (this.done) return null;
    if (k === "enter") return this.cur.length < this.word.length ? "short" : this.submit();
    if (k === "back") { this.cur = this.cur.slice(0, -1); return "edit"; }
    if (/^[a-z]$/.test(k) && this.cur.length < this.word.length) { this.cur += k; return "edit"; }
    return null;
  }
  submit() {
    const g = this.cur;
    const res = Board.score(g, this.word);
    const rank = { absent: 0, present: 1, correct: 2 };
    [...g].forEach((ch, i) => {
      if (!this.keys[ch] || rank[res[i]] > rank[this.keys[ch]]) this.keys[ch] = res[i];
    });
    this.guesses.push(g);
    this.results.push(res);
    this.cur = "";
    this.fresh = true;
    if (g === this.word) this.done = this.won = true;
    else if (this.guesses.length >= MAX_TRIES) this.done = true;
    return "submitted";
  }
  render() {
    const n = this.word.length;
    const board = $("board");
    board.innerHTML = "";
    for (let r = 0; r < MAX_TRIES; r++) {
      const row = document.createElement("div");
      row.className = "row";
      const g = this.guesses[r];
      const isLast = r === this.guesses.length - 1;
      for (let c = 0; c < n; c++) {
        const t = document.createElement("div");
        t.className = "tile";
        if (g) {
          t.textContent = g[c];
          t.classList.add(this.results[r][c]);
          if (isLast && this.fresh) { t.classList.add("flip"); t.style.animationDelay = c * 0.12 + "s"; }
        } else if (r === this.guesses.length && !this.done && this.cur[c]) {
          t.textContent = this.cur[c];
          t.classList.add("filled");
        }
        row.append(t);
      }
      board.append(row);
    }
    this.fresh = false;
    document.querySelectorAll(".key").forEach((k) => {
      k.classList.remove("correct", "present", "absent");
      if (this.keys[k.dataset.k]) k.classList.add(this.keys[k.dataset.k]);
    });
  }
}

// ---------- keyboard / input dispatch ----------
let inputHandler = null; // set by the active mode: (key) => void
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
      b.onclick = () => inputHandler && inputHandler(b.dataset.k);
      div.append(b);
    }
    kb.append(div);
  });
}
document.addEventListener("keydown", (e) => {
  if (!inputHandler || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.tagName === "INPUT") return;
  const k = e.key === "Enter" ? "enter" : e.key === "Backspace" ? "back" : e.key.toLowerCase();
  if (k === "enter" || k === "back" || /^[a-z]$/.test(k)) inputHandler(k);
});

// ---------- word picking ----------
function pickWord(lang, level, avoid) {
  const pool = POOLS[lang][LEVELS.indexOf(level)].filter((e) => e[0] !== avoid);
  const [word, hint, emoji] = pool[Math.floor(Math.random() * pool.length)];
  return { lang, level, word, hint, emoji: emoji || "" };
}

// ---------- fx ----------
function confetti() {
  const glyphs = ["🎉", "✨", "⭐", "💚", "🟨", "🟩"];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("span");
    s.className = "confetti";
    s.textContent = glyphs[i % glyphs.length];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    s.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
    document.body.append(s);
    setTimeout(() => s.remove(), 3500);
  }
}
function flash(text, ms = 1500) {
  $("msg").textContent = text;
  setTimeout(() => { if ($("msg").textContent === text) $("msg").textContent = ""; }, ms);
}
// keep focus off buttons so Enter/typing always goes to the game
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("button");
  if (b) b.blur();
});
