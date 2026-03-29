import { buildApp } from "./app.js";
import { closeDb } from "./db/client.js";
import { env } from "./env.js";

async function main(): Promise<void> {
  const app = await buildApp();

  const shutdown = async () => {
    await app.close();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
