// ScienceTube chat backend for Netlify: a serverless function that stores
// messages in Netlify Blobs. Clients poll GET /api/chat for new messages and
// POST to send. No accounts or keys needed; it uses the site's own storage.
import { getStore } from "@netlify/blobs";

const ROOMS = new Set(["general", "games", "help", "random"]);
const KEEP = 150; // messages kept per room
const RETURN = 60; // messages returned to a newcomer
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const clean = (s, max) => String(s || "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);

export default async (req, context) => {
  const store = getStore({ name: "chat", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const room = url.searchParams.get("room") || "general";
    if (!ROOMS.has(room)) return json({ error: "Unknown room" }, 404);
    const since = url.searchParams.get("since") || "";
    const { blobs } = await store.list({ prefix: room + "/" });
    let keys = blobs.map((b) => b.key).sort();
    keys = since ? keys.filter((k) => k > since) : keys.slice(-RETURN);
    const messages = (await Promise.all(keys.map(async (k) => {
      const m = await store.get(k, { type: "json" });
      return m && { id: k, n: m.n, t: m.t, c: m.c, ts: m.ts };
    }))).filter(Boolean);
    return json({ messages });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
    const room = String(body.room || "");
    const n = clean(body.n, 24), t = clean(body.t, 500);
    const c = Number.isFinite(+body.c) ? Math.max(0, Math.min(359, Math.round(+body.c))) : 0;
    if (!ROOMS.has(room)) return json({ error: "Unknown room" }, 404);
    if (!n || !t) return json({ error: "Name and message are required" }, 400);

    // Simple rate limit: one message a second per visitor and nickname. Keyed on
    // both so classmates sharing one school IP don't block each other.
    const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown";
    const rlKey = "rl/" + (ip + "|" + n.toLowerCase()).replace(/[^\w.:|-]/g, "_");
    const last = await store.get(rlKey, { type: "json" });
    const now = Date.now();
    if (last && now - last.ts < 1000) return json({ error: "Slow down a little." }, 429);
    await store.setJSON(rlKey, { ts: now });

    const key = `${room}/${String(now).padStart(15, "0")}-${Math.random().toString(36).slice(2, 8)}`;
    const msg = { n, t, c, ts: now };
    await store.setJSON(key, msg);

    // Trim old messages so each room stays small and fast to read.
    const { blobs } = await store.list({ prefix: room + "/" });
    const old = blobs.map((b) => b.key).sort().slice(0, Math.max(0, blobs.length - KEEP));
    await Promise.all(old.map((k) => store.delete(k)));

    return json({ ok: true, message: { id: key, ...msg } });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/chat" };
