# Chili game spec

A multiplayer strategy game for CKO Connectivity Day where teams compete to build the most successful chili shop.

## Context

This game is part of a 90-minute session on launching products zero-to-one. The game runs for ~40 minutes and creates shared experiences that connect to real product launch lessons during a debrief.

**Audience:** ~80 people from mixed functions (sales, PEDD, engineering, others). Not everyone is technical.

**Inspiration:** Paperclip Maximizer — starts simple, escalates to absurd.

**Why chili:**
- Ramp internal meme
- Absurd enough to be funny, concrete enough to reason about
- Allows escalation to ridiculous places (chili empire, futures market, regulatory capture)

## Core game loop

Teams of ~6 players compete simultaneously. Each round:

1. Every player chooses: **BUILD** or **SELL**
2. All players on a team must submit before the round advances
3. Round resolves:
   - BUILD actions add build points (focus bonus: if 4+ people build, +2 each instead of +1)
   - SELL actions trigger deal attempts
4. Next round starts immediately

**Speed matters.** Faster teams get more rounds. If your team decides in 5 seconds and another takes 20 seconds, you run 4x as many rounds. No global timer — you only wait on your own team.

Target round time: 5-10 seconds real-time.

## Resources

| Resource | Purpose |
|----------|---------|
| **Cash ($$$)** | Final score. Also spent on upgrades. |
| **Build points** | Accumulated by BUILD actions. Spent to ship improvements. |
| **Strength bars** | Flavor, Spiciness, Portion size, Speed, Ambiance (each 0-100) |

## Building

Players accumulate build points through BUILD actions. Spend build points anytime between rounds.

| Action | Cost | Effect |
|--------|------|--------|
| Improve a bar | 5 build points | +10 to that strength bar |
| Unlock new bar | 10 build points | Add a new bar starting at 20 |
| Ship "big bet" | 20 build points | +30 to a bar, but locks that bar for 5 rounds |

## Selling

Each SELL action generates one of two deal types:

| Deal type | How it works | Payout |
|-----------|--------------|--------|
| **Big contract (PvP)** | Head-to-head vs another team. Highest score wins. Loser gets nothing. | $50-100 |
| **Local customer (NPC)** | Beat a threshold. Anyone who qualifies wins. | $10-20 |

**How deals resolve:**
1. A deal appears with 2 random requirements (e.g., "Flavor + Speed")
2. Your score = sum of those two strength bars
3. PvP: compared against opponent. NPC: compared against threshold.
4. Win = cash. Lose = nothing.

### Rubber banding (lucky saves)

Teams that are behind sometimes get "lucky" NPC deals that pay out big ($80-100). Mario Kart style: worse position = better items in the pool. Creates "oh we got lucky!" moments that keep struggling teams engaged. Should feel like luck, not a handout.

## Spending cash

| Purchase | Cost | Effect |
|----------|------|--------|
| Hire cook | $50 | +1 passive build point per round |
| Hire salesperson | $50 | +1 passive sell attempt per round |
| Specialist (head chef) | $150 | One player's BUILD = 2x effective |
| Specialist (floor manager) | $150 | One player's SELL = 2x effective |
| Marketing | $200 | Deals pay 1.5x for 20 rounds |
| Pivot strategy | $300 | Change your one-way door choice |

## Strategy choices (one-way door at game start)

Teams pick one strategy at the start. Can only change by paying $300 to pivot.

| Strategy | Bonus | Downside |
|----------|-------|----------|
| **Gourmet** | Deals pay 2x | Need 60+ on both bars to win any deal |
| **Fast casual** | Win threshold is lower | Deals pay 0.5x |
| **Franchise** | Unlock "locations" (multiplier on everything) | Any bar below 30 = penalty on ALL deals |
| **Food truck** | No ambiance bar needed, -20% costs | "Weather" events pause you for 2 rounds |
| **Ghost kitchen** | Only 3 bars matter (Flavor, Speed, Portion) | Speed must be highest bar or deals fail |

## Random events

Minor events occur approximately every 20 rounds.

