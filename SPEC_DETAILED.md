# Chili Tycoon: Detailed Game Specification

## Overview

Chili Tycoon is a multiplayer web-based game designed to teach the principle that **"judgment enables more valuable speed."** Players run competing chili restaurants, making investment decisions under time pressure while learning to read market signals from customer feedback.

The game demonstrates that speed without judgment leads to random outcomes, while judgment without speed limits upside. The winning strategy combines both: read the market correctly, then act quickly to maximize returns.

## Core Teaching Principle

### The Lesson
In business and life, people often believe speed alone creates value. This game teaches that:

1. **Speed amplifies judgment** - Fast decisions on the RIGHT thing yield 1.5x returns
2. **Speed without judgment is gambling** - Fast random decisions average out
3. **Judgment without speed leaves money on the table** - Correct but slow decisions earn less
4. **The winning combination**: Read signals correctly, then execute quickly

### How the Game Teaches This
- Players who guess randomly but act fast will have mediocre results
- Players who read feedback correctly but act slowly will do okay
- Players who read feedback correctly AND act fast will dominate
- The scoreboard makes these differences visible to all players

## Game Mechanics

### Attributes and Bars
Players have 4 base attributes (more added during paradigm shift):
- **Spiciness** 🌶️ - Heat level of the chili
- **Flavor** 👅 - Taste complexity and seasoning
- **Portion** 🍽️ - Serving size and value
- **Ambiance** ✨ - Restaurant atmosphere

Each attribute has a "bar" representing investment level. Bars start at 42 and can grow infinitely.

### Market Weights
The market has hidden weights for each attribute (summing to 1.0):
```
Example: spiciness=0.35, flavor=0.15, portion=0.30, ambiance=0.20
```

The "hot" attribute is whichever has the highest weight. Weights drift in short regimes (3–5 rounds) toward a target preference, with small noise each round. This creates readable trends that still shift over time.

### Scoring
**Player Score** = Σ(bar_level × weight) for all attributes

**Market Standard** = 42 (the baseline to beat)

**Win Condition**: Player score > Market standard

**Payout Calculation**:
- Win: $30 base + (margin × 1.2)
- Lose: $0

### Round Flow
1. **Team Voting** - Players vote on an attribute; majority locks in the decision
2. **Depreciation** - All bars lose 5% (simulates market erosion)
3. **Score Calculated** - Determines win/loss for this round
4. **Build Applied** - Team's chosen attribute gains points (speed bonus)
5. **Payout Added** - Winners get cash
6. **Weights Drift** - Market preferences shift via regime-based drift

### Speed Bonus
Speed affects BUILD AMOUNT, not payout:
| Decision Time | Build Multiplier |
|---------------|------------------|
| 0-10 seconds | 1.5x (base 20 → 30) |
| 10-20 seconds | 1.3x (base 20 → 26) |
| 20-30 seconds | 1.0x (base 20 → 20) |

This means fast + correct = building the right attribute faster = compounding advantage.

### Paradigm Shift
At round 15 (or round 8 in single-player), a NEW attribute is added:
- **Authenticity** 🏆 - Traditional/genuine feel
- **Presentation** 🎨 - Visual appeal
- **Speed of Service** ⚡ - How fast food arrives
- **Value** 💰 - Price-to-quality ratio

The new attribute enters with 25% weight, redistributed from existing attributes. This disrupts established strategies and rewards adaptability.

## Feedback System

### Design Philosophy
Customer feedback is the PRIMARY information source for inferring market weights. However, feedback is deliberately noisy and requires careful reading:

1. **Misdirection** - Customers talk extensively about things that DIDN'T matter
2. **Buried Signals** - The real reason is mentioned indirectly, in passing
3. **Emotional Noise** - Feelings and stories obscure the logic
4. **Comparative Reasoning** - "compared to X" hints at what matters

### Example Feedback (Hot Attribute: Spiciness)
> "Third visit now and I think I've figured out what keeps me coming back. The space is fine - typical casual spot, nothing fancy but clean. Taste was acceptable - standard chili profile, nothing revolutionary but competent. I do think their approach to building the heat is what sets them apart though. It's not just hot - it's layered. Anyway, would go back."

The signal ("building the heat... layered") is buried between misdirection about space and taste.

### Feedback Timing
Feedback appears AFTER each round as a lagging indicator. Signals emphasize the top two market weights (with deliberate misdirection from low-weight attributes). Players see how customers responded to their PREVIOUS performance, then must decide what to invest in NEXT. This simulates real business conditions where market data is always slightly stale.

## Game Modes

### Multiplayer (Primary)
- 2-10 teams compete simultaneously
- 30 rounds, 30 seconds each
- Team voting with majority lock-in
- Paradigm shift at round 15 (warning one round prior)
- Leaderboard visible throughout

### Single Player (Practice)
- Player competes against 3 bot teams
- 15 rounds, 15 seconds each
- Faster pace for quick learning
- Paradigm shift at round 8

### Bot Strategies
| Bot Name | Strategy | Speed |
|----------|----------|-------|
| Speed Demons | Random | Fast (2-8s) |
| Careful Readers | 70% correct | Slow (15-25s) |
| Chaos Crew | Random | Variable |

## Visual Design

