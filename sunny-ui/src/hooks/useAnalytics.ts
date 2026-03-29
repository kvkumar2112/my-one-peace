import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { DashboardSummary, SpendingByCategory, CashflowPoint, InsightResponse } from '@/types'

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get('/analytics/summary')
      return res.data
    },
  })
}

export function useSpending(dateFrom?: string, dateTo?: string) {
  return useQuery<SpendingByCategory[]>({
    queryKey: ['analytics', 'spending', dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const res = await api.get('/analytics/spending', { params })
      return res.data
    },
  })
}

export function useCashflow(months = 6) {
  return useQuery<CashflowPoint[]>({
    queryKey: ['analytics', 'cashflow', months],
    queryFn: async () => {
      const res = await api.get('/analytics/cashflow', { params: { months } })
      return res.data
    },
  })
}

export function useInsights() {
  return useQuery<InsightResponse>({
    queryKey: ['analytics', 'insights'],
    queryFn: async () => {
      const res = await api.get('/analytics/insights')
      return res.data
    },
  })
}
