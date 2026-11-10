# ScienceTube

A games site with a built-in web proxy. Every game is hosted in this repo (no third-party embeds), and a sidebar ties the sections together.

## Features

- **Games**: 145 self-hosted games with search, A to Z filter, sorting, favorites, recently played and play counts, all saved in the browser.
- **Web proxy**: browse any site through this server. Built on [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) with a Wisp WebSocket tunnel, so the local network only sees a connection to this site.
- **Interactive sidebar**: collapsible, mobile drawer, number-key shortcuts, and "coming soon" slots for future sections.
- **Search everything** with `Ctrl K` or `/`: games, sections, or any web address (opens in the proxy).
- **Tools**: about:blank launcher, tab disguise (title and icon), panic key.
- **Settings**: five color themes, animated background toggle, reduce motion, compact sidebar, proxy search engine.

## Running it

The proxy needs the Node server. Games alone work on any static host.

```bash
npm install
npm start          # http://localhost:8080  (set PORT to change)
```

### Hosting

| What you want | Where it works |
| --- | --- |
| Games and proxy | Any host that runs Node 18+ with WebSockets: Render, Railway, Fly.io, Koyeb, a VPS. Must be served over HTTPS (service workers require it). |
| Games only | Any static host (Netlify, Cloudflare Pages, Vercel). The proxy page will show that it's offline. |

Note: the repo is about 1.4 GB because of the game files, which is over GitHub Pages' 1 GB limit.

The proxy blocks requests to private and loopback addresses so it can't be used to reach the server's own network.

## Project layout

```
index.html        app shell (sidebar, views are rendered by js/app.js)
css/app.css       all styles and themes
js/app.js         router, sidebar, games, proxy UI, tools, settings, search palette
js/bg.js          animated canvas background
js/proxy.js       proxy client (Ultraviolet + bare-mux + Epoxy)
js/main.js        tab disguise, also loaded by every game page
uv/uv.config.js   Ultraviolet config
server.js         static server + Wisp proxy backend
config/games.json game catalog
projects/<slug>/  the games
```

## Adding things

- **A game**: put it in `projects/<slug>/` and add `{ "link", "imgSrc", "title" }` to `config/games.json`.
- **A section**: add an entry to `SECTIONS` at the top of `js/app.js`, then a matching `VIEWS.<id>` render function. Entries marked `soon: true` show a teaser page until you build them.

## Credits

Based on [3kh0-lite](https://github.com/3kh0/3kh0-lite) by 3kh0. Games belong to their respective creators.
