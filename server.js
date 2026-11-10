// ScienceTube server: powers the web proxy, and serves the site too when the
// site's files are next to it.
//
// The proxy uses Ultraviolet (a service-worker rewriting proxy). The browser
// rewrites every page it loads and tunnels the traffic to this server over a
// single WebSocket using the Wisp protocol, so the local network only ever
// sees a connection to this server, never the sites being visited.
//
// Private mode: set PROXY_PASSWORD_HASH (make one with
// `node server.js --hash-password`) and only people who sign in with the
// password can use the tunnel. The site can live somewhere else (for example
// Netlify) and connect here; list its address in ALLOWED_ORIGINS.
//
// Settings (environment variables):
//   PORT                 port to listen on (default 8080)
//   HOST                 address to listen on (default: all)
//   PROXY_PASSWORD_HASH  scrypt hash of the password; unset = no password
//   TOKEN_SECRET         random string used to sign sign-in tokens
//   ALLOWED_ORIGINS      comma-separated sites allowed to use this server,
//                        e.g. https://sciencetubelite.netlify.app ("*" = any)
//   SESSION_DAYS         how long a sign-in lasts (default 30)
//   BEHIND_PROXY         set to 1 when running behind Caddy/nginx

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");

// `node server.js --hash-password` reads a password and prints its hash.
if (process.argv[2] === "--hash-password") {
  let input = "";
  process.stdin.on("data", (d) => (input += d));
  process.stdin.on("end", () => {
    const pw = input.replace(/\r?\n$/, "");
    if (pw.length < 8) { console.error("Password must be at least 8 characters."); process.exit(1); }
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(pw, salt, 32);
    console.log(`scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`);
  });
  return;
}

const express = require("express");
const { server: wisp, logging } = require("@mercuryworkshop/wisp-js/server");
const { uvPath } = require("@titaniumnetwork-dev/ultraviolet");
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || undefined;
const ROOT = __dirname;
const SERVE_SITE = fs.existsSync(path.join(ROOT, "index.html"));
const PASSWORD_HASH = (process.env.PROXY_PASSWORD_HASH || "").trim();
const AUTH = PASSWORD_HASH !== "";
const SESSION_MS = (Number(process.env.SESSION_DAYS) || 30) * 864e5;
const ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
// Changing the password signs everyone out, because the hash is part of the key.
const TOKEN_KEY = crypto.createHash("sha256")
  .update((process.env.TOKEN_SECRET || crypto.randomBytes(32).toString("hex")) + "|" + PASSWORD_HASH)
  .digest();

if (AUTH && !/^scrypt:[\w-]+:[\w-]+$/.test(PASSWORD_HASH)) {
  console.error("PROXY_PASSWORD_HASH is not valid. Make one with: node server.js --hash-password");
  process.exit(1);
}
if (!AUTH) console.warn("Warning: no PROXY_PASSWORD_HASH set, so anyone who can reach this server can use the proxy.");

logging.set_level(logging.WARN);
// Never let the proxy reach the server's own machine or private network.
wisp.options.allow_loopback_ips = false;
wisp.options.allow_private_ips = false;

/* ---------- Sign-in tokens ---------- */
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sign = (data) => b64(crypto.createHmac("sha256", TOKEN_KEY).update(data).digest());

function makeToken() {
  const body = b64(JSON.stringify({ exp: Date.now() + SESSION_MS, n: b64(crypto.randomBytes(6)) }));
  return { token: body + "." + sign(body), expires: Date.now() + SESSION_MS };
}

function tokenOk(token) {
  if (!AUTH) return true;
  if (typeof token !== "string") return false;
  const [body, mac] = token.split(".");
  if (!body || !mac) return false;
  const want = Buffer.from(sign(body)), got = Buffer.from(mac);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return false;
  try { return JSON.parse(Buffer.from(body, "base64url")).exp > Date.now(); } catch { return false; }
}

