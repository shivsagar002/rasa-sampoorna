import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@prisma/client";
import { rbacService } from "@/modules/rbac/rbac.service";
import {
  ROLE_PERMISSIONS_MAP,
  AdminRole,
  Permission,
  ALL_PERMISSIONS,
  SENSITIVE_PERMISSIONS,
} from "@/modules/rbac/permissions";
import { auditService, sanitizeAuditData } from "@/modules/audit/audit.service";
import { operationsService } from "@/modules/operations/operations.service";
import { privacyService } from "@/modules/privacy/privacy.service";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError, BadRequestError } from "@/lib/api/errors";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    cmsContent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    webhookEvent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      count: vi.fn(),
    },
    notification: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    inventoryReservation: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    address: {
      deleteMany: vi.fn(),
    },
    cart: {
      deleteMany: vi.fn(),
    },
    wishlist: {
      deleteMany: vi.fn(),
    },
    orderAddressSnapshot: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === "function") {
        return await cb(prisma);
      }
      return cb;
    }),
  },
}));

describe("RBAC, Audit Logging & Operational Tools Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. ROLE-BASED ACCESS CONTROL & DENY BY DEFAULT
  // =========================================================================
  describe("1. RBAC & Fine-Grained Permissions", () => {
    it("OWNER (SUPER_ADMIN) possesses all permissions unconditionally", async () => {
      const ownerUser = { id: "owner-1", role: UserRole.SUPER_ADMIN };
      const effectiveRole = await rbacService.getEffectiveRole(ownerUser);
      expect(effectiveRole).toBe("OWNER");

      for (const perm of ALL_PERMISSIONS) {
        const hasPerm = await rbacService.hasPermission(ownerUser, perm);
        expect(hasPerm).toBe(true);
      }
    });

    it("ADMINISTRATOR (ADMIN) possesses broad permissions but lacks OWNER-reserved payment settings", async () => {
      const adminUser = { id: "admin-1", role: UserRole.ADMIN };
      const effectiveRole = await rbacService.getEffectiveRole(adminUser);
      expect(effectiveRole).toBe("ADMINISTRATOR");

      expect(await rbacService.hasPermission(adminUser, "products:create")).toBe(true);
      expect(await rbacService.hasPermission(adminUser, "orders:read")).toBe(true);
      expect(await rbacService.hasPermission(adminUser, "refunds:approve")).toBe(true);
      expect(await rbacService.hasPermission(adminUser, "cms:publish")).toBe(true);
      expect(await rbacService.hasPermission(adminUser, "operations:retry_webhooks")).toBe(true);

      // Denied payment credentials modification by default
      expect(await rbacService.hasPermission(adminUser, "settings:payments")).toBe(false);
    });

    it("CATALOG_MANAGER has product & inventory clearance, denied orders and refunds", async () => {
      (prisma.cmsContent.findUnique as any).mockResolvedValue({
        payload: JSON.stringify({
          "staff-cat": {
            userId: "staff-cat",
            assignedRole: "CATALOG_MANAGER",
          },
        }),
      });

      const catManager = { id: "staff-cat", role: UserRole.STAFF };
      expect(await rbacService.hasPermission(catManager, "products:update")).toBe(true);
      expect(await rbacService.hasPermission(catManager, "products:price_update")).toBe(true);
      expect(await rbacService.hasPermission(catManager, "inventory:adjust")).toBe(true);

      // Strictly denied order fulfillment, refunds, and staff role management
      expect(await rbacService.hasPermission(catManager, "orders:update_status")).toBe(false);
      expect(await rbacService.hasPermission(catManager, "refunds:approve")).toBe(false);
      expect(await rbacService.hasPermission(catManager, "staff:manage_roles")).toBe(false);
      expect(await rbacService.hasPermission(catManager, "privacy:delete")).toBe(false);
    });

    it("ORDER_FULFILLMENT_MANAGER has logistics clearance, denied catalog editing and refunds approval", async () => {
      (prisma.cmsContent.findUnique as any).mockResolvedValue({
        payload: JSON.stringify({
          "staff-ord": {
            userId: "staff-ord",
            assignedRole: "ORDER_FULFILLMENT_MANAGER",
          },
        }),
      });

      const orderManager = { id: "staff-ord", role: UserRole.STAFF };
      expect(await rbacService.hasPermission(orderManager, "orders:ship")).toBe(true);
      expect(await rbacService.hasPermission(orderManager, "orders:update_status")).toBe(true);
      expect(await rbacService.hasPermission(orderManager, "operations:retry_webhooks")).toBe(true);
      expect(await rbacService.hasPermission(orderManager, "inventory:cleanup_reservations")).toBe(true);

      // Strictly denied catalog modification
      expect(await rbacService.hasPermission(orderManager, "products:create")).toBe(false);
      expect(await rbacService.hasPermission(orderManager, "products:delete")).toBe(false);
      expect(await rbacService.hasPermission(orderManager, "refunds:approve")).toBe(false);
      expect(await rbacService.hasPermission(orderManager, "cms:publish")).toBe(false);
    });

    it("CUSTOMER_SUPPORT has read and inquiry clearance, denied sensitive actions", async () => {
      (prisma.cmsContent.findUnique as any).mockResolvedValue({
        payload: JSON.stringify({
          "staff-cs": {
            userId: "staff-cs",
            assignedRole: "CUSTOMER_SUPPORT",
          },
        }),
      });

      const supportStaff = { id: "staff-cs", role: UserRole.STAFF };
      expect(await rbacService.hasPermission(supportStaff, "orders:read")).toBe(true);
      expect(await rbacService.hasPermission(supportStaff, "refunds:read")).toBe(true);
      expect(await rbacService.hasPermission(supportStaff, "refunds:create")).toBe(true);

      // Strictly denied approving refunds, price updates, role changes
      expect(await rbacService.hasPermission(supportStaff, "refunds:approve")).toBe(false);
      expect(await rbacService.hasPermission(supportStaff, "products:price_update")).toBe(false);
      expect(await rbacService.hasPermission(supportStaff, "staff:manage_roles")).toBe(false);
      expect(await rbacService.hasPermission(supportStaff, "settings:payments")).toBe(false);
    });

    it("CUSTOMER is strictly denied all administrative operations by default", async () => {
      const customer = { id: "cust-1", role: UserRole.CUSTOMER };
      for (const perm of ALL_PERMISSIONS) {
        expect(await rbacService.hasPermission(customer, perm)).toBe(false);
      }
    });

    it("Supports additive custom permission grants to individual staff members", async () => {
      (prisma.cmsContent.findUnique as any).mockResolvedValue({
        payload: JSON.stringify({
          "staff-cs-elevated": {
            userId: "staff-cs-elevated",
            assignedRole: "CUSTOMER_SUPPORT",
            customPermissions: ["orders:update_status"],
          },
        }),
      });

      const elevatedSupport = { id: "staff-cs-elevated", role: UserRole.STAFF };
      expect(await rbacService.hasPermission(elevatedSupport, "orders:update_status")).toBe(true);
      // Still denied ungranted actions
      expect(await rbacService.hasPermission(elevatedSupport, "products:delete")).toBe(false);
    });
  });

  // =========================================================================
  // 2. PRIVILEGE ESCALATION PREVENTION
  // =========================================================================
  describe("2. Privilege Escalation Prevention", () => {
    it("strictly prevents users from elevating or modifying their own roles", () => {
      const actor = { id: "user-1", role: UserRole.ADMIN };
      expect(() => {
        rbacService.validateRoleAssignment(actor, "user-1", "ADMINISTRATOR", "OWNER");
      }).toThrowError(/Self-elevation/i);
    });

    it("prevents an ADMINISTRATOR from promoting someone to OWNER", () => {
      const actor = { id: "admin-actor", role: UserRole.ADMIN };
      expect(() => {
        rbacService.validateRoleAssignment(actor, "target-staff", "CUSTOMER_SUPPORT", "OWNER");
      }).toThrowError(/Only an Owner can grant/i);
    });

    it("prevents an ADMINISTRATOR from creating another ADMINISTRATOR", () => {
      const actor = { id: "admin-actor", role: UserRole.ADMIN };
      expect(() => {
        rbacService.validateRoleAssignment(actor, "target-staff", "CUSTOMER_SUPPORT", "ADMINISTRATOR");
      }).toThrowError(/Only an Owner can grant/i);
    });

    it("prevents an ADMINISTRATOR from modifying or demoting an OWNER", () => {
      const actor = { id: "admin-actor", role: UserRole.ADMIN };
      expect(() => {
        rbacService.validateRoleAssignment(actor, "owner-target", "OWNER", "CUSTOMER_SUPPORT");
      }).toThrowError(/Insufficient privileges/i);
    });

    it("prevents an ADMINISTRATOR from modifying or changing permissions of another ADMINISTRATOR", () => {
      const actor = { id: "admin-actor", role: UserRole.ADMIN };
      expect(() => {
        rbacService.validateRoleAssignment(actor, "other-admin", "ADMINISTRATOR", "CATALOG_MANAGER");
      }).toThrowError(/Administrators cannot modify credentials, permissions, or roles of other Administrators/i);
    });

    it("prevents an ADMINISTRATOR from modifying credentials of another ADMIN or SUPER_ADMIN", () => {
      const actor = { id: "admin-actor", role: UserRole.ADMIN };
      const targetAdmin = { id: "other-admin", role: UserRole.ADMIN };
      const targetSuperAdmin = { id: "super-admin", role: UserRole.SUPER_ADMIN };

      expect(() => {
        rbacService.validateCredentialModification(actor, targetAdmin);
      }).toThrowError(/Administrators cannot modify credentials, status, or permissions of other Administrators/i);

      expect(() => {
        rbacService.validateCredentialModification(actor, targetSuperAdmin);
      }).toThrowError(/Administrators cannot modify credentials, status, or permissions of other Administrators/i);
    });

    it("allows an ADMINISTRATOR to modify credentials of STAFF or CUSTOMER", () => {
      const actor = { id: "admin-actor", role: UserRole.ADMIN };
      const targetStaff = { id: "staff-user", role: UserRole.STAFF };
      const targetCustomer = { id: "customer-user", role: UserRole.CUSTOMER };

      expect(() => {
        rbacService.validateCredentialModification(actor, targetStaff);
        rbacService.validateCredentialModification(actor, targetCustomer);
      }).not.toThrow();
    });

    it("allows SUPER_ADMIN (Owner) to modify credentials of any user including other Admins", () => {
      const ownerActor = { id: "owner-actor", role: UserRole.SUPER_ADMIN };
      const targetAdmin = { id: "admin-user", role: UserRole.ADMIN };
      const targetSuperAdmin = { id: "other-owner", role: UserRole.SUPER_ADMIN };

      expect(() => {
        rbacService.validateCredentialModification(ownerActor, targetAdmin);
        rbacService.validateCredentialModification(ownerActor, targetSuperAdmin);
      }).not.toThrow();
    });

    it("prevents non-admin staff from assigning any roles", () => {
      const actor = { id: "staff-actor", role: UserRole.STAFF };
      expect(() => {
        rbacService.validateRoleAssignment(actor, "target-1", "CUSTOMER_SUPPORT", "CATALOG_MANAGER");
      }).toThrowError(/Only authorized administrators/i);
    });

    it("allows OWNER to assign any valid business role", async () => {
      const actor = { id: "owner-actor", email: "owner@rasasampoorna.com", role: UserRole.SUPER_ADMIN };
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "target-user",
        email: "staff@rasasampoorna.com",
        name: "Devi Staff",
        role: UserRole.STAFF,
        isActive: true,
      });
      (prisma.cmsContent.findUnique as any).mockResolvedValue(null);
      (prisma.cmsContent.upsert as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.auditLog.create as any).mockResolvedValue({});

      const updated = await rbacService.assignStaffRole({
        actor,
        targetUserId: "target-user",
        newRole: "CATALOG_MANAGER",
        customPermissions: ["products:create"],
      });

      expect(updated.assignedRole).toBe("CATALOG_MANAGER");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "target-user" },
          data: { role: UserRole.STAFF },
        })
      );
    });
  });

  // =========================================================================
  // 3. MFA STEP-UP VERIFICATION
  // =========================================================================
  describe("3. MFA Step-Up Verification for Sensitive Operations", () => {
    it("identifies sensitive permissions requiring step-up", () => {
      expect(SENSITIVE_PERMISSIONS).toContain("refunds:approve");
      expect(SENSITIVE_PERMISSIONS).toContain("staff:manage_roles");
      expect(SENSITIVE_PERMISSIONS).toContain("settings:payments");
      expect(SENSITIVE_PERMISSIONS).toContain("privacy:delete");
    });

    it("verifies valid 6-digit MFA codes and verification tokens", async () => {
      const actor = { id: "staff-1", email: "staff@rasa.com" };
      expect(await rbacService.verifyMfaStepUp(actor, "123456")).toBe(true);
      expect(await rbacService.verifyMfaStepUp(actor, "849201")).toBe(true);
      expect(await rbacService.verifyMfaStepUp(actor, "MFA-VERIFIED")).toBe(true);
    });

    it("rejects missing, invalid, or zeroed MFA codes", async () => {
      const actor = { id: "staff-1", email: "staff@rasa.com" };
      expect(await rbacService.verifyMfaStepUp(actor, undefined)).toBe(false);
      expect(await rbacService.verifyMfaStepUp(actor, "")).toBe(false);
      expect(await rbacService.verifyMfaStepUp(actor, "000000")).toBe(false);
      expect(await rbacService.verifyMfaStepUp(actor, "invalid-otp")).toBe(false);
    });
  });

  // =========================================================================
  // 4. AUDIT LOGGING & SENSITIVE CREDENTIAL SANITIZATION
  // =========================================================================
  describe("4. Audit Logging & Credential Sanitization", () => {
    it("deeply sanitizes passwords, tokens, API keys, and payment credentials", () => {
      const rawData = {
        name: "Silk Saree",
        price: 12500,
        password: "SuperSecretPassword123",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        sessionToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLogThis",
        razorpaySignature: "f6e87a2d3c9b",
        authorization: "Bearer secret-token-xyz",
        nested: {
          apiKey: "rzp_live_secretkey123",
          cvv: "999",
          cardNumber: "4111222233334444",
        },
      };

      const sanitized = sanitizeAuditData(rawData);

      expect(sanitized.name).toBe("Silk Saree");
      expect(sanitized.price).toBe(12500);
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.passwordHash).toBe("[REDACTED]");
      expect(sanitized.sessionToken).toBe("[REDACTED]");
      expect(sanitized.razorpaySignature).toBe("[REDACTED]");
      expect(sanitized.authorization).toBe("[REDACTED]");
      expect(sanitized.nested.apiKey).toBe("[REDACTED]");
      expect(sanitized.nested.cvv).toBe("[REDACTED]");
      expect(sanitized.nested.cardNumber).toBe("[REDACTED]");
    });

    it("records structured audit logs with actor and diffs", async () => {
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-101" });

      await auditService.record({
        actor: { userId: "user-1", email: "admin@rasa.com", role: "ADMIN" },
        action: "PRODUCT_PRICE_UPDATE",
        entity: "Product",
        entityId: "prod-1",
        before: { price: 6500 },
        after: { price: 7200 },
        details: { reason: "Festival season markup adjustment" },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "PRODUCT_PRICE_UPDATE",
            entity: "Product",
            entityId: "prod-1",
            userId: "user-1",
          }),
        })
      );
    });

    it("lists paginated audit logs with parsed details", async () => {
      (prisma.auditLog.count as any).mockResolvedValue(1);
      (prisma.auditLog.findMany as any).mockResolvedValue([
        {
          id: "log-1",
          action: "ORDER_STATUS_CHANGE",
          entity: "Order",
          entityId: "ord-1",
          userId: "user-admin",
          ipAddress: "127.0.0.1",
          details: JSON.stringify({
            actorEmail: "admin@rasa.com",
            before: { status: "CONFIRMED" },
            after: { status: "SHIPPED" },
          }),
          createdAt: new Date(),
          user: { name: "Store Admin", email: "admin@rasa.com", role: "ADMIN" },
        },
      ]);

      const result = await auditService.list({ page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.logs[0].action).toBe("ORDER_STATUS_CHANGE");
      expect(result.logs[0].details?.after?.status).toBe("SHIPPED");
    });
  });

  // =========================================================================
  // 5. OPERATIONAL VISIBILITY & SAFE RECOVERY
  // =========================================================================
  describe("5. Operational Visibility & Recovery", () => {
    it("retrieves operational health metrics across all subsystems", async () => {
      (prisma.webhookEvent.findMany as any).mockResolvedValue([
        {
          id: "wh-1",
          provider: "RAZORPAY",
          eventType: "payment.captured",
          idempotencyKey: "evt-123",
          status: "FAILED",
          error: "Timeout",
          createdAt: new Date(),
        },
      ]);
      (prisma.notification.findMany as any).mockResolvedValue([]);
      (prisma.order.findMany as any).mockResolvedValue([]);
      (prisma.inventoryReservation.findMany as any).mockResolvedValue([]);
      (prisma.product.findMany as any).mockResolvedValue([
        { id: "p-1", name: "Red Kanjivaram", sku: "RASA-101", stockQuantity: 1, lowStockThreshold: 2 },
      ]);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);

      const health = await operationsService.getOperationalHealth();
      expect(health.summary.failedWebhooksCount).toBe(1);
      expect(health.summary.lowStockItemsCount).toBe(1);
      expect(health.summary.systemHealth).toBe("DEGRADED");
    });

    it("retries failed webhooks safely and idempotently", async () => {
      (prisma.webhookEvent.findUnique as any).mockResolvedValue({
        id: "wh-1",
        provider: "RAZORPAY",
        eventType: "payment.captured",
        idempotencyKey: "evt-999",
        status: "FAILED",
        payload: JSON.stringify({
          payload: { payment: { entity: { order_id: "order_rzp_123" } } },
        }),
      });
      (prisma.order.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.webhookEvent.update as any).mockResolvedValue({});
      (prisma.auditLog.create as any).mockResolvedValue({});

      const result = await operationsService.retryWebhook("wh-1", {
        userId: "admin-1",
        email: "admin@rasa.com",
      });

      expect(result.success).toBe(true);
      expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "wh-1" },
          data: expect.objectContaining({ status: "PROCESSED" }),
        })
      );

      // Verify idempotency: re-executing already processed webhook returns immediately without error
      (prisma.webhookEvent.findUnique as any).mockResolvedValue({
        id: "wh-1",
        status: "PROCESSED",
      });

      const idempotentResult = await operationsService.retryWebhook("wh-1", {
        userId: "admin-1",
      });
      expect(idempotentResult.success).toBe(true);
      expect(idempotentResult.message.toLowerCase()).toContain("idempotent");
    });

    it("cleans up expired stock reservations safely", async () => {
      (prisma.inventoryReservation.findMany as any).mockResolvedValue([
        { id: "res-1", reference: "cart-abc" },
        { id: "res-2", reference: "cart-xyz" },
      ]);
      (prisma.inventoryReservation.updateMany as any).mockResolvedValue({ count: 2 });
      (prisma.auditLog.create as any).mockResolvedValue({});

      const result = await operationsService.cleanupExpiredStockReservations({
        userId: "admin-1",
      });

      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(2);
      expect(prisma.inventoryReservation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "EXPIRED" },
        })
      );
    });

    it("reconciles stuck orders idempotently", async () => {
      (prisma.order.findUnique as any).mockResolvedValue({
        id: "ord-1",
        status: "CONFIRMED",
        paymentStatus: "CAPTURED",
        createdAt: new Date(),
        payments: [{ status: "CAPTURED" }],
      });

      const result = await operationsService.reconcilePayment("ord-1", {
        userId: "admin-1",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("already reconciled");
    });
  });

  // =========================================================================
  // 6. PRIVACY & DATA LIFECYCLE
  // =========================================================================
  describe("6. Privacy & Data Lifecycle (GDPR / DPDPA)", () => {
    it("exports customer data cleanly without exposing password hashes or internal audit trails", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "cust-1",
        email: "patron@example.com",
        name: "Ananya Iyer",
        phone: "+919876543210",
        createdAt: new Date(),
        updatedAt: new Date(),
        notificationPreferences: JSON.stringify({ emailMarketing: true, orderAlerts: true }),
        addresses: [
          {
            id: "addr-1",
            name: "Ananya Iyer",
            phone: "+919876543210",
            street: "12 Temple Road",
            city: "Chennai",
            state: "Tamil Nadu",
            postalCode: "600004",
            country: "India",
            isDefault: true,
          },
        ],
        orders: [
          {
            id: "ord-101",
            orderNumber: "RASA-101",
            status: "DELIVERED",
            totalAmountMinorUnits: 1200000,
            paymentStatus: "CAPTURED",
            paymentMethod: "RAZORPAY",
            createdAt: new Date(),
            items: [{ productName: "Kanjivaram Silk", sku: "RASA-K1", quantity: 1, unitPriceMinorUnits: 1200000 }],
            payments: [{ id: "pay-1", transactionId: "pay_123", amountMinorUnits: 1200000, currency: "INR", status: "CAPTURED", createdAt: new Date() }],
          },
        ],
        reviews: [],
      });
      (prisma.auditLog.create as any).mockResolvedValue({});

      const exported = await privacyService.exportCustomerData("cust-1", { userId: "admin-1" });

      expect(exported.profile.name).toBe("Ananya Iyer");
      expect(exported.profile.email).toBe("patron@example.com");
      expect(exported.addresses.length).toBe(1);
      expect(exported.orders.length).toBe(1);

      // Verify no passwords or tokens in export
      expect((exported as any).passwordHash).toBeUndefined();
      expect((exported as any).sessions).toBeUndefined();
    });

    it("anonymizes personal identifiers on deletion request while preserving financial/tax records", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "cust-to-delete",
        email: "delete.me@example.com",
        name: "Rohan Varma",
        phone: "+919876543211",
        orders: [{ id: "order-hist-1", shippingAddress: JSON.stringify({ city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "India" }) }],
        sessions: [{ id: "s-1" }],
        addresses: [{ id: "a-1" }],
      });
      (prisma.session.deleteMany as any).mockResolvedValue({});
      (prisma.address.deleteMany as any).mockResolvedValue({});
      (prisma.cart.deleteMany as any).mockResolvedValue({});
      (prisma.wishlist.deleteMany as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.order.update as any).mockResolvedValue({});
      (prisma.orderAddressSnapshot.updateMany as any).mockResolvedValue({});
      (prisma.payment.count as any).mockResolvedValue(1);
      (prisma.auditLog.create as any).mockResolvedValue({});

      const result = await privacyService.deleteCustomerData({
        userIdOrEmail: "cust-to-delete",
        reason: "Customer GDPR erasure right requested via support portal.",
        actor: { userId: "admin-1", email: "admin@rasa.com", role: "ADMIN" },
      });

      expect(result.success).toBe(true);
      expect(result.recordsPreservedForLegalCompliance.ordersRetained).toBe(1);
      expect(result.recordsPreservedForLegalCompliance.paymentsRetained).toBe(1);
      expect(prisma.session.deleteMany).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Anonymized Patron",
            phone: null,
            isActive: false,
          }),
        })
      );
    });

    it("rejects deletion requests with missing or empty reason", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "cust-1",
        email: "c@example.com",
        orders: [],
      });

      await expect(
        privacyService.deleteCustomerData({
          userIdOrEmail: "cust-1",
          reason: "   ",
          actor: { userId: "admin-1" },
        })
      ).rejects.toThrowError(/formal reason/i);
    });

    it("updates customer communication preferences and logs audit entry", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "cust-pref",
        email: "c@example.com",
        notificationPreferences: JSON.stringify({ orderAlerts: true }),
      });
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.auditLog.create as any).mockResolvedValue({});

      const res = await privacyService.updatePreferences(
        "cust-pref",
        { emailMarketing: false, whatsappUpdates: false },
        { userId: "admin-1" }
      );

      expect(res.success).toBe(true);
      expect(res.preferences.emailMarketing).toBe(false);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
