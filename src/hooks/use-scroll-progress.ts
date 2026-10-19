"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TOTAL_FRAMES, INITIAL_FRAME } from "@/constants/frame-config";

interface ScrollProgressOptions {
  damping?: number;
}

export function useScrollProgress(
  containerRef: React.RefObject<HTMLElement | null>,
  options: ScrollProgressOptions = {}
) {
  const { damping = 0.18 } = options;

  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);

  const [currentFrame, setCurrentFrame] = useState<number>(INITIAL_FRAME);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Recalculate target progress from scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const totalScrollable = container.scrollHeight - window.innerHeight;

    if (totalScrollable <= 0) {
      targetProgressRef.current = 0;
      return;
    }

    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
    targetProgressRef.current = progress;
  }, [containerRef]);

  // Programmatic scroll to a normalized progress (0..1)
  const setProgress = useCallback(
    (progress: number) => {
      const clamped = Math.max(0, Math.min(1, progress));
      targetProgressRef.current = clamped;

      if (containerRef.current) {
        const totalScrollable =
          containerRef.current.scrollHeight - window.innerHeight;
        window.scrollTo({
          top: clamped * totalScrollable,
          behavior: "instant",
        });
      }
    },
    [containerRef]
  );

  // Smooth animation loop using requestAnimationFrame
  useEffect(() => {
    let animId: number;
    let lastRenderedFrame = INITIAL_FRAME;

    const tick = () => {
      const target = targetProgressRef.current;
      const current = currentProgressRef.current;

      // Smooth lerp
      const diff = target - current;
      if (Math.abs(diff) > 0.0001) {
        currentProgressRef.current += diff * damping;
      } else {
        currentProgressRef.current = target;
      }

      const p = currentProgressRef.current;
      setScrollProgress(p);

      // Reversed mapping: scrolling down progresses from frame 298 down to frame 0
      const frameFloat = (1 - p) * (TOTAL_FRAMES - 1);
      const frameInt = Math.min(
        Math.max(0, Math.round(frameFloat)),
        TOTAL_FRAMES - 1
      );

      if (frameInt !== lastRenderedFrame) {
        lastRenderedFrame = frameInt;
        setCurrentFrame(frameInt);
      }

      animId = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    animId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      cancelAnimationFrame(animId);
    };
  }, [damping, handleScroll]);

  return {
    currentFrame,
    scrollProgress,
    setProgress,
  };
}
