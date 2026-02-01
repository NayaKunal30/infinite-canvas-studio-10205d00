import React from 'react';
import { motion } from 'framer-motion';
import { COLOR_PALETTE, STROKE_WIDTHS } from '@/types/canvas';
import { cn } from '@/lib/utils';

interface ColorPaletteProps {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  onStrokeColorChange: (color: string) => void;
  onFillColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
}

export function ColorPalette({
  strokeColor,
  fillColor,
  strokeWidth,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
}: ColorPaletteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-50"
    >
      <div className="glass-panel rounded-2xl p-3 flex flex-col gap-4">
        {/* Stroke Color */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Stroke
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {COLOR_PALETTE.map((color) => (
              <motion.button
                key={`stroke-${color}`}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onStrokeColorChange(color)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all duration-200',
                  strokeColor === color 
                    ? 'border-primary ring-2 ring-primary/30' 
                    : 'border-border/50 hover:border-muted-foreground/50'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Fill Color */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Fill
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onFillColorChange('transparent')}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all duration-200 relative overflow-hidden',
                fillColor === 'transparent' 
                  ? 'border-primary ring-2 ring-primary/30' 
                  : 'border-border/50 hover:border-muted-foreground/50'
              )}
            >
              {/* Transparent indicator */}
              <div className="absolute inset-0 bg-muted">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-destructive/50" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-destructive/70 -rotate-45 origin-center" />
              </div>
            </motion.button>
            {COLOR_PALETTE.slice(0, -1).map((color) => (
              <motion.button
                key={`fill-${color}`}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onFillColorChange(color)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all duration-200',
                  fillColor === color 
                    ? 'border-primary ring-2 ring-primary/30' 
                    : 'border-border/50 hover:border-muted-foreground/50'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Stroke Width */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Size
          </span>
          <div className="flex flex-col gap-1">
            {STROKE_WIDTHS.map((width) => (
              <motion.button
                key={width}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStrokeWidthChange(width)}
                className={cn(
                  'w-full px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-200',
                  strokeWidth === width
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary/80'
                )}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ 
                    width: width * 3, 
                    height: width * 3,
                    minWidth: 4,
                    minHeight: 4,
                    maxWidth: 24,
                    maxHeight: 24,
                  }}
                />
                <span className="text-xs font-medium">{width}px</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
