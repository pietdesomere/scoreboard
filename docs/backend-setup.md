# Scoreboard — Backend Setup

## Local development

### Prerequisites

- Node.js 20+
- A local MongoDB instance (or Docker)

### Run locally

```bash
cd api
npm install
```

Start MongoDB (if using Docker):
```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

Set environment variables (create `api/.env` — not committed):
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=scoreboard
ADMIN_TOKEN=dev-admin-token
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
```

Build and start:
```bash
npm run build
npm start
```

Or in watch mode during development (requires `ts-node-dev` or similar):
```bash
npm run dev
```

### Run tests

```bash
cd api
npm test
```

Tests use `mongodb-memory-server` — no external MongoDB needed.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | `scoreboard` | Database name |
| `ADMIN_TOKEN` | *(required)* | Bearer token for admin endpoints |
| `CORS_ORIGINS` | *(see below)* | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` | Fastify log level |

**Default CORS origins** (used when `CORS_ORIGINS` is not set):
```
https://somere.be, https://www.somere.be,
https://emieldesomere.be, https://www.emieldesomere.be,
https://mauricedesomere.be, https://www.mauricedesomere.be,
http://localhost:3000, http://localhost:8080
```

To add more origins, set `CORS_ORIGINS` to the full comma-separated list you want (it replaces the default entirely).

---

## Deploying to Railway

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project**.
3. Choose **Empty project**.
4. Name it `scoreboard`.

### Step 2 — Add a MongoDB service

1. Inside the project, click **+ New Service → Database → MongoDB**.
2. Wait for it to provision.
3. Click the MongoDB service → **Variables** tab.
4. Copy the value of `MONGO_URL` (you'll use it in step 4).

### Step 3 — Add the API service

1. Click **+ New Service → GitHub Repo**.
2. Select your `scoreboard` repository.
3. Railway will detect the `Dockerfile` in `api/` automatically. If not, set **Root Directory** to `api` in the service settings.
4. Set **Start Command** to `node dist/index.js` (should be picked up from the Dockerfile).

### Step 4 — Set environment variables on the API service

In the API service → **Variables** tab, add:

| Key | Value |
|---|---|
| `MONGODB_URI` | The `MONGO_URL` you copied from the MongoDB service |
| `MONGODB_DB` | `scoreboard` |
| `ADMIN_TOKEN` | A strong random string (keep this secret) |
| `CORS_ORIGINS` | Leave unset to use the defaults, or set custom origins |
| `PORT` | `8080` |

### Step 5 — Get the Railway IDs for GitHub Actions

You need three IDs to configure automated deployment:

1. **Project ID**: In Railway, open your project → **Settings** → copy **Project ID**.
2. **Service ID**: Click the API service → **Settings** → copy **Service ID**.
3. **Environment ID**: In Railway, open your project → **Environments** → click `production` → copy **Environment ID**.

Update `.github/workflows/deploy.yml` — replace the three placeholder values:
```yaml
--service  REPLACE_WITH_RAILWAY_SERVICE_ID
--project  REPLACE_WITH_RAILWAY_PROJECT_ID
--environment  REPLACE_WITH_RAILWAY_ENVIRONMENT_ID
```

### Step 6 — Add GitHub Actions secret

The `RAILWAY_TOKEN` secret authorizes GitHub Actions to deploy. If you've already added it to another repo in this GitHub account:

- Go to your `scoreboard` repository on GitHub.
- **Settings → Secrets and variables → Actions → New repository secret**.
- Name: `RAILWAY_TOKEN`
- Value: Your Railway API token (found at [railway.app/account/tokens](https://railway.app/account/tokens)).

### Step 7 — Verify deployment

Push to `main`. The GitHub Actions workflow will:
1. Run tests.
2. Deploy to Railway (only on `main`).

Check the Railway dashboard to confirm the service is running. Hit `GET /healthz` on the public URL to verify.

### Step 8 — Register your games

Use Postman (or any HTTP client) to create your games:

```
POST https://<your-domain>.railway.app/admin/games
Authorization: Bearer <your ADMIN_TOKEN>
Content-Type: application/json

{
  "id": "your-chosen-uuid",
  "name": "My Game"
}
```

Generate a UUID at [uuidgenerator.net](https://www.uuidgenerator.net/) or with `crypto.randomUUID()` in the browser console.
