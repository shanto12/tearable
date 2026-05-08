import { describe, it, expect, beforeEach } from "vitest";
import { Constraint, Layer, PHYS, Point } from "../src/physics.ts";

function makeTexture(): HTMLCanvasElement {
  return document.createElement("canvas");
}

function makeLayer(cols = 6, rows = 5, spacing = 40): Layer {
  return new Layer({
    cols,
    rows,
    spacing,
    startX: 0,
    startY: 0,
    texture: makeTexture(),
  });
}

describe("Point", () => {
  it("stores initial position as both current and previous", () => {
    const p = new Point(10, 20);
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
    expect(p.px).toBe(10);
    expect(p.py).toBe(20);
    expect(p.pinned).toBe(false);
  });

  it("locks position when pinned", () => {
    const p = new Point(50, 50);
    p.pin();
    p.x = 999;
    p.y = 999;
    p.update(1000, 1000);
    expect(p.x).toBe(50);
    expect(p.y).toBe(50);
  });

  it("falls under gravity once integrated", () => {
    const p = new Point(0, 0);
    p.update(1000, 1000);
    expect(p.y).toBeGreaterThan(0);
  });

  it("bounces off the bottom edge", () => {
    const p = new Point(500, 999);
    p.py = 990;
    p.update(1000, 1000);
    expect(p.y).toBe(1000);
    // After bounce, py should be on the far side of the wall.
    expect(p.py).toBeGreaterThan(1000);
  });

  it("unpin restores motion", () => {
    const p = new Point(10, 10);
    p.pin();
    p.unpin();
    expect(p.pinned).toBe(false);
  });
});

describe("Constraint", () => {
  it("computes rest length on construction", () => {
    const a = new Point(0, 0);
    const b = new Point(3, 4);
    const c = new Constraint(a, b);
    expect(c.length).toBe(5);
    expect(c.alive).toBe(true);
  });

  it("pulls separated points back toward rest length", () => {
    const a = new Point(0, 0);
    const b = new Point(10, 0);
    const c = new Constraint(a, b);
    // stretch beyond rest
    b.x = 30;
    c.resolve();
    // points should move back toward each other
    expect(a.x).toBeGreaterThan(0);
    expect(b.x).toBeLessThan(30);
  });

  it("snaps when stretched past tearDist", () => {
    const a = new Point(0, 0);
    const b = new Point(10, 0);
    const c = new Constraint(a, b);
    b.x = PHYS.tearDist + 50;
    c.resolve();
    expect(c.alive).toBe(false);
  });

  it("does not move pinned endpoints", () => {
    const a = new Point(0, 0);
    a.pin();
    const b = new Point(10, 0);
    const c = new Constraint(a, b);
    b.x = 30;
    c.resolve();
    expect(a.x).toBe(0); // pinned didn't move
    expect(b.x).toBeLessThan(30); // free end moved
  });
});

describe("Layer.build", () => {
  let layer: Layer;
  beforeEach(() => {
    layer = makeLayer(5, 4, 30);
  });

  it("creates cols*rows points", () => {
    expect(layer.points).toHaveLength(20);
  });

  it("creates (cols-1)*(rows-1) cells", () => {
    expect(layer.cells).toHaveLength(12);
  });

  it("pins corners and every fourth top point", () => {
    // top row has cols=5, so x=0,1,2,3,4 → pin at 0, 4 (corner) and 0 (x%4)
    const top = layer.points.slice(0, 5);
    expect(top[0]!.pinned).toBe(true);
    expect(top[4]!.pinned).toBe(true);
    expect(top[1]!.pinned).toBe(false);
  });

  it("stores texture u/v matching original position", () => {
    for (const p of layer.points) {
      expect(p.u).toBe(p.x);
      expect(p.v).toBe(p.y);
    }
  });

  it("connects each cell with four boundary constraints", () => {
    for (const cell of layer.cells) {
      expect(cell.cTop).toBeDefined();
      expect(cell.cBottom).toBeDefined();
      expect(cell.cLeft).toBeDefined();
      expect(cell.cRight).toBeDefined();
    }
  });
});

describe("Layer.tear / drag / step", () => {
  it("tear cuts constraints inside the radius", () => {
    const layer = makeLayer(6, 5, 40);
    const initial = layer.liveLinks();
    const cut = layer.tear(80, 80, 60);
    expect(cut).toBeGreaterThan(0);
    expect(layer.liveLinks()).toBe(initial - cut);
  });

  it("tear outside the mesh returns 0", () => {
    const layer = makeLayer(6, 5, 40);
    const cut = layer.tear(-1000, -1000, 5);
    expect(cut).toBe(0);
  });

  it("drag offsets unpinned points within radius", () => {
    const layer = makeLayer(6, 5, 40);
    // pick a free-floating mid-mesh point
    const mid = layer.points[12]!;
    const beforePx = mid.px;
    layer.drag(mid.x, mid.y, 5, 5, 50);
    expect(mid.px).not.toBe(beforePx);
  });

  it("drag does not move pinned points", () => {
    const layer = makeLayer(6, 5, 40);
    const corner = layer.points[0]!;
    expect(corner.pinned).toBe(true);
    const before = { x: corner.x, y: corner.y, px: corner.px, py: corner.py };
    layer.drag(corner.x, corner.y, 100, 100, 80);
    expect(corner.px).toBe(before.px);
    expect(corner.py).toBe(before.py);
  });

  it("hasIntactNear is true near a fresh mesh and false after tearing through", () => {
    const layer = makeLayer(6, 5, 40);
    const target = layer.points[12]!;
    expect(layer.hasIntactNear(target.x, target.y, 60)).toBe(true);
    layer.tear(target.x, target.y, 200);
    // After a wide tear the area around the cell may have no live constraints
    // bound to its top-left corner anymore.
    expect(layer.hasIntactNear(target.x, target.y, 5)).toBe(false);
  });

  it("unpinAll releases every pinned point", () => {
    const layer = makeLayer(6, 5, 40);
    layer.unpinAll();
    expect(layer.points.every((p) => !p.pinned)).toBe(true);
  });

  it("step integrates without throwing on a fresh mesh", () => {
    const layer = makeLayer(6, 5, 40);
    expect(() => layer.step(800, 600)).not.toThrow();
  });

  it("liveLinks shrinks monotonically across multiple tears", () => {
    const layer = makeLayer(8, 6, 30);
    const a = layer.liveLinks();
    layer.tear(60, 60, 40);
    const b = layer.liveLinks();
    layer.tear(120, 80, 40);
    const c = layer.liveLinks();
    expect(b).toBeLessThanOrEqual(a);
    expect(c).toBeLessThanOrEqual(b);
  });
});
