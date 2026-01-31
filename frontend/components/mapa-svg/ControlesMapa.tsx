export interface ControlesMapaProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFullscreen: () => void;
}

export function ControlesMapa({ onZoomIn, onZoomOut, onReset, onFullscreen }: ControlesMapaProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      <button
        type="button"
        onClick={onZoomIn}
        className="bg-slate-800/90 hover:bg-slate-700 text-slate-100 w-8 h-8 rounded flex items-center justify-center border border-slate-600"
      >
        +
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="bg-slate-800/90 hover:bg-slate-700 text-slate-100 w-8 h-8 rounded flex items-center justify-center border border-slate-600"
      >
        −
      </button>
      <button
        type="button"
        onClick={onReset}
        className="bg-slate-800/90 hover:bg-slate-700 text-slate-100 px-2 h-8 rounded flex items-center justify-center border border-slate-600 text-xs"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onFullscreen}
        className="bg-slate-800/90 hover:bg-slate-700 text-slate-100 px-2 h-8 rounded flex items-center justify-center border border-slate-600 text-xs"
      >
        Fullscreen
      </button>
    </div>
  );
}
