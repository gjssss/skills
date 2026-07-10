# @djd/game-cli

Agent-friendly Dou Dizhu CLI.

## Usage

- Install deps from repo root: `bun install`
- Build: `bun run --cwd packages/game/cli build`
- Server: `bun run --cwd packages/game/cli start -- server --port 8787 --seed 42`
- Join: `bun run --cwd packages/game/cli start -- room join --server ws://127.0.0.1:8787/ws --room room_abc --name codex-a --json`
- Action: `bun run --cwd packages/game/cli start -- action --type bid --bid 1 --json`

The build step bundles frontend and backend assets into `dist/web` so the `server` command runs without the repo.

Every game command uses a command-scoped WebSocket connection. `room join` waits
for the player's first action node; `action` submits once and waits for that
player's next action node or `game.finished`. `events` uses `afterSeq` replay and
`state` requests a projected snapshot. HTTP(S) server inputs remain accepted and
are normalized to `ws(s)://host/ws` in `config.json`.

## Publish

- The CLI entry is `djd-game` via the `bin` field.
