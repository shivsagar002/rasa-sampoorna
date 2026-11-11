"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

function AdminTabSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading admin section"
      style={{
        minHeight: "220px",
        borderRadius: "12px",
        border: "1px solid var(--border-light, #e8dfd5)",
        background: "linear-gradient(90deg, #fff 25%, #f7f4ee 50%, #fff 75%)",
      }}
    />
  );
}

function ProductThumbnail({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src);
  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes="44px"
      onError={() => setImageSrc("/products/saree-lotus-main.jpg")}
      style={{ objectFit: "cover" }}
    />
  );
}

const AdminOrdersTab = dynamic(
  () => import("@/components/admin/admin-orders-tab").then((module) => module.AdminOrdersTab),
  { loading: AdminTabSkeleton }
);
const AdminAnalyticsTab = dynamic(
  () => import("@/components/admin/admin-analytics-tab").then((module) => module.AdminAnalyticsTab),
  { loading: AdminTabSkeleton }
);
const AdminCmsTab = dynamic(
  () => import("@/components/admin/admin-cms-tab").then((module) => module.AdminCmsTab),
  { loading: AdminTabSkeleton }
);
const AdminStaffTab = dynamic(
  () => import("@/components/admin/admin-staff-tab").then((module) => module.AdminStaffTab),
  { loading: AdminTabSkeleton }
);
const DirectImageUpload = dynamic(
  () => import("@/components/admin/direct-image-upload").then((module) => module.DirectImageUpload),
  { loading: AdminTabSkeleton }
);

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  category?: string;
  price: number;
  originalPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
  images: string[];
  fabric?: string;
  color?: string;
  material: string;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: { name: string } | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { products: number };
}

interface CatalogSummary {
  total: number;
  active: number;
  lowStock: number;
  drafts: number;
}

interface InventorySummary {
  totalStockUnits: number;
  reservedStock: number;
  lowStockProducts: number;
  inventoryValue: number | null;
}

