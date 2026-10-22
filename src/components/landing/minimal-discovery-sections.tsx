"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./minimal-discovery-sections.module.css";

// 1. Shop by Collection definitions using existing assets & categories
const COLLECTIONS = [
  {
    id: "sarees",
    name: "Sarees",
    description: "Hand-painted silk & cotton",
    image: "/landing/collection_sarees_v2.webp",
    href: "/shop?cat=Sarees",
  },
  {
    id: "paintings",
    name: "Paintings",
    description: "Original canvas artwork",
    image: "/landing/collection_paintings_v2.webp",
    href: "/shop?cat=Paintings",
  },
  {
    id: "crochet",
    name: "Crochet",
    description: "Handmade accessories & gifts",
    image: "/landing/collection_crochet_v2.webp",
    href: "/shop?cat=Crochet",
  },
  {
    id: "gift-hampers",
    name: "Gift Hampers",
    description: "Curated handcrafted gift sets",
    image: "/products/corporate_hero_hamper.jpg",
    href: "/shop?cat=Hampers",
  },
];

// 2. Featured Products from current product data
const FEATURED_PRODUCTS = [
  {
    id: "saree-01",
    slug: "lotus-bloom-saree",
    name: "Lotus Bloom Saree",
    category: "Sarees",
    priceFormatted: "₹12,500",
    image: "/products/saree_lotus_main.jpg",
  },
  {
    id: "painting-01",
    slug: "tranquil-thoughts-painting",
    name: "Tranquil Thoughts Painting",
    category: "Paintings",
    priceFormatted: "₹8,500",
    image: "/products/product_tranquil_thoughts.webp",
  },
  {
    id: "crochet-01",
    slug: "bloom-bag-crochet",
    name: "Bloom Bag",
    category: "Crochet",
    priceFormatted: "₹2,800",
    image: "/products/product_bloom_bag.webp",
  },
  {
    id: "hamper-01",
    slug: "art-craft-keepsake-box",
    name: "Art & Craft Keepsake Box",
    category: "Hampers",
    priceFormatted: "₹2,500",
    image: "/products/corporate_hamper_craft.jpg",
  },
];

export function MinimalDiscoverySections() {
  const [cmsData, setCmsData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/v1/cms/homepage")
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res.data) {
          setCmsData(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const showCategories = cmsData?.featuredCategories?.isVisible !== false;
  const showProducts = cmsData?.featuredProducts?.isVisible !== false;

  return (
    <div className={styles.discoveryWrapper}>
      {/* 1. SHOP BY COLLECTION */}
      {showCategories && (
        <section id="shop-by-collection" className={styles.section} aria-label="Shop by Collection">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.eyebrow}>OUR COLLECTIONS</span>
              <h2 className={styles.headline}>
                {cmsData?.featuredCategories?.title || "Shop by Collection"}
              </h2>
              <p className={styles.description}>
                {cmsData?.featuredCategories?.subtitle || "Explore handcrafted creations made by our artisan collective."}
              </p>
            </div>

          <div className={styles.collectionGrid}>
            {COLLECTIONS.map((col) => (
              <Link key={col.id} href={col.href} className={styles.collectionCard}>
                <div className={styles.collectionImageFrame}>
                  <Image
                    src={col.image}
                    alt={`${col.name} collection`}
                    fill
                    sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className={styles.collectionImg}
                  />
                </div>
                <div className={styles.collectionContent}>
                  <h3 className={styles.collectionTitle}>{col.name}</h3>
                  <p className={styles.collectionDesc}>{col.description}</p>
                  <span className={styles.collectionLink}>
                    Explore Collection →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 2. FEATURED PRODUCTS */}
      {showProducts && (
      <section id="discovery-featured-products" className={styles.section} aria-label="Featured Products">
        <div className={styles.container}>
          <div className={styles.sectionHeaderRow}>
            <div>
              <span className={styles.eyebrow}>CURATED PIECES</span>
              <h2 className={styles.headline}>
                {cmsData?.featuredProducts?.title || "Featured Products"}
              </h2>
              <p className={styles.description}>
                {cmsData?.featuredProducts?.subtitle || "A selection of handmade pieces from our current catalogue."}
              </p>
            </div>
            <Link href="/shop" className={styles.headerLink}>
              View All Products →
            </Link>
          </div>

          <div className={styles.productsGrid}>
            {FEATURED_PRODUCTS.map((prod) => (
              <Link key={prod.id} href={`/shop/${prod.slug}`} className={styles.productCard}>
                <div className={styles.productImageFrame}>
                  <Image
                    src={prod.image}
                    alt={prod.name}
                    fill
                    sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className={styles.productImg}
                  />
                </div>
                <div className={styles.productContent}>
                  <span className={styles.productCategory}>{prod.category}</span>
                  <h3 className={styles.productTitle}>{prod.name}</h3>
                  <div className={styles.productPriceRow}>
                    <span className={styles.productPrice}>{prod.priceFormatted}</span>
                    <span className={styles.productLinkText}>View Product →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 3. CORPORATE GIFTING */}
      <section id="discovery-corporate-gifting" className={styles.section} aria-label="Corporate Gifting">
        <div className={styles.container}>
          <div className={styles.splitRow}>
            <div className={styles.splitImageCol}>
              <Image
                src="/landing/corporate_gift_box_v2.webp"
                alt="Artisan corporate gift hamper"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.splitImg}
              />
            </div>
            <div className={styles.splitContentCol}>
              <span className={styles.eyebrow}>BESPOKE GIFTING</span>
              <h2 className={styles.headline}>Corporate Gifting</h2>
              <p className={styles.splitText}>
                Handcrafted gift hampers and bespoke packaging for organisations, festivals, and corporate milestones. Each gift directly supports the livelihood of rural women artisans.
              </p>
              <Link href="/corporate-gifting" className={styles.ctaButton}>
                Explore Corporate Gifting →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MAKER STORY */}
      <section id="discovery-maker-story" className={styles.section} aria-label="Maker Story">
        <div className={styles.container}>
          <div className={styles.splitRowReverse}>
            <div className={styles.splitContentCol}>
              <span className={styles.eyebrow}>OUR FOUNDATION</span>
              <h2 className={styles.headline}>Behind the Craft</h2>
              <p className={styles.splitText}>
                RASA Sampoorna is a social initiative under the Hrdyasara Foundation. We provide creative training, dignity, and sustainable employment for rural women artisans and differently-abled individuals.
              </p>
              <Link href="/contact" className={styles.ctaLink}>
                Learn About Our Story →
              </Link>
            </div>
            <div className={styles.splitImageCol}>
              <Image
                src="/landing/artisans_collage_v2.webp"
                alt="Artisans at work at RASA Sampoorna"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.splitImg}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
