/**
 * Product Data Service / API Layer
 * Connects frontend storefront components seamlessly to the PostgreSQL catalog service
 * with robust local fallback for build-time safety and graceful degradation.
 */

import { Product, RelatedProduct, CorporatePackage, ProductFilters, ProductCategory } from "@/types/product";
import productsJson from "@/data/products.json";
import relatedProductsJson from "@/data/related-products.json";
import corporatePackagesJson from "@/data/corporate-packages.json";
import { catalogService } from "@/modules/catalog/catalog.service";

/**
 * Fetch all products, with database query and local fallback
 */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  try {
    const res = await catalogService.getProducts({
      category: filters?.category,
      maxPrice: filters?.maxPrice,
      search: filters?.search,
      sortBy: filters?.sortBy as any,
      limit: 100,
    });

    if (res.items && res.items.length > 0) {
      const dbList = res.items as unknown as Product[];
      const map = new Map<string, Product>();
      (productsJson as Product[]).forEach((p) => map.set(p.slug, p));
      dbList.forEach((p) => map.set(p.slug, p));
      let list = Array.from(map.values());

      if (filters?.category && filters.category !== "All") {
        list = list.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
      }
      if (filters?.maxPrice) {
        list = list.filter((p) => p.price <= filters.maxPrice!);
      }
      if (filters?.materials && filters.materials.length > 0) {
        list = list.filter((p) =>
          filters.materials!.some((mat) => p.material.toLowerCase().includes(mat.toLowerCase()))
        );
      }
      return list;
    }
  } catch (err) {
    // Graceful fallback to local JSON dataset during build or offline database
  }

  // Local JSON implementation fallback
  let list: Product[] = [...(productsJson as Product[])];

  if (filters?.category && filters.category !== "All") {
    list = list.filter((p) => p.category === filters.category);
  }

  if (filters?.maxPrice) {
    list = list.filter((p) => p.price <= filters.maxPrice!);
  }

  if (filters?.materials && filters.materials.length > 0) {
    list = list.filter((p) =>
      filters.materials!.some((mat) => p.material.toLowerCase().includes(mat.toLowerCase()))
    );
  }

  if (filters?.sortBy) {
    if (filters.sortBy === "price-low") list.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === "price-high") list.sort((a, b) => b.price - a.price);
    else if (filters.sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
  }

  return list;
}

/**
 * Fetch a single product by slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const dbProduct = await catalogService.getProductBySlug(slug);
    if (dbProduct) {
      return dbProduct as unknown as Product;
    }
  } catch (err) {
    // Fallback to local JSON dataset
  }

  const found = (productsJson as Product[]).find((p) => p.slug === slug);
  return found || null;
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const dbProduct = await catalogService.getProductById(id);
    if (dbProduct) {
      return catalogService.formatProduct(dbProduct) as unknown as Product;
    }
  } catch (err) {
    // Fallback to local JSON dataset
  }

  const found = (productsJson as Product[]).find((p) => p.id === id);
  return found || null;
}

/**
 * Fetch related products
 */
export async function getRelatedProducts(currentSlug?: string): Promise<RelatedProduct[]> {
  try {
    const dbProducts = await catalogService.getProducts({ limit: 4 });
    if (dbProducts.items && dbProducts.items.length > 0) {
      return dbProducts.items
        .filter((p) => p.slug !== currentSlug)
        .slice(0, 4)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category as ProductCategory,
          price: p.price,
          image: p.images[0] || "/products/saree-lotus-main.jpg",
          link: `/shop/${p.slug}`,
        }));
    }
  } catch (err) {
    // Fallback to local JSON
  }

  return relatedProductsJson as RelatedProduct[];
}

/**
 * Fetch suggested products from the SAME category (excluding current product)
 */
export async function getSuggestedProducts(
  category: ProductCategory,
  currentProductId?: string,
  limit: number = 4
): Promise<Product[]> {
  try {
    const res = await catalogService.getProducts({
      category,
      limit: limit + 1,
    });

    if (res.items && res.items.length > 0) {
      return res.items
        .filter((p) => p.id !== currentProductId)
        .slice(0, limit) as unknown as Product[];
    }
  } catch (err) {
    // Fallback
  }

  const all = productsJson as Product[];
  const sameCategory = all.filter(
    (p) => p.category === category && p.id !== currentProductId
  );

  return sameCategory.slice(0, limit);
}

/**
 * Fetch corporate gifting packages
 */
export async function getCorporatePackages(): Promise<CorporatePackage[]> {
  return corporatePackagesJson as CorporatePackage[];
}
