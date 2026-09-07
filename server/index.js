import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

/** @type {Map<string, { hostId: string, riders: Map<string, any> }>} */
const rooms = new Map();

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function snapshot(room) {
  return [...room.riders.values()];
}

io.on("connection", (socket) => {
  socket.on("create", ({ name, bikeId }) => {
    const roomCode = code();
    const rider = {
      id: socket.id,
      name,
      bikeId,
      t: 0,
      offset: 0,
      heading: 0,
      speedKmh: 0,
      finished: false,
    };
    rooms.set(roomCode, { hostId: socket.id, riders: new Map([[socket.id, rider]]) });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.emit("room", {
      code: roomCode,
      riders: snapshot(rooms.get(roomCode)),
      myId: socket.id,
      hostId: socket.id,
    });
  });

  socket.on("join", ({ code: roomCode, name, bikeId }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("error-msg", "없는 방 코드입니다.");
      return;
    }
    room.riders.set(socket.id, {
      id: socket.id,
      name,
      bikeId,
      t: 0,
      offset: 0,
      heading: 0,
      speedKmh: 0,
      finished: false,
    });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    const payload = {
      code: roomCode,
      riders: snapshot(room),
      hostId: room.hostId,
    };
    io.to(roomCode).emit("riders", payload.riders);
    socket.emit("room", { ...payload, myId: socket.id });
  });

  socket.on("start", (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    io.to(roomCode).emit("start");
  });

  socket.on("ride", (payload) => {
    const room = rooms.get(payload.code);
    if (!room) return;
    const current = room.riders.get(socket.id);
    if (!current) return;
    room.riders.set(socket.id, { ...current, ...payload, id: socket.id });
    socket.to(payload.code).emit("riders", snapshot(room));
  });

  socket.on("leave", (roomCode) => {
    leave(socket, roomCode);
  });

  socket.on("disconnect", () => {
    leave(socket, socket.data.roomCode);
  });
});

function leave(socket, roomCode) {
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;
  room.riders.delete(socket.id);
  if (room.riders.size === 0) {
    rooms.delete(roomCode);
    return;
  }
  if (room.hostId === socket.id) {
    room.hostId = room.riders.keys().next().value;
  }
  io.to(roomCode).emit("riders", snapshot(room));
}

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.sendFile(join(dist, "index.html"));
  });
}

const port = Number(process.env.PORT) || 3001;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`hangang-ride listening on :${port}`);
});
