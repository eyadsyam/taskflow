"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[transform,background-color,border-color,box-shadow] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Lime — primary call to action
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]",
        // Soft lime tint — secondary lime CTA
        gradient:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]",
        // Standard ghost / muted button
        secondary:
          "bg-elevated text-foreground border border-border hover:bg-muted hover:border-border-strong",
        // Danger
        destructive:
          "bg-destructive/10 border border-destructive/40 text-destructive hover:bg-destructive/20",
        // Outline — minimal
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted hover:border-border-strong",
        // Ghost — fully transparent
        ghost:
          "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Soft tint
        soft: "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20",
      },
      size: {
        default: "h-9 px-4 text-sm rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-11 px-6 text-sm rounded-lg",
        xl: "h-12 px-8 text-base rounded-lg",
        icon: "h-9 w-9 rounded-md",
        "icon-sm": "h-7 w-7 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
