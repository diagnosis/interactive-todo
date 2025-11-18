import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem('access_token')

  // Redirect based on auth status
  if (isLoggedIn) {
    return <Navigate to="/dashboard" />
  }

  return <Navigate to="/login" />
}
