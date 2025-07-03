
// FILENAME: src/features/canvasView/useCanvasView.ts - VERSION: v2
// Updated to v2 to include zoom functionality.
import { useState, useCallback } from 'react';
import { Point } from '../../../types';
import { DEFAULT_ZOOM_LEVEL, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from '../../../constants';

export interface CanvasViewHook {
  viewBoxX: number;
  viewBoxY: number;
  zoomLevel: number;
  setViewBox: (x: number, y: number) => void;
  setZoomLevel: (newZoomLevel: number, anchorPoint?: Point) => void; // anchorPoint is in viewport coordinates
  panCanvas: (deltaX: number, deltaY: number, panStartViewBox?: {x:number, y:number} | null) => void;
  toVirtualPos: (viewportPos: Point) => Point;
  toViewportPos: (virtualPos: Point) => Point;
  resetView: () => void;
  zoomAtPoint: (viewportPoint: Point, newZoomLevelAttempt: number) => void;
}

export const useCanvasView = (): CanvasViewHook => {
  const [viewBoxX, setViewBoxX] = useState<number>(0);
  const [viewBoxY, setViewBoxY] = useState<number>(0);
  const [zoomLevel, setZoomLevelState] = useState<number>(DEFAULT_ZOOM_LEVEL);

  const setViewBox = useCallback((x: number, y: number) => {
    setViewBoxX(x);
    setViewBoxY(y);
  }, []);

  const setZoomLevel = useCallback((newZoomAttempt: number, anchorPoint?: Point) => {
    const newZoom = Math.max(MIN_ZOOM_LEVEL, Math.min(newZoomAttempt, MAX_ZOOM_LEVEL));
    
    if (anchorPoint) {
      // Calculate virtual point under anchor before zoom
      const virtualAnchorX = (anchorPoint.x / zoomLevel) + viewBoxX;
      const virtualAnchorY = (anchorPoint.y / zoomLevel) + viewBoxY;

      // Calculate new viewBox to keep virtualAnchor under anchorPoint after zoom
      setViewBoxX(virtualAnchorX - (anchorPoint.x / newZoom));
      setViewBoxY(virtualAnchorY - (anchorPoint.y / newZoom));
    }
    // If no anchor point, zoom is centered on current view center (implicit by not changing viewBox relative to content scale)
    // Or, more accurately, we'd need to calculate current center if that's desired.
    // For now, if no anchor, the top-left of the virtual canvas stays somewhat aligned.

    setZoomLevelState(newZoom);
  }, [zoomLevel, viewBoxX, viewBoxY]);


  const zoomAtPoint = useCallback((viewportPoint: Point, newZoomLevelAttempt: number) => {
    const newZoom = Math.max(MIN_ZOOM_LEVEL, Math.min(newZoomLevelAttempt, MAX_ZOOM_LEVEL));
    const currentZoom = zoomLevel;

    const virtualPointX = (viewportPoint.x / currentZoom) + viewBoxX;
    const virtualPointY = (viewportPoint.y / currentZoom) + viewBoxY;

    const newViewBoxX = virtualPointX - (viewportPoint.x / newZoom);
    const newViewBoxY = virtualPointY - (viewportPoint.y / newZoom);

    setViewBoxX(newViewBoxX);
    setViewBoxY(newViewBoxY);
    setZoomLevelState(newZoom);
  }, [zoomLevel, viewBoxX, viewBoxY]);


  const panCanvas = useCallback((deltaX: number, deltaY: number, panStartViewBox?: {x:number, y:number} | null) => {
      // DeltaX and DeltaY are in screen pixels. Need to convert to virtual pixels for panning.
      const virtualDeltaX = deltaX / zoomLevel;
      const virtualDeltaY = deltaY / zoomLevel;

      if (panStartViewBox) {
        setViewBoxX(panStartViewBox.x - virtualDeltaX);
        setViewBoxY(panStartViewBox.y - virtualDeltaY);
      } else {
        setViewBoxX(prevX => prevX - virtualDeltaX);
        setViewBoxY(prevY => prevY - virtualDeltaY);
      }
  }, [zoomLevel]);

  const toVirtualPos = useCallback((viewportPos: Point): Point => {
    return { 
      x: (viewportPos.x / zoomLevel) + viewBoxX, 
      y: (viewportPos.y / zoomLevel) + viewBoxY 
    };
  }, [viewBoxX, viewBoxY, zoomLevel]);

  const toViewportPos = useCallback((virtualPos: Point): Point => {
    return { 
      x: (virtualPos.x - viewBoxX) * zoomLevel, 
      y: (virtualPos.y - viewBoxY) * zoomLevel 
    };
  }, [viewBoxX, viewBoxY, zoomLevel]);

  const resetView = useCallback(() => {
    setViewBoxX(0);
    setViewBoxY(0);
    setZoomLevelState(DEFAULT_ZOOM_LEVEL);
  }, []);

  return {
    viewBoxX,
    viewBoxY,
    zoomLevel,
    setViewBox,
    setZoomLevel,
    panCanvas,
    toVirtualPos,
    toViewportPos,
    resetView,
    zoomAtPoint,
  };
};
