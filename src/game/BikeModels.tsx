import { useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BikeId } from "../data/bikes";
import { chainTexture } from "./textures";

export type BikeMotion = {
  speed: number;
  lean: number;
  drifting?: boolean;
  steer?: number;
  pedaling?: boolean;
  crank?: number;
  crankRate?: number;
};

type XYZ = [number, number, number];

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const CRANK_L = 0.085;
const BB: Record<BikeId, XYZ> = {
  scr: [0.08, 0.29, 0],
  fixie: [0.08, 0.29, 0],
  ttareungyi: [0.08, 0.29, 0],
};

function placeLive(mesh: THREE.Object3D | null, from: XYZ, to: XYZ) {
  if (!mesh) return;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz) || 0.001;
  mesh.position.set((from[0] + to[0]) * 0.5, (from[1] + to[1]) * 0.5, (from[2] + to[2]) * 0.5);
  _dir.set(dx / len, dy / len, dz / len);
  mesh.quaternion.setFromUnitVectors(_up, _dir);
  mesh.scale.set(1, len, 1);
}

function Wheel({
  position,
  radius = 0.335,
  tire = 0.013,
  rim = "#2a2a2a",
  spokes = 18,
  deep = false,
  brand,
  motion,
  steered,
}: {
  position: [number, number, number];
  radius?: number;
  tire?: number;
  rim?: string;
  spokes?: number;
  deep?: boolean;
  brand?: string;
  motion?: MutableRefObject<BikeMotion>;
  steered?: boolean;
}) {
  const rotor = useRef<THREE.Group>(null);
  const yaw = useRef<THREE.Group>(null);
  const spokeGeo = useMemo(() => new THREE.CylinderGeometry(0.002, 0.002, radius * 1.82, 3), [radius]);
  useFrame((_, dt) => {
    const speed = motion?.current.speed ?? 0;
    if (rotor.current) rotor.current.rotation.z -= (speed / radius) * dt;
    if (yaw.current) yaw.current.rotation.y = steered ? (motion?.current.steer ?? 0) : 0;
  });
  return (
    <group ref={yaw} position={position}>
      <group ref={rotor} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <torusGeometry args={[radius, tire, 10, 40]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        <mesh>
          <torusGeometry args={[radius - tire - 0.005, deep ? 0.014 : 0.0055, 8, 36]} />
          <meshStandardMaterial color={rim} metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.016, 0.016, 0.03, 10]} />
          <meshStandardMaterial color="#c5c8cb" metalness={0.75} roughness={0.22} />
        </mesh>
        {Array.from({ length: spokes }).map((_, i) => (
          <mesh key={i} geometry={spokeGeo} rotation={[0, 0, (i / spokes) * Math.PI]}>
            <meshStandardMaterial color="#d4d6d8" metalness={0.85} roughness={0.18} />
          </mesh>
        ))}
        {brand &&
          [0, 1, 2, 3].map((i) => {
            const a = (i * Math.PI) / 2;
            return (
              <group key={brand + i}>
                <Decal
                  text={brand}
                  width={0.2}
                  height={0.028}
                  position={[Math.cos(a) * (radius - 0.038), Math.sin(a) * (radius - 0.038), 0.016]}
                  rotation={[Math.PI / 2, 0, a + Math.PI / 2]}
                  color="#f4f4f4"
                />
                <Decal
                  text={brand}
                  width={0.2}
                  height={0.028}
                  position={[Math.cos(a) * (radius - 0.038), Math.sin(a) * (radius - 0.038), -0.016]}
                  rotation={[Math.PI / 2, Math.PI, a + Math.PI / 2]}
                  color="#f4f4f4"
                />
              </group>
            );
          })}
      </group>
    </group>
  );
}

function Decal({
  text,
  position,
  rotation = [0, 0, 0],
  width,
  height,
  color = "#111111",
  weight = "bold 64px sans-serif",
}: {
  text: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  color?: string;
  weight?: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = weight;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [text, color, weight]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/** 위는 안장까지 직각, 뒤는 뒷바퀴를 향하는 곡률만. */
function AeroSeatTube({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const wx = -0.5;
    const wy = 0.33;
    const r = 0.352;
    const shape = new THREE.Shape();
    shape.moveTo(0.05, 0.27);
    shape.lineTo(-0.04, 0.828);
    shape.lineTo(-0.205, 0.828);
    shape.lineTo(-0.205, 0.79);
    const aTop = 1.2;
    const aBot = 0.16;
    for (let i = 0; i <= 16; i++) {
      const a = aTop - (i / 16) * (aTop - aBot);
      shape.lineTo(wx + r * Math.cos(a), wy + r * Math.sin(a));
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.034, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -0.017);
    geo.computeVertexNormals();
    return geo;
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} metalness={0.42} roughness={0.28} />
    </mesh>
  );
}

function Bar({
  from,
  to,
  r = 0.02,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r?: number;
  color: string;
}) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: mid.toArray() as [number, number, number], quat, len: dir.length() };
  }, [from, to]);

  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial color={color} metalness={0.38} roughness={0.3} />
    </mesh>
  );
}

