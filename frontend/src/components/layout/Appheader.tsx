import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'

export function AppHeader() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, logout, isLoggingOut } = useAuth()
    console.log(user)
    const handleLogout = async () => {
        await logout()
        queryClient.clear()
        navigate({ to: '/login' })
    }

    return (
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
            <Link to="/" className="text-lg font-semibold text-slate-800">
                Interactive Todo
            </Link>

            {user && (
                <div className="flex items-center gap-4">
          <span className="text-sm text-slate-700">
            {user.display_name ?? user.email}
              <span className="text-xs text-slate-500 ml-2">({user.type})</span>
          </span>

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                        {isLoggingOut ? '…' : 'Logout'}
                    </button>
                </div>
            )}
        </header>
    )
}