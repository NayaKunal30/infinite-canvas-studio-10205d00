import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { TextElement, generateId } from '@/types/canvas';

const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', family: 'Inter, sans-serif' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
  { id: 'monaco', name: 'Monaco', family: 'Monaco, monospace' },
  { id: 'comic', name: 'Comic Sans', family: '"Comic Sans MS", cursive' },
  { id: 'times', name: 'Times', family: '"Times New Roman", serif' },
  { id: 'arial', name: 'Arial', family: 'Arial, sans-serif' },
];

const FONT_SIZES = [12, 16, 20, 24, 32, 48, 64, 96];

interface TextEditorProps {
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
  strokeColor: string;
  onSave: (element: TextElement) => void;
  onCancel: () => void;
}

export function TextEditor({ screenX, screenY, canvasX, canvasY, strokeColor, onSave, onCancel }: TextEditorProps) {
  const [text, setText] = useState('');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].family);
  const [fontSize, setFontSize] = useState(24);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }

    const element: TextElement = {
      id: generateId(),
      type: 'text',
      x: canvasX,
      y: canvasY,
      width: text.length * fontSize * 0.6,
      height: fontSize * 1.5,
      rotation: 0,
      strokeColor,
      fillColor: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      isLocked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      text,
      fontSize,
      fontFamily,
      textAlign: 'left',
    };

    onSave(element);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-50 glass-panel rounded-xl p-4 min-w-[280px]"
      style={{ left: screenX, top: screenY }}
    >
      {/* Font and size selectors */}
      <div className="flex gap-2 mb-3">
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.id} value={font.family} style={{ fontFamily: font.family }}>
              {font.name}
            </option>
          ))}
        </select>
        
        <select
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-20 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      </div>

      {/* Text input */}
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your text..."
        className="w-full px-3 py-2 rounded-lg bg-secondary/50 text-foreground border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
        style={{ fontFamily, fontSize: Math.min(fontSize, 24) }}
      />

      {/* Preview */}
      <div className="mt-3 p-2 rounded-lg bg-muted/50 border border-border/30 min-h-[40px]">
        <span 
          className="break-words"
          style={{ fontFamily, fontSize: Math.min(fontSize, 20), color: strokeColor }}
        >
          {text || 'Preview'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          Add
        </button>
      </div>
    </motion.div>
  );
}

export { FONT_OPTIONS };
