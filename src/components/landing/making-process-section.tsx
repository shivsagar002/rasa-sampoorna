"use client";

import Image from "next/image";
import { BotanicalBranch } from "./botanical-decor";

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

        {/* Steps Grid / Timeline */}
        <div className="process-steps-container">
          {STEPS.map((step, index) => (
            <div key={step.stepNumber} className="process-step-item">
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
                <div className="process-number-badge font-serif">{step.stepNumber}. {step.title}</div>
                <p className="process-subtitle font-sans">{step.subtitle}</p>
              </div>

              {/* Connector Arrow (Desktop only, between steps) */}
              {index < STEPS.length - 1 && (
                <div className="process-connector-arrow" aria-hidden="true">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
