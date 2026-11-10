// Copies the proxy's browser files (Ultraviolet, bare-mux, Epoxy) out of
// node_modules so a static host such as Netlify can serve them. The proxy's
// service worker has to come from the same site as the page, even when the
// proxy server itself runs somewhere else. Runs as Netlify's build command.
const fs = require("node:fs");
const path = require("node:path");
const { uvPath } = require("@titaniumnetwork-dev/ultraviolet");
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");

const ROOT = path.join(__dirname, "..");
const copy = (from, to, skip = []) => {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    if (skip.includes(f) || f.endsWith(".map") || f.endsWith(".d.ts")) continue;
    fs.copyFileSync(path.join(from, f), path.join(to, f));
  }
};
copy(uvPath, path.join(ROOT, "uv"), ["uv.config.js"]); // keep our own config
copy(baremuxPath, path.join(ROOT, "baremux"));
copy(epoxyPath, path.join(ROOT, "epoxy"));
console.log("Proxy browser files copied to uv/, baremux/ and epoxy/.");
