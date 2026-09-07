import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BikeId } from "../data/bikes";

export type BikeMotion = { speed: number; lean: number };

function Wheel({
  position,
  radius = 0.335,
  tire = 0.013,
  rim = "#2a2a2a",
  spokes = 18,
  deep = false,
  motion,
}: {
  position: [number, number, number];
  radius?: number;
  tire?: number;
  rim?: string;
  spokes?: number;
  deep?: boolean;
  motion?: MutableRefObject<BikeMotion>;
}) {
  const rotor = useRef<THREE.Group>(null);
  const spokeGeo = useMemo(() => new THREE.CylinderGeometry(0.002, 0.002, radius * 1.82, 3), [radius]);
  useFrame((_, dt) => {
    const speed = motion?.current.speed ?? 0;
    if (rotor.current) rotor.current.rotation.z -= (speed / radius) * dt;
  });
  return (
    <group position={position}>
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
      </group>
    </group>
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

function TrackBars() {
  return (
    <group position={[0.46, 0.95, 0]}>
      <Bar from={[-0.1, -0.13, 0]} to={[0.05, 0.01, 0]} r={0.011} color="#1b1b1b" />
      <Bar from={[0.05, 0.01, -0.19]} to={[0.05, 0.01, 0.19]} r={0.01} color="#1a1a1a" />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Bar from={[0.05, 0.01, 0.19 * side]} to={[0.08, -0.09, 0.19 * side]} r={0.01} color="#1a1a1a" />
          <Bar from={[0.08, -0.09, 0.19 * side]} to={[-0.01, -0.15, 0.19 * side]} r={0.01} color="#1a1a1a" />
        </group>
      ))}
    </group>
  );
}

function DropBars() {
  return (
    <group position={[0.46, 0.95, 0]}>
      <Bar from={[-0.1, -0.13, 0]} to={[0.05, 0.01, 0]} r={0.011} color="#1b1b1b" />
      <Bar from={[0.05, 0.01, -0.19]} to={[0.05, 0.01, 0.19]} r={0.01} color="#1a1a1a" />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Bar from={[0.05, 0.01, 0.19 * side]} to={[0.08, -0.09, 0.19 * side]} r={0.01} color="#1a1a1a" />
          <Bar from={[0.08, -0.09, 0.19 * side]} to={[-0.01, -0.15, 0.19 * side]} r={0.01} color="#1a1a1a" />
          <mesh position={[0.11, 0.03, 0.19 * side]} rotation={[0, 0, -0.7]}>
            <capsuleGeometry args={[0.013, 0.07, 4, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CityBars() {
  return (
    <group position={[0.38, 1.0, 0]}>
      <Bar from={[-0.02, -0.16, 0]} to={[0.02, 0.03, 0]} r={0.011} color="#cfd3d6" />
      <Bar from={[0.02, 0.03, 0]} to={[-0.08, 0.08, 0.2]} r={0.01} color="#cfd3d6" />
      <Bar from={[0.02, 0.03, 0]} to={[-0.08, 0.08, -0.2]} r={0.01} color="#cfd3d6" />
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[-0.12, 0.08, 0.2 * side]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.09, 8]} />
          <meshStandardMaterial color="#151515" />
        </mesh>
      ))}
    </group>
  );
}

function Dropout({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.045, 0.055, 0.028]} />
      <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.35} />
    </mesh>
  );
}

function Drivetrain() {
  const chain = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.08, 0.36, 0.055),
      new THREE.Vector3(-0.12, 0.4, 0.055),
      new THREE.Vector3(-0.4, 0.38, 0.055),
      new THREE.Vector3(-0.54, 0.355, 0.055),
      new THREE.Vector3(-0.54, 0.3, 0.055),
      new THREE.Vector3(-0.2, 0.24, 0.055),
      new THREE.Vector3(0.08, 0.22, 0.055),
      new THREE.Vector3(0.1, 0.29, 0.055),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.4);
    return new THREE.TubeGeometry(curve, 48, 0.0045, 5, true);
  }, []);

  return (
    <group>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-0.54, 0.33, 0.02 + i * 0.0045]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.028 + i * 0.004, 0.003, 6, 16]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.75} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0.08, 0.29, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.006, 8, 20]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} />
      </mesh>
      <mesh position={[0.08, 0.29, 0.058]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.005, 8, 18]} />
        <meshStandardMaterial color="#1f1f1f" metalness={0.5} />
      </mesh>
      <mesh geometry={chain}>
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

