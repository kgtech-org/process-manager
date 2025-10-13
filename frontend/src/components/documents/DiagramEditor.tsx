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
  Maximize
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

  // Sync shapes when initialShapes changes (for modal reopening)
  useEffect(() => {
    setShapes(initialShapes);
    setHistory([initialShapes]);
    setHistoryIndex(0);
  }, [initialShapes]);

  // Draw shapes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
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

    // Draw all shapes
    shapes.forEach((shape) => {
      drawShape(ctx, shape, shape.id === selectedShape);
    });

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
  }, [shapes, currentShape, selectedShape, backgroundColor]);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (selectedTool === 'select') {
      // Check if clicking on existing shape
      const clickedShape = shapes.find((shape) => {
        if (shape.type === 'arrow') {
          // Simple hit detection for arrows
          return Math.abs(shape.x - x) < 10 && Math.abs(shape.y - y) < 10;
        }
        return (
          x >= shape.x &&
          x <= shape.x + (shape.width || 0) &&
          y >= shape.y &&
          y <= shape.y + (shape.height || 0)
        );
      });

      if (clickedShape) {
        setSelectedShape(clickedShape.id);
        setIsDragging(true);
        // Calculate offset from shape origin to click point
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
        const text = prompt('Enter text:');
        if (text) {
          const newShape: Shape = {
            id: `shape-${Date.now()}`,
            type: 'text',
            x,
            y,
            text,
            color: fillColor,
            textColor,
            fontSize,
            fontWeight,
            fontFamily,
          };
          addShape(newShape);
        }
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!readOnly && (
        <Card className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedTool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('select')}
            >
              <MousePointer className="h-4 w-4 mr-2" />
              Select
            </Button>
            <Button
              variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('rectangle')}
            >
              <Square className="h-4 w-4 mr-2" />
              Rectangle
            </Button>
            <Button
              variant={selectedTool === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('circle')}
            >
              <Circle className="h-4 w-4 mr-2" />
              Circle
            </Button>
            <Button
              variant={selectedTool === 'triangle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('triangle')}
            >
              <Triangle className="h-4 w-4 mr-2" />
              Triangle
            </Button>
            <Button
              variant={selectedTool === 'arrow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('arrow')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Arrow
            </Button>
            <Button
              variant={selectedTool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('text')}
            >
              <Type className="h-4 w-4 mr-2" />
              Text
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            {/* Arrow Style Selector */}
            {selectedTool === 'arrow' && (
              <>
                <select
                  value={arrowStyle}
                  onChange={(e) => setArrowStyle(e.target.value as ArrowStyle)}
                  className="h-8 px-2 text-sm border rounded"
                >
                  <option value="solid">Solid Arrow →</option>
                  <option value="dashed">Dashed Arrow - - →</option>
                  <option value="double">Double Arrow ↔</option>
                </select>
                <div className="h-6 w-px bg-border mx-2" />
              </>
            )}

            {/* Color Pickers */}
            {(selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'triangle') && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  Fill:
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="h-8 w-12 border rounded cursor-pointer"
                  />
                </label>
              </>
            )}

            {selectedTool === 'text' && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  Text Color:
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-8 w-12 border rounded cursor-pointer"
                  />
                </label>
              </>
            )}

            <div className="h-6 w-px bg-border mx-2" />

            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex === 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex === history.length - 1}
            >
              <Redo className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelected}
              disabled={!selectedShape}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button variant="outline" size="sm" onClick={exportDiagram}>
              <Download className="h-4 w-4 mr-2" />
              Export PNG
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            {/* Zoom Controls */}
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4 mr-2" />
              Zoom Out
            </Button>
            <span className="text-sm font-medium px-2">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4 mr-2" />
              Zoom In
            </Button>
            <Button variant="outline" size="sm" onClick={resetZoom}>
              <Maximize className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </Card>
      )}

      {/* Compact Property Panel - only shows when shape is selected */}
      {!readOnly && selectedShape && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground mr-2">Selected:</span>
              {(() => {
                const shape = shapes.find((s) => s.id === selectedShape);
                if (!shape) return null;

                if (shape.type === 'text') {
                  return (
                    <>
                      <Input
                        type="color"
                        value={shape.textColor || '#000000'}
                        onChange={(e) => updateShapeProperty(selectedShape, { textColor: e.target.value })}
                        className="h-8 w-16"
                        title="Text Color"
                      />
                      <Input
                        type="number"
                        min="8"
                        max="72"
                        value={shape.fontSize || 16}
                        onChange={(e) => updateShapeProperty(selectedShape, { fontSize: parseInt(e.target.value) })}
                        className="h-8 w-16"
                        title="Font Size"
                      />
                      <Select
                        value={shape.fontWeight || 'normal'}
                        onValueChange={(value) => updateShapeProperty(selectedShape, { fontWeight: value })}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="lighter">Light</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={shape.fontFamily || 'Arial'}
                        onValueChange={(value) => updateShapeProperty(selectedShape, { fontFamily: value })}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Times New Roman">Times</SelectItem>
                          <SelectItem value="Courier New">Courier</SelectItem>
                          <SelectItem value="Verdana">Verdana</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  );
                } else if (shape.type === 'arrow') {
                  return (
                    <>
                      <Input
                        type="color"
                        value={shape.color || '#000000'}
                        onChange={(e) => updateShapeProperty(selectedShape, { color: e.target.value })}
                        className="h-8 w-16"
                        title="Arrow Color"
                      />
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={shape.arrowWidth || 2}
                        onChange={(e) => updateShapeProperty(selectedShape, { arrowWidth: parseInt(e.target.value) })}
                        className="h-8 w-16"
                        title="Line Width"
                      />
                      <Select
                        value={shape.arrowStyle || 'solid'}
                        onValueChange={(value: ArrowStyle) => updateShapeProperty(selectedShape, { arrowStyle: value })}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="dashed">Dashed</SelectItem>
                          <SelectItem value="double">Double</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  );
                } else {
                  return (
                    <Input
                      type="color"
                      value={shape.color || '#3b82f6'}
                      onChange={(e) => updateShapeProperty(selectedShape, { color: e.target.value })}
                      className="h-8 w-16"
                      title="Fill Color"
                    />
                  );
                }
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas */}
      <Card className="p-0 overflow-auto" style={{ maxHeight: '70vh' }} ref={containerRef}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className={cn(
              'border',
              !readOnly && 'cursor-crosshair'
            )}
            style={{ backgroundColor }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </Card>

      {readOnly && (
        <p className="text-sm text-muted-foreground text-center">
          Read-only mode - editing is disabled
        </p>
      )}
    </div>
  );
};
