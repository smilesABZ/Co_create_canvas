// FILENAME: src/utils/geometryUtils.ts - VERSION: v1

export const doBoundingBoxesIntersect = (
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean => {
  if (box1.x + box1.width < box2.x || box2.x + box2.width < box1.x) {
    return false;
  }
  if (box1.y + box1.height < box2.y || box2.y + box2.height < box1.y) {
    return false;
  }
  return true;
};
