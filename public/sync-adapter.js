/**
 * AFL Coaches Whiteboard Cloudflare sync adapter - v1.1.0
 *
 * Uses same-origin /api endpoints served by the Cloudflare Worker bundled with
 * this project. Local board use continues to work when no backend is present.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'afl-whiteboard-share-session-v1';
  const CLIENT_KEY = 'afl-whiteboard-client-id-v1';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function clientId() {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  }

  function cleanCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  function randomCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
  }

  class CloudflareSyncAdapter {
    constructor() {
      this.mode = 'local';
      this.onRemoteState = null;
      this.onStatusChange = null;
      this.socket = null;
      this.session = this.readSession();
      this.revision = 0;
      this.retryTimer = null;
      this.retryCount = 0;
      this.manualDisconnect = false;
      this.pendingState = null;
      this.publishTimer = null;
      this.status = { mode: this.session ? 'shared' : 'local', connection: 'local', code: this.session?.code || '', connectedCount: 0, message: '' };
      window.addEventListener('online', () => { if (this.session && !this.socket) this.openSocket(); });
      window.addEventListener('offline', () => this.setStatus({ connection: 'offline', message: 'Offline — changes are saved locally and will sync after reconnecting.' }));
    }

    readSession() {
      try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (parsed?.code && parsed?.token) return parsed;
      } catch (_) {}
      return null;
    }

    saveSession(session) {
      this.session = session;
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    }

    baseUrl() {
      if (window.AFL_WHITEBOARD_SYNC_URL) return String(window.AFL_WHITEBOARD_SYNC_URL).replace(/\/$/, '');
      if (location.protocol === 'http:' || location.protocol === 'https:') return location.origin;
      return '';
    }

    setStatus(patch) {
      this.status = { ...this.status, ...patch, code: this.session?.code || this.status.code || '' };
      if (this.onStatusChange) this.onStatusChange({ ...this.status });
    }

    getStatus() { return { ...this.status }; }
    onStatus(handler) { this.onStatusChange = handler; if (handler) handler(this.getStatus()); return () => { this.onStatusChange = null; }; }
    subscribe(handler) { this.onRemoteState = handler; return () => { this.onRemoteState = null; }; }

    async api(path, options = {}) {
      const base = this.baseUrl();
      if (!base) throw new Error('Sharing requires the app to be hosted on Cloudflare. Local file mode remains available.');
      const response = await fetch(`${base}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
      let body = null;
      try { body = await response.json(); } catch (_) {}
      if (!response.ok) {
        const err = new Error(body?.error || `Share service error (${response.status})`);
        err.status = response.status;
        throw err;
      }
      return body || {};
    }

    async connect() {
      if (!this.session) {
        this.mode = 'local';
        this.setStatus({ mode: 'local', connection: 'local', code: '', connectedCount: 0, message: '' });
        return { mode: 'local', connected: false };
      }
      try {
        const result = await this.api(`/api/boards/${encodeURIComponent(this.session.code)}/snapshot`, {
          method: 'GET', headers: { Authorization: `Bearer ${this.session.token}` }
        });
        this.mode = 'shared';
        this.revision = Number(result.revision || 0);
        if (result.state && this.onRemoteState) this.onRemoteState(result.state, { revision: this.revision, code: this.session.code });
        this.openSocket();
        return { mode: 'shared', connected: false, code: this.session.code, state: result.state, revision: this.revision };
      } catch (error) {
        if (error.status === 401 || error.status === 404 || error.status === 410) {
          this.saveSession(null);
          this.mode = 'local';
          this.setStatus({ mode: 'local', connection: 'local', code: '', connectedCount: 0, message: 'The previous shared board is no longer available.' });
          return { mode: 'local', connected: false, expired: true };
        }
        this.mode = 'shared';
        this.setStatus({ mode: 'shared', connection: navigator.onLine ? 'reconnecting' : 'offline', message: error.message });
        this.scheduleReconnect();
        return { mode: 'shared', connected: false, code: this.session.code };
      }
    }

    async createBoard(pin, state) {
      if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('Board PIN must be exactly 4 digits.');
      let lastError;
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = randomCode();
        try {
          const sharedState = { ...state, boardId: code, mode: 'shared' };
          const result = await this.api(`/api/boards/${code}/create`, {
            method: 'POST', body: JSON.stringify({ pin: String(pin), state: sharedState, clientId: clientId() })
          });
          this.saveSession({ code, token: result.token });
          this.mode = 'shared';
          this.revision = Number(result.revision || 1);
          this.manualDisconnect = false;
          this.setStatus({ mode: 'shared', connection: 'reconnecting', code, connectedCount: 0, message: 'Board created. Connecting…' });
          this.openSocket();
          return { ...result, code, state: sharedState };
        } catch (error) {
          lastError = error;
          if (error.status !== 409) throw error;
        }
      }
      throw lastError || new Error('Could not generate a unique board code. Try again.');
    }

    async joinBoard(code, pin) {
      code = cleanCode(code);
      if (code.length !== 6) throw new Error('Enter the 6-character board code.');
      if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('Board PIN must be exactly 4 digits.');
      const result = await this.api(`/api/boards/${code}/join`, {
        method: 'POST', body: JSON.stringify({ pin: String(pin), clientId: clientId() })
      });
      this.saveSession({ code, token: result.token });
      this.mode = 'shared';
      this.revision = Number(result.revision || 0);
      this.manualDisconnect = false;
      this.setStatus({ mode: 'shared', connection: 'reconnecting', code, connectedCount: 0, message: 'Joining board…' });
      if (result.state && this.onRemoteState) this.onRemoteState(result.state, { revision: this.revision, code });
      this.openSocket();
      return { ...result, code };
    }

    openSocket() {
      if (!this.session || this.manualDisconnect) return;
      if (!navigator.onLine) {
        this.setStatus({ mode: 'shared', connection: 'offline', message: 'Offline — using local copy.' });
        return;
      }
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
      const base = this.baseUrl();
      if (!base) return;
      const url = new URL(base);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = `/api/boards/${encodeURIComponent(this.session.code)}/ws`;
      url.searchParams.set('token', this.session.token);
      url.searchParams.set('client', clientId());
      this.setStatus({ mode: 'shared', connection: 'reconnecting', message: this.retryCount ? 'Reconnecting…' : 'Connecting…' });
      const ws = new WebSocket(url.toString());
      this.socket = ws;
      ws.onopen = () => {
        this.retryCount = 0;
        this.setStatus({ mode: 'shared', connection: 'live', message: 'Live sync connected.' });
        if (this.pendingState) {
          const queued = this.pendingState;
          this.pendingState = null;
          this.publish(queued);
        }
      };
      ws.onmessage = event => {
        let msg; try { msg = JSON.parse(event.data); } catch (_) { return; }
        if (msg.type === 'hello' || msg.type === 'state') {
          this.revision = Number(msg.revision || this.revision);
          if (msg.state && this.onRemoteState) this.onRemoteState(msg.state, { revision: this.revision, code: this.session?.code });
          if (Number.isFinite(Number(msg.connectedCount))) this.setStatus({ connectedCount: Number(msg.connectedCount) });
        } else if (msg.type === 'presence') {
          this.setStatus({ connectedCount: Number(msg.connectedCount || 0) });
        } else if (msg.type === 'error') {
          this.setStatus({ message: msg.error || 'Sync error.' });
        }
      };
      ws.onerror = () => {};
      ws.onclose = event => {
        if (this.socket === ws) this.socket = null;
        if (this.manualDisconnect || !this.session) return;
        if (event.code === 4401 || event.code === 4404 || event.code === 4410) {
          this.saveSession(null);
          this.mode = 'local';
          this.setStatus({ mode: 'local', connection: 'local', code: '', connectedCount: 0, message: 'Shared board is no longer available.' });
          return;
        }
        this.setStatus({ mode: 'shared', connection: navigator.onLine ? 'reconnecting' : 'offline', message: navigator.onLine ? 'Connection lost — reconnecting…' : 'Offline — using local copy.' });
        this.scheduleReconnect();
      };
    }

    scheduleReconnect() {
      if (!this.session || this.manualDisconnect || this.retryTimer) return;
      const delay = Math.min(15000, 1000 * Math.pow(1.7, this.retryCount++));
      this.retryTimer = setTimeout(() => { this.retryTimer = null; this.openSocket(); }, delay);
    }

    async publish(state) {
      if (!this.session || this.mode !== 'shared') return;
      this.pendingState = { ...state, boardId: this.session.code, mode: 'shared' };
      if (this.publishTimer) clearTimeout(this.publishTimer);
      this.publishTimer = setTimeout(() => {
        this.publishTimer = null;
        const sharedState = this.pendingState;
        if (!sharedState) return;
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.pendingState = null;
          this.socket.send(JSON.stringify({ type: 'state', baseRevision: this.revision, state: sharedState }));
        } else {
          this.openSocket();
        }
      }, 120);
    }

    async disconnect(options = {}) {
      this.manualDisconnect = true;
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = null;
      if (this.socket) {
        try { this.socket.close(1000, 'Leaving board'); } catch (_) {}
        this.socket = null;
      }
      if (options.clearSession !== false) this.saveSession(null);
      this.mode = 'local';
      this.pendingState = null;
      if (this.publishTimer) clearTimeout(this.publishTimer);
      this.publishTimer = null;
      this.setStatus({ mode: 'local', connection: 'local', code: '', connectedCount: 0, message: '' });
    }
  }

  window.WhiteboardSync = { createAdapter() { return new CloudflareSyncAdapter(); } };
})();
