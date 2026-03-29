import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { AuthResponse } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      })
      login(res.data.access_token, res.data.user)
      navigate('/')
    } catch (err: any) {
      setServerError(err?.response?.data?.detail ?? 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="w-6 h-6 bg-primary rounded-md" />
          <span className="text-lg font-medium text-gray-900">My One Peace</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h1 className="text-lg font-medium text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-400 mb-6">Start your financial journey</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
              <input
                type="text"
                autoComplete="name"
                {...register('full_name')}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                placeholder="Arjun Kumar"
              />
              {errors.full_name && (
                <p className="text-2xs text-danger-dark mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-2xs text-danger-dark mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                placeholder="At least 8 characters"
              />
              {errors.password && (
                <p className="text-2xs text-danger-dark mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('confirm_password')}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                placeholder="••••••••"
              />
              {errors.confirm_password && (
                <p className="text-2xs text-danger-dark mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="text-xs text-danger-dark bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium hover:bg-safe transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
