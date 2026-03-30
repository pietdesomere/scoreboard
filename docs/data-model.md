# Scoreboard — Data Model

## Database

MongoDB. Database name controlled by `MONGODB_DB` env var (default: `scoreboard`).

---

## Collections

### `games`

One document per registered game.

| Field | Type | Notes |
|---|---|---|
| `id` | string | GUID chosen by admin; used as the game's public identifier |
| `name` | string | Display name |
| `createdAt` | Date | |

**Indexes**
- `{ id: 1 }` — unique

---

### `scores`

One document per submitted score. Multiple entries per player are allowed.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | MongoDB default |
| `gameId` | string | References `games.id` |
| `version` | number (int) | Game version at time of submission |
| `playerName` | string | Free text; 1–50 characters |
| `score` | number (int) | |
| `createdAt` | Date | Server-set insertion time |
| `deletedAt` | Date | *(optional)* Set by admin soft-delete; absent on live scores |

All scoreboard and count queries filter to `{ deletedAt: { $exists: false } }` so soft-deleted scores are never shown to players.

**Indexes**
- `{ gameId: 1, version: 1, score: -1, createdAt: 1 }` — compound; supports scoreboard queries sorted by score
- `{ gameId: 1, version: -1 }` — supports "latest version" lookup
- `{ gameId: 1, version: 1, playerName: 1 }` — supports per-player scoreboard queries
- `{ deletedAt: 1 }` sparse — supports admin soft-delete operations
