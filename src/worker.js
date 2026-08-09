import { DurableObject } from "cloudflare:workers";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_STATE_BYTES = 200_000;
const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function boardCode(value) {
  const code = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{6}$/.test(code) ? code : "";
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

function token() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const match = url.pathname.match(/^\/api\/boards\/([A-Za-z0-9]{6})\/(create|join|snapshot|ws)$/);
      if (!match) return json({ error: "Unknown board endpoint." }, 404);
      const code = boardCode(match[1]);
      if (!code) return json({ error: "Invalid board code." }, 400);
      const stub = env.BOARDS.getByName(code);
      return stub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export class SharedBoard extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async getMeta() { return (await this.ctx.storage.get("meta")) || null; }

  async touch(meta) {
    const now = Date.now();
    meta.lastActivity = now;
    meta.expiresAt = now + RETENTION_MS;
    await this.ctx.storage.put("meta", meta);
    await this.ctx.storage.setAlarm(meta.expiresAt);
    return meta;
  }

  async issueSession(clientId = "") {
    const value = token();
    await this.ctx.storage.put(`session:${value}`, { createdAt: Date.now(), clientId: String(clientId || "").slice(0, 100) });
    return value;
  }

  async validSession(value) {
    if (!value) return false;
    return Boolean(await this.ctx.storage.get(`session:${value}`));
  }

  async verifyPin(meta, pin) {
    if (!meta || !/^\d{4}$/.test(String(pin || ""))) return false;
    return (await sha256(`${meta.pinSalt}:${pin}`)) === meta.pinHash;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.split("/").filter(Boolean).pop();
    if (action === "create") return this.create(request);
    if (action === "join") return this.join(request);
    if (action === "snapshot") return this.snapshot(request);
    if (action === "ws") return this.websocket(request);
    return json({ error: "Unknown action." }, 404);
  }

  async create(request) {
    if (request.method !== "POST") return json({ error: "POST required." }, 405);
    if (await this.getMeta()) return json({ error: "Board code already exists." }, 409);
    let body;
    try { body = await request.json(); } catch (_) { return json({ error: "Invalid request." }, 400); }
    const pin = String(body.pin || "");
    if (!/^\d{4}$/.test(pin)) return json({ error: "Coach PIN must be exactly 4 digits." }, 400);
    const stateText = JSON.stringify(body.state || {});
    if (encoder.encode(stateText).byteLength > MAX_STATE_BYTES) return json({ error: "Board data is too large." }, 413);
    const salt = crypto.randomUUID();
    const now = Date.now();
    let meta = {
      createdAt: now,
      lastActivity: now,
      expiresAt: now + RETENTION_MS,
      pinSalt: salt,
      pinHash: await sha256(`${salt}:${pin}`),
      revision: 1,
    };
    await this.ctx.storage.put("state", body.state || {});
    await this.ctx.storage.put("meta", meta);
    await this.ctx.storage.setAlarm(meta.expiresAt);
    const sessionToken = await this.issueSession(body.clientId);
    return json({ token: sessionToken, state: body.state || {}, revision: meta.revision, expiresAt: meta.expiresAt }, 201);
  }

  async join(request) {
    if (request.method !== "POST") return json({ error: "POST required." }, 405);
    let meta = await this.getMeta();
    if (!meta) return json({ error: "Board not found or has expired." }, 404);
    let body;
    try { body = await request.json(); } catch (_) { return json({ error: "Invalid request." }, 400); }
    if (!(await this.verifyPin(meta, body.pin))) return json({ error: "Incorrect Board Code or Coach PIN." }, 401);
    meta = await this.touch(meta);
    const sessionToken = await this.issueSession(body.clientId);
    const state = (await this.ctx.storage.get("state")) || {};
    return json({ token: sessionToken, state, revision: meta.revision || 0, expiresAt: meta.expiresAt });
  }

  async snapshot(request) {
    if (request.method !== "GET") return json({ error: "GET required." }, 405);
    let meta = await this.getMeta();
    if (!meta) return json({ error: "Board not found or has expired." }, 404);
    if (!(await this.validSession(bearer(request)))) return json({ error: "Session expired. Join the board again." }, 401);
    meta = await this.touch(meta);
    const state = (await this.ctx.storage.get("state")) || {};
    return json({ state, revision: meta.revision || 0, expiresAt: meta.expiresAt });
  }

  async websocket(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("Expected WebSocket upgrade", { status: 426 });
    let meta = await this.getMeta();
    if (!meta) return new Response("Board not found", { status: 404 });
    const url = new URL(request.url);
    const sessionToken = url.searchParams.get("token") || "";
    if (!(await this.validSession(sessionToken))) return new Response("Unauthorized", { status: 401 });
    meta = await this.touch(meta);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ sessionToken, clientId: String(url.searchParams.get("client") || "").slice(0, 100) });
    const state = (await this.ctx.storage.get("state")) || {};
    const count = this.ctx.getWebSockets().length;
    server.send(JSON.stringify({ type: "hello", state, revision: meta.revision || 0, connectedCount: count, expiresAt: meta.expiresAt }));
    this.broadcast({ type: "presence", connectedCount: count });
    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(message, except = null) {
    const text = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(text); } catch (_) {}
    }
  }

  async webSocketMessage(ws, message) {
    if (message === "ping") return;
    let payload;
    try { payload = JSON.parse(String(message)); } catch (_) { return; }
    if (payload.type !== "state" || !payload.state || typeof payload.state !== "object") return;
    const text = JSON.stringify(payload.state);
    if (encoder.encode(text).byteLength > MAX_STATE_BYTES) {
      try { ws.send(JSON.stringify({ type: "error", error: "Board data is too large to sync." })); } catch (_) {}
      return;
    }
    let meta = await this.getMeta();
    if (!meta) {
      try { ws.close(4410, "Board expired"); } catch (_) {}
      return;
    }
    meta.revision = Number(meta.revision || 0) + 1;
    meta = await this.touch(meta);
    await this.ctx.storage.put("state", payload.state);
    this.broadcast({ type: "state", state: payload.state, revision: meta.revision, connectedCount: this.ctx.getWebSockets().length, expiresAt: meta.expiresAt });
  }

  async webSocketClose(ws, code, reason, wasClean) {
    try { ws.close(code, reason); } catch (_) {}
    this.broadcast({ type: "presence", connectedCount: this.ctx.getWebSockets().length });
  }

  async webSocketError(ws) {
    try { ws.close(1011, "WebSocket error"); } catch (_) {}
    this.broadcast({ type: "presence", connectedCount: this.ctx.getWebSockets().length });
  }

  async alarm() {
    const meta = await this.getMeta();
    if (!meta) return;
    if (Date.now() < Number(meta.expiresAt || 0)) {
      await this.ctx.storage.setAlarm(meta.expiresAt);
      return;
    }
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.close(4410, "Board expired after 30 days of inactivity"); } catch (_) {}
    }
    await this.ctx.storage.deleteAll();
  }
}
