import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRoleColorsByString } from "@/lib/theme/role-colors";

interface RoleBadgeProps {
  role: "ADMIN" | "PARTICIPANT" | "MANAGER" | "SUPERADMIN";
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const colors = getRoleColorsByString(role);

  const displayName =
    role === "SUPERADMIN"
      ? "Super Admin"
      : role === "ADMIN"
        ? "Admin"
        : "Participant";

  return (
    <Badge
      variant="outline"
      className={cn(colors.badge, colors.border, "font-medium", className)}
    >
      {displayName}
    </Badge>
  );
}
