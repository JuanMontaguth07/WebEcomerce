import type { AdminUser } from "@/features/auth/session";

/** Iniciales para el avatar: «Juan Diego» → «JD»; sin nombre, la primera letra del correo. */
export function initials(admin: Pick<AdminUser, "fullName" | "email">) {
  const source = admin.fullName?.trim() || admin.email || "A";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "A") + (admin.fullName ? (parts[1]?.[0] ?? "") : "")).toUpperCase();
}