function Limb({
  from,
  to,
  r,
  color,
}: {
  from: XYZ;
  to: XYZ;
  r: number;
  color: string;
}) {
  const { pos, quat, cyl } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: mid.toArray() as XYZ, quat, cyl: Math.max(0.02, len - r * 0.9) };
  }, [from, to, r]);
  return (
    <mesh position={pos} quaternion={quat}>
      <capsuleGeometry args={[r, cyl, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

function twoBone(origin: XYZ, target: XYZ, l1: number, l2: number, prefer: XYZ): XYZ {
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const dz = target[2] - origin[2];
  const dist = Math.hypot(dx, dy, dz) || 0.001;
  const maxd = l1 + l2 - 0.012;
  const mind = Math.abs(l1 - l2) + 0.012;
  const d = Math.min(maxd, Math.max(mind, dist));
  const ux = dx / dist;
  const uy = dy / dist;
  const uz = dz / dist;
  const k = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - k * k));
  let px = prefer[0];
  let py = prefer[1];
  let pz = prefer[2];
  const dot = px * ux + py * uy + pz * uz;
  px -= dot * ux;
  py -= dot * uy;
  pz -= dot * uz;
  const pl = Math.hypot(px, py, pz) || 1;
  px /= pl;
  py /= pl;
  pz /= pl;
  return [origin[0] + ux * k + px * h, origin[1] + uy * k + py * h, origin[2] + uz * k + pz * h];
}

function along(origin: XYZ, angle: number, length: number): XYZ {
  return [origin[0] + Math.sin(angle) * length, origin[1] + Math.cos(angle) * length, origin[2]];
}

function useSteer(motion?: MutableRefObject<BikeMotion>) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = motion?.current.steer ?? 0;
  });
  return ref;
}

function TrackBars() {
  const tape = "#2b2b2b";
  return (
    <group>
      <Bar from={[0, 0, -0.19]} to={[0, 0, 0.19]} r={0.011} color={tape} />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Bar from={[0, 0, 0.19 * side]} to={[0.04, -0.11, 0.19 * side]} r={0.011} color={tape} />
          <Bar from={[0.04, -0.11, 0.19 * side]} to={[-0.07, -0.18, 0.19 * side]} r={0.011} color={tape} />
        </group>
      ))}
    </group>
  );
}

function DropBars() {
  return (
    <group>
      <Bar from={[0, 0, -0.19]} to={[0, 0, 0.19]} r={0.01} color="#1a1a1a" />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Bar from={[0, 0, 0.19 * side]} to={[0.03, -0.1, 0.19 * side]} r={0.01} color="#1a1a1a" />
          <Bar from={[0.03, -0.1, 0.19 * side]} to={[-0.06, -0.16, 0.19 * side]} r={0.01} color="#1a1a1a" />
          <mesh position={[0.05, 0.008, 0.19 * side]} rotation={[0, 0, -0.48]}>
            <capsuleGeometry args={[0.012, 0.038, 4, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0.052, -0.032, 0.19 * side]}>
            <boxGeometry args={[0.01, 0.034, 0.012]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CityBars() {
  return (
    <group>
      <Bar from={[0, 0, 0]} to={[-0.1, 0.05, 0.2]} r={0.01} color="#cfd3d6" />
      <Bar from={[0, 0, 0]} to={[-0.1, 0.05, -0.2]} r={0.01} color="#cfd3d6" />
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[-0.14, 0.05, 0.2 * side]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.09, 8]} />
          <meshStandardMaterial color="#151515" />
        </mesh>
      ))}
    </group>
  );
}

