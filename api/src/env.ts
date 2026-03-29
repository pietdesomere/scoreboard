export const env = {
  get PORT() { return parseInt(process.env.PORT ?? "8080", 10); },
  get MONGODB_URI() { return process.env.MONGODB_URI ?? "mongodb://localhost:27017"; },
  get MONGODB_DB() { return process.env.MONGODB_DB ?? "scoreboard"; },
  get ADMIN_TOKEN() { return process.env.ADMIN_TOKEN ?? ""; },
  get CORS_ORIGINS() { return process.env.CORS_ORIGINS ?? ""; },
  get LOG_LEVEL() { return process.env.LOG_LEVEL ?? "info"; },
};
