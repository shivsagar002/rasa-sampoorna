import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";

import { cmsService } from "@/modules/cms/cms.service";

export const instant = false;

export const metadata: Metadata = {
  title: "Return, Refund & Cancellation Policy | RASA Sampoorna",
  description:
    "Transparent return guidelines, transit damage replacements, and refund mechanisms for RASA Sampoorna handcrafted creations.",
};

export default async function RefundPolicyPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const isPreview = resolvedParams?.preview === "true";
  const { content } = await cmsService.getPageContent("refund-policy", { preview: isPreview });

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#2c2621] overflow-x-hidden">
      <SiteHeader solidBackground />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 w-full pb-24 md:pb-16 break-words">
        {/* Preview Alert Banner */}
        {isPreview && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium flex items-center justify-between">
            <span>Preview Mode: Viewing current draft revision</span>
            <span className="uppercase text-[10px] tracking-wider font-bold bg-amber-200 px-2 py-0.5 rounded">Draft</span>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#7a6f64] flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-[#2c2621] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355] rounded-xs">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#2c2621] font-medium">Returns &amp; Refunds</span>
        </nav>

        {/* Header Block */}
        <header className="mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-[#e8dfd5]">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8c7355] font-semibold block mb-2">
            RASA Sampoorna (By Hrdyasara)
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#2c2621] tracking-tight mb-3 sm:mb-4">
            {content.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#7a6f64]">
            {content.summary}
          </p>
        </header>

        {/* Content Body */}
        <article className="prose prose-stone max-w-3xl space-y-6 sm:space-y-8 text-[#4a4036] leading-relaxed">
          {content.sections.map((section, idx) => (
            <section key={idx} className="bg-white/70 p-5 sm:p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-xs">
              <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
                {section.heading}
              </h2>
              <div className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-[#4a4036]">
                {section.body}
              </div>
            </section>
          ))}
        </article>

        {/* Quick Policy Switcher */}
        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-[#e8dfd5] flex flex-wrap gap-4 text-sm justify-between items-center text-[#7a6f64]">
          <span className="font-medium">Other Policies:</span>
          <div className="flex flex-wrap gap-4 font-medium text-[#8c7355]">
            <Link href="/privacy-policy" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355] rounded-xs">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355] rounded-xs">Terms &amp; Conditions</Link>
            <Link href="/shipping-policy" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355] rounded-xs">Shipping &amp; Delivery</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
