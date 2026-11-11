# Deploying the ScienceTube backend on Velixir

This repository includes a `Procfile` with the web process command:

```text
web: npm start
```

Velixir detects Node.js from the root `package.json`. Its build pipeline installs dependencies and runs the package build script, which copies the Ultraviolet, BareMux, and Epoxy browser assets.

## App settings

- Source: this repository
- Branch: `deploy/velixir` (or the branch you merge these changes into)
- Root directory: repository root
- Runtime: Node.js 22
- Web process: `npm start`

The server uses the platform-provided `PORT`. It listens on all interfaces when `HOST` is unset.

## Required environment variables

Set these in the Velixir app's environment settings. Do not commit their values.

- `PROXY_PASSWORD_HASH`: required for private use. Generate it by running `node server.js --hash-password` locally and entering a password of at least 8 characters. Copy the printed scrypt hash into the app environment.
- `TOKEN_SECRET`: a long random secret. Generate one locally, for example with `openssl rand -hex 32`.
- `ALLOWED_ORIGINS`: the exact HTTPS origin of the Netlify frontend, for example `https://sciencetubelite.netlify.app`.

Do not leave `PROXY_PASSWORD_HASH` unset. Without it, the server deliberately allows anyone who can reach it to use the proxy.

## After deployment

1. Confirm the service is running by opening `https://YOUR-APP-HOST/api/health`. It should return JSON with `"ok": true` and `"auth": true`.
2. Confirm the hosting platform supports HTTP/1.1 WebSocket upgrades on the app's public endpoint. The ScienceTube tunnel requires WebSocket upgrades at `/wisp/<token>/`. A successful health check alone does not prove WebSocket support.
3. Set the backend URL in the ScienceTube frontend's Proxy tab, or in `js/proxy-config.js` as `server: "https://YOUR-APP-HOST"`, then redeploy the Netlify frontend if you edit the config file.

## Free-plan note

Velixir's free app sleeps when idle and wakes on incoming requests. The first connection after idle may have a cold-start delay. The free tier is small (0.25 vCPU, 256 MB RAM, 1 GB disk), so monitor the first deployment for memory or resource-limit errors.
