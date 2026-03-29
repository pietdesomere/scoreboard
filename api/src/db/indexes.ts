import { getDb } from "./client.js";

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  await db.collection("games").createIndex({ id: 1 }, { unique: true });

  await db.collection("scores").createIndex(
    { gameId: 1, version: 1, score: -1, createdAt: 1 }
  );
  await db.collection("scores").createIndex(
    { gameId: 1, version: -1 }
  );
}
