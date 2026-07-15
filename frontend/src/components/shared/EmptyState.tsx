import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-balance text-muted-foreground">
        {hint}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
