# ScienceTube

A games site with a built-in web proxy. Every game is hosted in this repo (no third-party embeds), and a sidebar ties the sections together.

## Features

- **Arrival intro**: a warp-speed jump through the stars that pulls together into the ScienceTube wordmark, then a "Start playing" button. Shown once per visit on the home page, skippable with `Esc`, calm and static with reduced motion, and replayable or switchable off in Settings.
- **Polish**: sliding sidebar highlight, page and scroll animations, a scrolling strip of game covers on Home, holographic card sheen, a game loading screen with tips, rail arrows, back-to-top, a `?` shortcut sheet and a bottom tab bar on phones.
- **Games**: 145 self-hosted games with search, A to Z filter, sorting, favorites, recently played and play counts, all saved in the browser.
- **Web proxy**: browse any site through your own private, password-protected proxy server. Built on [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) with a Wisp WebSocket tunnel, so the local network only sees a connection to that server.
- **Interactive sidebar**: collapsible, mobile drawer, number-key shortcuts, and "coming soon" slots for future sections.
- **Search everything** with `Ctrl K` or `/`: games, sections, or any web address (opens in the proxy).
- **Apps**: calculator, notes, paint, timer and stopwatch, unit converter, to-do list and a code playground. Each is a self-contained page in `apps/` that opens inside the site.
- **Chat**: rooms with nicknames. On Netlify it works out of the box through a small serverless function that stores messages in Netlify Blobs.
- **Tools**: about:blank launcher, tab disguise (title and icon), panic key.
- **Settings**: five color themes, animated background toggle, reduce motion, intro on/off and replay, compact sidebar, proxy search engine.

## Running it

The site (games, apps, chat) runs on Netlify. The web proxy runs on a separate private server that you control, locked with a password, and the Proxy tab connects to it.

**Setting up the proxy server:** follow [proxy-server/README.md](proxy-server/README.md). It walks through a free Oracle Cloud VM and a one-command setup script that installs the proxy, sets the password and gets an HTTPS certificate.

The proxy blocks requests to private and loopback addresses so it can't be used to reach the server's own network.

### Running everything locally

```bash
npm install
npm run build      # copies the proxy's browser files into uv/, baremux/, epoxy/
npm start          # site + proxy at http://localhost:8080 (set PORT to change)
```

Without `PROXY_PASSWORD_HASH` the local proxy has no password. To try the password lock, make a hash with `node server.js --hash-password` (type the password, then Ctrl-D) and start with `PROXY_PASSWORD_HASH='<hash>' npm start`.

Note: the repo is about 1.4 GB because of the game files, which is over GitHub Pages' 1 GB limit.

### Chat

On Netlify, chat needs no setup. `netlify/functions/chat.mjs` answers `/api/chat` and keeps the last 150 messages per room in Netlify Blobs. Browsers check for new messages every 3 seconds while the chat is open (every 15 seconds in a background tab). The function only accepts the four rooms, caps names at 24 and messages at 500 characters, and rate-limits sending.

Each check is one function call, so very busy chat uses up Netlify's free allowance faster. To move chat off Netlify, you can use a free Firebase Realtime Database instead, which is also instant:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) and add a Realtime Database.
2. In its Rules tab, paste `database.rules.json` from this repo and publish.
3. Put the database URL in `databaseURL` in `js/chat-config.js` and deploy.

With neither available (for example a plain static server), chat runs in a labelled demo mode that only reaches tabs in the same browser.

## Project layout

```
index.html        app shell (sidebar, views are rendered by js/app.js)
css/app.css       all styles and themes
css/intro.css     arrival intro styles
js/intro.js       arrival intro animation (canvas)
js/fx.js          interface polish: nav highlight, reveals, ripples, shortcut sheet, mobile tab bar
js/app.js         router, sidebar, games, proxy UI, tools, settings, search palette
js/bg.js          animated canvas background
js/proxy.js       proxy client (Ultraviolet + bare-mux + Epoxy) and sign-in
js/proxy-config.js  address of your private proxy server
js/chat.js        chat client (Netlify function, Firebase, or local demo)
netlify/functions/chat.mjs  chat backend on Netlify (messages in Netlify Blobs)
js/chat-config.js chat database URL and room list
apps/<slug>/      the built-in apps (apps/app.css and apps/app.js are shared)
database.rules.json  Firebase rules for chat
js/main.js        tab disguise, also loaded by every game page
uv/uv.config.js   Ultraviolet config
server.js         proxy server (password lock + Wisp tunnel); also serves the site locally
proxy-server/     setup script and guide for the private proxy server
scripts/copy-proxy-assets.js  build step that copies the proxy's browser files
config/games.json game catalog
projects/<slug>/  the games
```

## Adding things

- **A game**: put it in `projects/<slug>/` and add `{ "link", "imgSrc", "title" }` to `config/games.json`.
- **An app**: put a page in `apps/<slug>/index.html` (include `/apps/app.css` and `/apps/app.js`) and add it to `APPS` in `js/app.js`.
- **A section**: add an entry to `SECTIONS` at the top of `js/app.js`, then a matching `VIEWS.<id>` render function. Entries marked `soon: true` show a teaser page until you build them.

## Credits

Based on [3kh0-lite](https://github.com/3kh0/3kh0-lite) by 3kh0. Games belong to their respective creators.
