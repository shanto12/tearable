/**
 * Renders the three "pages" as offscreen canvas textures. Each page is a
 * different editorial layout. Drawn entirely with Canvas2D.
 */

interface Palette {
  ink: string;
  dim: string;
  faint: string;
  accent: string;
}

interface TopBarOpts {
  ink: string;
  dim: string;
  accent: string;
  label: string;
  vol: string;
  status: string;
  view: string;
}

interface SidebarItem {
  num?: string;
  text: string;
}

interface SidebarSpec {
  label: string;
  items: SidebarItem[];
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function drawTopBar(
  ctx: CanvasRenderingContext2D,
  W: number,
  _H: number,
  opts: TopBarOpts,
): void {
  const { ink, dim, accent, label, vol, status, view } = opts;
  ctx.save();
  ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = "top";

  // Left
  ctx.fillStyle = ink;
  ctx.fillText("№ 001", 36, 28);
  ctx.fillStyle = dim;
  ctx.fillText(label, 90, 28);
  ctx.fillStyle = ink;
  ctx.fillText("VOL", 200, 28);
  ctx.fillStyle = dim;
  ctx.fillText(vol, 232, 28);

  // Center
  const cw = ctx.measureText(status).width;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W / 2 - cw / 2 - 14, 33, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W / 2 + cw / 2 + 14, 33, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillText(status, W / 2 - cw / 2, 28);

  // Right
  ctx.textAlign = "right";
  ctx.fillStyle = ink;
  ctx.fillText(view, W - 36, 28);
  ctx.fillStyle = dim;
  ctx.fillText(
    "VIEW",
    W -
      36 -
      ctx.measureText(view).width -
      8 -
      ctx.measureText("VIEW").width,
    28,
  );
  ctx.restore();
}

function drawCornerTicks(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const s = 14;
  const m = 16;
  ctx.beginPath();
  ctx.moveTo(m, m + s);
  ctx.lineTo(m, m);
  ctx.lineTo(m + s, m);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - m - s, m);
  ctx.lineTo(W - m, m);
  ctx.lineTo(W - m, m + s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(m, H - m - s);
  ctx.lineTo(m, H - m);
  ctx.lineTo(m + s, H - m);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - m - s, H - m);
  ctx.lineTo(W - m, H - m);
  ctx.lineTo(W - m, H - m - s);
  ctx.stroke();
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineH;
  }
  return cy;
}

function drawSidebar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  items: SidebarSpec,
  palette: Palette,
): void {
  const { ink, dim, accent } = palette;
  ctx.save();
  ctx.textBaseline = "top";
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = ink;
  ctx.fillText(items.label.toUpperCase(), x, y);
  ctx.strokeStyle = dim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 22);
  ctx.lineTo(x + w, y + 22);
  ctx.stroke();
  let cy = y + 38;
  ctx.font = '400 12px "JetBrains Mono", monospace';
  ctx.fillStyle = dim;
  for (const item of items.items) {
    if (item.num) {
      ctx.font = 'italic 400 26px "Instrument Serif", serif';
      ctx.fillStyle = accent;
      ctx.fillText(item.num, x, cy - 4);
      ctx.font = '400 12px "JetBrains Mono", monospace';
      ctx.fillStyle = dim;
    }
    cy = wrapText(
      ctx,
      item.text,
      x + (item.num ? 36 : 0),
      cy,
      w - (item.num ? 36 : 0),
      18,
    );
    cy += 14;
  }
  ctx.restore();
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  opts: { ink: string; dim: string; label: string },
): void {
  const { ink, dim, label } = opts;
  ctx.save();
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.textBaseline = "bottom";
  ctx.strokeStyle = dim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, H - 60);
  ctx.lineTo(W - 36, H - 60);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.fillText(label, 36, H - 28);
  ctx.textAlign = "right";
  ctx.fillText("— pull a thread —", W - 36, H - 28);
  ctx.restore();
}

