import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Image, FileCode, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CanvasElement } from '@/types/canvas';

interface ExportMenuProps {
  elements: CanvasElement[];
  svgRef: React.RefObject<SVGSVGElement>;
}

export function ExportMenu({ elements, svgRef }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const getBoundingBox = () => {
    if (elements.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + Math.abs(el.width));
      maxY = Math.max(maxY, el.y + Math.abs(el.height));
    });

    // Add padding
    const padding = 50;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  };

  const generateSVGContent = () => {
    if (!svgRef.current) return '';

    const bbox = getBoundingBox();
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;

    // Clone the SVG content
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    
    // Remove transform from clone
    svgClone.style.transform = '';
    
    // Set viewBox to show all content
    svgClone.setAttribute('viewBox', `${bbox.minX} ${bbox.minY} ${width} ${height}`);
    svgClone.setAttribute('width', String(width));
    svgClone.setAttribute('height', String(height));

    // Add white background for light theme compatibility
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', String(bbox.minX));
    bg.setAttribute('y', String(bbox.minY));
    bg.setAttribute('width', String(width));
    bg.setAttribute('height', String(height));
    bg.setAttribute('fill', '#1a1a2e');
    svgClone.insertBefore(bg, svgClone.firstChild);

    return new XMLSerializer().serializeToString(svgClone);
  };

  const exportAsSVG = async () => {
    setIsExporting(true);
    
    try {
      const svgContent = generateSVGContent();
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `canvas-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const exportAsPNG = async () => {
    setIsExporting(true);
    
    try {
      const svgContent = generateSVGContent();
      const bbox = getBoundingBox();
      const width = bbox.maxX - bbox.minX;
      const height = bbox.maxY - bbox.minY;

      // Create image from SVG
      const img = document.createElement('img');
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Create canvas and draw
          const canvas = document.createElement('canvas');
          const scale = 2; // 2x resolution for better quality
          canvas.width = width * scale;
          canvas.height = height * scale;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Fill background
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw SVG
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          
          // Export as PNG
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Could not create blob'));
              return;
            }
            
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `canvas-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
            resolve();
          }, 'image/png');
          
          URL.revokeObjectURL(url);
        };
        
        img.onerror = reject;
        img.src = url;
      });
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            className="tool-button"
            aria-label="Export"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent className="tooltip-content">
          <span>Export</span>
        </TooltipContent>
      </Tooltip>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 mt-2 glass-panel rounded-xl p-2 min-w-[160px] z-50"
          >
            <button
              onClick={exportAsPNG}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Image className="w-4 h-4 text-muted-foreground" />
              <span>Export as PNG</span>
            </button>
            
            <button
              onClick={exportAsSVG}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <span>Export as SVG</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
