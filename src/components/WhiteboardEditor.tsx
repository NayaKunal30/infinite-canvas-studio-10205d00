import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InfiniteCanvas, InfiniteCanvasRef } from '@/components/canvas/InfiniteCanvas';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { ColorPalette } from '@/components/toolbar/ColorPalette';
import { Minimap } from '@/components/toolbar/Minimap';
import { useCanvasState } from '@/hooks/useCanvasState';
import { Tool } from '@/types/canvas';
import { Command } from 'lucide-react';

export function WhiteboardEditor() {
  const {
    state,
    setTool,
    setCamera,
    setStrokeColor,
    setFillColor,
    setStrokeWidth,
    startDrawing,
    updateDrawing,
    finishDrawing,
    selectElements,
    deleteElements,
    addElement,
    replaceCurrentWithElement,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasState();

  const canvasRef = useRef<InfiniteCanvasRef>(null);
  const [svgRef, setSvgRef] = useState<React.RefObject<SVGSVGElement>>({ current: null });

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showWelcome, setShowWelcome] = useState(true);

  // Update dimensions on resize and get svgRef
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const interval = setInterval(() => {
      if (canvasRef.current) {
        const svg = canvasRef.current.getSvgRef();
        if (svg) {
          setSvgRef({ current: svg });
          clearInterval(interval);
        }
      }
    }, 100);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearInterval(interval);
    };
  }, []);

  // Hide welcome after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in an input
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
      return;
    }

    if (!e.metaKey && !e.ctrlKey) {
      const toolMap: Record<string, Tool> = {
        'v': 'select',
        'h': 'pan',
        'p': 'pencil',
        'r': 'rectangle',
        'o': 'ellipse',
        'l': 'line',
        'a': 'arrow',
        't': 'text',
        'e': 'eraser',
        'd': 'diamond',
        'g': 'triangle',
        's': 'star',
      };
      
      const tool = toolMap[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        setTool(tool);
        setShowWelcome(false);
        return;
      }
    }

    // Undo/Redo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    // Delete selected elements
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedIds.length > 0) {
      e.preventDefault();
      deleteElements(state.selectedIds);
    }
  }, [setTool, undo, redo, deleteElements, state.selectedIds]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Navigate minimap
  const handleMinimapNavigate = useCallback((x: number, y: number) => {
    setCamera({ ...state.camera, x, y });
  }, [setCamera, state.camera]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-canvas">
      {/* Canvas */}
      <InfiniteCanvas
        ref={canvasRef}
        elements={state.elements}
        currentElement={state.currentElement}
        selectedIds={state.selectedIds}
        camera={state.camera}
        activeTool={state.activeTool}
        strokeColor={state.strokeColor}
        fillColor={state.fillColor}
        strokeWidth={state.strokeWidth}
        isDrawing={state.isDrawing}
        onCameraChange={setCamera}
        onStartDrawing={startDrawing}
        onUpdateDrawing={updateDrawing}
        onFinishDrawing={finishDrawing}
        onSelectElements={selectElements}
        onAddElement={addElement}
        onDeleteElements={deleteElements}
        onReplaceCurrentWithElement={replaceCurrentWithElement}
      />

      {/* Toolbar */}
      <Toolbar
        activeTool={state.activeTool}
        onToolChange={(tool) => {
          setTool(tool);
          setShowWelcome(false);
        }}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        svgRef={svgRef}
        elements={state.elements}
      />

      {/* Color Palette */}
      <ColorPalette
        strokeColor={state.strokeColor}
        fillColor={state.fillColor}
        strokeWidth={state.strokeWidth}
        onStrokeColorChange={setStrokeColor}
        onFillColorChange={setFillColor}
        onStrokeWidthChange={setStrokeWidth}
      />

      {/* Minimap */}
      <Minimap
        elements={state.elements}
        camera={state.camera}
        viewportWidth={dimensions.width}
        viewportHeight={dimensions.height}
        onNavigate={handleMinimapNavigate}
      />

      {/* Welcome overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel rounded-3xl p-8 max-w-md text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-glow">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary-foreground"
                >
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Welcome to Canvas
              </h1>
              
              <p className="text-muted-foreground mb-6">
                An infinite canvas for your ideas. Draw shapes, they'll be auto-recognized!
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50">
                  <span className="kbd">P</span>
                  <span>Pencil</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50">
                  <span className="kbd">E</span>
                  <span>Eraser</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50">
                  <span className="kbd">T</span>
                  <span>Text</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50">
                  <Command className="w-3 h-3" />
                  <span className="kbd">Z</span>
                  <span>Undo</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50"
      >
        Infinite Canvas • Scroll to zoom • Draw shapes to auto-recognize
      </motion.div>
    </div>
  );
}
