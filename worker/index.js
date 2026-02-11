const BASE_ATTRIBUTES = ["spiciness", "flavor", "portion", "ambiance"];
const PARADIGM_ATTRIBUTES = ["authenticity", "presentation", "speed_of_service", "value"];

// Testing
const DEFAULT_CONFIG = {
  roundDuration: 15,
  resultsDuration: 15,
  totalRounds: 30,
  paradigmShiftRound: 15,
  startingBar: 42,
  standardBar: 42,
  barDepreciation: 0.05,
  baseBuild: 20,
  speedBonuses: [
    { threshold: 10, bonus: 1.5 },
    { threshold: 20, bonus: 1.3 },
    { threshold: 30, bonus: 1.0 },
  ],
  // Strong penalty when teams fail to lock a deliberate choice.
  fallbackMultiplier: 0.5,
  teamSizeGraceSeconds: 0.9,
  judgmentBuildMultipliers: {
    correct: 1.2,
    near: 0.95,
    miss: 0.7,
  },
  basePayout: 30,
  marginMultiplier: 1.2,
  newAttributeWeight: 0.25,
  driftStrength: 0.2,
  driftNoise: 0.01,
  trendRoundsMin: 3,
  trendRoundsMax: 5,
  minAttributeWeight: 0.05,
  maxAttributeWeight: 0.95,
};

const BOT_TEAMS = [
  { name: "Speed Demons", archetype: "sprinter", baseConfidence: 0.65, delayRatio: [0.16, 0.42] },
  { name: "Careful Readers", archetype: "trend", baseConfidence: 0.72, delayRatio: [0.35, 0.75] },
  { name: "Chaos Crew", archetype: "chaos", baseConfidence: 0.25, delayRatio: [0.22, 0.68] },
];

const SOLO_PRESETS = {
  chill: {
    difficulty: "chill",
    config: { roundDuration: 18, resultsDuration: 12, totalRounds: 12, paradigmShiftRound: 8 },
    bots: [
      { archetype: "trend", baseConfidence: 0.58, delayRatio: [0.35, 0.78] },
      { archetype: "chaos", baseConfidence: 0.22, delayRatio: [0.25, 0.7] },
    ],
    objectives: { wins: 5, correctReads: 4, cash: 220, postShiftWins: 1 },
    baseMutators: [],
    adaptive: false,
  },
  standard: {
    difficulty: "standard",
    config: { roundDuration: 16, resultsDuration: 12, totalRounds: 14, paradigmShiftRound: 8 },
    bots: [
      { archetype: "trend", baseConfidence: 0.66, delayRatio: [0.28, 0.7] },
      { archetype: "momentum", baseConfidence: 0.62, delayRatio: [0.25, 0.65] },
      { archetype: "chaos", baseConfidence: 0.28, delayRatio: [0.2, 0.58] },
    ],
    objectives: { wins: 6, correctReads: 6, cash: 320, postShiftWins: 2 },
    baseMutators: [],
    adaptive: true,
  },
  hard: {
    difficulty: "hard",
    config: { roundDuration: 14, resultsDuration: 11, totalRounds: 16, paradigmShiftRound: 9 },
    bots: [
      { archetype: "trend", baseConfidence: 0.76, delayRatio: [0.22, 0.58] },
      { archetype: "momentum", baseConfidence: 0.7, delayRatio: [0.2, 0.55] },
      { archetype: "contrarian", baseConfidence: 0.6, delayRatio: [0.28, 0.62] },
    ],
    objectives: { wins: 8, correctReads: 8, cash: 430, postShiftWins: 2 },
    baseMutators: ["tight_timer"],
    adaptive: true,
  },
  expert: {
    difficulty: "expert",
    config: { roundDuration: 13, resultsDuration: 10, totalRounds: 18, paradigmShiftRound: 10 },
    bots: [
      { archetype: "trend", baseConfidence: 0.84, delayRatio: [0.16, 0.45] },
      { archetype: "momentum", baseConfidence: 0.78, delayRatio: [0.18, 0.48] },
      { archetype: "counter", baseConfidence: 0.7, delayRatio: [0.2, 0.52] },
    ],
    objectives: { wins: 10, correctReads: 10, cash: 560, postShiftWins: 3 },
    baseMutators: ["tight_timer", "harsh_decay"],
    adaptive: true,
  },
};

const SOLO_MUTATOR_DEFS = {
  tight_timer: {
    key: "tight_timer",
    name: "Tight Timer",
    description: "-3s round timer",
  },
  harsh_decay: {
    key: "harsh_decay",
    name: "Harsh Decay",
    description: "+2% bar depreciation",
  },
  turbulent_market: {
    key: "turbulent_market",
    name: "Turbulent Market",
    description: "More volatile drift",
  },
  stingy_market: {
    key: "stingy_market",
    name: "Stingy Market",
    description: "Lower margin payouts",
  },
  fast_shift: {
    key: "fast_shift",
    name: "Fast Shift",
    description: "Paradigm shift arrives earlier",
  },
};

const SOLO_BOT_NAMES = [
  "Market Mantis",
  "Signal Snake",
  "Drift Fox",
  "Tempo Wolf",
  "Spread Raven",
  "Pivot Shark",
  "Edge Cobra",
  "Regime Owl",
];