function FrontEnd({
  motion,
  color,
  pivot,
  axle,
  bars,
  stem = "#1b1b1b",
  tire,
  deep,
  rim,
  spokes,
  brand,
  brake,
  children,
}: {
  motion?: MutableRefObject<BikeMotion>;
  color: string;
  pivot: XYZ;
  axle: XYZ;
  bars: "drop" | "track" | "city";
  stem?: string;
  tire?: number;
  deep?: boolean;
  rim?: string;
  spokes?: number;
  brand?: string;
  brake?: boolean;
  children?: ReactNode;
}) {
  const steer = useSteer(motion);
  const wx = axle[0] - pivot[0];
  const wy = axle[1] - pivot[1];
  const barLift: XYZ = bars === "city" ? [-0.02, 0.12, 0] : [0.055, 0.09, 0];
  return (
    <group>
      <Bar
        from={[pivot[0] - 0.025, pivot[1] - 0.14, 0]}
        to={[pivot[0] + 0.008, pivot[1] + 0.07, 0]}
        r={0.018}
        color={color}
      />
      <mesh position={[pivot[0] - 0.008, pivot[1] - 0.04, 0]} rotation={[0, 0, -0.28]}>
        <cylinderGeometry args={[0.02, 0.02, 0.07, 10]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.32} />
      </mesh>
      <group ref={steer} position={pivot}>
        <Bar from={[0, 0.01, 0]} to={barLift} r={0.013} color={stem} />
        <mesh position={[barLift[0] * 0.45, barLift[1] * 0.45, 0]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.014, 0.014, 0.036, 8]} />
          <meshStandardMaterial color={stem} metalness={0.45} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.055, 0]}>
          <cylinderGeometry args={[0.016, 0.018, 0.022, 10]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.3} />
        </mesh>
        <group position={barLift}>{bars === "drop" ? <DropBars /> : bars === "track" ? <TrackBars /> : <CityBars />}</group>
        {([-0.036, 0.036] as const).map((z) => (
          <group key={z}>
            <Bar from={[0.012, -0.02, z]} to={[wx, wy, z]} r={0.012} color={color} />
            <Dropout position={[wx, wy, z]} />
          </group>
        ))}
        <Wheel
          position={[wx, wy, 0]}
          tire={tire}
          deep={deep}
          rim={rim}
          spokes={spokes}
          brand={brand}
          motion={motion}
        />
        {brake && <CaliperBrake position={[wx * 0.55, wy * 0.42, 0]} />}
        {children}
      </group>
    </group>
  );
}

function Dropout({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <capsuleGeometry args={[0.018, 0.03, 4, 8]} />
      <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.35} />
    </mesh>
  );
}

function ChainLoop({
  points,
  radius = 0.0048,
  motion,
  color = "#d4d6d8",
}: {
  points: [number, number, number][];
  radius?: number;
  motion?: MutableRefObject<BikeMotion>;
  color?: string;
}) {
  const tex = useMemo(() => chainTexture(), []);
  const key = points.flat().join(",");
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      true,
      "catmullrom",
      0.42,
    );
    return new THREE.TubeGeometry(curve, 72, radius, 6, true);
  }, [key, radius]);
  useFrame((_, dt) => {
    if (!motion) return;
    tex.offset.x -= (motion.current.crankRate ?? 0) * 0.055 * dt;
  });
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={tex} color={color} metalness={0.7} roughness={0.32} />
    </mesh>
  );
}

function RearDerailleur({ axle }: { axle: [number, number, number] }) {
  return (
    <group position={[axle[0] - 0.018, axle[1] - 0.075, axle[2] + 0.01]}>
      <mesh position={[0.012, 0.038, 0]} rotation={[0, 0, 0.45]}>
        <boxGeometry args={[0.028, 0.048, 0.01]} />
        <meshStandardMaterial color="#1b1b1b" metalness={0.55} />
      </mesh>
      <mesh position={[-0.008, -0.006, 0.008]} rotation={[0.12, 0, 0.52]}>
        <boxGeometry args={[0.04, 0.052, 0.018]} />
        <meshStandardMaterial color="#2c3036" metalness={0.72} roughness={0.28} />
      </mesh>
      <group position={[-0.028, -0.052, 0.01]} rotation={[0, 0, 0.38]}>
        {[-0.007, 0.007].map((z) => (
          <mesh key={z} position={[0, 0.016, z]}>
            <boxGeometry args={[0.013, 0.072, 0.0035]} />
            <meshStandardMaterial color="#151515" metalness={0.45} />
          </mesh>
        ))}
        <mesh position={[0, 0.036, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.011, 0.0028, 6, 12]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.75} />
        </mesh>
        <mesh position={[0, -0.016, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.011, 0.0028, 6, 12]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.75} />
        </mesh>
      </group>
    </group>
  );
}

