import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useMe } from '@/hooks/useAuth'

interface Props {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const { token } = useAuthStore()
  const { isLoading, isError } = useMe()

  // If no token at all, redirect immediately
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // While hydrating user from /auth/me, show nothing (brief flicker prevention)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Token was invalid
  if (isError) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
