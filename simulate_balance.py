#!/usr/bin/env python3
"""
Test different balance configurations.
"""

import random
from game_engine import GameEngine, MarketState, TeamState

def test_config(name: str, standard_bar: int, starting_bar: int, depreciation: float, base_build: int):
    """Test a specific balance configuration."""

    # Temporarily modify constants
    orig_standard = MarketState.STANDARD_BAR
    orig_starting = TeamState.STARTING_BAR
    orig_depreciation = GameEngine.BAR_DEPRECIATION
    orig_build = GameEngine.BASE_BUILD_AMOUNT

    MarketState.STANDARD_BAR = standard_bar
    TeamState.STARTING_BAR = starting_bar
    GameEngine.BAR_DEPRECIATION = depreciation
    GameEngine.BASE_BUILD_AMOUNT = base_build

    results = {"chase_hot": [], "random_fast": [], "balanced": []}

    for seed in range(10):
        game = GameEngine(seed=seed*100)

        strategies = {
            "Chase Hot": "chase_hot",
            "Random Fast": "random_fast",
            "Balanced": "balanced",
        }

        for team_name in strategies:
            game.add_team(team_name)
            game.add_player_to_team(team_name, f"bot_{team_name}")

        stats = {name: {"wins": 0, "losses": 0} for name in strategies}

        game.start_game()

        while game.current_round <= game.TOTAL_ROUNDS:
            for team_name, strategy in strategies.items():
                attrs = game.market.attributes
                team = game.teams[team_name]

                if strategy == "random_fast":
                    decision = random.choice(attrs)
                    speed = random.uniform(2, 8)
                elif strategy == "chase_hot":
                    decision = game.market.hot_attribute if random.random() < 0.6 else random.choice(attrs)
                    speed = random.uniform(8, 15)
                else:  # balanced
                    decision = min(attrs, key=lambda a: team.bars.get(a, 0))
                    speed = random.uniform(15, 22)

                game.round_start_time = game.round_start_time - speed
                game.submit_decision(team_name, decision)
                game.round_start_time = game.round_start_time + speed

            round_results = game.end_round()

            for team_name, result in round_results.items():
                if result["won"]:
                    stats[team_name]["wins"] += 1
                else:
                    stats[team_name]["losses"] += 1

            event = game.advance_round()
            if event == "game_over":
                break

        for team_name, strategy in strategies.items():
            team = game.teams[team_name]
            s = stats[team_name]
            win_rate = s["wins"] / (s["wins"] + s["losses"]) * 100 if (s["wins"] + s["losses"]) > 0 else 0
            results[strategy].append({"cash": team.cash, "win_rate": win_rate})

    # Restore
    MarketState.STANDARD_BAR = orig_standard
    TeamState.STARTING_BAR = orig_starting
    GameEngine.BAR_DEPRECIATION = orig_depreciation
    GameEngine.BASE_BUILD_AMOUNT = orig_build

    # Summarize
    print(f"\n{'='*60}")
    print(f"CONFIG: {name}")
    print(f"  Standard={standard_bar}, Starting={starting_bar}, Deprec={depreciation*100:.0f}%, Build={base_build}")
    print(f"{'='*60}")
    print(f"{'Strategy':<15} {'Avg Cash':>10} {'Avg Win%':>10} {'Range':>15}")
    print("-" * 50)

    for strategy, data in results.items():
        avg_cash = sum(d["cash"] for d in data) / len(data)
        avg_win = sum(d["win_rate"] for d in data) / len(data)
        min_cash = min(d["cash"] for d in data)
        max_cash = max(d["cash"] for d in data)
        print(f"{strategy:<15} ${avg_cash:>9.0f} {avg_win:>9.1f}% ${min_cash:>5}-${max_cash:>5}")

    return results

if __name__ == "__main__":
    print("Testing different balance configurations...")

    # Current broken config
    test_config("CURRENT (broken)",
                standard_bar=50, starting_bar=30, depreciation=0.08, base_build=15)

    # Fix 1: Lower standard to match starting bars
    test_config("Lower Standard",
                standard_bar=30, starting_bar=30, depreciation=0.08, base_build=15)

    # Fix 2: Raise starting bars
    test_config("Higher Starting Bars",
                standard_bar=50, starting_bar=50, depreciation=0.08, base_build=15)

    # Fix 3: Lower standard + lower depreciation
    test_config("Lower Standard + Less Depreciation",
                standard_bar=30, starting_bar=30, depreciation=0.05, base_build=15)

    # Fix 4: Dynamic - standard at 40 (between 30 and 50)
    test_config("Middle Ground (std=40, start=40)",
                standard_bar=40, starting_bar=40, depreciation=0.08, base_build=15)

    # Fix 5: More build power
    test_config("More Build Power",
                standard_bar=50, starting_bar=30, depreciation=0.08, base_build=25)

    # Fix 6: Combined - realistic balance
    test_config("RECOMMENDED: Balanced Config",
                standard_bar=40, starting_bar=40, depreciation=0.06, base_build=18)
