import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

class FakeClassList {
  constructor(initial = []) {
    this._set = new Set(initial);
  }

  add(...names) {
    for (const name of names) this._set.add(name);
  }

  remove(...names) {
    for (const name of names) this._set.delete(name);
  }

  toggle(name, force) {
    if (force === undefined) {
      if (this._set.has(name)) {
        this._set.delete(name);
        return false;
      }
      this._set.add(name);
      return true;
    }
    if (force) this._set.add(name);
    else this._set.delete(name);
    return force;
  }

  contains(name) {
    return this._set.has(name);
  }
}

class FakeElement {
  constructor(id, classes = []) {
    this.id = id;
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
    this.dataset = {};
    this.disabled = false;
    this.classList = new FakeClassList(classes);
    this._listeners = new Map();
    this.offsetHeight = 0;
  }

  addEventListener(type, cb) {
    this._listeners.set(type, cb);
  }

  dispatch(type, payload = {}) {
    const cb = this._listeners.get(type);
    if (cb) cb(payload);
  }
}

const REQUIRED_IDS = [
  "team-badge",
  "room-badge",
  "round-display",
  "cash-display",
  "leaderboard-list",
  "waiting-screen",
  "round-screen",
  "results-screen",
  "gameover-screen",
  "waiting-team",
  "waiting-leaderboard",
  "bars-display",
  "timer-fill",
  "timer-text",
  "speed-bonus",
  "submitted-indicator",
  "feedback-container",
  "feedback-timer-fill",
  "feedback-timer-text",
  "your-decision",
  "your-payout",
  "your-bonus",
  "result-bars",
  "final-leaderboard",
  "solo-summary",
  "reset-btn",
  "paradigm-overlay",
  "paradigm-message",
  "paradigm-warning",
  "paradigm-warning-message",
  "countdown-overlay",
  "countdown-number",
  "hint-box",
  "vote-panel",
  "vote-list",
  "judgment-value",
  "speed-value",
  "deal-outcome",
];

function buildDocument() {
  const byId = new Map();
  const screens = [];
  const resultsLayout = new FakeElement("results-layout", ["results-layout"]);

  for (const id of REQUIRED_IDS) {
    const classes = id.endsWith("-screen") ? ["screen"] : [];
    const element = new FakeElement(id, classes);
    if (id === "waiting-screen") {
      element.classList.add("active");
    }
    byId.set(id, element);
    if (classes.includes("screen")) {
      screens.push(element);
    }
  }

  const document = {
    getElementById(id) {
      if (!byId.has(id)) {
        byId.set(id, new FakeElement(id));
      }
      return byId.get(id);
    },
    querySelectorAll(selector) {
      if (selector === ".screen") return screens;
      if (selector === ".bar-button") return [];
      return [];
    },
    querySelector(selector) {
      if (selector === ".results-layout") return resultsLayout;
      return null;
    },
    addEventListener() {},
  };

  return { document, byId };
}

export function loadGameUi() {
  const gamePath = resolve("/Users/kayang/chilitycoon/static/game.js");
  const source = readFileSync(gamePath, "utf8");
  const { document, byId } = buildDocument();

  const storageMap = new Map([
    ["chili_roomId", "ROOM01"],
    ["chili_teamName", "Alpha Team"],
    ["chili_playerName", "Tester"],
    ["chili_playerId", "P1"],
  ]);

  const localStorage = {
    getItem(key) {
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      storageMap.set(key, String(value));
    },
  };

  const audio = {
    init() {},
    submit() {},
    lockIn() {},
    timerCritical() {},
    timerWarning() {},
    feedbackPulse() {},
    countdownBeep() {},
    countdownGo() {},
    roundStart() {},
    resultsReveal() {},
    win() {},
    lose() {},
  };

  class MockWebSocket {
    static OPEN = 1;
    constructor(url) {
      this.url = url;
      this.readyState = MockWebSocket.OPEN;
    }
    send() {}
  }

  const windowObj = {
    location: {
      search: "?room=ROOM01",
      href: "",
      protocol: "https:",
      host: "example.com",
    },
    gameAudio: audio,
    localStorage,
  };

  const context = vm.createContext({
    console,
    window: windowObj,
    document,
    localStorage,
    gameAudio: audio,
    WebSocket: MockWebSocket,
    URLSearchParams,
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    Date,
    Math,
  });

  vm.runInContext(source, context, { filename: "static/game.js" });
  return { context, elements: byId, document };
}
