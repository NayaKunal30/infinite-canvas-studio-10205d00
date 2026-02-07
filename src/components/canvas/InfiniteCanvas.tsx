import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Point, 
  FreehandElement, 
  RectangleElement, 
  EllipseElement, 
  LineElement,
  ArrowElement,
  TextElement,
  DiamondElement,
  TriangleElement,
  StarElement,
  generateId, 
  Camera,
  CanvasElement
} from '@/types/canvas';
import { screenToCanvas, getBoundingBoxFromPoints, clamp, isPointInElement } from '@/utils/drawing';
import { recognizeShape } from '@/utils/shapeRecognition';
import { ElementRenderer } from './ElementRenderer';

interface InfiniteCanvasProps {
  elements: CanvasElement[];
  currentElement: CanvasElement | null;
  selectedIds: string[];
  camera: Camera;
  activeTool: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  isDrawing: boolean;
  onCameraChange: (camera: Camera) => void;
  onStartDrawing: (element: CanvasElement) => void;
  onUpdateDrawing: (updates: { points?: Point[]; width?: number; height?: number; endPoint?: Point }) => void;
  onFinishDrawing: () => void;
  onSelectElements: (ids: string[]) => void;
  onAddElement: (element: CanvasElement) => void;
  onDeleteElements: (ids: string[]) => void;
  onReplaceCurrentWithElement?: (element: CanvasElement) => void;
}

export interface InfiniteCanvasRef {
  getSvgRef: () => SVGSVGElement | null;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// Font options for inline text
const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Georgia, serif',
  'Monaco, monospace',
  '"Comic Sans MS", cursive',
  '"Times New Roman", serif',
  'Arial, sans-serif',
];

