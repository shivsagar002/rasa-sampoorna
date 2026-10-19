import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | RASA Sampoorna",
  description:
    "Learn how RASA Sampoorna (By Hrdyasara) collects, uses, and safeguards your personal data with utmost transparency and care.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#2c2621]">
      <SiteHeader solidBackground />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#7a6f64] flex items-center gap-2">
          <Link href="/" className="hover:text-[#2c2621] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#2c2621] font-medium">Privacy Policy</span>
        </nav>

        {/* Header Block */}
        <header className="mb-10 pb-8 border-b border-[#e8dfd5]">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8c7355] font-semibold block mb-2">
            RASA Sampoorna (By Hrdyasara)
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2621] tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#7a6f64]">
            Last Updated: January 2026 • Effective Date: January 1, 2026
          </p>
        </header>

        {/* Content Body */}
        <article className="prose prose-stone max-w-none space-y-8 text-[#4a4036] leading-relaxed">
          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              1. Our Commitment to Your Privacy
            </h2>
            <p>
              Welcome to <strong>RASA Sampoorna</strong> (By Hrdyasara) (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). We are deeply dedicated to protecting the privacy and confidentiality of our patrons, clients, and partners. This Privacy Policy delineates how we collect, handle, store, and protect your personal information when you visit our website, purchase our handcrafted creations, or engage with our corporate gifting ateliers.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              2. Information We Collect
            </h2>
            <p className="mb-3">
              We gather information strictly necessary to provide an exceptional artisanal shopping experience and to fulfill orders with precision:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Contact Details:</strong> Full name, shipping address, billing address, phone number, and email address.
              </li>
              <li>
                <strong>Transaction &amp; Order History:</strong> Selected handcrafted items, custom customization notes, corporate gifting requests, invoice records, and shipping waybill numbers.
              </li>
              <li>
                <strong>Payment Security:</strong> All financial payments are encrypted and processed through certified PCI-DSS compliant gateways. We do not store credit card or banking PIN numbers on our servers.
              </li>
              <li>
                <strong>Technical Browsing Data:</strong> Anonymized device information, IP address, browser type, and navigation pathways to optimize our platform performance and loading speeds.
              </li>
            </ul>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              3. Purpose of Processing
            </h2>
            <p className="mb-3">Your data is utilized strictly for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Processing, hand-packaging, and dispatching your artisanal creations.</li>
              <li>Sharing dispatch tracking, delivery schedules, and receipt confirmations.</li>
              <li>Tailoring bespoke corporate gifting proposals and bulk consignments.</li>
              <li>Responding to customer enquiries, artisan workshops, and feedback.</li>
              <li>Complying with statutory tax, invoicing, and regulatory obligations under Indian law.</li>
            </ul>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              4. Data Sharing &amp; Third Parties
            </h2>
            <p>
              We <strong>never sell, lease, or monetize</strong> your personal data. We only share essential delivery parameters with vetted logistics partners (e.g., Delhivery, BlueDart, India Post) and payment aggregators solely for executing your order.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              5. Your Rights &amp; Control
            </h2>
            <p>
              You maintain the right to review, rectify, or request deletion of your stored customer records at any time. To exercise these rights or to opt out of promotional newsletters, please contact our Data Protection Officer at{" "}
              <a href="mailto:privacy@rasasampoorna.com" className="text-[#8c7355] underline font-medium">
                privacy@rasasampoorna.com
              </a>.
            </p>
          </section>

          <section className="bg-white/70 p-6 md:p-8 rounded-2xl border border-[#e8dfd5] shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] mb-3">
              6. Grievance Redressal &amp; Contact
            </h2>
            <p>
              For any questions regarding our privacy practices or data handling, please write to:
            </p>
            <div className="mt-3 text-sm text-[#5a4e42] space-y-1">
              <p><strong>RASA Sampoorna (By Hrdyasara)</strong></p>
              <p>Atelier &amp; Registered Office: 14/2, Heritage Arts Enclave, Bengaluru, Karnataka, India 560001</p>
              <p>Email: <a href="mailto:care@rasasampoorna.com" className="underline">care@rasasampoorna.com</a></p>
              <p>Phone: +91 98765 43210</p>
            </div>
          </section>
        </article>

        {/* Quick Policy Switcher */}
        <div className="mt-12 pt-8 border-t border-[#e8dfd5] flex flex-wrap gap-4 text-sm justify-between items-center text-[#7a6f64]">
          <span>Other Policies:</span>
          <div className="flex flex-wrap gap-4 font-medium text-[#8c7355]">
            <Link href="/terms-and-conditions" className="hover:underline">Terms &amp; Conditions</Link>
            <Link href="/shipping-policy" className="hover:underline">Shipping &amp; Delivery</Link>
            <Link href="/refund-policy" className="hover:underline">Returns &amp; Refunds</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
