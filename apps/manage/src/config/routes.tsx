import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/protected-route'

// Lazy load components for better performance
const LoginPage = lazy(() => import('@/app/auth/login/page'))
const RegisterPage = lazy(() => import('@/app/auth/register/page'))
const Dashboard2 = lazy(() => import('@/app/dashboard-2/page'))
const SpaceDetail = lazy(() => import('@/app/space/[id]/page'))
const TableEditor = lazy(() => import('@/app/table-editor/page'))

// Error pages
const NotFound = lazy(() => import('@/app/errors/not-found/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  // Auth routes (public)
  {
    path: "/auth/login",
    element: <LoginPage />
  },
  {
    path: "/auth/register",
    element: <RegisterPage />
  },
  
  // Legacy login route (redirect)
  {
    path: "/login",
    element: <Navigate to="/auth/login" replace />
  },

  // Default route - redirect to dashboard
  {
    path: "/",
    element: <Navigate to="dashboard" replace />
  },

  // Dashboard Routes (protected)
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard2 />
      </ProtectedRoute>
    )
  },

  // Space Detail Route (protected)
  {
    path: "/space/:id",
    element: (
      <ProtectedRoute>
        <SpaceDetail />
      </ProtectedRoute>
    )
  },

  // Base Detail Route (protected) - 重定向到第一个表格
  {
    path: "/base/:baseId",
    element: (
      <ProtectedRoute>
        <TableEditor />
      </ProtectedRoute>
    )
  },

  // Table Editor Route (protected)
  {
    path: "/base/:baseId/:tableId/:viewId",
    element: (
      <ProtectedRoute>
        <TableEditor />
      </ProtectedRoute>
    )
  },

  // Catch-all route for 404
  {
    path: "*",
    element: <NotFound />
  }
]