function hashSeed(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getUTCDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function randomId(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
  if (total === 0) return weights;
  const normalized = {};
  for (const [key, value] of Object.entries(weights)) {
    normalized[key] = value / total;
  }
  return normalized;
}

function pickTrendTarget(attributes) {
  const raw = {};
  let total = 0;
  for (const attr of attributes) {
    const val = Math.random() + 0.1;
    raw[attr] = val;
    total += val;
  }
  const target = {};
  for (const attr of attributes) {
    target[attr] = raw[attr] / total;
  }
  return target;
}

function getHotAttribute(weights) {
  let hot = null;
  let max = -Infinity;
  for (const [attr, weight] of Object.entries(weights)) {
    if (weight > max) {
      max = weight;
      hot = attr;
    }
  }
  return hot;
}

function weightedChoice(pairs) {
  const total = pairs.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * total;
  for (const pair of pairs) {
    r -= pair.weight;
    if (r <= 0) return pair.value;
  }
  return pairs[pairs.length - 1]?.value;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeTeamKey(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function resolveTeamName(requested, teams) {
  const normalized = normalizeTeamKey(requested);
  if (!normalized) return requested;
  for (const existing of Object.keys(teams)) {
    if (normalizeTeamKey(existing) === normalized) return existing;
  }
  return requested;
}

const FEEDBACK = {
  openingsPositive: [
    "Finally got around to trying this place after hearing about it for months.",
    "Stopped by on a whim last Tuesday and I'm glad I did.",
    "Third visit now and I think I've figured out what keeps me coming back.",
    "Friend dragged me here against my better judgment. Okay, fine, they were right.",
    "Random Tuesday lunch that turned into a pleasant surprise.",
    "Dropped in after work and was pleasantly surprised.",
    "Came here with a group and it won me over.",
    "Had this on my list and it delivered.",
    "Quick lunch break that turned into a new favorite.",
    "First time here and it set a solid bar.",
    "Tried it during a busy rush and it still impressed.",
    "We were debating where to eat and this choice paid off.",
    "Stopped in while traveling and would come back.",
    "Wasn't sure what to expect, but it hit.",
    "Went in skeptical, walked out satisfied.",
    "Grabbed a bowl on a rainy day and it was exactly right.",
    "Finally made it here and I'm glad I did.",
  ],
  openingsNegative: [
    "Had high hopes based on the reviews but reality was different.",
    "Wanted to love this place - the concept is great on paper.",
    "Tried to like it, I really did.",
    "The hype had me expecting more, I'll be honest.",
    "Was in the mood for something great, left feeling meh.",
    "Went in excited, left a bit let down.",
    "Came by after hearing good things and it didn't land.",
    "First visit and it missed the mark for me.",
    "Tried it during a rush and it felt underwhelming.",
    "Stopped in for lunch and it was just okay.",
    "Wanted to be impressed, but it fell short.",
    "Brought friends and it didn't live up to the chatter.",
    "Gave it a shot and it was forgettable.",
    "Walked in hungry, walked out still wanting more.",
    "I was rooting for it, but it didn't quite click.",
    "Had higher expectations than the experience delivered.",
    "Left thinking it could be so much better.",
  ],
  closingsPositive: [
    "Would gladly order this again.",
    "I can see myself coming back.",
    "This earned a repeat visit.",
    "It will be in my rotation.",
    "Recommend it without hesitation.",
    "I would bring friends here.",
    "It sticks with you.",
    "Hope they keep it like this.",
  ],
  closingsNegative: [
    "Not sure I'd return.",
    "Probably a one-and-done for me.",
    "I wouldn't go out of my way for it.",
    "Needs work before I'd come back.",
    "Left me on the fence about returning.",
    "Hard to justify another visit.",
    "Might give it another shot, but not soon.",
    "It didn't leave a strong reason to return.",
  ],
  misdirection: {
    spiciness: [
      "The heat level was fine I guess - they have different options which is nice.",
      "Spice-wise it was what you'd expect. Nothing too memorable.",
      "Heat was okay but didn't steal the show.",
      "The spice level sat in the background for me.",
      "Spice was middle-of-the-road, nothing bold.",
      "Heat was manageable, not a headline.",
      "They offer heat, but it didn't stand out.",
    ],
    flavor: [
      "Taste was acceptable - standard chili profile, nothing revolutionary.",
      "The flavor was there. Not mind-blowing but not offensive either.",
      "Flavor was fine and familiar, nothing complex.",
      "Seasoning was serviceable, pretty standard.",
      "Taste was steady but not standout.",
      "The flavor profile felt safe.",
      "Flavor was present but plain.",
    ],
    portion: [
      "Size was reasonable for the price point. Not huge but I wasn't hungry after.",
      "Portions seemed standard - I've seen bigger but also smaller.",
      "Serving size was normal for this kind of place.",
      "Not tiny, not huge - just average.",
      "Portion was fine, didn't wow.",
      "Bowl size was standard.",
      "The portion felt adequate, nothing more.",
    ],
    ambiance: [
      "The space is fine - typical casual spot, nothing fancy but clean.",
      "Decor is what it is. Not why you come here.",
      "Atmosphere was fine, pretty typical.",
      "Space was clean but unremarkable.",
      "Vibe was neutral and low-key.",
      "Nothing special about the setting.",
      "Ambiance was okay, not a draw.",
    ],
    authenticity: [
      "Can't really tell if they're going for authentic or not. Standard approach.",
      "Didn't get any particular cultural vibe. Just straightforward.",
      "Authenticity didn't stand out either way.",
      "Felt mainstream, not super traditional.",
      "It read more general than specific.",
      "Didn't get a strong cultural signal.",
      "Hard to tell what lane they were going for.",
    ],
    presentation: [
      "Not Instagram-worthy but that's okay. I'm here to eat, not photograph.",
      "The visual aspect is fine. Standard bowls, standard setup.",
      "Looks were fine, nothing fancy.",
      "Plating was simple and expected.",
      "Presentation was average overall.",
      "Visuals were okay, no frills.",
      "Not a showpiece by any means.",
    ],
    speed_of_service: [
      "Service was average speed. Not particularly fast or slow.",
      "Food came out in a reasonable time. Nothing notable.",
      "Timing was normal for a lunch spot.",
      "Service speed was average.",
      "Wait was reasonable, nothing notable.",
      "It came out in a standard window.",
      "The pace felt typical.",
    ],
    value: [
      "Price seemed about right for what you get. Standard markup.",
      "Cost is what you'd expect. Not cheap but not outrageous.",
      "Price felt average for this kind of meal.",
      "Value was about what I expected.",
      "Pricing was standard across the board.",
      "It was fine for the money.",
      "Not a bargain, not a splurge.",
    ],
  },
  signalsPositive: {
    spiciness: [
      "I do think their approach to building the heat is what sets them apart though.",
      "That kick at the end really elevates it.",
      "The heat builds in a way that feels intentional.",
      "They nail the spice balance.",
      "The kick at the finish is what you remember.",
      "Spice is the star here.",
      "The heat level is bold but controlled.",
    ],
    flavor: [
      "What really got me was the depth. You can taste they thought about the recipe.",
      "The balance is impeccable. Nothing dominates, everything contributes.",
      "Depth of flavor is the real win.",
      "The seasoning has a clear point of view.",
      "Flavor complexity is impressive.",
      "The blend feels thoughtfully built.",
      "Taste is the main attraction.",
    ],
    portion: [
      "Left genuinely satisfied which is rare these days.",
      "They're not being stingy with the portions here. Refreshing.",
      "Portion size felt generous.",
      "You leave full, no question.",
      "It is a hearty bowl.",
      "Serving size punches above its price.",
      "The amount you get is the standout.",
    ],
    ambiance: [
      "The vibe they've created here is special. It's not trying too hard but it works.",
      "It feels like a neighborhood spot even though I don't live here.",
      "The vibe is warm and inviting.",
      "Atmosphere makes you want to hang out.",
      "The room feels lively in a good way.",
      "It has a cozy, local feel.",
      "The setting is part of the appeal.",
    ],
    authenticity: [
      "There's something real here. You can taste that someone cares about doing it right.",
      "It tastes like it has a story. Like someone's grandmother would approve.",
      "Authenticity shines through.",
      "It feels rooted and honest.",
      "You can tell they care about doing it right.",
      "There is a real sense of craft and heritage.",
      "It has that old-school feel.",
    ],
    presentation: [
      "It looked like someone actually cared about plating. That matters.",
      "The colors and presentation made it feel premium.",
      "Presentation elevates the whole experience.",
      "The plating makes it feel premium.",
      "It looks as good as it tastes.",
      "Visuals are polished and intentional.",
      "They put care into how it arrives.",
    ],
    speed_of_service: [
      "It hit the table shockingly fast, in a good way.",
      "The pace was dialed in - quick but not rushed.",
      "It hit the table fast without feeling rushed.",
      "Service speed is the edge here.",
      "They are quick and on top of it.",
      "You do not wait long at all.",
      "Fast service makes the meal feel smooth.",
    ],
    value: [
      "For the price, this felt like a steal.",
      "Bang for buck is the real story here.",
      "Value is the big win.",
      "It feels like more than you paid for.",
      "Price-to-portion ratio is excellent.",
      "For the cost, it over-delivers.",
      "You get a lot for your money.",
    ],
  },
  signalsNegative: {
    spiciness: [
      "The heat just didn't land for me. Felt flat.",
      "I wanted more kick - it played things too safe.",
      "Heat was timid.",
      "Spice level played it too safe.",
      "Lacked the kick I wanted.",
      "Heat faded fast.",
      "Spice felt muted.",
    ],
    flavor: [
      "The taste was kind of one-note.",
      "Seasoning felt muted. Something was missing.",
      "Flavor lacked depth.",
      "Seasoning was flat.",
      "Taste needed more complexity.",
      "Flavor did not pop.",
      "The profile was bland.",
    ],
    portion: [
      "The bowl was smaller than I expected.",
      "Left wishing I'd ordered something else too.",
      "Serving size felt light.",
      "Portion left me wanting more.",
      "Not filling for the price.",
      "Portion is the weak point.",
      "It felt skimpy.",
    ],
    ambiance: [
      "The space felt cold and a little awkward.",
      "It didn't feel like a place you'd want to linger.",
      "The room felt sterile.",
      "Atmosphere was off.",
      "Vibe made me want to leave.",
      "Setting felt awkward.",
      "It did not feel welcoming.",
    ],
    authenticity: [
      "It felt a little corporate - lacked that real touch.",
      "I was hoping for more tradition and soul.",
      "It felt like a watered-down version.",
      "Lacked that genuine touch.",
      "Authenticity was missing.",
      "It came off generic.",
      "I wanted more tradition.",
    ],
    presentation: [
      "It looked rushed, which didn't inspire confidence.",
      "The presentation felt careless.",
      "The presentation felt sloppy.",
      "It looked rushed and thrown together.",
      "Visuals were messy.",
      "Not appealing to look at.",
      "The plating was careless.",
    ],
    speed_of_service: [
      "The wait dragged on longer than it should have.",
      "Service pace was a mess.",
      "Service dragged.",
      "The wait was too long.",
      "Pace was sluggish.",
      "It took forever to arrive.",
      "Timing was off.",
    ],
    value: [
      "It didn't feel worth the price.",
      "A bit overpriced for what you get.",
      "The price felt high for what it was.",
      "Value did not line up with cost.",
      "Not worth the bill.",
      "Cost is the pain point.",
      "Price stung.",
    ],
  },
};

function generateFeedback({ weights, won, attributes, biasAttribute }) {
  const sorted = [...attributes].sort((a, b) => (weights[b] || 0) - (weights[a] || 0));
  const top = sorted[0];
  const second = sorted[1] || sorted[0];
  const low = sorted.slice(-2);

  let driver = weightedChoice([
    { value: top, weight: 0.7 },
    { value: second, weight: 0.3 },
  ]);

  if (biasAttribute && attributes.includes(biasAttribute)) {
    driver = weightedChoice([
      { value: biasAttribute, weight: 0.6 },
      { value: driver, weight: 0.4 },
    ]);
  }

  const misdirectAttr = weightedChoice([
    { value: low[0], weight: 0.6 },
    { value: low[1] || low[0], weight: 0.4 },
  ]);

  const opening = won
    ? FEEDBACK.openingsPositive[Math.floor(Math.random() * FEEDBACK.openingsPositive.length)]
    : FEEDBACK.openingsNegative[Math.floor(Math.random() * FEEDBACK.openingsNegative.length)];

  const misdirectionList = FEEDBACK.misdirection[misdirectAttr] || [];
  const signalList = won ? FEEDBACK.signalsPositive[driver] : FEEDBACK.signalsNegative[driver];
  const closingList = won ? FEEDBACK.closingsPositive : FEEDBACK.closingsNegative;

  const misdirection = misdirectionList.length
    ? misdirectionList[Math.floor(Math.random() * misdirectionList.length)]
    : "";
  const signal = signalList ? signalList[Math.floor(Math.random() * signalList.length)] : "";
  const includeClosing = closingList?.length && Math.random() < 0.6;
  const closing =
    includeClosing && closingList
      ? closingList[Math.floor(Math.random() * closingList.length)]
      : "";

  const parts = [opening, misdirection, signal, closing].filter(Boolean);
  return parts.join(" ");
}

function generateFeedbackUnique({ weights, won, attributes, biasAttribute, avoid, maxTries = 6 }) {
  let text = "";
  for (let i = 0; i < maxTries; i++) {
    text = generateFeedback({ weights, won, attributes, biasAttribute });
    if (!avoid || !avoid.has(text)) break;
  }
  return text;
}

export class GameRoomV2 {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sockets = new Map();
    this.botTimeouts = new Set();
    this.game = null;

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get("game_state");
      if (stored) {
        this.restoreState(stored);
      } else {
        this.initState();
      }
    });
  }

  initState() {
    const weights = normalizeWeights(
      BASE_ATTRIBUTES.reduce((acc, attr) => {
        acc[attr] = Math.random() + 0.1;
        return acc;
      }, {})
    );

    this.game = {
      hostKey: null,
      phase: "waiting",
      round: 0,
      roundStart: null,
      roundEndAt: null,
      resultsEndAt: null,
      config: { ...DEFAULT_CONFIG },
      market: {
        attributes: [...BASE_ATTRIBUTES],
        weights,
        trendTarget: pickTrendTarget(BASE_ATTRIBUTES),
        trendRoundsLeft: 3 + Math.floor(Math.random() * 3),
        standardHistory: [],
      },
      paradigmShifted: false,
      paradigmAttribute: null,
      paradigmWarningSent: false,
      feedbackBiasRounds: 0,
      teams: {},
      players: {},
      botsEnabled: false,
      bots: [],
      mode: "standard",
      soloRun: null,
      rngState: null,
    };
  }

  restoreState(stored) {
    this.game = stored;
    this.game.mode = this.game.mode || "standard";
    this.game.soloRun = this.game.soloRun || null;
    this.game.rngState = this.game.rngState ?? null;
    this.game.market = this.game.market || {};
    this.game.market.standardHistory = this.game.market.standardHistory || [];
    this.game.config = { ...DEFAULT_CONFIG, ...(this.game.config || {}) };
    for (const team of Object.values(this.game.teams)) {
      team.players = new Set(team.players || []);
      team.votes = team.votes || {};
      team.feedbackRecent = team.feedbackRecent || [];
    }
  }

  serializeState() {
    const teams = {};
    for (const [name, team] of Object.entries(this.game.teams)) {
      teams[name] = {
        ...team,
        players: Array.from(team.players || []),
      };
    }
    return {
      ...this.game,
      teams,
    };
  }

  async persistState() {
    await this.state.storage.put("game_state", this.serializeState());
  }

  async fetch(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const action = parts[4];

    if (action === "ws") {
      return this.handleWebSocket(request);
    }

    if (request.method === "POST" && action === "host") {
      return this.handleHostAction(request);
    }

    if (request.method === "GET" && action === "state") {
      return jsonResponse(this.getGameState());
    }

    if (request.method === "GET" && action === "teams") {
      return jsonResponse({ teams: this.getTeamsList() });
    }

    if (request.method === "POST" && action === "initialize") {
      const payload = await request.json();
      if (payload?.hostKey) {
        this.game.hostKey = payload.hostKey;
        await this.persistState();
      }
      return jsonResponse({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }

  async handleWebSocket(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId") || randomId(8);
    const teamNameRaw = url.searchParams.get("team") || "spectator";
    const name = url.searchParams.get("name") || "Player";
    const requestedTeamName = decodeURIComponent(teamNameRaw);
    const isSpectator = requestedTeamName.toLowerCase() === "spectator";
    const teamName = isSpectator ? requestedTeamName : resolveTeamName(requestedTeamName, this.game.teams);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();

    this.sockets.set(playerId, { ws: server, team: teamName, role: isSpectator ? "spectator" : "player" });

    if (!isSpectator) {
      this.addPlayerToTeam(playerId, teamName, name);
    } else {
      this.game.players[playerId] = { name, team: teamName, role: "spectator" };
    }

    this.sendToPlayer(playerId, {
      type: "connected",
      playerId,
      teamName,
      gameState: this.getGameState(),
      bars: isSpectator ? {} : this.game.teams[teamName]?.bars || {},
      cash: isSpectator ? 0 : this.game.teams[teamName]?.cash || 0,
      attributes: this.game.market.attributes,
    });

    this.broadcast({
      type: "teams_updated",
      leaderboard: this.getLeaderboard(),
    });

    if (
      !isSpectator
      && this.game.mode === "solo"
      && this.game.phase === "waiting"
      && this.game.soloRun
      && normalizeTeamKey(teamName) === normalizeTeamKey(this.game.soloRun.playerTeam)
    ) {
      this.startGame().catch(() => {});
    }

    server.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(playerId, data).catch(() => {});
      } catch (err) {
        this.sendToPlayer(playerId, { type: "error", message: "Invalid message" });
      }
    });

    server.addEventListener("close", () => {
      this.handleDisconnect(playerId);
    });

    server.addEventListener("error", () => {
      this.handleDisconnect(playerId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  handleDisconnect(playerId) {
    const player = this.game.players[playerId];
    const socketInfo = this.sockets.get(playerId);

    if (player && socketInfo?.role !== "spectator") {
      const team = this.game.teams[player.team];
      if (team?.players) {
        team.players.delete(playerId);
        delete team.votes[playerId];
      }
    }

    delete this.game.players[playerId];
    this.sockets.delete(playerId);

    this.broadcast({
      type: "teams_updated",
      leaderboard: this.getLeaderboard(),
    });
  }

  async handleMessage(playerId, data) {
    const socketInfo = this.sockets.get(playerId);
    if (!socketInfo) return;

    switch (data.type) {
      case "submit_vote":
        if (socketInfo.role === "player") {
          await this.submitVote(playerId, data.decision);
        }
        break;
      case "request_state":
        this.sendToPlayer(playerId, {
          type: "state",
          gameState: this.getGameState(),
        });
        break;
      default:
        break;
    }
  }

  addPlayerToTeam(playerId, teamName, name) {
    if (!this.game.teams[teamName]) {
      this.game.teams[teamName] = this.createTeam(teamName);
    }

    const team = this.game.teams[teamName];
    if (!(team.players instanceof Set)) {
      team.players = new Set(team.players || []);
    }
    team.players.add(playerId);

    this.game.players[playerId] = { name, team: teamName, role: "player" };
  }

  createTeam(teamName) {
    const bars = {};
    for (const attr of this.game.market.attributes) {
      bars[attr] = this.game.config.startingBar;
      if (this.game.paradigmShifted && attr === this.game.paradigmAttribute) {
        bars[attr] = 0;
      }
    }

    return {
      name: teamName,
      cash: 0,
      bars,
      players: new Set(),
      votes: {},
      lastDecision: null,
      decisionTime: null,
      locked: false,
      currentDecision: null,
      feedbackRecent: [],
      isBot: false,
    };
  }

  createTeamIfNotExists(teamName) {
    const name = teamName.trim();
    if (!name) {
      return { ok: false, error: "Team name cannot be empty" };
    }
    if (name.length > 20) {
      return { ok: false, error: "Team name too long (max 20 characters)" };
    }
    const normalized = normalizeTeamKey(name);
    const existing = Object.keys(this.game.teams).find(
      (team) => normalizeTeamKey(team) === normalized
    );
    if (existing) {
      return { ok: false, error: "Team already exists" };
    }
    this.game.teams[name] = this.createTeam(name);
    this.broadcast({
      type: "teams_updated",
      leaderboard: this.getLeaderboard(),
    });
    return { ok: true };
  }

  getGameState() {
    return {
      phase: this.game.phase,
      round: this.game.round,
      totalRounds: this.game.config.totalRounds,
      attributes: this.game.market.attributes,
      leaderboard: this.getLeaderboard(),
      paradigmShifted: this.game.paradigmShifted,
      mode: this.game.mode,
      solo: this.game.soloRun
        ? {
            difficulty: this.game.soloRun.difficulty,
            daily: this.game.soloRun.daily,
            dateKey: this.game.soloRun.dateKey,
            mutators: this.game.soloRun.mutators,
          }
        : null,
    };
  }

  getTeamsList() {
    return Object.values(this.game.teams).map((team) => ({
      name: team.name,
      players: team.players?.size || 0,
      cash: team.cash,
    }));
  }

  getLeaderboard() {
    return Object.values(this.game.teams)
      .map((team) => ({
        team: team.name,
        cash: team.cash,
        players: team.players?.size || 0,
      }))
      .sort((a, b) => b.cash - a.cash);
  }

  sendToPlayer(playerId, message) {
    const socketInfo = this.sockets.get(playerId);
    if (!socketInfo) return;
    try {
      socketInfo.ws.send(JSON.stringify(message));
    } catch (err) {
      // ignore
    }
  }

  sendToTeam(teamName, message) {
    for (const [playerId, socketInfo] of this.sockets.entries()) {
      if (socketInfo.team === teamName && socketInfo.role === "player") {
        this.sendToPlayer(playerId, message);
      }
    }
  }

  broadcast(message) {
    for (const [playerId] of this.sockets.entries()) {
      this.sendToPlayer(playerId, message);
    }
  }

  async handleHostAction(request) {
    const payload = await request.json();
    const { action, hostKey } = payload || {};

    if (!hostKey || hostKey !== this.game.hostKey) {
      return new Response("Unauthorized", { status: 401 });
    }

    switch (action) {
      case "start":
        await this.startGame();
        break;
      case "pause":
        await this.pauseGame();
        break;
      case "end_round":
        if (this.game.phase === "round") {
          await this.endRound();
        }
        break;
      case "reset":
        await this.resetGame();
        break;
      case "add_bots":
        this.addBots();
        break;
      case "set_config":
        this.updateConfig(payload.config || {});
        break;
      case "set_preset":
        if (payload.difficulty) {
          this.applyDifficultyPreset(payload.difficulty);
        }
        break;
      case "setup_solo":
        await this.setupSoloRun(payload);
        break;
      case "create_team":
        if (payload.teamName) {
          const result = this.createTeamIfNotExists(payload.teamName);
          if (!result.ok) {
            return jsonResponse({ ok: false, error: result.error }, { status: 400 });
          }
        }
        break;
      default:
        break;
    }

    await this.persistState();
    return jsonResponse({ ok: true });
  }

  updateConfig(config) {
    const allowed = ["roundDuration", "resultsDuration", "totalRounds", "paradigmShiftRound"];
    for (const key of allowed) {
      if (config[key] !== undefined) {
        this.game.config[key] = Number(config[key]);
      }
    }
  }

  rand() {
    if (this.game?.rngState == null) {
      return Math.random();
    }
    this.game.rngState = (this.game.rngState + 0x6d2b79f5) >>> 0;
    let t = this.game.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  randInt(max) {
    if (max <= 0) return 0;
    return Math.floor(this.rand() * max);
  }

  nextTrendRounds() {
    const min = Math.max(1, Number(this.game.config.trendRoundsMin || 3));
    const max = Math.max(min, Number(this.game.config.trendRoundsMax || 5));
    return min + this.randInt(max - min + 1);
  }

  pickTrendTargetWithRand(attributes) {
    const raw = {};
    let total = 0;
    for (const attr of attributes) {
      const val = this.rand() + 0.1;
      raw[attr] = val;
      total += val;
    }
    const target = {};
    for (const attr of attributes) {
      target[attr] = raw[attr] / total;
    }
    return target;
  }

  applyDifficultyPreset(difficulty) {
    const preset = SOLO_PRESETS[difficulty] || SOLO_PRESETS.standard;
    this.game.config = {
      ...this.game.config,
      ...preset.config,
    };
  }

  createSoloObjectives(targets) {
    return [
      {
        id: "wins",
        title: `Win ${targets.wins} rounds`,
        metric: "wins",
        target: targets.wins,
        reward: 140,
      },
      {
        id: "reads",
        title: `Make ${targets.correctReads} correct reads`,
        metric: "correctReads",
        target: targets.correctReads,
        reward: 170,
      },
      {
        id: "cash",
        title: `Finish with $${targets.cash}+`,
        metric: "cash",
        target: targets.cash,
        reward: 220,
      },
      {
        id: "shift",
        title: `Win ${targets.postShiftWins} of first 3 post-shift rounds`,
        metric: "postShiftWins",
        target: targets.postShiftWins,
        reward: 180,
      },
    ].map((objective) => ({
      ...objective,
      progress: 0,
      complete: false,
    }));
  }

  applySoloMutator(mutatorKey) {
    switch (mutatorKey) {
      case "tight_timer":
        this.game.config.roundDuration = Math.max(10, this.game.config.roundDuration - 3);
        break;
      case "harsh_decay":
        this.game.config.barDepreciation = clamp(this.game.config.barDepreciation + 0.02, 0.01, 0.35);
        break;
      case "turbulent_market":
        this.game.config.driftStrength = clamp(this.game.config.driftStrength + 0.08, 0.05, 0.5);
        this.game.config.driftNoise = clamp(this.game.config.driftNoise + 0.012, 0.001, 0.08);
        this.game.config.trendRoundsMin = Math.max(2, this.game.config.trendRoundsMin - 1);
        this.game.config.trendRoundsMax = Math.max(
          this.game.config.trendRoundsMin + 1,
          this.game.config.trendRoundsMax - 1
        );
        break;
      case "stingy_market":
        this.game.config.marginMultiplier = clamp(this.game.config.marginMultiplier - 0.25, 0.8, 2.0);
        this.game.config.basePayout = Math.max(10, this.game.config.basePayout - 6);
        break;
      case "fast_shift":
        this.game.config.paradigmShiftRound = Math.max(5, this.game.config.paradigmShiftRound - 2);
        break;
      default:
        break;
    }
  }

  buildSoloBots(presetBots) {
    const availableNames = [...SOLO_BOT_NAMES];
    return presetBots.map((bot, idx) => {
      const poolIndex = this.randInt(availableNames.length);
      const pickedName = availableNames.splice(poolIndex, 1)[0] || `Bot ${idx + 1}`;
      return {
        name: pickedName,
        archetype: bot.archetype,
        baseConfidence: bot.baseConfidence,
        delayRatio: bot.delayRatio,
      };
    });
  }

  getObjectiveMetricValue(metric, stats, cash) {
    if (metric === "wins") return stats.wins;
    if (metric === "correctReads") return stats.correctReads;
    if (metric === "cash") return cash;
    if (metric === "postShiftWins") return stats.postShiftWins;
    return 0;
  }

  updateSoloProgress(results) {
    if (this.game.mode !== "solo" || !this.game.soloRun) return;
    const playerTeam = resolveTeamName(this.game.soloRun.playerTeam, this.game.teams);
    const playerResult = results[playerTeam];
    if (!playerResult) return;

    const stats = this.game.soloRun.stats;
    if (playerResult.won) {
      stats.wins += 1;
      stats.currentWinStreak += 1;
      stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentWinStreak);
    } else {
      stats.losses += 1;
      stats.currentWinStreak = 0;
    }

    if (playerResult.judgment === "correct") stats.correctReads += 1;
    if (playerResult.judgment === "near") stats.nearReads += 1;
    if (playerResult.judgment === "miss") stats.missReads += 1;
    stats.totalPayout += playerResult.payout || 0;
    stats.roundsPlayed += 1;

    const shiftRound = this.game.config.paradigmShiftRound;
    if (this.game.round >= shiftRound && this.game.round < shiftRound + 3) {
      stats.postShiftRounds += 1;
      if (playerResult.won) stats.postShiftWins += 1;
    }

    const sample =
      (playerResult.won ? 1 : 0)
      + (playerResult.judgment === "correct" ? 1 : playerResult.judgment === "near" ? 0.3 : -0.45)
      - (playerResult.speedTier === "fallback" ? 0.35 : 0);
    const window = this.game.soloRun.performanceWindow || [];
    window.push(sample);
    this.game.soloRun.performanceWindow = window.slice(-5);

    if (this.game.soloRun.adaptive) {
      const avg = this.game.soloRun.performanceWindow.reduce((sum, v) => sum + v, 0)
        / this.game.soloRun.performanceWindow.length;
      if (avg > 1.05) {
        this.game.soloRun.adaptLevel = clamp((this.game.soloRun.adaptLevel || 0) + 0.25, -2, 2);
      } else if (avg < 0.15) {
        this.game.soloRun.adaptLevel = clamp((this.game.soloRun.adaptLevel || 0) - 0.2, -2, 2);
      }
    }

    const cash = this.game.teams[playerTeam]?.cash || 0;
    this.game.soloRun.objectives = this.game.soloRun.objectives.map((objective) => {
      const progress = this.getObjectiveMetricValue(objective.metric, stats, cash);
      return {
        ...objective,
        progress,
        complete: progress >= objective.target,
      };
    });
  }

  buildSoloSummary() {
    if (this.game.mode !== "solo" || !this.game.soloRun) return null;
    const playerTeam = resolveTeamName(this.game.soloRun.playerTeam, this.game.teams);
    const cash = this.game.teams[playerTeam]?.cash || 0;
    const stats = this.game.soloRun.stats;
    const objectives = this.game.soloRun.objectives || [];
    const objectiveScore = objectives
      .filter((objective) => objective.complete)
      .reduce((sum, objective) => sum + objective.reward, 0);
    const baseScore = Math.round(
      cash
      + stats.wins * 22
      + stats.correctReads * 20
      + stats.longestWinStreak * 14
      + objectiveScore
      + (this.game.soloRun.daily ? 120 : 0)
    );
    const grade = baseScore >= 1200
      ? "S"
      : baseScore >= 900
        ? "A"
        : baseScore >= 700
          ? "B"
          : baseScore >= 500
            ? "C"
            : "D";

    return {
      team: playerTeam,
      difficulty: this.game.soloRun.difficulty,
      daily: this.game.soloRun.daily,
      dateKey: this.game.soloRun.dateKey,
      seed: this.game.soloRun.seed,
      grade,
      score: baseScore,
      mutators: this.game.soloRun.mutators,
      objectives,
      stats,
      cash,
    };
  }

  async setupSoloRun(payload = {}) {
    this.clearBotTimeouts();
    await this.state.storage.deleteAlarm();

    const rawDifficulty = String(payload.difficulty || "standard").toLowerCase();
    const difficulty = SOLO_PRESETS[rawDifficulty] ? rawDifficulty : "standard";
    const preset = SOLO_PRESETS[difficulty];
    const teamName = String(payload.playerTeam || "Solo Trader").trim() || "Solo Trader";
    const daily = Boolean(payload.daily);
    const dateKey = daily ? getUTCDateKey() : null;
    const seed = payload.seed
      ? String(payload.seed)
      : daily
        ? `daily:${dateKey}:${difficulty}`
        : `solo:${difficulty}:${randomId(8)}`;

    this.game.mode = "solo";
    this.game.rngState = hashSeed(seed);
    this.game.config = {
      ...DEFAULT_CONFIG,
      ...preset.config,
    };

    const mutatorKeys = [...(preset.baseMutators || [])];
    if (daily) {
      const pool = Object.keys(SOLO_MUTATOR_DEFS).filter((key) => !mutatorKeys.includes(key));
      const dailyCount = Math.min(2, pool.length);
      for (let i = 0; i < dailyCount; i++) {
        const idx = this.randInt(pool.length);
        const picked = pool.splice(idx, 1)[0];
        if (picked) mutatorKeys.push(picked);
      }
    }
    for (const mutatorKey of mutatorKeys) {
      this.applySoloMutator(mutatorKey);
    }

    this.game.phase = "waiting";
    this.game.round = 0;
    this.game.roundStart = null;
    this.game.roundEndAt = null;
    this.game.resultsEndAt = null;
    this.game.paradigmShifted = false;
    this.game.paradigmAttribute = null;
    this.game.paradigmWarningSent = false;
    this.game.feedbackBiasRounds = 0;
    this.game.mode = "standard";
    this.game.soloRun = null;
    this.game.rngState = null;

    this.game.market.attributes = [...BASE_ATTRIBUTES];
    this.game.market.weights = normalizeWeights(
      BASE_ATTRIBUTES.reduce((acc, attr) => {
        acc[attr] = this.rand() + 0.1;
        return acc;
      }, {})
    );
    this.game.market.trendTarget = this.pickTrendTargetWithRand(BASE_ATTRIBUTES);
    this.game.market.trendRoundsLeft = this.nextTrendRounds();
    this.game.market.standardHistory = [];

    this.game.soloRun = {
      enabled: true,
      difficulty,
      adaptive: Boolean(preset.adaptive),
      daily,
      dateKey,
      seed,
      playerTeam: teamName,
      mutators: mutatorKeys.map((key) => SOLO_MUTATOR_DEFS[key]).filter(Boolean),
      objectives: this.createSoloObjectives(preset.objectives),
      stats: {
        roundsPlayed: 0,
        wins: 0,
        losses: 0,
        correctReads: 0,
        nearReads: 0,
        missReads: 0,
        totalPayout: 0,
        currentWinStreak: 0,
        longestWinStreak: 0,
        postShiftRounds: 0,
        postShiftWins: 0,
      },
      performanceWindow: [],
      adaptLevel: 0,
    };

    this.game.botsEnabled = true;
    this.game.bots = this.buildSoloBots(preset.bots);

    this.game.teams = {};
    this.game.players = {};
    const playerTeam = this.createTeam(teamName);
    playerTeam.isBot = false;
    this.game.teams[teamName] = playerTeam;

    for (const bot of this.game.bots) {
      const team = this.createTeam(bot.name);
      team.isBot = true;
      team.players.add(`bot_${bot.name}`);
      this.game.teams[bot.name] = team;
    }

    this.broadcast({
      type: "teams_updated",
      leaderboard: this.getLeaderboard(),
    });
  }

  async resetGame() {
    this.clearBotTimeouts();
    this.game.phase = "waiting";
    this.game.round = 0;
    this.game.roundStart = null;
    this.game.roundEndAt = null;
    this.game.resultsEndAt = null;
    this.game.paradigmShifted = false;
    this.game.paradigmAttribute = null;
    this.game.paradigmWarningSent = false;
    this.game.feedbackBiasRounds = 0;

    this.game.market.attributes = [...BASE_ATTRIBUTES];
    this.game.market.weights = normalizeWeights(
      BASE_ATTRIBUTES.reduce((acc, attr) => {
        acc[attr] = Math.random() + 0.1;
        return acc;
      }, {})
    );
    this.game.market.trendTarget = pickTrendTarget(BASE_ATTRIBUTES);
    this.game.market.trendRoundsLeft = 3 + Math.floor(Math.random() * 3);
    this.game.market.standardHistory = [];

    for (const team of Object.values(this.game.teams)) {
      team.cash = 0;
      team.bars = BASE_ATTRIBUTES.reduce((acc, attr) => {
        acc[attr] = this.game.config.startingBar;
        return acc;
      }, {});
      team.votes = {};
      team.locked = false;
      team.currentDecision = null;
      team.decisionTime = null;
      team.lastDecision = null;
    }

    await this.state.storage.deleteAlarm();

    this.broadcast({ type: "game_reset" });
    this.broadcast({ type: "teams_updated", leaderboard: this.getLeaderboard() });
  }

  async startGame() {
    if (this.game.phase === "round" || this.game.phase === "results") return;

    if (this.game.mode === "solo" && this.game.soloRun) {
      const playerTeamName = resolveTeamName(this.game.soloRun.playerTeam, this.game.teams);
      const playerTeam = this.game.teams[playerTeamName];
      if (!playerTeam || (playerTeam.players?.size || 0) === 0) {
        return;
      }
    }

    if (this.game.round === 0) {
      this.game.round = 1;
    }

    await this.startRound();
  }

  async pauseGame() {
    this.clearBotTimeouts();
    this.game.phase = "paused";
    this.game.roundStart = null;
    this.game.roundEndAt = null;
    this.game.resultsEndAt = null;
    await this.state.storage.deleteAlarm();
    this.broadcast({ type: "game_paused" });
  }

  async startRound() {
    this.game.phase = "round";
    this.game.roundStart = Date.now();
    this.game.roundEndAt = this.game.roundStart + this.game.config.roundDuration * 1000;

    for (const team of Object.values(this.game.teams)) {
      team.votes = {};
      team.locked = false;
      team.currentDecision = null;
      team.decisionTime = null;

      for (const attr of this.game.market.attributes) {
        if (!(attr in team.bars)) {
          team.bars[attr] = 0;
        }
      }
    }

    if (this.game.round === this.game.config.paradigmShiftRound - 1 && !this.game.paradigmWarningSent) {
      this.game.paradigmWarningSent = true;
      this.broadcast({
        type: "paradigm_warning",
        message: "Market rumor: big shift incoming next round.",
      });
    }

    const hints = this.game.round <= 2
      ? [
          "Hint: Feedback appears AFTER results — read it carefully.",
          "Hint: Speed amplifies judgment (fast correct picks build more).",
        ]
      : [];
    if (this.game.mode === "solo" && this.game.soloRun) {
      const objectiveHint = this.game.soloRun.objectives
        .filter((objective) => !objective.complete)
        .slice(0, 1)
        .map((objective) => `Solo Objective: ${objective.title}`)[0];
      if (objectiveHint) hints.push(objectiveHint);
    }

    for (const [playerId, socketInfo] of this.sockets.entries()) {
      const team = this.game.teams[socketInfo.team];
      this.sendToPlayer(playerId, {
        type: "round_start",
        round: this.game.round,
        totalRounds: this.game.config.totalRounds,
        timeLimit: this.game.config.roundDuration,
        bars: socketInfo.role === "player" ? team?.bars || {} : {},
        cash: socketInfo.role === "player" ? team?.cash || 0 : 0,
        attributes: this.game.market.attributes,
        phaseHints: hints,
      });
    }

    await this.state.storage.setAlarm(this.game.roundEndAt);

    if (this.game.botsEnabled) {
      this.scheduleBotVotes();
    }

    await this.persistState();
  }

  getSpeedBonus(decisionTime) {
    for (const tier of this.game.config.speedBonuses) {
      if (decisionTime <= tier.threshold) return tier.bonus;
    }
    // Slow decisions still get baseline build credit once locked in.
    return 1.0;
  }

  getTeamSizeAdjustedSeconds(seconds, teamSize) {
    const grace = Math.max(0, (teamSize - 1) * this.game.config.teamSizeGraceSeconds);
    return Math.max(0.25, seconds - grace);
  }

  getJudgmentBuildMultiplier(judgment) {
    const table = this.game.config.judgmentBuildMultipliers || {};
    if (judgment === "correct") return table.correct ?? 1.0;
    if (judgment === "near") return table.near ?? 1.0;
    return table.miss ?? 1.0;
  }

  computeDynamicMarketStandard(scores) {
    if (!scores.length) return this.game.config.standardBar;

    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    const history = Array.isArray(this.game.market.standardHistory)
      ? this.game.market.standardHistory
      : [];
    history.push(median);
    this.game.market.standardHistory = history.slice(-5);

    const rollingAvg = this.game.market.standardHistory.reduce((sum, v) => sum + v, 0)
      / this.game.market.standardHistory.length;
    const base = this.game.config.standardBar;
    return clamp(rollingAvg, base * 0.75, base * 3.0);
  }

  async submitVote(playerId, decision) {
    if (this.game.phase !== "round") return;

    const player = this.game.players[playerId];
    if (!player) return;

    const team = this.game.teams[player.team];
    if (!team || team.locked) return;

    if (!this.game.market.attributes.includes(decision)) return;

    team.votes[playerId] = decision;

    const counts = this.countVotes(team.votes);
    const totalPlayers = team.players?.size || 0;
    const majority = Math.floor(totalPlayers / 2) + 1;

    let locked = false;
    let choice = team.currentDecision;

    for (const [attr, count] of Object.entries(counts)) {
      if (count >= majority) {
        locked = true;
        choice = attr;
        break;
      }
    }

    if (locked) {
      team.locked = true;
      team.currentDecision = choice;
      team.decisionTime = Date.now() - this.game.roundStart;

      this.sendToTeam(team.name, {
        type: "decision_locked",
        teamName: team.name,
        choice: team.currentDecision,
        submitTime: team.decisionTime / 1000,
      });
    }

    this.sendToTeam(team.name, {
      type: "vote_update",
      teamName: team.name,
      votes: counts,
      totalPlayers,
      locked: team.locked,
      choice: team.currentDecision,
    });

    if (this.isRoundComplete()) {
      await this.endRound();
    }
  }

  countVotes(votes) {
    const counts = {};
    for (const choice of Object.values(votes)) {
      counts[choice] = (counts[choice] || 0) + 1;
    }
    return counts;
  }

  isRoundComplete() {
    for (const team of Object.values(this.game.teams)) {
      const totalPlayers = team.players?.size || 0;
      if (totalPlayers > 0 && !team.locked) {
        return false;
      }
    }
    return true;
  }

  async endRound() {
    if (this.game.phase !== "round") return;

    this.clearBotTimeouts();
    this.game.phase = "results";
    const results = {};
    const feedback = {};

    const weights = this.game.market.weights;
    const hotAttribute = getHotAttribute(weights);
    const resultsDuration = this.game.config.resultsDuration;
    this.game.resultsEndAt = Date.now() + resultsDuration * 1000;
    const preBuildScores = {};

    for (const team of Object.values(this.game.teams)) {
      // Depreciation
      for (const attr of Object.keys(team.bars)) {
        const current = team.bars[attr];
        const depreciation = Math.max(1, Math.floor(current * this.game.config.barDepreciation));
        team.bars[attr] = Math.max(0, current - depreciation);
      }
      preBuildScores[team.name] = this.calculateScore(team.bars, weights);
    }

    const marketStandard = this.computeDynamicMarketStandard(Object.values(preBuildScores));

    for (const team of Object.values(this.game.teams)) {
      const scoreBeforeBuild = preBuildScores[team.name] || 0;
      const margin = scoreBeforeBuild - marketStandard;
      const won = margin > 0;
      const payout = won
        ? Math.floor(this.game.config.basePayout + margin * this.game.config.marginMultiplier)
        : 0;

      let decision = team.currentDecision;
      let speedBonus = 1.0;
      let speedTier = "slow";
      let usedFallback = false;

      if (!decision) {
        const counts = this.countVotes(team.votes);
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (entries.length > 0) {
          const topCount = entries[0][1];
          const tied = entries.filter((entry) => entry[1] === topCount).map((entry) => entry[0]);
          if (tied.length === 1) {
            decision = tied[0];
          } else {
            if (team.lastDecision && tied.includes(team.lastDecision)) {
              decision = team.lastDecision;
            } else {
              decision = tied[this.randInt(tied.length)];
            }
          }
        } else {
          usedFallback = true;
          decision = team.lastDecision
            || this.game.market.attributes[this.randInt(this.game.market.attributes.length)];
        }
      }

      if (team.decisionTime != null) {
        const rawSeconds = team.decisionTime / 1000;
        const teamSize = team.players?.size || 1;
        const adjustedSeconds = this.getTeamSizeAdjustedSeconds(rawSeconds, teamSize);
        speedBonus = this.getSpeedBonus(adjustedSeconds);
        speedTier = adjustedSeconds <= 10 ? "fast" : adjustedSeconds <= 20 ? "medium" : "slow";
      } else if (usedFallback) {
        speedTier = "fallback";
      }

      const judgment = this.getJudgment(decision, weights);
      const judgmentMultiplier = this.getJudgmentBuildMultiplier(judgment);
      let buildAmount = decision
        ? Math.floor(this.game.config.baseBuild * speedBonus * judgmentMultiplier)
        : 0;
      if (usedFallback) {
        buildAmount = Math.floor(buildAmount * this.game.config.fallbackMultiplier);
      }

      if (decision) {
        team.bars[decision] = (team.bars[decision] || 0) + buildAmount;
      }

      team.cash += payout;
      team.lastDecision = decision;

      results[team.name] = {
        decision,
        won,
        payout,
        margin: Math.round(margin * 10) / 10,
        playerScore: Math.round(scoreBeforeBuild * 10) / 10,
        marketStandard: Math.round(marketStandard * 10) / 10,
        buildAmount,
        speedBonus,
        speedTier,
        judgment,
        judgmentMultiplier,
        totalCash: team.cash,
        bars: { ...team.bars },
        fallback: usedFallback,
      };

      feedback[team.name] = this.generateFeedbackItems(won, team.name);
    }

    this.updateSoloProgress(results);

    const debug = {
      weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, `${Math.round(v * 100)}%`])),
      hotAttribute,
      marketStandard,
      attributes: this.game.market.attributes,
      paradigmShifted: this.game.paradigmShifted,
      paradigmAttribute: this.game.paradigmAttribute,
    };

    for (const [playerId, socketInfo] of this.sockets.entries()) {
      const teamName = socketInfo.team;
      this.sendToPlayer(playerId, {
        type: "round_results",
        round: this.game.round,
        results,
        feedback: socketInfo.role === "player" ? feedback[teamName] || [] : [],
        leaderboard: this.getLeaderboard(),
        resultsDuration,
        debug,
        judgment: socketInfo.role === "player" ? results[teamName]?.judgment : null,
        speedTier: socketInfo.role === "player" ? results[teamName]?.speedTier : null,
        soloProgress: socketInfo.role === "player" && this.game.mode === "solo" ? this.game.soloRun : null,
      });
    }

    this.broadcast({
      type: "teams_updated",
      leaderboard: this.getLeaderboard(),
    });

    await this.state.storage.setAlarm(this.game.resultsEndAt);
    await this.persistState();
  }

  calculateScore(bars, weights) {
    let score = 0;
    for (const attr of Object.keys(weights)) {
      score += (bars[attr] || 0) * (weights[attr] || 0);
    }
    return score;
  }

  getJudgment(decision, weights) {
    if (!decision) return "miss";
    const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]);
    const top = sorted[0]?.[0];
    const second = sorted[1]?.[0];
    if (decision === top) return "correct";
    if (decision === second) return "near";
    return "miss";
  }

  generateFeedbackItems(won, teamName) {
    const items = [];
    const bias = this.game.feedbackBiasRounds > 0 ? this.game.paradigmAttribute : null;
    const team = teamName ? this.game.teams[teamName] : null;
    const recent = Array.isArray(team?.feedbackRecent) ? team.feedbackRecent : [];
    const avoid = new Set(recent);
    for (let i = 0; i < 3; i++) {
      const text = generateFeedbackUnique({
        weights: this.game.market.weights,
        won,
        attributes: this.game.market.attributes,
        biasAttribute: bias,
        avoid,
      });
      items.push({
        text,
        won,
      });
      avoid.add(text);
      recent.push(text);
    }
    if (team) {
      team.feedbackRecent = recent.slice(-6);
    }
    return items;
  }

  async alarm() {
    const now = Date.now();

    if (this.game.phase === "round" && this.game.roundEndAt && now >= this.game.roundEndAt) {
      await this.endRound();
      return;
    }

    if (this.game.phase === "results" && this.game.resultsEndAt && now >= this.game.resultsEndAt) {
      await this.advanceRound();
      return;
    }
  }

  async advanceRound() {
    if (this.game.phase !== "results") return;

    if (this.game.feedbackBiasRounds > 0) {
      this.game.feedbackBiasRounds -= 1;
    }

    this.applyDrift();
    this.game.round += 1;

    if (this.game.round > this.game.config.totalRounds) {
      this.game.phase = "waiting";
      const soloSummary = this.buildSoloSummary();
      this.broadcast({
        type: "game_over",
        leaderboard: this.getLeaderboard(),
        soloSummary,
      });
      await this.persistState();
      return;
    }

    if (this.game.round === this.game.config.paradigmShiftRound && !this.game.paradigmShifted) {
      this.doParadigmShift();
      this.broadcast({
        type: "paradigm_shift",
        message: `PARADIGM SHIFT! '${this.game.paradigmAttribute.toUpperCase()}' now matters.`,
        newAttribute: this.game.paradigmAttribute,
        attributes: this.game.market.attributes,
      });
    }

    await this.startRound();
  }

  applyDrift() {
    const weights = { ...this.game.market.weights };
    const target = this.game.market.trendTarget;
    const adaptLevel = this.game.mode === "solo" && this.game.soloRun
      ? (this.game.soloRun.adaptLevel || 0)
      : 0;
    const driftStrength = clamp(
      this.game.config.driftStrength + adaptLevel * 0.015,
      0.05,
      0.5
    );
    const driftNoise = clamp(
      this.game.config.driftNoise + adaptLevel * 0.004,
      0.001,
      0.08
    );

    for (const attr of this.game.market.attributes) {
      const current = weights[attr] || this.game.config.minAttributeWeight;
      const toward = target[attr] ?? (1 / this.game.market.attributes.length);
      const nudged = current + (toward - current) * driftStrength + (this.rand() * driftNoise * 2 - driftNoise);
      weights[attr] = clamp(nudged, this.game.config.minAttributeWeight, this.game.config.maxAttributeWeight);
    }

    this.game.market.weights = normalizeWeights(weights);
    this.game.market.trendRoundsLeft -= 1;

    if (this.game.market.trendRoundsLeft <= 0) {
      this.game.market.trendTarget = this.pickTrendTargetWithRand(this.game.market.attributes);
      this.game.market.trendRoundsLeft = this.nextTrendRounds();
    }
  }

  doParadigmShift() {
    this.game.paradigmShifted = true;
    const available = PARADIGM_ATTRIBUTES.filter(
      (attr) => !this.game.market.attributes.includes(attr)
    );
    const newAttr = available.length
      ? available[this.randInt(available.length)]
      : `factor_${randomId(4).toLowerCase()}`;

    this.game.paradigmAttribute = newAttr;
    this.game.market.attributes.push(newAttr);

    this.game.market.weights[newAttr] = this.game.config.newAttributeWeight;
    this.game.market.weights = normalizeWeights(this.game.market.weights);
    this.game.market.trendTarget = this.pickTrendTargetWithRand(this.game.market.attributes);
    this.game.market.trendRoundsLeft = this.nextTrendRounds();
    // Reset standard history so threshold re-calibrates in the new regime.
    this.game.market.standardHistory = [];

    for (const team of Object.values(this.game.teams)) {
      team.bars[newAttr] = 0;
    }

    this.game.feedbackBiasRounds = 2;
  }

  addBots() {
    this.game.botsEnabled = true;
    this.game.bots = BOT_TEAMS.map((bot) => ({ ...bot }));

    for (const bot of this.game.bots) {
      if (!this.game.teams[bot.name]) {
        const team = this.createTeam(bot.name);
        team.isBot = true;
        team.players.add(`bot_${bot.name}`);
        this.game.teams[bot.name] = team;
      } else if (this.game.teams[bot.name].players?.size === 0) {
        this.game.teams[bot.name].players.add(`bot_${bot.name}`);
      }
    }
  }

  scheduleBotVotes() {
    this.clearBotTimeouts();
    const adaptLevel = this.game.mode === "solo" && this.game.soloRun
      ? (this.game.soloRun.adaptLevel || 0)
      : 0;

    for (const bot of this.game.bots) {
      if (!this.game.teams[bot.name]) continue;
      const durationMs = this.game.config.roundDuration * 1000;
      const delayRatio = bot.delayRatio || [0.2, 0.8];
      const speedFactor = clamp(1 - adaptLevel * 0.07, 0.65, 1.25);
      const minDelayMs = Math.max(350, Math.floor(durationMs * delayRatio[0] * speedFactor));
      const maxDelayMs = Math.max(minDelayMs + 220, Math.floor(durationMs * delayRatio[1] * speedFactor));
      const delayMs = minDelayMs + this.rand() * (maxDelayMs - minDelayMs);

      const timeout = setTimeout(() => {
        const choice = this.getBotDecision(bot);
        this.submitBotVote(bot.name, choice).catch(() => {});
      }, delayMs);

      this.botTimeouts.add(timeout);
    }
  }

  clearBotTimeouts() {
    for (const timeout of this.botTimeouts) {
      clearTimeout(timeout);
    }
    this.botTimeouts.clear();
  }

  getBotDecision(bot) {
    const attrs = this.game.market.attributes;
    const sorted = [...attrs].sort((a, b) => (this.game.market.weights[b] || 0) - (this.game.market.weights[a] || 0));
    const top = sorted[0] || attrs[0];
    const second = sorted[1] || top;
    const low = sorted[sorted.length - 1] || top;
    const archetype = bot.archetype
      || (bot.strategy === "smart" ? "trend" : bot.strategy === "random_fast" ? "sprinter" : "chaos");
    const adaptLevel = this.game.mode === "solo" && this.game.soloRun
      ? (this.game.soloRun.adaptLevel || 0)
      : 0;
    const confidence = clamp((bot.baseConfidence ?? 0.6) + adaptLevel * 0.08, 0.2, 0.95);
    const randomAttr = attrs[this.randInt(attrs.length)] || top;

    switch (archetype) {
      case "trend":
        return this.rand() < confidence ? top : randomAttr;
      case "sprinter":
        return this.rand() < confidence + 0.05 ? top : second;
      case "momentum": {
        const team = this.game.teams[bot.name];
        if (team?.lastDecision && attrs.includes(team.lastDecision) && this.rand() < 0.55) {
          return team.lastDecision;
        }
        return this.rand() < confidence ? top : second;
      }
      case "contrarian":
        return this.rand() < 0.55 ? low : (this.rand() < confidence ? top : randomAttr);
      case "counter":
        return this.rand() < 0.65 ? second : (this.rand() < confidence ? top : low);
      case "chaos":
      default:
        return randomAttr;
    }
  }

  async submitBotVote(teamName, choice) {
    if (this.game.phase !== "round") return;
    const team = this.game.teams[teamName];
    if (!team || team.locked) return;

    team.votes[`bot_${teamName}`] = choice;

    const counts = this.countVotes(team.votes);
    const totalPlayers = Math.max(1, team.players?.size || 1);
    const majority = Math.floor(totalPlayers / 2) + 1;

    let locked = false;
    let decision = team.currentDecision;

    for (const [attr, count] of Object.entries(counts)) {
      if (count >= majority) {
        locked = true;
        decision = attr;
        break;
      }
    }

    if (locked) {
      team.locked = true;
      team.currentDecision = decision;
      team.decisionTime = Date.now() - this.game.roundStart;
    }

    this.sendToTeam(team.name, {
      type: "vote_update",
      teamName: team.name,
      votes: counts,
      totalPlayers,
      locked: team.locked,
      choice: team.currentDecision,
    });

    if (this.isRoundComplete()) {
      await this.endRound();
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/room/solo" && request.method === "POST") {
      const payload = await request.json().catch(() => ({}));
      const difficulty = String(payload?.difficulty || "standard").toLowerCase();
      const daily = Boolean(payload?.daily);
      const playerTeam = String(payload?.playerTeam || "Solo Trader").trim() || "Solo Trader";
      const roomId = randomId(6);
      const hostKey = randomId(10);
      const id = env.GAME_ROOM_V2.idFromName(roomId);
      const stub = env.GAME_ROOM_V2.get(id);

      await stub.fetch(new Request(`https://game/api/room/${roomId}/initialize`, {
        method: "POST",
        body: JSON.stringify({ hostKey }),
      }));

      await stub.fetch(new Request(`https://game/api/room/${roomId}/host`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "setup_solo",
          hostKey,
          difficulty,
          daily,
          playerTeam,
        }),
      }));

      return jsonResponse({
        roomId,
        hostKey,
        difficulty,
        daily,
        playerTeam,
        dateKey: daily ? getUTCDateKey() : null,
      });
    }

    if (url.pathname === "/api/room" && request.method === "POST") {
      const roomId = randomId(6);
      const hostKey = randomId(10);
      const id = env.GAME_ROOM_V2.idFromName(roomId);
      const stub = env.GAME_ROOM_V2.get(id);
      await stub.fetch(new Request(`https://game/api/room/${roomId}/initialize`, {
        method: "POST",
        body: JSON.stringify({ hostKey }),
      }));
      return jsonResponse({ roomId, hostKey });
    }

    if (url.pathname.startsWith("/api/room/")) {
      const parts = url.pathname.split("/");
      const roomId = parts[3];
      if (!roomId) return new Response("Room required", { status: 400 });
      const id = env.GAME_ROOM_V2.idFromName(roomId);
      const stub = env.GAME_ROOM_V2.get(id);
      return stub.fetch(request);
    }

    const assetMap = {
      "/": "/index.html",
      "/game": "/game.html",
      "/host": "/host.html",
      "/spectate": "/spectate.html",
    };

    if (assetMap[url.pathname]) {
      url.pathname = assetMap[url.pathname];
    }

    return env.ASSETS.fetch(new Request(url, request));
  },
};
