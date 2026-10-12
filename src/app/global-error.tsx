"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-PY">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>No pudimos cargar la plataforma</h1>
          <p style={{ color: "#55676c" }}>Ocurrió un error inesperado. Intenta nuevamente en unos minutos.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 20px", borderRadius: 12, border: 0, background: "#0e6e6b", color: "#fff", fontWeight: 600 }}>
            Intentar nuevamente
          </button>
        </main>
      </body>
    </html>
  );
}
