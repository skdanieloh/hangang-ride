import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { getBike, type BikeId } from "../data/bikes";
import { createRouteCurve, nearestLandmark } from "../data/route";
import { ROAD_Y } from "./geometry";
import { getState, setState, type RemoteRider } from "../state/store";
import { emitRide } from "../net/socket";
import { BikeModel, type BikeMotion } from "./BikeModels";
import { World } from "./World";
import { TouchControls } from "./TouchControls";
import { useControls, type ControlState } from "./useControls";

const tmp = new THREE.Vector3();
const tan = new THREE.Vector3();
const bin = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const HALF_PI = Math.PI / 2;
const LOOK_Y = 0.82;
const CAM_HEIGHT = 0.6;

type LookOrbit = { yaw: number; pitch: number; active: boolean };

function useLookOrbit(layer: MutableRefObject<HTMLDivElement | null>, look: MutableRefObject<LookOrbit>) {
  useEffect(() => {
    const root = layer.current;
    if (!root) return;
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      if (pointerId !== null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      look.current.active = true;
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic or already-released pointers */
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const span = Math.max(220, Math.min(window.innerWidth, window.innerHeight));
      look.current.yaw = THREE.MathUtils.clamp(
        look.current.yaw + ((e.clientX - lastX) / span) * Math.PI,
        -HALF_PI,
        HALF_PI,
      );
      look.current.pitch = THREE.MathUtils.clamp(
        look.current.pitch - ((e.clientY - lastY) / span) * 1.4,
        0,
        1,
      );
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      look.current.active = false;
    };

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, [layer, look]);
}

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
  pos.y += ROAD_Y;
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
  look,
  onHud,
}: {
  controls: MutableRefObject<ControlState>;
  look: MutableRefObject<LookOrbit>;
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
  const barSteerRef = useRef(0);
  const finishedRef = useRef(false);
  const start = useRef(performance.now());
  const lastEmit = useRef(0);
  const lastHud = useRef(0);
  const group = useRef<THREE.Group>(null);
  const camTarget = useRef(new THREE.Vector3());
  const motion = useRef<BikeMotion>({ speed: 0, lean: 0 });
  const feel = 1.18;

  useFrame((state, dt) => {
    const input = controls.current;
    const step = Math.min(dt, 0.04);
    const max = bike.maxKmh / 3.6;
    const accel = bike.accel / bike.massFeel;
    const coast = bike.id === "ttareungyi" ? 0.94 : 0.978;
    const pull = 1 - Math.min(0.78, (Math.abs(speedRef.current) / Math.max(max, 0.01)) * 0.74);
    if (input.forward) speedRef.current += accel * pull * step;
    else if (input.back) speedRef.current -= accel * 0.7 * step;
    else speedRef.current *= Math.pow(coast, step);

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
      drifting ? steer * 0.22 + oversteer : 0,
      drifting ? 11 : 8,
      step,
    );
    const slide = drifting
      ? steer * (1.85 + Math.abs(speedRef.current) * 0.16)
      : steer * (0.9 + Math.abs(speedRef.current) * 0.08);
    offsetRef.current = THREE.MathUtils.clamp(offsetRef.current + slide * step, -1.85, 1.85);
    if (drifting) speedRef.current *= Math.pow(0.48, step);
    leanRef.current = THREE.MathUtils.damp(
      leanRef.current,
      steer * (drifting ? 0.42 : 0.18),
      drifting ? 14 : 8,
      step,
    );

    tRef.current += (speedRef.current * feel * step) / pathLen;
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
    tmp.y += ROAD_Y;

    const yaw = Math.atan2(tan.x, tan.z) + headingRef.current;
    motion.current.speed = speedRef.current * feel;
    motion.current.lean = leanRef.current;
    motion.current.drifting = drifting;
    const wantBar = ((input.left ? 1 : 0) - (input.right ? 1 : 0)) * 0.34;
    barSteerRef.current = THREE.MathUtils.damp(barSteerRef.current, wantBar, 14, step);
    motion.current.steer = THREE.MathUtils.clamp(barSteerRef.current, -0.36, 0.36);
    motion.current.pedaling = input.forward && speedRef.current > 0.15;
    if (group.current) {
      group.current.position.copy(tmp);
      group.current.rotation.set(0, yaw, 0);
    }

    const kmhNow = Math.abs(speedRef.current) * 3.6;
    camTarget.current.copy(tmp);
    const camDist = 3.4 - Math.min(kmhNow, 65) * 0.008;
    const radius = Math.hypot(camDist, CAM_HEIGHT);
    const elev0 = Math.atan2(CAM_HEIGHT, camDist);
    const elev = THREE.MathUtils.lerp(elev0, HALF_PI, look.current.pitch);
    const az = look.current.yaw;
    const horiz = radius * Math.cos(elev);
    const lift = radius * Math.sin(elev);
    const cy = Math.cos(az);
    const sy = Math.sin(az);
    const backX = -Math.sin(yaw);
    const backZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    camDesired.set(
      tmp.x + (backX * cy + rightX * sy) * horiz,
      tmp.y + LOOK_Y + lift,
      tmp.z + (backZ * cy + rightZ * sy) * horiz,
    );
    const follow = look.current.active ? 1 - Math.pow(1e-10, dt) : 1 - Math.pow(0.00005, dt);
    state.camera.position.lerp(camDesired, follow);
    state.camera.lookAt(tmp.x, tmp.y + LOOK_Y, tmp.z);
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
    <>
      <group ref={group}>
        <BikeModel bikeId={bike.id} motion={motion} />
      </group>
      <DriftMarks source={group} motion={motion} />
    </>
  );
}

