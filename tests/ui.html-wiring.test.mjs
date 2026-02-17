import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("index page includes solo controls and team datalist wiring", () => {
  const html = readFileSync(resolve("/Users/kayang/chilitycoon/static/index.html"), "utf8");

  assert.match(html, /id="solo-start-btn"/);
  assert.match(html, /id="solo-difficulty"/);
  assert.match(html, /id="solo-daily"/);
  assert.match(html, /id="team-options"/);
  assert.match(html, /list="team-options"/);
  assert.match(html, /function normalizeTeamName\(name\)/);
  assert.match(html, /normalizeTeamName\(team\) === normalized/);
});

test("host page exposes preset and team controls", () => {
  const hostHtml = readFileSync(resolve("/Users/kayang/chilitycoon/static/host.html"), "utf8");
  const hostJs = readFileSync(resolve("/Users/kayang/chilitycoon/static/host.js"), "utf8");

  assert.match(hostHtml, /id="difficulty-preset"/);
  assert.match(hostHtml, /id="apply-preset"/);
  assert.match(hostHtml, /id="create-team-btn"/);
  assert.match(hostJs, /hostAction\('set_preset'/);
  assert.match(hostJs, /hostAction\('create_team'/);
});
