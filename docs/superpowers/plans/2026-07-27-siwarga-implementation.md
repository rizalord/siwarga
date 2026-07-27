# SIWarga Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SIWarga — a web app for RT-level administration: manage residents, houses, monthly dues, expenses, and financial reports.

**Architecture:** API-only Laravel backend (Sanctum auth) + standalone React SPA frontend (shadcn-admin). API-contract first with MSW for frontend mock during development. Frontend-first: all modules built with dummy data via MSW, then backend implements real API.

**Tech Stack:** Laravel 13 (backend), React 19 + TypeScript + Vite + shadcn/ui (frontend), TanStack Router + Query, Recharts, MSW, PHPUnit, Vitest, Playwright.

## Global Constraints

- All models have soft delete (`deleted_at`)
- API responses always wrapped in `{ data: T, message?: string }`
- Paginated responses use `{ data: T[], current_page, last_page, per_page, total }`
- Auth via Laravel Sanctum (Bearer token, 24h expiry, refresh mechanism)
- Permission format: `{module}.{action}` (e.g., `residents.create`)
- Frontend follows shadcn-admin `features/` pattern: thin route → feature module
- Laravel runs API-only (Inertia removed/dormant)
- No payment gateway, no WhatsApp/email notifications

---

## File Structure Map

### Frontend (new/modified files)

```
src/frontend/src/
├── types/
│   └── api.ts                          # NEW — all API contracts
├── services/
│   ├── api.ts                          # NEW — Axios instance + interceptors
│   ├── auth.ts                         # NEW — login, logout, refresh, me
│   ├── residents.ts                    # NEW
│   ├── houses.ts                       # NEW
│   ├── due-types.ts                    # NEW
│   ├── bills.ts                        # NEW
│   ├── payments.ts                     # NEW
│   ├── expenses.ts                     # NEW
│   ├── reports.ts                      # NEW
│   └── users.ts                        # NEW
├── mocks/
│   ├── handlers/
│   │   ├── auth.ts                     # NEW
│   │   ├── residents.ts                # NEW
│   │   ├── houses.ts                   # NEW
│   │   ├── due-types.ts               # NEW
│   │   ├── bills.ts                    # NEW
│   │   ├── payments.ts                 # NEW
│   │   ├── expenses.ts                 # NEW
│   │   ├── reports.ts                  # NEW
│   │   └── users.ts                    # NEW
│   ├── data/
│   │   ├── residents.ts                # NEW — mock data fixtures
│   │   ├── houses.ts                   # NEW
│   │   ├── due-types.ts               # NEW
│   │   ├── bills.ts                    # NEW
│   │   ├── payments.ts                 # NEW
│   │   ├── expenses.ts                 # NEW
│   │   └── users.ts                    # NEW
│   └── browser.ts                      # NEW — MSW browser worker setup
├── hooks/
│   ├── use-residents.ts                # NEW
│   ├── use-houses.ts                   # NEW
│   ├── use-due-types.ts                # NEW
│   ├── use-bills.ts                    # NEW
│   ├── use-payments.ts                 # NEW
│   ├── use-expenses.ts                 # NEW
│   ├── use-reports.ts                  # NEW
│   └── use-users.ts                    # NEW
├── features/
│   ├── siwarga-residents/
│   │   ├── index.tsx                   # NEW — main page
│   │   ├── residents-table.tsx         # NEW
│   │   ├── resident-form.tsx           # NEW
│   │   ├── resident-detail.tsx         # NEW
│   │   └── residents-columns.tsx       # NEW
│   ├── siwarga-houses/
│   │   ├── index.tsx                   # NEW
│   │   ├── houses-table.tsx            # NEW
│   │   ├── house-form.tsx              # NEW
│   │   ├── house-detail.tsx            # NEW
│   │   ├── house-history.tsx           # NEW — timeline component
│   │   └── houses-columns.tsx          # NEW
│   ├── siwarga-due-types/
│   │   ├── index.tsx                   # NEW
│   │   └── due-type-form.tsx           # NEW
│   ├── siwarga-bills/
│   │   ├── index.tsx                   # NEW
│   │   ├── bills-table.tsx             # NEW
│   │   └── generate-button.tsx         # NEW
│   ├── siwarga-payments/
│   │   ├── index.tsx                   # NEW
│   │   └── payment-form.tsx            # NEW
│   ├── siwarga-expenses/
│   │   ├── index.tsx                   # NEW
│   │   └── expense-form.tsx            # NEW
│   ├── siwarga-dashboard/
│   │   ├── index.tsx                   # NEW — replaces existing features/dashboard
│   │   ├── income-expense-chart.tsx    # NEW
│   │   └── summary-cards.tsx           # NEW
│   └── siwarga-users/
│       ├── index.tsx                   # NEW
│       └── user-form.tsx               # NEW
├── routes/_authenticated/
│   ├── index.tsx                       # MODIFY — point to siwarga-dashboard
│   └── (new route files)               # NEW — one per module
├── components/layout/data/
│   └── sidebar-data.ts                # MODIFY — replace with SIWarga nav
├── stores/
│   └── auth-store.ts                   # MODIFY — adapt for Sanctum
└── main.tsx                            # MODIFY — add MSW browser worker
```

### Backend (new files)

```
src/backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php      # NEW
│   │   │   ├── ResidentController.php  # NEW
│   │   │   ├── HouseController.php     # NEW
│   │   │   ├── DueTypeController.php   # NEW
│   │   │   ├── BillController.php      # NEW
│   │   │   ├── PaymentController.php   # NEW
│   │   │   ├── ExpenseController.php   # NEW
│   │   │   ├── ReportController.php    # NEW
│   │   │   └── UserController.php      # NEW
│   │   └── Resources/
│   │       ├── ResidentResource.php    # NEW
│   │       ├── HouseResource.php       # NEW
│   │       ├── BillResource.php        # NEW
│   │       ├── PaymentResource.php     # NEW
│   │       └── ExpenseResource.php     # NEW
│   ├── Models/
│   │   ├── Resident.php                # NEW
│   │   ├── House.php                   # NEW
│   │   ├── HouseResident.php           # NEW
│   │   ├── DueType.php                 # NEW
│   │   ├── Bill.php                    # NEW
│   │   ├── Payment.php                 # NEW
│   │   ├── Expense.php                 # NEW
│   │   ├── Role.php                    # NEW
│   │   ├── Permission.php              # NEW
│   │   └── User.php                    # MODIFY — add relationships
│   ├── Services/
│   │   ├── BillGenerationService.php   # NEW
│   │   └── ReportService.php           # NEW
│   └── Policies/
│       ├── ResidentPolicy.php          # NEW
│       ├── HousePolicy.php             # NEW
│       ├── BillPolicy.php              # NEW
│       ├── PaymentPolicy.php           # NEW
│       ├── ExpensePolicy.php           # NEW
│       └── UserPolicy.php              # NEW
├── database/
│   ├── migrations/
│   │   ├── (new migration files)       # NEW — 7+ migration files
│   └── seeders/
│       ├── DatabaseSeeder.php          # MODIFY
│       ├── RolePermissionSeeder.php    # NEW
│       └── DueTypeSeeder.php           # NEW
├── routes/
│   └── api.php                         # NEW — all API routes
└── tests/
    ├── Feature/Api/
    │   ├── AuthTest.php                # NEW
    │   ├── ResidentTest.php            # NEW
    │   ├── HouseTest.php               # NEW
    │   ├── BillTest.php                # NEW
    │   ├── PaymentTest.php             # NEW
    │   ├── ExpenseTest.php             # NEW
    │   └── ReportTest.php              # NEW
    └── Unit/
        ├── BillGenerationServiceTest.php # NEW
        └── ReportServiceTest.php        # NEW
```

---

## Phase 0 — Foundation

### Task 0.1: Define API Contracts (TypeScript Types)

**Files:**
- Create: `src/frontend/src/types/api.ts`

