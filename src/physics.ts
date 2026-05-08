/**
 * Verlet cloth physics. One Layer = one independent cloth mesh.
 *
 * Each grid intersection is a Point with a stored previous-position; constraints
 * between neighboring points act as springs and are resolved iteratively per
 * frame. When a constraint stretches past `tearDist` it lets go.
 */

export interface PhysicsConfig {
  gravity: number;
  friction: number;
  bounce: number;
  iterations: number;
  /** Absolute stretch (px) at which a link snaps. */
  tearDist: number;
}

export const PHYS: PhysicsConfig = {
  gravity: 0.32,
  friction: 0.99,
  bounce: 0.5,
  iterations: 4,
  tearDist: 110,
};

export class Point {
  x: number;
  y: number;
  px: number;
  py: number;
  pinned = false;
  pinX = 0;
  pinY = 0;
  /** Original mesh position, used as the source-texture coordinate. */
  u = 0;
  v = 0;
  /** Outgoing constraints owned by this point. */
  constraints: Constraint[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
  }

  pin(): void {
    this.pinned = true;
    this.pinX = this.x;
    this.pinY = this.y;
  }

  unpin(): void {
    this.pinned = false;
  }

  addConstraint(other: Point): Constraint {
    const c = new Constraint(this, other);
    this.constraints.push(c);
    return c;
  }

  update(W: number, H: number): void {
    if (this.pinned) {
      this.x = this.pinX;
      this.y = this.pinY;
      this.px = this.pinX;
      this.py = this.pinY;
      return;
    }
    const nx = this.x + (this.x - this.px) * PHYS.friction;
    const ny = this.y + (this.y - this.py) * PHYS.friction + PHYS.gravity;
    this.px = this.x;
    this.py = this.y;
    this.x = nx;
    this.y = ny;
    if (this.x >= W) {
      this.px = W + (W - this.px) * PHYS.bounce;
      this.x = W;
    } else if (this.x < 0) {
      this.px = (0 - this.px) * PHYS.bounce;
      this.x = 0;
    }
    if (this.y >= H) {
      this.py = H + (H - this.py) * PHYS.bounce;
      this.y = H;
    } else if (this.y < 0) {
      this.py = (0 - this.py) * PHYS.bounce;
      this.y = 0;
    }
  }
}

export class Constraint {
  p1: Point;
  p2: Point;
  length: number;
  alive = true;

  constructor(p1: Point, p2: Point) {
    this.p1 = p1;
    this.p2 = p2;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    this.length = Math.sqrt(dx * dx + dy * dy);
  }

  resolve(): void {
    if (!this.alive) return;
    const dx = this.p1.x - this.p2.x;
    const dy = this.p1.y - this.p2.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > PHYS.tearDist) {
      this.alive = false;
      return;
    }
    const diff = ((this.length - d) / (d || 0.0001)) * 0.5;
    const ox = dx * diff;
    const oy = dy * diff;
    if (!this.p1.pinned) {
      this.p1.x += ox;
      this.p1.y += oy;
    }
    if (!this.p2.pinned) {
      this.p2.x -= ox;
      this.p2.y -= oy;
    }
  }
}

export interface Cell {
  p00: Point;
  p10: Point;
  p11: Point;
  p01: Point;
  cTop: Constraint | undefined;
  cBottom: Constraint | undefined;
  cLeft: Constraint | undefined;
  cRight: Constraint | undefined;
}

export interface LayerOptions {
  cols: number;
  rows: number;
  spacing: number;
  startX: number;
  startY: number;
  texture: HTMLCanvasElement;
}

export class Layer {
  cols: number;
  rows: number;
  spacing: number;
  startX: number;
  startY: number;
  texture: HTMLCanvasElement;
  points: Point[] = [];
  cells: Cell[] = [];

  constructor(opts: LayerOptions) {
    this.cols = opts.cols;
    this.rows = opts.rows;
    this.spacing = opts.spacing;
    this.startX = opts.startX;
    this.startY = opts.startY;
    this.texture = opts.texture;
    this.build();
  }

