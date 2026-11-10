import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive border-destructive/20",
        outline: "border-border text-foreground bg-transparent",
        success: "border-transparent bg-success/10 text-success border-success/20",
        warning: "border-transparent bg-warning/10 text-warning-foreground border-warning/20",
        info: "border-transparent bg-primary/10 text-primary border-primary/20",
        muted: "border-transparent bg-muted text-muted-foreground",
        active: "border-transparent bg-primary/10 text-primary border-primary/20",
        pending: "border-transparent bg-warning/10 text-warning-foreground border-warning/20",
        completed: "border-transparent bg-success/10 text-success border-success/20",
        overdue: "border-transparent bg-destructive/10 text-destructive border-destructive/20",
        inProgress: "border-transparent bg-info/10 text-primary border-primary/20",
      },
      size: {
        default: "h-6 px-2.5 text-xs",
        sm: "h-5 px-2 text-[11px]",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
