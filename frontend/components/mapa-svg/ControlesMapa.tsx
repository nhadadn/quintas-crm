export function ControlesMapa() {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      <button
        type="button"
        className="bg-slate-800/90 hover:bg-slate-700 text-slate-100 w-8 h-8 rounded flex items-center justify-center border border-slate-600"
      >
        +
      </button>
      <button
        type="button"
        className="bg-slate-800/90 hover:bg-slate-700 text-slate-100 w-8 h-8 rounded flex items-center justify-center border border-slate-600"
      >
        −
      </button>
    </div>
  );
}

