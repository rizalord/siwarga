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
  description: string | null
  permissions?: Permission[]
  users_count?: number
  is_admin?: boolean
  created_at?: string
  updated_at?: string
}

export interface Permission {
  id: number
  name: string
  description: string | null
  is_system?: boolean
  created_at?: string
}

export interface CreateRoleRequest {
  name: string
  description?: string | null
  permission_ids?: number[]
}

export interface RoleFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface CreatePermissionRequest {
  name: string
  description?: string | null
}

export interface PermissionFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
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

export type UpdateResidentRequest = Partial<CreateResidentRequest>

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
  resident: Resident | null
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
  status?: string | string[]
  marital_status?: string | string[]
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface HouseFilter {
  status?: string | string[]
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface BillFilter {
  month?: number
  year?: number
  status?: string | string[]
  house_id?: number
  due_type_id?: string | string[]
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaymentFilter {
  bill_id?: number
  month?: number
  year?: number
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ExpenseFilter {
  month?: number
  year?: number
  category?: string | string[]
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface DueTypeFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface UserFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ActivityLog {
  id: number
  user: { id: number; name: string; email: string } | null
  action: string
  subject_type: string | null
  subject_id: number | null
  description: string
  changes:
    | ({
        before?: Record<string, unknown>
        after?: Record<string, unknown>
      } & Record<string, unknown>)
    | null
  ip_address: string | null
  user_agent: string | null
  url: string | null
  created_at: string
}

export interface ActivityLogFilter {
  search?: string
  action?: string | string[]
  subject_type?: string | string[]
  user_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface TrackPageViewRequest {
  path: string
  title?: string
}
