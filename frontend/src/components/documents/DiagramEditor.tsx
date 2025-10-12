'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Redo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [history, setHistory] = useState<Shape[][]>([initialShapes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Draw shapes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape, false);
    }
  }, [shapes, currentShape, selectedShape]);

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
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.endX || shape.x, shape.endY || shape.y);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(
          (shape.endY || shape.y) - shape.y,
          (shape.endX || shape.x) - shape.x
        );
        const headLength = 15;
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
        break;

      case 'text':
        ctx.fillStyle = shape.color;
        ctx.font = '16px sans-serif';
        ctx.fillText(shape.text || '', shape.x, shape.y);
        break;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
      setSelectedShape(clickedShape?.id || null);
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
            color: '#000000',
          };
          addShape(newShape);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || selectedTool === 'text' || readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
        color: '#000000',
      };
    } else {
      shape = {
        id: `shape-${Date.now()}`,
        type: selectedTool as 'rectangle' | 'circle' | 'triangle',
        x: startPoint.x,
        y: startPoint.y,
        width,
        height,
        color: '#3b82f6',
      };
    }

    setCurrentShape(shape);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape || readOnly) return;

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
          </div>
        </Card>
      )}

      {/* Canvas */}
      <Card className="p-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={cn(
            'border bg-white',
            !readOnly && 'cursor-crosshair'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </Card>

      {readOnly && (
        <p className="text-sm text-muted-foreground text-center">
          Read-only mode - editing is disabled
        </p>
      )}
    </div>
  );
};
