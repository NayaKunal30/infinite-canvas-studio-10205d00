import React from 'react';
import { motion } from 'framer-motion';
import { 
  MousePointer2, 
  Hand, 
  Pencil, 
  Square, 
  Circle, 
  Minus, 
  Eraser,
  Undo2,
  Redo2,
  Type,
  ArrowRight,
  Diamond,
  Triangle,
  Star
} from 'lucide-react';
import { Tool } from '@/types/canvas';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from './ThemeToggle';
import { ExportMenu } from './ExportMenu';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  svgRef?: React.RefObject<SVGSVGElement>;
  elements?: any[];
}

const tools: { id: Tool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'diamond', icon: Diamond, label: 'Diamond', shortcut: 'D' },
  { id: 'triangle', icon: Triangle, label: 'Triangle', shortcut: 'G' },
  { id: 'star', icon: Star, label: 'Star', shortcut: 'S' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
];

export function Toolbar({ 
  activeTool, 
  onToolChange, 
  onUndo, 
  onRedo,
  canUndo,
  canRedo,
  svgRef,
  elements = []
}: ToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-0.5">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={cn(
                  'tool-button w-8 h-8',
                  !canUndo && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip-content">
              <span>Undo</span>
              <span className="kbd ml-2">⌘Z</span>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={cn(
                  'tool-button w-8 h-8',
                  !canRedo && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip-content">
              <span>Redo</span>
              <span className="kbd ml-2">⌘⇧Z</span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-0.5">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onToolChange(tool.id)}
                  className={cn('tool-button w-8 h-8', activeTool === tool.id && 'active')}
                >
                  <tool.icon className="w-3.5 h-3.5" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent className="tooltip-content">
                <span>{tool.label}</span>
                <span className="kbd ml-2">{tool.shortcut}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border/50 mx-0.5" />

        {/* Export & Theme */}
        <div className="flex items-center gap-0.5">
          {svgRef && <ExportMenu elements={elements} svgRef={svgRef} />}
          <ThemeToggle />
        </div>
      </div>
    </motion.div>
  );
}
