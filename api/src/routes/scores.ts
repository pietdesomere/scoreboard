import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { sendError, requireAdmin } from "./auth.js";

const submitScoreSchema = z.object({
  gameId: z.string().min(1),
  version: z.number().int().positive(),
  playerName: z.string().min(1).max(50),
  score: z.number().int(),
});

const scoreboardQuerySchema = z.object({
  version: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  mode: z.enum(["all", "best"]).default("all"),
  playerName: z.string().min(1).max(50).optional(),
});

const deleteScoresQuerySchema = z.object({
  playerName: z.string().min(1).max(50).optional(),
});

export async function registerScoreRoutes(app: FastifyInstance): Promise<void> {
  app.post("/scores", async (request, reply) => {
    const parsed = submitScoreSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, "INVALID_ARGUMENT", parsed.error.issues[0].message);
    }

    const { gameId, version, playerName, score } = parsed.data;
    const db = await getDb();

    const game = await db.collection("games").findOne({ id: gameId });
    if (!game) {
      return reply.status(204).send();
    }

    const createdAt = new Date();
    const result = await db
      .collection("scores")
      .insertOne({ gameId, version, playerName, score, createdAt });

    return reply.status(201).send({
      id: result.insertedId.toHexString(),
      gameId,
      version,
      playerName,
      score,
      createdAt,
    });
  });

  app.delete(
    "/admin/games/:gameId/scores",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { gameId } = request.params as { gameId: string };

      const queryParsed = deleteScoresQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return sendError(reply, "INVALID_ARGUMENT", queryParsed.error.issues[0].message);
      }

      const db = await getDb();

      const game = await db.collection("games").findOne({ id: gameId });
      if (!game) {
        return sendError(reply, "NOT_FOUND", `No game found with id '${gameId}'`);
      }

      const filter: Record<string, unknown> = { gameId, deletedAt: { $exists: false } };
      if (queryParsed.data.playerName) {
        filter.playerName = queryParsed.data.playerName;
      }

      const deletedAt = new Date();
      const result = await db.collection("scores").updateMany(filter, { $set: { deletedAt } });

      return reply.send({ deleted: result.modifiedCount });
    }
  );

  app.get("/games/:gameId/scoreboard", async (request, reply) => {
    const { gameId } = request.params as { gameId: string };

    const queryParsed = scoreboardQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return sendError(reply, "INVALID_ARGUMENT", queryParsed.error.issues[0].message);
    }
    const { version: requestedVersion, limit, mode, playerName } = queryParsed.data;

    const db = await getDb();

    const game = await db.collection("games").findOne({ id: gameId });
    if (!game) {
      return sendError(reply, "NOT_FOUND", `No game found with id '${gameId}'`);
    }

    let version: number | null;
    if (requestedVersion !== undefined) {
      version = requestedVersion;
    } else {
      const latest = await db
        .collection("scores")
        .find({ gameId, deletedAt: { $exists: false } })
        .sort({ version: -1 })
        .limit(1)
        .toArray();
      version = latest.length > 0 ? (latest[0].version as number) : null;
    }

    let entries: { rank: number; playerName: string; score: number; createdAt: Date }[] = [];
    if (version !== null) {
      const baseFilter: Record<string, unknown> = { gameId, version, deletedAt: { $exists: false } };
      if (playerName) {
        baseFilter.playerName = playerName;
      }

      if (mode === "best") {
        const pipeline = [
          { $match: baseFilter },
          { $sort: { score: -1, createdAt: 1 } },
          {
            $group: {
              _id: "$playerName",
              score: { $first: "$score" },
              createdAt: { $first: "$createdAt" },
            },
          },
          { $sort: { score: -1, createdAt: 1 } },
          { $limit: limit },
        ];
        const rows = await db.collection("scores").aggregate(pipeline).toArray();
        entries = rows.map((row, i) => ({
          rank: i + 1,
          playerName: row._id as string,
          score: row.score as number,
          createdAt: row.createdAt as Date,
        }));
      } else {
        const rows = await db
          .collection("scores")
          .find(baseFilter)
          .sort({ score: -1, createdAt: 1 })
          .limit(limit)
          .toArray();

        entries = rows.map((row, i) => ({
          rank: i + 1,
          playerName: row.playerName as string,
          score: row.score as number,
          createdAt: row.createdAt as Date,
        }));
      }
    }

    return reply.send({
      gameId,
      gameName: game.name as string,
      version,
      entries,
    });
  });
}
