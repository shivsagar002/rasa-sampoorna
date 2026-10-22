export type AdminRole =
  | "OWNER"
  | "ADMINISTRATOR"
  | "CATALOG_MANAGER"
  | "ORDER_FULFILLMENT_MANAGER"
  | "CUSTOMER_SUPPORT";

export type Permission =
  // Products
  | "products:read"
  | "products:create"
  | "products:update"
  | "products:delete"
  | "products:price_update"
  | "products:bulk_update"
  // Inventory
  | "inventory:read"
  | "inventory:adjust"
  | "inventory:cleanup_reservations"
  // Orders
  | "orders:read"
  | "orders:update_status"
  | "orders:cancel"
  | "orders:ship"
  // Refunds
  | "refunds:read"
  | "refunds:create"
  | "refunds:approve"
  // CMS & Marketing
  | "cms:read"
  | "cms:write"
  | "cms:publish"
  // Analytics
  | "analytics:read"
  | "analytics:export"
  // Store Settings
  | "settings:read"
  | "settings:update"
  | "settings:payments"
  // Staff Management
  | "staff:read"
  | "staff:manage_roles"
  | "staff:assign_permissions"
  // Operational Visibility & Recovery
  | "operations:read"
  | "operations:retry_webhooks"
  | "operations:reconcile_payments"
  | "operations:retry_notifications"
  // Audit Logs
  | "audit:read"
  | "audit:export"
  // Privacy & Data Lifecycle
  | "privacy:export"
  | "privacy:delete";

export const ALL_PERMISSIONS: Permission[] = [
  "products:read",
  "products:create",
  "products:update",
  "products:delete",
  "products:price_update",
  "products:bulk_update",
  "inventory:read",
  "inventory:adjust",
  "inventory:cleanup_reservations",
  "orders:read",
  "orders:update_status",
  "orders:cancel",
  "orders:ship",
  "refunds:read",
  "refunds:create",
  "refunds:approve",
  "cms:read",
  "cms:write",
  "cms:publish",
  "analytics:read",
  "analytics:export",
  "settings:read",
  "settings:update",
  "settings:payments",
  "staff:read",
  "staff:manage_roles",
  "staff:assign_permissions",
  "operations:read",
  "operations:retry_webhooks",
  "operations:reconcile_payments",
  "operations:retry_notifications",
  "audit:read",
  "audit:export",
  "privacy:export",
  "privacy:delete",
];

/**
 * Highly sensitive actions requiring explicit elevated authorization or MFA step-up.
 */
export const SENSITIVE_PERMISSIONS: readonly Permission[] = [
  "refunds:approve",
  "staff:manage_roles",
  "settings:payments",
  "privacy:delete",
] as const;

/**
 * Role hierarchy weights to prevent privilege escalation.
 * A user can only grant or manage roles with strictly lower weights than their own.
 */
export const ROLE_HIERARCHY_WEIGHTS: Record<AdminRole, number> = {
  OWNER: 100,
  ADMINISTRATOR: 80,
  CATALOG_MANAGER: 50,
  ORDER_FULFILLMENT_MANAGER: 50,
  CUSTOMER_SUPPORT: 30,
};

/**
 * Default permission matrix for each standard business role.
 */
export const ROLE_PERMISSIONS_MAP: Record<AdminRole, Permission[]> = {
  OWNER: [...ALL_PERMISSIONS],

  ADMINISTRATOR: [
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "products:price_update",
    "products:bulk_update",
    "inventory:read",
    "inventory:adjust",
    "inventory:cleanup_reservations",
    "orders:read",
    "orders:update_status",
    "orders:cancel",
    "orders:ship",
    "refunds:read",
    "refunds:create",
    "refunds:approve",
    "cms:read",
    "cms:write",
    "cms:publish",
    "analytics:read",
    "analytics:export",
    "settings:read",
    "settings:update",
    // NOTE: settings:payments reserved for OWNER
    "staff:read",
    "staff:assign_permissions", // Can assign staff roles up to catalog/order/support
    "operations:read",
    "operations:retry_webhooks",
    "operations:reconcile_payments",
    "operations:retry_notifications",
    "audit:read",
    "audit:export",
    "privacy:export",
    // NOTE: privacy:delete requires OWNER or explicit MFA
  ],

  CATALOG_MANAGER: [
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "products:price_update",
    "products:bulk_update",
    "inventory:read",
    "inventory:adjust",
    "cms:read",
    "analytics:read",
    "audit:read",
  ],

  ORDER_FULFILLMENT_MANAGER: [
    "orders:read",
    "orders:update_status",
    "orders:cancel",
    "orders:ship",
    "inventory:read",
    "inventory:cleanup_reservations",
    "refunds:read",
    "operations:read",
    "operations:retry_webhooks",
    "operations:reconcile_payments",
    "audit:read",
  ],

  CUSTOMER_SUPPORT: [
    "orders:read",
    "refunds:read",
    "refunds:create", // can initiate refund requests, cannot approve
    "privacy:export", // can handle customer data download requests
    "audit:read",
  ],
};
