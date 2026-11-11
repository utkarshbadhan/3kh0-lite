// ScienceTube arrival intro: a warp-speed jump through the stars that pulls
// itself together into the ScienceTube wordmark, then hands over to a
// "Start playing" button.
//
// - Shown once per browser tab session, only when arriving on the home page
//   (deep links straight to a game skip it).
// - Skippable at any time (Skip button, Esc, or a click during the warp).
// - prefers-reduced-motion / Settings > Reduce motion get a calm, static card.
// - Particle counts scale down on small or low-power devices.
// Replay it any time from Settings, or with window.STIntro.play().
(function () {
  "use strict";

  const SEEN_KEY = "sciencetube.introSeen";
  const get = (k, d) => { try { const v = localStorage.getItem("nebula." + k); return v === null ? d : JSON.parse(v); } catch { return d; } };

  function shouldAutoPlay() {
    if (!get("intro", true)) return false;
    try { if (sessionStorage.getItem(SEEN_KEY)) return false; } catch {}
    const route = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    return route === "" || route === "home";
  }

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function rgb(hex) {
    const m = (hex || "#8b5cf6").replace("#", "");
    const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeInOut = (t) => (t = Math.min(1, Math.max(0, t))) < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let active = null;

  function play({ auto = false } = {}) {
    if (active) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || get("calm", false);
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || innerWidth < 700;
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}

    const root = document.createElement("div");
    root.className = "intro" + (reduced ? " intro-static" : "");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Welcome to ScienceTube");
    root.innerHTML = `
      <canvas class="intro-canvas" aria-hidden="true"></canvas>
      <div class="intro-vignette" aria-hidden="true"></div>
      <button class="intro-skip" type="button">Skip intro <kbd>Esc</kbd></button>
      <div class="intro-stage">
        <svg class="intro-atom" viewBox="-60 -60 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="ia-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style="stop-color:var(--a1)"/><stop offset=".55" style="stop-color:var(--a2)"/><stop offset="1" style="stop-color:var(--a3)"/>
            </linearGradient>
          </defs>
          <circle r="9" fill="url(#ia-g)" class="ia-core"/>
          <g class="ia-orbit"><ellipse rx="52" ry="18"/><circle class="ia-e" r="4"><animateMotion dur="2.4s" repeatCount="indefinite" path="M52,0 A52,18 0 1,1 -52,0 A52,18 0 1,1 52,0"/></circle></g>
          <g class="ia-orbit" style="--r:60deg"><ellipse rx="52" ry="18"/><circle class="ia-e" r="4"><animateMotion dur="3s" begin="-1s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear" path="M52,0 A52,18 0 1,1 -52,0 A52,18 0 1,1 52,0"/></circle></g>
          <g class="ia-orbit" style="--r:120deg"><ellipse rx="52" ry="18"/><circle class="ia-e" r="4"><animateMotion dur="2.7s" begin="-2s" repeatCount="indefinite" path="M52,0 A52,18 0 1,1 -52,0 A52,18 0 1,1 52,0"/></circle></g>
        </svg>
        <h1 class="intro-word"><span>ScienceTube</span></h1>
        <p class="intro-tag"><span class="intro-count">Hundreds of</span> games · zero installs · all right here</p>
        <div class="intro-cta">
          <button class="intro-play" type="button">
            <span class="intro-play-ring" aria-hidden="true"></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>
            <span>Start playing</span>
          </button>
          <button class="intro-enter" type="button">Explore the site first</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.body.classList.add("intro-on");
    window.NebulaBG && NebulaBG.setHold && NebulaBG.setHold(true);

    fetch("/config/games.json").then((r) => r.json()).then((l) => { if (l.length) root.querySelector(".intro-count").textContent = l.length; }).catch(() => {});

    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const stage = root.querySelector(".intro-stage");
    const playBtn = root.querySelector(".intro-play");
    let raf = 0, w = 0, h = 0, dpr = 1, t0 = performance.now(), phase = "warp", burstAt = 0;
    let stars = [], dots = [], buckets = [];
    const mouse = { x: -9999, y: -9999 };
    const C = [rgb(css("--a1")), rgb(css("--a2")), rgb(css("--a3"))];

    // Timeline (ms)
    const WARP_END = 1900, FORM_END = 3300, READY = 3500;

    function layout() {
      dpr = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5);
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      buildWord();
    }

    function buildStars() {
      const n = lowPower ? 260 : 520;
      stars = Array.from({ length: n }, () => newStar(true));
    }
    function newStar(spread) {
      const a = Math.random() * Math.PI * 2, r = 0.02 + Math.random() * 1.2;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: spread ? Math.random() * 1.6 + 0.05 : 1.6, pz: 0, c: (Math.random() * 3) | 0 };
    }

    // Sample the wordmark into target points. The DOM h1 sits exactly where
    // the particles land, so it can crossfade in for crisp edges.
    function buildWord() {
      const word = root.querySelector(".intro-word span");
      const box = word.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(word).fontSize);
      const off = document.createElement("canvas");
      off.width = Math.ceil(box.width + 20); off.height = Math.ceil(box.height + 20);
      const o = off.getContext("2d");
      o.fillStyle = "#fff";
      o.textBaseline = "middle"; o.textAlign = "center";
      o.font = getComputedStyle(word).font || `900 ${fs}px sans-serif`;
      o.fillText("ScienceTube", off.width / 2, off.height / 2);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const max = lowPower ? 1600 : 3600;
      let gap = Math.max(2, Math.round(fs / 34));
      const pts = [];
      const sample = () => {
        pts.length = 0;
        for (let y = 0; y < off.height; y += gap) for (let x = 0; x < off.width; x += gap) {
          if (data[(y * off.width + x) * 4 + 3] > 140) pts.push([x, y]);
        }
      };
      sample();
      while (pts.length > max) { gap++; sample(); }
      const ox = box.left - 10, oy = box.top - 10;
      const cx = w / 2, cy = h / 2;
      const old = dots;
      dots = pts.map(([x, y], i) => {
        const tx = ox + x, ty = oy + y;
        const prev = old[i];
        // Start each dot somewhere out in the warp field.
        const a = Math.random() * Math.PI * 2, r = Math.max(w, h) * (0.55 + Math.random() * 0.6);
        return {
          tx, ty,
          x: prev ? prev.x : cx + Math.cos(a) * r, y: prev ? prev.y : cy + Math.sin(a) * r,
          sx: cx + Math.cos(a) * r, sy: cy + Math.sin(a) * r,
          vx: 0, vy: 0, d: Math.random() * 380, s: gap * 0.7, ph: Math.random() * 6.28,
          b: Math.min(11, Math.max(0, Math.floor(((tx - box.left) / box.width) * 12))),
        };
      });
      buckets = Array.from({ length: 12 }, (_, i) => {
        const t = i / 11;
        const c = t < 0.55 ? mix(C[0], C[1], t / 0.55) : mix(C[1], C[2], (t - 0.55) / 0.45);
        return `rgb(${c[0]},${c[1]},${c[2]})`;
      });
    }

    function frame(now) {
      const t = now - t0;
      // Motion-blur trail: fade the last frame instead of clearing it.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = phase === "warp" || t < FORM_END ? "rgba(5,4,12,0.32)" : "rgba(5,4,12,0.5)";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2, focal = Math.max(w, h) * 0.55;
      // Warp speed ramps up, then brakes hard as the word forms.
      const speed = t < WARP_END ? 0.004 + easeInOut(t / WARP_END) * 0.05 : Math.max(0.0012, 0.054 * (1 - ease((t - WARP_END) / 900)));
      const starAlpha = t < WARP_END ? 1 : Math.max(0.35, 1 - (t - WARP_END) / 1600);

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed;
        if (s.z <= 0.04) { stars[i] = newStar(false); continue; }
        const x = cx + (s.x / s.z) * focal, y = cy + (s.y / s.z) * focal;
        const px = cx + (s.x / s.pz) * focal, py = cy + (s.y / s.pz) * focal;
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) { stars[i] = newStar(false); continue; }
        const near = 1 - s.z / 1.6;
        const c = C[s.c];
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.25 + near * 0.75) * starAlpha})`;
        ctx.lineWidth = 0.6 + near * 2.2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      }

      // Central glow that swells into a flash as the word lands.
      const flash = t > FORM_END - 250 && t < FORM_END + 700 ? Math.sin(Math.PI * (t - (FORM_END - 250)) / 950) : 0;
      const coreR = Math.min(w, h) * (0.18 + (t < WARP_END ? t / WARP_END : 1) * 0.22);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * (1 + flash));
      g.addColorStop(0, `rgba(${C[0][0]},${C[0][1]},${C[0][2]},${0.18 + flash * 0.35})`);
      g.addColorStop(0.5, `rgba(${C[1][0]},${C[1][1]},${C[1][2]},${0.07 + flash * 0.15})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Shockwave ring when the word snaps together.
      if (t > FORM_END - 120 && t < FORM_END + 900) {
        const p = (t - (FORM_END - 120)) / 1020;
        ctx.strokeStyle = `rgba(${C[2][0]},${C[2][1]},${C[2][2]},${(1 - p) * 0.7})`;
        ctx.lineWidth = 2 + (1 - p) * 6;
        ctx.beginPath(); ctx.ellipse(cx, cy * 0.96, ease(p) * w * 0.6, ease(p) * w * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
      }

      // Word particles
      if (t > WARP_END - 700) {
        const formStart = WARP_END - 700;
        for (const d of dots) {
          if (phase === "burst") {
            d.vx *= 1.04; d.vy *= 1.04; d.vy += 0.05;
            d.x += d.vx; d.y += d.vy;
          } else {
            const p = ease((t - formStart - d.d) / (FORM_END - formStart - 380));
            if (p < 1) {
              // Curve in along a slight spiral for a more organic arrival.
              const k = 1 - p, sw = Math.sin(p * Math.PI) * 60 * (d.ph > 3.14 ? 1 : -1);
              d.x = d.tx + (d.sx - d.tx) * k + sw * k;
              d.y = d.ty + (d.sy - d.ty) * k - sw * k * 0.5;
            } else {
              // Settled: shimmer gently and shy away from the cursor.
              const dx = d.x - mouse.x, dy = d.y - mouse.y, dist = dx * dx + dy * dy;
              if (dist < 6400) { const f = (6400 - dist) / 6400 * 2.2, l = Math.sqrt(dist) || 1; d.vx += (dx / l) * f; d.vy += (dy / l) * f; }
              d.vx += (d.tx - d.x) * 0.06; d.vy += (d.ty - d.y) * 0.06;
              d.vx *= 0.82; d.vy *= 0.82;
              d.x += d.vx; d.y += d.vy;
            }
          }
        }
        ctx.globalCompositeOperation = "source-over";
        for (let b = 0; b < 12; b++) {
          ctx.fillStyle = buckets[b];
          for (const d of dots) {
            if (d.b !== b) continue;
            const tw = phase === "burst" ? 1 : 0.75 + Math.sin(now * 0.004 + d.ph) * 0.25;
            const s = d.s * tw;
            ctx.fillRect(d.x - s / 2, d.y - s / 2, s, s);
          }
        }
      }

      if (phase === "warp" && t > FORM_END) { phase = "ready"; root.classList.add("formed"); }
      if (phase === "ready" && t > READY && !root.classList.contains("ready")) { root.classList.add("ready"); playBtn.focus({ preventScroll: true, focusVisible: false }); }
      if (phase === "burst" && now - burstAt > 900) return;
      raf = requestAnimationFrame(frame);
    }

    function toReady() {
      // Skip the warp: jump straight to the formed word and button.
      t0 = performance.now() - READY;
      for (const d of dots) { d.x = d.tx; d.y = d.ty; }
      phase = "ready";
      root.classList.add("formed", "ready", "instant");
      playBtn.focus({ preventScroll: true, focusVisible: false });
    }

    function leave(hash) {
      if (root.classList.contains("leaving")) return;
      if (hash && location.hash !== hash) location.hash = hash;
      if (!reduced) {
        phase = "burst"; burstAt = performance.now();
        const cx = w / 2, cy = h / 2;
        for (const d of dots) {
          const dx = d.x - cx, dy = d.y - cy, l = Math.hypot(dx, dy) || 1;
          const f = 4 + Math.random() * 10;
          d.vx = (dx / l) * f; d.vy = (dy / l) * f - 2;
        }
      }
      root.classList.add("leaving");
      document.body.classList.add("intro-reveal");
      setTimeout(finish, reduced ? 350 : 900);
    }

    function finish() {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      removeEventListener("keydown", onKey, true);
      root.remove();
      document.body.classList.remove("intro-on", "intro-reveal");
      window.NebulaBG && NebulaBG.setHold && NebulaBG.setHold(false);
      const v = document.getElementById("view"); v && v.focus({ preventScroll: true });
      active = null;
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); root.classList.contains("ready") ? leave() : toReady(); }
      else if (e.key === "Enter" && root.classList.contains("ready") && document.activeElement === document.body) { e.preventDefault(); leave("#/games"); }
      else e.stopPropagation(); // keep site shortcuts (R, 1-9, panic is handled below) quiet
      const panic = get("panic", { key: "`", url: "https://classroom.google.com" });
      if (!panic.off && e.key === panic.key) location.replace(panic.url);
    }
    let rz;
    function onResize() { clearTimeout(rz); rz = setTimeout(() => { layout(); if (phase !== "warp") for (const d of dots) { d.x = d.tx; d.y = d.ty; } }, 120); }

    root.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    root.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    root.addEventListener("click", (e) => { if (!root.classList.contains("ready") && !e.target.closest("button")) toReady(); });
    root.querySelector(".intro-skip").onclick = () => leave();
    root.querySelector(".intro-enter").onclick = () => leave();
    playBtn.onclick = () => leave("#/games");
    // Magnetic button: it leans toward the cursor.
    playBtn.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = playBtn.getBoundingClientRect();
      playBtn.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5) * 14 + "px");
      playBtn.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5) * 10 + "px");
    });
    playBtn.addEventListener("pointerleave", () => { playBtn.style.setProperty("--tx", "0px"); playBtn.style.setProperty("--ty", "0px"); });
    addEventListener("keydown", onKey, true);
    addEventListener("resize", onResize);

    active = { leave };

    if (reduced) {
      root.querySelectorAll("animateMotion").forEach((a) => a.remove());
      root.classList.add("formed", "ready");
      ctx.fillStyle = "#05040c"; // static backdrop only
      setTimeout(() => playBtn.focus({ preventScroll: true, focusVisible: false }), 50);
      return;
    }
    // Wait for the web font metrics so particles line up with the real text.
    (document.fonts && document.fonts.ready || Promise.resolve()).then(() => {
      if (!root.isConnected) return;
      layout();
      t0 = performance.now();
      ctx.fillStyle = "#05040c"; ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(frame);
      if (auto && document.hidden) toReady();
    });
  }

  window.STIntro = { play, skip: () => active && active.leave() };
  // Wait for app.js to apply the saved theme and settings first.
  if (shouldAutoPlay()) {
    document.body.classList.add("intro-on"); // hide the site right away, no flash
    const start = () => { try { play({ auto: true }); } catch (e) { console.error(e); document.body.classList.remove("intro-on"); } };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
})();
