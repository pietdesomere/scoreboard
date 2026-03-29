# Scoreboard — Integration Guide for HTML/JS Games

## Overview

The Scoreboard API lets your browser game:
1. **Submit** a player's score when a run ends.
2. **Display** a leaderboard sorted by score.

No login or API key is needed for these two operations. You only need your game's **Game ID** (a UUID that was registered on the server by the admin).

---

## Quick start

```html
<script>
const SCOREBOARD_URL = 'https://<your-domain>.railway.app';
const GAME_ID = 'your-game-uuid-here';
const GAME_VERSION = 1;
</script>
```

---

## Submitting a score

Call this when the player finishes a run (game over screen, level complete, etc.).

```javascript
async function submitScore(playerName, score) {
  try {
    const response = await fetch(`${SCOREBOARD_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: GAME_ID,
        version: GAME_VERSION,
        playerName: playerName.trim(),
        score: Math.floor(score)   // must be an integer
      })
    });
    return response.status === 201;  // true = stored, false = ignored
  } catch {
    return false;  // network error — fail silently
  }
}
```

**Usage:**
```javascript
const saved = await submitScore('Alice', 12345);
```

> If `GAME_ID` is not recognized by the server, the server returns `204` and the score is silently ignored. This means you can ship the game before registering it and no errors will be thrown.

---

## Displaying the scoreboard

```javascript
async function getScoreboard(limit = 10) {
  try {
    const params = new URLSearchParams({ limit });
    // Optionally pin a version: params.set('version', GAME_VERSION);
    const response = await fetch(
      `${SCOREBOARD_URL}/games/${GAME_ID}/scoreboard?${params}`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
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

```javascript
// After game over:
const name = prompt('Enter your name:') || 'Anonymous';
await submitScore(name, finalScore);

// Show leaderboard:
await renderScoreboard('leaderboard-div');
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
