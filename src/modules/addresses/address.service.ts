import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api/errors";
import { AddressInput, UpdateAddressInput } from "./address.schema";
import { AddressType } from "@prisma/client";

export class AddressService {
  /**
   * List all saved addresses for a customer
   */
  async listAddresses(userId: string) {
    return await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Fetch single address by ID with strict ownership check (IDOR protection)
   */
  async getAddressById(id: string, userId: string) {
    const address = await prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundError("Address");
    }

    if (address.userId !== userId) {
      throw new ForbiddenError("You are not authorized to access this address.");
    }

    return address;
  }

  /**
   * Create a new address for authenticated customer
   */
  async createAddress(userId: string, input: AddressInput) {
    return await prisma.$transaction(async (tx) => {
      // If this address is set as default, reset previous default of same type
      if (input.isDefault) {
        await tx.address.updateMany({
          where: { userId, type: input.type },
          data: { isDefault: false },
        });
      }

      // If it's the customer's very first address, automatically make it default
      const count = await tx.address.count({ where: { userId, type: input.type } });
      const shouldBeDefault = input.isDefault || count === 0;

      return await tx.address.create({
        data: {
          userId,
          name: input.name,
          phone: input.phone,
          street: input.street,
          landmark: input.landmark || null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country || "India",
          type: input.type || AddressType.SHIPPING,
          isDefault: shouldBeDefault,
          deliveryInstructions: input.deliveryInstructions || null,
        },
      });
    });
  }

  /**
   * Update address with strict ownership check (IDOR protection)
   */
  async updateAddress(id: string, userId: string, input: UpdateAddressInput) {
    // 1. Verify existence and ownership
    await this.getAddressById(id, userId);

    return await prisma.$transaction(async (tx) => {
      // If setting as default, unset others of same type
      if (input.isDefault && input.type) {
        await tx.address.updateMany({
          where: { userId, type: input.type, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return await tx.address.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.street !== undefined ? { street: input.street } : {}),
          ...(input.landmark !== undefined ? { landmark: input.landmark || null } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          ...(input.deliveryInstructions !== undefined
            ? { deliveryInstructions: input.deliveryInstructions || null }
            : {}),
        },
      });
    });
  }

  /**
   * Delete saved address with strict ownership check (IDOR protection)
   */
  async deleteAddress(id: string, userId: string) {
    await this.getAddressById(id, userId);

    await prisma.address.delete({
      where: { id },
    });

    return { success: true, message: "Address deleted successfully." };
  }

  /**
   * Set an address as default shipping or billing
   */
  async setDefault(id: string, userId: string, type: AddressType = AddressType.SHIPPING) {
    await this.getAddressById(id, userId);

    return await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, type },
        data: { isDefault: false },
      });

      return await tx.address.update({
        where: { id },
        data: { isDefault: true, type },
      });
    });
  }
}

export const addressService = new AddressService();
