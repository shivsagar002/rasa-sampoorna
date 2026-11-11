import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://rasasampoorna.vercel.app"
  ),
  title: "RASA Sampoorna | Handcrafted Heritage by Neurodiverse Artisans",
  description:
    "Handcrafted sarees, lyrical paintings, delicate crochet, and luxury gift hampers created with dignity and love by neurodiverse artisans at RASA (By Hrdyasara).",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F4EE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { Suspense } from "react";
import { ShopProvider } from "@/context/shop-context";
import { PromoOfferPopup } from "@/components/navigation/promo-offer-popup";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ShopProvider>
          <Suspense fallback={null}>
            <PromoOfferPopup />
          </Suspense>
          {children}
        </ShopProvider>
      </body>
    </html>
  );
}
