import { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async (_request, reply) => {
    return reply.send({ ok: true });
  });
}
