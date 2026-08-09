# Deploy AFL Coaches Whiteboard v1.1.0 to Cloudflare

This version uses a Cloudflare Worker with static assets + a SQLite-backed Durable Object. It can still be kept in GitHub and deployed through Cloudflare.

## Option A — Cloudflare Git integration
1. Push this project folder to GitHub.
2. In Cloudflare, create/import a Workers project from that GitHub repository.
3. Use `npm install` as the install command if requested.
4. Use `npm run deploy` / `npx wrangler deploy` as the deploy command.
5. Cloudflare reads `wrangler.jsonc`, creates the `SharedBoard` SQLite-backed Durable Object namespace and serves `public/` as the app.
6. Attach your existing custom domain to the Worker if desired.

## Option B — Wrangler from a workstation
```
npm install
npx wrangler login
npm run deploy
```

## Local development
```
npm install
npm run dev
```
Open the local URL printed by Wrangler. Shared boards work locally through the emulated Durable Object.

## Retention
Each board schedules a Durable Object alarm for 30 days after the most recent access/edit. Every join, authenticated reload, WebSocket connection or board update resets that alarm. When the alarm fires after 30 days of inactivity, board state and editor sessions are deleted.

## Notes
- Share Board does not work from a `file://` URL because there is no backend. The rest of the app remains local-first.
- The Coach PIN is checked by the Worker. The stored board record contains a salted SHA-256 representation rather than the clear-text PIN.
- A browser receives an editor session token after a successful create/join so it can reconnect without repeatedly asking for the PIN during the same board lifecycle.
