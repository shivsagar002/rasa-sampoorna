"use client";

import { CollectionsSection } from "./collections-section";
import { CraftMakersSection } from "./craft-makers-section";
import { CorporateGiftingSection } from "./corporate-gifting-section";
import { FeaturedProductsSection } from "./featured-products-section";
import { MakingProcessSection } from "./making-process-section";
import { BrandPhilosophySection } from "./brand-philosophy-section";
import { FinalCtaSection } from "./final-cta-section";
import { SiteFooter } from "./site-footer";

export function LandingPageContent() {
  return (
    <div className="landing-page-wrapper">
      {/* SECTION A — EXPLORE OUR COLLECTIONS */}
      <CollectionsSection />

      {/* SECTION B — THE PEOPLE BEHIND THE CRAFT */}
      <CraftMakersSection />

      {/* SECTION C — CORPORATE GIFTING */}
      <CorporateGiftingSection />

      {/* SECTION D — FEATURED PRODUCTS */}
      <FeaturedProductsSection />

      {/* SECTION E — THE MAKING PROCESS */}
      <MakingProcessSection />

      {/* SECTION F — BRAND PHILOSOPHY AND IMPACT (including FAQs & Contact) */}
      <BrandPhilosophySection />

      {/* SECTION G — FINAL CALL TO ACTION */}
      <FinalCtaSection />

      {/* SECTION H — FOOTER */}
      <SiteFooter />
    </div>
  );
}
