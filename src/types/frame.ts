export interface SceneDefinition {
  id: string;
  startFrame: number;
  endFrame: number;
  focalPoint: {
    desktop: { x: number; y: number };
    mobile: { x: number; y: number };
  };
}

export interface CanvasDimensions {
  width: number;
  height: number;
  dpr: number;
}

export interface DrawBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
