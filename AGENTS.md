<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RASA Sampoorna — Project Architecture & Engineering Standards

## 1. Project Overview & Tech Stack
- **Framework:** Next.js `16.4.1` (Turbopack, App Router, React `19.3.0`, Server Components enabled, `cacheComponents: true`, `partialPrefetching: true`).
- **Language:** TypeScript 5 in strict mode. Path alias: `@/*` -> `./src/*`.
- **Styling:** Tailwind CSS `4.3.3` with `@tailwindcss/postcss`. Design tokens and custom theme properties are defined in `src/app/globals.css`.
- **Package Manager:** `pnpm` (managed via `pnpm@12.9.1`).
- **Backend Architecture:** Modular monolithic architecture embedded within Next.js Route Handlers (`src/app/api/*`).
- **Database & ORM:** PostgreSQL accessed via Prisma ORM.
- **Validation:** Zod for all incoming request payloads, URL parameters, and environment variables.
- **Authentication:** Custom secure email/password authentication using bcrypt password hashing, session tokens, and HTTP-only, Secure, SameSite cookies with Role-Based Access Control (`CUSTOMER`, `ADMIN`).
- **Payments:** Razorpay Server SDK with HMAC SHA-256 webhook signature validation.
- **Logistics & Shipping:** Shiprocket API for serviceable pin-code validation, AWB generation, and tracking webhooks.
- **Media & Asset Storage:** Cloudflare R2 (S3-compatible API via `@aws-sdk/client-s3`) using presigned URLs for secure uploads.
- **Transactional Email:** Resend (or standard SMTP compatible) for order confirmation, order status updates, and corporate inquiry alerts.
- **Testing:** Vitest for backend services, validators, and route tests; Playwright for critical end-to-end shopping journeys.

---

## 2. Strict UI Preservation Rules (Non-Negotiable)
1. **Zero Redesign:** Do not alter, rebuild, or redesign existing frontend pages (`/`, `/shop`, `/shop/[slug]`, `/cart`, `/checkout`, `/corporate-gifting`, `/contact`, `/faq`, `/policies`).
2. **Hero Section Protection:** The homepage desktop canvas frame sequence (`CanvasScroller`) and mobile hero (`MobileTabletHero`) must remain completely untouched. Do not change their assets, scroll height, canvas rendering, or CSS wrappers.
3. **Design System & Typography:** Maintain the current serif and sans typography, warm neutral/terracotta palette, border radiuses, container widths, and responsive grid layouts.
4. **No Clutter:** Do not add emojis, promotional ribbons, decorative badges, invented stats, artificial reviews, or flash-sale timers.
5. **Decoupled Integration:** Frontend components must connect to backend functionality through established service layers (`src/services/product-service.ts`) and context providers (`src/context/shop-context.tsx`) without altering existing component signatures or layout trees.

---

## 3. Modular Backend Directory Structure
All backend logic is organized cleanly inside `src/server/` to keep route handlers slim and reusable:

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # /login, /register, /logout, /me, /forgot-password
│   │   ├── products/          # / (list & filters), /[slug] (details)
│   │   ├── cart/              # / (sync, add, update, remove)
│   │   ├── checkout/          # /order (create pending order), /verify-payment
│   │   ├── orders/            # / (user orders), /[id] (order tracking)
│   │   ├── shipping/          # /pincode-check, /track
│   │   ├── inquiries/         # /corporate, /contact
│   │   ├── webhooks/          # /razorpay, /shiprocket
│   │   └── admin/             # /products, /orders, /customers, /inquiries
│   └── (frontend pages)...
├── server/
│   ├── db/
│   │   └── prisma.ts          # Singleton PrismaClient instance
│   ├── validators/            # Zod schemas (auth, products, orders, checkout)
│   ├── services/              # Business logic domain services
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   ├── cart.service.ts
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   ├── shipping.service.ts
│   │   └── notification.service.ts
│   ├── integrations/          # External API wrappers
│   │   ├── razorpay.ts
│   │   ├── shiprocket.ts
│   │   ├── r2.ts
│   │   └── resend.ts
│   ├── auth/                  # JWT/session helpers, password hashing, cookies
│   │   ├── session.ts
│   │   ├── password.ts
│   │   └── middleware.ts
│   └── errors/                # Standardized API error handling & response helpers
│       └── api-error.ts
```

---

## 4. Database Schema Requirements (Prisma + PostgreSQL)
Core relational models:
1. **`User`**: `id`, `email` (unique), `passwordHash`, `name`, `phone`, `role` (ENUM: `CUSTOMER`, `ADMIN`), `createdAt`, `updatedAt`.
2. **`Address`**: `id`, `userId`, `name`, `phone`, `street`, `landmark`, `city`, `state`, `postalCode`, `country`, `isDefault`, `createdAt`.
3. **`Product`**: `id`, `slug` (unique), `name`, `category`, `tag`, `price`, `originalPrice`, `rating`, `reviewCount`, `description`, `material`, `size`, `availability`, `detailsList` (JSON string array), `makerNote`, `shippingNote`, `isFeatured`, `images` (string array), `isActive`, `createdAt`, `updatedAt`.
4. **`ProductVariant`**: `id`, `productId`, `sku` (unique), `color`, `size`, `stockQuantity`, `priceAdjustment`.
5. **`Order`**: `id`, `orderNumber` (unique), `userId` (optional for guest checkout), `guestEmail`, `guestPhone`, `status` (ENUM: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`), `totalAmount`, `subtotal`, `shippingFee`, `discountAmount`, `paymentMethod`, `paymentStatus` (ENUM: `PENDING`, `PAID`, `FAILED`), `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `shiprocketOrderId`, `shiprocketShipmentId`, `trackingNumber`, `shippingAddress` (JSON snapshot), `createdAt`, `updatedAt`.
6. **`OrderItem`**: `id`, `orderId`, `productId`, `variantId`, `productName`, `productImage`, `price`, `quantity`, `selectedSize`.
7. **`Cart` & `CartItem`**: Persistent server-side cart for logged-in users, seamlessly synced with client state.
8. **`CorporateInquiry`**: `id`, `name`, `organization`, `email`, `phone`, `quantityRange`, `budget`, `message`, `status`, `createdAt`.
9. **`ContactMessage`**: `id`, `name`, `email`, `phone`, `message`, `status`, `createdAt`.

---

## 5. Security & Validation Standards
1. **Zod Validation:** Every Route Handler must validate incoming payloads using Zod (`safeParse()`). Return `400 Bad Request` with structured error details on failure.
2. **Authentication & Authorization:**
   - Passwords hashed using bcrypt (cost factor >= 10).
   - Session tokens or JWTs stored in secure, `httpOnly`, `sameSite: "lax"`, `secure: true` (in production) cookies.
   - Admin routes (`/api/admin/*`) must enforce role validation checking `role === 'ADMIN'`.
3. **Webhook Verification:**
   - Razorpay webhook payloads must be verified using `crypto.createHmac("sha256", secret).update(rawBody).digest("hex")` before any status change.
   - Shiprocket webhooks must validate auth headers or signed tokens.
4. **Data Protection:**
   - Never log passwords, tokens, API keys, or full customer payment credentials.
   - Never print `.env` files or hardcode credentials in code repositories.

---

## 6. Testing & Quality Requirements
- **Unit & Integration:** All services (`src/server/services/*`) must have tests covering happy path, invalid inputs, edge cases, and transaction rollbacks.
- **E2E:** Critical shopping paths (Cart -> Checkout -> Payment Mock -> Order Confirmation) must be validated via Playwright without regressions to existing UI.

