import { BIKES } from "../data/bikes";
import { getState, setState } from "../state/store";

export function SelectScreen() {
  const state = getState();

  return (
    <div className="screen">
      <div className="brand">
        <small>Bike Select</small>
        <h1>자전거 선택</h1>
        <p>걸포동에서 한강 남단을 따라 여의나루역까지. 로드·픽시·따릉이.</p>
      </div>
      <div className="bike-list">
        {BIKES.map((bike) => (
          <button
            key={bike.id}
            className={`bike-card ${state.bikeId === bike.id ? "active" : ""}`}
            onClick={() => setState({ bikeId: bike.id })}
          >
            {bike.photo ? (
              <img src={bike.photo} alt={bike.name} />
            ) : (
              <div className="bike-fallback" style={{ background: "#c2c6ca", color: "#111" }}>
                Constantine Urbane
              </div>
            )}
            <div>
              <h3>{bike.name}</h3>
              <p>{bike.blurb}</p>
              <span className="tag">
                {bike.kind} · 최고 {bike.maxKmh}km/h
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn ghost" onClick={() => setState({ screen: "home" })}>
          뒤로
        </button>
        <button
          className="btn"
          onClick={() => setState({ screen: state.solo ? "ride" : "lobby" })}
        >
          {state.solo ? "출발" : "멀티플레이"}
        </button>
      </div>
    </div>
  );
}
