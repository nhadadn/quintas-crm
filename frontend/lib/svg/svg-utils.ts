export interface SVGPoint {
  x: number;
  y: number;
}

export interface SVGBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function normalizePoint(point: SVGPoint, viewBox: SVGBox): SVGPoint {
  const width = viewBox.maxX - viewBox.minX;
  const height = viewBox.maxY - viewBox.minY;

  return {
    x: (point.x - viewBox.minX) / width,
    y: (point.y - viewBox.minY) / height,
  };
}
