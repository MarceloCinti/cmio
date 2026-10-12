import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("rounded-card border border-line bg-surface shadow-soft", className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
  as: Heading = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <Heading className="text-base font-semibold text-ink">{title}</Heading>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...rest} />;
}
