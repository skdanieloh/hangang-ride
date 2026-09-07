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
    ctx.fillStyle = "#c9a24a";
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "rgba(255,230,150,0.28)";
    for (let y = 8; y < 512; y += 18) {
      for (let x = 6; x < 256; x += 16) {
        ctx.fillRect(x, y, 12, 14);
      }
    }
    ctx.fillStyle = "rgba(80,60,20,0.25)";
    for (let y = 6; y < 512; y += 18) ctx.fillRect(0, y, 256, 1);
    for (let x = 4; x < 256; x += 16) ctx.fillRect(x, 0, 1, 512);
  });
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
