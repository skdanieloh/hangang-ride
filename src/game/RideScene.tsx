import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { getBike, type BikeId } from "../data/bikes";
import { createRouteCurve, nearestLandmark } from "../data/route";
import { getState, setState, type RemoteRider } from "../state/store";
import { emitRide } from "../net/socket";
import { BikeModel, type BikeMotion } from "./BikeModels";
import { World } from "./World";
import { TouchControls } from "./TouchControls";
import { useControls, type ControlState } from "./useControls";

const tmp = new THREE.Vector3();
const tan = new THREE.Vector3();
const bin = new THREE.Vector3();

function Rider({
  bikeId,
  t,
  offset,
  heading,
  name,
}: {
  bikeId: BikeId;
  t: number;
  offset: number;
  heading: number;
  lean: number;
  name?: string;
}) {
  const curve = useMemo(() => createRouteCurve(), []);
  const pos = curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1));
  tan.copy(curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1)));
  bin.set(-tan.z, 0, tan.x).normalize();
  pos.addScaledVector(bin, offset);
  const yaw = Math.atan2(tan.x, tan.z) + heading;

  return (
    <group position={[pos.x, pos.y, pos.z]} rotation={[0, yaw, 0]}>
      <BikeModel bikeId={bikeId} />
      {name && (
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#7dffb2" />
        </mesh>
      )}
    </group>
  );
}

function LocalBike({
  controls,
  onHud,
}: {
  controls: MutableRefObject<ControlState>;
  onHud: (data: { kmh: number; t: number; finished: boolean; elapsed: number }) => void;
}) {
  const bike = getBike(getState().bikeId);
  const curve = useMemo(() => createRouteCurve(), []);
  const pathLen = useMemo(() => curve.getLength(), [curve]);
  const tRef = useRef(0.004);
  const offsetRef = useRef(0);
  const headingRef = useRef(0);
  const speedRef = useRef(0);
  const leanRef = useRef(0);
  const finishedRef = useRef(false);
  const start = useRef(performance.now());
  const lastEmit = useRef(0);
  const lastHud = useRef(0);
  const group = useRef<THREE.Group>(null);
  const camTarget = useRef(new THREE.Vector3());
  const motion = useRef<BikeMotion>({ speed: 0, lean: 0 });
  const feel = 1.55;

  useFrame((state, dt) => {
    const input = controls.current;
    const max = bike.maxKmh / 3.6;
    const accel = (bike.accel / bike.massFeel) * 1.35;
    if (input.forward) speedRef.current += accel * dt;
    else if (input.back) speedRef.current -= accel * 0.7 * dt;
    else speedRef.current *= Math.pow(0.18, dt);

    speedRef.current = THREE.MathUtils.clamp(speedRef.current, -max * 0.28, max);
    const steer = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * bike.turn;
    const kmhAbs = Math.abs(speedRef.current) * 3.6;
    const drifting =
      bike.id === "fixie" &&
      input.drift &&
      kmhAbs > 14 &&
      (input.left || input.right);
    const oversteer = drifting ? steer * 0.7 : 0;
    headingRef.current = THREE.MathUtils.damp(
      headingRef.current,
      steer * 0.22 + oversteer,
      drifting ? 11 : 6,
      dt,
    );
    const slide = drifting
      ? steer * (1.85 + Math.abs(speedRef.current) * 0.16)
      : steer * (0.9 + Math.abs(speedRef.current) * 0.08);
    offsetRef.current = THREE.MathUtils.clamp(offsetRef.current + slide * dt, -1.85, 1.85);
    if (drifting) speedRef.current *= Math.pow(0.48, dt);
    leanRef.current = THREE.MathUtils.damp(
      leanRef.current,
      -steer * (drifting ? 0.42 : 0.18),
      drifting ? 14 : 8,
      dt,
    );

    tRef.current += (speedRef.current * feel * dt) / pathLen;
    if (tRef.current < 0.002) {
      tRef.current = 0.002;
      if (speedRef.current < 0) speedRef.current = 0;
    }
    if (tRef.current >= 0.995 && !finishedRef.current) {
      finishedRef.current = true;
      tRef.current = 0.995;
      speedRef.current = 0;
    }
    if (finishedRef.current) tRef.current = 0.995;

    const t = tRef.current;
    curve.getPointAt(t, tmp);
    curve.getTangentAt(t, tan);
    bin.set(-tan.z, 0, tan.x).normalize();
    tmp.addScaledVector(bin, offsetRef.current);

    const yaw = Math.atan2(tan.x, tan.z) + headingRef.current;
    motion.current.speed = speedRef.current * feel;
    motion.current.lean = leanRef.current;
    if (group.current) {
      group.current.position.copy(tmp);
      group.current.rotation.set(0, yaw, 0);
    }

    const kmhNow = Math.abs(speedRef.current) * 3.6;
    camTarget.current.copy(tmp);
    const back = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const camDist = 3.4 - Math.min(kmhNow, 65) * 0.008;
    const desired = tmp.clone().add(back.multiplyScalar(camDist)).add(new THREE.Vector3(0, 1.42, 0));
    state.camera.position.lerp(desired, 1 - Math.pow(0.00005, dt));
    state.camera.lookAt(tmp.x, tmp.y + 0.82, tmp.z);
    const cam = state.camera as THREE.PerspectiveCamera;
    cam.fov = THREE.MathUtils.damp(cam.fov, 58 + kmhNow * 0.18, 4, dt);
    cam.updateProjectionMatrix();

    const kmh = kmhNow;
    const elapsed = (performance.now() - start.current) / 1000;
    if (performance.now() - lastHud.current > 100 || finishedRef.current) {
      lastHud.current = performance.now();
      onHud({ kmh, t, finished: finishedRef.current, elapsed });
    }

    if (performance.now() - lastEmit.current > 80) {
      lastEmit.current = performance.now();
      emitRide({
        t,
        offset: offsetRef.current,
        heading: headingRef.current,
        speedKmh: kmh,
        finished: finishedRef.current,
      });
    }
  });

  return (
    <group ref={group}>
      <BikeModel bikeId={bike.id} motion={motion} />
    </group>
  );
}

