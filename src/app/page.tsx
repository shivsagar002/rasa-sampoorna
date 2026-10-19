"use client";

import { useRef, useEffect } from "react";
import { SiteHeader } from "@/components/navigation/site-header";
import { SceneNarrative } from "@/components/scenes/scene-narrative";
import { FrameScroller } from "@/components/canvas/frame-scroller";
import { useFrameSequence } from "@/hooks/use-frame-sequence";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { SCROLL_DISTANCE_VH } from "@/constants/frame-config";
import { MobileTabletHero } from "@/components/landing/mobile-tablet-hero";
import { LandingPageContent } from "@/components/landing/landing-page-content";

export default function Home() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { isInitialReady, getBestFrame } = useFrameSequence();
  const { currentFrame, scrollProgress, setProgress } =
    useScrollProgress(containerRef);

  // Keyboard navigation support strictly for desktop experience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth <= 1024) return;
      const step = 0.04;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setProgress(scrollProgress + step);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setProgress(scrollProgress - step);
      } else if (e.key === "Home") {
        e.preventDefault();
        setProgress(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setProgress(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scrollProgress, setProgress]);

  return (
    <>
      {/* SMALL DEVICES (Mobiles & Tablets): 100% Static content, zero canvas scroll */}
      <div className="mobile-static-experience">
        <SiteHeader solidBackground />
        <MobileTabletHero />
        <LandingPageContent />
      </div>

      {/* DESKTOP SCREEN (> 1024px): Full cinematic canvas frame scroller experience */}
      <div className="desktop-scroll-experience">
        <main
          ref={containerRef}
          className="main-experience"
          style={{ height: `${SCROLL_DISTANCE_VH}vh` }}
        >
          <SiteHeader solidBackground={scrollProgress > 0.015} />
          <SceneNarrative scrollProgress={scrollProgress} />
          <FrameScroller
            currentFrame={currentFrame}
            getBestFrame={getBestFrame}
            isInitialReady={isInitialReady}
          />
        </main>
        <LandingPageContent />
      </div>
    </>
  );
}
