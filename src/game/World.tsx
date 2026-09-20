import { useMemo } from "react";
import * as THREE from "three";
import { ARA_END, BRIDGES, GIMPO_END, HANGANG_START, LANDMARKS, createRouteCurve, isGimpoPath, isHangang, isYeouido } from "../data/route";
import { ROAD_Y, framesAt, makeRibbon } from "./geometry";
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
    tex.repeat.set(24, 48);
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
    const pathGeo = makeRibbon(curve, 4.2, ROAD_Y, 800, 0, true);
    const deckGeo = makeRibbon(curve, 5.4, 0.04, 800, 0, true);
    const walkGeo = makeRibbon(curve, 2.4, ROAD_Y - 0.06, 560, 3.6, true);
    const shoulderGeo = makeRibbon(curve, 1.6, ROAD_Y - 0.07, 500, -2.95, true);
    const riverGeo = makeRibbon(curve, 130, -0.58, 560, -72);
    const yeouidoRiver = makeRibbon(curve, 160, -0.62, 180, -88, false, 0.9, 1);
    const farBankGeo = makeRibbon(curve, 48, -0.2, 280, -148, false, HANGANG_START, 1);
    const canalGeo = makeRibbon(curve, 36, -0.52, 200, -24, false, 0, ARA_END);
    const parkGeo = makeRibbon(curve, 58, -0.2, 420, 38);
    const farParkGeo = makeRibbon(curve, 70, -0.18, 280, 92);
    const plazaGeo = makeRibbon(curve, 36, ROAD_Y - 0.04, 110, 16, true, 0.9, 1);
    const cityPadGeo = makeRibbon(curve, 96, -0.16, 260, 78, false, HANGANG_START, 1);
    const blueLine = makeRibbon(curve, 0.16, ROAD_Y + 0.012, 280, -1.75, true, 0, GIMPO_END);
    const yellowLine = makeRibbon(curve, 0.1, ROAD_Y + 0.01, 360, 0, true, HANGANG_START, 1);
    const highwayGeo = makeRibbon(curve, 18, -0.02, 240, 24, false, 0, GIMPO_END);
    const bermGeo = makeRibbon(curve, 10, 0.22, 200, 12, false, 0, GIMPO_END);

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
      fences.push({ x: p.x + fence.x, y: ROAD_Y, z: p.z + fence.z, yaw });
      if (isGimpoPath(t) && i % 6 === 0) {
        const land = side.clone().multiplyScalar(4.4);
        rails.push({ x: p.x + land.x, y: ROAD_Y, z: p.z + land.z, yaw });
      }
      if (i % 20 === 0) {
        const land = side.clone().multiplyScalar(isGimpoPath(t) ? 5.6 : 3.8);
        lamps.push({ x: p.x + land.x, y: ROAD_Y, z: p.z + land.z, yaw });
      }
      if (isGimpoPath(t) && i % 16 === 0) {
        const land = side.clone().multiplyScalar(5.2);
        walls.push({ x: p.x + land.x, y: ROAD_Y, z: p.z + land.z, yaw });
      }
    }

    for (let i = 0; i < 640; i++) {
      const t = 0.012 + (i / 640) * 0.976;
      const { p, side, yaw } = framesAt(curve, t);

      if (isHangang(t) || isGimpoPath(t)) {
        for (const lat of [9, 18, 30, 46, 64]) {
          if (i % 2 !== lat % 2) continue;
          const park = side.clone().multiplyScalar(lat + (i % 5) * 0.6);
          trees.push({ x: p.x + park.x, z: p.z + park.z, s: 0.7 + (i % 6) * 0.12 + lat * 0.004 });
        }
      }

      if (isHangang(t) && i % 6 === 0) {
        const north = side.clone().multiplyScalar(-138 - (i % 4) * 3);
        trees.push({ x: p.x + north.x, z: p.z + north.z, s: 0.9 + (i % 4) * 0.1 });
      }

      if (isHangang(t) && !isYeouido(t) && i % 4 === 0) {
        for (const lat of [42, 62, 86]) {
          const city = side.clone().multiplyScalar(lat + (i % 3) * 1.2);
          buildings.push({
            x: p.x + city.x,
            z: p.z + city.z,
            w: 12 + (i % 4),
            h: 20 + (i % 9) * 2.4,
            d: 9 + (i % 3),
            yaw,
            kind: "apt",
          });
        }
      }
      if (isYeouido(t) && i % 3 === 0) {
        for (const lat of [36, 58, 84, 112]) {
          const city = side.clone().multiplyScalar(lat + (i % 4));
          buildings.push({
            x: p.x + city.x,
            z: p.z + city.z,
            w: 11 + (i % 5),
            h: 26 + (i % 8) * 3.2,
            d: 9 + (i % 4),
            yaw,
            kind: "office",
          });
        }
      }
      if (isHangang(t) && i % 8 === 0) {
        const far = side.clone().multiplyScalar(-162 - (i % 5) * 2);
        buildings.push({
          x: p.x + far.x,
          z: p.z + far.z,
          w: 14 + (i % 3),
          h: 24 + (i % 7) * 2.6,
          d: 10 + (i % 2),
          yaw,
          kind: "apt",
        });
      }
    }

    const signs = LANDMARKS.map((mark) => {
      const { p, side, yaw } = framesAt(curve, mark.t);
      const off = side.clone().multiplyScalar(4.8);
      return { name: mark.name, position: [p.x + off.x, ROAD_Y, p.z + off.z] as [number, number, number], yaw };
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
    const tower = framesAt(curve, 0.96);
    const towerPos: [number, number, number] = [
      tower.p.x + tower.side.x * 58,
      0,
      tower.p.z + tower.side.z * 58,
    ];
    const park = framesAt(curve, 0.97);
    const assembly = framesAt(curve, 0.95);

    return {
      pathGeo,
      deckGeo,
      walkGeo,
      shoulderGeo,
      riverGeo,
      yeouidoRiver,
      farBankGeo,
      canalGeo,
      parkGeo,
      farParkGeo,
      plazaGeo,
      cityPadGeo,
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2800, -1.45, -1900]} receiveShadow>
        <planeGeometry args={[16000, 12000]} />
        <meshStandardMaterial map={grass} roughness={1} polygonOffset polygonOffsetFactor={2} polygonOffsetUnits={2} />
      </mesh>
      <mesh geometry={built.parkGeo} receiveShadow>
        <meshStandardMaterial map={grass} roughness={1} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <mesh geometry={built.farParkGeo} receiveShadow>
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh geometry={built.cityPadGeo} receiveShadow>
        <meshStandardMaterial color="#8a8d86" roughness={0.95} />
      </mesh>
      <mesh geometry={built.farBankGeo} receiveShadow>
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
      <mesh geometry={built.deckGeo} receiveShadow>
        <meshStandardMaterial color="#6a5e4c" roughness={1} />
      </mesh>
      <mesh geometry={built.pathGeo} receiveShadow>
        <meshStandardMaterial map={asphalt} roughness={0.92} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
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
        position={[built.park.p.x + built.park.side.x * 28, 0, built.park.p.z + built.park.side.z * 28]}
        yaw={built.park.yaw}
      />
      <NationalAssembly
        position={[
          built.assembly.p.x + built.assembly.side.x * 56,
          0,
          built.assembly.p.z + built.assembly.side.z * 56,
        ]}
        yaw={built.assembly.yaw}
      />
      <Tower63 position={built.towerPos} yaw={built.tower.yaw} />

      <mesh position={[built.start.p.x, ROAD_Y + 0.04, built.start.p.z]} rotation={[0, built.start.yaw, 0]}>
        <boxGeometry args={[3.6, 0.08, 0.4]} />
        <meshStandardMaterial color="#7dffb2" />
      </mesh>
      <mesh position={[built.end.p.x, ROAD_Y + 0.05, built.end.p.z]} rotation={[0, built.end.yaw, 0]}>
        <boxGeometry args={[3.6, 0.1, 0.45]} />
        <meshStandardMaterial color="#e37a3a" />
      </mesh>
    </group>
  );
}
