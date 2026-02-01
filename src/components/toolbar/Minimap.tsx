import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CanvasElement, Camera } from '@/types/canvas';

interface MinimapProps {
  elements: CanvasElement[];
  camera: Camera;
  viewportWidth: number;
  viewportHeight: number;
  onNavigate: (x: number, y: number) => void;
}

const MINIMAP_WIDTH = 192;
const MINIMAP_HEIGHT = 128;
const MINIMAP_SCALE = 0.02;

export function Minimap({ 
  elements, 
  camera, 
  viewportWidth, 
  viewportHeight,
  onNavigate 
}: MinimapProps) {
  // Calculate viewport bounds on the minimap
  const viewportRect = useMemo(() => {
    const width = (viewportWidth / camera.zoom) * MINIMAP_SCALE;
    const height = (viewportHeight / camera.zoom) * MINIMAP_SCALE;
    const x = (-camera.x / camera.zoom) * MINIMAP_SCALE + MINIMAP_WIDTH / 2;
    const y = (-camera.y / camera.zoom) * MINIMAP_SCALE + MINIMAP_HEIGHT / 2;
    
    return { x, y, width, height };
  }, [camera, viewportWidth, viewportHeight]);

  // Handle click to navigate
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert minimap coordinates to canvas coordinates
    const canvasX = ((clickX - MINIMAP_WIDTH / 2) / MINIMAP_SCALE) * camera.zoom;
    const canvasY = ((clickY - MINIMAP_HEIGHT / 2) / MINIMAP_SCALE) * camera.zoom;
    
    // Center the viewport on the clicked point
    onNavigate(
      -canvasX + viewportWidth / 2,
      -canvasY + viewportHeight / 2
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="minimap cursor-pointer"
    >
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onClick={handleClick}
        className="bg-card/50"
      >
        {/* Elements preview */}
        <g transform={`translate(${MINIMAP_WIDTH / 2}, ${MINIMAP_HEIGHT / 2}) scale(${MINIMAP_SCALE})`}>
          {elements.map(element => (
            <rect
              key={element.id}
              x={element.x}
              y={element.y}
              width={Math.max(element.width, 10)}
              height={Math.max(element.height, 10)}
              fill="hsl(var(--primary) / 0.5)"
              rx={2 / MINIMAP_SCALE}
            />
          ))}
        </g>

        {/* Viewport indicator */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </motion.div>
  );
}
