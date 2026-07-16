import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import {
  orderStatusLabel,
  orderStatusTone,
  packageStatusLabel,
  packageStatusTone,
} from "@/lib/format";
import type { PackageStatus, TransferStatus, UserRole } from "@/types";

const toneClasses = {
  neutral: "bg-muted text-muted-foreground",
  pending: "bg-warning text-warning-foreground",
  success: "bg-success text-success-foreground",
  danger: "bg-destructive/10 text-destructive",
} as const;

export function RolePill({ role }: { role: UserRole }) {
  const classes: Record<UserRole, string> = {
    ADMIN: "bg-info text-info-foreground",
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

export function PackageStatusPill({ status }: { status: PackageStatus }) {
  return (
    <Badge className={toneClasses[packageStatusTone(status)]}>
      {packageStatusLabel(status)}
    </Badge>
  );
}
