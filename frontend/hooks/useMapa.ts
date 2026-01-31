import { useEffect, useState } from 'react';

export interface MapaState {
  scale: number;
  offset: { x: number; y: number };
}

export function useMapa() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const zoomIn = () => setScale((s) => Math.min(s * 1.2, 10));
  const zoomOut = () => setScale((s) => Math.max(s / 1.2, 0.1));
  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };
  const fullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setPanning(true);
    setLastPoint({ x: e.clientX, y: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panning || !lastPoint) return;
    const dx = e.clientX - lastPoint.x;
    const dy = e.clientY - lastPoint.y;
    setOffset((o) => ({ x: o.x + dx / scale, y: o.y + dy / scale }));
    setLastPoint({ x: e.clientX, y: e.clientY });
  };
  const onPointerUp = () => {
    setPanning(false);
    setLastPoint(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key.toLowerCase() === 'r') reset();
      if (e.key.toLowerCase() === 'f') fullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    scale,
    offset,
    actions: { zoomIn, zoomOut, reset, fullscreen },
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
