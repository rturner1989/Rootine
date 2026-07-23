import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandscapeLock from './components/LandscapeLock'
import ProtectedRoute from './components/ProtectedRoute'
import Action from './components/ui/Action'
import Spinner from './components/ui/Spinner'
import { AddPlantProvider } from './context/AddPlantContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { OrganiserProvider } from './context/OrganiserContext'
import { SearchProvider } from './context/SearchContext'
import { ToastProvider, useToast } from './context/ToastContext'
import { useAuth } from './hooks/useAuth'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import OnboardingLayout from './layouts/OnboardingLayout'

const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Welcome = lazy(() => import('./pages/Welcome'))
const Today = lazy(() => import('./pages/Today'))
const House = lazy(() => import('./pages/House'))
const Plant = lazy(() => import('./pages/Plant'))
const Encyclopedia = lazy(() => import('./pages/encyclopedia/Encyclopedia'))
const SpeciesDetail = lazy(() => import('./pages/encyclopedia/SpeciesDetail'))
const Journal = lazy(() => import('./pages/Journal'))
const Me = lazy(() => import('./pages/Me'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
})

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-dvh">
      <Spinner />
    </div>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
      <p className="text-ink-soft mt-2">Coming soon.</p>
    </div>
  )
}

function ProtectedAppLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LandscapeLock />
      <AuthProvider>
        <NotificationsProvider>
          <OrganiserProvider>
            <SearchProvider>
              <AddPlantProvider>
                <ToastProvider>
                  <BrowserRouter>
                    <Suspense fallback={<RouteFallback />}>
                      <Routes>
                        <Route element={<AuthLayout />}>
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/reset-password/:token" element={<ResetPassword />} />
                        </Route>

                        <Route element={<OnboardingLayout />}>
                          <Route
                            path="/welcome/:step?"
                            element={
                              <ProtectedRoute requireOnboarded={false}>
                                <Welcome />
                              </ProtectedRoute>
                            }
                          />
                        </Route>

                        <Route element={<ProtectedAppLayout />}>
                          <Route index element={<Today />} />

                          <Route path="house" element={<House />} />
                          <Route path="plants/:id" element={<Plant />} />
                          <Route path="journal" element={<Journal />} />
                          <Route path="encyclopedia" element={<Encyclopedia />} />
                          <Route path="encyclopedia/species/:id" element={<SpeciesDetail />} />
                          <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
                          <Route path="me" element={<Me />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </BrowserRouter>
                </ToastProvider>
              </AddPlantProvider>
            </SearchProvider>
          </OrganiserProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
