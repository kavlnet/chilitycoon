#!/usr/bin/env python3
"""
Chili Game Server - FastAPI + WebSocket for multiplayer gameplay.

Run with: python server.py
Then open: http://localhost:8000
"""

import asyncio
import random
from typing import Dict, Set, Optional, Tuple
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from game_engine import GameEngine, GamePhase
from feedback_gen import ATTRIBUTES as BASE_ATTRIBUTES


# Connection manager for WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, Tuple[WebSocket, str]] = {}
        self.teams: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, player_id: str, team_name: str):
        await websocket.accept()
        self.connections[player_id] = (websocket, team_name)

        if team_name not in self.teams:
            self.teams[team_name] = set()
        self.teams[team_name].add(player_id)

    def disconnect(self, player_id: str):
        if player_id in self.connections:
            _, team_name = self.connections[player_id]
            del self.connections[player_id]

            if team_name in self.teams:
                self.teams[team_name].discard(player_id)
                if not self.teams[team_name]:
                    del self.teams[team_name]

    async def send_to_player(self, player_id: str, message: dict):
        if player_id in self.connections:
            ws, _ = self.connections[player_id]
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def send_to_team(self, team_name: str, message: dict):
        if team_name in self.teams:
            for player_id in self.teams[team_name]:
                await self.send_to_player(player_id, message)

    async def broadcast(self, message: dict):
        for player_id in list(self.connections.keys()):
            await self.send_to_player(player_id, message)

    async def broadcast_team_states(self, game: GameEngine):
        """Send each team their own bar state."""
        for player_id, (ws, team_name) in list(self.connections.items()):
            team_state = game.get_team_state(team_name)
            if team_state:
                await self.send_to_player(player_id, {
                    "type": "team_state",
                    "bars": team_state["bars"],
                    "cash": team_state["cash"],
                })


# Global game state
game = GameEngine()
manager = ConnectionManager()
round_task = None
single_player_mode = False

# Bot configurations
BOT_TEAMS = [
    {"name": "Speed Demons", "strategy": "random_fast", "delay": (2, 8)},
    {"name": "Careful Readers", "strategy": "smart", "delay": (15, 25)},
    {"name": "Chaos Crew", "strategy": "random", "delay": (5, 18)},
]


def reset_game():
    global game, single_player_mode
    game = GameEngine()
    single_player_mode = False


def add_bot_teams():
    global game
    for bot in BOT_TEAMS:
        game.add_team(bot["name"])
        game.add_player_to_team(bot["name"], f"bot_{bot['name']}")


def get_bot_decision(bot_config: dict) -> str:
    strategy = bot_config["strategy"]
    # Use game's current attributes (can grow during paradigm shift)
    current_attrs = game.market.attributes

    if strategy == "random":
        return random.choice(current_attrs)
    elif strategy == "random_fast":
        return random.choice(current_attrs)
    elif strategy == "smart":
        # 70% chance to pick hot attribute
        if random.random() < 0.7:
            return game.market.hot_attribute
        return random.choice(current_attrs)

    return random.choice(current_attrs)


async def bot_decision_task(bot_config: dict):
    # Scale delay for single player mode (shorter rounds)
    delay_min, delay_max = bot_config["delay"]
    if single_player_mode:
        delay_min = delay_min / 2
        delay_max = delay_max / 2

    await asyncio.sleep(random.uniform(delay_min, delay_max))

    if game.phase == GamePhase.ROUND:
        decision = get_bot_decision(bot_config)
        result = game.submit_decision(bot_config["name"], decision)
        if result:
            print(f"Bot {bot_config['name']} submitted {decision}")


async def schedule_bot_decisions():
    if not single_player_mode:
        return

    for bot in BOT_TEAMS:
        if bot["name"] in game.teams:
            asyncio.create_task(bot_decision_task(bot))


async def round_timer():
    global game

    while True:
        await asyncio.sleep(0.5)

        if game.phase == GamePhase.ROUND:
            if game.is_round_complete():
                await end_current_round()


