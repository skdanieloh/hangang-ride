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

/** 아라뱃길~한강 합류. 그 뒤는 한강 남단 자전거길. */
export const ARA_END = 0.26;
export const HANGANG_START = 0.3;

export const LANDMARKS: Landmark[] = [
  { name: "걸포동", t: 0.008 },
  { name: "아라뱃길", t: 0.07 },
  { name: "고촌", t: 0.16 },
  { name: "강서습지생태공원", t: 0.24 },
  { name: "방화대교", t: 0.32 },
  { name: "김포대교", t: 0.4 },
  { name: "마곡", t: 0.48 },
  { name: "가양대교", t: 0.56 },
  { name: "염창", t: 0.64 },
  { name: "성산대교", t: 0.72 },
  { name: "양화대교", t: 0.78 },
  { name: "선유도", t: 0.82 },
  { name: "여의도", t: 0.9 },
  { name: "여의나루역", t: 0.975 },
];

export const BRIDGES: BridgeSpot[] = [
  { name: "방화대교", t: 0.32, kind: "girder" },
  { name: "김포대교", t: 0.4, kind: "girder" },
  { name: "가양대교", t: 0.56, kind: "girder" },
  { name: "성산대교", t: 0.72, kind: "cable" },
  { name: "양화대교", t: 0.78, kind: "cable" },
  { name: "서강대교", t: 0.86, kind: "girder" },
  { name: "마포대교", t: 0.93, kind: "girder" },
];

/** 카카오 자전거 경로: 걸포동 → 한강 남단 → 여의나루. 거의 평지. */
function buildRaw(): [number, number, number][] {
  const pts: [number, number, number][] = [];
  let x = 0;
  let z = 0;
  const n = 96;

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let heading = 0.2;
    if (t < 0.26) {
      heading = 0.16 + Math.sin(t * 18) * 0.1;
    } else if (t < 0.36) {
      heading = 0.16 + (t - 0.26) * 2.2;
    } else if (t < 0.84) {
      heading = 0.4 + Math.sin((t - 0.36) * 6.2) * 0.26 + Math.cos((t - 0.36) * 2.8) * 0.1;
    } else {
      heading = 0.52 + Math.sin((t - 0.84) * 12) * 0.48;
    }
    const step = t < 0.26 ? 58 : 80;
    x += Math.cos(heading) * step;
    z += Math.sin(heading) * step;
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

export function isHangang(t: number) {
  return t >= HANGANG_START;
}

export function isYeouido(t: number) {
  return t >= 0.84;
}
