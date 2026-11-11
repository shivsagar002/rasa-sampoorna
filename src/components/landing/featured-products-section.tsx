import Image from "next/image";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface ProductItem {
  id: string;
  name: string;
  material: string;
  badge?: string;
  priceFormatted: string;
  image: string;
}

const FEATURED_PRODUCTS: ProductItem[] = [
  {
    id: "lotus-bloom-saree",
    name: "Lotus Bloom Saree",
    material: "Hand-painted silk",
    badge: "One of a kind",
    priceFormatted: "₹ 12,500",
    image: "/products/product_lotus_saree_v2.webp",
  },
  {
    id: "tranquil-thoughts",
    name: "Tranquil Thoughts",
    material: "Original painting",
    badge: "Canvas",
    priceFormatted: "₹ 8,500",
    image: "/products/product_tranquil_thoughts_v2.webp",
  },
  {
    id: "bloom-bag",
    name: "Bloom Bag",
    material: "Handmade crochet",
    badge: "Cotton",
    priceFormatted: "₹ 2,800",
    image: "/products/product_bloom_bag_v2.webp",
  },
  {
    id: "floral-bouquet",
    name: "Floral Bouquet",
    material: "Handmade crochet",
    badge: "Cotton",
    priceFormatted: "₹ 1,200",
    image: "/products/product_floral_bouquet_v2.webp",
  },
];

export function FeaturedProductsSection() {
  return (
    <section id="featured-products" className="landing-section section-products">
      <div className="landing-container">
        {/* Header Row */}
        <ScrollReveal direction="bottom">
          <div className="products-header">
            <div className="products-header-text">
              <span className="editorial-eyebrow">FEATURED PRODUCTS</span>
              <h2 className="editorial-headline">
                Handpicked <br className="hidden-mobile" />
                just for you.
              </h2>
              <p className="editorial-description">Unique pieces. Limited stock.</p>
            </div>

            <div className="products-header-link">
              <a href="#featured-products" className="editorial-link">
                <span>View All Products</span>
                <span className="link-arrow">→</span>
              </a>
            </div>
          </div>
        </ScrollReveal>

        {/* 4-Column Product Grid */}
        <div className="products-grid">
          {FEATURED_PRODUCTS.map((product, index) => (
            <ScrollReveal
              key={product.id}
              direction="bottom"
              delay={index * 80}
              className="product-card"
              id={`product-${product.id}`}
            >
              <div className="product-image-container">
                <Image
                  src={product.image}
                  alt={`${product.name} handcrafted by RASA Sampoorna artisans`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 280px"
                  className="product-image"
                />
              </div>

              <div className="product-details">
                <h3 className="product-name font-serif">{product.name}</h3>
                <span className="product-price font-sans">{product.priceFormatted}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Mobile View All Products Button */}
        <div className="products-footer-cta">
          <a href="#featured-products" className="btn-secondary-pill">
            <span>View All Products</span>
            <span className="btn-arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
