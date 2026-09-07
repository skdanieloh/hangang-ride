import * as THREE from "three";

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function asphaltTexture() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#4a4d52";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const n = 40 + Math.random() * 30;
      ctx.fillStyle = `rgb(${n},${n},${n + 3})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  });
}

export function grassTexture() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#3f7a38";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#4e8d44" : "#356832";
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 6);
    }
  });
}

export function waterTexture() {
  return canvasTex(256, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, "#2f6f92");
    g.addColorStop(0.5, "#3b86a8");
    g.addColorStop(1, "#2a6284");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(220,240,255,0.18)";
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 14);
      ctx.quadraticCurveTo(128, i * 14 + 8, 256, i * 14);
      ctx.stroke();
    }
  });
}

export function goldGlassTexture() {
  return canvasTex(256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 180, 512);
    g.addColorStop(0, "#f3d48a");
    g.addColorStop(0.22, "#e0b45a");
    g.addColorStop(0.55, "#c99238");
    g.addColorStop(0.82, "#d4a44a");
    g.addColorStop(1, "#f0c56e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    for (let y = 3; y < 512; y += 8) {
      for (let x = 2; x < 256; x += 7) {
        ctx.fillStyle = (x + y) % 14 < 7 ? "rgba(255, 228, 160, 0.32)" : "rgba(120, 78, 18, 0.18)";
        ctx.fillRect(x, y, 5.2, 6.2);
      }
    }
    ctx.fillStyle = "rgba(70, 48, 12, 0.38)";
    for (let y = 2; y < 512; y += 8) ctx.fillRect(0, y, 256, 0.8);
    for (let x = 1; x < 256; x += 7) ctx.fillRect(x, 0, 0.8, 512);
  });
}

export function hanwhaLogoTexture() {
  const tex = canvasTex(512, 160, (ctx) => {
    ctx.clearRect(0, 0, 512, 160);
    ctx.fillStyle = "#f47b20";
    const cx = 72;
    const cy = 80;
    (
      [
        [0, -18],
        [-20, 14],
        [20, 14],
      ] as const
    ).forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(cx + x, cy + y, 22, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#1c1c1c";
    ctx.font = "bold 70px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Hanwha", 128, 84);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function officeTexture() {
  return canvasTex(256, 512, (ctx) => {
    ctx.fillStyle = "#7d838c";
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "#d7e4f0";
    for (let y = 14; y < 500; y += 22) {
      for (let x = 10; x < 246; x += 18) {
        if (Math.random() > 0.15) ctx.fillRect(x, y, 12, 14);
      }
    }
  });
}

export function apartmentTexture() {
  return canvasTex(256, 512, (ctx) => {
    ctx.fillStyle = "#d8cbb8";
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "#8eb4c8";
    for (let y = 16; y < 500; y += 20) {
      for (let x = 12; x < 246; x += 16) {
        ctx.fillRect(x, y, 10, 12);
      }
    }
    ctx.fillStyle = "rgba(90,70,50,0.18)";
    for (let y = 8; y < 512; y += 20) ctx.fillRect(0, y, 256, 1);
  });
}

export function plazaTexture() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#c5c2bb";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#b4b0a8";
    ctx.lineWidth = 2;
    for (let y = 0; y <= 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    for (let x = 0; x <= 256; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  });
}

export function concreteTexture() {
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = "#8b8f94";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 200; i++) {
      const n = 120 + Math.random() * 40;
      ctx.fillStyle = `rgb(${n},${n},${n})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 3, 3);
    }
  });
}
