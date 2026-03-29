import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer;

export async function setup(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "scoreboard-test";
  process.env.ADMIN_TOKEN = "test-admin-token";
  process.env.LOG_LEVEL = "silent";
}

export async function teardown(): Promise<void> {
  await mongod.stop();
}
