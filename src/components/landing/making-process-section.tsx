"use client";

import Image from "next/image";
import { BotanicalBranch } from "./botanical-decor";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface ProcessStep {
  stepNumber: string;
  title: string;
  subtitle: string;
  image: string;
  alt: string;
}

const STEPS: ProcessStep[] = [
  {
    stepNumber: "1",
    title: "Imagine",
    subtitle: "Ideas take shape",
    image: "/landing/process_imagine_v2.webp",
    alt: "Artisan designing and painting floral patterns with fine paintbrush",
  },
  {
    stepNumber: "2",
    title: "Create",
    subtitle: "Skills bring it to life",
    image: "/landing/process_create_v2.webp",
    alt: "Women artisans hand-crocheting pink cotton creations with care",
  },
  {
    stepNumber: "3",
    title: "Share",
    subtitle: "Creates a bigger impact",
    image: "/landing/process_share_v2.webp",
    alt: "Artisan gift packages wrapped with sustainable paper and botanicals",
  },
];

export function MakingProcessSection() {
  return (
    <section id="making-process" className="landing-section section-process">
      <div className="landing-container relative">
        {/* Decorative Botanical Accent */}
        <div className="process-botanical-accent" aria-hidden="true">
          <BotanicalBranch color="rgba(160, 110, 95, 0.35)" />
        </div>

        {/* Section Header */}
        <ScrollReveal direction="bottom">
          <div className="process-header">
            <span className="editorial-eyebrow">THE MAKING PROCESS</span>
            <h2 className="editorial-headline">
              From imagination <br className="hidden-mobile" />
              to creation.
            </h2>
            <p className="editorial-description">
              A journey of skills, care, and purpose.
            </p>
            <a href="#makers" className="editorial-link">
              <span>Watch the journey</span>
              <span className="link-arrow">→</span>
            </a>
          </div>
        </ScrollReveal>

        {/* Steps Grid / Timeline */}
        <div className="process-steps-container">
          {STEPS.map((step, index) => {
            const stepDirection = index === 0 ? "left" : index === 1 ? "bottom" : "right";
            return (
              <ScrollReveal
                key={step.stepNumber}
                direction={stepDirection}
                delay={index * 120}
                className="process-step-item"
              >
                <div className="process-number-badge font-serif" aria-hidden="true">
                  {step.stepNumber}
                </div>

                {/* Step Image Card */}
                <div className="process-image-wrapper">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="process-image"
                  />
                </div>

                {/* Step Info */}
                <div className="process-info">
                  <h3 className="process-step-title font-serif">
                    <span className="process-title-number">{step.stepNumber}. </span>
                    {step.title}
                  </h3>
                  <p className="process-subtitle font-sans">{step.subtitle}</p>
                </div>

                {/* Connector Arrow (Desktop only, between steps) */}
                {index < STEPS.length - 1 && (
                  <div className="process-connector-arrow" aria-hidden="true">
                    →
                  </div>
                )}
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
