import { describe, it, expect } from "vitest";
import { renderPage1, renderPage2, renderPage3 } from "../src/pages.ts";

interface MockCtx {
  __calls: [string, ...unknown[]][];
}

function ctxOf(c: HTMLCanvasElement): MockCtx {
  return c.getContext("2d") as unknown as MockCtx;
}

function fillTexts(c: HTMLCanvasElement): string[] {
  // pages.ts already drew into its own context — we re-grab a fresh mock to
  // walk the recorded calls. Each render creates one canvas with one ctx.
  const calls = ctxOf(c).__calls;
  return calls
    .filter(([name]) => name === "fillText")
    .map(([, txt]) => String(txt));
}

const sizes: [number, number][] = [
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [800, 600],
];

describe("page renderers — sizing & resilience", () => {
  for (const [w, h] of sizes) {
    it(`renderPage1 returns a ${w}×${h} canvas without throwing`, () => {
      const c = renderPage1(w, h);
      expect(c).toBeInstanceOf(HTMLCanvasElement);
      expect(c.width).toBe(w);
      expect(c.height).toBe(h);
    });
    it(`renderPage2 returns a ${w}×${h} canvas without throwing`, () => {
      const c = renderPage2(w, h);
      expect(c.width).toBe(w);
      expect(c.height).toBe(h);
    });
    it(`renderPage3 returns a ${w}×${h} canvas without throwing`, () => {
      const c = renderPage3(w, h);
      expect(c.width).toBe(w);
      expect(c.height).toBe(h);
    });
  }
});

describe("page 1 — Meridian newspaper", () => {
  it("renders the masthead, section nav, and editorial chrome", () => {
    // we want fillTexts on a fresh render — call render and inspect its calls
    // by hijacking the canvas context that pages.ts created. Since pages.ts
    // calls getContext('2d'), we mirror its work with a fresh canvas + render.
    const c = document.createElement("canvas");
    c.width = 1440;
    c.height = 900;
    // re-render and capture: pages.ts internally creates its own canvas, so
    // we collect the texts via the internal canvas it returns.
    const out = renderPage1(1440, 900);
    const texts = fillTexts(out);
    expect(texts).toContain("Meridian");
    expect(texts.some((t) => t.includes("VOL CXLI"))).toBe(true);
    expect(texts).toContain("WORLD");
    expect(texts).toContain("POLITICS");
    expect(texts).toContain("BUSINESS");
    expect(texts).toContain("MOST READ");
    expect(texts.some((t) => t.includes("PAGE  I"))).toBe(true);
    expect(texts.some((t) => t.includes("MERIDIAN MEDIA"))).toBe(true);
  });
});

describe("page 2 — Atelier wine merchant", () => {
  it("renders the brand, breadcrumb, product info, and CTAs", () => {
    const out = renderPage2(1440, 900);
    const texts = fillTexts(out);
    expect(texts).toContain("Atelier");
    expect(texts).toContain("SHOP");
    expect(texts).toContain("JOURNAL");
    expect(texts).toContain("VINTAGES");
    expect(texts).toContain("Domaine");
    expect(texts).toContain("Saint-Cyr");
    expect(texts).toContain("£68.00");
    expect(texts).toContain("ADD TO BAG  —  £68.00");
    expect(texts.some((t) => t.includes("VINTAGE  2018"))).toBe(true);
    expect(texts.some((t) => t.includes("PAGE  II"))).toBe(true);
  });
});

describe("page 3 — Lumen SaaS landing", () => {
  it("renders the brand, hero, CTAs, and feature trio", () => {
    const out = renderPage3(1440, 900);
    const texts = fillTexts(out);
    expect(texts).toContain("lumen");
    expect(texts).toContain("PRODUCT");
    expect(texts).toContain("PRICING");
    expect(texts).toContain("DOCS");
    expect(texts).toContain("Read your system");
    expect(texts).toContain("like prose.");
    expect(texts).toContain("START FREE  →");
    expect(texts).toContain("BOOK A DEMO");
    expect(texts).toContain("QUERY");
    expect(texts).toContain("ALERT");
    expect(texts).toContain("COST");
    expect(texts.some((t) => t.includes("PAGE  III"))).toBe(true);
  });

  it("includes the dashboard preview at desktop heights", () => {
    const out = renderPage3(1440, 900);
    const texts = fillTexts(out);
    expect(texts).toContain("incident i-2026-05-09-04");
    expect(texts).toContain("DASHBOARDS");
    expect(texts).toContain("INCIDENTS");
    expect(texts).toContain("P99 LATENCY");
    expect(texts).toContain("ERROR RATE");
  });
});

describe("noise pass — pages should not blow up if image data is large", () => {
  it("page 1 handles a tall viewport", () => {
    expect(() => renderPage1(2560, 1440)).not.toThrow();
  });
  it("page 2 handles a tall viewport", () => {
    expect(() => renderPage2(2560, 1440)).not.toThrow();
  });
  it("page 3 handles a tall viewport", () => {
    expect(() => renderPage3(2560, 1440)).not.toThrow();
  });
});
