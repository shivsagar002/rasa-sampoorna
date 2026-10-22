import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/api/errors";
import { ProductStatus } from "@prisma/client";

export class WishlistService {
  /**
   * Get or create a wishlist for an authenticated user or guest token
   */
  async getOrCreateWishlist(userId?: string, guestToken?: string) {
    if (!userId && !guestToken) {
      throw new ValidationError("userId or guestToken is required to access wishlist.");
    }

    let wishlist = await prisma.wishlist.findFirst({
      where: userId ? { userId } : { guestToken },
      include: {
        items: {
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
            },
          },
        },
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId: userId || undefined,
          guestToken: userId ? undefined : guestToken,
        },
        include: {
          items: {
            include: {
              product: {
                include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
              },
            },
          },
        },
      });
    }

    return {
      id: wishlist.id,
      itemCount: wishlist.items.length,
      items: wishlist.items.map((i) => {
        const isArchived = i.product.status === ProductStatus.ARCHIVED;
        const isOutOfStock = i.product.stockQuantity <= 0 || i.product.status === ProductStatus.OUT_OF_STOCK;

        return {
          id: i.id,
          productId: i.productId,
          name: i.product.name,
          slug: i.product.slug,
          price: i.product.basePriceInMinorUnits / 100,
          category: i.product.category?.name || "Sarees",
          image: i.product.images[0]?.url || "/products/placeholder.webp",
          isAvailable: !isArchived && i.product.status === ProductStatus.ACTIVE,
          isOutOfStock,
        };
      }),
    };
  }

  /**
   * Toggle item in wishlist (add if absent, remove if present)
   */
  async toggleItem(productId: string, userId?: string, guestToken?: string) {
    // Verify product exists and is not archived
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundError("Product");
    }

    const wishlist = await this.getOrCreateWishlist(userId, guestToken);

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { inWishlist: false, productId };
    } else {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });
      return { inWishlist: true, productId };
    }
  }

  /**
   * Add item explicitly to wishlist (idempotent, prevents duplicates)
   */
  async addItem(productId: string, userId?: string, guestToken?: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundError("Product");
    }

    const wishlist = await this.getOrCreateWishlist(userId, guestToken);

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (!existing) {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });
    }

    return await this.getOrCreateWishlist(userId, guestToken);
  }

  /**
   * Remove item explicitly from wishlist
   */
  async removeItem(productId: string, userId?: string, guestToken?: string) {
    const wishlist = await this.getOrCreateWishlist(userId, guestToken);

    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    return await this.getOrCreateWishlist(userId, guestToken);
  }

  /**
   * Safe guest wishlist merging upon login/register
   */
  async mergeGuestWishlist(guestToken: string, userId: string) {
    if (!guestToken || !userId) return;

    const guestWishlist = await prisma.wishlist.findFirst({
      where: { guestToken },
      include: { items: true },
    });

    if (!guestWishlist || guestWishlist.items.length === 0) {
      return await this.getOrCreateWishlist(userId);
    }

    let userWishlist = await prisma.wishlist.findFirst({
      where: { userId },
      include: { items: true },
    });

    if (!userWishlist) {
      userWishlist = await prisma.wishlist.create({
        data: { userId },
        include: { items: true },
      });
    }

    const userProductIds = new Set(userWishlist.items.map((i) => i.productId));

    for (const item of guestWishlist.items) {
      if (!userProductIds.has(item.productId)) {
        await prisma.wishlistItem.create({
          data: {
            wishlistId: userWishlist.id,
            productId: item.productId,
          },
        });
        userProductIds.add(item.productId);
      }
    }

    // Clean up guest wishlist
    await prisma.wishlistItem.deleteMany({ where: { wishlistId: guestWishlist.id } });
    await prisma.wishlist.delete({ where: { id: guestWishlist.id } });

    return await this.getOrCreateWishlist(userId);
  }
}

export const wishlistService = new WishlistService();
