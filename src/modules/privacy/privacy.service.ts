import { prisma } from "@/lib/db/prisma";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { auditService, AuditActor } from "@/modules/audit/audit.service";

export interface CustomerExportData {
  exportedAt: string;
  retentionNotice: string;
  profile: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
  };
  communicationPreferences: Record<string, boolean>;
  addresses: Array<{
    id: string;
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmountMinorUnits: number;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    items: Array<{
      productName: string;
      sku: string;
      quantity: number;
      unitPriceMinorUnits: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    transactionId: string;
    amountMinorUnits: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    title: string | null;
    comment: string;
    createdAt: string;
  }>;
}

export interface CustomerDeletionResult {
  success: boolean;
  userId: string;
  message: string;
  anonymizedAt: string;
  recordsPreservedForLegalCompliance: {
    ordersRetained: number;
    paymentsRetained: number;
    statutoryJustification: string;
  };
}

export class PrivacyService {
  /**
   * Generates a portable, comprehensive, structured data export for a patron.
   * Internal sensitive secrets, password hashes, and staff audit logs are strictly excluded.
   */
  async exportCustomerData(
    userIdOrEmail: string,
    actor?: AuditActor
  ): Promise<CustomerExportData> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userIdOrEmail }, { email: userIdOrEmail.toLowerCase().trim() }],
      },
      include: {
        addresses: true,
        orders: {
          include: {
            items: true,
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        },
        reviews: true,
      },
    });

    if (!user) {
      throw new NotFoundError("Customer account not found.");
    }

    let parsedPreferences: Record<string, boolean> = {
      orderAlerts: true,
      emailMarketing: false,
      whatsappUpdates: false,
    };

    if (user.notificationPreferences) {
      try {
        parsedPreferences = JSON.parse(user.notificationPreferences);
      } catch {
        // use defaults
      }
    }

    const exportPayload: CustomerExportData = {
      exportedAt: new Date().toISOString(),
      retentionNotice:
        "Data provided pursuant to applicable Data Protection Regulations (DPDPA / GDPR). Financial records and commercial tax invoices are retained in accordance with statutory accounting requirements.",
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      communicationPreferences: parsedPreferences,
      addresses: user.addresses.map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        street: a.street,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        country: a.country,
        isDefault: a.isDefault,
      })),
      orders: user.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmountMinorUnits: o.totalAmountMinorUnits,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({
          productName: i.productName,
          sku: i.sku,
          quantity: i.quantity,
          unitPriceMinorUnits: i.unitPriceMinorUnits,
        })),
      })),
      payments: user.orders.flatMap((o) =>
        o.payments.map((p) => ({
          id: p.id,
          transactionId: p.transactionId,
          amountMinorUnits: p.amountMinorUnits,
          currency: p.currency,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        }))
      ),
      reviews: user.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    };

    // Audit log
    await auditService.record({
      actor,
      action: "CUSTOMER_DATA_EXPORTED",
      entity: "User",
      entityId: user.id,
      details: {
        customerEmail: user.email,
        exportedOrderCount: user.orders.length,
        exportedAddressCount: user.addresses.length,
      },
    });

    return exportPayload;
  }

  /**
   * Executes a GDPR / DPDPA customer erasure request.
   * Strips all marketing, address, session, and personal identifiers.
   * Strictly preserves commercial tax invoices and financial transaction records (7-year legal rule).
   */
  async deleteCustomerData(params: {
    userIdOrEmail: string;
    reason: string;
    actor: AuditActor;
    ipAddress?: string;
  }): Promise<CustomerDeletionResult> {
    const { userIdOrEmail, reason, actor, ipAddress } = params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userIdOrEmail }, { email: userIdOrEmail.toLowerCase().trim() }],
      },
      include: {
        orders: true,
        sessions: true,
        addresses: true,
      },
    });

    if (!user) {
      throw new NotFoundError("Customer account not found.");
    }

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestError("A formal reason for customer data deletion must be provided.");
    }

    const anonymizedEmail = `deleted_${user.id.slice(0, 8)}_${Date.now()}@anonymized.invalid`;
    const beforeState = {
      email: user.email,
      name: user.name,
      phone: user.phone,
      orderCount: user.orders.length,
    };

    await prisma.$transaction(async (tx) => {
      // 1. Invalidate all active sessions
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      // 2. Remove patron delivery addresses
      await tx.address.deleteMany({
        where: { userId: user.id },
      });

      // 3. Clear cart and wishlist
      await tx.cart.deleteMany({
        where: { userId: user.id },
      });
      await tx.wishlist.deleteMany({
        where: { userId: user.id },
      });

      // 4. Anonymize user profile (deactivate and redact PII)
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: "Anonymized Patron",
          email: anonymizedEmail,
          phone: null,
          isActive: false,
          passwordHash: "$2b$10$DELETED_ACCOUNT_INACCESSIBLE_HASH_PLACEHOLDER",
          notificationPreferences: JSON.stringify({
            orderAlerts: false,
            emailMarketing: false,
            whatsappUpdates: false,
            anonymizedAt: new Date().toISOString(),
          }),
        },
      });

      // 5. Keep orders and payments intact for legal and tax compliance, but anonymize customer snapshot in orders
      for (const order of user.orders) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            guestEmail: null,
            guestPhone: null,
          },
        });

        // Redact personal name and street in snapshot, preserving city, state, pincode for tax reporting
        await tx.orderAddressSnapshot.updateMany({
          where: { orderId: order.id },
          data: {
            name: "Anonymized Patron",
            phone: "0000000000",
            street: "Redacted for Privacy",
            landmark: null,
          },
        });
      }
    });

    const paymentCount = await prisma.payment.count({
      where: { order: { userId: user.id } },
    });

    // Record audit log
    await auditService.record({
      actor,
      action: "CUSTOMER_DATA_DELETED",
      entity: "User",
      entityId: user.id,
      before: beforeState,
      after: {
        email: anonymizedEmail,
        name: "Anonymized Patron",
        isActive: false,
      },
      details: {
        reason,
        retainedOrdersCount: user.orders.length,
        legalJustification:
          "Preserved core order values and payment logs under Indian statutory 7-year accounting and taxation mandates.",
      },
      ipAddress,
    });

    return {
      success: true,
      userId: user.id,
      message:
        "Customer personal identifiers deleted and account deactivated. Financial and tax order history preserved for statutory accounting compliance.",
      anonymizedAt: new Date().toISOString(),
      recordsPreservedForLegalCompliance: {
        ordersRetained: user.orders.length,
        paymentsRetained: paymentCount,
        statutoryJustification:
          "Mandated under Section 128 of the Companies Act, 2013 & GST statutory requirements (7-year financial record retention).",
      },
    };
  }

  /**
   * Updates communication and marketing preferences for a customer
   */
  async updatePreferences(
    userIdOrEmail: string,
    preferences: {
      emailMarketing?: boolean;
      orderAlerts?: boolean;
      whatsappUpdates?: boolean;
    },
    actor?: AuditActor
  ) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userIdOrEmail }, { email: userIdOrEmail.toLowerCase().trim() }],
      },
    });

    if (!user) {
      throw new NotFoundError("Customer account not found.");
    }

    let existingPrefs: any = {};
    if (user.notificationPreferences) {
      try {
        existingPrefs = JSON.parse(user.notificationPreferences);
      } catch {
        existingPrefs = {};
      }
    }

    const updated = {
      ...existingPrefs,
      ...preferences,
      updatedAt: new Date().toISOString(),
    };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        notificationPreferences: JSON.stringify(updated),
      },
    });

    await auditService.record({
      actor,
      action: "CUSTOMER_PREFERENCES_UPDATED",
      entity: "User",
      entityId: user.id,
      before: existingPrefs,
      after: updated,
      details: {
        customerEmail: user.email,
      },
    });

    return {
      success: true,
      userId: user.id,
      preferences: updated,
    };
  }
}

export const privacyService = new PrivacyService();
