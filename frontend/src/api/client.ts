import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password })
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me')

// Dashboard
export const getStats = () => api.get('/dashboard/stats')
export const getLatencyTrends = (hours = 24) => api.get(`/dashboard/latency-trends?hours=${hours}`)
export const getStatusDist = () => api.get('/dashboard/status-distribution')
export const getRecentIncidents = () => api.get('/dashboard/recent-incidents')
export const getTopProblematic = () => api.get('/dashboard/top-problematic')

// Providers
export const getProviders = (params?: Record<string, any>) => api.get('/providers', { params })
export const getProvider = (id: number) => api.get(`/providers/${id}`)
export const createProvider = (data: any) => api.post('/providers', data)
export const updateProvider = (id: number, data: any) => api.put(`/providers/${id}`, data)
export const deleteProvider = (id: number) => api.delete(`/providers/${id}`)

// Sites
export const getSites = (params?: Record<string, any>) => api.get('/sites', { params })
export const getSite = (id: number) => api.get(`/sites/${id}`)
export const createSite = (data: any) => api.post('/sites', data)
export const updateSite = (id: number, data: any) => api.put(`/sites/${id}`, data)
export const deleteSite = (id: number) => api.delete(`/sites/${id}`)

// Links
export const getLinks = (params?: Record<string, any>) => api.get('/links', { params })
export const getLink = (id: number) => api.get(`/links/${id}`)
export const createLink = (data: any) => api.post('/links', data)
export const updateLink = (id: number, data: any) => api.put(`/links/${id}`, data)
export const deleteLink = (id: number) => api.delete(`/links/${id}`)
export const getLinkHistory = (id: number, period: string) => api.get(`/links/${id}/history?period=${period}`)
export const checkLinkNow = (id: number) => api.post(`/links/${id}/check-now`)

// Assets
export const getAssets = (params?: Record<string, any>) => api.get('/assets', { params })
export const getAsset = (id: number) => api.get(`/assets/${id}`)
export const createAsset = (data: any) => api.post('/assets', data)
export const updateAsset = (id: number, data: any) => api.put(`/assets/${id}`, data)
export const deleteAsset = (id: number) => api.delete(`/assets/${id}`)

// Dependencies
export const getDependencies = () => api.get('/dependencies')
export const createDependency = (data: any) => api.post('/dependencies', data)
export const deleteDependency = (id: number) => api.delete(`/dependencies/${id}`)

// Incidents
export const getIncidents = (params?: Record<string, any>) => api.get('/incidents', { params })
export const getIncident = (id: number) => api.get(`/incidents/${id}`)
export const createIncident = (data: any) => api.post('/incidents', data)
export const updateIncident = (id: number, data: any) => api.put(`/incidents/${id}`, data)
export const deleteIncident = (id: number) => api.delete(`/incidents/${id}`)

// Alert config
export const getAlertConfig = () => api.get('/alerts/config')
export const updateAlertConfig = (data: any) => api.put('/alerts/config', data)
