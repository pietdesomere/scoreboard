import { FastifyInstance } from "fastify";

function buildClientJs(baseUrl: string): string {
  return `// =============================================================================
// Scoreboard client
// Served by: ${baseUrl}
// =============================================================================
//
// USAGE
//   <script src="${baseUrl}/client.js"></script>
//
// This exposes window.Scoreboard with three functions:
//
//   Scoreboard.games()
//     Returns a list of all registered games.
//     → Promise<Array<{ id: string, name: string }> | null>
//
//   Scoreboard.submitScore(gameId, version, playerName, score)
//     Submits a score. Returns true if stored, false if the gameId is not
//     registered or a network error occurred (always fails silently).
//     → Promise<boolean>
//
//   Scoreboard.getScoreboard(gameId, options?)
//     Returns the scoreboard for a game and version.
//     options.version — omit to use the version with the most recent submission
//     options.limit   — number of entries (default 10, max 100)
//     → Promise<ScoreboardResult | null>
//
// TYPES
//   ScoreboardResult {
//     gameId:   string
//     gameName: string
//     version:  number | null   (null when no scores exist yet)
//     entries:  ScoreboardEntry[]
//   }
//
//   ScoreboardEntry {
//     rank:       number   (1-based)
//     playerName: string
//     score:      number   (integer, higher is better)
//     createdAt:  string   (ISO 8601)
//   }
//
// EXAMPLE
//   const games = await Scoreboard.games();
//   // [{ id: "550e8400-...", name: "My Game" }, ...]
//
//   await Scoreboard.submitScore("550e8400-...", 1, "Alice", 12345);
//
//   const board = await Scoreboard.getScoreboard("550e8400-...", { limit: 10 });
//   // { gameId: "...", gameName: "My Game", version: 1,
//   //   entries: [{ rank: 1, playerName: "Alice", score: 12345, createdAt: "..." }] }
// =============================================================================

(function (global) {
  var BASE_URL = ${JSON.stringify(baseUrl)};

  async function games() {
    try {
      var response = await fetch(BASE_URL + "/games");
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  async function submitScore(gameId, version, playerName, score) {
    try {
      var response = await fetch(BASE_URL + "/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameId,
          version: version,
          playerName: playerName.trim().slice(0, 50),
          score: Math.floor(score),
        }),
      });
      return response.status === 201;
    } catch (_) {
      return false;
    }
  }

  async function getScoreboard(gameId, options) {
    try {
      var params = new URLSearchParams();
      if (options && options.limit != null) params.set("limit", String(options.limit));
      if (options && options.version != null) params.set("version", String(options.version));
      var query = params.toString() ? "?" + params.toString() : "";
      var response = await fetch(BASE_URL + "/games/" + encodeURIComponent(gameId) + "/scoreboard" + query);
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  global.Scoreboard = { games: games, submitScore: submitScore, getScoreboard: getScoreboard };
})(window);
`;
}

export async function registerClientRoute(app: FastifyInstance): Promise<void> {
  app.get("/client.js", async (request, reply) => {
    const proto = (request.headers["x-forwarded-proto"] as string | undefined) ?? "http";
    const host = (request.headers["x-forwarded-host"] as string | undefined)
      ?? request.headers.host
      ?? "localhost:8080";
    const baseUrl = `${proto}://${host}`;

    return reply
      .header("Content-Type", "application/javascript; charset=utf-8")
      .header("Cache-Control", "public, max-age=3600")
      .send(buildClientJs(baseUrl));
  });
}
