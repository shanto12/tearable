/**
 * Main app: 3 stacked layers, mouse handling, render loop.
 *
 * The whole site is the cloth — three editorial pages stacked as independent
 * verlet meshes. Tearing through page I reveals page II, and so on.
 */

import { Layer } from "./physics.ts";
import { renderPage1, renderPage2, renderPage3 } from "./pages.ts";

const CONFIG = {
  spacing: 44,
  mouseInfluence: 36,
  mouseTear: 22,
  mouseCut: 9,
} as const;

interface MouseState {
  x: number;
  y: number;
  px: number;
  py: number;
  down: boolean;
  button: number;
  shift: boolean;
  inCanvas: boolean;
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let DPR = 1;
let W = 0;
let H = 0;
let layers: Layer[] = [];
let totalTears = 0;

const mouse: MouseState = {
  x: -9999,
  y: -9999,
  px: -9999,
  py: -9999,
  down: false,
  button: 0,
  shift: false,
  inCanvas: true,
};

function resize(): void {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function buildLayers(): void {
  const cols = Math.ceil(W / CONFIG.spacing) + 1;
  const rows = Math.ceil(H / CONFIG.spacing) + 1;
  const startX = (W - (cols - 1) * CONFIG.spacing) / 2;
  const startY = (H - (rows - 1) * CONFIG.spacing) / 2;

  const t1 = renderPage1(W, H);
  const t2 = renderPage2(W, H);
  const t3 = renderPage3(W, H);

  layers = [
    new Layer({ cols, rows, spacing: CONFIG.spacing, startX, startY, texture: t1 }),
    new Layer({ cols, rows, spacing: CONFIG.spacing, startX, startY, texture: t2 }),
    new Layer({ cols, rows, spacing: CONFIG.spacing, startX, startY, texture: t3 }),
  ];
  totalTears = 0;
  updateChrome();
}

function activeLayerForMouse(): Layer | null {
  for (const layer of layers) {
    if (layer.hasIntactNear(mouse.x, mouse.y, CONFIG.mouseInfluence * 1.5))
      return layer;
  }
  return null;
}

function applyMouse(): void {
  if (!mouse.down || !mouse.inCanvas) return;
  const layer = activeLayerForMouse();
  if (!layer) return;
  const dx = mouse.x - mouse.px;
  const dy = mouse.y - mouse.py;
  if (mouse.button === 0 && !mouse.shift) {
    layer.drag(mouse.x, mouse.y, dx, dy, CONFIG.mouseInfluence);
  } else if (mouse.button === 2 || mouse.shift) {
    const r = mouse.shift ? CONFIG.mouseCut : CONFIG.mouseTear;
    totalTears += layer.tear(mouse.x, mouse.y, r);
  }
}

/** Affine textured triangle — maps texture (sx,sy) coords to dest (dx,dy). */
function drawTexTri(
  tex: HTMLCanvasElement,
  sx0: number, sy0: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number,
  dx0: number, dy0: number,
  dx1: number, dy1: number,
  dx2: number, dy2: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dx0, dy0);
  ctx.lineTo(dx1, dy1);
  ctx.lineTo(dx2, dy2);
  ctx.closePath();
  ctx.clip();

  const ux = sx1 - sx0,
    uy = sy1 - sy0;
  const vx = sx2 - sx0,
    vy = sy2 - sy0;
  const Ux = dx1 - dx0,
    Uy = dy1 - dy0;
  const Vx = dx2 - dx0,
    Vy = dy2 - dy0;
  const det = ux * vy - uy * vx;
  if (Math.abs(det) < 0.001) {
    ctx.restore();
    return;
  }
  const idet = 1 / det;
  const a = (Ux * vy - Vx * uy) * idet;
  const b = (Uy * vy - Vy * uy) * idet;
  const c = (Vx * ux - Ux * vx) * idet;
  const d = (Vy * ux - Uy * vx) * idet;
  const e = dx0 - a * sx0 - c * sy0;
  const f = dy0 - b * sx0 - d * sy0;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(tex, 0, 0);
  ctx.restore();
}

function renderLayer(layer: Layer): void {
  for (const cell of layer.cells) {
    if (!cell.cTop || !cell.cBottom || !cell.cLeft || !cell.cRight) continue;
    if (
      !cell.cTop.alive ||
      !cell.cBottom.alive ||
      !cell.cLeft.alive ||
      !cell.cRight.alive
    )
      continue;
    const { p00, p10, p11, p01 } = cell;
    drawTexTri(
      layer.texture,
      p00.u, p00.v, p10.u, p10.v, p11.u, p11.v,
      p00.x, p00.y, p10.x, p10.y, p11.x, p11.y,
    );
    drawTexTri(
      layer.texture,
      p00.u, p00.v, p11.u, p11.v, p01.u, p01.v,
      p00.x, p00.y, p11.x, p11.y, p01.x, p01.y,
    );
  }
}

function drawCursor(): void {
  if (!mouse.inCanvas) return;
  const isCut = mouse.shift || (mouse.down && mouse.button === 2);
  const r = mouse.shift
    ? CONFIG.mouseCut
    : mouse.down && mouse.button === 2
      ? CONFIG.mouseTear
      : CONFIG.mouseInfluence;
  ctx.strokeStyle = isCut
    ? "oklch(0.78 0.14 65 / 0.9)"
    : "rgba(236, 231, 220, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mouse.x - 6, mouse.y);
  ctx.lineTo(mouse.x + 6, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 6);
  ctx.lineTo(mouse.x, mouse.y + 6);
  ctx.stroke();
}

let lastFrame = performance.now();
let fpsAcc = 0;
let fpsN = 0;
let fpsLast = lastFrame;
function fps(now: number): void {
  const dt = now - lastFrame;
  lastFrame = now;
  fpsAcc += 1000 / Math.max(dt, 1);
  fpsN++;
  if (now - fpsLast > 500) {
    const el = document.getElementById("fps");
    if (el) el.textContent = String(Math.round(fpsAcc / fpsN));
    fpsAcc = 0;
    fpsN = 0;
    fpsLast = now;
  }
}

function updateChrome(): void {
  const live = layers.reduce((s, l) => s + l.liveLinks(), 0);
  const lks = document.getElementById("lks");
  const trn = document.getElementById("trn");
  const layerEl = document.getElementById("layer");
  if (lks) lks.textContent = live.toLocaleString();
  if (trn) trn.textContent = totalTears.toLocaleString();
  let layerNum = 1;
  for (let i = 0; i < layers.length; i++) {
    const total = layers[i]!.cells.length * 4;
    const alive = layers[i]!.liveLinks();
    if (alive > total * 0.05) {
      layerNum = i + 1;
      break;
    }
    layerNum = Math.min(i + 2, layers.length);
  }
  if (layerEl) layerEl.textContent = `${layerNum} / 3`;
}

function loop(now: number): void {
  fps(now);
  applyMouse();
  for (const layer of layers) layer.step(W, H);
  ctx.fillStyle = "#080a0d";
  ctx.fillRect(0, 0, W, H);
  // Draw bottom-up so the top layer paints last.
  for (let i = layers.length - 1; i >= 0; i--) renderLayer(layers[i]!);
  drawCursor();
  updateChrome();
  requestAnimationFrame(loop);
}

function setMouse(e: MouseEvent): void {
  mouse.px = mouse.x;
  mouse.py = mouse.y;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.inCanvas = true;
}

function isChromeTarget(target: EventTarget | null): boolean {
  return !!(target instanceof Element && target.closest("button, a, input"));
}

window.addEventListener("mousemove", setMouse);
window.addEventListener("mousedown", (e) => {
  if (isChromeTarget(e.target)) return;
  setMouse(e);
  mouse.down = true;
  mouse.button = e.button;
  document.getElementById("hint")?.classList.add("gone");
});
window.addEventListener("mouseup", () => {
  mouse.down = false;
});
window.addEventListener("contextmenu", (e) => {
  if (isChromeTarget(e.target)) return;
  e.preventDefault();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Shift") mouse.shift = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "Shift") mouse.shift = false;
});

function setTouch(e: TouchEvent): void {
  const t = e.touches[0];
  if (!t) return;
  mouse.px = mouse.x;
  mouse.py = mouse.y;
  mouse.x = t.clientX;
  mouse.y = t.clientY;
  mouse.inCanvas = true;
}
window.addEventListener(
  "touchstart",
  (e) => {
    if (isChromeTarget(e.target)) return;
    setTouch(e);
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    mouse.down = true;
    mouse.button = e.touches.length > 1 ? 2 : 0;
    document.getElementById("hint")?.classList.add("gone");
    e.preventDefault();
  },
  { passive: false },
);
window.addEventListener(
  "touchmove",
  (e) => {
    setTouch(e);
    e.preventDefault();
  },
  { passive: false },
);
window.addEventListener("touchend", () => {
  mouse.down = false;
});

document.getElementById("reset")?.addEventListener("click", () => {
  buildLayers();
  document.getElementById("hint")?.classList.remove("gone");
});
document.getElementById("drop")?.addEventListener("click", () => {
  for (const l of layers) l.unpinAll();
});

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener("resize", () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resize();
    buildLayers();
  }, 150);
});

function tick(): void {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const el = document.getElementById("clock");
  if (el) el.textContent = `${hh}:${mm}`;
}
tick();
setInterval(tick, 30000);

resize();
if (document.fonts && document.fonts.ready) {
  void document.fonts.ready.then(() => {
    buildLayers();
    requestAnimationFrame(loop);
  });
} else {
  buildLayers();
  requestAnimationFrame(loop);
}
