"use client";

import { useState, useEffect } from "react";
import { ALL_PERMISSIONS } from "@/modules/rbac/permissions";

interface AdminStaffTabProps {
  currentUser?: { id: string; email: string; name: string; role: string } | null;
}

interface StaffSummary {
  totalStaff: number;
  activeUsers: number;
  pendingInvitations: number | null;
  mfaEnabled: number;
  mfaTrackedStaff: number;
}

export function AdminStaffTab({ currentUser }: AdminStaffTabProps) {
  const [viewMode, setViewMode] = useState<"staff" | "all_users">("staff");
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [accountStatusFilter, setAccountStatusFilter] = useState("ALL");
  const [mfaFilter, setMfaFilter] = useState("ALL");
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState<string>("CUSTOMER_SUPPORT");
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Authenticated user state
  const [activeUser, setActiveUser] = useState<any>(currentUser || null);

  // Keep activeUser synchronized when currentUser prop updates
  useEffect(() => {
    if (currentUser) {
      setActiveUser(currentUser);
    }
  }, [currentUser]);

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
    phone: "",
  });

  // Credential management state inside modal
  const [credentialsPassword, setCredentialsPassword] = useState("");
  const [updatingCredentials, setUpdatingCredentials] = useState(false);

  // Fetch active user identity if not provided via props
  useEffect(() => {
    if (!activeUser) {
      fetch("/api/v1/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data) {
            setActiveUser(json.data);
          }
        })
        .catch(() => {});
    }
  }, [activeUser]);

  const isSuperAdmin = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "OWNER";

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/staff");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load staff.");
      setStaff(json.staff || []);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to load staff.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffSummary = async () => {
    try {
      const res = await fetch("/api/v1/admin/staff/summary");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load staff totals.");
      setStaffSummary(json.data);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to load staff totals.", type: "error" });
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load users.");
      setUsers(json.data?.users || []);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to load users.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "staff") {
      void Promise.all([fetchStaff(), fetchStaffSummary()]);
    } else {
      fetchAllUsers();
    }
  }, [viewMode]);

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedStaff.userId,
          newRole,
          customPermissions,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update staff role.");
      }

      setMessage({ text: json.message || "Role updated successfully.", type: "success" });
      setSelectedStaff(null);
      fetchStaff();
      fetchAllUsers();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create user.");
      }

      setMessage({ text: `User '${newUserForm.name}' (${newUserForm.role}) created successfully!`, type: "success" });
      setShowAddUserModal(false);
      setNewUserForm({ name: "", email: "", password: "", role: "STAFF", phone: "" });
      fetchStaff();
      fetchAllUsers();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmittingUser(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          name: newUserForm.name.trim(),
          email: newUserForm.email.trim(),
          phone: newUserForm.phone.trim(),
          role: newUserForm.role,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update user.");

      setMessage({ text: `User '${newUserForm.name}' updated successfully.`, type: "success" });
      setShowAddUserModal(false);
      setEditingUser(null);
      await Promise.all([fetchStaff(), fetchAllUsers(), fetchStaffSummary()]);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to update user.", type: "error" });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserActive = async (user: any) => {
    const nextActive = !user.isActive;
    if (!nextActive && !window.confirm(`Deactivate ${user.name}'s account?`)) return;
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isActive: nextActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update account status.");
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, isActive: nextActive } : item));
      setMessage({
        text: `${user.name}'s account ${nextActive ? "activated" : "deactivated"}.`,
        type: "success",
      });
      await Promise.all([fetchStaff(), fetchStaffSummary()]);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to update account status.", type: "error" });
    }
  };

  const openUserEditor = (user: any) => {
    setEditingUser(user);
    setNewUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "CUSTOMER",
      phone: user.phone || "",
    });
    setShowAddUserModal(true);
  };

  const handleUpdateCredentials = async () => {
    if (!selectedStaff || !credentialsPassword || credentialsPassword.length < 6) return;
    setUpdatingCredentials(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStaff.userId,
          password: credentialsPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update password credentials.");
      }

      setMessage({ text: `Credentials for ${selectedStaff.name} updated successfully!`, type: "success" });
      setCredentialsPassword("");
      fetchStaff();
      fetchAllUsers();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setUpdatingCredentials(false);
    }
  };

  // Hierarchy Weight Helper: Super Admin (Owner) on top (1), then Admin (2), then Staff (3-5), then Customer (6)
  const getRoleWeight = (roleOrAssigned: string) => {
    switch (roleOrAssigned) {
      case "SUPER_ADMIN":
      case "OWNER":
        return 1;
      case "ADMIN":
      case "ADMINISTRATOR":
        return 2;
      case "CATALOG_MANAGER":
        return 3;
      case "ORDER_FULFILLMENT_MANAGER":
        return 4;
      case "CUSTOMER_SUPPORT":
      case "STAFF":
        return 5;
      default:
        return 6;
    }
  };

  const filteredStaff = staff.filter((member) => {
    const term = staffSearch.trim().toLowerCase();
    if (term && !member.name.toLowerCase().includes(term) && !member.email.toLowerCase().includes(term)) return false;
    if (roleFilter !== "ALL" && member.assignedRole !== roleFilter && member.baseRole !== roleFilter) return false;
    if (accountStatusFilter === "ACTIVE" && !member.isActive) return false;
    if (accountStatusFilter === "INACTIVE" && member.isActive) return false;
    if (mfaFilter === "ENABLED" && !member.mfaEnabled) return false;
    if (mfaFilter === "DISABLED" && member.mfaEnabled) return false;
    return true;
  });

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    const wA = getRoleWeight(a.assignedRole || a.baseRole);
    const wB = getRoleWeight(b.assignedRole || b.baseRole);
    return wA - wB;
  });

  const filteredUsers = users.filter((u) => {
    const term = userSearch.trim().toLowerCase();
    if (term && !u.name?.toLowerCase().includes(term) && !u.email?.toLowerCase().includes(term) && !u.phone?.includes(term)) return false;
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (accountStatusFilter === "ACTIVE" && !u.isActive) return false;
    if (accountStatusFilter === "INACTIVE" && u.isActive) return false;
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const wA = getRoleWeight(a.role);
    const wB = getRoleWeight(b.role);
    return wA - wB;
  });

  const renderRoleBadge = (roleName: string) => {
    if (roleName === "SUPER_ADMIN" || roleName === "OWNER") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 700,
            backgroundColor: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fcd34d",
          }}
        >
          👑 Super Admin (Owner)
        </span>
      );
    }
    if (roleName === "ADMIN" || roleName === "ADMINISTRATOR") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: "#e0e7ff",
            color: "#3730a3",
            border: "1px solid #c7d2fe",
          }}
        >
          🛡️ Admin
        </span>
      );
    }
    if (
      roleName === "STAFF" ||
      roleName === "CATALOG_MANAGER" ||
      roleName === "ORDER_FULFILLMENT_MANAGER" ||
      roleName === "CUSTOMER_SUPPORT"
    ) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
          }}
        >
          👤 {roleName.replace(/_/g, " ")}
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          backgroundColor: "#f3f4f6",
          color: "#4b5563",
        }}
      >
        Shopper
      </span>
    );
  };

  const isSelectedSuperAdmin =
    selectedStaff && (selectedStaff.baseRole === "SUPER_ADMIN" || selectedStaff.assignedRole === "OWNER" || selectedStaff.role === "SUPER_ADMIN");

  const isSelectedAdmin =
    selectedStaff && (selectedStaff.baseRole === "ADMIN" || selectedStaff.assignedRole === "ADMINISTRATOR" || selectedStaff.role === "ADMIN");

  const isSelectedStaff = !isSelectedSuperAdmin && !isSelectedAdmin;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Alert Bar */}
      {message && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "6px",
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
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>
            ✕
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        {[
          { label: "Total Staff", value: staffSummary?.totalStaff },
          { label: "Active Users", value: staffSummary?.activeUsers },
          { label: "Pending Invitations", value: staffSummary?.pendingInvitations ?? "Not tracked" },
          { label: "MFA Enabled", value: staffSummary ? `${staffSummary.mfaEnabled} / ${staffSummary.mfaTrackedStaff}` : "—" },
        ].map((card) => (
          <div key={card.label} style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>{card.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-primary)", marginTop: "5px" }}>{card.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* Directory Card */}
      <div style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid var(--border-light, #e8dfd5)", overflow: "hidden" }}>
        {/* Header Controls */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-light, #e8dfd5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setViewMode("staff")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: viewMode === "staff" ? "1px solid #2e3830" : "1px solid #e8dfd5",
                backgroundColor: viewMode === "staff" ? "#2e3830" : "#fff",
                color: viewMode === "staff" ? "#f7f4ee" : "#2c2621",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Staff &amp; Admins ({staff.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all_users")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: viewMode === "all_users" ? "1px solid #2e3830" : "1px solid #e8dfd5",
                backgroundColor: viewMode === "all_users" ? "#2e3830" : "#fff",
                color: viewMode === "all_users" ? "#f7f4ee" : "#2c2621",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              All Users &amp; Customers ({users.length || "..."})
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="search"
              placeholder="Search name or email..."
              value={viewMode === "staff" ? staffSearch : userSearch}
              onChange={(event) => viewMode === "staff" ? setStaffSearch(event.target.value) : setUserSearch(event.target.value)}
              style={{ padding: "6px 12px", fontSize: "12px", border: "1px solid #e8dfd5", borderRadius: "6px", outline: "none", width: "190px" }}
            />
            <select
              aria-label="Filter users by role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid #e8dfd5", borderRadius: "6px", background: "#fff" }}
            >
              <option value="ALL">All roles</option>
              {["SUPER_ADMIN", "ADMIN", "STAFF", "CUSTOMER", "OWNER", "ADMINISTRATOR", "CATALOG_MANAGER", "ORDER_FULFILLMENT_MANAGER", "CUSTOMER_SUPPORT"].map((role) => (
                <option key={role} value={role}>{role.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select
              aria-label="Filter users by account status"
              value={accountStatusFilter}
              onChange={(event) => setAccountStatusFilter(event.target.value)}
              style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid #e8dfd5", borderRadius: "6px", background: "#fff" }}
            >
              <option value="ALL">All accounts</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
            {viewMode === "staff" && (
              <select
                aria-label="Filter staff by MFA status"
                value={mfaFilter}
                onChange={(event) => setMfaFilter(event.target.value)}
                style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid #e8dfd5", borderRadius: "6px", background: "#fff" }}
              >
                <option value="ALL">All MFA statuses</option>
                <option value="ENABLED">MFA enabled</option>
                <option value="DISABLED">MFA disabled</option>
              </select>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setNewUserForm({ name: "", email: "", password: "", role: "STAFF", phone: "" });
                setShowAddUserModal(true);
              }}
              style={{
                padding: "6px 14px",
                backgroundColor: "var(--accent-terracotta, #802a2a)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>+</span> Add User
            </button>
          </div>
        </div>

        {/* View Mode 1: Staff Directory */}
        {viewMode === "staff" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf8f5", textAlign: "left", color: "var(--text-muted, #8c7d70)" }}>
                  <th style={{ padding: "10px 16px" }}>Staff Member</th>
                  <th style={{ padding: "10px 16px" }}>Email</th>
                  <th style={{ padding: "10px 16px" }}>Base System Role</th>
                  <th style={{ padding: "10px 16px" }}>Hierarchy Role</th>
                  <th style={{ padding: "10px 16px" }}>MFA Protection</th>
                  <th style={{ padding: "10px 16px" }}>Status</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Management</th>
                </tr>
              </thead>
              <tbody>
                {sortedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "30px 16px", textAlign: "center", color: "#8c7d70" }}>
                      No staff members loaded.
                    </td>
                  </tr>
                ) : (
                  sortedStaff.map((s) => {
                    const isSuper = s.baseRole === "SUPER_ADMIN" || s.assignedRole === "OWNER";
                    const isAdmin = s.baseRole === "ADMIN" || s.assignedRole === "ADMINISTRATOR";

                    return (
                      <tr key={s.userId} style={{ borderTop: "1px solid #f0eae1" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "#2c2621" }}>{s.name}</td>
                        <td style={{ padding: "10px 16px", color: "#5a4e44" }}>{s.email}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 500, color: "#8c7d70" }}>{s.baseRole}</span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          {renderRoleBadge(s.assignedRole || s.baseRole)}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ color: s.mfaEnabled ? "#205a3c" : "#b45309", fontWeight: 500 }}>
                            {s.mfaEnabled ? "Enforced" : "Standard"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ color: s.isActive ? "#205a3c" : "#b91c1c", fontWeight: 500 }}>
                            {s.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          {/* Super Admin / Owner: Full system authority, no permission configuration */}
                          {isSuper && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fcd34d",
                                borderRadius: "4px",
                              }}
                            >
                              👑 Full Access (Owner)
                            </span>
                          )}

                          {/* Admin: Fixed administrative permissions */}
                          {isAdmin && !isSuperAdmin && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 500,
                                backgroundColor: "#f3f4f6",
                                color: "#6b7280",
                                border: "1px solid #e5e7eb",
                                borderRadius: "4px",
                                cursor: "not-allowed",
                              }}
                              title="Administrators cannot modify rules, permissions, or credentials of other Administrators or Super Admins"
                            >
                              🔒 Protected (Admin)
                            </span>
                          )}

                          {isAdmin && isSuperAdmin && (
                            <button
                              onClick={() => {
                                setSelectedStaff(s);
                                setNewRole("ADMINISTRATOR");
                                setCustomPermissions([]);
                                setCredentialsPassword("");
                              }}
                              style={{
                                padding: "4px 10px",
                                fontSize: "11px",
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3",
                                border: "1px solid #c7d2fe",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Manage Admin
                            </button>
                          )}

                          {/* Staff: Fully configurable operational permissions */}
                          {!isSuper && !isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedStaff(s);
                                setNewRole(s.assignedRole);
                                setCustomPermissions(s.customPermissions || []);
                                setCredentialsPassword("");
                              }}
                              style={{
                                padding: "4px 10px",
                                fontSize: "11px",
                                backgroundColor: "var(--btn-dark, #2e3830)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Configure Staff
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode 2: All Users & Customers */}
        {viewMode === "all_users" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf8f5", textAlign: "left", color: "var(--text-muted, #8c7d70)" }}>
                  <th style={{ padding: "10px 16px" }}>User Name</th>
                  <th style={{ padding: "10px 16px" }}>Email</th>
                  <th style={{ padding: "10px 16px" }}>Phone</th>
                  <th style={{ padding: "10px 16px" }}>System Role</th>
                  <th style={{ padding: "10px 16px" }}>Registered Date</th>
                  <th style={{ padding: "10px 16px" }}>Status</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Management</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "30px 16px", textAlign: "center", color: "#8c7d70" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((u) => {
                    const isSuper = u.role === "SUPER_ADMIN";
                    const isAdmin = u.role === "ADMIN";

                    return (
                      <tr key={u.id} style={{ borderTop: "1px solid #f0eae1" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "#2c2621" }}>{u.name}</td>
                        <td style={{ padding: "10px 16px", color: "#5a4e44" }}>{u.email}</td>
                        <td style={{ padding: "10px 16px", color: "#8c7d70" }}>{u.phone || "—"}</td>
                        <td style={{ padding: "10px 16px" }}>
                          {renderRoleBadge(u.role)}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#8c7d70" }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ color: u.isActive ? "#205a3c" : "#b91c1c", fontWeight: 500 }}>
                            {u.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          {/* Super Admin */}
                          {isSuper && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fcd34d",
                                borderRadius: "4px",
                              }}
                            >
                              👑 Full Access (Owner)
                            </span>
                          )}

                          {/* Admin */}
                          {isAdmin && !isSuperAdmin && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 500,
                                backgroundColor: "#f3f4f6",
                                color: "#6b7280",
                                border: "1px solid #e5e7eb",
                                borderRadius: "4px",
                                cursor: "not-allowed",
                              }}
                              title="Administrators cannot modify rules, permissions, or credentials of other Administrators or Super Admins"
                            >
                              🔒 Protected (Admin)
                            </span>
                          )}

                          {isAdmin && isSuperAdmin && (
                            <button
                              onClick={() => {
                                setSelectedStaff({
                                  userId: u.id,
                                  name: u.name,
                                  email: u.email,
                                  baseRole: u.role,
                                  assignedRole: "ADMINISTRATOR",
                                  customPermissions: [],
                                });
                                setNewRole("ADMINISTRATOR");
                                setCredentialsPassword("");
                              }}
                              style={{
                                padding: "4px 10px",
                                fontSize: "11px",
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3",
                                border: "1px solid #c7d2fe",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Manage Admin
                            </button>
                          )}

                          {/* Staff & Customer */}
                          {!isSuper && !isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedStaff({
                                  userId: u.id,
                                  name: u.name,
                                  email: u.email,
                                  baseRole: u.role,
                                  assignedRole: u.role === "STAFF" ? "CUSTOMER_SUPPORT" : "CUSTOMER_SUPPORT",
                                  customPermissions: [],
                                });
                                setNewRole(u.role === "STAFF" ? "CUSTOMER_SUPPORT" : "CUSTOMER_SUPPORT");
                                setCredentialsPassword("");
                              }}
                              style={{
                                padding: "4px 10px",
                                fontSize: "11px",
                                backgroundColor: "#fff",
                                color: "var(--text-primary, #2c2621)",
                                border: "1px solid #e8dfd5",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              {u.role === "STAFF" ? "Configure Staff" : "Manage Account"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openUserEditor(u)}
                            style={{ marginLeft: "6px", padding: "4px 9px", fontSize: "11px", background: "#fff", color: "var(--text-primary)", border: "1px solid #e8dfd5", borderRadius: "4px" }}
                          >
                            Edit
                          </button>
                          {u.id !== activeUser?.id && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(u)}
                              style={{ marginLeft: "6px", padding: "4px 9px", fontSize: "11px", background: "#fff", color: u.isActive ? "#b91c1c" : "#15803d", border: "1px solid #e8dfd5", borderRadius: "4px" }}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New User */}
      {showAddUserModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              border: "1px solid var(--border-light, #e8dfd5)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 className="font-serif" style={{ fontSize: "18px", margin: 0, color: "#2c2621" }}>
                {editingUser ? "Edit User Account" : "Add New User / Staff"}
              </h3>
              <button
                onClick={() => { setShowAddUserModal(false); setEditingUser(null); }}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#8c7d70" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUserSubmit : handleAddUserSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhika Sharma"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. radhika@rasasampoorna.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Account Role
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                  >
                    <option value="STAFF">Staff (Store Operations)</option>
                    <option value="CUSTOMER">Customer (Shopper)</option>
                    <option value="ADMIN" disabled={!isSuperAdmin}>
                      {isSuperAdmin ? "Admin (Store Administrator)" : "Admin (Requires Super Admin clearance)"}
                    </option>
                    {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin (Owner)</option>}
                  </select>
                  {!isSuperAdmin && (
                    <p style={{ fontSize: "11px", color: "#8c7d70", margin: "4px 0 0" }}>
                      * Only Super Admins (Owners) can provision Administrator accounts.
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>
              </div>

              {!editingUser && <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Password (Min. 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => { setShowAddUserModal(false); setEditingUser(null); }}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #e8dfd5", background: "none", fontSize: "12px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  style={{
                    padding: "8px 18px",
                    backgroundColor: "var(--btn-dark, #2e3830)",
                    color: "#f7f4ee",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isSubmittingUser ? (editingUser ? "Saving..." : "Creating User...") : (editingUser ? "Save Changes" : "Create User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Management & Staff Configuration Modal */}
      {selectedStaff && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            border: "1px solid var(--border-light, #e8dfd5)",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#2c2621" }}>
                {isSelectedAdmin ? `Manage Administrator: ${selectedStaff.name}` : `Configure Staff: ${selectedStaff.name}`}
              </h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#8c7d70" }}>
                Account Email: <strong>{selectedStaff.email}</strong> • Role: <strong>{selectedStaff.baseRole || selectedStaff.role}</strong>
              </p>
            </div>
            <button
              onClick={() => setSelectedStaff(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
            >
              ✕
            </button>
          </div>

          {/* If Target is an Administrator: Admins have fixed platform-wide permissions, no granular rule checkboxes */}
          {isSelectedAdmin && (
            <div
              style={{
                padding: "14px 18px",
                backgroundColor: "#f5f3ff",
                border: "1px solid #ddd6fe",
                borderRadius: "8px",
                color: "#4338ca",
                fontSize: "13px",
                lineHeight: "1.5",
                marginBottom: "16px",
              }}
            >
              <strong>🛡️ Platform Administrator Account:</strong>
              <div style={{ fontSize: "12px", color: "#5b21b6", marginTop: "4px" }}>
                Administrators possess fixed platform-wide store management privileges (Catalog, Inventory, Orders, Fulfillment, CMS, and Reporting).
                Individual granular permission overrides are strictly reserved for operational staff tiers.
              </div>
            </div>
          )}

          {/* If Target is a Staff Member: Fully configurable staff permissions */}
          {isSelectedStaff && (
            <form onSubmit={handleRoleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                  Operational Staff Role:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "360px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    backgroundColor: "#fff",
                  }}
                >
                  <option value="CUSTOMER_SUPPORT">Customer Support Staff (Orders view, inquiries, basic refunds)</option>
                  <option value="ORDER_FULFILLMENT_MANAGER">Order &amp; Fulfillment Manager (Orders, shipping, inventory holds)</option>
                  <option value="CATALOG_MANAGER">Catalog Manager (Products, categories, price updates, stock adjust)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                  Custom Granted Staff Permissions:
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "8px",
                    maxHeight: "160px",
                    overflowY: "auto",
                    padding: "10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    backgroundColor: "#faf8f5",
                  }}
                >
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm} style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", color: "#2c2621" }}>
                      <input
                        type="checkbox"
                        checked={customPermissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomPermissions([...customPermissions, perm]);
                          } else {
                            setCustomPermissions(customPermissions.filter((p) => p !== perm));
                          }
                        }}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    backgroundColor: "var(--btn-dark, #2e3830)",
                    color: "#fff",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save Staff Permissions
                </button>
              </div>
            </form>
          )}

          {/* Credential Reset Section */}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
            <h5 style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: 600, color: "#2c2621" }}>
              Credential Management (Password Reset)
            </h5>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#8c7d70" }}>
              Enter a new temporary password for this user account (min. 6 characters):
            </p>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="password"
                placeholder="New password"
                value={credentialsPassword}
                onChange={(e) => setCredentialsPassword(e.target.value)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  width: "240px",
                }}
              />
              <button
                type="button"
                disabled={!credentialsPassword || credentialsPassword.length < 6 || updatingCredentials}
                onClick={handleUpdateCredentials}
                style={{
                  padding: "6px 14px",
                  backgroundColor: !credentialsPassword || credentialsPassword.length < 6 ? "#d1d5db" : "#2e3830",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: !credentialsPassword || credentialsPassword.length < 6 ? "not-allowed" : "pointer",
                }}
              >
                {updatingCredentials ? "Updating..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
