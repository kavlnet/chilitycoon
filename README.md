# Chili Tycoon

A multiplayer strategy game about reading market signals and acting fast. The backend is a Cloudflare Worker with a Durable Object that runs the game loop and WebSocket realtime sync. The front end is vanilla JavaScript with a Balatro-inspired UI.

## Structure

```
chiligame/
├── worker/
│   └── index.js          # Cloudflare Worker + Durable Object game server
├── wrangler.toml         # Cloudflare config
├── static/
│   ├── index.html        # Lobby: create/join room
│   ├── game.html         # Player view
│   ├── host.html         # Host dashboard
│   ├── spectate.html     # Spectator view
│   ├── game.js           # Player logic
│   ├── host.js           # Host logic
│   ├── spectate.js       # Spectator logic
│   ├── style.css         # UI styles
│   └── sounds.js         # Procedural audio
```

## Local Development

1. Install Wrangler (once):

```bash
npm install -g wrangler
```

2. Start the worker (serves static assets and API):

```bash
wrangler dev
```

3. Open the app:

- Lobby: http://localhost:8787
- Host dashboard: click “Open Host Dashboard” after creating a room

## Deployment

```bash
wrangler deploy
```

## Gameplay

- Teams vote on an attribute each round.
- Majority locks in the team decision.
- Fast correct choices build more (speed amplifies judgment).
- Customer feedback hides the market signals.
- A paradigm shift adds a new attribute mid-game.

See `SPEC_DETAILED.md` for the full design rationale and mechanics.
