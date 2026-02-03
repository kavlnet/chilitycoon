"""
Chili Tycoon - Game Engine

See GAME_DESIGN.md for full specification.

Core mechanics:
- Multiple attributes with market weights (sum to 1.0)
- Win/loss based on player weighted score vs market standard
- Weights drift each round
- Paradigm shift adds NEW attributes
- Speed bonus applies to build amount
"""

import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum

from feedback_gen import FeedbackGenerator, ATTRIBUTES as BASE_ATTRIBUTES


class GamePhase(str, Enum):
    WAITING = "waiting"
    ROUND = "round"
    RESULTS = "results"


# Additional attributes added during paradigm shifts
PARADIGM_ATTRIBUTES = ["authenticity", "presentation", "speed_of_service", "value"]


@dataclass
class MarketState:
    """
    Market state with weighted attributes.
    See GAME_DESIGN.md for specification.
    """
    weights: Dict[str, float] = field(default_factory=dict)
    attributes: List[str] = field(default_factory=list)

    # Constants from GAME_DESIGN.md
    STANDARD_BAR = 42  # Expected bar level for standard calculation (matches starting)
    WEIGHT_DRIFT_MIN = -0.03
    WEIGHT_DRIFT_MAX = 0.03
    NEW_ATTRIBUTE_WEIGHT = 0.25

    def __post_init__(self):
        if not self.attributes:
            self.attributes = list(BASE_ATTRIBUTES)
        if not self.weights:
            self._initialize_weights()

    def _initialize_weights(self):
        """Initialize with random weights that sum to 1.0"""
        raw = {attr: random.random() + 0.1 for attr in self.attributes}
        total = sum(raw.values())
        self.weights = {attr: w / total for attr, w in raw.items()}

    def _normalize_weights(self):
        """Ensure weights sum to 1.0"""
        total = sum(self.weights.values())
        if total > 0:
            self.weights = {attr: w / total for attr, w in self.weights.items()}

    @property
    def hot_attribute(self) -> str:
        """The attribute with highest weight"""
        return max(self.weights, key=self.weights.get)

    @property
    def standard(self) -> float:
        """Market standard score (weighted sum of expected bars)"""
        return sum(self.STANDARD_BAR * w for w in self.weights.values())

    def drift(self):
        """
        Apply random drift to weights.
        See GAME_DESIGN.md - Weight Drift section.
        """
        for attr in self.attributes:
            drift = random.uniform(self.WEIGHT_DRIFT_MIN, self.WEIGHT_DRIFT_MAX)
            self.weights[attr] = max(0.05, self.weights[attr] + drift)
        self._normalize_weights()

    def add_attribute(self, attr_name: str):
        """
        Add a new attribute (paradigm shift).
        See GAME_DESIGN.md - Paradigm Shift section.
        """
        if attr_name in self.attributes:
            return

        self.attributes.append(attr_name)
        self.weights[attr_name] = self.NEW_ATTRIBUTE_WEIGHT
        self._normalize_weights()

    def get_weights_display(self) -> Dict[str, str]:
        """Get weights as percentages for display"""
        return {attr: f"{w*100:.0f}%" for attr, w in self.weights.items()}


@dataclass
class TeamState:
    name: str
    cash: int = 0
    players: List[str] = field(default_factory=list)
    current_decision: Optional[Dict] = None
    decision_time: Optional[float] = None
    bars: Dict[str, int] = field(default_factory=dict)
    recent_deals: List[Dict] = field(default_factory=list)

    # Constant from GAME_DESIGN.md
    STARTING_BAR = 42  # Below market standard (startup disadvantage)

    def __post_init__(self):
        if not self.bars:
            self.bars = {attr: self.STARTING_BAR for attr in BASE_ATTRIBUTES}

    def ensure_attribute(self, attr: str):
        """Ensure team has a bar for this attribute (for paradigm shift)"""
        if attr not in self.bars:
            self.bars[attr] = 0  # New attributes start at 0

    def get_score(self, weights: Dict[str, float]) -> float:
        """Calculate weighted score. See GAME_DESIGN.md - Calculation section."""
        return sum(self.bars.get(attr, 0) * w for attr, w in weights.items())


