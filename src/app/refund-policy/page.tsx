import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Return, Refund & Cancellation Policy | RASA Sampoorna",
  description:
    "Transparent return guidelines, transit damage replacements, and refund mechanisms for RASA Sampoorna handcrafted creations.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#2c2621]">
      <SiteHeader solidBackground />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#7a6f64] flex items-center gap-2">
          <Link href="/" className="hover:text-[#2c2621] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#2c2621] font-medium">Returns &amp; Refunds</span>
        </nav>

        {/* Header Block */}
        <header className="mb-10 pb-8 border-b border-[#e8dfd5]">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8c7355] font-semibold block mb-2">
            RASA Sampoorna (By Hrdyasara)
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2621] tracking-tight mb-4">
            Returns, Refunds &amp; Cancellations
          </h1>
          <p className="text-sm text-[#7a6f64]">
            Last Updated: January 2026 • 7-day hassle-free replacement for transit damage
          </p>
        </header>

        {/* Content Body */}
        <article className="prose prose-stone max-w-none space-y-8 text-[#4a4036] leading-relaxed">
          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              1. Artisanal Nature &amp; Return Philosophy
            </h2>
            <p className="mb-3">
              At <strong>RASA Sampoorna (By Hrdyasara)</strong>, every creation is hand-painted, woven, or crocheted with painstaking skill by our neurodiverse artisans. Because these are original handcrafted works of art rather than mass-manufactured goods, slight organic variations in dye, brushwork, or weave texture are cherished aspects of their authenticity.
            </p>
            <p>
              However, our foremost priority is your total satisfaction and joy. We stand by the craftsmanship of every single item.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              2. Transit Damage &amp; Defects
            </h2>
            <p className="mb-3">
              If an item reaches you in a damaged condition or with an unintended structural flaw:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Please notify us within <strong>7 days of delivery</strong> by sending photos or a short unboxing video of the parcel to{" "}
                <a href="mailto:care@rasasampoorna.com" className="text-[#8c7355] underline font-medium">
                  care@rasasampoorna.com
                </a>{" "}
                or WhatsApp at <strong>+91 98765 43210</strong>.
              </li>
              <li>
                We will arrange a complimentary courier reverse pick-up from your doorstep.
              </li>
              <li>
                You may choose either an immediate replacement or a 100% full refund credited to your original payment method.
              </li>
            </ul>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              3. Order Cancellations
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Standard Orders:</strong> You can cancel your order within 24 hours of placement for a full instant refund, provided the order has not yet been dispatched.
              </li>
              <li>
                <strong>Custom Made-to-Order Sarees / Bespoke Hampers:</strong> Once the artisan begins the hand-painting process (typically after 48 hours), customized orders cannot be cancelled due to irreversible raw material and artisan dedication.
              </li>
            </ul>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              4. Refund Processing Time
            </h2>
            <p>
              Approved refunds are initiated within <strong>24 to 48 business hours</strong> after inspection of the returned parcel. Depending on your bank or credit card issuer, the credited funds typically reflect in your account within 5 to 7 working days.
            </p>
          </section>
        </article>

        {/* Quick Policy Switcher */}
        <div className="mt-12 pt-8 border-t border-[#e8dfd5] flex flex-wrap gap-4 text-sm justify-between items-center text-[#7a6f64]">
          <span>Other Policies:</span>
          <div className="flex flex-wrap gap-4 font-medium text-[#8c7355]">
            <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="hover:underline">Terms &amp; Conditions</Link>
            <Link href="/shipping-policy" className="hover:underline">Shipping &amp; Delivery</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
