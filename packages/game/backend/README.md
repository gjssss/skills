# @djd/game-backend

Authoritative in-memory Dou Dizhu WebSocket server for CLI-driven games.

## Scripts

- Dev: `bun run --cwd packages/game/backend dev`
- Build: `bun run --cwd packages/game/backend build`
- Start: `bun run --cwd packages/game/backend start`

## API

- `GET /api/health`
- `GET /ws` (WebSocket upgrade)

All game traffic uses UTF-8 JSON WebSocket messages. The first client message must be
`session.open`; joined or resumed players may then send `action.submit` and all
sessions may send `state.get`. Room events carry a monotonic `seq` and reconnecting
clients replay events with `afterSeq`.

The server keeps `/api/health` and bundled frontend assets on HTTP. There are no
HTTP `/rooms/*` game endpoints.
