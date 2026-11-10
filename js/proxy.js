// Web proxy client. Wraps Ultraviolet + bare-mux + the Epoxy transport, which
// tunnels every request to our own server over a Wisp WebSocket.
// Needs the Node server (server.js); on a plain static host it reports offline.
(function () {
  let readyPromise = null;
  let online = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src; s.dataset.src = src;
      s.onload = resolve; s.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  async function check() {
    if (online !== null) return online;
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      online = r.ok && (await r.json()).proxy === true;
    } catch { online = false; }
    return online;
  }

  function waitForActive(reg) {
    const sw = reg.installing || reg.waiting || reg.active;
    if (!sw || sw.state === "activated") return Promise.resolve();
    return new Promise((resolve) => {
      sw.addEventListener("statechange", () => { if (sw.state === "activated") resolve(); });
    });
  }

  async function setup() {
    if (!(await check())) throw new Error("offline");
    if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers, which the proxy needs.");
    if (!window.isSecureContext) throw new Error("The proxy only works over HTTPS (or on localhost).");

    await loadScript("/baremux/index.js");
    await loadScript("/uv/uv.bundle.js");
    await loadScript("/uv/uv.config.js");

    const reg = await navigator.serviceWorker.register("/uv/sw.js", { scope: __uv$config.prefix });
    await waitForActive(reg);

    const wispUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/";
    const conn = new BareMux.BareMuxConnection("/baremux/worker.js");
    if ((await conn.getTransport()) !== "/epoxy/index.mjs") {
      await conn.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }
  }

  const ENGINES = {
    duckduckgo: "https://duckduckgo.com/?q=%s",
    brave: "https://search.brave.com/search?q=%s",
    google: "https://www.google.com/search?q=%s",
    bing: "https://www.bing.com/search?q=%s",
  };

  function toUrl(input, engine) {
    const text = input.trim();
    if (!text) return null;
    try {
      const u = new URL(text);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch {}
    if (/^[^\s]+\.[a-z]{2,}(?::\d+)?(\/\S*)?$/i.test(text)) return "https://" + text;
    return (ENGINES[engine] || ENGINES.duckduckgo).replace("%s", encodeURIComponent(text));
  }

  window.NebulaProxy = {
    engines: ENGINES,
    check,
    ready() {
      if (!readyPromise) readyPromise = setup().catch((e) => { readyPromise = null; throw e; });
      return readyPromise;
    },
    toUrl,
    encode(url) { return __uv$config.prefix + __uv$config.encodeUrl(url); },
    // Turns the frame's proxied location back into the real address.
    decode(loc) {
      try {
        const path = loc.pathname;
        if (!path.startsWith(__uv$config.prefix)) return null;
        return __uv$config.decodeUrl(path.slice(__uv$config.prefix.length));
      } catch { return null; }
    },
  };
})();
