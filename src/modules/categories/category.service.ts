import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/api/errors";
import { CategoryInput, UpdateCategoryInput } from "./category.schema";

export class CategoryService {
  /**
   * List categories, optionally filtering by active state or root categories
   */
  async listCategories(includeInactive = false) {
    return await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { products: true } },
      },
    });
  }

  /**
   * Get category hierarchy tree (roots with nested children)
   */
  async getCategoryTree(includeInactive = false) {
    return await prisma.category.findMany({
      where: {
        parentId: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            children: {
              where: includeInactive ? {} : { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  /**
   * Fetch category by unique slug or ID
   */
  async getCategoryBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: { where: { isActive: true } },
        products: {
          where: { status: "ACTIVE" },
          take: 24,
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!category) {
      throw new NotFoundError("Category");
    }

    return category;
  }

  /**
   * Create new category
   */
  async createCategory(input: CategoryInput) {
    // 1. Ensure slug uniqueness
    const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new ConflictError(`Category with slug "${input.slug}" already exists.`);
    }

    // 2. Validate parent if provided
    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) {
        throw new NotFoundError("Parent Category");
      }
    }

    return await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        imageKey: input.imageKey || null,
        parentId: input.parentId || null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
      include: { parent: true },
    });
  }

  /**
   * Update category
   */
  async updateCategory(id: string, input: UpdateCategoryInput) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError("Category");
    }

    if (input.slug && input.slug !== category.slug) {
      const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
      if (existing) {
        throw new ConflictError(`Category with slug "${input.slug}" already exists.`);
      }
    }

    if (input.parentId) {
      if (input.parentId === id) {
        throw new BadRequestError("A category cannot be its own parent.");
      }
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) {
        throw new NotFoundError("Parent Category");
      }
    }

    return await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.imageKey !== undefined ? { imageKey: input.imageKey } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      include: { parent: true, children: true },
    });
  }

  /**
   * Delete category (sets product categoryId to null via relation)
   */
  async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { children: true, _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundError("Category");
    }

    if (category.children.length > 0) {
      throw new BadRequestError(
        `Cannot delete category "${category.name}" because it has ${category.children.length} subcategories. Please reassign or delete children first.`
      );
    }

    await prisma.category.delete({ where: { id } });
    return { success: true, message: `Category "${category.name}" removed successfully.` };
  }
}

export const categoryService = new CategoryService();
