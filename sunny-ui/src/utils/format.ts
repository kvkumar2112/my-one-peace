/**
 * Format a number in Indian number system with ₹ prefix
 * e.g. 120000 → ₹1,20,000
 */
export function formatINR(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return `₹${formatted}`
}

/**
 * Format a large number compactly
 * e.g. 1840000 → ₹18.4L, 10000000 → ₹1Cr
 */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 10_000_000) {
    return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`
  }
  if (abs >= 100_000) {
    return `${sign}₹${(abs / 100_000).toFixed(1)}L`
  }
  if (abs >= 1_000) {
    return `${sign}₹${(abs / 1_000).toFixed(1)}K`
  }
  return `${sign}₹${abs.toFixed(0)}`
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Format date short (e.g. "12 Mar")
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * Get time-based greeting
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Get current month label e.g. "March 2026"
 */
export function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

/**
 * Format percentage with sign
 */
export function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

/**
 * Category display name and emoji
 */
const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  food: { label: 'Food & Dining', emoji: '🍽️', color: '#F59E0B' },
  groceries: { label: 'Groceries', emoji: '🛒', color: '#10B981' },
  transport: { label: 'Transport', emoji: '🚌', color: '#3B82F6' },
  fuel: { label: 'Fuel', emoji: '⛽', color: '#EF4444' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#8B5CF6' },
  entertainment: { label: 'Entertainment', emoji: '🎬', color: '#EC4899' },
  utilities: { label: 'Utilities', emoji: '💡', color: '#F97316' },
  telecom: { label: 'Telecom', emoji: '📱', color: '#06B6D4' },
  health: { label: 'Health', emoji: '🏥', color: '#14B8A6' },
  finance: { label: 'Finance', emoji: '📈', color: '#1D9E75' },
  travel: { label: 'Travel', emoji: '✈️', color: '#6366F1' },
  education: { label: 'Education', emoji: '📚', color: '#F59E0B' },
  housing: { label: 'Housing', emoji: '🏠', color: '#84CC16' },
  salary: { label: 'Salary', emoji: '💰', color: '#22C55E' },
  transfer: { label: 'Transfer', emoji: '↔️', color: '#94A3B8' },
  uncategorized: { label: 'Other', emoji: '📦', color: '#94A3B8' },
}

export function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? { label: category, emoji: '📦', color: '#94A3B8' }
}
