#!/usr/bin/env python3
"""Chili Game - Single player text-based playtest version"""

import random
import time

class ChiliGame:
    def __init__(self):
        self.cash = 0
        self.build_points = 0
        self.round = 0
        self.game_over = False
        self.paradigm_shift = None
        self.paradigm_shift_time = 90  # Paradigm shift at ~90 seconds

        # Time-based: game lasts 3 minutes
        self.game_duration = 180  # seconds
        self.start_time = None

        # Strength bars - start at 30 for better early game
        self.bars = {
            "flavor": 30,
            "spiciness": 30,
            "portion": 30,
            "speed": 30,
            "ambiance": 30,
        }

        # Locked bars (from big bets)
        self.locked_bars = {}  # bar_name -> rounds_remaining

        # Strategy
        self.strategy = None
        self.strategies = {
            "gourmet": {"desc": "Deals pay 2x, but need 50+ on both bars to win", "multiplier": 2.0, "min_bar": 50},
            "fast_casual": {"desc": "Easy wins, but deals pay 0.5x", "multiplier": 0.5, "min_bar": 0},
            "franchise": {"desc": "Balanced, but bars below 25 hurt all deals", "multiplier": 1.0, "min_bar": 0},
            "food_truck": {"desc": "No ambiance needed, -20% costs", "multiplier": 1.0, "min_bar": 0},
            "ghost_kitchen": {"desc": "Only flavor/speed/portion matter, but speed must be highest", "multiplier": 1.0, "min_bar": 0},
        }

        # Hires
        self.passive_build = 0
        self.passive_sell = 0

        # Events
        self.active_events = []  # list of (event_name, rounds_remaining)

    def choose_strategy(self):
        print("\n=== CHOOSE YOUR STRATEGY (one-way door!) ===\n")
        for i, (name, info) in enumerate(self.strategies.items(), 1):
            print(f"  {i}. {name.upper()}: {info['desc']}")

        while True:
            try:
                choice = input("\nPick a strategy (1-5): ").strip()
                idx = int(choice) - 1
                if 0 <= idx < len(self.strategies):
                    self.strategy = list(self.strategies.keys())[idx]
                    print(f"\nYou chose: {self.strategy.upper()}")
                    return
            except (ValueError, IndexError):
                pass
            print("Invalid choice. Enter 1-5.")

    def time_remaining(self):
        if self.start_time is None:
            return self.game_duration
        return max(0, self.game_duration - (time.time() - self.start_time))

    def show_status(self):
        remaining = int(self.time_remaining())
        mins, secs = divmod(remaining, 60)
        print(f"\n{'='*50}")
        print(f"ROUND {self.round} | Cash: ${self.cash} | Build Points: {self.build_points} | Time: {mins}:{secs:02d}")
        print(f"Strategy: {self.strategy.upper()}")
        print(f"{'='*50}")

        print("\nStrength Bars:")
        for bar, value in self.bars.items():
            locked = f" [LOCKED {self.locked_bars[bar]} rounds]" if bar in self.locked_bars else ""
            print(f"  {bar.capitalize():12} {'█' * (value // 5):<20} {value}/100{locked}")

        if self.passive_build or self.passive_sell:
            print(f"\nPassive: +{self.passive_build} build/round, +{self.passive_sell} sell/round")

        if self.active_events:
            print("\nActive Events:")
            for event, rounds in self.active_events:
                print(f"  - {event} ({rounds} rounds left)")

        if self.paradigm_shift:
            print(f"\n*** PARADIGM SHIFT: {self.paradigm_shift} ***")

    def do_build(self):
        self.build_points += 1
        print(f"\nYou focused on building. +1 build point (total: {self.build_points})")

    def do_sell(self):
        # Generate a deal
        bar_names = list(self.bars.keys())

        # Ghost kitchen special rule
        if self.strategy == "ghost_kitchen":
            bar_names = ["flavor", "speed", "portion"]

        # Food truck: no ambiance needed
        if self.strategy == "food_truck" and "ambiance" in bar_names:
            bar_names.remove("ambiance")

        # Ambiance worthless after ghost kitchen paradigm shift
        if self.paradigm_shift == "ghost_kitchens" and "ambiance" in bar_names:
            bar_names.remove("ambiance")

        req1, req2 = random.sample(bar_names, 2)

        # Calculate score
        score = self.bars[req1] + self.bars[req2]

        # Apply paradigm shift effects
        if self.paradigm_shift == "ai_recipes" and "speed" in [req1, req2]:
            speed_bonus = self.bars["speed"] * 2  # 3x total means 2x extra
            score += speed_bonus
        elif self.paradigm_shift == "health_conscious" and "portion" in [req1, req2]:
            score -= self.bars["portion"] * 2  # portion now hurts

        # Determine deal type and threshold
        is_pvp = random.random() < 0.3
        strat = self.strategies[self.strategy]

        # Much lower thresholds - starting score is ~60, should win often early
        if is_pvp:
            threshold = random.randint(50, 80)
            base_payout = random.randint(50, 100)
            deal_type = "BIG CONTRACT"
        else:
            threshold = random.randint(35, 55)
            base_payout = random.randint(15, 30)
            deal_type = "Local customer"

        # Apply strategy multiplier
        payout = int(base_payout * strat["multiplier"])

        # Gourmet: need both bars at 50+ to even attempt
        if self.strategy == "gourmet":
            if self.bars[req1] < 50 or self.bars[req2] < 50:
                print(f"\n{deal_type}: Needs {req1} + {req2}")
                print(f"FAILED - Gourmet requires 50+ on both bars! ({req1}={self.bars[req1]}, {req2}={self.bars[req2]})")
                return

        # Franchise: penalty if any bar below 25
        if self.strategy == "franchise":
            low_bars = [b for b, v in self.bars.items() if v < 25]
            if low_bars:
                penalty = len(low_bars) * 10
                score -= penalty
                print(f"(Franchise penalty: -{penalty} for low bars: {', '.join(low_bars)})")

        # Paradigm shift: gourmet wins
        if self.paradigm_shift == "gourmet_wins" and base_payout < 30:
            print(f"\n{deal_type}: Needs {req1} + {req2}")
            print("Deal too small - no premium customers want this!")
            return

        # Ghost kitchen speed check
        if self.strategy == "ghost_kitchen":
            max_bar = max(self.bars.values())
            if self.bars["speed"] < max_bar:
                print(f"\n{deal_type}: Needs {req1} + {req2}")
                print("FAILED - Speed must be your highest bar for ghost kitchen!")
                return

        print(f"\n{deal_type}: Needs {req1} + {req2}")
        print(f"Your score: {score} vs threshold: {threshold}")

        if score >= threshold:
            self.cash += payout
            print(f"WIN! +${payout} (Total: ${self.cash})")
        else:
            print(f"LOST by {threshold - score} points")

    def spend_build_points(self):
        while self.build_points >= 5:
            print(f"\nBuild points: {self.build_points}")
            print("  1. Improve a bar (+10) - costs 5 BP")
            print("  2. Big bet (+30, locks for 5 rounds) - costs 20 BP")
            print("  3. Skip")

            choice = input("\nChoice: ").strip()

            if choice == "1" and self.build_points >= 5:
                self.pick_bar_to_improve(5, 10)
            elif choice == "2" and self.build_points >= 20:
                self.pick_bar_to_improve(20, 30, lock=True)
            elif choice == "3":
                break
            else:
                print("Invalid or can't afford.")

    def pick_bar_to_improve(self, cost, amount, lock=False):
        available = [b for b in self.bars if b not in self.locked_bars and self.bars[b] < 100]
        if not available:
            print("No bars available to improve!")
            return

        print("\nWhich bar?")
        for i, bar in enumerate(available, 1):
            print(f"  {i}. {bar.capitalize()} ({self.bars[bar]})")

        try:
            idx = int(input("Choice: ").strip()) - 1
            if 0 <= idx < len(available):
                bar = available[idx]
                self.build_points -= cost
                self.bars[bar] = min(100, self.bars[bar] + amount)
                print(f"{bar.capitalize()} is now {self.bars[bar]}")
                if lock:
                    self.locked_bars[bar] = 5
                    print(f"(Locked for 5 rounds)")
        except (ValueError, IndexError):
            print("Invalid choice.")

    def spend_cash(self):
        if self.cash < 50:
            return

        print(f"\n=== SPEND CASH (${self.cash}) ===")
        print("  1. Hire cook (+1 build/round) - $50")
        print("  2. Hire salesperson (+1 sell/round) - $50")
        print("  3. Pivot strategy - $300")
        print("  4. Skip")

        choice = input("\nChoice: ").strip()

        if choice == "1" and self.cash >= 50:
            self.cash -= 50
            self.passive_build += 1
            print(f"Hired a cook! +1 passive build per round.")
        elif choice == "2" and self.cash >= 50:
            self.cash -= 50
            self.passive_sell += 1
            print(f"Hired a salesperson! +1 passive sell per round.")
        elif choice == "3" and self.cash >= 300:
            self.cash -= 300
            self.choose_strategy()
        elif choice == "4":
            pass
        else:
            print("Invalid or can't afford.")

    def check_random_event(self):
        if self.round % 10 == 0 and self.round > 0:
            events = [
                ("Health inspector!", self.health_inspector),
                ("Celebrity endorsement!", self.celebrity_endorsement),
                ("Bean shortage!", self.bean_shortage),
                ("Food trend: SPICY!", self.food_trend_spicy),
            ]
            event_name, event_fn = random.choice(events)
            print(f"\n*** RANDOM EVENT: {event_name} ***")
            event_fn()

    def health_inspector(self):
        low_bars = [b for b, v in self.bars.items() if v < 20]
        if low_bars:
            self.cash = max(0, self.cash - 100)
            print(f"Bars too low! Lost $100. (Cash: ${self.cash})")
        else:
            print("Passed inspection!")

    def celebrity_endorsement(self):
        self.active_events.append(("Celebrity: next 5 deals auto-win", 5))
        print("Next 5 deals will auto-win!")

    def bean_shortage(self):
        print("Build costs doubled for 10 rounds! (not implemented in playtest)")

    def food_trend_spicy(self):
        print("Spiciness counts 2x for 10 rounds! (not implemented in playtest)")

    def check_paradigm_shift(self):
        elapsed = time.time() - self.start_time if self.start_time else 0
        if elapsed >= self.paradigm_shift_time and not self.paradigm_shift:
            shifts = [
                ("ai_recipes", "AI-GENERATED RECIPES GO VIRAL! Speed counts 3x, secret recipes worthless."),
                ("ghost_kitchens", "GHOST KITCHENS TAKE OVER! Ambiance is worthless. Delivery gets 2x."),
                ("health_conscious", "HEALTH CONSCIOUSNESS MOVEMENT! Portion size now HURTS your score."),
                ("gourmet_wins", "FAST CASUAL DIES! Only premium deals ($30+) remain."),
            ]
            self.paradigm_shift, desc = random.choice(shifts)
            print(f"\n{'!'*50}")
            print(f"!!! PARADIGM SHIFT !!!")
            print(f"{desc}")
            print(f"{'!'*50}")
            print("\nWill you pivot ($300) or push through?")

    def update_locks(self):
        to_remove = []
        for bar in self.locked_bars:
            self.locked_bars[bar] -= 1
            if self.locked_bars[bar] <= 0:
                to_remove.append(bar)
        for bar in to_remove:
            del self.locked_bars[bar]
            print(f"{bar.capitalize()} is unlocked!")

    def apply_passive(self):
        if self.passive_build:
            self.build_points += self.passive_build
            print(f"Passive: +{self.passive_build} build points")
        for _ in range(self.passive_sell):
            print("Passive sell attempt:")
            self.do_sell()

    def play_round(self):
        self.round += 1
        self.show_status()
        self.check_paradigm_shift()
        self.check_random_event()
        self.update_locks()
        self.apply_passive()

        print("\n--- YOUR TURN ---")
        print("  b = BUILD (earn build points)")
        print("  s = SELL (attempt a deal)")
        print("  q = QUIT")

        action = input("\nAction: ").strip().lower()

        if action == 'b':
            self.do_build()
        elif action == 's':
            self.do_sell()
        elif action == 'q':
            self.game_over = True
            return
        else:
            print("Invalid action, skipping turn.")

        self.spend_build_points()
        self.spend_cash()

        if self.time_remaining() <= 0:
            self.game_over = True
            print("\n=== TIME'S UP! ===")

    def run(self):
        print("""
╔═══════════════════════════════════════════════════════════╗
║                    CHILI GAME                             ║
║         Build your chili empire, one bowl at a time       ║
╚═══════════════════════════════════════════════════════════╝

You're launching a chili shop. Each round, choose to BUILD
(improve your product) or SELL (make money).

Strength bars determine if you win deals. Cash is your score.

A paradigm shift will hit around round 20 - adapt or die!
""")

        self.choose_strategy()
        self.start_time = time.time()

        while not self.game_over:
            self.play_round()

        print(f"\n{'='*50}")
        print(f"FINAL SCORE: ${self.cash}")
        print(f"Rounds played: {self.round}")
        print(f"{'='*50}")

        # Milestones
        if self.cash >= 500:
            print("Milestone: Could hire staff!")
        if self.cash >= 1500:
            print("Milestone: Could open second location!")
        if self.cash >= 3000:
            print("Milestone: Could hire a lobbyist!")
        if self.cash >= 5000:
            print("Milestone: Could acquire a competitor!")
        if self.cash >= 10000:
            print("Milestone: Could trade chili futures!")
        if self.cash >= 25000:
            print("Milestone: REGULATORY CAPTURE - You ARE Big Chili!")