async def end_current_round():
    global game

    print(f"Ending round {game.current_round}")
    results = game.end_round()
    print(f"Results: {list(results.keys())}")

    # Send results with team-specific feedback and debug info
    debug_info = game.get_debug_info()
    for player_id, (ws, team_name) in list(manager.connections.items()):
        feedback_items = game.get_team_feedback(team_name)
        await manager.send_to_player(player_id, {
            "type": "round_results",
            "round": game.current_round,
            "results": results,
            "feedback": feedback_items,
            "hot_attribute": game.market.hot_attribute,
            "leaderboard": game.get_leaderboard(),
            "debug": debug_info,
        })

    # Also send updated leaderboard separately to ensure it updates
    await manager.broadcast({
        "type": "teams_updated",
        "leaderboard": game.get_leaderboard(),
    })

    # Pause to read results and feedback
    await asyncio.sleep(8)

    # Advance to next round
    event = game.advance_round()
    print(f"Advanced to round {game.current_round}, event={event}")

    if event == "game_over":
        await manager.broadcast({
            "type": "game_over",
            "leaderboard": game.get_leaderboard(),
        })
    elif event == "paradigm_shift":
        # Brief paradigm shift alert with the new attribute name
        new_attr = game.paradigm_attribute
        await manager.broadcast({
            "type": "paradigm_shift",
            "message": f"PARADIGM SHIFT! '{new_attr.upper()}' is now a market factor!",
            "new_attribute": new_attr,
            "attributes": game.market.attributes,
        })
        # Short delay, then start the new round
        await asyncio.sleep(2)
        await start_round()
    else:
        await start_round()


async def start_round():
    """Start a new round - decision only, feedback comes with results."""
    global game

    # Send round start with current state
    for player_id, (ws, team_name) in list(manager.connections.items()):
        team_state = game.get_team_state(team_name)
        await manager.send_to_player(player_id, {
            "type": "round_start",
            "round": game.current_round,
            "total_rounds": game.TOTAL_ROUNDS,
            "time_limit": game.ROUND_DURATION,
            "paradigm_shifted": game.paradigm_shifted,
            "bars": team_state["bars"] if team_state else {},
            "cash": team_state["cash"] if team_state else 0,
            "attributes": game.market.attributes,
        })

    # Schedule bot decisions
    await schedule_bot_decisions()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global round_task
    round_task = asyncio.create_task(round_timer())
    yield
    if round_task:
        round_task.cancel()


app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/game")
async def game_page():
    return FileResponse("static/game.html")


@app.get("/api/teams")
async def get_teams():
    teams = []
    for team_name, team in game.teams.items():
        teams.append({
            "name": team_name,
            "players": len(team.players),
            "cash": team.cash,
        })
    return {"teams": teams}


@app.get("/api/state")
async def get_state():
    return game.get_game_state()


@app.websocket("/ws/{player_id}/{team_name}")
async def websocket_endpoint(websocket: WebSocket, player_id: str, team_name: str):
    global game

    await manager.connect(websocket, player_id, team_name)
    game.add_player_to_team(team_name, player_id)

    team_state = game.get_team_state(team_name)
    await manager.send_to_player(player_id, {
        "type": "connected",
        "player_id": player_id,
        "team_name": team_name,
        "game_state": game.get_game_state(),
        "bars": team_state["bars"] if team_state else {},
        "cash": team_state["cash"] if team_state else 0,
    })

    await manager.broadcast({
        "type": "teams_updated",
        "leaderboard": game.get_leaderboard(),
    })

    try:
        while True:
            data = await websocket.receive_json()
            await handle_message(player_id, team_name, data)
    except WebSocketDisconnect:
        manager.disconnect(player_id)
        game.remove_player(team_name, player_id)

        await manager.broadcast({
            "type": "teams_updated",
            "leaderboard": game.get_leaderboard(),
        })


async def handle_message(player_id: str, team_name: str, data: dict):
    global game, single_player_mode

    msg_type = data.get("type")

    if msg_type == "start_game":
        if len(game.teams) > 0 and game.phase == GamePhase.WAITING:
            game.start_game()
            await start_round()

    elif msg_type == "start_single_player":
        if game.phase == GamePhase.WAITING:
            single_player_mode = True
            # Faster settings for single player
            game.ROUND_DURATION = 15
            game.TOTAL_ROUNDS = 15
            game.PARADIGM_SHIFT_ROUND = 8
            add_bot_teams()
            game.start_game()
            await manager.broadcast({
                "type": "teams_updated",
                "leaderboard": game.get_leaderboard(),
            })
            await start_round()

    elif msg_type == "submit_decision":
        decision = data.get("decision")
        if decision:
            result = game.submit_decision(team_name, decision)
            if result:
                await manager.send_to_team(team_name, {
                    "type": "decision_submitted",
                    "decision": decision,
                    "submit_time": result["submit_time"],
                })
                # Broadcast submission count to all players
                submitted_count = sum(1 for t in game.teams.values() if t.current_decision)
                total_teams = len(game.teams)
                await manager.broadcast({
                    "type": "submission_update",
                    "submitted": submitted_count,
                    "total": total_teams,
                })

    elif msg_type == "reset_game":
        reset_game()
        await manager.broadcast({
            "type": "game_reset",
            "message": "Game has been reset.",
        })


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 60)
    print("  CHILI GAME SERVER")
    print("=" * 60)
    print("\nStarting server at http://localhost:8000")
    print("Share with players: http://<your-ip>:8000")
    print("\nPress Ctrl+C to stop\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
