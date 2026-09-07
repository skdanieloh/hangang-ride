import { useState } from "react";
import { getBike } from "../data/bikes";
import { createRoom, joinRoom, leaveRoom, startRoom } from "../net/socket";
import { getState, setState } from "../state/store";

export function LobbyScreen() {
  const state = getState();
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="screen">
      <div className="brand">
        <small>Multiplayer</small>
        <h1>친구와 라이딩</h1>
        <p>방을 만들거나 코드를 입력해 같은 코스에서 함께 탑니다.</p>
      </div>

      {!state.roomCode && (
        <>
          <button className="btn" onClick={createRoom}>
            방 만들기
          </button>
          <div className="field">
            <label>참가 코드</label>
            <input
              value={joinCode}
              maxLength={4}
              placeholder="예: 7K2A"
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
          </div>
          <button className="btn ghost" disabled={joinCode.length < 4} onClick={() => joinRoom(joinCode)}>
            코드로 참가
          </button>
        </>
      )}

      {state.roomCode && (
        <>
          <div className="lobby-code">{state.roomCode}</div>
          <div className="riders">
            {state.riders.map((rider) => (
              <div className="rider-row" key={rider.id}>
                <strong>{rider.name}</strong>
                <span>
                  {getBike(rider.bikeId).name} · {getBike(rider.bikeId).maxKmh}km/h
                </span>
              </div>
            ))}
          </div>
          {state.isHost ? (
            <button className="btn" onClick={startRoom}>
              함께 출발
            </button>
          ) : (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>호스트가 출발할 때까지 기다려 주세요.</p>
          )}
        </>
      )}

      <button
        className="btn ghost"
        onClick={() => {
          leaveRoom();
          setState({ screen: "select" });
        }}
      >
        뒤로
      </button>
    </div>
  );
}
