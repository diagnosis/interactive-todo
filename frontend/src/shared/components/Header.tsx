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

    const isAuthenticated = !!user || !!localStorage.getItem('access_token')

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

            {isAuthenticated && (
                <nav className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                    </Link>

                    <div className="h-6 w-px bg-slate-300" />

                    <Button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        variant="danger"
                        size="sm"
                    >
                        {isLoggingOut ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Logging out...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </>
                        )}
                    </Button>
                </nav>
            )}
        </header>
    )
}
