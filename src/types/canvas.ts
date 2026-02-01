// Canvas element types and state management types

export type Tool = 
  | 'select'
  | 'pan'
  | 'pencil'
  | 'eraser'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ElementType = 
  | 'freehand'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FreehandElement extends BaseElement {
  type: 'freehand';
  points: Point[];
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  cornerRadius: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
}

export interface LineElement extends BaseElement {
  type: 'line';
  startPoint: Point;
  endPoint: Point;
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  startPoint: Point;
  endPoint: Point;
  arrowHeadSize: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}

export type CanvasElement = 
  | FreehandElement 
  | RectangleElement 
  | EllipseElement 
  | LineElement 
  | ArrowElement 
  | TextElement;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: Set<string>;
  camera: Camera;
  activeTool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  isDrawing: boolean;
}

export interface HistoryEntry {
  elements: CanvasElement[];
  timestamp: number;
}

export interface Cursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  tool?: Tool;
}

// Color palette presets
export const COLOR_PALETTE = [
  '#ffffff',
  '#f87171', // red
  '#fb923c', // orange
  '#fbbf24', // amber
  '#a3e635', // lime
  '#34d399', // emerald
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
  '#94a3b8', // slate
  '#1e293b', // dark
];

export const STROKE_WIDTHS = [1, 2, 4, 6, 8, 12];

// Helper to generate unique IDs
export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

// Helper to create a new element
export const createBaseElement = (
  type: ElementType,
  x: number,
  y: number,
  strokeColor: string,
  fillColor: string,
  strokeWidth: number
): BaseElement => ({
  id: generateId(),
  type,
  x,
  y,
  width: 0,
  height: 0,
  rotation: 0,
  strokeColor,
  fillColor,
  strokeWidth,
  opacity: 1,
  isLocked: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
