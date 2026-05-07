# 📦 Inventory SaaS — Multi-Store Inventory Management System

A production-grade multi-tenant SaaS Inventory Management System built with the MERN stack.

---

## 🚀 Quick Start (Local Dev)

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd inventory-saas
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Visit: http://localhost:5173

---

## 🐳 Docker (Recommended)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env

docker compose up -d
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health: http://localhost:5000/health

---

## 🏛️ Architecture

- **Multi-tenant** — Every record scoped to `organizationId`
- **Roles** — Admin / Staff (+ SuperAdmin)
- **Soft Delete** — All deletes are reversible
- **JWT Auth** — Access token (7d) + Refresh token (30d) in httpOnly cookie

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register + create organization |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Get current user |
| GET | `/api/v1/dashboard/stats` | Dashboard KPIs |
| CRUD | `/api/v1/categories` | Category management |
| CRUD | `/api/v1/products` | Product management |
| CRUD | `/api/v1/suppliers` | Supplier management |
| CRUD | `/api/v1/customers` | Customer management |
| CRUD | `/api/v1/purchases` | Purchase (Stock In) |
| CRUD | `/api/v1/sales` | Sales (Stock Out) |
| POST | `/api/v1/stock-adjustments` | Manual stock corrections |
| GET | `/api/v1/invoices/:id/pdf` | Download invoice PDF |
| GET | `/api/v1/reports/sales` | Sales report |
| GET | `/api/v1/reports/purchases` | Purchase report |
| GET | `/api/v1/reports/stock` | Stock report |
| GET | `/api/v1/reports/profit` | Profit report |

---

## 📁 Project Structure

```
inventory-saas/
├── backend/
│   └── src/
│       ├── modules/          # auth, organization, category, product...
│       ├── middleware/        # auth, errorHandler, rateLimiter, validate
│       ├── common/           # basePlugin (multi-tenancy + soft delete)
│       ├── utils/            # ApiError, ApiResponse, logger, paginate
│       ├── config/           # db, env
│       ├── app.js
│       └── server.js
├── frontend/
│   └── src/
│       ├── api/              # axios instance + all API calls
│       ├── stores/           # Zustand auth store
│       ├── components/       # UI components + Layout
│       └── pages/            # All page components
├── docker-compose.yml
└── README.md
```

---

## 🔐 Default Login (after register)

Register at `/register` to create your account and organization.
