import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { Database } from 'bun:sqlite'
import type {
  CompletedSessionDetail,
  CompletedSessionPage,
  CompletedSessionSummary,
} from '@djd/game-web-contract'

export interface CompletedSessionStore {
  saveCompleted(record: CompletedSessionDetail): void
  listCompleted(page?: number, pageSize?: number): CompletedSessionPage
  getCompleted(sessionId: string): CompletedSessionDetail | undefined
  close(): void
}

export function defaultSessionDatabasePath(cwd = process.cwd()) {
  return resolve(cwd, '.djd-game', 'sessions.sqlite')
}

function summaryOf(record: CompletedSessionDetail): CompletedSessionSummary {
  const { frames: _frames, tricks: _tricks, ...summary } = record
  return summary
}

export class SqliteCompletedSessionStore implements CompletedSessionStore {
  private readonly database: Database

  constructor(path = defaultSessionDatabasePath()) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true })
    this.database = new Database(path, { create: true })
    this.database.exec('PRAGMA journal_mode = WAL;')
    this.database.exec('PRAGMA busy_timeout = 5000;')
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS completed_sessions (
        session_id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        winner TEXT NOT NULL,
        final_seq INTEGER NOT NULL,
        summary_json TEXT NOT NULL,
        record_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS completed_sessions_finished_at_idx
        ON completed_sessions(finished_at DESC, session_id DESC);
      CREATE INDEX IF NOT EXISTS completed_sessions_room_id_idx
        ON completed_sessions(room_id, finished_at DESC);
      PRAGMA user_version = 1;
    `)
  }

  saveCompleted(record: CompletedSessionDetail) {
    const insert = this.database.query(`
      INSERT INTO completed_sessions (
        session_id, room_id, started_at, finished_at, winner, final_seq, summary_json, record_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    this.database.transaction(() => {
      insert.run(
        record.sessionId,
        record.roomId,
        record.startedAt,
        record.finishedAt,
        record.winner,
        record.finalSeq,
        JSON.stringify(summaryOf(record)),
        JSON.stringify(record),
      )
    })()
  }

  listCompleted(page = 1, pageSize = 20): CompletedSessionPage {
    const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1
    const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, 100)
      : 20
    const totalRow = this.database.query('SELECT COUNT(*) AS total FROM completed_sessions').get() as { total: number }
    const rows = this.database.query(`
      SELECT summary_json
      FROM completed_sessions
      ORDER BY finished_at DESC, session_id DESC
      LIMIT ? OFFSET ?
    `).all(safePageSize, (safePage - 1) * safePageSize) as Array<{ summary_json: string }>
    return {
      items: rows.map((row) => JSON.parse(row.summary_json) as CompletedSessionSummary),
      total: Number(totalRow.total),
      page: safePage,
      pageSize: safePageSize,
    }
  }

  getCompleted(sessionId: string) {
    const row = this.database.query(`
      SELECT record_json FROM completed_sessions WHERE session_id = ?
    `).get(sessionId) as { record_json: string } | null
    return row ? JSON.parse(row.record_json) as CompletedSessionDetail : undefined
  }

  close() {
    this.database.close()
  }
}
