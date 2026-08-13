import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type BillingCycle = 'monthly' | 'yearly' | 'quarterly'
type SubscriptionStatus = 'active' | 'reviewing' | 'cancel-candidate' | 'canceled'

type Subscription = {
  id: string
  name: string
  amount: number
  currency: 'USD' | 'JPY' | 'EUR' | 'GBP'
  billingCycle: BillingCycle
  nextRenewal: string
  category: string
  status: SubscriptionStatus
  memo: string
}

type FormState = Omit<Subscription, 'id'>

const STORAGE_KEY = 'renewal-radar-subscriptions-v1'
const today = new Date()
const todayISO = toDateInputValue(today)

const blankForm: FormState = {
  name: '',
  amount: 0,
  currency: 'USD',
  billingCycle: 'monthly',
  nextRenewal: todayISO,
  category: 'Software',
  status: 'active',
  memo: '',
}

const samples: Subscription[] = [
  {
    id: 'sample-1',
    name: 'Domain renewal',
    amount: 18,
    currency: 'USD',
    billingCycle: 'yearly',
    nextRenewal: offsetDate(12),
    category: 'Infrastructure',
    status: 'reviewing',
    memo: 'Check whether the project still needs this domain.',
  },
  {
    id: 'sample-2',
    name: 'Design tool',
    amount: 15,
    currency: 'USD',
    billingCycle: 'monthly',
    nextRenewal: offsetDate(5),
    category: 'Software',
    status: 'active',
    memo: 'Used every week.',
  },
  {
    id: 'sample-3',
    name: 'Test analytics',
    amount: 39,
    currency: 'USD',
    billingCycle: 'monthly',
    nextRenewal: offsetDate(26),
    category: 'Marketing',
    status: 'cancel-candidate',
    memo: 'Low usage last month.',
  },
]

