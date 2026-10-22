import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddressService } from "@/modules/addresses/address.service";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { AddressType } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    address: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      return await cb(prisma);
    }),
  },
}));

describe("Address Management & IDOR Ownership Enforcement", () => {
  const addressService = new AddressService();

  const userA = "customer-uuid-aaa";
  const userB = "customer-uuid-bbb";

  const addressOfUserA = {
    id: "addr-001",
    userId: userA,
    name: "Customer A",
    phone: "9876543210",
    street: "100 Palace Road",
    landmark: null,
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    country: "India",
    type: AddressType.SHIPPING,
    isDefault: true,
    deliveryInstructions: "Ring bell twice",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("IDOR Protection on Retrieval", () => {
    it("should allow the legitimate owner (User A) to retrieve their address", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(addressOfUserA as any);

      const result = await addressService.getAddressById("addr-001", userA);
      expect(result).toEqual(addressOfUserA);
      expect(prisma.address.findUnique).toHaveBeenCalledWith({ where: { id: "addr-001" } });
    });

    it("should throw ForbiddenError (403) when User B attempts to access User A's address", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(addressOfUserA as any);

      await expect(
        addressService.getAddressById("addr-001", userB)
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw NotFoundError (404) when address does not exist", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(null);

      await expect(
        addressService.getAddressById("non-existent-addr", userA)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("IDOR Protection on Mutation (Update / Delete / SetDefault)", () => {
    it("should prevent User B from updating User A's address", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(addressOfUserA as any);

      await expect(
        addressService.updateAddress("addr-001", userB, { name: "Malicious Name" })
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.address.update).not.toHaveBeenCalled();
    });

    it("should prevent User B from deleting User A's address", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(addressOfUserA as any);

      await expect(
        addressService.deleteAddress("addr-001", userB)
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.address.delete).not.toHaveBeenCalled();
    });

    it("should prevent User B from setting User A's address as default", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(addressOfUserA as any);

      await expect(
        addressService.setDefault("addr-001", userB)
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.address.update).not.toHaveBeenCalled();
    });
  });

  describe("Legitimate Address Operations", () => {
    it("should allow User A to set their address as default and reset other defaults", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(addressOfUserA as any);
      vi.mocked(prisma.address.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.address.update).mockResolvedValue({ ...addressOfUserA, isDefault: true } as any);

      const result = await addressService.setDefault("addr-001", userA, AddressType.SHIPPING);
      expect(result.isDefault).toBe(true);

      // Verify transaction reset others first
      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: userA, type: AddressType.SHIPPING },
        data: { isDefault: false },
      });
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: "addr-001" },
        data: { isDefault: true, type: AddressType.SHIPPING },
      });
    });

    it("should allow User A to delete their own address", async () => {
      vi.mocked(prisma.address.findUnique).mockResolvedValue(addressOfUserA as any);
      vi.mocked(prisma.address.delete).mockResolvedValue(addressOfUserA as any);

      const result = await addressService.deleteAddress("addr-001", userA);
      expect(result.success).toBe(true);
      expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: "addr-001" } });
    });
  });
});
