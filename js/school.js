// ScienceTube Study — the school-tools side of the site (school.html).
// Loaded before app.js. app.js asks this file for the sidebar sections and
// then calls install() so the pages below become routes of the same app.
// Everything a person adds (events, assignments, notes, focus time, settings)
// is saved in this browser under "school.*" keys in localStorage.
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Storage
  ------------------------------------------------------------------ */
  const S = {
    get(k, d) { try { const v = localStorage.getItem("school." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("school." + k, JSON.stringify(v)); } catch {} },
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const COLORS = [
    ["blue", "#2563eb"], ["red", "#ef4444"], ["green", "#16a34a"],
    ["yellow", "#f59e0b"], ["purple", "#9333ea"], ["pink", "#ec4899"],
  ];
  const COLOR = Object.fromEntries(COLORS);
  const DEFAULT_LABELS = { blue: "Class", red: "Test", green: "Club", yellow: "Homework", purple: "Personal", pink: "Fun" };

  let profile = Object.assign({ name: "", weekStart: 0, accent: "blue", labels: {} }, S.get("profile", {}));
  profile.labels = Object.assign({}, DEFAULT_LABELS, profile.labels);
  let events = S.get("events", []);
  let tasks = S.get("tasks", []);
  let notes = S.get("notes", []);
  let focus = Object.assign({ work: 25, short: 5, long: 15, log: {}, sessions: {}, state: { mode: "work", running: false, left: 25 * 60, endAt: 0 } }, S.get("focus", {}));
  const saveProfile = () => { S.set("profile", profile); applyAccent(); };
  const saveEvents = () => S.set("events", events);
  const saveTasks = () => { S.set("tasks", tasks); updateFoot(); };
  const saveNotes = () => S.set("notes", notes);
  const saveFocus = () => { S.set("focus", focus); updateFoot(); };

  /* ------------------------------------------------------------------
     Dates
  ------------------------------------------------------------------ */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const niceDate = (s, long) => fromIso(s).toLocaleDateString(undefined, long ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
  const niceTime = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "am" : "pm"}`; };
  function relDay(s) {
    const diff = Math.round((fromIso(s) - fromIso(today())) / 864e5);
    if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff === -1) return "Yesterday";
    if (diff < 0) return `${-diff} days ago`; if (diff < 7) return `In ${diff} days`;
    return niceDate(s);
  }
  // Does a (possibly repeating) event land on this date?
  function occursOn(ev, date) {
    if (ev.date === date) return true;
    if (!ev.repeat || ev.repeat === "none" || date < ev.date) return false;
    const a = fromIso(ev.date), b = fromIso(date);
    if (ev.repeat === "daily") return true;
    if (ev.repeat === "weekly") return a.getDay() === b.getDay();
    if (ev.repeat === "monthly") return a.getDate() === b.getDate();
    if (ev.repeat === "yearly") return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
    return false;
  }
  const eventsOn = (date) => events.filter((e) => occursOn(e, date)).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const tasksOn = (date) => tasks.filter((t) => t.due === date);

  /* ------------------------------------------------------------------
     Wiring to app.js
  ------------------------------------------------------------------ */
  let A = null; // helpers handed over by app.js
  let $, $$, esc, svg, toast, view;

  const ICONS = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    check: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 12.5l3 3 5-6"/>',
    note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h.01M12 18.5h4"/>',
    ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
    atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    pencil: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  };

  const TOOLS = [
    { id: "calendar", label: "Calendar", icon: "calendar", blurb: "Events, tests and due dates", glow: COLOR.blue },
    { id: "planner", label: "Assignments", icon: "check", blurb: "Track homework and progress", glow: COLOR.green },
    { id: "notes", label: "Notes", icon: "note", blurb: "Class notes that save as you type", glow: COLOR.yellow },
    { id: "focus", label: "Focus timer", icon: "timer", blurb: "Study in timed rounds", glow: COLOR.red },
    { id: "calc", label: "Calculator", icon: "calc", blurb: "Scientific, with history", glow: COLOR.purple },
    { id: "convert", label: "Converter", icon: "ruler", blurb: "Length, mass, temperature and more", glow: COLOR.pink },
    { id: "elements", label: "Periodic table", icon: "atom", blurb: "All 118 elements", glow: "#0d9488" },
  ];

  function sections(proxyEnabled) {
    return [
      { group: "Study" },
      { id: "home", label: "Dashboard", icon: "home", blurb: "Your day at a glance" },
      ...TOOLS,
      { group: "Break" },
      { id: "games", label: "Games", icon: "games", blurb: "Browse the full library", glow: COLOR.purple },
      { id: "favorites", label: "Favorites", icon: "heart", blurb: "Games you've hearted", glow: COLOR.pink },
      { id: "proxy", label: "Proxy", icon: "globe", soon: !proxyEnabled, blurb: "Browse through your private proxy", glow: COLOR.green },
      { group: "You" },
      { id: "settings", label: "Settings", icon: "gear", blurb: "Name, colors and your data", glow: "#64748b" },
    ];
  }

  function install(api) {
    A = api; ({ $, $$, esc, svg, toast, view } = api);
    Object.assign(api.I, ICONS);
    const V = api.VIEWS;
    V.home = dashboard; V.calendar = calendarPage; V.planner = plannerPage; V.notes = notesPage;
    V.focus = focusPage; V.calc = calcPage; V.convert = convertPage; V.elements = elementsPage; V.settings = settingsPage;
    applyAccent();
    updateFoot();
    const chip = $("#today-chip");
    if (chip) chip.innerHTML = `${svg("calendar")}<span>${esc(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }))}</span>`;
    setInterval(tickFocus, 1000);
    // Another tab of the site changed something: pick it up.
    addEventListener("storage", (e) => {
      if (!e.key || !e.key.startsWith("school.")) return;
      events = S.get("events", []); tasks = S.get("tasks", []); notes = S.get("notes", []);
      updateFoot();
    });
  }

  function applyAccent() {
    document.documentElement.style.setProperty("--accent", COLOR[profile.accent] || COLOR.blue);
  }
  function updateFoot() {
    const t = document.getElementById("stat-tasks"), f = document.getElementById("stat-focus");
    if (t) t.textContent = tasks.filter((x) => !x.done).length;
    if (f) f.textContent = Math.round(focus.log[today()] || 0);
  }
  const calm = () => document.body.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     Little shared pieces
  ------------------------------------------------------------------ */
  function confetti(x, y) {
    if (calm()) return;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("i");
      p.className = "confetti";
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      p.style.cssText = `left:${x}px;top:${y}px;background:${COLORS[i % COLORS.length][1]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--r:${Math.random() * 540 - 270}deg`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }
  function ring(pct, size, color, label) {
    const r = (size - 12) / 2, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bar" style="stroke:${color};stroke-dasharray:${c};stroke-dashoffset:${c}" data-to="${c * (1 - Math.max(0, Math.min(1, pct)))}"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle">${label}</text></svg>`;
  }
  // Rings draw themselves in after they hit the page.
  function animateRings(root) {
    requestAnimationFrame(() => requestAnimationFrame(() => $$(".ring-bar", root).forEach((el) => { el.style.strokeDashoffset = el.dataset.to; })));
  }
  const colorDots = (name, sel) => `<div class="dots" role="radiogroup">${COLORS.map(([id, hex]) =>
    `<label title="${esc(profile.labels[id] || id)}"><input type="radio" name="${name}" value="${id}" ${id === sel ? "checked" : ""}><i style="background:${hex}"></i></label>`).join("")}</div>`;

  function dialog(html, onMount) {
    const d = document.createElement("dialog");
    d.className = "sheet";
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
    onMount(d);
    d.showModal();
    return d;
  }

  /* ------------------------------------------------------------------
     Event editor
  ------------------------------------------------------------------ */
  function editEvent(ev, date, done) {
    const isNew = !ev;
    ev = ev || { id: uid(), date: date || today(), time: "", title: "", color: profile.accent, note: "", repeat: "none" };
    dialog(`<form method="dialog" class="sheet-body" id="ev-form">
        <div class="sheet-head"><b>${isNew ? "New event" : "Edit event"}</b><button type="button" class="icon-btn" data-close aria-label="Close">${svg("x")}</button></div>
        <label>What's happening?<input class="field" name="title" maxlength="80" required placeholder="Biology test, soccer practice…" value="${esc(ev.title)}"></label>
        <div class="row2">
          <label>Date<input class="field" type="date" name="date" required value="${esc(ev.date)}"></label>
          <label>Time (optional)<input class="field" type="time" name="time" value="${esc(ev.time || "")}"></label>
        </div>
        <div class="row2">
          <label>Repeats<select class="field" name="repeat">${[["none", "Never"], ["daily", "Every day"], ["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"]].map(([v, n]) => `<option value="${v}" ${ev.repeat === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <div class="lbl">Color<br>${colorDots("color", ev.color)}</div>
        </div>
        <label>Notes<textarea class="field" name="note" rows="2" maxlength="400" placeholder="Room 204, bring a calculator">${esc(ev.note || "")}</textarea></label>
        <div class="sheet-actions">
          ${isNew ? "" : `<button type="button" class="btn sm ghost danger" id="ev-del">${svg("trash")} Delete</button>`}
          <span style="flex:1"></span>
          <button type="button" class="btn sm ghost" data-close>Cancel</button>
          <button class="btn sm" value="save">${isNew ? "Add event" : "Save"}</button>
        </div>
      </form>`, (d) => {
      const f = $("#ev-form", d);
      f.addEventListener("submit", () => {
        const fd = new FormData(f);
        Object.assign(ev, { title: fd.get("title").trim(), date: fd.get("date"), time: fd.get("time") || "", repeat: fd.get("repeat"), color: fd.get("color") || "blue", note: fd.get("note").trim() });
        if (!ev.title || !ev.date) return;
        if (isNew) events.push(ev);
        saveEvents(); toast(isNew ? "Event added" : "Event saved"); done && done(ev);
      });
      const del = $("#ev-del", d);
      if (del) del.onclick = () => { events = events.filter((e) => e.id !== ev.id); saveEvents(); d.close(); toast("Event deleted"); done && done(null); };
      if (isNew) setTimeout(() => f.elements.title.focus(), 50);
    });
  }

  /* ------------------------------------------------------------------
     Calendar widget (used on the dashboard and the Calendar page)
  ------------------------------------------------------------------ */
  function calendarWidget(root, opts = {}) {
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth(), sel = today(), dir = 0;
    root.classList.add("cal");
    root.innerHTML = `<div class="cal-main">
        <div class="cal-head">
          <h2 class="cal-title"></h2>
          <div class="cal-nav">
            <button class="btn sm ghost" data-act="today">Today</button>
            <button class="icon-btn" data-act="prev" aria-label="Previous month">${svg("back")}</button>
            <button class="icon-btn" data-act="next" aria-label="Next month">${svg("fwd")}</button>
            <button class="btn sm" data-act="add">${svg("plus")} Add event</button>
          </div>
        </div>
        <div class="cal-dow"></div>
        <div class="cal-grid" role="grid"></div>
      </div>
      <aside class="cal-day"></aside>`;
    const grid = $(".cal-grid", root), title = $(".cal-title", root), dow = $(".cal-dow", root), day = $(".cal-day", root);

    function draw() {
      const ws = profile.weekStart;
      dow.innerHTML = [0, 1, 2, 3, 4, 5, 6].map((i) => `<span>${DAYS[(i + ws) % 7]}</span>`).join("");
      title.innerHTML = `${MONTHS[m]} <span>${y}</span>`;
      const first = new Date(y, m, 1);
      const lead = (first.getDay() - ws + 7) % 7;
      const weeks = Math.ceil((lead + new Date(y, m + 1, 0).getDate()) / 7);
      const t = today();
      let html = "";
      for (let i = 0; i < weeks * 7; i++) {
        const d = new Date(y, m, 1 - lead + i), ds = iso(d), out = d.getMonth() !== m;
        const evs = eventsOn(ds), tks = tasksOn(ds);
        const items = [
          ...evs.map((e) => `<span class="pip" style="--c:${COLOR[e.color] || COLOR.blue}">${e.time ? `<em>${niceTime(e.time).replace(":00", "").replace(" ", "")}</em> ` : ""}${esc(e.title)}</span>`),
          ...tks.map((k) => `<span class="pip task${k.done ? " done" : ""}">${esc(k.title)}</span>`),
        ];
        const more = items.length > 3 ? `<span class="pip more">+${items.length - 2} more</span>` : "";
        html += `<button class="cell${out ? " out" : ""}${ds === t ? " today" : ""}${ds === sel ? " sel" : ""}" data-d="${ds}" style="--i:${i}" role="gridcell" aria-label="${esc(niceDate(ds, true))}, ${items.length} items">
          <b>${d.getDate()}</b><div class="pips">${(more ? items.slice(0, 2) : items).join("")}${more}</div>
          <div class="dotrow">${evs.slice(0, 4).map((e) => `<i style="background:${COLOR[e.color] || COLOR.blue}"></i>`).join("")}${tks.length ? '<i class="t"></i>' : ""}</div></button>`;
      }
      grid.className = "cal-grid" + (dir ? (dir > 0 ? " slide-l" : " slide-r") : "");
      grid.style.setProperty("--weeks", weeks);
      grid.innerHTML = html;
      dir = 0;
      drawDay();
    }

    function drawDay() {
      const evs = eventsOn(sel), tks = tasksOn(sel);
      day.innerHTML = `<div class="day-head"><small>${esc(relDay(sel))}</small><b>${esc(niceDate(sel, true))}</b></div>
        <div class="day-list">
          ${evs.map((e) => `<button class="day-item" data-ev="${e.id}" style="--c:${COLOR[e.color] || COLOR.blue}">
              <i></i><span><b>${esc(e.title)}</b><small>${[e.time ? niceTime(e.time) : "All day", profile.labels[e.color], e.repeat && e.repeat !== "none" ? "repeats " + e.repeat : ""].filter(Boolean).map(esc).join(" · ")}</small>${e.note ? `<small class="nt">${esc(e.note)}</small>` : ""}</span></button>`).join("")}
          ${tks.map((k) => `<label class="day-item task${k.done ? " done" : ""}"><input type="checkbox" data-task="${k.id}" ${k.done ? "checked" : ""}><span><b>${esc(k.title)}</b><small>Assignment due${k.subject ? " · " + esc(k.subject) : ""}</small></span></label>`).join("")}
          ${evs.length + tks.length ? "" : `<div class="day-empty"><span>${svg("calendar")}</span>Nothing planned.<br>Enjoy the free day or add something.</div>`}
        </div>
        <form class="quick-add" autocomplete="off"><input class="field" placeholder="Quick add for this day…" maxlength="80" aria-label="Quick add event"><button class="btn sm" aria-label="Add">${svg("plus")}</button></form>`;
      $$(".cell", grid).forEach((c) => c.classList.toggle("sel", c.dataset.d === sel));
    }

    function go(delta) { dir = delta; m += delta; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(); }
    const refresh = () => { draw(); opts.onChange && opts.onChange(); };

    root.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]");
      if (act) {
        const a = act.dataset.act;
        if (a === "prev") go(-1); else if (a === "next") go(1);
        else if (a === "today") { const n = new Date(); dir = (n.getFullYear() - y) * 12 + n.getMonth() - m; y = n.getFullYear(); m = n.getMonth(); sel = today(); draw(); }
        else if (a === "add") editEvent(null, sel, refresh);
        return;
      }
      const cell = e.target.closest(".cell");
      if (cell) {
        sel = cell.dataset.d;
        const d = fromIso(sel);
        if (d.getMonth() !== m) { dir = (d.getFullYear() - y) * 12 + d.getMonth() - m; y = d.getFullYear(); m = d.getMonth(); draw(); } else drawDay();
        return;
      }
      const item = e.target.closest("[data-ev]");
      if (item) editEvent(events.find((x) => x.id === item.dataset.ev), sel, refresh);
    });
    grid.addEventListener("dblclick", (e) => { const c = e.target.closest(".cell"); if (c) editEvent(null, c.dataset.d, refresh); });
    day.addEventListener("change", (e) => {
      const id = e.target.dataset.task; if (!id) return;
      const k = tasks.find((x) => x.id === id); if (!k) return;
      setTaskDone(k, e.target.checked, e.target);
      refresh();
    });
    day.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = $("input", e.target), v = inp.value.trim(); if (!v) return;
      events.push({ id: uid(), date: sel, time: "", title: v, color: profile.accent, note: "", repeat: "none" });
      saveEvents(); refresh();
      const again = $(".quick-add input", day); again && again.focus();
    });
    // Arrow keys flip months when the grid has focus.
    root.addEventListener("keydown", (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "PageUp") { e.preventDefault(); go(-1); } else if (e.key === "PageDown") { e.preventDefault(); go(1); }
    });
    draw();
    return { refresh: draw };
  }

  function setTaskDone(k, done, el) {
    k.done = done; k.doneAt = done ? Date.now() : 0;
    saveTasks();
    if (done && el) { const r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2); }
  }

  /* ------------------------------------------------------------------
     Dashboard
  ------------------------------------------------------------------ */
  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Burning the midnight oil";
  }
  function streak() {
    let n = 0, d = today();
    if (!focus.log[d]) d = addDays(d, -1);
    while (focus.log[d]) { n++; d = addDays(d, -1); }
    return n;
  }
  function upcoming(limit) {
    const out = [], t = today();
    for (let i = 0; i < 30 && out.length < limit; i++) {
      const d = addDays(t, i);
      eventsOn(d).forEach((e) => out.push({ d, e }));
    }
    return out.slice(0, limit);
  }

  function dashboard() {
    view.innerHTML = `<div class="page school-page">
      <header class="hello">
        <div>
          <small class="kicker">${esc(greeting())}</small>
          <h1>${profile.name ? `Hi, <span class="hl">${esc(profile.name)}</span>.` : `Welcome to your <span class="hl">study desk</span>.`}</h1>
          <p class="muted" id="hello-sub"></p>
        </div>
        <div class="hello-art" aria-hidden="true">
          <span class="sticker s1">${svg("pencil")}</span><span class="sticker s2">${svg("atom")}</span><span class="sticker s3">${svg("ruler")}</span><span class="sticker s4">${svg("calc")}</span>
        </div>
      </header>
      ${profile.name ? "" : `<form class="name-ask card" id="name-ask"><b>What should we call you?</b><input class="field" maxlength="24" placeholder="Your first name" aria-label="Your name"><button class="btn sm">Save</button></form>`}
      <div class="stats" id="stats"></div>
      <section class="card cal-card"><div id="dash-cal"></div></section>
      <div class="two">
        <section class="card"><div class="card-head"><h3>${svg("check")} Due soon</h3><a class="more" href="#/planner">All assignments</a></div><div id="dash-tasks"></div>
          <form class="quick-add" id="dash-add" autocomplete="off"><input class="field" placeholder="Add an assignment…" maxlength="100" aria-label="Add an assignment"><input class="field" type="date" aria-label="Due date" style="width:auto"><button class="btn sm" aria-label="Add">${svg("plus")}</button></form>
        </section>
        <section class="card"><div class="card-head"><h3>${svg("calendar")} Coming up</h3><a class="more" href="#/calendar">Open calendar</a></div><div id="dash-up"></div></section>
      </div>
      <div class="section-title"><h2>School supplies</h2></div>
      <div class="supplies">${TOOLS.map((t, i) => `<a class="supply" href="#/${t.id}" style="--c:${t.glow};--i:${i}"><span class="ico">${svg(t.icon)}</span><b>${esc(t.label)}</b><small>${esc(t.blurb)}</small></a>`).join("")}</div>
    </div>`;

    const cal = calendarWidget($("#dash-cal"), { onChange: side });
    function side() {
      const open = tasks.filter((t) => !t.done), done = tasks.filter((t) => t.done).length;
      const pct = tasks.length ? done / tasks.length : 0;
      const mins = Math.round(focus.log[today()] || 0), goal = focus.goal || 60;
      const todayEv = eventsOn(today()).length, st = streak();
      $("#hello-sub").textContent = `${todayEv ? `${todayEv} ${todayEv === 1 ? "event" : "events"} today` : "Nothing on the calendar today"} · ${open.length ? `${open.length} ${open.length === 1 ? "assignment" : "assignments"} to finish` : "no assignments waiting"}.`;
      $("#stats").innerHTML = `
        <a class="stat" href="#/planner" style="--c:${COLOR.green}">${ring(pct, 76, COLOR.green, Math.round(pct * 100) + "%")}<div><b>${done} of ${tasks.length}</b><small>assignments done</small></div></a>
        <a class="stat" href="#/focus" style="--c:${COLOR.red}">${ring(Math.min(1, mins / goal), 76, COLOR.red, mins + "m")}<div><b>${mins} min</b><small>focused today, goal ${goal}</small></div></a>
        <a class="stat" href="#/focus" style="--c:${COLOR.yellow}"><span class="stat-ico">${svg("flame")}</span><div><b>${st} ${st === 1 ? "day" : "days"}</b><small>study streak</small></div></a>
        <a class="stat" href="#/notes" style="--c:${COLOR.purple}"><span class="stat-ico">${svg("note")}</span><div><b>${notes.length}</b><small>${notes.length === 1 ? "note" : "notes"} saved</small></div></a>`;
      animateRings($("#stats"));
      const soon = open.slice().sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")).slice(0, 5);
      $("#dash-tasks").innerHTML = soon.length ? soon.map(taskRow).join("") : `<div class="day-empty"><span>${svg("check")}</span>All caught up. Add your next assignment below.</div>`;
      const up = upcoming(5);
      $("#dash-up").innerHTML = up.length ? up.map(({ d, e }) => `<div class="up" style="--c:${COLOR[e.color] || COLOR.blue}"><span class="up-date"><b>${fromIso(d).getDate()}</b><small>${MONTHS[fromIso(d).getMonth()].slice(0, 3)}</small></span><span><b>${esc(e.title)}</b><small>${esc(relDay(d))}${e.time ? " · " + niceTime(e.time) : ""}</small></span></div>`).join("")
        : `<div class="day-empty"><span>${svg("calendar")}</span>No events in the next month. Tap a day on the calendar to add one.</div>`;
    }
    side();

    $("#dash-tasks").addEventListener("change", (e) => {
      const k = tasks.find((x) => x.id === e.target.dataset.task); if (!k) return;
      setTaskDone(k, e.target.checked, e.target);
      setTimeout(() => { side(); cal.refresh(); }, 450);
    });
    $("#dash-add").addEventListener("submit", (e) => {
      e.preventDefault();
      const [t, d] = $$("input", e.target); const v = t.value.trim(); if (!v) return;
      tasks.push({ id: uid(), title: v, subject: "", due: d.value || "", prio: "normal", done: false, doneAt: 0 });
      saveTasks(); t.value = ""; side(); cal.refresh(); toast("Assignment added");
    });
    const ask = $("#name-ask");
    if (ask) ask.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("input", ask).value.trim(); if (!v) return;
      profile.name = v; saveProfile(); A.route();
    });
  }

  function taskRow(k) {
    const late = k.due && !k.done && k.due < today();
    return `<label class="task-row${k.done ? " done" : ""}${late ? " late" : ""}" data-id="${k.id}">
      <input type="checkbox" data-task="${k.id}" ${k.done ? "checked" : ""}><span class="tick">${svg("check")}</span>
      <span class="task-main"><b>${esc(k.title)}</b><small>${[k.subject, k.due ? (late ? "Overdue · " + relDay(k.due) : "Due " + relDay(k.due).replace(/^(Today|Tomorrow|In)\b/, (w) => w.toLowerCase())) : "No due date", k.prio === "high" ? "High priority" : ""].filter(Boolean).map(esc).join(" · ")}</small></span>
      ${k.prio === "high" ? '<i class="flag" title="High priority"></i>' : ""}</label>`;
  }

  /* ------------------------------------------------------------------
     Calendar page
  ------------------------------------------------------------------ */
  function calendarPage() {
    view.innerHTML = `<div class="page school-page">
      <div class="page-head"><h1>Your <span class="hl">calendar</span></h1><p>Click a day to see it, double-click to add an event. Everything stays saved in this browser.</p></div>
      <section class="card cal-card big"><div id="page-cal"></div></section>
      <div class="two">
        <section class="card"><div class="card-head"><h3>${svg("calendar")} Next 30 days</h3></div><div id="agenda"></div></section>
        <section class="card"><div class="card-head"><h3>${svg("pencil")} Your color labels</h3></div>
          <p class="muted" style="margin:0 0 12px">Name each color so the calendar matches your life.</p>
          <div class="labels">${COLORS.map(([id, hex]) => `<label><i style="background:${hex}"></i><input class="field" data-label="${id}" maxlength="18" value="${esc(profile.labels[id])}" aria-label="Label for ${id}"></label>`).join("")}</div>
          <label class="toggle" style="margin-top:14px"><span>Week starts on Monday</span><span class="switch"><input type="checkbox" id="c-mon" ${profile.weekStart ? "checked" : ""}><span></span></span></label>
        </section>
      </div>
    </div>`;
    const agenda = () => {
      const up = upcoming(12);
      $("#agenda").innerHTML = up.length ? up.map(({ d, e }) => `<div class="up" style="--c:${COLOR[e.color] || COLOR.blue}"><span class="up-date"><b>${fromIso(d).getDate()}</b><small>${MONTHS[fromIso(d).getMonth()].slice(0, 3)}</small></span><span><b>${esc(e.title)}</b><small>${esc(relDay(d))}${e.time ? " · " + niceTime(e.time) : ""} · ${esc(profile.labels[e.color] || "")}</small></span></div>`).join("")
        : `<div class="day-empty"><span>${svg("calendar")}</span>Nothing coming up yet.</div>`;
    };
    const cal = calendarWidget($("#page-cal"), { onChange: agenda });
    agenda();
    $(".labels").addEventListener("input", (e) => {
      const id = e.target.dataset.label; if (!id) return;
      profile.labels[id] = e.target.value.trim() || DEFAULT_LABELS[id]; saveProfile(); cal.refresh(); agenda();
    });
    $("#c-mon").onchange = (e) => { profile.weekStart = e.target.checked ? 1 : 0; saveProfile(); cal.refresh(); };
  }

  /* ------------------------------------------------------------------
     Assignments
  ------------------------------------------------------------------ */
  function plannerPage() {
    let filter = S.get("taskFilter", "open");
    view.innerHTML = `<div class="page school-page">
      <div class="page-head"><h1>Your <span class="hl">assignments</span></h1><p>Add what's due, tick it off when it's done. Due dates show up on your calendar too.</p></div>
      <section class="card progress-card"><div id="p-ring"></div><div class="progress-txt"><b id="p-head"></b><div class="bar"><i id="p-bar"></i></div><small class="muted" id="p-sub"></small></div></section>
      <form class="card add-task" id="t-form" autocomplete="off">
        <input class="field" name="title" placeholder="Read chapter 4, finish lab report…" maxlength="100" required aria-label="Assignment">
        <input class="field" name="subject" placeholder="Subject" maxlength="24" list="subjects" aria-label="Subject">
        <datalist id="subjects"></datalist>
        <input class="field" name="due" type="date" aria-label="Due date">
        <select class="field" name="prio" aria-label="Priority"><option value="normal">Normal</option><option value="high">High priority</option></select>
        <button class="btn">${svg("plus")} Add</button>
      </form>
      <div class="seg" id="t-filter">${[["open", "To do"], ["done", "Done"], ["all", "All"]].map(([v, n]) => `<button data-f="${v}">${n}</button>`).join("")}</div>
      <div class="task-list" id="t-list"></div>
    </div>`;
    const list = $("#t-list");
    function draw() {
      const done = tasks.filter((t) => t.done).length, pct = tasks.length ? done / tasks.length : 0;
      $("#p-ring").innerHTML = ring(pct, 96, COLOR.green, Math.round(pct * 100) + "%"); animateRings($("#p-ring"));
      $("#p-head").textContent = tasks.length ? `${done} of ${tasks.length} done` : "Nothing here yet";
      $("#p-bar").style.width = pct * 100 + "%";
      const late = tasks.filter((t) => !t.done && t.due && t.due < today()).length;
      $("#p-sub").textContent = !tasks.length ? "Add your first assignment below." : pct === 1 ? "Everything is finished. Nice work!" : late ? `${late} overdue. Start with those.` : "Keep going, you're on track.";
      $("#subjects").innerHTML = [...new Set(tasks.map((t) => t.subject).filter(Boolean))].map((s) => `<option value="${esc(s)}">`).join("");
      $$("#t-filter button").forEach((b) => b.classList.toggle("on", b.dataset.f === filter));
      const shown = tasks.filter((t) => filter === "all" || (filter === "done") === !!t.done)
        .sort((a, b) => (a.done - b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
      list.innerHTML = shown.length ? shown.map((k, i) => `<div class="task-wrap" style="--i:${Math.min(i, 20)}">${taskRow(k)}<button class="icon-btn" data-del="${k.id}" aria-label="Delete ${esc(k.title)}">${svg("trash")}</button></div>`).join("")
        : `<div class="day-empty big"><span>${svg("check")}</span>${filter === "done" ? "Nothing finished yet." : filter === "open" ? "Nothing to do. Time for a break?" : "No assignments yet."}</div>`;
    }
    draw();
    $("#t-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target), title = fd.get("title").trim(); if (!title) return;
      tasks.push({ id: uid(), title, subject: fd.get("subject").trim(), due: fd.get("due") || "", prio: fd.get("prio"), done: false, doneAt: 0 });
      saveTasks(); e.target.reset(); if (filter === "done") filter = "open"; draw(); e.target.elements.title.focus();
    });
    $("#t-filter").onclick = (e) => { const b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; S.set("taskFilter", filter); draw(); };
    list.addEventListener("change", (e) => {
      const k = tasks.find((x) => x.id === e.target.dataset.task); if (!k) return;
      setTaskDone(k, e.target.checked, e.target);
      e.target.closest(".task-row").classList.toggle("done", k.done);
      setTimeout(draw, 450);
    });
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-del]"); if (!b) return;
      tasks = tasks.filter((t) => t.id !== b.dataset.del); saveTasks(); draw();
    });
  }

  /* ------------------------------------------------------------------
     Notes
  ------------------------------------------------------------------ */
  function notesPage(arg) {
    let cur = notes.find((n) => n.id === arg) || notes[0] || null;
    view.innerHTML = `<div class="page school-page notes-page">
      <div class="page-head"><h1>Your <span class="hl">notes</span></h1><p>Saved automatically as you type.</p></div>
      <div class="notes">
        <aside class="note-list card"><button class="btn sm" id="n-new">${svg("plus")} New note</button><input class="field" id="n-q" placeholder="Search notes" aria-label="Search notes"><div id="n-items"></div></aside>
        <section class="note-edit card" id="n-edit"></section>
      </div>
    </div>`;
    const items = $("#n-items"), edit = $("#n-edit");
    function drawList() {
      const q = $("#n-q").value.trim().toLowerCase();
      const shown = notes.filter((n) => !q || (n.title + " " + n.body).toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated);
      items.innerHTML = shown.length ? shown.map((n) => `<button class="note-item${cur && n.id === cur.id ? " on" : ""}" data-id="${n.id}" style="--c:${COLOR[n.color] || COLOR.yellow}"><b>${esc(n.title || "Untitled")}</b><small>${esc((n.body || "No text yet").slice(0, 60))}</small></button>`).join("") : `<p class="muted" style="padding:10px 4px">${q ? "No notes match." : "No notes yet."}</p>`;
    }
    function drawEdit() {
      if (!cur) { edit.innerHTML = `<div class="day-empty big"><span>${svg("note")}</span>Start your first note.<br><button class="btn sm" id="n-first" style="margin-top:12px">${svg("plus")} New note</button></div>`; $("#n-first").onclick = add; return; }
      edit.style.setProperty("--c", COLOR[cur.color] || COLOR.yellow);
      edit.innerHTML = `<div class="note-bar"><input class="note-title" id="n-title" maxlength="80" placeholder="Title" value="${esc(cur.title)}" aria-label="Note title">${colorDots("ncolor", cur.color)}<button class="icon-btn" id="n-del" aria-label="Delete note">${svg("trash")}</button></div>
        <textarea id="n-body" placeholder="Write anything: class notes, formulas, ideas…" aria-label="Note text">${esc(cur.body)}</textarea>
        <small class="muted" id="n-meta"></small>`;
      const meta = () => { const w = cur.body.trim() ? cur.body.trim().split(/\s+/).length : 0; $("#n-meta").textContent = `${w} ${w === 1 ? "word" : "words"} · saved ${new Date(cur.updated).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`; };
      meta();
      const save = () => { cur.title = $("#n-title").value; cur.body = $("#n-body").value; cur.updated = Date.now(); saveNotes(); meta(); drawList(); };
      $("#n-title").oninput = save; $("#n-body").oninput = save;
      $(".dots", edit).onchange = (e) => { cur.color = e.target.value; saveNotes(); edit.style.setProperty("--c", COLOR[cur.color]); drawList(); };
      $("#n-del").onclick = () => { if (!confirm("Delete this note?")) return; notes = notes.filter((n) => n.id !== cur.id); saveNotes(); cur = notes[0] || null; drawList(); drawEdit(); };
    }
    function add() {
      cur = { id: uid(), title: "", body: "", color: COLORS[notes.length % COLORS.length][0], updated: Date.now() };
      notes.push(cur); saveNotes(); drawList(); drawEdit(); $("#n-title").focus();
    }
    $("#n-new").onclick = add;
    $("#n-q").oninput = drawList;
    items.onclick = (e) => { const b = e.target.closest("[data-id]"); if (!b) return; cur = notes.find((n) => n.id === b.dataset.id); drawList(); drawEdit(); };
    drawList(); drawEdit();
  }

  /* ------------------------------------------------------------------
     Focus timer (keeps counting while you use other tabs of the site)
  ------------------------------------------------------------------ */
  const MODES = { work: ["Focus", COLOR.red], short: ["Short break", COLOR.green], long: ["Long break", COLOR.blue] };
  const modeLen = (mode) => (focus[mode] || 25) * 60;
  const timeLeft = () => focus.state.running ? Math.max(0, Math.round((focus.state.endAt - Date.now()) / 1000)) : focus.state.left;
  let drawFocus = null;

  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22, 0.44].forEach((t, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = [660, 880, 1100][i]; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.2);
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.22);
      });
    } catch {}
  }
  function tickFocus() {
    const st = focus.state;
    if (st.running && Date.now() >= st.endAt) {
      st.running = false;
      if (st.mode === "work") {
        const d = today();
        focus.log[d] = (focus.log[d] || 0) + focus.work;
        focus.sessions[d] = (focus.sessions[d] || 0) + 1;
        st.mode = focus.sessions[d] % 4 === 0 ? "long" : "short";
        toast("Focus round done. Take a break!");
      } else { st.mode = "work"; toast("Break's over. Ready for another round?"); }
      st.left = modeLen(st.mode);
      saveFocus(); beep();
    }
    if (drawFocus) drawFocus();
  }

  function focusPage() {
    const R = 120, C = 2 * Math.PI * R;
    view.innerHTML = `<div class="page school-page">
      <div class="page-head"><h1>Focus <span class="hl">timer</span></h1><p>Study in short rounds with breaks in between. Finished rounds count toward your daily goal and streak.</p></div>
      <div class="two focus-two">
        <section class="card focus-card">
          <div class="seg" id="f-modes">${Object.entries(MODES).map(([k, [n]]) => `<button data-m="${k}">${n}</button>`).join("")}</div>
          <div class="clock"><svg viewBox="0 0 280 280"><circle cx="140" cy="140" r="${R}" class="ring-track"/><circle cx="140" cy="140" r="${R}" class="ring-bar" id="f-ring" style="stroke-dasharray:${C}"/></svg>
            <div class="clock-txt"><b id="f-time">25:00</b><small id="f-label"></small></div></div>
          <div class="focus-actions"><button class="btn" id="f-go"></button><button class="btn ghost" id="f-reset">${svg("reload")} Reset</button></div>
        </section>
        <section class="card">
          <div class="card-head"><h3>${svg("flame")} Your progress</h3></div>
          <div class="focus-stats"><div><b id="f-today">0</b><small>minutes today</small></div><div><b id="f-rounds">0</b><small>rounds today</small></div><div><b id="f-streak">0</b><small>day streak</small></div></div>
          <div class="week" id="f-week"></div>
          <div class="card-head" style="margin-top:18px"><h3>${svg("gear")} Lengths (minutes)</h3></div>
          <div class="lens">${[["work", "Focus"], ["short", "Short break"], ["long", "Long break"], ["goal", "Daily goal"]].map(([k, n]) => `<label>${n}<input class="field" type="number" min="1" max="${k === "goal" ? 600 : 120}" data-len="${k}" value="${k === "goal" ? focus.goal || 60 : focus[k]}"></label>`).join("")}</div>
        </section>
      </div>
    </div>`;
    const ringEl = $("#f-ring"), go = $("#f-go");
    function week() {
      const t = today(), max = Math.max(focus.goal || 60, ...[0, 1, 2, 3, 4, 5, 6].map((i) => focus.log[addDays(t, -i)] || 0));
      $("#f-week").innerHTML = [6, 5, 4, 3, 2, 1, 0].map((i) => { const d = addDays(t, -i), v = focus.log[d] || 0; return `<div class="wk${i === 0 ? " now" : ""}" title="${Math.round(v)} min"><i style="height:${Math.max(4, (v / max) * 100)}%"></i><small>${DAYS[fromIso(d).getDay()][0]}</small></div>`; }).join("");
    }
    let lastMode = null, lastLog = -1;
    drawFocus = () => {
      const st = focus.state, left = timeLeft(), total = modeLen(st.mode), [name, col] = MODES[st.mode];
      $("#f-time").textContent = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`;
      $("#f-label").textContent = st.running ? name : left < total ? "Paused" : "Ready";
      ringEl.style.stroke = col; ringEl.style.strokeDashoffset = C * (1 - left / total);
      go.innerHTML = st.running ? "Pause" : left < total ? "Resume" : `${svg("play")} Start`;
      $(".focus-card").style.setProperty("--c", col);
      $(".focus-card").classList.toggle("running", st.running);
      if (st.mode !== lastMode) { lastMode = st.mode; $$("#f-modes button").forEach((b) => b.classList.toggle("on", b.dataset.m === st.mode)); }
      const d = today(), lg = focus.log[d] || 0;
      if (lg !== lastLog) { lastLog = lg; $("#f-today").textContent = Math.round(lg); $("#f-rounds").textContent = focus.sessions[d] || 0; $("#f-streak").textContent = streak(); week(); }
      if (st.running) document.title = `${$("#f-time").textContent} · ${name}`;
    };
    drawFocus();
    go.onclick = () => {
      const st = focus.state;
      if (st.running) { st.left = timeLeft(); st.running = false; }
      else { if (st.left <= 0) st.left = modeLen(st.mode); st.endAt = Date.now() + st.left * 1000; st.running = true; }
      saveFocus(); drawFocus();
    };
    $("#f-reset").onclick = () => { focus.state.running = false; focus.state.left = modeLen(focus.state.mode); saveFocus(); drawFocus(); };
    $("#f-modes").onclick = (e) => { const b = e.target.closest("[data-m]"); if (!b) return; focus.state = { mode: b.dataset.m, running: false, left: modeLen(b.dataset.m), endAt: 0 }; saveFocus(); drawFocus(); };
    $(".lens").addEventListener("change", (e) => {
      const k = e.target.dataset.len; if (!k) return;
      const v = Math.max(1, Math.min(k === "goal" ? 600 : 120, Math.round(+e.target.value || 1)));
      e.target.value = v; focus[k] = v;
      if (!focus.state.running && k === focus.state.mode) focus.state.left = modeLen(k);
      saveFocus(); lastLog = -1; drawFocus();
    });
    A.onLeave(() => { drawFocus = null; });
  }

  /* ------------------------------------------------------------------
     Calculator (own parser, no eval)
  ------------------------------------------------------------------ */
  function calculate(src, deg) {
    const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/\s+/g, "");
    let i = 0;
    const peek = () => s[i], eat = (c) => (s[i] === c ? (i++, true) : false);
    const toRad = (x) => (deg ? (x * Math.PI) / 180 : x), fromRad = (x) => (deg ? (x * 180) / Math.PI : x);
    const FN = { sin: (x) => Math.sin(toRad(x)), cos: (x) => Math.cos(toRad(x)), tan: (x) => Math.tan(toRad(x)), asin: (x) => fromRad(Math.asin(x)), acos: (x) => fromRad(Math.acos(x)), atan: (x) => fromRad(Math.atan(x)), sqrt: Math.sqrt, ln: Math.log, log: Math.log10, abs: Math.abs };
    function expr() { let v = term(); for (;;) { if (eat("+")) v += term(); else if (eat("-")) v -= term(); else return v; } }
    function term() { let v = unary(); for (;;) { if (eat("*")) v *= unary(); else if (eat("/")) v /= unary(); else if (peek() === "(" || /[a-z]/.test(peek() || "")) v *= unary(); else return v; } }
    function unary() { if (eat("-")) return -unary(); if (eat("+")) return unary(); return power(); }
    function power() { let b = postfix(); if (eat("^")) return Math.pow(b, unary()); return b; }
    function postfix() {
      let v = atom();
      for (;;) {
        if (eat("!")) { if (v < 0 || v > 170 || v % 1) throw 0; let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f; }
        else if (eat("%")) v /= 100; else return v;
      }
    }
    function atom() {
      if (eat("(")) { const v = expr(); eat(")"); return v; }
      const m = /^[a-z]+/.exec(s.slice(i));
      if (m) {
        i += m[0].length;
        if (m[0] === "pi") return Math.PI;
        if (m[0] === "e") return Math.E;
        if (FN[m[0]]) { const had = eat("("); const v = had ? expr() : unary(); if (had) eat(")"); return FN[m[0]](v); }
        throw 0;
      }
      const n = /^\d*\.?\d+(e[+-]?\d+)?/.exec(s.slice(i));
      if (!n) throw 0;
      i += n[0].length; return parseFloat(n[0]);
    }
    const v = expr();
    if (i < s.length || !isFinite(v)) throw 0;
    return v;
  }
  const fmt = (v) => { const r = +v.toPrecision(12); return Math.abs(r) >= 1e12 || (r !== 0 && Math.abs(r) < 1e-7) ? r.toExponential(6).replace(/\.?0+e/, "e") : String(r); };

  function calcPage() {
    let hist = S.get("calcHist", []), deg = S.get("calcDeg", true), cur = S.get("calcCur", "");
    const KEYS = [
      ["sin(", "sin", "fn"], ["cos(", "cos", "fn"], ["tan(", "tan", "fn"], ["DEG", "", "mode"], ["AC", "", "clear"],
      ["√(", "√", "fn"], ["^", "xʸ", "fn"], ["(", "(", "fn"], [")", ")", "fn"], ["DEL", "⌫", "clear"],
      ["ln(", "ln", "fn"], ["7", "7"], ["8", "8"], ["9", "9"], ["÷", "÷", "op"],
      ["log(", "log", "fn"], ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×", "op"],
      ["π", "π", "fn"], ["1", "1"], ["2", "2"], ["3", "3"], ["−", "−", "op"],
      ["!", "n!", "fn"], ["0", "0"], [".", "."], ["=", "=", "equals"], ["+", "+", "op"],
    ];
    view.innerHTML = `<div class="page school-page">
      <div class="page-head"><h1><span class="hl">Calculator</span></h1><p>Type with your keyboard or tap the keys. Your history is kept.</p></div>
      <div class="two calc-two">
        <section class="card calc">
          <div class="calc-screen"><input id="k-in" class="calc-in" inputmode="decimal" spellcheck="false" autocomplete="off" aria-label="Expression" value="${esc(cur)}"><div class="calc-out" id="k-out" aria-live="polite"></div></div>
          <div class="keys">${KEYS.map(([v, l, c]) => `<button data-k="${esc(v)}" class="${c || ""}">${v === "DEG" ? "" : l || v}</button>`).join("")}</div>
        </section>
        <section class="card"><div class="card-head"><h3>${svg("clock")} History</h3><button class="linkish" id="k-clear">Clear</button></div><div class="calc-hist" id="k-hist"></div></section>
      </div>
    </div>`;
    const inp = $("#k-in"), out = $("#k-out"), modeBtn = $('[data-k="DEG"]');
    const preview = () => {
      S.set("calcCur", inp.value);
      if (!inp.value.trim()) { out.textContent = ""; return; }
      try { out.textContent = "= " + fmt(calculate(inp.value.toLowerCase(), deg)); out.classList.remove("bad"); } catch { out.textContent = ""; }
    };
    const drawHist = () => { $("#k-hist").innerHTML = hist.length ? hist.map((h, i) => `<button data-h="${i}"><small>${esc(h.q)}</small><b>${esc(h.a)}</b></button>`).join("") : `<div class="day-empty"><span>${svg("calc")}</span>Your answers will show up here.</div>`; };
    const setMode = () => { modeBtn.textContent = deg ? "DEG" : "RAD"; };
    function equals() {
      if (!inp.value.trim()) return;
      try {
        const a = fmt(calculate(inp.value.toLowerCase(), deg));
        hist.unshift({ q: inp.value, a }); hist = hist.slice(0, 40); S.set("calcHist", hist);
        inp.value = a; out.textContent = ""; drawHist(); S.set("calcCur", a);
        const s = $(".calc-screen"); s.classList.remove("flash"); void s.offsetWidth; s.classList.add("flash");
      } catch { out.textContent = "Check the expression"; out.classList.add("bad"); }
    }
    $(".keys").onclick = (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return;
      const k = b.dataset.k;
      if (k === "=") equals();
      else if (k === "AC") { inp.value = ""; preview(); }
      else if (k === "DEL") { inp.value = inp.value.slice(0, -1); preview(); }
      else if (k === "DEG") { deg = !deg; S.set("calcDeg", deg); setMode(); preview(); }
      else { inp.value += k; preview(); }
      if (matchMedia("(pointer: fine)").matches) inp.focus();
    };
    inp.addEventListener("input", preview);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); equals(); } });
    $("#k-hist").onclick = (e) => { const b = e.target.closest("[data-h]"); if (!b) return; inp.value += hist[+b.dataset.h].a; preview(); inp.focus(); };
    $("#k-clear").onclick = () => { hist = []; S.set("calcHist", hist); drawHist(); };
    setMode(); drawHist(); preview();
    if (matchMedia("(pointer: fine)").matches) inp.focus();
  }

  /* ------------------------------------------------------------------
     Unit converter
  ------------------------------------------------------------------ */
  const UNITS = {
    Length: { Millimeter: 0.001, Centimeter: 0.01, Meter: 1, Kilometer: 1000, Inch: 0.0254, Foot: 0.3048, Yard: 0.9144, Mile: 1609.344 },
    Mass: { Milligram: 1e-6, Gram: 0.001, Kilogram: 1, "Metric ton": 1000, Ounce: 0.028349523125, Pound: 0.45359237 },
    Temperature: { Celsius: "C", Fahrenheit: "F", Kelvin: "K" },
    Volume: { Milliliter: 0.001, Liter: 1, "Cubic meter": 1000, Teaspoon: 0.00492892, Tablespoon: 0.0147868, Cup: 0.236588, Pint: 0.473176, Quart: 0.946353, Gallon: 3.78541 },
    Area: { "Square centimeter": 1e-4, "Square meter": 1, Hectare: 1e4, "Square kilometer": 1e6, "Square foot": 0.09290304, Acre: 4046.8564224, "Square mile": 2589988.110336 },
    Speed: { "Meters per second": 1, "Kilometers per hour": 1 / 3.6, "Miles per hour": 0.44704, Knot: 0.514444 },
    Time: { Second: 1, Minute: 60, Hour: 3600, Day: 86400, Week: 604800, Year: 31557600 },
    Data: { Bit: 0.125, Byte: 1, Kilobyte: 1e3, Megabyte: 1e6, Gigabyte: 1e9, Terabyte: 1e12 },
    Energy: { Joule: 1, Kilojoule: 1000, Calorie: 4.184, Kilocalorie: 4184, "Watt hour": 3600, "Kilowatt hour": 3.6e6 },
  };
  function convert(cat, v, from, to) {
    if (cat === "Temperature") {
      const k = from === "Celsius" ? v + 273.15 : from === "Fahrenheit" ? ((v - 32) * 5) / 9 + 273.15 : v;
      return to === "Celsius" ? k - 273.15 : to === "Fahrenheit" ? ((k - 273.15) * 9) / 5 + 32 : k;
    }
    return (v * UNITS[cat][from]) / UNITS[cat][to];
  }
  function convertPage() {
    let st = Object.assign({ cat: "Length", from: "Meter", to: "Foot", v: "1" }, S.get("conv", {}));
    if (!UNITS[st.cat]) st = { cat: "Length", from: "Meter", to: "Foot", v: "1" };
    view.innerHTML = `<div class="page school-page">
      <div class="page-head"><h1>Unit <span class="hl">converter</span></h1><p>Pick a type, type a number, get the answer in every unit.</p></div>
      <div class="seg wrap" id="u-cats">${Object.keys(UNITS).map((c) => `<button data-c="${c}">${c}</button>`).join("")}</div>
      <section class="card conv">
        <label>From<input class="field big" id="u-v" inputmode="decimal" value="${esc(st.v)}"><select class="field" id="u-from"></select></label>
        <button class="icon-btn swap" id="u-swap" aria-label="Swap units">${svg("reload")}</button>
        <label>To<output class="field big" id="u-out"></output><select class="field" id="u-to"></select></label>
      </section>
      <div class="conv-all" id="u-all"></div>
    </div>`;
    const from = $("#u-from"), to = $("#u-to"), v = $("#u-v");
    const num = (x) => { if (!isFinite(x)) return "–"; const a = Math.abs(x); return a !== 0 && (a >= 1e9 || a < 1e-4) ? x.toExponential(4) : String(+x.toPrecision(8)); };
    function fill() {
      const names = Object.keys(UNITS[st.cat]);
      if (!names.includes(st.from)) st.from = names[0];
      if (!names.includes(st.to)) st.to = names[1];
      const opts = names.map((n) => `<option>${n}</option>`).join("");
      from.innerHTML = opts; to.innerHTML = opts; from.value = st.from; to.value = st.to;
      $$("#u-cats button").forEach((b) => b.classList.toggle("on", b.dataset.c === st.cat));
      calc();
    }
    function calc() {
      st.v = v.value; S.set("conv", st);
      const x = parseFloat(v.value);
      $("#u-out").textContent = isNaN(x) ? "–" : num(convert(st.cat, x, st.from, st.to));
      $("#u-all").innerHTML = isNaN(x) ? "" : Object.keys(UNITS[st.cat]).filter((n) => n !== st.from).map((n, i) => `<div class="conv-chip" style="--i:${i}"><b>${num(convert(st.cat, x, st.from, n))}</b><small>${n}</small></div>`).join("");
    }
    $("#u-cats").onclick = (e) => { const b = e.target.closest("[data-c]"); if (!b) return; st.cat = b.dataset.c; st.from = st.to = ""; fill(); };
    from.onchange = () => { st.from = from.value; calc(); };
    to.onchange = () => { st.to = to.value; calc(); };
    v.oninput = calc;
    $("#u-swap").onclick = () => { [st.from, st.to] = [st.to, st.from]; from.value = st.from; to.value = st.to; calc(); };
    fill();
  }

  /* ------------------------------------------------------------------
     Periodic table
  ------------------------------------------------------------------ */
  const EL = "H,Hydrogen,1.008,n;He,Helium,4.0026,g;Li,Lithium,6.94,a;Be,Beryllium,9.0122,e;B,Boron,10.81,m;C,Carbon,12.011,n;N,Nitrogen,14.007,n;O,Oxygen,15.999,n;F,Fluorine,18.998,h;Ne,Neon,20.180,g;Na,Sodium,22.990,a;Mg,Magnesium,24.305,e;Al,Aluminium,26.982,p;Si,Silicon,28.085,m;P,Phosphorus,30.974,n;S,Sulfur,32.06,n;Cl,Chlorine,35.45,h;Ar,Argon,39.948,g;K,Potassium,39.098,a;Ca,Calcium,40.078,e;Sc,Scandium,44.956,t;Ti,Titanium,47.867,t;V,Vanadium,50.942,t;Cr,Chromium,51.996,t;Mn,Manganese,54.938,t;Fe,Iron,55.845,t;Co,Cobalt,58.933,t;Ni,Nickel,58.693,t;Cu,Copper,63.546,t;Zn,Zinc,65.38,t;Ga,Gallium,69.723,p;Ge,Germanium,72.630,m;As,Arsenic,74.922,m;Se,Selenium,78.971,n;Br,Bromine,79.904,h;Kr,Krypton,83.798,g;Rb,Rubidium,85.468,a;Sr,Strontium,87.62,e;Y,Yttrium,88.906,t;Zr,Zirconium,91.224,t;Nb,Niobium,92.906,t;Mo,Molybdenum,95.95,t;Tc,Technetium,(98),t;Ru,Ruthenium,101.07,t;Rh,Rhodium,102.91,t;Pd,Palladium,106.42,t;Ag,Silver,107.87,t;Cd,Cadmium,112.41,t;In,Indium,114.82,p;Sn,Tin,118.71,p;Sb,Antimony,121.76,m;Te,Tellurium,127.60,m;I,Iodine,126.90,h;Xe,Xenon,131.29,g;Cs,Caesium,132.91,a;Ba,Barium,137.33,e;La,Lanthanum,138.91,l;Ce,Cerium,140.12,l;Pr,Praseodymium,140.91,l;Nd,Neodymium,144.24,l;Pm,Promethium,(145),l;Sm,Samarium,150.36,l;Eu,Europium,151.96,l;Gd,Gadolinium,157.25,l;Tb,Terbium,158.93,l;Dy,Dysprosium,162.50,l;Ho,Holmium,164.93,l;Er,Erbium,167.26,l;Tm,Thulium,168.93,l;Yb,Ytterbium,173.05,l;Lu,Lutetium,174.97,l;Hf,Hafnium,178.49,t;Ta,Tantalum,180.95,t;W,Tungsten,183.84,t;Re,Rhenium,186.21,t;Os,Osmium,190.23,t;Ir,Iridium,192.22,t;Pt,Platinum,195.08,t;Au,Gold,196.97,t;Hg,Mercury,200.59,t;Tl,Thallium,204.38,p;Pb,Lead,207.2,p;Bi,Bismuth,208.98,p;Po,Polonium,(209),p;At,Astatine,(210),h;Rn,Radon,(222),g;Fr,Francium,(223),a;Ra,Radium,(226),e;Ac,Actinium,(227),c;Th,Thorium,232.04,c;Pa,Protactinium,231.04,c;U,Uranium,238.03,c;Np,Neptunium,(237),c;Pu,Plutonium,(244),c;Am,Americium,(243),c;Cm,Curium,(247),c;Bk,Berkelium,(247),c;Cf,Californium,(251),c;Es,Einsteinium,(252),c;Fm,Fermium,(257),c;Md,Mendelevium,(258),c;No,Nobelium,(259),c;Lr,Lawrencium,(266),c;Rf,Rutherfordium,(267),t;Db,Dubnium,(268),t;Sg,Seaborgium,(269),t;Bh,Bohrium,(270),t;Hs,Hassium,(277),t;Mt,Meitnerium,(278),u;Ds,Darmstadtium,(281),u;Rg,Roentgenium,(282),u;Cn,Copernicium,(285),t;Nh,Nihonium,(286),u;Fl,Flerovium,(289),u;Mc,Moscovium,(290),u;Lv,Livermorium,(293),u;Ts,Tennessine,(294),u;Og,Oganesson,(294),u"
    .split(";").map((r, i) => { const [sym, name, mass, cat] = r.split(","); return { z: i + 1, sym, name, mass, cat }; });
  const CATS = { n: ["Nonmetal", "#16a34a"], g: ["Noble gas", "#9333ea"], a: ["Alkali metal", "#ef4444"], e: ["Alkaline earth metal", "#f97316"], m: ["Metalloid", "#0d9488"], h: ["Halogen", "#0ea5e9"], t: ["Transition metal", "#2563eb"], p: ["Post-transition metal", "#64748b"], l: ["Lanthanide", "#ec4899"], c: ["Actinide", "#d97706"], u: ["Unknown properties", "#94a3b8"] };
  function elPos(z) {
    if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
    if (z <= 4) return [2, z - 2]; if (z <= 10) return [2, z + 8];
    if (z <= 12) return [3, z - 10]; if (z <= 18) return [3, z];
    if (z <= 36) return [4, z - 18]; if (z <= 54) return [5, z - 36];
    if (z <= 56) return [6, z - 54]; if (z <= 71) return [9, z - 54];
    if (z <= 86) return [6, z - 68]; if (z <= 88) return [7, z - 86];
    if (z <= 103) return [10, z - 86]; return [7, z - 100];
  }
  function shells(z) {
    // Simple 2, 8, 18, 32 filling by period: good enough for a study aid's row and group info.
    const [p] = elPos(z); return p > 8 ? p - 3 : p;
  }
  function elementsPage() {
    view.innerHTML = `<div class="page school-page">
      <div class="page-head"><h1>Periodic <span class="hl">table</span></h1><p>Tap an element for its details, or search by name, symbol or number.</p></div>
      <div class="pt-top"><label class="searchbox">${svg("search")}<input class="field" id="e-q" placeholder="Search 118 elements…" autocomplete="off"></label>
        <div class="pt-card card" id="e-card"></div></div>
      <div class="pt-scroll"><div class="pt" id="e-grid">
        ${EL.map((e) => { const [r, c] = elPos(e.z); return `<button class="el" data-z="${e.z}" style="grid-row:${r};grid-column:${c};--c:${CATS[e.cat][1]};--i:${e.z}" aria-label="${e.name}"><small>${e.z}</small><b>${e.sym}</b><span>${e.name}</span></button>`; }).join("")}
        <span class="el ph" style="grid-row:6;grid-column:3">57–71</span><span class="el ph" style="grid-row:7;grid-column:3">89–103</span>
      </div></div>
      <div class="pt-legend" id="e-legend">${Object.entries(CATS).map(([k, [n, c]]) => `<button data-cat="${k}" style="--c:${c}"><i></i>${n}</button>`).join("")}</div>
    </div>`;
    const grid = $("#e-grid"), card = $("#e-card");
    let catFilter = "";
    function show(z) {
      const e = EL[z - 1], [r, c] = elPos(z), [cn, col] = CATS[e.cat];
      $$(".el.on", grid).forEach((x) => x.classList.remove("on"));
      const b = $(`.el[data-z="${z}"]`, grid); b && b.classList.add("on");
      card.style.setProperty("--c", col);
      card.innerHTML = `<div class="pt-big"><small>${e.z}</small><b>${e.sym}</b></div>
        <div><h3>${e.name}</h3><p class="muted">${cn}</p>
        <dl><div><dt>Atomic number</dt><dd>${e.z}</dd></div><div><dt>Atomic mass</dt><dd>${e.mass} u</dd></div><div><dt>Period</dt><dd>${shells(z)}</dd></div><div><dt>Group</dt><dd>${r > 8 ? "f-block" : c}</dd></div></dl></div>`;
      S.set("element", z);
    }
    function filter() {
      const q = $("#e-q").value.trim().toLowerCase();
      let first = null;
      $$(".el[data-z]", grid).forEach((b) => {
        const e = EL[b.dataset.z - 1];
        const hit = (!q || e.name.toLowerCase().includes(q) || e.sym.toLowerCase() === q || String(e.z) === q) && (!catFilter || e.cat === catFilter);
        b.classList.toggle("dim", !hit);
        if (hit && !first) first = e.z;
      });
      if (q && first) show(first);
    }
    grid.onclick = (e) => { const b = e.target.closest("[data-z]"); if (b) show(+b.dataset.z); };
    $("#e-q").oninput = filter;
    $("#e-legend").onclick = (e) => { const b = e.target.closest("[data-cat]"); if (!b) return; catFilter = catFilter === b.dataset.cat ? "" : b.dataset.cat; $$("#e-legend button").forEach((x) => x.classList.toggle("on", x.dataset.cat === catFilter)); filter(); };
    show(S.get("element", 1));
  }

  /* ------------------------------------------------------------------
     Settings
  ------------------------------------------------------------------ */
  function settingsPage() {
    const st = A.store;
    view.innerHTML = `<div class="page school-page">
      <div class="page-head"><h1><span class="hl">Settings</span></h1><p>Make this desk yours. Everything is saved in this browser only, so each person on each device gets their own.</p></div>
      <div class="cards">
        <div class="card"><h3>${svg("pencil")} About you</h3><p>Used for the greeting on your dashboard.</p>
          <input class="field" id="s-name" maxlength="24" placeholder="Your first name" value="${esc(profile.name)}" aria-label="Your name">
          <p style="margin:16px 0 8px">Accent color</p>${colorDots("accent", profile.accent)}</div>
        <div class="card"><h3>${svg("gear")} Interface</h3><p>Layout and motion.</p>
          <label class="toggle"><span>Floating doodles in the background</span><span class="switch"><input type="checkbox" id="s-bg" ${st.get("bg", true) ? "checked" : ""}><span></span></span></label>
          <label class="toggle"><span>Reduce motion</span><span class="switch"><input type="checkbox" id="s-calm" ${st.get("calm", false) ? "checked" : ""}><span></span></span></label>
          <label class="toggle"><span>Compact sidebar</span><span class="switch"><input type="checkbox" id="s-col" ${document.body.classList.contains("collapsed") ? "checked" : ""}><span></span></span></label>
          <label class="toggle"><span>Week starts on Monday</span><span class="switch"><input type="checkbox" id="s-mon" ${profile.weekStart ? "checked" : ""}><span></span></span></label></div>
        ${A.proxyEnabled ? `<div class="card"><h3>${svg("globe")} Proxy search engine</h3><p>Used when you type words instead of a web address in the proxy.</p>
          <select class="field" id="s-engine">${Object.entries({ duckduckgo: "DuckDuckGo", brave: "Brave Search", google: "Google", bing: "Bing" }).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div>` : ""}
        <div class="card"><h3>${svg("download")} Back up your data</h3><p>Download your calendar, assignments, notes and focus history as a file, or load a backup on another device.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="s-export">${svg("download")} Download backup</button><button class="btn sm ghost" id="s-import">Load a backup</button><input type="file" id="s-file" accept="application/json,.json" hidden></div></div>
        <div class="card"><h3>${svg("shield")} Start over</h3><p>Erase the calendar, assignments, notes and focus history saved in this browser.</p>
          <button class="btn sm ghost danger" id="s-clear">${svg("trash")} Erase my study data</button></div>
      </div>
    </div>`;
    $("#s-name").oninput = (e) => { profile.name = e.target.value.trim(); saveProfile(); };
    $(".dots").onchange = (e) => { profile.accent = e.target.value; saveProfile(); };
    $("#s-bg").onchange = (e) => { st.set("bg", e.target.checked); window.NebulaBG.setEnabled(e.target.checked); };
    $("#s-calm").onchange = (e) => { st.set("calm", e.target.checked); document.body.classList.toggle("calm", e.target.checked); };
    $("#s-col").onchange = (e) => A.setCollapsed(e.target.checked);
    $("#s-mon").onchange = (e) => { profile.weekStart = e.target.checked ? 1 : 0; saveProfile(); };
    const eng = $("#s-engine");
    if (eng) { eng.value = st.get("engine", "duckduckgo"); eng.onchange = () => { st.set("engine", eng.value); toast("Search engine saved"); }; }
    $("#s-export").onclick = () => {
      const data = { app: "sciencetube-study", version: 1, saved: new Date().toISOString(), profile, events, tasks, notes, focus };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      a.download = `study-backup-${today()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $("#s-import").onclick = () => $("#s-file").click();
    $("#s-file").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (d.app !== "sciencetube-study") throw 0;
        if (!confirm("Replace what's saved in this browser with the backup?")) return;
        ["profile", "events", "tasks", "notes", "focus"].forEach((k) => { if (d[k]) S.set(k, d[k]); });
        location.reload();
      } catch { toast("That file isn't a study backup."); }
    };
    $("#s-clear").onclick = () => {
      if (!confirm("Erase your calendar, assignments, notes and focus history from this browser? This can't be undone.")) return;
      Object.keys(localStorage).filter((k) => k.startsWith("school.")).forEach((k) => localStorage.removeItem(k));
      location.reload();
    };
  }

  /* ------------------------------------------------------------------
     Background: slow floating classroom doodles. Stands in for the games
     site's star field, so it answers to the same NebulaBG interface.
  ------------------------------------------------------------------ */
  (function background() {
    const canvas = document.getElementById("bg");
    const noop = () => {};
    if (!canvas) { window.NebulaBG = { setEnabled: noop, setPaused: noop, refresh: noop, setHold: noop }; return; }
    const ctx = canvas.getContext("2d");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, enabled = true, paused = false, bits = [];
    const SHAPES = ["plus", "ring", "tri", "squiggle", "square", "x", "dot"];
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(38, (w * h) / 42000));
      bits = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h, s: 9 + Math.random() * 15, r: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.004, vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.12,
        c: COLORS[i % COLORS.length][1], k: SHAPES[i % SHAPES.length], p: Math.random() * 6.28,
      }));
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const b of bits) {
        ctx.save();
        ctx.translate(b.x + Math.sin(t / 2400 + b.p) * 10, b.y);
        ctx.rotate(b.r);
        ctx.globalAlpha = 0.2; ctx.strokeStyle = ctx.fillStyle = b.c;
        const s = b.s;
        ctx.beginPath();
        if (b.k === "plus") { ctx.moveTo(-s / 2, 0); ctx.lineTo(s / 2, 0); ctx.moveTo(0, -s / 2); ctx.lineTo(0, s / 2); ctx.stroke(); }
        else if (b.k === "x") { ctx.moveTo(-s / 2.4, -s / 2.4); ctx.lineTo(s / 2.4, s / 2.4); ctx.moveTo(s / 2.4, -s / 2.4); ctx.lineTo(-s / 2.4, s / 2.4); ctx.stroke(); }
        else if (b.k === "ring") { ctx.arc(0, 0, s / 2, 0, 6.29); ctx.stroke(); }
        else if (b.k === "dot") { ctx.arc(0, 0, s / 4, 0, 6.29); ctx.fill(); }
        else if (b.k === "tri") { ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2.4); ctx.lineTo(-s / 2, s / 2.4); ctx.closePath(); ctx.stroke(); }
        else if (b.k === "square") { ctx.rect(-s / 2.4, -s / 2.4, s / 1.2, s / 1.2); ctx.stroke(); }
        else { ctx.moveTo(-s, 0); ctx.bezierCurveTo(-s / 2, -s / 1.5, -s / 2, s / 1.5, 0, 0); ctx.bezierCurveTo(s / 2, -s / 1.5, s / 2, s / 1.5, s, 0); ctx.stroke(); }
        ctx.restore();
      }
    }
    function frame(t) {
      for (const b of bits) {
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        if (b.y < -30) { b.y = h + 30; b.x = Math.random() * w; }
        if (b.x < -30) b.x = w + 30; else if (b.x > w + 30) b.x = -30;
      }
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      cancelAnimationFrame(raf); raf = 0;
      canvas.style.opacity = enabled ? "1" : "0";
      if (enabled && !paused && !reduced && !document.hidden && !document.body.classList.contains("calm")) raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    window.NebulaBG = {
      setEnabled(v) { enabled = v; sync(); }, setPaused(v) { paused = v; sync(); },
      refresh: noop, setHold: noop,
    };
    resize(); sync();
  })();

  window.STSchool = { sections, install };
})();
