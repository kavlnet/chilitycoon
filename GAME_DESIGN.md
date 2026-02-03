# Chili Tycoon - Game Design Document

**Core Lesson:** Judgment enables more valuable speed. Reading the market well + acting fast = best outcomes.

---

## Market System

### Attributes
- Game starts with 4 attributes: `spiciness`, `flavor`, `portion`, `ambiance`
- Paradigm shift adds NEW attributes (e.g., `authenticity`, `presentation`, `speed_of_service`)
- Each team has a "bar" for each attribute (starts at 30, no upper cap)

### Market Weights
- Each attribute has a weight (0.0 to 1.0) representing market importance
- Weights always sum to 1.0
- The "hot" attribute = highest weight
- Example: `{spiciness: 0.4, flavor: 0.3, portion: 0.2, ambiance: 0.1}`

### Market Standard
- A benchmark score teams must beat to win deals
- Standard = weighted sum of "expected" bar levels
- Example: If expected bars are 50 each, standard = 50×0.4 + 50×0.3 + 50×0.2 + 50×0.1 = 50

### Weight Drift
- Each round, weights drift slightly (±0.02 to ±0.05 random per attribute)
- Weights are re-normalized to sum to 1.0
- This causes the "hot" attribute to change gradually over time
- Players must continuously read feedback to track drift

---

## Round Flow

### 1. Decision Phase (15-30 seconds)
- Players see their current bars
- Players choose ONE attribute to invest in
- No feedback shown during decision (feedback comes after)

### 2. Calculation (server-side)
```
player_score = sum(player_bars[attr] * weights[attr] for all attributes)
market_standard = sum(standard_bars[attr] * weights[attr] for all attributes)

if player_score > market_standard:
    won = True
    margin = player_score - market_standard
    payout = BASE_PAYOUT + (margin * MARGIN_MULTIPLIER)
else:
    won = False
    payout = 0
```

### 3. Bar Updates
- Depreciation: All bars decrease by 8% each round
- Building: Chosen attribute increases by `BASE_BUILD * speed_bonus`
  - 0-10s: 1.5x speed bonus
  - 10-20s: 1.3x speed bonus
  - 20-30s: 1.0x speed bonus
  - No submission: 0 build

### 4. Results Phase (8 seconds)
- Show win/loss outcome
- Show payout
- Show customer feedback (explains what market wanted - lagging indicator)
- Feedback has buried signals about which attributes matter most

### 5. Weight Drift
- After results, weights drift slightly for next round
- Hot attribute may change

---

## Paradigm Shift

Occurs at round 8 (single player) or round 15 (multiplayer).

**What happens:**
1. A NEW attribute is added to the game (e.g., "authenticity")
2. All teams start with 0 in the new attribute
3. The new attribute is assigned a significant weight (e.g., 0.25)
4. All other weights are re-normalized
5. Market standard is recalculated with the new attribute

**Effect:** Major disruption. Teams that were winning may suddenly lose because they have 0 in the new attribute. Forces everyone to adapt.

---

## Scoring

### Win Payout
```
base_payout = 30
margin_multiplier = 0.5
payout = base_payout + (margin * margin_multiplier)
```

### Loss
- Payout = $0 (no penalty, just missed opportunity)

### Speed Bonus
- Applies to BUILD AMOUNT, not payout
- Faster decisions = invest more in your chosen attribute
- This is "leverage" - speed amplifies your judgment (good or bad)

---

## Feedback System

Customer feedback is shown AFTER each round's results. It's a lagging indicator.

**Principles:**
1. Feedback reflects what the market wanted (weights)
2. Signals are buried in verbose, rambling text
3. Customers don't say "spiciness was 40% important" - they tell stories
4. Misdirection: customers talk about things that DIDN'T matter
5. Pattern: winning deals' feedback emphasizes high-weight attributes

**Example:** If spiciness weight is high, winning feedback might say:
"The heat was perfect - exactly what I was craving. Decor was fine I guess."

---

## Game Constants

```python
# Timing
ROUND_DURATION = 30  # seconds (15 for single player)
RESULTS_DURATION = 8  # seconds
TOTAL_ROUNDS = 30  # (15 for single player)
PARADIGM_SHIFT_ROUND = 15  # (8 for single player)

# Bars
STARTING_BAR = 42  # Matches market standard
BAR_DEPRECIATION = 0.05  # 5% per round (less punishing)
BASE_BUILD_AMOUNT = 20  # Enough to outpace depreciation

# Speed Bonuses (applied to build amount)
SPEED_BONUS_FAST = 1.5   # 0-10 seconds
SPEED_BONUS_MEDIUM = 1.3  # 10-20 seconds
SPEED_BONUS_SLOW = 1.0   # 20-30 seconds

# Scoring
BASE_PAYOUT = 30
MARGIN_MULTIPLIER = 1.2  # Rewards good judgment
MARKET_STANDARD_BAR = 42  # expected bar level (matches starting)

# Drift
WEIGHT_DRIFT_MIN = -0.03
WEIGHT_DRIFT_MAX = 0.03

# Paradigm Shift
NEW_ATTRIBUTE_WEIGHT = 0.25
```

---

## State Summary

**Market State:**
- `weights`: dict of attribute -> weight (sums to 1.0)
- `standard`: the weighted benchmark score
- `attributes`: list of active attributes (grows at paradigm shift)

**Team State:**
- `bars`: dict of attribute -> level (no cap)
- `cash`: total money earned
- `recent_deals`: last N deal outcomes for feedback generation

---

## Design Rationale

1. **Multiple weights** → richer strategy than single "hot" attribute
2. **Drift** → can't figure it out once and coast; must keep reading
3. **Infinite bars** → always room to grow, no ceiling strategies
4. **Market standard** → clear benchmark creates tension
5. **Paradigm shift adds attribute** → dramatic disruption, not just reshuffling
6. **Feedback after decision** → true learning loop, not just "read and pick"
7. **Speed bonus on build** → speed is leverage that amplifies judgment quality
