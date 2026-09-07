import { getState, setState } from "../state/store";

export function HomeScreen() {
  const state = getState();

  return (
    <div className="screen">
      <div className="brand">
        <small>Mobile 3D Ride</small>
        <h1>한강라이드</h1>
        <p>아라뱃길에서 강서구를 지나 여의도까지. 로드·픽시·따릉이.</p>
      </div>
      <div className="field">
        <label>닉네임</label>
        <input
          value={state.playerName}
          maxLength={10}
          placeholder="이름을 입력하세요"
          onChange={(e) => setState({ playerName: e.target.value })}
        />
      </div>
      <div className="row">
        <button
          className="btn"
          disabled={!state.playerName.trim()}
          onClick={() => setState({ screen: "select", solo: true })}
        >
          혼자 타기
        </button>
        <button
          className="btn ghost"
          disabled={!state.playerName.trim()}
          onClick={() => setState({ screen: "select", solo: false })}
        >
          친구와 타기
        </button>
      </div>
    </div>
  );
}
