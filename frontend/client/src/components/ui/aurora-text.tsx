"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AuroraTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}

export function AuroraText({
  children,
  className,
  colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"],
}: AuroraTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
    backgroundSize: "400% 400%",
  };

  return (
    <motion.span
      className={cn(
        "bg-clip-text text-transparent inline-block",
        className
      )}
      style={gradientStyle}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: 5,
        ease: "linear",
        repeat: Infinity,
      }}
    >
      {children}
    </motion.span>
  );
}
