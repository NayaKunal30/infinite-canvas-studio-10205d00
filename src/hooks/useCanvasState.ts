import { useCallback, useReducer, useRef } from 'react';
import { 
  CanvasElement, 
  Camera, 
  Tool, 
  HistoryEntry,
  generateId,
  Point,
  FreehandElement,
  RectangleElement,
  EllipseElement,
  LineElement,
  ArrowElement
} from '@/types/canvas';

// State shape
interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[];
  camera: Camera;
  activeTool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  isDrawing: boolean;
  currentElement: CanvasElement | null;
}

// Action types
type CanvasAction = 
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'SET_CAMERA'; camera: Camera }
  | { type: 'SET_STROKE_COLOR'; color: string }
  | { type: 'SET_FILL_COLOR'; color: string }
  | { type: 'SET_STROKE_WIDTH'; width: number }
  | { type: 'START_DRAWING'; element: CanvasElement }
  | { type: 'UPDATE_DRAWING'; points?: Point[]; width?: number; height?: number; endPoint?: Point }
  | { type: 'FINISH_DRAWING' }
  | { type: 'REPLACE_CURRENT'; element: CanvasElement }
  | { type: 'ADD_ELEMENT'; element: CanvasElement }
  | { type: 'UPDATE_ELEMENT'; id: string; updates: Partial<CanvasElement> }
  | { type: 'DELETE_ELEMENTS'; ids: string[] }
  | { type: 'SELECT_ELEMENTS'; ids: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'LOAD_ELEMENTS'; elements: CanvasElement[] }
  | { type: 'UNDO'; elements: CanvasElement[] }
  | { type: 'REDO'; elements: CanvasElement[] };

const initialState: CanvasState = {
  elements: [],
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  activeTool: 'pencil',
  strokeColor: '#ffffff',
  fillColor: 'transparent',
  strokeWidth: 2,
  isDrawing: false,
  currentElement: null,
};

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, selectedIds: [] };
    
    case 'SET_CAMERA':
      return { ...state, camera: action.camera };
    
    case 'SET_STROKE_COLOR':
      return { ...state, strokeColor: action.color };
    
    case 'SET_FILL_COLOR':
      return { ...state, fillColor: action.color };
    
    case 'SET_STROKE_WIDTH':
      return { ...state, strokeWidth: action.width };
    
    case 'START_DRAWING':
      return { 
        ...state, 
        isDrawing: true, 
        currentElement: action.element 
      };
    
    case 'UPDATE_DRAWING':
      if (!state.currentElement) return state;
      
      const updated = { ...state.currentElement };
      
      if (action.points && updated.type === 'freehand') {
        (updated as FreehandElement).points = action.points;
      }
      
      if (action.width !== undefined) {
        updated.width = action.width;
      }
      
      if (action.height !== undefined) {
        updated.height = action.height;
      }

      if (action.endPoint && (updated.type === 'line' || updated.type === 'arrow')) {
        (updated as LineElement).endPoint = action.endPoint;
      }
      
      return { ...state, currentElement: updated };
    
    case 'FINISH_DRAWING':
      if (!state.currentElement) return state;
      return { 
        ...state, 
        isDrawing: false, 
        elements: [...state.elements, state.currentElement],
        currentElement: null 
      };
    
    case 'REPLACE_CURRENT':
      return {
        ...state,
        isDrawing: false,
        elements: [...state.elements, action.element],
        currentElement: null,
      };
    
    case 'ADD_ELEMENT':
      return { ...state, elements: [...state.elements, action.element] };
    
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.id ? { ...el, ...action.updates, updatedAt: Date.now() } as CanvasElement : el
        ),
      };
    
    case 'DELETE_ELEMENTS':
      return {
        ...state,
        elements: state.elements.filter(el => !action.ids.includes(el.id)),
        selectedIds: state.selectedIds.filter(id => !action.ids.includes(id)),
      };
    
    case 'SELECT_ELEMENTS':
      return { ...state, selectedIds: action.ids };
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: [] };
    
    case 'LOAD_ELEMENTS':
      return { ...state, elements: action.elements };
    
    case 'UNDO':
    case 'REDO':
      return { ...state, elements: action.elements };
    
    default:
      return state;
  }
}

export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, initialState);
  
  // History for undo/redo
  const historyRef = useRef<HistoryEntry[]>([{ elements: [], timestamp: Date.now() }]);
  const historyIndexRef = useRef(0);
  
  // Push to history
  const pushHistory = useCallback(() => {
    const newEntry: HistoryEntry = {
      elements: [...state.elements],
      timestamp: Date.now(),
    };
    
    // Remove any future history if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newEntry);
    historyIndexRef.current = historyRef.current.length - 1;
    
    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [state.elements]);
  
  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const entry = historyRef.current[historyIndexRef.current];
      dispatch({ type: 'UNDO', elements: entry.elements });
    }
  }, []);
  
  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const entry = historyRef.current[historyIndexRef.current];
      dispatch({ type: 'REDO', elements: entry.elements });
    }
  }, []);
  
  // Actions
  const setTool = useCallback((tool: Tool) => {
    dispatch({ type: 'SET_TOOL', tool });
  }, []);
  
  const setCamera = useCallback((camera: Camera) => {
    dispatch({ type: 'SET_CAMERA', camera });
  }, []);
  
  const setStrokeColor = useCallback((color: string) => {
    dispatch({ type: 'SET_STROKE_COLOR', color });
  }, []);
  
  const setFillColor = useCallback((color: string) => {
    dispatch({ type: 'SET_FILL_COLOR', color });
  }, []);
  
  const setStrokeWidth = useCallback((width: number) => {
    dispatch({ type: 'SET_STROKE_WIDTH', width });
  }, []);
  
  const startDrawing = useCallback((element: CanvasElement) => {
    dispatch({ type: 'START_DRAWING', element });
  }, []);
  
  const updateDrawing = useCallback((updates: { points?: Point[]; width?: number; height?: number; endPoint?: Point }) => {
    dispatch({ type: 'UPDATE_DRAWING', ...updates });
  }, []);
  
  const finishDrawing = useCallback(() => {
    dispatch({ type: 'FINISH_DRAWING' });
    pushHistory();
  }, [pushHistory]);

  const replaceCurrentWithElement = useCallback((element: CanvasElement) => {
    dispatch({ type: 'REPLACE_CURRENT', element });
    pushHistory();
  }, [pushHistory]);
  
  const addElement = useCallback((element: CanvasElement) => {
    dispatch({ type: 'ADD_ELEMENT', element });
    pushHistory();
  }, [pushHistory]);
  
  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    dispatch({ type: 'UPDATE_ELEMENT', id, updates });
  }, []);
  
  const deleteElements = useCallback((ids: string[]) => {
    dispatch({ type: 'DELETE_ELEMENTS', ids });
    pushHistory();
  }, [pushHistory]);
  
  const selectElements = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_ELEMENTS', ids });
  }, []);
  
  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);
  
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;
  
  return {
    state,
    setTool,
    setCamera,
    setStrokeColor,
    setFillColor,
    setStrokeWidth,
    startDrawing,
    updateDrawing,
    finishDrawing,
    addElement,
    updateElement,
    deleteElements,
    selectElements,
    clearSelection,
    replaceCurrentWithElement,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