**Interfaces:**
- Produces: All TypeScript interfaces consumed by every subsequent frontend task

- [ ] **Step 1: Create `src/types/api.ts` with all API contracts**

```typescript
// Response wrappers
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// Auth
export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  permissions: string[]
}

export interface User {
  id: number
  name: string
  email: string
  is_active: boolean
  resident_id: number | null
  roles: Role[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Role {
  id: number
  name: string
  description: string
}

export interface Permission {
  id: number
  name: string
  description: string
}

// Residents
export interface Resident {
  id: number
  full_name: string
  ktp_photo_url: string | null
  status: 'kontrak' | 'tetap'
  phone_number: string
  marital_status: 'menikah' | 'belum_menikah'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateResidentRequest {
  full_name: string
  status: 'kontrak' | 'tetap'
  phone_number: string
  marital_status: 'menikah' | 'belum_menikah'
  ktp_photo?: File
}

export interface UpdateResidentRequest extends Partial<CreateResidentRequest> {}

// Houses
export interface House {
  id: number
  house_number: string
  address: string
  status: 'dihuni' | 'kosong'
  current_resident?: Resident
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateHouseRequest {
  house_number: string
  address?: string
}

export interface HouseResident {
  id: number
  house_id: number
  resident: Resident
  start_date: string
  end_date: string | null
}

export interface AssignResidentRequest {
  resident_id: number
  start_date: string
}

// Due Types
export interface DueType {
  id: number
  name: string
  amount: number
  billing_cycle: 'bulanan' | 'fleksibel'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateDueTypeRequest {
  name: string
  amount: number
  billing_cycle: 'bulanan' | 'fleksibel'
}

// Bills
export interface Bill {
  id: number
  house: House
  resident: Resident
  due_type: DueType
  period_start: string
  period_end: string
  amount_due: number
  status: 'lunas' | 'belum_lunas'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GenerateBillsRequest {
  month: number
  year: number
}

// Payments
export interface Payment {
  id: number
  bill_id: number
  bill?: Bill
  amount_paid: number
  payment_date: string
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreatePaymentRequest {
  bill_id: number
  amount_paid: number
  payment_date: string
  notes?: string
}

// Expenses
export interface Expense {
  id: number
  category: string
  description: string | null
  amount: number
  expense_date: string
  created_by: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateExpenseRequest {
  category: string
  description?: string
  amount: number
  expense_date: string
}

// Reports
export interface MonthlyReport {
  year: number
  month: number
  total_income: number
  total_expense: number
  balance: number
  payments: Payment[]
  expenses: Expense[]
}

export interface YearlySummary {
  year: number
  monthly_data: Array<{
    month: number
    total_income: number
    total_expense: number
    balance: number
  }>
  year_balance: number
}

// DTOs for list filters
export interface ResidentFilter {
  status?: string
  search?: string
  page?: number
  per_page?: number
}

export interface HouseFilter {
  status?: string
  page?: number
  per_page?: number
}

export interface BillFilter {
  month?: number
  year?: number
  status?: string
  house_id?: number
  page?: number
  per_page?: number
}

export interface ExpenseFilter {
  month?: number
  year?: number
  category?: string
  page?: number
  per_page?: number
}
```

- [ ] **Step 2: Run tsc to verify types compile**

Run: `cd src/frontend && npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/types/api.ts
git commit -m "feat(api): add TypeScript API contracts for all modules"
```

---

### Task 0.2: Setup Axios Instance + Auth Interceptor

**Files:**
- Create: `src/frontend/src/services/api.ts`
- Create: `src/frontend/src/services/auth.ts`
- Modify: `src/frontend/src/stores/auth-store.ts`

**Interfaces:**
- Consumes: `AuthResponse`, `LoginRequest` from `src/types/api.ts`
- Produces: Axios `api` instance with interceptors, `authService` with login/logout/refresh/me

- [ ] **Step 1: Write auth-store tests**

Create `src/frontend/src/stores/auth-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth-store'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('should start with no token and no user', () => {
    const state = useAuthStore.getState()
    expect(state.auth.accessToken).toBe('')
    expect(state.auth.user).toBeNull()
  })

  it('should set access token', () => {
    useAuthStore.getState().auth.setAccessToken('test-token')
    expect(useAuthStore.getState().auth.accessToken).toBe('test-token')
  })

  it('should set user', () => {
    const user = { id: 1, name: 'Test', email: 'test@test.com', permissions: [] }
    useAuthStore.getState().auth.setUser(user)
    expect(useAuthStore.getState().auth.user).toEqual(user)
  })

  it('should reset state', () => {
    useAuthStore.getState().auth.setAccessToken('test-token')
    useAuthStore.getState().auth.reset()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
  })
})
```

Run: `cd src/frontend && npx vitest run stores/auth-store.test.ts`
Expected: PASS

- [ ] **Step 2: Create `src/services/api.ts` — Axios instance with refresh interceptor**

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Attach token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh on 401
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` },
        })
        const newToken = data.data.token
        useAuthStore.getState().auth.setAccessToken(newToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().auth.reset()
        window.location.href = '/sign-in'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
```

- [ ] **Step 3: Create `src/services/auth.ts`**

```typescript
import api from './api'
import type { ApiResponse, AuthResponse, LoginRequest } from '@/types/api'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>('/api/auth/login', data),

  logout: () =>
    api.post<ApiResponse<null>>('/api/auth/logout'),

  refresh: () =>
    api.post<ApiResponse<{ token: string }>>('/api/auth/refresh'),

  me: () =>
    api.get<ApiResponse<{ user: AuthResponse['user']; permissions: string[] }>>('/api/auth/me'),
}
```

- [ ] **Step 4: Update auth-store to match Sanctum response structure**

Modify `src/frontend/src/stores/auth-store.ts` to use proper `AuthUser`:

```typescript
import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'siwarga_access_token'

interface AuthUser {
  id: number
  name: string
  email: string
  permissions: string[]
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (token: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = getCookie(ACCESS_TOKEN)
  const initToken = cookieState ? JSON.parse(cookieState) : ''
  return {
    auth: {
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
```

- [ ] **Step 5: Run tests to verify**

Run: `cd src/frontend && npx vitest run stores/auth-store.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/services/ src/frontend/src/stores/auth-store.ts
git commit -m "feat(api): add Axios instance with refresh interceptor and auth service"
```

---

### Task 0.3: Setup MSW + Mock Data

**Files:**
- Create: `src/frontend/src/mocks/browser.ts`
- Create: `src/frontend/src/mocks/data/residents.ts`
- Create: `src/frontend/src/mocks/data/houses.ts`
- Create: `src/frontend/src/mocks/data/due-types.ts`
- Create: `src/frontend/src/mocks/data/bills.ts`
- Create: `src/frontend/src/mocks/data/payments.ts`
- Create: `src/frontend/src/mocks/data/expenses.ts`
- Create: `src/frontend/src/mocks/data/users.ts`
- Create: `src/frontend/src/mocks/handlers/auth.ts`
- Create: `src/frontend/src/mocks/handlers/residents.ts`
- Create: `src/frontend/src/mocks/handlers/houses.ts`
- Create: `src/frontend/src/mocks/handlers/due-types.ts`
- Create: `src/frontend/src/mocks/handlers/bills.ts`
- Create: `src/frontend/src/mocks/handlers/payments.ts`
- Create: `src/frontend/src/mocks/handlers/expenses.ts`
- Create: `src/frontend/src/mocks/handlers/reports.ts`
- Create: `src/frontend/src/mocks/handlers/users.ts`
- Create: `src/frontend/src/mocks/handlers/index.ts`
- Modify: `src/frontend/src/main.tsx`

**Interfaces:**
- Consumes: All types from `src/types/api.ts`
- Produces: MSW handlers that return mock data matching the API contracts

- [ ] **Step 1: Create mock data fixtures**

Create `src/frontend/src/mocks/data/residents.ts`:

