/**
 * The three "pages" in this experience are full real-world site mockups,
 * each rendered to an offscreen canvas and then mapped onto the verlet mesh:
 *
 *   PAGE I  —  MERIDIAN   editorial / newspaper homepage   (deep ink, amber)
 *   PAGE II —  ATELIER    wine merchant product detail     (oxblood, cream)
 *   PAGE III —  LUMEN     SaaS observability landing       (paper, terracotta)
 *
 * Different palettes, different layouts, but real layouts you'd actually ship.
 * Drawn entirely with Canvas2D — no DOM, no images, no external assets.
 */

interface Palette {
  bg0: string;
  bg1: string;
  surface: string;
  ink: string;
  dim: string;
  faint: string;
  hair: string;
  accent: string;
  accent2: string;
}

// ---------------------------------------------------------------------------
// shared primitives

const SERIF = '"Instrument Serif", "Times New Roman", Times, serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hairline(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1 + 0.5, y1 + 0.5);
  ctx.lineTo(x2 + 0.5, y2 + 0.5);
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
  maxLines = 99,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      lines++;
      cy += lineH;
      line = word;
      if (lines >= maxLines - 1) {
        // last line — append ellipsis if more words remain
        const remaining = words.slice(i).join(" ");
        let truncated = remaining;
        while (
          truncated.length > 0 &&
          ctx.measureText(truncated + "…").width > maxW
        ) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "…", x, cy);
        return cy + lineH;
      }
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
    d[i] = clamp(d[i]! + n, 0, 255);
    d[i + 1] = clamp(d[i + 1]! + n, 0, 255);
    d[i + 2] = clamp(d[i + 2]! + n, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
}

interface ImageBlockOpts {
  c1: string;
  c2: string;
  tint?: string;
  label?: string;
  labelInk?: string;
  caption?: string;
  captionInk?: string;
  bandColor?: string;
  bands?: number;
  duotone?: boolean;
}

function drawImageBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  o: ImageBlockOpts,
): void {
  const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, o.c1);
  g.addColorStop(1, o.c2);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // diagonal "subject" mass — just enough geometry to read as a photograph
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, y + h);
  ctx.bezierCurveTo(
    x + w * 0.32,
    y + h * 0.4,
    x + w * 0.55,
    y + h * 0.25,
    x + w * 0.78,
    y + h * 0.55,
  );
  ctx.lineTo(x + w * 0.95, y + h * 0.85);
  ctx.lineTo(x + w * 0.95, y + h);
  ctx.closePath();
  ctx.fillStyle = o.tint ?? "rgba(0, 0, 0, 0.32)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + w * 0.7, y + h * 0.36, Math.min(w, h) * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = o.tint ?? "rgba(255, 255, 255, 0.18)";
  ctx.fill();
  ctx.restore();

  if (o.bands && o.bands > 0) {
    ctx.save();
    ctx.strokeStyle = o.bandColor ?? "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= o.bands; i++) {
      const ly = y + (h * i) / (o.bands + 1);
      ctx.beginPath();
      ctx.moveTo(x, ly + 0.5);
      ctx.lineTo(x + w, ly + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (o.label) {
    ctx.save();
    ctx.font = `500 10px ${MONO}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = o.labelInk ?? "rgba(255,255,255,0.78)";
    ctx.fillText(o.label, x + 12, y + 12);
    ctx.restore();
  }
  if (o.caption) {
    ctx.save();
    ctx.font = `500 10px ${MONO}`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillStyle = o.captionInk ?? "rgba(255,255,255,0.7)";
    ctx.fillText(o.caption, x + 12, y + h - 12);
    ctx.restore();
  }
}

function drawPillButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  opts: { fill: string; ink: string; ghost?: boolean; stroke?: string },
): void {
  ctx.save();
  if (opts.ghost) {
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, h / 2);
    ctx.strokeStyle = opts.stroke ?? opts.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = opts.fill;
    ctx.fill();
  }
  ctx.fillStyle = opts.ink;
  ctx.font = `500 12px ${MONO}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}

// ===========================================================================
// PAGE I — MERIDIAN  (newspaper homepage, dark)
// ===========================================================================

export function renderPage1(W: number, H: number): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d")!;
  const p: Palette = {
    bg0: "#0d0e11",
    bg1: "#16181d",
    surface: "#1a1c22",
    ink: "#ece7dc",
    dim: "rgba(236, 231, 220, 0.62)",
    faint: "rgba(236, 231, 220, 0.28)",
    hair: "rgba(236, 231, 220, 0.14)",
    accent: "#e8a35a",
    accent2: "#c5482e",
  };

  // background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.bg1);
  g.addColorStop(1, p.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const margin = clamp(W * 0.045, 36, 96);
  const inner = W - margin * 2;

  // ---- utility strip
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(
    "TUESDAY, MAY 9 · LONDON · 14°C, OVERCAST",
    margin,
    18,
  );
  ctx.textAlign = "right";
  ctx.fillText(
    "MARKETS OPEN · USD 1.272 · BTC 64,318 · BRENT 78.4",
    W - margin,
    18,
  );
  ctx.restore();
  hairline(ctx, margin, 32, W - margin, 32, p.hair);

  // ---- masthead
  const mastY = 42;
  const mastH = clamp(H * 0.085, 64, 110);
  ctx.save();
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("VOL CXLI", margin, mastY + mastH / 2 - 8);
  ctx.fillText("№ 4,219", margin, mastY + mastH / 2 + 8);

  // brand
  ctx.font = `400 ${clamp(W * 0.062, 56, 108)}px ${SERIF}`;
  ctx.fillStyle = p.ink;
  ctx.textAlign = "center";
  ctx.fillText("Meridian", W / 2, mastY + mastH / 2 + 4);

  // right side controls
  const rx = W - margin;
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("ACCOUNT", rx - 96, mastY + mastH / 2);
  drawPillButton(ctx, rx - 88, mastY + mastH / 2 - 14, 88, 28, "SUBSCRIBE", {
    fill: p.accent,
    ink: "#1b1408",
  });
  ctx.restore();

  hairline(ctx, margin, mastY + mastH + 6, W - margin, mastY + mastH + 6, p.hair);

  // ---- section nav
  const navY = mastY + mastH + 30;
  ctx.save();
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.ink;
  ctx.textBaseline = "middle";
  const sections = [
    "WORLD",
    "POLITICS",
    "BUSINESS",
    "TECH",
    "CLIMATE",
    "CULTURE",
    "SPORT",
    "STYLE",
    "OPINION",
  ];
  let totalNavW = 0;
  for (const s of sections) totalNavW += ctx.measureText(s).width;
  const gaps = sections.length - 1;
  const gap = Math.max(28, (inner - totalNavW) / gaps);
  let nx = margin + (inner - (totalNavW + gap * gaps)) / 2;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    ctx.fillStyle = i === 0 ? p.accent : p.dim;
    ctx.textAlign = "left";
    ctx.fillText(s, nx, navY);
    nx += ctx.measureText(s).width + gap;
  }
  ctx.restore();
  hairline(ctx, margin, navY + 16, W - margin, navY + 16, p.hair);

  // ---- main grid: 8/4
  const contentY = navY + 40;
  const heroW = inner * 0.66;
  const sideW = inner - heroW - 36;
  const sideX = margin + heroW + 36;

  // Hero image
  const heroImgH = clamp(H * 0.26, 180, 300);
  drawImageBlock(ctx, margin, contentY, heroW, heroImgH, {
    c1: "#3a2018",
    c2: "#0e0a08",
    tint: "rgba(232, 163, 90, 0.22)",
    bands: 0,
    label: "PHOTOGRAPH · A. KIRSANOV",
    caption:
      "A demonstrator outside the parliament building, Tuesday morning.",
    captionInk: "rgba(255,255,255,0.78)",
  });

  // hero text under image
  let hy = contentY + heroImgH + 24;
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("WORLD · DISPATCH", margin, hy);
  hy += 18;

  ctx.fillStyle = p.ink;
  const headlineSize = clamp(W * 0.032, 26, 48);
  ctx.font = `400 ${headlineSize}px ${SERIF}`;
  hy = wrapText(
    ctx,
    "After three years of silence, the river towns are speaking back.",
    margin,
    hy,
    heroW - 24,
    headlineSize * 1.08,
    3,
  );
  hy += 6;

  ctx.font = `italic 400 ${clamp(W * 0.013, 14, 19)}px ${SERIF}`;
  ctx.fillStyle = p.dim;
  hy = wrapText(
    ctx,
    "What began as a routine planning meeting in a town nobody mentions on the news has become the loudest hearing the region has held in a generation.",
    margin,
    hy,
    heroW - 24,
    clamp(W * 0.013, 14, 19) * 1.45,
    2,
  );
  hy += 8;

  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.faint;
  ctx.fillText(
    "BY  NORA  CHEN   ·   18  MIN  AGO   ·   8  MIN  READ",
    margin,
    hy,
  );
  ctx.restore();

  // ---- right rail: most read
  let sy = contentY;
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.accent;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("MOST READ", sideX, sy);
  ctx.fillStyle = p.dim;
  ctx.textAlign = "right";
  ctx.fillText("LAST 24 H →", sideX + sideW, sy);
  ctx.restore();
  hairline(ctx, sideX, sy + 22, sideX + sideW, sy + 22, p.hair);
  sy += 36;

  const mostRead = [
    "Inside the chip plant where every machine has a name.",
    "Why the ‘soft landing’ may already be behind us.",
    "The new urbanism is just old urbanism with prettier renderings.",
    "A long weekend in Lisbon, told entirely in interruptions.",
    "How a forgotten 1974 paper quietly rewrote modern climate models.",
  ];
  for (let i = 0; i < mostRead.length; i++) {
    ctx.save();
    ctx.font = `italic 400 ${clamp(W * 0.024, 28, 44)}px ${SERIF}`;
    ctx.fillStyle = p.faint;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(String(i + 1).padStart(2, "0"), sideX, sy - 6);

    ctx.font = `400 ${clamp(W * 0.012, 14, 17)}px ${SERIF}`;
    ctx.fillStyle = p.ink;
    const after = wrapText(
      ctx,
      mostRead[i]!,
      sideX + clamp(W * 0.04, 44, 68),
      sy,
      sideW - clamp(W * 0.04, 44, 68),
      clamp(W * 0.012, 14, 17) * 1.35,
      2,
    );
    ctx.font = `500 10px ${MONO}`;
    ctx.fillStyle = p.dim;
    ctx.fillText(
      ["MARKETS", "OPINION", "CITIES", "TRAVEL", "CLIMATE"][i]!,
      sideX + clamp(W * 0.04, 44, 68),
      after + 2,
    );
    ctx.restore();
    sy = after + 26;
    if (i < mostRead.length - 1) {
      hairline(ctx, sideX, sy - 12, sideX + sideW, sy - 12, p.hair);
    }
  }

  // ---- below the fold: 3-up story grid
  const stripY = Math.max(hy, sy) + 28;
  if (stripY < H - 240) {
    hairline(ctx, margin, stripY, W - margin, stripY, p.hair);
    const gridY = stripY + 20;
    const gridGap = 24;
    const colW = (inner - gridGap * 2) / 3;
    const stories: {
      kicker: string;
      headline: string;
      dek: string;
      byline: string;
      img: [string, string];
    }[] = [
      {
        kicker: "BUSINESS",
        headline: "The quiet return of the long lunch.",
        dek: "Inside the firms cutting hours and somehow keeping profit.",
        byline: "M. PADILLA · 2 H",
        img: ["#2a1a14", "#0d0807"],
      },
      {
        kicker: "TECH",
        headline: "What if the model was always supposed to be small?",
        dek: "A new generation of researchers is asking the obvious question.",
        byline: "K. OYELARAN · 4 H",
        img: ["#1a2530", "#080d12"],
      },
      {
        kicker: "CULTURE",
        headline: "The painter who refused, for forty years, to be discovered.",
        dek: "And the studio assistant who quietly broke that promise this spring.",
        byline: "L. AKINOLA · 6 H",
        img: ["#2b2018", "#0a0807"],
      },
    ];
    for (let i = 0; i < 3; i++) {
      const cx = margin + i * (colW + gridGap);
      const story = stories[i]!;
      const imgH = clamp(H * 0.13, 100, 170);
      drawImageBlock(ctx, cx, gridY, colW, imgH, {
        c1: story.img[0],
        c2: story.img[1],
        tint: "rgba(232,163,90,0.16)",
      });
      let cy = gridY + imgH + 14;
      ctx.save();
      ctx.font = `500 10px ${MONO}`;
      ctx.fillStyle = p.accent;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(story.kicker, cx, cy);
      cy += 16;
      ctx.fillStyle = p.ink;
      ctx.font = `400 ${clamp(W * 0.016, 17, 24)}px ${SERIF}`;
      cy = wrapText(
        ctx,
        story.headline,
        cx,
        cy,
        colW,
        clamp(W * 0.016, 17, 24) * 1.15,
        2,
      );
      cy += 4;
      ctx.fillStyle = p.dim;
      ctx.font = `italic 400 13px ${SERIF}`;
      cy = wrapText(ctx, story.dek, cx, cy, colW, 18, 2);
      cy += 6;
      ctx.fillStyle = p.faint;
      ctx.font = `500 10px ${MONO}`;
      ctx.fillText(story.byline, cx, cy);
      ctx.restore();
    }
  }

  // ---- footer
  const footY = H - 56;
  hairline(ctx, margin, footY - 18, W - margin, footY - 18, p.hair);
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("© MERIDIAN MEDIA  ·  EST. 1884  ·  PRIVACY  ·  TERMS", margin, footY);
  ctx.textAlign = "right";
  ctx.fillText("PAGE  I  ·  OF  III", W - margin, footY);
  ctx.restore();

  drawNoise(ctx, W, H, 0.02);
  return c;
}

// ===========================================================================
// PAGE II — ATELIER  (wine merchant product detail page, oxblood)
// ===========================================================================

export function renderPage2(W: number, H: number): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d")!;
  const p: Palette = {
    bg0: "#2c0d10",
    bg1: "#3d1217",
    surface: "#f3e7d8",
    ink: "#f3e7d8",
    dim: "rgba(243, 231, 216, 0.62)",
    faint: "rgba(243, 231, 216, 0.28)",
    hair: "rgba(243, 231, 216, 0.16)",
    accent: "#f0a96a",
    accent2: "#c2603a",
  };

  // background
  const bg = ctx.createRadialGradient(
    W * 0.7,
    H * 0.25,
    100,
    W / 2,
    H / 2,
    Math.max(W, H),
  );
  bg.addColorStop(0, p.bg1);
  bg.addColorStop(1, p.bg0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const margin = clamp(W * 0.05, 40, 110);

  // ---- announcement strip
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(
    "Complimentary shipping on orders over £150  ·  Same-day delivery within Greater London",
    W / 2,
    18,
  );
  ctx.restore();
  hairline(ctx, margin, 32, W - margin, 32, p.hair);

  // ---- nav: left links · centered brand · right utilities
  const navY = 32;
  const navH = clamp(H * 0.085, 64, 100);

  ctx.save();
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const leftLinks = ["SHOP", "JOURNAL", "VINTAGES", "ABOUT"];
  let lx = margin;
  for (let i = 0; i < leftLinks.length; i++) {
    ctx.fillStyle = i === 0 ? p.accent : p.dim;
    ctx.fillText(leftLinks[i]!, lx, navY + navH / 2);
    lx += ctx.measureText(leftLinks[i]!).width + 28;
  }

  // brand
  ctx.font = `italic 400 ${clamp(W * 0.05, 44, 88)}px ${SERIF}`;
  ctx.fillStyle = p.ink;
  ctx.textAlign = "center";
  ctx.fillText("Atelier", W / 2, navY + navH / 2 + 4);

  // right utilities
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textAlign = "right";
  const rightLinks = ["SEARCH", "ACCOUNT", "BAG · 1"];
  let rx = W - margin;
  for (let i = rightLinks.length - 1; i >= 0; i--) {
    ctx.fillStyle = i === rightLinks.length - 1 ? p.ink : p.dim;
    ctx.fillText(rightLinks[i]!, rx, navY + navH / 2);
    rx -= ctx.measureText(rightLinks[i]!).width + 28;
  }
  ctx.restore();
  hairline(
    ctx,
    margin,
    navY + navH + 8,
    W - margin,
    navY + navH + 8,
    p.hair,
  );

  // ---- breadcrumb
  const crumbY = navY + navH + 32;
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(
    "SHOP  /  REDS  /  NORTHERN RHÔNE  /  DOMAINE SAINT-CYR · 2018",
    margin,
    crumbY,
  );
  ctx.restore();

  // ---- main two-column grid
  const gridY = crumbY + 26;
  const inner = W - margin * 2;
  const leftW = inner * 0.5 - 18;
  const rightX = margin + leftW + 36;
  const rightW = inner - leftW - 36;
  const gridH = clamp(H * 0.5, 280, 560);

  // left: bottle showcase card
  ctx.save();
  ctx.fillStyle = "rgba(243, 231, 216, 0.06)";
  roundRect(ctx, margin, gridY, leftW, gridH, 4);
  ctx.fill();

  // bottle silhouette, centered in card
  const bottleH = gridH * 0.78;
  const bottleW = bottleH * 0.16;
  const bx = margin + leftW / 2 - bottleW / 2;
  const by = gridY + (gridH - bottleH) / 2;

  // body
  const bodyH = bottleH * 0.65;
  const bodyY = by + bottleH - bodyH;
  ctx.fillStyle = "#0c0405";
  roundRect(ctx, bx, bodyY, bottleW, bodyH, bottleW * 0.25);
  ctx.fill();

  // shoulder/transition
  const shH = bottleH * 0.13;
  ctx.fillStyle = "#0c0405";
  ctx.beginPath();
  ctx.moveTo(bx, bodyY);
  ctx.lineTo(bx + bottleW, bodyY);
  ctx.lineTo(bx + bottleW * 0.62, bodyY - shH);
  ctx.lineTo(bx + bottleW * 0.38, bodyY - shH);
  ctx.closePath();
  ctx.fill();

  // neck
  const neckW = bottleW * 0.24;
  const neckX = bx + bottleW / 2 - neckW / 2;
  const neckY = bodyY - shH;
  const neckH = bottleH * 0.18;
  ctx.fillRect(neckX, neckY - neckH, neckW, neckH);

  // foil
  ctx.fillStyle = p.accent2;
  ctx.fillRect(neckX, neckY - neckH * 1.05, neckW, neckH * 0.55);

  // label on body
  const labelW = bottleW * 0.86;
  const labelH = bodyH * 0.42;
  const labelX = bx + (bottleW - labelW) / 2;
  const labelY = bodyY + bodyH * 0.28;
  ctx.fillStyle = "#f0e3cf";
  ctx.fillRect(labelX, labelY, labelW, labelH);

  // label content
  ctx.fillStyle = "#2c0d10";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${Math.max(7, bottleW * 0.09)}px ${MONO}`;
  ctx.fillText("DOMAINE", bx + bottleW / 2, labelY + labelH * 0.18);
  ctx.font = `italic 400 ${Math.max(11, bottleW * 0.18)}px ${SERIF}`;
  ctx.fillText("Saint-Cyr", bx + bottleW / 2, labelY + labelH * 0.45);
  ctx.font = `500 ${Math.max(6, bottleW * 0.07)}px ${MONO}`;
  ctx.fillText("2018", bx + bottleW / 2, labelY + labelH * 0.72);
  ctx.fillText("RHÔNE", bx + bottleW / 2, labelY + labelH * 0.86);

  // soft floor shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(
    bx + bottleW / 2,
    by + bottleH + 6,
    bottleW * 1.6,
    bottleW * 0.35,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // gallery thumbnails along the bottom of card
  const thumbW = leftW * 0.13;
  const thumbH = thumbW * 0.85;
  const thumbY = gridY + gridH - thumbH - 22;
  const thumbStart = margin + 22;
  for (let i = 0; i < 4; i++) {
    const tx = thumbStart + i * (thumbW + 12);
    ctx.fillStyle = i === 0 ? "rgba(243,231,216,0.18)" : "rgba(243,231,216,0.07)";
    roundRect(ctx, tx, thumbY, thumbW, thumbH, 3);
    ctx.fill();
    ctx.fillStyle = "#0c0405";
    const minBx = tx + thumbW * 0.43;
    ctx.fillRect(minBx, thumbY + thumbH * 0.2, thumbW * 0.14, thumbH * 0.6);
  }

  // little "1 / 4" indicator
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textAlign = "right";
  ctx.fillText("01 / 04", margin + leftW - 22, thumbY + thumbH / 2);
  ctx.restore();

  // ---- right column: product info
  let ry = gridY + 8;
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.accent;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("VINTAGE  2018  ·  ALLOCATION  RELEASE", rightX, ry);
  ry += 22;

  ctx.fillStyle = p.ink;
  const titleSize = clamp(W * 0.045, 40, 76);
  ctx.font = `400 ${titleSize}px ${SERIF}`;
  ctx.fillText("Domaine", rightX, ry);
  ry += titleSize * 0.95;
  ctx.font = `italic 400 ${titleSize}px ${SERIF}`;
  ctx.fillStyle = p.accent;
  ctx.fillText("Saint-Cyr", rightX, ry);
  ry += titleSize * 0.95 + 4;

  ctx.font = `italic 400 ${clamp(W * 0.014, 16, 22)}px ${SERIF}`;
  ctx.fillStyle = p.dim;
  ctx.fillText(
    "Northern Rhône  ·  100% Syrah  ·  13.5% ABV  ·  750ml",
    rightX,
    ry,
  );
  ry += clamp(W * 0.014, 16, 22) * 1.6;

  // price
  ctx.font = `400 ${clamp(W * 0.028, 28, 48)}px ${SERIF}`;
  ctx.fillStyle = p.ink;
  const priceText = "£68.00";
  ctx.fillText(priceText, rightX, ry);
  const priceW = ctx.measureText(priceText).width;
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.fillText("/ BOTTLE", rightX + priceW + 14, ry + 18);
  ry += clamp(W * 0.028, 28, 48) + 8;

  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.faint;
  ctx.fillText("OR  4  ×  £17.00  WITH  KLARNA", rightX, ry);
  ry += 28;

  // tasting notes paragraph
  ctx.font = `italic 400 ${clamp(W * 0.012, 14, 17)}px ${SERIF}`;
  ctx.fillStyle = p.dim;
  ry = wrapText(
    ctx,
    "Inky and unhurried — black fruit, cracked pepper, and the kind of finish that makes a room go quiet. From a parcel of forty-year-old vines worked entirely by hand.",
    rightX,
    ry,
    rightW,
    clamp(W * 0.012, 14, 17) * 1.55,
    4,
  );
  ry += 14;

  // attribute table
  hairline(ctx, rightX, ry, rightX + rightW, ry, p.hair);
  ry += 14;
  const attrs: [string, string][] = [
    ["REGION", "Northern Rhône, FR"],
    ["PRODUCER", "Émile Saint-Cyr"],
    ["GRAPE", "Syrah (100%)"],
    ["VINIFICATION", "Whole-cluster, native yeast"],
    ["AGEING", "18 mo · used French oak"],
    ["DRINK", "Now — 2034"],
  ];
  ctx.font = `500 10px ${MONO}`;
  for (let i = 0; i < attrs.length; i++) {
    const [k, v] = attrs[i]!;
    ctx.fillStyle = p.faint;
    ctx.textAlign = "left";
    ctx.fillText(k, rightX, ry);
    ctx.fillStyle = p.ink;
    ctx.textAlign = "right";
    ctx.fillText(v, rightX + rightW, ry);
    ry += 22;
    if (i < attrs.length - 1)
      hairline(ctx, rightX, ry - 8, rightX + rightW, ry - 8, p.hair);
  }
  ry += 6;

  // CTAs
  const ctaH = clamp(H * 0.05, 38, 52);
  drawPillButton(
    ctx,
    rightX,
    ry,
    rightW * 0.62,
    ctaH,
    "ADD TO BAG  —  £68.00",
    { fill: p.accent, ink: "#1f0a05" },
  );
  drawPillButton(
    ctx,
    rightX + rightW * 0.62 + 12,
    ry,
    rightW * 0.38 - 12,
    ctaH,
    "♡ SAVE",
    { fill: p.ink, ink: p.ink, ghost: true, stroke: p.faint },
  );
  ry += ctaH + 14;

  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.faint;
  ctx.textAlign = "left";
  ctx.fillText("32  IN  STOCK  ·  SHIPS  TOMORROW", rightX, ry);
  ctx.restore();

  // ---- "you may also like" row
  const recY = gridY + gridH + 28;
  if (recY < H - 180) {
    ctx.save();
    ctx.font = `500 10px ${MONO}`;
    ctx.fillStyle = p.accent;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("YOU  MAY  ALSO  LIKE", margin, recY);
    hairline(ctx, margin, recY + 22, W - margin, recY + 22, p.hair);
    ctx.restore();

    const cardY = recY + 32;
    const cardH = clamp(H - cardY - 64, 80, 180);
    const cardGap = 18;
    const cardW = (inner - cardGap * 3) / 4;

    const items: { name: string; sub: string; price: string; tone: string }[] = [
      {
        name: "Clos des Caves",
        sub: "BURGUNDY · 2019",
        price: "£42.00",
        tone: "#180a0e",
      },
      { name: "La Vigneronne", sub: "LOIRE · 2021", price: "£28.00", tone: "#0a1410" },
      {
        name: "Castello Marini",
        sub: "PIEDMONT · 2017",
        price: "£89.00",
        tone: "#1a0606",
      },
      {
        name: "Quinta do Vale",
        sub: "DOURO · 2020",
        price: "£36.00",
        tone: "#0d0408",
      },
    ];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const cx = margin + i * (cardW + cardGap);
      ctx.save();
      ctx.fillStyle = "rgba(243,231,216,0.05)";
      roundRect(ctx, cx, cardY, cardW, cardH, 3);
      ctx.fill();

      // miniature bottle
      const bw = cardH * 0.16;
      const bh = cardH * 0.7;
      const bxx = cx + cardW * 0.18 - bw / 2;
      const byy = cardY + (cardH - bh) / 2;
      ctx.fillStyle = item.tone;
      roundRect(ctx, bxx, byy + bh * 0.32, bw, bh * 0.68, bw * 0.25);
      ctx.fill();
      ctx.fillRect(bxx + bw * 0.38, byy, bw * 0.24, bh * 0.32);

      // text right of bottle
      const txx = cx + cardW * 0.36;
      const txw = cardW - (txx - cx) - 14;
      ctx.font = `italic 400 ${clamp(W * 0.013, 15, 20)}px ${SERIF}`;
      ctx.fillStyle = p.ink;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(item.name, txx, cardY + cardH * 0.28);
      ctx.font = `500 9px ${MONO}`;
      ctx.fillStyle = p.faint;
      ctx.fillText(item.sub, txx, cardY + cardH * 0.46);
      ctx.font = `500 11px ${MONO}`;
      ctx.fillStyle = p.accent;
      ctx.fillText(item.price, txx, cardY + cardH * 0.62);
      ctx.font = `500 10px ${MONO}`;
      ctx.fillStyle = p.dim;
      ctx.fillText("ADD →", txx + txw - ctx.measureText("ADD →").width, cardY + cardH * 0.62);
      ctx.restore();
    }
  }

  // ---- footer strip
  const footY = H - 36;
  hairline(ctx, margin, footY - 16, W - margin, footY - 16, p.hair);
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("ATELIER  ·  EST. 2003  ·  CHELSEA · LONDON", margin, footY);
  ctx.textAlign = "right";
  ctx.fillText("PAGE  II  ·  OF  III", W - margin, footY);
  ctx.restore();

  drawNoise(ctx, W, H, 0.03);
  return c;
}

// ===========================================================================
// PAGE III — LUMEN  (SaaS observability landing, paper-cream)
// ===========================================================================

export function renderPage3(W: number, H: number): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d")!;
  const p: Palette = {
    bg0: "#efe5d2",
    bg1: "#f6ecd6",
    surface: "#ffffff",
    ink: "#2a201a",
    dim: "rgba(42, 32, 26, 0.62)",
    faint: "rgba(42, 32, 26, 0.34)",
    hair: "rgba(42, 32, 26, 0.16)",
    accent: "#c2603a",
    accent2: "#3a6a5e",
  };

  // background
  const bg = ctx.createRadialGradient(
    W * 0.4,
    H * 0.2,
    100,
    W / 2,
    H / 2,
    Math.max(W, H),
  );
  bg.addColorStop(0, p.bg1);
  bg.addColorStop(1, p.bg0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const margin = clamp(W * 0.05, 40, 110);
  const inner = W - margin * 2;

  // ---- announcement bar
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(
    "Lumen  v2.0  is here  —  read the changelog  →",
    W / 2,
    18,
  );
  ctx.restore();
  hairline(ctx, 0, 32, W, 32, p.hair);

  // ---- nav
  const navY = 32;
  const navH = 56;

  // brand mark
  ctx.save();
  const dotR = 8;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(margin + dotR, navY + navH / 2, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.font = `500 ${clamp(W * 0.018, 18, 26)}px ${SERIF}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("lumen", margin + dotR * 2 + 12, navY + navH / 2 + 1);

  // center nav
  ctx.font = `500 12px ${MONO}`;
  const navItems = ["PRODUCT", "CUSTOMERS", "PRICING", "DOCS", "CHANGELOG"];
  let totalNavW = 0;
  for (const n of navItems) totalNavW += ctx.measureText(n).width;
  const navGap = 28;
  const navStart = W / 2 - (totalNavW + navGap * (navItems.length - 1)) / 2;
  let nx = navStart;
  for (const n of navItems) {
    ctx.fillStyle = p.dim;
    ctx.fillText(n, nx, navY + navH / 2);
    nx += ctx.measureText(n).width + navGap;
  }

  // right side: sign in + CTA
  ctx.font = `500 12px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textAlign = "right";
  const ctaW = 120;
  ctx.fillText("SIGN IN", W - margin - ctaW - 24, navY + navH / 2);
  drawPillButton(
    ctx,
    W - margin - ctaW,
    navY + navH / 2 - 16,
    ctaW,
    32,
    "START FREE  →",
    { fill: p.ink, ink: "#f5ecd6" },
  );
  ctx.restore();
  hairline(ctx, 0, navY + navH, W, navY + navH, p.hair);

  // ---- hero
  const heroY = navY + navH + clamp(H * 0.05, 28, 80);
  ctx.save();
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = p.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("OBSERVABILITY  ·  v2.0", W / 2, heroY);
  ctx.restore();

  let hy = heroY + 22;
  const heroSize = clamp(W * 0.052, 40, 88);
  ctx.save();
  ctx.font = `400 ${heroSize}px ${SERIF}`;
  ctx.fillStyle = p.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Read your system", W / 2, hy);
  hy += heroSize * 0.95;
  ctx.font = `italic 400 ${heroSize}px ${SERIF}`;
  ctx.fillStyle = p.accent;
  ctx.fillText("like prose.", W / 2, hy);
  hy += heroSize * 0.95 + 16;
  ctx.restore();

  // sub
  ctx.save();
  ctx.font = `400 ${clamp(W * 0.015, 16, 22)}px ${SERIF}`;
  ctx.fillStyle = p.dim;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  hy = wrapText(
    ctx,
    "Lumen turns logs, traces, and metrics into one queryable narrative — with the precision your on-call team has always wanted, and the calm they have not.",
    W / 2,
    hy,
    Math.min(inner * 0.64, 720),
    clamp(W * 0.015, 16, 22) * 1.5,
    3,
  );
  ctx.restore();
  hy += 12;

  // CTAs centered
  const ctaWidth = 160;
  const ctaGap = 14;
  const ctaH = clamp(H * 0.055, 40, 56);
  const ctaTotal = ctaWidth * 2 + ctaGap;
  drawPillButton(
    ctx,
    W / 2 - ctaTotal / 2,
    hy,
    ctaWidth,
    ctaH,
    "START FREE  →",
    { fill: p.ink, ink: "#f5ecd6" },
  );
  drawPillButton(
    ctx,
    W / 2 - ctaTotal / 2 + ctaWidth + ctaGap,
    hy,
    ctaWidth,
    ctaH,
    "BOOK A DEMO",
    { fill: p.ink, ink: p.ink, ghost: true, stroke: p.faint },
  );
  hy += ctaH + 16;

  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.faint;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("NO  CREDIT  CARD  ·  14-DAY  TRIAL  ·  SOC 2  TYPE II", W / 2, hy);
  ctx.restore();
  hy += 32;

  // ---- dashboard preview card — fits whatever vertical room is left
  // Reserves space for trusted-by row (~70), feature trio (~110), footer (~30).
  const reserveBelow = 210;
  const dashAvailable = H - hy - reserveBelow;
  if (dashAvailable >= 170) {
    const dashH = clamp(dashAvailable, 170, 360);
    const dashW = Math.min(inner, 1100);
    const dashX = W / 2 - dashW / 2;
    const dashY = hy;
    drawDashboardCard(ctx, dashX, dashY, dashW, dashH, p);
    hy = dashY + dashH + 24;
  }

  // ---- trusted-by row
  if (hy < H - 180) {
    ctx.save();
    ctx.font = `500 10px ${MONO}`;
    ctx.fillStyle = p.faint;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("TRUSTED  BY  TEAMS  AT", W / 2, hy);
    hy += 24;
    const logos = ["LINEAR", "VERCEL", "STRIPE", "ANTHROPIC", "NOTION", "CURSOR"];
    let total = 0;
    ctx.font = `500 ${clamp(W * 0.014, 14, 18)}px ${MONO}`;
    for (const l of logos) total += ctx.measureText(l).width;
    const gap = (Math.min(inner, 900) - total) / (logos.length - 1);
    let lx = W / 2 - Math.min(inner, 900) / 2;
    ctx.fillStyle = p.dim;
    for (const l of logos) {
      ctx.textAlign = "left";
      ctx.fillText(l, lx, hy);
      lx += ctx.measureText(l).width + gap;
    }
    ctx.restore();
    hy += 36;
  }

  // ---- feature trio
  if (hy < H - 120) {
    const colGap = 24;
    const colW = (inner - colGap * 2) / 3;
    const featH = clamp(H - hy - 90, 80, 200);
    const features: { k: string; t: string; b: string }[] = [
      {
        k: "QUERY",
        t: "One language, every signal.",
        b: "Search logs, traces, and metrics from the same prompt — no joins, no context-switch.",
      },
      {
        k: "ALERT",
        t: "Pages that explain themselves.",
        b: "Every alert ships with the query, the suspected cause, and the rollback you’d run.",
      },
      {
        k: "COST",
        t: "Pay for what you read, not what you store.",
        b: "Cold storage is free; you only pay for the queries you actually run.",
      },
    ];
    for (let i = 0; i < 3; i++) {
      const f = features[i]!;
      const cx = margin + i * (colW + colGap);
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      roundRect(ctx, cx, hy, colW, featH, 8);
      ctx.fill();
      ctx.strokeStyle = p.hair;
      ctx.stroke();

      // icon glyph
      ctx.fillStyle = p.accent;
      roundRect(ctx, cx + 18, hy + 18, 22, 22, 4);
      ctx.fill();

      ctx.font = `500 10px ${MONO}`;
      ctx.fillStyle = p.accent;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(f.k, cx + 50, hy + 22);

      ctx.font = `400 ${clamp(W * 0.018, 18, 26)}px ${SERIF}`;
      ctx.fillStyle = p.ink;
      let cy = hy + 52;
      cy = wrapText(
        ctx,
        f.t,
        cx + 18,
        cy,
        colW - 36,
        clamp(W * 0.018, 18, 26) * 1.2,
        2,
      );
      cy += 6;
      ctx.font = `italic 400 ${clamp(W * 0.012, 13, 16)}px ${SERIF}`;
      ctx.fillStyle = p.dim;
      cy = wrapText(
        ctx,
        f.b,
        cx + 18,
        cy,
        colW - 36,
        clamp(W * 0.012, 13, 16) * 1.5,
        4,
      );
      ctx.restore();
    }
    hy += featH + 24;
  }

  // ---- footer
  const footY = H - 28;
  hairline(ctx, margin, footY - 18, W - margin, footY - 18, p.hair);
  ctx.save();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("LUMEN  ·  © 2026  ·  STATUS · TERMS · PRIVACY", margin, footY);
  ctx.textAlign = "right";
  ctx.fillText("PAGE  III  ·  OF  III", W - margin, footY);
  ctx.restore();

  drawNoise(ctx, W, H, 0.025);
  return c;
}

function drawDashboardCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette,
): void {
  ctx.save();
  // shadow
  ctx.fillStyle = "rgba(42, 32, 26, 0.18)";
  roundRect(ctx, x + 4, y + 12, w, h, 12);
  ctx.fill();

  // body
  ctx.fillStyle = "#fbf6ea";
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = p.hair;
  ctx.stroke();

  // top toolbar
  const tbH = 36;
  ctx.fillStyle = "rgba(42, 32, 26, 0.04)";
  roundRect(ctx, x, y, w, tbH, 12);
  ctx.fill();
  hairline(ctx, x, y + tbH, x + w, y + tbH, p.hair);

  // window dots
  ctx.fillStyle = "#d56b54";
  ctx.beginPath();
  ctx.arc(x + 18, y + tbH / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c266";
  ctx.beginPath();
  ctx.arc(x + 36, y + tbH / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a4c08a";
  ctx.beginPath();
  ctx.arc(x + 54, y + tbH / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // url bar
  ctx.fillStyle = "rgba(42, 32, 26, 0.06)";
  roundRect(ctx, x + 80, y + 8, w * 0.4, tbH - 16, 4);
  ctx.fill();
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("lumen.app/incidents/i-2026-05-09-04", x + 92, y + tbH / 2);

  // sidebar
  const sbW = Math.min(180, w * 0.18);
  ctx.fillStyle = "rgba(42, 32, 26, 0.03)";
  ctx.fillRect(x, y + tbH, sbW, h - tbH);
  hairline(ctx, x + sbW, y + tbH, x + sbW, y + h, p.hair);

  const sbItems = [
    "DASHBOARDS",
    "INCIDENTS",
    "TRACES",
    "LOGS",
    "METRICS",
    "ALERTS",
  ];
  ctx.font = `500 10px ${MONO}`;
  for (let i = 0; i < sbItems.length; i++) {
    const sy = y + tbH + 24 + i * 24;
    ctx.fillStyle = i === 1 ? p.accent : p.dim;
    if (i === 1) {
      ctx.fillStyle = "rgba(194, 96, 58, 0.12)";
      ctx.fillRect(x + 8, sy - 10, sbW - 16, 22);
      ctx.fillStyle = p.accent;
    }
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(sbItems[i]!, x + 18, sy);
  }

  // main content area
  const mx = x + sbW + 20;
  const mw = w - sbW - 40;
  let my = y + tbH + 18;

  // page title row
  ctx.font = `400 ${Math.min(22, h * 0.07)}px ${SERIF}`;
  ctx.fillStyle = p.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("incident i-2026-05-09-04", mx, my);
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = "#3a6a5e";
  ctx.textAlign = "right";
  ctx.fillText("● RESOLVED · 04:38 UTC", mx + mw, my + 6);
  my += 36;

  // stat tiles row
  const tileGap = 12;
  const tileW = (mw - tileGap * 2) / 3;
  const tileH = Math.min(64, h * 0.18);
  const tiles: [string, string, string][] = [
    ["P99 LATENCY", "412 ms", "▼ 38ms"],
    ["ERROR RATE", "0.42 %", "▼ 0.18"],
    ["EVENTS / S", "12.8 k", "▲ 600"],
  ];
  for (let i = 0; i < tiles.length; i++) {
    const [k, v, d] = tiles[i]!;
    const tx = mx + i * (tileW + tileGap);
    ctx.fillStyle = "rgba(42,32,26,0.04)";
    roundRect(ctx, tx, my, tileW, tileH, 6);
    ctx.fill();
    ctx.font = `500 9px ${MONO}`;
    ctx.fillStyle = p.faint;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(k, tx + 12, my + 10);
    ctx.font = `400 ${Math.min(28, tileH * 0.5)}px ${SERIF}`;
    ctx.fillStyle = p.ink;
    ctx.fillText(v, tx + 12, my + 24);
    ctx.font = `500 10px ${MONO}`;
    ctx.fillStyle = d.startsWith("▼") ? "#3a6a5e" : p.accent;
    ctx.textAlign = "right";
    ctx.fillText(d, tx + tileW - 12, my + tileH - 18);
  }
  my += tileH + 16;

  // chart
  const chH = y + h - my - 18;
  const chartLeft = mx;
  const chartW = mw;

  ctx.fillStyle = "rgba(42,32,26,0.03)";
  roundRect(ctx, chartLeft, my, chartW, chH, 6);
  ctx.fill();

  // gridlines
  ctx.strokeStyle = p.hair;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const gy = my + (chH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(chartLeft + 0.5, gy + 0.5);
    ctx.lineTo(chartLeft + chartW - 0.5, gy + 0.5);
    ctx.stroke();
  }

  // generate a deterministic-looking sparkline
  const N = 64;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const base =
      0.5 +
      0.18 * Math.sin(t * 7.5) +
      0.1 * Math.sin(t * 19.2 + 1.4) +
      0.08 * Math.sin(t * 3.1);
    // spike around incident
    const spike = t > 0.55 && t < 0.66 ? Math.exp(-(((t - 0.6) * 38) ** 2)) * 0.35 : 0;
    const v = clamp(base + spike, 0.05, 0.95);
    pts.push({
      x: chartLeft + 16 + (chartW - 32) * t,
      y: my + 14 + (chH - 28) * (1 - v),
    });
  }
  // area fill
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, my + chH - 14);
  for (const pt of pts) ctx.lineTo(pt.x, pt.y);
  ctx.lineTo(pts[pts.length - 1]!.x, my + chH - 14);
  ctx.closePath();
  const ag = ctx.createLinearGradient(0, my, 0, my + chH);
  ag.addColorStop(0, "rgba(194, 96, 58, 0.32)");
  ag.addColorStop(1, "rgba(194, 96, 58, 0.02)");
  ctx.fillStyle = ag;
  ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (const pt of pts) ctx.lineTo(pt.x, pt.y);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // incident marker
  const marker = pts[Math.floor(N * 0.6)]!;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(marker.x, my + 8);
  ctx.lineTo(marker.x, my + chH - 14);
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = p.dim;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("04:18  spike begins  →  auto-paged in 12 s", marker.x + 8, my + 14);

  // axis labels
  ctx.fillStyle = p.faint;
  ctx.textAlign = "left";
  ctx.fillText("00:00", chartLeft + 14, my + chH - 14);
  ctx.textAlign = "center";
  ctx.fillText("04:18", chartLeft + chartW * 0.6, my + chH - 14);
  ctx.textAlign = "right";
  ctx.fillText("now", chartLeft + chartW - 14, my + chH - 14);

  ctx.restore();
}
