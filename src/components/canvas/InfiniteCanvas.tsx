import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Point, 
  FreehandElement, 
  RectangleElement, 
  EllipseElement, 
  LineElement,
  generateId, 
  Camera,
  CanvasElement
} from '@/types/canvas';
import { screenToCanvas, getBoundingBoxFromPoints, clamp } from '@/utils/drawing';
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
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export function InfiniteCanvas({
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
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef<Point | null>(null);
  const startPoint = useRef<Point | null>(null);
  const currentPoints = useRef<Point[]>([]);

  // Get cursor style based on tool
  const getCursor = () => {
    switch (activeTool) {
      case 'pan': return isPanning ? 'grabbing' : 'grab';
      case 'select': return 'default';
      case 'pencil': return 'crosshair';
      case 'eraser': return 'crosshair';
      case 'rectangle':
      case 'ellipse':
      case 'line':
      case 'arrow':
        return 'crosshair';
      default: return 'default';
    }
  };

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clamp(camera.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
    
    // Calculate new camera position to zoom toward mouse
    const scale = newZoom / camera.zoom;
    const newX = mouseX - (mouseX - camera.x) * scale;
    const newY = mouseY - (mouseY - camera.y) * scale;
    
    onCameraChange({ x: newX, y: newY, zoom: newZoom });
  }, [camera, onCameraChange]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, camera);

    // Pan mode or middle mouse
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Space + drag to pan
    if (e.button === 0) {
      startPoint.current = canvasPoint;

      if (activeTool === 'select') {
        // Check if clicking on an element
        const clickedElement = [...elements].reverse().find(el => {
          return (
            canvasPoint.x >= el.x &&
            canvasPoint.x <= el.x + el.width &&
            canvasPoint.y >= el.y &&
            canvasPoint.y <= el.y + el.height
          );
        });
        
        if (clickedElement) {
          onSelectElements([clickedElement.id]);
        } else {
          onSelectElements([]);
        }
        return;
      }

      if (activeTool === 'pencil') {
        currentPoints.current = [{ ...canvasPoint, pressure: e.pressure }];
        
        const newElement: FreehandElement = {
          id: generateId(),
          type: 'freehand',
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
          points: currentPoints.current,
        };
        
        onStartDrawing(newElement);
      }

      if (activeTool === 'rectangle') {
        const newElement: RectangleElement = {
          id: generateId(),
          type: 'rectangle',
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
          cornerRadius: 0,
        };
        onStartDrawing(newElement);
      }

      if (activeTool === 'ellipse') {
        const newElement: EllipseElement = {
          id: generateId(),
          type: 'ellipse',
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
        onStartDrawing(newElement);
      }

      if (activeTool === 'line') {
        const newElement: LineElement = {
          id: generateId(),
          type: 'line',
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
          startPoint: canvasPoint,
          endPoint: canvasPoint,
        };
        onStartDrawing(newElement);
      }
    }
  }, [activeTool, camera, elements, strokeColor, fillColor, strokeWidth, onStartDrawing, onSelectElements]);

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

    if (!isDrawing || !startPoint.current) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, camera);

    if (activeTool === 'pencil') {
      currentPoints.current.push({ ...canvasPoint, pressure: e.pressure });
      const bbox = getBoundingBoxFromPoints(currentPoints.current);
      onUpdateDrawing({
        points: [...currentPoints.current],
        width: bbox.width,
        height: bbox.height,
      });
    }

    if (activeTool === 'rectangle' || activeTool === 'ellipse') {
      const width = canvasPoint.x - startPoint.current.x;
      const height = canvasPoint.y - startPoint.current.y;
      onUpdateDrawing({ width, height });
    }

    if (activeTool === 'line') {
      onUpdateDrawing({ 
        endPoint: canvasPoint,
        width: Math.abs(canvasPoint.x - startPoint.current.x),
        height: Math.abs(canvasPoint.y - startPoint.current.y),
      });
    }
  }, [isPanning, isDrawing, activeTool, camera, onCameraChange, onUpdateDrawing]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPoint.current = null;
      return;
    }

    if (isDrawing) {
      onFinishDrawing();
      startPoint.current = null;
      currentPoints.current = [];
    }
  }, [isPanning, isDrawing, onFinishDrawing]);

  // Add wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

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
        }}
      >
        {/* Render all elements */}
        {elements.map(element => (
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

      {/* Zoom indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-4 glass-panel px-3 py-1.5 rounded-lg"
      >
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(camera.zoom * 100)}%
        </span>
      </motion.div>
    </div>
  );
}
