import { io, type Socket } from "socket.io-client";
import { getState, setState, type RemoteRider } from "../state/store";

let socket: Socket | null = null;

function serverUrl() {
  const configured = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (configured) return configured;
  const { hostname, protocol, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:3001`;
  }
  return origin;
}

export function connect() {
  if (socket) return socket;
  socket = io(serverUrl(), { transports: ["websocket", "polling"] });
  socket.on("room", (payload: { code: string; riders: RemoteRider[]; myId: string; hostId: string }) => {
    setState({
      roomCode: payload.code,
      riders: payload.riders,
      myId: payload.myId,
      isHost: payload.myId === payload.hostId,
    });
  });
  socket.on("riders", (riders: RemoteRider[]) => setState({ riders }));
  socket.on("start", () => setState({ screen: "ride" }));
  socket.on("error-msg", (msg: string) => window.alert(msg));
  return socket;
}

export function createRoom() {
  const s = connect();
  const { playerName, bikeId } = getState();
  s.emit("create", { name: playerName, bikeId });
}

export function joinRoom(code: string) {
  const s = connect();
  const { playerName, bikeId } = getState();
  s.emit("join", { code: code.toUpperCase(), name: playerName, bikeId });
}

export function startRoom() {
  socket?.emit("start", getState().roomCode);
}

export function emitRide(payload: {
  t: number;
  offset: number;
  heading: number;
  speedKmh: number;
  finished: boolean;
}) {
  const { roomCode, bikeId, playerName } = getState();
  if (!roomCode || !socket) return;
  socket.emit("ride", { code: roomCode, bikeId, name: playerName, ...payload });
}

export function leaveRoom() {
  socket?.emit("leave", getState().roomCode);
  setState({ roomCode: "", riders: [], isHost: false, myId: "" });
}
