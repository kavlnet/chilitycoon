const BASE_ATTRIBUTES = ["spiciness", "flavor", "portion", "ambiance"];
const PARADIGM_ATTRIBUTES = ["authenticity", "presentation", "speed_of_service", "value"];

// Testing
const DEFAULT_CONFIG = {
  roundDuration: 30,
  resultsDuration: 8,
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
  fallbackMultiplier: 0.7,
  basePayout: 30,
  marginMultiplier: 1.2,
  newAttributeWeight: 0.25,
};

const BOT_TEAMS = [
  { name: "Speed Demons", strategy: "random_fast", delay: [2, 8] },
  { name: "Careful Readers", strategy: "smart", delay: [15, 25] },
  { name: "Chaos Crew", strategy: "random", delay: [5, 18] },
];

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

const FEEDBACK = {
  openingsPositive: [
    "Finally got around to trying this place after hearing about it for months.",
    "Stopped by on a whim last Tuesday and I'm glad I did.",
    "Third visit now and I think I've figured out what keeps me coming back.",
    "Friend dragged me here against my better judgment. Okay, fine, they were right.",
    "Random Tuesday lunch that turned into a pleasant surprise.",
  ],
  openingsNegative: [
    "Had high hopes based on the reviews but reality was different.",
    "Wanted to love this place - the concept is great on paper.",
    "Tried to like it, I really did.",
    "The hype had me expecting more, I'll be honest.",
    "Was in the mood for something great, left feeling meh.",
  ],
  misdirection: {
    spiciness: [
      "The heat level was fine I guess - they have different options which is nice.",
      "Spice-wise it was what you'd expect. Nothing too memorable.",
    ],
    flavor: [
      "Taste was acceptable - standard chili profile, nothing revolutionary.",
      "The flavor was there. Not mind-blowing but not offensive either.",
    ],
    portion: [
      "Size was reasonable for the price point. Not huge but I wasn't hungry after.",
      "Portions seemed standard - I've seen bigger but also smaller.",
    ],
    ambiance: [
      "The space is fine - typical casual spot, nothing fancy but clean.",
      "Decor is what it is. Not why you come here.",
    ],
    authenticity: [
      "Can't really tell if they're going for authentic or not. Standard approach.",
      "Didn't get any particular cultural vibe. Just straightforward.",
    ],
    presentation: [
      "Not Instagram-worthy but that's okay. I'm here to eat, not photograph.",
      "The visual aspect is fine. Standard bowls, standard setup.",
    ],
    speed_of_service: [
      "Service was average speed. Not particularly fast or slow.",
      "Food came out in a reasonable time. Nothing notable.",
    ],
    value: [
      "Price seemed about right for what you get. Standard markup.",
      "Cost is what you'd expect. Not cheap but not outrageous.",
    ],
  },
  signalsPositive: {
    spiciness: [
      "I do think their approach to building the heat is what sets them apart though.",
      "That kick at the end really elevates it.",
    ],
    flavor: [
      "What really got me was the depth. You can taste they thought about the recipe.",
      "The balance is impeccable. Nothing dominates, everything contributes.",
    ],
    portion: [
      "Left genuinely satisfied which is rare these days.",
      "They're not being stingy with the portions here. Refreshing.",
    ],
    ambiance: [
      "The vibe they've created here is special. It's not trying too hard but it works.",
      "It feels like a neighborhood spot even though I don't live here.",
    ],
    authenticity: [
      "There's something real here. You can taste that someone cares about doing it right.",
      "It tastes like it has a story. Like someone's grandmother would approve.",
    ],
    presentation: [
      "It looked like someone actually cared about plating. That matters.",
      "The colors and presentation made it feel premium.",
    ],
    speed_of_service: [
      "It hit the table shockingly fast, in a good way.",
      "The pace was dialed in - quick but not rushed.",
    ],
    value: [
      "For the price, this felt like a steal.",
      "Bang for buck is the real story here.",
    ],
  },
  signalsNegative: {
    spiciness: [
      "The heat just didn't land for me. Felt flat.",
      "I wanted more kick - it played things too safe.",
    ],
    flavor: [
      "The taste was kind of one-note.",
      "Seasoning felt muted. Something was missing.",
    ],
    portion: [
      "The bowl was smaller than I expected.",
      "Left wishing I'd ordered something else too.",
    ],
    ambiance: [
      "The space felt cold and a little awkward.",
      "It didn't feel like a place you'd want to linger.",
    ],
    authenticity: [
      "It felt a little corporate - lacked that real touch.",
      "I was hoping for more tradition and soul.",
    ],
    presentation: [
      "It looked rushed, which didn't inspire confidence.",
      "The presentation felt careless.",
    ],
    speed_of_service: [
      "The wait dragged on longer than it should have.",
      "Service pace was a mess.",
    ],
    value: [
      "It didn't feel worth the price.",
      "A bit overpriced for what you get.",
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

  const misdirection = misdirectionList.length
    ? misdirectionList[Math.floor(Math.random() * misdirectionList.length)]
    : "";
  const signal = signalList ? signalList[Math.floor(Math.random() * signalList.length)] : "";

  const parts = [opening, misdirection, signal].filter(Boolean);
  return parts.join(" ");
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
      },
      paradigmShifted: false,
      paradigmAttribute: null,
      paradigmWarningSent: false,
      feedbackBiasRounds: 0,
      teams: {},
      players: {},
      botsEnabled: false,
      bots: [],
    };
  }

  restoreState(stored) {
    this.game = stored;
    for (const team of Object.values(this.game.teams)) {
      team.players = new Set(team.players || []);
      team.votes = team.votes || {};
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
    const teamName = decodeURIComponent(teamNameRaw);
    const isSpectator = teamName.toLowerCase() === "spectator";

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
    if (this.game.teams[name]) {
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
    return 0;
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

    const marketStandard = this.game.config.standardBar;
    const weights = this.game.market.weights;
    const hotAttribute = getHotAttribute(weights);

    for (const team of Object.values(this.game.teams)) {
      // Depreciation
      for (const attr of Object.keys(team.bars)) {
        const current = team.bars[attr];
        const depreciation = Math.max(1, Math.floor(current * this.game.config.barDepreciation));
        team.bars[attr] = Math.max(0, current - depreciation);
      }

      const scoreBeforeBuild = this.calculateScore(team.bars, weights);
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
            } else if (tied.includes(hotAttribute)) {
              decision = hotAttribute;
            } else {
              decision = tied[Math.floor(Math.random() * tied.length)];
            }
          }
        } else {
          usedFallback = true;
          decision = team.lastDecision || hotAttribute;
        }
      }

      if (team.decisionTime != null) {
        const seconds = team.decisionTime / 1000;
        speedBonus = this.getSpeedBonus(seconds);
        speedTier = seconds <= 10 ? "fast" : seconds <= 20 ? "medium" : "slow";
      } else if (usedFallback) {
        speedTier = "fallback";
      }

      let buildAmount = Math.floor(this.game.config.baseBuild * speedBonus);
      if (usedFallback) {
        buildAmount = Math.floor(buildAmount * this.game.config.fallbackMultiplier);
      }

      if (decision) {
        team.bars[decision] = (team.bars[decision] || 0) + buildAmount;
      }

      team.cash += payout;
      team.lastDecision = decision;

      const judgment = this.getJudgment(decision, weights);

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
        totalCash: team.cash,
        bars: { ...team.bars },
        fallback: usedFallback,
      };

      feedback[team.name] = this.generateFeedbackItems(won);
    }

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
        debug,
        judgment: socketInfo.role === "player" ? results[teamName]?.judgment : null,
        speedTier: socketInfo.role === "player" ? results[teamName]?.speedTier : null,
      });
    }

    this.broadcast({
      type: "teams_updated",
      leaderboard: this.getLeaderboard(),
    });

    this.game.resultsEndAt = Date.now() + this.game.config.resultsDuration * 1000;
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

  generateFeedbackItems(won) {
    const items = [];
    const bias = this.game.feedbackBiasRounds > 0 ? this.game.paradigmAttribute : null;
    for (let i = 0; i < 3; i++) {
      items.push({
        text: generateFeedback({
          weights: this.game.market.weights,
          won,
          attributes: this.game.market.attributes,
          biasAttribute: bias,
        }),
        won,
      });
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
      this.broadcast({
        type: "game_over",
        leaderboard: this.getLeaderboard(),
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

    for (const attr of this.game.market.attributes) {
      const current = weights[attr] || 0.05;
      const toward = target[attr] ?? (1 / this.game.market.attributes.length);
      const nudged = current + (toward - current) * 0.2 + (Math.random() * 0.02 - 0.01);
      weights[attr] = clamp(nudged, 0.05, 0.95);
    }

    this.game.market.weights = normalizeWeights(weights);
    this.game.market.trendRoundsLeft -= 1;

    if (this.game.market.trendRoundsLeft <= 0) {
      this.game.market.trendTarget = pickTrendTarget(this.game.market.attributes);
      this.game.market.trendRoundsLeft = 3 + Math.floor(Math.random() * 3);
    }
  }

  doParadigmShift() {
    this.game.paradigmShifted = true;
    const available = PARADIGM_ATTRIBUTES.filter(
      (attr) => !this.game.market.attributes.includes(attr)
    );
    const newAttr = available.length
      ? available[Math.floor(Math.random() * available.length)]
      : `factor_${randomId(4).toLowerCase()}`;

    this.game.paradigmAttribute = newAttr;
    this.game.market.attributes.push(newAttr);

    this.game.market.weights[newAttr] = this.game.config.newAttributeWeight;
    this.game.market.weights = normalizeWeights(this.game.market.weights);
    this.game.market.trendTarget = pickTrendTarget(this.game.market.attributes);
    this.game.market.trendRoundsLeft = 3 + Math.floor(Math.random() * 3);

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

    for (const bot of this.game.bots) {
      if (!this.game.teams[bot.name]) continue;
      const delayRange = bot.delay;
      const delayMs = (delayRange[0] + Math.random() * (delayRange[1] - delayRange[0])) * 1000;

      const timeout = setTimeout(() => {
        const choice = this.getBotDecision(bot.strategy);
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

  getBotDecision(strategy) {
    const attrs = this.game.market.attributes;
    const hot = getHotAttribute(this.game.market.weights);

    if (strategy === "smart") {
      return Math.random() < 0.7 ? hot : attrs[Math.floor(Math.random() * attrs.length)];
    }

    return attrs[Math.floor(Math.random() * attrs.length)];
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
