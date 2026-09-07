import { BIKES } from "../data/bikes";
import { getState, setState } from "../state/store";

export function SelectScreen() {
  const state = getState();

  return (
    <div className="screen">
      <div className="brand">
        <small>Bike Select</small>
        <h1>자전거 선택</h1>
        <p>로드·픽시는 최고 65km/h, 따릉이는 36km/h.</p>
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
              <div className="bike-fallback" style={{ background: "#1c2428", color: "#7dffb2" }}>
                Black Fixie
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
