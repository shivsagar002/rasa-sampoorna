import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";

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
    <div className="min-h-screen flex flex-col bg-[#f7f4ee] text-[#2c2621] overflow-x-hidden">
      <SiteHeader solidBackground />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 w-full pb-24 md:pb-16 break-words">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#7a6f64] flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-[#2c2621] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355] rounded-xs">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#2c2621] font-medium">Policies</span>
        </nav>

        {/* Header Block */}
        <header className="mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-[#e8dfd5]">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8c7355] font-semibold block mb-2">
            RASA Sampoorna (By Hrdyasara)
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#2c2621] tracking-tight mb-3 sm:mb-4">
            Policies &amp; Transparency
          </h1>
          <p className="text-sm sm:text-base text-[#5a4e42] leading-relaxed max-w-2xl">
            We hold ourselves to the highest standards of integrity, craftsmanship, and consumer trust. Explore our complete policies below.
          </p>
        </header>

        {/* Policy Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {policyCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="p-5 sm:p-6 md:p-8 rounded-2xl bg-white border border-[#e8dfd5] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355]"
            >
              <div>
                <span className="inline-block text-xs uppercase tracking-wider text-[#8c7355] font-medium px-2.5 py-1 rounded-md bg-[#f7f4ee] border border-[#e8dfd5] mb-3">
                  {card.badge}
                </span>
                <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-semibold text-[#2c2621] group-hover:text-[#8c7355] transition-colors mb-2">
                  {card.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#65594e] leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-5 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-[#2c2621] group-hover:translate-x-1 transition-transform">
                <span>Read Full Policy</span>
                <span className="ml-1 text-[#8c7355]" aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