function FixieDrive() {
  const chain = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.08, 0.35, 0.05),
      new THREE.Vector3(-0.2, 0.38, 0.05),
      new THREE.Vector3(-0.54, 0.36, 0.05),
      new THREE.Vector3(-0.54, 0.3, 0.05),
      new THREE.Vector3(-0.15, 0.23, 0.05),
      new THREE.Vector3(0.08, 0.23, 0.05),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.45);
    return new THREE.TubeGeometry(curve, 40, 0.005, 5, true);
  }, []);
  return (
    <group>
      <mesh position={[-0.54, 0.33, 0.048]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.042, 0.006, 8, 18]} />
        <meshStandardMaterial color="#cfd3d6" metalness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.29, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.078, 0.007, 8, 20]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.55} />
      </mesh>
      <mesh geometry={chain}>
        <meshStandardMaterial color="#2f2f2f" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  );
}

function FixieBike({ motion }: { motion?: MutableRefObject<BikeMotion> }) {
  return (
    <group>
      <Wheel position={[-0.52, 0.33, 0]} tire={0.013} deep rim="#111" spokes={20} motion={motion} />
      <Wheel position={[0.52, 0.33, 0]} tire={0.013} deep rim="#111" spokes={20} motion={motion} />
      <Bar from={[-0.18, 0.8, 0]} to={[0.36, 0.78, 0]} color="#111" r={0.018} />
      <Bar from={[-0.18, 0.8, 0]} to={[0.06, 0.28, 0]} color="#111" r={0.018} />
      <Bar from={[0.36, 0.78, 0]} to={[0.06, 0.28, 0]} color="#111" r={0.017} />
      {([-0.036, 0.036] as const).map((z) => (
        <group key={z}>
          <Bar from={[-0.18, 0.8, z]} to={[-0.52, 0.33, z]} color="#111" r={0.012} />
          <Bar from={[0.06, 0.28, z]} to={[-0.58, 0.33, z]} color="#111" r={0.011} />
          <Bar from={[0.36, 0.78, z]} to={[0.52, 0.33, z]} color="#111" r={0.011} />
          <mesh position={[-0.56, 0.33, z]}>
            <boxGeometry args={[0.07, 0.04, 0.02]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} />
          </mesh>
          <Dropout position={[0.52, 0.33, z]} />
        </group>
      ))}
      <Bar from={[-0.18, 0.8, 0]} to={[-0.18, 0.92, 0]} color="#111" r={0.01} />
      <mesh position={[-0.18, 0.95, 0]}>
        <boxGeometry args={[0.16, 0.028, 0.07]} />
        <meshStandardMaterial color="#151515" />
      </mesh>
      <TrackBars />
      <FixieDrive />
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
      <Wheel position={[0.54, 0.33, 0]} tire={tire} deep={aero} rim={aero ? "#111" : "#2a2a2a"} motion={motion} />
      <Bar from={[-0.2, 0.82, 0]} to={[0.38, topY, 0]} color={color} r={0.02} />
      <Bar from={[-0.2, 0.82, 0]} to={[0.07, 0.29, 0]} color={color} r={0.02} />
      <Bar from={[0.38, topY, 0]} to={[0.07, 0.29, 0]} color={color} r={0.02} />
      {([-0.038, 0.038] as const).map((z) => (
        <group key={z}>
          <Bar from={[-0.2, 0.82, z]} to={[-0.54, 0.33, z]} color={color} r={0.013} />
          <Bar from={[0.07, 0.29, z]} to={[-0.54, 0.33, z]} color={color} r={0.012} />
          <Bar from={[0.38, topY, z]} to={[0.54, 0.33, z]} color={color} r={0.012} />
          <Dropout position={[-0.54, 0.33, z]} />
          <Dropout position={[0.54, 0.33, z]} />
        </group>
      ))}
      <Bar from={[-0.2, 0.82, 0]} to={[-0.2, 0.93, 0]} color="#1a1a1a" r={0.011} />
      <mesh position={[-0.2, 0.96, 0]} rotation={[0, 0, 0.05]}>
        <boxGeometry args={[0.18, 0.03, 0.08]} />
        <meshStandardMaterial color="#171717" />
      </mesh>
      <DropBars />
      <Drivetrain />
    </group>
  );
}

