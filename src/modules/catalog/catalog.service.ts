import { prisma } from "@/lib/db/prisma";
import {
  ProductFilterQuery,
  CreateProductInput,
  UpdateProductInput,
  BulkStatusUpdateInput,
  BulkPriceUpdateInput,
} from "./catalog.schema";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/api/errors";
import { ProductStatus, Prisma, InventoryMovementType } from "@prisma/client";

export class CatalogService {
  /**
   * Helper to format a product for storefront compatibility (converting paise -> rupees)
   */
  public formatProduct<
    T extends {
      id: string;
      slug: string;
      name: string;
      sku?: string | null;
      tag?: string | null;
      basePriceInMinorUnits: number;
      salePriceInMinorUnits?: number | null;
      originalPriceInMinorUnits?: number | null;
      material: string;
      fabric?: string | null;
      weave?: string | null;
      color?: string | null;
      occasion?: string | null;
      style?: string | null;
      origin?: string | null;
      size: string;
      availability: string;
      stockQuantity: number;
      lowStockThreshold: number;
      description: string;
      detailsList: string[];
      makerNote?: string | null;
      shippingNote?: string | null;
      rating: number;
      reviewCount: number;
      status: ProductStatus;
      isFeatured?: boolean;
      images?: { url: string; altText?: string | null; isPrimary?: boolean; sortOrder?: number }[];
      category?: { id: string; name: string; slug: string } | null;
      variants?: any[];
    }
  >(product: T) {
    const rawImages = product.images || [];
    const sortedImages = [...rawImages].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const imageUrls = sortedImages.map((img) => img.url);

    return {
      ...product,
      category: product.category?.name || "Sarees",
      price: (product.salePriceInMinorUnits || product.basePriceInMinorUnits) / 100,
      originalPrice: product.originalPriceInMinorUnits
        ? product.originalPriceInMinorUnits / 100
        : product.salePriceInMinorUnits
        ? product.basePriceInMinorUnits / 100
        : undefined,
      images: imageUrls.length > 0 ? imageUrls : ["/products/saree-lotus-main.jpg"],
      tag: product.tag || "Handcrafted",
      makerNote: product.makerNote || "",
      shippingNote: product.shippingNote || "",
    };
  }

  /**
   * Query catalog products with filters, sorting, search, and pagination
   */
  async getProducts(filters: ProductFilterQuery = { page: 1, limit: 20 }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: filters.status || ProductStatus.ACTIVE,
    };

    if (filters.category && filters.category !== "All") {
      where.OR = [
        { category: { slug: filters.category } },
        { category: { name: { equals: filters.category, mode: "insensitive" } } },
      ];
    }

    if (filters.collection) {
      where.collections = {
        some: { collection: { slug: filters.collection } },
      };
    }

    if (filters.material) {
      where.material = { contains: filters.material, mode: "insensitive" };
    }

    if (filters.fabric) {
      where.fabric = { contains: filters.fabric, mode: "insensitive" };
    }

    if (filters.occasion) {
      where.occasion = { contains: filters.occasion, mode: "insensitive" };
    }

