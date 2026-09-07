import * as THREE from "three";

/** 자전거길 노면 높이. 잔디·강보다 위에 올려 파묻히지 않게 한다. */
export const ROAD_Y = 0.22;

/** 수평(XZ)으로만 깔리는 길/잔디/강. Extrude는 커브에서 벽으로 뒤집힌다. */
export function makeRibbon(
  curve: THREE.CatmullRomCurve3,
  width: number,
  y: number,
  segments: number,
  lateral = 0,
  followY = false,
  tStart = 0,
  tEnd = 1,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  const center = new THREE.Vector3();
  const length = curve.getLength();

  for (let i = 0; i <= segments; i++) {
    const t = tStart + (i / segments) * (tEnd - tStart);
    curve.getPointAt(t, center);
    curve.getTangentAt(t, tan);
    side.crossVectors(tan, up).normalize();
    if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
    const mid = lateral !== 0 ? side.clone().multiplyScalar(lateral) : null;
    const hx = width / 2;
    const cx = center.x + (mid?.x ?? 0);
    const cz = center.z + (mid?.z ?? 0);
    const yy = (followY ? center.y : 0) + y;
    positions.push(cx - side.x * hx, yy, cz - side.z * hx, cx + side.x * hx, yy, cz + side.z * hx);
    uvs.push(0, (t * length) / 8, 1, (t * length) / 8);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function framesAt(curve: THREE.CatmullRomCurve3, t: number) {
  const p = curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1));
  const tan = curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1));
  const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
  if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
  const yaw = Math.atan2(tan.x, tan.z);
  return { p, tan, side, yaw };
}
