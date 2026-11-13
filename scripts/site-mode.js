// Picks which page the site opens on. Runs as part of the build.
//
//   SITE_MODE unset     the games site (index.html as committed)
//   SITE_MODE=school    the study desk: school.html becomes the home page, with
//                       the games and the proxy in its sidebar. The games home
//                       page stays reachable at /arcade.html.
//
// Set SITE_MODE in the host's environment variables (Netlify: Project
// configuration > Environment variables) so one repository can feed two sites.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const mode = (process.env.SITE_MODE || "").trim().toLowerCase();

if (mode === "school") {
  fs.copyFileSync(path.join(ROOT, "index.html"), path.join(ROOT, "arcade.html"));
  fs.copyFileSync(path.join(ROOT, "school.html"), path.join(ROOT, "index.html"));
  console.log("SITE_MODE=school: school.html is now the home page.");
} else if (mode) {
  console.error(`Unknown SITE_MODE "${mode}". Use "school" or leave it unset.`);
  process.exit(1);
} else {
  console.log("SITE_MODE not set: building the games site.");
}
