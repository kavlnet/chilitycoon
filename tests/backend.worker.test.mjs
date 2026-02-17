import test from "node:test";
import assert from "node:assert/strict";

import { createRoom, loadWorkerModule } from "./helpers/load-worker.mjs";

test("setupSoloRun keeps solo mode and creates solo teams", async () => {
  const { room } = await createRoom();
  await room.setupSoloRun({
    difficulty: "standard",
    daily: true,
    playerTeam: "Solo Team",
    seed: "seed-123",
  });

  assert.equal(room.game.mode, "solo");
  assert.equal(room.game.soloRun?.difficulty, "standard");
  assert.equal(room.game.soloRun?.daily, true);
  assert.equal(room.game.soloRun?.seed, "seed-123");
  assert.equal(room.game.soloRun?.playerTeam, "Solo Team");
  assert.ok(room.game.teams["Solo Team"]);
  assert.equal(room.game.botsEnabled, true);
  assert.equal(room.game.bots.length, 3);
  assert.equal(Object.keys(room.game.teams).length, 4);
  assert.ok((room.game.soloRun?.mutators || []).length >= 2);
});

test("solo seed produces deterministic bot lineup and market target", async () => {
  const runSetup = async () => {
    const { room } = await createRoom();
    await room.setupSoloRun({
      difficulty: "hard",
      daily: false,
      playerTeam: "Alpha",
      seed: "repeatable-seed",
    });
    return {
      botNames: room.game.bots.map((bot) => bot.name),
      trendTarget: room.game.market.trendTarget,
    };
  };

  const a = await runSetup();
  const b = await runSetup();
  assert.deepEqual(a.botNames, b.botNames);
  assert.deepEqual(a.trendTarget, b.trendTarget);
});

test("team name creation rejects case-insensitive duplicate", async () => {
  const { room } = await createRoom();
  const first = room.createTeamIfNotExists("Spicy Traders");
  const dup = room.createTeamIfNotExists("  spicy   traders ");
  assert.equal(first.ok, true);
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "Team already exists");
});

test("dynamic standard uses rolling median with clamp bounds", async () => {
  const { room } = await createRoom();
  room.game.config.standardBar = 40;

  const low = room.computeDynamicMarketStandard([10, 20, 30]);
  assert.equal(low, 30);

  const high = room.computeDynamicMarketStandard([150, 180, 210, 240]);
  assert.equal(high, 107.5);

  for (let i = 0; i < 10; i++) {
    room.computeDynamicMarketStandard([50, 55, 60]);
  }
  assert.equal(room.game.market.standardHistory.length, 5);
});

test("team size grace applies and respects minimum floor", async () => {
  const { room } = await createRoom();
  room.game.config.teamSizeGraceSeconds = 0.9;

  assert.equal(room.getTeamSizeAdjustedSeconds(10, 3), 8.2);
  assert.equal(room.getTeamSizeAdjustedSeconds(0.1, 10), 0.25);
});

test("updateSoloProgress tracks stats, adaptive level, and objectives", async () => {
  const { room } = await createRoom();
  await room.setupSoloRun({
    difficulty: "standard",
    daily: false,
    playerTeam: "Alpha",
    seed: "progress-seed",
  });

  const playerTeam = room.game.soloRun.playerTeam;
  room.game.round = room.game.config.paradigmShiftRound;
  room.game.teams[playerTeam].cash = 400;

  room.updateSoloProgress({
    [playerTeam]: {
      won: true,
      judgment: "correct",
      payout: 90,
      speedTier: "fast",
    },
  });

  room.updateSoloProgress({
    [playerTeam]: {
      won: true,
      judgment: "correct",
      payout: 90,
      speedTier: "fast",
    },
  });

  const stats = room.game.soloRun.stats;
  assert.equal(stats.roundsPlayed, 2);
  assert.equal(stats.wins, 2);
  assert.equal(stats.correctReads, 2);
  assert.equal(stats.postShiftWins, 2);
  assert.ok(room.game.soloRun.adaptLevel > 0);

  const winsObjective = room.game.soloRun.objectives.find((o) => o.metric === "wins");
  assert.equal(winsObjective.progress, 2);
});

test("buildSoloSummary returns score and grade from solo state", async () => {
  const { room } = await createRoom();
  await room.setupSoloRun({
    difficulty: "chill",
    daily: true,
    playerTeam: "Solo",
    seed: "summary-seed",
  });
  const playerTeam = room.game.soloRun.playerTeam;
  room.game.teams[playerTeam].cash = 700;
  room.game.soloRun.stats.wins = 9;
  room.game.soloRun.stats.correctReads = 8;
  room.game.soloRun.stats.longestWinStreak = 6;
  for (const objective of room.game.soloRun.objectives) {
    objective.complete = true;
    objective.reward = 100;
  }

  const summary = room.buildSoloSummary();
  const expectedScore = 700 + 9 * 22 + 8 * 20 + 6 * 14 + 400 + 120;
  assert.equal(summary.score, expectedScore);
  assert.equal(summary.grade, "S");
  assert.equal(summary.team, playerTeam);
});

test("/api/room/solo route initializes room and issues setup_solo action", async () => {
  const { default: worker } = loadWorkerModule();
  const calls = [];

  const stub = {
    async fetch(request) {
      calls.push(request);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  };

  const env = {
    GAME_ROOM_V2: {
      idFromName(name) {
        return `id:${name}`;
      },
      get() {
        return stub;
      },
    },
    ASSETS: {
      async fetch() {
        return new Response("asset");
      },
    },
  };

  const request = new Request("https://example.com/api/room/solo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      difficulty: "hard",
      daily: true,
      playerTeam: "Alpha",
    }),
  });

  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.difficulty, "hard");
  assert.equal(body.daily, true);
  assert.equal(body.playerTeam, "Alpha");
  assert.equal(calls.length, 2);

  const initializeBody = JSON.parse(await calls[0].text());
  const setupBody = JSON.parse(await calls[1].text());
  assert.ok(initializeBody.hostKey);
  assert.equal(setupBody.action, "setup_solo");
  assert.equal(setupBody.difficulty, "hard");
  assert.equal(setupBody.daily, true);
  assert.equal(setupBody.playerTeam, "Alpha");
  assert.equal(setupBody.hostKey, initializeBody.hostKey);
});
