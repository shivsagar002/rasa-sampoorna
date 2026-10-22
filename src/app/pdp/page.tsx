import { Suspense } from "react";
import { Metadata } from "next";
import { ProductDetailView } from "../shop/[slug]/product-detail-view";
import { ProductDetailSkeleton } from "../shop/[slug]/product-detail-skeleton";
import { getProducts } from "@/services/product-service";

export const metadata: Metadata = {
  title: "Lotus Bloom Saree | RASA Handcrafted Heritage",
  description:
    "Hand-painted pure mulberry silk saree featuring iconic burgundy lotus motifs.",
};

async function PDPContent() {
  const products = await getProducts();
  const defaultProduct = products[0] || null;

  return (
    <ProductDetailView
      slug={defaultProduct?.slug || "lotus-bloom-saree"}
      initialProduct={defaultProduct}
    />
  );
}

export default function PDPPage() {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <PDPContent />
    </Suspense>
  );
}
