#!/usr/bin/env python3
"""
Simulate games to analyze balance.
"""

import random
from game_engine import GameEngine, GamePhase
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class SimResult:
    team: str
    strategy: str
    final_cash: int
    wins: int
    losses: int
    rounds_played: int

def simulate_game(seed: int = None, verbose: bool = False) -> List[SimResult]:
    """Run a full game simulation with different strategies."""

    game = GameEngine(seed=seed)

    # Define team strategies
    strategies = {
        "Random Fast": {"type": "random", "speed": "fast"},
        "Random Slow": {"type": "random", "speed": "slow"},
        "Chase Hot": {"type": "chase_hot", "speed": "medium"},
        "Balanced": {"type": "balanced", "speed": "medium"},
        "Focus Spicy": {"type": "focus", "attr": "spiciness", "speed": "medium"},
    }

    # Add teams
    for team_name in strategies:
        game.add_team(team_name)
        game.add_player_to_team(team_name, f"bot_{team_name}")

    # Track stats
    stats = {name: {"wins": 0, "losses": 0} for name in strategies}

    # Run game
    game.start_game()

    while game.current_round <= game.TOTAL_ROUNDS:
        if verbose:
            print(f"\n=== Round {game.current_round} ===")
            print(f"Hot: {game.market.hot_attribute}")
            print(f"Weights: {game.market.get_weights_display()}")
            print(f"Standard: {game.market.standard:.1f}")

        # Each team makes a decision
        for team_name, strategy in strategies.items():
            decision = get_decision(game, team_name, strategy)
            speed = get_speed(strategy["speed"])

            # Simulate time passing
            game.round_start_time = game.round_start_time - speed
            game.submit_decision(team_name, decision)
            game.round_start_time = game.round_start_time + speed

        # End round
        results = game.end_round()

        for team_name, result in results.items():
            if result["won"]:
                stats[team_name]["wins"] += 1
            else:
                stats[team_name]["losses"] += 1

            if verbose:
                print(f"  {team_name}: score={result['player_score']:.1f}, "
                      f"{'WON' if result['won'] else 'LOST'} ${result['payout']}, "
                      f"built {result['decision']} +{result['build_amount']}")

        # Advance
        event = game.advance_round()
        if event == "game_over":
            break
        if event == "paradigm_shift" and verbose:
            print(f"\n*** PARADIGM SHIFT: {game.paradigm_attribute} added! ***")

    # Compile results
    results = []
    for team_name, strategy in strategies.items():
        team = game.teams[team_name]
        results.append(SimResult(
            team=team_name,
            strategy=strategy["type"],
            final_cash=team.cash,
            wins=stats[team_name]["wins"],
            losses=stats[team_name]["losses"],
            rounds_played=game.current_round - 1,
        ))

    return results

def get_decision(game: GameEngine, team_name: str, strategy: dict) -> str:
    """Get decision based on strategy."""
    attrs = game.market.attributes
    team = game.teams[team_name]

    if strategy["type"] == "random":
        return random.choice(attrs)

    elif strategy["type"] == "chase_hot":
        # Try to guess hot attribute from recent deals
        # (In real game, this would come from reading feedback)
        # Simulate 60% accuracy in guessing
        if random.random() < 0.6:
            return game.market.hot_attribute
        return random.choice(attrs)

    elif strategy["type"] == "balanced":
        # Invest in lowest bar
        lowest = min(attrs, key=lambda a: team.bars.get(a, 0))
        return lowest

    elif strategy["type"] == "focus":
        # Always invest in one attribute
        target = strategy.get("attr", "spiciness")
        if target in attrs:
            return target
        return random.choice(attrs)

    return random.choice(attrs)

def get_speed(speed_type: str) -> float:
    """Get submission time based on speed strategy."""
    if speed_type == "fast":
        return random.uniform(2, 8)  # 1.5x bonus
    elif speed_type == "medium":
        return random.uniform(12, 18)  # 1.3x bonus
    else:
        return random.uniform(22, 28)  # 1.0x bonus

def run_simulations(n: int = 10):
    """Run n simulations and aggregate results."""

    all_results: Dict[str, List[SimResult]] = {}

    for i in range(n):
        results = simulate_game(seed=i*100)
        for r in results:
            if r.team not in all_results:
                all_results[r.team] = []
            all_results[r.team].append(r)

    # Print summary
    print("=" * 70)
    print(f"SIMULATION RESULTS ({n} games)")
    print("=" * 70)

    summaries = []
    for team_name, results in all_results.items():
        avg_cash = sum(r.final_cash for r in results) / len(results)
        avg_wins = sum(r.wins for r in results) / len(results)
        avg_losses = sum(r.losses for r in results) / len(results)
        win_rate = avg_wins / (avg_wins + avg_losses) * 100 if (avg_wins + avg_losses) > 0 else 0

        summaries.append({
            "team": team_name,
            "strategy": results[0].strategy,
            "avg_cash": avg_cash,
            "avg_wins": avg_wins,
            "avg_losses": avg_losses,
            "win_rate": win_rate,
            "best": max(r.final_cash for r in results),
            "worst": min(r.final_cash for r in results),
        })

    # Sort by avg cash
    summaries.sort(key=lambda x: x["avg_cash"], reverse=True)

    print(f"\n{'Team':<20} {'Strategy':<12} {'Avg Cash':>10} {'Win Rate':>10} {'Best':>8} {'Worst':>8}")
    print("-" * 70)

    for s in summaries:
        print(f"{s['team']:<20} {s['strategy']:<12} ${s['avg_cash']:>9.0f} {s['win_rate']:>9.1f}% ${s['best']:>7} ${s['worst']:>7}")

    # Additional analysis
    print("\n" + "=" * 70)
    print("ADDITIONAL METRICS")
    print("=" * 70)

    # Check first-round stats
    print("\nFirst game detailed look:")
    results = simulate_game(seed=999, verbose=False)
    game = GameEngine(seed=999)
    for team_name in ["Random Fast", "Chase Hot"]:
        game.add_team(team_name)
    game.start_game()

    print(f"\nInitial state:")
    print(f"  Starting bars: 30 each")
    print(f"  Market standard: {game.market.standard:.1f}")
    print(f"  Initial weights: {game.market.get_weights_display()}")

    # Calculate initial score
    test_score = sum(30 * w for w in game.market.weights.values())
    print(f"  Initial player score (all bars at 30): {test_score:.1f}")
    print(f"  Margin at start: {test_score - game.market.standard:.1f}")

    return summaries

if __name__ == "__main__":
    run_simulations(10)
