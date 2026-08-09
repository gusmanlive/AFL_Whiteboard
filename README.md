# AFL Coaches Whiteboard

Version 1.0.2

A local-first browser whiteboard for AFL coaches. This first version is deliberately backend-free so the Whiteboard and Setup workflow can be tested before adding shared Cloudflare boards.

## Features

- Whiteboard tab with a drawn AFL oval
- All 18 AFL positions shown on the field
- Four interchange / bench positions
- Each position accepts either:
  - a player selected from the Setup roster, or
  - manually typed text
- Setup tab with:
  - Date
  - Time
  - Home Team
  - Away Team
  - Location
  - player Number, First Name, Surname
- Up to 50 roster entries
- Duplicate player-number warning
- Duplicate on-field/bench player warning
- Automatic browser localStorage persistence
- Offline service worker after first hosted load
- Responsive layout for desktop, tablet and mobile
- Sync adapter boundary ready for a later Cloudflare implementation

## Run locally

The simplest local test is to open `index.html` directly in a browser. LocalStorage will work.

For full service-worker/offline behaviour, serve the folder from a local HTTP server, for example:

```bash
python -m http.server 8080
```

Then browse to `http://localhost:8080`.

## GitHub / Cloudflare Pages

This folder can be committed directly to a GitHub repository and deployed as a static Cloudflare Pages site. No build command is required.

Suggested Cloudflare Pages configuration:

- Framework preset: None
- Build command: leave blank
- Build output directory: `/`

## Cloudflare sharing hook

`sync-adapter.js` is the integration boundary for the next version. The current `LocalSyncAdapter` is intentionally a no-op.

A future `CloudflareSyncAdapter` can implement the same methods:

- `connect()`
- `publish(state)`
- `subscribe(handler)`
- `disconnect()`

That adapter can connect the browser to a Cloudflare Worker and a Durable Object using WebSockets, while `app.js` and the UI continue to use the same board-state model.

### Current state shape

```js
{
  schemaVersion: 1,
  boardId: null,
  mode: 'local',
  details: {
    date: '',
    time: '',
    homeTeam: '',
    awayTeam: '',
    location: ''
  },
  roster: [
    { id, number, firstName, surname }
  ],
  assignments: {
    ff: { playerId, text },
    chf: { playerId, text },
    // ... all 18 positions and 4 bench slots
  },
  updatedAt: ''
}
```

## Version 2 sharing concept

Proposed next layer:

1. Create Board generates a 6-character code.
2. Optional Coach PIN provides edit access.
3. Another device enters the board code.
4. A Cloudflare Worker routes both devices to one Durable Object.
5. WebSocket messages carry state changes in both directions.
6. LocalStorage remains as an offline/cache fallback.

---

Copyright © Gumball Spec – All rights reserved
