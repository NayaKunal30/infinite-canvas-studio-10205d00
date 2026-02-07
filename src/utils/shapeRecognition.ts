import { Point } from '@/types/canvas';

// Analyze freehand points and detect if they form a recognizable shape
export type RecognizedShape = 
  | { type: 'none' }
  | { type: 'line'; start: Point; end: Point }
  | { type: 'rectangle'; x: number; y: number; width: number; height: number }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'triangle'; points: [Point, Point, Point] }
  | { type: 'diamond'; x: number; y: number; width: number; height: number };

function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function getBBox(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function getPathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

function getCentroid(points: Point[]): Point {
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  return { x: sx / points.length, y: sy / points.length };
}

// Detect if path is roughly a straight line
function detectLine(points: Point[]): RecognizedShape | null {
  if (points.length < 2) return null;
  
  const start = points[0];
  const end = points[points.length - 1];
  const directDist = distance(start, end);
  const pathLen = getPathLength(points);
  
  // Path length should be close to direct distance
  if (directDist < 20) return null; // Too short
  if (pathLen / directDist < 1.15) {
    return { type: 'line', start, end };
  }
  return null;
}

// Detect if path is roughly a circle/ellipse
function detectEllipse(points: Point[]): RecognizedShape | null {
  if (points.length < 10) return null;
  
  const start = points[0];
  const end = points[points.length - 1];
  const closingDist = distance(start, end);
  const pathLen = getPathLength(points);
  const bbox = getBBox(points);
  
  // Must be a closed shape (start ≈ end)
  const diag = Math.sqrt(bbox.width ** 2 + bbox.height ** 2);
  if (closingDist > diag * 0.25) return null;
  
  // Check if path length ≈ perimeter of ellipse
  const rx = bbox.width / 2;
  const ry = bbox.height / 2;
  const expectedPerimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  
  if (Math.abs(pathLen - expectedPerimeter) / expectedPerimeter < 0.3) {
    // Check circularity: how much points deviate from center
    const center = getCentroid(points);
    const avgRadius = points.reduce((sum, p) => sum + distance(p, center), 0) / points.length;
    const variance = points.reduce((sum, p) => {
      const d = distance(p, center);
      return sum + (d - avgRadius) ** 2;
    }, 0) / points.length;
    
    const stdDev = Math.sqrt(variance);
    if (stdDev / avgRadius < 0.25) {
      return {
        type: 'ellipse',
        cx: bbox.minX + rx,
        cy: bbox.minY + ry,
        rx,
        ry,
      };
    }
  }
  return null;
}

// Find corners in the path using angle changes
function findCorners(points: Point[], threshold: number = 0.6): number[] {
  if (points.length < 5) return [];
  
  const corners: number[] = [0];
  const step = Math.max(1, Math.floor(points.length / 40));
  
  for (let i = step * 2; i < points.length - step * 2; i += step) {
    const prev = points[Math.max(0, i - step * 2)];
    const curr = points[i];
    const next = points[Math.min(points.length - 1, i + step * 2)];
    
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    
    const len1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const len2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    
    if (len1 < 1 || len2 < 1) continue;
    
    const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    
    if (angle > threshold) {
      // Merge nearby corners
      const lastCorner = corners[corners.length - 1];
      if (i - lastCorner > points.length / 8) {
        corners.push(i);
      }
    }
  }
  
  corners.push(points.length - 1);
  return corners;
}

// Detect rectangle
function detectRectangle(points: Point[]): RecognizedShape | null {
  if (points.length < 10) return null;
  
  const start = points[0];
  const end = points[points.length - 1];
  const closingDist = distance(start, end);
  const bbox = getBBox(points);
  const diag = Math.sqrt(bbox.width ** 2 + bbox.height ** 2);
  
  if (closingDist > diag * 0.25) return null;
  if (bbox.width < 15 || bbox.height < 15) return null;
  
  const corners = findCorners(points);
  
  // Rectangle: 4 corners + start/end ≈ 5-6 points
  if (corners.length >= 4 && corners.length <= 7) {
    // Check if bounding box fits well
    const area = bbox.width * bbox.height;
    // Estimate enclosed area using shoelace
    let shoelaceArea = 0;
    for (let i = 0; i < points.length - 1; i++) {
      shoelaceArea += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
    }
    shoelaceArea = Math.abs(shoelaceArea) / 2;
    
    if (shoelaceArea / area > 0.7) {
      return {
        type: 'rectangle',
        x: bbox.minX,
        y: bbox.minY,
        width: bbox.width,
        height: bbox.height,
      };
    }
  }
  return null;
}

// Detect triangle
function detectTriangle(points: Point[]): RecognizedShape | null {
  if (points.length < 8) return null;
  
  const start = points[0];
  const end = points[points.length - 1];
  const closingDist = distance(start, end);
  const bbox = getBBox(points);
  const diag = Math.sqrt(bbox.width ** 2 + bbox.height ** 2);
  
  if (closingDist > diag * 0.3) return null;
  if (bbox.width < 15 || bbox.height < 15) return null;
  
  const corners = findCorners(points, 0.4);
  
  if (corners.length >= 3 && corners.length <= 5) {
    // Get the 3 most prominent corner points
    const cornerPoints = corners.map(i => points[i]);
    
    // Check if it's more triangular than rectangular
    if (corners.length <= 4) {
      const p1 = cornerPoints[0];
      const p2 = cornerPoints[Math.floor(cornerPoints.length / 3)];
      const p3 = cornerPoints[Math.floor(cornerPoints.length * 2 / 3)];
      
      return {
        type: 'triangle',
        points: [p1, p2, p3],
      };
    }
  }
  return null;
}

// Detect diamond (rhombus)
function detectDiamond(points: Point[]): RecognizedShape | null {
  if (points.length < 10) return null;
  
  const start = points[0];
  const end = points[points.length - 1];
  const closingDist = distance(start, end);
  const bbox = getBBox(points);
  const diag = Math.sqrt(bbox.width ** 2 + bbox.height ** 2);
  
  if (closingDist > diag * 0.3) return null;
  
  const corners = findCorners(points, 0.5);
  
  if (corners.length >= 4 && corners.length <= 6) {
    const cornerPoints = corners.map(i => points[i]);
    
    // Check if corners are near the midpoints of the bounding box edges
    const midTop = { x: bbox.minX + bbox.width / 2, y: bbox.minY };
    const midRight = { x: bbox.maxX, y: bbox.minY + bbox.height / 2 };
    const midBottom = { x: bbox.minX + bbox.width / 2, y: bbox.maxY };
    const midLeft = { x: bbox.minX, y: bbox.minY + bbox.height / 2 };
    
    const mids = [midTop, midRight, midBottom, midLeft];
    let matchCount = 0;
    
    for (const mid of mids) {
      for (const cp of cornerPoints) {
        if (distance(cp, mid) < diag * 0.2) {
          matchCount++;
          break;
        }
      }
    }
    
    if (matchCount >= 3) {
      return {
        type: 'diamond',
        x: bbox.minX,
        y: bbox.minY,
        width: bbox.width,
        height: bbox.height,
      };
    }
  }
  return null;
}

// Main recognition function - tries all shape detectors
export function recognizeShape(points: Point[]): RecognizedShape {
  if (points.length < 5) return { type: 'none' };
  
  // Try in order of specificity
  const line = detectLine(points);
  if (line) return line;
  
  const ellipse = detectEllipse(points);
  if (ellipse) return ellipse;
  
  const diamond = detectDiamond(points);
  if (diamond) return diamond;
  
  const triangle = detectTriangle(points);
  if (triangle) return triangle;
  
  const rect = detectRectangle(points);
  if (rect) return rect;
  
  return { type: 'none' };
}
