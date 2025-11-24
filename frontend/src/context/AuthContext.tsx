// src/context/AuthContext.tsx
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import authClient, { getCurrentUser } from '../api/authClient'
import type { LoginResponse } from '../types/auth'

type AuthUser = LoginResponse['user']

interface AuthContextValue {
    user: AuthUser | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    isLoggingIn: boolean
    isLoggingOut: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser())
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const login = async (email: string, password: string) => {
        setIsLoggingIn(true)
        try {
            const res = await authClient.login(email, password)
            if (res.error) {
                throw new Error(res.error.message)
            }
            if (res.data?.user) {
                setUser(res.data.user)
            } else {
                // fallback from localStorage if needed
                setUser(getCurrentUser())
            }
        } finally {
            setIsLoggingIn(false)
        }
    }

    const logout = async () => {
        setIsLoggingOut(true)
        try {
            await authClient.logout()
            setUser(null)
        } finally {
            setIsLoggingOut(false)
        }
    }

    // keep in sync across tabs / refresh token flows that update localStorage
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'current_user' || e.key === 'access_token') {
                setUser(getCurrentUser())
            }
        }
        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [])

    const value: AuthContextValue = {
        user,
        login,
        logout,
        isLoggingIn,
        isLoggingOut,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used inside <AuthProvider>')
    }
    return ctx
}