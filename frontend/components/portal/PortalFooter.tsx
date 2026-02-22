export function PortalFooter() {
  return (
    <footer className="bg-background border-t border-border py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Quintas de Otinapa. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
