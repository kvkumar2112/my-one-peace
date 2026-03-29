import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { Transaction, TransactionCreate, TransactionListResponse, TransactionFilters } from '@/types'

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionListResponse>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {}
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      if (filters.category) params.category = filters.category
      if (filters.account_id) params.account_id = filters.account_id
      if (filters.type) params.type = filters.type
      if (filters.search) params.search = filters.search
      if (filters.skip !== undefined) params.skip = filters.skip
      if (filters.limit !== undefined) params.limit = filters.limit

      const res = await api.get('/transactions/', { params })
      return res.data
    },
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: TransactionCreate) => {
      const res = await api.post('/transactions/', data)
      return res.data as Transaction
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TransactionCreate> }) => {
      const res = await api.put(`/transactions/${id}`, data)
      return res.data as Transaction
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}