### Style: Balatro-Inspired Pixel Art
- **Font**: Press Start 2P (Google Fonts)
- **Color Palette**:
  - Background: Dark teal (#1a2634)
  - Panels: Slightly lighter (#243447)
  - Accent Yellow: #e8c14a
  - Accent Teal: #7fffe8
  - Success Green: #4ae864
  - Error Red: #e94560
- **UI Elements**:
  - Chunky 3-4px borders
  - 3D button effects with shadows
  - Thick card-style panels
  - Pixelated aesthetic

### Intro Screen
Full-screen pixel art image of Kevin from The Office with his famous chili, "PRESS START" button with pulsing glow effect.

### Game Screen Layout
```
┌─────────────────────────────────────────┬──────────┐
│ CHILI TYCOON    Round 5/15    $1,250    │ Leader-  │
├─────────────────────────────────────────┤ board    │
│                                         │          │
│  [Timer Bar: 15s remaining, 1.3x]       │ #1 Team  │
│                                         │ #2 You   │
│  ┌──────────┐ ┌──────────┐             │ #3 Team  │
│  │🌶️ Spicy  │ │👅 Flavor │             │          │
│  │    45    │ │    38    │             │          │
│  │ ████░░░░ │ │ ███░░░░░ │             │          │
│  └──────────┘ └──────────┘             │          │
│  ┌──────────┐ ┌──────────┐             │          │
│  │🍽️ Portion│ │✨ Ambiance│             │          │
│  │    52    │ │    41    │             │          │
│  │ █████░░░ │ │ ████░░░░ │             │          │
│  └──────────┘ └──────────┘             │          │
│                                         │          │
│  [Submitted ✓] Waiting for others...   │          │
│                                         │          │
└─────────────────────────────────────────┴──────────┘
```

### Results Screen
Shows:
1. WIN/LOSE banner with dramatic animation
2. Your decision and payout
3. Updated bar levels (built attribute highlighted)
4. Hot attribute revealed with ★ marker
5. Customer feedback (appears after outcome)

## Balance Parameters

```python
# Current tuned values (as of latest iteration)
STARTING_BAR = 42          # Initial bar levels
STANDARD_BAR = 42          # Market standard (score to beat)
BAR_DEPRECIATION = 0.05    # 5% loss per round
BASE_BUILD_AMOUNT = 20     # Points added per investment

SPEED_BONUS_FAST = 1.5     # 0-10 seconds
SPEED_BONUS_MEDIUM = 1.3   # 10-20 seconds
SPEED_BONUS_SLOW = 1.0     # 20-30 seconds

BASE_PAYOUT = 30           # Minimum win payout
MARGIN_MULTIPLIER = 1.2    # Bonus per point above standard

WEIGHT_DRIFT = ±0.03       # Max weight change per round
NEW_ATTRIBUTE_WEIGHT = 0.25 # Weight given to paradigm shift attribute
```

### Balance Goals
- **Round 1**: Slight loss expected (depreciation before first build)
- **Round 2+**: Smart players start winning consistently
- **Smart + Fast**: ~95% win rate, highest cash
- **Random + Fast**: ~70% win rate, moderate cash
- **Smart + Slow**: ~80% win rate, moderate cash
- **Random + Slow**: ~40% win rate, low cash

## Technical Architecture

### Stack
- **Backend**: Cloudflare Worker + Durable Object (WebSockets)
- **Frontend**: Vanilla JavaScript + CSS
- **Audio**: Web Audio API (procedural sounds)
- **State**: Durable Object storage (persists across restarts)

### Files
```
chiligame/
├── worker/
│   └── index.js       # Cloudflare Worker + Durable Object game server
├── wrangler.toml      # Cloudflare config
├── GAME_DESIGN.md     # Canonical game constants
├── static/
│   ├── index.html     # Lobby: create/join room
│   ├── game.html      # Player view
│   ├── host.html      # Host dashboard
│   ├── spectate.html  # Spectator view
│   ├── game.js        # Player logic
│   ├── host.js        # Host controls
│   ├── spectate.js    # Spectator view logic
│   ├── style.css      # Balatro-inspired styles
│   ├── sounds.js      # Procedural audio
│   └── intro_image.png # Kevin's chili pixel art
```

### WebSocket Messages
| Type | Direction | Purpose |
|------|-----------|---------|
| `connected` | S→C | Initial state on join |
| `round_start` | S→C | Begin new round (with hints) |
| `submit_vote` | C→S | Player votes on attribute |
| `vote_update` | S→C | Live team vote counts |
| `decision_locked` | S→C | Majority lock confirmation |
| `round_results` | S→C | Outcomes, feedback, judgment/speed |
| `paradigm_warning` | S→C | Warning one round before shift |
| `paradigm_shift` | S→C | New attribute announcement |
| `game_over` | S→C | Final leaderboard |

## Host + Spectator Views

The host dashboard provides start/pause/reset, config, and bot controls. Spectator view shows the leaderboard and event feed for workshops.

## Future Considerations

### Potential Enhancements
1. **Persistent Leaderboards** - Track scores across sessions
2. **Replay System** - Review past games to learn
3. **Custom Scenarios** - Configure starting conditions
4. **Tournament Mode** - Bracket-style competition
5. **Mobile Optimization** - Touch-friendly controls

### Workshop Integration
- **Debrief Questions**: "What strategy did winners use?"
- **Discussion Prompts**: "How does this apply to your work?"
- **Follow-up Exercise**: Identify real-world examples of judgment + speed

## Running the Game

```bash
cd chiligame
wrangler dev
# Open http://localhost:8787
```

Share the room code from the lobby for multiplayer sessions. The host dashboard provides start/pause/reset controls.