| Event | Effect |
|-------|--------|
| Health inspector | If any bar < 20, lose $100 |
| Celebrity endorsement | Next 5 deals auto-win |
| Bean shortage | Build costs 2x for 10 rounds |
| Rival opens nearby | Deal thresholds +20 for 10 rounds |
| Food trend: spicy | Spiciness bar counts 2x for 10 rounds |
| Food trend: comfort | Portion bar counts 2x for 10 rounds |
| Critic visit | Next deal: win = +$500, lose = -$200 |

## The paradigm shift (~20 minutes in)

A single major event that hits all teams simultaneously. Not a market fluctuation — a paradigm shift. Forces every team to ask: "Is our entire strategy still valid?"

| Paradigm shift | Effect |
|----------------|--------|
| "AI-generated recipes go viral" | Secret recipe bar is now worthless. Speed bar counts 3x. |
| "Ghost kitchens take over" | Ambiance bar is worthless. Delivery-only gets 2x revenue. |
| "Health consciousness movement" | Portion size bar now hurts you (subtract from score). |
| "Fast casual dies, gourmet wins" | Deals under $20 payout disappear. Only premium deals remain. |

**Checkpoint question (shown to all teams):** "Are you pivoting or pushing through? Why?"

Some teams will pivot (expensive). Some will double down. That divergence is the debrief conversation.

## Absurd endgame (stretch goal)

If teams reach high cash milestones, unlock increasingly absurd capabilities:

| Milestone | Unlock |
|-----------|--------|
| $500 | Hire staff |
| $1,500 | Second location (2x passive income) |
| $3,000 | Lobbyist (reduce bad event frequency) |
| $5,000 | Acquire a competitor (steal their best bar) |
| $10,000 | Chili futures (bet on which trend is next) |
| $25,000 | Regulatory capture (you SET the health inspector threshold) |

## Team mechanics

### Specialization

- **Early game:** Everyone is a generalist (1x effectiveness)
- **As you progress:** Assign roles with specialists
  - "Head of sales" — their sells are 2x effective
  - "Head of eng" — their builds are 2x effective
- Creates influence dynamics: the salesperson losing deals needs to convince the builders to improve certain bars
- Teams have to talk about who does what

### Focus bonus (optional)

More people doing the same action = multiplier:
- 6/6 build = big build bonus
- 3/3 split = no bonus, but progress on both fronts
- Trade-off: specialize vs spread thin

This mirrors real startup dynamics:
- Fast iteration wins
- Specialists are more effective but need coordination
- Sales and product have to talk to each other

## Technical requirements

### Multiplayer

- ~13 teams of 6 players each
- Real-time synchronization within teams
- Head-to-head matching across teams for PvP deals
- Global leaderboard visible to all

### UI requirements

- Simple enough for non-technical players
- Mobile-friendly (people may use phones)
- Clear display of: current round, team resources, strength bars, available actions
- Leaderboard showing team standings
- Event notifications (paradigm shift, random events)

### Timing

- Target game length: ~40 minutes
- Rounds should resolve in 5-10 seconds
- No global timer — teams pace themselves

## Open questions

- How does head-to-head matching work across ~13 teams?
- Should we build the absurd endgame or focus on core mechanics first?
- What's the fallback if the game isn't ready? (Traditional hackathon — groups scope and pitch an MVP for a real unsolved problem at Ramp)

## Session structure (for context)

The game is part of a larger 90-minute session:

| Time | Section |
|------|---------|
| 0:00-0:05 | Intro — What is 0-to-1? |
| 0:05-0:20 | Lightning talks (3 x 5 min) |
| 0:20-0:25 | Game setup — explain rules, form teams, pick strategies |
| 0:25-1:05 | Game (~40 min). Paradigm shift hits around minute 20. |
| 1:05-1:20 | Debrief — teams share discoveries |
| 1:20-1:30 | AMA on Treasury |

### Debrief questions

During game (checkpoint):
1. "What strategy did you pick and why?"
2. "When the paradigm shift hit, did you pivot or push through? Why?"
3. "What would you do differently?"

After game:
- Show leaderboard
- "Raise your hand if you pivoted. Where did you end up?"
- "Raise your hand if you pushed through. What happened?"
- "What surprised you?"
- "What was the hardest decision your team made?"
- "How does this connect to real product launches?"

The game creates shared experiences. The debrief is where people connect it to their work.
