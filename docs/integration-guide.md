# Scoreboard — Integration Guide for HTML/JS Games

## Overview

The Scoreboard API lets your browser game:
1. **Submit** a player's score when a run ends.
2. **Display** a leaderboard sorted by score.

No login or API key is needed for these two operations. You only need your game's **Game ID** (a UUID that was registered on the server by the admin).

---

## Quick start

Add one script tag to your HTML — the client is served directly from the API and comes pre-configured with the correct URL:

```html
<script src="https://<your-domain>.railway.app/client.js"></script>
```

Then set your game's constants:

```html
<script>
const GAME_ID = 'your-game-uuid-here';
const GAME_VERSION = 1;
</script>
```

---

## Submitting a score

Call this when the player finishes a run (game over screen, level complete, etc.).

```javascript
const saved = await Scoreboard.submitScore(GAME_ID, GAME_VERSION, playerName, score);
// saved === true  → score was stored
// saved === false → game not found, or network error (both fail silently)
```

> If `GAME_ID` is not yet registered on the server, the score is silently ignored and `false` is returned. You can ship the game before registering it without any errors.

---

## Displaying the scoreboard

```javascript
const data = await Scoreboard.getScoreboard(GAME_ID, { limit: 10 });
// data === null on network error or unknown game
```

**Response shape:**
```json
{
  "gameId": "...",
  "gameName": "My Game",
  "version": 1,
  "entries": [
    { "rank": 1, "playerName": "Alice", "score": 12345, "createdAt": "2026-01-15T10:31:00.000Z" },
    { "rank": 2, "playerName": "Bob",   "score": 9876,  "createdAt": "2026-01-15T10:32:00.000Z" }
  ]
}
```

To pin a specific version:
```javascript
const data = await Scoreboard.getScoreboard(GAME_ID, { version: 1, limit: 10 });
```

**Rendering example:**
```javascript
async function renderScoreboard(containerId) {
  const data = await getScoreboard(10);
  const container = document.getElementById(containerId);

  if (!data || data.entries.length === 0) {
    container.innerHTML = '<p>No scores yet. Be the first!</p>';
    return;
  }

  const rows = data.entries.map(e =>
    `<tr>
      <td>${e.rank}</td>
      <td>${escapeHtml(e.playerName)}</td>
      <td>${e.score.toLocaleString()}</td>
    </tr>`
  ).join('');

  container.innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

> Always escape player names before inserting into HTML — they are user-supplied strings.

---

## Full example flow

```html
<script src="https://<your-domain>.railway.app/client.js"></script>
<script>
  const GAME_ID = 'your-game-uuid-here';
  const GAME_VERSION = 1;

  async function onGameOver(finalScore) {
    const name = prompt('Enter your name:') || 'Anonymous';
    await Scoreboard.submitScore(GAME_ID, GAME_VERSION, name, finalScore);
    await renderScoreboard('leaderboard-div');
  }

  async function renderScoreboard(containerId) {
    const data = await Scoreboard.getScoreboard(GAME_ID, { limit: 10 });
    const container = document.getElementById(containerId);
    if (!data || data.entries.length === 0) {
      container.innerHTML = '<p>No scores yet. Be the first!</p>';
      return;
    }
    const rows = data.entries.map(e =>
      `<tr><td>${e.rank}</td><td>${escapeHtml(e.playerName)}</td><td>${e.score.toLocaleString()}</td></tr>`
    ).join('');
    container.innerHTML = `
      <table>
        <thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
</script>
```

---

## Versioning

The `version` field lets you have separate leaderboards per game version. If you fix a bug that changes achievable scores, bump the version so old and new scores don't mix.

```javascript
const GAME_VERSION = 2;  // bump when game balance changes significantly
```

When retrieving a scoreboard without specifying `version`, the server returns scores for the version with the most recent submission.

---

## Tips

- **Player names**: 1–50 characters. The game should enforce a reasonable max length before calling the API.
- **Fail silently**: Wrap all API calls in try/catch and don't block the game flow on network errors.
- **Multiple submissions**: A player can submit multiple scores; all are shown on the leaderboard. Consider only submitting the score if it exceeds the player's previous best (tracked locally), to keep the leaderboard clean.
- **CORS**: The API only accepts requests from `somere.be`, `emieldesomere.be`, `mauricedesomere.be` (and their `www.` variants). Local `localhost` is also allowed for development.
