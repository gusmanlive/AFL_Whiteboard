# Deploy AFL Coaches Whiteboard v1.4.5 to Cloudflare Workers

This project is a **Cloudflare Worker with Static Assets + a Durable Object**. It is not a Pages-only project.

## Required GitHub repository layout

The files below must be at the repository root:

```
package.json
wrangler.jsonc
DEPLOY-CLOUDFLARE.md
src/
  worker.js
public/
  index.html
  app.js
  style.css
  sync-adapter.js
  groundconditions.html
  ...
```

**Important:** `package.json` must be the JSON file supplied with this ZIP. Do not rename or copy `src/worker.js` over `package.json`.

The first line of package.json should be:

```json
{
```

The first line of `src/worker.js` should be:

```js
import { DurableObject } from "cloudflare:workers";
```

## Cloudflare Workers Builds settings

Connect the GitHub repository as a **Workers** project.

- Root directory: `/` (or leave blank if these files are at repo root)
- Build command: leave blank
- Deploy command: `npx wrangler deploy`

Cloudflare Workers Builds can use the Wrangler version declared in package.json.

## Local validation

From the project root:

```bash
npm install
npx wrangler dev
```

Deploy manually if desired:

```bash
npx wrangler deploy
```

## Durable Object

`wrangler.jsonc` declares `SharedBoard` as a SQLite-backed Durable Object using Cloudflare's `exports` configuration. No manual D1 database setup is required.

## If Cloudflare says package.json contains `import ...`

That means the wrong content exists in the repository's package.json. Open GitHub, inspect the root `package.json`, replace it with the supplied JSON file, commit, and redeploy.
