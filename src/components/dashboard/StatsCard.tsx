import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: {
    value: number;
    trend: "up" | "down";
  };
  variant?: "default" | "primary" | "accent" | "success" | "warning";
  delay?: number;
  subtitle?: string;
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-card border-primary/15",
  accent: "bg-card border-border",
  success: "bg-card border-success/15",
  warning: "bg-card border-warning/15",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  accent: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning-foreground",
};

export function StatsCard({ title, value, icon, change, variant = "default", delay = 0, subtitle }: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-card transition-all duration-200 hover:shadow-card-hover animate-fade-up bg-card",
        variantStyles[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight font-numeric">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
          )}
          {change && (
            <div className="flex items-center gap-1.5 pt-1">
              {change.trend === "up" ? (
                <ArrowUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  change.trend === "up" ? "text-success" : "text-destructive"
                )}
              >
                {change.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg", iconStyles[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
