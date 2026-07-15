import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { orderStatusLabel, orderStatusTone } from "@/lib/format";
import type { TransferStatus, UserRole } from "@/types";

const toneClasses = {
  neutral: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-900",
  success: "bg-emerald-100 text-emerald-900",
  danger: "bg-destructive/10 text-destructive",
} as const;

export function RolePill({ role }: { role: UserRole }) {
  const classes: Record<UserRole, string> = {
    ADMIN: "bg-blue-100 text-blue-950",
    DISTRIBUTOR: toneClasses.success,
    USER: toneClasses.neutral,
  };

  return <Badge className={classes[role]}>{roleLabel(role)}</Badge>;
}

export function ActivePill({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={cn(isActive ? toneClasses.success : toneClasses.danger)}
    >
      {isActive ? "Activa" : "Inactiva"}
    </Badge>
  );
}

export function OrderStatusPill({ status }: { status: TransferStatus }) {
  return (
    <Badge className={toneClasses[orderStatusTone(status)]}>
      {orderStatusLabel(status)}
    </Badge>
  );
}
