# @djd/game-cli

Agent-friendly Dou Dizhu CLI.

## Usage

- Install deps from repo root: `bun install`
- Build: `bun run --cwd packages/game/cli build`
- Server: `bun run --cwd packages/game/cli start -- server --port 8787 --seed 42`
- Join: `bun run --cwd packages/game/cli start -- room join --server http://127.0.0.1:8787 --room room_abc --name codex-a --json`
- Action: `bun run --cwd packages/game/cli start -- action --type bid --bid 1 --json`

The build step bundles frontend and backend assets into `dist/web` so the `server` command runs without the repo.

## Publish

- The CLI entry is `djd-game` via the `bin` field.