function FrontDerailleur({ clamp }: { clamp: [number, number, number] }) {
  return (
    <group position={clamp}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.017, 0.017, 0.016, 10]} />
        <meshStandardMaterial color="#1f1f1f" metalness={0.5} />
      </mesh>
      <mesh position={[0.038, -0.028, 0.01]} rotation={[0, 0, -0.28]}>
        <boxGeometry args={[0.048, 0.03, 0.016]} />
        <meshStandardMaterial color="#2c3036" metalness={0.7} roughness={0.28} />
      </mesh>
      {[-0.01, 0.02].map((z) => (
        <mesh key={z} position={[0.052, -0.068, z]} rotation={[0, 0, -0.12]}>
          <boxGeometry args={[0.038, 0.05, 0.0038]} />
          <meshStandardMaterial color="#151515" />
        </mesh>
      ))}
    </group>
  );
}

function CaliperBrake({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[0, 0.08, 0]}>
        <torusGeometry args={[0.072, 0.006, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#1c1c1c" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.145, 0]}>
        <boxGeometry args={[0.03, 0.02, 0.016]} />
        <meshStandardMaterial color="#222" metalness={0.5} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[0.012, 0.055, 0.032 * side]}>
          <boxGeometry args={[0.028, 0.028, 0.01]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
}

function Drivetrain({
  motion,
  rearX = -0.54,
  city = false,
}: {
  motion?: MutableRefObject<BikeMotion>;
  rearX?: number;
  city?: boolean;
}) {
  const cranks = useRef<THREE.Group>(null);
  const cassette = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = motion?.current.crank ?? 0;
    if (cranks.current) cranks.current.rotation.z = a;
    if (cassette.current) cassette.current.rotation.z = a * 1.4;
  });
  const z = 0.055;
  const chainPts: [number, number, number][] = [
    [0.08, 0.365, z],
    [-0.18, 0.375, z],
    [rearX, 0.368, z],
    [rearX - 0.006, 0.3, z],
    [rearX, 0.292, z],
    [-0.18, 0.22, z],
    [0.08, 0.215, z],
    [0.1, 0.29, z],
  ];
  return (
    <group>
      <group ref={cassette} position={[rearX, 0.33, 0.02]}>
        {Array.from({ length: city ? 6 : 8 }).map((_, i) => (
          <mesh key={i} position={[0, 0, i * 0.0046]}>
            <torusGeometry args={[0.026 + i * 0.0042, 0.0028, 6, 16]} />
            <meshStandardMaterial color="#c9ccd0" metalness={0.75} roughness={0.25} />
          </mesh>
        ))}
      </group>
      <group ref={cranks} position={[0.08, 0.29, 0]}>
        <mesh position={[0, 0, 0.055]}>
          <torusGeometry args={[0.075, 0.006, 8, 22]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} />
        </mesh>
        {!city && (
          <mesh position={[0, 0, 0.063]}>
            <torusGeometry args={[0.055, 0.005, 8, 18]} />
            <meshStandardMaterial color="#1f1f1f" metalness={0.5} />
          </mesh>
        )}
        <mesh position={[0, 0, 0.048]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.04, 10]} />
          <meshStandardMaterial color="#c5c8cb" metalness={0.7} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <group key={side} rotation={[0, 0, side > 0 ? 0 : Math.PI]}>
            <mesh position={[CRANK_L * 0.5, 0, 0.07 * side]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.016, CRANK_L, 0.01]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.45} />
            </mesh>
            <mesh position={[CRANK_L, 0, 0.085 * side]} rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.07, 0.055, 0.014]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        ))}
      </group>
      <ChainLoop points={chainPts} motion={motion} />
      <RearDerailleur axle={[rearX, 0.33, 0.055]} />
      <FrontDerailleur clamp={city ? [-0.12, 0.46, 0.05] : [-0.1, 0.5, 0.05]} />
    </group>
  );
}

