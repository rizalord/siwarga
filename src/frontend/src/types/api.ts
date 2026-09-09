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
  resident?: Resident | null
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

export interface ExpenseCategory {
  id: number
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateExpenseCategoryRequest {
  name: string
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
  total_paid: number
  status: 'lunas' | 'belum_lunas'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GenerateBillsRequest {
  month: number
  year: number
}

export interface GenerateFlexibleBillsRequest {
  due_type_id: number
  period_start: string
  period_end: string
  amount_due: number
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
  category: ExpenseCategory
  description: string | null
  amount: number
  expense_date: string
  created_by: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateExpenseRequest {
  category_id: number
  description?: string
  amount: number
  expense_date: string
}

export type TrashedFilterValue = 'with' | 'only'

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
  trashed?: TrashedFilterValue
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface HouseFilter {
  status?: string | string[]
  trashed?: TrashedFilterValue
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
  trashed?: TrashedFilterValue
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
  trashed?: TrashedFilterValue
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ExpenseFilter {
  month?: number
  year?: number
  category_id?: number | number[]
  trashed?: TrashedFilterValue
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface DueTypeFilter {
  trashed?: TrashedFilterValue
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ExpenseCategoryFilter {
  trashed?: TrashedFilterValue
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface UserFilter {
  trashed?: TrashedFilterValue
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

// Pages
export interface Page {
  id: number
  slug: string
  title: string
  content: string | null
  hero_image_url: string | null
  updated_by: number | null
  updated_at: string
}

export interface UpdatePageRequest {
  title?: string
  content?: string
  hero_image?: File
}

export type AnnouncementCategory = 'darurat' | 'umum' | 'kegiatan' | 'keuangan'

export interface Announcement {
  id: number
  title: string
  slug: string | null
  content: string
  category: AnnouncementCategory
  is_public: boolean
  published_at: string | null
  target_house_ids: number[]
  created_by: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateAnnouncementRequest {
  title: string
  content: string
  category: AnnouncementCategory
  is_public?: boolean
  published_at?: string | null
  target_house_ids?: number[]
}

export interface UpdateAnnouncementRequest {
  title?: string
  content?: string
  category?: AnnouncementCategory
  is_public?: boolean
  published_at?: string | null
  target_house_ids?: number[]
}

export interface AnnouncementFilter {
  search?: string
  category?: AnnouncementCategory | AnnouncementCategory[]
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ContactMessage {
  id: number
  name: string
  email: string | null
  phone: string | null
  message: string
  status: 'new' | 'read'
  created_at: string
}

export interface ContactMessageFilter {
  status?: 'new' | 'read'
  page?: number
  per_page?: number
}

export interface WargaAnnouncement {
  id: number
  title: string
  slug: string | null
  content: string
  category: AnnouncementCategory
  published_at: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface WargaAnnouncementFilter {
  search?: string
  category?: AnnouncementCategory | AnnouncementCategory[]
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export type PollStatus = 'upcoming' | 'ongoing' | 'ended'

export interface PollOption {
  id: number
  label: string
}

export interface Poll {
  id: number
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  status: PollStatus
  options: PollOption[]
  has_voted: boolean
  user_voted_option_id: number | null
  created_by: number
  created_at: string
}

export interface CreatePollRequest {
  title: string
  description?: string
  starts_at: string
  ends_at: string
  options: string[]
}

export interface PollResultOption {
  id: number
  label: string
  votes: number
  percent: number
}

export interface PollResults {
  poll_id: number
  total_votes: number
  options: PollResultOption[]
  user_voted_option_id: number | null
}

export interface PollFilter {
  search?: string
  status?: PollStatus
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ForumThread {
  id: number
  title: string
  created_by: number
  created_by_name: string | null
  posts_count: number
  created_at: string
  updated_at: string
}

export interface ForumPost {
  id: number
  thread_id: number
  user_id: number
  user_name: string | null
  content: string
  created_at: string
}

export interface ForumThreadFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved'

export interface TicketAttachment {
  id: number
  url: string
  created_at: string | null
}

export interface Ticket {
  id: number
  title: string
  description: string
  category: string | null
  status: TicketStatus
  reported_by: number
  reporter_name: string | null
  house_id: number | null
  assigned_to: number | null
  assignee_name: string | null
  comments_count: number
  attachments: TicketAttachment[]
  created_at: string
  updated_at: string
}

export interface TicketComment {
  id: number
  user_id: number
  user_name: string | null
  comment: string
  created_at: string | null
}

export interface CreateTicketRequest {
  title: string
  description: string
  category?: string
  house_id?: number
}

export interface TicketFilter {
  search?: string
  status?: TicketStatus
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface AppNotification {
  id: string
  type: string
  data: {
    ticket_id: number
    title: string
    old_status: string
    new_status: string
    actor_name: string
  }
  read_at: string | null
  created_at: string
}

export interface Suggestion {
  id: number
  content: string
  status: 'new' | 'reviewed'
  created_at: string
}

export interface SuggestionFilter {
  status?: 'new' | 'reviewed'
  page?: number
  per_page?: number
}

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Facility {
  id: number
  name: string
  description: string | null
  rental_fee: string | null
  due_type_id: number | null
  due_type_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: number
  facility_id: number
  facility_name: string | null
  booked_by: number
  booker_name: string | null
  event_id: number | null
  start_at: string
  end_at: string
  status: BookingStatus
  approved_by: number | null
  created_at: string
}

export interface CreateBookingRequest {
  facility_id: number
  event_id?: number
  start_at: string
  end_at: string
}

export interface CreateFacilityRequest {
  name: string
  description?: string
  rental_fee?: number | null
  due_type_id?: number | null
  is_active?: boolean
}

export interface BookingFilter {
  facility_id?: number
  status?: BookingStatus
  from?: string
  to?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface FacilityFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export type AssetCondition = 'baik' | 'rusak_ringan' | 'rusak_berat'
export type AssetLoanStatus = 'pending' | 'approved' | 'rejected' | 'returned'

export interface Asset {
  id: number
  name: string
  quantity: number
  condition: AssetCondition
  available: number | null
  created_at: string
}

export interface AssetLoan {
  id: number
  asset_id: number
  asset_name: string | null
  borrowed_by: number
  borrower_name: string | null
  quantity: number
  status: AssetLoanStatus
  borrowed_at: string | null
  returned_at: string | null
  created_at: string
}

export interface AssetFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface AssetLoanFilter {
  status?: AssetLoanStatus
  page?: number
  per_page?: number
}

export type EventStatus = 'upcoming' | 'ongoing' | 'completed'

export interface AdminEvent {
  id: number
  title: string
  slug: string
  description: string | null
  starts_at: string
  ends_at: string | null
  status: EventStatus
  is_public: boolean
  documentation_count: number
  created_at: string
}

export interface EventDocumentation {
  id: number
  media_type: 'foto' | 'video'
  url: string
  caption: string | null
  created_at: string | null
}

export interface EventFilter {
  search?: string
  status?: EventStatus
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export type GuestLogStatus = 'registered' | 'checked_in' | 'checked_out'

export interface GuestLog {
  id: number
  guest_name: string
  purpose: string | null
  house_id: number
  house_number: string | null
  plate_number: string | null
  registered_by: number | null
  registrar_name: string | null
  qr_token: string | null
  visit_date: string | null
  status: GuestLogStatus
  checked_in_at: string | null
  checked_out_at: string | null
  recorded_by: number | null
  created_at: string
}

export interface GuestLogFilter {
  page?: number
  per_page?: number
  status?: GuestLogStatus
  date?: string
  search?: string
}

export interface RegisterGuestInput {
  guest_name: string
  purpose?: string
  house_id: number
  plate_number?: string
  visit_date?: string
}

export type PanicStatus = 'active' | 'handled' | 'resolved' | 'cancelled'

export interface PanicAlert {
  id: number
  reporter_id: number
  reporter_name: string | null
  house_id: number | null
  house_number: string | null
  location_note: string | null
  note: string | null
  status: PanicStatus
  handler_id: number | null
  handler_name: string | null
  handled_at: string | null
  resolved_at: string | null
  created_at: string
}

export interface PanicFilter {
  page?: number
  per_page?: number
  status?: PanicStatus
}

export interface EmergencyContact {
  id: number
  name: string
  phone: string
  sort_order: number
}

export type PatrolShift = 'pagi' | 'siang' | 'malam'

export interface PatrolSchedule {
  id: number
  date: string
  shift: PatrolShift
  personnel_name: string
  user_id: number | null
  area: string | null
  note: string | null
  created_at: string
}

export interface PatrolFilter {
  page?: number
  per_page?: number
  from?: string
  to?: string
}

export interface PatrolInput {
  date: string
  shift: PatrolShift
  personnel_name: string
  user_id?: number | null
  area?: string
  note?: string
}

export type FamilyRelationship =
  | 'kepala_keluarga'
  | 'pasangan'
  | 'anak'
  | 'orang_tua'
  | 'famili_lain'
  | 'pembantu'
  | 'kontrak'

export interface FamilyMember {
  id: number
  house_id: number
  house_number: string | null
  name: string
  relationship: FamilyRelationship
  nik: string | null
  birth_date: string | null
  phone: string | null
  created_at: string
}

export interface FamilyFilter {
  page?: number
  per_page?: number
  house_id?: number
  relationship?: FamilyRelationship
  search?: string
}

export interface FamilyInput {
  house_id?: number
  name: string
  relationship: FamilyRelationship
  nik?: string
  birth_date?: string
  phone?: string
}

export interface HouseholdCard {
  house_id: number
  house_number: string
  address: string | null
  head_name: string
  member_count: number
  verify_token: string
}
