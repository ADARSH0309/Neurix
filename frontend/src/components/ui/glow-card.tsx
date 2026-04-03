"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowClassName?: string;
  animate?: boolean;
}

export function GlowCard({
  children,
  className,
  glowClassName,
  animate = true,
}: GlowCardProps) {
  return (
    <div className={cn("glow-card", animate && "glow-card-animate", className)}>
      <div className={cn("glow-card-border", glowClassName)} />
      <div className={cn("glow-card-glow", glowClassName)} />
      <div className="glow-card-content">{children}</div>
    </div>
  );
}
