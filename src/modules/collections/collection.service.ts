import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ConflictError } from "@/lib/api/errors";
import { CollectionInput, UpdateCollectionInput } from "./collection.schema";

export class CollectionService {
  /**
   * List collections with product count
   */
  async listCollections(includeInactive = false, featuredOnly = false) {
    return await prisma.collection.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(featuredOnly ? { isFeatured: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  /**
   * Get single collection by slug with ordered products
   */
  async getCollectionBySlug(slug: string) {
    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" } },
                category: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundError("Collection");
    }

    return collection;
  }

  /**
   * Create new collection with optional initial products
   */
  async createCollection(input: CollectionInput) {
    const existing = await prisma.collection.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new ConflictError(`Collection with slug "${input.slug}" already exists.`);
    }

    return await prisma.$transaction(async (tx) => {
      const collection = await tx.collection.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description || null,
          bannerKey: input.bannerKey || null,
          isActive: input.isActive ?? true,
          isFeatured: input.isFeatured ?? false,
          sortOrder: input.sortOrder ?? 0,
        },
      });

      if (input.productIds && input.productIds.length > 0) {
        await tx.productCollection.createMany({
          data: input.productIds.map((productId, idx) => ({
            collectionId: collection.id,
            productId,
            sortOrder: idx,
          })),
        });
      }

      return collection;
    });
  }

  /**
   * Update collection details and associated product list
   */
  async updateCollection(id: string, input: UpdateCollectionInput) {
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) {
      throw new NotFoundError("Collection");
    }

    if (input.slug && input.slug !== collection.slug) {
      const existing = await prisma.collection.findUnique({ where: { slug: input.slug } });
      if (existing) {
        throw new ConflictError(`Collection with slug "${input.slug}" already exists.`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.collection.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.bannerKey !== undefined ? { bannerKey: input.bannerKey } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        },
      });

      if (input.productIds !== undefined) {
        // Reset associations and re-insert in ordered sequence
        await tx.productCollection.deleteMany({ where: { collectionId: id } });
        if (input.productIds.length > 0) {
          await tx.productCollection.createMany({
            data: input.productIds.map((productId, idx) => ({
              collectionId: id,
              productId,
              sortOrder: idx,
            })),
          });
        }
      }

      return updated;
    });
  }

  /**
   * Delete collection
   */
  async deleteCollection(id: string) {
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) {
      throw new NotFoundError("Collection");
    }

    await prisma.collection.delete({ where: { id } });
    return { success: true, message: `Collection "${collection.name}" removed successfully.` };
  }
}

export const collectionService = new CollectionService();
