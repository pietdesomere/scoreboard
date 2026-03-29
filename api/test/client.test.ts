import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { closeDb } from "../src/db/client.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe("GET /client.js", () => {
  it("returns JavaScript with correct content-type", async () => {
    const response = await app.inject({ method: "GET", url: "/client.js" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/javascript");
  });

  it("injects the base URL into the script", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/client.js",
      headers: { host: "api.example.com" },
    });
    expect(response.body).toContain("http://api.example.com");
  });

  it("uses x-forwarded-proto and x-forwarded-host when present", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/client.js",
      headers: {
        host: "api.example.com",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "scoreboard.railway.app",
      },
    });
    expect(response.body).toContain("https://scoreboard.railway.app");
  });

  it("exposes games, submitScore and getScoreboard on window.Scoreboard", async () => {
    const response = await app.inject({ method: "GET", url: "/client.js" });
    expect(response.body).toContain("games");
    expect(response.body).toContain("submitScore");
    expect(response.body).toContain("getScoreboard");
    expect(response.body).toContain("window.Scoreboard");
  });
});
