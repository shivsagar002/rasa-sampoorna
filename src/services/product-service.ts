/**
 * Product Data Service / API Layer
 * 
 * ARCHITECTURE FOR BACKEND INTEGRATION:
 * ----------------------------------------------------
 * Currently, all product data is stored locally in JSON format (/src/data/*.json)
 * and product images are centralized in /public/products/*.
 * 
 * When ready to integrate the real backend API:
 * 1. Set NEXT_PUBLIC_API_URL in your .env.local (e.g., https://api.yourbackend.com/api/v1)
 * 2. Set USE_LOCAL_MOCK = false below (or rely on the presence of NEXT_PUBLIC_API_URL)
 * 3. The functions below will automatically query the backend endpoints.
 * 
 * NO CHANGES TO FRONTEND COMPONENTS ARE REQUIRED!
 */

import { Product, RelatedProduct, CorporatePackage, ProductFilters, ProductCategory } from "@/types/product";
import productsJson from "@/data/products.json";
import relatedProductsJson from "@/data/related-products.json";
import corporatePackagesJson from "@/data/corporate-packages.json";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const USE_LOCAL_MOCK = !API_BASE_URL;

/**
 * Fetch all products, with optional client-side/server-side filtering
 */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  if (!USE_LOCAL_MOCK) {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append("category", filters.category);
      if (filters?.maxPrice) params.append("maxPrice", filters.maxPrice.toString());
      if (filters?.sortBy) params.append("sortBy", filters.sortBy);
      if (filters?.search) params.append("search", filters.search);

      const url = `${API_BASE_URL}/products${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        next: { revalidate: 60 }, // ISR cache for production Next.js
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      console.warn("Backend API fetch failed, falling back to local JSON data:", err);
    }
  }

  // Local JSON implementation
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
  if (!USE_LOCAL_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${slug}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Backend fetch for slug "${slug}" failed, falling back to local JSON:`, err);
    }
  }

  const found = (productsJson as Product[]).find((p) => p.slug === slug);
  return found || null;
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  if (!USE_LOCAL_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/id/${id}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Backend fetch for id "${id}" failed, falling back to local JSON:`, err);
    }
  }

  const found = (productsJson as Product[]).find((p) => p.id === id);
  return found || null;
}

/**
 * Fetch related products
 */
export async function getRelatedProducts(currentSlug?: string): Promise<RelatedProduct[]> {
  if (!USE_LOCAL_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/related${currentSlug ? `?slug=${currentSlug}` : ""}`, {
        next: { revalidate: 120 },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Backend fetch for related products failed, falling back to local JSON:", err);
    }
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
  if (!USE_LOCAL_MOCK) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/products/suggested?category=${category}&excludeId=${currentProductId || ""}&limit=${limit}`,
        { next: { revalidate: 60 } }
      );
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Backend fetch for suggested products failed, falling back to local JSON:", err);
    }
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
  if (!USE_LOCAL_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/corporate-packages`, {
        next: { revalidate: 300 },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Backend fetch for corporate packages failed, falling back to local JSON:", err);
    }
  }

  return corporatePackagesJson as CorporatePackage[];
}
