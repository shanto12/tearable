/**
 * Test setup: jsdom does not implement Canvas2D, so installs a recording mock
 * on HTMLCanvasElement.prototype.getContext so the page renderers can run.
 *
 * The mock exposes a `__calls` array of `[methodName, ...args]` tuples on each
 * context for assertions about what was drawn.
 */

interface CallLog {
  __calls: [string, ...unknown[]][];
}

type AnyCtx = CallLog & Record<string, unknown>;

function makeGradient(): CanvasGradient {
  return { addColorStop: () => {} } as unknown as CanvasGradient;
}

function makeImageData(w: number, h: number): ImageData {
  return {
    width: w,
    height: h,
    data: new Uint8ClampedArray(w * h * 4),
    colorSpace: "srgb",
  } as ImageData;
}

function record(ctx: AnyCtx, name: string, args: unknown[]): void {
  ctx.__calls.push([name, ...args]);
}

function makeMockCtx(canvas: HTMLCanvasElement): AnyCtx {
  const state: Record<string, unknown> = {
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    font: "10px monospace",
    textAlign: "start",
    textBaseline: "alphabetic",
    globalAlpha: 1,
  };
  const ctx = {
    canvas,
    __calls: [] as [string, ...unknown[]][],
    save() {
      record(this as AnyCtx, "save", []);
    },
    restore() {
      record(this as AnyCtx, "restore", []);
    },
    fillRect(...a: unknown[]) {
      record(this as AnyCtx, "fillRect", a);
    },
    strokeRect(...a: unknown[]) {
      record(this as AnyCtx, "strokeRect", a);
    },
    clearRect(...a: unknown[]) {
      record(this as AnyCtx, "clearRect", a);
    },
    fillText(...a: unknown[]) {
      record(this as AnyCtx, "fillText", a);
    },
    strokeText(...a: unknown[]) {
      record(this as AnyCtx, "strokeText", a);
    },
    measureText(text: string) {
      record(this as AnyCtx, "measureText", [text]);
      const fontSize = parseFloat(String(state.font)) || 12;
      return {
        width: text.length * fontSize * 0.55,
        actualBoundingBoxAscent: fontSize * 0.8,
        actualBoundingBoxDescent: fontSize * 0.2,
      } as TextMetrics;
    },
    beginPath() {
      record(this as AnyCtx, "beginPath", []);
    },
    closePath() {
      record(this as AnyCtx, "closePath", []);
    },
    moveTo(...a: unknown[]) {
      record(this as AnyCtx, "moveTo", a);
    },
    lineTo(...a: unknown[]) {
      record(this as AnyCtx, "lineTo", a);
    },
    arc(...a: unknown[]) {
      record(this as AnyCtx, "arc", a);
    },
    arcTo(...a: unknown[]) {
      record(this as AnyCtx, "arcTo", a);
    },
    ellipse(...a: unknown[]) {
      record(this as AnyCtx, "ellipse", a);
    },
    bezierCurveTo(...a: unknown[]) {
      record(this as AnyCtx, "bezierCurveTo", a);
    },
    rect(...a: unknown[]) {
      record(this as AnyCtx, "rect", a);
    },
    roundRect(...a: unknown[]) {
      record(this as AnyCtx, "roundRect", a);
    },
    fill() {
      record(this as AnyCtx, "fill", []);
    },
    stroke() {
      record(this as AnyCtx, "stroke", []);
    },
    clip() {
      record(this as AnyCtx, "clip", []);
    },
    setLineDash(...a: unknown[]) {
      record(this as AnyCtx, "setLineDash", a);
    },
    setTransform(...a: unknown[]) {
      record(this as AnyCtx, "setTransform", a);
    },
    transform(...a: unknown[]) {
      record(this as AnyCtx, "transform", a);
    },
    translate(...a: unknown[]) {
      record(this as AnyCtx, "translate", a);
    },
    rotate(...a: unknown[]) {
      record(this as AnyCtx, "rotate", a);
    },
    scale(...a: unknown[]) {
      record(this as AnyCtx, "scale", a);
    },
    drawImage(...a: unknown[]) {
      record(this as AnyCtx, "drawImage", a);
    },
    createLinearGradient(...a: unknown[]) {
      record(this as AnyCtx, "createLinearGradient", a);
      return makeGradient();
    },
    createRadialGradient(...a: unknown[]) {
      record(this as AnyCtx, "createRadialGradient", a);
      return makeGradient();
    },
    createPattern() {
      return null;
    },
    getImageData(_x: number, _y: number, w: number, h: number) {
      record(this as AnyCtx, "getImageData", [w, h]);
      return makeImageData(w, h);
    },
    putImageData(...a: unknown[]) {
      record(this as AnyCtx, "putImageData", a);
    },
  };
  // expose state setters/getters
  for (const k of Object.keys(state)) {
    Object.defineProperty(ctx, k, {
      get: () => state[k],
      set: (v) => {
        state[k] = v;
      },
      configurable: true,
      enumerable: true,
    });
  }
  return ctx as unknown as AnyCtx;
}

const ctxCache = new WeakMap<HTMLCanvasElement, AnyCtx>();
const protoGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  type: string,
): unknown {
  if (type === "2d") {
    let ctx = ctxCache.get(this);
    if (!ctx) {
      ctx = makeMockCtx(this);
      ctxCache.set(this, ctx);
    }
    return ctx;
  }
  return protoGetContext?.call(this, type) ?? null;
} as typeof HTMLCanvasElement.prototype.getContext;
