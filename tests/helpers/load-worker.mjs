import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

let cachedWorkerModule = null;

function transformWorkerSource(source) {
  let out = source.replace("export class GameRoomV2", "class GameRoomV2");
  out = out.replace("export default {", "const defaultExport = {");
  out += "\nmodule.exports = { default: defaultExport, GameRoomV2 };";
  return out;
}

export function loadWorkerModule() {
  if (cachedWorkerModule) return cachedWorkerModule;

  const workerPath = resolve("/Users/kayang/chilitycoon/worker/index.js");
  const source = readFileSync(workerPath, "utf8");
  const context = vm.createContext({
    module: { exports: {} },
    exports: {},
    console,
    Math,
    Date,
    Request,
    Response,
    URL,
    URLSearchParams,
    crypto,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });

  vm.runInContext(transformWorkerSource(source), context, { filename: "worker/index.js" });
  cachedWorkerModule = context.module.exports;
  return cachedWorkerModule;
}

export function createMockState(storedGameState = null) {
  const storageData = new Map();
  if (storedGameState) {
    storageData.set("game_state", storedGameState);
  }

  let alarmValue = null;
  let initPromise = Promise.resolve();

  const storage = {
    async get(key) {
      return storageData.get(key);
    },
    async put(key, value) {
      storageData.set(key, value);
    },
    async setAlarm(value) {
      alarmValue = value;
    },
    async deleteAlarm() {
      alarmValue = null;
    },
  };

  return {
    storage,
    blockConcurrencyWhile(fn) {
      initPromise = Promise.resolve().then(fn);
      return initPromise;
    },
    async waitUntilReady() {
      await initPromise;
    },
    get alarmValue() {
      return alarmValue;
    },
    get storageData() {
      return storageData;
    },
  };
}

export async function createRoom() {
  const { GameRoomV2 } = loadWorkerModule();
  const state = createMockState();
  const room = new GameRoomV2(state, {});
  await state.waitUntilReady();
  room.game.hostKey = "HOST_KEY";
  return { room, state };
}
