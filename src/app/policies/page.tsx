import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Policies & Customer Care | RASA Sampoorna",
  description:
    "Explore our Privacy Policy, Terms & Conditions, Shipping & Delivery, and Return & Refund guidelines at RASA Sampoorna (By Hrdyasara).",
};

export default function PoliciesHubPage() {
  const policyCards = [
    {
      title: "Privacy Policy",
      description: "How we collect, encrypt, and respect your personal information with absolute confidentiality.",
      href: "/privacy-policy",
      badge: "Data Protection",
    },
    {
      title: "Terms & Conditions",
      description: "Rules, artisan authenticity notices, and purchase conditions governing website usage and orders.",
      href: "/terms-and-conditions",
      badge: "Legal Terms",
    },
    {
      title: "Shipping & Delivery Policy",
      description: "Domestic and international transit times, plastic-free packaging, free shipping tiers, and live tracking.",
      href: "/shipping-policy",
      badge: "Complimentary > ₹1,999",
    },
    {
      title: "Return & Refund Policy",
      description: "7-day transit damage replacement, doorstep reverse pickup, order cancellations, and refund processing.",
      href: "/refund-policy",
      badge: "7-Day Replacement",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#2c2621]">
      <SiteHeader solidBackground />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#7a6f64] flex items-center gap-2">
          <Link href="/" className="hover:text-[#2c2621] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#2c2621] font-medium">Policies</span>
        </nav>

        {/* Header Block */}
        <header className="mb-10 pb-8 border-b border-[#e8dfd5]">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8c7355] font-semibold block mb-2">
            RASA Sampoorna (By Hrdyasara)
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2621] tracking-tight mb-4">
            Policies &amp; Transparency
          </h1>
          <p className="text-base text-[#5a4e42] leading-relaxed">
            We hold ourselves to the highest standards of integrity, craftsmanship, and consumer trust. Explore our complete policies below.
          </p>
        </header>

        {/* Policy Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policyCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="p-6 md:p-8 rounded-2xl bg-white border border-[#e8dfd5] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div>
                <span className="inline-block text-xs uppercase tracking-wider text-[#8c7355] font-medium px-2.5 py-1 rounded-md bg-[#f7f4ee] border border-[#e8dfd5] mb-3">
                  {card.badge}
                </span>
                <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#2c2621] group-hover:text-[#8c7355] transition-colors mb-2">
                  {card.title}
                </h2>
                <p className="text-sm text-[#65594e] leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-6 flex items-center text-sm font-semibold text-[#2c2621] group-hover:translate-x-1 transition-transform">
                <span>Read Full Policy</span>
                <span className="ml-1 text-[#8c7355]">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
