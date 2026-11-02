# RASA Sampoorna — Enterprise Engineering Handover Documentation

[![Next.js](https://img.shields.io/badge/Next.js-16.4.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.3.3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4.1-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Tests-182_Passed-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)

---

## 1. Executive Summary & Platform Overview

**RASA Sampoorna** is a direct-to-consumer (D2C) luxury handloom and artisan saree platform designed to deliver an editorial shopping experience alongside enterprise-grade transactional resilience.

### Core Value Propositions
* **Curated Artisan Storefront:** Canvas-based 60fps interactive scroll animations, dynamic multi-attribute product filtering, high-resolution zoomable image galleries, and artisan storytelling.
* **Modular Monolith Architecture:** Decoupled business domains implemented as 21 independent service modules inside Next.js App Router route handlers.
* **Zero-Floating-Point Financials:** All currency operations strictly enforce integer minor units (paise in INR: `₹100.00` = `10000`) across storage, calculation, and gateway communication.
* **Resilient Graceful Fallbacks:** Built-in sandbox mocks for payments (Razorpay), logistics (Shiprocket), and transactional email (Resend) ensure continuous local development without external dependencies.
* **Unified Operations Portal:** Custom-built Administrative Dashboard (`/admin`) delivering real-time telemetry, catalog management, inventory ledger adjustments, order fulfillment, refund reviews, staff RBAC, and data privacy compliance.

---

## 2. System Architecture

The application adopts a **Modular Monolith** pattern. Next.js Route Handlers act as thin HTTP controllers, delegating directly to pure business domain services located in `src/modules/*`.

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client Layer"]
        A["Storefront (React 19 Server/Client Components)"]
        B["Unified Admin Dashboard (/admin)"]
        C["Shop Context & Cart State Provider"]
    end

    subgraph ApiGateway["Next.js Route Handlers (/api/v1/*)"]
        D["Auth & RBAC Middleware (jose JWT + bcrypt)"]
        E["Rate Limiter (Sliding Window In-Memory)"]
        F["Request Validation (Zod Schemas)"]
    end

    subgraph ServiceModules["Core Domain Services (src/modules/*)"]
        G["Catalog & Category Services"]
        H["Cart & Checkout Services (Atomic Transactions)"]
        I["Order & Returns Services"]
        J["Inventory & Stock Ledger Service"]
        K["Admin & Analytics Service"]
        L["Notification Outbox Service"]
    end

    subgraph DataIntegrations["Persistence & External Providers"]
        M[("PostgreSQL Database via Prisma ORM")]
        N["Razorpay (HMAC Webhooks & Orders)"]
        O["Shiprocket (AWB & Courier Tracking)"]
        P["Cloudflare R2 (S3-Compatible Object Store)"]
        Q["Resend (Transactional Email Dispatcher)"]
    end

    ClientLayer --> D
    D --> E
    E --> F
    F --> ServiceModules
    ServiceModules --> M
    ServiceModules --> N
    ServiceModules --> O
    ServiceModules --> P
    ServiceModules --> Q
```

---

## 3. Administrative Credentials & Onboarding

### Admin Panel Access
Once the application is running, the unified back-office dashboard is accessible at:
* **Direct Admin Dashboard URL:** [http://localhost:3000/admin](http://localhost:3000/admin)
* *(Or authenticate via the standard portal at [http://localhost:3000/login](http://localhost:3000/login))*

### Default Super Administrator Credentials (Local Seed)
The automated database seed script provisions a root Super Admin account:

| Attribute | Value |
| :--- | :--- |
| **Email Address** | `admin@rasasampoorna.com` |
| **Default Password** | `RasaAdmin2026!Secure` |
| **Assigned Role** | `SUPER_ADMIN` |
| **Permissions** | Unrestricted access across all 10 management domains |
| **Provisioning Source** | [`prisma/seed.ts`](file:///d:/RASA/prisma/seed.ts) |

### User Type Hierarchy & Access Boundaries
The platform enforces a strict multi-tier hierarchy to protect store ownership:

1. **Super Admin / Owner (Rank 1 - Top):**
   - Highest rank with full, unrestricted clearance across all business and system domains.
   - The **only role** with authority to create, provision, or assign `ADMIN` or `SUPER_ADMIN` accounts.
   - The **only role** permitted to modify credentials, permissions, and status of other Administrators.
2. **Admin / Administrator (Rank 2):**
   - Full day-to-day store operations: catalog management, order fulfillment, refund approvals, analytics, and CMS publishing.
   - **Strict Protection Boundary:** An Admin **cannot** change the credentials (passwords, emails, active status) or permissions/roles of other Admins or Super Admins.
   - An Admin **cannot** create or promote users to Admin or Super Admin roles.
   - Can only manage operational staff (`STAFF`) and shoppers (`CUSTOMER`).
3. **Staff (Rank 3):**
   - Scoped operational accounts (`CATALOG_MANAGER`, `ORDER_FULFILLMENT_MANAGER`, `CUSTOMER_SUPPORT`).
4. **Customer (Rank 4):**
   - Storefront shoppers with zero administrative clearance.

| Actor Role | Can Modify Staff/Customer? | Can Modify Other Admins? | Can Modify Super Admin? | Can Create Admins? |
| :--- | :---: | :---: | :---: | :---: |
| **Super Admin (Owner)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Admin** | ✅ Yes | ❌ **Strictly Forbidden** | ❌ **Strictly Forbidden** | ❌ **Strictly Forbidden** |
| **Staff / Customer** | ❌ No | ❌ No | ❌ No | ❌ No |

> [!IMPORTANT]
> If your local database is newly initialized, execute `pnpm run db:seed` after running migrations to insert this account and the baseline catalog. In production environments, immediately reset this password upon initial handover.

---

## 4. Repository & Codebase Directory Structure

```
d:/RASA/
├── prisma/
│   ├── schema.prisma             # PostgreSQL schema definition (30+ relational models & enums)
│   └── seed.ts                   # Master database seed (Admin, categories, products, CMS packages)
├── public/                       # Static public assets (fonts, brand logos, fallback images)
├── src/
│   ├── app/                      # Next.js App Router (Pages, Layouts & Route Handlers)
│   │   ├── (storefront)/         # Customer-facing shopping views
│   │   │   ├── page.tsx          # Homepage with desktop canvas scroller & mobile hero
│   │   │   ├── shop/             # Product catalog, search, and faceted filtering
│   │   │   │   └── [slug]/       # Product detail page (PDP) with high-res zoom & specifications
│   │   │   ├── cart/             # Dedicated full-page cart
│   │   │   ├── checkout/         # Multi-step checkout with address validation & Razorpay modal
│   │   │   ├── account/          # Patron profile, addresses, and order history
│   │   │   ├── orders/           # Order tracking and invoice generation
│   │   │   ├── corporate-gifting/# Corporate bulk gifting inquiry submission
│   │   │   ├── contact/          # Patron contact inquiry
│   │   │   ├── faq/              # Frequently asked questions
│   │   │   └── policies/         # Legal documentation (Privacy, Terms, Shipping, Returns)
│   │   ├── (auth)/               # Authentication interfaces
│   │   │   ├── login/            # Universal login portal (redirects customer vs admin)
│   │   │   ├── register/         # Customer account creation
│   │   │   ├── forgot-password/  # Password reset request
│   │   │   ├── reset-password/   # Token-validated password reset
│   │   │   └── verify-email/     # Token-validated email verification
│   │   ├── admin/                # Unified Administrative Dashboard (/admin)
│   │   │   └── page.tsx          # 10-tab control room (Analytics, Catalog, Inventory, Orders, etc.)
│   │   └── api/v1/               # RESTful HTTP Route Handlers
│   │       ├── admin/            # Administrative APIs (Analytics, products, staff, audit, etc.)
│   │       ├── auth/             # Session, registration, password lifecycle
│   │       ├── products/         # Public catalog discovery & filtering
│   │       ├── cart/             # Session-based cart persistence & guest-to-user merging
│   │       ├── checkout/         # Order creation & Razorpay payment verification
│   │       ├── orders/           # Order retrieval & status updates
│   │       ├── shipping/         # Pin-code serviceability checks
│   │       ├── inquiries/        # Contact & corporate gifting dispatch
│   │       ├── notifications/    # Outbox status & notification preferences
│   │       ├── webhooks/         # Razorpay & Shiprocket signature-verified webhook listeners
│   │       └── health/           # System status & database ping
│   ├── components/               # Modular UI Components
│   │   ├── admin/                # Admin tab interfaces (Analytics, Orders, CMS, Staff, Audit, etc.)
│   │   ├── canvas/               # High-performance desktop 60fps canvas sequence scroller
│   │   ├── landing/              # Landing page sections (Featured, Artisan Story, Testimonials)
│   │   ├── navigation/           # Main navbar, footer, and cart drawer
│   │   └── scenes/               # Mobile hero and fallback scenes
│   ├── context/
│   │   └── shop-context.tsx      # Global cart, wishlist, currency, and modal context provider
│   ├── data/                     # Seed datasets & static fallback catalogs
│   │   ├── products.json         # Master product catalog with pricing & specs
│   │   ├── corporate-packages.json# Corporate gifting package definitions
│   │   └── related-products.json # Related product cross-sell definitions
│   ├── lib/                      # Cross-Cutting Core Libraries
│   │   ├── api/                  # Standardized response envelopes & centralized error handler
│   │   ├── db/prisma.ts          # Singleton Prisma Client instance with connection pooling
│   │   ├── email/                # Resend client wrapper with sandbox mock fallback
│   │   ├── integrations/         # Razorpay SDK and Shiprocket API wrappers
│   │   ├── observability/        # Structured JSON logger with credential sanitization
│   │   ├── rate-limit/           # In-memory sliding-window rate limiter
│   │   ├── security/             # bcrypt hashing, jose JWT signing, and auth guard decorators
│   │   ├── storage/              # Cloudflare R2 presigned URL generator & S3 client
│   │   └── validation/           # Zod environment and payload schemas
│   ├── modules/                  # 21 Isolated Business Domain Services
│   │   ├── addresses/            # AddressService (validation, ownership, default address toggle)
│   │   ├── admin/                # AdminService (dashboard metric aggregates)
│   │   ├── analytics/            # AnalyticsService (sales reports, timelines, CSV export)
│   │   ├── audit/                # AuditService (immutable administrative audit trail)
│   │   ├── auth/                 # AuthService (session tokens, password resets, verification)
│   │   ├── cart/                 # CartService (atomic stock checks, price lock, guest merge)
│   │   ├── catalog/              # CatalogService (faceted search, minor unit conversion)
│   │   ├── categories/           # CategoryService (hierarchical category trees)
│   │   ├── checkout/             # CheckoutService (atomic order placement, stock locking)
│   │   ├── cms/                  # CmsService (announcement bars, hero config, corporate packages)
│   │   ├── collections/          # CollectionService (curated seasonal collections)
│   │   ├── coupons/              # CouponService (discount codes & promotional validation)
│   │   ├── inventory/            # InventoryService (stock deductions, restocking, alerts)
│   │   ├── notifications/        # NotificationService (transactional email outbox & retry logic)
│   │   ├── operations/           # OperationsService (system health, maintenance tasks)
│   │   ├── orders/               # OrderService (order lifecycle, invoices, status transitions)
│   │   ├── privacy/              # PrivacyService (GDPR/DPDP compliance & data erasure)
│   │   ├── rbac/                 # RbacService (role-based access control & permissions)
│   │   ├── returns/              # ReturnService (customer return requests & warehouse intake)
│   │   ├── shipping/             # ShippingService (Shiprocket integration & pin-code checks)
│   │   └── wishlist/             # WishlistService (customer wishlist persistence)
│   ├── services/
│   │   └── product-service.ts    # Frontend service facade connecting UI to backend API & fallbacks
│   └── types/                    # Shared TypeScript interfaces & models
├── tests/
│   ├── integration/              # API response structure and error handling tests
│   └── unit/                     # Domain services, RBAC, pricing, security, notifications tests
├── .env.example                  # Comprehensive environment configuration template
├── package.json                  # Dependencies, engine constraints, and build scripts
├── tsconfig.json                 # TypeScript strict compiler configuration
└── vitest.config.ts              # Vitest test runner configuration
```

---

## 5. Step-by-Step Local Setup & Execution Guide

Follow this standard runbook to set up and run the application in a local development environment.

### Step 5.1: Prerequisites
Ensure the host machine has the following installed:
* **Node.js:** `>= 20.10.0` (LTS recommended)
* **pnpm:** `>= 10.x` or `12.x` (managed via Corepack or standalone)
  ```bash
  corepack enable
  corepack prepare pnpm@12.9.1 --activate
  ```
* **PostgreSQL:** PostgreSQL `15+` instance running locally, via Docker, or cloud-hosted (e.g. Neon, Supabase, AWS RDS).

---

### Step 5.2: Install Dependencies
Clone the repository and install dependencies using `pnpm`:

```bash
# Clone the repository
git clone <repository-url>
cd RASA

# Install dependencies strictly respecting lockfile
pnpm install

# Approve build scripts for native engines (sharp, prisma, etc.)
pnpm approve-builds --all
```

---

### Step 5.3: Environment Configuration
Initialize the local environment configuration files:

```bash
# Linux / macOS / Git Bash:
cp .env.example .env.local
cp .env.example .env

# Windows PowerShell:
Copy-Item .env.example .env.local
Copy-Item .env.example .env
```

Open `.env.local` and `.env` (the Prisma CLI reads `.env`, while Next.js reads `.env.local`). Populate your parameters:

```env
# Server Runtime
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# PostgreSQL Connection String (replace with your local or cloud Postgres URI)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rasa_db?schema=public"

# Auth Session Secret (minimum 32 random characters)
# Generate via: openssl rand -base64 32
AUTH_SECRET="your-development-auth-secret-min-32-chars-long"
AUTH_SESSION_EXPIRY_DAYS=30

# Transactional Emails (Resend)
# Leave as placeholder for automatic Sandbox Mock logger
RESEND_API_KEY="re_placeholder"
EMAIL_FROM="orders@rasasampoorna.com"
NOTIFICATIONS_ADMIN_EMAIL="admin@rasasampoorna.com"

# Razorpay Payment Gateway
# Leave as placeholder for automatic Mock Payment simulation
RAZORPAY_KEY_ID="rzp_test_placeholder"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_placeholder"
RAZORPAY_KEY_SECRET="razorpay_secret_placeholder"
RAZORPAY_WEBHOOK_SECRET="razorpay_webhook_secret_placeholder"

# Logistics (Shiprocket)
# Leave as placeholder for automatic Mock Logistics simulation
SHIPROCKET_EMAIL="logistics@rasasampoorna.com"
SHIPROCKET_PASSWORD="shiprocket_password_placeholder"

# Media Storage (Cloudflare R2)
R2_ACCOUNT_ID="cloudflare_r2_account_id_placeholder"
R2_ACCESS_KEY_ID="r2_access_key_placeholder"
R2_SECRET_ACCESS_KEY="r2_secret_key_placeholder"
R2_BUCKET_NAME="rasa-products"
R2_PUBLIC_DOMAIN="https://assets.rasasampoorna.com"
```

---

### Step 5.4: Database Provisioning, Migrations & Seeding
Run the Prisma toolchain to generate TypeScript client models, run migrations against PostgreSQL, and seed initial data:

```bash
# 1. Generate the strongly-typed Prisma Client
pnpm run db:generate

# 2. Apply version-controlled schema migrations
pnpm run db:migrate

# 3. Seed initial admin user, categories, products, and corporate packages
pnpm run db:seed
```

**Expected Seed Output:**
```text
🌱 Starting RASA Sampoorna Database Seed...
✅ Super Admin created: admin@rasasampoorna.com
✅ Categories seeded: 6
✅ Products seeded: 20
✅ Corporate packages CMS seeded
🌟 Seeding completed successfully!
```

---

### Step 5.5: Run the Development Server
Start the Next.js development server with Turbopack on port `3000`:

```bash
pnpm dev
```

The storefront and `/api/v1/*` backend routes run in the same Next.js server, so admin login and its session cookie use the same origin and port. `PORT` in `.env` cannot set the listening port; the development script pins it to `3000`.

* **Storefront:** [http://localhost:3000](http://localhost:3000)
* **Admin Portal:** [http://localhost:3000/admin](http://localhost:3000/admin)
* **System Health Check:** [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## 6. Admin Dashboard Guide (`/admin`)

The `/admin` portal provides a unified control room equipped with 10 operational tabs:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RASA SAMPOORNA ADMIN                              │
│ [Analytics] [Catalog] [Categories] [Inventory] [Orders] [CMS] [Staff] ...   │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Analytics Tab (`AdminAnalyticsTab`):** Executive telemetry, gross revenue timelines, order counts, average order value (AOV), sales by category distribution, and one-click CSV report export.
2. **Catalog Tab:** Full product CRUD with rich specification forms (fabric, weave, zari type, occasion, size, maker note, and care guide), direct image upload, SKU assignment, and bulk status/price adjustments.
3. **Categories Tab:** Category hierarchy management, SEO slug customization, and sort ordering.
4. **Inventory Tab:** Real-time stock counts across standard variants, low-stock threshold triggers, manual stock adjustments with audit reason codes, and movement history.
5. **Orders Tab (`AdminOrdersTab`):** Comprehensive order ledger with lifecycle transitions (`PENDING` -> `CONFIRMED` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`), AWB tracking URL assignment, and printable PDF invoice generation.
6. **CMS & Store Tab (`AdminCmsTab`):** Real-time management of homepage announcement bar marquee, hero banners, and corporate gifting tiers.
7. **Operations Tab (`AdminOperationsTab`):** System health metrics, DB connection diagnostics, notification outbox sync, and pending retry triggers.
8. **Staff & RBAC Tab (`AdminStaffTab`):** Administrator user invitations, role assignment (`SUPER_ADMIN`, `ADMIN`, `STAFF`), and account deactivations.
9. **Audit Trail Tab (`AdminAuditTab`):** Chronological, immutable record of every administrative action, actor user ID, client IP address, and change diffs.
10. **Data Privacy Tab (`AdminPrivacyTab`):** GDPR / DPDP compliance tools for exporting customer records and executing cryptographically safe data erasure requests.

---

## 7. Environment Variables Reference Matrix

| Variable | Required in Prod | Sandbox Mock Fallback | Purpose |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | Yes | No | Runtime environment (`development`, `production`, `test`) |
| `PORT` | No | No | Server listen port, set in the process environment before startup (defaults to `3000`; `.env` is too late) |
| `NEXT_PUBLIC_APP_URL` | Yes | No | Canonical frontend URL for links and CORS origins |
| `DATABASE_URL` | Yes | No | PostgreSQL connection URI with connection pooling |
| `AUTH_SECRET` | Yes | No | 32+ character random secret for signing JWT sessions |
| `AUTH_SESSION_EXPIRY_DAYS` | No | No | Session duration in days (Default: `30`) |
| `RAZORPAY_KEY_ID` | Yes | Yes | Razorpay API Public Key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`| Yes | Yes | Client-exposed Razorpay Key for checkout modal |
| `RAZORPAY_KEY_SECRET` | Yes | Yes | Razorpay API Secret Key |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Yes | Secret for HMAC SHA-256 signature verification |
| `SHIPROCKET_EMAIL` | Yes | Yes | Shiprocket login email for logistics auth |
| `SHIPROCKET_PASSWORD` | Yes | Yes | Shiprocket login password |
| `R2_ACCOUNT_ID` | Yes | No | Cloudflare Account ID for R2 storage |
| `R2_ACCESS_KEY_ID` | Yes | No | Cloudflare R2 S3 API Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Yes | No | Cloudflare R2 S3 API Secret Access Key |
| `R2_BUCKET_NAME` | Yes | No | S3 Bucket name (`rasa-products`) |
| `R2_PUBLIC_DOMAIN` | Yes | No | Public CDN domain serving uploaded media |
| `RESEND_API_KEY` | Yes | Yes | Resend API key (`re_...`) for transactional email |
| `EMAIL_FROM` | Yes | Yes | Verified email sender address |
| `NOTIFICATIONS_ADMIN_EMAIL` | No | Yes | Recipient for corporate gifting and contact alerts |

---

## 8. Core Engineering & Business Domain Systems

### 8.1. Monetary Accounting (Integer Minor Units)
To completely prevent IEEE 754 floating-point rounding errors during pricing, discounts, and tax computation, all monetary amounts are stored in **minor units (paise)**:
* `₹4,500.00` is stored in the database as `450000`.
* Database fields: `basePriceInMinorUnits`, `originalPriceInMinorUnits`, `totalAmountInMinorUnits`, etc.
* The frontend service layer (`product-service.ts`) converts minor units to rupees for display purposes.

### 8.2. Atomic Checkout & Price Snapshots
During checkout, the system executes an atomic transaction (`prisma.$transaction`):
1. **Stock Lock:** Quantities are verified and atomically reserved.
2. **Immutable Snapshot:** The unit price, product title, image, SKU, and full shipping address are captured directly on the `OrderItem` record. Subsequent catalog price adjustments never distort historical accounting records.
3. **Cart Preservation:** The customer's cart is preserved until payment is cryptographically verified.

### 8.3. Payment Processing & Webhook Verification
* **Razorpay Server Integration:** Orders are created server-side via the Razorpay SDK.
* **Cryptographic Verification:** Payment confirmations require HMAC SHA-256 validation:
  ```typescript
  crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  ```
* **Sandbox Mock Mode:** In development, when placeholder credentials are detected, the system automatically simulates successful payment transitions without requiring live gateway credentials.

### 8.4. Shipping, Logistics & Reverse Pickups
* **Pin-Code Validation:** Real-time Indian postal code validation against Shiprocket's serviceable database with delivery SLA estimates.
* **Automated AWB Generation:** Successful orders trigger automated consignment manifests with tracking URLs.
* **Reverse Logistics:** Customer return requests approved in the admin portal trigger reverse pickup manifests and restock inventory upon receipt.

### 8.5. Transactional Notifications & Outbox Reliability
* **Durable Outbox Pattern:** All notifications (order confirmations, dispatch alerts, password resets) are written to a durable database outbox table (`Notification`).
* **Resilience:** The checkout workflow never fails if the email provider suffers an outage. Failed dispatches increment retry counters and are processed asynchronously.
* **Patron Privacy:** Passwords, reset tokens, and payment secrets are automatically redacted before logging.

---

## 9. Comprehensive API Endpoint Catalog (`/api/v1`)

### Authentication & Profile (`/api/v1/auth`)
| Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register customer account | Public (Rate limited) |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue HTTP-only cookie | Public (Rate limited) |
| `POST` | `/api/v1/auth/logout` | Invalidate and clear session cookie | Public |
| `GET` | `/api/v1/auth/me` | Fetch active user profile and roles | Authenticated |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset token | Public |
| `POST` | `/api/v1/auth/reset-password` | Execute password reset with token | Public |
| `POST` | `/api/v1/auth/change-password` | Authenticated password change | Authenticated |
| `POST` | `/api/v1/auth/verify-email` | Validate email verification token | Public |

### Storefront & Shopping Cart (`/api/v1`)
| Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | Paginated product discovery with faceted filters | Public |
| `GET` | `/api/v1/products/[slug]`| Single product full details by slug | Public |
| `GET` | `/api/v1/categories` | Hierarchical category listings | Public |
| `GET` | `/api/v1/cart` | Retrieve active customer or guest cart | Cookie / Guest Token |
| `POST` | `/api/v1/cart` | Add variant to cart with real-time stock check | Cookie / Guest Token |
| `PATCH` | `/api/v1/cart` | Update item quantity in cart | Cookie / Guest Token |
| `DELETE` | `/api/v1/cart` | Remove line-item or clear entire cart | Cookie / Guest Token |
| `POST` | `/api/v1/checkout/order` | Create order & snapshot line items | Public (Rate limited) |
| `POST` | `/api/v1/checkout/verify-payment` | Verify Razorpay HMAC signature | Public |
| `POST` | `/api/v1/shipping/pincode-check` | Validate Indian postal code serviceability | Public |
| `POST` | `/api/v1/inquiries/corporate` | Submit bulk corporate gifting inquiry | Public |
| `POST` | `/api/v1/inquiries/contact` | Submit patron contact message | Public |

### Administrative Management (`/api/v1/admin`)
| Method | Endpoint | Description | Minimum Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/analytics` | Revenue, order volume, and category aggregates | `ADMIN` |
| `GET` | `/api/v1/admin/analytics/export` | Export sales & order datasets as CSV | `ADMIN` |
| `GET`, `POST` | `/api/v1/admin/products` | Catalog listing and new product creation | `ADMIN` |
| `PATCH`, `DELETE`| `/api/v1/admin/products/[id]`| Update product details or archive product | `ADMIN` |
| `POST` | `/api/v1/admin/products/bulk` | Bulk status updates or price percentage shifts | `ADMIN` |
| `GET`, `POST` | `/api/v1/admin/inventory` | Real-time stock counts & manual ledger updates | `STAFF` |
| `GET`, `PATCH` | `/api/v1/admin/orders` | Order management and status transitions | `STAFF` |
| `POST` | `/api/v1/admin/staff` | Create new staff or admin accounts | `SUPER_ADMIN` |
| `GET` | `/api/v1/admin/audit-logs` | Retrieve immutable administrative audit log | `SUPER_ADMIN` |
| `POST` | `/api/v1/admin/privacy/delete` | Process patron GDPR/DPDP data erasure | `SUPER_ADMIN` |
| `GET` | `/api/v1/admin/cms/settings` | Read store announcement and hero settings | `STAFF` |
| `PUT` | `/api/v1/admin/cms/settings` | Update store announcement and hero settings | `ADMIN` |

---

## 10. Automated Testing & Verification Suite

The repository includes a comprehensive automated test suite powered by Vitest, containing **182 passing assertions** across 16 test files.

```bash
# Execute test suite
pnpm test

# Run tests in watch mode during development
pnpm exec vitest

# Run TypeScript static analysis
pnpm exec tsc --noEmit

# Run ESLint validation
pnpm run lint

# Compile production build
pnpm run build
```

### Test Coverage Highlights
* **Shopping Cart & Checkout (`shopping-cart-checkout.test.ts`):** Validates stock locking, price snapshots, free shipping thresholds, and cart cleanup.
* **RBAC & Authorization (`admin-rbac-operations.test.ts`):** Validates that customers and staff cannot access unauthorized administrative endpoints.
* **Security & Password Hashing (`security.test.ts`):** Validates bcrypt hashing cost factors and jose JWT session token tamper resistance.
* **Notification Reliability (`notifications.test.ts`):** Validates the durable outbox pattern and error isolation when email providers fail.
* **Orders & Shipping (`orders-payments-shipping.test.ts`):** Validates Razorpay signature verification and Shiprocket sandbox fallback.

---

## 11. Production Deployment Runbook

### Option A: Vercel Deployment (Recommended for Next.js App Router)
1. Push the repository to your Git provider (GitHub / GitLab / Bitbucket).
2. Import the project into Vercel.
3. Configure Environment Variables in the Vercel Project Settings matching `.env.example`.
4. Ensure `DATABASE_URL` points to a connection-pooled PostgreSQL instance (e.g. Neon, Supabase with PgBouncer, AWS RDS Proxy).
5. Set the Build Command to:
   ```bash
   prisma generate && next build
   ```
6. Deploy and execute production database migrations:
   ```bash
   pnpm run db:migrate
   ```

### Option B: Docker / Node.js Standalone Container
A production Docker container can be built using standard Next.js standalone output:
1. Ensure `output: "standalone"` is enabled in `next.config.ts`.
2. Build the container:
   ```bash
   docker build -t rasa-sampoorna .
   ```
3. Run the container exposing port `3000`:
   ```bash
   docker run -p 3000:3000 --env-file .env.production rasa-sampoorna
   ```

---

## 12. Maintenance & Operations Runbook

### Database Schema Updates
Whenever updating `prisma/schema.prisma`:
```bash
# 1. Create a version-controlled migration file
pnpm exec prisma migrate dev --name describe_change

# 2. Re-generate TypeScript Prisma client types
pnpm run db:generate

# 3. Verify that the test suite passes with the new schema
pnpm test
```

### Rotating the Administrator Password
To update the super administrator password in production:
1. Log in to [http://localhost:3000/admin](http://localhost:3000/admin) with current credentials.
2. Navigate to the **Staff & RBAC** tab or execute a secure password reset via `/forgot-password`.
3. Alternatively, update the password hash directly in the database using bcrypt (cost factor 12).

---

## 13. Handover Sign-off & Quality Checklist

- [x] **Storefront & Canvas Preservation:** Homepage desktop canvas sequence and mobile hero remain completely preserved without visual or layout regressions.
- [x] **Decoupled Business Logic:** Clean separation of concerns between Route Handlers and 21 backend domain services in `src/modules/*`.
- [x] **Zero-Floating-Point Financials:** Prices and transactions stored as minor unit integers (paise).
- [x] **Comprehensive Test Suite:** 182 Vitest unit and integration tests passing.
- [x] **TypeScript Strict Mode:** Zero type errors via `pnpm exec tsc --noEmit`.
- [x] **Graceful Fallbacks:** Sandbox mock capabilities for Razorpay, Shiprocket, and Resend operational.
- [x] **Documentation & Runbook:** Complete technical handover document provided in `README.md`.
