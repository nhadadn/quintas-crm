export function PortalFooter() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Quintas de Otinapa. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
