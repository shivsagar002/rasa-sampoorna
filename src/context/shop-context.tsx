"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product, PRODUCTS } from "@/data/products";

export interface CartItem {
  id: string;
  variantId?: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  stockWarning?: string | null;
}

export interface AppliedCoupon {
  code: string;
  discountType: string;
  discountAmount: number;
  freeShipping: boolean;
  message?: string;
}

interface ShopContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, size?: string) => Promise<void>;
  updateQuantity: (id: string, delta: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  cartCount: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message?: string }>;
  removeCoupon: () => void;
  hasStockIssue: boolean;
  isLoading: boolean;
  wishlist: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshCart: () => Promise<void>;
  guestToken?: string;
  serverCartId?: string | null;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

// Generate or retrieve valid 48-hex client guest token
export function getClientGuestToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem("rasa_guest_token");
    if (existing && /^guest_[a-f0-9]{48}$/i.test(existing)) {
      return existing;
    }
    const arr = new Uint8Array(24);
    window.crypto.getRandomValues(arr);
    const hex = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    const newToken = `guest_${hex}`;
    localStorage.setItem("rasa_guest_token", newToken);
    return newToken;
  } catch {
    return "";
  }
}

function getCartAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getClientGuestToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-guest-token": token } : {}),
    ...extra,
  };
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasStockIssue, setHasStockIssue] = useState<boolean>(false);
  const [serverShippingFee, setServerShippingFee] = useState<number | null>(null);
  const [serverCartId, setServerCartId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string>("");

  // Initialize guest token on client
  useEffect(() => {
    setGuestToken(getClientGuestToken());
  }, []);

  // Helper to map API cart items to CartItem format
  const mapApiCartToState = useCallback((apiCart: any) => {
    if (!apiCart) return;

    if (apiCart.id) {
      setServerCartId(apiCart.id);
    }

    if (!Array.isArray(apiCart.items) || apiCart.items.length === 0) {
      setCart([]);
      setHasStockIssue(false);
      setServerShippingFee(0);
      try {
        localStorage.removeItem("rasa_guest_cart");
      } catch {}
      return;
    }

    const mapped: CartItem[] = apiCart.items.map((item: any) => {
      // Find matching mock product or build fallback from database payload
      const matched = PRODUCTS.find(
        (p) => p.id === item.productId || p.slug === item.slug || p.name === item.name
      );

      const product: Product = matched || {
        id: item.productId,
        slug: item.slug || "saree-detail",
        name: item.name,
        category: "Sarees",
        tag: "Handcrafted Heritage",
        price: item.unitPrice,
        rating: 5.0,
        reviewCount: 12,
        images: [item.image || "/products/placeholder.webp"],
        description: "Handcrafted silk saree from master weavers.",
        material: "Pure Handloom Silk",
        size: item.selectedSize || "Free size",
        availability: item.isOutOfStock ? "Low Stock" : "In Stock",
        detailsList: ["Pure natural dyes", "Certified craftmark"],
        makerNote: "Handcrafted with devotion by heritage master weavers.",
        shippingNote: "Dispatches within 24-48 hours in insured keepsake boxes.",
      };

      return {
        id: item.id,
        variantId: item.variantId,
        product,
        quantity: item.quantity,
        selectedSize: item.selectedSize || "Free size",
        isAvailable: item.isAvailable ?? true,
        isOutOfStock: item.isOutOfStock ?? false,
        stockWarning: item.stockWarning || null,
      };
    });

    setCart(mapped);
    setHasStockIssue(!!apiCart.hasStockIssue);
    setServerShippingFee(apiCart.shippingFee ?? null);

    // Persist to local browser storage
    try {
      localStorage.setItem("rasa_guest_cart", JSON.stringify(mapped));
    } catch {}
  }, []);

  // Fetch live cart and wishlist on initial load, restoring local guest cart if needed
  const refreshCart = useCallback(async () => {
    try {
      const headers = getCartAuthHeaders();
      const res = await fetch("/api/v1/cart", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          const serverItems = data.data.items || [];
          if (serverItems.length > 0) {
            mapApiCartToState(data.data);
          } else {
            // Check if local guest storage has items that need to be synced to server
            try {
              const saved = localStorage.getItem("rasa_guest_cart");
              if (saved) {
                const localItems = JSON.parse(saved);
                if (Array.isArray(localItems) && localItems.length > 0) {
                  // Synchronize local items to server
                  for (const item of localItems) {
                    await fetch("/api/v1/cart", {
                      method: "POST",
                      headers: getCartAuthHeaders(),
                      body: JSON.stringify({
                        productId: item.product?.id || item.productId,
                        quantity: item.quantity || 1,
                        selectedSize: item.selectedSize || "Free size",
                      }),
                    });
                  }
                  // Re-fetch now that server has items
                  const reRes = await fetch("/api/v1/cart", { headers: getCartAuthHeaders() });
                  if (reRes.ok) {
                    const reData = await reRes.json();
                    if (reData.data) {
                      mapApiCartToState(reData.data);
                      return;
                    }
                  }
                }
              }
            } catch {}
            setCart([]);
            setHasStockIssue(false);
            setServerShippingFee(0);
          }
        }
      }
    } catch {
      // Offline or network error: retain local state
    }
  }, [mapApiCartToState]);

  const refreshWishlist = useCallback(async () => {
    try {
      const headers = getCartAuthHeaders();
      const res = await fetch("/api/v1/wishlist", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data.items)) {
          setWishlist(data.data.items.map((i: any) => i.productId));
        }
      }
    } catch {
      // Retain local state
    }
  }, []);

  // Initial immediate hydration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rasa_guest_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch {}

    refreshCart();
    refreshWishlist();
  }, [refreshCart, refreshWishlist]);

  // Keep localStorage updated whenever cart changes
  useEffect(() => {
    if (cart.length > 0) {
      try {
        localStorage.setItem("rasa_guest_cart", JSON.stringify(cart));
      } catch {}
    }
  }, [cart]);

  // Authoritative calculations
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Subtotal only includes purchasable items
  const subtotal = cart.reduce((acc, item) => {
    if (item.isOutOfStock) return acc;
    return acc + item.product.price * item.quantity;
  }, 0);

  // Standard shipping rule: Free if subtotal >= ₹2,000 or if coupon provides free shipping, else ₹150
  const isFreeDelivery =
    subtotal >= 2000 || subtotal === 0 || appliedCoupon?.freeShipping;

  const shippingFee =
    serverShippingFee !== null
      ? appliedCoupon?.freeShipping
        ? 0
        : serverShippingFee
      : isFreeDelivery
      ? 0
      : 150;

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  // Cart operations
  const addToCart = async (
    product: Product,
    quantity: number = 1,
    size: string = "Free size"
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/cart", {
        method: "POST",
        headers: getCartAuthHeaders(),
        body: JSON.stringify({
          productId: product.id,
          quantity,
          selectedSize: size,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          mapApiCartToState(data.data);
          return;
        }
      }
    } catch {
      // Fallback local update
    } finally {
      setIsLoading(false);
    }

    // Local state fallback if API call fails
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      let updated: CartItem[];
      if (existingIndex > -1) {
        updated = [...prev];
        updated[existingIndex].quantity += quantity;
      } else {
        updated = [
          ...prev,
          {
            id: `cart-${Date.now()}`,
            product,
            quantity,
            selectedSize: size,
            isAvailable: true,
            isOutOfStock: false,
          },
        ];
      }
      try {
        localStorage.setItem("rasa_guest_cart", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateQuantity = async (id: string, delta: number) => {
    const targetItem = cart.find((i) => i.id === id);
    if (!targetItem) return;

    const newQty = targetItem.quantity + delta;

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/cart", {
        method: "PATCH",
        headers: getCartAuthHeaders(),
        body: JSON.stringify({
          itemId: id,
          quantity: newQty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          mapApiCartToState(data.data);
          return;
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }

    // Local fallback
    setCart((prev) => {
      const updated = prev
        .map((item) => {
          if (item.id === id) {
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      try {
        localStorage.setItem("rasa_guest_cart", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeFromCart = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/cart?itemId=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: getCartAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          mapApiCartToState(data.data);
          return;
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }

    setCart((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem("rasa_guest_cart", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/v1/cart", {
        method: "DELETE",
        headers: getCartAuthHeaders(),
      });
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
    setCart([]);
    setAppliedCoupon(null);
    try {
      localStorage.removeItem("rasa_guest_cart");
    } catch {}
  };

  // Coupon operations
  const applyCoupon = async (code: string) => {
    setCouponError(null);
    try {
      const res = await fetch("/api/v1/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          cartSubtotalMinorUnits: Math.round(subtotal * 100),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMessage = data.error?.message || "Invalid or ineligible coupon.";
        setCouponError(errMessage);
        return { success: false, message: errMessage };
      }

      setAppliedCoupon({
        code: data.data.code,
        discountType: data.data.discountType,
        discountAmount: data.data.discountAmountRupees,
        freeShipping: data.data.freeShipping,
        message: data.data.message,
      });

      return { success: true, message: data.data.message };
    } catch (err: any) {
      const msg = err.message || "Failed to validate coupon. Please try again.";
      setCouponError(msg);
      return { success: false, message: msg };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Wishlist operations
  const toggleWishlist = async (productId: string) => {
    try {
      const res = await fetch("/api/v1/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && typeof data.data.inWishlist === "boolean") {
          setWishlist((prev) =>
            data.data.inWishlist
              ? [...prev.filter((id) => id !== productId), productId]
              : prev.filter((id) => id !== productId)
          );
          return;
        }
      }
    } catch {
      // Fallback
    }

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
        discountAmount,
        total,
        appliedCoupon,
        couponError,
        applyCoupon,
        removeCoupon,
        hasStockIssue,
        isLoading,
        wishlist,
        toggleWishlist,
        isInWishlist,
        refreshCart,
        guestToken,
        serverCartId,
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
