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
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

const ADMIN_HEADERS = {
  "content-type": "application/json",
  authorization: "Bearer test-admin-token",
};

describe("GET /games", () => {
  it("returns empty array when no games exist", async () => {
    const response = await app.inject({ method: "GET", url: "/games" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("returns id and name of all registered games", async () => {
    await app.inject({ method: "POST", url: "/admin/games", headers: ADMIN_HEADERS, body: JSON.stringify({ id: "g-1", name: "Game One" }) });
    await app.inject({ method: "POST", url: "/admin/games", headers: ADMIN_HEADERS, body: JSON.stringify({ id: "g-2", name: "Game Two" }) });

    const response = await app.inject({ method: "GET", url: "/games" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body).toContainEqual({ id: "g-1", name: "Game One" });
    expect(body).toContainEqual({ id: "g-2", name: "Game Two" });
  });
});

describe("POST /admin/games", () => {
  it("rejects requests with no token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/games",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "game-1", name: "Test Game" }),
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects requests with wrong token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/games",
      headers: { "content-type": "application/json", authorization: "Bearer wrong-token" },
      body: JSON.stringify({ id: "game-1", name: "Test Game" }),
    });
    expect(response.statusCode).toBe(401);
  });

  it("creates a game and returns 201", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/games",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ id: "abc-123", name: "My Game" }),
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBe("abc-123");
    expect(body.name).toBe("My Game");
    expect(body.createdAt).toBeDefined();
  });

  it("returns 409 on duplicate id", async () => {
    await app.inject({
      method: "POST",
      url: "/admin/games",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ id: "dup-id", name: "Game A" }),
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/games",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ id: "dup-id", name: "Game B" }),
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 for missing fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/games",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ name: "No ID" }),
    });
    expect(response.statusCode).toBe(400);
  });
});
