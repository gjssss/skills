# Skills

这个仓库用于存放可独立分发和使用的 Codex skills。所有 skill 都位于 `skills/` 目录下，每个子目录代表一个独立 skill。

## 当前技能

### `task-workflow`

用于创建和执行按数字编号的 Markdown 任务工作流。它支持生成 `<number>.<slug>.md` 形式的任务文件，也支持按编号顺序执行任务；同一编号下的多个任务可以视为可并行执行的独立任务。

位置：`skills/task-workflow`

## Packages

### `packages/game`

基于 Bun 的斗地主玩家 CLI、公开只读观战和完局复盘包组：

- `packages/game/core`
- `packages/game/web-contract`
- `packages/game/backend`
- `packages/game/cli`
- `packages/game/frontend`

常用命令：

- 聚合构建：`bun run --cwd packages/game/cli build`
- 启动完整服务：`bun run --cwd packages/game/cli start -- server --port 8787`
- 类型检查：分别在 `core`、`web-contract`、`frontend`、`backend`、`cli` 包中运行 `bun run typecheck`

实现边界、构建顺序和 curl 验收示例见 [`packages/game/README.md`](packages/game/README.md)。
