/**
 * Product Data Module
 * Re-exports type definitions, static JSON data, and API methods.
 */

import { Product, RelatedProduct, CorporatePackage } from "@/types/product";
import productsJson from "./products.json";
import relatedProductsJson from "./related-products.json";
import corporatePackagesJson from "./corporate-packages.json";

export type { Product, RelatedProduct, CorporatePackage, ProductCategory, ProductAvailability, ProductFilters } from "@/types/product";

// Synchronous JSON data exports (used by client contexts & components during static phase)
export const PRODUCTS: Product[] = productsJson as Product[];
export const RELATED_PRODUCTS: RelatedProduct[] = relatedProductsJson as RelatedProduct[];
export const CORPORATE_PACKAGES: CorporatePackage[] = corporatePackagesJson as CorporatePackage[];

// Asynchronous API Service functions for production backend integration
export {
  getProducts,
  getProductBySlug,
  getProductById,
  getRelatedProducts,
  getSuggestedProducts,
  getCorporatePackages,
} from "@/services/product-service";
