import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { concreteTexture, goldGlassTexture, hanwhaLogoTexture } from "./textures";

function Label({ text, width = 10 }: { text: string; width?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(0, 0, 640, 160);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 320, 80);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text]);
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[width, width * 0.25]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

/** 한강 다리는 길을 덮는 지붕이 아니라, 강을 가로지른다. */
export function RiverBridge({
  name,
  position,
  yaw,
  kind,
}: {
  name: string;
  position: [number, number, number];
  yaw: number;
  kind: "girder" | "cable" | "climb";
}) {
  const concrete = useMemo(() => concreteTexture(), []);
  concrete.repeat.set(4, 2);

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[8, 4.65, 0]}>
        <boxGeometry args={[4, 9.3, 16]} />
        <meshStandardMaterial map={concrete} roughness={0.88} />
      </mesh>
      {[20, 36, 52, 68, 84].map((x) => (
        <mesh key={x} position={[x, 4.65, 0]}>
          <boxGeometry args={[3.2, 9.3, 3.6]} />
          <meshStandardMaterial map={concrete} roughness={0.88} />
        </mesh>
      ))}
      {[22, 46, 70].map((x) => (
        <mesh key={`deck-${x}`} position={[x, 10.0, 0]}>
          <boxGeometry args={[50, 1.4, 15]} />
          <meshStandardMaterial color="#6c7076" roughness={0.7} />
        </mesh>
      ))}
      {[-6.2, 6.2].map((z) =>
        [22, 46, 70].map((x) => (
          <mesh key={`rail-${x}-${z}`} position={[x, 10.9, z]}>
            <boxGeometry args={[50, 0.5, 0.2]} />
            <meshStandardMaterial color="#4a4e52" metalness={0.4} />
          </mesh>
        )),
      )}
      {kind === "cable" && (
        <>
          <mesh position={[30, 24, 0]}>
            <boxGeometry args={[2.4, 28, 2.4]} />
            <meshStandardMaterial color="#d8dde2" metalness={0.55} roughness={0.3} />
          </mesh>
          <mesh position={[62, 24, 0]}>
            <boxGeometry args={[2.4, 28, 2.4]} />
            <meshStandardMaterial color="#d8dde2" metalness={0.55} roughness={0.3} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh
              key={`c-${i}`}
              position={[30 + (i - 3.5) * 4.6, 20 - Math.abs(i - 3.5) * 1.1, 0]}
              rotation={[0, 0, (i < 4 ? 0.5 : -0.5)]}
            >
              <cylinderGeometry args={[0.055, 0.055, 14, 6]} />
              <meshStandardMaterial color="#e8ecef" metalness={0.7} />
            </mesh>
          ))}
        </>
      )}
      <group position={[14, 11.6, 8]} rotation={[0, Math.PI, 0]}>
        <Label text={name} width={11} />
      </group>
    </group>
  );
}

