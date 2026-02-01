import getStroke from 'perfect-freehand';
import { Point, CanvasElement, FreehandElement } from '@/types/canvas';

// Perfect freehand options for smooth strokes
export const getStrokeOptions = (strokeWidth: number) => ({
  size: strokeWidth * 2,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: {
    taper: 0,
    cap: true,
  },
  end: {
    taper: strokeWidth * 2,
    cap: true,
  },
});

// Convert stroke points to SVG path
export function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

// Get freehand path from points
export function getFreehandPath(points: Point[], strokeWidth: number): string {
  const strokePoints = getStroke(
    points.map(p => [p.x, p.y, p.pressure ?? 0.5]),
    getStrokeOptions(strokeWidth)
  );
  return getSvgPathFromStroke(strokePoints);
}

// Screen to canvas coordinates
export function screenToCanvas(
  screenX: number,
  screenY: number,
  camera: { x: number; y: number; zoom: number }
): Point {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  };
}

// Canvas to screen coordinates
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  camera: { x: number; y: number; zoom: number }
): Point {
  return {
    x: canvasX * camera.zoom + camera.x,
    y: canvasY * camera.zoom + camera.y,
  };
}

// Check if point is inside element
export function isPointInElement(
  point: Point,
  element: CanvasElement
): boolean {
  const { x, y, width, height } = element;
  
  // Simple bounding box check
  return (
    point.x >= x &&
    point.x <= x + width &&
    point.y >= y &&
    point.y <= y + height
  );
}

// Get bounding box of multiple elements
export function getBoundingBox(elements: CanvasElement[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (elements.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  elements.forEach(el => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Calculate bounding box from freehand points
export function getBoundingBoxFromPoints(points: Point[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Simple distance between two points
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Get arrow head points
export function getArrowHeadPoints(
  start: Point,
  end: Point,
  headSize: number = 12
): Point[] {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headAngle = Math.PI / 6; // 30 degrees
  
  return [
    {
      x: end.x - headSize * Math.cos(angle - headAngle),
      y: end.y - headSize * Math.sin(angle - headAngle),
    },
    end,
    {
      x: end.x - headSize * Math.cos(angle + headAngle),
      y: end.y - headSize * Math.sin(angle + headAngle),
    },
  ];
}
