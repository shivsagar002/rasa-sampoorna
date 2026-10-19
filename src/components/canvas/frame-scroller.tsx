"use client";

import { useEffect, useRef, useCallback } from "react";
import { renderFrameToCanvas } from "@/utils/canvas-render";

interface FrameScrollerProps {
  currentFrame: number;
  getBestFrame: (frame: number) => HTMLImageElement | null;
  isInitialReady: boolean;
}

export function FrameScroller({
  currentFrame,
  getBestFrame,
  isInitialReady,
}: FrameScrollerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const placeholderRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Resize canvas to physical pixels matching devicePixelRatio
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
  }, []);

  // Draw current frame
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let image = getBestFrame(currentFrame);
    if (!image && placeholderRef.current && placeholderRef.current.complete && placeholderRef.current.naturalWidth > 0) {
      image = placeholderRef.current;
    }
    if (!image) return;

    ctx.save();
    ctx.scale(
      canvas.width / window.innerWidth,
      canvas.height / window.innerHeight
    );

    renderFrameToCanvas(ctx, image, window.innerWidth, window.innerHeight, currentFrame);

    ctx.restore();
  }, [currentFrame, getBestFrame]);

  useEffect(() => {
    updateCanvasSize();
    draw();
    const handleResize = () => {
      updateCanvasSize();
      draw();
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCanvasSize, draw]);

  // Redraw whenever currentFrame, draw, or initial ready state updates
  useEffect(() => {
    draw();
    animationFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw, isInitialReady, currentFrame]);

  return (
    <div className="canvas-container" aria-hidden="true">
      {/* Permanent underlying hero image ensures 0ms black frame or flash */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={placeholderRef}
        src="/frames/frame_000298.webp"
        alt=""
        fetchPriority="high"
        decoding="sync"
        onLoad={draw}
        className="canvas-placeholder-img"
      />

      <canvas ref={canvasRef} className="canvas-element" />
    </div>
  );
}
