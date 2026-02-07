import React, { memo, useMemo } from 'react';
import { CanvasElement, FreehandElement, LineElement, ArrowElement, TextElement, DiamondElement, TriangleElement, StarElement } from '@/types/canvas';
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
      case 'text':
        return renderText(element as TextElement);
      case 'diamond':
        return renderDiamond(element as DiamondElement);
      case 'triangle':
        return renderTriangle(element as TriangleElement);
      case 'star':
        return renderStar(element as StarElement);
      default:
        return null;
    }
  }, [element]);

  const selectionStyle = isSelected ? {
    filter: 'drop-shadow(0 0 4px hsl(239 84% 67% / 0.6))',
  } : {};

  // Calculate proper bounding box for selection
  const selBounds = getSelectionBounds(element);

  return (
    <g 
      style={{ 
        opacity: element.opacity,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        transformOrigin: element.rotation ? `${element.x + element.width / 2}px ${element.y + element.height / 2}px` : undefined,
        ...selectionStyle 
      }}
    >
      {content}
      {isSelected && selBounds && (
        <rect
          x={selBounds.x - 4}
          y={selBounds.y - 4}
          width={selBounds.w + 8}
          height={selBounds.h + 8}
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

function getSelectionBounds(el: CanvasElement) {
  if (el.type === 'line' || el.type === 'arrow') {
    const { startPoint, endPoint } = el as LineElement;
    const minX = Math.min(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const maxY = Math.max(startPoint.y, endPoint.y);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return { x: el.x, y: el.y, w: Math.abs(el.width), h: Math.abs(el.height) };
}

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
  
  const rx = Math.min(x, x + width);
  const ry = Math.min(y, y + height);
  
  return (
    <rect
      x={rx}
      y={ry}
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

function renderText(element: TextElement): JSX.Element {
  const { x, y, text, fontSize, fontFamily, strokeColor, textAlign } = element;
  
  const lines = text.split('\n');
  
  return (
    <text
      x={x}
      y={y + fontSize}
      fill={strokeColor}
      fontSize={fontSize}
      fontFamily={fontFamily}
      textAnchor={textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start'}
      style={{ userSelect: 'none' }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : fontSize * 1.2}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function renderDiamond(element: DiamondElement): JSX.Element {
  const { x, y, width, height, strokeColor, fillColor, strokeWidth } = element;
  const w = Math.abs(width);
  const h = Math.abs(height);
  const rx = Math.min(x, x + width);
  const ry = Math.min(y, y + height);
  
  const points = [
    `${rx + w / 2},${ry}`,
    `${rx + w},${ry + h / 2}`,
    `${rx + w / 2},${ry + h}`,
    `${rx},${ry + h / 2}`,
  ].join(' ');
  
  return (
    <polygon
      points={points}
      fill={fillColor === 'transparent' ? 'none' : fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}

function renderTriangle(element: TriangleElement): JSX.Element {
  const { x, y, width, height, strokeColor, fillColor, strokeWidth } = element;
  const w = Math.abs(width);
  const h = Math.abs(height);
  const rx = Math.min(x, x + width);
  const ry = Math.min(y, y + height);
  
  const points = [
    `${rx + w / 2},${ry}`,
    `${rx + w},${ry + h}`,
    `${rx},${ry + h}`,
  ].join(' ');
  
  return (
    <polygon
      points={points}
      fill={fillColor === 'transparent' ? 'none' : fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}

function renderStar(element: StarElement): JSX.Element {
  const { x, y, width, height, strokeColor, fillColor, strokeWidth } = element;
  const w = Math.abs(width);
  const h = Math.abs(height);
  const rx = Math.min(x, x + width);
  const ry = Math.min(y, y + height);
  const cx = rx + w / 2;
  const cy = ry + h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * (element.innerRadius || 0.4);
  const numPoints = element.points || 5;
  
  const starPoints: string[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (Math.PI / numPoints) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    starPoints.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  
  return (
    <polygon
      points={starPoints.join(' ')}
      fill={fillColor === 'transparent' ? 'none' : fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}
