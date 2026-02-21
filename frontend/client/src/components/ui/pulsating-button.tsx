"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PulsatingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pulseColor?: string;
  duration?: string;
}

export const PulsatingButton = React.forwardRef<
  HTMLButtonElement,
  PulsatingButtonProps
>(
  (
    {
      className,
      children,
      pulseColor = "#6366f1",
      duration = "1.5s",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative flex cursor-pointer items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-primary-foreground",
          className
        )}
        style={
          {
            "--pulse-color": pulseColor,
            "--duration": duration,
          } as React.CSSProperties
        }
        {...props}
      >
        <div className="relative z-10">{children}</div>
        <div className="absolute left-1/2 top-1/2 size-full -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-lg bg-inherit" />
        <div
          className="absolute left-1/2 top-1/2 size-full -translate-x-1/2 -translate-y-1/2 animate-pulsate rounded-lg"
          style={{
            background: `radial-gradient(circle, var(--pulse-color) 0%, transparent 70%)`,
          }}
        />
      </button>
    );
  }
);

PulsatingButton.displayName = "PulsatingButton";