export function Tower63({
  position,
  yaw = 0,
}: {
  position: [number, number, number];
  yaw?: number;
}) {
  const glass = useMemo(() => {
    const tex = goldGlassTexture();
    tex.repeat.set(6, 18);
    return tex;
  }, []);
  const logo = useMemo(() => hanwhaLogoTexture(), []);
  const body = useMemo(() => {
    const w = 9.2;
    const d = 20;
    const bulge = 3.2;
    const shape = new THREE.Shape();
    shape.moveTo(-w + 2.4, -d);
    shape.lineTo(w - 2.4, -d);
    shape.quadraticCurveTo(w, -d, w, -d + 3.2);
    shape.quadraticCurveTo(w + bulge, 0, w, d - 3.2);
    shape.quadraticCurveTo(w, d, w - 2.4, d);
    shape.lineTo(-w + 2.4, d);
    shape.quadraticCurveTo(-w, d, -w, d - 3.2);
    shape.quadraticCurveTo(-w - bulge, 0, -w, -d + 3.2);
    shape.quadraticCurveTo(-w, -d, -w + 2.4, -d);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 108, bevelEnabled: false, curveSegments: 18 });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh geometry={body} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial
          map={glass}
          color="#e8c36a"
          metalness={0.82}
          roughness={0.16}
          envMapIntensity={1.4}
        />
      </mesh>
      {[-1, 1].map((side) =>
        [-17.6, 17.6].map((z) => (
          <mesh key={`groove-${side}-${z}`} position={[side * 11.4, 54, z]}>
            <boxGeometry args={[0.7, 108, 1.6]} />
            <meshStandardMaterial color="#1a2430" metalness={0.35} roughness={0.45} />
          </mesh>
        )),
      )}
      {[28, 80].map((y) =>
        [-1, 1].map((side) => (
          <mesh key={`band-${y}-${side}`} position={[side * 12.15, y, 0]}>
            <boxGeometry args={[0.45, 1.2, 40]} />
            <meshStandardMaterial color="#243040" metalness={0.4} roughness={0.4} />
          </mesh>
        )),
      )}
      <mesh position={[0, 109.2, 0]}>
        <boxGeometry args={[16, 2.4, 32]} />
        <meshStandardMaterial color="#d7b056" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[-4.5, 111.6, 6]}>
        <boxGeometry args={[6, 3.2, 8]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[5, 111.2, -7]}>
        <boxGeometry args={[5, 2.6, 6]} />
        <meshStandardMaterial color="#8b9198" metalness={0.4} roughness={0.42} />
      </mesh>
      <mesh position={[-7.2, 122, 8]}>
        <cylinderGeometry args={[0.28, 0.38, 22, 8]} />
        <meshStandardMaterial color="#d8dde2" metalness={0.55} roughness={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={`stripe-${i}`} position={[-7.2, 113.5 + i * 3.6, 8]}>
          <cylinderGeometry args={[0.3, 0.3, 1.7, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#d92b2b" : "#f4f4f4"} />
        </mesh>
      ))}
      <mesh position={[11.6, 98, -6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[14, 3.6]} />
        <meshBasicMaterial map={logo} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export function InstancedForest({ items }: { items: { x: number; z: number; s: number }[] }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const leafA = useRef<THREE.InstancedMesh>(null);
  const leafB = useRef<THREE.InstancedMesh>(null);

  const write = (mesh: THREE.InstancedMesh | null, y: number, ox = 0, oz = 0, sc = 1) => {
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(item.x + ox * item.s, y * item.s, item.z + oz * item.s);
      dummy.scale.setScalar(item.s * sc);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    write(trunk.current, 1.1);
    write(leafA.current, 2.8);
    write(leafB.current, 3.3, 0.35, 0.2, 0.78);
  }, [items]);

  return (
    <>
      <instancedMesh
        ref={(node) => {
          trunk.current = node;
          write(node, 1.1);
        }}
        args={[undefined, undefined, items.length]}
      >
        <cylinderGeometry args={[0.18, 0.28, 2.2, 7]} />
        <meshStandardMaterial color="#5a3a1c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={(node) => {
          leafA.current = node;
          write(node, 2.8);
        }}
        args={[undefined, undefined, items.length]}
      >
        <sphereGeometry args={[1.55, 9, 7]} />
        <meshStandardMaterial color="#2c6f38" roughness={0.82} />
      </instancedMesh>
      <instancedMesh
        ref={(node) => {
          leafB.current = node;
          write(node, 3.3, 0.35, 0.2, 0.78);
        }}
        args={[undefined, undefined, items.length]}
      >
        <sphereGeometry args={[1.2, 8, 6]} />
        <meshStandardMaterial color="#348244" roughness={0.82} />
      </instancedMesh>
    </>
  );
}

export function IronFence({ items }: { items: { x: number; y: number; z: number; yaw: number }[] }) {
  const post = useRef<THREE.InstancedMesh>(null);
  const rail = useRef<THREE.InstancedMesh>(null);
  const railLow = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(item.x, item.y + 0.62, item.z);
      dummy.rotation.set(0, item.yaw, 0);
      dummy.updateMatrix();
      post.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(item.x, item.y + 1.08, item.z);
      dummy.updateMatrix();
      rail.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(item.x, item.y + 0.42, item.z);
      dummy.updateMatrix();
      railLow.current?.setMatrixAt(i, dummy.matrix);
    });
    if (post.current) post.current.instanceMatrix.needsUpdate = true;
    if (rail.current) rail.current.instanceMatrix.needsUpdate = true;
    if (railLow.current) railLow.current.instanceMatrix.needsUpdate = true;
  }, [items]);

  return (
    <>
      <instancedMesh ref={post} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.035, 1.22, 0.035]} />
        <meshStandardMaterial color="#3a3d41" metalness={0.65} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={rail} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.03, 0.035, 0.55]} />
        <meshStandardMaterial color="#4b5056" metalness={0.6} roughness={0.32} />
      </instancedMesh>
      <instancedMesh ref={railLow} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.03, 0.035, 0.55]} />
        <meshStandardMaterial color="#4b5056" metalness={0.6} roughness={0.32} />
      </instancedMesh>
    </>
  );
}

