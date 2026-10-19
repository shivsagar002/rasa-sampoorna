export type ProductCategory = "Sarees" | "Paintings" | "Crochet" | "Hampers";

export type ProductAvailability = "In Stock" | "Low Stock" | "Made to Order";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  tag: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  description: string;
  material: string;
  size: string;
  availability: ProductAvailability;
  detailsList: string[];
  makerNote: string;
  shippingNote: string;
  isFeatured?: boolean;
}

export interface RelatedProduct {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  image: string;
  link: string;
}

export interface CorporatePackage {
  id: string;
  name: string;
  priceStart: string;
  image: string;
  description: string;
  contents: string[];
}

export interface ProductFilters {
  category?: string;
  maxPrice?: number;
  materials?: string[];
  sortBy?: "newest" | "price-low" | "price-high" | "rating";
  search?: string;
}
