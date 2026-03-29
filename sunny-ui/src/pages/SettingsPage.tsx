import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  currency: z.string().min(1),
  fy_start: z.string().min(1),
})

type ProfileData = z.infer<typeof profileSchema>

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'SGD']
const FY_STARTS = [
  { value: 'april', label: 'April (Indian FY)' },
  { value: 'january', label: 'January (Calendar year)' },
]

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      currency: user?.currency ?? 'INR',
      fy_start: user?.fy_start ?? 'april',
    },
  })

  const onSubmit = async (data: ProfileData) => {
    try {
      setError('')
      const res = await api.put('/auth/me', data)
      setUser(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    }
  }

  return (
    <div className="p-7 max-w-xl">
      <h1 className="text-xl font-medium text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-400 mb-8">Manage your profile and preferences</p>

      {/* Profile form */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Profile</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Full name</label>
            <input
              {...register('full_name')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Email</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Currency</label>
              <select {...register('currency')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Financial year start</label>
              <select {...register('fy_start')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                {FY_STARTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-safe disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-xs text-safe">Saved successfully</span>}
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Account</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-700">Plan</div>
              <div className="text-xs text-gray-400">Your current subscription</div>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize font-medium">
              {user?.plan ?? 'free'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-700">Member since</div>
              <div className="text-xs text-gray-400">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white border border-red-100 rounded-lg p-5">
        <h2 className="text-sm font-medium text-red-700 mb-2">Danger zone</h2>
        <p className="text-xs text-gray-400 mb-3">Account deletion and data export will be available in a future update.</p>
        <button disabled className="text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-50">
          Delete account
        </button>
      </div>
    </div>
  )
}
