// ScienceTube chat transport. Two backends with the same shape:
//   firebase: Firebase Realtime Database over REST + Server-Sent Events
//   local:    BroadcastChannel demo that only reaches tabs in this browser
// join(room, onMessage, onStatus) returns a function that leaves the room.
window.NebulaChat = (function () {
  "use strict";
  const cfg = window.SCIENCETUBE_CHAT || { databaseURL: "", rooms: [], history: 60 };
  const db = (cfg.databaseURL || "").replace(/\/+$/, "");
  const mode = db ? "firebase" : "local";

  function joinFirebase(room, onMessage, onStatus) {
    const seen = new Set();
    const url = `${db}/rooms/${encodeURIComponent(room)}.json?orderBy=${encodeURIComponent('"$key"')}&limitToLast=${cfg.history || 60}`;
    const es = new EventSource(url);
    const emit = (id, m) => {
      if (!m || seen.has(id) || typeof m.t !== "string") return;
      seen.add(id); onMessage({ id, n: String(m.n || "anon"), t: m.t, ts: +m.ts || Date.now(), c: +m.c || 0 });
    };
    const handle = (e) => {
      let p; try { p = JSON.parse(e.data); } catch (err) { return; }
      if (!p) return;
      if (p.path === "/") { if (p.data) Object.keys(p.data).sort().forEach((k) => emit(k, p.data[k])); }
      else { const id = p.path.split("/")[1]; if (id && p.path.split("/").length === 2) emit(id, p.data); }
      onStatus("live");
    };
    es.addEventListener("put", handle);
    es.addEventListener("patch", handle);
    es.addEventListener("open", () => onStatus("live"));
    es.addEventListener("error", () => onStatus(es.readyState === 2 ? "error" : "connecting"));
    es.addEventListener("cancel", () => onStatus("error"));
    es.addEventListener("auth_revoked", () => onStatus("error"));
    onStatus("connecting");
    return () => es.close();
  }

  async function sendFirebase(room, msg) {
    const r = await fetch(`${db}/rooms/${encodeURIComponent(room)}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n: msg.n, t: msg.t, c: msg.c, ts: { ".sv": "timestamp" } }),
    });
    if (!r.ok) throw new Error("Message was rejected (" + r.status + ")");
  }

  // Demo backend: keeps the last messages per room in localStorage and
  // relays new ones to other tabs of this browser.
  const KEY = (room) => "sciencetube.chat.demo." + room;
  const chan = "BroadcastChannel" in window ? new BroadcastChannel("sciencetube-chat") : null;
  const listeners = new Set();
  if (chan) chan.onmessage = (e) => listeners.forEach((fn) => fn(e.data));

  function readLocal(room) { try { return JSON.parse(localStorage.getItem(KEY(room)) || "[]"); } catch (e) { return []; } }
  function joinLocal(room, onMessage, onStatus) {
    readLocal(room).forEach(onMessage);
    const fn = (d) => { if (d.room === room) onMessage(d.msg); };
    listeners.add(fn); onStatus("demo");
    return () => listeners.delete(fn);
  }
  async function sendLocal(room, msg) {
    const m = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: msg.n, t: msg.t, c: msg.c, ts: Date.now() };
    const list = readLocal(room).concat(m).slice(-(cfg.history || 60));
    try { localStorage.setItem(KEY(room), JSON.stringify(list)); } catch (e) {}
    listeners.forEach((fn) => fn({ room, msg: m }));
    if (chan) chan.postMessage({ room, msg: m });
  }

  return {
    mode,
    rooms: cfg.rooms && cfg.rooms.length ? cfg.rooms : [{ id: "general", name: "General", emoji: "💬" }],
    join: mode === "firebase" ? joinFirebase : joinLocal,
    send: mode === "firebase" ? sendFirebase : sendLocal,
  };
})();
