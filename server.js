// Nebula Arcade server: serves the static site and powers the web proxy.
//
// The proxy uses Ultraviolet (a service-worker rewriting proxy). The browser
// rewrites every page it loads and tunnels the traffic to this server over a
// single WebSocket using the Wisp protocol, so the local network only ever
// sees a connection to this site, never the sites being visited.

const http = require("node:http");
const path = require("node:path");
const express = require("express");
const { server: wisp, logging } = require("@mercuryworkshop/wisp-js/server");
const { uvPath } = require("@titaniumnetwork-dev/ultraviolet");
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;

logging.set_level(logging.WARN);
// Never let the proxy reach the server's own machine or private network.
wisp.options.allow_loopback_ips = false;
wisp.options.allow_private_ips = false;

const app = express();
app.disable("x-powered-by");

// Keep server-side files private.
const PRIVATE = /^\/(node_modules|server\.js|package(-lock)?\.json|\.git)(\/|$)/i;
app.use((req, res, next) => (PRIVATE.test(req.path) ? res.status(404).end() : next()));

// Proxy client libraries. Our own uv.config.js in /uv/ wins over the stock one.
app.use("/uv/", express.static(path.join(ROOT, "uv")));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

// Lets the front end know the proxy backend is running.
app.get("/api/health", (req, res) => res.json({ ok: true, proxy: true }));

app.use(express.static(ROOT, { extensions: ["html"] }));
app.use((req, res) => res.status(404).sendFile(path.join(ROOT, "404.html")));

const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/wisp/")) return wisp.routeRequest(req, socket, head);
  socket.end();
});

server.listen(PORT, () => {
  console.log(`Nebula Arcade running at http://localhost:${PORT}`);
});
