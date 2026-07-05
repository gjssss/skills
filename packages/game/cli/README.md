# @djd/game-cli

Starter Bun CLI for the DJD game workspace.

## Usage

- Install deps from repo root: `bun install`
- Build: `bun run --cwd packages/game/cli build`
- Run: `bun run --cwd packages/game/cli start -- hello`
- Web: `bun run --cwd packages/game/cli start -- web`

The build step bundles frontend and backend assets into `dist/web` so the `web` command runs without the repo.

## Publish

- The CLI entry is `djd-game` via the `bin` field.
