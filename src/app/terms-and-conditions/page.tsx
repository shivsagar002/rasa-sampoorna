import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Terms & Conditions | RASA Sampoorna",
  description:
    "Review the Terms and Conditions governing purchases, website usage, intellectual property, and community guidelines for RASA Sampoorna (By Hrdyasara).",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#2c2621]">
      <SiteHeader solidBackground />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#7a6f64] flex items-center gap-2">
          <Link href="/" className="hover:text-[#2c2621] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#2c2621] font-medium">Terms &amp; Conditions</span>
        </nav>

        {/* Header Block */}
        <header className="mb-10 pb-8 border-b border-[#e8dfd5]">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8c7355] font-semibold block mb-2">
            RASA Sampoorna (By Hrdyasara)
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2621] tracking-tight mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-[#7a6f64]">
            Last Updated: January 2026 • Effective Date: January 1, 2026
          </p>
        </header>

        {/* Content Body */}
        <article className="prose prose-stone max-w-none space-y-8 text-[#4a4036] leading-relaxed">
          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or placing an order through this website operated by <strong>RASA Sampoorna (By Hrdyasara)</strong>, you agree to comply with and be bound by the following terms, conditions, and disclaimers. If you do not agree with any part of these terms, please refrain from using our services.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              2. Handcrafted &amp; Artisanal Authenticity
            </h2>
            <p className="mb-3">
              All creations showcased under RASA Sampoorna—including hand-painted silk sarees, canvas paintings, crochet accessories, and botanical hampers—are meticulously created by women artisans and neurodiverse individuals.
            </p>
            <p>
              Because each creation is authentically handcrafted, subtle variations in brushstrokes, pigment intensity, natural dye tones, weave density, and thread texture are not defects; they are the hallmarks of genuine artisanal art and make each piece uniquely yours.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              3. Pricing, Orders &amp; Payments
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All prices are stated in Indian Rupees (INR) and are inclusive of applicable GST unless explicitly stated otherwise for international consignments.</li>
              <li>We reserve the right to decline or cancel any order in situations involving inadvertent typographical pricing errors or unexpected inventory depletion.</li>
              <li>Upon order confirmation, you will receive an official electronic acknowledgement detailing your order items and dispatch estimates.</li>
            </ul>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              4. Corporate Gifting &amp; Custom Orders
            </h2>
            <p>
              Custom corporate packages, personalized branding, bespoke colorways, and bulk orders require advance confirmation and custom production timelines agreed upon in writing. Production begins upon receipt of the agreed deposit or purchase order.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              5. Intellectual Property Rights
            </h2>
            <p>
              All textile motifs, painting concepts, artwork photographs, brand logos, product descriptions, and multimedia content hosted on this site are the exclusive intellectual property of RASA Sampoorna (By Hrdyasara). Reproduction or commercial redistribution without prior written consent is strictly prohibited.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              6. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising in connection with transactions on this platform shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka.
            </p>
          </section>
        </article>

        {/* Quick Policy Switcher */}
        <div className="mt-12 pt-8 border-t border-[#e8dfd5] flex flex-wrap gap-4 text-sm justify-between items-center text-[#7a6f64]">
          <span>Other Policies:</span>
          <div className="flex flex-wrap gap-4 font-medium text-[#8c7355]">
            <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
            <Link href="/shipping-policy" className="hover:underline">Shipping &amp; Delivery</Link>
            <Link href="/refund-policy" className="hover:underline">Returns &amp; Refunds</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
