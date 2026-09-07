import { getState, setState } from "../state/store";

export function HomeScreen() {
  const state = getState();

  return (
    <div className="screen">
      <div className="brand">
        <small>Mobile 3D Ride</small>
        <h1>한강라이드</h1>
        <p>걸포동에서 한강 남단을 따라 여의나루역까지. 로드·픽시·따릉이.</p>
        <p>아이폰: 공유 → 홈 화면에 추가. 한 번 열어 두면 밖에서 와이파이 없이 실행됩니다.</p>
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
