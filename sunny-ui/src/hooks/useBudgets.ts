import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { Budget } from '@/types'

export function useBudgets() {
  return useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: async () => {
      const res = await api.get('/budgets/')
      return res.data
    },
  })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { category: string; label: string; limit_amount: number; period?: string; icon?: string }) => {
      const res = await api.post('/budgets/', data)
      return res.data as Budget
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

export function useUpdateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ category: string; label: string; limit_amount: number; period: string; icon: string }> }) => {
      const res = await api.put(`/budgets/${id}`, data)
      return res.data as Budget
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budgets/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}
