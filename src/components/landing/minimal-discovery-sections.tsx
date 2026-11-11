"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./minimal-discovery-sections.module.css";
import { useShop } from "@/context/shop-context";
import { PRODUCTS } from "@/data/products";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

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
  const [addedSlug, setAddedSlug] = useState<string | null>(null);
  const [productsInView, setProductsInView] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useShop();

  useEffect(() => {
    const node = productsRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProductsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setProductsInView(true);
        observer.disconnect();
      },
      { threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
  const collectionTitle = cmsData?.featuredCategories?.title || "Shop by Collection";
  const collectionWords = collectionTitle.trim().split(/\s+/);
  const collectionAccent = collectionWords.length > 1 ? collectionWords.pop() : "";
  const collectionLead = collectionWords.join(" ");

  return (
    <div className={styles.discoveryWrapper}>
      {/* 1. SHOP BY COLLECTION */}
      {showCategories && (
        <section id="shop-by-collection" className={styles.section} aria-label="Shop by Collection">
          <div className={styles.container}>
            <ScrollReveal direction="bottom">
              <div className={styles.sectionHeader}>
                <span className={styles.eyebrow}>OUR COLLECTIONS</span>
                <h2 className={`${styles.headline} ${styles.collectionHeadline}`}>
                  {collectionLead}
                  {collectionAccent ? (
                    <>
                      {" "}
                      <span className={styles.headlineAccent}>{collectionAccent}</span>
                    </>
                  ) : null}
                </h2>
                <p className={styles.description}>
                  {cmsData?.featuredCategories?.subtitle || "Explore handcrafted creations made by our artisan collective."}
                </p>
              </div>
            </ScrollReveal>

            <div className={styles.collectionGrid}>
              {COLLECTIONS.map((col, index) => (
                <ScrollReveal key={col.id} direction="bottom" delay={index * 75}>
                  <Link href={col.href} className={styles.collectionCard}>
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
                        Explore Collection
                        <span className={styles.collectionArrow} aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. FEATURED PRODUCTS */}
      {showProducts && (
      <section id="discovery-featured-products" className={`${styles.section} ${styles.featuredSection}`} aria-label="Featured Products">
        <div className={styles.container}>
          <ScrollReveal direction="bottom">
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
          </ScrollReveal>

          <div ref={productsRef} className={styles.productsGrid}>
            {FEATURED_PRODUCTS.map((prod, index) => (
              <ScrollReveal
                key={prod.id}
                direction="bottom"
                delay={index * 75}
                className={`${styles.productReveal} ${productsInView ? styles.productRevealIn : ""}`}
              >
              <article className={styles.productCard}>
                <div className={styles.productImageFrame}>
                  <Link href={`/shop/${prod.slug}`} className={styles.productImageLink} aria-label={prod.name}>
                    <Image
                      src={prod.image}
                      alt={prod.name}
                      fill
                      sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className={styles.productImg}
                    />
                  </Link>
                  <button
                    type="button"
                    className={styles.addToCartBtn}
                    onClick={(event) => {
                      event.preventDefault();
                      const product = PRODUCTS.find((item) => item.slug === prod.slug);
                      if (!product) return;
                      void addToCart(product, 1);
                      setAddedSlug(prod.slug);
                      window.setTimeout(() => {
                        setAddedSlug((current) => (current === prod.slug ? null : current));
                      }, 1600);
                    }}
                  >
                    {addedSlug === prod.slug ? "Added" : "Add to Cart"}
                  </button>
                </div>
                <Link href={`/shop/${prod.slug}`} className={styles.productContent}>
                  <span className={styles.productCategory}>{prod.category}</span>
                  <h3 className={styles.productTitle}>{prod.name}</h3>
                  <div className={styles.productPriceRow}>
                    <span className={styles.productPrice}>{prod.priceFormatted}</span>
                    <span className={styles.productLinkText}>View Product →</span>
                  </div>
                </Link>
              </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 3. CORPORATE GIFTING */}
      <section id="discovery-corporate-gifting" className={styles.section} aria-label="Corporate Gifting">
        <div className={styles.container}>
          <div className={styles.splitRow}>
            <ScrollReveal direction="left" className={`${styles.splitImageCol} ${styles.giftStage}`}>
              <div className={styles.giftMainFrame}>
                <Image
                  src="/landing/corporate_gift_box_v2.webp"
                  alt="Artisan corporate gift hamper"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={styles.splitImg}
                />
              </div>
              <div className={styles.giftBadge}>
                <span className={styles.giftBadgeValue}>150+</span>
                <span className={styles.giftBadgeLabel}>Artisans supported</span>
              </div>
              <div className={styles.giftFloatCard}>
                <Image
                  src="/products/corporate_hamper_craft.jpg"
                  alt="A curated artisan gift hamper"
                  fill
                  sizes="180px"
                  className={styles.splitImg}
                />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" className={styles.splitContentCol}>
              <span className={styles.eyebrow}>BESPOKE GIFTING</span>
              <h2 className={styles.headline}>Corporate Gifting</h2>
              <p className={styles.splitText}>
                Handcrafted gift hampers and bespoke packaging for organisations, festivals, and corporate milestones. Each gift directly supports the livelihood of rural women artisans.
              </p>
              <Link href="/corporate-gifting" className={styles.ctaButton}>
                Explore Corporate Gifting →
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 4. MAKER STORY */}
      <section id="discovery-maker-story" className={styles.section} aria-label="Maker Story">
        <div className={styles.container}>
          <div className={styles.splitRowReverse}>
            <ScrollReveal direction="left" className={styles.splitContentCol}>
              <span className={styles.eyebrow}>OUR FOUNDATION</span>
              <h2 className={styles.headline}>Behind the Craft</h2>
              <p className={styles.splitText}>
                RASA Sampoorna is a social initiative under the Hrdyasara Foundation. We provide creative training, dignity, and sustainable employment for rural women artisans and differently-abled individuals.
              </p>
              <Link href="/contact" className={styles.ctaLink}>
                Learn About Our Story →
              </Link>
            </ScrollReveal>
            <ScrollReveal direction="right" className={`${styles.splitImageCol} ${styles.craftStage}`}>
              <span className={styles.craftDots} aria-hidden="true" />
              <div className={styles.craftFrame}>
                <Image
                  src="/landing/artisans_collage_v2.webp"
                  alt="Artisans at work at RASA Sampoorna"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={styles.splitImg}
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
