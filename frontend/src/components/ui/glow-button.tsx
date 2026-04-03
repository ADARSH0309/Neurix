"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className, children, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "glow-btn",
          variant === "secondary" && "glow-btn-secondary",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlowButton.displayName = "GlowButton";
