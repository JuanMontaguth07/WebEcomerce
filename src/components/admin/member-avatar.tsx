import type { TeamMember } from "@/features/account/team";
import { cn } from "@/lib/utils";

/**
 * Iniciales de un admin sobre el color que eligió en «Mi cuenta». Usa los tonos
 * de su acento (globals.css), probados en modo claro y oscuro.
 */
export function MemberAvatar({
  member,
  className,
  children,
}: {
  member: Pick<TeamMember, "accent" | "initials"> | undefined;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      data-admin-accent={member?.accent}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-semibold",
        member
          ? "bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_78%,white),var(--primary))] text-primary-foreground"
          : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {member?.initials ?? "?"}
      {children}
    </span>
  );
}
