import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login } from '@/api/client'
import toast from 'react-hot-toast'
import { Radio } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ username: '', password: '' })

  const mut = useMutation({
    mutationFn: () => login(form.username, form.password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      navigate('/dashboard')
    },
    onError: () => toast.error('Invalid credentials'),
  })

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600">
            <Radio size={20} className="text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-50">NetOps Platform</div>
            <div className="text-xs text-gray-500">Network Operations Center</div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h1 className="text-base font-semibold text-gray-100 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-6">Access your network dashboard</p>

          <form onSubmit={(e) => { e.preventDefault(); mut.mutate() }} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={mut.isPending}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {mut.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Default: admin / admin
        </p>
      </div>
    </div>
  )
}
