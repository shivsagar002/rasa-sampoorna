"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, PRODUCTS } from "@/data/products";

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
}

interface ShopContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, size?: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

// Initial default cart items matching the mockup
const INITIAL_CART: CartItem[] = [
  {
    id: "cart-item-1",
    product: PRODUCTS[0], // Lotus Bloom Saree
    quantity: 1,
    selectedSize: "Free size",
  },
  {
    id: "cart-item-2",
    product: {
      id: "related-03",
      slug: "floral-bouquet",
      name: "Floral Bouquet",
      category: "Crochet",
      tag: "Handcrafted crochet | Forever blooms",
      price: 1200,
      rating: 4.9,
      reviewCount: 32,
      images: ["/products/product_floral_bouquet.webp"],
      description: "Everlasting handcrafted crochet floral bouquet.",
      material: "100% Cotton Yarn",
      size: "Standard",
      availability: "In Stock",
      detailsList: ["Hand-crocheted flowers"],
      makerNote: "Crafted by rural women artisans.",
      shippingNote: "Dispatches within 24 hours.",
    },
    quantity: 1,
    selectedSize: "Standard",
  },
];

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART);
  const [wishlist, setWishlist] = useState<string[]>(["saree-01"]);

  // Calculate totals
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  // Free delivery above ₹2,000 as per mockup (₹0)
  const shippingFee = 0;
  const total = subtotal + shippingFee;

  const addToCart = (
    product: Product,
    quantity: number = 1,
    size: string = "Free size"
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        return next;
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random()}`,
          product,
          quantity,
          selectedSize: size,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return (
    <ShopContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        subtotal,
        shippingFee,
        total,
        wishlist,
        toggleWishlist,
        isInWishlist,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
