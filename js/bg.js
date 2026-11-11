// Animated background: drifting aurora blobs plus a star field that links up
// around the cursor. Pauses itself while a game or the proxy is open so games
// get the full CPU/GPU.
(function () {
  const canvas = document.getElementById("bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0, h = 0, dpr = 1, raf = 0, running = false, enabled = true, paused = false, hold = false;
  let colors = [];
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  let stars = [], blobs = [];

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    colors = ["--a1", "--a2", "--a3"].map((v) => s.getPropertyValue(v).trim() || "#8b5cf6");
  }

  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(140, (w * h) / 11000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.3, tw: Math.random() * Math.PI * 2,
    }));
    blobs = [0, 1, 2, 3].map((i) => ({
      c: i % 3, x: Math.random() * w, y: Math.random() * h,
      r: Math.max(w, h) * (0.32 + Math.random() * 0.18),
      sx: 0.00012 + Math.random() * 0.0002, sy: 0.0001 + Math.random() * 0.0002, p: Math.random() * 10,
    }));
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);

    // Aurora blobs
    ctx.globalCompositeOperation = "lighter";
    for (const b of blobs) {
      const x = b.x + Math.sin(t * b.sx + b.p) * w * 0.22;
      const y = b.y + Math.cos(t * b.sy + b.p) * h * 0.22;
      const [r, g, bl] = hexToRgb(colors[b.c]);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      grd.addColorStop(0, `rgba(${r},${g},${bl},0.22)`);
      grd.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = "source-over";

    // Stars + cursor constellation
    mouse.x += (mouse.tx - mouse.x) * 0.12;
    mouse.y += (mouse.ty - mouse.y) * 0.12;
    const [lr, lg, lb] = hexToRgb(colors[2]);
    for (const s of stars) {
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
      const dx = s.x - mouse.x, dy = s.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140) { s.x += (dx / d) * 0.6; s.y += (dy / d) * 0.6; }
      const a = 0.35 + Math.sin(t * 0.002 + s.tw) * 0.25;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      if (d < 180) {
        ctx.strokeStyle = `rgba(${lr},${lg},${lb},${(1 - d / 180) * 0.5})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function sync() {
    const should = enabled && !paused && !hold && !document.hidden && !reduced;
    if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    canvas.style.opacity = !enabled ? "0" : paused ? "0.55" : "1";
  }

  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { mouse.tx = e.clientX; mouse.ty = e.clientY; });
  addEventListener("pointerleave", () => { mouse.tx = mouse.ty = -9999; });
  document.addEventListener("visibilitychange", sync);

  readColors();
  resize();
  if (reduced) { frame(0); cancelAnimationFrame(raf); }
  sync();

  window.NebulaBG = {
    refresh() { readColors(); if (!running) { frame(performance.now()); cancelAnimationFrame(raf); } },
    setEnabled(v) { enabled = v; sync(); },
    setPaused(v) { paused = v; sync(); },
    // The arrival intro covers the screen, so stop drawing underneath it.
    setHold(v) { hold = v; sync(); },
  };
})();
