# AFL Coaches Whiteboard v1.3.3

Local-first AFL coaching whiteboard with optional real-time Cloudflare shared boards.

## New in v1.2.0

- Notes are hidden by default.
- Notes toggle fully removes/restores the panel.
- Notes remain to the right of the oval when visible, with a 3px gap.

## Previous v1.1.8 changes

- Doubled the Whiteboard Coach Notes panel width and reduced the gap between the oval and Notes panel.

- Added a narrow Coach Notes text box beside the AFL oval.
- Notes autosave locally and are included in live shared-board synchronisation.
- On smaller screens the Notes box stacks below the oval.
- Create a shared board with a six-character Board Code and four-digit Board PIN.
- Join the same board from other devices.
- Live full-board synchronization over Cloudflare Durable Object WebSockets.
- Connected coach count, live/reconnecting/offline state and automatic reconnect.
- Local browser copy remains usable if connectivity drops.
- Shared boards automatically delete after 30 days without activity. Any access or edit resets the 30-day timer.

## Local-only use
Open `public/index.html`. All existing whiteboard features work, but Share Board requires Cloudflare deployment.

## Cloudflare deployment
This release is packaged as one Cloudflare Worker that serves the static app and the Durable Object sharing API from the same origin. See `DEPLOY-CLOUDFLARE.md`.


## Share links
When a board is active, **Share Board** creates a URL containing only the 6-character board code. Opening that link preloads the board and asks the recipient only for the 4-digit Board PIN. The PIN is never placed in the URL. Devices supporting the Web Share API open the native share sheet; other browsers copy the invite URL to the clipboard.
