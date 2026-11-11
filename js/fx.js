// ScienceTube — interface polish that sits on top of app.js:
// sliding nav highlight, route progress bar, scroll-aware top bar, back-to-top,
// scroll reveals, rail arrows, button ripples, favorite bursts, the "?"
// shortcut sheet and the mobile tab bar. Everything here is optional sugar:
// if this file fails to load, the site still works.
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = () => document.body.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const view = $("#view");
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

  /* ---------- Sliding highlight behind the active sidebar item ---------- */
  const nav = $("#nav");
  const pill = document.createElement("span");
  pill.className = "nav-pill";
  pill.setAttribute("aria-hidden", "true");
  function movePill() {
    const a = $(".nav-item.active", nav);
    if (!a) { pill.style.opacity = "0"; return; }
    if (pill.parentNode !== nav) nav.prepend(pill);
    pill.style.opacity = "1";
    pill.style.transform = `translateY(${a.offsetTop}px)`;
    pill.style.height = a.offsetHeight + "px";
  }
  new MutationObserver(movePill).observe(nav, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
  new ResizeObserver(movePill).observe(nav);

  /* ---------- Route progress bar + page change hooks ---------- */
  const bar = document.createElement("div");
  bar.className = "route-bar";
  document.body.appendChild(bar);
  function routeBar() {
    bar.classList.remove("go"); void bar.offsetWidth; bar.classList.add("go");
  }
  addEventListener("hashchange", routeBar);

  /* ---------- Top bar: glass + scroll progress once you scroll ---------- */
  const topbar = $(".topbar");
  const prog = document.createElement("i");
  prog.className = "scroll-prog";
  topbar.appendChild(prog);
  const toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  toTop.onclick = () => view.scrollTo({ top: 0, behavior: calm() ? "auto" : "smooth" });
  document.body.appendChild(toTop);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = view.scrollHeight - view.clientHeight;
      const y = view.scrollTop;
      topbar.classList.toggle("scrolled", y > 8);
      prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      toTop.classList.toggle("show", y > 900);
    });
  }
  view.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Scroll reveal for page sections ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { root: view, rootMargin: "0px 0px -6% 0px", threshold: 0.05 }) : null;

  function enhance() {
    onScroll();
    const page = $(".page", view);
    if (!page) return;
    // Reveal anything below the fold as it scrolls in.
    if (io && !calm()) {
      const vh = view.clientHeight;
      $$(".section-title, .rail-wrap, .quick, .marquee, .cards > .card, .home-foot", page).forEach((el) => {
        if (el.getBoundingClientRect().top > vh * 0.92) { el.classList.add("reveal"); io.observe(el); }
      });
    }
    // Arrow buttons for horizontal rails.
    $$(".rail", page).forEach((rail) => {
      if (rail.parentNode.classList.contains("rail-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "rail-wrap";
      rail.before(wrap); wrap.appendChild(rail);
      const mk = (dir) => {
        const b = document.createElement("button");
        b.className = "rail-arrow " + dir;
        b.setAttribute("aria-label", dir === "prev" ? "Scroll left" : "Scroll right");
        b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}"/></svg>`;
        b.onclick = () => rail.scrollBy({ left: (dir === "prev" ? -1 : 1) * rail.clientWidth * 0.8, behavior: calm() ? "auto" : "smooth" });
        wrap.appendChild(b);
        return b;
      };
      const prev = mk("prev"), next = mk("next");
      const sync = () => {
        prev.disabled = rail.scrollLeft < 8;
        next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
      };
      rail.addEventListener("scroll", sync, { passive: true });
      requestAnimationFrame(sync);
    });
  }
  new MutationObserver(enhance).observe(view, { childList: true });

  /* ---------- Ripple on buttons ---------- */
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn, .chip, .quick a, .app-tile, .search-trigger");
    if (!b || calm()) return;
    const r = b.getBoundingClientRect();
    const s = Math.max(r.width, r.height) * 2.2;
    const rip = document.createElement("span");
    rip.className = "ripple";
    rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    if (getComputedStyle(b).position === "static") b.style.position = "relative";
    b.classList.add("has-ripple");
    b.appendChild(rip);
    setTimeout(() => rip.remove(), 650);
  }, { passive: true });

  /* ---------- Heart burst when you favorite something ---------- */
  document.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (!fav || calm()) return;
    setTimeout(() => {
      if (!fav.classList.contains("on")) return;
      const r = fav.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (let i = 0; i < 12; i++) {
        const p = document.createElement("i");
        p.className = "heart-bit";
        const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, d = 26 + Math.random() * 26;
        p.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--s:${0.5 + Math.random() * 0.7};--h:${300 + Math.random() * 60}`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 750);
      }
    }, 0);
  }, true);

  /* ---------- "?" shortcut sheet ---------- */
  const sheet = document.createElement("div");
  sheet.className = "palette keys-sheet";
  sheet.hidden = true;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Keyboard shortcuts");
  const rows = [
    [["Ctrl", "K"], "Search everything (or press /)"], [["1", "–", "9"], "Jump to a section"],
    [["R"], "Play a random game"], [["["], "Collapse the sidebar"], [["`"], "Panic key (change it in Tools)"],
    [["?"], "Show this sheet"], [["Esc"], "Close dialogs or skip the intro"],
  ];
  sheet.innerHTML = `<div class="palette-box keys-box">
      <div class="keys-head"><b>Keyboard shortcuts</b><button class="icon-btn" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <ul>${rows.map(([k, t]) => `<li><span>${k.map((x) => x === "–" ? "–" : `<kbd>${x}</kbd>`).join(" ")}</span><small>${t}</small></li>`).join("")}</ul>
    </div>`;
  document.body.appendChild(sheet);
  const closeSheet = () => { sheet.hidden = true; };
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest(".icon-btn")) closeSheet(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) { closeSheet(); return; }
    if (e.key === "?" && !typing(e) && !document.body.classList.contains("intro-on")) { e.preventDefault(); sheet.hidden = !sheet.hidden; }
  });

  /* ---------- Mobile tab bar ---------- */
  const tabs = document.createElement("nav");
  tabs.className = "tabbar";
  tabs.setAttribute("aria-label", "Quick navigation");
  const T = [
    ["home", "Home", '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'],
    ["games", "Games", '<rect x="2" y="7" width="20" height="12" rx="5"/><path d="M7 11v4M5 13h4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="14" r="1"/>'],
    ["search", "Search", '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'],
    ["favorites", "Saved", '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'],
    ["menu", "More", '<path d="M4 6h16M4 12h16M4 18h16"/>'],
  ];
  tabs.innerHTML = T.map(([id, label, d]) => `<button data-tab="${id}"><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg><span>${label}</span></button>`).join("");
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]"); if (!b) return;
    const id = b.dataset.tab;
    if (id === "search") $("#palette-open").click();
    else if (id === "menu") document.body.classList.add("nav-open");
    else location.hash = "#/" + id;
  });
  document.body.appendChild(tabs);
  function syncTabs() {
    const r = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0] || "home";
    $$("[data-tab]", tabs).forEach((b) => b.classList.toggle("on", b.dataset.tab === (r === "play" ? "games" : r)));
    document.body.classList.toggle("immersive", /^(play|app|chat|proxy)$/.test(r));
  }
  addEventListener("hashchange", syncTabs);
  syncTabs();
  enhance();
})();
