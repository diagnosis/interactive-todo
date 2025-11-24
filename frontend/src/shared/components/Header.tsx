import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { Button } from './Button'

export function Header() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, logout, isLoggingOut } = useAuth()

    const handleLogout = async () => {
        await logout()
        queryClient.clear()
        navigate({ to: '/login' })
    }

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200/50 shadow-sm sticky top-0 z-40">
            <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">TaskFlow</h1>
                    <p className="text-xs text-slate-500">Team Task Manager</p>
                </div>
            </Link>

            {user && (
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700">
                            {user.display_name ?? user.email}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                            {user.type.replace('_', ' ')}
                        </p>
                    </div>

                    <Button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        variant="danger"
                        size="sm"
                    >
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </Button>
                </div>
            )}
        </header>
    )
}