```typescript
import type { Resident } from '@/types/api'

export const mockResidents: Resident[] = [
  {
    id: 1,
    full_name: 'Ahmad Fauzi',
    ktp_photo_url: null,
    status: 'tetap',
    phone_number: '081234567890',
    marital_status: 'menikah',
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    full_name: 'Siti Nurhaliza',
    ktp_photo_url: null,
    status: 'kontrak',
    phone_number: '081234567891',
    marital_status: 'belum_menikah',
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
```

Create `src/frontend/src/mocks/data/houses.ts`:

```typescript
import type { House } from '@/types/api'

export const mockHouses: House[] = [
  {
    id: 1,
    house_number: 'A-01',
    address: 'Jl. Mawar No. 1',
    status: 'dihuni',
    current_resident: { id: 1, full_name: 'Ahmad Fauzi', status: 'tetap', phone_number: '081234567890', marital_status: 'menikah', ktp_photo_url: null, created_at: '', updated_at: '', deleted_at: null },
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    house_number: 'A-02',
    address: 'Jl. Mawar No. 2',
    status: 'kosong',
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
```

Create `src/frontend/src/mocks/data/due-types.ts`:

```typescript
import type { DueType } from '@/types/api'

export const mockDueTypes: DueType[] = [
  { id: 1, name: 'Iuran Satpam', amount: 100000, billing_cycle: 'bulanan', created_at: '', updated_at: '', deleted_at: null },
  { id: 2, name: 'Iuran Kebersihan', amount: 15000, billing_cycle: 'bulanan', created_at: '', updated_at: '', deleted_at: null },
]
```

Create `src/frontend/src/mocks/data/bills.ts`:

```typescript
import type { Bill } from '@/types/api'

export const mockBills: Bill[] = [
  {
    id: 1,
    house: { id: 1, house_number: 'A-01', address: 'Jl. Mawar No. 1', status: 'dihuni', created_at: '', updated_at: '', deleted_at: null },
    resident: { id: 1, full_name: 'Ahmad Fauzi', status: 'tetap', phone_number: '081234567890', marital_status: 'menikah', ktp_photo_url: null, created_at: '', updated_at: '', deleted_at: null },
    due_type: { id: 1, name: 'Iuran Satpam', amount: 100000, billing_cycle: 'bulanan', created_at: '', updated_at: '', deleted_at: null },
    period_start: '2026-07-01',
    period_end: '2026-07-31',
    amount_due: 100000,
    status: 'belum_lunas',
    created_at: '2026-07-01T00:00:00.000000Z',
    updated_at: '2026-07-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
```

Create `src/frontend/src/mocks/data/payments.ts`:

```typescript
import type { Payment } from '@/types/api'

export const mockPayments: Payment[] = [
  {
    id: 1,
    bill_id: 1,
    amount_paid: 100000,
    payment_date: '2026-07-15',
    notes: 'Bayar iuran bulan Juli',
    created_by: 1,
    created_at: '2026-07-15T00:00:00.000000Z',
    updated_at: '2026-07-15T00:00:00.000000Z',
    deleted_at: null,
  },
]
```

Create `src/frontend/src/mocks/data/expenses.ts`:

```typescript
import type { Expense } from '@/types/api'

export const mockExpenses: Expense[] = [
  {
    id: 1,
    category: 'Gaji Satpam',
    description: 'Gaji satpam bulan Juli 2026',
    amount: 500000,
    expense_date: '2026-07-01',
    created_by: 1,
    created_at: '2026-07-01T00:00:00.000000Z',
    updated_at: '2026-07-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
```

Create `src/frontend/src/mocks/data/users.ts`:

```typescript
import type { User } from '@/types/api'

export const mockUsers: User[] = [
  {
    id: 1,
    name: 'Admin RT',
    email: 'admin@siwarga.test',
    is_active: true,
    resident_id: null,
    roles: [{ id: 1, name: 'admin', description: 'Administrator' }],
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
```

- [ ] **Step 2: Create MSW handlers per module**

Create `src/frontend/src/mocks/handlers/auth.ts`:

```typescript
import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    const user = mockUsers.find((u) => u.email === body.email)
    if (!user) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }
    return HttpResponse.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email, permissions: ['*'] },
        token: 'mock-token-123',
      },
    })
  }),

  http.post('/api/auth/logout', () =>
    HttpResponse.json({ data: null, message: 'Logged out' })),

  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ data: { token: 'mock-token-refreshed' } })),

  http.get('/api/auth/me', () => {
    const user = mockUsers[0]
    return HttpResponse.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        permissions: ['*'],
      },
    })
  }),
]
```

Create `src/frontend/src/mocks/handlers/residents.ts`:

```typescript
import { http, HttpResponse } from 'msw'
import { mockResidents } from '../data/residents'

let residents = [...mockResidents]
let nextId = 100

export const residentHandlers = [
  http.get('/api/residents', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    let filtered = [...residents]
    if (status) filtered = filtered.filter((r) => r.status === status)
    if (search) filtered = filtered.filter((r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()),
    )
    return HttpResponse.json({
      data: filtered,
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: filtered.length,
    })
  }),

  http.get('/api/residents/:id', ({ params }) => {
    const resident = residents.find((r) => r.id === Number(params.id))
    if (!resident) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: resident })
  }),

  http.post('/api/residents', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newResident = {
      id: nextId++,
      full_name: body.full_name as string,
      ktp_photo_url: null,
      status: body.status as 'kontrak' | 'tetap',
      phone_number: body.phone_number as string,
      marital_status: body.marital_status as 'menikah' | 'belum_menikah',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    residents.push(newResident)
    return HttpResponse.json({ data: newResident }, { status: 201 })
  }),

  http.put('/api/residents/:id', async ({ params, request }) => {
    const idx = residents.findIndex((r) => r.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    residents[idx] = { ...residents[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: residents[idx] })
  }),

  http.delete('/api/residents/:id', ({ params }) => {
    const idx = residents.findIndex((r) => r.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    residents[idx] = { ...residents[idx], deleted_at: new Date().toISOString() }
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
```

Create `src/frontend/src/mocks/handlers/houses.ts`:

```typescript
import { http, HttpResponse } from 'msw'
import { mockHouses } from '../data/houses'

let houses = [...mockHouses]
let nextId = 100

export const houseHandlers = [
  http.get('/api/houses', () =>
    HttpResponse.json({ data: houses, current_page: 1, last_page: 1, per_page: 10, total: houses.length })),

  http.get('/api/houses/:id', ({ params }) => {
    const house = houses.find((h) => h.id === Number(params.id))
    if (!house) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: house })
  }),

  http.post('/api/houses', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newHouse = {
      id: nextId++,
      house_number: body.house_number as string,
      address: (body.address as string) || '',
      status: 'kosong' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    houses.push(newHouse)
    return HttpResponse.json({ data: newHouse }, { status: 201 })
  }),

  http.put('/api/houses/:id', async ({ params, request }) => {
    const idx = houses.findIndex((h) => h.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    houses[idx] = { ...houses[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: houses[idx] })
  }),

  http.get('/api/houses/:id/history', ({ params }) => {
    return HttpResponse.json({
      data: [
        { id: 1, house_id: Number(params.id), resident: { id: 1, full_name: 'Ahmad Fauzi' }, start_date: '2024-01-01', end_date: null },
      ],
    })
  }),

  http.post('/api/houses/:id/assign-resident', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const houseIdx = houses.findIndex((h) => h.id === Number(params.id))
    if (houseIdx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    houses[houseIdx] = {
      ...houses[houseIdx],
      status: 'dihuni',
      current_resident: { id: body.resident_id as number, full_name: 'Assigned Resident', status: 'tetap' } as never,
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json({ data: houses[houseIdx] })
  }),
]
```

Similarly create handlers for `due-types.ts`, `bills.ts`, `payments.ts`, `expenses.ts`, `reports.ts`, `users.ts` following the same pattern (mock CRUD with in-memory array).

- [ ] **Step 3: Create `src/mocks/handlers/index.ts` that exports all handlers**

