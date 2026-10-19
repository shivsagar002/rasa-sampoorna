import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | RASA Sampoorna",
  description:
    "Details on domestic and international shipping timelines, packaging standards, tracking procedures, and rates for RASA Sampoorna handcrafted creations.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#2c2621]">
      <SiteHeader solidBackground />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#7a6f64] flex items-center gap-2">
          <Link href="/" className="hover:text-[#2c2621] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#2c2621] font-medium">Shipping &amp; Delivery</span>
        </nav>

        {/* Header Block */}
        <header className="mb-10 pb-8 border-b border-[#e8dfd5]">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8c7355] font-semibold block mb-2">
            RASA Sampoorna (By Hrdyasara)
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2621] tracking-tight mb-4">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="text-sm text-[#7a6f64]">
            Last Updated: January 2026 • Complimentary domestic shipping on all orders above ₹1,999
          </p>
        </header>

        {/* Content Body */}
        <article className="prose prose-stone max-w-none space-y-8 text-[#4a4036] leading-relaxed">
          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              1. Artisanal Handling &amp; Dispatch Timelines
            </h2>
            <p className="mb-3">
              Because our creations are crafted by hand and inspected individually for quality and finishing, please observe our standard fulfillment intervals:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
              <div className="p-4 bg-[#fbf9f5] rounded-xl border border-[#e8dfd5]">
                <h3 className="font-serif font-semibold text-base text-[#2c2621] mb-1">Ready-to-Ship Pieces</h3>
                <p className="text-[#65594e]">
                  Dispatched within <strong>2 to 4 business days</strong> following quality verification and protective gift-boxing.
                </p>
              </div>
              <div className="p-4 bg-[#fbf9f5] rounded-xl border border-[#e8dfd5]">
                <h3 className="font-serif font-semibold text-base text-[#2c2621] mb-1">Made-to-Order / Custom Sarees</h3>
                <p className="text-[#65594e]">
                  Hand-painted over <strong>10 to 18 business days</strong> by senior artisans before final dispatch.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              2. Domestic Transit Times (India)
            </h2>
            <p className="mb-3">
              We partner with India&rsquo;s leading courier services including BlueDart, Delhivery, and Speed Post to ensure safe handling:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Metro Cities (Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, Kolkata):</strong> 2 to 5 business days post dispatch.</li>
              <li><strong>Non-Metro &amp; Tier 2/3 Cities:</strong> 4 to 7 business days post dispatch.</li>
              <li><strong>Specialty / Remote PIN codes:</strong> 7 to 10 business days post dispatch.</li>
            </ul>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              3. Shipping Charges
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Standard Domestic Orders (above ₹1,999):</strong> FREE complimentary shipping across India.</li>
              <li><strong>Domestic Orders below ₹1,999:</strong> Flat nominal shipping fee of ₹99.</li>
              <li><strong>Express Delivery:</strong> Available upon request at checkout for eligible metro pincodes.</li>
              <li><strong>International Shipping:</strong> Calculated at checkout based on destination country and parcel volumetric weight.</li>
            </ul>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              4. Sustainable Artisan Packaging
            </h2>
            <p>
              Every parcel from RASA Sampoorna is packaged with conscious luxury: recyclable rigid craft boxes, natural butter paper, botanical sealing wax, and hand-tied jute ribbons. Paintings are reinforced with corner guards and moisture-resistant wrapping to prevent transit damage.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              5. Live Tracking &amp; Notifications
            </h2>
            <p>
              Once your parcel leaves our Bengaluru atelier, an SMS and Email notification with live tracking link and AWB waybill number is generated automatically. You can monitor the parcel journey until doorstep delivery.
            </p>
          </section>
        </article>

        {/* Quick Policy Switcher */}
        <div className="mt-12 pt-8 border-t border-[#e8dfd5] flex flex-wrap gap-4 text-sm justify-between items-center text-[#7a6f64]">
          <span>Other Policies:</span>
          <div className="flex flex-wrap gap-4 font-medium text-[#8c7355]">
            <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="hover:underline">Terms &amp; Conditions</Link>
            <Link href="/refund-policy" className="hover:underline">Returns &amp; Refunds</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
