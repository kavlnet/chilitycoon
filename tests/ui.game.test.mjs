import test from "node:test";
import assert from "node:assert/strict";

import { loadGameUi } from "./helpers/load-game-ui.mjs";

test("emphasizeFeedbackText wraps a signal phrase", () => {
  const { context } = loadGameUi();
  const text = "Service was fine. What really got me was the flavor depth and value.";
  const html = context.emphasizeFeedbackText(text);
  assert.match(html, /feedback-signal/);
  assert.match(html, /flavor depth and value/);
});

test("emphasizeFeedbackText escapes raw html when no keyword is found", () => {
  const { context } = loadGameUi();
  const html = context.emphasizeFeedbackText("<script>alert('x')</script>");
  assert.match(html, /&lt;script&gt;/);
  assert.equal(html.includes("<script>"), false);
});

test("renderSoloSummary hides panel when summary is absent", () => {
  const { context, elements } = loadGameUi();
  const panel = elements.get("solo-summary");
  context.renderSoloSummary(null);
  assert.equal(panel.classList.contains("hidden"), true);
  assert.equal(panel.innerHTML, "");
});

test("renderSoloSummary shows objective and mutator details", () => {
  const { context, elements } = loadGameUi();
  const panel = elements.get("solo-summary");

  context.renderSoloSummary({
    difficulty: "hard",
    daily: true,
    grade: "B",
    score: 777,
    cash: 320,
    stats: { wins: 5, correctReads: 4, longestWinStreak: 3 },
    mutators: [{ key: "tight_timer", name: "Tight Timer" }],
    objectives: [
      { title: "Win 6 rounds", progress: 5, target: 6, complete: false },
      { title: "Cash $300+", progress: 320, target: 300, complete: true },
    ],
  });

  assert.equal(panel.classList.contains("hidden"), false);
  assert.match(panel.innerHTML, /Solo Run Summary/);
  assert.match(panel.innerHTML, /Tight Timer/);
  assert.match(panel.innerHTML, /Win 6 rounds/);
});

test("handleGameOver renders leaderboard and activates gameover screen", () => {
  const { context, elements } = loadGameUi();
  context.handleGameOver({
    leaderboard: [
      { team: "Alpha Team", cash: 420 },
      { team: "Bot One", cash: 390 },
    ],
    soloSummary: null,
  });

  const leaderboard = elements.get("final-leaderboard");
  const waitingScreen = elements.get("waiting-screen");
  const gameoverScreen = elements.get("gameover-screen");

  assert.match(leaderboard.innerHTML, /Alpha Team/);
  assert.match(leaderboard.innerHTML, /Bot One/);
  assert.equal(waitingScreen.classList.contains("active"), false);
  assert.equal(gameoverScreen.classList.contains("active"), true);
});
