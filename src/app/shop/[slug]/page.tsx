import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "./product-detail-view";
import { ProductDetailSkeleton } from "./product-detail-skeleton";
import { getProducts, getProductBySlug } from "@/services/product-service";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | RASA Handcrafted Luxury",
      description: "Discover handcrafted artisan creations from RASA.",
    };
  }

  return {
    title: `${product.name} | RASA Handcrafted Heritage`,
    description: product.description,
    openGraph: {
      title: `${product.name} | RASA`,
      description: product.description,
      images: product.images.length > 0 ? [product.images[0]] : [],
    },
  };
}

async function ProductDetailContent({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailView slug={slug} initialProduct={product} />;
}

export default function ProductDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}