function FixieDrive({ motion }: { motion?: MutableRefObject<BikeMotion> }) {
  const ring = useRef<THREE.Group>(null);
  const cog = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = motion?.current.crank ?? 0;
    if (ring.current) ring.current.rotation.z = a;
    if (cog.current) cog.current.rotation.z = a * 1.35;
  });
  return (
    <group>
      <group ref={cog} position={[-0.5, 0.33, 0.048]}>
        <mesh>
          <torusGeometry args={[0.042, 0.006, 8, 18]} />
          <meshStandardMaterial color="#cfd3d6" metalness={0.7} />
        </mesh>
      </group>
      <group ref={ring} position={[0.08, 0.29, 0]}>
        <mesh position={[0, 0, 0.05]}>
          <torusGeometry args={[0.082, 0.007, 8, 24]} />
          <meshStandardMaterial color="#151515" metalness={0.55} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <group key={side} rotation={[0, 0, side > 0 ? 0 : Math.PI]}>
            <mesh position={[CRANK_L * 0.5, 0, 0.065 * side]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.016, CRANK_L, 0.01]} />
              <meshStandardMaterial color="#111" metalness={0.4} />
            </mesh>
            <mesh position={[CRANK_L, 0, 0.08 * side]} rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.07, 0.05, 0.014]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        ))}
      </group>
      <ChainLoop
        points={[
          [0.08, 0.35, 0.05],
          [-0.2, 0.38, 0.05],
          [-0.5, 0.36, 0.05],
          [-0.5, 0.3, 0.05],
          [-0.15, 0.23, 0.05],
          [0.08, 0.23, 0.05],
        ]}
        motion={motion}
        color="#cfd3d6"
      />
    </group>
  );
}

function FixieBike({ motion }: { motion?: MutableRefObject<BikeMotion> }) {
  const silver = "#c2c6ca";
  const dtAngle = Math.atan2(0.34 - 0.79, 0.08 - 0.36);
  return (
    <group>
      <Wheel position={[-0.5, 0.33, 0]} tire={0.013} deep rim="#0d0d0d" spokes={20} brand="VELOCIDAD" motion={motion} />
      <Bar from={[-0.18, 0.81, 0]} to={[0.36, 0.79, 0]} color={silver} r={0.015} />
      <Bar from={[0.36, 0.79, 0]} to={[0.08, 0.34, 0]} color={silver} r={0.017} />
      <AeroSeatTube color={silver} />
      {([-0.038, 0.038] as const).map((z) => (
        <group key={z}>
          <Bar from={[-0.18, 0.81, z]} to={[-0.5, 0.33, z]} color={silver} r={0.014} />
          <Bar from={[0.06, 0.28, z]} to={[-0.54, 0.33, z]} color={silver} r={0.013} />
          <mesh position={[-0.52, 0.33, z]}>
            <capsuleGeometry args={[0.02, 0.036, 4, 8]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} />
          </mesh>
        </group>
      ))}
      <Bar from={[-0.18, 0.81, 0]} to={[-0.18, 0.88, 0]} color={silver} r={0.014} />
      <Bar from={[-0.18, 0.88, 0]} to={[-0.18, 0.97, 0]} color="#1a1a1a" r={0.013} />
      <mesh position={[-0.18, 0.99, 0]}>
        <boxGeometry args={[0.15, 0.024, 0.055]} />
        <meshStandardMaterial color="#151515" />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Decal
            text="CONSTANTINE"
            width={0.42}
            height={0.055}
            position={[0.2, 0.54, 0.032 * side]}
            rotation={[0, side > 0 ? 0 : Math.PI, dtAngle]}
            color="#111"
            weight="bold 70px sans-serif"
          />
          <Decal
            text="urbane"
            width={0.16}
            height={0.03}
            position={[0.16, 0.815, 0.026 * side]}
            rotation={[0, side > 0 ? 0 : Math.PI, 0]}
            color="#111"
            weight="600 48px sans-serif"
          />
          <Decal
            text="CONSTANTINE"
            width={0.18}
            height={0.028}
            position={[-0.28, 0.32, 0.05 * side]}
            rotation={[0, side > 0 ? 0 : Math.PI, 0.05]}
            color="#111"
            weight="bold 52px sans-serif"
          />
          <Decal
            text="urbane"
            width={0.12}
            height={0.024}
            position={[0.46, 0.52, 0.02 * side]}
            rotation={[0, side > 0 ? 0 : Math.PI, -1.05]}
            color="#111"
            weight="600 44px sans-serif"
          />
          <Decal
            text="VELOCIDAD"
            width={0.09}
            height={0.02}
            position={[-0.18, 0.99, 0.03 * side]}
            rotation={[0, side > 0 ? 0 : Math.PI, 0]}
            color="#f3f3f3"
            weight="bold 48px sans-serif"
          />
        </group>
      ))}
      {[0.02, 0.08, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.8, 0]}>
          <boxGeometry args={[0.05, 0.028, 0.052]} />
          <meshStandardMaterial color="#4a4e52" />
        </mesh>
      ))}
      <FrontEnd
        motion={motion}
        color={silver}
        pivot={[0.37, 0.86, 0]}
        axle={[0.52, 0.33, 0]}
        bars="track"
        tire={0.013}
        deep
        rim="#0d0d0d"
        spokes={16}
        brand="VELOCIDAD"
      />
      <FixieDrive motion={motion} />
    </group>
  );
}

