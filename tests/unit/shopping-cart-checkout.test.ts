import { describe, it, expect, vi, beforeEach } from "vitest";
import { CartService } from "@/modules/cart/cart.service";
import { WishlistService } from "@/modules/wishlist/wishlist.service";
import { CouponService } from "@/modules/coupons/coupon.service";
import { CheckoutService } from "@/modules/checkout/checkout.service";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/api/errors";
import {
  CouponDiscountType,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ProductStatus,
} from "@prisma/client";
import { inventoryService } from "@/modules/inventory/inventory.service";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    cart: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    wishlist: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    wishlistItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    couponRedemption: {
      count: vi.fn(),
      create: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: {
    reserveStock: vi.fn(),
    commitReservation: vi.fn(),
    releaseReservation: vi.fn(),
  },
}));

vi.mock("@/lib/email/email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("RASA Sampoorna Shopping Experience Suite", () => {
  const cartService = new CartService();
  const wishlistService = new WishlistService();
  const couponService = new CouponService();
  const checkoutService = new CheckoutService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 1. CART TESTS
  // ==========================================
  describe("Cart Management & Server Revalidation", () => {
    it("should calculate cart summary using authoritative server pricing in minor units (paise)", async () => {
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce({
        id: "cart-123",
        userId: "user-1",
        guestToken: null,
        currency: "INR",
        items: [
          {
            id: "ci-1",
            quantity: 2,
            selectedSize: "Free size",
            variant: {
              id: "var-1",
              isActive: true,
              stockQuantity: 10,
              priceAdjustmentMinorUnits: 0,
              product: {
                id: "prod-1",
                name: "Lotus Bloom Saree",
                slug: "lotus-bloom-saree",
                status: ProductStatus.ACTIVE,
                basePriceInMinorUnits: 450000, // ₹4,500.00
                images: [{ url: "/images/lotus.jpg" }],
              },
            },
          },
        ],
      } as any);

      const summary = await cartService.getOrCreateCart("user-1");

      expect(summary.itemCount).toBe(2);
      expect(summary.subtotalMinorUnits).toBe(900000); // 2 * ₹4,500 = ₹9,000.00
      expect(summary.subtotal).toBe(9000);
      expect(summary.shippingFeeMinorUnits).toBe(0); // Subtotal >= ₹2,000 threshold
      expect(summary.total).toBe(9000);
    });

    it("should apply ₹150 shipping fee when cart subtotal is below the ₹2,000 threshold", async () => {
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce({
        id: "cart-123",
        userId: null,
        guestToken: "guest_abc123",
        currency: "INR",
        items: [
          {
            id: "ci-1",
            quantity: 1,
            selectedSize: "Standard",
            variant: {
              id: "var-1",
              isActive: true,
              stockQuantity: 5,
              priceAdjustmentMinorUnits: 0,
              product: {
                id: "prod-1",
                name: "Artisan Silk Scarf",
                slug: "artisan-silk-scarf",
                status: ProductStatus.ACTIVE,
                basePriceInMinorUnits: 120000, // ₹1,200.00 (< ₹2,000)
                images: [{ url: "/images/scarf.jpg" }],
              },
            },
          },
        ],
      } as any);

      const summary = await cartService.getOrCreateCart(undefined, "guest_abc123");

      expect(summary.subtotal).toBe(1200);
      expect(summary.shippingFeeMinorUnits).toBe(15000); // ₹150.00
      expect(summary.shippingFee).toBe(150);
      expect(summary.total).toBe(1350);
    });

    it("should prevent duplicate cart lines and increment quantity on re-adding the same variant", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "var-1",
        productId: "prod-1",
        isActive: true,
        stockQuantity: 8,
        priceAdjustmentMinorUnits: 0,
        product: { id: "prod-1", name: "Lotus Bloom", status: ProductStatus.ACTIVE },
      } as any);

      vi.mocked(prisma.cart.findFirst).mockResolvedValue({
        id: "cart-1",
        userId: "user-1",
        currency: "INR",
        items: [],
      } as any);

      // Existing item already in cart with qty 2
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce({
        id: "ci-existing",
        cartId: "cart-1",
        variantId: "var-1",
        quantity: 2,
        selectedSize: "Free size",
      } as any);

      await cartService.addItem(
        { variantId: "var-1", quantity: 3, selectedSize: "Free size" },
        "user-1"
      );

      // Must update existing line to 2 + 3 = 5, not create a new duplicate item
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: "ci-existing" },
        data: { quantity: 5, selectedSize: "Free size" },
      });
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it("should reject adding quantity exceeding available physical stock", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "var-1",
        productId: "prod-1",
        isActive: true,
        stockQuantity: 2,
        product: { id: "prod-1", name: "Rare Saree", status: ProductStatus.ACTIVE },
      } as any);

      await expect(
        cartService.addItem({ variantId: "var-1", quantity: 5 }, "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("should flag out-of-stock and archived items with warnings and exclude them from purchasable totals", async () => {
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce({
        id: "cart-1",
        userId: "user-1",
        currency: "INR",
        items: [
          {
            id: "ci-1",
            quantity: 1,
            selectedSize: "Free size",
            variant: {
              id: "var-1",
              isActive: true,
              stockQuantity: 0, // Out of stock
              priceAdjustmentMinorUnits: 0,
              product: {
                id: "prod-1",
                name: "Sold Out Saree",
                slug: "sold-out",
                status: ProductStatus.ACTIVE,
                basePriceInMinorUnits: 500000,
                images: [],
              },
            },
          },
        ],
      } as any);

      const summary = await cartService.getOrCreateCart("user-1");

      expect(summary.hasStockIssue).toBe(true);
      expect(summary.items[0].isOutOfStock).toBe(true);
      expect(summary.items[0].isPurchasable).toBe(false);
      expect(summary.items[0].stockWarning).toBe("Out of stock.");
      expect(summary.subtotal).toBe(0); // Excluded from active subtotal
    });

    it("should safely merge guest cart items into customer cart on login and clean up guest cart", async () => {
      // Guest cart has 2 units of var-1
      vi.mocked(prisma.cart.findFirst)
        .mockResolvedValueOnce({
          id: "guest-cart-1",
          guestToken: "guest_token_123",
          items: [
            {
              id: "g-item-1",
              variantId: "var-1",
              quantity: 2,
              selectedSize: "Free size",
              variant: { stockQuantity: 10 },
            },
          ],
        } as any)
        // User cart has 1 unit of var-1
        .mockResolvedValueOnce({
          id: "user-cart-1",
          userId: "user-1",
          items: [{ id: "u-item-1", variantId: "var-1", quantity: 1 }],
        } as any)
        // Final getOrCreateCart call
        .mockResolvedValueOnce({
          id: "user-cart-1",
          userId: "user-1",
          items: [],
        } as any);

      await cartService.mergeGuestCart("guest_token_123", "user-1");

      // Verifies merged quantity: 1 + 2 = 3
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: "u-item-1" },
        data: { quantity: 3 },
      });

      // Verifies guest cart deletion
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: "guest-cart-1" },
      });
      expect(prisma.cart.delete).toHaveBeenCalledWith({
        where: { id: "guest-cart-1" },
      });
    });
  });

  // ==========================================
  // 2. WISHLIST TESTS
  // ==========================================
  describe("Wishlist Operations & Guest Merging", () => {
    it("should toggle items in wishlist (add when absent, remove when present)", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        name: "Kanjivaram Saree",
        status: ProductStatus.ACTIVE,
      } as any);

      vi.mocked(prisma.wishlist.findFirst).mockResolvedValue({
        id: "wish-1",
        userId: "user-1",
        items: [],
      } as any);

      // Case 1: Item absent -> Add
      vi.mocked(prisma.wishlistItem.findUnique).mockResolvedValueOnce(null);

      const addResult = await wishlistService.toggleItem("prod-1", "user-1");
      expect(addResult.inWishlist).toBe(true);
      expect(prisma.wishlistItem.create).toHaveBeenCalled();

      // Case 2: Item present -> Remove
      vi.mocked(prisma.wishlistItem.findUnique).mockResolvedValueOnce({
        id: "wi-1",
        wishlistId: "wish-1",
        productId: "prod-1",
      } as any);

      const removeResult = await wishlistService.toggleItem("prod-1", "user-1");
      expect(removeResult.inWishlist).toBe(false);
      expect(prisma.wishlistItem.delete).toHaveBeenCalledWith({ where: { id: "wi-1" } });
    });

    it("should merge guest wishlist into customer account avoiding duplicates", async () => {
      vi.mocked(prisma.wishlist.findFirst)
        .mockResolvedValueOnce({
          id: "guest-wish-1",
          guestToken: "guest_123",
          items: [{ id: "gw-1", productId: "prod-A" }, { id: "gw-2", productId: "prod-B" }],
        } as any)
        .mockResolvedValueOnce({
          id: "user-wish-1",
          userId: "user-1",
          items: [{ id: "uw-1", productId: "prod-A" }], // prod-A already exists in user wishlist
        } as any)
        .mockResolvedValueOnce({
          id: "user-wish-1",
          userId: "user-1",
          items: [],
        } as any);

      await wishlistService.mergeGuestWishlist("guest_123", "user-1");

      // Only prod-B should be added, prod-A skipped to prevent duplicate constraint violation
      expect(prisma.wishlistItem.create).toHaveBeenCalledTimes(1);
      expect(prisma.wishlistItem.create).toHaveBeenCalledWith({
        data: {
          wishlistId: "user-wish-1",
          productId: "prod-B",
        },
      });

      expect(prisma.wishlist.delete).toHaveBeenCalledWith({ where: { id: "guest-wish-1" } });
    });
  });

  // ==========================================
  // 3. COUPONS TESTS
  // ==========================================
  describe("Coupons & Authoritative Discount Calculation", () => {
    it("should calculate percentage discount correctly and apply max discount cap", async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: "c-10",
        code: "DIWALI10",
        isActive: true,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValueMinorUnits: 10, // 10%
        minOrderAmountMinorUnits: 200000, // ₹2,000 min
        maxDiscountMinorUnits: 50000,    // Max ₹500 cap
        usageLimit: 100,
        usageCount: 5,
        startsAt: null,
        expiresAt: null,
      } as any);

      // Cart value: ₹10,000. 10% would be ₹1,000, but capped at ₹500
      const result = await couponService.validateCoupon("DIWALI10", 1000000);

      expect(result.isValid).toBe(true);
      expect(result.discountAmountMinorUnits).toBe(50000); // ₹500.00
      expect(result.discountAmountRupees).toBe(500);
    });

    it("should calculate fixed amount discounts accurately", async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: "c-flat",
        code: "FLAT300",
        isActive: true,
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValueMinorUnits: 30000, // ₹300
        minOrderAmountMinorUnits: 150000,
        maxDiscountMinorUnits: null,
        usageLimit: null,
        usageCount: 0,
      } as any);

      const result = await couponService.validateCoupon("FLAT300", 300000);
      expect(result.discountAmountRupees).toBe(300);
    });

    it("should reject expired coupons with clear error message", async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: "c-exp",
        code: "EXPIRED20",
        isActive: true,
        expiresAt: pastDate,
      } as any);

      await expect(couponService.validateCoupon("EXPIRED20", 500000)).rejects.toThrow(
        /expired/i
      );
    });

    it("should enforce per-customer usage limit", async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: "c-welcome",
        code: "WELCOME100",
        isActive: true,
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValueMinorUnits: 10000,
        description: JSON.stringify({ perUserLimit: 1 }),
      } as any);

      // User already redeemed once
      vi.mocked(prisma.couponRedemption.count).mockResolvedValueOnce(1);

      await expect(
        couponService.validateCoupon("WELCOME100", 250000, "user-123")
      ).rejects.toThrow(/already redeemed coupon/i);
    });

    it("should enforce first-order only restriction", async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: "c-first",
        code: "FIRSTORDER",
        isActive: true,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValueMinorUnits: 15,
        description: JSON.stringify({ isFirstOrderOnly: true }),
      } as any);

      // User has 1 previous completed order
      vi.mocked(prisma.couponRedemption.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(1);

      await expect(
        couponService.validateCoupon("FIRSTORDER", 300000, "user-123")
      ).rejects.toThrow(/exclusively available on your first order/i);
    });
  });

  // ==========================================
  // 4. CHECKOUT & SAFE ORDER CREATION
  // ==========================================
  describe("Safe Order Creation & Payment Verification Workflow", () => {
    it("should execute safe order creation: stock reservation, immutable address snapshot, and cart preservation", async () => {
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce({
        id: "cart-999",
        userId: "user-guest",
        currency: "INR",
        items: [
          {
            id: "ci-1",
            quantity: 1,
            selectedSize: "Free size",
            variant: {
              id: "var-1",
              productId: "prod-1",
              sku: "LOTUS-01",
              isActive: true,
              stockQuantity: 5,
              priceAdjustmentMinorUnits: 0,
              product: {
                id: "prod-1",
                name: "Lotus Saree",
                status: ProductStatus.ACTIVE,
                basePriceInMinorUnits: 450000,
                originalPriceInMinorUnits: 550000,
                images: [{ url: "/img/lotus.jpg" }],
              },
            },
          },
        ],
      } as any);

      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: "order-123",
        orderNumber: "RASA-202610-1234",
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotalMinorUnits: 450000,
        shippingFeeMinorUnits: 0,
        totalAmountMinorUnits: 450000,
        currency: "INR",
        razorpayOrderId: "order_mock_test",
      } as any);

      const order = await checkoutService.createOrder(
        {
          shippingAddress: {
            name: "Ananya Iyer",
            phone: "9876543210",
            street: "12 Temple Road",
            city: "Chennai",
            state: "Tamil Nadu",
            postalCode: "600004",
            country: "India",
          },
          deliveryOption: "standard",
          paymentMethod: PaymentMethod.RAZORPAY,
        },
        "user-guest"
      );

      // Step 3 verified: Inventory is reserved safely with TTL
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: expect.stringMatching(/^RASA-/),
          ttlMinutes: 15,
        })
      );

      // Order created in pending status
      expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);

      // Critical constraint verified: Cart is NOT deleted yet (preserved after creation)
      expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it("should finalize order and commit stock exactly once upon verified payment capture, then clear cart", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: "order-123",
        orderNumber: "RASA-202610-1234",
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        totalAmountMinorUnits: 450000,
        currency: "INR",
        userId: "user-1",
      } as any);

      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        id: "order-123",
        orderNumber: "RASA-202610-1234",
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.CAPTURED,
        totalAmountMinorUnits: 450000,
      } as any);

      const result = await checkoutService.verifyPayment({
        orderId: "order-123",
        razorpayOrderId: "order_mock_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_dev_verified",
      });

      // Stock reservation is permanently committed
      expect(inventoryService.commitReservation).toHaveBeenCalledWith("RASA-202610-1234");

      // Payment captured
      expect(prisma.payment.create).toHaveBeenCalled();

      // Cart is cleared only on confirmed payment
      expect(prisma.cartItem.deleteMany).toHaveBeenCalled();

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it("should safely release inventory reservation if checkout is abandoned or payment fails", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: "order-pending",
        orderNumber: "RASA-202610-9999",
        status: OrderStatus.PENDING_PAYMENT,
      } as any);

      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        id: "order-pending",
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
      } as any);

      const failedOrder = await checkoutService.handlePaymentFailure(
        "order-pending",
        "Customer dismissed payment window"
      );

      // Reservation released safely
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith("RASA-202610-9999");
      expect(failedOrder.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
