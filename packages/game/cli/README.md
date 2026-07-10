# @djd/game-cli

面向 agent 的斗地主玩家 CLI。CLI 负责启动完整服务、加入房间、恢复本人会话、提交动作，以及读取玩家可见的事件和状态。

CLI **不提供**实时房间列表、全局观战、历史列表、复盘或 `/ws/spectator` 订阅命令；这些能力只属于网页及公开 spectator HTTP/WS 接口。`events`、`state` 和普通 observer 继续使用玩家协议的白名单投影，不会返回其他玩家手牌。

## 构建

从仓库根目录安装依赖并执行聚合构建：

```bash
bun install
bun run --cwd packages/game/cli build
```

聚合构建按以下顺序运行，随后把前端、后端和 core 产物复制到 CLI 的 `dist`：

1. `@djd/game-core`
2. `@djd/game-web-contract`
3. `@djd/game-frontend`
4. `@djd/game-backend`
5. `@djd/game-cli` bundled build

最终入口是 `dist/cli.js`，`dist/web` 包含网页和服务端资源，因此发布后的 `djd-game server` 不依赖仓库源码。

## 使用

```bash
# 启动完整服务；默认只持久化完局记录
bun run --cwd packages/game/cli start -- server \
  --port 8787 \
  --data-file ./.djd-game/sessions.sqlite

# 三个玩家分别使用独立工作目录或 --config 文件加入同一房间
bun run --cwd packages/game/cli start -- \
  --config /tmp/player-a/config.json \
  room join \
  --server ws://127.0.0.1:8787/ws \
  --room room_abc \
  --name codex-a \
  --json

# 当前玩家行动
bun run --cwd packages/game/cli start -- \
  --config /tmp/player-a/config.json \
  action --type bid --bid 1 --json

bun run --cwd packages/game/cli start -- \
  --config /tmp/player-a/config.json \
  action --type play --cards D8,C8 --json

bun run --cwd packages/game/cli start -- \
  --config /tmp/player-a/config.json \
  action --type pass --json
```

`room join` 会等待到该玩家的第一个行动节点；`action` 提交一次并等待该玩家的下一个行动节点或 `game.finished`。`events` 通过 `afterSeq` 重放可见事件，`state` 请求当前玩家投影。每条命令使用独立 WebSocket 连接。

HTTP(S) 服务地址仍可作为 CLI 输入，并会在 `config.json` 中规范化为 `ws(s)://host/ws`。

## 服务端选项与随机性

```bash
djd-game server \
  --host 127.0.0.1 \
  --port 8787 \
  --data-file ./.djd-game/sessions.sqlite
```

- `--data-file` 默认是 `./.djd-game/sessions.sqlite`，相对于启动进程的当前目录。
- 未传 `--seed` 时使用密码学安全随机源洗牌。
- `--seed <number>` 只用于可复现测试，会向 stderr 输出警告，不应在需要保密的牌局中使用。

## `resumeKey` 与 config v2

新玩家加入成功后，服务端只在该连接的 `session.accepted` 返回一次随机 256-bit `resumeKey`。CLI 在收到它后立即写入当前配置，以便后续 `room join --player`、`action`、`events` 和私有 `state` 能以 `playerId + resumeKey` 恢复本人连接。

默认配置路径是当前目录下的 `./config.json`；可用全局参数 `--config <path>` 为每个玩家指定隔离配置。v2 结构在 `rooms[roomId]` 中保存：

```json
{
  "version": 2,
  "rooms": {
    "room_abc": {
      "server": "ws://127.0.0.1:8787/ws",
      "roomId": "room_abc",
      "playerId": "p1",
      "resumeKey": "<secret>",
      "serverSeq": 21,
      "updatedAt": "2026-07-11T00:00:00.000Z"
    }
  }
}
```

- 每次保存后文件权限设置为 `0600`。
- `djd-game config show --json` 将 `resumeKey` 显示为 `[redacted]`。
- v1 配置首次读取时自动迁移：保留 nickname、server、room、seq 和 stats，但清除无法验证的旧 `playerId` 绑定与密钥；玩家需要重新加入。
- 不要复制或提交带真实密钥的 `config.json`。`resumeKey` 可阻止只知道 `p1/p2/p3` 的用户冒充或代打，但公开网页观战仍能看到全局手牌。

## 发布

CLI 的 `bin` 入口名为 `djd-game`。发布前至少运行：

```bash
bun run --cwd packages/game/core typecheck
bun run --cwd packages/game/web-contract typecheck
bun run --cwd packages/game/frontend typecheck
bun run --cwd packages/game/backend typecheck
bun run --cwd packages/game/cli typecheck
bun run --cwd packages/game/cli build
```
