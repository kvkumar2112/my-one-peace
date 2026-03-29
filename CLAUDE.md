# my-one-peace

A calm, minimal personal finance app for India — your complete money picture, in one peaceful place.

**Goals:** Track income/expenses, plan budgets, monitor investments, manage savings goals, work toward financial independence.

**Target audience:** General audience in India — salaried professionals, freelancers, young earners.

**Design philosophy:** Notion-like calm & minimal. DM Sans + DM Mono typography, #1D9E75 green primary, card-based layout, generous whitespace.

---

## Architecture

Two services. Frontend is a React SPA, backend is a FastAPI REST API with MongoDB.

```
my-one-peace/
├── sunny-ui/          # React frontend
└── nakama-service/    # FastAPI backend
```

---

## Backend — `nakama-service`

**Stack:** Python, FastAPI, MongoDB, Motor (async driver), Beanie ODM, Pydantic v2

**Key files:**
- `app/main.py` — FastAPI app, CORS config, router registration, Beanie init
- `app/core/config.py` — Settings via pydantic-settings, reads from `.env`
- `app/core/security.py` — JWT creation (python-jose), bcrypt password hashing (passlib)
- `app/db/session.py` — Motor client + Beanie document initialization
- `app/models/` — Beanie Document classes (User, Account, Transaction, Budget, Goal, Holding, Document)
- `app/schemas/` — Pydantic v2 request/response schemas
- `app/services/ocr.py` — EasyOCR (images) + pdfplumber (PDFs) for bank statement parsing
- `app/services/ml.py` — Keyword-based transaction auto-categorizer + spending insights generator
- `app/routes/` — Route modules: auth, accounts, transactions, documents, budgets, goals, holdings, analytics

**Data models (MongoDB collections):**
- **Users** — email, hashed_password, full_name, currency (INR), fy_start (april), plan, notifications, timestamps
- **Accounts** — user_id, bank_name, account_type (savings/salary/credit/wallet), last4, balance, color_gradient, status, last_synced
- **Transactions** — user_id, account_id, amount, category, subcategory, description, date, type (income/expense/transfer), source (manual/csv_import/ocr_import), tags, is_recurring, document_id, ai_category_confidence
- **Budgets** — user_id, category, label, limit_amount, period (monthly/weekly), icon
- **Goals** — user_id, name, target_amount, saved_amount, monthly_contribution, target_date, icon, color, status (active/completed/paused)
- **Holdings** — user_id, name, ticker, type (mutual_fund/stock/etf/ppf_epf/fd/gold), platform, quantity, avg_buy_price, current_price, invested_amount, current_value
- **Documents** — user_id, filename, file_path, file_type, parsed_data, status (uploaded/parsing/parsed/failed), transactions_created

**API routes (all under /api/v1):**

Auth:
- `POST /auth/register` — Create account, returns JWT
- `POST /auth/login` — Email + password, returns JWT + user
- `POST /auth/logout` — Invalidate token
- `GET /auth/me` — Current user profile (protected)
- `PUT /auth/me` — Update profile/preferences (protected)

Accounts:
- `GET /accounts` — List linked accounts
- `POST /accounts` — Add account
- `PUT /accounts/{id}` — Update account
- `DELETE /accounts/{id}` — Remove account

Transactions:
- `GET /transactions` — List with filters (date_from, date_to, category, account_id, type, search) + pagination
- `POST /transactions` — Add transaction (auto-categorize if no category provided)
- `GET /transactions/{id}` — Single transaction
- `PUT /transactions/{id}` — Update
- `DELETE /transactions/{id}` — Delete
- `POST /transactions/import` — Upload CSV/statement, parse, return preview

Documents:
- `POST /documents/upload` — Upload bank statement (PDF/image/CSV)
- `POST /documents/{id}/parse` — Trigger OCR + extraction
- `GET /documents/{id}/preview` — Parsed transaction preview before import
- `POST /documents/{id}/confirm` — Confirm and bulk-create transactions
- `GET /documents` — List uploaded documents

Budgets:
- `GET /budgets` — List budgets (includes computed spent_amount from transactions)
- `POST /budgets` — Create budget
- `PUT /budgets/{id}` — Update
- `DELETE /budgets/{id}` — Delete
- `GET /budgets/recommendations` — AI-recommended budgets based on spending history

Goals:
- `GET /goals` — List savings goals
- `POST /goals` — Create goal
- `PUT /goals/{id}` — Update goal
- `DELETE /goals/{id}` — Delete goal
- `POST /goals/{id}/contribute` — Add contribution

Holdings:
- `GET /holdings` — List holdings with computed P&L
- `POST /holdings` — Add holding (manual entry)
- `PUT /holdings/{id}` — Update holding
- `DELETE /holdings/{id}` — Remove holding
- `GET /holdings/summary` — Portfolio summary (total value, invested, P&L, allocation, XIRR)

Analytics:
- `GET /analytics/summary` — Dashboard metrics (net worth, income, spend, savings rate)
- `GET /analytics/spending` — Spending by category for a period
- `GET /analytics/cashflow` — Monthly income vs expense (last N months)
- `GET /analytics/trends` — Spending trends over time
- `GET /analytics/insights` — AI-generated monthly insights and nudges
- `GET /analytics/forecast` — ML spending forecast (placeholder)

**Config (from `.env`):**
- `MONGODB_URL` — default: `mongodb://localhost:27017/my_one_peace`
- `SECRET_KEY` — JWT signing key
- `ALLOWED_ORIGINS` — default: `["http://localhost:3000"]`
- `UPLOAD_DIR` — where uploaded documents are stored

