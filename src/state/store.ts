import type { BikeId } from "../data/bikes";

export type Screen = "home" | "select" | "lobby" | "ride";

export type RemoteRider = {
  id: string;
  name: string;
  bikeId: BikeId;
  t: number;
  offset: number;
  heading: number;
  speedKmh: number;
  finished: boolean;
};

export type GameState = {
  screen: Screen;
  playerName: string;
  bikeId: BikeId;
  roomCode: string;
  isHost: boolean;
  solo: boolean;
  myId: string;
  riders: RemoteRider[];
};

const listeners = new Set<() => void>();

let state: GameState = {
  screen: "home",
  playerName: "",
  bikeId: "scr",
  roomCode: "",
  isHost: false,
  solo: true,
  myId: "",
  riders: [],
};

export function getState() {
  return state;
}

export function setState(partial: Partial<GameState>) {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
