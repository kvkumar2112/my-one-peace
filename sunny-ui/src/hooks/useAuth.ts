import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types'

export function useMe() {
  const { token, setUser } = useAuthStore()

  return useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      setUser(res.data)
      return res.data
    },
    enabled: !!token,
    retry: false,
  })
}
