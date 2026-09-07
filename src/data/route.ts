import * as THREE from "three";

export type Landmark = {
  name: string;
  t: number;
};

export type BridgeSpot = {
  name: string;
  t: number;
  kind: "girder" | "cable" | "climb";
};

export const ARA_END = 0.34;

export const LANDMARKS: Landmark[] = [
  { name: "아라뱃길", t: 0.015 },
  { name: "걸포동", t: 0.1 },
  { name: "고촌", t: 0.2 },
  { name: "강서구", t: 0.32 },
  { name: "김포대교", t: 0.38 },
  { name: "마곡", t: 0.46 },
  { name: "가양대교", t: 0.54 },
  { name: "난지한강공원", t: 0.62 },
  { name: "성산대교", t: 0.7 },
  { name: "양화한강공원", t: 0.78 },
  { name: "여의나루 공원", t: 0.86 },
  { name: "여의도", t: 0.93 },
  { name: "여의도 자전거길 종점", t: 0.985 },
];

export const BRIDGES: BridgeSpot[] = [
  { name: "김포대교", t: 0.38, kind: "girder" },
  { name: "가양대교", t: 0.54, kind: "girder" },
  { name: "성산대교", t: 0.7, kind: "cable" },
  { name: "양화대교", t: 0.8, kind: "cable" },
  { name: "마포대교", t: 0.9, kind: "girder" },
];

function buildRaw(): [number, number, number][] {
  const pts: [number, number, number][] = [];
  let x = 0;
  let z = 0;

  for (let i = 0; i <= 16; i++) {
    const heading = 0.12 + Math.sin(i * 0.5) * 0.55;
    x += Math.cos(heading) * 74;
    z += Math.sin(heading) * 74;
    pts.push([x, 0, z]);
  }

  for (let i = 1; i <= 48; i++) {
    const heading = 0.4 + Math.sin(i * 0.18) * 0.85 + Math.cos(i * 0.09) * 0.38;
    x += Math.cos(heading) * 86;
    z += Math.sin(heading) * 86;
    pts.push([x, 0, z]);
  }
  return pts;
}

export const PATH_POINTS = buildRaw().map(([x, y, z]) => new THREE.Vector3(x, y, z));

export function createRouteCurve() {
  return new THREE.CatmullRomCurve3(PATH_POINTS, false, "catmullrom", 0.2);
}

export function nearestLandmark(t: number): Landmark {
  let best = LANDMARKS[0];
  for (const mark of LANDMARKS) {
    if (t >= mark.t) best = mark;
  }
  return best;
}

export function isAra(t: number) {
  return t < ARA_END;
}

export function isGimpoPath(t: number) {
  return t < 0.34;
}

export function isYeouido(t: number) {
  return t >= 0.82;
}