export function Guardrail({ items }: { items: { x: number; y: number; z: number; yaw: number }[] }) {
  const post = useRef<THREE.InstancedMesh>(null);
  const beam = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(item.x, item.y + 0.42, item.z);
      dummy.rotation.set(0, item.yaw, 0);
      dummy.updateMatrix();
      post.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(item.x, item.y + 0.72, item.z);
      dummy.updateMatrix();
      beam.current?.setMatrixAt(i, dummy.matrix);
    });
    if (post.current) post.current.instanceMatrix.needsUpdate = true;
    if (beam.current) beam.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <>
      <instancedMesh ref={post} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.08, 0.84, 0.08]} />
        <meshStandardMaterial color="#8e9398" metalness={0.7} roughness={0.32} />
      </instancedMesh>
      <instancedMesh ref={beam} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.06, 0.22, 2.4]} />
        <meshStandardMaterial color="#b8bcc0" metalness={0.75} roughness={0.28} />
      </instancedMesh>
    </>
  );
}

export function StreetLamps({ items }: { items: { x: number; y: number; z: number; yaw: number }[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(item.x, item.y + 4.2, item.z);
      dummy.rotation.set(0, item.yaw, 0);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]}>
      <cylinderGeometry args={[0.06, 0.08, 8.4, 6]} />
      <meshStandardMaterial color="#dfe3e6" metalness={0.55} roughness={0.3} />
    </instancedMesh>
  );
}

export function NationalAssembly({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[38, 12, 18]} />
        <meshStandardMaterial color="#e8e2d2" roughness={0.7} />
      </mesh>
      <mesh position={[0, 13.2, 0]}>
        <cylinderGeometry args={[5.5, 5.5, 2.2, 16]} />
        <meshStandardMaterial color="#f2eee4" />
      </mesh>
      {[-14, -7, 0, 7, 14].map((x) => (
        <mesh key={x} position={[x, 4.2, 9.2]}>
          <boxGeometry args={[2.2, 8.2, 0.4]} />
          <meshStandardMaterial color="#ddd6c6" />
        </mesh>
      ))}
    </group>
  );
}

export function YeouinaruPark({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.03, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[42, 36]} />
        <meshStandardMaterial color="#c6c3bb" roughness={0.95} />
      </mesh>
      {[-8, 0, 8, 16].map((z) =>
        [-10, 2, 14].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5.2, 2.4]} />
            <meshStandardMaterial color="#b7c08a" roughness={1} />
          </mesh>
        )),
      )}
      {[-12, -4, 4, 12, 18].map((z, i) => (
        <mesh key={`lamp${z}`} position={[-6 + (i % 2) * 10, 3.4, z]}>
          <cylinderGeometry args={[0.05, 0.07, 6.8, 6]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} />
        </mesh>
      ))}
      {[-6, 2, 10].map((z) => (
        <mesh key={`bench${z}`} position={[8, 0.28, z]}>
          <boxGeometry args={[1.8, 0.32, 0.42]} />
          <meshStandardMaterial color="#ececec" />
        </mesh>
      ))}
      <mesh position={[-14, 1.1, 4]}>
        <boxGeometry args={[2.4, 2.2, 2.4]} />
        <meshStandardMaterial color="#4a3428" />
      </mesh>
      {[-16, -8, 0, 8].map((x, i) => (
        <group key={x} position={[x, 0, 18 + (i % 2) * 3]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 1.6, 6]} />
            <meshStandardMaterial color="#5c3b1d" />
          </mesh>
          <mesh position={[0, 2.1, 0]}>
            <sphereGeometry args={[1.05, 8, 6]} />
            <meshStandardMaterial color="#3a6b3c" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
