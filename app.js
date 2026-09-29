// ---------- language setup ----------
function buildSetup() {
  const box = $("langs");
  box.innerHTML = "";
  for (const lang of Object.keys(POOLS)) {
    const row = document.createElement("div");
    row.className = "lang";
    row.dataset.lang = lang;
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = lang in profile.prefs;
    label.append(cb, lang);
    const sel = document.createElement("select");
    LEVELS.forEach((l) => sel.add(new Option(l, l)));
    sel.value = profile.prefs[lang] || LEVELS[0];
    sel.disabled = !cb.checked;
    cb.onchange = () => (sel.disabled = !cb.checked);
    row.append(label, sel);
    box.append(row);
  }
}
$("langBtn").onclick = () => { buildSetup(); $("setupError").hidden = true; show("setup"); };
$("saveLangs").onclick = () => {
  const next = {};
  document.querySelectorAll(".lang").forEach((row) => {
    if (row.querySelector("input").checked) next[row.dataset.lang] = row.querySelector("select").value;
  });
  if (!Object.keys(next).length) { $("setupError").hidden = false; return; }
  profile.prefs = next;
  saveProfile();
  show("menu");
};

// ---------- menu wiring ----------
$("soloBtn").onclick = () => Solo.start();
$("rankedBtn").onclick = () => Versus.ranked();
$("friendBtn").onclick = () => { $("friendMsg").textContent = ""; show("friend"); };
$("createRoom").onclick = () => Versus.create();
$("joinRoom").onclick = () => {
  const code = $("roomCode").value.trim();
  if (code.length !== 4) { $("friendMsg").textContent = "Enter the 4-letter code."; return; }
  Versus.join(code);
};
$("roomCode").oninput = (e) => (e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase());
document.querySelectorAll(".back").forEach((b) => (b.onclick = () => show("menu")));
$("cancelLobby").onclick = () => Versus.cancel();
$("quitBtn").onclick = () => { if (Versus.inMatch()) Versus.quit(); else { inputHandler = null; show("menu"); } };
$("menuBtn").onclick = () => show("menu");
$("againBtn").onclick = () => Versus.again();
$("logo").onclick = () => { if (!Versus.inMatch()) { inputHandler = null; show("menu"); } };

show("menu");