    if (filters.color) {
      where.color = { contains: filters.color, mode: "insensitive" };
    }

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.basePriceInMinorUnits = {};
      if (filters.minPrice) where.basePriceInMinorUnits.gte = Math.round(filters.minPrice * 100);
      if (filters.maxPrice) where.basePriceInMinorUnits.lte = Math.round(filters.maxPrice * 100);
    }

    if (filters.search) {
      const searchTerms = filters.search.trim();
      where.OR = [
        { name: { contains: searchTerms, mode: "insensitive" } },
        { sku: { contains: searchTerms, mode: "insensitive" } },
        { description: { contains: searchTerms, mode: "insensitive" } },
        { material: { contains: searchTerms, mode: "insensitive" } },
        { fabric: { contains: searchTerms, mode: "insensitive" } },
        { color: { contains: searchTerms, mode: "insensitive" } },
        { occasion: { contains: searchTerms, mode: "insensitive" } },
        { category: { name: { contains: searchTerms, mode: "insensitive" } } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (filters.sortBy === "price-low") {
      orderBy.basePriceInMinorUnits = "asc";
    } else if (filters.sortBy === "price-high") {
      orderBy.basePriceInMinorUnits = "desc";
    } else if (filters.sortBy === "rating") {
      orderBy.rating = "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: "asc" } },
          variants: true,
        },
      }),
    ]);

    return {
      items: products.map((p) => this.formatProduct(p)),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Fetch single product by unique slug
   */
  async getProductBySlug(slug: string, requireActive = true) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
        collections: { include: { collection: true } },
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product || (requireActive && product.status !== ProductStatus.ACTIVE)) {
      throw new NotFoundError("Product");
    }

    return this.formatProduct(product);
  }

  /**
   * Fetch single product by unique ID
   */
  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
        collections: { include: { collection: true } },
      },
    });

    if (!product) {
      throw new NotFoundError("Product");
    }

    return product;
  }

  /**
   * Create a new product (admin)
   */
  async createProduct(input: CreateProductInput) {
    // 1. Ensure slug uniqueness
    const existingSlug = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (existingSlug) {
      throw new ConflictError(`Product with slug "${input.slug}" already exists.`);
    }

    // 2. Ensure SKU uniqueness
    if (input.sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
      if (existingSku) {
        throw new ConflictError(`Product with SKU "${input.sku}" already exists.`);
      }
    }

    const { images, variants, collectionIds, categoryId, customAttributes, ...productData } = input;

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          category: categoryId ? { connect: { id: categoryId } } : undefined,
          customAttributes: customAttributes ? (customAttributes as any) : undefined,
          images: {
            create: images ? images.map((img, idx) => ({
              r2Key: img.r2Key,
              url: img.url,
              altText: img.altText || null,
              isPrimary: img.isPrimary ?? idx === 0,
              sortOrder: img.sortOrder ?? idx,
            })) : [],
          },
          variants: {
            create:
              variants && variants.length > 0
                ? variants.map((v) => ({
                    sku: v.sku,
                    title: v.title || "Default",
                    color: v.color || null,
                    size: v.size || null,
                    priceAdjustmentMinorUnits: v.priceAdjustmentMinorUnits ?? 0,
                    stockQuantity: v.stockQuantity ?? productData.stockQuantity ?? 10,
                    lowStockThreshold: v.lowStockThreshold ?? productData.lowStockThreshold ?? 2,
                    isActive: v.isActive ?? true,
                  }))
                : [
                    {
                      sku: input.sku,
                      title: "Standard",
                      stockQuantity: productData.stockQuantity ?? 10,
                      lowStockThreshold: productData.lowStockThreshold ?? 2,
                      isActive: true,
                    },
                  ],
          },
        },
        include: {
          images: true,
          variants: true,
        },
      });

      // Link collections if specified
      if (collectionIds && collectionIds.length > 0) {
        await tx.productCollection.createMany({
          data: collectionIds.map((colId, idx) => ({
            productId: product.id,
            collectionId: colId,
            sortOrder: idx,
          })),
        });
      }

      // Record initial stock creation movement
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          quantityDelta: product.stockQuantity,
          previousStock: 0,
          newStock: product.stockQuantity,
          type: InventoryMovementType.RESTOCK,
          reason: "Initial catalog entry creation",
          reference: product.sku || "PRODUCT_INIT",
        },
      });

      return product;
    });
  }

  /**
   * Update an existing product (admin)
   */
  async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Product");
    }

    if (input.slug && input.slug !== existing.slug) {
      const conflict = await prisma.product.findUnique({ where: { slug: input.slug } });
      if (conflict) {
        throw new ConflictError(`Product with slug "${input.slug}" already exists.`);
      }
    }

    if (input.sku && input.sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({ where: { sku: input.sku } });
      if (conflict) {
        throw new ConflictError(`Product with SKU "${input.sku}" already exists.`);
      }
    }

    const { images, variants, collectionIds, categoryId, ...productData } = input;

    return await prisma.$transaction(async (tx) => {
      // Update core fields
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(productData as any),
          ...(categoryId !== undefined
            ? categoryId
              ? { category: { connect: { id: categoryId } } }
              : { category: { disconnect: true } }
            : {}),
        },
      });

      // Update images if provided
      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img, idx) => ({
              productId: id,
              r2Key: img.r2Key,
              url: img.url,
              altText: img.altText || null,
              isPrimary: img.isPrimary ?? idx === 0,
              sortOrder: img.sortOrder ?? idx,
            })),
          });
        }
      }

      // Update collection links if provided
      if (collectionIds !== undefined) {
        await tx.productCollection.deleteMany({ where: { productId: id } });
        if (collectionIds.length > 0) {
          await tx.productCollection.createMany({
            data: collectionIds.map((collectionId, idx) => ({
              productId: id,
              collectionId,
              sortOrder: idx,
            })),
          });
        }
      }

      return updated;
    });
  }

  /**
   * Update product status (e.g. DRAFT, ACTIVE, ARCHIVED, OUT_OF_STOCK)
   */
  async updateStatus(id: string, status: ProductStatus) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Product");

    return await prisma.product.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Delete product permanently
   */
  async deleteProduct(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Product");

    await prisma.product.delete({ where: { id } });
    return { success: true, message: `Product "${existing.name}" deleted successfully.` };
  }

  /**
   * Bulk status change
   */
  async bulkUpdateStatus(input: BulkStatusUpdateInput) {
    const result = await prisma.product.updateMany({
      where: { id: { in: input.productIds } },
      data: { status: input.status },
    });

    return {
      success: true,
      updatedCount: result.count,
      status: input.status,
    };
  }

  /**
   * Bulk price adjustment
   */
  async bulkUpdatePrices(input: BulkPriceUpdateInput) {
    return await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: input.productIds } },
      });

      let updatedCount = 0;
      for (const p of products) {
        let newPrice = p.basePriceInMinorUnits;
        if (input.adjustmentType === "percentage") {
          newPrice = Math.round(newPrice * (1 + input.adjustmentValue / 100));
        } else {
          newPrice = Math.round(newPrice + input.adjustmentValue);
        }

        if (newPrice > 0) {
          await tx.product.update({
            where: { id: p.id },
            data: { basePriceInMinorUnits: newPrice },
          });
          updatedCount++;
        }
      }

      return {
        success: true,
        updatedCount,
      };
    });
  }

  /**
   * Export catalog to CSV string
   */
  async exportCsv() {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    const headers = [
      "SKU",
      "Name",
      "Slug",
      "Category",
      "Price_INR",
      "Sale_Price_INR",
      "Stock_Quantity",
      "Material",
      "Fabric",
      "Color",
      "Occasion",
      "Status",
      "Images",
    ];

    const rows = products.map((p) => [
      `"${p.sku || ""}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.slug}"`,
      `"${p.category?.name || "Sarees"}"`,
      (p.basePriceInMinorUnits / 100).toFixed(2),
      p.salePriceInMinorUnits ? (p.salePriceInMinorUnits / 100).toFixed(2) : "",
      p.stockQuantity,
      `"${p.material || ""}"`,
      `"${p.fabric || ""}"`,
      `"${p.color || ""}"`,
      `"${p.occasion || ""}"`,
      p.status,
      `"${p.images.map((i) => i.url).join(";")}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  /**
   * Import catalog from CSV text
   */
  async importCsv(csvContent: string) {
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestError("CSV contains no rows to import.");
    }

    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const skuIdx = headers.indexOf("sku");
    const nameIdx = headers.indexOf("name");
    const slugIdx = headers.indexOf("slug");
    const priceIdx = headers.indexOf("price_inr");
    const stockIdx = headers.indexOf("stock_quantity");

    if (skuIdx === -1 || nameIdx === -1 || priceIdx === -1) {
      throw new BadRequestError("CSV must contain SKU, Name, and Price_INR headers.");
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV regex splitter matching quoted tokens
      const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((val) =>
        val.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
      ) || line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());

      const sku = cols[skuIdx];
      const name = cols[nameIdx];
      const priceStr = cols[priceIdx];
      const slug = (slugIdx !== -1 && cols[slugIdx]) ? cols[slugIdx] : name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const stock = stockIdx !== -1 && cols[stockIdx] ? parseInt(cols[stockIdx], 10) : 10;

      if (!sku || !name || !priceStr || isNaN(parseFloat(priceStr))) {
        errors.push(`Row ${i}: Missing valid SKU, Name, or Price.`);
        continue;
      }

      const priceMinorUnits = Math.round(parseFloat(priceStr) * 100);

      try {
        await prisma.product.upsert({
          where: { sku },
          update: {
            name,
            slug,
            basePriceInMinorUnits: priceMinorUnits,
            stockQuantity: isNaN(stock) ? 10 : stock,
          },
          create: {
            sku,
            name,
            slug,
            description: `Handcrafted luxury piece: ${name}`,
            material: "Pure Handloom Silk",
            basePriceInMinorUnits: priceMinorUnits,
            stockQuantity: isNaN(stock) ? 10 : stock,
            status: ProductStatus.ACTIVE,
          },
        });
        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${i} (${sku}): ${err.message}`);
      }
    }

    return {
      success: true,
      importedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export const catalogService = new CatalogService();
