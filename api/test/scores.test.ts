import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { getDb, closeDb } from "../src/db/client.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

beforeEach(async () => {
  const db = await getDb();
  await db.collection("games").deleteMany({});
  await db.collection("scores").deleteMany({});
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

const ADMIN_HEADERS = {
  "content-type": "application/json",
  authorization: "Bearer test-admin-token",
};

const JSON_HEADERS = { "content-type": "application/json" };

async function createGame(id: string, name: string) {
  await app.inject({
    method: "POST",
    url: "/admin/games",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ id, name }),
  });
}

async function submitScore(gameId: string, version: number, playerName: string, score: number) {
  return app.inject({
    method: "POST",
    url: "/scores",
    headers: JSON_HEADERS,
    body: JSON.stringify({ gameId, version, playerName, score }),
  });
}

describe("POST /scores", () => {
  it("returns 204 for unknown gameId", async () => {
    const response = await submitScore("unknown-game", 1, "Alice", 100);
    expect(response.statusCode).toBe(204);
  });

  it("stores score and returns 201 for known game", async () => {
    await createGame("game-x", "Game X");
    const response = await submitScore("game-x", 1, "Alice", 9999);
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.gameId).toBe("game-x");
    expect(body.version).toBe(1);
    expect(body.playerName).toBe("Alice");
    expect(body.score).toBe(9999);
    expect(body.id).toBeDefined();
  });

  it("returns 400 for missing fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/scores",
      headers: JSON_HEADERS,
      body: JSON.stringify({ gameId: "x" }),
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for non-integer score", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/scores",
      headers: JSON_HEADERS,
      body: JSON.stringify({ gameId: "x", version: 1, playerName: "Bob", score: 1.5 }),
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("GET /games/:gameId/scoreboard", () => {
  it("returns 404 for unknown game", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/games/no-such-game/scoreboard",
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns empty entries when no scores exist", async () => {
    await createGame("empty-game", "Empty Game");
    const response = await app.inject({
      method: "GET",
      url: "/games/empty-game/scoreboard",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.entries).toEqual([]);
    expect(body.version).toBeNull();
  });

  it("returns scores sorted by score desc then createdAt asc", async () => {
    await createGame("g1", "Game 1");
    await submitScore("g1", 1, "Alice", 500);
    await submitScore("g1", 1, "Bob", 900);
    await submitScore("g1", 1, "Carol", 700);

    const response = await app.inject({ method: "GET", url: "/games/g1/scoreboard?version=1" });
    expect(response.statusCode).toBe(200);
    const { entries } = response.json();
    expect(entries[0].playerName).toBe("Bob");
    expect(entries[1].playerName).toBe("Carol");
    expect(entries[2].playerName).toBe("Alice");
    expect(entries[0].rank).toBe(1);
    expect(entries[2].rank).toBe(3);
  });

  it("respects the limit parameter", async () => {
    await createGame("g2", "Game 2");
    for (let i = 0; i < 5; i++) {
      await submitScore("g2", 1, `Player${i}`, i * 100);
    }
    const response = await app.inject({ method: "GET", url: "/games/g2/scoreboard?limit=3" });
    expect(response.json().entries).toHaveLength(3);
  });

  it("uses the latest version when version is not specified", async () => {
    await createGame("g3", "Game 3");
    await submitScore("g3", 1, "Alice", 100);
    await submitScore("g3", 2, "Bob", 200);

    const response = await app.inject({ method: "GET", url: "/games/g3/scoreboard" });
    const body = response.json();
    expect(body.version).toBe(2);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].playerName).toBe("Bob");
  });

  it("filters by specific version", async () => {
    await createGame("g4", "Game 4");
    await submitScore("g4", 1, "Alice", 100);
    await submitScore("g4", 2, "Bob", 200);

    const response = await app.inject({ method: "GET", url: "/games/g4/scoreboard?version=1" });
    const body = response.json();
    expect(body.version).toBe(1);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].playerName).toBe("Alice");
  });

  it("allows multiple entries per player", async () => {
    await createGame("g5", "Game 5");
    await submitScore("g5", 1, "Alice", 100);
    await submitScore("g5", 1, "Alice", 200);

    const response = await app.inject({ method: "GET", url: "/games/g5/scoreboard?version=1" });
    expect(response.json().entries).toHaveLength(2);
  });
});
