import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { storage } from '../lib/storage';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingStroke {
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

export interface DrawingCanvasProps {
  pdfId: string;
  pageNumber: number;
  width: number;
  height: number;
  isDrawingEnabled: boolean;
  currentTool: 'none' | 'pen' | 'highlighter' | 'eraser';
  strokeColor: string;
  strokeWidth: number;
  highlighterColor: string;
  highlighterWidth: number;
  eraserWidth: number;
}

export interface DrawingCanvasHandle {
  undo: () => void;
  clear: () => void;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas(
  {
    pdfId,
    pageNumber,
    width,
    height,
    isDrawingEnabled,
    currentTool,
    strokeColor,
    strokeWidth,
    highlighterColor,
    highlighterWidth,
    eraserWidth,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokePointsRef = useRef<Point[]>([]);

  // Load strokes from local IndexedDB
  useEffect(() => {
    let active = true;
    storage.getPageDrawings(pdfId, pageNumber).then((savedStrokes) => {
      if (active) {
        setStrokes(savedStrokes || []);
      }
    });
    return () => {
      active = false;
    };
  }, [pdfId, pageNumber]);

  // Redraw whenever dimensions or strokes change
  useEffect(() => {
    redraw();
  }, [strokes, width, height]);

  // Support Undo and Clear from parent using ref handle
  useImperativeHandle(ref, () => ({
    undo() {
      if (strokes.length === 0) return;
      const updated = strokes.slice(0, -1);
      setStrokes(updated);
      storage.savePageDrawings(pdfId, pageNumber, updated);
    },
    clear() {
      if (strokes.length === 0) return;
      if (window.confirm('Are you sure you want to clear all drawings on this page?')) {
        setStrokes([]);
        storage.clearPageDrawings(pdfId, pageNumber);
      }
    }
  }));

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const tool = stroke.tool;
      if (tool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.5; // High translucency for overlapping highlight
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      } else if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = stroke.width;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      // Draw the path scaled to current width and height
      const p0 = stroke.points[0];
      ctx.moveTo(p0.x * width, p0.y * height);

      if (stroke.points.length === 1) {
        ctx.lineTo(p0.x * width + 0.1, p0.y * height + 0.1);
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          ctx.lineTo(p.x * width, p.y * height);
        }
      }
      ctx.stroke();
    });

    // Reset standard drawing state
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  };

  const getCanvasCoordinates = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    // Return normalized coordinates
    return { x: x / width, y: y / height };
  };

  const startDrawing = (clientX: number, clientY: number) => {
    if (!isDrawingEnabled || currentTool === 'none') return;
    isDrawingRef.current = true;

    const pt = getCanvasCoordinates(clientX, clientY);
    if (!pt) return;

    currentStrokePointsRef.current = [pt];

    // Draw in real-time
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (currentTool === 'highlighter') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = highlighterColor;
          ctx.lineWidth = highlighterWidth;
        } else if (currentTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineWidth = eraserWidth;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
        }
        ctx.moveTo(pt.x * width, pt.y * height);
      }
    }
  };

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !isDrawingEnabled || currentTool === 'none') return;

    const pt = getCanvasCoordinates(clientX, clientY);
    if (!pt) return;

    currentStrokePointsRef.current.push(pt);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(pt.x * width, pt.y * height);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokePointsRef.current.length > 0) {
      const strokeTool = currentTool === 'eraser' ? 'eraser' : currentTool === 'highlighter' ? 'highlighter' : 'pen';
      const strokeColorValue = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : currentTool === 'highlighter' ? highlighterColor : strokeColor;
      const strokeWidthValue = currentTool === 'eraser' ? eraserWidth : currentTool === 'highlighter' ? highlighterWidth : strokeWidth;

      const newStroke: DrawingStroke = {
        points: currentStrokePointsRef.current,
        color: strokeColorValue,
        width: strokeWidthValue,
        tool: strokeTool,
      };

      const updatedStrokes = [...strokes, newStroke];
      setStrokes(updatedStrokes);
      storage.savePageDrawings(pdfId, pageNumber, updatedStrokes);
    }
    currentStrokePointsRef.current = [];
  };

  return (
    <canvas
      id={`drawing-canvas-page-${pageNumber}`}
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 z-10 select-none ${isDrawingEnabled ? 'cursor-crosshair touch-none pointer-events-auto' : 'pointer-events-none'}`}
      onMouseDown={(e) => {
        if (!isDrawingEnabled) return;
        startDrawing(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => {
        if (!isDrawingEnabled) return;
        draw(e.clientX, e.clientY);
      }}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={(e) => {
        if (!isDrawingEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        startDrawing(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        if (!isDrawingEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        draw(touch.clientX, touch.clientY);
      }}
      onTouchEnd={(e) => {
        if (!isDrawingEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        stopDrawing();
      }}
    />
  );
});