```typescript
import { authHandlers } from './auth'
import { residentHandlers } from './residents'
import { houseHandlers } from './houses'
import { dueTypeHandlers } from './due-types'
import { billHandlers } from './bills'
import { paymentHandlers } from './payments'
import { expenseHandlers } from './expenses'
import { reportHandlers } from './reports'
import { userHandlers } from './users'

export const handlers = [
  ...authHandlers,
  ...residentHandlers,
  ...houseHandlers,
  ...dueTypeHandlers,
  ...billHandlers,
  ...paymentHandlers,
  ...expenseHandlers,
  ...reportHandlers,
  ...userHandlers,
]
```

- [ ] **Step 4: Create `src/mocks/browser.ts`**

```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

- [ ] **Step 5: Add MSW import to `main.tsx`**

Add at the top of `src/frontend/src/main.tsx`:

```typescript
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}
```

Then wrap the render call:

```typescript
enableMocking().then(() => {
  const rootElement = document.getElementById('root')!
  if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(...)
  }
})
```

- [ ] **Step 6: Install MSW**

Run: `cd src/frontend && npm install msw --save-dev && npx msw init public/ --save`
Expected: `public/mockServiceWorker.js` created

- [ ] **Step 7: Verify tsc compiles**

Run: `cd src/frontend && npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add src/frontend/src/mocks/ src/frontend/src/main.tsx
git commit -m "feat(api): add MSW setup with mock data and handlers for all modules"
```

---

### Task 0.4: Adapt Sign-In Page for Sanctum Auth

**Files:**
- Create: `src/frontend/src/features/auth/sign-in/components/siwarga-sign-in-form.tsx`
- Modify: `src/frontend/src/features/auth/sign-in/index.tsx`

**Interfaces:**
- Consumes: `authService` + `useAuthStore`
- Produces: Working sign-in page that stores Sanctum token

- [ ] **Step 1: Write sign-in unit test**

Create `src/frontend/src/features/auth/sign-in/components/siwarga-sign-in-form.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SiwargaSignInForm } from './siwarga-sign-in-form'

describe('SiwargaSignInForm', () => {
  it('should render email and password fields', () => {
    render(<SiwargaSignInForm />)
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/password/i)).toBeDefined()
  })

  it('should show validation error for empty fields', async () => {
    const user = userEvent.setup()
    render(<SiwargaSignInForm />)
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    // Validation messages should appear
    expect(screen.getByText(/email/i)).toBeDefined()
  })
})
```

Run: `cd src/frontend && npx vitest run features/auth/sign-in/components/siwarga-sign-in-form.test.tsx`
Expected: PASS

- [ ] **Step 2: Create `src/features/auth/sign-in/components/siwarga-sign-in-form.tsx`**

Simple form using React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth-store'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password harus diisi'),
})

type LoginForm = z.infer<typeof loginSchema>

export function SiwargaSignInForm() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.auth.setUser)
  const setAccessToken = useAuthStore((s) => s.auth.setAccessToken)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await authService.login(data)
      const { user, token, permissions } = response.data.data
      setUser({ ...user, permissions })
      setAccessToken(token)
      navigate({ to: '/' })
    } catch {
      // Error handled by interceptor
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Masuk...' : 'Masuk'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Modify the sign-in page to use the new form**

Update `src/frontend/src/features/auth/sign-in/index.tsx` to import and render `SiwargaSignInForm`.

- [ ] **Step 4: Verify build**

Run: `cd src/frontend && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/features/auth/sign-in/
git commit -m "feat(auth): add Sanctum-based sign-in form"
```

---

### Task 0.5: Update Sidebar Navigation for SIWarga

**Files:**
- Modify: `src/frontend/src/components/layout/data/sidebar-data.ts`

- [ ] **Step 1: Update `sidebar-data.ts` with SIWarga navigation**

Replace with SIWarga-specific nav groups:

```typescript
import {
  LayoutDashboard,
  Users,
  Home,
  Receipt,
  Wallet,
  ShoppingCart,
  FileText,
  Settings,
  UserCog,
  Banknote,
  type IconNode,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin RT',
    email: 'admin@siwarga.test',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'SIWarga',
      logo: Home,
      plan: 'Sistem Informasi RT',
    },
  ],
  navGroups: [
    {
      title: 'Utama',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Data Master',
      items: [
        { title: 'Penghuni', url: '/residents', icon: Users },
        { title: 'Rumah', url: '/houses', icon: Home },
        { title: 'Jenis Iuran', url: '/due-types', icon: Banknote },
      ],
    },
    {
      title: 'Keuangan',
      items: [
        { title: 'Tagihan', url: '/bills', icon: Receipt },
        { title: 'Pembayaran', url: '/payments', icon: Wallet },
        { title: 'Pengeluaran', url: '/expenses', icon: ShoppingCart },
        { title: 'Laporan', url: '/reports', icon: FileText },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { title: 'User', url: '/users', icon: UserCog },
        { title: 'Pengaturan', url: '/settings', icon: Settings },
      ],
    },
  ],
}
```

- [ ] **Step 2: Verify build**

Run: `cd src/frontend && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/components/layout/data/sidebar-data.ts
git commit -m "feat(nav): update sidebar with SIWarga navigation"
```

---

## Phase 1 — Frontend Modules

### Task 1.1: Create Service Layer (TanStack Query Hooks)

**Files:**
- Create: all service files in `src/frontend/src/services/`
- Create: all hook files in `src/frontend/src/hooks/`

- [ ] **Step 1: Create all service layer files**

Create each service file following the pattern in `services/residents.ts`:

```typescript
import api from './api'
import type { ApiResponse, PaginatedResponse, Resident, CreateResidentRequest, UpdateResidentRequest, ResidentFilter } from '@/types/api'

export const residentsService = {
  getAll: (params?: ResidentFilter) =>
    api.get<PaginatedResponse<Resident>>('/api/residents', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Resident>>(`/api/residents/${id}`),
  create: (data: CreateResidentRequest) =>
    api.post<ApiResponse<Resident>>('/api/residents', data),
  update: (id: number, data: UpdateResidentRequest) =>
    api.put<ApiResponse<Resident>>(`/api/residents/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/residents/${id}`),
}
```

Create all service files:
- `services/residents.ts`
- `services/houses.ts`
- `services/due-types.ts`
- `services/bills.ts`
- `services/payments.ts`
- `services/expenses.ts`
- `services/reports.ts`
- `services/users.ts`

- [ ] **Step 2: Create TanStack Query hooks**

Create `src/frontend/src/hooks/use-residents.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { residentsService } from '@/services/residents'
import type { ResidentFilter, CreateResidentRequest, UpdateResidentRequest } from '@/types/api'

export function useResidents(params?: ResidentFilter) {
  return useQuery({
    queryKey: ['residents', params],
    queryFn: () => residentsService.getAll(params),
    select: (res) => res.data,
  })
}

export function useResident(id: number) {
  return useQuery({
    queryKey: ['residents', id],
    queryFn: () => residentsService.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  })
}

export function useCreateResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateResidentRequest) => residentsService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents'] }),
  })
}

export function useUpdateResident(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateResidentRequest) => residentsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents'] }),
  })
}

export function useDeleteResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => residentsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents'] }),
  })
}
```

Create all hook files following the same pattern:
- `hooks/use-residents.ts`
- `hooks/use-houses.ts`
- `hooks/use-due-types.ts`
- `hooks/use-bills.ts`
- `hooks/use-payments.ts`
- `hooks/use-expenses.ts`
- `hooks/use-reports.ts`
- `hooks/use-users.ts`

- [ ] **Step 3: Verify tsc**

Run: `cd src/frontend && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/services/ src/frontend/src/hooks/
git commit -m "feat(api): add service layer and TanStack Query hooks for all modules"
```

---

### Task 1.2: Residents Frontend Module

**Files:**
- Create: `src/frontend/src/features/siwarga-residents/residents-columns.tsx`
- Create: `src/frontend/src/features/siwarga-residents/residents-table.tsx`
- Create: `src/frontend/src/features/siwarga-residents/resident-form.tsx`
- Create: `src/frontend/src/features/siwarga-residents/resident-detail.tsx`
- Create: `src/frontend/src/features/siwarga-residents/index.tsx`
- Create: `src/frontend/src/routes/_authenticated/residents/index.tsx`
- Create: `src/frontend/src/routes/_authenticated/residents/$id.tsx`

- [ ] **Step 1: Write component tests**

Create `src/frontend/src/features/siwarga-residents/residents-columns.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { residentsColumns } from './residents-columns'

