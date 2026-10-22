import { PrismaClient, UserRole, ProductStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import productsJson from "../src/data/products.json";
import corporatePackagesJson from "../src/data/corporate-packages.json";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting RASA Sampoorna Database Seed...");

  // 1. Create Default Admin User
  const adminEmail = "admin@rasasampoorna.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("RasaAdmin2026!Secure", 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "RASA Curator Admin",
        phone: "+91 9876543210",
        role: UserRole.SUPER_ADMIN,
        emailVerified: new Date(),
      },
    });
    console.log(`✅ Super Admin created: ${adminEmail}`);
  }

  // 2. Categories Seed
  const categoryNames = [
    { name: "Silk Sarees", slug: "silk", description: "Handcrafted pure mulberry and tussar silk sarees." },
    { name: "Cotton Sarees", slug: "cotton", description: "Breathable handwoven organic cotton drapes." },
    { name: "Linen Sarees", slug: "linen", description: "Crisp and luxurious natural linen sarees." },
    { name: "Banarasi", slug: "banarasi", description: "Timeless zari brocades woven by Varanasi master craftsmen." },
    { name: "Kanjivaram", slug: "kanjivaram", description: "Heavy temple borders and authentic gold zari." },
    { name: "Crochet", slug: "crochet", description: "Handcrafted accessories and forever floral bouquets." },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoryNames) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
    categoryMap.set(cat.slug, created.id);
    categoryMap.set(cat.name.toLowerCase(), created.id);
  }
  console.log(`✅ Categories seeded: ${categoryNames.length}`);

  // 3. Products Seed from products.json
  for (const p of productsJson) {
    const catSlug = p.category ? p.category.toLowerCase() : "silk";
    const categoryId = categoryMap.get(catSlug) || categoryMap.get("silk");

    const basePriceInMinorUnits = Math.round(p.price * 100);
    const originalPriceInMinorUnits = p.originalPrice ? Math.round(p.originalPrice * 100) : null;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        tag: p.tag,
        description: p.description,
        material: p.material,
        size: p.size || "Free size",
        availability: p.availability || "In Stock",
        detailsList: p.detailsList || [],
        makerNote: p.makerNote,
        shippingNote: p.shippingNote,
        basePriceInMinorUnits,
        originalPriceInMinorUnits,
        rating: p.rating || 5.0,
        reviewCount: p.reviewCount || 0,
        categoryId,
      },
      create: {
        slug: p.slug,
        name: p.name,
        tag: p.tag,
        description: p.description,
        material: p.material,
        size: p.size || "Free size",
        availability: p.availability || "In Stock",
        detailsList: p.detailsList || [],
        makerNote: p.makerNote,
        shippingNote: p.shippingNote,
        status: ProductStatus.ACTIVE,
        isFeatured: true,
        basePriceInMinorUnits,
        originalPriceInMinorUnits,
        currency: "INR",
        rating: p.rating || 5.0,
        reviewCount: p.reviewCount || 0,
        categoryId,
      },
    });

    // Seed product images
    if (p.images && p.images.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.createMany({
        data: p.images.map((imgUrl: string, idx: number) => ({
          productId: product.id,
          r2Key: imgUrl.replace(/^\//, ""),
          url: imgUrl,
          altText: `${p.name} view ${idx + 1}`,
          isPrimary: idx === 0,
          sortOrder: idx,
        })),
      });
    }

    // Seed default variant
    const sku = `SKU-${p.id.toUpperCase()}-STD`;
    await prisma.productVariant.upsert({
      where: { sku },
      update: { stockQuantity: 25 },
      create: {
        productId: product.id,
        sku,
        title: "Standard",
        size: p.size || "Free size",
        stockQuantity: 25,
        isActive: true,
      },
    });
  }
  console.log(`✅ Products seeded: ${productsJson.length}`);

  // 4. Corporate Packages as CMS Content
  await prisma.cmsContent.upsert({
    where: { slug: "corporate-packages" },
    update: { payload: JSON.stringify(corporatePackagesJson) },
    create: {
      slug: "corporate-packages",
      title: "Corporate Gifting Packages",
      section: "corporate",
      payload: JSON.stringify(corporatePackagesJson),
      isActive: true,
    },
  });
  console.log(`✅ Corporate packages CMS seeded`);

  console.log("🌟 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
