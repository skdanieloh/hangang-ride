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

type PedalFeel = {
  phase: "spin" | "coast" | "stomp";
  cadence: number;
  crank: number;
  holdSpeed: number;
  coastTime: number;
  stompTime: number;
  engaged: boolean;
  cruised: boolean;
};

function tickPedalFeel(feel: PedalFeel, wantGo: boolean, speedAbs: number, maxSpeed: number, city: boolean, step: number) {
  const ratio = speedAbs / Math.max(maxSpeed, 0.01);
  const cruiseAt = city ? 0.62 : 0.7;
  const dropTo = city ? 0.9 : 0.925;
  const minCoast = city ? 1.15 : 1.7;
  const spinCadence = THREE.MathUtils.lerp(city ? 9.4 : 12.6, city ? 7.8 : 9.8, THREE.MathUtils.clamp(ratio / cruiseAt, 0, 1));
  const stompCadence = city ? 11.2 : 13.8;
  let target = 0;
  let power = 0;

  if (ratio < 0.22) feel.cruised = false;

  if (!wantGo) {
    feel.phase = "coast";
    feel.stompTime = 0;
    feel.engaged = false;
  } else if (!feel.cruised && ratio < cruiseAt) {
    feel.phase = "spin";
    feel.holdSpeed = speedAbs;
    feel.coastTime = 0;
    feel.stompTime = 0;
    feel.engaged = true;
    target = spinCadence;
    power = city ? 1.05 : 1.12;
  } else {
    feel.cruised = true;
    const fresh = !feel.engaged;
    feel.engaged = true;
    if (fresh) feel.holdSpeed = Math.max(feel.holdSpeed, speedAbs * 1.03);
    const lostSpeed = feel.coastTime > minCoast && speedAbs < feel.holdSpeed * dropTo;
    if (feel.phase === "stomp" || fresh || lostSpeed) {
      if (feel.phase !== "stomp") feel.stompTime = 0;
      feel.phase = "stomp";
      feel.coastTime = 0;
      feel.stompTime += step;
      target = stompCadence;
      power = speedAbs < feel.holdSpeed ? (city ? 0.72 : 0.64) : 0;
      const recovered = speedAbs >= feel.holdSpeed * 0.985;
      if (feel.stompTime > 0.65 && (recovered || feel.stompTime > 1.8)) {
        feel.phase = "coast";
        feel.holdSpeed = Math.max(feel.holdSpeed, speedAbs);
        feel.stompTime = 0;
        feel.coastTime = 0;
        target = 0;
        power = 0;
      }
    } else {
      feel.phase = "coast";
      feel.coastTime += step;
      if (speedAbs > feel.holdSpeed) feel.holdSpeed = speedAbs;
    }
  }

  const rising = target > feel.cadence + 0.2;
  feel.cadence = THREE.MathUtils.damp(feel.cadence, target, rising ? 16 : 4.5, step);
  if (feel.cadence < 0.18) feel.cadence = 0;
  const pulse = feel.cadence > 0.4 ? 1 + 0.16 * Math.max(0, Math.sin(feel.crank * 2)) : 1;
  feel.crank -= feel.cadence * pulse * step;
  return { power, pedaling: feel.cadence > 0.45 };
}

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
  onHud: (data: { kmh: number; t: number; finished: boolean; elapsed: number; bearing: number }) => void;
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
  const pedal = useRef<PedalFeel>({
    phase: "spin",
    cadence: 0,
    crank: 0,
    holdSpeed: 0,
    coastTime: 0,
    stompTime: 0,
    engaged: false,
    cruised: false,
  });
  const brakeHold = useRef(0);
  const feel = 1.18;

  useFrame((state, dt) => {
    const input = controls.current;
    const step = Math.min(dt, 0.04);
    const max = bike.maxKmh / 3.6;
    const accel = bike.accel / bike.massFeel;
    const city = bike.id === "ttareungyi";
    const roll = city ? 0.955 : 0.983;
    const braking = input.brake && !finishedRef.current;
    const wantGo = input.forward && !braking && !finishedRef.current;
    speedRef.current *= Math.pow(roll, step);
    brakeHold.current = THREE.MathUtils.damp(brakeHold.current, braking ? 1 : 0, braking ? 12 : 7, step);
    if (brakeHold.current > 0.02) {
      const peak = (bike.brake / bike.massFeel) * 0.26;
      const bite = 1 + Math.min(0.22, Math.abs(speedRef.current) / Math.max(max, 0.01) * 0.22);
      const decel = peak * brakeHold.current * bite;
      if (Math.abs(speedRef.current) <= decel * step) speedRef.current = 0;
      else speedRef.current -= Math.sign(speedRef.current) * decel * step;
    }
    const drive = tickPedalFeel(pedal.current, wantGo, Math.abs(speedRef.current), max, city, step);
    if (drive.power > 0 && !braking) {
      const pull = 1 - Math.min(0.72, (Math.abs(speedRef.current) / Math.max(max, 0.01)) * 0.68);
      speedRef.current += accel * pull * drive.power * step;
    }

    speedRef.current = THREE.MathUtils.clamp(speedRef.current, 0, max);
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
    motion.current.pedaling = drive.pedaling;
    motion.current.crank = pedal.current.crank;
    motion.current.crankRate = pedal.current.cadence;
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
    const bearing = ((180 - (yaw * 180) / Math.PI) % 360 + 360) % 360;
    if (performance.now() - lastHud.current > 50 || finishedRef.current) {
      lastHud.current = performance.now();
      onHud({ kmh, t, finished: finishedRef.current, elapsed, bearing });
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

function Compass({ bearing }: { bearing: number }) {
  const dir =
    bearing < 45 || bearing >= 315 ? "북" : bearing < 135 ? "동" : bearing < 225 ? "남" : "서";
  return (
    <div className="compass" role="img" aria-label={`나침반 ${dir}`}>
      <div className="compass-needle" />
      <div className="compass-rose" style={{ transform: `rotate(${-bearing}deg)` }}>
        {(
          [
            ["n", "북"],
            ["e", "동"],
            ["s", "남"],
            ["w", "서"],
          ] as const
        ).map(([slot, label]) => (
          <span key={slot} className={`compass-lab ${slot}`} style={{ transform: `rotate(${bearing}deg)` }}>
            {label}
          </span>
        ))}
      </div>
      <div className="compass-face">{dir}</div>
    </div>
  );
}

export function RideScene() {
  const controls = useControls();
  const lookLayer = useRef<HTMLDivElement>(null);
  const look = useRef<LookOrbit>({ yaw: 0, pitch: 0, active: false });
  const [hud, setHud] = useState({ kmh: 0, t: 0, finished: false, elapsed: 0, bearing: 0 });
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
          <div className="hud-place">
            <div className="chip">
              <strong>{landmark.name}</strong>
              <div>{getBike(getState().bikeId).name}</div>
            </div>
            <Compass bearing={hud.bearing} />
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
