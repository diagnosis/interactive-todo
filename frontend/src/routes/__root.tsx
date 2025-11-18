import { createRootRoute, Link, Outlet, useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "../api/auth"
import { useState, useEffect } from "react"

const RootLayout = () => {
    const navigate = useNavigate()
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access_token'))

    useEffect(() => {
        const checkAuth = () => {
            setIsLoggedIn(!!localStorage.getItem('access_token'))
        }
        window.addEventListener('storage', checkAuth)
        checkAuth()
        return () => window.removeEventListener('storage', checkAuth)
    }, [])

    const logoutMutation = useMutation({
        mutationFn: () => authApi.logout(),
        onSuccess: () => {
            localStorage.removeItem('access_token')
            setIsLoggedIn(false)
            navigate({ to: '/login' })
        },
    })

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            logoutMutation.mutate()
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation Bar */}
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Left side - Logo & Links */}
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to = "/" >
                                    <span className="text-xl font-bold text-blue-600">ITapp</span>
                                </Link>

                            </div>

                            {isLoggedIn && (
                                <div className="ml-6 flex space-x-8">
                                    <Link
                                        to="/dashboard"
                                        className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600 [&.active]:border-b-2 [&.active]:border-blue-600"
                                    >
                                        Dashboard
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Right side - Auth buttons */}
                        <div className="flex items-center">
                            {isLoggedIn ? (
                                <button
                                    onClick={handleLogout}
                                    disabled={logoutMutation.isPending}
                                    className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                >
                                    {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                                </button>
                            ) : (
                                <div className="flex space-x-4">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        Register
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>
                <Outlet />
            </main>
        </div>
    )
}

export const Route = createRootRoute({ component: RootLayout })