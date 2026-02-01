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
  Redo2
} from 'lucide-react';
import { Tool } from '@/types/canvas';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: { id: Tool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

export function Toolbar({ 
  activeTool, 
  onToolChange, 
  onUndo, 
  onRedo,
  canUndo,
  canRedo 
}: ToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-1">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={cn(
                  'tool-button',
                  !canUndo && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Undo2 className="w-4 h-4" />
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
                  'tool-button',
                  !canRedo && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Redo2 className="w-4 h-4" />
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
                  className={cn('tool-button', activeTool === tool.id && 'active')}
                >
                  <tool.icon className="w-4 h-4" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent className="tooltip-content">
                <span>{tool.label}</span>
                <span className="kbd ml-2">{tool.shortcut}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
