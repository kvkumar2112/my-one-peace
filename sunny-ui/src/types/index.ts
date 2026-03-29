// Auth
export interface User {
  id: string
  email: string
  full_name: string
  currency: string
  fy_start: string
  plan: string
  notifications: Record<string, boolean>
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// Accounts
export interface LinkedAccountRef {
  account_id: string
  link_type: 'cc_payment' | 'emi_payment' | 'investment_deployment' | 'account_transfer'
}

export interface Account {
  id: string
  user_id: string
  bank_name: string
  account_type: 'savings' | 'salary' | 'credit' | 'wallet' | 'investment' | 'loan'
  nickname: string | null
  last4: string | null
  balance: number
  color_gradient: string | null
  status: 'active' | 'inactive'
  match_patterns: string[]
  linked_accounts: LinkedAccountRef[]
  last_synced: string | null
  created_at: string
}

export interface AccountCreate {
  bank_name: string
  account_type: string
  nickname?: string
  last4?: string
  balance?: number
  color_gradient?: string
  match_patterns?: string[]
  linked_accounts?: LinkedAccountRef[]
}

// Transactions
export interface Transaction {
  id: string
  user_id: string
  account_id: string | null
  amount: number
  category: string
  subcategory: string | null
  description: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  source: string
  tags: string[]
  is_recurring: boolean
  ai_category_confidence: number | null
  created_at: string
}

export interface TransactionCreate {
  amount: number
  description: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  category?: string
  subcategory?: string
  account_id?: string
  tags?: string[]
  is_recurring?: boolean
  source?: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  skip: number
  limit: number
}

export interface TransactionFilters {
  date_from?: string
  date_to?: string
  category?: string
  account_id?: string
  type?: string
  search?: string
  skip?: number
  limit?: number
}

// Budgets
export interface Budget {
  id: string
  user_id: string
  category: string
  label: string
  limit_amount: number
  period: 'monthly' | 'weekly'
  icon: string | null
  spent_amount: number
  created_at: string
}

// Goals
export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  saved_amount: number
  monthly_contribution: number | null
  target_date: string | null
  icon: string | null
  color: string | null
  status: 'active' | 'completed' | 'paused'
  progress_pct: number
  created_at: string
}

// Holdings
export interface Holding {
  id: string
  user_id: string
  name: string
  ticker: string | null
  type: 'mutual_fund' | 'stock' | 'etf' | 'ppf_epf' | 'fd' | 'gold'
  platform: string | null
  quantity: number
  avg_buy_price: number
  current_price: number
  invested_amount: number
  current_value: number
  pnl: number
  pnl_pct: number
  created_at: string
}

export interface PortfolioSummary {
  total_value: number
  total_invested: number
  total_pnl: number
  total_pnl_pct: number
  allocation: { type: string; value: number; pct: number }[]
  holdings: Holding[]
}

// Analytics
export interface DashboardSummary {
  net_worth: number
  net_worth_change_pct: number
  monthly_income: number
  income_change: number
  monthly_spend: number
  spend_change: number
  savings_rate: number
  savings_rate_change: number
}

export interface SpendingByCategory {
  category: string
  amount: number
  count: number
  pct: number
}

export interface CashflowPoint {
  month: string
  income: number
  expenses: number
}

export interface InsightItem {
  type: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'danger'
}

export interface InsightResponse {
  insights: InsightItem[]
  generated_at: string
}
