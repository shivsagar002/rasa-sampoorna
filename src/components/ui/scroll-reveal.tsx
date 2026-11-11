"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";

export type RevealDirection = "bottom" | "left" | "right" | "top" | "none";

export interface ScrollRevealProps {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number; // Milliseconds
  duration?: number; // Milliseconds
  distance?: number; // Pixels
  threshold?: number; // 0 to 1
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "article" | "aside" | "header" | "footer";
}

export function ScrollReveal({
  children,
  direction = "bottom",
  delay = 0,
  duration = 750,
  distance = 32,
  threshold = 0.12,
  className = "",
  id,
  style = {},
  as = "div",
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion for accessibility
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      setIsReady(true);
      return;
    }

    setIsReady(true);

    const target = elementRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const getInitialTransform = () => {
    switch (direction) {
      case "bottom":
        return `translate3d(0, ${distance}px, 0)`;
      case "top":
        return `translate3d(0, -${distance}px, 0)`;
      case "left":
        return `translate3d(-${distance}px, 0, 0)`;
      case "right":
        return `translate3d(${distance}px, 0, 0)`;
      case "none":
      default:
        return "translate3d(0, 0, 0)";
    }
  };

  // Before hydration / mount on client, keep opacity 1 to prevent layout flash or SEO omission
  const opacity = !isReady || isVisible ? 1 : 0;
  const transform = !isReady || isVisible ? "translate3d(0, 0, 0)" : getInitialTransform();

  const transitionStyle: React.CSSProperties = isReady
    ? {
        opacity,
        transform,
        transitionProperty: "opacity, transform",
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: `${delay}ms`,
        willChange: isVisible ? "auto" : "opacity, transform",
      }
    : {};

  const Component = as as any;

  return (
    <Component
      ref={elementRef}
      id={id}
      className={className}
      style={{
        ...style,
        ...transitionStyle,
      }}
    >
      {children}
    </Component>
  );
}