function RoadBike({
  color,
  aero = false,
  motion,
}: {
  color: string;
  aero?: boolean;
  motion?: MutableRefObject<BikeMotion>;
}) {
  const tire = aero ? 0.011 : 0.012;
  const topY = aero ? 0.78 : 0.76;
  return (
    <group>
      <Wheel position={[-0.54, 0.33, 0]} tire={tire} deep={aero} rim={aero ? "#111" : "#2a2a2a"} motion={motion} />
      <Bar from={[-0.2, 0.82, 0]} to={[0.38, topY, 0]} color={color} r={0.014} />
      <Bar from={[-0.2, 0.82, 0]} to={[0.07, 0.29, 0]} color={color} r={0.014} />
      <Bar from={[0.38, topY, 0]} to={[0.07, 0.29, 0]} color={color} r={0.014} />
      {([-0.038, 0.038] as const).map((z) => (
        <group key={z}>
          <Bar from={[-0.2, 0.82, z]} to={[-0.54, 0.33, z]} color={color} r={0.013} />
          <Bar from={[0.07, 0.29, z]} to={[-0.54, 0.33, z]} color={color} r={0.012} />
          <Dropout position={[-0.54, 0.33, z]} />
        </group>
      ))}
      <Bar from={[-0.2, 0.82, 0]} to={[-0.2, 0.93, 0]} color="#1a1a1a" r={0.011} />
      <mesh position={[-0.2, 0.96, 0]} rotation={[0, 0, 0.05]}>
        <boxGeometry args={[0.18, 0.03, 0.08]} />
        <meshStandardMaterial color="#171717" />
      </mesh>
      <FrontEnd
        motion={motion}
        color={color}
        pivot={[0.4, 0.86, 0]}
        axle={[0.54, 0.33, 0]}
        bars="drop"
        tire={tire}
        deep={aero}
        rim={aero ? "#111" : "#2a2a2a"}
        brake
      />
      <CaliperBrake position={[-0.5, 0.48, 0]} />
      <Drivetrain motion={motion} />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Decal
            text="GIANT"
            width={0.28}
            height={0.05}
            position={[-0.04, 0.54, 0.022 * side]}
            rotation={[0, side > 0 ? 0 : Math.PI, Math.atan2(0.29 - 0.82, 0.07 - -0.2)]}
            color="#1a1a1a"
            weight="bold 72px sans-serif"
          />
          <Decal
            text="SCR"
            width={0.12}
            height={0.04}
            position={[0.26, 0.58, 0.022 * side]}
            rotation={[0, side > 0 ? 0 : Math.PI, Math.atan2(0.29 - topY, 0.07 - 0.38)]}
            color="#1a1a1a"
            weight="bold 64px sans-serif"
          />
        </group>
      ))}
    </group>
  );
}

function Basket() {
  return (
    <group position={[0.18, 0.06, 0]}>
      <mesh>
        <boxGeometry args={[0.22, 0.018, 0.3]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      {[
        [0.11, 0.07, 0] as const,
        [-0.11, 0.07, 0] as const,
        [0, 0.07, 0.15] as const,
        [0, 0.07, -0.15] as const,
      ].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={i < 2 ? [0.01, 0.14, 0.3] : [0.22, 0.14, 0.01]} />
          <meshStandardMaterial color="#202020" />
        </mesh>
      ))}
    </group>
  );
}

