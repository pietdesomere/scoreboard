# Scoreboard — Backend API

## Stack

- TypeScript + Fastify + MongoDB
- Deployed via Docker to Railway

## Source structure (`api/src/`)

- `db/` — MongoDB connection, indexes
- `routes/` — HTTP handlers (business logic lives here; app is simple enough to not need a services layer)
- All API errors must use `sendError()` from `routes/auth.ts`

## Key files

- Entry point: `api/src/index.ts`
- Fastify factory: `api/src/app.ts`
- Env vars: `api/src/env.ts`

## Docs

Keep these files up-to-date when making relevant changes:

| File | Purpose |
|---|---|
| `docs/api-contract.md` | HTTP endpoints, request/response shapes |
| `docs/data-model.md` | MongoDB collections, fields, and indexes |
| `docs/backend-setup.md` | Local dev setup, Railway deployment |
| `docs/integration-guide.md` | How to use the API from HTML/JS games |

## Conventions

- Admin auth: `Authorization: Bearer <ADMIN_TOKEN>` — validated in `requireAdmin` preHandler
- Public endpoints: no auth
- `POST /scores` with unknown gameId → 204 No Content (silent ignore)
- CORS: hardcoded allowed domains (somere.be, emieldesomere.be, mauricedesomere.be + www + localhost), overridable via `CORS_ORIGINS` env var

## Testing

- Framework: vitest + mongodb-memory-server
- Run: `npm test` from `api/`
- Each test file: `beforeAll(buildApp)`, `beforeEach(clear collections)`, `afterAll(close)`
- vitest config: `pool: 'forks'`, `fileParallelism: false`
