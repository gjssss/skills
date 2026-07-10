# @djd/game-backend

斗地主权威服务端，使用 Bun、Hono、WebSocket 和 SQLite。玩家通过 `/ws` 加入和行动；网页只读观战通过独立的 spectator HTTP/WS 边界读取全局牌局。

## 启动

- 开发：`bun run --cwd packages/game/backend dev`
- 构建：`bun run --cwd packages/game/backend build`
- 启动构建产物：`bun run --cwd packages/game/backend start`

直接启动 backend 时可使用环境变量：

```bash
HOST=127.0.0.1 \
PORT=8787 \
DJD_GAME_DATA_FILE=./.djd-game/sessions.sqlite \
bun run --cwd packages/game/backend dev
```

通常应通过 CLI 启动完整服务，以同时提供前端静态资源：

```bash
bun run --cwd packages/game/cli build
bun run --cwd packages/game/cli start -- server \
  --host 127.0.0.1 \
  --port 8787 \
  --data-file ./.djd-game/sessions.sqlite
```

不传 `--seed` 时，发牌使用 `crypto.getRandomValues` 提供的密码学安全随机源。显式 `--seed <number>` 只用于确定性测试；CLI 会向 stderr 输出保密性警告，不应在真实牌局中使用。

## HTTP API

| 方法与路径 | 响应 |
| --- | --- |
| `GET /api/health` | 服务健康状态 |
| `GET /api/spectator/rooms` | `waiting`、`bidding`、`playing` 房间全量列表 |
| `GET /api/spectator/rooms/:roomId` | 当前房间最新全局 `SpectatorFrame` |
| `GET /api/spectator/sessions?page=&pageSize=` | 已完成对局分页列表；默认 20 条，最大 100 条 |
| `GET /api/spectator/sessions/:sessionId` | 完整复盘记录、全局帧、回合边界和结果 |

spectator API 完全公开且只读，不需要登录。`SpectatorFrame` 包含三家完整手牌和底牌；任何能够访问服务的人都可以用网页、curl 或自编脚本读取这些公开数据。

```bash
curl -fsS http://127.0.0.1:8787/api/health
curl -fsS http://127.0.0.1:8787/api/spectator/rooms
curl -fsS http://127.0.0.1:8787/api/spectator/rooms/room_abc
curl -fsS 'http://127.0.0.1:8787/api/spectator/sessions?page=1&pageSize=20'
curl -fsS http://127.0.0.1:8787/api/spectator/sessions/session_example
curl -i http://127.0.0.1:8787/api/spectator/rooms/missing
```

不存在的活动房间和历史对局分别返回 `404 ROOM_NOT_FOUND`、`404 SESSION_NOT_FOUND`。spectator HTTP 响应带 `Cache-Control: no-store`。

## WebSocket 边界

玩家入口是 `ws://host:port/ws`。它只接受玩家协议：首帧必须为 `session.open`，后续可发送 `action.submit` 或 `state.get`。服务端按事件类型白名单构造玩家/observer 投影；普通玩家只看到本人的手牌，observer 看不到任何玩家手牌。

恢复玩家连接时必须同时提供 `playerId` 和 `resumeKey`：

```json
{
  "type": "session.open",
  "mode": "resume",
  "roomId": "room_abc",
  "playerId": "p1",
  "resumeKey": "<join 时返回的密钥>",
  "afterSeq": 21
}
```

缺失或错误的密钥会在事件重放前以关闭码 `4403` 拒绝。`resumeKey` 是防冒充与代打凭据，不是手牌保密机制，因为公开 spectator 接口本身就展示全局手牌。

观战入口是 `ws://host:port/ws/spectator`。每条连接只允许订阅一次，首帧只能是下列之一：

```json
{ "type": "spectator.subscribe", "scope": "rooms" }
```

```json
{
  "type": "spectator.subscribe",
  "scope": "room",
  "roomId": "room_abc",
  "afterSeq": 21
}
```

大厅订阅先返回 `rooms.snapshot`，随后推送 `room.updated` / `room.removed`。房间订阅补发 `seq > afterSeq` 的 `room.frame` 后进入实时推送；无缺失帧时返回当前 `room.snapshot`。同步结束均发送 `sync.complete`。spectator 消息不会进入玩家 `/ws` 协议。

## 恢复密钥

- 新玩家加入时生成随机 256-bit `resumeKey`。
- 原始密钥只在该连接的 `session.accepted` 中返回一次。
- 服务端内存只保存 SHA-256 摘要，并使用恒定时间比较校验。
- `resumeKey` 不写入事件、全局帧、SQLite 或 spectator 响应。

## 完局持久化

默认 SQLite 路径是服务进程当前目录下的 `./.djd-game/sessions.sqlite`，CLI 可用 `server --data-file <path>` 覆盖。数据库启用 WAL、`busy_timeout=5000` 和 `user_version=1`，使用单张 `completed_sessions` 表保存可查询摘要列、`summary_json` 与版本化 `record_json`。

只有到达 `game.finished` 的对局才会写入 SQLite。结束动作先在事务中保存完整复盘，成功后才返回 `action.result` 并广播 `game.finished`；写入失败会回滚本次内存 mutation，允许玩家重试原动作。

进行中的房间、事件和复盘帧只保留在内存中，服务重启后丢失且不会产生数据库记录。完局房间会从公开实时列表移除，但在内存中短暂保留，供既有玩家连接读取终局事件；同一 `roomId` 再次加入会创建新的 `sessionId`，旧局只从历史接口读取。

复盘 `record_json` 不保存任何 `resumeKey`，包含 session 元数据、逐事件全局帧、预计算回合边界和终局结果。一个回合定义为“一名玩家领出后连续回应，直到另外两家均 pass”。