class GameEngine:
    """
    Main game engine. See GAME_DESIGN.md for full specification.
    """

    # Timing constants from GAME_DESIGN.md
    ROUND_DURATION = 30
    RESULTS_DURATION = 8
    TOTAL_ROUNDS = 30
    PARADIGM_SHIFT_ROUND = 15

    # Bar mechanics from GAME_DESIGN.md
    BASE_BUILD_AMOUNT = 20  # Enough to outpace depreciation
    BAR_DEPRECIATION = 0.05  # 5% - less punishing

    # Speed bonuses from GAME_DESIGN.md (applied to build amount)
    SPEED_BONUSES = [
        (10, 1.5),   # 0-10s: 1.5x
        (20, 1.3),   # 10-20s: 1.3x
        (30, 1.0),   # 20-30s: 1.0x
    ]

    # Scoring from GAME_DESIGN.md
    BASE_PAYOUT = 30
    MARGIN_MULTIPLIER = 1.2  # Rewards good judgment (higher margins = more cash)

    def __init__(self, seed: Optional[int] = None):
        if seed:
            random.seed(seed)

        self.teams: Dict[str, TeamState] = {}
        self.market = MarketState()
        self.feedback_gen = FeedbackGenerator()

        self.current_round = 0
        self.phase = GamePhase.WAITING
        self.round_start_time: Optional[float] = None
        self.paradigm_shifted = False
        self.paradigm_attribute: Optional[str] = None

        self.round_history: List[Dict] = []

    def add_team(self, team_name: str) -> TeamState:
        if team_name not in self.teams:
            self.teams[team_name] = TeamState(name=team_name)
        return self.teams[team_name]

    def add_player_to_team(self, team_name: str, player_id: str) -> bool:
        if team_name not in self.teams:
            self.add_team(team_name)

        team = self.teams[team_name]
        if len(team.players) >= 8:
            return False

        if player_id not in team.players:
            team.players.append(player_id)
        return True

    def remove_player(self, team_name: str, player_id: str):
        if team_name in self.teams:
            team = self.teams[team_name]
            if player_id in team.players:
                team.players.remove(player_id)

    def start_game(self):
        if self.phase != GamePhase.WAITING:
            return
        self.current_round = 1
        self._start_round()

    def _start_round(self):
        self.phase = GamePhase.ROUND
        self.round_start_time = time.time()

        for team in self.teams.values():
            team.current_decision = None
            team.decision_time = None
            # Ensure team has bars for all current attributes
            for attr in self.market.attributes:
                team.ensure_attribute(attr)

    def submit_decision(self, team_name: str, decision: str) -> Optional[Dict]:
        if self.phase != GamePhase.ROUND:
            return None

        if team_name not in self.teams:
            return None

        team = self.teams[team_name]

        if team.current_decision is not None:
            return None

        if decision not in self.market.attributes:
            return None

        submit_time = time.time() - self.round_start_time
        team.current_decision = {"choice": decision}
        team.decision_time = submit_time

        return {
            "team": team_name,
            "decision": decision,
            "submit_time": submit_time,
        }

    def get_speed_bonus(self, submit_time: float) -> float:
        """See GAME_DESIGN.md - Speed Bonuses section."""
        for threshold, bonus in self.SPEED_BONUSES:
            if submit_time <= threshold:
                return bonus
        return 0.0

    def _apply_depreciation(self, team: TeamState):
        """See GAME_DESIGN.md - Bar Updates section."""
        for attr in list(team.bars.keys()):
            current = team.bars[attr]
            depreciation = int(current * self.BAR_DEPRECIATION)
            team.bars[attr] = max(0, current - max(1, depreciation))

    def _apply_build(self, team: TeamState, attribute: str, amount: int):
        """See GAME_DESIGN.md - Bar Updates section. No cap on bars."""
        team.bars[attribute] = team.bars.get(attribute, 0) + amount

    def _calculate_deal_outcome(self, team: TeamState) -> tuple:
        """
        Determine win/loss based on weighted score vs market standard.
        See GAME_DESIGN.md - Calculation section.

        Returns: (won: bool, payout: int, margin: float)
        """
        player_score = team.get_score(self.market.weights)
        market_standard = self.market.standard

        margin = player_score - market_standard
        won = margin > 0

        if won:
            # Payout = base + margin bonus
            payout = int(self.BASE_PAYOUT + (margin * self.MARGIN_MULTIPLIER))
        else:
            payout = 0

        return won, payout, margin

    def end_round(self) -> Dict:
        """
        End current round, calculate results.
        See GAME_DESIGN.md - Round Flow section.
        """
        self.phase = GamePhase.RESULTS
        results = {}

        for team_name, team in self.teams.items():
            # 1. Apply depreciation
            self._apply_depreciation(team)

            # 2. Calculate deal outcome BEFORE building
            # Capture score at this moment for accurate display
            player_score = team.get_score(self.market.weights)
            won, payout, margin = self._calculate_deal_outcome(team)

            # 3. Apply build if submitted (speed bonus affects build amount)
            built_attr = None
            speed_bonus = 1.0
            build_amount = 0
            if team.current_decision:
                built_attr = team.current_decision["choice"]
                speed_bonus = self.get_speed_bonus(team.decision_time)
                build_amount = int(self.BASE_BUILD_AMOUNT * speed_bonus)
                self._apply_build(team, built_attr, build_amount)

            # 4. Add payout
            team.cash += payout

            # 5. Record deal for feedback
            deal_record = {
                "won": won,
                "margin": margin,
                "hot": self.market.hot_attribute,
                "weights": dict(self.market.weights),
                "payout": payout,
            }
            team.recent_deals.append(deal_record)
            team.recent_deals = team.recent_deals[-5:]

            # 6. Build results (use captured score, not current score)
            results[team_name] = {
                "won": won,
                "decision": built_attr or "none",
                "payout": payout,
                "margin": round(margin, 1),
                "player_score": round(player_score, 1),
                "market_standard": round(self.market.standard, 1),
                "speed_bonus": speed_bonus,
                "build_amount": build_amount,
                "total_cash": team.cash,
                "bars": dict(team.bars),
            }

        # Record in history
        self.round_history.append({
            "round": self.current_round,
            "weights": dict(self.market.weights),
            "hot_attribute": self.market.hot_attribute,
            "results": results,
        })

        return results

    def advance_round(self) -> Optional[str]:
        """
        Advance to next round. Apply drift. Check for paradigm shift.
        See GAME_DESIGN.md - Weight Drift and Paradigm Shift sections.
        """
        # Apply weight drift before next round
        self.market.drift()

        self.current_round += 1

        if self.current_round > self.TOTAL_ROUNDS:
            self.phase = GamePhase.WAITING
            return "game_over"

        event = None
        if self.current_round == self.PARADIGM_SHIFT_ROUND and not self.paradigm_shifted:
            self.paradigm_shifted = True
            self._do_paradigm_shift()
            event = "paradigm_shift"

        self._start_round()
        return event

    def _do_paradigm_shift(self):
        """
        Add a new attribute to the game.
        See GAME_DESIGN.md - Paradigm Shift section.
        """
        # Pick a new attribute that's not already in play
        available = [a for a in PARADIGM_ATTRIBUTES if a not in self.market.attributes]
        if available:
            new_attr = random.choice(available)
            self.paradigm_attribute = new_attr
            self.market.add_attribute(new_attr)

            # Ensure all teams have the new attribute (at 0)
            for team in self.teams.values():
                team.ensure_attribute(new_attr)

    def get_leaderboard(self) -> List[Dict]:
        standings = []
        for team_name, team in self.teams.items():
            standings.append({
                "team": team_name,
                "cash": team.cash,
                "players": len(team.players),
            })
        standings.sort(key=lambda x: x["cash"], reverse=True)
        return standings

    def get_game_state(self) -> Dict:
        return {
            "phase": self.phase.value,
            "current_round": self.current_round,
            "total_rounds": self.TOTAL_ROUNDS,
            "paradigm_shifted": self.paradigm_shifted,
            "round_time_remaining": self._get_round_time_remaining(),
            "leaderboard": self.get_leaderboard(),
            "attributes": self.market.attributes,
        }

    def get_team_state(self, team_name: str) -> Optional[Dict]:
        if team_name not in self.teams:
            return None
        team = self.teams[team_name]
        return {
            "cash": team.cash,
            "bars": dict(team.bars),
        }

    def get_team_feedback(self, team_name: str) -> List[Dict]:
        """Generate feedback based on recent deals. See GAME_DESIGN.md - Feedback System."""
        if team_name not in self.teams:
            return []

        team = self.teams[team_name]
        feedback_items = []

        for deal in team.recent_deals[-3:]:
            fb = self.feedback_gen.generate(deal["hot"], deal["won"], self.market.attributes)
            feedback_items.append({
                "text": fb.verbose_text,
                "won": deal["won"],
            })

        # If no deals yet, generate placeholder feedback
        if not feedback_items:
            for _ in range(2):
                won = random.choice([True, False])
                fb = self.feedback_gen.generate(self.market.hot_attribute, won, self.market.attributes)
                feedback_items.append({
                    "text": fb.verbose_text,
                    "won": won,
                })

        return feedback_items

    def get_debug_info(self) -> Dict:
        """Get debug info for debug panel."""
        return {
            "weights": self.market.get_weights_display(),
            "hot_attribute": self.market.hot_attribute,
            "market_standard": round(self.market.standard, 1),
            "attributes": self.market.attributes,
            "paradigm_shifted": self.paradigm_shifted,
            "paradigm_attribute": self.paradigm_attribute,
        }

    def _get_round_time_remaining(self) -> float:
        if self.phase != GamePhase.ROUND or self.round_start_time is None:
            return self.ROUND_DURATION
        elapsed = time.time() - self.round_start_time
        return max(0, self.ROUND_DURATION - elapsed)

    def is_round_complete(self) -> bool:
        if self.phase != GamePhase.ROUND:
            return False

        if self._get_round_time_remaining() <= 0:
            return True

        for team in self.teams.values():
            if len(team.players) > 0 and team.current_decision is None:
                return False

        return True

    def get_team_submitted(self, team_name: str) -> bool:
        if team_name not in self.teams:
            return False
        return self.teams[team_name].current_decision is not None
