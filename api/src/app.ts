import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { ensureIndexes } from "./db/indexes.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerGameRoutes } from "./routes/games.js";
import { registerScoreRoutes } from "./routes/scores.js";

const DEFAULT_ORIGINS = [
  "https://somere.be",
  "https://www.somere.be",
  "https://emieldesomere.be",
  "https://www.emieldesomere.be",
  "https://mauricedesomere.be",
  "https://www.mauricedesomere.be",
  "http://localhost:3000",
  "http://localhost:8080",
];

function buildAllowedOrigins(): string[] {
  const override = env.CORS_ORIGINS.trim();
  if (override) {
    return override.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return DEFAULT_ORIGINS;
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  const allowedOrigins = buildAllowedOrigins();

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
  });

  await registerHealthRoutes(app);
  await registerGameRoutes(app);
  await registerScoreRoutes(app);

  await app.ready();
  await ensureIndexes();
  return app;
}
