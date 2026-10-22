"use client";

import { useState, useEffect } from "react";
import { ALL_PERMISSIONS } from "@/modules/rbac/permissions";

export function AdminStaffTab() {
  const [viewMode, setViewMode] = useState<"staff" | "all_users">("staff");
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [newRole, setNewRole] = useState<string>("CUSTOMER_SUPPORT");
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/staff");
      if (res.ok) {
        const json = await res.json();
        setStaff(json.staff || []);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data?.users || []);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "staff") {
      fetchStaff();
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

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) || u.phone?.includes(term);
  });

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

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {viewMode === "all_users" && (
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  border: "1px solid #e8dfd5",
                  borderRadius: "6px",
                  outline: "none",
                  width: "200px",
                }}
              />
            )}

            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
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
                  <th style={{ padding: "10px 16px" }}>Granular Role</th>
                  <th style={{ padding: "10px 16px" }}>MFA Protection</th>
                  <th style={{ padding: "10px 16px" }}>Status</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "30px 16px", textAlign: "center", color: "#8c7d70" }}>
                      No staff members loaded.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.userId} style={{ borderTop: "1px solid #f0eae1" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: "#2c2621" }}>{s.name}</td>
                      <td style={{ padding: "10px 16px", color: "#5a4e44" }}>{s.email}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 500, color: "#8c7d70" }}>{s.baseRole}</span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor:
                              s.assignedRole === "OWNER"
                                ? "#fef3c7"
                                : s.assignedRole === "ADMINISTRATOR"
                                ? "#e0e7ff"
                                : "#f3f4f6",
                            color:
                              s.assignedRole === "OWNER"
                                ? "#92400e"
                                : s.assignedRole === "ADMINISTRATOR"
                                ? "#3730a3"
                                : "#374151",
                          }}
                        >
                          {s.assignedRole}
                        </span>
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
                        <button
                          onClick={() => {
                            setSelectedStaff(s);
                            setNewRole(s.assignedRole);
                            setCustomPermissions(s.customPermissions || []);
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
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))
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
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "30px 16px", textAlign: "center", color: "#8c7d70" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderTop: "1px solid #f0eae1" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: "#2c2621" }}>{u.name}</td>
                      <td style={{ padding: "10px 16px", color: "#5a4e44" }}>{u.email}</td>
                      <td style={{ padding: "10px 16px", color: "#8c7d70" }}>{u.phone || "—"}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor:
                              u.role === "ADMIN" || u.role === "SUPER_ADMIN"
                                ? "#e0e7ff"
                                : u.role === "STAFF"
                                ? "#fef3c7"
                                : "#f3f4f6",
                            color:
                              u.role === "ADMIN" || u.role === "SUPER_ADMIN"
                                ? "#3730a3"
                                : u.role === "STAFF"
                                ? "#92400e"
                                : "#374151",
                          }}
                        >
                          {u.role}
                        </span>
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
                        <button
                          onClick={() => {
                            setSelectedStaff({
                              userId: u.id,
                              name: u.name,
                              email: u.email,
                              assignedRole: u.role === "ADMIN" ? "ADMINISTRATOR" : u.role === "STAFF" ? "CUSTOMER_SUPPORT" : "CUSTOMER_SUPPORT",
                              customPermissions: [],
                            });
                            setNewRole(u.role === "ADMIN" ? "ADMINISTRATOR" : "CUSTOMER_SUPPORT");
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
                          Manage Role
                        </button>
                      </td>
                    </tr>
                  ))
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
                Add New User / Staff
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#8c7d70" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
                    <option value="ADMIN">Admin (Full Access)</option>
                    <option value="CUSTOMER">Customer (Shopper)</option>
                  </select>
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

              <div>
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
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
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
                  {isSubmittingUser ? "Creating User..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Assignment Modal / Form */}
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
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#2c2621" }}>
              Configure Permissions for {selectedStaff.name} ({selectedStaff.email})
            </h4>
            <button
              onClick={() => setSelectedStaff(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleRoleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                Primary Business Role:
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
                }}
              >
                <option value="CUSTOMER_SUPPORT">Customer Support Staff (Orders view, inquiries, basic refunds)</option>
                <option value="ORDER_FULFILLMENT_MANAGER">Order &amp; Fulfillment Manager (Orders, shipping, inventory holds)</option>
                <option value="CATALOG_MANAGER">Catalog Manager (Products, categories, price updates, stock adjust)</option>
                <option value="ADMINISTRATOR">Administrator (Store operations, reports, staff delegation)</option>
                <option value="OWNER">Owner (Unrestricted clearance &amp; payment credentials)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                Custom Granted Permissions:
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
                  <label key={perm} style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
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
                Save Role &amp; Permissions
              </button>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