describe('residentsColumns', () => {
  it('should have full_name, status, phone_number columns', () => {
    const columns = residentsColumns()
    const columnIds = columns.map((c) => c.id)
    expect(columnIds).toContain('full_name')
    expect(columnIds).toContain('status')
    expect(columnIds).toContain('phone_number')
  })
})
```

- [ ] **Step 2: Create `residents-columns.tsx`**

```typescript
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { Resident } from '@/types/api'

export function residentsColumns(): ColumnDef<Resident>[] {
  return [
    { id: 'full_name', header: 'Nama Lengkap', accessorKey: 'full_name' },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'tetap' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    { id: 'phone_number', header: 'No. Telepon', accessorKey: 'phone_number' },
    {
      id: 'marital_status',
      header: 'Status Nikah',
      accessorKey: 'marital_status',
    },
  ]
}
```

- [ ] **Step 3: Create `residents-table.tsx`**

Uses the shadcn-admin `DataTable` pattern with TanStack Table.

- [ ] **Step 4: Create `resident-form.tsx`**

React Hook Form + Zod. Fields: full_name, status (radio), phone_number, marital_status (radio), ktp_photo (file upload).

- [ ] **Step 5: Create `resident-detail.tsx`**

Shows resident info + list of houses they've lived in (from history endpoint).

- [ ] **Step 6: Create `index.tsx`** (main page with table)

Exports `ResidentsPage` with filter/search bar + table.

- [ ] **Step 7: Create route files**

`src/frontend/src/routes/_authenticated/residents/index.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { ResidentsPage } from '@/features/siwarga-residents'

export const Route = createFileRoute('/_authenticated/residents/')({
  component: ResidentsPage,
})
```

`src/frontend/src/routes/_authenticated/residents/$id.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { ResidentDetail } from '@/features/siwarga-residents/resident-detail'

export const Route = createFileRoute('/_authenticated/residents/$id')({
  component: ResidentDetail,
})
```

- [ ] **Step 8: Verify tsc + run tests**

Run: `cd src/frontend && npx tsc --noEmit --pretty && npx vitest run features/siwarga-residents/`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/frontend/src/features/siwarga-residents/ src/frontend/src/routes/_authenticated/residents/
git commit -m "feat(residents): add residents module (table, form, detail)"
```

---

### Task 1.3: Houses Frontend Module

**Files:**
- Create: `src/frontend/src/features/siwarga-houses/` (full feature)
- Create: routes `routes/_authenticated/houses/`

Follow the same pattern as residents:
- `houses-columns.tsx` — house_number, address, status (badge), current_resident name
- `houses-table.tsx`
- `house-form.tsx` — house_number, address
- `house-detail.tsx` — info + history timeline component
- `house-history.tsx` — timeline showing residents with start/end dates
- `index.tsx`
- Route files

- [ ] **Step 1: Create feature files**
- [ ] **Step 2: Create route files**
- [ ] **Step 3: Verify + commit**

```bash
git add src/frontend/src/features/siwarga-houses/ src/frontend/src/routes/_authenticated/houses/
git commit -m "feat(houses): add houses module with history timeline"
```

---

### Task 1.4: Due Types & Bills Frontend Module

**Files:**
- Create: `src/frontend/src/features/siwarga-due-types/`
- Create: `src/frontend/src/features/siwarga-bills/`
- Create: routes for both

Due Types feature:
- Simple table + inline form (name, amount, billing_cycle)
- Only Admin can access

Bills feature:
- `bills-table.tsx` with filter: month/year picker, status dropdown
- `generate-button.tsx` — button that triggers `POST /api/bills/generate`
- Generate button shows modal confirmation: "Generate tagihan for MM/YYYY?"
- After generate, refetch bills list

- [ ] **Step 1: Create due-types feature and routes**
- [ ] **Step 2: Create bills feature and routes**
- [ ] **Step 3: Verify + commit**

```bash
git add src/frontend/src/features/siwarga-due-types/ src/frontend/src/features/siwarga-bills/ src/frontend/src/routes/_authenticated/due-types/ src/frontend/src/routes/_authenticated/bills/
git commit -m "feat(bills): add due-types and bills modules with generate"
```

---

### Task 1.5: Payments Frontend Module

**Files:**
- Create: `src/frontend/src/features/siwarga-payments/`
- Create: routes

Payment feature:
- `payment-form.tsx` — select bill, amount (pre-filled), payment_date, notes
- Table: list payments with bill info, amount, date, notes
- Filter: by month

- [ ] **Step 1: Create feature files**
- [ ] **Step 2: Create route files**
- [ ] **Step 3: Verify + commit**

```bash
git add src/frontend/src/features/siwarga-payments/ src/frontend/src/routes/_authenticated/payments/
git commit -m "feat(payments): add payments module"
```

---

### Task 1.6: Expenses Frontend Module

**Files:**
- Create: `src/frontend/src/features/siwarga-expenses/`
- Create: routes

Expense feature:
- Table: category, description, amount, date, created_by
- Filter by month, category
- Form: category (free text), description, amount, expense_date

- [ ] **Step 1: Create feature and routes**
- [ ] **Step 2: Verify + commit**

```bash
git add src/frontend/src/features/siwarga-expenses/ src/frontend/src/routes/_authenticated/expenses/
git commit -m "feat(expenses): add expenses module"
```

---

### Task 1.7: Dashboard & Reports Frontend Module

**Files:**
- Replace: `src/frontend/src/features/dashboard/` — rewrite with SIWarga dashboard
- Create: `src/frontend/src/features/siwarga-reports/`
- Create: routes

Dashboard:
- Modify `src/frontend/src/features/dashboard/index.tsx` to show:
  - Saldo card (total income - total expense)
  - Income vs Expense bar chart (Recharts, filter by year)
  - Quick summary of current month
- Chart uses `features/dashboard/components/analytics-chart.tsx` — adapt with Recharts `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Legend`

Reports page (monthly detail):
- Select month/year → show breakdown of all payments and expenses
- Running balance calculation

- [ ] **Step 1: Update dashboard with SIWarga content**

Modify `src/frontend/src/features/dashboard/index.tsx`:

```typescript
import { useState } from 'react'
import { useYearlySummary } from '@/hooks/use-reports'
import { SummaryCards } from '@/features/siwarga-dashboard/summary-cards'
import { IncomeExpenseChart } from '@/features/siwarga-dashboard/income-expense-chart'

export function Dashboard() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: summary, isLoading } = useYearlySummary(year)

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <SummaryCards data={summary} />
      <IncomeExpenseChart data={summary?.monthly_data ?? []} year={year} onYearChange={setYear} />
    </div>
  )
}
```

- [ ] **Step 2: Create `summary-cards.tsx`** and `income-expense-chart.tsx`
- [ ] **Step 3: Create reports page and route**
- [ ] **Step 4: Verify + commit**

```bash
git add src/frontend/src/features/dashboard/ src/frontend/src/features/siwarga-dashboard/ src/frontend/src/features/siwarga-reports/ src/frontend/src/routes/_authenticated/reports/
git commit -m "feat(dashboard): add SIWarga dashboard with chart and reports"
```

---

### Task 1.8: Users Management Frontend Module

**Files:**
- Replace: `src/frontend/src/features/users/` — rewrite with SIWarga user management
- Routes already exist at `routes/_authenticated/users/`

