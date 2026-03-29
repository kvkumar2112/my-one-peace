import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import MetricCard from '@/components/MetricCard'
import TransactionRow from '@/components/TransactionRow'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import { useDashboardSummary, useSpending, useCashflow } from '@/hooks/useAnalytics'
import { useTransactions } from '@/hooks/useTransactions'
import { useAuthStore } from '@/stores/authStore'
import { formatCompact, formatINR, formatPct, getGreeting, getCurrentMonthLabel, getCategoryMeta } from '@/utils/format'
import AddTransactionModal from '@/components/AddTransactionModal'

const CHART_COLORS = ['#1D9E75', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

export default function OverviewPage() {
  const { user } = useAuthStore()
  const [showAddTx, setShowAddTx] = useState(false)

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: cashflow, isLoading: cashflowLoading } = useCashflow(6)
  const { data: spending, isLoading: spendingLoading } = useSpending()
  const { data: recentTxns, isLoading: txnsLoading } = useTransactions({ limit: 5 })

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-7 flex flex-col gap-5 max-w-6xl">
      {/* Top bar */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-medium text-gray-900">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {getCurrentMonthLabel()} · All accounts
          </p>
        </div>
        <button
          onClick={() => setShowAddTx(true)}
          className="bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-safe transition-colors"
        >
          + Add transaction
        </button>
      </div>

      {/* Metric cards */}
      {summaryLoading ? (
        <LoadingSpinner />
      ) : summary ? (
        <div className="grid grid-cols-4 gap-3">
          <MetricCard
            label="Net worth"
            value={formatCompact(summary.net_worth)}
            delta={`${summary.net_worth_change_pct >= 0 ? '↑' : '↓'} ${Math.abs(summary.net_worth_change_pct).toFixed(1)}%`}
            deltaPositive={summary.net_worth_change_pct >= 0}
            deltaText="this month"
          />
          <MetricCard
            label="Monthly income"
            value={formatINR(summary.monthly_income)}
            delta={summary.income_change >= 0 ? `↑ ${formatINR(summary.income_change)}` : `↓ ${formatINR(Math.abs(summary.income_change))}`}
            deltaPositive={summary.income_change >= 0}
            deltaText="vs last"
          />
          <MetricCard
            label="Monthly spend"
            value={formatINR(summary.monthly_spend)}
            delta={summary.spend_change >= 0 ? `↑ ${formatINR(summary.spend_change)}` : `↓ ${formatINR(Math.abs(summary.spend_change))}`}
            deltaPositive={summary.spend_change <= 0}
            deltaText="vs last"
          />
          <MetricCard
            label="Savings rate"
            value={`${summary.savings_rate.toFixed(0)}%`}
            delta={formatPct(summary.savings_rate_change)}
            deltaPositive={summary.savings_rate_change >= 0}
            deltaText="vs last month"
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {['Net worth', 'Monthly income', 'Monthly spend', 'Savings rate'].map((label) => (
            <MetricCard key={label} label={label} value="₹—" />
          ))}
        </div>
      )}

      {/* Mid row: Cashflow + Spending donut */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-5">
        {/* Cashflow chart */}
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-900">Cash flow</span>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          {cashflowLoading ? (
            <LoadingSpinner />
          ) : cashflow && cashflow.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cashflow} barGap={2}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => formatINR(value)}
                  contentStyle={{ fontSize: 12, border: '0.5px solid #E5E7EB', borderRadius: 8 }}
                />
                <Bar dataKey="income" fill="#1D9E75" radius={[3, 3, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#E24B4A" radius={[3, 3, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState emoji="📊" title="No cashflow data yet" description="Add transactions to see your cash flow chart" />
          )}
        </div>

        {/* Spending donut */}
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-900">Spending</span>
            <span className="text-xs text-primary cursor-pointer">View all</span>
          </div>
          {spendingLoading ? (
            <LoadingSpinner />
          ) : spending && spending.length > 0 ? (
            <div className="flex items-center gap-4 mt-2">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={spending.slice(0, 6)}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    strokeWidth={0}
                  >
                    {spending.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1">
                {spending.slice(0, 5).map((s, i) => {
                  const meta = getCategoryMeta(s.category)
                  return (
                    <div key={s.category} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate">{meta.label}</span>
                      <span className="ml-auto font-mono font-medium text-gray-900">{s.pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <EmptyState emoji="🥧" title="No spending data" description="Add expense transactions to see the breakdown" />
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white border border-gray-100 rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-900">Recent transactions</span>
          <a href="/spending" className="text-xs text-primary">View all</a>
        </div>
        {txnsLoading ? (
          <LoadingSpinner />
        ) : recentTxns && recentTxns.items.length > 0 ? (
          <div>
            {recentTxns.items.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
        ) : (
          <EmptyState
            emoji="💸"
            title="No transactions yet"
            description="Add your first transaction to get started"
            action={
              <button
                onClick={() => setShowAddTx(true)}
                className="text-xs text-primary font-medium border border-primary rounded-md px-3 py-1.5"
              >
                + Add transaction
              </button>
            }
          />
        )}
      </div>

      {showAddTx && <AddTransactionModal onClose={() => setShowAddTx(false)} />}
    </div>
  )
}
