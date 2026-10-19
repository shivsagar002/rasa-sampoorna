"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  TOTAL_FRAMES,
  INITIAL_FRAME,
  getFramePath,
} from "@/constants/frame-config";

interface FrameSequenceState {
  isInitialReady: boolean;
  loadedCount: number;
  totalCount: number;
}

export function useFrameSequence() {
  const imagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const [state, setState] = useState<FrameSequenceState>({
    isInitialReady: false,
    loadedCount: 0,
    totalCount: TOTAL_FRAMES,
  });

  const isMountedRef = useRef(true);

  // Helper to load a single frame
  const loadFrame = useCallback(
    (frameIndex: number): Promise<HTMLImageElement | null> => {
      if (imagesRef.current.has(frameIndex)) {
        return Promise.resolve(imagesRef.current.get(frameIndex) ?? null);
      }

      return new Promise((resolve) => {
        const img = new Image();
        img.src = getFramePath(frameIndex);

        img.onload = () => {
          if (!isMountedRef.current) return resolve(null);
          imagesRef.current.set(frameIndex, img);
          setState((prev) => ({
            ...prev,
            loadedCount: imagesRef.current.size,
          }));
          resolve(img);
        };

        img.onerror = () => {
          resolve(null);
        };
      });
    },
    []
  );

  // Progressive preloading in descending order (matching reversed scroll)
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    async function startPreload() {
      // Tier 1: Hero frame at the top (frame 298)
      await loadFrame(INITIAL_FRAME);
      if (isCancelled) return;
      setState((prev) => ({ ...prev, isInitialReady: true }));

      // Tier 2: Keyframe samples in descending order (every 5th frame for immediate dense coverage)
      const keyframes: number[] = [];
      for (let i = TOTAL_FRAMES - 1; i >= 0; i -= 5) {
        keyframes.push(i);
      }
      await Promise.all(keyframes.map((frame) => loadFrame(frame)));
      if (isCancelled) return;

      // Tier 3: Fill in remaining frames from top to bottom
      const remaining: number[] = [];
      for (let i = TOTAL_FRAMES - 1; i >= 0; i--) {
        if (!imagesRef.current.has(i)) {
          remaining.push(i);
        }
      }

      const BATCH_SIZE = 10;
      for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
        if (isCancelled) break;
        const batch = remaining.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((f) => loadFrame(f)));
        await new Promise((r) => setTimeout(r, 12));
      }
    }

    void startPreload();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, [loadFrame]);

  /**
   * Retrieves the requested frame, or closest available frame if still loading.
   */
  const getBestFrame = useCallback(
    (targetFrame: number): HTMLImageElement | null => {
      const clamped = Math.min(
        Math.max(0, Math.round(targetFrame)),
        TOTAL_FRAMES - 1
      );

      // Exact match
      if (imagesRef.current.has(clamped)) {
        return imagesRef.current.get(clamped)!;
      }

      // Search outward for closest loaded frame
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const up = clamped + offset;
        if (up < TOTAL_FRAMES && imagesRef.current.has(up)) {
          return imagesRef.current.get(up)!;
        }
        const down = clamped - offset;
        if (down >= 0 && imagesRef.current.has(down)) {
          return imagesRef.current.get(down)!;
        }
      }

      return null;
    },
    []
  );

  return {
    isInitialReady: state.isInitialReady,
    loadedCount: state.loadedCount,
    totalCount: state.totalCount,
    getBestFrame,
  };
}
