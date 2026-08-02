import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BudgetProvider } from './context/BudgetContext'
import { PreferencesProvider } from './context/PreferencesContext'
import { AccountsProvider } from './context/AccountsContext'
import { GoalsProvider } from './context/GoalsContext'
import { InvestmentsProvider } from './context/InvestmentsContext'

import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Categories from './pages/Categories'
import Budget from './pages/Budget'
import Goals from './pages/Goals'
import Accounts from './pages/Accounts'
import Settings from './pages/Settings'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><span className="font-serif text-2xl text-navy/40">Loading…</span></div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function RequireOnboarding({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={
        <RequireAuth><BudgetProvider><AccountsProvider><GoalsProvider><Onboarding /></GoalsProvider></AccountsProvider></BudgetProvider></RequireAuth>
      } />
      <Route path="/dashboard" element={
        <RequireAuth><RequireOnboarding>
          <BudgetProvider><AccountsProvider><GoalsProvider><Dashboard /></GoalsProvider></AccountsProvider></BudgetProvider>
        </RequireOnboarding></RequireAuth>
      } />
      <Route path="/transactions" element={
        <RequireAuth><RequireOnboarding>
          <BudgetProvider><AccountsProvider><Transactions /></AccountsProvider></BudgetProvider>
        </RequireOnboarding></RequireAuth>
      } />
      <Route path="/categories" element={
        <RequireAuth><RequireOnboarding>
          <BudgetProvider><Categories /></BudgetProvider>
        </RequireOnboarding></RequireAuth>
      } />
      <Route path="/budget" element={
        <RequireAuth><RequireOnboarding>
          <BudgetProvider><Budget /></BudgetProvider>
        </RequireOnboarding></RequireAuth>
      } />
      <Route path="/goals" element={
        <RequireAuth><RequireOnboarding>
          <AccountsProvider><GoalsProvider><Goals /></GoalsProvider></AccountsProvider>
        </RequireOnboarding></RequireAuth>
      } />
      <Route path="/accounts" element={
        <RequireAuth><RequireOnboarding>
          <AccountsProvider><InvestmentsProvider><Accounts /></InvestmentsProvider></AccountsProvider>
        </RequireOnboarding></RequireAuth>
      } />
      <Route path="/settings" element={
        <RequireAuth><RequireOnboarding>
          <BudgetProvider><Settings /></BudgetProvider>
        </RequireOnboarding></RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/budget-tracker-website">
      <AuthProvider>
        <PreferencesProvider>
          <AppRoutes />
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
