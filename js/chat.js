// ScienceTube chat transport. Three backends with the same shape:
//   netlify:  the site's own Netlify function (/api/chat) with polling (default)
//   firebase: Firebase Realtime Database over REST + Server-Sent Events,
//             used instead when databaseURL is set in chat-config.js
//   local:    BroadcastChannel demo, used when neither is reachable
//             (for example when the site is opened from a plain static server)
// join(room, onMessage, onStatus) returns a function that leaves the room.
window.NebulaChat = (function () {
  "use strict";
  const cfg = window.SCIENCETUBE_CHAT || { databaseURL: "", rooms: [], history: 60 };
  const db = (cfg.databaseURL || "").replace(/\/+$/, "");

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

  // Netlify backend: poll the site's own function. Polls every 3 s while the
  // tab is visible and every 15 s while it's in the background.
  const API = "/api/chat";
  function joinNetlify(room, onMessage, onStatus) {
    let cursor = "", stopped = false, timer = 0, fails = 0, busy = false, again = false;
    async function poll() {
      if (stopped) return;
      if (busy) { again = true; return; }
      busy = true; clearTimeout(timer);
      try {
        const r = await fetch(`${API}?room=${encodeURIComponent(room)}${cursor ? "&since=" + encodeURIComponent(cursor) : ""}`, { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        const { messages } = await r.json();
        if (stopped) return;
        messages.forEach((m) => { if (m.id > cursor) { cursor = m.id; onMessage(m); } });
        fails = 0; onStatus("live");
      } catch (e) { fails++; onStatus(fails > 2 ? "error" : "connecting"); }
      busy = false;
      if (stopped) return;
      if (again) { again = false; return poll(); }
      timer = setTimeout(poll, document.hidden ? 15000 : 3000);
    }
    const wake = () => { if (!document.hidden && !stopped) poll(); };
    document.addEventListener("visibilitychange", wake);
    onStatus("connecting"); poll();
    return { leave() { stopped = true; clearTimeout(timer); document.removeEventListener("visibilitychange", wake); }, poke: wake };
  }
  async function sendNetlify(room, msg) {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, n: msg.n, t: msg.t, c: msg.c }) });
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.error || "Message failed to send (" + r.status + ")");
  }

  // Pick a backend once: Firebase if configured, else the Netlify function if
  // it answers, else the local demo.
  const ready = db ? Promise.resolve("firebase")
    : fetch(API + "?room=" + encodeURIComponent((cfg.rooms && cfg.rooms[0] && cfg.rooms[0].id) || "general"), { cache: "no-store" })
        .then((r) => (r.ok && /json/.test(r.headers.get("content-type") || "") ? "netlify" : "local"))
        .catch(() => "local");
  const api = { mode: db ? "firebase" : "pending" };
  ready.then((m) => (api.mode = m));

  // Every join returns { leave(), poke() }; poke() asks for new messages now.
  const wrap = (fn) => (...a) => { const r = fn(...a); return typeof r === "function" ? { leave: r, poke() {} } : r; };
  const B = { firebase: [wrap(joinFirebase), sendFirebase], netlify: [joinNetlify, sendNetlify], local: [wrap(joinLocal), sendLocal] };

  return Object.assign(api, {
    ready,
    rooms: cfg.rooms && cfg.rooms.length ? cfg.rooms : [{ id: "general", name: "General", emoji: "💬" }],
    join: (room, onMessage, onStatus) => B[api.mode][0](room, onMessage, onStatus),
    send: (room, msg) => B[api.mode][1](room, msg),
  });
})();
