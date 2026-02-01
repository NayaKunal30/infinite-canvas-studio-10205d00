import React, { memo, useMemo } from 'react';
import { CanvasElement, FreehandElement, LineElement, ArrowElement } from '@/types/canvas';
import { getFreehandPath, getArrowHeadPoints } from '@/utils/drawing';

interface ElementRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  camera: { x: number; y: number; zoom: number };
}

export const ElementRenderer = memo(function ElementRenderer({ 
  element, 
  isSelected,
  camera 
}: ElementRendererProps) {
  const content = useMemo(() => {
    switch (element.type) {
      case 'freehand':
        return renderFreehand(element as FreehandElement);
      case 'rectangle':
        return renderRectangle(element);
      case 'ellipse':
        return renderEllipse(element);
      case 'line':
        return renderLine(element as LineElement);
      case 'arrow':
        return renderArrow(element as ArrowElement);
      default:
        return null;
    }
  }, [element]);

  const selectionStyle = isSelected ? {
    filter: 'drop-shadow(0 0 4px hsl(239 84% 67% / 0.6))',
  } : {};

  return (
    <g 
      style={{ 
        opacity: element.opacity,
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: `${element.x + element.width / 2}px ${element.y + element.height / 2}px`,
        ...selectionStyle 
      }}
    >
      {content}
      {isSelected && (
        <rect
          x={element.x - 4}
          y={element.y - 4}
          width={element.width + 8}
          height={element.height + 8}
          fill="none"
          stroke="hsl(239 84% 67%)"
          strokeWidth={1.5 / camera.zoom}
          strokeDasharray={`${4 / camera.zoom} ${4 / camera.zoom}`}
          rx={4 / camera.zoom}
        />
      )}
    </g>
  );
});

function renderFreehand(element: FreehandElement): JSX.Element | null {
  if (element.points.length < 2) return null;
  
  const pathData = getFreehandPath(element.points, element.strokeWidth);
  
  return (
    <path
      d={pathData}
      fill={element.strokeColor}
      stroke="none"
    />
  );
}

function renderRectangle(element: CanvasElement): JSX.Element {
  const { x, y, width, height, strokeColor, fillColor, strokeWidth } = element;
  const cornerRadius = (element as any).cornerRadius || 0;
  
  return (
    <rect
      x={x}
      y={y}
      width={Math.abs(width)}
      height={Math.abs(height)}
      fill={fillColor === 'transparent' ? 'none' : fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      rx={cornerRadius}
    />
  );
}

function renderEllipse(element: CanvasElement): JSX.Element {
  const { x, y, width, height, strokeColor, fillColor, strokeWidth } = element;
  const cx = x + width / 2;
  const cy = y + height / 2;
  
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={Math.abs(width) / 2}
      ry={Math.abs(height) / 2}
      fill={fillColor === 'transparent' ? 'none' : fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
    />
  );
}

function renderLine(element: LineElement): JSX.Element {
  const { startPoint, endPoint, strokeColor, strokeWidth } = element;
  
  return (
    <line
      x1={startPoint.x}
      y1={startPoint.y}
      x2={endPoint.x}
      y2={endPoint.y}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  );
}

function renderArrow(element: ArrowElement): JSX.Element {
  const { startPoint, endPoint, strokeColor, strokeWidth, arrowHeadSize } = element;
  const headPoints = getArrowHeadPoints(startPoint, endPoint, arrowHeadSize);
  
  return (
    <g>
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={endPoint.x}
        y2={endPoint.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <polyline
        points={headPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