interface MovementItem {
  id: string;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  type: string;
  reason: string;
  reference?: string | null;
  createdAt: string;
  product?: { name: string; sku?: string } | null;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    | "analytics"
    | "catalog"
    | "categories"
    | "inventory"
    | "orders"
    | "cms"
    | "operations"
    | "staff"
    | "audit"
    | "privacy"
  >("analytics");
  const [analyticsVisited, setAnalyticsVisited] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Authentication State
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [adminUser, setAdminUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Catalog State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [catalogSummary, setCatalogSummary] = useState<CatalogSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [catalogView, setCatalogView] = useState<"list" | "editor">("list");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Bulk actions
  const [showBulkModal, setShowBulkModal] = useState<"status" | "price" | null>(null);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string>("ACTIVE");
  const [bulkPriceType, setBulkPriceType] = useState<"percentage" | "fixed">("percentage");
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(5);

  // Categories State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    sortOrder: 0,
    isActive: true,
  });

  // Inventory & Movements
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [movementSearchInput, setMovementSearchInput] = useState("");
  const [movementStartDateInput, setMovementStartDateInput] = useState("");
  const [movementEndDateInput, setMovementEndDateInput] = useState("");
  const [movementFilters, setMovementFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
  });
  const [movementPage, setMovementPage] = useState(1);
  const [movementTotal, setMovementTotal] = useState(0);
  const [stockAdjustModal, setStockAdjustModal] = useState<{ productId: string; name: string } | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<string>("Restock consignment received");

  // Media Presigned Upload State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedResult, setUploadedResult] = useState<{ key: string; publicUrl: string } | null>(null);

  // Comprehensive Form State for Product Create / Edit (All Frontend Fields Included)
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    tag: "Handcrafted Heritage",
    categoryId: "",
    description: "",
    material: "Pure Handloom Silk",
    fabric: "Kanjivaram Silk",
    weave: "Zari brocade",
    color: "Crimson Red",
    occasion: "Festive & Bridal",
    style: "Royal Heritage",
    origin: "Kanchipuram, Tamil Nadu",
    size: "6.3 meters with blouse piece",
    availability: "In Stock",
    priceInRupees: 6500,
    originalPriceInRupees: "",
    salePriceInRupees: "",
    stockQuantity: 10,
    lowStockThreshold: 2,
    status: "ACTIVE",
    isFeatured: false,
    detailsListText: "100% pure silk certified with Silk Mark\nHandwoven by generational master artisans\nIncludes unstitched 80cm blouse fabric\nTraditional pure zari borders",
    makerNote: "Handcrafted with devotion by heritage master weavers.",
    shippingNote: "Dispatches within 24-48 hours in luxury rigid keepsake boxes.",
    imageUrl: "/products/saree-lotus-main.jpg",
    additionalImages: [] as string[],
    altText: "Handcrafted pure silk saree drape",
  });

  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const json = await res.json();
        const user = json.data;
        if (user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "STAFF")) {
          setAdminUser(user);
          setAuthStatus("authenticated");
          return true;
        }
      }
      setAdminUser(null);
      setAuthStatus("unauthenticated");
      return false;
    } catch {
      setAdminUser(null);
      setAuthStatus("unauthenticated");
      return false;
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Invalid credentials.");
      }
      const meRes = await fetch("/api/v1/auth/me");
      const meData = await meRes.json();
      const user = meData.data;
      if (user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "STAFF")) {
        setAdminUser(user);
        setAuthStatus("authenticated");
      } else {
        throw new Error("Access denied: Administrative privileges required.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Authentication failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAdminUser(null);
    setAuthStatus("unauthenticated");
  };

  const resetProductForm = () => {
    setForm({
      name: "",
      slug: "",
      sku: "",
      tag: "Handcrafted Heritage",
      categoryId: categories[0]?.id || "",
      description: "",
      material: "Pure Handloom Silk",
      fabric: "Kanjivaram Silk",
      weave: "Zari brocade",
      color: "Crimson Red",
      occasion: "Festive & Bridal",
      style: "Royal Heritage",
      origin: "Kanchipuram, Tamil Nadu",
      size: "6.3 meters with blouse piece",
      availability: "In Stock",
      priceInRupees: 6500,
      originalPriceInRupees: "",
      salePriceInRupees: "",
      stockQuantity: 10,
      lowStockThreshold: 2,
      status: "ACTIVE",
      isFeatured: false,
      detailsListText: "100% pure silk certified with Silk Mark\nHandwoven by generational master artisans\nIncludes unstitched 80cm blouse fabric\nTraditional pure zari borders",
      makerNote: "Handcrafted with devotion by heritage master weavers.",
      shippingNote: "Dispatches within 24-48 hours in luxury rigid keepsake boxes.",
      imageUrl: "/products/saree-lotus-main.jpg",
      additionalImages: [],
      altText: "Handcrafted pure silk saree drape",
    });
    setEditingProduct(null);
  };

  const startEditingProduct = (product: any) => {
    setEditingProduct(product);
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === (product.category || "").toLowerCase() || c.id === product.categoryId
    );
    const detailsArr = Array.isArray(product.detailsList) ? product.detailsList : [];
    const imagesArr = Array.isArray(product.images) ? product.images : [];
    const primaryImg = imagesArr[0] || product.image || "/products/saree-lotus-main.jpg";
    const extraImgs = imagesArr.slice(1);

    setForm({
      name: product.name || "",
      slug: product.slug || "",
      sku: product.sku || "",
      tag: product.tag || "Handcrafted Heritage",
      categoryId: matchedCategory ? matchedCategory.id : (product.categoryId || ""),
      description: product.description || "",
      material: product.material || "Pure Handloom Silk",
      fabric: product.fabric || "Kanjivaram Silk",
      weave: product.weave || "Zari brocade",
      color: product.color || "Crimson Red",
      occasion: product.occasion || "Festive & Bridal",
      style: product.style || "Royal Heritage",
      origin: product.origin || "Kanchipuram, Tamil Nadu",
      size: product.size || "6.3 meters with blouse piece",
      availability: product.availability || "In Stock",
      priceInRupees: product.price || 6500,
      originalPriceInRupees: product.originalPrice ? String(product.originalPrice) : "",
      salePriceInRupees: "",
      stockQuantity: product.stockQuantity ?? 10,
      lowStockThreshold: product.lowStockThreshold ?? 2,
      status: product.status || "ACTIVE",
      isFeatured: Boolean(product.isFeatured),
      detailsListText: detailsArr.length > 0 ? detailsArr.join("\n") : "100% pure silk certified with Silk Mark\nHandwoven by generational master artisans",
      makerNote: product.makerNote || "Handcrafted with devotion by heritage master weavers.",
      shippingNote: product.shippingNote || "Dispatches within 24-48 hours in luxury rigid keepsake boxes.",
      imageUrl: primaryImg,
      additionalImages: extraImgs,
      altText: product.name || "Handcrafted pure silk saree drape",
    });
    setCatalogView("editor");
  };

  const loadedDataScopes = useRef(new Set<string>());
  const loadData = useCallback(async (scope: "catalog" | "categories" | "inventory", refresh = false) => {
    if (!refresh && loadedDataScopes.current.has(scope)) return;
    setLoading(true);
    try {
      if (scope === "catalog") {
        const [productsResponse, categoriesResponse, summaryResponse] = await Promise.all([
          fetch("/api/v1/admin/products?limit=100"),
          fetch("/api/v1/admin/categories"),
          fetch("/api/v1/admin/products/summary"),
        ]);
        const [productsData, categoriesData, summaryData] = await Promise.all([
          productsResponse.json(),
          categoriesResponse.json(),
          summaryResponse.json(),
        ]);

        const failedResponse = [
          [productsResponse, productsData],
          [categoriesResponse, categoriesData],
          [summaryResponse, summaryData],
        ].find(([response]) => !(response as Response).ok);
        if (failedResponse) {
          const [, responseData] = failedResponse;
          throw new Error(
            (responseData as { error?: { message?: string } }).error?.message ||
              "Unable to load catalog data. Please try again."
          );
        }

        if (!Array.isArray(productsData.data) || !Array.isArray(categoriesData.data) || !summaryData.data) {
          throw new Error("The catalog API returned an unexpected response. Please refresh and try again.");
        }

        setProducts(productsData.data);
        setCategories(categoriesData.data);
        setCatalogSummary(summaryData.data);
      } else if (scope === "categories") {
        const response = await fetch("/api/v1/admin/categories");
        if (!response.ok) throw new Error("Unable to load categories. Please try again.");
        const data = await response.json();
        setCategories(data.data || []);
      } else {
        const params = new URLSearchParams({
          page: String(movementPage),
          limit: "25",
        });
        if (movementFilters.search.trim()) params.set("search", movementFilters.search.trim());
        if (movementFilters.startDate) params.set("startDate", movementFilters.startDate);
        if (movementFilters.endDate) params.set("endDate", movementFilters.endDate);
        const [movementsResponse, summaryResponse] = await Promise.all([
          fetch(`/api/v1/admin/inventory/movements?${params}`),
          fetch("/api/v1/admin/inventory/summary"),
        ]);
        if (!movementsResponse.ok || !summaryResponse.ok) {
          throw new Error("Unable to load inventory data. Please try again.");
        }
        const [movementsData, summaryData] = await Promise.all([
          movementsResponse.json(),
          summaryResponse.json(),
        ]);
        setMovements(movementsData.data?.items || []);
        setMovementTotal(movementsData.data?.pagination?.total || 0);
        setInventorySummary(summaryData.data);
      }
      loadedDataScopes.current.add(scope);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Unable to load admin data.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [movementFilters, movementPage]);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      if (activeTab === "catalog") loadData("catalog");
      else if (activeTab === "categories") loadData("categories");
      else if (activeTab === "inventory") loadData("inventory", true);
    }
  }, [authStatus, activeTab, loadData]);

  // Product Create & Update Handler
  const handleCreateOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const detailsList = form.detailsListText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const allImageUrls = [form.imageUrl, ...form.additionalImages].filter(Boolean);
    const imagesPayload = allImageUrls.map((url, idx) => ({
      r2Key: `products/${form.slug}-${idx === 0 ? "main" : `gallery-${idx}`}.jpg`,
      url,
      altText: `${form.name} drape view ${idx + 1}`,
      isPrimary: idx === 0,
      sortOrder: idx,
    }));

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      tag: form.tag?.trim() || "Handcrafted Heritage",
      categoryId: form.categoryId || undefined,
      description: form.description.trim() || `Exquisite handcrafted piece: ${form.name}`,
      material: form.material.trim(),
      fabric: form.fabric?.trim() || null,
      weave: form.weave?.trim() || null,
      color: form.color?.trim() || null,
      occasion: form.occasion?.trim() || null,
      style: form.style?.trim() || null,
      origin: form.origin?.trim() || null,
      size: form.size?.trim() || "Free size",
      availability: form.availability?.trim() || "In Stock",
      detailsList,
      makerNote: form.makerNote?.trim() || null,
      shippingNote: form.shippingNote?.trim() || null,
      basePriceInMinorUnits: Math.round(Number(form.priceInRupees) * 100),
      originalPriceInMinorUnits: form.originalPriceInRupees ? Math.round(Number(form.originalPriceInRupees) * 100) : undefined,
      salePriceInMinorUnits: form.salePriceInRupees ? Math.round(Number(form.salePriceInRupees) * 100) : undefined,
      stockQuantity: Number(form.stockQuantity) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 2,
      status: form.status,
      isFeatured: form.isFeatured,
      images: imagesPayload,
    };

    try {
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/v1/admin/products/${editingProduct.id}` : "/api/v1/admin/products";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save product.");
      }

      setMessage({
        text: isEdit ? `Product "${form.name}" updated successfully and published to storefront.` : `Product "${form.name}" created successfully and published to storefront.`,
        type: "success",
      });
      setCatalogView("list");
      setEditingProduct(null);
      await loadData("catalog", true);
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred while saving the product.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Category Handlers
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      parentId: "",
      sortOrder: 0,
      isActive: true,
    });
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: (cat as any).description || "",
      parentId: cat.parentId || "",
      sortOrder: cat.sortOrder || 0,
      isActive: cat.isActive,
    });
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const isEdit = !!editingCategory;
      const url = isEdit ? `/api/v1/admin/categories/${editingCategory.id}` : "/api/v1/admin/categories";
      const method = isEdit ? "PATCH" : "POST";

      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
        description: categoryForm.description.trim() || undefined,
        parentId: categoryForm.parentId || undefined,
        sortOrder: Number(categoryForm.sortOrder) || 0,
        isActive: categoryForm.isActive,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save category.");
      }

      setMessage({
        text: isEdit ? `Category "${categoryForm.name}" updated successfully.` : `Category "${categoryForm.name}" created successfully.`,
        type: "success",
      });
      setShowCategoryModal(false);
      setShowQuickCategoryModal(false);
      setEditingCategory(null);
      await Promise.all([loadData("categories", true), loadData("catalog", true)]);
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred while saving category.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!window.confirm(`Are you sure you want to delete or archive the category "${cat.name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to delete category.");
      setMessage({ text: `Category "${cat.name}" removed successfully.`, type: "success" });
      await Promise.all([loadData("categories", true), loadData("catalog", true)]);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategoryStatus = async (cat: CategoryItem) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to update category status.");
      setMessage({ text: `Category "${cat.name}" status changed to ${!cat.isActive ? "Active" : "Archived"}.`, type: "success" });
      await Promise.all([loadData("categories", true), loadData("catalog", true)]);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustModal) return;
    setLoading(true);

    try {
      const res = await fetch("/api/v1/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: stockAdjustModal.productId,
          quantityDelta: adjustDelta,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to adjust stock.");

      setMessage({ text: data.message || "Stock adjusted successfully.", type: "success" });
      setStockAdjustModal(null);
      await Promise.all([loadData("inventory", true), loadData("catalog", true)]);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedProductIds.length === 0) return;
    setLoading(true);

    try {
      const payload =
        showBulkModal === "status"
          ? { action: "status", productIds: selectedProductIds, status: bulkStatusTarget }
          : { action: "price", productIds: selectedProductIds, adjustmentType: bulkPriceType, adjustmentValue: bulkPriceValue };

      const res = await fetch("/api/v1/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Bulk action failed.");

      setMessage({ text: data.message || "Bulk operation completed.", type: "success" });
      setShowBulkModal(null);
      setSelectedProductIds([]);
      await loadData("catalog", true);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleMediaPresignAndUpload = async () => {
    if (!mediaFile) return;
    setUploadingMedia(true);
    setMessage(null);

    try {
      // 1. Request presigned upload URL
      const presignRes = await fetch("/api/v1/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: mediaFile.name,
          contentType: mediaFile.type,
          fileSizeBytes: mediaFile.size,
          folder: "products",
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignData.error?.message || "Could not generate presigned URL.");
      }

      const { uploadUrl, key, publicUrl } = presignData.data;

      // 2. Perform direct binary PUT upload
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mediaFile.type },
        body: mediaFile,
      });

      setUploadedResult({ key, publicUrl });
      setMessage({ text: "Image successfully uploaded to Cloudflare R2 storage.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Upload failed.", type: "error" });
    } finally {
      setUploadingMedia(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredCategories = categories.filter((category) => {
    if (categoryStatusFilter === "ACTIVE" && !category.isActive) return false;
    if (categoryStatusFilter === "ARCHIVED" && category.isActive) return false;
    const term = categorySearch.trim().toLowerCase();
    return !term || category.name.toLowerCase().includes(term) || category.slug.toLowerCase().includes(term);
  });

  const navTabs = [
    {
      id: "analytics",
      label: "Analytics & Overview",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: "orders",
      label: "Orders & Shipping",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      id: "catalog",
      label: "Product Catalog",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      id: "categories",
      label: "Categories",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: "inventory",
      label: "Stock & Inventory",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      id: "cms",
      label: "CMS & Store Settings",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      ),
    },
    // {
    //   id: "operations",
    //   label: "System Health & Ops",
    //   icon: (
    //     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
    //       <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    //     </svg>
    //   ),
    // },
    {
      id: "staff",
      label: "Staff & Permissions",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    // {
    //   id: "audit",
    //   label: "Audit Trail",
    //   icon: (
    //     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
    //       <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    //     </svg>
    //   ),
    // },
    // {
    //   id: "privacy",
    //   label: "Privacy & Compliance",
    //   icon: (
    //     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "17px", height: "17px" }}>
    //       <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    //       <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    //     </svg>
    //   ),
    // },
  ];

  if (authStatus === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-cream, #f7f4ee)",
          color: "var(--text-muted, #8c7d70)",
          fontSize: "14px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              border: "3px solid #e8dfd5",
              borderTopColor: "var(--btn-dark, #2e3830)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          Verifying administrative credentials...
        </div>
      </div>
    );
  }

  if (authStatus === "unauthenticated" || !adminUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-cream, #f7f4ee)",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            border: "1px solid var(--border-light, #e8dfd5)",
            boxShadow: "0 10px 30px rgba(44, 38, 33, 0.05)",
            padding: "36px 32px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "26px" }}>
            <span
              className="font-serif"
              style={{
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "var(--btn-dark, #2e3830)",
                display: "block",
              }}
            >
              RASA
            </span>
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--accent-gold, #8c7355)",
                fontWeight: 700,
                marginTop: "4px",
                display: "block",
              }}
            >
              Curator Admin Portal
            </span>
            <p style={{ fontSize: "13px", color: "var(--text-muted, #8c7d70)", marginTop: "8px" }}>
              Sign in with your administrative credentials.
            </p>
          </div>

          {loginError && (
            <div
              style={{
                padding: "10px 14px",
                backgroundColor: "#fdf2f2",
                border: "1px solid #f5c6cb",
                borderRadius: "8px",
                color: "#842029",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-primary, #2c2621)", marginBottom: "6px" }}>
                Admin Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@rasasampoorna.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "#faf8f5",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-primary, #2c2621)", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "#faf8f5",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                marginTop: "6px",
                padding: "11px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isLoggingIn ? "not-allowed" : "pointer",
                transition: "opacity 150ms",
                opacity: isLoggingIn ? 0.7 : 1,
              }}
            >
              {isLoggingIn ? "Signing In..." : "Sign In to Admin Portal"}
            </button>
          </form>

          <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid var(--border-light, #e8dfd5)", paddingTop: "18px" }}>
            <Link
              href="/"
              style={{
                fontSize: "12px",
                color: "var(--accent-gold, #8c7355)",
                textDecoration: "none",
              }}
            >
              ← Back to Boutique Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-shell" style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-cream, #f7f4ee)" }}>
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className="admin-dashboard-sidebar"
        style={{
          width: "250px",
          minWidth: "250px",
          backgroundColor: "#ffffff",
          borderRight: "1px solid var(--border-light, #e8dfd5)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 30,
        }}
      >
        {/* Brand */}
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid var(--border-light, #e8dfd5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="font-serif" style={{ fontSize: "19px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--btn-dark, #2e3830)" }}>
                RASA
              </span>
            </Link>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "2px 7px",
                borderRadius: "9999px",
                backgroundColor: "var(--accent-gold, #8c7355)",
                color: "#fff",
              }}
            >
              Admin
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--text-muted, #8c7d70)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Curator Portal
          </p>
        </div>

        {/* User Pill */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-light, #e8dfd5)", display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "var(--btn-dark, #2e3830)",
              color: "#f7f4ee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary, #2c2621)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {adminUser?.name || "Administrator"}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted, #8c7d70)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {adminUser?.email}
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="admin-dashboard-nav" style={{ flex: 1, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === "analytics") setAnalyticsVisited(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isActive ? "var(--bg-cream, #f7f4ee)" : "transparent",
                  color: isActive ? "var(--btn-dark, #2e3830)" : "var(--text-muted, #6b5e52)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "12px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  width: "100%",
                }}
              >
                <span style={{ color: isActive ? "var(--accent-gold, #8c7355)" : "inherit", display: "flex", alignItems: "center" }}>
                  {tab.icon}
                </span>
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-light, #e8dfd5)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <Link
            href="/"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border-light, #e8dfd5)",
              backgroundColor: "#fff",
              color: "var(--text-primary, #2c2621)",
              fontSize: "11px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <span>Visit Boutique</span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>↗</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#fdf2f2",
              color: "#991b1b",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT PANE */}
      <main className="admin-dashboard-main" style={{ flex: 1, minWidth: 0, padding: "24px 30px 80px", overflowY: "auto" }}>
        {/* Minimalist Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "22px" }}>
          <div>
            <h1 className="font-serif" style={{ fontSize: "24px", color: "var(--text-primary, #2c2621)", margin: 0, fontWeight: 600 }}>
              {navTabs.find((t) => t.id === activeTab)?.label || "Administration"}
            </h1>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {activeTab === "catalog" && (
              <>
                {catalogView === "editor" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCatalogView("list")}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid var(--border-light, #e8dfd5)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        backgroundColor: "#fff",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      ← Back to Products List
                    </button>
                    {editingProduct && (
                      <Link
                        href={`/shop/${form.slug}`}
                        target="_blank"
                        style={{
                          padding: "6px 12px",
                          border: "1px solid var(--border-light, #e8dfd5)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          backgroundColor: "#fff",
                          color: "var(--text-primary)",
                          textDecoration: "none",
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>View on Store</span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>↗</span>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <a
                      href="/api/v1/admin/products/csv"
                      download="rasa-products.csv"
                      style={{
                        padding: "6px 12px",
                        border: "1px solid var(--border-light, #e8dfd5)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        backgroundColor: "#fff",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      Export CSV
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        resetProductForm();
                        setCatalogView("editor");
                      }}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "var(--btn-dark, #2e3830)",
                        color: "#f7f4ee",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      + Add Product
                    </button>
                  </>
                )}
              </>
            )}

            {activeTab === "categories" && (
              <button
                type="button"
                onClick={handleOpenCreateCategory}
                style={{
                  padding: "6px 14px",
                  backgroundColor: "var(--btn-dark, #2e3830)",
                  color: "#f7f4ee",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                + New Category
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "13px",
              backgroundColor: message.type === "success" ? "#f0f7f2" : "#fdf2f2",
              border: `1px solid ${message.type === "success" ? "#b8deca" : "#f5c6cb"}`,
              color: message.type === "success" ? "#205a3c" : "#842029",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "inherit" }}>
              ×
            </button>
          </div>
        )}

        {/* TAB 1: PRODUCT CATALOG */}
        {activeTab === "catalog" && catalogView === "editor" && (
          <section style={{ maxWidth: "1080px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <button
                  type="button"
                  onClick={() => setCatalogView("list")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "12px",
                    color: "var(--accent-terracotta, #802a2a)",
                    cursor: "pointer",
                    marginBottom: "6px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  ← Back to Product Catalog
                </button>
                <h2 className="font-serif" style={{ fontSize: "24px", color: "var(--text-primary)", margin: 0, fontWeight: 600 }}>
                  {editingProduct ? `Edit Product: ${form.name}` : "Create New Saree / Artisan Product"}
                </h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  All attributes entered here are immediately synced with the database and displayed on the storefront.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setCatalogView("list")}
                  style={{
                    padding: "9px 18px",
                    border: "1px solid var(--border-light, #e8dfd5)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateOrUpdateProduct as any}
                  disabled={loading}
                  style={{
                    padding: "9px 24px",
                    backgroundColor: "var(--btn-dark, #2e3830)",
                    color: "#f7f4ee",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Saving..." : editingProduct ? "Save & Publish Changes" : "Publish to Storefront"}
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateOrUpdateProduct} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* CARD 1: GENERAL INFORMATION */}
              <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid var(--border-light, #e8dfd5)", padding: "26px" }}>
                <h3 className="font-serif" style={{ fontSize: "17px", margin: "0 0 16px", color: "var(--text-primary)", borderBottom: "1px solid #f2ede5", paddingBottom: "10px" }}>
                  1. Identification & Category Classification
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Swarna Kamal Kanjivaram Pure Silk Saree"
                      value={form.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          name,
                          slug: !editingProduct ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : prev.slug,
                        }));
                      }}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>URL Slug *</label>
                    <input
                      type="text"
                      required
                      placeholder="swarna-kamal-kanjivaram-saree"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px", fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>SKU Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RS-KANJI-042"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px", fontFamily: "monospace" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                      <label style={{ fontSize: "12px", fontWeight: 600 }}>Category *</label>
                      <button
                        type="button"
                        onClick={() => setShowQuickCategoryModal(true)}
                        style={{ background: "none", border: "none", color: "var(--accent-terracotta, #802a2a)", fontSize: "11px", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
                      >
                        + New Category
                      </button>
                    </div>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px", backgroundColor: "#fff" }}
                    >
                      <option value="">Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.parent?.name ? `(${c.parent.name})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Artisan Badge / Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. Pure Kanjivaram Silk, GI Tagged"
                      value={form.tag}
                      onChange={(e) => setForm({ ...form, tag: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Publication Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px", backgroundColor: "#fff" }}
                    >
                      <option value="ACTIVE">ACTIVE (Published on Storefront)</option>
                      <option value="DRAFT">DRAFT (Hidden from Storefront)</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                      <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "24px" }}>
                    <input
                      type="checkbox"
                      id="isFeaturedProduct"
                      checked={form.isFeatured}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <label htmlFor="isFeaturedProduct" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                      Feature this product on homepage curation
                    </label>
                  </div>
                </div>
              </div>

              {/* CARD 2: PRICING & INVENTORY */}
              <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid var(--border-light, #e8dfd5)", padding: "26px" }}>
                <h3 className="font-serif" style={{ fontSize: "17px", margin: "0 0 16px", color: "var(--text-primary)", borderBottom: "1px solid #f2ede5", paddingBottom: "10px" }}>
                  2. Pricing & Warehouse Inventory
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Selling Price (₹ INR) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.priceInRupees}
                      onChange={(e) => setForm({ ...form, priceInRupees: Number(e.target.value) })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Original / MRP Price (₹ Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 8500"
                      value={form.originalPriceInRupees}
                      onChange={(e) => setForm({ ...form, originalPriceInRupees: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Stock Quantity (Units)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.stockQuantity}
                      onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      min={1}
                      value={form.lowStockThreshold}
                      onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: TEXTILE & CRAFT SPECIFICATIONS */}
              <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid var(--border-light, #e8dfd5)", padding: "26px" }}>
                <h3 className="font-serif" style={{ fontSize: "17px", margin: "0 0 16px", color: "var(--text-primary)", borderBottom: "1px solid #f2ede5", paddingBottom: "10px" }}>
                  3. Textile & Craftsmanship Specifications (Frontend Product Details)
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Base Material *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pure Handloom Silk"
                      value={form.material}
                      onChange={(e) => setForm({ ...form, material: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Fabric Variety</label>
                    <input
                      type="text"
                      placeholder="e.g. Kanjivaram Silk, Banarasi Georgette"
                      value={form.fabric}
                      onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Weave Technique</label>
                    <input
                      type="text"
                      placeholder="e.g. Korvai Weave, Zari Brocade"
                      value={form.weave}
                      onChange={(e) => setForm({ ...form, weave: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Color Palette</label>
                    <input
                      type="text"
                      placeholder="e.g. Crimson Red, Peacock Blue"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Occasion</label>
                    <input
                      type="text"
                      placeholder="e.g. Bridal & Wedding, Festive Celebrations"
                      value={form.occasion}
                      onChange={(e) => setForm({ ...form, occasion: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Design Style</label>
                    <input
                      type="text"
                      placeholder="e.g. Royal Heritage, Timeless Classic"
                      value={form.style}
                      onChange={(e) => setForm({ ...form, style: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Artisan Origin</label>
                    <input
                      type="text"
                      placeholder="e.g. Kanchipuram, Tamil Nadu"
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Saree Dimensions / Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 6.3 meters with unstitched blouse piece"
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Availability Badge</label>
                    <input
                      type="text"
                      placeholder="e.g. In Stock, Ready to Ship, Limited Batch"
                      value={form.availability}
                      onChange={(e) => setForm({ ...form, availability: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 4: EDITORIAL STORYTELLING & NOTES */}
              <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid var(--border-light, #e8dfd5)", padding: "26px" }}>
                <h3 className="font-serif" style={{ fontSize: "17px", margin: "0 0 16px", color: "var(--text-primary)", borderBottom: "1px solid #f2ede5", paddingBottom: "10px" }}>
                  4. Editorial Narrative & Artisan Keepsake Notes
                </h3>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Artisan Narrative & Description *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the weaving heritage, motifs, drape feeling, and cultural significance of this creation..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px", lineHeight: "1.5" }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>
                    Craftsmanship Highlights (One Bullet Point per line)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="100% pure silk certified with Silk Mark&#10;Handwoven by generational master artisans&#10;Pure metallic gold zari border and pallu&#10;Includes unstitched 80cm blouse fabric"
                    value={form.detailsListText}
                    onChange={(e) => setForm({ ...form, detailsListText: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px", lineHeight: "1.5" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Maker&apos;s Dedication Note</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Handcrafted with devotion by heritage master weavers in Varanasi."
                      value={form.makerNote}
                      onChange={(e) => setForm({ ...form, makerNote: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>Shipping & Keepsake Box Note</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Dispatches within 24-48 hours in luxury rigid keepsake boxes with scented muslin wrap."
                      value={form.shippingNote}
                      onChange={(e) => setForm({ ...form, shippingNote: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 5: PRODUCT IMAGERY (DIRECT UPLOAD ONLY) */}
              <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid var(--border-light, #e8dfd5)", padding: "26px" }}>
                <h3 className="font-serif" style={{ fontSize: "17px", margin: "0 0 8px", color: "var(--text-primary)" }}>
                  5. Product Imagery (Direct File Uploads)
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 16px" }}>
                  Select image files directly from your computer. No URLs or external links required.
                </p>

                <div style={{ marginBottom: "20px" }}>
                  <DirectImageUpload
                    value={form.imageUrl}
                    onChange={(url) => setForm({ ...form, imageUrl: url })}
                    label="Primary Showcase Image (Cover)"
                    folder="products"
                    height="140px"
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600 }}>Additional Gallery Images (Up to 3)</span>
                    {form.additionalImages.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, additionalImages: [...form.additionalImages, ""] })}
                        style={{ background: "none", border: "none", color: "var(--accent-terracotta, #802a2a)", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                      >
                        + Add Another Image Slot
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                    {form.additionalImages.map((imgUrl, idx) => (
                      <div key={idx} style={{ position: "relative" }}>
                        <DirectImageUpload
                          value={imgUrl}
                          onChange={(newUrl) => {
                            const copy = [...form.additionalImages];
                            copy[idx] = newUrl;
                            setForm({ ...form, additionalImages: copy });
                          }}
                          label={`Gallery View ${idx + 1}`}
                          folder="products"
                          height="100px"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = form.additionalImages.filter((_, i) => i !== idx);
                            setForm({ ...form, additionalImages: copy });
                          }}
                          style={{
                            marginTop: "4px",
                            background: "none",
                            border: "none",
                            color: "#b91c1c",
                            fontSize: "11px",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Remove image
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* STICKY BOTTOM SAVE BAR */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  padding: "16px 26px",
                  borderRadius: "14px",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setCatalogView("list")}
                  style={{
                    padding: "10px 20px",
                    border: "1px solid var(--border-light, #e8dfd5)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel & Back to List
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "10px 28px",
                    backgroundColor: "var(--btn-dark, #2e3830)",
                    color: "#f7f4ee",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Saving..." : editingProduct ? "Save & Publish Changes" : "Publish Saree to Boutique"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 1: PRODUCT CATALOG - LIST VIEW */}
        {activeTab === "catalog" && catalogView === "list" && (
          <section>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", marginBottom: "18px" }}>
              {[
                { label: "Total Products", value: catalogSummary?.total, color: "var(--text-primary)" },
                { label: "Active", value: catalogSummary?.active, color: "#15803d" },
                { label: "Low Stock", value: catalogSummary?.lowStock, color: "#b45309" },
                { label: "Drafts", value: catalogSummary?.drafts, color: "var(--text-secondary)" },
              ].map((card) => (
                <div key={card.label} style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{card.label}</div>
                  <div style={{ fontSize: "24px", fontWeight: 600, color: card.color, marginTop: "5px" }}>{card.value ?? "—"}</div>
                </div>
              ))}
            </div>
            {/* Filter and Bulk Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                marginBottom: "20px",
                backgroundColor: "#fff",
                padding: "16px 20px",
                borderRadius: "12px",
                border: "1px solid var(--border-light, #e8dfd5)",
              }}
            >
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search by name, SKU, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    border: "1px solid var(--border-light, #e8dfd5)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    minWidth: "260px",
                    outline: "none",
                  }}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border-light, #e8dfd5)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    backgroundColor: "transparent",
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Published (Active)</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>

              {/* Bulk Controls */}
              {selectedProductIds.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{selectedProductIds.length} selected:</span>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal("status")}
                    style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border-light)", fontSize: "12px", backgroundColor: "#fff" }}
                  >
                    Change Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal("price")}
                    style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border-light)", fontSize: "12px", backgroundColor: "#fff" }}
                  >
                    Adjust Prices
                  </button>
                </div>
              )}
            </div>

            {/* Catalog Table */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid var(--border-light, #e8dfd5)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: "#faf8f5" }}>
                    <th style={{ padding: "12px 16px", width: "36px" }}>
                      <input
                        type="checkbox"
                        checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                        onChange={(e) => setSelectedProductIds(e.target.checked ? filteredProducts.map((p) => p.id) : [])}
                      />
                    </th>
                    <th style={{ padding: "12px 16px" }}>Product</th>
                    <th style={{ padding: "12px 16px" }}>SKU</th>
                    <th style={{ padding: "12px 16px" }}>Category</th>
                    <th style={{ padding: "12px 16px" }}>Price</th>
                    <th style={{ padding: "12px 16px" }}>Stock</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                        No products found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isSelected = selectedProductIds.includes(product.id);
                      const isLowStock = product.stockQuantity <= product.lowStockThreshold;

                      return (
                        <tr key={product.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedProductIds((prev) =>
                                  e.target.checked ? [...prev, product.id] : prev.filter((id) => id !== product.id)
                                )
                              }
                            />
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "44px", height: "44px", position: "relative", borderRadius: "6px", overflow: "hidden", backgroundColor: "#f2ece4" }}>
                                <ProductThumbnail
                                  key={product.images[0] || "fallback"}
                                  src={product.images[0] || "/products/saree-lotus-main.jpg"}
                                  alt={product.name}
                                />
                              </div>
                              <div>
                                <Link
                                  href={`/shop/${product.slug}`}
                                  target="_blank"
                                  style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                                >
                                  {product.name}
                                </Link>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  {product.fabric || product.material}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                            {product.sku || "N/A"}
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                            {product.category || "Sarees"}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                            ₹{product.price.toLocaleString("en-IN")}
                            {product.originalPrice && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "line-through", marginLeft: "6px" }}>
                                ₹{product.originalPrice.toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: isLowStock ? "#fdf2e9" : "#f0f7f2",
                                color: isLowStock ? "#b45309" : "#15803d",
                              }}
                            >
                              {product.stockQuantity} in stock
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "9999px",
                                fontSize: "11px",
                                fontWeight: 500,
                                backgroundColor:
                                  product.status === "ACTIVE"
                                    ? "rgba(34, 197, 94, 0.1)"
                                    : product.status === "DRAFT"
                                    ? "rgba(100, 116, 139, 0.1)"
                                    : "rgba(239, 68, 68, 0.1)",
                                color:
                                  product.status === "ACTIVE"
                                    ? "#15803d"
                                    : product.status === "DRAFT"
                                    ? "#475569"
                                    : "#b91c1c",
                              }}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setStockAdjustModal({ productId: product.id, name: product.name });
                                }}
                                style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
                              >
                                Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditingProduct(product)}
                                style={{
                                  background: "none",
                                  border: "1px solid var(--border-light)",
                                  borderRadius: "4px",
                                  padding: "4px 10px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  backgroundColor: "#fff",
                                }}
                              >
                                Edit Product
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: CATEGORIES & TAXONOMY */}
        {activeTab === "categories" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: "22px", color: "var(--text-primary)", margin: 0 }}>
                  Category Taxonomy & Collections
                </h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Manage product categories and parent hierarchies. Active categories appear in storefront filters.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input
                  type="search"
                  aria-label="Search categories"
                  placeholder="Search categories"
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  style={{ padding: "8px 10px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "12px" }}
                />
                <select
                  aria-label="Filter categories by status"
                  value={categoryStatusFilter}
                  onChange={(event) => setCategoryStatusFilter(event.target.value as typeof categoryStatusFilter)}
                  style={{ padding: "8px 10px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "12px", background: "#fff" }}
                >
                  <option value="ALL">All categories</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid var(--border-light, #e8dfd5)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: "#faf8f5" }}>
                    <th style={{ padding: "12px 16px" }}>Category Name</th>
                    <th style={{ padding: "12px 16px" }}>Slug</th>
                    <th style={{ padding: "12px 16px" }}>Description</th>
                    <th style={{ padding: "12px 16px" }}>Parent Category</th>
                    <th style={{ padding: "12px 16px" }}>Products</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                        No categories found for these filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-muted)" }}>{c.slug}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(c as any).description || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{c.parent?.name || "Root (None)"}</td>
                        <td style={{ padding: "12px 16px" }}>{c._count?.products || 0} items</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", backgroundColor: c.isActive ? "#f0f7f2" : "#fdf2f2", color: c.isActive ? "#15803d" : "#b91c1c" }}>
                            {c.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(c)}
                              style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCategoryStatus(c)}
                              style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", color: c.isActive ? "#b91c1c" : "#15803d" }}
                            >
                              {c.isActive ? "Archive" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(c)}
                              style={{ background: "none", border: "1px solid #fecaca", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", color: "#b91c1c" }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: INVENTORY & STOCK MOVEMENTS */}
        {activeTab === "inventory" && (
          <section>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "28px" }}>
              <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Stock Units</span>
                <div style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-primary)", marginTop: "6px" }}>
                  {inventorySummary?.totalStockUnits.toLocaleString("en-IN") ?? "—"}
                </div>
              </div>
              <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Inventory Value</span>
                <div style={{ fontSize: "21px", fontWeight: 600, color: "var(--text-secondary)", marginTop: "10px" }}>
                  {inventorySummary?.inventoryValue === null ? "Not tracked" : inventorySummary?.inventoryValue ?? "—"}
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Cost basis is not recorded for products.</p>
              </div>
              <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Reserved Stock</span>
                <div style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-primary)", marginTop: "6px" }}>
                  {inventorySummary?.reservedStock.toLocaleString("en-IN") ?? "—"}
                </div>
              </div>
              <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: "12px", color: "#b45309", textTransform: "uppercase" }}>Low Stock Products</span>
                <div style={{ fontSize: "28px", fontWeight: 600, color: "#b45309", marginTop: "6px" }}>
                  {inventorySummary?.lowStockProducts.toLocaleString("en-IN") ?? "—"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
              <h3 className="font-serif" style={{ fontSize: "20px", color: "var(--text-primary)" }}>
                Recent Audit Stock Movements
              </h3>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setMovementPage(1);
                  setMovementFilters({
                    search: movementSearchInput,
                    startDate: movementStartDateInput,
                    endDate: movementEndDateInput,
                  });
                }}
                style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
              >
                <input
                  type="search"
                  aria-label="Search stock movements"
                  placeholder="Product, SKU, admin or reason"
                  value={movementSearchInput}
                  onChange={(event) => setMovementSearchInput(event.target.value)}
                  style={{ padding: "7px 9px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "12px", minWidth: "205px" }}
                />
                <input
                  type="date"
                  aria-label="Movement start date"
                  value={movementStartDateInput}
                  onChange={(event) => setMovementStartDateInput(event.target.value)}
                  style={{ padding: "7px 9px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "12px" }}
                />
                <input
                  type="date"
                  aria-label="Movement end date"
                  value={movementEndDateInput}
                  onChange={(event) => setMovementEndDateInput(event.target.value)}
                  style={{ padding: "7px 9px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "12px" }}
                />
                <button type="submit" style={{ padding: "7px 12px", borderRadius: "6px", background: "var(--btn-dark)", color: "#fff", fontSize: "12px" }}>Filter</button>
              </form>
            </div>
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid var(--border-light, #e8dfd5)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: "#faf8f5" }}>
                    <th style={{ padding: "12px 16px" }}>Timestamp</th>
                    <th style={{ padding: "12px 16px" }}>Product</th>
                    <th style={{ padding: "12px 16px" }}>Delta</th>
                    <th style={{ padding: "12px 16px" }}>Stock Transition</th>
                    <th style={{ padding: "12px 16px" }}>Type</th>
                    <th style={{ padding: "12px 16px" }}>Admin</th>
                    <th style={{ padding: "12px 16px" }}>Reason & Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                        No stock movements found for these filters.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px" }}>
                          {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                          {m.product?.name || "General Catalog Item"}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: m.quantityDelta > 0 ? "#15803d" : "#b91c1c" }}>
                          {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {m.previousStock} → {m.newStock}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 500 }}>
                          {m.type}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {m.reference?.startsWith("Admin:") ? m.reference.slice(6) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {m.reason} {m.reference && <span style={{ color: "var(--text-muted)" }}>({m.reference})</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
              <span>{movementTotal} movement{movementTotal === 1 ? "" : "s"}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" disabled={movementPage <= 1} onClick={() => setMovementPage((page) => page - 1)} style={{ padding: "6px 10px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "#fff" }}>Previous</button>
                <span style={{ padding: "6px 2px" }}>Page {movementPage} of {Math.max(1, Math.ceil(movementTotal / 25))}</span>
                <button type="button" disabled={movementPage >= Math.ceil(movementTotal / 25)} onClick={() => setMovementPage((page) => page + 1)} style={{ padding: "6px 10px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "#fff" }}>Next</button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 0: EXECUTIVE ANALYTICS */}
        {analyticsVisited && (
          <div style={{ display: activeTab === "analytics" ? "contents" : "none" }}>
            <AdminAnalyticsTab />
          </div>
        )}

        {/* TAB 5: ORDERS & LOGISTICS */}
        {activeTab === "orders" && <AdminOrdersTab />}

        {/* TAB 6: CMS & STORE SETTINGS */}
        {activeTab === "cms" && <AdminCmsTab />}

        {/* TAB 7: OPERATIONAL HEALTH & RECOVERY (Hidden as requested) */}
        {/* {activeTab === "operations" && <AdminOperationsTab />} */}

        {/* TAB 8: STAFF MANAGEMENT & RBAC PERMISSIONS */}
        {activeTab === "staff" && <AdminStaffTab currentUser={adminUser} />}

        {/* TAB 9: ADMINISTRATIVE AUDIT TRAIL (Hidden as requested) */}
        {/* {activeTab === "audit" && <AdminAuditTab />} */}

        {/* TAB 10: CUSTOMER PRIVACY & COMPLIANCE (Hidden as requested) */}
        {/* {activeTab === "privacy" && <AdminPrivacyTab />} */}

        {/* Category Modal (Create / Edit Category) */}
        {showCategoryModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "20px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16px", maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "28px", border: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 className="font-serif" style={{ fontSize: "20px", margin: 0 }}>
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Product Category"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kanjivaram Silk, Banarasi, Chiffon"
                    value={categoryForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCategoryForm((prev) => ({
                        ...prev,
                        name,
                        slug: !editingCategory ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : prev.slug,
                      }));
                    }}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="kanjivaram-silk"
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Parent Category (Optional)
                    </label>
                    <select
                      value={categoryForm.parentId}
                      onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px", backgroundColor: "#fff" }}
                    >
                      <option value="">None (Top-Level Category)</option>
                      {categories
                        .filter((c) => !editingCategory || c.id !== editingCategory.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description for category collection pages and SEO..."
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Display Sort Order
                    </label>
                    <input
                      type="number"
                      value={categoryForm.sortOrder}
                      onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px" }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "18px" }}>
                    <input
                      type="checkbox"
                      id="catIsActive"
                      checked={categoryForm.isActive}
                      onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="catIsActive" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                      Active (Visible on Storefront)
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px", borderTop: "1px solid var(--border-light)", paddingTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border-light)", background: "none", fontSize: "13px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: "8px 20px", backgroundColor: "var(--btn-dark)", color: "#f7f4ee", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {loading ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Category Modal (from Product Add / Edit page) */}
        {showQuickCategoryModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "20px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16px", maxWidth: "460px", width: "100%", padding: "24px", border: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 className="font-serif" style={{ fontSize: "18px", margin: 0 }}>
                  Quick Add Category
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryModal(false)}
                  style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Georgette Silk"
                    value={categoryForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCategoryForm((prev) => ({
                        ...prev,
                        name,
                        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
                      }));
                    }}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Parent Category (Optional)
                  </label>
                  <select
                    value={categoryForm.parentId}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="">None (Top-Level Category)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setShowQuickCategoryModal(false)}
                    style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--border-light)", background: "none", fontSize: "12px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: "8px 18px", backgroundColor: "var(--btn-dark)", color: "#f7f4ee", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {loading ? "Creating..." : "Create & Select"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {stockAdjustModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "20px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16px", maxWidth: "480px", width: "100%", padding: "24px", border: "1px solid var(--border-light)" }}>
              <h3 className="font-serif" style={{ fontSize: "18px", marginTop: 0 }}>
                Adjust Stock for {stockAdjustModal.name}
              </h3>
              <form onSubmit={handleStockAdjustmentSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Quantity Delta (+ to restock, - to deduct)</label>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Reason for Stock Movement</label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-light)", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button type="button" onClick={() => setStockAdjustModal(null)} style={{ padding: "8px 14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "none" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} style={{ padding: "8px 16px", backgroundColor: "var(--btn-dark)", color: "#f7f4ee", borderRadius: "6px", border: "none" }}>
                    Confirm Stock Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Action Confirmation Modal */}
        {showBulkModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "20px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16px", maxWidth: "480px", width: "100%", padding: "24px", border: "1px solid var(--border-light)" }}>
              <h3 className="font-serif" style={{ fontSize: "18px", marginTop: 0 }}>
                {showBulkModal === "status" ? "Confirm Bulk Status Change" : "Confirm Bulk Price Adjustment"}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Applying changes to {selectedProductIds.length} selected products simultaneously.
              </p>

              {showBulkModal === "status" ? (
                <div style={{ margin: "16px 0" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>New Status</label>
                  <select
                    value={bulkStatusTarget}
                    onChange={(e) => setBulkStatusTarget(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid var(--border-light)", borderRadius: "6px", marginTop: "4px" }}
                  >
                    <option value="ACTIVE">ACTIVE (Published)</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                    <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                  </select>
                </div>
              ) : (
                <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>Adjustment Type</label>
                    <select
                      value={bulkPriceType}
                      onChange={(e) => setBulkPriceType(e.target.value as any)}
                      style={{ width: "100%", padding: "8px", border: "1px solid var(--border-light)", borderRadius: "6px", marginTop: "4px" }}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Paise/Rupees</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>Value (e.g. 5 for +5%, -10 for -10%)</label>
                    <input
                      type="number"
                      value={bulkPriceValue}
                      onChange={(e) => setBulkPriceValue(Number(e.target.value))}
                      style={{ width: "100%", padding: "8px", border: "1px solid var(--border-light)", borderRadius: "6px", marginTop: "4px" }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowBulkModal(null)} style={{ padding: "8px 14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "none" }}>
                  Cancel
                </button>
                <button type="button" onClick={handleBulkAction} disabled={loading} style={{ padding: "8px 16px", backgroundColor: "var(--btn-dark)", color: "#f7f4ee", borderRadius: "6px", border: "none" }}>
                  Apply to {selectedProductIds.length} Products
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