  build(): void {
    const { cols, rows, spacing, startX, startY } = this;
    this.points = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = new Point(startX + x * spacing, startY + y * spacing);
        p.u = p.x;
        p.v = p.y;
        if (x !== 0) p.addConstraint(this.points[this.points.length - 1]!);
        if (y !== 0) p.addConstraint(this.points[x + (y - 1) * cols]!);
        // Pin the corners and every fourth point along the top to keep the page hung.
        if (y === 0 && (x === 0 || x === cols - 1 || x % 4 === 0)) p.pin();
        this.points.push(p);
      }
    }
    this.cells = [];
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        const p00 = this.points[x + y * cols]!;
        const p10 = this.points[x + 1 + y * cols]!;
        const p01 = this.points[x + (y + 1) * cols]!;
        const p11 = this.points[x + 1 + (y + 1) * cols]!;
        const cTop = p10.constraints.find((c) => c.p2 === p00);
        const cBottom = p11.constraints.find((c) => c.p2 === p01);
        const cLeft = p01.constraints.find((c) => c.p2 === p00);
        const cRight = p11.constraints.find((c) => c.p2 === p10);
        this.cells.push({ p00, p10, p11, p01, cTop, cBottom, cLeft, cRight });
      }
    }
  }

  step(W: number, H: number): void {
    for (let n = 0; n < PHYS.iterations; n++) {
      for (const p of this.points) {
        for (const c of p.constraints) c.resolve();
      }
    }
    for (const p of this.points) p.update(W, H);
  }

  /** Returns true if any intact constraint exists within radius r of (mx, my). */
  hasIntactNear(mx: number, my: number, r: number): boolean {
    const r2 = r * r;
    for (const cell of this.cells) {
      const c = cell.cTop ?? cell.cBottom ?? cell.cLeft ?? cell.cRight;
      if (!c || !c.alive) continue;
      const dx = cell.p00.x - mx;
      const dy = cell.p00.y - my;
      if (dx * dx + dy * dy < r2) return true;
    }
    return false;
  }

  /** Drag points within r of mouse along mouse motion. */
  drag(mx: number, my: number, dx: number, dy: number, r: number): void {
    const r2 = r * r;
    for (const p of this.points) {
      if (p.pinned) continue;
      const ax = p.x - mx;
      const ay = p.y - my;
      if (ax * ax + ay * ay < r2) {
        p.px = p.x - dx * 1.8;
        p.py = p.y - dy * 1.8;
      }
    }
  }

  /** Cut all constraints touching points within r of mouse; returns count cut. */
  tear(mx: number, my: number, r: number): number {
    const r2 = r * r;
    let count = 0;
    for (const p of this.points) {
      const ax = p.x - mx;
      const ay = p.y - my;
      if (ax * ax + ay * ay < r2) {
        for (const c of p.constraints) {
          if (c.alive) {
            c.alive = false;
            count++;
          }
        }
      }
    }
    // Also kill incoming constraints from neighbors so holes open cleanly.
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i]!;
      const ax = p.x - mx;
      const ay = p.y - my;
      if (ax * ax + ay * ay < r2) {
        const x = i % this.cols;
        const y = (i / this.cols) | 0;
        const neighbors: Point[] = [];
        if (x < this.cols - 1) neighbors.push(this.points[i + 1]!);
        if (y < this.rows - 1) neighbors.push(this.points[i + this.cols]!);
        for (const n of neighbors) {
          for (const c of n.constraints) {
            if (c.alive && c.p2 === p) {
              c.alive = false;
              count++;
            }
          }
        }
      }
    }
    return count;
  }

  unpinAll(): void {
    for (const p of this.points) p.unpin();
  }

  liveLinks(): number {
    let n = 0;
    for (const p of this.points) {
      for (const c of p.constraints) if (c.alive) n++;
    }
    return n;
  }
}