function Ttareungyi({ motion }: { motion?: MutableRefObject<BikeMotion> }) {
  return (
    <group>
      <Wheel position={[-0.48, 0.33, 0]} tire={0.018} rim="#b6e34a" spokes={16} motion={motion} />
      <Bar from={[0.42, 0.8, 0]} to={[0.15, 0.38, 0]} color="#f3f5f2" r={0.015} />
      <Bar from={[0.15, 0.38, 0]} to={[-0.15, 0.35, 0]} color="#f3f5f2" r={0.016} />
      <Bar from={[-0.15, 0.35, 0]} to={[-0.24, 0.82, 0]} color="#f3f5f2" r={0.014} />
      {([-0.034, 0.034] as const).map((z) => (
        <group key={z}>
          <Bar from={[-0.15, 0.35, z]} to={[-0.48, 0.33, z]} color="#f3f5f2" r={0.012} />
          <Bar from={[-0.24, 0.82, z]} to={[-0.48, 0.33, z]} color="#f3f5f2" r={0.011} />
          <Dropout position={[-0.48, 0.33, z]} />
        </group>
      ))}
      <FrontEnd
        motion={motion}
        color="#f3f5f2"
        pivot={[0.4, 0.88, 0]}
        axle={[0.5, 0.33, 0]}
        bars="city"
        stem="#cfd3d6"
        tire={0.018}
        rim="#b6e34a"
        spokes={16}
      >
        <Basket />
        <mesh position={[0.08, -0.3, 0]} rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.2, 0.016, 0.06]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </FrontEnd>
      <Drivetrain motion={motion} rearX={-0.48} city />
      <mesh position={[-0.24, 0.96, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.12]} />
        <meshStandardMaterial color="#171717" />
      </mesh>
      <mesh position={[-0.38, 0.72, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.07]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.48, 0.58, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.2, 0.016, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

const RIDER_FIT: Record<
  BikeId,
  {
    hip: XYZ;
    lean: number;
    hand: XYZ;
    helmet: boolean;
  }
> = {
  scr: {
    hip: [-0.17, 1.0, 0],
    lean: 0.88,
    hand: [0.5, 0.96, 0.17],
    helmet: true,
  },
  fixie: {
    hip: [-0.15, 1.04, 0],
    lean: 1.02,
    hand: [0.48, 0.95, 0.16],
    helmet: true,
  },
  ttareungyi: {
    hip: [-0.21, 0.99, 0],
    lean: 0.28,
    hand: [0.24, 1.05, 0.19],
    helmet: false,
  },
};

function PedalLegs({
  bikeId,
  hip,
  motion,
  shorts,
  skin,
  upright,
}: {
  bikeId: BikeId;
  hip: XYZ;
  motion?: MutableRefObject<BikeMotion>;
  shorts: string;
  skin: string;
  upright: boolean;
}) {
  const thighR = useRef<THREE.Mesh>(null);
  const thighL = useRef<THREE.Mesh>(null);
  const shinR = useRef<THREE.Mesh>(null);
  const shinL = useRef<THREE.Mesh>(null);
  const shoeR = useRef<THREE.Mesh>(null);
  const shoeL = useRef<THREE.Mesh>(null);
  const bb = BB[bikeId];
  useFrame(() => {
    const a = motion?.current.crank ?? 0;
    const legs = [
      { side: 1 as const, thigh: thighR, shin: shinR, shoe: shoeR },
      { side: -1 as const, thigh: thighL, shin: shinL, shoe: shoeL },
    ];
    for (const { side, thigh, shin, shoe } of legs) {
      const hipJ: XYZ = [hip[0], hip[1] - 0.015, 0.065 * side];
      const s = side > 0 ? 1 : -1;
      const foot: XYZ = [bb[0] + Math.cos(a) * CRANK_L * s, bb[1] + Math.sin(a) * CRANK_L * s, 0.08 * side];
      const knee = twoBone(hipJ, foot, 0.4, 0.38, [0.95, 0.12, 0.22 * side]);
      placeLive(thigh.current, hipJ, knee);
      placeLive(shin.current, knee, foot);
      if (shoe.current) {
        shoe.current.position.set(foot[0] + Math.cos(a) * 0.045 * s, foot[1] - 0.012, foot[2]);
        shoe.current.rotation.z = Math.sin(a) * 0.22 * s;
      }
    }
  });
  return (
    <group>
      {(
        [
          [thighR, shinR, shoeR],
          [thighL, shinL, shoeL],
        ] as const
      ).map(([thigh, shin, shoe], i) => (
        <group key={i}>
          <mesh ref={thigh} scale={[1, 0.01, 1]}>
            <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
            <meshStandardMaterial color={shorts} roughness={0.72} />
          </mesh>
          <mesh ref={shin} scale={[1, 0.01, 1]}>
            <cylinderGeometry args={[upright ? 0.04 : 0.034, upright ? 0.04 : 0.034, 1, 8]} />
            <meshStandardMaterial color={upright ? shorts : skin} roughness={0.7} />
          </mesh>
          <mesh ref={shoe}>
            <boxGeometry args={[0.17, 0.042, 0.068]} />
            <meshStandardMaterial color="#111" roughness={0.82} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Rider({ bikeId, motion }: { bikeId: BikeId; motion?: MutableRefObject<BikeMotion> }) {
  const fit = RIDER_FIT[bikeId];
  const upright = bikeId === "ttareungyi";
  const skin = "#d2a07a";
  const jersey = upright ? "#1d6b3c" : "#1a1a1a";
  const shorts = upright ? "#1a1a1a" : "#151515";
  const hip = fit.hip;
  const lean = fit.lean;
  const shoulderC = along(hip, lean, 0.46);
  const neck = along(shoulderC, lean * 0.7, 0.08);
  const head = along(neck, lean * 0.5, 0.12);
  const look = lean * 0.42;

  return (
    <group>
      <mesh position={hip}>
        <sphereGeometry args={[0.078, 10, 8]} />
        <meshStandardMaterial color={shorts} roughness={0.72} />
      </mesh>
      <Limb from={hip} to={shoulderC} r={0.078} color={jersey} />
      <mesh position={shoulderC}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={jersey} roughness={0.7} />
      </mesh>
      <mesh position={[shoulderC[0], shoulderC[1], 0]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.046, 0.1, 4, 8]} />
        <meshStandardMaterial color={jersey} roughness={0.7} />
      </mesh>
      <Limb from={shoulderC} to={neck} r={0.03} color={skin} />
      <group position={head} rotation={[0, 0, -look]}>
        <mesh>
          <sphereGeometry args={[0.1, 14, 12]} />
          <meshStandardMaterial color={skin} roughness={0.5} />
        </mesh>
        <mesh position={[-0.012, 0.026, 0]} rotation={[0.18, 0, 0.04]}>
          <sphereGeometry args={[0.102, 12, 10]} />
          <meshStandardMaterial color="#2a211c" roughness={0.86} />
        </mesh>
        {fit.helmet && (
          <>
            <mesh position={[-0.026, 0.046, 0]} rotation={[0.12, 0, 0.36]} scale={[1.28, 0.68, 1.04]}>
              <sphereGeometry args={[0.11, 12, 10]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.32} metalness={0.12} />
            </mesh>
            <mesh position={[0.055, -0.01, 0]} rotation={[0, 0, 0.45]}>
              <boxGeometry args={[0.09, 0.016, 0.13]} />
              <meshStandardMaterial color="#111" roughness={0.45} />
            </mesh>
          </>
        )}
        {([-1, 1] as const).map((side) => (
          <mesh key={`ear${side}`} position={[-0.02, 0, 0.1 * side]}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>
        ))}
        {([-1, 1] as const).map((side) => (
          <mesh key={`eye${side}`} position={[0.1, 0.01, 0.03 * side]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshStandardMaterial color="#1a1410" />
          </mesh>
        ))}
      </group>
      {([-1, 1] as const).map((side) => {
        const shoulder: XYZ = [shoulderC[0], shoulderC[1] - 0.015, 0.088 * side];
        const hand: XYZ = [fit.hand[0], fit.hand[1], fit.hand[2] * side];
        const elbow = twoBone(shoulder, hand, 0.275, 0.25, [-0.12, -1, 0.45 * side]);
        return (
          <group key={side}>
            <Limb from={shoulder} to={elbow} r={0.034} color={jersey} />
            <Limb from={elbow} to={hand} r={0.026} color={skin} />
            <mesh position={hand}>
              <sphereGeometry args={[0.026, 8, 6]} />
              <meshStandardMaterial color={upright ? skin : "#1c1c1c"} roughness={0.65} />
            </mesh>
          </group>
        );
      })}
      <PedalLegs bikeId={bikeId} hip={hip} motion={motion} shorts={shorts} skin={skin} upright={upright} />
    </group>
  );
}

const SCALE: Record<BikeId, number> = {
  scr: 1.05,
  fixie: 0.96,
  ttareungyi: 0.9,
};

export function BikeModel({
  bikeId,
  motion,
}: {
  bikeId: BikeId;
  motion?: MutableRefObject<BikeMotion>;
}) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (root.current) root.current.rotation.z = motion?.current.lean ?? 0;
  });
  return (
    <group ref={root} scale={SCALE[bikeId]} position={[0, 0.05, 0]}>
      <group rotation={[0, -Math.PI / 2, 0]}>
        {bikeId === "scr" && <RoadBike color="#c45b28" motion={motion} />}
        {bikeId === "fixie" && <FixieBike motion={motion} />}
        {bikeId === "ttareungyi" && <Ttareungyi motion={motion} />}
        <Rider bikeId={bikeId} motion={motion} />
      </group>
    </group>
  );
}
