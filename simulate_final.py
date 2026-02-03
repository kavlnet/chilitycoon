#!/usr/bin/env python3
"""
Test final balance recommendation.
"""

import random
from game_engine import GameEngine, MarketState, TeamState

def test_config(name: str, standard_bar: int, starting_bar: int, depreciation: float, base_build: int, n_games=20):
    """Test a specific balance configuration."""

    orig_standard = MarketState.STANDARD_BAR
    orig_starting = TeamState.STARTING_BAR
    orig_depreciation = GameEngine.BAR_DEPRECIATION
    orig_build = GameEngine.BASE_BUILD_AMOUNT

    MarketState.STANDARD_BAR = standard_bar
    TeamState.STARTING_BAR = starting_bar
    GameEngine.BAR_DEPRECIATION = depreciation
    GameEngine.BASE_BUILD_AMOUNT = base_build

    results = {"chase_hot_fast": [], "chase_hot_slow": [], "random_fast": [], "random_slow": [], "balanced": []}

    for seed in range(n_games):
        game = GameEngine(seed=seed*100)

        strategies = {
            "Chase Hot (fast)": ("chase_hot", "fast"),
            "Chase Hot (slow)": ("chase_hot", "slow"),
            "Random (fast)": ("random", "fast"),
            "Random (slow)": ("random", "slow"),
            "Balanced": ("balanced", "medium"),
        }

        key_map = {
            "Chase Hot (fast)": "chase_hot_fast",
            "Chase Hot (slow)": "chase_hot_slow",
            "Random (fast)": "random_fast",
            "Random (slow)": "random_slow",
            "Balanced": "balanced",
        }

        for team_name in strategies:
            game.add_team(team_name)
            game.add_player_to_team(team_name, f"bot_{team_name}")

        stats = {name: {"wins": 0, "losses": 0} for name in strategies}

        game.start_game()

        while game.current_round <= game.TOTAL_ROUNDS:
            for team_name, (strat_type, speed_type) in strategies.items():
                attrs = game.market.attributes
                team = game.teams[team_name]

                if strat_type == "random":
                    decision = random.choice(attrs)
                elif strat_type == "chase_hot":
                    decision = game.market.hot_attribute if random.random() < 0.6 else random.choice(attrs)
                else:  # balanced
                    decision = min(attrs, key=lambda a: team.bars.get(a, 0))

                if speed_type == "fast":
                    speed = random.uniform(2, 8)  # 1.5x
                elif speed_type == "medium":
                    speed = random.uniform(12, 18)  # 1.3x
                else:
                    speed = random.uniform(22, 28)  # 1.0x

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

        for team_name, (strat_type, speed_type) in strategies.items():
            team = game.teams[team_name]
            s = stats[team_name]
            win_rate = s["wins"] / (s["wins"] + s["losses"]) * 100 if (s["wins"] + s["losses"]) > 0 else 0
            key = key_map[team_name]
            results[key].append({"cash": team.cash, "win_rate": win_rate, "wins": s["wins"]})

    # Restore
    MarketState.STANDARD_BAR = orig_standard
    TeamState.STARTING_BAR = orig_starting
    GameEngine.BAR_DEPRECIATION = orig_depreciation
    GameEngine.BASE_BUILD_AMOUNT = orig_build

    # Summarize
    print(f"\n{'='*70}")
    print(f"CONFIG: {name}")
    print(f"  Standard={standard_bar}, Starting={starting_bar}, Deprec={depreciation*100:.0f}%, Build={base_build}")
    print(f"{'='*70}")

    order = ["chase_hot_fast", "chase_hot_slow", "random_fast", "random_slow", "balanced"]
    labels = ["Chase Hot + Fast", "Chase Hot + Slow", "Random + Fast", "Random + Slow", "Balanced"]

    print(f"{'Strategy':<20} {'Avg Cash':>10} {'Win Rate':>10} {'Avg Wins':>10}")
    print("-" * 55)

    for key, label in zip(order, labels):
        data = results[key]
        avg_cash = sum(d["cash"] for d in data) / len(data)
        avg_win = sum(d["win_rate"] for d in data) / len(data)
        avg_wins = sum(d["wins"] for d in data) / len(data)
        print(f"{label:<20} ${avg_cash:>9.0f} {avg_win:>9.1f}% {avg_wins:>9.1f}")

    return results

if __name__ == "__main__":
    print("Testing balance configurations to find optimal settings...")
    print("Goal: Good judgment (Chase Hot) should beat random by meaningful margin")
    print("Goal: Speed should amplify results (good or bad)")
    print("Goal: All strategies should be viable (>30% win rate)")

    # Current broken
    test_config("CURRENT (broken)",
                standard_bar=50, starting_bar=30, depreciation=0.08, base_build=15)

    # Proposed fix: Start even, moderate difficulty
    test_config("PROPOSED FIX A: Even start",
                standard_bar=45, starting_bar=45, depreciation=0.08, base_build=15)

    # Proposed fix: Slightly behind, but catchable
    test_config("PROPOSED FIX B: Slight deficit",
                standard_bar=45, starting_bar=40, depreciation=0.06, base_build=18)

    # Proposed fix: Higher stakes
    test_config("PROPOSED FIX C: Higher stakes",
                standard_bar=50, starting_bar=45, depreciation=0.08, base_build=20)
