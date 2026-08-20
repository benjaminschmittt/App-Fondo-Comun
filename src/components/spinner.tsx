import { C } from "@/lib/theme";

export function Spinner() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: C.surface, gap: 14 }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: `3px solid ${C.line}`,
          borderTopColor: C.navy,
          animation: "spin 0.8s linear infinite",
        }}
      />
      <div style={{ color: C.muted, fontSize: 13 }}>Cargando...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
