import { ASPECT_RATIO } from "@/constants/frame-config";
import type { DrawBounds } from "@/types/frame";

/**
 * Calculates adaptive horizontal focal point (0.0 to 1.0) for portrait/narrow viewports
 * so the artisan, child, or gift hamper is always framed beautifully on mobile and tablets.
 */
export function getFrameFocalX(frame: number): number {
  // Map 0..149 to original 0..298 range if needed
  const diskFrame = frame <= 149 ? frame * 2 : frame;
  if (diskFrame >= 230) {
    return 0.60; // Center on muse in saree
  } else if (diskFrame >= 190) {
    const t = (diskFrame - 190) / 40;
    return 0.38 + t * (0.60 - 0.38);
  } else if (diskFrame >= 140) {
    return 0.38; // Center on artisan woman crocheting
  } else if (diskFrame >= 50) {
    return 0.36; // Center on young boy painting
  } else if (diskFrame >= 30) {
    const t = (diskFrame - 30) / 20;
    return 0.28 + t * (0.36 - 0.28);
  } else {
    return 0.28; // Center on corporate gift hamper on left plinth
  }
}

/**
 * Calculates optimal cover bounds anchored to the top so heads, faces, and arches are NEVER cropped.
 * Uses adaptive focal-point horizontal centering for portrait/mobile screens.
 */
export function calculateCoverBounds(
  canvasWidth: number,
  canvasHeight: number,
  currentFrame: number = 298
): DrawBounds {
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth: number;
  let drawHeight: number;

  if (canvasRatio > ASPECT_RATIO) {
    // Canvas is wider than 16:9 (fit to width)
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / ASPECT_RATIO;
  } else {
    // Canvas is taller than 16:9 (fit to height)
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * ASPECT_RATIO;
  }

  // Vertical position is always anchored to top (y = 0) so heads & arches are never cropped
  const y = 0;

  // Horizontal position: on wide screens (drawWidth <= canvasWidth), center or 0.
  // On portrait / narrow screens (drawWidth > canvasWidth), track scene focal point.
  let x: number;
  if (drawWidth <= canvasWidth) {
    x = (canvasWidth - drawWidth) * 0.5;
  } else {
    const focalX = getFrameFocalX(currentFrame);
    const idealX = canvasWidth * 0.5 - drawWidth * focalX;
    const minX = canvasWidth - drawWidth;
    const maxX = 0;
    x = Math.max(minX, Math.min(maxX, idealX));
  }

  return {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
  };
}

/**
 * Renders an image to canvas with high-DPI scaling and responsive scene framing.
 */
export function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  currentFrame: number = 298
): void {
  const bounds = calculateCoverBounds(canvasWidth, canvasHeight, currentFrame);

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height
  );
}
