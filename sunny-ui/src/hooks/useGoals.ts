import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { Goal } from '@/types'

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await api.get('/goals/')
      return res.data
    },
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string
      target_amount: number
      monthly_contribution?: number
      target_date?: string
      icon?: string
      color?: string
    }) => {
      const res = await api.post('/goals/', data)
      return res.data as Goal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; target_amount: number; status: string }> }) => {
      const res = await api.put(`/goals/${id}`, data)
      return res.data as Goal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goals/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useContributeGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await api.post(`/goals/${id}/contribute`, { amount })
      return res.data as Goal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
