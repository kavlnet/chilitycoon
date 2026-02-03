#!/usr/bin/env python3
"""
Test startup-style balance: players start behind market but can win with good judgment.
"""

import random
from game_engine import GameEngine, MarketState, TeamState

def test_config(name: str, standard_bar: int, starting_bar: int, margin_mult: float, n_games=15):
    """Test a specific balance configuration with detailed early-game stats."""

    orig_standard = MarketState.STANDARD_BAR
    orig_starting = TeamState.STARTING_BAR
    orig_margin = GameEngine.MARGIN_MULTIPLIER

    MarketState.STANDARD_BAR = standard_bar
    TeamState.STARTING_BAR = starting_bar
    GameEngine.MARGIN_MULTIPLIER = margin_mult

    results = {
        "smart_fast": [],   # 80% accuracy, fast
        "smart_slow": [],   # 80% accuracy, slow
        "random_fast": [],  # random, fast
        "random_slow": [],  # random, slow
    }

    # Track early game (first 5 rounds) vs late game
    early_wins = {k: [] for k in results}
    late_wins = {k: [] for k in results}

    for seed in range(n_games):
        game = GameEngine(seed=seed*100)

        strategies = {
            "Smart + Fast": ("smart", "fast"),
            "Smart + Slow": ("smart", "slow"),
            "Random + Fast": ("random", "fast"),
            "Random + Slow": ("random", "slow"),
        }

        key_map = {
            "Smart + Fast": "smart_fast",
            "Smart + Slow": "smart_slow",
            "Random + Fast": "random_fast",
            "Random + Slow": "random_slow",
        }

        for team_name in strategies:
            game.add_team(team_name)
            game.add_player_to_team(team_name, f"bot_{team_name}")

        stats = {name: {"wins": 0, "losses": 0, "early_wins": 0, "early_total": 0, "late_wins": 0, "late_total": 0} for name in strategies}

        game.start_game()

        while game.current_round <= game.TOTAL_ROUNDS:
            is_early = game.current_round <= 5

            for team_name, (strat_type, speed_type) in strategies.items():
                attrs = game.market.attributes
                team = game.teams[team_name]

                if strat_type == "smart":
                    # 80% chance to pick hot attribute (good feedback reader)
                    decision = game.market.hot_attribute if random.random() < 0.8 else random.choice(attrs)
                else:
                    decision = random.choice(attrs)

                if speed_type == "fast":
                    speed = random.uniform(2, 8)
                else:
                    speed = random.uniform(22, 28)

                game.round_start_time = game.round_start_time - speed
                game.submit_decision(team_name, decision)
                game.round_start_time = game.round_start_time + speed

            round_results = game.end_round()

            for team_name, result in round_results.items():
                s = stats[team_name]
                if result["won"]:
                    s["wins"] += 1
                    if is_early:
                        s["early_wins"] += 1
                else:
                    s["losses"] += 1

                if is_early:
                    s["early_total"] += 1
                else:
                    s["late_wins"] += result["won"]
                    s["late_total"] += 1

            event = game.advance_round()
            if event == "game_over":
                break

        for team_name, (strat_type, speed_type) in strategies.items():
            team = game.teams[team_name]
            s = stats[team_name]
            win_rate = s["wins"] / (s["wins"] + s["losses"]) * 100 if (s["wins"] + s["losses"]) > 0 else 0
            early_rate = s["early_wins"] / s["early_total"] * 100 if s["early_total"] > 0 else 0
            late_rate = s["late_wins"] / s["late_total"] * 100 if s["late_total"] > 0 else 0

            key = key_map[team_name]
            results[key].append({
                "cash": team.cash,
                "win_rate": win_rate,
                "early_rate": early_rate,
                "late_rate": late_rate,
            })

    # Restore
    MarketState.STANDARD_BAR = orig_standard
    TeamState.STARTING_BAR = orig_starting
    GameEngine.MARGIN_MULTIPLIER = orig_margin

    # Summarize
    deficit = standard_bar - starting_bar
    print(f"\n{'='*75}")
    print(f"CONFIG: {name}")
    print(f"  Standard={standard_bar}, Starting={starting_bar} (deficit={deficit}), MarginMult={margin_mult}")
    print(f"{'='*75}")

    order = ["smart_fast", "smart_slow", "random_fast", "random_slow"]
    labels = ["Smart + Fast", "Smart + Slow", "Random + Fast", "Random + Slow"]

    print(f"{'Strategy':<18} {'Avg Cash':>10} {'Overall':>10} {'Early (1-5)':>12} {'Late (6+)':>12}")
    print("-" * 65)

    for key, label in zip(order, labels):
        data = results[key]
        avg_cash = sum(d["cash"] for d in data) / len(data)
        avg_win = sum(d["win_rate"] for d in data) / len(data)
        avg_early = sum(d["early_rate"] for d in data) / len(data)
        avg_late = sum(d["late_rate"] for d in data) / len(data)
        print(f"{label:<18} ${avg_cash:>9.0f} {avg_win:>9.1f}% {avg_early:>11.1f}% {avg_late:>11.1f}%")

    return results

if __name__ == "__main__":
    print("Testing startup-style balance...")
    print("Goal: Smart players can win early, random players struggle early but catch up later")
    print("Smart = 80% accuracy guessing hot attribute")

    # Small deficit
    test_config("Small Deficit (5 points)",
                standard_bar=50, starting_bar=45, margin_mult=1.0)

    # Medium deficit
    test_config("Medium Deficit (8 points)",
                standard_bar=50, starting_bar=42, margin_mult=1.0)

    # Larger deficit
    test_config("Larger Deficit (10 points)",
                standard_bar=50, starting_bar=40, margin_mult=1.0)

    # Larger deficit with higher margin reward
    test_config("Larger Deficit + Higher Margin Reward",
                standard_bar=50, starting_bar=40, margin_mult=1.5)

    # Sweet spot attempt
    test_config("RECOMMENDED: Startup Balance",
                standard_bar=50, starting_bar=42, margin_mult=1.2)
