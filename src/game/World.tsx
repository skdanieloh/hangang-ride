import { useMemo } from "react";
import * as THREE from "three";
import { BRIDGES, LANDMARKS, createRouteCurve, isGimpoPath, isHangang, isYeouido } from "../data/route";
import { framesAt, makeRibbon } from "./geometry";
import { InstancedForest, IronFence, RiverBridge, Tower63, YeouinaruPark, Guardrail, StreetLamps, NationalAssembly } from "./scenery";
import { apartmentTexture, asphaltTexture, grassTexture, officeTexture, plazaTexture, waterTexture } from "./textures";

function Sign({ text, position, yaw }: { text: string; position: [number, number, number]; yaw: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1c3f2c";
    ctx.fillRect(0, 0, 640, 160);
    ctx.strokeStyle = "#e8f3ea";
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 628, 148);
    ctx.fillStyle = "#f7fff8";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 320, 80);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text]);

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 2.3, 8]} />
        <meshStandardMaterial color="#6d7174" metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <planeGeometry args={[3.6, 0.9]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}

export function World() {
  const asphalt = useMemo(() => {
    const tex = asphaltTexture();
    tex.repeat.set(1, 40);
    return tex;
  }, []);
  const grass = useMemo(() => {
    const tex = grassTexture();
    tex.repeat.set(8, 40);
    return tex;
  }, []);
  const water = useMemo(() => {
    const tex = waterTexture();
    tex.repeat.set(6, 30);
    return tex;
  }, []);
  const office = useMemo(() => officeTexture(), []);
  const apartments = useMemo(() => apartmentTexture(), []);
  const plaza = useMemo(() => plazaTexture(), []);

  const built = useMemo(() => {
    const curve = createRouteCurve();
    const pathGeo = makeRibbon(curve, 4.0, 0.03, 800, 0, true);
    const walkGeo = makeRibbon(curve, 2.2, 0.02, 520, 3.0, true);
    const shoulderGeo = makeRibbon(curve, 1.4, 0.018, 500, -2.6, true);
    const riverGeo = makeRibbon(curve, 58, -0.32, 520, -28);
    const yeouidoRiver = makeRibbon(curve, 78, -0.36, 160, -38, false, 0.9, 1);
    const canalGeo = makeRibbon(curve, 18, -0.28, 180, -16, false, 0, 0.34);
    const parkGeo = makeRibbon(curve, 22, 0.0, 400, 12);
    const plazaGeo = makeRibbon(curve, 16, 0.025, 90, 6, true, 0.9, 1);
    const blueLine = makeRibbon(curve, 0.16, 0.05, 280, -1.75, true, 0, 0.48);
    const yellowLine = makeRibbon(curve, 0.1, 0.046, 360, 0, true, 0.4, 1);
    const highwayGeo = makeRibbon(curve, 11, 0.05, 220, 15, false, 0, 0.48);
    const bermGeo = makeRibbon(curve, 4.5, 0.35, 180, 6.4, false, 0, 0.48);

    const trees: { x: number; z: number; s: number }[] = [];
    const fences: { x: number; y: number; z: number; yaw: number }[] = [];
    const rails: { x: number; y: number; z: number; yaw: number }[] = [];
    const lamps: { x: number; y: number; z: number; yaw: number }[] = [];
    const walls: { x: number; y: number; z: number; yaw: number }[] = [];
    const buildings: { x: number; z: number; w: number; h: number; d: number; yaw: number; kind: "apt" | "office" }[] = [];

    for (let i = 0; i < 8500; i++) {
      const t = 0.003 + (i / 8500) * 0.994;
      const { p, side, yaw } = framesAt(curve, t);
      const fence = side.clone().multiplyScalar(-2.08);
      fences.push({ x: p.x + fence.x, y: p.y, z: p.z + fence.z, yaw });
      if (isGimpoPath(t) && i % 6 === 0) {
        const land = side.clone().multiplyScalar(4.4);
        rails.push({ x: p.x + land.x, y: p.y, z: p.z + land.z, yaw });
      }
      if (i % 20 === 0) {
        const land = side.clone().multiplyScalar(isGimpoPath(t) ? 5.6 : 3.8);
        lamps.push({ x: p.x + land.x, y: p.y, z: p.z + land.z, yaw });
      }
      if (isGimpoPath(t) && i % 16 === 0) {
        const land = side.clone().multiplyScalar(5.2);
        walls.push({ x: p.x + land.x, y: p.y, z: p.z + land.z, yaw });
      }
    }

    for (let i = 0; i < 280; i++) {
      const t = 0.02 + (i / 280) * 0.96;
      const { p, side, yaw } = framesAt(curve, t);

      if (isHangang(t) && i % 3 === 0) {
        const park = side.clone().multiplyScalar(6.2 + (i % 5) * 0.7);
        trees.push({ x: p.x + park.x, z: p.z + park.z, s: 0.85 + (i % 6) * 0.13 });
        if (i % 2 === 0) {
          const extra = side.clone().multiplyScalar(10.4 + (i % 5) * 0.8);
          trees.push({ x: p.x + extra.x, z: p.z + extra.z, s: 1.05 + (i % 4) * 0.1 });
        }
      }
      if (isGimpoPath(t) && i % 4 === 0) {
        const strip = side.clone().multiplyScalar(7.4);
        trees.push({ x: p.x + strip.x, z: p.z + strip.z, s: 0.55 + (i % 3) * 0.08 });
      }

      if (isHangang(t) && !isYeouido(t) && i % 5 === 0) {
        const city = side.clone().multiplyScalar(18 + (i % 5) * 1.4);
        buildings.push({
          x: p.x + city.x,
          z: p.z + city.z,
          w: 11 + (i % 3),
          h: 22 + (i % 8) * 2.2,
          d: 8 + (i % 3),
          yaw,
          kind: "apt",
        });
      }
      if (isYeouido(t) && i % 6 === 0) {
        const city = side.clone().multiplyScalar(22 + (i % 4));
        buildings.push({
          x: p.x + city.x,
          z: p.z + city.z,
          w: 10 + (i % 4),
          h: 28 + (i % 7) * 3,
          d: 8 + (i % 3),
          yaw,
          kind: "office",
        });
      }
    }

    const signs = LANDMARKS.map((mark) => {
      const { p, side, yaw } = framesAt(curve, mark.t);
      const off = side.clone().multiplyScalar(4.8);
      return { name: mark.name, position: [p.x + off.x, p.y, p.z + off.z] as [number, number, number], yaw };
    });

    const bridges = BRIDGES.map((spot) => {
      const { p, yaw } = framesAt(curve, spot.t);
      return {
        name: spot.name,
        kind: spot.kind,
        position: [p.x, 0, p.z] as [number, number, number],
        yaw: yaw + Math.PI,
      };
    });

    const start = framesAt(curve, 0.004);
    const end = framesAt(curve, 0.992);
    const tower = framesAt(curve, 0.92);
    const towerPos: [number, number, number] = [
      tower.p.x + tower.side.x * 34,
      0,
      tower.p.z + tower.side.z * 34,
    ];
    const park = framesAt(curve, 0.94);
    const assembly = framesAt(curve, 0.89);

    return {
      pathGeo,
      walkGeo,
      shoulderGeo,
      riverGeo,
      yeouidoRiver,
      canalGeo,
      parkGeo,
      plazaGeo,
      blueLine,
      yellowLine,
      highwayGeo,
      bermGeo,
      trees,
      park,
      rails,
      lamps,
      walls,
      assembly,
      fences,
      buildings,
      signs,
      bridges,
      start,
      end,
      tower,
      towerPos,
    };
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2800, -0.65, -1500]} receiveShadow>
        <planeGeometry args={[10000, 8000]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh geometry={built.parkGeo} receiveShadow>
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh geometry={built.plazaGeo} receiveShadow>
        <meshStandardMaterial map={plaza} roughness={0.92} />
      </mesh>
      <mesh geometry={built.canalGeo}>
        <meshStandardMaterial map={water} roughness={0.08} metalness={0.28} />
      </mesh>
      <mesh geometry={built.riverGeo}>
        <meshStandardMaterial map={water} roughness={0.08} metalness={0.28} />
      </mesh>
      <mesh geometry={built.yeouidoRiver}>
        <meshStandardMaterial map={water} roughness={0.08} metalness={0.28} />
      </mesh>
      <mesh geometry={built.highwayGeo}>
        <meshStandardMaterial color="#3f4348" roughness={0.9} />
      </mesh>
      <mesh geometry={built.bermGeo}>
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh geometry={built.walkGeo} receiveShadow>
        <meshStandardMaterial color="#c8c0ae" roughness={0.95} />
      </mesh>
      <mesh geometry={built.shoulderGeo} receiveShadow>
        <meshStandardMaterial color="#7a6b4d" roughness={1} />
      </mesh>
      <mesh geometry={built.pathGeo} receiveShadow>
        <meshStandardMaterial map={asphalt} roughness={0.92} />
      </mesh>
      <mesh geometry={built.blueLine}>
        <meshStandardMaterial color="#2f6fe0" />
      </mesh>
      <mesh geometry={built.yellowLine}>
        <meshStandardMaterial color="#e6d36a" />
      </mesh>

      <IronFence items={built.fences} />
      {built.rails.length > 0 && <Guardrail items={built.rails} />}
      {built.lamps.length > 0 && <StreetLamps items={built.lamps} />}
      {built.walls.map((w, i) => (
        <mesh key={`w${i}`} position={[w.x, w.y + 0.7, w.z]} rotation={[0, w.yaw, 0]}>
          <boxGeometry args={[0.42, 1.4, 2.1]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#8d8f93" : "#8a5c48"} roughness={0.92} />
        </mesh>
      ))}
      <InstancedForest items={built.trees} />

      {built.buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} rotation={[0, b.yaw, 0]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial map={b.kind === "apt" ? apartments : office} roughness={0.62} metalness={0.08} />
        </mesh>
      ))}

      {built.bridges.map((bridge) => (
        <RiverBridge
          key={bridge.name}
          name={bridge.name}
          kind={bridge.kind}
          position={bridge.position}
          yaw={bridge.yaw}
        />
      ))}

      {built.signs.map((sign) => (
        <Sign key={sign.name} text={sign.name} position={sign.position} yaw={sign.yaw} />
      ))}

      <YeouinaruPark
        position={[built.park.p.x + built.park.side.x * 12, 0, built.park.p.z + built.park.side.z * 12]}
        yaw={built.park.yaw}
      />
      <NationalAssembly
        position={[
          built.assembly.p.x + built.assembly.side.x * 38,
          0,
          built.assembly.p.z + built.assembly.side.z * 38,
        ]}
        yaw={built.assembly.yaw}
      />
      <Tower63 position={built.towerPos} yaw={built.tower.yaw} />

      <mesh position={[built.start.p.x, 0.06, built.start.p.z]} rotation={[0, built.start.yaw, 0]}>
        <boxGeometry args={[3.6, 0.08, 0.4]} />
        <meshStandardMaterial color="#7dffb2" />
      </mesh>
      <mesh position={[built.end.p.x, 0.06, built.end.p.z]} rotation={[0, built.end.yaw, 0]}>
        <boxGeometry args={[3.6, 0.1, 0.45]} />
        <meshStandardMaterial color="#e37a3a" />
      </mesh>
    </group>
  );
}