User management:
- Table: name, email, roles, is_active
- Form: name, email, password, role assignment (dropdown)
- Only accessible to Admin role

- [ ] **Step 1: Adapt users feature for SIWarga**

Modify `src/frontend/src/features/users/index.tsx` to fetch from `/api/users` and display user list with role badges.

- [ ] **Step 2: Verify + commit**

```bash
git add src/frontend/src/features/users/
git commit -m "feat(users): add user management module"
```

---

## Phase 2 — Backend API (Laravel)

### Task 2.1: Setup Sanctum API Auth

**Files:**
- Install: `laravel/sanctum`
- Create: `src/backend/routes/api.php`
- Create: `src/backend/app/Http/Controllers/Api/AuthController.php`
- Modify: `src/backend/app/Models/User.php` — add roles/permissions relationships
- Modify: `src/backend/bootstrap/app.php` — configure Sanctum
- Delete: `src/backend/routes/web.php` content (API-only)

- [ ] **Step 1: Install Sanctum**

Run: `cd src/backend && composer require laravel/sanctum`

Run: `php artisan install:api`

- [ ] **Step 2: Write auth test**

Create `src/backend/tests/Feature/Api/AuthTest.php`:

```php
<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can login with valid credentials', function () {
    $user = User::factory()->create([
        'email' => 'admin@siwarga.test',
        'password' => bcrypt('password'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'admin@siwarga.test',
        'password' => 'password',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['user', 'token']]);
});

it('cannot login with invalid credentials', function () {
    $response = $this->postJson('/api/auth/login', [
        'email' => 'wrong@test.com',
        'password' => 'wrong',
    ]);

    $response->assertStatus(401);
});

it('can logout', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withToken($token)
        ->postJson('/api/auth/logout');

    $response->assertStatus(200);
});

it('can refresh token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withToken($token)
        ->postJson('/api/auth/refresh');

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['token']]);
});
```

Run: `cd src/backend && php artisan test --filter AuthTest`
Expected: All tests pass

