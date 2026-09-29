const HINT_COST = 25;
const Solo = (() => {
  let puzzle, board, hintsUsed, revealed, hintLog, streak = 0, session = { played: 0, won: 0 };

  function start() {
    $("vsBar").hidden = true;
    $("oppWrap").hidden = true;
    $("hintBtn").hidden = false;
    $("quitBtn").textContent = "Menu";
    show("game");
    buildKeyboard();
    next();
  }

  function next() {
    puzzle = pickWord.apply(null, pickPref());
    board = new Board(puzzle.word);
    hintsUsed = 0;
    revealed = new Set();
    hintLog = [];
    $("tag").textContent = `${puzzle.lang} · ${puzzle.level} · ${puzzle.word.length} letters`;
    $("clue").textContent = "";
    $("nextBtn").hidden = true;
    $("msg").textContent = "";
    $("hintBtn").disabled = false;
    inputHandler = press;
    renderAll();
  }

  function pickPref() {
    const langs = Object.keys(profile.prefs).filter((l) => POOLS[l]);
    const lang = langs[Math.floor(Math.random() * langs.length)];
    return [lang, profile.prefs[lang], puzzle && puzzle.word];
  }

  function press(k) {
    const r = board.press(k);
    if (r === "short") flash(`Need ${puzzle.word.length} letters`);
    board.render();
    if (r === "submitted" && board.done) finish();
  }

  function renderAll() {
    board.render();
    renderHints();
  }

  function hintSteps() {
    const steps = [];
    if (puzzle.emoji) steps.push(() => `Emoji clue: ${puzzle.emoji}`);
    steps.push(() => `Meaning: ${puzzle.hint}`);
    steps.push(() => { revealed.add(0); return `Starts with “${puzzle.word[0].toUpperCase()}”`; });
    return steps;
  }

  function useHint() {
    if (board.done) return;
    const steps = hintSteps();
    if (hintsUsed < steps.length) hintLog.push(steps[hintsUsed]());
    else {
      const hidden = [...puzzle.word].map((_, i) => i).filter((i) => !revealed.has(i));
      if (hidden.length <= 1) return flash("No more hints!");
      const i = hidden[Math.floor(Math.random() * hidden.length)];
      revealed.add(i);
      hintLog.push(`Revealed letter #${i + 1}: ${puzzle.word[i].toUpperCase()}`);
    }
    hintsUsed++;
    renderHints();
  }

  function renderHints() {
    $("hints").innerHTML = "";
    hintLog.forEach((h) => {
      const d = document.createElement("div");
      d.textContent = h;
      $("hints").append(d);
    });
    $("pattern").textContent = [...puzzle.word].map((c, i) => (revealed.has(i) ? c.toUpperCase() : "_")).join(" ");
    $("pattern").hidden = revealed.size === 0;
    $("hintBtn").textContent = `💡 Hint (−${HINT_COST} pts)`;
  }

  function finish() {
    session.played++;
    const tries = board.guesses.length;
    let pts = 0;
    if (board.won) {
      pts = Math.max(20, 100 + (MAX_TRIES - tries) * 20 - hintsUsed * HINT_COST);
      session.won++;
      streak++;
      pts += Math.min(streak - 1, 5) * 10; // streak bonus
      profile.xp += pts;
      confetti();
    } else {
      streak = 0;
    }
    saveProfile();
    renderProfile();
    $("clue").textContent = puzzle.emoji;
    $("msg").innerHTML = "";
    const m = document.createElement("div");
    m.textContent = board.won
      ? `🎉 Solved in ${tries}! +${pts} XP${streak > 1 ? ` · 🔥 ${streak} streak` : ""}`
      : `😅 It was “${puzzle.word}”`;
    const d = document.createElement("div");
    d.className = "muted";
    d.textContent = puzzle.hint;
    $("msg").append(m, d);
    $("nextBtn").hidden = false;
    $("hintBtn").disabled = true;
    inputHandler = null;
  }

  $("hintBtn").addEventListener("click", useHint);
  $("nextBtn").addEventListener("click", () => { inputHandler = press; next(); });
  return { start, active: () => !$("game").hidden && !!board };
})();
