# ScienceTube

A games site with a built-in web proxy. Every game is hosted in this repo (no third-party embeds), and a sidebar ties the sections together.

## Features

- **Games**: 145 self-hosted games with search, A to Z filter, sorting, favorites, recently played and play counts, all saved in the browser.
- **Web proxy**: browse any site through this server. Built on [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) with a Wisp WebSocket tunnel, so the local network only sees a connection to this site.
- **Interactive sidebar**: collapsible, mobile drawer, number-key shortcuts, and "coming soon" slots for future sections.
- **Search everything** with `Ctrl K` or `/`: games, sections, or any web address (opens in the proxy).
- **Apps**: calculator, notes, paint, timer and stopwatch, unit converter, to-do list and a code playground. Each is a self-contained page in `apps/` that opens inside the site.
- **Chat**: rooms with nicknames. On Netlify it works out of the box through a small serverless function that stores messages in Netlify Blobs.
- **Tools**: about:blank launcher, tab disguise (title and icon), panic key.
- **Settings**: five color themes, animated background toggle, reduce motion, compact sidebar, proxy search engine.

## Running it

The proxy needs the Node server. Games alone work on any static host.

```bash
npm install
npm start          # http://localhost:8080  (set PORT to change)
```

### Hosting

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/utkarshbadhan/3kh0-lite)

The button uses `render.yaml` and gives you the full site, proxy included, on Render's free plan. `netlify.toml` is there for a games-only static deploy.

| What you want | Where it works |
| --- | --- |
| Games and proxy | Any host that runs Node 18+ with WebSockets: Render, Railway, Fly.io, Koyeb, a VPS. Must be served over HTTPS (service workers require it). |
| Games only | Any static host (Netlify, Cloudflare Pages, Vercel). The proxy page will show that it's offline. |

Note: the repo is about 1.4 GB because of the game files, which is over GitHub Pages' 1 GB limit.

The proxy blocks requests to private and loopback addresses so it can't be used to reach the server's own network.

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
js/app.js         router, sidebar, games, proxy UI, tools, settings, search palette
js/bg.js          animated canvas background
js/proxy.js       proxy client (Ultraviolet + bare-mux + Epoxy)
js/chat.js        chat client (Netlify function, Firebase, or local demo)
netlify/functions/chat.mjs  chat backend on Netlify (messages in Netlify Blobs)
js/chat-config.js chat database URL and room list
apps/<slug>/      the built-in apps (apps/app.css and apps/app.js are shared)
database.rules.json  Firebase rules for chat
js/main.js        tab disguise, also loaded by every game page
uv/uv.config.js   Ultraviolet config
server.js         static server + Wisp proxy backend
config/games.json game catalog
projects/<slug>/  the games
```

## Adding things

- **A game**: put it in `projects/<slug>/` and add `{ "link", "imgSrc", "title" }` to `config/games.json`.
- **An app**: put a page in `apps/<slug>/index.html` (include `/apps/app.css` and `/apps/app.js`) and add it to `APPS` in `js/app.js`.
- **A section**: add an entry to `SECTIONS` at the top of `js/app.js`, then a matching `VIEWS.<id>` render function. Entries marked `soon: true` show a teaser page until you build them.

## Credits

Based on [3kh0-lite](https://github.com/3kh0/3kh0-lite) by 3kh0. Games belong to their respective creators.
