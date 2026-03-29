import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { Holding, PortfolioSummary } from '@/types'

export function usePortfolioSummary() {
  return useQuery<PortfolioSummary>({
    queryKey: ['holdings', 'summary'],
    queryFn: async () => {
      const res = await api.get('/holdings/summary')
      return res.data
    },
  })
}

export function useHoldings() {
  return useQuery<Holding[]>({
    queryKey: ['holdings'],
    queryFn: async () => {
      const res = await api.get('/holdings/')
      return res.data
    },
  })
}

export function useCreateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string
      type: string
      ticker?: string
      platform?: string
      quantity?: number
      avg_buy_price?: number
      current_price?: number
      invested_amount?: number
      current_value?: number
    }) => {
      const res = await api.post('/holdings/', data)
      return res.data as Holding
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
    },
  })
}

export function useUpdateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; current_price: number; current_value: number; quantity: number }> }) => {
      const res = await api.put(`/holdings/${id}`, data)
      return res.data as Holding
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}

export function useDeleteHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/holdings/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}