function drawNoise(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  alpha: number,
): void {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    d[i] = Math.max(0, Math.min(255, d[i]! + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
}

/** PAGE 1 — dark warm editorial. */
export function renderPage1(W: number, H: number): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d")!;
  const ink = "#ece7dc";
  const dim = "rgba(236, 231, 220, 0.55)";
  const faint = "rgba(236, 231, 220, 0.18)";
  const accent = "#e8a35a";

  const g = ctx.createRadialGradient(
    W / 2,
    H * 0.4,
    100,
    W / 2,
    H * 0.5,
    Math.max(W, H),
  );
  g.addColorStop(0, "#1c1d22");
  g.addColorStop(1, "#0c0d10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  drawNoise(ctx, W, H, 0.03);

  drawCornerTicks(ctx, W, H, faint);
  drawTopBar(ctx, W, H, {
    ink,
    dim,
    accent,
    label: "Tearable",
    vol: "cloth",
    status: "LIVE · VERLET PHYSICS",
    view: "1.0",
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillStyle = dim;
  ctx.fillText(
    "AN INTERACTIVE STUDY IN THREE PARTS",
    W / 2,
    Math.max(H * 0.16, 110),
  );

  const titleSize = Math.min(280, Math.max(140, W * 0.16));
  ctx.font = `400 ${titleSize}px "Instrument Serif", "Times New Roman", serif`;
  ctx.fillStyle = ink;
  const t1 = "Tear";
  const t2 = "able";
  const m1 = ctx.measureText(t1).width;
  ctx.font = `italic 400 ${titleSize}px "Instrument Serif", serif`;
  const m2 = ctx.measureText(t2).width;
  const totalW = m1 + m2;
  const tx = W / 2 - totalW / 2;
  const ty = Math.max(H * 0.21, 150);
  ctx.textAlign = "left";
  ctx.font = `400 ${titleSize}px "Instrument Serif", serif`;
  ctx.fillStyle = ink;
  ctx.fillText(t1, tx, ty);
  ctx.font = `italic 400 ${titleSize}px "Instrument Serif", serif`;
  ctx.fillStyle = accent;
  ctx.fillText(t2, tx + m1, ty);

  ctx.textAlign = "center";
  ctx.font = 'italic 400 22px "Instrument Serif", serif';
  ctx.fillStyle = dim;
  ctx.fillText(
    "Pull a thread, and the whole world bends.",
    W / 2,
    ty + titleSize * 0.95,
  );
  ctx.fillText(
    "Pull harder, and it comes apart in your hands.",
    W / 2,
    ty + titleSize * 0.95 + 30,
  );

  drawSidebar(
    ctx,
    36,
    H * 0.55,
    240,
    {
      label: "On the method",
      items: [
        {
          num: "01",
          text: "Each intersection is a point with mass and the memory of where it was a moment ago.",
        },
        {
          num: "02",
          text: "The threads between them are spring constraints, resolved many times per frame.",
        },
        {
          num: "03",
          text: "When a thread is stretched too far, it lets go — quietly, irreversibly.",
        },
      ],
    },
    { ink, dim, faint, accent },
  );

  ctx.save();
  ctx.translate(W - 36 - 240, 0);
  drawSidebar(
    ctx,
    0,
    H * 0.55,
    240,
    {
      label: "House rules",
      items: [
        {
          text: "Drag with care. The fabric remembers every hand that has touched it.",
        },
        {
          text: "Right-click to tear. Hold shift to make a clean incision.",
        },
        {
          text: "Tear all the way through to find what hides beneath.",
        },
      ],
    },
    { ink, dim, faint, accent },
  );
  ctx.restore();

  drawFooter(ctx, W, H, { ink, dim, label: "PAGE I · OF III" });
  return c;
}

/** PAGE 2 — oxblood meditation. */
export function renderPage2(W: number, H: number): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d")!;
  const ink = "#f3e7d8";
  const dim = "rgba(243, 231, 216, 0.55)";
  const faint = "rgba(243, 231, 216, 0.2)";
  const accent = "#f0a96a";

  const g = ctx.createRadialGradient(
    W * 0.7,
    H * 0.3,
    100,
    W / 2,
    H / 2,
    Math.max(W, H),
  );
  g.addColorStop(0, "#5a1f20");
  g.addColorStop(1, "#2a0d10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  drawNoise(ctx, W, H, 0.04);

  drawCornerTicks(ctx, W, H, faint);
  drawTopBar(ctx, W, H, {
    ink,
    dim,
    accent,
    label: "Beneath",
    vol: "inner",
    status: "CHAPTER II · WHAT REMAINS",
    view: "1.0",
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const numSize = Math.min(420, W * 0.32);
  ctx.font = `italic 400 ${numSize}px "Instrument Serif", serif`;
  ctx.fillStyle = "rgba(243, 231, 216, 0.08)";
  ctx.fillText("II", 40, H * 0.18);

  ctx.fillStyle = ink;
  ctx.font = `400 ${Math.min(120, W * 0.075)}px "Instrument Serif", serif`;
  ctx.fillText("What lies", W * 0.34, H * 0.28);
  ctx.font = `italic 400 ${Math.min(120, W * 0.075)}px "Instrument Serif", serif`;
  ctx.fillStyle = accent;
  ctx.fillText("beneath", W * 0.34, H * 0.28 + Math.min(120, W * 0.075) * 0.95);

  ctx.font = 'italic 400 22px "Instrument Serif", serif';
  const bodyX = W * 0.34;
  const bodyY = H * 0.55;
  const bodyW = Math.min(560, W * 0.4);
  ctx.fillStyle = ink;
  let cy = bodyY;
  cy = wrapText(
    ctx,
    "Every surface is a story written over an older one.",
    bodyX,
    cy,
    bodyW,
    30,
  );
  cy += 14;
  ctx.fillStyle = dim;
  wrapText(
    ctx,
    "Tear it open and the past is still there, patient, waiting for daylight again. Keep going.",
    bodyX,
    cy,
    bodyW,
    30,
  );

  ctx.textAlign = "right";
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = dim;
  ctx.fillText("— continue tearing —", W - 40, H * 0.5);

  drawFooter(ctx, W, H, { ink, dim, label: "PAGE II · OF III" });
  return c;
}

/** PAGE 3 — warm dawn cream, light theme. */
export function renderPage3(W: number, H: number): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d")!;
  const ink = "#2a201a";
  const dim = "rgba(42, 32, 26, 0.55)";
  const faint = "rgba(42, 32, 26, 0.18)";
  const accent = "#c2603a";

  const g = ctx.createRadialGradient(
    W * 0.5,
    H * 0.4,
    100,
    W / 2,
    H / 2,
    Math.max(W, H),
  );
  g.addColorStop(0, "#f4e9d4");
  g.addColorStop(1, "#dcc6a6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  drawNoise(ctx, W, H, 0.06);

  drawCornerTicks(ctx, W, H, faint);
  drawTopBar(ctx, W, H, {
    ink,
    dim,
    accent,
    label: "Bedrock",
    vol: "final",
    status: "CHAPTER III · STILLNESS",
    view: "1.0",
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillStyle = dim;
  ctx.fillText("THE LAST PAGE", W / 2, H * 0.36);

  const titleSize = Math.min(220, W * 0.13);
  ctx.font = `400 ${titleSize}px "Instrument Serif", serif`;
  ctx.fillStyle = ink;
  ctx.fillText("Mend.", W / 2 - titleSize * 0.05, H * 0.5);
  ctx.fillStyle = accent;
  ctx.beginPath();
  const dotX = W / 2 + ctx.measureText("Mend").width / 2 + 12;
  ctx.arc(dotX, H * 0.5 + titleSize * 0.32, titleSize * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'italic 400 22px "Instrument Serif", serif';
  ctx.fillStyle = dim;
  ctx.fillText(
    "Nothing here is saved. Refresh to begin again.",
    W / 2,
    H * 0.62,
  );

  ctx.strokeStyle = faint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, H * 0.68);
  ctx.lineTo(W / 2 + 60, H * 0.68);
  ctx.stroke();

  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = dim;
  ctx.fillText("THANK YOU FOR PULLING", W / 2, H * 0.72);

  drawFooter(ctx, W, H, { ink, dim, label: "PAGE III · OF III" });
  return c;
}
