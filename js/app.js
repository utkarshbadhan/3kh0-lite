// ScienceTube — single-page app: sidebar, router, games, proxy, tools, settings.
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Icons
  ------------------------------------------------------------------ */
  const I = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    games: '<rect x="2" y="7" width="20" height="12" rx="5"/><path d="M7 11v4M5 13h4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="14" r="1"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    fwd: '<path d="M9 18l6-6-6-6"/>',
    reload: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    full: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    ext: '<path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
    sparkle: '<path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[name] || ""}</svg>`;

  /* ------------------------------------------------------------------
     Sections — add a new sidebar entry here and give it a render
     function in VIEWS below. Entries marked `soon` show a teaser page.
  ------------------------------------------------------------------ */
  // The web proxy needs the Node server (server.js). Set this to true once the
  // site is hosted somewhere that runs it; until then it shows as "Coming soon".
  const PROXY_ENABLED = false;

  const SECTIONS = [
    { group: "Play" },
    { id: "home", label: "Home", icon: "home", blurb: "Your dashboard" },
    { id: "games", label: "All games", icon: "games", blurb: "Browse the full library", glow: "var(--a1)" },
    { id: "favorites", label: "Favorites", icon: "heart", blurb: "Games you've hearted", glow: "var(--a2)" },
    { id: "recent", label: "Recently played", icon: "clock", blurb: "Jump back in", glow: "var(--a3)" },
    { group: "Explore" },
    { id: "proxy", label: "Web proxy", icon: "globe", soon: !PROXY_ENABLED, badge: "NEW", live: true, blurb: "Browse any site privately", glow: "#22c55e" },
    { id: "apps", label: "Apps", icon: "apps", badge: "NEW", blurb: "Calculator, notes, paint and more", glow: "#38bdf8" },
    { id: "chat", label: "Chat", icon: "chat", badge: "NEW", blurb: "Talk with friends", glow: "#f472b6" },
    { id: "tools", label: "Tools", icon: "tools", blurb: "Tab disguise, about:blank, panic key", glow: "#f59e0b" },
    { id: "settings", label: "Settings", icon: "gear", blurb: "Themes and effects", glow: "#94a3b8" },
    { group: "Coming soon" },
    { id: "movies", label: "Movies & TV", icon: "film", soon: true, blurb: "Watch together, ad-free" },
    { id: "music", label: "Music", icon: "music", soon: true, blurb: "Stream while you play" },
  ];
  const NAV = SECTIONS.filter((s) => s.id);
  const JUMP = NAV.filter((s) => !s.soon); // number keys 1..9

  /* ------------------------------------------------------------------
     Storage
  ------------------------------------------------------------------ */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("nebula." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("nebula." + k, JSON.stringify(v)); } catch {} },
  };
  let favs = new Set(store.get("favs", []));
  let recent = store.get("recent", []);
  let plays = store.get("plays", {});

  /* ------------------------------------------------------------------
     Helpers
  ------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  const view = $("#view");
  let cleanup = [];

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function countUp(el, to) {
    const start = performance.now(), dur = 900;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function openBlank(url) {
    const win = window.open("about:blank", "_blank");
    if (!win) return toast("Pop-up blocked. Allow pop-ups for this site.");
    const d = win.document;
    d.title = localStorage.getItem("title") || "Google Docs";
    const icon = localStorage.getItem("icon") || "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico";
    d.head.innerHTML = `<link rel="icon" href="${esc(icon)}">`;
    d.body.style.cssText = "margin:0;height:100vh;overflow:hidden;background:#000";
    const f = d.createElement("iframe");
    f.style.cssText = "border:0;width:100%;height:100%";
    f.allow = "fullscreen; autoplay; gamepad";
    f.referrerPolicy = "no-referrer";
    f.src = url;
    d.body.appendChild(f);
  }

  /* ------------------------------------------------------------------
     Games data
  ------------------------------------------------------------------ */
  let games = [];
  const bySlug = new Map();
  const slugOf = (g) => g.link.split("/")[1];

  const gamesReady = fetch("/config/games.json")
    .then((r) => r.json())
    .then((list) => {
      games = list.map((g) => ({ ...g, slug: slugOf(g), link: "/" + g.link, imgSrc: "/" + g.imgSrc }));
      games.forEach((g) => bySlug.set(g.slug, g));
      favs = new Set([...favs].filter((s) => bySlug.has(s)));
      recent = recent.filter((s) => bySlug.has(s));
      updateStats();
      return games;
    })
    .catch((e) => { console.error(e); toast("Could not load the game list."); return []; });

  function updateStats() {
    $("#stat-games").textContent = games.length;
    $("#stat-favs").textContent = favs.size;
    const b = $('.nav-item[data-id="games"] .badge');
    if (b) b.textContent = games.length;
    const f = $('.nav-item[data-id="favorites"] .badge');
    if (f) { f.textContent = favs.size; f.style.display = favs.size ? "" : "none"; }
  }

  function toggleFav(slug, btn) {
    if (favs.has(slug)) favs.delete(slug); else favs.add(slug);
    store.set("favs", [...favs]);
    updateStats();
    const on = favs.has(slug);
    $$(`[data-fav="${CSS.escape(slug)}"]`).forEach((b) => {
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
    });
    if (btn) { btn.classList.remove("burst"); void btn.offsetWidth; btn.classList.add("burst"); }
    toast(on ? "Added to favorites" : "Removed from favorites");
  }

  function card(g, i = 0) {
    const on = favs.has(g.slug);
    return `<a class="game" href="#/play/${encodeURIComponent(g.slug)}" style="--i:${Math.min(i, 40)}" data-slug="${esc(g.slug)}">
      <div class="thumb"><img loading="lazy" decoding="async" src="${esc(g.imgSrc)}" alt="" onerror="this.style.opacity=0"></div>
      <div class="glare"></div>
      <button class="fav${on ? " on" : ""}" data-fav="${esc(g.slug)}" aria-pressed="${on}" aria-label="Favorite ${esc(g.title)}">${svg("heart")}</button>
      <div class="meta"><b>${esc(g.title)}</b><small>${svg("play")} Play now${plays[g.slug] ? ` · ${plays[g.slug]}×` : ""}</small></div>
    </a>`;
  }

  // Delegated handlers for every card on the page.
  view.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) { e.preventDefault(); e.stopPropagation(); toggleFav(fav.dataset.fav, fav); }
  });
  view.addEventListener("pointermove", (e) => {
    const c = e.target.closest(".game");
    if (!c || e.pointerType !== "mouse") return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty("--ry", (x - 0.5) * 14 + "deg");
    c.style.setProperty("--rx", (0.5 - y) * 14 + "deg");
    c.style.setProperty("--mx", x * 100 + "%");
    c.style.setProperty("--my", y * 100 + "%");
  });
  view.addEventListener("pointerout", (e) => {
    const c = e.target.closest(".game");
    if (c && !c.contains(e.relatedTarget)) { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
  });

  /* ------------------------------------------------------------------
     Sidebar
  ------------------------------------------------------------------ */
  function buildNav() {
    let n = 0;
    $("#nav").innerHTML = SECTIONS.map((s) => {
      if (s.group) return `<div class="nav-group">${esc(s.group)}</div>`;
      const idx = s.soon ? -1 : n++;
      const key = idx >= 0 && idx < 9 ? `<kbd class="key">${idx + 1}</kbd>` : "";
      let badge = "";
      if (s.id === "games") badge = `<span class="badge">0</span>`;
      else if (s.id === "favorites") badge = `<span class="badge" style="display:none">0</span>`;
      else if (s.soon) badge = `<span class="badge">SOON</span>`;
      else if (s.badge) badge = `<span class="badge${s.live ? " live" : ""}">${esc(s.badge)}</span>`;
      return `<a class="nav-item${s.soon ? " soon" : ""}" href="#/${s.id}" data-id="${s.id}" data-tip="${esc(s.label)}">
        <span class="ico">${svg(s.icon)}</span><span class="txt">${esc(s.label)}</span>${badge}${key}</a>`;
    }).join("");
  }

  function setActiveNav(id) {
    $$(".nav-item").forEach((a) => a.classList.toggle("active", a.dataset.id === id));
  }

  function setCollapsed(v) {
    document.body.classList.toggle("collapsed", v);
    store.set("collapsed", v);
  }

  /* ------------------------------------------------------------------
     Views
  ------------------------------------------------------------------ */
  const VIEWS = {};

  VIEWS.home = async () => {
    await gamesReady;
    const words = ["anything.", "together.", "instantly.", "anywhere."];
    const totalPlays = Object.values(plays).reduce((a, b) => a + b, 0);
    view.innerHTML = `<div class="page">
      <section class="hero">
        <div>
          <span class="hero-kicker"><i></i> ${games.length} games hosted right here · no installs</span>
          <h1>Play <span class="swap" id="swap"><span>${words[0]}</span></span><br>Browse freely.</h1>
          <p>A whole arcade that loads instantly in your browser, ${PROXY_ENABLED ? "plus a built-in web proxy to reach the rest of the internet privately." : "with no installs, no downloads and no waiting."}</p>
          <div class="hero-actions">
            <a class="btn" href="#/games">${svg("games")} Start playing</a>
            ${PROXY_ENABLED ? `<a class="btn ghost" href="#/proxy">${svg("globe")} Open the proxy</a>` : `<button class="btn ghost" onclick="document.getElementById('random-btn').click()">${svg("dice")} Surprise me</button>`}
          </div>
          <div class="hero-stats">
            <div><b data-count="${games.length}">0</b><small>games</small></div>
            <div><b data-count="${favs.size}">0</b><small>favorites</small></div>
            <div><b data-count="${totalPlays}">0</b><small>sessions played</small></div>
          </div>
        </div>
        <div class="spotlight" id="spotlight"><div class="spot-orbit"></div></div>
      </section>

      <div class="section-title"><h2>Jump to</h2></div>
      <div class="quick">${NAV.filter((s) => s.id !== "home").map((s) => `
        <a href="#/${s.id}" style="--glow:${s.glow || "var(--a1)"}">
          <span class="ico">${svg(s.icon)}</span><b>${esc(s.label)}</b><small>${esc(s.blurb)}</small>
          ${s.soon ? '<span class="soon-tag">Soon</span>' : ""}
        </a>`).join("")}
      </div>

      ${recent.length ? `<div class="section-title"><h2>Continue playing</h2><a class="more" href="#/recent">See all</a></div>
        <div class="rail">${recent.slice(0, 12).map((s, i) => card(bySlug.get(s), i)).join("")}</div>` : ""}

      ${favs.size ? `<div class="section-title"><h2>Your favorites</h2><a class="more" href="#/favorites">See all</a></div>
        <div class="rail">${[...favs].slice(0, 12).map((s, i) => card(bySlug.get(s), i)).join("")}</div>` : ""}

      <div class="section-title"><h2>Fresh picks</h2><a class="more" href="#/games">Browse all ${games.length}</a></div>
      <div class="rail">${shuffle(games).slice(0, 14).map(card).join("")}</div>
    </div>`;

    $$("[data-count]", view).forEach((el) => countUp(el, +el.dataset.count));

    // Rotating headline word
    let wi = 0;
    const swap = $("#swap");
    const t1 = setInterval(() => { wi = (wi + 1) % words.length; swap.innerHTML = `<span>${words[wi]}</span>`; }, 2600);

    // Spotlight carousel
    const spot = $("#spotlight");
    const picks = shuffle(games).slice(0, 8);
    let si = 0, current = null;
    const show = () => {
      const g = picks[si++ % picks.length];
      if (!g) return;
      const el = document.createElement("a");
      el.className = "spot-card out";
      el.href = "#/play/" + encodeURIComponent(g.slug);
      el.innerHTML = `<img src="${esc(g.imgSrc)}" alt=""><div class="spot-info"><div><small class="muted">Spotlight</small><br><b>${esc(g.title)}</b></div><span class="btn sm">${svg("play")} Play</span></div>`;
      spot.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("out")));
      if (current) { const old = current; old.classList.add("out"); setTimeout(() => old.remove(), 800); }
      current = el;
    };
    show();
    const t2 = setInterval(show, 4800);
    cleanup.push(() => { clearInterval(t1); clearInterval(t2); });
  };

  function gameList({ title, sub, source, emptyMsg, emptyIcon }) {
    return async (arg, params) => {
      await gamesReady;
      const initialQ = params.get("q") || "";
      view.innerHTML = `<div class="page">
        <div class="page-head"><h1>${title}</h1><p>${sub}</p></div>
        <div class="toolbar">
          <label class="searchbox">${svg("search")}<input class="field" id="q" placeholder="Search ${source().length} games…" value="${esc(initialQ)}" autocomplete="off"></label>
          <select class="field" id="sort" style="width:auto">
            <option value="az">A to Z</option><option value="za">Z to A</option>
            <option value="played">Most played</option><option value="shuffle">Shuffle</option>
          </select>
          <span class="muted" id="count"></span>
        </div>
        <div class="letters" id="letters"></div>
        <div class="grid" id="grid"></div>
      </div>`;
      const q = $("#q"), sortSel = $("#sort"), grid = $("#grid"), letters = $("#letters");
      let letter = "", shuffled = null;
      sortSel.value = store.get("sort", "az");

      const list = source();
      const firstChar = (t) => { const c = t.trim()[0].toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; };
      const have = new Set(list.map((g) => firstChar(g.title)));
      letters.innerHTML = ["All", "#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((l) =>
        `<button data-l="${l === "All" ? "" : l}" ${l !== "All" && !have.has(l) ? "disabled" : ""} class="${l === "All" ? "active" : ""}" style="${l === "All" ? "width:auto;padding:0 10px" : ""}">${l}</button>`).join("");
      if (list.length < 20) letters.style.display = "none";

      const render = () => {
        const term = q.value.trim().toLowerCase();
        let out = source().filter((g) => g.title.toLowerCase().includes(term) && (!letter || firstChar(g.title) === letter));
        const s = sortSel.value;
        if (s === "az") out.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
        if (s === "za") out.sort((a, b) => b.title.localeCompare(a.title, undefined, { numeric: true }));
        if (s === "played") out.sort((a, b) => (plays[b.slug] || 0) - (plays[a.slug] || 0));
        if (s === "shuffle") { shuffled = shuffled || shuffle(source()); const order = new Map(shuffled.map((g, i) => [g.slug, i])); out.sort((a, b) => order.get(a.slug) - order.get(b.slug)); }
        $("#count").textContent = `${out.length} ${out.length === 1 ? "game" : "games"}`;
        grid.innerHTML = out.length ? out.map(card).join("") :
          `<div class="empty" style="grid-column:1/-1"><div class="big">${emptyIcon}</div>${term ? `Nothing matches “${esc(term)}”.${PROXY_ENABLED ? " Try the proxy to search the web." : ""}` : emptyMsg}</div>`;
      };
      let deb;
      q.addEventListener("input", () => { clearTimeout(deb); deb = setTimeout(render, 80); });
      q.addEventListener("keydown", (e) => { if (e.key === "Enter") { const first = $(".game", grid); if (first) location.hash = first.getAttribute("href"); } });
      sortSel.addEventListener("change", () => { shuffled = null; store.set("sort", sortSel.value); render(); });
      letters.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b || b.disabled) return;
        letter = b.dataset.l; $$("button", letters).forEach((x) => x.classList.toggle("active", x === b)); render();
      });
      render();
      if (initialQ || matchMedia("(pointer: fine)").matches) q.focus({ preventScroll: true });
    };
  }

  VIEWS.games = gameList({
    title: 'All <span class="grad-text">games</span>',
    sub: "Every game runs straight from this site. Hover a card to tilt it, tap the heart to save it.",
    source: () => games, emptyMsg: "No games found.", emptyIcon: "🕹️",
  });
  VIEWS.favorites = gameList({
    title: 'Your <span class="grad-text">favorites</span>',
    sub: "Games you've hearted live here, saved in this browser.",
    source: () => games.filter((g) => favs.has(g.slug)), emptyMsg: "No favorites yet. Tap the heart on any game to save it here.", emptyIcon: "💜",
  });
  VIEWS.recent = gameList({
    title: 'Recently <span class="grad-text">played</span>',
    sub: "Pick up where you left off.",
    source: () => recent.map((s) => bySlug.get(s)).filter(Boolean), emptyMsg: "Nothing here yet. Play something!", emptyIcon: "⏱️",
  });

  VIEWS.play = async (slug) => {
    await gamesReady;
    const g = bySlug.get(slug);
    if (!g) { location.hash = "#/games"; return; }
    recent = [slug, ...recent.filter((s) => s !== slug)].slice(0, 30);
    plays[slug] = (plays[slug] || 0) + 1;
    store.set("recent", recent); store.set("plays", plays);
    document.title = localStorage.getItem("title") || `${g.title} · ScienceTube`;

    view.classList.add("no-pad");
    const on = favs.has(slug);
    view.innerHTML = `<div class="player-bar page">
        <a class="icon-btn" href="#/games" title="Back to games">${svg("back")}</a>
        <img src="${esc(g.imgSrc)}" alt="" style="width:34px;height:34px;border-radius:10px;object-fit:cover">
        <div class="title">${esc(g.title)}</div>
        <button class="icon-btn fav-inline${on ? " on" : ""}" data-fav="${esc(slug)}" aria-pressed="${on}" title="Favorite">${svg("heart")}</button>
        <button class="icon-btn" id="p-reload" title="Restart">${svg("reload")}</button>
        <button class="icon-btn" id="p-blank" title="Open in a disguised about:blank tab">${svg("ext")}</button>
        <button class="btn sm" id="p-full">${svg("full")} Fullscreen</button>
      </div>
      <div class="stage" id="stage">
        <div class="loading" id="p-loading"><div style="text-align:center"><div class="spinner" style="margin:0 auto 14px"></div><span class="muted">Loading ${esc(g.title)}…</span></div></div>
        <iframe id="frame" src="${esc(g.link)}" allow="fullscreen; autoplay; gamepad; clipboard-write" allowfullscreen></iframe>
      </div>`;
    const frame = $("#frame");
    frame.addEventListener("load", () => $("#p-loading").classList.add("done"), { once: true });
    setTimeout(() => $("#p-loading") && $("#p-loading").classList.add("done"), 8000);
    frame.focus();
    $("#p-reload").onclick = () => { $("#p-loading").classList.remove("done"); frame.src = g.link; frame.addEventListener("load", () => $("#p-loading").classList.add("done"), { once: true }); };
    $("#p-full").onclick = () => $("#stage").requestFullscreen && $("#stage").requestFullscreen();
    $("#p-blank").onclick = () => openBlank(location.origin + g.link);
    return { crumb: g.title, nav: "games", immersive: true };
  };

  /* ---------- Apps (each one is a self-contained page under /apps/) ---------- */
  const APPS = [
    { slug: "calculator", name: "Calculator", emoji: "🧮", blurb: "Scientific-ish calculator with history", hue: 265 },
    { slug: "notes", name: "Notes", emoji: "📝", blurb: "Quick notes that save as you type", hue: 45 },
    { slug: "paint", name: "Paint", emoji: "🎨", blurb: "Brush, shapes, fill and PNG export", hue: 330 },
    { slug: "clock", name: "Timer & Stopwatch", emoji: "⏱️", blurb: "Countdowns, laps and alarms", hue: 190 },
    { slug: "converter", name: "Unit converter", emoji: "📐", blurb: "Length, mass, temperature and more", hue: 150 },
    { slug: "todo", name: "To-do list", emoji: "✅", blurb: "Track what needs doing", hue: 100 },
    { slug: "code", name: "Code playground", emoji: "💻", blurb: "HTML, CSS and JS with live preview", hue: 220 },
  ];
  const appBySlug = new Map(APPS.map((a) => [a.slug, a]));

  VIEWS.apps = () => {
    view.innerHTML = `<div class="page">
      <div class="page-head"><h1><span class="grad-text">Apps</span></h1><p>Handy tools that run right here on ScienceTube. They open inside the site and save to this browser.</p></div>
      <div class="app-grid">${APPS.map((a, i) => `<a class="app-tile" href="#/app/${a.slug}" style="--h:${a.hue};--i:${i}">
          <span class="app-ico">${a.emoji}</span><b>${esc(a.name)}</b><small>${esc(a.blurb)}</small></a>`).join("")}
      </div>
    </div>`;
  };

  VIEWS.app = (slug) => {
    const a = appBySlug.get(slug);
    if (!a) { location.hash = "#/apps"; return; }
    view.classList.add("no-pad");
    view.innerHTML = `<div class="player-bar page">
        <a class="icon-btn" href="#/apps" title="Back to apps">${svg("back")}</a>
        <span class="app-ico sm" style="--h:${a.hue}">${a.emoji}</span>
        <div class="title">${esc(a.name)}</div>
        <button class="icon-btn" id="a-reload" title="Reload">${svg("reload")}</button>
        <button class="btn sm" id="a-full">${svg("full")} Fullscreen</button>
      </div>
      <div class="stage app-stage" id="stage">
        <iframe id="frame" src="/apps/${a.slug}/" allow="fullscreen; clipboard-write" allowfullscreen title="${esc(a.name)}"></iframe>
      </div>`;
    const frame = $("#frame");
    frame.addEventListener("load", () => { try { frame.contentWindow.focus(); } catch {} });
    $("#a-reload").onclick = () => { frame.src = "/apps/" + a.slug + "/"; };
    $("#a-full").onclick = () => $("#stage").requestFullscreen && $("#stage").requestFullscreen();
    return { crumb: a.name, nav: "apps", immersive: true };
  };

  /* ---------- Chat ---------- */
  const NAME_HUES = [265, 330, 190, 150, 45, 15, 220, 100];
  VIEWS.chat = async (arg) => {
    const C = window.NebulaChat;
    await C.ready;
    if (!/^#\/chat/.test(location.hash)) return;
    const rooms = C.rooms;
    const room = rooms.find((r) => r.id === arg) || rooms[0];
    let me = store.get("chatName", "");
    const hue = store.get("chatHue", NAME_HUES[(Math.random() * NAME_HUES.length) | 0]);
    store.set("chatHue", hue);
    view.classList.add("no-pad");
    view.innerHTML = `<div class="chat page">
      <aside class="chat-rooms">
        <div class="chat-rooms-head">Rooms</div>
        ${rooms.map((r) => `<a href="#/chat/${esc(r.id)}" class="${r.id === room.id ? "on" : ""}"><span>${r.emoji || "#"}</span>${esc(r.name)}</a>`).join("")}
        <div class="chat-me">
          <label class="muted" for="c-name">Your name</label>
          <input class="field" id="c-name" maxlength="24" placeholder="Pick a nickname" value="${esc(me)}">
        </div>
      </aside>
      <section class="chat-main">
        <header class="chat-head"><b>${room.emoji || "#"} ${esc(room.name)}</b><span class="status-line" id="c-status"><i></i><span>Connecting…</span></span></header>
        ${C.mode === "local" ? `<div class="chat-banner">${svg("sparkle")}<span><b>Demo mode.</b> Messages only reach other tabs in this browser until the site owner connects a chat database.</span></div>` : ""}
        <div class="chat-log" id="c-log"><div class="chat-empty muted">No messages yet. Say hi!</div></div>
        <form class="chat-form" id="c-form">
          <input class="field" id="c-text" maxlength="500" placeholder="Message ${esc(room.name)}" autocomplete="off">
          <button class="btn" id="c-send">Send</button>
        </form>
        <small class="chat-foot muted">Be kind. Don't share passwords, your address or other personal info.</small>
      </section>
    </div>`;
    const log = $("#c-log"), status = $("#c-status"), input = $("#c-text"), nameIn = $("#c-name");
    let last = 0, lastAuthor = null;
    const setStatus = (s) => {
      const txt = { live: "Live", connecting: "Connecting…", error: "Offline", demo: "Demo" }[s] || s;
      status.className = "status-line " + (s === "live" || s === "demo" ? "on" : s === "error" ? "off" : "");
      status.lastElementChild.textContent = txt;
    };
    const time = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const onMessage = (m) => {
      const empty = $(".chat-empty", log); if (empty) empty.remove();
      const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
      const el = document.createElement("div");
      const cont = lastAuthor === m.n && m.ts - last < 120000;
      el.className = "msg" + (cont ? " cont" : "") + (m.n === me ? " mine" : "");
      el.style.setProperty("--h", m.c || 0);
      el.innerHTML = (cont ? "" : `<div class="msg-head"><b>${esc(m.n)}</b><small>${time(m.ts)}</small></div>`) + `<div class="msg-body">${esc(m.t)}</div>`;
      log.appendChild(el);
      lastAuthor = m.n; last = m.ts;
      if (stick || m.n === me) log.scrollTop = log.scrollHeight;
    };
    const conn = C.join(room.id, onMessage, setStatus);
    cleanup.push(() => conn.leave());
    nameIn.onchange = () => { me = nameIn.value.trim().slice(0, 24); store.set("chatName", me); };
    let lastSend = 0;
    $("#c-form").onsubmit = async (e) => {
      e.preventDefault();
      const t = input.value.trim();
      me = nameIn.value.trim().slice(0, 24);
      if (!me) { nameIn.focus(); toast("Pick a nickname first."); return; }
      store.set("chatName", me);
      if (!t) return;
      if (Date.now() - lastSend < 1500) { toast("Slow down a little."); return; }
      lastSend = Date.now();
      input.value = "";
      try { await C.send(room.id, { n: me, t: t.slice(0, 500), c: hue }); conn.poke(); }
      catch (err) { input.value = t; toast(err.message || "Message failed to send."); }
      input.focus();
    };
    (me ? input : nameIn).focus();
    return { crumb: room.name, nav: "chat" };
  };

  /* ---------- Proxy (kept alive between visits so pages don't reload) ---------- */
  let proxyEl = null;
  function buildProxy() {
    proxyEl = document.createElement("div");
    proxyEl.className = "view no-pad";
    proxyEl.id = "proxy-view";
    const engine = store.get("engine", "duckduckgo");
    const sites = [
      ["DuckDuckGo", "duckduckgo.com", "#de5833", "D"], ["Wikipedia", "wikipedia.org", "#636466", "W"],
      ["YouTube", "youtube.com", "#ff0033", "▶"], ["Reddit", "reddit.com", "#ff4500", "R"],
      ["Discord", "discord.com/app", "#5865f2", "D"], ["GitHub", "github.com", "#24292f", "G"],
      ["Spotify", "open.spotify.com", "#1db954", "S"], ["Twitch", "twitch.tv", "#9146ff", "T"],
    ];
    proxyEl.innerHTML = `
      <div class="proxy-home page" id="px-home">
        <span class="status-line" id="px-status"><i></i><span>Checking proxy…</span></span>
        <h1>Browse <span class="grad-text">without limits</span></h1>
        <p>Type a website or a search. Pages load through this site’s own server, so your network only sees a connection to ScienceTube.</p>
        <form class="omni" id="px-form" autocomplete="off">
          ${svg("search")}
          <input class="field" id="px-input" placeholder="Search ${esc(engine)} or type a URL" spellcheck="false">
          <button class="btn" type="submit">${svg("bolt")} Go</button>
        </form>
        <div class="shortcuts">${sites.map(([n, u, c, l]) => `<button data-url="https://${u}"><span class="logo" style="background:${c}">${l}</span><small>${n}</small></button>`).join("")}</div>
        <div class="proxy-notes">
          <div class="card"><b>${svg("lock")} Encrypted tunnel</b>Everything travels over one encrypted WebSocket to this server. Filters see the site you’re on, not the pages you visit.</div>
          <div class="card"><b>${svg("eye")} Hides your IP</b>Websites see the server’s address, not yours. Cookies stay inside the proxy.</div>
          <div class="card"><b>${svg("shield")} Know the limits</b>The server operator can still see traffic, and logging in to accounts identifies you. For strong anonymity use Tor.</div>
        </div>
        <div class="offline card" id="px-offline" hidden></div>
      </div>
      <div class="browser" id="px-browser">
        <div class="browser-bar">
          <button class="icon-btn" id="px-back" title="Back">${svg("back")}</button>
          <button class="icon-btn" id="px-fwd" title="Forward">${svg("fwd")}</button>
          <button class="icon-btn" id="px-reload" title="Reload">${svg("reload")}</button>
          <button class="icon-btn" id="px-homebtn" title="Proxy home">${svg("home")}</button>
          <form id="px-form2" style="flex:1;display:flex;align-items:center;gap:8px;position:relative">
            <span class="lock">${svg("lock")}</span>
            <input class="field" id="px-url" spellcheck="false" autocomplete="off">
          </form>
          <button class="icon-btn" id="px-blank" title="Pop out into about:blank">${svg("ext")}</button>
          <button class="icon-btn" id="px-full" title="Fullscreen">${svg("full")}</button>
        </div>
        <div class="stage" id="px-stage">
          <div class="loading done" id="px-loading"><div class="spinner"></div></div>
          <iframe id="px-frame" allow="fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>`;
    $("#main").appendChild(proxyEl);

    const home = $("#px-home", proxyEl), browser = $("#px-browser", proxyEl), frame = $("#px-frame", proxyEl);
    const status = $("#px-status", proxyEl), urlField = $("#px-url", proxyEl), loading = $("#px-loading", proxyEl);

    NebulaProxy.check().then((ok) => {
      status.className = "status-line " + (ok ? "on" : "off");
      status.lastElementChild.textContent = ok ? "Proxy online" : "Proxy offline";
      setProxyDot(ok);
      if (!ok) {
        const off = $("#px-offline", proxyEl);
        off.hidden = false;
        off.innerHTML = `<b>${svg("bolt")} The proxy server isn’t running here</b>
          <p class="muted" style="margin:6px 0 0">The games work on any static host, but the proxy needs the Node server in this repo. Run <code>npm install</code> then <code>npm start</code>, or deploy to a host that runs Node with WebSockets (Render, Railway, Fly.io, Koyeb, or a VPS). It must be served over HTTPS.</p>`;
      }
    });

    const go = async (input) => {
      const url = NebulaProxy.toUrl(input, store.get("engine", "duckduckgo"));
      if (!url) return;
      loading.classList.remove("done");
      try {
        await NebulaProxy.ready();
      } catch (e) {
        loading.classList.add("done");
        toast(e.message === "offline" ? "Proxy offline. See the note below." : e.message);
        return;
      }
      home.style.display = "none";
      browser.classList.add("open");
      urlField.value = url;
      frame.src = NebulaProxy.encode(url);
    };

    $("#px-form", proxyEl).addEventListener("submit", (e) => { e.preventDefault(); go($("#px-input", proxyEl).value); });
    $("#px-form2", proxyEl).addEventListener("submit", (e) => { e.preventDefault(); go(urlField.value); urlField.blur(); });
    $(".shortcuts", proxyEl).addEventListener("click", (e) => { const b = e.target.closest("[data-url]"); if (b) go(b.dataset.url); });
    frame.addEventListener("load", () => {
      loading.classList.add("done");
      try {
        const real = NebulaProxy.decode(frame.contentWindow.location);
        if (real && document.activeElement !== urlField) urlField.value = real;
      } catch {}
    });
    const hist = (fn) => { try { frame.contentWindow.history[fn](); } catch {} };
    $("#px-back", proxyEl).onclick = () => hist("back");
    $("#px-fwd", proxyEl).onclick = () => hist("forward");
    $("#px-reload", proxyEl).onclick = () => { try { loading.classList.remove("done"); frame.contentWindow.location.reload(); } catch {} };
    $("#px-homebtn", proxyEl).onclick = () => { browser.classList.remove("open"); home.style.display = ""; frame.src = "about:blank"; };
    $("#px-full", proxyEl).onclick = () => $("#px-stage", proxyEl).requestFullscreen && $("#px-stage", proxyEl).requestFullscreen();
    $("#px-blank", proxyEl).onclick = () => { try { openBlank(frame.contentWindow.location.href); } catch {} };
    urlField.addEventListener("focus", () => urlField.select());
  }

  VIEWS.proxy = (arg, params) => {
    if (!proxyEl) buildProxy();
    proxyEl.style.display = "";
    view.style.display = "none";
    const q = params.get("q");
    if (q) { $("#px-input", proxyEl).value = q; $("#px-form", proxyEl).requestSubmit(); }
    else if (!$("#px-browser", proxyEl).classList.contains("open")) $("#px-input", proxyEl).focus({ preventScroll: true });
    return { immersive: $("#px-browser", proxyEl).classList.contains("open") };
  };

  function setProxyDot(ok) {
    const d = $("#proxy-dot");
    d.classList.toggle("on", ok); d.classList.toggle("off", !ok);
    d.title = ok ? "Proxy online" : "Proxy offline";
  }

  /* ---------- Tools ---------- */
  VIEWS.tools = () => {
    const presets = [
      ["Google Classroom", "Classes", "https://ssl.gstatic.com/classroom/favicon.png"],
      ["Google Docs", "Google Docs", "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico"],
      ["Google Drive", "My Drive - Google Drive", "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png"],
      ["Google", "Google", "https://www.google.com/favicon.ico"],
      ["Wikipedia", "Wikipedia", "https://en.wikipedia.org/favicon.ico"],
    ];
    const panic = store.get("panic", { key: "`", url: "https://classroom.google.com" });
    view.innerHTML = `<div class="page">
      <div class="page-head"><h1><span class="grad-text">Tools</span></h1><p>Small utilities that keep your tab low-key.</p></div>
      <div class="cards">
        <div class="card">
          <h3>${svg("ext")} about:blank launcher</h3>
          <p>Opens a page inside an about:blank tab so it doesn’t show up as a normal address in your history.</p>
          <div class="row"><input class="field" id="ab-url" placeholder="https://example.com (blank = this site)"><button class="btn sm" id="ab-go">Launch</button></div>
        </div>
        <div class="card">
          <h3>${svg("eye")} Tab disguise</h3>
          <p>Change this site’s tab title and icon everywhere, including inside games.</p>
          <div class="row"><input class="field" id="tc-title" placeholder="Tab title" value="${esc(localStorage.getItem("title") || "")}"></div>
          <div class="row" style="margin-top:8px"><input class="field" id="tc-icon" placeholder="Icon image URL" value="${esc(localStorage.getItem("icon") || "")}"></div>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="tc-save">Apply</button><button class="btn sm ghost" id="tc-reset">Reset</button></div>
          <div class="presets">${presets.map(([n, t, i], k) => `<button class="chip" data-p="${k}"><img src="${esc(i)}" alt="" width="16" height="16">${esc(n)}</button>`).join("")}</div>
          <div class="note" id="tc-note"></div>
        </div>
        <div class="card">
          <h3>${svg("bolt")} Panic key</h3>
          <p>Press the key anywhere on ScienceTube to jump instantly to a safe page. Click outside a game first, since games capture the keyboard.</p>
          <div class="row"><input class="field" id="pk-key" maxlength="1" style="max-width:80px;text-align:center" value="${esc(panic.key)}"><input class="field" id="pk-url" value="${esc(panic.url)}"></div>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="pk-save">Save</button><button class="btn sm ghost" id="pk-off">${panic.off ? "Turn on" : "Turn off"}</button></div>
          <div class="note" id="pk-note">${panic.off ? "Panic key is off." : `Panic key is on: press <kbd>${esc(panic.key)}</kbd>.`}</div>
        </div>
      </div>
    </div>`;
    $("#ab-go").onclick = () => {
      let u = $("#ab-url").value.trim();
      if (!u) u = location.origin;
      else if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      openBlank(u);
    };
    const note = (el, msg, ok) => { el.className = "note " + (ok ? "ok" : "err"); el.innerHTML = msg; };
    const applyCloak = (title, icon) => {
      if (title) localStorage.setItem("title", title); else localStorage.removeItem("title");
      if (icon) localStorage.setItem("icon", icon); else localStorage.removeItem("icon");
      document.title = title || "ScienceTube";
      let link = $("link[rel~='icon']"); link.href = icon || "/favicon.ico";
    };
    $("#tc-save").onclick = () => {
      const icon = $("#tc-icon").value.trim();
      if (icon && !/^(https?:|data:image\/)/i.test(icon)) return note($("#tc-note"), "The icon needs to be an image URL.", false);
      applyCloak($("#tc-title").value.trim(), icon); note($("#tc-note"), "Disguise applied.", true);
    };
    $("#tc-reset").onclick = () => { $("#tc-title").value = $("#tc-icon").value = ""; applyCloak("", ""); note($("#tc-note"), "Back to normal.", true); };
    $(".presets").onclick = (e) => {
      const b = e.target.closest("[data-p]"); if (!b) return;
      const [, t, i] = presets[+b.dataset.p];
      $("#tc-title").value = t; $("#tc-icon").value = i; applyCloak(t, i); note($("#tc-note"), `Now disguised as ${esc(t)}.`, true);
    };
    $("#pk-save").onclick = () => {
      const key = $("#pk-key").value; let url = $("#pk-url").value.trim();
      if (!key) return note($("#pk-note"), "Pick a key.", false);
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      store.set("panic", { key, url }); $("#pk-off").textContent = "Turn off";
      note($("#pk-note"), `Saved. Press <kbd>${esc(key)}</kbd> to escape.`, true);
    };
    $("#pk-off").onclick = () => {
      const p = store.get("panic", panic); p.off = !p.off; store.set("panic", p);
      $("#pk-off").textContent = p.off ? "Turn on" : "Turn off";
      note($("#pk-note"), p.off ? "Panic key is off." : `Panic key is on: press <kbd>${esc(p.key)}</kbd>.`, true);
    };
  };

  /* ---------- Settings ---------- */
  const THEMES = [["nebula", "Nebula", "#8b5cf6", "#ec4899"], ["ocean", "Ocean", "#3b82f6", "#22d3ee"], ["sunset", "Sunset", "#f97316", "#ec4899"], ["toxic", "Toxic", "#84cc16", "#10b981"], ["ember", "Ember", "#ef4444", "#f59e0b"]];
  function applyTheme(t) {
    if (t === "nebula") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.dataset.theme = t;
    store.set("theme", t);
    window.NebulaBG && NebulaBG.refresh();
  }

  VIEWS.settings = () => {
    const theme = store.get("theme", "nebula");
    view.innerHTML = `<div class="page">
      <div class="page-head"><h1><span class="grad-text">Settings</span></h1><p>Make ScienceTube yours. Everything is saved in this browser only.</p></div>
      <div class="cards">
        <div class="card"><h3>${svg("sparkle")} Color theme</h3><p>Changes accents, glows and the animated background.</p>
          <div class="swatches" style="margin-bottom:22px">${THEMES.map(([id, n, a, b]) => `<button class="swatch${id === theme ? " active" : ""}" data-t="${id}" style="background:linear-gradient(135deg,${a},${b});color:${a}" aria-label="${n}"><span>${n}</span></button>`).join("")}</div>
        </div>
        <div class="card"><h3>${svg("gear")} Interface</h3><p>Performance and layout.</p>
          <label class="toggle"><span>Animated background</span><span class="switch"><input type="checkbox" id="s-bg" ${store.get("bg", true) ? "checked" : ""}><span></span></span></label>
          <label class="toggle"><span>Reduce motion</span><span class="switch"><input type="checkbox" id="s-calm" ${store.get("calm", false) ? "checked" : ""}><span></span></span></label>
          <label class="toggle"><span>Compact sidebar</span><span class="switch"><input type="checkbox" id="s-col" ${document.body.classList.contains("collapsed") ? "checked" : ""}><span></span></span></label>
        </div>
        ${PROXY_ENABLED ? "" : "<!--"}<div class="card"><h3>${svg("globe")} Proxy search engine</h3><p>Used when you type words instead of a URL in the proxy.</p>
          <select class="field" id="s-engine">${Object.entries({ duckduckgo: "DuckDuckGo", brave: "Brave Search", google: "Google", bing: "Bing" }).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select>
        </div>${PROXY_ENABLED ? "" : "-->"}
        <div class="card"><h3>${svg("shield")} Your data</h3><p>Favorites, history and settings live in this browser only. Nothing is sent anywhere.</p>
          <button class="btn sm ghost" id="s-clear">Clear favorites and history</button>
        </div>
        <div class="card"><h3>${svg("bolt")} Keyboard shortcuts</h3>
          <p style="line-height:2.1;margin:0"><kbd>Ctrl</kbd> <kbd>K</kbd> or <kbd>/</kbd> search everything<br><kbd>1</kbd>–<kbd>${Math.min(9, JUMP.length)}</kbd> jump to a section<br><kbd>[</kbd> collapse the sidebar<br><kbd>R</kbd> random game</p>
        </div>
      </div>
    </div>`;
    $(".swatches").onclick = (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      applyTheme(b.dataset.t); $$(".swatch").forEach((s) => s.classList.toggle("active", s === b));
    };
    $("#s-bg").onchange = (e) => { store.set("bg", e.target.checked); NebulaBG.setEnabled(e.target.checked); };
    $("#s-calm").onchange = (e) => { store.set("calm", e.target.checked); document.body.classList.toggle("calm", e.target.checked); };
    $("#s-col").onchange = (e) => setCollapsed(e.target.checked);
    if ($("#s-engine")) $("#s-engine").value = store.get("engine", "duckduckgo");
    if ($("#s-engine")) $("#s-engine").onchange = (e) => { store.set("engine", e.target.value); const i = proxyEl && $("#px-input", proxyEl); if (i) i.placeholder = `Search ${e.target.value} or type a URL`; };
    $("#s-clear").onclick = () => {
      if (!confirm("Clear favorites, recently played and play counts?")) return;
      favs = new Set(); recent = []; plays = {};
      store.set("favs", []); store.set("recent", []); store.set("plays", {});
      updateStats(); toast("Cleared.");
    };
  };

  /* ---------- Coming soon ---------- */
  function soonView(s) {
    view.innerHTML = `<div class="page soon-page"><div>
      <div class="ring">${svg(s.icon)}</div>
      <h1 style="margin:0 0 6px;font-size:40px;letter-spacing:-.03em">${esc(s.label)} <span class="grad-text">is on the way</span></h1>
      <p class="muted" style="max-width:460px;margin:0 auto 22px">${esc(s.blurb)}. This spot in the sidebar is reserved for it.</p>
      <a class="btn" href="#/games">${svg("games")} Play a game meanwhile</a>
    </div></div>`;
  }

  /* ------------------------------------------------------------------
     Router
  ------------------------------------------------------------------ */
  let routing = 0;
  async function route() {
    const token = ++routing;
    const raw = location.hash.replace(/^#\/?/, "") || "home";
    const [path, query = ""] = raw.split("?");
    const [name, ...rest] = path.split("/");
    const arg = decodeURIComponent(rest.join("/"));
    const params = new URLSearchParams(query);

    cleanup.forEach((fn) => fn()); cleanup = [];
    document.body.classList.remove("nav-open");
    view.classList.remove("no-pad");
    view.style.display = "";
    if (proxyEl) proxyEl.style.display = "none";
    if (name !== "play") document.title = localStorage.getItem("title") || "ScienceTube";

    const section = NAV.find((s) => s.id === name);
    let meta = {};
    if (section && section.soon) soonView(section);
    else if (VIEWS[name]) meta = (await VIEWS[name](arg, params)) || {};
    else { location.replace("#/home"); return; }
    if (token !== routing) return;

    const navId = meta.nav || name;
    setActiveNav(navId);
    const sec = NAV.find((s) => s.id === navId);
    $("#crumbs").innerHTML = meta.crumb ? `${esc(sec.label)} / <b>${esc(meta.crumb)}</b>` : `<b>${esc(sec ? sec.label : "Home")}</b>`;
    NebulaBG.setPaused(!!meta.immersive || (PROXY_ENABLED && name === "proxy"));
    if (name !== "proxy") view.scrollTop = 0;
  }

  function randomGame() {
    if (!games.length) return;
    const g = games[(Math.random() * games.length) | 0];
    location.hash = "#/play/" + encodeURIComponent(g.slug);
  }

  /* ------------------------------------------------------------------
     Command palette
  ------------------------------------------------------------------ */
  const pal = $("#palette"), palIn = $("#palette-input"), palList = $("#palette-list");
  let palItems = [], palSel = 0;

  function openPalette() {
    pal.hidden = false; palIn.value = ""; renderPalette(); palIn.focus();
  }
  function closePalette() { pal.hidden = true; }
  function renderPalette() {
    const q = palIn.value.trim().toLowerCase();
    const secs = NAV.filter((s) => s.label.toLowerCase().includes(q)).map((s) => ({ kind: "section", s }));
    const gm = (q ? games.filter((g) => g.title.toLowerCase().includes(q)) : recent.map((s) => bySlug.get(s)).filter(Boolean)).slice(0, 8).map((g) => ({ kind: "game", g }));
    const ap = q ? APPS.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 4).map((a) => ({ kind: "app", a })) : [];
    palItems = [...(q ? gm : []), ...ap, ...secs.slice(0, q ? 4 : 20), ...(q ? [] : gm)];
    if (q && PROXY_ENABLED) palItems.push({ kind: "web", q: palIn.value.trim() });
    palSel = 0;
    palList.innerHTML = palItems.map((it, i) => {
      if (it.kind === "game") return `<li data-i="${i}"><img src="${esc(it.g.imgSrc)}" alt=""><span>${esc(it.g.title)}</span><small>Game</small></li>`;
      if (it.kind === "app") return `<li data-i="${i}"><span class="ico">${it.a.emoji}</span><span>${esc(it.a.name)}</span><small>App</small></li>`;
      if (it.kind === "section") return `<li data-i="${i}"><span class="ico">${svg(it.s.icon)}</span><span>${esc(it.s.label)}</span><small>${it.s.soon ? "Soon" : "Section"}</small></li>`;
      return `<li data-i="${i}"><span class="ico">${svg("globe")}</span><span>Browse “${esc(it.q)}” in the proxy</span><small>Web</small></li>`;
    }).join("") || `<li class="muted">No results</li>`;
    highlight();
  }
  function highlight() {
    $$("li[data-i]", palList).forEach((li) => li.classList.toggle("sel", +li.dataset.i === palSel));
    const sel = $("li.sel", palList); sel && sel.scrollIntoView({ block: "nearest" });
  }
  function pick(i) {
    const it = palItems[i]; if (!it) return;
    closePalette();
    if (it.kind === "game") location.hash = "#/play/" + encodeURIComponent(it.g.slug);
    else if (it.kind === "app") location.hash = "#/app/" + it.a.slug;
    else if (it.kind === "section") location.hash = "#/" + it.s.id;
    else location.hash = "#/proxy?q=" + encodeURIComponent(it.q);
  }
  palIn.addEventListener("input", renderPalette);
  palIn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); highlight(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); highlight(); }
    else if (e.key === "Enter") { e.preventDefault(); pick(palSel); }
  });
  palList.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) pick(+li.dataset.i); });
  pal.addEventListener("click", (e) => { if (e.target === pal) closePalette(); });

  /* ------------------------------------------------------------------
     Global events
  ------------------------------------------------------------------ */
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); return; }
    if (e.key === "Escape") { if (!pal.hidden) closePalette(); document.body.classList.remove("nav-open"); return; }
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || !pal.hidden) return;
    const panic = store.get("panic", { key: "`", url: "https://classroom.google.com" });
    if (!panic.off && e.key === panic.key) { e.preventDefault(); location.replace(panic.url); return; }
    if (e.key === "/") { e.preventDefault(); openPalette(); }
    else if (e.key === "[") setCollapsed(!document.body.classList.contains("collapsed"));
    else if (e.key.toLowerCase() === "r") randomGame();
    else if (/^[1-9]$/.test(e.key) && JUMP[+e.key - 1]) location.hash = "#/" + JUMP[+e.key - 1].id;
  });

  $("#palette-open").onclick = openPalette;
  $("#random-btn").onclick = randomGame;
  $("#collapse-btn").onclick = () => setCollapsed(!document.body.classList.contains("collapsed"));
  $("#menu-btn").onclick = () => document.body.classList.add("nav-open");
  $("#scrim").onclick = () => document.body.classList.remove("nav-open");
  addEventListener("hashchange", route);

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  // Old links from the previous site.
  const legacy = { "/projects.html": "#/games", "/projects": "#/games", "/misc.html": "#/tools", "/misc": "#/tools" };
  if (legacy[location.pathname]) history.replaceState(null, "", "/" + legacy[location.pathname]);

  applyTheme(store.get("theme", "nebula"));
  if (store.get("collapsed", false)) document.body.classList.add("collapsed");
  if (store.get("calm", false)) document.body.classList.add("calm");
  NebulaBG.setEnabled(store.get("bg", true));
  buildNav();
  updateStats();
  if (PROXY_ENABLED) NebulaProxy.check().then(setProxyDot);
  else $("#proxy-dot").hidden = true;
  route();
})();
