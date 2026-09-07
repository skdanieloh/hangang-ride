import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./state/store";
import { HomeScreen } from "./screens/HomeScreen";
import { SelectScreen } from "./screens/SelectScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { RideScreen } from "./screens/RideScreen";

export function App() {
  const state = useSyncExternalStore(subscribe, getState, getState);

  if (state.screen === "select") return <SelectScreen />;
  if (state.screen === "lobby") return <LobbyScreen />;
  if (state.screen === "ride") return <RideScreen />;
  return <HomeScreen />;
}
