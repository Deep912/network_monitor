import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/api/client'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Links from '@/pages/Links'
import LinkDetail from '@/pages/LinkDetail'
import Providers from '@/pages/Providers'
import Sites from '@/pages/Sites'
import Assets from '@/pages/Assets'
import Dependencies from '@/pages/Dependencies'
import Incidents from '@/pages/Incidents'
import Settings from '@/pages/Settings'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => getMe(),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    )
  }

  if (isError || !data) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="links" element={<Links />} />
          <Route path="links/:id" element={<LinkDetail />} />
          <Route path="providers" element={<Providers />} />
          <Route path="sites" element={<Sites />} />
          <Route path="assets" element={<Assets />} />
          <Route path="dependencies" element={<Dependencies />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