function Remotes({ riders }: { riders: RemoteRider[] }) {
  const me = getState().myId;
  return (
    <>
      {riders
        .filter((r) => r.id !== me)
        .map((r) => (
          <Rider
            key={r.id}
            bikeId={r.bikeId}
            t={r.t}
            offset={r.offset}
            heading={r.heading}
            lean={0}
            name={r.name}
          />
        ))}
    </>
  );
}

export function RideScene() {
  const controls = useControls();
  const [hud, setHud] = useState({ kmh: 0, t: 0, finished: false, elapsed: 0 });
  const [riders, setRiders] = useState<RemoteRider[]>(getState().riders);
  const landmark = nearestLandmark(hud.t);

  useEffect(() => {
    const id = window.setInterval(() => setRiders([...getState().riders]), 100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="hidden-canvas">
      <Canvas camera={{ position: [0, 1.7, 4.2], fov: 58 }} dpr={[1, 1.6]} shadows>
        <color attach="background" args={["#8ec4e0"]} />
        <fog attach="fog" args={["#b3d4e4", 55, 220]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#cfe8ff", "#6b8a4a", 0.45]} />
        <directionalLight position={[40, 50, 18]} intensity={1.35} castShadow />
        <Sky sunPosition={[60, 28, 16]} turbidity={3.2} rayleigh={0.7} />
        <World />
        <LocalBike controls={controls} onHud={setHud} />
        <Remotes riders={riders} />
      </Canvas>
      <div className="hud">
        <div className="hud-top">
          <div className="chip">
            <strong>{landmark.name}</strong>
            <div>{getBike(getState().bikeId).name}</div>
          </div>
          <div className="chip">
            <div className="speed">
              {hud.kmh.toFixed(0)}
              <span>km/h</span>
            </div>
            최고 {getBike(getState().bikeId).maxKmh}km/h
            <div className="progress">
              <i style={{ width: `${Math.round(hud.t * 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="hud-bottom">
          <TouchControls controls={controls} canDrift={getState().bikeId === "fixie"} />
        </div>
      </div>
      {hud.finished && (
        <div className="finish">
          <div className="finish-card">
            <h2>여의도 종점 도착</h2>
            <p>고촌에서 여의도까지 {hud.elapsed.toFixed(1)}초</p>
            <button className="btn" onClick={() => setState({ screen: "home", roomCode: "", riders: [] })}>
              처음으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