function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [form, setForm] = useState<FormState>(blankForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [error, setError] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const [saveState, setSaveState] = useState<'Saved' | 'Saving...'>('Saved')
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setSubscriptions(parseSubscriptions(JSON.parse(raw)))
      }
    } catch {
      setStorageWarning('Saved data could not be loaded. You can keep using the app, but previous data may be unavailable.')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    setSaveState('Saving...')
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions))
      setStorageWarning('')
    } catch {
      setStorageWarning('Changes cannot be saved in this browser. Export JSON before closing the page.')
    }
    setSaveState('Saved')
  }, [isLoaded, subscriptions])

  const activeSubscriptions = subscriptions.filter((item) => item.status !== 'canceled')
  const categories = useMemo(
    () => Array.from(new Set(subscriptions.map((item) => item.category).filter(Boolean))).sort(),
    [subscriptions],
  )

  const metrics = useMemo(() => buildMetrics(activeSubscriptions), [activeSubscriptions])
  const filteredSubscriptions = useMemo(() => {
    return [...subscriptions]
      .filter((item) => statusFilter === 'all' || item.status === statusFilter)
      .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
      .sort((a, b) => new Date(a.nextRenewal).getTime() - new Date(b.nextRenewal).getTime())
  }, [categoryFilter, statusFilter, subscriptions])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    const normalized = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim() || 'Uncategorized',
      memo: form.memo.trim(),
      amount: Number(form.amount),
    }

    if (editingId) {
      setSubscriptions((items) =>
        items.map((item) => (item.id === editingId ? { ...normalized, id: editingId } : item)),
      )
    } else {
      setSubscriptions((items) => [{ ...normalized, id: crypto.randomUUID() }, ...items])
    }

    setForm(blankForm)
    setEditingId(null)
    setError('')
  }

  function editSubscription(item: Subscription) {
    setForm({
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      billingCycle: item.billingCycle,
      nextRenewal: item.nextRenewal,
      category: item.category,
      status: item.status,
      memo: item.memo,
    })
    setEditingId(item.id)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function deleteSubscription(id: string) {
    setSubscriptions((items) => items.filter((item) => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setForm(blankForm)
    }
  }

  function exportData() {
    const payload = JSON.stringify({ version: 1, subscriptions }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `renewal-radar-${todayISO}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const incoming = parseSubscriptions(parsed.subscriptions ?? parsed)
      const confirmed = window.confirm('Importing JSON will replace the current list. Continue?')
      if (confirmed) {
        setSubscriptions(incoming)
        setError('')
      }
    } catch {
      setError('Import failed. Choose a Renewal Radar JSON export with valid subscription records.')
    } finally {
      event.target.value = ''
    }
  }

  function loadSampleData() {
    setSubscriptions(samples)
    setStatusFilter('all')
    setCategoryFilter('all')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local subscription control</p>
          <h1>Renewal Radar</h1>
        </div>
        <div className="topbar-actions">
          <span className="save-state" aria-live="polite">{saveState}</span>
          <button className="secondary" type="button" onClick={exportData} disabled={subscriptions.length === 0}>
            Export JSON
          </button>
          <button className="secondary" type="button" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json" onChange={importData} />
        </div>
      </header>

      {storageWarning && <p className="alert">{storageWarning}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <section className="dashboard" aria-label="Subscription cost summary">
        <Metric label="Monthly equivalent" value={formatMoney(metrics.monthlyTotal)} />
        <Metric label="Yearly equivalent" value={formatMoney(metrics.yearlyTotal)} />
        <Metric label="Renewing in 30 days" value={`${metrics.renewingSoon.length}`} />
        <Metric label="Review candidates" value={`${metrics.reviewCount}`} />
      </section>

      <section className="workspace">
        <form className="editor" onSubmit={handleSubmit}>
          <div className="section-heading">
            <h2>{editingId ? 'Edit subscription' : 'Add subscription'}</h2>
            {editingId && (
              <button className="ghost" type="button" onClick={() => { setEditingId(null); setForm(blankForm); setError('') }}>
                Cancel edit
              </button>
            )}
          </div>

          <label>
            Service name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="GitHub, Figma, Domain..." />
          </label>

          <div className="form-grid">
            <label>
              Amount
              <input type="number" min="0" step="0.01" value={form.amount || ''} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} placeholder="29" />
            </label>
            <label>
              Currency
              <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as FormState['currency'] })}>
                <option>USD</option>
                <option>JPY</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </label>
            <label>
              Billing
              <select value={form.billingCycle} onChange={(event) => setForm({ ...form, billingCycle: event.target.value as BillingCycle })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label>
              Next renewal
              <input type="date" value={form.nextRenewal} onChange={(event) => setForm({ ...form, nextRenewal: event.target.value })} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Category
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Software" />
            </label>
            <label>
              Status
              <select aria-label="Subscription status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SubscriptionStatus })}>
                <option value="active">Active</option>
                <option value="reviewing">Reviewing</option>
                <option value="cancel-candidate">Cancel candidate</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>
          </div>

          <label>
            Memo
            <textarea value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} placeholder="Why keep it, review it, or cancel it?" />
          </label>

          <button className="primary" type="submit">{editingId ? 'Save changes' : 'Add subscription'}</button>
        </form>

        <aside className="insights">
          <div className="section-heading">
            <h2>Next 30 days</h2>
          </div>
          {metrics.renewingSoon.length === 0 ? (
            <p className="empty">No upcoming renewals. Add services or adjust renewal dates.</p>
          ) : (
            <ul className="compact-list">
              {metrics.renewingSoon.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <strong>{daysUntil(item.nextRenewal)} days</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="section-heading">
            <h2>By category</h2>
          </div>
          {metrics.byCategory.length === 0 ? (
            <p className="empty">Category spend appears after the first active subscription.</p>
          ) : (
            <ul className="compact-list">
              {metrics.byCategory.map((item) => (
                <li key={item.category}>
                  <span>{item.category}</span>
                  <strong>{formatMoney(item.monthly)}</strong>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section className="list-panel">
        <div className="list-header">
          <div>
            <h2>Subscriptions</h2>
            <p>{subscriptions.length} saved locally</p>
          </div>
          <div className="filters">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filter subscriptions by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="reviewing">Reviewing</option>
              <option value="cancel-candidate">Cancel candidates</option>
              <option value="canceled">Canceled</option>
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter subscriptions by category">
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="empty-state">
            <h2>No subscriptions tracked yet</h2>
            <p>Add the tools, domains, and services that renew automatically. A sample set is available for a quick check.</p>
            <button className="secondary" type="button" onClick={loadSampleData}>Load sample data</button>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="empty-state">
            <h2>No matches</h2>
            <p>Clear filters to see every saved subscription.</p>
            <button className="secondary" type="button" onClick={() => { setStatusFilter('all'); setCategoryFilter('all') }}>Clear filters</button>
          </div>
        ) : (
          <div className="subscription-list">
            {filteredSubscriptions.map((item) => (
              <article className={`subscription-card ${isRenewingSoon(item) ? 'soon' : ''}`} key={item.id}>
                <div>
                  <div className="card-title-row">
                    <h3>{item.name}</h3>
                    <span className={`status-pill status-${item.status}`}>{statusLabel(item.status)}</span>
                  </div>
                  <p>{item.category} · renews {formatDate(item.nextRenewal)} · {daysUntil(item.nextRenewal)} days</p>
                  {item.memo && <p className="memo">{item.memo}</p>}
                </div>
                <div className="card-actions">
                  <strong>{formatMoney(monthlyEquivalent(item))}/mo</strong>
                  <button className="ghost" type="button" onClick={() => editSubscription(item)}>Edit</button>
                  <button className="ghost danger" type="button" onClick={() => deleteSubscription(item.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function validateForm(form: FormState) {
  if (!form.name.trim()) return 'Service name is required.'
  if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return 'Amount must be greater than zero.'
  if (!form.nextRenewal) return 'Next renewal date is required.'
  return ''
}

function parseSubscriptions(value: unknown): Subscription[] {
  if (!Array.isArray(value)) throw new Error('Invalid import')
  return value.map((item) => {
    const record = item as Partial<Subscription>
    if (!record.name || !record.amount || !record.nextRenewal) throw new Error('Invalid import')
    return {
      id: record.id || crypto.randomUUID(),
      name: String(record.name),
      amount: Number(record.amount),
      currency: record.currency ?? 'USD',
      billingCycle: record.billingCycle ?? 'monthly',
      nextRenewal: String(record.nextRenewal),
      category: record.category || 'Uncategorized',
      status: record.status ?? 'active',
      memo: record.memo || '',
    }
  })
}

function buildMetrics(items: Subscription[]) {
  const monthlyTotal = items.reduce((sum, item) => sum + monthlyEquivalent(item), 0)
  const renewingSoon = items.filter(isRenewingSoon).sort((a, b) => daysUntil(a.nextRenewal) - daysUntil(b.nextRenewal))
  const reviewCount = items.filter((item) => item.status === 'reviewing' || item.status === 'cancel-candidate').length
  const categoryMap = new Map<string, number>()

  items.forEach((item) => {
    categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + monthlyEquivalent(item))
  })

  return {
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    renewingSoon,
    reviewCount,
    byCategory: Array.from(categoryMap.entries())
      .map(([category, monthly]) => ({ category, monthly }))
      .sort((a, b) => b.monthly - a.monthly),
  }
}

function monthlyEquivalent(item: Subscription) {
  if (item.billingCycle === 'yearly') return item.amount / 12
  if (item.billingCycle === 'quarterly') return item.amount / 3
  return item.amount
}

function isRenewingSoon(item: Subscription) {
  const days = daysUntil(item.nextRenewal)
  return item.status !== 'canceled' && days >= 0 && days <= 30
}

function daysUntil(dateValue: string) {
  const current = new Date(todayISO).getTime()
  const target = new Date(dateValue).getTime()
  return Math.ceil((target - current) / 86_400_000)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function statusLabel(status: SubscriptionStatus) {
  return {
    active: 'Active',
    reviewing: 'Reviewing',
    'cancel-candidate': 'Cancel candidate',
    canceled: 'Canceled',
  }[status]
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function offsetDate(days: number) {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return toDateInputValue(next)
}

export default App
