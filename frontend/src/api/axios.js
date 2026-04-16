import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

const AUTH_ROUTES_THAT_HANDLE_OWN_ERRORS = [
  '/auth/login',
  '/auth/google',
  '/auth/me',
]

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const requestUrl = err.config?.url || ''
      const isHandledAuthRoute = AUTH_ROUTES_THAT_HANDLE_OWN_ERRORS.some(route => requestUrl.includes(route))

      // Let login/google/bootstrap auth flows handle their own 401s.
      // This avoids old /auth/me failures clearing a freshly stored token
      // and bouncing the user back to /login after Google sign-in.
      if (!isHandledAuthRoute) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
