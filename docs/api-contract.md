# Scoreboard API — Contract

## Base URL

```
https://<your-railway-domain>.railway.app
```

---

## Authentication

### Admin endpoints

Protected by a static bearer token. Set the `ADMIN_TOKEN` environment variable on the server. Pass it in the `Authorization` header:

```
Authorization: Bearer <ADMIN_TOKEN>
```

### Public endpoints

No authentication required.

---

## Error format

All errors follow this shape:

```json
{
  "error": {
    "code": "INVALID_ARGUMENT | NOT_FOUND | CONFLICT | UNAUTHENTICATED | INTERNAL",
    "message": "Human-readable description"
  }
}
```

| HTTP status | Code |
|---|---|
| 400 | `INVALID_ARGUMENT` |
| 401 | `UNAUTHENTICATED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 500 | `INTERNAL` |

---

## Endpoints

### `GET /healthz`

Health check.

**Response `200`**
```json
{ "ok": true }
```

---

### `GET /games`

List all registered games. Used by the JS client for game discovery.

**Response `200`**
```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "My Awesome Game" },
  { "id": "661f9511-f30c-52e5-b827-557766551111", "name": "Another Game" }
]
```

Returns an empty array if no games have been registered yet.

---

### `GET /client.js`

Returns a ready-to-use JavaScript client pre-configured with this server's base URL. See [integration-guide.md](integration-guide.md) for usage.

---

### `POST /admin/games`

Define a new game. Run once per game from Postman. Requires admin token.

**Request**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Awesome Game"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (GUID) | yes | Chosen by you; used by the game client |
| `name` | string | yes | Display name |

**Response `201`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Awesome Game",
  "createdAt": "2026-01-15T10:30:00.000Z"
}
```

**Errors**
- `409 CONFLICT` — a game with this `id` already exists
- `401 UNAUTHENTICATED` — missing or wrong admin token

---

### `POST /scores`

Submit a score. Called by the game client after the player finishes.

If the `gameId` is not recognized, the request is silently ignored (returns `204`). This prevents errors in client code if a game is not yet registered.

**Request**
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "version": 1,
  "playerName": "Alice",
  "score": 12345
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `gameId` | string (GUID) | yes | The game's registered ID |
| `version` | integer | yes | Game version (e.g. `1`). Scoreboards are per-version |
| `playerName` | string | yes | 1–50 characters |
| `score` | integer | yes | Higher is better |

**Response `201`** — score was stored
```json
{
  "id": "64b1f2a3c4d5e6f7a8b9c0d1",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "version": 1,
  "playerName": "Alice",
  "score": 12345,
  "createdAt": "2026-01-15T10:31:00.000Z"
}
```

**Response `204`** — gameId was unknown; score silently ignored

**Errors**
- `400 INVALID_ARGUMENT` — missing/invalid fields

---

### `GET /games/:gameId/scoreboard`

Retrieve scores for a game and version.

**Query parameters**

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `version` | integer | *(latest)* | Omit to get the version with the most recent submission |
| `limit` | integer | `10` | 1–100 |
| `mode` | `"all"` \| `"best"` | `"all"` | `"best"` returns one entry per player (their highest score) |
| `playerName` | string | *(all players)* | Filter to a single player's scores |
| `period` | `"today"` | *(all time)* | Restrict to scores submitted today (midnight–now, `Europe/Brussels`) |

**Response `200`**
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "gameName": "My Awesome Game",
  "version": 1,
  "entries": [
    { "rank": 1, "playerName": "Alice", "score": 12345, "createdAt": "2026-01-15T10:31:00.000Z" },
    { "rank": 2, "playerName": "Bob",   "score": 9876,  "createdAt": "2026-01-15T10:32:00.000Z" }
  ]
}
```

Entries are sorted by `score` descending, then by `createdAt` ascending (earlier submission wins ties).

If no scores exist for the requested game+version, `entries` is empty.

If `version` was omitted and no scores exist at all, `version` in the response is `null`.

Soft-deleted scores are never included in any response.

**Errors**
- `404 NOT_FOUND` — no game with this `gameId`
- `400 INVALID_ARGUMENT` — invalid query parameter

---

### `DELETE /admin/games/:gameId/scores`

Soft-delete scores for a game. Requires admin token.

- Without `playerName`: soft-deletes **all** scores for the game.
- With `playerName`: soft-deletes all scores for that player in the game.

Soft-deleted scores are hidden from all scoreboard and submission responses but remain in the database (the `deletedAt` timestamp is set).

**Query parameters**

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `playerName` | string | no | If provided, only this player's scores are deleted |

**Response `200`**
```json
{ "deleted": 42 }
```

`deleted` is the number of score documents that were soft-deleted.

**Errors**
- `404 NOT_FOUND` — no game with this `gameId`
- `401 UNAUTHENTICATED` — missing or wrong admin token
