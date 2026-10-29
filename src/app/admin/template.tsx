/**
 * Se vuelve a montar en cada cambio de página del panel: el contenido entra con
 * una transición corta (sin movimiento si el sistema pide reducirlo).
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="admin-page-in">{children}</div>;
}