export const InfiniteCanvas = forwardRef<InfiniteCanvasRef, InfiniteCanvasProps>(function InfiniteCanvas({
  elements,
  currentElement,
  selectedIds,
  camera,
  activeTool,
  strokeColor,
  fillColor,
  strokeWidth,
  isDrawing,
  onCameraChange,
  onStartDrawing,
  onUpdateDrawing,
  onFinishDrawing,
  onSelectElements,
  onAddElement,
  onDeleteElements,
  onReplaceCurrentWithElement,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef<Point | null>(null);
  const startPoint = useRef<Point | null>(null);
  const currentPoints = useRef<Point[]>([]);
  
  // Inline text editing state
  const [inlineText, setInlineText] = useState<{
    canvasX: number;
    canvasY: number;
    text: string;
    fontFamily: string;
    fontSize: number;
  } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Eraser tracking
  const erasedIdsRef = useRef<Set<string>>(new Set());

  useImperativeHandle(ref, () => ({
    getSvgRef: () => svgRef.current,
  }), []);

  // Get cursor style based on tool
  const getCursor = () => {
    switch (activeTool) {
      case 'pan': return isPanning ? 'grabbing' : 'grab';
      case 'select': return 'default';
      case 'pencil': return 'crosshair';
      case 'eraser': return 'cell';
      case 'text': return 'text';
      case 'rectangle':
      case 'ellipse':
      case 'line':
      case 'arrow':
      case 'diamond':
      case 'triangle':
      case 'star':
        return 'crosshair';
      default: return 'default';
    }
  };

  // Viewport culling - only render visible elements
  const visibleElements = useMemo(() => {
    if (!containerRef.current) return elements;
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 200; // Extra padding for partially visible elements
    
    return elements.filter(el => {
      const screenX = el.x * camera.zoom + camera.x;
      const screenY = el.y * camera.zoom + camera.y;
      const screenW = Math.abs(el.width) * camera.zoom;
      const screenH = Math.abs(el.height) * camera.zoom;
      
      // For freehand/line elements with potentially larger bounds
      const buffer = el.type === 'freehand' ? 500 : 0;
      
      return (
        screenX + screenW + buffer + padding > 0 &&
        screenX - buffer - padding < vw &&
        screenY + screenH + buffer + padding > 0 &&
        screenY - buffer - padding < vh
      );
    });
  }, [elements, camera]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clamp(camera.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
    
    const scale = newZoom / camera.zoom;
    const newX = mouseX - (mouseX - camera.x) * scale;
    const newY = mouseY - (mouseY - camera.y) * scale;
    
    onCameraChange({ x: newX, y: newY, zoom: newZoom });
  }, [camera, onCameraChange]);

  // Eraser: find elements near a point
  const eraseAtPoint = useCallback((canvasPoint: Point) => {
    const eraserRadius = 10 / camera.zoom;
    
    const hitIds: string[] = [];
    for (const el of elements) {
      if (erasedIdsRef.current.has(el.id)) continue;
      
      // Check freehand elements point-by-point
      if (el.type === 'freehand') {
        const freehand = el as FreehandElement;
        for (const p of freehand.points) {
          const dx = p.x - canvasPoint.x;
          const dy = p.y - canvasPoint.y;
          if (dx * dx + dy * dy < eraserRadius * eraserRadius) {
            hitIds.push(el.id);
            break;
          }
        }
      } else {
        // Bounding box check for other elements
        const margin = eraserRadius;
        if (
          canvasPoint.x >= el.x - margin &&
          canvasPoint.x <= el.x + Math.abs(el.width) + margin &&
          canvasPoint.y >= el.y - margin &&
          canvasPoint.y <= el.y + Math.abs(el.height) + margin
        ) {
          hitIds.push(el.id);
        }
      }
    }
    
    if (hitIds.length > 0) {
      hitIds.forEach(id => erasedIdsRef.current.add(id));
      onDeleteElements(hitIds);
    }
  }, [elements, camera.zoom, onDeleteElements]);

  // Create shape element helper
  const createShapeElement = useCallback((type: string, canvasPoint: Point) => {
    const base = {
      id: generateId(),
      x: canvasPoint.x,
      y: canvasPoint.y,
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
    };

    switch (type) {
      case 'pencil':
        return { ...base, type: 'freehand' as const, points: [{ ...canvasPoint, pressure: 0.5 }] };
      case 'rectangle':
        return { ...base, type: 'rectangle' as const, cornerRadius: 0 };
      case 'ellipse':
        return { ...base, type: 'ellipse' as const };
      case 'diamond':
        return { ...base, type: 'diamond' as const };
      case 'triangle':
        return { ...base, type: 'triangle' as const };
      case 'star':
        return { ...base, type: 'star' as const, innerRadius: 0.4, points: 5 };
      case 'line':
        return { ...base, type: 'line' as const, startPoint: canvasPoint, endPoint: canvasPoint };
      case 'arrow':
        return { ...base, type: 'arrow' as const, startPoint: canvasPoint, endPoint: canvasPoint, arrowHeadSize: 14 };
      default:
        return null;
    }
  }, [strokeColor, fillColor, strokeWidth]);

  // Commit inline text
  const commitInlineText = useCallback(() => {
    if (!inlineText || !inlineText.text.trim()) {
      setInlineText(null);
      return;
    }

    const element: TextElement = {
      id: generateId(),
      type: 'text',
      x: inlineText.canvasX,
      y: inlineText.canvasY,
      width: inlineText.text.length * inlineText.fontSize * 0.6,
      height: inlineText.fontSize * 1.5 * (inlineText.text.split('\n').length),
      rotation: 0,
      strokeColor,
      fillColor: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      isLocked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      text: inlineText.text,
      fontSize: inlineText.fontSize,
      fontFamily: inlineText.fontFamily,
      textAlign: 'left',
    };

    onAddElement(element);
    setInlineText(null);
  }, [inlineText, strokeColor, onAddElement]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, camera);

    // Commit any open inline text first
    if (inlineText && activeTool !== 'text') {
      commitInlineText();
    }

    // Pan mode or middle mouse
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // Text tool - inline editing
    if (activeTool === 'text' && e.button === 0) {
      // If already editing, commit first
      if (inlineText) {
        commitInlineText();
      }
      setInlineText({
        canvasX: canvasPoint.x,
        canvasY: canvasPoint.y,
        text: '',
        fontFamily: 'Inter, sans-serif',
        fontSize: 24,
      });
      return;
    }

    // Eraser
    if (activeTool === 'eraser' && e.button === 0) {
      erasedIdsRef.current = new Set();
      eraseAtPoint(canvasPoint);
      startPoint.current = canvasPoint;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    if (e.button === 0) {
      startPoint.current = canvasPoint;

      if (activeTool === 'select') {
        const clickedElement = [...elements].reverse().find(el => {
          if (el.type === 'freehand') {
            const freehand = el as FreehandElement;
            return freehand.points.some(p => {
              const dx = p.x - canvasPoint.x;
              const dy = p.y - canvasPoint.y;
              return dx * dx + dy * dy < 100;
            });
          }
          return isPointInElement(canvasPoint, el);
        });
        
        if (clickedElement) {
          onSelectElements([clickedElement.id]);
        } else {
          onSelectElements([]);
        }
        return;
      }

      // Drawing tools
      const newElement = createShapeElement(activeTool, canvasPoint);
      if (newElement) {
        if (activeTool === 'pencil') {
          currentPoints.current = [{ ...canvasPoint, pressure: e.pressure }];
        }
        onStartDrawing(newElement as CanvasElement);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    }
  }, [activeTool, camera, elements, strokeColor, fillColor, strokeWidth, inlineText, commitInlineText, eraseAtPoint, onStartDrawing, onSelectElements, createShapeElement]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Panning
    if (isPanning && lastPanPoint.current) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      onCameraChange({
        ...camera,
        x: camera.x + dx,
        y: camera.y + dy,
      });
      return;
    }

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, camera);

    // Eraser drag
    if (activeTool === 'eraser' && startPoint.current) {
      eraseAtPoint(canvasPoint);
      return;
    }

    if (!isDrawing || !startPoint.current) return;

    if (activeTool === 'pencil') {
      currentPoints.current.push({ ...canvasPoint, pressure: e.pressure });
      const bbox = getBoundingBoxFromPoints(currentPoints.current);
      onUpdateDrawing({
        points: [...currentPoints.current],
        width: bbox.width,
        height: bbox.height,
      });
    }

    if (['rectangle', 'ellipse', 'diamond', 'triangle', 'star'].includes(activeTool)) {
      const width = canvasPoint.x - startPoint.current.x;
      const height = canvasPoint.y - startPoint.current.y;
      onUpdateDrawing({ width, height });
    }

    if (activeTool === 'line' || activeTool === 'arrow') {
      onUpdateDrawing({ 
        endPoint: canvasPoint,
        width: Math.abs(canvasPoint.x - startPoint.current.x),
        height: Math.abs(canvasPoint.y - startPoint.current.y),
      });
    }
  }, [isPanning, isDrawing, activeTool, camera, onCameraChange, onUpdateDrawing, eraseAtPoint]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPoint.current = null;
      return;
    }

    if (activeTool === 'eraser') {
      startPoint.current = null;
      erasedIdsRef.current = new Set();
      return;
    }

    if (isDrawing) {
      // Shape recognition for pencil tool
      if (activeTool === 'pencil' && currentPoints.current.length > 5) {
        const recognized = recognizeShape(currentPoints.current);
        
        if (recognized.type !== 'none' && onReplaceCurrentWithElement) {
          const base = {
            id: generateId(),
            rotation: 0,
            strokeColor,
            fillColor,
            strokeWidth,
            opacity: 1,
            isLocked: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          let newElement: CanvasElement | null = null;

          if (recognized.type === 'rectangle') {
            newElement = {
              ...base,
              type: 'rectangle',
              x: recognized.x,
              y: recognized.y,
              width: recognized.width,
              height: recognized.height,
              cornerRadius: 0,
            };
          } else if (recognized.type === 'ellipse') {
            newElement = {
              ...base,
              type: 'ellipse',
              x: recognized.cx - recognized.rx,
              y: recognized.cy - recognized.ry,
              width: recognized.rx * 2,
              height: recognized.ry * 2,
            };
          } else if (recognized.type === 'line') {
            newElement = {
              ...base,
              type: 'line',
              x: Math.min(recognized.start.x, recognized.end.x),
              y: Math.min(recognized.start.y, recognized.end.y),
              width: Math.abs(recognized.end.x - recognized.start.x),
              height: Math.abs(recognized.end.y - recognized.start.y),
              startPoint: recognized.start,
              endPoint: recognized.end,
            };
          } else if (recognized.type === 'triangle') {
            const pts = recognized.points;
            const minX = Math.min(pts[0].x, pts[1].x, pts[2].x);
            const minY = Math.min(pts[0].y, pts[1].y, pts[2].y);
            const maxX = Math.max(pts[0].x, pts[1].x, pts[2].x);
            const maxY = Math.max(pts[0].y, pts[1].y, pts[2].y);
            newElement = {
              ...base,
              type: 'triangle',
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
              vertices: recognized.points,
            };
          } else if (recognized.type === 'diamond') {
            newElement = {
              ...base,
              type: 'diamond',
              x: recognized.x,
              y: recognized.y,
              width: recognized.width,
              height: recognized.height,
            };
          }

          if (newElement) {
            onReplaceCurrentWithElement(newElement);
            startPoint.current = null;
            currentPoints.current = [];
            return;
          }
        }
      }

      onFinishDrawing();
      startPoint.current = null;
      currentPoints.current = [];
    }
  }, [isPanning, isDrawing, activeTool, strokeColor, fillColor, strokeWidth, onFinishDrawing, onReplaceCurrentWithElement]);

  // Focus text input when it appears
  useEffect(() => {
    if (inlineText && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [inlineText]);

  // Add wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Calculate inline text screen position
  const inlineTextScreenPos = useMemo(() => {
    if (!inlineText) return null;
    return {
      x: inlineText.canvasX * camera.zoom + camera.x,
      y: inlineText.canvasY * camera.zoom + camera.y,
    };
  }, [inlineText, camera]);

  return (
    <div
      ref={containerRef}
      className="canvas-container no-select"
      style={{ cursor: getCursor() }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {/* Render visible elements */}
        {visibleElements.map(element => (
          <ElementRenderer
            key={element.id}
            element={element}
            isSelected={selectedIds.includes(element.id)}
            camera={camera}
          />
        ))}
        
        {/* Render current drawing element */}
        {currentElement && (
          <ElementRenderer
            element={currentElement}
            isSelected={false}
            camera={camera}
          />
        )}
      </svg>

      {/* Inline Text Editor */}
      {inlineText && inlineTextScreenPos && (
        <div
          className="fixed z-50"
          style={{
            left: inlineTextScreenPos.x,
            top: inlineTextScreenPos.y,
            transform: `scale(${camera.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Font selector bar */}
          <div 
            className="flex items-center gap-1 mb-1 p-1 rounded-lg glass-panel"
            style={{ transform: `scale(${1 / camera.zoom})`, transformOrigin: '0 100%' }}
          >
            <select
              value={inlineText.fontFamily}
              onChange={(e) => setInlineText(prev => prev ? { ...prev, fontFamily: e.target.value } : null)}
              className="px-2 py-1 rounded text-xs bg-secondary text-foreground border border-border/50 focus:outline-none"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f.split(',')[0].replace(/"/g, '')}
                </option>
              ))}
            </select>
            <select
              value={inlineText.fontSize}
              onChange={(e) => setInlineText(prev => prev ? { ...prev, fontSize: Number(e.target.value) } : null)}
              className="w-16 px-2 py-1 rounded text-xs bg-secondary text-foreground border border-border/50 focus:outline-none"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {[12, 16, 20, 24, 32, 48, 64, 96].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>
          <textarea
            ref={textInputRef}
            value={inlineText.text}
            onChange={(e) => setInlineText(prev => prev ? { ...prev, text: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                commitInlineText();
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitInlineText();
              }
              e.stopPropagation();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Type here..."
            className="bg-transparent border-none outline-none resize-none text-foreground caret-primary"
            style={{
              fontFamily: inlineText.fontFamily,
              fontSize: inlineText.fontSize,
              color: strokeColor,
              minWidth: '100px',
              minHeight: `${inlineText.fontSize * 1.5}px`,
              lineHeight: 1.2,
              padding: 0,
              margin: 0,
            }}
            autoFocus
          />
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 glass-panel px-3 py-1.5 rounded-lg">
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(camera.zoom * 100)}%
        </span>
      </div>
    </div>
  );
});