const driftDummy = new THREE.Object3D();

function DriftMarks({
  source,
  motion,
}: {
  source: MutableRefObject<THREE.Group | null>;
  motion: MutableRefObject<BikeMotion>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const marks = useRef<{ x: number; y: number; z: number; yaw: number; len: number; life: number }[]>([]);
  const lastL = useRef<THREE.Vector3 | null>(null);
  const lastR = useRef<THREE.Vector3 | null>(null);
  const max = 360;

  useFrame((_, dt) => {
    const g = source.current;
    const inst = mesh.current;
    if (!g || !inst) return;
    if (motion.current.drifting) {
      const yaw = g.rotation.y;
      const fwdX = Math.sin(yaw);
      const fwdZ = Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const rearX = g.position.x - fwdX * 0.5;
      const rearZ = g.position.z - fwdZ * 0.5;
      const y = g.position.y + 0.042;
      const tracks: [typeof lastL, number][] = [
        [lastL, -0.09],
        [lastR, 0.09],
      ];
      for (const [last, side] of tracks) {
        const x = rearX + rightX * side;
        const z = rearZ + rightZ * side;
        if (!last.current) {
          last.current = new THREE.Vector3(x, y, z);
          continue;
        }
        const dx = x - last.current.x;
        const dz = z - last.current.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.1) continue;
        marks.current.push({
          x: (x + last.current.x) * 0.5,
          y,
          z: (z + last.current.z) * 0.5,
          yaw: Math.atan2(dx, dz),
          len: Math.min(len, 1.15),
          life: 1,
        });
        last.current.set(x, y, z);
      }
      if (marks.current.length > max) marks.current.splice(0, marks.current.length - max);
    } else {
      lastL.current = null;
      lastR.current = null;
    }
    for (const mark of marks.current) mark.life -= dt * 0.08;
    marks.current = marks.current.filter((mark) => mark.life > 0.05);
    for (let i = 0; i < max; i++) {
      const mark = marks.current[i];
      if (!mark) {
        driftDummy.position.set(0, -20, 0);
        driftDummy.scale.set(0, 0, 0);
      } else {
        driftDummy.position.set(mark.x, mark.y, mark.z);
        driftDummy.rotation.set(0, mark.yaw, 0);
        driftDummy.scale.set(mark.life, 1, mark.len);
      }
      driftDummy.updateMatrix();
      inst.setMatrixAt(i, driftDummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, max]} frustumCulled={false}>
      <boxGeometry args={[0.055, 0.008, 1]} />
      <meshBasicMaterial color="#1a120c" transparent opacity={0.7} depthWrite={false} />
    </instancedMesh>
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
  const lookLayer = useRef<HTMLDivElement>(null);
  const look = useRef<LookOrbit>({ yaw: 0, pitch: 0, active: false });
  const [hud, setHud] = useState({ kmh: 0, t: 0, finished: false, elapsed: 0 });
  const [riders, setRiders] = useState<RemoteRider[]>(getState().riders);
  const landmark = nearestLandmark(hud.t);
  useLookOrbit(lookLayer, look);

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
        <LocalBike controls={controls} look={look} onHud={setHud} />
        <Remotes riders={riders} />
      </Canvas>
      <div className="look-drag" ref={lookLayer} />
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
            <h2>여의나루역 도착</h2>
            <p>걸포동에서 여의나루까지 {hud.elapsed.toFixed(1)}초</p>
            <button className="btn" onClick={() => setState({ screen: "home", roomCode: "", riders: [] })}>
              처음으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
