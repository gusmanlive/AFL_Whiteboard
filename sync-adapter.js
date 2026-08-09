/**
 * AFL Coaches Whiteboard sync boundary.
 *
 * Version 1.0.0 runs entirely locally. app.js only communicates with this
 * adapter for sync-related behaviour, so a Cloudflare implementation can be
 * added later without rewriting the whiteboard UI or state model.
 *
 * Future Cloudflare adapter responsibilities:
 * - create/join a board by code
 * - authenticate edit access (e.g. coach PIN)
 * - push local state changes
 * - receive remote state updates via WebSocket
 * - reconnect after temporary network loss
 */
(function () {
  class LocalSyncAdapter {
    constructor() {
      this.mode = 'local';
      this.onRemoteState = null;
    }

    async connect() {
      return { mode: 'local', connected: false };
    }

    async publish(_state) {
      // Intentionally no-op in local-only Version 1.0.0.
    }

    subscribe(handler) {
      this.onRemoteState = handler;
      return () => { this.onRemoteState = null; };
    }

    async disconnect() {
      this.onRemoteState = null;
    }
  }

  window.WhiteboardSync = {
    createAdapter() {
      return new LocalSyncAdapter();
    }
  };
})();