function Basket() {
  return (
    <group position={[0.58, 0.94, 0]}>
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
      <Wheel position={[0.5, 0.33, 0]} tire={0.018} rim="#b6e34a" spokes={16} motion={motion} />
      <Bar from={[0.42, 0.8, 0]} to={[0.15, 0.38, 0]} color="#f3f5f2" r={0.022} />
      <Bar from={[0.15, 0.38, 0]} to={[-0.15, 0.35, 0]} color="#f3f5f2" r={0.024} />
      <Bar from={[-0.15, 0.35, 0]} to={[-0.24, 0.82, 0]} color="#f3f5f2" r={0.02} />
      {([-0.034, 0.034] as const).map((z) => (
        <group key={z}>
          <Bar from={[-0.15, 0.35, z]} to={[-0.48, 0.33, z]} color="#f3f5f2" r={0.012} />
          <Bar from={[-0.24, 0.82, z]} to={[-0.48, 0.33, z]} color="#f3f5f2" r={0.011} />
          <Bar from={[0.15, 0.38, z]} to={[0.5, 0.33, z]} color="#f3f5f2" r={0.011} />
          <Dropout position={[-0.48, 0.33, z]} />
          <Dropout position={[0.5, 0.33, z]} />
        </group>
      ))}
      <CityBars />
      <Drivetrain />
      <Basket />
      <mesh position={[-0.24, 0.96, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.12]} />
        <meshStandardMaterial color="#171717" />
      </mesh>
      <mesh position={[-0.38, 0.72, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.07]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.48, 0.58, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.2, 0.016, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.48, 0.58, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.2, 0.016, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

function Rider({ upright }: { upright: boolean }) {
  const skin = "#d9a07a";
  const hair = "#2a211c";
  const jersey = upright ? "#1d6b3c" : "#1b1b1b";
  const pants = upright ? "#1a1a1a" : "#151515";
  const tuck = upright ? 0.04 : 0.38;
  return (
    <group position={[upright ? 0.01 : 0.09, upright ? 0.74 : 0.62, 0]} rotation={[0, 0, tuck]}>
      <mesh position={[0.01, 0.27, 0]}>
        <capsuleGeometry args={[0.078, 0.2, 6, 10]} />
        <meshStandardMaterial color={jersey} roughness={0.62} />
      </mesh>
      <mesh position={[0.01, 0.16, 0]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={pants} roughness={0.7} />
      </mesh>
      <mesh position={[0.015, 0.4, 0]}>
        <cylinderGeometry args={[0.032, 0.038, 0.07, 8]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      <mesh position={[0.02, 0.5, 0]}>
        <sphereGeometry args={[0.072, 14, 12]} />
        <meshStandardMaterial color={skin} roughness={0.48} />
      </mesh>
      <mesh position={[0.01, 0.535, 0]} rotation={[0.15, 0, 0]}>
        <sphereGeometry args={[0.074, 12, 10]} />
        <meshStandardMaterial color={hair} roughness={0.85} />
      </mesh>
      {upright ? null : (
        <mesh position={[0.03, 0.545, 0]} rotation={[0.4, 0, 0.15]}>
          <sphereGeometry args={[0.078, 10, 8]} />
          <meshStandardMaterial color="#171717" roughness={0.7} />
        </mesh>
      )}
      {([-1, 1] as const).map((side) => (
        <mesh key={`ear${side}`} position={[0.01, 0.5, 0.068 * side]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.55} />
        </mesh>
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh key={`eye${side}`} position={[0.078, 0.51, 0.022 * side]}>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshStandardMaterial color="#1a1410" />
        </mesh>
      ))}
      {([-1, 1] as const).map((side) => (
        <group key={`arm${side}`}>
          <mesh position={[0.1, 0.3, 0.08 * side]} rotation={[0.2 * side, 0, -1.12]}>
            <capsuleGeometry args={[0.03, 0.15, 5, 8]} />
            <meshStandardMaterial color={jersey} />
          </mesh>
          <mesh position={[0.26, 0.22, 0.15 * side]} rotation={[0.12 * side, 0, -0.38]}>
            <capsuleGeometry args={[0.024, 0.13, 4, 8]} />
            <meshStandardMaterial color={skin} roughness={0.5} />
          </mesh>
          <mesh position={[0.36, 0.18, 0.17 * side]}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      ))}
      {([-1, 1] as const).map((side) => (
        <group key={`leg${side}`}>
          <mesh position={[-0.02, 0.06, 0.055 * side]} rotation={[0.12 * side, 0, 0.62]}>
            <capsuleGeometry args={[0.036, 0.16, 5, 8]} />
            <meshStandardMaterial color={pants} />
          </mesh>
          <mesh position={[0.1, -0.1, 0.065 * side]} rotation={[0.04 * side, 0, -0.32]}>
            <capsuleGeometry args={[0.028, 0.15, 4, 8]} />
            <meshStandardMaterial color={pants} />
          </mesh>
          <mesh position={[0.2, -0.22, 0.07 * side]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.1, 0.04, 0.045]} />
            <meshStandardMaterial color="#111" roughness={0.8} />
          </mesh>
        </group>
      ))}
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
    <group ref={root} scale={SCALE[bikeId]}>
      <group rotation={[0, -Math.PI / 2, 0]}>
        {bikeId === "scr" && <RoadBike color="#c45b28" motion={motion} />}
        {bikeId === "fixie" && <FixieBike motion={motion} />}
        {bikeId === "ttareungyi" && <Ttareungyi motion={motion} />}
        <Rider upright={bikeId === "ttareungyi"} />
      </group>
    </group>
  );
}
