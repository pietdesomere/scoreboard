import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { requireAdmin, sendError } from "./auth.js";

const createGameSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
});

export async function registerGameRoutes(app: FastifyInstance): Promise<void> {
  app.get("/games", async (_request, reply) => {
    const db = await getDb();
    const games = await db.collection("games").find({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
    return reply.send(games);
  });

  app.post(
    "/admin/games",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = createGameSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, "INVALID_ARGUMENT", parsed.error.issues[0].message);
      }

      const { id, name } = parsed.data;
      const db = await getDb();
      const createdAt = new Date();

      try {
        await db.collection("games").insertOne({ id, name, createdAt });
      } catch (err: unknown) {
        if (isMongoConflict(err)) {
          return sendError(reply, "CONFLICT", `A game with id '${id}' already exists`);
        }
        throw err;
      }

      return reply.status(201).send({ id, name, createdAt });
    }
  );
}

function isMongoConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}