**Dependencies:** fastapi, uvicorn, motor, beanie, pydantic v2, python-jose, passlib, easyocr, pdfplumber, Pillow, scikit-learn, pandas, numpy

---

## Frontend — `sunny-ui`

**Stack:** React 18, Vite, TypeScript, TailwindCSS

**Libraries:**
- `react-router-dom` v6 — routing
- `axios` — HTTP client; `src/services/api.ts` has base instance with JWT Bearer interceptor (reads token from `localStorage`)
- `zustand` — auth state only (user, token, isAuthenticated)
- `@tanstack/react-query` — ALL server data fetching, caching, mutations
- `recharts` — charts (bar, line, doughnut, area)
- `react-hook-form` + `zod` — all forms and validation
- `lucide-react` — icons

**Pages (9 total):**

| Route | Page | Auth |
|-------|------|------|
| `/login` | Login | No |
| `/register` | Register | No |
| `/` | Overview (Dashboard) | Yes |
| `/spending` | Spending & Expenses | Yes |
| `/budgets` | Budgets | Yes |
| `/investments` | Investments & Portfolio | Yes |
| `/accounts` | Accounts & Cards | Yes |
| `/goals` | Savings Goals | Yes |
| `/settings` | Settings | Yes |

**Component structure:**
```
src/
├── pages/          # Route page components
├── components/     # Shared components (Sidebar, MetricCard, TransactionRow, etc.)
├── hooks/          # Custom hooks (useTransactions, useBudgets, etc.)
├── stores/         # Zustand stores (authStore)
├── services/       # API client (api.ts)
├── schemas/        # Zod validation schemas
└── types/          # TypeScript interfaces
```

**Design system:**
- Fonts: DM Sans (UI text), DM Mono (numbers/amounts)
- Primary: #1D9E75 (green)
- Semantic: safe #0F6E56, warning #BA7517/#EF9F27, danger #993C1D/#E24B4A
- Layout: 220px sidebar, 28px content padding, card-based with 0.5px borders
- Active nav: #E1F5EE background, #0F6E56 text

---

## AI & Smart Features

1. **Auto-categorization** — Keyword-based matching of Indian merchants (Swiggy→food, Ola→transport, Amazon→shopping, etc.). Stores confidence score. If < 0.7, shown as suggestion for user to confirm.

2. **Monthly spending insights** — Rules-based: flag category increases > 20%, identify top merchants, detect unusual transactions (> 2x category average), calculate savings rate trends.

3. **Smart budget recommendations** — Analyze 3-month spending, suggest limits at 90th percentile, recommend new budgets for categories with > ₹2,000/month spend.

---

## Document Import Flow

Integrated into the Spending/Transactions page (not a separate page):

1. **Upload** — User clicks "Import statement", selects PDF/image/CSV
2. **Parse** — Backend: pdfplumber (PDFs), EasyOCR (images), pandas (CSVs)
3. **Auto-categorize** — ML categorizer runs on each parsed transaction
4. **Preview** — Frontend shows editable preview table
5. **Confirm** — User confirms, bulk-creates transactions linked to document

---

## Auth Flow

- JWT-based, token in localStorage, sent as `Authorization: Bearer <token>`
- 7-day expiry, no refresh token in v1
- Backend: `get_current_user` dependency decodes JWT on protected routes
- Frontend: Zustand store + ProtectedRoute wrapper + hydration via GET /auth/me on app load

---

## Key Conventions

- All API routes under `/api/v1` prefix
- Pydantic v2 style for all FastAPI schemas
- MongoDB via Motor (async) + Beanie ODM
- React Query for ALL data fetching (no raw useEffect for API calls)
- Zustand ONLY for auth state; server data lives in React Query cache
- Indian financial context: INR currency, Indian number formatting (₹1,20,000), April–March FY, Indian bank names, Indian merchant categories
- OCR optimized for Indian bank statement formats
- Consistent error responses: `{detail: string}` with HTTP status codes
- CORS: allow frontend origin
- File uploads: local UPLOAD_DIR, expandable to S3/R2 later

---

## Phased Build Order

**Phase 1 — Foundation:**
1. MongoDB setup, Beanie models for all 7 collections
2. Auth endpoints (register, login, me) with JWT + bcrypt
3. Frontend: Auth pages, Zustand store, ProtectedRoute
4. Frontend: Sidebar layout, routing for all pages

**Phase 2 — Core:**
1. Transactions CRUD (backend + frontend)
2. Accounts CRUD (backend + frontend)
3. Overview dashboard with analytics endpoints
4. Spending page with charts and transaction list

**Phase 3 — Budgets, Goals, Investments:**
1. Budgets CRUD with computed spent amounts
2. Savings goals with contributions
3. Holdings (manual entry) with P&L and allocation
4. Settings page

**Phase 4 — Intelligence & Import:**
1. Auto-categorization wired into transaction creation
2. Document upload + OCR + preview + bulk import
3. Monthly spending insights
4. Smart budget recommendations
5. CSV import support

---

## Future Scope (not in v1)

- Live market data (NSE/BSE APIs) for real-time portfolio prices
- Bank API integration via Account Aggregator (Setu / Sahamati)
- Family / shared accounts
- Monetization (freemium)
- Mobile app (React Native)
- ML spending forecast (Prophet/ARIMA)
- Recurring transaction detection
- Bill reminders
- Tax planning (80C, 80D, HRA)
- Dark mode implementation