function passwordOk(pw) {
  if (typeof pw !== "string" || !pw || pw.length > 256) return false;
  const [, salt, hash] = PASSWORD_HASH.split(":");
  const want = Buffer.from(hash, "base64url");
  const got = crypto.scryptSync(pw, Buffer.from(salt, "base64url"), want.length);
  return crypto.timingSafeEqual(want, got);
}

// Slow down password guessing: 8 wrong tries per address per 15 minutes.
const failures = new Map();
const LIMIT = 8, WINDOW = 15 * 60e3;
function tooMany(ip) {
  const f = failures.get(ip);
  if (f && Date.now() - f.since > WINDOW) failures.delete(ip);
  return (failures.get(ip)?.count || 0) >= LIMIT;
}
function recordFailure(ip) {
  const f = failures.get(ip) || { count: 0, since: Date.now() };
  f.count++; failures.set(ip, f);
}
setInterval(() => { for (const [ip, f] of failures) if (Date.now() - f.since > WINDOW) failures.delete(ip); }, WINDOW).unref();

const originOk = (origin) => !origin || ORIGINS.includes("*") || ORIGINS.includes(origin);

/* ---------- HTTP ---------- */
const app = express();
app.disable("x-powered-by");
if (process.env.BEHIND_PROXY === "1") app.set("trust proxy", "loopback");

// Let the site (which may be on another domain) talk to the API.
app.use("/api/", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && originOk(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  res.set("Cache-Control", "no-store");
  next();
});

// Lets the front end know the proxy is running and whether it needs a password.
app.get("/api/health", (req, res) => res.json({ ok: true, proxy: true, auth: AUTH }));

app.post("/api/login", express.json({ limit: "2kb" }), (req, res) => {
  if (!AUTH) return res.json(makeToken());
  if (!originOk(req.headers.origin)) return res.status(403).json({ error: "This site isn't allowed to use this server." });
  if (tooMany(req.ip)) return res.status(429).json({ error: "Too many wrong passwords. Try again in 15 minutes." });
  if (!passwordOk(req.body && req.body.password)) {
    recordFailure(req.ip);
    return res.status(401).json({ error: "Wrong password." });
  }
  failures.delete(req.ip);
  res.json(makeToken());
});

app.get("/api/session", (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  res.status(tokenOk(token) ? 200 : 401).json({ ok: tokenOk(token) });
});

// Proxy client libraries. Our own uv.config.js in /uv/ wins over the stock one.
app.use("/uv/", express.static(path.join(ROOT, "uv")));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

if (SERVE_SITE) {
  // Keep server-side files private.
  const PRIVATE = /^\/(node_modules|server\.js|package(-lock)?\.json|\.git|\.env|proxy-server|scripts)(\/|$)/i;
  app.use((req, res, next) => (PRIVATE.test(req.path) ? res.status(404).end() : next()));
  app.use(express.static(ROOT, { extensions: ["html"] }));
  app.use((req, res) => res.status(404).sendFile(path.join(ROOT, "404.html")));
} else {
  app.get("/", (req, res) => res.type("text").send("ScienceTube proxy server is running. Open the Proxy tab on your ScienceTube site to use it."));
  app.use((req, res) => res.status(404).type("text").send("Not found"));
}

/* ---------- Wisp tunnel ---------- */
// The browser connects to /wisp/<token>/ (WebSockets can't send headers).
const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
  const m = /^\/wisp\/(?:([\w.-]+)\/)?$/.exec(req.url.split("?")[0]);
  if (!m || !originOk(req.headers.origin) || !tokenOk(m[1])) {
    socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    return;
  }
  req.url = "/wisp/";
  wisp.routeRequest(req, socket, head);
});

server.listen(PORT, HOST, () => {
  console.log(`ScienceTube ${SERVE_SITE ? "site and proxy" : "proxy server"} running at http://localhost:${PORT}${AUTH ? " (password protected)" : ""}`);
});
