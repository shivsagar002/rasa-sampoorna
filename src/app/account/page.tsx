"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: "SHIPPING" | "BILLING";
  isDefault: boolean;
  deliveryInstructions?: string | null;
}

interface OrderItemSummary {
  id: string;
  productName: string;
  productImage: string;
  quantity: number;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItemSummary[];
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
  emailVerified?: string | null;
  createdAt: string;
  notificationPreferences: {
    orderUpdates: boolean;
    promotions: boolean;
    artisanStories: boolean;
  };
  addresses: Address[];
  orders: OrderSummary[];
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "security" | "orders">("profile");

  // Edit Profile Form State
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [notifOrderUpdates, setNotifOrderUpdates] = useState(true);
  const [notifPromotions, setNotifPromotions] = useState(false);
  const [notifArtisanStories, setNotifArtisanStories] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Verification Resend
  const [isResendingVerify, setIsResendingVerify] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState("");

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Address State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    type: "SHIPPING" as "SHIPPING" | "BILLING",
    isDefault: false,
    deliveryInstructions: "",
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Account Deletion State
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState("");

  // Load Profile on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (isMounted && data.success && data.data) {
          setProfile(data.data);
          setProfileName(data.data.name || "");
          setProfilePhone(data.data.phone || "");
          if (data.data.notificationPreferences) {
            setNotifOrderUpdates(!!data.data.notificationPreferences.orderUpdates);
            setNotifPromotions(!!data.data.notificationPreferences.promotions);
            setNotifArtisanStories(!!data.data.notificationPreferences.artisanStories);
          }
        }
      } catch {
        if (isMounted) router.push("/login");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileFeedback(null);

    try {
      const res = await fetch("/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          notificationPreferences: {
            orderUpdates: notifOrderUpdates,
            promotions: notifPromotions,
            artisanStories: notifArtisanStories,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to update profile.");

      setProfileFeedback({ text: "Profile information updated successfully." });
      setProfile((prev) => (prev ? { ...prev, name: profileName, phone: profilePhone } : prev));
    } catch (err: unknown) {
      setProfileFeedback({
        text: err instanceof Error ? err.message : "Failed to update profile.",
        isError: true,
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerify(true);
    setVerifyFeedback("");
    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setVerifyFeedback(data.message || "A fresh verification link has been sent to your email.");
    } catch {
      setVerifyFeedback("Failed to send verification email. Please try again.");
    } finally {
      setIsResendingVerify(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ text: "New passwords do not match.", isError: true });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to change password.");

      setPasswordFeedback({ text: "Your password has been changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordFeedback({
        text: err instanceof Error ? err.message : "Failed to change password.",
        isError: true,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    setAddressFeedback(null);

    try {
      const res = await fetch("/api/v1/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to save address.");

      setProfile((prev) => {
        if (!prev) return prev;
        const updatedList = [data.data, ...prev.addresses];
        return { ...prev, addresses: updatedList };
      });
      setShowAddressForm(false);
      setAddressForm({
        name: "",
        phone: "",
        street: "",
        landmark: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        type: "SHIPPING",
        isDefault: false,
        deliveryInstructions: "",
      });
      setAddressFeedback({ text: "New address saved successfully." });
    } catch (err: unknown) {
      setAddressFeedback({
        text: err instanceof Error ? err.message : "Failed to save address.",
        isError: true,
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      const res = await fetch(`/api/v1/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProfile((prev) =>
          prev ? { ...prev, addresses: prev.addresses.filter((a) => a.id !== id) } : prev
        );
      }
    } catch {
      alert("Failed to delete address.");
    }
  };

  const handleSetDefaultAddress = async (id: string, type: "SHIPPING" | "BILLING") => {
    try {
      const res = await fetch(`/api/v1/addresses/${id}/default`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        setProfile((prev) => {
          if (!prev) return prev;
          const updated = prev.addresses.map((a) =>
            a.id === id ? { ...a, isDefault: true, type } : a.type === type ? { ...a, isDefault: false } : a
          );
          return { ...prev, addresses: updated };
        });
      }
    } catch {
      alert("Failed to set default address.");
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      setDeleteFeedback('Please type "DELETE MY ACCOUNT" exactly to confirm.');
      return;
    }
    setIsDeletingAccount(true);
    setDeleteFeedback("");

    try {
      const res = await fetch("/api/v1/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirmationText: deleteConfirmation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to delete account.");

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setDeleteFeedback(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ backgroundColor: "var(--bg-cream, #f7f4ee)", minHeight: "100vh" }}>
        <SiteHeader solidBackground />
        <div style={{ padding: "120px 20px", textAlign: "center", color: "var(--text-muted, #8c7d70)" }}>
          Loading account details...
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-cream, #f7f4ee)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader solidBackground />

      <main style={{ flex: 1, maxWidth: "1240px", margin: "0 auto", width: "100%", padding: "40px 20px 100px" }}>
        {/* Customer Header Banner */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "32px",
            border: "1px solid var(--border-light, #e8dfd5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "32px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
          }}
        >
          <div>
            <h1 className="font-serif" style={{ fontSize: "32px", fontWeight: 500, color: "var(--text-primary)" }}>
              {profile.name}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
              {profile.email} &bull; Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
              {profile.emailVerified ? (
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    backgroundColor: "#e6fffa",
                    color: "#234e52",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Verified Email
                </span>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      backgroundColor: "#fffaf0",
                      color: "#7b341e",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Unverified
                  </span>
                  <button
                    onClick={handleResendVerification}
                    disabled={isResendingVerify}
                    style={{
                      fontSize: "12px",
                      color: "var(--accent-gold, #8c7355)",
                      textDecoration: "underline",
                      fontWeight: 500,
                    }}
                  >
                    {isResendingVerify ? "Sending..." : "Resend Verification"}
                  </button>
                </div>
              )}
              {verifyFeedback && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{verifyFeedback}</span>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "10px 22px",
              backgroundColor: "transparent",
              border: "1px solid var(--border-light, #e8dfd5)",
              color: "var(--text-primary)",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid var(--border-light, #e8dfd5)",
            marginBottom: "32px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "profile", label: "Profile & Preferences" },
            { id: "addresses", label: `Saved Addresses (${profile.addresses.length})` },
            { id: "orders", label: `Recent Orders (${profile.orders.length})` },
            { id: "security", label: "Security & Password" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: "12px 20px",
                fontSize: "15px",
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: activeTab === tab.id ? "2px solid var(--btn-dark)" : "2px solid transparent",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Profile & Preferences */}
        {activeTab === "profile" && (
          <div style={{ maxWidth: "680px" }}>
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                padding: "32px",
                border: "1px solid var(--border-light, #e8dfd5)",
              }}
            >
              <h2 className="font-serif" style={{ fontSize: "22px", fontWeight: 600, marginBottom: "20px" }}>
                Personal Information
              </h2>

              {profileFeedback && (
                <div
                  style={{
                    padding: "12px 16px",
                    backgroundColor: profileFeedback.isError ? "#fff5f5" : "#f0fff4",
                    color: profileFeedback.isError ? "#c53030" : "#22543d",
                    border: `1px solid ${profileFeedback.isError ? "#feb2b2" : "#9ae6b4"}`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    marginBottom: "20px",
                  }}
                >
                  {profileFeedback.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light, #e8dfd5)",
                      fontSize: "15px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    Email Address (Immutable)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light, #e8dfd5)",
                      fontSize: "15px",
                      backgroundColor: "var(--bg-cream)",
                      color: "var(--text-muted)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="9876543210"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light, #e8dfd5)",
                      fontSize: "15px",
                    }}
                  />
                </div>

                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "20px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Notification Preferences</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={notifOrderUpdates}
                        onChange={(e) => setNotifOrderUpdates(e.target.checked)}
                      />
                      <span>Receive order updates and courier dispatch notifications</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={notifArtisanStories}
                        onChange={(e) => setNotifArtisanStories(e.target.checked)}
                      />
                      <span>Receive curated artisan craft stories and heirloom care tips</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={notifPromotions}
                        onChange={(e) => setNotifPromotions(e.target.checked)}
                      />
                      <span>Receive invitations to private collection previews</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "12px",
                    padding: "12px 28px",
                    backgroundColor: "var(--btn-dark)",
                    color: "#f7f4ee",
                    borderRadius: "9999px",
                    fontSize: "14px",
                    fontWeight: 600,
                    opacity: isUpdatingProfile ? 0.7 : 1,
                  }}
                >
                  {isUpdatingProfile ? "Saving..." : "Save Preferences"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Saved Addresses */}
        {activeTab === "addresses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Manage your delivery addresses for seamless checkout.
              </p>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                style={{
                  padding: "10px 22px",
                  backgroundColor: "var(--btn-dark)",
                  color: "#f7f4ee",
                  borderRadius: "9999px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {showAddressForm ? "Cancel" : "+ Add New Address"}
              </button>
            </div>

            {addressFeedback && (
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: addressFeedback.isError ? "#fff5f5" : "#f0fff4",
                  color: addressFeedback.isError ? "#c53030" : "#22543d",
                  border: `1px solid ${addressFeedback.isError ? "#feb2b2" : "#9ae6b4"}`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  marginBottom: "20px",
                }}
              >
                {addressFeedback.text}
              </div>
            )}

            {/* Add Address Form */}
            {showAddressForm && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "32px",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  marginBottom: "32px",
                  maxWidth: "680px",
                }}
              >
                <h3 className="font-serif" style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px" }}>
                  Add Delivery Address
                </h3>
                <form onSubmit={handleSaveAddress} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.name}
                      onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                      placeholder="Priya Sharma"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      placeholder="9876543210"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Street Address
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      placeholder="Flat 402, Lotus Residency, 12th Main"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={addressForm.landmark}
                      onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                      placeholder="Near BDA Complex"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      placeholder="Bengaluru"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      placeholder="Karnataka"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      PIN Code (6 Digits)
                    </label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]{6}"
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                      placeholder="560038"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={addressForm.deliveryInstructions}
                      onChange={(e) => setAddressForm({ ...addressForm, deliveryInstructions: e.target.value })}
                      placeholder="e.g. Leave with security desk"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "14px" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="addr-default"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    />
                    <label htmlFor="addr-default" style={{ fontSize: "14px", cursor: "pointer" }}>
                      Set as default shipping address
                    </label>
                  </div>

                  <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      style={{
                        padding: "12px 28px",
                        backgroundColor: "var(--btn-dark)",
                        color: "#f7f4ee",
                        borderRadius: "9999px",
                        fontSize: "14px",
                        fontWeight: 600,
                        opacity: isSavingAddress ? 0.7 : 1,
                      }}
                    >
                      {isSavingAddress ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Address Cards */}
            {profile.addresses.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  border: "1px solid var(--border-light)",
                }}
              >
                <p style={{ color: "var(--text-muted)" }}>No saved addresses yet. Add one above to speed up checkout.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {profile.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      padding: "24px",
                      border: "1px solid var(--border-light)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {addr.name}
                        </h4>
                        {addr.isDefault && (
                          <span
                            style={{
                              padding: "2px 8px",
                              backgroundColor: "var(--bg-cream)",
                              color: "var(--accent-gold)",
                              borderRadius: "9999px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            Default {addr.type.toLowerCase()}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {addr.street}
                        {addr.landmark ? `, ${addr.landmark}` : ""}
                        <br />
                        {addr.city}, {addr.state} — {addr.postalCode}
                        <br />
                        Phone: {addr.phone}
                      </p>
                      {addr.deliveryInstructions && (
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", fontStyle: "italic" }}>
                          Note: {addr.deliveryInstructions}
                        </p>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--border-light)" }}>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id, addr.type)}
                          style={{ fontSize: "12px", color: "var(--accent-gold)", fontWeight: 600 }}
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        style={{ fontSize: "12px", color: "#c53030", fontWeight: 500, marginLeft: "auto" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Recent Orders */}
        {activeTab === "orders" && (
          <div>
            {profile.orders.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  border: "1px solid var(--border-light)",
                }}
              >
                <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>You have not placed any orders yet.</p>
                <Link
                  href="/shop"
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    backgroundColor: "var(--btn-dark)",
                    color: "#f7f4ee",
                    borderRadius: "9999px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Explore Sarees
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {profile.orders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      padding: "24px",
                      border: "1px solid var(--border-light)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, fontSize: "16px" }}>{ord.orderNumber}</span>
                        <span
                          style={{
                            padding: "2px 8px",
                            backgroundColor: "var(--bg-cream)",
                            color: "var(--text-secondary)",
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                        Placed on {new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        {ord.items.map((item) => (
                          <span
                            key={item.id}
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              backgroundColor: "var(--bg-card)",
                              borderRadius: "4px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {item.productName} &times; {item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                      <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>
                        ₹{ord.totalAmount.toLocaleString("en-IN")}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Link
                          href={`/orders/${ord.id}`}
                          style={{
                            padding: "6px 14px",
                            backgroundColor: "var(--bg-cream)",
                            border: "1px solid var(--border-light)",
                            color: "var(--text-primary)",
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          View Details & Tracking &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Security & Password */}
        {activeTab === "security" && (
          <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Change Password Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                padding: "32px",
                border: "1px solid var(--border-light, #e8dfd5)",
              }}
            >
              <h2 className="font-serif" style={{ fontSize: "22px", fontWeight: 600, marginBottom: "20px" }}>
                Change Password
              </h2>

              {passwordFeedback && (
                <div
                  style={{
                    padding: "12px 16px",
                    backgroundColor: passwordFeedback.isError ? "#fff5f5" : "#f0fff4",
                    color: passwordFeedback.isError ? "#c53030" : "#22543d",
                    border: `1px solid ${passwordFeedback.isError ? "#feb2b2" : "#9ae6b4"}`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    marginBottom: "20px",
                  }}
                >
                  {passwordFeedback.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light, #e8dfd5)",
                      fontSize: "15px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light, #e8dfd5)",
                      fontSize: "15px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light, #e8dfd5)",
                      fontSize: "15px",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "8px",
                    padding: "12px 28px",
                    backgroundColor: "var(--btn-dark)",
                    color: "#f7f4ee",
                    borderRadius: "9999px",
                    fontSize: "14px",
                    fontWeight: 600,
                    opacity: isChangingPassword ? 0.7 : 1,
                  }}
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>

            {/* Delete Account Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                padding: "32px",
                border: "1px solid #feb2b2",
              }}
            >
              <h2 className="font-serif" style={{ fontSize: "20px", fontWeight: 600, color: "#c53030", marginBottom: "8px" }}>
                Delete Account
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
                Permanently deactivates your patron profile and removes your active credentials. Statutory financial and tax records related to previously completed purchases are retained in compliance with regulations.
              </p>

              {deleteFeedback && (
                <div
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "#fff5f5",
                    color: "#c53030",
                    border: "1px solid #feb2b2",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  {deleteFeedback}
                </div>
              )}

              <form onSubmit={handleDeleteAccount} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Account Password
                  </label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light)",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Type <code style={{ color: "#c53030", fontWeight: "bold" }}>DELETE MY ACCOUNT</code> to confirm
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light)",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isDeletingAccount}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "6px",
                    padding: "10px 24px",
                    backgroundColor: "#c53030",
                    color: "#ffffff",
                    borderRadius: "9999px",
                    fontSize: "13px",
                    fontWeight: 600,
                    opacity: isDeletingAccount ? 0.7 : 1,
                  }}
                >
                  {isDeletingAccount ? "Processing..." : "Confirm Account Deletion"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <MobileBottomBar />
      <SiteFooter />
    </div>
  );
}
