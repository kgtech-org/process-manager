'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Type,
  Trash2,
  Download,
  MousePointer,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3x3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

type ArrowStyle = 'solid' | 'dashed' | 'double';

interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  arrowStyle?: ArrowStyle;
  arrowWidth?: number;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  textColor?: string;
}

interface DiagramEditorProps {
  initialShapes?: Shape[];
  onChange?: (shapes: Shape[]) => void;
  readOnly?: boolean;
}

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  initialShapes = [],
  onChange,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [selectedTool, setSelectedTool] = useState<'select' | 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'text'>('select');
  const [arrowStyle, setArrowStyle] = useState<ArrowStyle>('solid');
  const [fillColor, setFillColor] = useState<string>('#3b82f6');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [arrowWidth, setArrowWidth] = useState<number>(2);
  const [fontSize, setFontSize] = useState<number>(16);
  const [fontWeight, setFontWeight] = useState<string>('normal');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [history, setHistory] = useState<Shape[][]>([initialShapes]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState<number>(1);
  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 1200 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shapeId: string } | null>(null);
  const [editingText, setEditingText] = useState<{ shapeId: string; x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [resizing, setResizing] = useState<{ handle: string; startX: number; startY: number; originalShape: Shape } | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Sync shapes when initialShapes changes (for modal reopening)
  useEffect(() => {
    setShapes(initialShapes);
    setHistory([initialShapes]);
    setHistoryIndex(0);
  }, [initialShapes]);

  // Auto-resize canvas to fill container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(rect.width - 32, 1200),
          height: Math.max(rect.height - 32, 800),
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Draw shapes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (optional)
    if (showGrid) {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    }

    // Draw all shapes
    shapes.forEach((shape) => {
      drawShape(ctx, shape, shape.id === selectedShape);
    });

    // Draw resize handles for selected shape
    if (selectedShape && !readOnly) {
      const shape = shapes.find((s) => s.id === selectedShape);
      if (shape && shape.type !== 'text') {
        drawResizeHandles(ctx, shape);
      }
    }

    // Update selected shape properties panel
    if (selectedShape) {
      const shape = shapes.find((s) => s.id === selectedShape);
      if (shape) {
        if (shape.type === 'arrow') {
          setArrowWidth(shape.arrowWidth || 2);
          setStrokeColor(shape.color);
        } else if (shape.type === 'text') {
          setTextColor(shape.textColor || '#000000');
          setFontSize(shape.fontSize || 16);
          setFontWeight(shape.fontWeight || 'normal');
          setFontFamily(shape.fontFamily || 'Arial');
        } else {
          setFillColor(shape.color);
        }
      }
    }

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape, false);
    }
  }, [shapes, currentShape, selectedShape, backgroundColor, showGrid]);

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean) => {
    ctx.strokeStyle = isSelected ? '#3b82f6' : shape.color;
    ctx.fillStyle = shape.color + '33'; // Add transparency
    ctx.lineWidth = isSelected ? 3 : 2;

    switch (shape.type) {
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width || 0, shape.height || 0);
        ctx.fill();
        ctx.stroke();
        break;

      case 'circle':
        const radius = Math.sqrt(
          Math.pow((shape.width || 0) / 2, 2) + Math.pow((shape.height || 0) / 2, 2)
        );
        ctx.beginPath();
        ctx.arc(
          shape.x + (shape.width || 0) / 2,
          shape.y + (shape.height || 0) / 2,
          radius,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(shape.x + (shape.width || 0) / 2, shape.y);
        ctx.lineTo(shape.x + (shape.width || 0), shape.y + (shape.height || 0));
        ctx.lineTo(shape.x, shape.y + (shape.height || 0));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'arrow':
        const arrowStyleType = shape.arrowStyle || 'solid';
        const lineWidth = shape.arrowWidth || 2;

        // Set line width and style
        ctx.lineWidth = isSelected ? lineWidth + 2 : lineWidth;
        if (arrowStyleType === 'dashed') {
          ctx.setLineDash([10, 5]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.endX || shape.x, shape.endY || shape.y);
        ctx.stroke();

        // Reset line dash
        ctx.setLineDash([]);

        // Calculate angle for arrowheads
        const angle = Math.atan2(
          (shape.endY || shape.y) - shape.y,
          (shape.endX || shape.x) - shape.x
        );
        const headLength = 15;

        // Draw arrowhead at end
        ctx.beginPath();
        ctx.moveTo(shape.endX || shape.x, shape.endY || shape.y);
        ctx.lineTo(
          (shape.endX || shape.x) - headLength * Math.cos(angle - Math.PI / 6),
          (shape.endY || shape.y) - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(shape.endX || shape.x, shape.endY || shape.y);
        ctx.lineTo(
          (shape.endX || shape.x) - headLength * Math.cos(angle + Math.PI / 6),
          (shape.endY || shape.y) - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();

        // Draw arrowhead at start for double arrow
        if (arrowStyleType === 'double') {
          ctx.beginPath();
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(
            shape.x + headLength * Math.cos(angle - Math.PI / 6),
            shape.y + headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(
            shape.x + headLength * Math.cos(angle + Math.PI / 6),
            shape.y + headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;

      case 'text':
        const textFontSize = shape.fontSize || 16;
        const textFontWeight = shape.fontWeight || 'normal';
        const textFontFamily = shape.fontFamily || 'Arial';
        const textColorValue = shape.textColor || '#000000';

        ctx.fillStyle = textColorValue;
        ctx.font = `${textFontWeight} ${textFontSize}px ${textFontFamily}`;
        ctx.fillText(shape.text || '', shape.x, shape.y);

        // Draw selection box around text
        if (isSelected) {
          const textMetrics = ctx.measureText(shape.text || '');
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(shape.x - 2, shape.y - textFontSize, textMetrics.width + 4, textFontSize + 4);
        }
        break;
    }
  };

  // Draw resize handles
  const drawResizeHandles = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    if (shape.type === 'arrow') {
      // Draw handles at arrow endpoints
      const handles = [
        { x: shape.x, y: shape.y },
        { x: shape.endX || shape.x, y: shape.endY || shape.y },
      ];

      handles.forEach((handle) => {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(handle.x - 5, handle.y - 5, 10, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(handle.x - 5, handle.y - 5, 10, 10);
      });
    } else {
      // Draw handles at corners and edges for shapes
      const handles = [
        { x: shape.x, y: shape.y, cursor: 'nw' }, // top-left
        { x: shape.x + (shape.width || 0), y: shape.y, cursor: 'ne' }, // top-right
        { x: shape.x + (shape.width || 0), y: shape.y + (shape.height || 0), cursor: 'se' }, // bottom-right
        { x: shape.x, y: shape.y + (shape.height || 0), cursor: 'sw' }, // bottom-left
        { x: shape.x + (shape.width || 0) / 2, y: shape.y, cursor: 'n' }, // top-middle
        { x: shape.x + (shape.width || 0) / 2, y: shape.y + (shape.height || 0), cursor: 's' }, // bottom-middle
        { x: shape.x, y: shape.y + (shape.height || 0) / 2, cursor: 'w' }, // left-middle
        { x: shape.x + (shape.width || 0), y: shape.y + (shape.height || 0) / 2, cursor: 'e' }, // right-middle
      ];

      handles.forEach((handle) => {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(handle.x - 5, handle.y - 5, 10, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(handle.x - 5, handle.y - 5, 10, 10);
      });
    }
  };

  // Check if point is on a resize handle
  const getResizeHandle = (x: number, y: number, shape: Shape): string | null => {
    const handleSize = 10;
    const tolerance = 5;

    if (shape.type === 'arrow') {
      if (Math.abs(x - shape.x) < tolerance && Math.abs(y - shape.y) < tolerance) return 'start';
      if (Math.abs(x - (shape.endX || shape.x)) < tolerance && Math.abs(y - (shape.endY || shape.y)) < tolerance) return 'end';
      return null;
    }

    const handles = [
      { x: shape.x, y: shape.y, cursor: 'nw' },
      { x: shape.x + (shape.width || 0), y: shape.y, cursor: 'ne' },
      { x: shape.x + (shape.width || 0), y: shape.y + (shape.height || 0), cursor: 'se' },
      { x: shape.x, y: shape.y + (shape.height || 0), cursor: 'sw' },
      { x: shape.x + (shape.width || 0) / 2, y: shape.y, cursor: 'n' },
      { x: shape.x + (shape.width || 0) / 2, y: shape.y + (shape.height || 0), cursor: 's' },
      { x: shape.x, y: shape.y + (shape.height || 0) / 2, cursor: 'w' },
      { x: shape.x + (shape.width || 0), y: shape.y + (shape.height || 0) / 2, cursor: 'e' },
    ];

    for (const handle of handles) {
      if (Math.abs(x - handle.x) < tolerance && Math.abs(y - handle.y) < tolerance) {
        return handle.cursor;
      }
    }

    return null;
  };

  // Improved hit detection helper
  const isPointInShape = (x: number, y: number, shape: Shape): boolean => {
    if (shape.type === 'arrow') {
      // Better arrow hit detection - check if point is near the line
      const x1 = shape.x;
      const y1 = shape.y;
      const x2 = shape.endX || x1;
      const y2 = shape.endY || y1;

      // Distance from point to line segment
      const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      if (lineLength === 0) return Math.abs(x - x1) < 10 && Math.abs(y - y1) < 10;

      const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (lineLength ** 2)));
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      const distance = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

      return distance < 10; // 10px tolerance
    } else if (shape.type === 'text') {
      // Text bounding box hit detection
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const textFontSize = shape.fontSize || 16;
      ctx.font = `${shape.fontWeight || 'normal'} ${textFontSize}px ${shape.fontFamily || 'Arial'}`;
      const metrics = ctx.measureText(shape.text || '');

      return (
        x >= shape.x - 2 &&
        x <= shape.x + metrics.width + 2 &&
        y >= shape.y - textFontSize &&
        y <= shape.y + 4
      );
    } else {
      // Standard bounding box for rectangles, circles, triangles
      return (
        x >= shape.x &&
        x <= shape.x + (shape.width || 0) &&
        y >= shape.y &&
        y <= shape.y + (shape.height || 0)
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Close context menu if open
    setContextMenu(null);

    if (selectedTool === 'select') {
      // Check if clicking on a resize handle first
      if (selectedShape) {
        const shape = shapes.find((s) => s.id === selectedShape);
        if (shape && shape.type !== 'text') {
          const handle = getResizeHandle(x, y, shape);
          if (handle) {
            setResizing({ handle, startX: x, startY: y, originalShape: { ...shape } });
            return;
          }
        }
      }

      // Find clicked shape (reverse order to get topmost)
      const clickedShape = [...shapes].reverse().find((shape) => isPointInShape(x, y, shape));

      if (clickedShape) {
        setSelectedShape(clickedShape.id);
        setIsDragging(true);
        setDragOffset({
          x: x - clickedShape.x,
          y: y - clickedShape.y,
        });
      } else {
        setSelectedShape(null);
      }
    } else {
      setIsDrawing(true);
      setStartPoint({ x, y });

      if (selectedTool === 'text') {
        // Show inline text input instead of prompt
        setEditingText({ shapeId: `shape-${Date.now()}`, x, y });
        setTextInput('');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Handle resizing
    if (resizing && selectedShape) {
      const shape = shapes.find((s) => s.id === selectedShape);
      if (!shape) return;

      const dx = x - resizing.startX;
      const dy = y - resizing.startY;
      const originalShape = resizing.originalShape;

      let updatedShape: Partial<Shape> = {};

      if (shape.type === 'arrow') {
        if (resizing.handle === 'start') {
          updatedShape = { x, y };
        } else if (resizing.handle === 'end') {
          updatedShape = { endX: x, endY: y };
        }
      } else {
        // Handle shape resizing based on handle position
        const handle = resizing.handle;

        if (handle.includes('n')) { // North (top)
          updatedShape.y = originalShape.y! + dy;
          updatedShape.height = Math.max(10, (originalShape.height || 0) - dy);
        }
        if (handle.includes('s')) { // South (bottom)
          updatedShape.height = Math.max(10, (originalShape.height || 0) + dy);
        }
        if (handle.includes('w')) { // West (left)
          updatedShape.x = originalShape.x + dx;
          updatedShape.width = Math.max(10, (originalShape.width || 0) - dx);
        }
        if (handle.includes('e')) { // East (right)
          updatedShape.width = Math.max(10, (originalShape.width || 0) + dx);
        }
      }

      const updatedShapes = shapes.map((s) =>
        s.id === selectedShape ? { ...s, ...updatedShape } : s
      );
      setShapes(updatedShapes);
      return;
    }

    // Handle dragging selected shape
    if (isDragging && selectedShape && dragOffset) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;

      const updatedShapes = shapes.map((shape) => {
        if (shape.id === selectedShape) {
          if (shape.type === 'arrow') {
            const deltaX = newX - shape.x;
            const deltaY = newY - shape.y;
            return {
              ...shape,
              x: newX,
              y: newY,
              endX: (shape.endX || shape.x) + deltaX,
              endY: (shape.endY || shape.y) + deltaY,
            };
          } else {
            return { ...shape, x: newX, y: newY };
          }
        }
        return shape;
      });

      setShapes(updatedShapes);
      return;
    }

    // Handle drawing new shape
    if (!isDrawing || !startPoint || selectedTool === 'text') return;

    const width = x - startPoint.x;
    const height = y - startPoint.y;

    let shape: Shape;

    if (selectedTool === 'arrow') {
      shape = {
        id: `shape-${Date.now()}`,
        type: 'arrow',
        x: startPoint.x,
        y: startPoint.y,
        endX: x,
        endY: y,
        color: strokeColor,
        arrowStyle: arrowStyle,
        arrowWidth: arrowWidth,
      };
    } else {
      shape = {
        id: `shape-${Date.now()}`,
        type: selectedTool as 'rectangle' | 'circle' | 'triangle',
        x: startPoint.x,
        y: startPoint.y,
        width,
        height,
        color: fillColor,
      };
    }

    setCurrentShape(shape);
  };

  const handleMouseUp = () => {
    if (readOnly) return;

    // Handle end of resizing
    if (resizing) {
      setResizing(null);
      updateHistory(shapes);
      onChange?.(shapes);
      return;
    }

    // Handle end of dragging
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(null);
      updateHistory(shapes);
      onChange?.(shapes);
      return;
    }

    // Handle end of drawing
    if (!isDrawing || !currentShape) return;

    addShape(currentShape);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentShape(null);
    setSelectedTool('select');
  };

  const addShape = (shape: Shape) => {
    const newShapes = [...shapes, shape];
    setShapes(newShapes);
    updateHistory(newShapes);
    onChange?.(newShapes);
  };

  const deleteSelected = () => {
    if (!selectedShape) return;
    const newShapes = shapes.filter((s) => s.id !== selectedShape);
    setShapes(newShapes);
    updateHistory(newShapes);
    setSelectedShape(null);
    onChange?.(newShapes);
  };

  const updateHistory = (newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newShapes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const previousShapes = history[historyIndex - 1];
      setShapes(previousShapes);
      onChange?.(previousShapes);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextShapes = history[historyIndex + 1];
      setShapes(nextShapes);
      onChange?.(nextShapes);
    }
  };

  const exportDiagram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'diagram.png';
    link.href = dataUrl;
    link.click();
  };

  const clearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      const newShapes: Shape[] = [];
      setShapes(newShapes);
      updateHistory(newShapes);
      onChange?.(newShapes);
    }
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.3));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const updateShapeProperty = (shapeId: string, updates: Partial<Shape>) => {
    const newShapes = shapes.map((s) =>
      s.id === shapeId ? { ...s, ...updates } : s
    );
    setShapes(newShapes);
    updateHistory(newShapes);
    onChange?.(newShapes);
  };

  // Z-index management
  const bringToFront = (shapeId: string) => {
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;
    const newShapes = shapes.filter((s) => s.id !== shapeId).concat(shape);
    setShapes(newShapes);
    updateHistory(newShapes);
    onChange?.(newShapes);
  };

  const sendToBack = (shapeId: string) => {
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;
    const newShapes = [shape].concat(shapes.filter((s) => s.id !== shapeId));
    setShapes(newShapes);
    updateHistory(newShapes);
    onChange?.(newShapes);
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const clickedShape = [...shapes].reverse().find((shape) => isPointInShape(x, y, shape));

    if (clickedShape) {
      setSelectedShape(clickedShape.id);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        shapeId: clickedShape.id,
      });
    }
  };

  // Handle text input submission
  const handleTextSubmit = () => {
    if (!editingText || !textInput.trim()) {
      setEditingText(null);
      return;
    }

    const newShape: Shape = {
      id: editingText.shapeId,
      type: 'text',
      x: editingText.x,
      y: editingText.y,
      text: textInput,
      color: fillColor,
      textColor,
      fontSize,
      fontWeight,
      fontFamily,
    };
    addShape(newShape);
    setEditingText(null);
    setTextInput('');
    setSelectedTool('select');
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar - single row with left/center/right layout */}
      {!readOnly && (
        <div className="border rounded-lg bg-card px-2 py-1.5">
          <div className="flex items-center justify-between gap-4">
            {/* LEFT: Drawing Tools */}
            <div className="flex items-center gap-0.5">
              <Button
                variant={selectedTool === 'select' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTool('select')}
                title="Select"
              >
                <MousePointer className="h-4 w-4" />
              </Button>

              <div className="h-6 w-px bg-border mx-1" />

              <Button
                variant={selectedTool === 'rectangle' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTool('rectangle')}
                title="Rectangle"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'circle' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTool('circle')}
                title="Circle"
              >
                <Circle className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'triangle' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTool('triangle')}
                title="Triangle"
              >
                <Triangle className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'arrow' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTool('arrow')}
                title="Arrow"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'text' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTool('text')}
                title="Text"
              >
                <Type className="h-4 w-4" />
              </Button>

              <div className="h-6 w-px bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={undo}
                disabled={historyIndex === 0}
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={redo}
                disabled={historyIndex === history.length - 1}
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={deleteSelected}
                disabled={!selectedShape}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* CENTER: Format Controls (when shape selected) */}
            <div className="flex items-center gap-3 flex-1 justify-center text-xs">
              {selectedShape && (() => {
                const shape = shapes.find((s) => s.id === selectedShape);
                if (!shape) return null;

                return (
                  <>
                    {shape.type === 'text' && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Color</span>
                          <input
                            type="color"
                            value={shape.textColor || '#000000'}
                            onChange={(e) => updateShapeProperty(selectedShape, { textColor: e.target.value })}
                            className="h-8 w-12 border rounded cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Size</span>
                          <input
                            type="number"
                            min="8"
                            max="72"
                            value={shape.fontSize || 16}
                            onChange={(e) => updateShapeProperty(selectedShape, { fontSize: parseInt(e.target.value) })}
                            className="h-8 w-16 px-2 text-xs border rounded"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Weight</span>
                          <select
                            value={shape.fontWeight || 'normal'}
                            onChange={(e) => updateShapeProperty(selectedShape, { fontWeight: e.target.value })}
                            className="h-8 px-2 py-1 text-xs border rounded bg-background"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Font</span>
                          <select
                            value={shape.fontFamily || 'Arial'}
                            onChange={(e) => updateShapeProperty(selectedShape, { fontFamily: e.target.value })}
                            className="h-8 px-2 py-1 text-xs border rounded bg-background min-w-[100px]"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times</option>
                            <option value="Courier New">Courier</option>
                            <option value="Verdana">Verdana</option>
                          </select>
                        </div>
                      </>
                    )}

                    {shape.type === 'arrow' && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Color</span>
                          <input
                            type="color"
                            value={shape.color || '#000000'}
                            onChange={(e) => updateShapeProperty(selectedShape, { color: e.target.value })}
                            className="h-8 w-12 border rounded cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Width</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={shape.arrowWidth || 2}
                            onChange={(e) => updateShapeProperty(selectedShape, { arrowWidth: parseInt(e.target.value) })}
                            className="h-8 w-16 px-2 text-xs border rounded"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Style</span>
                          <select
                            value={shape.arrowStyle || 'solid'}
                            onChange={(e) => updateShapeProperty(selectedShape, { arrowStyle: e.target.value as ArrowStyle })}
                            className="h-8 px-2 py-1 text-xs border rounded bg-background"
                          >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="double">Double</option>
                          </select>
                        </div>
                      </>
                    )}

                    {(shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'triangle') && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Fill</span>
                        <input
                          type="color"
                          value={shape.color || '#3b82f6'}
                          onChange={(e) => updateShapeProperty(selectedShape, { color: e.target.value })}
                          className="h-8 w-12 border rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* RIGHT: Zoom + Export */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={zoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={resetZoom}
                title="Fit"
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium px-2 min-w-[50px] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={zoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <div className="h-6 w-px bg-border mx-1" />

              <Button
                variant={showGrid ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle Grid"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-8 w-8 border rounded cursor-pointer"
                title="Canvas Background"
              />

              <div className="h-6 w-px bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={clearCanvas}
                title="Clear"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={exportDiagram}
                title="Export"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <Card className="p-0 overflow-auto relative flex-1" ref={containerRef}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className={cn(
              !readOnly && 'cursor-crosshair'
            )}
            style={{ backgroundColor }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* Inline Text Input */}
        {editingText && (
          <div
            className="absolute bg-white border-2 border-blue-500 rounded shadow-lg"
            style={{
              left: `${editingText.x * zoom}px`,
              top: `${editingText.y * zoom}px`,
              transform: 'translate(0, -100%)',
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  setEditingText(null);
                  setTextInput('');
                }
              }}
              onBlur={handleTextSubmit}
              autoFocus
              placeholder="Enter text..."
              className="px-2 py-1 text-sm outline-none min-w-[200px]"
            />
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="absolute bg-white border rounded shadow-lg py-1 z-50"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onMouseLeave={() => setContextMenu(null)}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              onClick={() => {
                bringToFront(contextMenu.shapeId);
                setContextMenu(null);
              }}
            >
              Bring to Front
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              onClick={() => {
                sendToBack(contextMenu.shapeId);
                setContextMenu(null);
              }}
            >
              Send to Back
            </button>
            <div className="border-t my-1" />
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2"
              onClick={() => {
                deleteSelected();
                setContextMenu(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </Card>

      {readOnly && (
        <p className="text-sm text-muted-foreground text-center">
          Read-only mode - editing is disabled
        </p>
      )}
    </div>
  );
};