- [ ] **Step 3: Create `AuthController.php`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid.'],
            ]);
        }

        $token = $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
                'permissions' => $user->getAllPermissions(),
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['data' => null, 'message' => 'Logged out']);
    }

    public function refresh(Request $request)
    {
        $user = $request->user();

        // Revoke current token
        $user->currentAccessToken()->delete();

        // Create new token
        $token = $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;

        return response()->json([
            'data' => ['token' => $token],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('roles.permissions');

        return response()->json([
            'data' => [
                'user' => $user,
                'permissions' => $user->getAllPermissions(),
            ],
        ]);
    }
}
```

- [ ] **Step 4: Create `routes/api.php`**

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// Public
Route::post('/auth/login', [AuthController::class, 'login']);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});
```

- [ ] **Step 5: Run tests fully**

Run: `cd src/backend && php artisan test`
Expected: All tests pass (including existing ones)

- [ ] **Step 6: Commit**

```bash
git add src/backend/routes/api.php src/backend/app/Http/Controllers/Api/AuthController.php src/backend/tests/Feature/Api/AuthTest.php
git commit -m "feat(auth): add Sanctum API auth with login/logout/refresh/me"
```

---

### Task 2.2: Migrations & Models — Residents, Houses

**Files:**
- Create: `database/migrations/xxxx_xx_xx_create_residents_table.php`
- Create: `database/migrations/xxxx_xx_xx_create_houses_table.php`
- Create: `database/migrations/xxxx_xx_xx_create_house_residents_table.php`
- Create: `app/Models/Resident.php`
- Create: `app/Models/House.php`
- Create: `app/Models/HouseResident.php`
- Create: `app/Http/Resources/ResidentResource.php`
- Create: `app/Http/Resources/HouseResource.php`

- [ ] **Step 1: Create migrations**

```php
// create_residents_table.php
Schema::create('residents', function (Blueprint $table) {
    $table->id();
    $table->string('full_name', 150);
    $table->string('ktp_photo_path', 255)->nullable();
    $table->enum('status', ['kontrak', 'tetap']);
    $table->string('phone_number', 20);
    $table->enum('marital_status', ['menikah', 'belum_menikah']);
    $table->softDeletes();
    $table->timestamps();
});
```

```php
// create_houses_table.php
Schema::create('houses', function (Blueprint $table) {
    $table->id();
    $table->string('house_number', 20)->unique();
    $table->string('address', 255)->nullable();
    $table->enum('status', ['dihuni', 'kosong'])->default('kosong');
    $table->softDeletes();
    $table->timestamps();
});
```

```php
// create_house_residents_table.php
Schema::create('house_residents', function (Blueprint $table) {
    $table->id();
    $table->foreignId('house_id')->constrained();
    $table->foreignId('resident_id')->constrained();
    $table->date('start_date');
    $table->date('end_date')->nullable();
    $table->softDeletes();
    $table->timestamps();
});
```

- [ ] **Step 2: Create models**

Each model uses `SoftDeletes` trait and defines fillable attributes + relationships.

- [ ] **Step 3: Create API Resources**

`ResidentResource.php`:

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResidentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'ktp_photo_url' => $this->ktp_photo_path ? url('storage/'.$this->ktp_photo_path) : null,
            'status' => $this->status,
            'phone_number' => $this->phone_number,
            'marital_status' => $this->marital_status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
```

- [ ] **Step 4: Run migrations**

Run: `cd src/backend && php artisan migrate`
Expected: Tables created

- [ ] **Step 5: Commit**

```bash
git add src/backend/database/migrations/*_create_residents_table.php src/backend/database/migrations/*_create_houses_table.php src/backend/database/migrations/*_create_house_residents_table.php src/backend/app/Models/Resident.php src/backend/app/Models/House.php src/backend/app/Models/HouseResident.php src/backend/app/Http/Resources/
git commit -m "feat(models): add residents, houses, house_residents models and migrations"
```

---

### Task 2.3: Migrations & Models — Due Types, Bills, Payments, Expenses

**Files:**
- Create: migrations for `due_types`, `bills`, `payments`, `expenses`
- Create: models for each
- Create: `app/Http/Resources/BillResource.php`, `PaymentResource.php`, `ExpenseResource.php`

Follow same pattern as Task 2.2. Bills table references house, resident, due_type, and generated_by. Payments table references bill and created_by.

- [ ] **Step 1: Create migration files**

```php
// create_due_types_table.php
Schema::create('due_types', function (Blueprint $table) {
    $table->id();
    $table->string('name', 50);
    $table->decimal('amount', 12, 2);
    $table->enum('billing_cycle', ['bulanan', 'fleksibel'])->default('bulanan');
    $table->softDeletes();
    $table->timestamps();
});
```

```php
// create_bills_table.php
Schema::create('bills', function (Blueprint $table) {
    $table->id();
    $table->foreignId('house_id')->constrained();
    $table->foreignId('resident_id')->constrained();
    $table->foreignId('due_type_id')->constrained();
    $table->date('period_start');
    $table->date('period_end');
    $table->decimal('amount_due', 12, 2);
    $table->enum('status', ['lunas', 'belum_lunas'])->default('belum_lunas');
    $table->timestamp('generated_at')->nullable();
    $table->foreignId('generated_by')->nullable()->constrained('users');
    $table->softDeletes();
    $table->timestamps();

    $table->unique(['house_id', 'due_type_id', 'period_start'], 'bills_unique');
});
```

```php
// create_payments_table.php
Schema::create('payments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('bill_id')->constrained();
    $table->decimal('amount_paid', 12, 2);
    $table->date('payment_date');
    $table->string('notes', 255)->nullable();
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->softDeletes();
    $table->timestamps();
});
```

```php
// create_expenses_table.php
Schema::create('expenses', function (Blueprint $table) {
    $table->id();
    $table->string('category', 100);
    $table->string('description', 255)->nullable();
    $table->decimal('amount', 12, 2);
    $table->date('expense_date');
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->softDeletes();
    $table->timestamps();
});
```

- [ ] **Step 2: Create models with SoftDeletes and relationships**

- [ ] **Step 3: Run migrations**

Run: `cd src/backend && php artisan migrate`
Expected: All tables created

- [ ] **Step 4: Commit**

```bash
git add src/backend/database/migrations/*_create_due_types_table.php src/backend/database/migrations/*_create_bills_table.php src/backend/database/migrations/*_create_payments_table.php src/backend/database/migrations/*_create_expenses_table.php src/backend/app/Models/DueType.php src/backend/app/Models/Bill.php src/backend/app/Models/Payment.php src/backend/app/Models/Expense.php
git commit -m "feat(models): add due_types, bills, payments, expenses models"
```

---

### Task 2.4: RBAC — Roles, Permissions Migrations & Seeders

**Files:**
- Create: migration for `roles`, `permissions`, `role_permissions`, `user_roles`
- Create: `app/Models/Role.php`, `app/Models/Permission.php`
- Modify: `app/Models/User.php` — add role/permission relationships
- Create: `database/seeders/RolePermissionSeeder.php`
- Modify: `database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Create RBAC migrations**

```php
// create_roles_table.php
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('name', 50)->unique();
    $table->string('description', 255)->nullable();
    $table->timestamps();
});

// create_permissions_table.php
Schema::create('permissions', function (Blueprint $table) {
    $table->id();
    $table->string('name', 100)->unique();
    $table->string('description', 255)->nullable();
    $table->timestamp('created_at')->useCurrent();
});

// create_role_permissions_table.php
Schema::create('role_permissions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('role_id')->constrained();
    $table->foreignId('permission_id')->constrained();
    $table->unique(['role_id', 'permission_id']);
});

// create_user_roles_table.php
Schema::create('user_roles', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->foreignId('role_id')->constrained();
    $table->unique(['user_id', 'role_id']);
});
```

- [ ] **Step 2: Add `resident_id` column to users table**

- [ ] **Step 3: Update User model**

Add relationships: `roles()`, `permissions()`, `getAllPermissions()` method.

- [ ] **Step 4: Create `RolePermissionSeeder.php`**

Seed 3 roles (admin, bendahara, warga) with permissions.

- [ ] **Step 5: Update `DatabaseSeeder.php`**

Call `RolePermissionSeeder`.

- [ ] **Step 6: Run seeders**

Run: `cd src/backend && php artisan migrate && php artisan db:seed`
Expected: Roles and permissions seeded

- [ ] **Step 7: Commit**

```bash
git add src/backend/database/migrations/*_create_roles_table.php src/backend/database/migrations/*_create_permissions_table.php src/backend/database/migrations/*_create_role_permissions_table.php src/backend/database/migrations/*_create_user_roles_table.php src/backend/app/Models/Role.php src/backend/app/Models/Permission.php src/backend/database/seeders/
git commit -m "feat(rbac): add roles, permissions migrations and seeders"
```

---

### Task 2.5: API Controllers — Residents & Houses

**Files:**
- Create: `app/Http/Controllers/Api/ResidentController.php`
- Create: `app/Http/Controllers/Api/HouseController.php`
- Create: `app/Policies/ResidentPolicy.php`
- Create: `app/Policies/HousePolicy.php`
- Update: `routes/api.php`
- Create: `tests/Feature/Api/ResidentTest.php`
- Delete: `routes/web.php` content (ensure no Inertia routes)

- [ ] **Step 1: Write feature test first**

`tests/Feature/Api/ResidentTest.php`:

```php
<?php

use App\Models\Resident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('can list residents', function () {
    Resident::factory()->count(3)->create();

    $response = $this->actingAs($this->user)->getJson('/api/residents');

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('can create a resident', function () {
    $data = [
        'full_name' => 'Test Resident',
        'status' => 'tetap',
        'phone_number' => '08123456789',
        'marital_status' => 'menikah',
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/api/residents', $data);

    $response->assertStatus(201)
        ->assertJsonPath('data.full_name', 'Test Resident');
});

it('validates required fields when creating resident', function () {
    $response = $this->actingAs($this->user)
        ->postJson('/api/residents', []);

    $response->assertStatus(422);
});

it('can soft delete a resident', function () {
    $resident = Resident::factory()->create();

    $this->actingAs($this->user)
        ->deleteJson("/api/residents/{$resident->id}");

    $this->assertSoftDeleted($resident);
});
```

Run: `cd src/backend && php artisan test --filter ResidentTest`
Expected: Tests pass (after implementing controller)

- [ ] **Step 2: Create ResidentController**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResidentResource;
use App\Models\Resident;
use Illuminate\Http\Request;

class ResidentController extends Controller
{
    public function index(Request $request)
    {
        $query = Resident::query();

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            $query->where('full_name', 'like', "%{$request->search}%");
        }

        return ResidentResource::collection($query->paginate());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:150',
            'status' => 'required|in:kontrak,tetap',
            'phone_number' => 'required|string|max:20',
            'marital_status' => 'required|in:menikah,belum_menikah',
            'ktp_photo' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('ktp_photo')) {
            $validated['ktp_photo_path'] = $request->file('ktp_photo')->store('ktp-photos', 'public');
        }

        $resident = Resident::create($validated);

        return new ResidentResource($resident, 201);
    }

    public function show(Resident $resident)
    {
        return new ResidentResource($resident);
    }

    public function update(Request $request, Resident $resident)
    {
        $validated = $request->validate([
            'full_name' => 'sometimes|string|max:150',
            'status' => 'sometimes|in:kontrak,tetap',
            'phone_number' => 'sometimes|string|max:20',
            'marital_status' => 'sometimes|in:menikah,belum_menikah',
            'ktp_photo' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('ktp_photo')) {
            $validated['ktp_photo_path'] = $request->file('ktp_photo')->store('ktp-photos', 'public');
        }

        $resident->update($validated);

        return new ResidentResource($resident);
    }

    public function destroy(Resident $resident)
    {
        $resident->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

- [ ] **Step 3: Create HouseController with assign-resident flow**

- [ ] **Step 4: Update `routes/api.php` with resource routes**

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('residents', ResidentController::class);
    Route::apiResource('houses', HouseController::class);
    Route::get('houses/{house}/history', [HouseController::class, 'history']);
    Route::post('houses/{house}/assign-resident', [HouseController::class, 'assignResident']);
    // ... more routes
});
```

- [ ] **Step 5: Run all backend tests**

Run: `cd src/backend && php artisan test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Http/Controllers/Api/ResidentController.php src/backend/app/Http/Controllers/Api/HouseController.php src/backend/routes/api.php src/backend/tests/Feature/Api/ResidentTest.php
git commit -m "feat(api): add residents and houses API controllers"
```

---

### Task 2.6: API Controllers — Bills, Payments, Expenses, Reports + Services

**Files:**
- Create: `app/Http/Controllers/Api/DueTypeController.php`
- Create: `app/Http/Controllers/Api/BillController.php`
- Create: `app/Http/Controllers/Api/PaymentController.php`
- Create: `app/Http/Controllers/Api/ExpenseController.php`
- Create: `app/Http/Controllers/Api/ReportController.php`
- Create: `app/Services/BillGenerationService.php`
- Create: `app/Services/ReportService.php`
- Create: `tests/Feature/Api/BillTest.php`
- Create: `tests/Unit/BillGenerationServiceTest.php`

- [ ] **Step 1: Write BillGenerationService test first**

`tests/Unit/BillGenerationServiceTest.php`:

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\House;
use App\Models\Resident;
use App\Models\DueType;
use App\Models\HouseResident;
use App\Services\BillGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BillGenerationServiceTest extends TestCase
{
    use RefreshDatabase;

    it('generates bills for occupied houses only', function () {
        $dueType = DueType::factory()->create(['amount' => 100000]);
        $occupiedHouse = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        HouseResident::factory()->create([
            'house_id' => $occupiedHouse->id,
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
            'end_date' => null,
        ]);
        $emptyHouse = House::factory()->create(['status' => 'kosong']);

        $service = new BillGenerationService();
        $bills = $service->generate(7, 2026);

        expect($bills)->toHaveCount(1);
        expect($bills->first()->house_id)->toBe($occupiedHouse->id);
    });

    it('does not create duplicate bills for same period', function () {
        $dueType = DueType::factory()->create();
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        HouseResident::factory()->create([
            'house_id' => $house->id,
            'resident_id' => $resident->id,
        ]);

        $service = new BillGenerationService();
        $service->generate(7, 2026);
        $bills = $service->generate(7, 2026);

        expect($bills)->toHaveCount(0); // No new bills (idempotent)
    });
}
```

Run: `cd src/backend && php artisan test --filter BillGenerationServiceTest`
Expected: Fail (no service yet) → Pass after implementing

- [ ] **Step 2: Create `BillGenerationService.php`**

Core business logic:

```php
<?php

namespace App\Services;

use App\Models\House;
use App\Models\DueType;
use App\Models\Bill;
use App\Models\HouseResident;
use Carbon\Carbon;

class BillGenerationService
{
    public function generate(int $month, int $year, ?int $generatedBy = null): \Illuminate\Support\Collection
    {
        $periodStart = Carbon::createFromDate($year, $month, 1);
        $periodEnd = $periodStart->copy()->endOfMonth();
        $generated = collect();

        $dueTypes = DueType::all();

        foreach ($dueTypes as $dueType) {
            $houses = House::where('status', 'dihuni')->get();

            foreach ($houses as $house) {
                $activeResident = HouseResident::where('house_id', $house->id)
                    ->whereNull('end_date')
                    ->orWhere(function ($q) use ($periodStart) {
                        $q->where('start_date', '<=', $periodStart)
                          ->where('end_date', '>=', $periodStart);
                    })
                    ->first();

                if (! $activeResident) continue;

                $exists = Bill::where('house_id', $house->id)
                    ->where('due_type_id', $dueType->id)
                    ->where('period_start', $periodStart)
                    ->exists();

                if ($exists) continue;

                $bill = Bill::create([
                    'house_id' => $house->id,
                    'resident_id' => $activeResident->resident_id,
                    'due_type_id' => $dueType->id,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'amount_due' => $dueType->amount,
                    'generated_by' => $generatedBy,
                    'generated_at' => now(),
                ]);

                $generated->push($bill);
            }
        }

        return $generated;
    }
}
```

- [ ] **Step 3: Create BillController, PaymentController, ExpenseController, ReportController**

Each with standard CRUD + validation, using API Resources for response formatting.

- [ ] **Step 4: Add routes and feature tests**

- [ ] **Step 5: Run full test suite**

Run: `cd src/backend && php artisan test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Http/Controllers/Api/DueTypeController.php src/backend/app/Http/Controllers/Api/BillController.php src/backend/app/Http/Controllers/Api/PaymentController.php src/backend/app/Http/Controllers/Api/ExpenseController.php src/backend/app/Http/Controllers/Api/ReportController.php src/backend/app/Services/ src/backend/tests/
git commit -m "feat(api): add bills, payments, expenses, reports controllers and services"
```

---

### Task 2.7: API Controllers — Users & Roles Management

**Files:**
- Create: `app/Http/Controllers/Api/UserController.php`
- Create: `app/Http/Controllers/Api/RoleController.php`
- Create: `app/Policies/UserPolicy.php`

- [ ] **Step 1: Create UserController**

CRUD for users with role assignment. Only accessible to Admin (via policy).

- [ ] **Step 2: UserPolicy**

Gate all actions to `admin` role only.

- [ ] **Step 3: Add routes**

- [ ] **Step 4: Commit**

```bash
git add src/backend/app/Http/Controllers/Api/UserController.php src/backend/app/Http/Controllers/Api/RoleController.php src/backend/app/Policies/UserPolicy.php
git commit -m "feat(api): add user and role management controllers"
```

---

### Task 2.8: Backend Final — Policies & Route Cleanup

**Files:**
- Create: remaining Policies (`ResidentPolicy`, `HousePolicy`, `BillPolicy`, `PaymentPolicy`, `ExpensePolicy`)
- Finalize: `routes/api.php` with all routes and middleware
- Clean: Remove Inertia routes from `web.php`, keep only a redirect or remove

- [ ] **Step 1: Create all policies**

Each policy checks permission using the permission name convention (e.g., `residents.create`).

- [ ] **Step 2: Finalize API routes with permission middleware**

```php
Route::middleware(['auth:sanctum', 'can:residents.view'])->group(function () {
    Route::apiResource('residents', ResidentController::class);
});
```

- [ ] **Step 3: Clean up web.php**

Replace Inertia routes with:

```php
<?php

// API-only application. Frontend is a separate SPA.
// All routes are defined in routes/api.php
```

- [ ] **Step 4: Run full test suite**

Run: `cd src/backend && php artisan test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/Policies/ src/backend/routes/
git commit -m "feat(rbac): add authorization policies and finalize API routes"
```

---

## Phase 3 — Integration & Testing

### Task 3.1: Swap MSW → Real API

**Files:**
- Modify: `src/frontend/src/main.tsx` — disable MSW when `VITE_USE_MOCK=false`
- Verify: `src/frontend/.env` — add `VITE_API_URL=http://localhost:8000`

- [ ] **Step 1: Configure environment**

Create `src/frontend/.env`:

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=true
```

- [ ] **Step 2: Conditionally enable MSW**

```typescript
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}
```

- [ ] **Step 3: Test with real backend**

Run backend: `cd src/backend && php artisan serve`
Run frontend with `VITE_USE_MOCK=false`

- [ ] **Step 4: Hit all pages and verify data loads from real API**

- [ ] **Step 5: Commit**

```bash
git add src/frontend/.env src/frontend/src/main.tsx
git commit -m "feat(integration): add env-based MSW toggle, connect frontend to real API"
```

---

### Task 3.2: Playwright E2E Tests

**Files:**
- Create: `src/frontend/e2e/siwarga/setup.ts`
- Create: `src/frontend/e2e/siwarga/residents.spec.ts`
- Create: `src/frontend/e2e/siwarga/houses.spec.ts`
- Create: `src/frontend/e2e/siwarga/bills.spec.ts`
- Create: `src/frontend/e2e/siwarga/auth.spec.ts`

- [ ] **Step 1: Create E2E auth test**

```typescript
import { test, expect } from '@playwright/test'

test('Admin can login and see dashboard', async ({ page }) => {
  await page.goto('/sign-in')
  await page.fill('input[name="email"]', 'admin@siwarga.test')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/')
  await expect(page.locator('text=Dashboard')).toBeVisible()
})
```

- [ ] **Step 2: Create critical path E2E tests**

Per PRD:
1. Login → add resident → appears in list
2. Add house → assign resident → history shows correctly
3. Generate bill → appears with "belum_lunas"
4. Record payment → status changes to "lunas"
5. Login as Warga → only sees own bills

- [ ] **Step 3: Run E2E tests**

Run: `cd src/frontend && npx playwright test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/frontend/e2e/
git commit -m "test(e2e): add Playwright E2E tests for critical paths"
```

---

### Task 3.3: README & Installation Documentation

**Files:**
- Modify: `README.md` (root level)

- [ ] **Step 1: Write comprehensive README**

Include:
- Project description
- Prerequisites (PHP 8.3, Composer, Node.js, MySQL)
- Backend setup (`.env`, `composer install`, `migrate`, `seed`, `serve`)
- Frontend setup (`npm install`, `npm run dev`)
- Default credentials
- Testing instructions (`php artisan test`, `npm test`)
- Screenshots per feature (placeholders)
- Architecture overview

- [ ] **Step 2: Verify installation from clean clone**

If possible: test the README steps in a clean directory.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive installation and usage documentation"
```
