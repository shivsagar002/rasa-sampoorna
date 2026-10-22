# RASA Sampoorna — E-Commerce Architecture & Backend Guide

RASA Sampoorna is a luxury Indian handloom and artisan saree brand e-commerce platform built with Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, PostgreSQL, Prisma ORM, and Zod.

---

## 1. Architecture Overview

The backend is architected as a **modular monolith** running inside Next.js App Router Route Handlers (`src/app/api/v1/*`), keeping HTTP handling, validation, business domain services, database access, and external integrations strictly separated.

```
src/
├── app/
│   ├── (storefront)/         # Existing pages: /, /shop, /cart, /checkout, etc. (Preserved 100%)
│   └── api/v1/               # Thin Next.js Route Handlers (HTTP, rate-limits, Zod parsing)
│       ├── auth/             # /register, /login, /logout, /me
│       ├── products/         # / (catalog list), /[slug] (details)
│       ├── cart/             # GET, POST, PATCH, DELETE
│       ├── checkout/         # /order, /verify-payment
│       ├── shipping/         # /pincode-check
│       ├── inquiries/        # /corporate, /contact
│       ├── webhooks/         # /razorpay
│       └── health/           # System status & DB connectivity
├── modules/                  # Reusable Domain Services (Pure Business Logic)
│   ├── auth/                 # AuthService (registration, login, profile)
│   ├── catalog/              # CatalogService (filters, sorting, minor unit conversion)
│   ├── cart/                 # CartService (atomic updates, free shipping threshold)
│   ├── checkout/             # CheckoutService (atomic transactions, price locks, signatures)
│   ├── orders/               # OrderService (order lookup, history, tracking)
│   ├── shipping/             # ShippingService (postal code validation, tracking)
│   ├── cms/                  # CmsService (inquiries, contact messages)
│   ├── categories/           # CategoryService
│   ├── collections/          # CollectionService
│   ├── wishlist/             # WishlistService
│   ├── audit/                # AuditService
│   └── analytics/            # AnalyticsService
├── lib/                      # Cross-Cutting Infrastructure
│   ├── db/prisma.ts          # Singleton Prisma Client with connection pooling
│   ├── validation/           # Zod schemas (env.ts, api-validator.ts)
│   ├── security/             # bcrypt hashing, jose JWT sessions, auth guards
│   ├── rate-limit/           # Sliding-window rate limiter
│   ├── storage/r2.ts         # Cloudflare R2 object key generation and CDN resolver
│   ├── email/email-service.ts# Resend transactional email dispatcher with dev fallback
│   ├── observability/logger.ts# Structured logger with sensitive credential masking
│   └── api/                  # Standardized response & centralized error handlers
├── prisma/
│   ├── schema.prisma         # Complete PostgreSQL schema (30+ models & enums)
│   └── seed.ts               # Database seed script for products & packages
└── tests/
    ├── unit/                 # Validation, pricing, security & rate-limit unit tests
    └── integration/          # API response and error formatting tests
```

---

## 2. Getting Started (Local Development)

### Prerequisites
- Node.js >= 20.x
- `pnpm` >= 12.x
- PostgreSQL instance running locally or hosted (e.g. Neon, Supabase, AWS RDS)

### Installation
```bash
# Clone and install dependencies
pnpm install

# Approve build scripts for native engines
pnpm approve-builds --all
```

### Environment Configuration
Copy `.env.example` to `.env.local` (and `.env` for Prisma CLI):
```bash
cp .env.example .env.local
cp .env.example .env
```
Configure your PostgreSQL connection string in `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rasa_db?schema=public"
AUTH_SECRET="your-development-auth-secret-min-32-chars-long"
```

---

## 3. Database Setup & Migrations

```bash
# Generate the strongly-typed Prisma Client
pnpm run db:generate

# Create and apply version-controlled migration against your PostgreSQL database
pnpm run db:migrate

# Seed the database with products, categories, and corporate packages
pnpm run db:seed
```

### Seed Data Credentials (Local Development)
- **Super Admin Email:** `admin@rasasampoorna.com`
- **Super Admin Password:** `RasaAdmin2026!Secure`

---

## 4. Running the Project

```bash
# Start the Next.js development server
pnpm dev

# Execute the automated test suite (Vitest)
pnpm test

# Run TypeScript type checks
pnpm exec tsc --noEmit

# Create optimized production build
pnpm build
```

---

## 5. API Endpoints Catalog (`/api/v1`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health and database connectivity | No |
| `POST` | `/api/v1/auth/register` | Register customer account | No (Rate limited) |
| `POST` | `/api/v1/auth/login` | Authenticate and issue HTTP-only cookie | No (Rate limited) |
| `POST` | `/api/v1/auth/logout` | Clear session cookie | No |
| `GET` | `/api/v1/auth/me` | Fetch active user profile | Yes (`CUSTOMER` / `ADMIN`) |
| `GET` | `/api/v1/products` | Paginated product list with search/filters | No |
| `GET` | `/api/v1/products/[slug]`| Single product details by slug | No |
| `POST` | `/api/v1/products` | Create product | Yes (`ADMIN`) |
| `GET` | `/api/v1/cart` | Retrieve user or guest cart | No (Uses cookie or `x-guest-token`) |
| `POST` | `/api/v1/cart` | Add item to cart with stock validation | No |
| `PATCH` | `/api/v1/cart` | Update cart item quantity | No |
| `DELETE` | `/api/v1/cart` | Remove item or clear cart | No |
| `POST` | `/api/v1/checkout/order` | Create order with price snapshots | No (Rate limited) |
| `POST` | `/api/v1/checkout/verify-payment` | Verify Razorpay HMAC signature | No |
| `POST` | `/api/v1/shipping/pincode-check` | Validate Indian pin code serviceability | No |
| `POST` | `/api/v1/inquiries/corporate` | Submit corporate gifting inquiry | No (Rate limited) |
| `POST` | `/api/v1/inquiries/contact` | Submit patron contact message | No (Rate limited) |
| `POST` | `/api/v1/webhooks/razorpay` | Razorpay payment webhook listener | HMAC Signature Header |

---

## 6. Financial & Security Standards

1. **Monetary Representation:** All prices in the database are stored as **integer minor units** (paise for INR, e.g. ₹4,500 = `450000`). This completely eliminates floating-point rounding errors. The service layer converts to major units for frontend consumption.
2. **Order Snapshots:** Orders snapshot unit prices, product titles, images, SKU, and full shipping address at time of purchase. Future changes to catalog pricing or products will never alter historical financial records.
3. **Atomic Operations:** Inventory deduction, cart clearance, and order confirmation are wrapped in Prisma interactive transactions (`prisma.$transaction`).
4. **Credential Protection:** Structured logging automatically redacts passwords, tokens, API keys, and payment signatures before emitting log messages.
