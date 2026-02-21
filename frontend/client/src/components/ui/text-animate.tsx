"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView, type Variants, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimationType =
  | "fadeIn"
  | "fadeInUp"
  | "fadeInDown"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";

interface TextAnimateProps extends HTMLMotionProps<"div"> {
  children: string;
  animation?: AnimationType;
  by?: "character" | "word" | "line";
  as?: keyof React.JSX.IntrinsicElements;
  duration?: number;
  delay?: number;
  startOnView?: boolean;
  once?: boolean;
}

const animations: Record<AnimationType, { hidden: Variants["hidden"]; visible: Variants["visible"] }> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  blurIn: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  blurInDown: {
    hidden: { opacity: 0, filter: "blur(10px)", y: -20 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  slideUp: {
    hidden: { y: 20 },
    visible: { y: 0 },
  },
  slideDown: {
    hidden: { y: -20 },
    visible: { y: 0 },
  },
  slideLeft: {
    hidden: { x: 20 },
    visible: { x: 0 },
  },
  slideRight: {
    hidden: { x: -20 },
    visible: { x: 0 },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
  },
  scaleDown: {
    hidden: { opacity: 0, scale: 1.5 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function TextAnimate({
  children,
  animation = "fadeIn",
  by = "word",
  as: Component = "p",
  duration = 0.3,
  delay = 0,
  startOnView = true,
  once = true,
  className,
  ...props
}: TextAnimateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.5 });
  const [shouldAnimate, setShouldAnimate] = useState(!startOnView);

  useEffect(() => {
    if (startOnView && isInView) {
      setShouldAnimate(true);
    }
  }, [isInView, startOnView]);

  const segments =
    by === "character"
      ? children.split("")
      : by === "word"
        ? children.split(" ")
        : children.split("\n");

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: duration / segments.length,
        delayChildren: delay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: animations[animation].hidden,
    visible: {
      ...animations[animation].visible,
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const MotionComponent = motion[Component as keyof typeof motion] as typeof motion.div;

  return (
    <MotionComponent
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={shouldAnimate ? "visible" : "hidden"}
      className={cn("flex flex-wrap", className)}
      {...props}
    >
      {segments.map((segment, index) => (
        <motion.span
          key={index}
          variants={itemVariants}
          className={by === "character" ? "" : "mr-[0.25em]"}
        >
          {segment}
          {by === "character" && segment === " " ? "\u00A0" : ""}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
