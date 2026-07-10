# 斗地主观战与复盘

`packages/game` 是 Bun workspace 下的斗地主实现。玩家通过 agent-friendly CLI 对局，网页提供公开、只读的全局观战和完局复盘。

## 包职责

| 包 | 职责 |
| --- | --- |
| `@djd/game-core` | 牌、牌型、规则、纯状态 reducer 与玩家协议 |
| `@djd/game-web-contract` | backend/frontend 共用的 spectator 类型与消息解析；CLI 不依赖 |
| `@djd/game-backend` | 权威房间状态、玩家 WebSocket、公开 spectator HTTP/WS、SQLite 完局记录 |
| `@djd/game-frontend` | React + Vite 只读观战与复盘网页 |
| `@djd/game-cli` | 玩家加入、行动、事件/状态读取和内嵌完整服务 |

## 安全边界

- `/ws` 是玩家协议。玩家只能获取本人手牌，普通 observer 不获取任何玩家手牌。
- `/ws/spectator` 与 `/api/spectator/*` 是独立且完全公开的只读观战边界，会返回三家完整手牌和底牌。
- CLI 不依赖 `@djd/game-web-contract`，也没有 spectator、房间大厅或复盘命令。
- 玩家恢复必须提交 `playerId + resumeKey`。密钥原值由 CLI 配置保管，服务端只保存摘要。
- 公开观战意味着脚本也能读取全局数据；`resumeKey` 解决冒充和代打，不提供手牌保密。

## 数据生命周期

- `waiting`、`bidding`、`playing` 房间及其实时帧仅存内存，进程重启后丢失。
- 只有 `game.finished` 对局事务写入 SQLite；默认路径为 `./.djd-game/sessions.sqlite`。
- 完局记录包含版本化摘要、全部全局帧、回合边界和结果，不包含 `resumeKey`。
- `server --data-file <path>` 可覆盖数据库路径。

## 构建与运行

聚合构建会按 `core -> web-contract -> frontend -> backend -> cli` 顺序运行：

```bash
bun install
bun run --cwd packages/game/cli build
bun run --cwd packages/game/cli start -- server \
  --host 127.0.0.1 \
  --port 8787 \
  --data-file ./.djd-game/sessions.sqlite
```

浏览器入口：

- `/rooms`：实时房间大厅
- `/rooms/:roomId`：全局实时观战
- `/sessions`：历史完局列表
- `/sessions/:sessionId`：逐事件复盘

后端快速验收：

```bash
curl -fsS http://127.0.0.1:8787/api/health
curl -fsS http://127.0.0.1:8787/api/spectator/rooms
curl -fsS 'http://127.0.0.1:8787/api/spectator/sessions?page=1&pageSize=20'
curl -i http://127.0.0.1:8787/api/spectator/sessions/missing
```

生产或保密牌局不要传 `--seed`。默认洗牌使用密码学安全随机源；显式 seed 只用于确定性测试。
