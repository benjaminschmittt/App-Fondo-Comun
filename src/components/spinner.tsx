export function Spinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3.5 bg-background">
      <div className="size-9 animate-spin rounded-full border-3 border-gray-200 border-t-navy" />
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}
