// 1v1 battles over WebRTC (PeerJS). Peers find each other through PeerJS's free
// signalling server; there is no game server, so results are honor-based.
const Versus = (() => {
  const ROUNDS = 3, ROUND_S = 90, PID = "syntaxl-";
  let s = null; // current session

  const available = () => typeof Peer !== "undefined";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- networking helpers ----------
  function openPeer(id) {
    return new Promise((res, rej) => {
      const p = id ? new Peer(id) : new Peer();
      p.on("open", () => res(p));
      p.on("error", (e) => { rej(e); try { p.destroy(); } catch {} });
    });
  }
  function waitIncoming(peer, ms) {
    return new Promise((res) => {
      let done = false;
      const t = setTimeout(() => { done = true; res(null); }, ms);
      peer.on("close", () => res(null));
      peer.on("connection", (c) => {
        if (done) return c.close();
        done = true;
        clearTimeout(t);
        if (c.open) res(c); else c.on("open", () => res(c));
      });
    });
  }
  function connectTo(peer, id, ms) {
    return new Promise((res) => {
      const t = setTimeout(() => res(null), ms);
      peer.on("error", () => { clearTimeout(t); res(null); });
      const c = peer.connect(id, { reliable: true });
      c.on("open", () => { clearTimeout(t); res(c); });
      c.on("close", () => res(null));
    });
  }
  function handshake(conn) {
    return new Promise((res) => {
      const t = setTimeout(() => finish(null), 4000);
      const onData = (m) => { if (m && m.t === "hello") finish(m); };
      const onClose = () => finish(null);
      function finish(h) {
        clearTimeout(t);
        conn.off("data", onData);
        conn.off("close", onClose);
        res(h);
      }
      conn.on("data", onData);
      conn.on("close", onClose);
      conn.send({ t: "hello", name: profile.name, rating: profile.rating, prefs: profile.prefs });
    });
  }
  const send = (m) => { try { s.conn && s.conn.open && s.conn.send(m); } catch {} };
  function destroy() {
    if (!s) return;
    try { s.conn && s.conn.close(); } catch {}
    try { s.peer && s.peer.destroy(); } catch {}
  }

  // ---------- matchmaking ----------
  async function tryJoin(id) {
    let peer;
    try { peer = await openPeer(); } catch { return null; }
    s.peer = peer;
    const conn = await connectTo(peer, id, 4000);
    const hello = conn && (await handshake(conn));
    if (hello) return { conn, peer, hello, role: "guest" };
    try { peer.destroy(); } catch {}
    s.peer = null;
    return null;
  }
  async function quick() {
    const b = bucketOf(profile.rating);
    const order = [b, b + 1, b - 1, b + 2, b - 2].filter((x) => x >= 0 && x <= 4);
    while (!s.cancelled) {
      for (const c of order) {
        if (s.cancelled) return null;
        const id = `${PID}q1-${c}`;
        let peer;
        try { peer = await openPeer(id); }
        catch (e) {
          if (e.type !== "unavailable-id") throw e;
          const r = await tryJoin(id);
          if (r) return r;
          continue;
        }
        s.peer = peer;
        const conn = await waitIncoming(peer, 7000);
        const hello = conn && (await handshake(conn));
        if (hello) return { conn, peer, hello, role: "host" };
        try { peer.destroy(); } catch {}
        s.peer = null;
        await sleep(300);
      }
    }
    return null;
  }
  async function createRoom() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (let i = 0; i < 6; i++) {
      const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      let peer;
      try { peer = await openPeer(`${PID}r1-${code}`); }
      catch (e) { if (e.type === "unavailable-id") continue; throw e; }
      s.peer = peer;
      $("lobbyTitle").textContent = `Room ${code}`;
      $("lobbyMsg").textContent = "Share this code with your friend and wait for them to join.";
      const conn = await waitIncoming(peer, 15 * 60 * 1000);
      const hello = conn && (await handshake(conn));
      return hello ? { conn, peer, hello, role: "host" } : null;
    }
    throw new Error("no room");
  }
  async function joinRoom(code) {
    const peer = await openPeer();
    s.peer = peer;
    const conn = await connectTo(peer, `${PID}r1-${code.toUpperCase()}`, 6000);
    const hello = conn && (await handshake(conn));
    if (!hello) { try { peer.destroy(); } catch {} throw new Error("notfound"); }
    return { conn, peer, hello, role: "guest" };
  }

  async function begin(kind, code) {
    if (s) { destroy(); }
    s = { kind, ranked: kind === "ranked", cancelled: false, ended: false, code };
    if (!available()) return fail("Online play couldn't load (the PeerJS script was blocked). Check your connection.");
    $("lobbyTitle").textContent = kind === "ranked" ? "Finding an opponent…" : kind === "join" ? `Joining ${code.toUpperCase()}…` : "Creating room…";
    $("lobbyMsg").textContent = kind === "ranked" ? `Searching in ${tierOf(profile.rating)[0]} range. This can take a while if nobody else is online.` : "";
    show("lobby");
    let res;
    try {
      res = kind === "ranked" ? await quick() : kind === "create" ? await createRoom() : await joinRoom(code);
    } catch (e) {
      if (s && !s.cancelled) fail(e.message === "notfound" ? "Room not found. Check the code." : "Couldn't reach the matchmaking server.", kind === "join");
      return;
    }
    if (!res || !s || s.cancelled) return;
    attach(res);
  }
  function fail(msg, toFriend) {
    destroy();
    s = null;
    if (toFriend) { $("friendMsg").textContent = msg; show("friend"); }
    else { $("lobbyTitle").textContent = "Oops"; $("lobbyMsg").textContent = msg; show("lobby"); }
  }
  function cancel() {
    if (s) { s.cancelled = true; destroy(); s = null; }
    show("menu");
  }

  // ---------- match setup ----------
  function attach({ conn, peer, hello, role }) {
    s.conn = conn; s.peer = peer; s.role = role;
    s.opp = { name: String(hello.name || "Opponent").slice(0, 20), rating: +hello.rating || 1000, prefs: hello.prefs || {} };
    const mine = s;
    conn.on("data", (m) => { if (s === mine) onMsg(m); });
    conn.on("close", () => { if (s === mine) onClose(); });
    peer.on("error", () => {});
    if (role === "host") {
      const words = buildWords();
      send({ t: "match", words });
      startMatch(words);
    } else {
      $("lobbyTitle").textContent = "Opponent found!";
      $("lobbyMsg").textContent = `${s.opp.name} · ${s.opp.rating}`;
    }
  }
  function buildWords() {
    const mine = profile.prefs, theirs = s.opp.prefs;
    let common = Object.keys(mine).filter((l) => POOLS[l] && theirs[l] && POOLS[l]);
    const words = [];
    for (let i = 0; i < ROUNDS; i++) {
      let lang = "Tech Basics", level = "Beginner";
      if (common.length) {
        lang = common[Math.floor(Math.random() * common.length)];
        const li = Math.min(LEVELS.indexOf(mine[lang]), LEVELS.indexOf(theirs[lang]));
        level = LEVELS[li < 0 ? 0 : li];
      }
      let w, guard = 0;
      do { w = pickWord(lang, level); } while (words.some((x) => x.word === w.word) && ++guard < 20);
      words.push(w);
    }
    return words;
  }
  function startMatch(words) {
    s.words = words;
    s.round = -1;
    s.total = { me: 0, opp: 0 };
    s.rounds = {};
    $("oppWrap").hidden = false;
    $("vsBar").hidden = false;
    $("hintBtn").hidden = true;
    $("quitBtn").textContent = "Forfeit";
    $("nextBtn").hidden = true;
    show("game");
    buildKeyboard();
    nextRound();
  }
  const R = (r) => (s.rounds[r] = s.rounds[r] || { ready: { me: false, opp: false }, fin: { me: null, opp: null }, started: false, scored: false });

  function nextRound() {
    if (!s || s.ended) return;
    s.round++;
    if (s.round >= ROUNDS) return endMatch();
    const r = s.round;
    s.board = null;
    inputHandler = null;
    s.oppPat = [];
    $("board").innerHTML = "";
    $("oppBoard").innerHTML = "";
    $("clue").textContent = "";
    $("msg").textContent = "";
    renderBar();
    banner(`Round ${r + 1} of ${ROUNDS}<br><small>Waiting for opponent…</small>`);
    R(r).ready.me = true;
    send({ t: "ready", r });
    tryStart(r);
  }
  async function tryStart(r) {
    const st = R(r);
    if (!s || st.started || !st.ready.me || !st.ready.opp) return;
    st.started = true;
    for (let n = 3; n > 0; n--) {
      if (!s || s.ended) return;
      banner(`Round ${r + 1}<br><b class="big">${n}</b>`);
      await sleep(800);
    }
    if (!s || s.ended) return;
    $("banner").hidden = true;
    beginRound(r);
  }
  function beginRound(r) {
    const w = s.words[r];
    s.board = new Board(w.word);
    s.t0 = Date.now();
    s.deadline = s.t0 + ROUND_S * 1000;
    $("tag").textContent = `${w.lang} · ${w.word.length} letters`;
    $("clue").innerHTML = "";
    const c = document.createElement("div");
    c.textContent = `${w.emoji ? w.emoji + "  " : ""}${w.hint}`;
    $("clue").append(c);
    inputHandler = press;
    s.board.render();
    renderOpp();
    clearInterval(s.timer);
    s.timer = setInterval(tick, 250);
    renderBar();
  }
  function tick() {
    if (!s || !s.board) return;
    renderBar();
    if (Date.now() >= s.deadline && !s.board.done) { s.board.done = true; s.board.render(); finishRound(); }
  }
  function press(k) {
    const b = s.board;
    if (!b || b.done) return;
    const r = b.press(k);
    if (r === "short") flash(`Need ${b.word.length} letters`);
    b.render();
    if (r === "submitted") {
      send({ t: "prog", r: s.round, pat: b.results[b.results.length - 1] });
      if (b.done) finishRound();
    }
  }
  function finishRound() {
    const r = s.round, b = s.board;
    clearInterval(s.timer);
    inputHandler = null;
    const fin = { solved: b.won, tries: b.guesses.length, ms: Math.min(Date.now() - s.t0, ROUND_S * 1000) };
    R(r).fin.me = fin;
    send({ t: "fin", r, ...fin });
    if (!R(r).fin.opp) banner(b.won ? "Solved! ✅<br><small>Waiting for opponent…</small>" : "Round over<br><small>Waiting for opponent…</small>");
    checkScored(r);
  }
  const points = (a, b) =>
    (a.solved ? 100 + (MAX_TRIES + 1 - a.tries) * 20 : 0) + (a.solved && (!b.solved || a.ms < b.ms) ? 40 : 0);
  function checkScored(r) {
    const st = R(r);
    if (st.scored || !st.fin.me || !st.fin.opp) return;
    st.scored = true;
    const mine = points(st.fin.me, st.fin.opp), theirs = points(st.fin.opp, st.fin.me);
    s.total.me += mine;
    s.total.opp += theirs;
    renderBar();
    banner(`The word was <b>${s.words[r].word}</b><br>You +${mine} · ${s.opp.name} +${theirs}`);
    setTimeout(nextRound, 3500);
  }

  // ---------- messages ----------
  function onMsg(m) {
    if (!m || !s || s.ended) return;
    if (m.t === "match" && s.role === "guest" && !s.words && Array.isArray(m.words)) {
      startMatch(m.words.slice(0, ROUNDS).map((w) => ({ lang: String(w.lang), level: String(w.level), word: String(w.word).toLowerCase(), hint: String(w.hint), emoji: String(w.emoji || "") })));
    } else if (m.t === "ready" && m.r >= 0 && m.r < ROUNDS) {
      R(m.r).ready.opp = true;
      tryStart(m.r);
    } else if (m.t === "prog" && m.r === s.round && Array.isArray(m.pat) && s.board) {
      s.oppPat.push(m.pat.slice(0, s.board.word.length).map((x) => (["correct", "present"].includes(x) ? x : "absent")));
      renderOpp();
    } else if (m.t === "fin" && m.r >= 0 && m.r < ROUNDS) {
      R(m.r).fin.opp = { solved: !!m.solved, tries: Math.min(MAX_TRIES, Math.max(1, m.tries | 0)), ms: Math.max(0, +m.ms || 0) };
      checkScored(m.r);
    }
  }
  function onClose() {
    if (!s || s.ended) return;
    if (!s.words) return fail("Opponent disconnected.");
    finalize("forfeit");
  }

  // ---------- UI ----------
  function renderBar() {
    if (!s || !s.total) return;
    const left = s.board && !s.board.done && s.deadline ? Math.max(0, Math.ceil((s.deadline - Date.now()) / 1000)) : "";
    $("vsBar").textContent = `You ${s.total.me} — ${s.total.opp} ${s.opp.name} · Round ${Math.min(s.round + 1, ROUNDS)}/${ROUNDS}${left !== "" ? ` · ⏱ ${left}s` : ""}`;
  }
  function renderOpp() {
    const box = $("oppBoard");
    box.innerHTML = "";
    const n = s.board ? s.board.word.length : 5;
    for (let r = 0; r < MAX_TRIES; r++) {
      const row = document.createElement("div");
      row.className = "orow";
      for (let c = 0; c < n; c++) {
        const t = document.createElement("i");
        if (s.oppPat[r]) t.className = s.oppPat[r][c];
        row.append(t);
      }
      box.append(row);
    }
  }
  function banner(html) {
    $("banner").innerHTML = html;
    $("banner").hidden = false;
  }

  // ---------- results ----------
  const expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));
  function finalize(kind) {
    // kind: "win" | "loss" | "draw" | "forfeit" (opponent left) | "quit" (I left)
    if (s.ended) return;
    s.ended = true;
    clearInterval(s.timer);
    inputHandler = null;
    const outcome = kind === "forfeit" ? "win" : kind === "quit" ? "loss" : kind;
    const score = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
    let delta = 0;
    if (s.ranked) {
      const before = profile.rating;
      profile.rating = Math.max(0, Math.round(before + 32 * (score - expected(before, s.opp.rating))));
      delta = profile.rating - before;
    }
    if (outcome === "win") profile.wins++; else if (outcome === "loss") profile.losses++; else profile.draws++;
    const xp = Math.round((s.total ? s.total.me : 0) / 2) + (outcome === "win" ? 50 : 0);
    profile.xp += xp;
    saveProfile();
    if (outcome === "win") confetti();
    const [tn, , ti] = tierOf(profile.rating);
    const title = { win: "🏆 Victory!", loss: "💀 Defeat", draw: "🤝 Draw" }[outcome];
    $("resTitle").textContent = title;
    const lines = [];
    if (kind === "forfeit") lines.push("Your opponent left the match.");
    if (kind === "quit") lines.push("You forfeited the match.");
    if (s.total) lines.push(`Final score: ${s.total.me} — ${s.total.opp} vs ${s.opp.name}`);
    if (s.ranked) lines.push(`Rating: ${profile.rating} (${delta >= 0 ? "+" : ""}${delta}) · ${ti} ${tn}`);
    else lines.push("Friendly match: rating unchanged.");
    lines.push(`+${xp} XP · Record ${profile.wins}W ${profile.losses}L ${profile.draws}D`);
    $("resBody").innerHTML = "";
    lines.forEach((l) => { const d = document.createElement("div"); d.textContent = l; $("resBody").append(d); });
    $("againBtn").hidden = false;
    show("result");
    const dead = s;
    setTimeout(() => { try { dead.conn && dead.conn.close(); dead.peer && dead.peer.destroy(); } catch {} }, 1500);
  }
  function endMatch() {
    const { me, opp } = s.total;
    finalize(me > opp ? "win" : me < opp ? "loss" : "draw");
  }
  function quit() {
    if (!s || s.ended) return show("menu");
    if (!confirm(s.ranked ? "Forfeit this ranked match? You'll lose rating." : "Leave the match?")) return;
    send({ t: "bye" });
    finalize("quit");
    show("menu");
  }
  function again() {
    const kind = s ? s.kind : "ranked";
    if (kind === "ranked") begin("ranked"); else show("friend");
  }

  return {
    ranked: () => begin("ranked"),
    create: () => begin("create"),
    join: (code) => begin("join", code),
    cancel, quit, again,
    inMatch: () => !!(s && s.words && !s.ended),
    lobbyOpen: () => !!s,
  };
})();
