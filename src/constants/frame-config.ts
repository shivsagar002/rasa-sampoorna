/**
 * Total frames scrubbed through on desktop.
 * Uses exactly 150 alternate images from the full sequence for 50% faster preloading
 * and ultra-smooth performance.
 *
 * Index 149 maps to disk frame 298 (initial hero frame).
 * Index 0 maps to disk frame 0 (concluding gift hamper frame).
 */
export const TOTAL_FRAMES = 150;
export const INITIAL_FRAME = TOTAL_FRAMES - 1; // Index 149 -> disk frame 298
export const FRAME_WIDTH = 1920;
export const FRAME_HEIGHT = 1080;
export const ASPECT_RATIO = FRAME_WIDTH / FRAME_HEIGHT;

/**
 * Scroll distance in viewport heights (vh).
 * Reduced by 50% (from 600vh down to 300vh) for a swift, responsive, effortless scroll experience.
 */
export const SCROLL_DISTANCE_VH = 300;

/**
 * Generates the public asset path for an alternate frame (0 to 149).
 * Selects alternate frames from disk: 0, 2, 4, 6, ..., 296, 298.
 */
export function getFramePath(frameIndex: number): string {
  const clampedIndex = Math.min(
    Math.max(0, Math.round(frameIndex)),
    TOTAL_FRAMES - 1
  );
  // Map index (0..149) to alternate disk frame index (0..298)
  const diskFrameNumber = Math.min(clampedIndex * 2, 298);
  const padded = String(diskFrameNumber).padStart(6, "0");
  return `/frames/frame_${padded}.webp`;
}
