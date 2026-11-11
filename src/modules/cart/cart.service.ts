import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { AddToCartInput, UpdateCartItemInput } from "./cart.schema";
import { ProductStatus } from "@prisma/client";

const FREE_SHIPPING_THRESHOLD_MINOR_UNITS = 200000; // ₹2,000.00 in paise
const DEFAULT_SHIPPING_FEE_MINOR_UNITS = 15000;     // ₹150.00 in paise

export class CartService {
  /**
   * Find an existing cart without creating one (avoids passive database writes on read requests)
   */
  async getCart(userId?: string, guestToken?: string) {
    if (!userId && !guestToken) {
      return null;
    }

    const cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { guestToken },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return null;
    }

    return this.calculateCartSummary(cart);
  }

  /**
   * Returns empty cart payload matching storefront shape without hitting database
   */
  getEmptyCart() {
    return {
      id: null,
      items: [],
      subtotalRupees: 0,
      subtotalMinorUnits: 0,
      shippingFeeRupees: 0,
      shippingFeeMinorUnits: 0,
      totalRupees: 0,
      totalMinorUnits: 0,
      itemCount: 0,
      freeShippingThresholdRemainingRupees: FREE_SHIPPING_THRESHOLD_MINOR_UNITS / 100,
      isFreeShippingEligible: false,
    };
  }

  /**
   * Find or initialize a cart for an authenticated user or guest token
   */
  async getOrCreateCart(userId?: string, guestToken?: string) {
    if (!userId && !guestToken) {
      throw new ValidationError("Either userId or guestToken is required to access cart.");
    }

    let cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { guestToken },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId || undefined,
          guestToken: userId ? undefined : guestToken,
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: { orderBy: { sortOrder: "asc" } },
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return this.calculateCartSummary(cart);
  }

  /**
   * Add item to cart with duplicate prevention and stock validation
   */
  async addItem(input: AddToCartInput, userId?: string, guestToken?: string) {
    const effectiveGuestToken = userId ? undefined : (input.guestToken || guestToken);

    let variantId = input.variantId;
    let variant = null;

    if (variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
    } else if (input.productId) {
      variant = await prisma.productVariant.findFirst({
        where: {
          OR: [
            { productId: input.productId },
            { product: { slug: input.productId } },
          ],
          isActive: true,
        },
        include: { product: true },
      });
      if (variant) {
        variantId = variant.id;
      }
    }

    if (!variant || !variant.isActive || !variant.product || !variantId) {
      throw new NotFoundError("Product variant");
    }

    if (variant.product.status === ProductStatus.ARCHIVED) {
      throw new ValidationError(`"${variant.product.name}" is no longer available.`);
    }

    const quantity = input.quantity ?? 1;

    if (variant.stockQuantity < quantity) {
      throw new ValidationError(
        `Only ${variant.stockQuantity} item${variant.stockQuantity === 1 ? "" : "s"} available in stock.`
      );
    }

    const cart = await this.getOrCreateCart(userId, effectiveGuestToken);

    // Duplicate line prevention: check if this variant already exists in the cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (variant.stockQuantity < newQuantity) {
        throw new ValidationError(
          `Cannot add ${quantity} more. You already have ${existingItem.quantity} in cart, and total stock is ${variant.stockQuantity}.`
        );
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          selectedSize: input.selectedSize || existingItem.selectedSize,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity,
          selectedSize: input.selectedSize || "Free size",
        },
      });
    }

    return await this.getOrCreateCart(userId, effectiveGuestToken);
  }

  /**
   * Update item quantity in cart
   */
  async updateItemQuantity(
    itemId: string,
    input: UpdateCartItemInput,
    userId?: string,
    guestToken?: string
  ) {
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        variant: { include: { product: true } },
      },
    });

    if (!item) {
      throw new NotFoundError("Cart item");
    }

    // Verify ownership of the cart
    if (userId && item.cart.userId !== userId) {
      throw new ValidationError("Unauthorized cart modification.");
    }
    if (!userId && guestToken && item.cart.guestToken !== guestToken) {
      throw new ValidationError("Unauthorized cart modification.");
    }

    if (input.quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      if (item.variant.stockQuantity < input.quantity) {
        throw new ValidationError(
          `Only ${item.variant.stockQuantity} items available in stock.`
        );
      }
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: input.quantity },
      });
    }

    return await this.getOrCreateCart(userId, guestToken);
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string, userId?: string, guestToken?: string) {
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item) {
      return await this.getOrCreateCart(userId, guestToken);
    }

    // Verify ownership
    if (userId && item.cart.userId !== userId) {
      throw new ValidationError("Unauthorized cart modification.");
    }
    if (!userId && guestToken && item.cart.guestToken !== guestToken) {
      throw new ValidationError("Unauthorized cart modification.");
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    return await this.getOrCreateCart(userId, guestToken);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(userId?: string, guestToken?: string) {
    const cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { guestToken },
    });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return await this.getOrCreateCart(userId, guestToken);
  }

  /**
   * Safe guest cart merging upon user authentication (login/register)
   */
  async mergeGuestCart(guestToken: string, userId: string) {
    if (!guestToken || !userId) return;

    const guestCart = await prisma.cart.findFirst({
      where: { guestToken },
      include: { items: { include: { variant: true } } },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return await this.getOrCreateCart(userId);
    }

    // Find or create customer cart
    let userCart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: true },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    // Merge each guest item safely into user cart
    for (const guestItem of guestCart.items) {
      const existingUserItem = userCart.items.find(
        (ui) => ui.variantId === guestItem.variantId
      );

      const maxStock = guestItem.variant.stockQuantity;

      if (existingUserItem) {
        // Increment quantity, capping at max available stock
        const mergedQty = Math.min(
          maxStock,
          existingUserItem.quantity + guestItem.quantity
        );
        await prisma.cartItem.update({
          where: { id: existingUserItem.id },
          data: { quantity: mergedQty },
        });
      } else {
        // Transfer item into user cart with stock sanity check
        const initialQty = Math.min(maxStock, guestItem.quantity);
        if (initialQty > 0) {
          await prisma.cartItem.create({
            data: {
              cartId: userCart.id,
              variantId: guestItem.variantId,
              quantity: initialQty,
              selectedSize: guestItem.selectedSize || "Free size",
            },
          });
        }
      }
    }

    // Clean up guest cart and items
    await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
    await prisma.cart.delete({ where: { id: guestCart.id } });

    return await this.getOrCreateCart(userId);
  }

  /**
   * Authoritative calculation and formatting with price & stock revalidation
   */
  private calculateCartSummary(cart: {
    id: string;
    userId: string | null;
    guestToken: string | null;
    currency: string;
    items: Array<{
      id: string;
      quantity: number;
      selectedSize: string | null;
      variant: {
        id: string;
        isActive: boolean;
        stockQuantity: number;
        priceAdjustmentMinorUnits: number;
        product: {
          id: string;
          name: string;
          slug: string;
          status: ProductStatus;
          basePriceInMinorUnits: number;
          categoryId?: string | null;
          images: Array<{ url: string }>;
        };
      };
    }>;
  }) {
    let subtotalMinorUnits = 0;
    let itemCount = 0;
    let hasStockIssue = false;

    const formattedItems = cart.items.map((item) => {
      const isArchived = item.variant.product.status === ProductStatus.ARCHIVED;
      const isInactive = !item.variant.isActive || item.variant.product.status !== ProductStatus.ACTIVE;
      const isOutOfStock = item.variant.stockQuantity <= 0;
      const isQuantityExceeded = item.quantity > item.variant.stockQuantity;

      let stockWarning: string | null = null;
      if (isArchived) {
        stockWarning = "Product is no longer available.";
        hasStockIssue = true;
      } else if (isInactive) {
        stockWarning = "Product is currently inactive.";
        hasStockIssue = true;
      } else if (isOutOfStock) {
        stockWarning = "Out of stock.";
        hasStockIssue = true;
      } else if (isQuantityExceeded) {
        stockWarning = `Only ${item.variant.stockQuantity} available. Please reduce quantity.`;
        hasStockIssue = true;
      }

      const isPurchasable = !isArchived && !isInactive && !isOutOfStock;

      // Authoritative unit price from server
      const unitPriceMinorUnits =
        item.variant.product.basePriceInMinorUnits + item.variant.priceAdjustmentMinorUnits;
      const itemSubtotalMinorUnits = unitPriceMinorUnits * item.quantity;

      if (isPurchasable) {
        subtotalMinorUnits += itemSubtotalMinorUnits;
        itemCount += item.quantity;
      }

      return {
        id: item.id,
        variantId: item.variant.id,
        productId: item.variant.product.id,
        categoryId: item.variant.product.categoryId || null,
        name: item.variant.product.name,
        slug: item.variant.product.slug,
        image: item.variant.product.images[0]?.url || "/products/placeholder.webp",
        selectedSize: item.selectedSize || "Free size",
        quantity: item.quantity,
        unitPrice: unitPriceMinorUnits / 100,
        subtotal: itemSubtotalMinorUnits / 100,
        unitPriceMinorUnits,
        itemSubtotalMinorUnits,
        isPurchasable,
        isAvailable: !isArchived && !isInactive,
        isOutOfStock,
        availableStock: item.variant.stockQuantity,
        stockWarning,
      };
    });

    const isFreeShipping =
      subtotalMinorUnits >= FREE_SHIPPING_THRESHOLD_MINOR_UNITS || subtotalMinorUnits === 0;
    const shippingFeeMinorUnits = isFreeShipping ? 0 : DEFAULT_SHIPPING_FEE_MINOR_UNITS;
    const totalMinorUnits = subtotalMinorUnits + shippingFeeMinorUnits;

    return {
      id: cart.id,
      itemCount,
      items: formattedItems,
      subtotal: subtotalMinorUnits / 100,
      shippingFee: shippingFeeMinorUnits / 100,
      total: totalMinorUnits / 100,
      subtotalMinorUnits,
      shippingFeeMinorUnits,
      totalMinorUnits,
      currency: cart.currency,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD_MINOR_UNITS / 100,
      hasStockIssue,
    };
  }
}

export const cartService = new CartService();
