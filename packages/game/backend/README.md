# @djd/game-backend

Authoritative in-memory Dou Dizhu HTTP server for CLI-driven games.

## Scripts

- Dev: `bun run --cwd packages/game/backend dev`
- Build: `bun run --cwd packages/game/backend build`
- Start: `bun run --cwd packages/game/backend start`

## API

- `GET /api/health`
- `POST /rooms/:roomId/join`
- `POST /rooms/:roomId/actions`
- `GET /rooms/:roomId/events?afterSeq=...`
- `GET /rooms/:roomId/state?playerId=...`
