"use client";

// Último recurso si falla el layout raíz: no depende de estilos ni proveedores.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es-CO">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F5F6F8",
          color: "#0D1220",
        }}
      >
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Algo salió mal</h1>
          <p style={{ margin: "0 0 20px", color: "#566070" }}>
            Ocurrió un error inesperado. Inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#1D5BF5",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
