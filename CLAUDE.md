# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Backend (from /backend)
npm run dev          # nodemon src/server.js (port 5000)
npm start            # node src/server.js

# Frontend (from /frontend)
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

---

## Architecture

### Stack
- **Backend:** Node.js + Express (ESM), MongoDB Atlas via Mongoose, JWT auth, PDFKit for invoices, Winston logging, Zod validation
- **Frontend:** React 18 + Vite (not Next.js), React Router v6, TanStack Query, Zustand, Tailwind CSS, React Hook Form, Recharts, Lucide icons, react-hot-toast

### Multi-tenancy
All data is scoped by `organizationId`. Every Mongoose model applies `basePlugin` (`backend/src/common/basePlugin.js`) which adds `organizationId`, `createdBy`, `updatedBy`, `isDeleted`, `deletedAt` fields and a soft-delete pre-query hook.

Roles: `superAdmin` (platform owner) | `admin` (store admin) | `staff`. Auth middleware in `backend/src/middleware/auth.js` injects `req.user` and `req.organizationId`.

### Backend module layout
```
backend/src/
  modules/{auth,organization,category,product,supplier,customer,
           purchase,sale,stockAdjustment,invoice,dashboard,report,user}/
  middleware/   auth.js, errorHandler.js, rateLimiter.js, validate.js
  config/       db.js (MongoDB), env.js (Zod-validated env)
  common/       basePlugin.js
  utils/        ApiError.js, ApiResponse.js, asyncHandler.js, logger.js, paginate.js
```

Each module exposes REST routes at `/api/v1/{module}`. Standard response envelope:
```json
{ "success": true, "statusCode": 200, "message": "…", "data": {}, "meta": { "totalPages": 1, … } }
```

### Frontend layout
```
frontend/src/
  api/          axios.js (interceptors + auto-refresh), index.js (all API helpers)
  stores/       authStore.js (Zustand — user, org, token)
  lib/          productSchema.js ← IMPORTANT: schema-driven product form definitions
  components/
    Layout/     Sidebar.jsx, Header.jsx, Layout.jsx
    inventory/  AddProductDrawer.jsx, DynField.jsx, ChipsField.jsx
    ui/         shared UI primitives
  pages/        auth/, dashboard/, products/, categories/, …
```

### Dynamic Add Product form
`frontend/src/lib/productSchema.js` defines per-store-type field schemas (`STORE_TYPE_SCHEMAS`) with 5 types: `electronics`, `electrical`, `grocery`, `pharmacy`, `apparel`. Common field groups (`COMMON_BASICS`, `COMMON_ID`, `COMMON_PRICING`, `COMMON_STOCK`) are always rendered; store-type sections render below them.

Sections support `condition: { categoryIn: [...] }` — the section only renders when the selected category matches.

`AddProductDrawer` uses `DynField` to render each field. Supported field types: `text`, `number`, `currency` (₹ prefix), `date`, `select`, `textarea`, `toggle`, `chips`.

The org's `storeType` maps to a schema key via `ORG_TO_SCHEMA_TYPE`:
- `electronics` → `electronics`
- `sanitary` / `hardware` → `electrical`
- `pharmacy` → `pharmacy`
- `grocery` → `grocery`
- `clothing` → `apparel`
- `general` / `other` → no store-type sections (common fields only)

Schema field values are persisted in `products.attributes` as `[{key, value}]`. Arrays (chips) are JSON-stringified. Use `formToAttributes` / `attributesToForm` helpers from productSchema.js to convert.

### Product model attribute conventions
Fields that don't exist as top-level columns go into `attributes`:
- `brand`, `subcategory`, `mrp`, `hsn` (from common basics/pricing)
- All store-type-specific fields (specs, batch, sizes, composition, etc.)

### Auth flow
1. `authApi.login()` → backend sets `refreshToken` httpOnly cookie, returns `accessToken` in body
2. Axios interceptor attaches `Bearer <token>` from `window.__accessToken`
3. On 401, interceptor calls `authApi.refresh()` (uses cookie), queues in-flight requests, retries
4. Zustand `authStore` holds `user`, `organization`, `isAuthenticated`

### Design tokens
Design reference is in `/var/www/html/MockTest/Inventory Management/design_handoff_stockkart/`. The target aesthetic is "modern SaaS — clean, spacious, like Linear/Stripe Dashboard." Primary color `#4F46E5` = Tailwind `primary-600`.

Tailwind custom colors (tailwind.config.js):
- `primary`: `{ 50:#EEF2FF, 100:#E0E7FF, 500:#6366F1, 600:#4F46E5, 700:#4338CA }`

Status pill conventions: `bg-emerald-50 text-emerald-700` (success), `bg-amber-50 text-amber-700` (warning), `bg-red-50 text-red-700` (danger).

---

## Key implementation notes

- The `category` select in AddProductDrawer stores category **ID** (not name) in form state and sends `categoryId` to the API. The categories list is fetched from `/categories`.
- `isAdmin()` from `useAuthStore()` returns true for `admin` and `superAdmin` roles. Gate all write operations behind this.
- Product table reads `p.categoryId?.name` (populated) and `getAttr(p, 'brand')` from attributes.
- Invoice numbers must be sequential per tenant per financial year — the organization model has `invoiceCounter` for this.
- GST: `taxPercent` on products, CGST/SGST split on invoices (intra-state), IGST for inter-state. HSN code required on all taxable invoice lines.
