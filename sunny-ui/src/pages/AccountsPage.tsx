import { useState, useRef, KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil, X, Link2 } from 'lucide-react'
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { formatINR } from '@/utils/format'
import EmptyState from '@/components/EmptyState'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { Account, LinkedAccountRef } from '@/types'

const ACCOUNT_TYPES = ['savings', 'salary', 'credit', 'wallet', 'investment', 'loan'] as const

const LINK_TYPES: { value: LinkedAccountRef['link_type']; label: string }[] = [
  { value: 'cc_payment',            label: 'Credit card payment' },
  { value: 'emi_payment',           label: 'Loan / EMI' },
  { value: 'investment_deployment', label: 'Investment funding' },
  { value: 'account_transfer',      label: 'Self transfer' },
]

const LINK_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  LINK_TYPES.map(l => [l.value, l.label])
)

const GRADIENTS = [
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-sky-500',
]

const schema = z.object({
  bank_name: z.string().min(1, 'Bank name is required'),
  account_type: z.enum(ACCOUNT_TYPES),
  nickname: z.string().optional(),
  last4: z.string().length(4, 'Must be 4 digits').regex(/^\d+$/, 'Digits only').optional().or(z.literal('')),
  balance: z.coerce.number().min(0),
  color_gradient: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function AccountCard({
  account, allAccounts, onEdit, onDelete,
}: {
  account: Account
  allAccounts: Account[]
  onEdit: () => void
  onDelete: () => void
}) {
  const gradient = account.color_gradient ?? GRADIENTS[0]
  const typeLabels: Record<string, string> = {
    savings: 'Savings', salary: 'Salary', credit: 'Credit',
    wallet: 'Wallet', investment: 'Investment', loan: 'Loan',
  }

  const linkedNames = account.linked_accounts.map(la => {
    const target = allAccounts.find(a => a.id === la.account_id)
    return target ? { name: target.nickname ?? target.bank_name, label: LINK_TYPE_LABELS[la.link_type] } : null
  }).filter(Boolean) as { name: string; label: string }[]

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
      <div className={`bg-gradient-to-br ${gradient} p-5 h-28 flex flex-col justify-between`}>
        <div className="flex items-center justify-between">
          <span className="text-white/90 text-sm font-medium">{account.nickname ?? account.bank_name}</span>
          <span className="text-white/70 text-xs bg-white/20 px-2 py-0.5 rounded-full capitalize">
            {typeLabels[account.account_type] ?? account.account_type}
          </span>
        </div>
        {account.last4 && (
          <div className="text-white/80 font-mono text-sm tracking-widest">•••• {account.last4}</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-400 mb-0.5">Balance</div>
        <div className="font-mono text-xl font-medium text-gray-900">{formatINR(account.balance)}</div>

        {account.match_patterns.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {account.match_patterns.map(p => (
              <span key={p} className="text-xs bg-gray-50 text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded font-mono">{p}</span>
            ))}
          </div>
        )}

        {linkedNames.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {linkedNames.map((ln, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-gray-400">
                <Link2 size={10} className="shrink-0" />
                <span className="text-gray-600">{ln.name}</span>
                <span className="text-gray-300">·</span>
                <span>{ln.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${account.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {account.status}
          </span>
          <div className="ml-auto flex gap-1">
            <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PatternTagInput({ patterns, onChange }: { patterns: string[]; onChange: (p: string[]) => void }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addPattern = () => {
    const val = input.trim().toLowerCase()
    if (val && !patterns.includes(val)) {
      onChange([...patterns, val])
    }
    setInput('')
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addPattern()
    } else if (e.key === 'Backspace' && input === '' && patterns.length > 0) {
      onChange(patterns.slice(0, -1))
    }
  }

  const remove = (p: string) => onChange(patterns.filter(x => x !== p))

  return (
    <div
      className="min-h-[38px] w-full border border-gray-200 rounded-lg px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text focus-within:border-primary"
      onClick={() => inputRef.current?.focus()}
    >
      {patterns.map(p => (
        <span key={p} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">
          {p}
          <button type="button" onClick={() => remove(p)} className="text-gray-400 hover:text-gray-600 leading-none">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={addPattern}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
        placeholder={patterns.length === 0 ? 'Type a pattern, press Enter…' : ''}
      />
    </div>
  )
}

function AccountModal({
  account,
  allAccounts,
  onClose,
  onSave,
  loading,
}: {
  account?: Account
  allAccounts: Account[]
  onClose: () => void
  onSave: (data: FormData & { match_patterns: string[]; linked_accounts: LinkedAccountRef[] }) => void
  loading: boolean
}) {
  const [patterns, setPatterns] = useState<string[]>(account?.match_patterns ?? [])
  const [links, setLinks] = useState<LinkedAccountRef[]>(account?.linked_accounts ?? [])
  const [newLinkAccountId, setNewLinkAccountId] = useState('')
  const [newLinkType, setNewLinkType] = useState<LinkedAccountRef['link_type']>('cc_payment')

  // Accounts available to link to (exclude self and already linked)
  const linkedIds = new Set(links.map(l => l.account_id))
  const linkableAccounts = allAccounts.filter(a => a.id !== account?.id && !linkedIds.has(a.id))

  const addLink = () => {
    if (!newLinkAccountId) return
    setLinks(prev => [...prev, { account_id: newLinkAccountId, link_type: newLinkType }])
    setNewLinkAccountId('')
    setNewLinkType('cc_payment')
  }

  const removeLink = (account_id: string) => setLinks(prev => prev.filter(l => l.account_id !== account_id))

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bank_name: account?.bank_name ?? '',
      account_type: (account?.account_type as typeof ACCOUNT_TYPES[number]) ?? 'savings',
      nickname: account?.nickname ?? '',
      last4: account?.last4 ?? '',
      balance: account?.balance ?? 0,
      color_gradient: account?.color_gradient ?? GRADIENTS[0],
    },
  })

  const submit = (data: FormData) => onSave({ ...data, match_patterns: patterns, linked_accounts: links })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">{account ? 'Edit account' : 'Add account'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Bank / Institution name</label>
            <input {...register('bank_name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="e.g. HDFC Bank" />
            {errors.bank_name && <p className="text-xs text-red-500 mt-1">{errors.bank_name.message}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Nickname (optional)</label>
            <input {...register('nickname')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="e.g. HDFC Primary Savings" />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Account type</label>
            <select {...register('account_type')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
              {ACCOUNT_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Last 4 digits (optional)</label>
              <input {...register('last4')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="1234" maxLength={4} />
              {errors.last4 && <p className="text-xs text-red-500 mt-1">{errors.last4.message}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Current balance (₹)</label>
              <input {...register('balance')} type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="0" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Import match patterns
              <span className="text-gray-400 font-normal ml-1">— keywords to identify this account in statements</span>
            </label>
            <PatternTagInput patterns={patterns} onChange={setPatterns} />
            <p className="text-xs text-gray-400 mt-1">
              e.g. <span className="font-mono">hdfc cc</span>, <span className="font-mono">hdfc creditcard</span> for a credit card. Press Enter or comma to add.
            </p>
          </div>

          {/* Linked accounts */}
          {allAccounts.filter(a => a.id !== account?.id).length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Linked accounts
                <span className="text-gray-400 font-normal ml-1">— accounts this one pays into</span>
              </label>

              {/* Existing links */}
              {links.length > 0 && (
                <div className="mb-2 space-y-1">
                  {links.map(link => {
                    const target = allAccounts.find(a => a.id === link.account_id)
                    return (
                      <div key={link.account_id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <Link2 size={12} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">{target?.nickname ?? target?.bank_name}</span>
                        <span className="text-xs text-gray-400">{LINK_TYPE_LABELS[link.link_type]}</span>
                        <button type="button" onClick={() => removeLink(link.account_id)} className="text-gray-300 hover:text-red-400 ml-1">
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add new link — stacked layout to avoid cramping */}
              {linkableAccounts.length > 0 && (
                <div className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                  <select
                    value={newLinkAccountId}
                    onChange={e => setNewLinkAccountId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white text-gray-700"
                  >
                    <option value="">Select account to link…</option>
                    {linkableAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.nickname ?? a.bank_name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={newLinkType}
                      onChange={e => setNewLinkType(e.target.value as LinkedAccountRef['link_type'])}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white text-gray-700"
                    >
                      {LINK_TYPES.map(lt => (
                        <option key={lt.value} value={lt.value}>{lt.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault() // prevents PatternTagInput onBlur from firing before click
                        addLink()
                      }}
                      disabled={!newLinkAccountId}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-safe disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-2">Card colour</label>
            <div className="flex gap-2 flex-wrap">
              {GRADIENTS.map(g => (
                <label key={g} className="cursor-pointer">
                  <input {...register('color_gradient')} type="radio" value={g} className="sr-only" />
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} ring-2 ring-offset-1 ring-transparent has-[:checked]:ring-gray-900`} />
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-safe disabled:opacity-50">
              {loading ? 'Saving…' : account ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  const totalBalance = accounts?.reduce((s, a) => s + a.balance, 0) ?? 0

  const handleSave = async (data: FormData & { match_patterns: string[]; linked_accounts: LinkedAccountRef[] }) => {
    const payload = { ...data, last4: data.last4 || undefined, nickname: data.nickname || undefined }
    if (editing) {
      await updateAccount.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createAccount.mutateAsync(payload)
    }
    setShowModal(false)
    setEditing(null)
  }

  const handleEdit = (account: Account) => {
    setEditing(account)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remove this account?')) {
      await deleteAccount.mutateAsync(id)
    }
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-medium text-gray-900">Accounts</h1>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-3 py-1.5 rounded-lg hover:bg-safe"
        >
          <Plus size={14} /> Add account
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-6">Your linked bank accounts and cards</p>

      {accounts && accounts.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6 flex items-center gap-6">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Total balance</div>
            <div className="font-mono text-2xl font-medium text-gray-900">{formatINR(totalBalance)}</div>
          </div>
          <div className="text-xs text-gray-400">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : accounts?.length === 0 ? (
        <EmptyState
          emoji="🏦"
          title="No accounts yet"
          description="Add your savings, salary, credit card or wallet accounts to track your net worth."
          action={
            <button onClick={() => setShowModal(true)} className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-safe">
              Add your first account
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts?.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              allAccounts={accounts ?? []}
              onEdit={() => handleEdit(account)}
              onDelete={() => handleDelete(account.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AccountModal
          account={editing ?? undefined}
          allAccounts={accounts ?? []}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          loading={createAccount.isPending || updateAccount.isPending}
        />
      )}
    </div>
  )
}
