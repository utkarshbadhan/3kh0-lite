// Web proxy client. Wraps Ultraviolet + bare-mux + the Epoxy transport, which
// tunnels every request to the proxy server (server.js) over a Wisp WebSocket.
//
// The proxy server can be this same site, or a separate private server (for
// example an Oracle Cloud VM) that this site connects to. Set the address in
// js/proxy-config.js, or type it on the Proxy tab's sign-in screen.
(function () {
  const CFG = window.SCIENCETUBE_PROXY || {};
  const K_SERVER = "st-proxy-server", K_TOKEN = "st-proxy-token";
  let readyPromise = null;
  let state = null;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
  };

  function clean(url) {
    let u = String(url || "").trim().replace(/\/+$/, "");
    if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
    try { return new URL(u).origin; } catch { return ""; }
  }

  function server() { return clean(ls.get(K_SERVER) || CFG.server) || location.origin; }

  // Token is stored with the server it belongs to.
  function token() {
    try {
      const t = JSON.parse(ls.get(K_TOKEN) || "null");
      return t && t.server === server() && t.expires > Date.now() ? t.token : null;
    } catch { return null; }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src; s.dataset.src = src;
      s.onload = resolve; s.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  async function getJSON(url, opts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { cache: "no-store", ...opts, signal: ctrl.signal });
      let body = {};
      try { body = await r.json(); } catch {}
      return { status: r.status, ok: r.ok, body };
    } finally { clearTimeout(timer); }
  }

  // { online, auth, signedIn, server }
  async function status(force) {
    const srv = server();
    // Reuse the last answer briefly (a good one for longer) unless forced.
    if (state && !force && state.server === srv && Date.now() - state.at < (state.online && state.signedIn ? 300e3 : 15e3)) return state;
    const s = { server: srv, online: false, auth: false, signedIn: false, at: Date.now() };
    try {
      const h = await getJSON(srv + "/api/health");
      s.online = h.ok && h.body.proxy === true;
      s.auth = !!h.body.auth;
      if (s.online && !s.auth) s.signedIn = true;
      else if (s.online && token()) {
        const r = await getJSON(srv + "/api/session", { headers: { Authorization: "Bearer " + token() } });
        s.signedIn = r.ok;
        if (r.status === 401) ls.set(K_TOKEN, null);
      }
    } catch {}
    state = s;
    return s;
  }

  async function login(password, srvInput) {
    if (srvInput !== undefined) {
      const c = clean(srvInput);
      if (!c) throw new Error("That server address doesn't look right.");
      ls.set(K_SERVER, c === clean(CFG.server) ? null : c);
    }
    const srv = server();
    let r;
    try {
      r = await getJSON(srv + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      state = null;
      throw new Error(`Can't reach the proxy server at ${srv}.`);
    }
    if (!r.ok) throw new Error(r.body.error || "Sign-in failed.");
    ls.set(K_TOKEN, JSON.stringify({ server: srv, token: r.body.token, expires: r.body.expires }));
    readyPromise = null;
    await status(true);
    return state;
  }

  function logout() {
    ls.set(K_TOKEN, null);
    readyPromise = null;
    if (state) state = { ...state, signedIn: !state.auth };
  }

  function waitForActive(reg) {
    const sw = reg.installing || reg.waiting || reg.active;
    if (!sw || sw.state === "activated") return Promise.resolve();
    return new Promise((resolve) => {
      sw.addEventListener("statechange", () => { if (sw.state === "activated") resolve(); });
    });
  }

  async function setup() {
    const s = await status();
    if (!s.online) throw new Error("offline");
    if (!s.signedIn) throw new Error("signin");
    if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers, which the proxy needs.");
    if (!window.isSecureContext) throw new Error("The proxy only works over HTTPS (or on localhost).");

    // These files come from this site itself (service workers must be same-origin).
    await loadScript("/baremux/index.js");
    await loadScript("/uv/uv.bundle.js");
    await loadScript("/uv/uv.config.js");

    const reg = await navigator.serviceWorker.register("/uv/sw.js", { scope: __uv$config.prefix });
    await waitForActive(reg);

    const wispUrl = s.server.replace(/^http/, "ws") + "/wisp/" + (s.auth ? token() + "/" : "");
    const conn = new BareMux.BareMuxConnection("/baremux/worker.js");
    // Always set it: the address carries the sign-in token, which can change.
    await conn.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
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
    status,
    // True when the proxy is reachable and this browser may use it.
    async check() { const s = await status(); return s.online && s.signedIn; },
    server,
    login,
    logout,
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