if __name__ == "__main__":
    import sys

    # Auto mode for testing: python3 game.py auto [strategy_num]
    if len(sys.argv) > 1 and sys.argv[1] == "auto":
        strategy = int(sys.argv[2]) if len(sys.argv) > 2 else 2  # default fast_casual

        game = ChiliGame()
        game.game_duration = 30  # shorter game for auto mode

        # Auto-select strategy
        game.strategy = list(game.strategies.keys())[strategy - 1]
        print(f"Auto mode: {game.strategy.upper()}")

        game.start_time = time.time()
        while game.time_remaining() > 0:
            game.round += 1
            game.show_status()
            game.check_paradigm_shift()
            game.check_random_event()
            game.update_locks()
            game.apply_passive()

            # Auto play: favor selling to make money
            if game.build_points < 5:
                game.do_build()
            else:
                game.do_sell()

            # Auto spend build points on upgradable bars
            available_bars = [b for b in game.bars if b not in game.locked_bars and game.bars[b] < 100]
            while game.build_points >= 5 and available_bars:
                bar = random.choice(available_bars)
                game.build_points -= 5
                game.bars[bar] = min(100, game.bars[bar] + 10)
                print(f"Auto-upgraded {bar} to {game.bars[bar]}")
                available_bars = [b for b in game.bars if b not in game.locked_bars and game.bars[b] < 100]

            # Auto hire if enough cash
            if game.cash >= 50 and random.random() < 0.5:
                game.cash -= 50
                if random.random() < 0.5:
                    game.passive_build += 1
                    print("Auto-hired cook")
                else:
                    game.passive_sell += 1
                    print("Auto-hired salesperson")

            # Small delay so time actually passes
            time.sleep(0.15)

        print(f"\n{'='*50}")
        print(f"FINAL SCORE: ${game.cash} in {game.round} rounds")
        print(f"{'='*50}")
    else:
        game = ChiliGame()
        game.run()
